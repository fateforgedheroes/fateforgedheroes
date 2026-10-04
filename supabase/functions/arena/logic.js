// Arena server logic. Pure JavaScript without Supabase or Deno APIs, so the same file runs in the Edge Function
// (index.ts gives it a database) and in a browser test with a fake database.
// `K` is the game engine (engine.js), `db` the storage (see index.ts for the methods), `user` the signed-in user.
// Every result is decided here: the browser only sends its team and which offer it attacks.

const clean = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20) || 'Adventurer';
const avatarOk = (K, a) => (typeof a === 'string' && K.CHAMPS[a] ? a : null);
const preview = team => team.map(h => ({ id: h.id, lvl: h.lvl, stars: h.stars }));
// keeps only the known fields of a checked team (nothing else a browser sent gets stored)
const tidy = team => team.map(h => ({ id: h.id, lvl: h.lvl, stars: h.stars, sk: [...h.sk], items: h.items.map(it => ({ slot: it.slot, rar: it.rar, lvl: it.lvl, il: it.il, set: it.set, main: it.main, subs: it.subs.map(s => [s[0], s[1]]) })) }));
// developer heroes (K.DEV_HEROES) may only be used by their owner: hero id → start of the owner's account id
const DEV_HERO_OWNERS = { j3duin: '6c7ea9be' };
const devHeroBad = (team, user) => Array.isArray(team) && team.some(h => h && DEV_HERO_OWNERS[h.id] && !String(user.id).startsWith(DEV_HERO_OWNERS[h.id]));
const randSeed = () => Math.floor(Math.random() * 2147483647);

// tokens refill one per ARENA_TOKEN_MIN minutes up to ARENA_TOKENS (the same rule as arena_take_token in SQL)
function tokensNow(K, p, now) {
  const per = K.ARENA_TOKEN_MIN * 60000, since = now - Date.parse(p.tokens_at);
  const t = Math.min(K.ARENA_TOKENS, p.tokens + Math.floor(since / per));
  return { tokens: t, next: t >= K.ARENA_TOKENS ? 0 : Math.ceil((per - (since % per)) / 1000) };
}
const avgLvl = team => (team && team.length ? Math.round(team.reduce((t, h) => t + h.lvl, 0) / team.length) : 10);

// three opponents: real players near your rating first, bots for the rest
async function makeOffers(K, db, me, refLvl) {
  const players = (await db.opponents(me.user_id, me.rating)).filter(p => p.defense);
  players.sort(() => Math.random() - 0.5);
  const offers = players.slice(0, 3).map(p => ({ kind: 'player', user_id: p.user_id, name: p.name, avatar: p.avatar, rating: p.rating, power: p.defense_power, team: preview(p.defense) }));
  const spread = [-60, 10, 90];
  for (let i = offers.length; i < 3; i++) {
    const seed = randSeed(), rating = Math.max(0, me.rating + spread[i] + Math.round((Math.random() - 0.5) * 40));
    const bot = K.arenaBot(rating, refLvl, seed);
    offers.push({ kind: 'bot', name: bot.name, avatar: bot.team[0].id, rating, power: K.teamPower(bot.team), team: bot.team });
  }
  return offers.sort((a, b) => a.rating - b.rating);
}

async function state(K, db, me) {
  const tk = tokensNow(K, me, Date.now());
  return {
    rating: me.rating, wins: me.wins, losses: me.losses, defWins: me.def_wins, defLosses: me.def_losses,
    tokens: tk.tokens, nextToken: tk.next, weekFights: me.week_fights, unfinished: !!me.pending,
    defense: me.defense ? preview(me.defense) : null, defensePower: me.defense_power,
    offers: (me.offers || []).map(o => ({ kind: o.kind, name: o.name, avatar: o.avatar, rating: o.rating, power: o.power, team: preview(o.team) })),
    rewards: await db.unclaimed(me.user_id),
  };
}

// applies a manual fight's result: replayed with the player's moves, or a loss when it was never finished (moves null)
async function settle(K, db, user, me, p, moves) {
  const r = moves ? await K.arenaReplay(p.att, p.def, p.seed, moves) : { win: false, turns: 0 };
  const elo = K.arenaElo(me.rating, p.defRating, r.win);
  const res = await db.apply(user.id, p.defId, elo.att, p.defId ? elo.def : 0, r.win);
  await db.log({ attacker: user.id, defender: p.defId, attacker_name: me.name, defender_name: p.name, seed: p.seed, win: r.win, att_delta: elo.att, def_delta: p.defId ? elo.def : 0, att_team: p.att, def_team: p.def });
  return { r, elo, res };
}

export async function handle(K, db, user, body) {
  body = body || {};
  let me = await db.getPlayer(user.id);
  const name = clean(body.name), avatar = avatarOk(K, body.avatar);
  if (!me) me = await db.createPlayer(user.id, { name, avatar });
  else if (body.name && (me.name !== name || me.avatar !== avatar)) me = await db.updatePlayer(user.id, { name, avatar });
  const bad = body.team === undefined ? null : K.checkTeam(body.team) || (devHeroBad(body.team, user) ? 'developer hero' : null), team = body.team && !bad ? tidy(body.team) : null;

  if (body.action === 'state') {
    if (!me.offers) me = await db.updatePlayer(user.id, { offers: await makeOffers(K, db, me, avgLvl(team)) });
    return { state: await state(K, db, me) };
  }
  if (body.action === 'refresh') {
    me = await db.updatePlayer(user.id, { offers: await makeOffers(K, db, me, avgLvl(team)) });
    return { state: await state(K, db, me) };
  }
  if (body.action === 'defense') {
    if (!team) return { error: 'This team cannot be used (' + (bad || 'no team') + ').', status: 400 };
    me = await db.updatePlayer(user.id, { defense: team, defense_power: K.teamPower(team) });
    return { state: await state(K, db, me) };
  }
  // Manual fights (the game's default): 'start' takes a token and keeps the fight (seed and both teams) in
  // arena_players.pending; the browser plays it by hand and 'finish' sends its moves: the server replays the fight with
  // them (K.arenaReplay) and only that result counts. A fight left unfinished counts as a loss when the next one
  // starts, so walking away from a losing fight never saves rating.
  if (body.action === 'start') {
    if (!team) return { error: 'This team cannot be used (' + (bad || 'no team') + ').', status: 400 };
    const o = (me.offers || [])[body.offer];
    if (!o) return { error: 'That opponent is gone. Pick another one.', status: 409, state: await state(K, db, me) };
    let defTeam = o.team, defRating = o.rating, defId = null;
    if (o.kind === 'player') {
      const p = await db.getPlayer(o.user_id);
      if (!p || !p.defense) {
        me = await db.updatePlayer(user.id, { offers: await makeOffers(K, db, me, avgLvl(team)) });
        return { error: 'That player has no defense team any more. New opponents are ready.', status: 409, state: await state(K, db, me) };
      }
      defTeam = p.defense; defRating = p.rating; defId = p.user_id;
    }
    if (me.pending) { const p = me.pending; me = await db.updatePlayer(user.id, { pending: null }); await settle(K, db, user, me, p, null); me = await db.getPlayer(user.id); }
    const left = await db.takeToken(user.id, K.ARENA_TOKEN_MIN, K.ARENA_TOKENS);
    if (left < 0) { me = await db.getPlayer(user.id); return { error: 'No arena tokens left. A new one comes every hour.', status: 429, state: await state(K, db, me) }; }
    const seed = randSeed();
    const pending = { seed, att: team, def: defTeam, defId, defRating, name: o.name, kind: o.kind, before: me.rating, at: Date.now() };
    const patch = { pending, offers: await makeOffers(K, db, me, avgLvl(team)) };
    if (!me.defense) { patch.defense = team; patch.defense_power = K.teamPower(team); }
    me = await db.updatePlayer(user.id, patch);
    return { fight: { seed, att: team, def: defTeam, manual: true, before: pending.before, opponent: { name: o.name, rating: defRating, kind: o.kind } }, state: await state(K, db, me) };
  }
  if (body.action === 'finish') {
    const p = me.pending;
    if (!p) return { error: 'This arena fight is already over.', status: 409, state: await state(K, db, me) };
    if (!Array.isArray(body.moves)) return { error: 'Bad request.', status: 400 };
    me = await db.updatePlayer(user.id, { pending: null }); // cleared first: the same fight can never count twice
    const { r, elo, res } = await settle(K, db, user, me, p, body.moves);
    me = await db.getPlayer(user.id);
    return { fight: { seed: p.seed, win: r.win, turns: r.turns, delta: elo.att, rating: res.att_rating, before: p.before, opponent: { name: p.name, rating: p.defRating, kind: p.kind } }, state: await state(K, db, me) };
  }
  // the old auto fight (game versions before manual arena play)
  if (body.action === 'fight') {
    if (!team) return { error: 'This team cannot be used (' + (bad || 'no team') + ').', status: 400 };
    const o = (me.offers || [])[body.offer];
    if (!o) return { error: 'That opponent is gone. Pick another one.', status: 409, state: await state(K, db, me) };
    let defTeam = o.team, defRating = o.rating, defId = null;
    if (o.kind === 'player') {
      const p = await db.getPlayer(o.user_id);
      if (!p || !p.defense) {
        me = await db.updatePlayer(user.id, { offers: await makeOffers(K, db, me, avgLvl(team)) });
        return { error: 'That player has no defense team any more. New opponents are ready.', status: 409, state: await state(K, db, me) };
      }
      defTeam = p.defense; defRating = p.rating; defId = p.user_id;
    }
    const left = await db.takeToken(user.id, K.ARENA_TOKEN_MIN, K.ARENA_TOKENS);
    if (left < 0) { me = await db.getPlayer(user.id); return { error: 'No arena tokens left. A new one comes every hour.', status: 429, state: await state(K, db, me) }; }
    const seed = randSeed(), me0 = me;
    const r = await K.arenaFight(team, defTeam, seed);
    const elo = K.arenaElo(me.rating, defRating, r.win);
    const res = await db.apply(user.id, defId, elo.att, defId ? elo.def : 0, r.win);
    await db.log({ attacker: user.id, defender: defId, attacker_name: me.name, defender_name: o.name, seed, win: r.win, att_delta: elo.att, def_delta: defId ? elo.def : 0, att_team: team, def_team: defTeam });
    // a player without a defense team defends with the team they attack with, so others can find them
    const patch = { offers: await makeOffers(K, db, { ...me, rating: res.att_rating }, avgLvl(team)) };
    if (!me.defense) { patch.defense = team; patch.defense_power = K.teamPower(team); }
    me = await db.updatePlayer(user.id, patch);
    return {
      fight: { seed, att: team, def: defTeam, win: r.win, turns: r.turns, delta: elo.att, rating: res.att_rating, before: me0.rating, opponent: { name: o.name, rating: defRating, kind: o.kind } },
      state: await state(K, db, me),
    };
  }
  // guild boss: one of today's keys; the server plays the fight (the boss of today's essence on difficulty d) and
  // stores the damage. Difficulty d is open when that campaign difficulty is (Easy always, from Chapter II on).
  if (body.action === 'gboss') {
    if (!team) return { error: 'This team cannot be used (' + (bad || 'no team') + ').', status: 400 };
    const d = Number(body.d);
    if (!Number.isInteger(d) || d < 0 || d >= K.GBOSS.lvl.length) return { error: 'Unknown difficulty.', status: 400 };
    const gid = await db.guildOf(user.id);
    if (!gid) return { error: 'Join a guild first.', status: 403 };
    const pr = (await db.progress(user.id)) || {}, cleared = Number(pr.cleared ?? -1), dcl = Array.isArray(pr.dcl) ? pr.dcl : [];
    const open = d === 0 ? cleared >= 13 : d === 1 ? cleared >= K.STAGES.length - 1 : Number(dcl[d - 1] ?? -1) >= K.STAGES.length - 1;
    if (!open) return { error: 'This difficulty is not open for you yet.', status: 403 };
    const used = await db.keysUsed(user.id);
    if (used >= K.GBOSS.keys) return { error: 'No keys left today. You get ' + K.GBOSS.keys + ' new keys at midnight (UTC).', status: 429 };
    const ess = K.gbossEss(Math.floor(Date.now() / 86400000)), seed = randSeed();
    const r = await K.gbossFight(team, d, ess, seed);
    await db.gbossHit({ user_id: user.id, guild_id: gid, d, ess, seed, dmg: r.dmg, points: r.points });
    return { gboss: { seed, team, d, ess, dmg: r.dmg, points: r.points, turns: r.turns, keysLeft: K.GBOSS.keys - used - 1 } };
  }
  return { error: 'Unknown action.', status: 400 };
}

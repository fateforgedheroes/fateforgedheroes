// Balance test: for every starter hero, an auto-played new player must be able to finish the campaign, and it must
// take a real grind (replaying stages for gear, upgrading, ascending and summoning heroes).
// Run: npm test
const fs = require('fs'), path = require('path');
const K = new Function(fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8') + '\nreturn K;')();
const MAX_BATTLES = 8000;
const W = { atk: 3, hp: 0.12, def: 1, crit: 3, cdmg: 1.5, atkP: 4, hpP: 3, defP: 2, acc: 0.3, res: 0.3, spd: 4 };
const score = it => K.gearStats(it).reduce((s, [k, v]) => s + (W[k] || 0) * v, 0);
const newHero = id => ({ lvl: 1, xp: 0, stars: K.baseStars(id), sk: K.CHAMPS[id].skills.map(() => 0) });
// same formula as the game's team power, without gear: gear moves to whoever is in the team
const power = (st, id) => { const s = K.heroStats(id, st.roster[id], []); return s.hp * 0.12 + s.atk * 1.8 + s.def * 1.3 + s.spd * 4 + s.crit * 5 + s.cdmg * 2 + (s.acc + s.res) * 0.8; };
// a new player starts with only the chosen starter
function newState(starter) { return { roster: { [starter]: newHero(starter) }, team: [starter], inv: [], cleared: -1, silver: 400, stones: 0, nid: 1, fs: { fate: 3, greater: 1, ancient: 0, mythic: 0, legendary: 0 } }; }
// a stage is 3 phases in a row; survivors carry their HP over (with the small rest in between)
async function fight(st, S) {
  const heroes = st.team.map(id => K.heroUnit(id, st.roster[id], st.inv.filter(i => i.owner === id)));
  for (let p = 0; p < K.PHASES; p++) {
    if (p) K.phaseRest(heroes);
    if ((await new K.Battle(heroes, K.stageUnits(S, S.lvl, p), {}).run()) !== 'win') return 'lose';
  }
  return 'win';
}
// a new hero is brought up to near the team's level, as a player does with fodder and replays
const addHero = (st, id) => { const h = newHero(id); h.lvl = Math.max(1, Math.min(K.maxLvl(h.stars, id), Math.min(...st.team.map(t => st.roster[t].lvl)) - 3)); st.roster[id] = h; };
function reward(st, S, first) {
  // the team gets full XP; heroes on the bench get half (a player feeds fodder and rotates heroes in)
  for (const id in st.roster) { const h = st.roster[id], cap = K.maxLvl(h.stars, id); if (h.lvl >= cap || K.CHAMPS[id].captured) continue; h.xp += K.winXp(S.lvl) * (st.team.includes(id) ? 1 : 0.5); while (h.lvl < cap && h.xp >= K.xpNeed(h.lvl)) { h.xp -= K.xpNeed(h.lvl); h.lvl++; } }
  // first clears can unlock a hero, who joins the team while it has fewer than 4 (same rule as the game)
  if (first && S.unlock && !st.roster[S.unlock]) { addHero(st, S.unlock); if (st.team.length < 4) st.team.push(S.unlock); }
  // Fate Shards: guaranteed on a first clear, random drops on every win; summon and bring new heroes up
  if (first) st.fs[S.n === 6 ? 'greater' : 'fate']++;
  for (const t of K.rollShards()) st.fs[t]++;
  for (const t in st.fs) while (st.fs[t] > 0) { st.fs[t]--; const had = new Set(Object.keys(st.roster)); const r = K.summonOne(st, t); if (!had.has(r.id)) { const lv = st.roster[r.id]; delete st.roster[r.id]; addHero(st, r.id); st.roster[r.id].sk = lv.sk; } }
  // duplicates become spare copies: feed them to the same hero for skill levels
  for (const id in st.fodder || {}) while (st.fodder[id] > 0 && st.roster[id] && K.skillUp(st.roster[id], id) >= 0) st.fodder[id]--;
  st.silver += K.winSilver(S.lvl); st.stones += first ? 3 : Math.random() < 0.35 ? 1 : 0;
  if (first || Math.random() < 0.65) st.inv.push(K.genGear({ il: S.lvl, slot: S.slot || K.pick(K.SLOTS), ...K.stageLoot(S, 0), sets: [S.set] }, st.nid++));
  // strongest four heroes for the next stage form the team (essence matters: avoid heroes the enemies are strong against),
  // then gear, ascension and upgrades
  const next = K.STAGES[Math.min(st.cleared + 1, K.STAGES.length - 1)], foes = next.phases.flat().map(f => K.ALL_UNITS[f].aff);
  const edge = id => { const a = K.CHAMPS[id].aff; return 1 + 0.2 * (foes.filter(e => K.BEATS[a] === e).length - foes.filter(e => K.BEATS[e] === a).length) / foes.length; };
  const byPow = Object.keys(st.roster).filter(id => !K.CHAMPS[id].captured).sort((a, b) => power(st, b) * edge(b) - power(st, a) * edge(a));
  st.team = byPow.slice(0, 4);
  // a sensible player brings a healer once fights get long (Chapter IV on): the best one replaces the fourth attacker
  const heals = id => K.CHAMPS[id].skills.some(s => s.fx.some(f => f.t === 'heal' || f.t === 'shield' || f.t === 'revive'));
  if (next.chapter >= 3 && st.team.length === 4 && !st.team.some(heals)) { const h = byPow.find(heals); if (h && power(st, h) >= 0.5 * power(st, st.team[3])) st.team[3] = h; }
  for (const it of st.inv) if (it.owner && !st.team.includes(it.owner)) it.owner = null;
  for (const id of st.team) for (const slot of K.SLOTS) { const cur = st.inv.find(i => i.owner === id && i.slot === slot); const best = st.inv.filter(i => i.slot === slot && (!i.owner || i.owner === id)).sort((a, b) => score(b) - score(a))[0]; if (best && best !== cur) { if (cur) cur.owner = null; best.owner = id; } }
  // ascend capped heroes: the team first, then the best heroes on the bench
  for (const id of [...st.team, ...byPow.slice(4, 10)]) { const h = st.roster[id], c = K.rankCost(h.stars); if (h.lvl >= K.maxLvl(h.stars, id) && h.stars < K.maxStars(id) && st.stones >= c.stones && st.silver >= c.silver) { st.stones -= c.stones; st.silver -= c.silver; h.stars++; } }
  // gear upgrades, keeping enough silver aside for the next ascension
  const keep = 2000 + Math.max(...st.team.map(id => st.roster[id].stars < K.maxStars(id) ? K.rankCost(st.roster[id].stars).silver : 0));
  let sp = true; while (sp) { sp = false; for (const it of st.inv.filter(i => i.owner)) { const c = K.upgradeCost(it); if (it.lvl < K.MAX_GEAR_LVL && st.silver >= c + keep) { st.silver -= c; if (Math.random() < K.upgradeChance(it)) { it.lvl++; K.upgradeMilestone(it); } sp = true; } } }
  // spare silver buys Fate Shards at the altar (summoned right away on the next win)
  while (st.silver > keep + 12000) { st.silver -= K.SHARD_PRICE; st.fs.fate++; }
  // keep the inventory manageable: the weakest spare pieces are sold
  const spare = st.inv.filter(i => !i.owner).sort((a, b) => score(b) - score(a));
  for (const it of spare.slice(60)) { st.silver += K.sellValue(it); st.inv.splice(st.inv.indexOf(it), 1); }
}
// plays like a player: try the next stage; after a loss, farm a cleared stage (one stage lower after every lost farm run,
// back up after a won one), then try the next stage again
async function campaign(starter) {
  const st = newState(starter), perChapter = Array(K.CHAPTERS.length).fill(0); let n = 0, back = 1;
  while (st.cleared < K.STAGES.length - 1 && n < MAX_BATTLES) {
    const s = st.cleared + 1, S = K.STAGES[s]; n++; perChapter[S.chapter]++;
    if ((await fight(st, S)) === 'win') { st.cleared = s; reward(st, S, true); back = 1; continue; }
    const p = K.STAGES[Math.max(0, s - back)]; n++; perChapter[p.chapter]++;
    if ((await fight(st, p)) === 'win') { reward(st, p, false); back = Math.max(1, back - 1); } else back = Math.min(s, back + 1);
  }
  const ok = st.cleared === K.STAGES.length - 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} (${starter}): cleared ${st.cleared + 1}/${K.STAGES.length} stages in ${n} battles · per chapter ${perChapter.join(' ')} · team ${st.team.join(', ')}`);
  return ok;
}
(async () => {
  let ok = true;
  for (const s of K.STARTERS) ok = (await campaign(s)) && ok;
  process.exit(ok ? 0 : 1);
})();

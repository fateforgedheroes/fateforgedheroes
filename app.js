// ================= APP v2: screens, battle view, effects, sound, save =================
(function () {
  const $ = (s, el) => (el || document).querySelector(s);
  const C = K.CHAMPS, E = K.ALL_UNITS;
  const SAVE_KEY = 'ffh-save', OLD_SAVE_KEY = 'kronen-van-as-v1';
  const AFF_COL = { Ember: '#ff7a3a', Verdant: '#6cc04a', Storm: '#8fb4ff', Frost: '#9fe6ff', Radiant: '#f2d36b', Umbral: '#b07ae8', Aether: '#d8d0e8' };
  const AFF_TAG = { Ember: 'EM', Verdant: 'VE', Storm: 'ST', Frost: 'FR', Radiant: 'RA', Umbral: 'UM', Aether: 'AE' };
  const TARGET_LABEL = { enemy: 'One enemy', enemies: 'All enemies', random: 'Random enemies', lowestEnemy: 'Weakest enemy', ally: 'One ally', lowestAlly: 'Weakest ally', allies: 'Whole team', self: 'Self', deadAlly: 'Fallen ally' };
  const SKILL_TAG = ['Basic', 'Skill', 'Ultimate'];
  const ESS_PATH = {
    Ember: 'M8 1c1 3 4.5 4.2 4.5 8.2a4.5 4.5 0 0 1-9 0c0-2.2 1.2-3.4 2.2-4.3 0 2 .9 3.1 2 3.3C7.2 6 6.9 4 8 1z',
    Verdant: 'M2.5 14C2.5 7 6.5 2.8 14 2c0 7.6-4 12-11.5 12zM4.5 12.5 11 5.5',
    Storm: 'M9.5 1 3 9h4.2L6 15l7-8.4H8.8L9.5 1z',
    Frost: 'M7 1h2v4.3l3.7-2.1 1 1.7L10 7l3.7 2.1-1 1.7L9 8.7V15H7V8.7l-3.7 2.1-1-1.7L6 7 2.3 4.9l1-1.7L7 5.3z',
    Radiant: 'M8 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM7 0h2v3H7zm0 13h2v3H7zM0 7h3v2H0zm13 0h3v2h-3zM2.1 3.5l1.4-1.4 2 2-1.4 1.4zm8.4 8.4 1.4-1.4 2 2-1.4 1.4zM10.5 4.1l2-2 1.4 1.4-2 2zM2.1 12.5l2-2 1.4 1.4-2 2z',
    Umbral: 'M10.5 1.2A7 7 0 1 0 15 11.6 5.8 5.8 0 0 1 10.5 1.2z',
    Aether: 'M8 .8 13.2 8 8 15.2 2.8 8z',
  };
  const essIcon = a => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${ESS_PATH[a]}" fill="currentColor" ${a === 'Verdant' ? 'stroke="#140f12" stroke-width="1"' : ''}/></svg>`;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const roleStr = c => c.role + (c.role2 ? ' / ' + c.role2 : '');
  const AREA_OF = { Ember: 4, Verdant: 3, Frost: 1, Storm: 2, Radiant: 0, Umbral: 2, Aether: 1 };
  // the painted background (CHAPTER_BG index) of each campaign chapter: every stage of a chapter shares it; the moonlit
  // town of Chapter I returns for the last chapter
  const CHAPTER_BG_OF = [0, 6, 3, 2, 5, 8, 1, 7, 4, 0];
  // the new painted backgrounds, one per chapter as they come (backgrounds/ch<n>.webp, 16:9): sharp and drawn smoothly in a
  // battle ('h<chapter>', loaded before the battle starts), also the chapter's art on the campaign and Boss Hall screens;
  // a chapter without one keeps its CHAPTER_BG
  const CHAPTER_HI = { 0: 'backgrounds/ch1.webp', 1: 'backgrounds/ch2.webp', 2: 'backgrounds/ch3.webp', 3: 'backgrounds/ch4.webp', 4: 'backgrounds/ch5.webp', 5: 'backgrounds/ch6.webp', 6: 'backgrounds/ch7.webp', 7: 'backgrounds/ch8.webp', 8: 'backgrounds/ch9.webp', 9: 'backgrounds/ch10.webp' };
  const chapterBg = c => { c = Math.max(0, Math.min(CHAPTER_BG_OF.length - 1, c)); return CHAPTER_HI[c] ? 'h' + c : 'c' + CHAPTER_BG_OF[c]; };
  const chapterArt = c => CHAPTER_HI[c] || (typeof CHAPTER_BG !== 'undefined' ? CHAPTER_BG[CHAPTER_BG_OF[c]] : '');
  const preBg = c => (CHAPTER_HI[c] ? SPR.bgHi('h' + c, CHAPTER_HI[c]) : null); // starts loading it (the team screen before Fight)
  // the other battles fight on these backgrounds too: the Tower and the guild boss on the chapter of their essence
  // (Ember IV, Verdant III, Frost V, Umbral VI, Storm VII, Radiant VIII, Aether and the Tower of Fate X), the arena on
  // one of the ten (by its seed); the Boss Hall uses its boss's chapter and the Siege its own courtyard
  const ESS_CH = { Ember: 3, Verdant: 2, Frost: 4, Umbral: 5, Storm: 6, Radiant: 7, Aether: 9, All: 9 };

  // the painted page background behind every screen (shell.html body::before)
  if (typeof PAGE_BG !== 'undefined') document.documentElement.style.setProperty('--page-bg', `url(${PAGE_BG})`);

  // ---------- state ----------
  // what opens a building: the Fate Altar at a player level, the Arena and the Boss Hall after clearing a chapter (Easy)
  const UNLOCKS = { altaar: { lvl: 5 }, expedition: { ch: 1 }, tower: { ch: 2 }, arena: { ch: 2 }, guild: { ch: 2 }, kerkers: { ch: 3 }, siege: { ch: 3 } };
  const PLAYER_UNLOCK = { altaar: 5 }; // the player-level ones (level-up messages)
  const isOpen = (s, t) => { const u = UNLOCKS[t]; return !u || (u.lvl ? effLvl(s) >= u.lvl : s.cleared >= u.ch * 7 - 1); };
  const needTxt = t => { const u = UNLOCKS[t]; return u.lvl ? `player level ${u.lvl}` : `clearing Chapter ${ROMAN[u.ch - 1]}`; };
  const needTag = t => { const u = UNLOCKS[t]; return u.lvl ? `Lv ${u.lvl}` : `Ch ${ROMAN[u.ch - 1]}`; };
  const UNLOCK_NAME = { altaar: 'Fate Altar', kerkers: 'Boss Hall', arena: 'Arena', guild: 'Guilds', expedition: 'Expeditions', tower: 'Tower of Essence', siege: 'Siege' };
  // player XP per level: steeper than before (level 10, the Boss Hall, now takes ~75-130 battles instead of ~25)
  const pxNeed = l => 60 * l + 12 * l * l;
  // Player level stops at PLAYER_MAX; there the player can prestige (S.p.prestige): back to level 1 with everything kept,
  // a new emblem (PRESTIGE_ART[n - 1] when the art exists, else a numbered badge) and PRESTIGE_REWARD. Unlocks and max
  // energy count a prestiged player as level PLAYER_MAX (effLvl), so a prestige never takes anything away.
  // the game inside the desktop phone frame (desktop.html: an iframe of a phone's screen)
  const IN_FRAME = (() => { try { return window.top !== window.self; } catch (e) { return true; } })();
  const PLAYER_MAX = 100, PRESTIGE_REWARD = { silver: 25000, fs: { mythic: 1 } };
  const effLvl = s => (s.p.prestige ? PLAYER_MAX : s.p.lvl);
  const romanN = n => { let s = ''; for (const [v, r] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { s += r; n -= v; } return s; };
  const presEmblem = (n, cls) => !n ? '' : typeof PRESTIGE_ART !== 'undefined' && PRESTIGE_ART[Math.min(n, PRESTIGE_ART.length) - 1]
    ? `<img class="pres-emb img ${cls || ''}" src="${PRESTIGE_ART[Math.min(n, PRESTIGE_ART.length) - 1]}" alt="Prestige ${n}" title="Prestige ${n}">`
    : `<span class="pres-emb ${cls || ''}" title="Prestige ${n}">${romanN(n)}</span>`;
  // per cleared stage / Boss Hall level
  const playerWinXp = (lvl, first, boss) => Math.round((40 + lvl * 6) * (first ? 1.5 : 1) * (boss ? 1.2 : 1));
  const levelSilver = l => 100 * l;
  // a level-up refills: a full bar up to level LEVEL_FULL_EN (new players never wait), then a fixed LEVEL_EN, so energy
  // gets scarce late in the game (with Hard, Brutal and Nightmare costing more per stage)
  const LEVEL_FULL_EN = 15, LEVEL_EN = 60;
  const levelEnergy = l => (l <= LEVEL_FULL_EN ? K.energyMax(l) : LEVEL_EN);
  const RENAME_COST = 2500; // the first name change is free
  const renameCost = () => (S.p.renames ? RENAME_COST : 0);
  function newPlayer() { return { name: 'Adventurer', avatar: null, renames: 0, lvl: 1, xp: 0, st: { won: 0, lost: 0, bossWon: 0, summons: 0 } }; }
  // fields added to v7 after release: fill them in on load (a player who already changed their name used the free change)
  // Campaign difficulties (K.DIFFS): S.cleared = Easy progress (the old Normal), S.dcl[d] = highest stage cleared on difficulty d >= 1,
  // S.diff = selected difficulty. The old Brutal mode (S.hard, S.clearedHard) carries over as Normal progress.
  // S.seen: unlock messages already shown (speed 3×/5×, Fate Altar, Boss Hall); existing players don't get old ones again.
  // ---------- Teams: up to TEAM_MAX named teams (S.teams[i] = { name, ids }); S.modeTeam says which team each game mode
  // uses. S.team is the team in use (the one on the Team screen and in the last battle): the same array as
  // S.teams[S.tsel].ids, linked again after every load (JSON drops the link) ----------
  const TEAM_MAX = K.ESSENCES.length, TEAM_MODES = [['campaign', 'Campaign'], ['boss', 'Boss Hall'], ['arena', 'Arena'], ['guild', 'Guild Boss'], ['siege', 'Siege']];
  // The own hero (S.hero = { id, name, g, cls }; engine PC_CLASSES): made at the start, always first in every team and every
  // Tower team (keepHero), 6 stars and skills that follow its level (syncHero, run on every save).
  const heroId = () => (S && S.hero && S.roster[S.hero.id] ? S.hero.id : null);
  const noHero = () => !heroId();
  function keepHero(ids, hid) { if (!hid) return ids; const out = ids.filter(x => x !== hid); out.unshift(hid); ids.splice(0, ids.length, ...out.slice(0, 4)); return ids; }
  function syncHero(s) {
    const id = s.hero && s.roster[s.hero.id] ? s.hero.id : null; if (!id) return;
    const h = s.roster[id], sk = K.pcSkills(id, h.lvl); h.stars = K.pcStars(h.lvl); h.sk = sk.map((v, i) => Math.min(v, Math.max(v, (h.sk || [])[i] || 0)));
    C[id].name = C[id].short = s.hero.name;
  }
  function linkTeams(s) {
    if (!Array.isArray(s.teams) || !s.teams.length) s.teams = [{ name: 'Team 1', ids: Array.isArray(s.team) ? s.team : [] }];
    s.tsel = Math.min(Math.max(0, s.tsel | 0), s.teams.length - 1);
    s.modeTeam = s.modeTeam || {};
    { const hid = s.hero && s.roster[s.hero.id] ? s.hero.id : null; if (hid) s.teams.forEach(t => keepHero(t.ids, hid)); }
    if (s.modeTeam.siege == null && s.modeTeam.campaign != null) s.modeTeam.siege = s.modeTeam.campaign;
    for (const [m] of TEAM_MODES) if (!(s.modeTeam[m] < s.teams.length)) s.modeTeam[m] = 0;
    s.bossTeam = s.bossTeam || {}; for (const k in s.bossTeam) if (!(s.bossTeam[k] < s.teams.length)) delete s.bossTeam[k];
    s.team = s.teams[s.tsel].ids;
    return s;
  }
  // a new team's default name: the first "Team n" that is not taken yet (after a delete the count alone would repeat a name)
  const freeTeamName = () => { let n = 1; while (S.teams.some(t => t.name === 'Team ' + n)) n++; return 'Team ' + n; };
  const teamIds = mode => (S.teams[S.modeTeam[mode]] || S.teams[0]).ids;
  const inAnyTeam = id => S.teams.some(t => t.ids.includes(id));
  const teamsOf = id => S.teams.filter(t => t.ids.includes(id)).map(t => t.name);
  // switch to the team a mode uses (before its battle)
  function useTeam(mode) { S.tsel = S.modeTeam[mode] || 0; S.team = S.teams[S.tsel].ids; }
  // the Boss Hall can have a team per boss essence (S.bossTeam[essence] = team index, chosen on the Boss Hall screen);
  // a boss of an essence without one uses the Boss Hall team (S.modeTeam.boss)
  const bossTeamIdx = aff => { const i = S.bossTeam && S.bossTeam[aff]; return i != null && i < S.teams.length ? i : (S.modeTeam.boss || 0); };
  function useBossTeam(aff) { S.tsel = bossTeamIdx(aff); S.team = S.teams[S.tsel].ids; }
  function fixup(s) {
    if (!s.elx || typeof s.elx !== 'object') s.elx = {}; // Essence Elixirs per essence
    if (!s.story || typeof s.story !== 'object') s.story = {}; // story scenes seen (story.js)
    if (!s.sg || typeof s.sg !== 'object') s.sg = { best: 0, runs: 0, kills: 0 }; // the Siege: best wave, runs, kills (tickets: sgT, sgAt)
    // energy above the bar is capped at K.ENERGY.over times it (older saves could pile up thousands)
    if (s.p) { const ceil = K.energyMax(effLvl(s)) * K.ENERGY.over; if (s.energy > ceil) s.energy = ceil; }
    // the Support class was dropped before release: a test save's Support hero becomes a Healer (same id everywhere)
    if (s.hero && s.hero.cls === 'support') {
      const o = `"pc_support_${s.hero.g}"`, n = `"pc_healer_${s.hero.g}"`, t = JSON.parse(JSON.stringify(s).split(o).join(n));
      for (const k of Object.keys(s)) delete s[k]; Object.assign(s, t); s.hero.cls = 'healer';
    }
    linkTeams(s); syncHero(s); s.stx = s.stx || { greater: 0, ancient: 0 }; if (!(s.gems >= 0)) s.gems = 0;
    // heroes that gained a skill (every hero has 3 now): pad the skill levels
    for (const id in s.roster) { const c = K.CHAMPS[id], h = s.roster[id]; if (c && Array.isArray(h.sk)) while (h.sk.length < c.skills.length) h.sk.push(0); } if (s.p.lvl > PLAYER_MAX) { s.p.lvl = PLAYER_MAX; s.p.xp = 0; } s.tw = s.tw || { prog: {}, team: {}, cur: 'Ember' };
    if (s.p.renames == null) s.p.renames = s.p.name !== 'Adventurer' ? 1 : 0; s.fodder = s.fodder || {};
    if (s.music == null) s.music = true; // background music (MUSIC), on by default
    s.chr = s.chr || {}; // chapter reward chests claimed: { difficulty: [chapters] }
    // the starter hero (default portrait); older saves did not store it, so take the starter that is in the roster
    if (!s.starter && !s.needStarter) s.starter = ['thalnir', 'krothar', 'zephara', 'ithyra', 'drakulen', ...K.STARTERS].find(id => s.roster[id]) || null;
    // the homebase tour (TOUR) is for new players; anyone past the first stage has found their way already
    if (s.seen && s.seen.tour == null && s.cleared > 0) s.seen.tour = true;
    // a difficulty that was already open before its unlock message existed is not announced again
    if (s.seen && !s.seen.diffs) { s.seen.diffs = 1; for (let d = 1; d < K.DIFFS.length; d++) if ((d === 1 ? s.cleared : ((s.dcl || [])[d - 1] ?? -1)) >= K.STAGES.length - 1) s.seen['diff' + d] = true; }
    if (!s.dcl) { s.dcl = [null, s.clearedHard ?? -1, -1, -1, -1]; s.diff = 0; delete s.hard; delete s.clearedHard; }
    if (!s.seen) {
      s.seen = {};
      for (const [sp, at] of SPEED_UNLOCK) if (sp > 2 && s.cleared + 1 >= at) s.seen['spd' + sp] = true;
      for (const k in UNLOCKS) if (isOpen(s, k)) s.seen[k] = true;
    }
    return s;
  }
  const clearedOn = d => (d ? S.dcl[d] ?? -1 : S.cleared);
  // a campaign difficulty is open once every stage of the one before it is cleared; Boss Hall levels open with theirs
  // (levels 3-4 with Normal, 5-6 Hard, 7-8 Brutal, 9-10 Nightmare), so the Boss Hall is never a shortcut to better gear
  const diffOpen = i => !i || clearedOn(i - 1) >= K.STAGES.length - 1;
  const bhLvlOpen = n => diffOpen(K.bossDiff(n));
  const bhLvlNeed = n => `Opens with ${K.DIFFS[K.bossDiff(n)].name}: clear all of ${K.DIFFS[K.bossDiff(n) - 1].name} in the campaign`;
  function newHero(id) { return { lvl: 1, xp: 0, stars: K.baseStars(id), sk: C[id].skills.map(() => 0) }; }
  // A new save has no heroes yet: the player first creates their own hero (createHtml), the rest is earned in Chapter I.
  function fresh() {
    const s = { v: 7, reset: RESET, p: newPlayer(), silver: 400, fs: { fate: 3, greater: 1, ancient: 0, mythic: 0, legendary: 0 }, stones: 0, roster: {}, team: [], inv: [], nid: 1, cleared: -1, dcl: [null, -1, -1, -1, -1], diff: 0, seen: {}, bh: {}, bhSel: {}, bhCur: K.BOSS_ORDER[0], auto: false, speed: 1, sound: true, music: true };
    for (let i = 0; i < 4; i++) s.inv.push(K.genGear({ il: 1 }, s.nid++));
    return s;
  }
  // Progress reset for everyone: raise RESET and every older save (local or cloud) starts over on load.
  // Kept: player name (and how often it was changed), sound and speed.
  const RESET = 2; // 2: reset with the difficulty, Boss Hall and XP rebalance
  function resetSave(o) {
    const s = fresh(), p = o.p || {};
    if (p.name) s.p.name = p.name;
    s.p.renames = p.renames || 0;
    s.sound = o.sound ?? true; s.speed = o.speed || 1;
    s.wasReset = true;
    return s;
  }
  const IDMAP = { aldric: 'draelyn', lyra: 'valkessa', grolm: 'brukkar', maren: 'faedrin', wachter: 'bromir', urgha: 'krothar', drenk: 'skavren', nixa: 'ithyra', vex: 'thalnir', kira: 'vaessa', baelzor: 'morgrim', thessa: 'aurelion', sera: 'selenia', bram: 'karnok', elwin: 'oraneth', mira: 'zyrael', morvin: 'drakulen', zhar: 'nyressa', kaalvoet: 'vorlund', rogh: 'grythor' };
  function to4(o) {
    o.v = 4; o.bh = o.bh || {}; o.bhSel = o.bhSel || {}; o.bhCur = o.bhCur || K.BOSS_ORDER[0];
    delete o.dg; delete o.dgSel;
    for (const id in o.roster) { const h = o.roster[id]; h.stars = Math.min(h.stars, K.maxStars(id)); h.lvl = Math.min(h.lvl, K.maxLvl(h.stars, id)); }
    if (!o.v4note) { o.v4note = true; o.migrated4 = true; }
    return o;
  }
  // v4 -> v5: 10 old stages become 10 chapters x 7 stages; old progress maps onto the new level curve
  function to5(o) {
    const map = k => (k < 0 ? k : Math.min(K.STAGES.length - 1, Math.round((k + 1) * 2.1) - 1));
    o.cleared = map(o.cleared ?? -1); o.clearedHard = map(o.clearedHard ?? -1);
    o.v = 5; o.migrated5 = true;
    return o;
  }
  // v5 -> v6: crown shards become Fate Shards, hero rarities changed (clamp stars and levels)
  function to6(o) {
    o.fs = { fate: o.shards || 0, greater: 1, ancient: 0, mythic: 0, legendary: 0 };
    delete o.shards; delete o.pity;
    for (const id in o.roster) { const h = o.roster[id]; if (!C[id]) { delete o.roster[id]; continue; } h.stars = Math.max(K.baseStars(id), Math.min(h.stars, K.maxStars(id))); h.lvl = Math.min(h.lvl, K.maxLvl(h.stars, id)); }
    o.v = 6; o.migrated6 = true;
    return o;
  }
  // v6 -> v7: player profile and player level; everyone starts at level 1
  function to7(o) {
    o.p = newPlayer();
    o.v = 7; o.migrated7 = true;
    return o;
  }
  function migrateVersion(o) {
    if (!o || !o.roster) return null;
    if (o.v === 7) return o;
    if (o.v === 6) return to7(o);
    if (o.v === 5) return to7(to6(o));
    if (o.v === 4) return to7(to6(to5(o)));
    const m = migrate3(o);
    return m ? to7(to6(to5(to4(m)))) : null;
  }
  // every load goes through here (local saves and cloud saves alike), so a reset reaches every player
  function migrate(o) {
    const m = migrateVersion(o);
    return m && (m.reset || 0) < RESET ? resetSave(m) : m;
  }
  function migrate3(o) {
    if (o.v === 3) return o;
    if (o.v === 2) {
      const roster = {};
      for (const old in o.roster) { const id = IDMAP[old] || old; if (!C[id]) continue; const h = o.roster[old]; roster[id] = { lvl: h.lvl, xp: h.xp, stars: Math.max(K.baseStars(id), h.stars || 1), sk: C[id].skills.map((_, i) => Math.min(K.SKILL_MAX, (h.sk || [])[i] || 0)) }; roster[id].lvl = Math.min(roster[id].lvl, K.maxLvl(roster[id].stars)); }
      for (const id of K.START_ROSTER) if (!roster[id]) roster[id] = newHero(id);
      o.roster = roster;
      o.team = [...new Set((o.team || []).map(x => IDMAP[x] || x).filter(x => roster[x]))];
      if (!o.team.length) o.team = ['draelyn', 'zarvion', 'valkessa', 'faedrin'];
      o.inv.forEach(it => { if (it.owner) it.owner = IDMAP[it.owner] || it.owner; if (!roster[it.owner]) it.owner = null; });
      o.v = 3; o.migrated = true;
      return o;
    }
    if (o.v === 1) {
      const s = fresh();
      for (const old in o.roster) { const id = IDMAP[old] || old; if (!C[id]) continue; s.roster[id] = newHero(id); s.roster[id].lvl = Math.min(K.maxLvl(s.roster[id].stars), o.roster[old].lvl || 1); }
      s.team = (o.team || []).map(x => IDMAP[x] || x).filter(id => s.roster[id]); if (!s.team.length) s.team = ['draelyn', 'zarvion', 'valkessa', 'faedrin'];
      s.cleared = o.cleared ?? -1; s.silver = (o.silver || 0) + 600; s.auto = !!o.auto; s.speed = o.speed || 1;
      s.migrated = true;
      return s;
    }
    return null;
  }
  // Local safety net (the cloud one is the save_history table, see 0002_save_history.sql): on start the save as it is
  // stored, before any migration, is copied into BACKUP_KEY, at most once per 12 hours, keeping the newest 3 copies.
  // The profile screen can put one back.
  const BACKUP_KEY = 'ffh-save-backup', BACKUP_EVERY = 12 * 3600e3, BACKUPS = 3;
  function readBackups() { try { const l = JSON.parse(localStorage.getItem(BACKUP_KEY)); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function backupRaw(raw, force) {
    try {
      const list = readBackups();
      if (list[0] && (list[0].raw === raw || (!force && Date.now() - list[0].at < BACKUP_EVERY))) return;
      list.unshift({ at: Date.now(), raw });
      localStorage.setItem(BACKUP_KEY, JSON.stringify(list.slice(0, BACKUPS)));
    } catch (e) { try { localStorage.removeItem(BACKUP_KEY); } catch (e2) { /* no storage */ } }
  }
  function load(snap) {
    if (snap && snap.v === 7) return snap;
    try { const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY); if (raw) { backupRaw(raw); const m = migrate(JSON.parse(raw)); if (m) return m; } } catch (e) { /* no storage */ }
    return fresh();
  }
  let S;
  function save() { syncHero(S); S.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } if (window.FFH_CLOUD) window.FFH_CLOUD.queue(); try { defSoon(); } catch (e) { /* the arena code is not set up yet (early in the boot) */ } }

  // ---------- sound ----------
  // two volumes, 0-1: sound effects S.vol and music S.mvol (older saves: the old shared S.vol), a slider each in
  // Town Hall → Settings and the ☰ menu. A slider at 0 switches that sound off (S.sound / S.music) and keeps the
  // volume, so the header button still mutes both and turns back on what was on, at the same volume.
  const VOL = () => (S && S.vol != null ? S.vol : 0.7), MVOL = () => (S && S.mvol != null ? S.mvol : VOL()), MUS_GAIN = 0.5;
  // the header button mutes everything (sound effects and music) and turns back on what was on (S.audioWas)
  function toggleAudio() {
    if (S.sound || S.music) { S.audioWas = { s: S.sound, m: S.music }; S.sound = S.music = false; }
    else { const w = S.audioWas || {}; S.sound = w.s !== false; S.music = w.m !== false; if (!w.s && !w.m) S.sound = S.music = true; }
    save(); hud(); MUSIC.refresh(); if (S.sound) SFX.click(); volSync();
  }
  const volVal = k => Math.round((k === 'music' ? (S.music ? MVOL() : 0) : (S.sound ? VOL() : 0)) * 100);
  // the speaker behind each slider mutes that sound (or turns it back on at its volume), drawn like the header's
  const muteIc = on => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 6h3l4-3v10l-4-3h-3z"/><path d="${on ? 'M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6.3 6.3 0 0 1 0 9' : 'M11 6l4 4M15 6l-4 4'}"/></svg>`;
  const muteBtn = (k, v) => `<button type="button" class="vol-mute ${v ? 'on' : ''}" data-vk="${k}" aria-pressed="${!v}" title="${v ? 'Mute' : 'Turn back on'}">${muteIc(v)}</button>`;
  const volSlider = k => { const m = k === 'music', v = volVal(k); return `<div class="vol-ctl"><span>${m ? 'Music' : 'Sound effects'}</span><input type="range" class="vol-range" data-vk="${k}" min="0" max="100" step="5" value="${v}" aria-label="${m ? 'Music volume' : 'Sound effects volume'}"><output>${v ? v + '%' : 'Off'}</output>${muteBtn(k, v)}</div>`; };
  // after the header mute button or a slider's own: the sliders show 0 / Off for what is muted
  const volSync = () => document.querySelectorAll('.vol-range').forEach(r => { const v = volVal(r.dataset.vk), o = r.nextElementSibling; r.value = v; if (o) { o.textContent = v ? v + '%' : 'Off'; const b = o.nextElementSibling; if (b) { b.classList.toggle('on', !!v); b.setAttribute('aria-pressed', String(!v)); b.title = v ? 'Mute' : 'Turn back on'; b.innerHTML = muteIc(v); } } });
  document.addEventListener('click', e => {
    const b = e.target.closest('.vol-mute'); if (!b) return;
    if (b.dataset.vk === 'music') { S.music = !S.music; MUSIC.refresh(); } else { S.sound = !S.sound; SFX.vol(); if (S.sound) SFX.click(); }
    save(); hud(); setTimeout(volSync); // after this click has reached every listener (the ☰ menu checks where it landed)
  });
  document.addEventListener('input', e => {
    if (!e.target.classList || !e.target.classList.contains('vol-range')) return;
    const k = e.target.dataset.vk, v = +e.target.value;
    if (k === 'music') { S.music = v > 0; if (v) S.mvol = v / 100; MUSIC.refresh(); } else { S.sound = v > 0; if (v) S.vol = v / 100; SFX.vol(); }
    hud(); volSync();
  });
  document.addEventListener('change', e => { if (e.target.classList && e.target.classList.contains('vol-range')) { save(); if (e.target.dataset.vk !== 'music' && S.sound) SFX.click(); } });
  const SFX = (() => {
    let ctx = null, master = null, volK = 1;
    function ac() {
      if (!S || !S.sound) return null;
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.2 * VOL(); master.connect(ctx.destination); } catch (e) { return null; } }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, vol, slide, delay) {
      const c = ac(); if (!c) return;
      const t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime((vol || 0.3) * volK, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
    }
    function noise(dur, vol, hp, delay) {
      const c = ac(); if (!c) return;
      const t = c.currentTime + (delay || 0), b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
      const g = c.createGain(); g.gain.value = (vol || 0.4) * volK; s.connect(f); f.connect(g); g.connect(master); s.start(t);
    }
    const api = {
      unlock() { ac(); },
      hit() { noise(0.1, 0.45, 700); tone(150, 0.09, 'square', 0.18, 0.5); },
      crit() { noise(0.22, 0.7, 250); tone(95, 0.25, 'sawtooth', 0.3, 0.4); tone(900, 0.1, 'square', 0.12, 1.6, 0.03); },
      swing() { noise(0.07, 0.22, 2400); },
      arrow() { noise(0.05, 0.25, 3500); tone(1200, 0.05, 'triangle', 0.08, 0.6); },
      magic() { tone(620, 0.24, 'triangle', 0.22, 1.8); tone(930, 0.2, 'sine', 0.14, 1.5, 0.05); },
      fire() { noise(0.3, 0.4, 300); tone(200, 0.3, 'sawtooth', 0.12, 0.5); },
      boom() { noise(0.45, 0.8, 90); tone(60, 0.45, 'sine', 0.45, 0.5); },
      heal() { [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, 1, i * 0.07)); },
      buff() { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.11, 'square', 0.09, 1, i * 0.05)); },
      shield() { tone(440, 0.35, 'sine', 0.22, 1.35); tone(660, 0.3, 'sine', 0.12, 1.2, 0.06); },
      death() { tone(240, 0.45, 'sawtooth', 0.2, 0.3); },
      banner() { tone(330, 0.12, 'square', 0.12, 1.5); tone(495, 0.18, 'square', 0.1, 1.2, 0.08); },
      win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.16, 1, i * 0.12)); tone(1047, 0.6, 'triangle', 0.18, 1, 0.5); },
      lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.22, 1, i * 0.18)); },
      // the summon reveal: a rising hum while the shard charges, a bright ping each time it turns a rarer colour, the burst
      sumCharge(n) { tone(110, 0.95 * n + 0.3, 'sawtooth', 0.05, 2.2 + n * 0.6); tone(220, 0.95 * n + 0.3, 'triangle', 0.06, 2 + n * 0.5); noise(0.9 * n, 0.08, 2500); },
      sumStep(r) { const f = [0, 0, 523, 659, 784][r]; tone(f, 0.5, 'triangle', 0.16); tone(f * 1.5, 0.6, 'sine', 0.1, 1, 0.05); noise(0.25, 0.18, 1800); },
      sumBurst(r) { noise(0.7, 0.55, 220); tone(70, 0.6, 'sine', 0.35, 0.5); const ch = r >= 4 ? [523, 659, 784, 1047, 1319] : r >= 3 ? [440, 554, 659, 880] : [392, 494, 587]; ch.forEach((f, i) => tone(f, 1.2 + i * 0.1, 'triangle', 0.1, 1, 0.08 + i * 0.07)); if (r >= 4) tone(1568, 1.6, 'sine', 0.12, 1, 0.45); },
      summon(r) { const base = [330, 392, 440, 523, 659][r]; for (let i = 0; i < 4 + r; i++) tone(base * (1 + i * 0.25), 0.16, 'triangle', 0.14, 1, i * 0.06); if (r >= 3) tone(base * 2, 0.8, 'sine', 0.2, 1, 0.4); },
      click() { tone(880, 0.035, 'square', 0.07); },
      up() { tone(660, 0.1, 'square', 0.12, 1.5); tone(990, 0.15, 'square', 0.1, 1.2, 0.08); },
      fail() { tone(200, 0.25, 'square', 0.15, 0.6); },
    };
    // calm mode (5× battles): combat sounds play at most once per 400 ms, at half volume
    const COMBAT = ['hit', 'crit', 'swing', 'arrow', 'magic', 'fire', 'boom', 'heal', 'buff', 'shield', 'death', 'banner'];
    let last = 0;
    api.calm = false;
    for (const k of COMBAT) {
      const f = api[k];
      api[k] = (...a) => {
        if (!api.calm) return f(...a);
        const now = performance.now(); if (now - last < 400) return; last = now;
        volK = 0.5; f(...a); volK = 1;
      };
    }
    api.vol = () => { if (master) master.gain.value = 0.2 * VOL(); }; // the volume slider moved
    return api;
  })();

  // ---------- music ----------
  // Background music made live with WebAudio: small synthesised instruments (strings, cellos, violin, horns, choir,
  // harp, lute, flute, upright bass, timpani, taiko, frame drum, tambourine, cymbal swell) through a hall reverb.
  // Three tracks: 'home' (a relaxed tavern tune in 6/8 for the homebase and menus), 'battle' (epic orchestral) and
  // 'boss' (darker and heavier). A track is a list of chords (one per bar) and a melody written as notes per eighth note
  // ('-' holds the note before, '.' is a rest); its acc() adds the accompaniment for every bar. A Web Worker tick
  // schedules ahead, so the music keeps time in a hidden tab too. S.music switches it on or off.
  const MUSIC = (() => {
    const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const freq = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
    const CHORD = { C: ['C', 'E', 'G'], D: ['D', 'F#', 'A'], G: ['G', 'B', 'D'], A: ['A', 'C#', 'E'], Bm: ['B', 'D', 'F#'], Em: ['E', 'G', 'B'],
      Dm: ['D', 'F', 'A'], Bb: ['A#', 'D', 'F'], F: ['F', 'A', 'C'], Gm: ['G', 'A#', 'D'], Cm: ['C', 'D#', 'G'], Ab: ['G#', 'C', 'D#'], Fm: ['F', 'G#', 'C'] };
    // chord tone k (0 root, 1 third, 2 fifth, 3 root an octave up) in octave o, kept above the root
    const tone = (ch, k, o) => { const c = CHORD[ch], r = NOTE[c[0]]; const n = c[k % 3]; return freq(n + (o + (k >= 3 ? 1 : 0) + (NOTE[n] < r ? 1 : 0))); };
    const TRACKS = {
      // the homebase: a relaxed tavern tune in 6/8 (six eighths a bar): lute, upright bass, frame drum and tambourine;
      // a flute has the tune first, a fiddle the second time
      home: {
        bpm: 108, bar: 6, vol: 0.55,
        chords: 'D G D A Bm G A D D G D A Bm G A D',
        lead: [
          'A4 - D5 F#5 - E5', 'D5 - B4 G4 - B4', 'A4 - D5 F#5 - A5', 'E5 - - . . .',
          'F#5 - E5 D5 - B4', 'G4 - B4 D5 - G5', 'E5 - C#5 A4 - C#5', 'D5 - - . . .',
          'F#5 - A5 D6 - A5', 'B5 - G5 D5 - G5', 'F#5 - E5 D5 - F#5', 'E5 - - C#5 - A4',
          'B4 - D5 F#5 - D5', 'G5 - F#5 E5 - D5', 'C#5 - E5 A5 - G5', 'F#5 - - D5 - .',
        ],
        leadInst: b => (b < 8 ? 'flute' : 'fiddle'),
        acc(add, b, ch) {
          add(0, 'ubass', tone(ch, 0, 2), 3, 0.5); add(3, 'ubass', tone(ch, 2, 2), 3, 0.42);
          for (const s of [0, 3]) for (let k = 0; k < 3; k++) add(s + k * 0.04, 'lute', tone(ch, k, 3), 2.5, 0.16);
          add(1, 'lute', tone(ch, 2, 4), 1, 0.1); add(2, 'lute', tone(ch, 1, 4), 1, 0.09); add(4, 'lute', tone(ch, 3, 3), 1, 0.1); add(5, 'lute', tone(ch, 1, 4), 1, 0.09);
          add(0, 'frame', 0, 1, 0.5); add(3, 'frame', 0, 1, 0.3);
          if (b >= 4) { add(2, 'tamb', 0, 1, 0.16); add(5, 'tamb', 0, 1, 0.2); }
          if (b >= 8) for (let k = 0; k < 3; k++) add(0, 'strings', tone(ch, k, 3), 6, 0.035);
        },
      },
      // battles: epic and driving, D minor; strings ostinato, then horns with choir and taiko for the second half
      battle: {
        bpm: 136, bar: 8, vol: 0.5,
        chords: 'Dm Bb F C Dm Bb C A Dm Bb F C Gm Bb A Dm',
        lead: [
          'D5 - - - A4 - D5 E5', 'F5 - - - E5 - D5 -', 'C5 - - - F5 - A5 -', 'G5 - - - - - . .',
          'A5 - - - G5 - F5 E5', 'D5 - - - F5 - D5 -', 'G4 - A#4 - D5 - G5 -', 'E5 - - - C#5 - A4 -',
          'D5 - - - F5 - A5 -', 'A#5 - - - A5 - G5 -', 'A5 - - - G5 - F5 -', 'G5 - - - E5 - C5 -',
          'D5 - G5 - A#5 - D6 -', 'C6 - A#5 - A5 - F5 -', 'E5 - - - A5 - C#6 -', 'D6 - - - - - - -',
        ],
        leadInst: b => (b < 8 ? 'violin' : 'brass'),
        acc(add, b, ch) {
          const big = b >= 8;
          [0, 3, 2, 0, 0, 3, 2, 1].forEach((k, i) => add(i, 'stacc', tone(ch, k, 3), 0.7, i % 4 === 0 ? 0.11 : 0.075));
          add(0, 'cello', tone(ch, 0, 2), 8, 0.2);
          for (let k = 0; k < 3; k++) add(0, 'strings', tone(ch, k, 4), 8, big ? 0.05 : 0.035);
          if (big) { for (let k = 0; k < 3; k++) add(0, 'choir', tone(ch, k, 4), 8, 0.035); 'T.t.TTt.'.split('').forEach((d, i) => { if (d !== '.') add(i, 'taiko', 0, 1, d === 'T' ? 0.9 : 0.5); }); }
          else { add(0, 'timp', tone(ch, 0, 2), 2, 0.5); if (b % 2) add(4, 'timp', tone(ch, 2, 1), 2, 0.35); }
          if (b === 7 || b === 15) add(4, 'swell', 0, 4, 0.12);
        },
      },
      // bosses: darker and heavier, C minor; hammering low strings, horn stabs, choir throughout, taiko every bar
      boss: {
        bpm: 120, bar: 8, vol: 0.52,
        chords: 'Cm Cm Ab Ab Fm Fm G G Cm Ab Fm G Cm Ab G Cm',
        lead: [
          'C5 - - - D#5 - D5 C5', 'G4 - - - - - . .', 'G#4 - C5 - D#5 - G5 -', 'F5 - D#5 - C5 - . .',
          'F4 - G#4 - C5 - F5 -', 'D#5 - C5 - G#4 - . .', 'G4 - B4 - D5 - F5 -', 'D5 - B4 - G4 - . .',
          'G5 - - - D#5 - C5 -', 'D#5 - - - C5 - G#4 -', 'C5 - - - G#4 - F4 -', 'B4 - D5 - G5 - F5 -',
          'D#5 - G5 - C6 - D#6 -', 'D6 - C6 - G#5 - G5 -', 'B5 - - - D6 - F6 -', 'C6 - - - - - - -',
        ],
        leadInst: b => (b < 8 ? 'violin' : 'brass'),
        acc(add, b, ch) {
          const big = b >= 8;
          [0, 0, 2, 0, 0, 2, 0, 1].forEach((k, i) => add(i, 'stacc', tone(ch, k, 2), 0.6, i % 3 === 0 ? 0.13 : 0.08));
          add(0, 'cello', tone(ch, 0, 1), 8, 0.22);
          for (let k = 0; k < 3; k++) add(0, 'choir', tone(ch, k, big ? 4 : 3), 8, big ? 0.04 : 0.03);
          if (big) { add(0, 'brassStab', tone(ch, 0, 3), 1.5, 0.12); add(3, 'brassStab', tone(ch, 2, 3), 1.5, 0.1); for (let k = 0; k < 3; k++) add(0, 'strings', tone(ch, k, 4), 8, 0.04); }
          'T.T.TtTt'.split('').forEach((d, i) => { if (d !== '.') add(i, 'taiko', 0, 1, d === 'T' ? (big ? 1 : 0.7) : 0.45); });
          add(0, 'timp', tone(ch, 0, 2), 2, 0.55);
          if (b === 7 || b === 15) add(4, 'swell', 0, 4, 0.14);
        },
      },
    };
    // a track as events per eighth note: byStep[step] = [{ off, inst, f, len, vol }] (off: a fraction of a step, for strums)
    function build(t) {
      const chords = t.chords.split(' '), steps = chords.length * t.bar, byStep = Array.from({ length: steps }, () => []);
      const add = (b, s, inst, f, len, vol) => { const st = b * t.bar + Math.floor(s); byStep[st % steps].push({ off: s - Math.floor(s), inst, f, len, vol }); };
      t.lead.forEach((bar, b) => { let last = null; bar.split(' ').forEach((tok, i) => {
        if (tok === '-') { if (last) last.len++; } else if (tok === '.') last = null;
        else { last = { off: 0, inst: t.leadInst(b), f: freq(tok), len: 1, vol: 1 }; byStep[b * t.bar + i].push(last); }
      }); });
      chords.forEach((ch, b) => t.acc((s, inst, f, len, vol) => add(b, s, inst, f, len, vol), b, ch));
      return { byStep, steps, spb: 60 / t.bpm / 2, vol: t.vol };
    }
    let ctx = null, out = null, dry = null, wet = null, noiseBuf = null, cur = null, want = null, startAt = 0, next = 0;
    function init() {
      if (ctx) return ctx;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        out = ctx.createGain(); out.gain.value = 0;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
        out.connect(comp); comp.connect(ctx.destination);
        // a hall: a convolution reverb from a decaying stereo noise burst
        const rev = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 2.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
        rev.buffer = ir;
        dry = ctx.createGain(); dry.gain.value = 0.8; dry.connect(out);
        wet = ctx.createGain(); wet.gain.value = 0.42; wet.connect(rev); rev.connect(out);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const w = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 100);'], { type: 'text/javascript' })));
        w.onmessage = () => schedule();
      } catch (e) { ctx = null; }
      return ctx;
    }
    // building blocks
    const bus = (node, send) => { node.connect(dry); const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(wet); };
    function env(g, t, a, peak, sus, dur, rel) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.linearRampToValueAtTime(sus, t + a + 0.12); g.gain.setValueAtTime(sus, t + Math.max(a + 0.13, dur)); g.gain.linearRampToValueAtTime(0, t + dur + rel); }
    function oscs(f, t, stop, type, cents, dest, vib) {
      for (const c of cents) {
        const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.setValueAtTime(c, t);
        if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib[0]; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(vib[1], t + 0.35); l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(stop); }
        o.connect(dest); o.start(t); o.stop(stop);
      }
    }
    function lowpass(f, q) { const n = ctx.createBiquadFilter(); n.type = 'lowpass'; n.frequency.value = f; n.Q.value = q || 0.7; return n; }
    function noise(t, dur, type, fq, vol, decay, send) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf; f.type = type; f.frequency.value = fq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
      s.connect(f); f.connect(g); bus(g, send); s.start(t, Math.random() * 0.4); s.stop(t + decay + 0.02);
    }
    // one note of an instrument at time t for dur seconds
    function play(inst, f, t, dur, vol) {
      const g = ctx.createGain();
      switch (inst) {
        case 'strings': { const lp = lowpass(1500); env(g, t, 0.45, vol, vol * 0.9, dur, 0.6); oscs(f, t, t + dur + 0.7, 'sawtooth', [-9, 0, 8], lp, [5, 6]); lp.connect(g); bus(g, 0.7); break; }
        case 'cello': { const lp = lowpass(650); env(g, t, 0.2, vol, vol * 0.85, dur, 0.5); oscs(f, t, t + dur + 0.6, 'sawtooth', [-6, 6], lp, [4.5, 5]); lp.connect(g); bus(g, 0.5); break; }
        case 'stacc': { const lp = lowpass(2400); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.08); oscs(f, t, t + dur + 0.1, 'sawtooth', [-7, 7], lp); lp.connect(g); bus(g, 0.35); break; }
        case 'violin': { const lp = lowpass(3000); env(g, t, 0.09, vol * 0.11, vol * 0.1, dur, 0.25); oscs(f, t, t + dur + 0.3, 'sawtooth', [0, 5], lp, [5.6, 14]); lp.connect(g); bus(g, 0.55); break; }
        case 'fiddle': { const lp = lowpass(2600, 1.4); env(g, t, 0.04, vol * 0.1, vol * 0.08, dur, 0.15); oscs(f, t, t + dur + 0.2, 'sawtooth', [0], lp, [6, 12]); lp.connect(g); bus(g, 0.3); break; }
        case 'brass': case 'brassStab': {
          const lp = lowpass(500, 1.2), stab = inst === 'brassStab', d = stab ? Math.min(dur, 0.25) : dur;
          lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(stab ? 2600 : 2100, t + 0.09); lp.frequency.linearRampToValueAtTime(stab ? 900 : 1400, t + 0.35);
          env(g, t, 0.05, (stab ? vol : vol * 0.13), (stab ? vol * 0.6 : vol * 0.11), d, stab ? 0.18 : 0.3);
          oscs(f, t, t + d + 0.4, 'sawtooth', [-5, 5], lp, stab ? null : [5, 8]); if (!stab) oscs(f / 2, t, t + d + 0.4, 'sawtooth', [0], lp);
          lp.connect(g); bus(g, 0.5); break;
        }
        case 'choir': {
          const m = ctx.createGain(); m.gain.value = 1;
          for (const [fq, q] of [[700, 6], [1150, 8], [2600, 10]]) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; oscs(f, t, t + dur + 0.9, 'sawtooth', [-10, 10], bp, [5, 9]); bp.connect(m); }
          env(g, t, 0.6, vol * 3, vol * 2.7, dur, 0.8); m.connect(g); bus(g, 0.8); break;
        }
        case 'flute': { const lp = lowpass(3200); env(g, t, 0.06, vol * 0.13, vol * 0.11, dur, 0.15); oscs(f, t, t + dur + 0.2, 'triangle', [0], lp, [5.2, 10]); oscs(f * 2, t, t + dur + 0.2, 'sine', [0], lp); lp.connect(g); bus(g, 0.45); noise(t, 0.12, 'bandpass', f * 2, vol * 0.02, 0.12, 0.3); break; }
        case 'lute': case 'harp': {
          const lp = lowpass(inst === 'lute' ? 3200 : 2400, 1.5), dec = inst === 'lute' ? 0.6 : 1.4;
          lp.frequency.setValueAtTime(inst === 'lute' ? 3800 : 2800, t); lp.frequency.exponentialRampToValueAtTime(500, t + dec);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
          oscs(f, t, t + dec + 0.05, 'sawtooth', [0], lp); oscs(f, t, t + dec + 0.05, 'triangle', [3], lp); lp.connect(g); bus(g, 0.35); break;
        }
        case 'ubass': { const lp = lowpass(900); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.5, dur)); oscs(f, t, t + dur + 0.6, 'triangle', [0], lp); oscs(f, t, t + dur + 0.6, 'sine', [0], lp); lp.connect(g); bus(g, 0.2); break; }
        case 'timp': {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.04, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.15);
          g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4); o.connect(g); bus(g, 0.5); o.start(t); o.stop(t + 1.5);
          noise(t, 0.2, 'lowpass', 500, vol * 0.4, 0.2, 0.4); break;
        }
        case 'taiko': {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.3);
          g.gain.setValueAtTime(vol * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7); o.connect(g); bus(g, 0.45); o.start(t); o.stop(t + 0.75);
          noise(t, 0.12, 'lowpass', 300, vol * 0.5, 0.12, 0.4); break;
        }
        case 'frame': { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.2); g.gain.setValueAtTime(vol * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); bus(g, 0.3); o.start(t); o.stop(t + 0.4); break; }
        case 'tamb': noise(t, 0.15, 'highpass', 6500, vol, 0.15, 0.3); noise(t, 0.08, 'bandpass', 9000, vol * 0.7, 0.09, 0.2); break;
        case 'swell': { const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(); s.buffer = noiseBuf; s.loop = true; hp.type = 'highpass'; hp.frequency.value = 3500; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.08); s.connect(hp); hp.connect(g); bus(g, 0.8); s.start(t); s.stop(t + dur + 0.1); break; }
      }
    }
    // schedules every eighth note that starts within the look-ahead window
    function schedule() {
      if (!cur || !ctx) return;
      const ahead = ctx.currentTime + 1.2;
      while (startAt + next * cur.spb < ahead) {
        const t = startAt + next * cur.spb;
        for (const e of cur.byStep[next % cur.steps]) play(e.inst, e.f, t + e.off * cur.spb, e.len * cur.spb * 0.96, e.vol);
        next++;
      }
    }
    const built = {};
    function apply() {
      const on = S && S.music && want;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(out.gain.value, now);
      if (!on) { out.gain.linearRampToValueAtTime(0, now + 0.6); cur = null; return; }
      if (cur && cur.name === want) { out.gain.linearRampToValueAtTime(MUS_GAIN * MVOL(), now + 0.4); return; }
      cur = Object.assign(built[want] || (built[want] = build(TRACKS[want])), { name: want });
      startAt = now + 0.1; next = 0;
      out.gain.setValueAtTime(0, now); out.gain.linearRampToValueAtTime(MUS_GAIN * MVOL(), now + 1.5);
    }
    return {
      // play a track ('home', 'battle', 'boss') or null for silence; starts for real after the first click (browser rule)
      play(name) { want = name && TRACKS[name] ? name : null; apply(); },
      unlock() { if (S && S.music && init()) apply(); },
      refresh() { if (S && S.music) init(); apply(); },
    };
  })();

  // ---------- helpers ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const affChip = a => `<span class="aff ess-chip" style="--c:${AFF_COL[a]}" title="Essence: ${a}" aria-label="${a}">${essIcon(a)}</span>`;
  const por = (id, scale, cls) => `<img class="spr ${cls || ''}" src="${SPR.url(id, scale || 1)}" alt="">`;
  // Sigils are the currency (stored as S.silver for save compatibility)
  const ic = (name, cls) => name === 'stone' ? `<img class="shard-ic ${cls || 'ic'}" src="${STONE_ART}" alt="Ascension Stone">`
    : name === 'coin' ? `<img class="sigil-ic ${cls || 'ic'}" src="${SIGIL_ART}" alt="Sigils">`
    : `<img class="spr ${cls || 'ic'}" src="${SPR.iconUrl(name, 2)}" alt="">`;
  const LOCK_SVG = '<svg class="lock-ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const glyph = d => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
  const SLOT_GLYPH = {
    wapen: glyph('M12.6 1.2h2.2v2.2L6.7 11.5 4.5 9.3zM3.2 9.6l3.2 3.2-1.1 1.1-.9-.9-1.7 1.7-1.3-1.3 1.7-1.7-.9-.9z'),
    helm: glyph('M3 9.2a5 5 0 0 1 10 0V14h-2.8v-3.6H5.8V14H3zM7.2 2.2h1.6v2H7.2z'),
    schild: glyph('M8 1l6 2.2v4.2c0 3.9-2.8 6.4-6 7.8-3.2-1.4-6-3.9-6-7.8V3.2zm0 2.3v9.4c2-1 3.8-2.8 3.8-5.3V4.7z'),
    handschoenen: glyph('M4 15V7.5h.9V3.4h1.5v4h.8V2.2h1.5v5.2h.8V3.1H11v4.6h.8V6.2h1.4v5.2c0 2.2-1.6 3.6-3.9 3.6z'),
    borstpantser: glyph('M5 1.5h6l3.2 2.6-1.6 3.1-1.1-.8V14.5h-7V6.4l-1.1.8L1.8 4.1zM6.3 3 8 4.8 9.7 3z'),
    laarzen: glyph('M5 1.5h4.2v7.6l4.6 2.3c.5.3.7.7.7 1.2v1.9H3.4v-3.3L5 9.4z'),
  };
  // gear art (gear.js): 21 icons per slot from plain to mythical; each rarity has its own group (Common shares
  // Uncommon's, Mythical gets the last 5) and an item always shows the same icon of its group (by item id)
  const GEAR_GROUPS = [[0, 4], [0, 4], [4, 4], [8, 4], [12, 4], [16, 5]];
  function gearArt(slot, rar, id) { const [s, n] = GEAR_GROUPS[rar] || GEAR_GROUPS[0], list = GEAR_ART[slot]; return list[Math.min(list.length - 1, s + ((id || 0) % n))]; }
  // an ascended item (Item Ascension) shows its orange stars on its icon everywhere
  const ascStars = it => (it.asc ? `<i class="asc-st" title="Ascended ${it.asc}/${K.MAX_ASC}">${'★'.repeat(it.asc)}</i>` : '');
  const gearIcon = (it, cls) => it.asc ? `<span class="gear-asc"><img class="gear-ic ${cls || ''}" src="${gearArt(it.slot, it.rar, it.id)}" alt="">${ascStars(it)}</span>` : `<img class="gear-ic ${cls || ''}" src="${gearArt(it.slot, it.rar, it.id)}" alt="">`;
  // ascended gear is worn only by heroes of K.ASC_STARS stars or more, whatever their rarity
  const wearOk = (id, it) => !it.asc || ((S.roster[id] && S.roster[id].stars) || 0) >= K.ASC_STARS;
  // Lock (it.lock): a spare piece cannot be sold; a worn piece is locked to its hero: no other hero takes it, Equip best
  // does not replace it, Remove all leaves it and Remove asks to unlock first (worn gear cannot be sold anyway)
  const lockedTo = it => (it && it.lock && it.owner && C[it.owner] ? it.owner : null);
  function equipBlock(id, it) {
    const by = lockedTo(it); if (by && by !== id) return `This ${K.SLOT_NAMES[it.slot].toLowerCase()} is locked to ${C[by].short}. Unlock it there first.`;
    const cur = S.inv.find(x => x.owner === id && x.slot === it.slot && x !== it);
    return cur && cur.lock ? `${C[id].short}'s ${K.SLOT_NAMES[it.slot].toLowerCase()} is locked to ${C[id].short}. Unlock it first.` : '';
  }
  // one upgrade try on a piece of gear, with a burst where its button was (upgFx): gold rays and the new level on a
  // success, a red crack and "Failed" on a failure
  // one try: no message, the button glows gold on a success and red on a fail (upgGlow, after the redraw); returns
  // 'ok', 'fail' or false (not enough Sigils, or already +16)
  function tryUpgrade(item) {
    const cost = K.upgradeCost(item);
    if (S.silver < cost || item.lvl >= K.MAX_GEAR_LVL) return false;
    S.silver -= cost; track('upg');
    if (Math.random() < K.upgradeChance(item)) { item.lvl++; K.upgradeMilestone(item); SFX.up(); return 'ok'; }
    SFX.fail(); return 'fail';
  }
  // the pressed button, drawn anew, glows for a moment: gold for a success, red for a fail
  function upgGlow(act, item, res) {
    requestAnimationFrame(() => { const b = document.querySelector(`[data-act="${act}"][data-item="${item.id}"]`); if (!b) return; b.classList.remove('glow-ok', 'glow-no'); void b.offsetWidth; b.classList.add(res === 'ok' ? 'glow-ok' : 'glow-no'); setTimeout(() => b.classList.remove('glow-ok', 'glow-no'), 1400); });
  }
  function upgFx(r, ok, text) {
    if (!r || !r.width) r = { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const el = document.createElement('div'); el.className = 'upfx ' + (ok ? 'ok' : 'no'); el.setAttribute('aria-hidden', 'true');
    el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top + r.height / 2) + 'px';
    el.innerHTML = `<i class="upfx-ring"></i>${ok ? Array.from({ length: 12 }, (_, k) => `<i class="upfx-ray" style="--a:${k * 30}deg"></i>`).join('') : '<i class="upfx-crack"></i>'}<b>${esc(text)}</b>`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1200);
  }
  // the Forge's "To +N": tries on one piece until it reaches the next milestone (+4/8/12/16) or the Sigils run out
  function upgradeTo(it, target) {
    let ok = 0, fail = 0, spent = 0;
    while (it.lvl < target && S.silver >= K.upgradeCost(it)) {
      const cost = K.upgradeCost(it); S.silver -= cost; spent += cost;
      if (Math.random() < K.upgradeChance(it)) { it.lvl++; K.upgradeMilestone(it); ok++; } else fail++;
    }
    track('upg', ok + fail);
    return { ok, fail, spent };
  }
  // gear rarities as coloured words, e.g. "Rare / Epic"
  const rarsHtml = rars => rars.map((r, i) => `<b class="rar-${r} rartxt">${K.RARITIES[r]}</b>${rars.length > 1 ? ` ${Math.round((i ? K.LOOT_UP : 1 - K.LOOT_UP) * 100)}%` : ''}`).join(' / ');
  const sigils = n =>`${ic('coin')} ${n.toLocaleString('en-US')} Sigils`;
  const itemsOf = id => S.inv.filter(it => it.owner === id);
  const itemName = it => `${K.RARITIES[it.rar]} ${K.SLOT_NAMES[it.slot].toLowerCase()}${it.lvl ? ' +' + it.lvl : ''}${it.asc ? ' ' + '★'.repeat(it.asc) : ''}`;
  const itemNameH = it => esc(itemName({ ...it, asc: 0 })) + (it.asc ? ' ' + ascStars(it) : '');
  const starStr = (n, max) => `<span class="stars" title="${n} stars">${'★'.repeat(n)}<i>${'★'.repeat(Math.max(0, (max || K.MAX_STARS) - n))}</i></span>`;
  function itemStatsHtml(it) {
    return `<ul class="item-stats">${K.gearStats(it).map(([k, v], i) => `<li class="${i === 0 ? 'main' : ''}">${K.fmtStat(k, v)}</li>`).join('')}</ul>`;
  }
  function statsOf(id) { return K.heroStats(id, S.roster[id], itemsOf(id)); }
  function power(st) { return Math.round(st.hp * 0.12 + st.atk * 1.8 + st.def * 1.3 + st.spd * 4 + st.crit * 5 + st.cdmg * 2 + (st.acc + st.res) * 0.8); }
  const teamPower = (ids = S.team) => ids.reduce((s, id) => s + power(statsOf(id)), 0);
  let toastT;
  function toast(msg, bad, ms) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms || 2400);
  }
  function hud() {
    $('#silver').textContent = S.silver.toLocaleString('en-US'); paintEnergy(); const ge = $('#gems'); if (ge) ge.textContent = gemsAll().toLocaleString('en-US');
    const totalFs = K.FATE_SHARDS.reduce((t, f) => t + (S.fs[f.id] || 0), 0);
    $('#shards').textContent = totalFs; $('#shards').parentElement.title = 'Fate Shards: ' + K.FATE_SHARDS.map(f => `${f.name} ${S.fs[f.id] || 0}`).join(', '); $('#stones').textContent = S.stones; $('#stones').parentElement.title = 'Ascension Stones: ' + K.STONES.map(s => `${stoneN(s.id)} ${s.name.replace(/ Ascension Stone$/, '')}`).join(', ') + '. Lesser for 2-4★, Greater for 5★, Ancient for 6★.';
    const aOn = S.sound || S.music, sb = $('#sound'); sb.classList.toggle('on', aOn); sb.setAttribute('aria-pressed', aOn ? 'true' : 'false'); sb.title = aOn ? 'Mute sound and music' : 'Turn sound and music back on';
    sb.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 6h3l4-3v10l-4-3h-3z"/><path d="${aOn ? 'M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6.3 6.3 0 0 1 0 9' : 'M11 6l4 4M15 6l-4 4'}"/></svg><span class="lbl">${aOn ? 'Sound on' : 'Sound off'}</span>`;
    document.querySelector('#tabs [data-tab="altaar"] .dot').hidden = !(totalFs > 0 && unlocked('altaar'));
    for (const t in UNLOCKS) document.querySelector(`#tabs [data-tab="${t}"]`)?.classList.toggle('locked', !unlocked(t));
    paintAccount();
  }
  const unlocked = t => isOpen(S, t);
  // the portrait a player shows: the avatar they picked, else their starter hero, else their first team member
  const avatarId = () => (S.p.avatar && S.roster[S.p.avatar] ? S.p.avatar : S.starter && S.roster[S.starter] ? S.starter : S.team[0]);
  // linking an account pays LINK_GEMS Crystals once per save (S.lk), the first time the game sees it saved to an account
  const LINK_GEMS = 100;
  const linkRw = () => `<div class="lk-rw">${GEM_SVG}<span><b>+${LINK_GEMS} Crystals</b><br><small>for linking your account</small></span></div>`;
  const guest = () => { const cl = cloud(); return !!(cl && cl.enabled && !cl.signedIn()); };
  function linkPaid() {
    const cl = cloud(); if (!S || S.lk || noHero() || !cl || !cl.signedIn() || cl.info().status !== 'saved') return;
    S.lk = true; S.gems = (S.gems || 0) + LINK_GEMS; save(); hud();
    if ((B && $('#modal').hidden) || document.querySelector('.unlock-pop')) { toast(`Account linked! +${LINK_GEMS} Crystals`); return; } // in a running battle: a message only
    const el = document.createElement('div');
    el.className = 'unlock-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Account linked');
    el.innerHTML = `<div class="unlock-card"><span class="tag">Account linked</span><h2>Your heroes are safe</h2><p>Your progress is saved to your account: play on any device, and join the Arena, guilds and chat.</p>${linkRw()}<button class="btn primary" type="button">Great!</button></div>`;
    document.body.appendChild(el); SFX.up();
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('button')) el.remove(); });
  }
  // "Don't want to lose your progress?": a guest is asked to create an account, with the reward shown big
  function showLinkOffer(tag) {
    if (!guest() || noHero()) return;
    const el = document.createElement('div');
    el.className = 'unlock-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Create an account');
    el.innerHTML = `<div class="unlock-card"><span class="tag">${tag || 'Playing as a guest'}</span><h2>Don't want to lose your progress?</h2>
      <p>Create an account! Your heroes are saved only in this browser right now. Link an email to keep them safe, play on any device, and join the Arena, guilds and chat.</p>${linkRw()}
      <button class="btn primary" type="button" data-link="1">Create an account</button><button class="btn small" type="button">Later</button></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('button')) { el.remove(); if (e.target.closest('[data-link]') && cloud()) cloud().openAccount(); } });
  }
  function paintAccount() {
    linkPaid();
    // the mail badge follows the account: load friends and mail when someone signs in (or switches account)
    paintMail(); if (signedIn() && SO.who !== cloud().info().email) socialLoad();
    // no hero yet (hero creation): a plain person icon instead of an avatar
    if (!avatarId()) { $('#account').innerHTML = `<svg class="acc-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/></svg><span class="acc-lv">${presEmblem(S.p.prestige, 'sm')}Lv ${S.p.lvl}</span>`; return; }
    const b = $('#account'), cl = window.FFH_CLOUD && window.FFH_CLOUD.info();
    const dot = cl && cl.email ? `<i class="acc-dot ${cl.status === 'error' ? 'err' : cl.status === 'syncing' ? 'sync' : ''}"></i>` : cl && cl.enabled && !noHero() ? '<i class="acc-dot guest"></i>' : '';
    b.innerHTML = `${por(avatarId(), 1, 'acc-av')}<span class="acc-lv">${presEmblem(S.p.prestige, 'sm')}Lv ${S.p.lvl}</span><span class="acc-name">${esc(S.p.name)}</span>${dot}`;
    b.title = `${S.p.name} · player level ${S.p.lvl}` + (cl && cl.email ? (cl.status === 'error' ? ' · cloud save failed' : ' · saved to your account') : cl && cl.enabled ? ' · playing as a guest: link an email to keep your progress safe' : '');
    if (tab === 'profiel' && (TH.tab === 'profile' || TH.tab === 'settings') && !B && !$('#screen').hidden && !$('#screen input:focus')) $('#screen').innerHTML = `<div class="navwrap">${sideNav()}<div class="navmain">${backBar()}${townHallHtml()}</div></div>`;
  }
  function lockedHtml(t, lede) {
    const u = UNLOCKS[t], prog = u.lvl ? levelProgress(u.lvl) : Math.min(1, (S.cleared + 1) / (u.ch * 7));
    return `<div class="section-head"><div><h2>${UNLOCK_NAME[t]}</h2><p class="lede">${lede}</p></div></div>
      <div class="lockbox"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>
        <div><h3>Opens after ${needTxt(t)}</h3><p class="empty-note">${u.lvl ? `You are level ${S.p.lvl}. Win battles in the campaign to earn player XP.` : `Campaign (Easy): ${S.cleared + 1} of ${u.ch * 7} stages cleared.`}</p>
        <div class="xpbar"><i style="width:${Math.round(prog * 100)}%"></i></div>
        <button class="btn primary" data-act="tab" data-tab="campagne">To the campaign</button></div></div>`;
  }
  // share of the XP between level 1 and level `to` that the player already has
  function levelProgress(to) {
    let have = S.p.xp, total = 0;
    for (let l = 1; l < to; l++) { total += pxNeed(l); if (l < S.p.lvl) have += pxNeed(l); }
    return Math.min(1, have / total);
  }

  // ---------- tabs ----------
  let tab = 'home', selChamp = 'draelyn', champTab = 'gear';
  // ----- Home: the main menu, every building as a banner under the other (menu.js MENU_ART: frame, icon and scene
  // per building) with its name and how it stands (the next stage, rewards to claim, the ship is back, or what opens it).
  const HOME_LIST = [
    { go: 'profiel', label: 'Town Hall' }, { go: 'campagne', label: 'Campaign' },
    { go: 'kerkers', label: 'Boss Hall' }, { go: 'tower', label: 'Tower of Essence' }, { go: 'siege', label: 'Siege' }, { go: 'arena', label: 'Arena' },
    { go: 'team', label: 'Heroes' }, { go: 'forge', label: 'Vault' }, { go: 'altaar', label: 'Fate Altar' }, { go: 'social', label: 'Social' },
    { go: 'market', label: 'Market' }, { go: 'expedition', label: 'Expeditions' },
  ];
  // First steps: a new player (own hero made, no campaign battle yet) can only press the Campaign ("Start here");
  // every other building (and the profile) opens after the first campaign battle, won or lost.
  const firstSteps = () => !noHero() && S.cleared < 0 && !(S.p.st.won + S.p.st.lost);
  // Homebase tour: once the homebase opens (after the first battle) a short tour shows every building, one at a time
  // (its button lit, the others dimmed, and a card with Next). The last step leads back to the campaign, where the
  // Fight button is spotlighted (spotFight). S.seen.tour = done or skipped.
  const TOUR = [
    { go: 'team', title: 'Heroes', text: 'Your team and every hero. Level heroes up with Elixirs or by feeding spare heroes, ascend them for higher level caps and build up to seven teams of four, one for each game mode.' },
    { go: 'forge', title: 'Vault', text: 'Everything you own in one place: gear, stones, shards and elixirs. Upgrade gear, lock what you keep and sell the rest. To equip gear, open a hero in Heroes and tap a slot.' },
    { go: 'altaar', title: 'Fate Altar', text: 'Summon new heroes with Fate Shards. Shards drop from battles and level-ups; rarer shards bring Epic and Legendary heroes.' },
    { go: 'kerkers', title: 'Boss Hall', text: 'Twenty-five bosses with ten levels each; every two levels match a campaign difficulty. Bosses drop their own gear sets.' },
    { go: 'arena', title: 'Arena', text: 'Fight the defense teams of other players, climb the ranking and earn weekly rewards. Needs a free account.' },
    { go: 'profiel', title: 'Town Hall', text: 'Daily quests, missions, your collection and achievements, full of Energy and Fate Shards. Also your profile: name, avatar, settings, account and save backups. The Guide (the ? in the top bar, or the ☰ menu on a phone) explains every term.' },
    { go: 'social', title: 'Social', text: 'Friends and your guild. Add friends with their friend code; on the Guild tab create or join a guild (after Chapter II), fight the guild boss every day and earn a Guild Chest every week. Mail (in the top bar, or the ☰ menu on a phone) holds friend requests, gifts, guild invites and arena rewards.' },
    { go: 'expedition', title: 'Expeditions', text: 'Send heroes who are not in a team on a voyage of 1, 12 or 24 hours. They come back with XP, Sigils, shards and Ascension Stones. Opens after Chapter I.' },
    { go: 'tower', title: 'Tower of Essence', text: 'Six towers of 300 floors, one per essence, climbed with heroes of that essence only, and the Tower of Fate for every hero. Gentle at first, brutal at the top. Opens after Chapter II.' },
    { go: 'siege', title: 'Siege', text: 'Hold your gate against endless waves of enemies that grow stronger and more numerous until your team falls. Every kill pays XP and Sigils, and checkpoints every 25 waves pay shards and stones. A run costs a Siege ticket. Opens after Chapter III.' },
    { go: 'market', title: 'Market', text: 'Spend Crystals on Energy refills, Fate Shards, Sigils and Ascension Stones. You earn Crystals from level-ups, quest chests, missions and achievements.' },
    { go: 'campagne', title: 'Campaign', text: 'Ten chapters on five difficulties: the heart of the game. Clearing chapters opens new buildings: Expeditions, the Arena, Guilds, the Tower and the Boss Hall. On to the next stage!' },
  ];
  let tourStep = 0, spotFight = false;
  const tourOn = () => tab === 'home' && !noHero() && !firstSteps() && S.seen.home && !S.seen.tour;
  function tourCard() {
    const st = TOUR[tourStep], last = tourStep === TOUR.length - 1;
    const status = st.go === 'campagne' ? '' : unlocked(st.go) ? '<span class="tc-open">Open now</span>' : `<span class="tc-lock">${LOCK_SVG} Opens after ${needTxt(st.go)}</span>`;
    return `<div class="tour-card" role="dialog" aria-label="Homebase tour"><span class="tag">Homebase tour · ${tourStep + 1} / ${TOUR.length}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p>${status}
      <div class="tc-acts">${last ? '' : '<button class="btn small" type="button" data-act="tourskip">Skip tour</button>'}<button class="btn primary" type="button" data-act="tournext">${last ? 'Continue the campaign' : 'Next ›'}</button></div></div>`;
  }
  // a new player's campaign: the Fight button is the only thing to press (before the first battle and after the tour)
  const fightSpot = () => tab === 'campagne' && !(S.diff) && (firstSteps() || spotFight);
  // a building's state in one short line
  function homeStatus(go) {
    if (go === 'campagne') {
      const d = S.diff || 0, i = clearedOn(d) + 1;
      if (i >= K.STAGES.length) return `${K.DIFFS[d].name}: every stage cleared`;
      const st = K.STAGES[i]; return `Next: ${K.DIFFS[d].name} · Chapter ${ROMAN[st.chapter]} · Stage ${st.n + 1}`;
    }
    if (go === 'kerkers') return `${K.BOSS_ORDER.filter(id => (S.bh[id] || 0) >= 1).length} / ${K.BOSS_ORDER.length} bosses beaten`;
    if (go === 'tower') { const best = Math.max(0, ...Object.values(S.tw.prog)); return best ? `Highest floor ${best}` : 'Not climbed yet'; }
    if (go === 'siege') { sgTick(); return `${S.sg.best ? `Best wave ${S.sg.best}` : 'Not defended yet'} · ${S.sgT} / ${K.SIEGE.tickets} tickets`; }
    if (go === 'expedition') return !S.exp ? 'The ship is ready to sail' : expDone() ? 'The ship is back: collect the rewards' : `At sea · back in ${fmtMins(Math.max(1, Math.ceil((S.exp.end - Date.now()) / 60000)))}`;
    if (go === 'team') return `${Object.keys(S.roster).length} heroes · team power ${teamPower().toLocaleString('en-US')}`;
    if (go === 'forge') { const spare = S.inv.filter(x => !x.owner).length; return `${S.inv.length} pieces of gear · ${spare} spare`; }
    if (go === 'altaar') { const n = K.FATE_SHARDS.reduce((t, f) => t + (S.fs[f.id] || 0), 0); return n ? `${n} Fate ${n === 1 ? 'Shard' : 'Shards'} to summon with` : 'No Fate Shards yet'; }
    if (go === 'arena') return signedIn() ? 'Attack and climb the ranking' : 'Needs a free account';
    if (go === 'social') { const n = signedIn() ? mailCount() : 0; return n ? `${n} new in Mail` : 'Friends, guild and mail'; }
    if (go === 'profiel') { const n = thClaimN(); return n ? `${n} ${n === 1 ? 'reward' : 'rewards'} to claim` : `Player level ${S.p.lvl}`; }
    if (go === 'market') return `${gemsAll().toLocaleString('en-US')} Crystals`;
    return '';
  }
  function homeHtml() {
    const tut = firstSteps(), tour = tourOn() ? TOUR[tourStep] : null, shards = K.FATE_SHARDS.some(f => (S.fs[f.id] || 0) > 0);
    const btn = z => {
      const locked = !unlocked(z.go), main = z.go === 'campagne', start = tut && main;
      const dot = !locked && !tut && ((z.go === 'altaar' && shards) || (z.go === 'profiel' && thClaimN()) || (z.go === 'expedition' && expDone()) || (z.go === 'siege' && sgFull()));
      const act = tut && !main ? 'data-act="tutlock"' : `data-act="go" data-go="${z.go}"`;
      const st = start ? 'Start here: your adventure begins in the Campaign' : tut ? 'Opens after your first battle' : locked ? `${LOCK_SVG} Opens after ${needTxt(z.go)}` : homeStatus(z.go);
      return `<button type="button" class="hb ${locked || (tut && !main) ? 'locked' : ''} ${start ? 'start' : ''} ${tour && tour.go === z.go ? 'tour-on' : ''}" ${act} data-zone="${z.go}">
        <img class="hb-bg" src="${MENU_ART[z.go]}" alt=""><span class="hb-txt"><b class="hb-name">${esc(z.label)}</b><span class="hb-st">${st}</span></span>${dot ? '<i class="hb-dot" aria-hidden="true"></i>' : ''}</button>`;
    };
    return `${tut ? '' : evRibbon()}<div class="home ${tut ? 'tut' : ''} ${tour ? 'touring' : ''}">${HOME_LIST.map(btn).join('')}</div>${tour ? tourCard() : ''}`;
  }
  // the icon bar on the left of every screen but Home (and the battle): the Home buildings with their banner icons
  // (MENU_ART, cropped by CSS), the open screen lit, locked ones dimmed, a dot when something waits
  const NAV_OF = { champions: 'team', vault: 'forge', prep: 'campagne' };
  function sideNav() {
    const cur = tab === 'prep' && PREP.tower ? 'tower' : tab === 'prep' && PREP.boss ? 'kerkers' : NAV_OF[tab] || tab, shards = K.FATE_SHARDS.some(f => (S.fs[f.id] || 0) > 0);
    return `<nav class="snav" aria-label="Buildings">${HOME_LIST.map(z => {
      const locked = !unlocked(z.go), dot = !locked && ((z.go === 'altaar' && shards) || (z.go === 'profiel' && thClaimN()) || (z.go === 'expedition' && expDone()) || (z.go === 'siege' && sgFull()));
      return `<button type="button" class="sn ${z.go === cur ? 'on' : ''} ${locked ? 'locked' : ''}" data-act="go" data-go="${z.go}" title="${esc(z.label)}${locked ? ` (opens after ${needTxt(z.go)})` : ''}" ${z.go === cur ? 'aria-current="page"' : ''}>
        <span class="sn-ic ${z.go}" style="background-image:url(${MENU_ART[z.go]})"></span><small>${esc(z.label)}</small>${dot ? '<i class="sn-dot" aria-hidden="true"></i>' : ''}</button>`;
    }).join('')}</nav>`;
  }
  // every screen but Home gets a way back
  function backBar() { return '<div class="backbar"><button type="button" class="btn small" data-act="tab" data-tab="home">‹ Home</button></div>'; }
  function setTab(t) {
    // old tab names: the hero index is now part of Heroes, the gear vault is Forge → Items
    if (t === 'champions') { t = 'team'; TF.own = 'all'; }
    if (t === 'vault') t = 'forge';
    if (t !== 'team') { HB.open = false; HB.up = null; } // the gear bag closes when you leave Heroes
    tab = t;
    document.body.dataset.tab = t; setMenu(false); setNav(false);
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'));
    render();
    if (t === 'arena') arenaEnter();
    if (t === 'social' || t === 'mail') socialLoad();
  }
  // a screen that fails to draw shows what went wrong and a way home, instead of leaving the old screen frozen
  function render() {
    document.body.dataset.tab = tab; paintVersion(); chatPaintBtn();
    try { renderScreen(); if (needName() && !B && tab !== 'home') setTimeout(showNameBox, 300); }
    catch (e) {
      console.error(e);
      $('#screen').innerHTML = `<div class="lockbox"><div><h3>Something went wrong on this screen</h3><p class="empty-note">Please send this message to the developer: <code>${esc(tab)}: ${esc(e && e.message || e)}</code></p><button class="btn primary" data-act="tab" data-tab="home">Back to Home</button></div></div>`;
      if (tab === 'home') $('#screen').querySelector('button').hidden = true;
    }
  }
  function renderScreen() {
    if (!B) MUSIC.play(tab === 'kerkers' || (tab === 'prep' && PREP.boss) ? 'boss' : 'home'); // the Boss Hall keeps the boss track from its screen through every fight
    hud();
    const el = $('#screen');
    if (noHero()) { el.innerHTML = createHtml(); navTop(); hxFit(); return; }
    if (tab === 'home') {
      el.innerHTML = homeHtml();
      // the tour scrolls its building into view, in the room above the tour card
      const on = tourOn() && el.querySelector('.hb.tour-on'), card = el.querySelector('.tour-card');
      // (a phone on its side: the card goes to the half of the screen the building is not in, the building to the middle)
      if (on && card && landPhone()) { const r = on.getBoundingClientRect(); card.classList.add(r.left + r.width / 2 > innerWidth / 2 ? 'tc-left' : 'tc-right'); window.scrollBy({ top: r.top - (innerHeight - r.height) / 2 - 10, behavior: 'smooth' }); }
      else if (on && card) { const r = on.getBoundingClientRect(), room = card.getBoundingClientRect().top - 70; window.scrollBy({ top: r.top - 70 - Math.max(0, (room - r.height) / 2), behavior: 'smooth' }); }
      // the daily reward pops up on the homebase once a day (after the first battle and the tour)
      if (needName()) setTimeout(showNameBox, 300); else if (loginDue()) setTimeout(showLogin, 600); else if (linkDue()) setTimeout(showLink, 900); else if (discordDue()) setTimeout(showDiscord, 900);
      return;
    }
    el.innerHTML = `<div class="navwrap">${sideNav()}<div class="navmain">${backBar()}${tab === 'campagne' ? campaignHtml() : tab === 'prep' ? prepHtml() : tab === 'kerkers' ? dungeonsHtml() : tab === 'altaar' ? altarHtml() : tab === 'team' ? teamHtml() : tab === 'profiel' ? townHallHtml() : tab === 'arena' ? arenaHtml() : tab === 'social' ? socialHtml() : tab === 'guide' ? guideHtml() : tab === 'mail' ? mailHtml() : tab === 'forge' ? forgeHtml() : tab === 'expedition' ? expedHtml() : tab === 'tower' ? towerHtml() : tab === 'siege' ? siegeHtml() : tab === 'events' ? eventsHtml() : tab === 'admin' ? adminHtml() : tab === 'market' ? marketHtml() : teamHtml()}</div></div>`;
    navTop(); hxFit();
    if (tab === 'kerkers') paintDungeonArt();
    if (fightSpot()) { const f = el.querySelector('.spot-go'); if (f) requestAnimationFrame(() => f.scrollIntoView({ block: 'center' })); }
    if (tab === 'altaar') paintAltar();
    // on phones the roster is a horizontal strip: keep the selected hero in view after every re-render
    const sel = tab === 'team' && el.querySelector('.champ-layout .card.sel');
    if (sel) { const strip = sel.parentElement; strip.scrollLeft += sel.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - sel.offsetWidth) / 2; }
  }

  // ----- campaign -----
  const isStageCfg = cfg => cfg.type === 'stage';
  const stageName = i => { const st = K.STAGES[i]; return `Chapter ${ROMAN[st.chapter]} · Stage ${st.n + 1}`; };
  const dropName = st => st.slot ? K.SLOT_NAMES[st.slot] : 'Random gear';
  // Campaign screen (every screen size): the title with the difficulty, the chapter card (its painted background, story
  // and set), the selected stage (campSel: its phases, drops and Fight / Replay), the team, the chapter row, a card per
  // stage and the chapter's reward chest. On phones Fight / Replay also sits in the bottom bar.
  const PHONE_MQ = matchMedia('(max-width: 760px)');
  PHONE_MQ.addEventListener('change', () => { if (tab === 'campagne' && !B && S && !noHero()) render(); });
  let campSel = null;
  // Chapter rewards: once per chapter and difficulty, when all seven of its stages are cleared there (S.chr[d] = claimed chapters)
  function chapterReward(c, d) {
    const r = { silver: 2000 * (c + 1) * (d + 1), gems: 5 * (d + 1), fs: d ? { greater: d >= 3 ? 2 : 1 } : { fate: 2 }, stones: 2 + Math.floor(c / 3) };
    // an Ancient Fate Shard in every chapter chest from Normal on, two in Chapters V and X from Hard
    if (d >= 1) r.fs.ancient = d >= 2 && (c === 4 || c === 9) ? 2 : 1;
    return r;
  }
  const chrClaimed = (c, d) => ((S.chr || {})[d] || []).includes(c);
  const kNum = n => n >= 10000 ? Math.round(n / 1000) + 'K' : n.toLocaleString('en-US');
  const chapRewardIcons = r => [
    `<span class="cv-rw" title="${r.silver.toLocaleString('en-US')} Sigils">${ic('coin')}<b>${kNum(r.silver)}</b></span>`,
    `<span class="cv-rw" title="${r.gems} Crystals">${GEM_SVG}<b>${r.gems}</b></span>`,
    ...Object.entries(r.fs).map(([k, n]) => `<span class="cv-rw" title="${n} × ${K.FATE_SHARDS.find(f => f.id === k).name}">${shardIc(k)}<b>${n}</b></span>`),
    `<span class="cv-rw" title="${r.stones} Lesser Ascension Stones">${stoneIc('lesser')}<b>${r.stones}</b></span>`].join('');
  const CHAP_CHEST = `<svg viewBox="0 0 64 52" aria-hidden="true"><path d="M6 22h52v26H6z" fill="#5a3517" stroke="#e2b452" stroke-width="2.5"/><path d="M6 22C6 8 16 4 32 4s26 4 26 18z" fill="#7a4a20" stroke="#e2b452" stroke-width="2.5"/><path d="M6 22h52M20 5v43M44 5v43" stroke="#e2b452" stroke-width="2.5" fill="none"/><rect x="27" y="18" width="10" height="13" rx="2" fill="#f2cf72" stroke="#3a220c" stroke-width="1.5"/><circle cx="32" cy="25" r="1.8" fill="#3a220c"/></svg>`;
  // Campaign, first: every chapter in a list under each other (its scene, story, progress on this difficulty, and the
  // gear it drops: the chapter's set, one slot per stage, at this difficulty's rarities); tap one for its stages
  // (CV.view = 'stages'). Home and the icon bar open the list; a new player's first battle skips it (fightSpot).
  const CV = { view: 'chapters' };
  const SLOT_ORDER = ['wapen', 'helm', 'schild', 'handschoenen', 'borstpantser', 'laarzen'];
  // a small treasure chest (open = claimed)
  const CHEST_ART = open => `<svg viewBox="0 0 40 36" aria-hidden="true"><defs><linearGradient id="chw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8642e"/><stop offset="1" stop-color="#5a2f14"/></linearGradient><linearGradient id="chg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset="1" stop-color="#c9922e"/></linearGradient></defs>
    ${open ? '<path d="M5 17 L8.5 4.5 Q20 0.5 31.5 4.5 L35 17 Z" fill="url(#chw)" stroke="#2a1608" stroke-width="1.2"/><ellipse cx="20" cy="17.5" rx="14" ry="3.2" fill="#ffd36a"/>' : '<path d="M4 17 V12 Q4 5 20 5 Q36 5 36 12 V17 Z" fill="url(#chw)" stroke="#2a1608" stroke-width="1.2"/><rect x="9" y="6.5" width="3.5" height="10.5" fill="url(#chg)"/><rect x="27.5" y="6.5" width="3.5" height="10.5" fill="url(#chg)"/>'}
    <rect x="4" y="16.5" width="32" height="17" rx="2" fill="url(#chw)" stroke="#2a1608" stroke-width="1.2"/><rect x="9" y="16.5" width="3.5" height="17" fill="url(#chg)"/><rect x="27.5" y="16.5" width="3.5" height="17" fill="url(#chg)"/>
    <rect x="16.5" y="14" width="7" height="8.5" rx="1.5" fill="url(#chg)" stroke="#2a1608" stroke-width=".8"/><circle cx="20" cy="18.4" r="1.3" fill="#2a1608"/></svg>`;
  // the chest on a chapter's banner: claim (all seven stages cleared on this difficulty), wait (the progress), or claimed
  function chestBtn(c, d, done) {
    const got = chrClaimed(c, d), ready = done === 7 && !got;
    return `<span class="cl-chestb ${ready ? 'ready' : got ? 'got' : 'wait'}" role="button" tabindex="0" data-act="${ready ? 'chclaim' : 'chpeek'}" data-chap="${c}" title="${ready ? 'Claim the chapter rewards' : got ? 'Chapter rewards claimed' : `Clear all seven stages on ${K.DIFFS[d].name} to open this chest`}">${CHEST_ART(got)}<small>${ready ? 'Claim' : got ? '✓ Claimed' : `${done}/7`}</small></span>`;
  }
  // the chest opened (got: the rewards just claimed) or a look inside a closed one
  function chestPop(c, d, got) {
    const el = document.createElement('div'), claimed = !got && chrClaimed(c, d);
    el.className = 'unlock-pop ch-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Chapter ${ROMAN[c]} rewards`);
    el.innerHTML = `<div class="unlock-card"><div class="ch-big">${CHEST_ART(got || claimed)}</div><span class="tag">Chapter ${ROMAN[c]} · ${esc(K.DIFFS[d].name)}</span><h2>${got ? 'Chapter rewards claimed!' : claimed ? 'Already claimed' : 'Chapter rewards'}</h2>
      <div class="cv-rws">${chapRewardIcons(chapterReward(c, d))}</div>${got || claimed ? '' : `<p>Clear all seven stages of Chapter ${ROMAN[c]} on ${esc(K.DIFFS[d].name)} to open this chest.</p>`}<button class="btn primary" type="button">${got ? 'Great!' : 'OK'}</button></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('button')) el.remove(); });
  }
  function chapterListHtml(head) {
    const d = S.diff || 0, D = K.DIFFS[d], cleared = clearedOn(d), next = cleared + 1;
    const maxChap = Math.min(K.CHAPTERS.length - 1, K.STAGES[Math.min(next, K.STAGES.length - 1)].chapter), hi = D.rars[D.rars.length - 1];
    const rows = K.CHAPTERS.map((ch, c) => {
      const open = c <= maxChap, done = K.STAGES.filter((s, i) => s.chapter === c && i <= cleared).length, cur = open && c === maxChap && done < 7;
      const SS = K.SETS[ch.set], [need, bonus] = SS.desc.split(': '), own = S.inv.filter(it => it.set === ch.set).length;
      const boss = (K.STAGES.find(s => s.chapter === c && s.n === 6) || {}).boss, chest = done === 7 && !chrClaimed(c, d);
      return `<button type="button" class="cl-ch ${open ? '' : 'locked'} ${cur ? 'cur' : ''} ${done === 7 ? 'done' : ''}" data-act="chopen" data-n="${c}" style="--art:url(${chapterArt(c)})" ${open ? '' : 'disabled'}>
        <span class="cl-num">${ROMAN[c]}</span>
        <span class="cl-t"><small>Chapter ${ROMAN[c]}${cur ? ' · <b>you are here</b>' : ''}</small><b class="cl-name">${esc(ch.name)}</b><span class="cl-desc">${esc(ch.desc)}</span>
          <span class="cl-prog">${open ? `<span class="cv-dots">${[0, 1, 2, 3, 4, 5, 6].map(k => `<i class="${k < done ? 'on' : ''}"></i>`).join('')}</span>${done}/7${chest ? ' · <b class="cl-chest">Reward ready</b>' : ''}` : `${LOCK_SVG} Clear Chapter ${ROMAN[c - 1]} first`}${boss ? `<span class="cl-boss">Boss: ${esc(boss)}</span>` : ''}</span></span>
        <span class="cl-gear ${open ? 'has-chest' : ''}">${open ? chestBtn(c, d, done) : ''}<span class="cl-set" style="--rc:var(--r${hi})"><img src="${gearArt('borstpantser', hi, 0)}" alt=""><span><b>${esc(SS.name)}</b><em><i>${esc(need)}</i> ${esc(bonus)}</em></span></span>
          ${D.rars.map((r, i) => `<span class="cl-rrow" style="--rc:var(--r${r})" title="${K.RARITIES[r]}${D.rars.length > 1 ? ` ${Math.round((i ? K.LOOT_UP : 1 - K.LOOT_UP) * 100)}%` : ''}"><span class="cl-slots">${SLOT_ORDER.map(s => `<img class="gt-ic" src="${GEAR_TILE[s][Math.max(1, r)]}" alt="" title="${K.RARITIES[r]} ${K.SLOT_NAMES[s].toLowerCase()}">`).join('')}</span></span>`).join('')}
          <small>${own} ${own === 1 ? 'piece' : 'pieces'} owned</small></span></button>`;
    }).join('');
    return `<div class="campaign cv cl ${d ? 'hardmode diff-' + D.id : ''}">${head}
      <p class="cl-hint">Every chapter drops its own gear set: one slot per stage, a random slot from the boss. ${esc(D.name)} drops ${rarsHtml(D.rars)}.</p>
      <div class="cl-list">${rows}</div></div>`;
  }
  function campaignHtml() {
    const d = S.diff || 0, D = K.DIFFS[d], cleared = clearedOn(d), next = cleared + 1;
    const maxChap = Math.min(K.CHAPTERS.length - 1, K.STAGES[Math.min(next, K.STAGES.length - 1)].chapter);
    const chap = Math.min(S.chap ?? maxChap, maxChap), ch = K.CHAPTERS[chap];
    const idx = K.STAGES.map((st, i) => i).filter(i => K.STAGES[i].chapter === chap);
    const sel = idx.includes(campSel) ? campSel : idx.includes(next) ? next : idx.filter(i => i <= cleared).pop() ?? idx[0];
    const st = K.STAGES[sel], stateOf = i => i <= cleared ? 'cleared' : i === next ? 'next' : 'locked', state = stateOf(sel);
    const diffOk = diffOpen;
    const art = chapterArt(chap);
    const chapDone = cleared >= chap * 7 + 6, cdone = idx.filter(i => i <= cleared).length;
    // drop icons from the gear sheet (GEAR_TILE), one per rarity that can drop on this difficulty
    const dropIc = s => D.rars.map(r => `<img class="gt-ic rar-${r}" src="${GEAR_TILE[s.slot || 'random'][Math.max(1, r)]}" alt="" title="${K.RARITIES[r]} ${esc(dropName(s).toLowerCase())}">`).join('');
    const firsts = i => {
      if (i <= cleared) return [];
      const s = K.STAGES[i], rw = [], ul = K.stageUnlock(s, S.starter);
      if (!d && ul && !S.roster[ul]) rw.push(`<span class="rw">${por(ul)}${esc(C[ul].short)}</span>`);
      rw.push(`<span class="rw" title="${s.n === 6 ? 'Greater Fate Shard' : 'Fate Shard'}">${shardIc(s.n === 6 ? 'greater' : 'fate')}+1</span>`);
      return rw;
    };
    const auto = i => `<button type="button" class="btn small ${chapDone ? 'violet' : ''}" data-act="auto10" data-stage="${i}" ${chapDone ? '' : `disabled title="Clear all of Chapter ${ROMAN[chap]} on ${esc(D.name)} first"`}>${chapDone ? '' : LOCK_SVG}Auto ×10</button>`;
    const playBtn = i => stateOf(i) === 'locked' ? `<button class="btn" disabled>${LOCK_SVG} Locked</button>` : `<button class="btn primary" data-act="play" data-stage="${i}">Fight${enCost(stEn(i, d))}</button>`;
    const spot = fightSpot() && sel === next;
    // the chapter's set, the other drops, the team and the chest on the left; a row per stage on the right
    const set = K.SETS[ch.set], [need, bonus] = set.desc.split(': '), own = S.inv.filter(it => it.set === ch.set).length, hi = D.rars[D.rars.length - 1];
    // the chapter's reward chest
    const claimed = chrClaimed(chap, d), canClaim = chapDone && !claimed;
    const reward = `<section class="cv-reward ${canClaim ? 'ready' : ''} ${claimed ? 'done' : ''}"><span class="cv-chest">${CHAP_CHEST}</span>
      <div class="cv-rw-t"><b>Chapter rewards</b><small>${cdone} / 7 cleared${d ? ` · ${esc(D.name)}` : ''}</small><span class="cv-dots">${idx.map(i => `<i class="${i <= cleared ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="cv-rws">${chapRewardIcons(chapterReward(chap, d))}</div>
      ${claimed ? '<span class="cv-claimed">✓ Claimed</span>' : `<button class="btn ${canClaim ? 'primary' : ''}" data-act="chclaim" data-chap="${chap}" ${canClaim ? '' : `disabled title="Clear all seven stages of Chapter ${ROMAN[chap]} first"`}>Claim</button>`}</section>`;
    const head = `      <div class="cv-head"><span class="cv-emb" style="background-image:url(${MENU_ART.campagne})" aria-hidden="true"></span><div class="cv-ht"><h2>Campaign</h2><p>Explore a shattered world and uncover the truth.</p></div>
        <label class="cv-diff"><span>Difficulty</span><select id="cp-diff" aria-label="Difficulty">${K.DIFFS.map((x, i) => `<option value="${i}" ${i === d ? 'selected' : ''} ${diffOk(i) ? '' : 'disabled'}>${x.name}${diffOk(i) ? '' : ' 🔒︎'}</option>`).join('')}</select><small>Drops ${rarsHtml(D.rars)}</small></label></div>
`;
    if (CV.view === 'chapters' && !spot && !firstSteps()) return chapterListHtml(head);
    const tids = teamIds('campaign');
    const misc = [[shardIc('fate'), 'Fate Shard', 'first clear of a stage, and now and then'], [shardIc('greater'), 'Greater Shard', 'first clear of the boss'], [stoneIc('lesser'), 'Ascension Stones', 'Lesser on every stage, Greater from bosses'], [elxIc('Aether'), 'Elixirs', `${Math.round(K.ELIXIR.camp * 100)}% a win, of a foe's essence`], [`<span class="sv-coin">${ic('coin')}</span>`, 'Sigils & XP', 'every win']]
      .map(([icon, name, tip]) => `<span class="sv-mi" title="${esc(name)}: ${esc(tip)}">${icon}<small>${esc(name)}</small></span>`).join('');
    const side = `<aside class="sv-side">
      <div class="sv-ch" style="--art:url(${art})"><small>Chapter ${ROMAN[chap]}${d ? ` · ${esc(D.name)}` : ''}</small><h3>${esc(ch.name)}</h3>${storyOpen(chap + 's') ? `<div class="sc-btns"><button type="button" class="btn" data-act="story" data-k="${chap}s">📖 Story</button>${storyOpen(chap + 'b') ? `<button type="button" class="btn" data-act="story" data-k="${chap}b">📖 The boss</button>` : ''}</div>` : ''}</div>
      <section class="sv-box"><h4>Gear drops</h4>
        <div class="cl-set" style="--rc:var(--r${hi})"><img src="${gearArt('borstpantser', hi, 0)}" alt=""><span><b>${esc(set.name)}</b><em><i>${esc(need)}</i> ${esc(bonus)}</em></span></div>
        ${D.rars.map((r, i) => `<span class="cl-rrow" style="--rc:var(--r${r})" title="${K.RARITIES[r]}${D.rars.length > 1 ? ` ${Math.round((i ? K.LOOT_UP : 1 - K.LOOT_UP) * 100)}%` : ''}"><span class="cl-slots">${SLOT_ORDER.map(s => `<img class="gt-ic" src="${GEAR_TILE[s][Math.max(1, r)]}" alt="" title="${K.RARITIES[r]} ${K.SLOT_NAMES[s].toLowerCase()}">`).join('')}</span></span>`).join('')}
        <small class="sv-note">${own} ${own === 1 ? 'piece' : 'pieces'} owned · one slot per stage, the boss drops a random one</small></section>
      <section class="sv-box"><h4>Other drops</h4><div class="sv-misc">${misc}</div></section>
      <section class="sv-box sv-team"><h4>Your team</h4><div class="cv-heroes">${tids.map(id => `<span class="cv-hero rar-${C[id].rar}">${por(id)}<span class="cv-hero-e">${affChip(C[id].aff)}</span><i>Lv ${S.roster[id].lvl}</i></span>`).join('')}</div>
        <div class="sv-pw"><span>Power <b>${teamPower(tids).toLocaleString('en-US')}</b></span><button class="btn small" data-act="editteam" data-mode="campaign">Edit team</button></div></section>
      ${reward}</aside>`;
    // a row per stage: the slot it drops, its state and level, the last phase's foes, Battle (and Auto ×10 once the
    // chapter is cleared); tap a row for every phase, the enemy essences and the first-clear reward
    const rows = idx.map(i => {
      const s = K.STAGES[i], ss = stateOf(i), open = i === campSel, ph = K.stagePhases(s, d), last = ph[ph.length - 1];
      const go = spot && i === next ? `<span class="spot-wrap"><button class="btn primary cn-go spot-go" data-act="play" data-stage="${next}">Fight${enCost(stEn(next, d))}</button><span class="spot-call">Tap <b>Fight</b> to start</span></span>` : playBtn(i);
      const essS = [...new Set(ph.flat().map(f => E[f].aff))], fr = firsts(i);
      return `<div class="sv-row ${ss} ${s.boss ? 'boss' : ''} ${open ? 'open' : ''}">
        <button type="button" class="sv-sel" data-act="csel" data-stage="${i}" aria-expanded="${open}" aria-label="${s.n === 6 ? 'Boss stage' : `Stage ${s.n + 1}`}: show every phase"></button>
        <span class="sv-drop">${dropIc(s)}</span>
        <span class="sv-t"><b>${s.n === 6 ? 'Boss stage' : `Stage ${s.n + 1}`}</b>${s.boss ? `<span class="sv-boss">${esc(s.boss)}</span>` : ''}<small>${ss === 'cleared' ? '<span class="sv-ok">✓ Cleared</span>' : ss === 'next' ? '<span class="sv-nx">Next battle</span>' : `${LOCK_SVG} Locked`} · Lv ${K.diffLvl(s, d)}</small></span>
        <span class="sv-foes">${last.slice(0, 4).map(f => `<span class="cv-foe ${K.BOSSES[f] ? 'boss' : ''}" title="${esc(E[f].name)}">${por(f)}</span>`).join('')}</span>
        <span class="sv-go">${ss === 'cleared' ? auto(i) : ''}${go}</span>
        ${open ? `<div class="sv-more"><div class="cv-phases">${ph.map((p, k) => `<div class="cv-ph ${p.some(f => K.BOSSES[f]) ? 'boss' : ''}"><small>Phase ${k + 1}</small><span>${p.map(f => `<span class="cv-foe ${K.BOSSES[f] ? 'boss' : ''}" title="${esc(E[f].name)}">${por(f)}</span>`).join('')}</span></div>`).join('<i class="cv-ph-arr" aria-hidden="true">›</i>')}</div>
          <div class="cv-meta"><span class="rw"><small>Enemies</small>${essS.map(e => `<b class="cv-ess" style="--c:${AFF_COL[e]}">${e}</b>`).join('')}</span>${fr.length ? `<span class="rw"><small>First clear</small></span>${fr.join('')}` : ''}</div></div>` : ''}</div>`;
    }).join('');
    return `<div class="campaign cv sv ${d ? 'hardmode diff-' + D.id : ''}">
      ${head.replace('<div class="cv-head">', '<div class="cv-head"><button type="button" class="btn small cl-back" data-act="chlist">‹ Chapters</button>')}
      <div class="sv-wrap ${spot ? '' : 'lfit'}">${side}<div class="sv-list">${rows}</div></div>
      ${spot ? '<div class="spot-block" data-act="spotblock"></div>' : `<div class="m-act"><button class="btn" data-act="editteam" data-mode="campaign">${esc(S.teams[S.modeTeam.campaign].name)} · Edit</button>${playBtn(sel)}</div>`}
      <details class="camp-info"><summary>How the campaign works</summary>
        <p>Ten chapters of seven stages, each fought in ${K.PHASES} phases: your survivors march on with their HP and recover 15% between phases. Every stage drops its own gear slot; the chapter boss waits in the last phase of stage 7. Replay cleared stages to farm the slot you need. Clearing all seven stages of a chapter opens its reward chest, once per difficulty. Clear all ${K.STAGES.length} stages to open the next difficulty.</p>
        <div class="help">
        <div class="help-ess"><h3>Essences</h3><img class="ess-art" src="${ESSENCE_ART}" alt="Essences: Ember beats Verdant, Verdant beats Storm, Storm beats Frost, Frost beats Radiant, Radiant beats Umbral, Umbral beats Ember; Aether is neutral">
        <p><b>Strong Hit</b>: +20% damage, stronger debuffs, 2 Break damage. <b>Weak Hit</b>: −25% damage, no crits, half debuff chance, no Break damage. ${affChip('Aether')} Aether is neutral and always lands a Normal Hit.</p></div>
        <div><h3>Speed and bosses</h3><p>Every unit fills its turn meter by its Speed; faster champions act more often. Bosses have a <b>Break Meter</b>: hit them with Strong Hits to cause an <b>Affinity Break</b>, stunning them for 2 turns while they take 15% more damage.</p></div>
        <div><h3>Getting stronger</h3><p>Level your champions to their maximum and ascend them with Ascension Stones for an extra star. Duplicate heroes from the Fate Altar upgrade their skills. Legendary heroes are far stronger, and only the Fate Altar has them.</p></div>
        <div><h3>Gear and sets</h3><p>Six gear slots per champion. Two or four pieces from the same set grant a bonus. Every chapter drops its own set; the Boss Hall has exclusive sets such as Fury, Nightshard, Vengeance and Ashcurse.</p></div>
        </div></details></div>`;
  }

  // ----- boss hall -----
  const bossOpen = i => i === 0 ? unlocked('kerkers') : (S.bh[K.BOSS_ORDER[i - 1]] || 0) >= 1;
  // the Boss Hall: the boss list (bossListHtml) and a boss's levels (dungeonsHtml), laid out like the Campaign
  const BH_GLYPH = { // small gold icons for the rows
    passive: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 .8 9.8 6.2 15.2 8 9.8 9.8 8 15.2 6.2 9.8.8 8l5.4-1.8z" fill="currentColor"/></svg>',
    set: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 14 8 8 15 2 8z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.5 11 8 8 11.5 5 8z" fill="currentColor"/></svg>',
  };
  // the boss at its finest: the first idle frame of its animated sheet, else its manga picture, else the battle art
  const bossBig = id => (typeof HERO_SHEET !== 'undefined' && HERO_SHEET[id] && HERO_SHEET[id].idle[0]) || (typeof MANGA_ART !== 'undefined' && MANGA_ART[id] && MANGA_ART[id].body) || SPR.url(id, 2);
  // The Boss Hall is laid out like the Campaign. First every boss in a list under each other (BV.view = 'bosses'):
  // its portrait on its chapter's scene, essence and archetype, progress over the ten levels and the set it drops.
  // Tapping one opens its levels (BV.view = 'levels'): on the left the boss, its passive, what beats it, its trait, its
  // set and the team for its essence; on the right a row per level (difficulty, enemy level, drops, Auto ×10, Fight);
  // tapping a row shows its phases. Fight opens the team screen first (openBossPrep, like the Campaign's prepHtml).
  const BV = { view: 'bosses', open: -1 };
  const bhArt = ci => chapterArt(Math.min(9, Math.floor(ci * 10 / K.BOSS_ORDER.length)));
  const bhLockTxt = ci => ci === 0 ? `Clear Chapter ${ROMAN[UNLOCKS.kerkers.ch - 1]} of the campaign first` : `Defeat ${K.BOSSES[K.BOSS_ORDER[ci - 1]].name} on level 1 first`;
  const bhDrops = n => K.bossLoot(n).rars.map(r => `<img class="gt-ic rar-${r}" src="${GEAR_TILE.random[Math.max(1, r)]}" alt="" title="${K.RARITIES[r]} gear, a random slot">`).join('');
  function bossListHtml() {
    const rows = K.BOSS_ORDER.map((id, i) => {
      const bo = K.BOSSES[id], open = bossOpen(i), best = S.bh[id] || 0, SS = K.SETS[K.bossSets(i)[0]], nx = Math.min(K.BOSS_LEVELS, best + 1);
      const cur = open && best < K.BOSS_LEVELS && (i === K.BOSS_ORDER.length - 1 || !bossOpen(i + 1));
      return `<button type="button" class="cl-ch bl-ch ${open ? '' : 'locked'} ${cur ? 'cur' : ''} ${best >= K.BOSS_LEVELS ? 'done' : ''}" data-act="bhopen" data-id="${id}" style="--art:url(${bhArt(i)});--c:${AFF_COL[bo.aff]}" ${open ? '' : 'disabled'}>
        <span class="cl-num bl-por">${open ? por(id) : LOCK_SVG}</span>
        <span class="cl-t"><small>Boss ${i + 1} · <span style="color:${AFF_COL[bo.aff]}">${bo.aff}</span> · ${esc(bo.arch)}${cur ? ' · <b>you are here</b>' : ''}</small><b class="cl-name">${open ? esc(bo.name) : '???'}${evHunted(id) ? '<span class="ev-badge" style="--evc:#e8933a">Hunted today</span>' : ''}</b><span class="cl-desc">${open ? `<b>${esc(bo.passiveName)}</b>: ${esc(bo.passiveDesc)}` : ''}</span>
          <span class="cl-prog">${open ? `<span class="cv-dots">${Array.from({ length: K.BOSS_LEVELS }, (_, k) => `<i class="${k < best ? 'on' : ''}"></i>`).join('')}</span>${best}/${K.BOSS_LEVELS}` : `${LOCK_SVG} ${esc(bhLockTxt(i))}`}</span></span>
        <span class="cl-gear"><span class="cl-set" style="--rc:var(--r${K.bossLoot(nx).rars.slice(-1)[0]})"><img src="${gearArt('borstpantser', 4, 0)}" alt=""><span><b>${esc(SS.name)}</b><em><i>${esc(SS.role)}</i> six-piece set</em></span></span>
          <small>Level ${nx} drops ${rarsHtml(K.bossLoot(nx).rars)}</small></span></button>`;
    }).join('');
    return `<div class="campaign cv cl bhl">${bhHead('')}${evHint(evNow('hunt'))}
      <p class="cl-hint">Twenty-five bosses, ten levels each. Beat a boss on level 1 to open the next. Every boss drops its own six-piece set; every two levels are one campaign difficulty.</p>
      <div class="cl-list">${rows}</div></div>`;
  }
  const bhHead = back => `<div class="cv-head">${back}<span class="cv-emb" style="background-image:url(${MENU_ART.kerkers})" aria-hidden="true"></span><div class="cv-ht"><h2>Boss Hall</h2><p>Twenty-five bosses, each with phases, a passive and a Break Meter.</p></div></div>`;
  function dungeonsHtml() {
    if (!unlocked('kerkers')) return lockedHtml('kerkers', 'Twenty-five bosses, each with phases, a passive and a Break Meter. Each boss has ten levels and drops gear from its own sets.');
    const cur = S.bhCur && K.BOSSES[S.bhCur] ? S.bhCur : K.BOSS_ORDER[0], ci = K.BOSS_ORDER.indexOf(cur);
    if (BV.view === 'bosses' || !bossOpen(ci)) return bossListHtml();
    const B0 = K.BOSSES[cur], best = S.bh[cur] || 0, col = AFF_COL[B0.aff], icon = (svg, c) => `<span class="bhv-ic" style="--c:${c}">${svg}</span>`;
    const beaten = K.ESSENCES.filter(e => K.BEATS[e] === B0.aff);
    const ids = S.teams[bossTeamIdx(B0.aff)].ids;
    const tr = K.bossTrait(ci), tef = K.EFFECTS[tr], canAnswer = ids.some(id => skillFx(id).includes(K.BTRAIT.answer[tr]));
    // its own six-piece set: the bonus at 2, 4 and 6 pieces (and the Ascended one), and the essence family bonus
    const SS = K.SETS[K.bossSets(ci)[0]], fam = K.SET_FAMILY[SS.ess];
    const tiers = SS.tiers.map(t => `<li${t.asc ? ' class="asc"' : ''} title="${esc(t.d)}"><i>${t.asc ? '★' : t.n}</i><span>${esc(t.d)}${t.asc ? ' (all six at <span class="asc-st">★★★</span>)' : ''}</span></li>`).join('')
      + (fam ? `<li class="fam"><i>✦</i><span>${SS.ess} family: ${esc(fam.d)} (4+ pieces from two ${SS.ess} boss sets)</span></li>` : '');
    // the boss on the left, kept small: who it is, what it does, what beats it, its trait, the set it drops (the team is
    // picked on the team screen that Fight opens)
    const side = `<aside class="sv-side bs-side">
      <div class="sv-ch bs-ch" style="--art:url(${bhArt(ci)});--c:${col}"><img class="bs-boss" src="${bossBig(cur)}" alt=""><small>Boss ${ci + 1} · <span style="color:${col}">${B0.aff}</span> · ${esc(B0.arch)}</small><h3>${esc(B0.name)}</h3></div>
      <section class="sv-box bs-info">
        <p title="${esc(B0.passiveDesc)}"><b>${esc(B0.passiveName)}</b> ${esc(B0.passiveDesc)}</p>
        <p><b>Strong against it</b> ${beaten.length ? beaten.map(e => `<span style="color:${AFF_COL[e]}">${e}</span>`).join(', ') : 'nobody: no essence has the edge'} · Break ${B0.breakMax}</p>
        <p title="${esc(tef.d)}"><b>${tef.n}</b> from level ${K.BTRAIT.from}: ${esc(tef.d)}. ${canAnswer ? '<span class="ok">Your team can answer it.</span>' : '<span class="warn">Nobody in your team can.</span>'}</p></section>
      <section class="sv-box bs-set"><h4>Gear drops</h4><div class="bs-sn">${setDot(K.bossSets(ci)[0])}<b>${esc(SS.name)}</b><small>${esc(SS.role)}</small></div><ul class="bs-tiers">${tiers}</ul></section></aside>`;
    // a row per level: its drops, difficulty, state and enemy level, the boss, Auto ×10 (once beaten) and Fight; tap a
    // row for its phases
    const rows = Array.from({ length: K.BOSS_LEVELS }, (_, k) => k + 1).map(n => {
      const ok = bhLvlOpen(n), st = n <= best ? 'cleared' : n === best + 1 && ok ? 'next' : 'locked', open = n === BV.open, ph = K.bossPhases(cur, n);
      const why = !ok ? bhLvlNeed(n) : `Beat level ${n - 1} first`;
      const go = st === 'locked' ? `<button class="btn" disabled title="${esc(why)}">${LOCK_SVG} Locked</button>` : `<button class="btn primary" data-act="bhplay" data-id="${cur}" data-n="${n}">Fight${enCost(K.bossEnergy(n))}</button>`;
      return `<div class="sv-row ${st} ${n % 2 ? '' : 'boss'} ${open ? 'open' : ''}">
        <button type="button" class="sv-sel" data-act="bhlvl" data-id="${cur}" data-n="${n}" aria-expanded="${open}" aria-label="Level ${n}: show every phase"></button>
        <span class="sv-drop">${bhDrops(n)}</span>
        <span class="sv-t"><b>Level ${n}</b><span class="sv-boss">${K.DIFFS[K.bossDiff(n)].name}</span><small>${st === 'cleared' ? '<span class="sv-ok">✓ Cleared</span>' : st === 'next' ? '<span class="sv-nx">Next battle</span>' : `${LOCK_SVG} ${ok ? 'Locked' : `Opens with ${K.DIFFS[K.bossDiff(n)].name}`}`} · Lv ${K.bossLvl(ci, n)}${n >= K.BTRAIT.from ? ` · ${tef.n}` : ''}</small></span>
        <span class="sv-foes"><span class="cv-foe boss" title="${esc(B0.name)}">${por(cur)}</span></span>
        <span class="sv-go">${st === 'cleared' ? `<button type="button" class="btn small violet" data-act="bhauto" data-id="${cur}" data-n="${n}">Auto ×10</button>` : ''}${go}</span>
        ${open ? `<div class="sv-more"><div class="cv-phases">${ph.map((p, k) => `<div class="cv-ph ${p.some(f => K.BOSSES[f]) ? 'boss' : ''}"><small>Phase ${k + 1}</small><span>${p.map(f => `<span class="cv-foe ${K.BOSSES[f] ? 'boss' : ''}" title="${esc(E[f].name)}">${por(f)}</span>`).join('')}</span></div>`).join('<i class="cv-ph-arr" aria-hidden="true">›</i>')}</div>
          <div class="cv-meta">${ok ? '' : `<span class="rw">${LOCK_SVG} ${esc(bhLvlNeed(n))}</span>`}${n >= K.BTRAIT.from ? `<span class="rw">${fxBadge(tr)} ${esc(tef.n)}: ${esc(tef.d)}</span>` : ''}${n >= 3 ? '<span class="rw">Blight Aura: bring a healer</span>' : ''}</div></div>` : ''}</div>`;
    }).join('');
    return `<div class="campaign cv sv bhs">
      ${bhHead('<button type="button" class="btn small cl-back" data-act="bhlist">‹ Bosses</button>')}
      <div class="sv-wrap lfit">${side}<div class="sv-list">${rows}</div></div></div>`;
  }
  function paintDungeonArt() {
    document.querySelectorAll('canvas[data-bg]').forEach(c => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(SPR.bg(+c.dataset.bg), 0, 0); });
  }

  // ----- altar -----
  const shardIc = (id, cls) => `<img class="shard-ic ${cls || 'ic'}" src="${SHARD_ART[id + '0']}" alt="">`;
  const shardAnim = id => `<span class="fs-anim">${[0, 1, 2].map(k => `<img src="${SHARD_ART[id + k]}" alt="">`).join('')}</span>`;
  function altarHtml() {
    if (!unlocked('altaar')) return lockedHtml('altaar', 'Offer Fate Shards to summon heroes. Legendary heroes can only be summoned here. Keep the Fate Shards you find: they are waiting for you when the altar opens.');
    const cards = K.FATE_SHARDS.map((f, t) => {
      const have = S.fs[f.id] || 0;
      const rates = f.rates.map((r, i) => r ? `<span class="rar-${i}"><b class="rartxt">${K.RARITIES[i]}</b> ${r}%</span>` : '').join('');
      return `<div class="fs-card fs-t${t} ${have ? '' : 'none'}">
        <div class="fs-top">${shardAnim(f.id)}<div><h3>${esc(f.name)}</h3><span class="tag">You have ${have}</span></div></div>
        <p>${esc(f.desc)}</p><div class="fs-rates">${rates}</div>
        <small class="empty-note">Drop chance per victory: ${String(+(f.drop * 100).toFixed(3)).replace('.', ',')}%</small>
        <div class="fs-act"><button class="btn violet small" data-act="summon" data-type="${f.id}" data-n="1" ${have < 1 ? 'disabled' : ''}>Summon</button>${have >= 10 ? `<button class="btn violet small" data-act="summon" data-type="${f.id}" data-n="10">Summon 10</button>` : ''}</div>
      </div>`;
    }).join('');
    return `<div class="section-head"><div><h2>Fate Altar</h2><p class="lede">Offer Fate Shards to summon heroes. The rarer the shard, the stronger the pool. Legendary heroes can only be summoned here. A hero you already own upgrades one of their skills.</p></div></div>
      <div class="altar">
        <div class="altar-stage">${shardAnim('legendary').replace('class="fs-anim"', 'class="fs-anim big"')}
          <div class="altar-actions"><button class="btn" data-act="buyshard" ${S.silver < K.SHARD_PRICE ? 'disabled' : ''}>Buy a Fate Shard · ${sigils(K.SHARD_PRICE)}</button></div>
          <span class="empty-note">Fate Shards drop from every victory in the campaign and the Boss Hall. First clears give a guaranteed shard.</span>
          <div class="pity"><span class="tag">Epic or better guaranteed in ${K.PITY_EPIC - (S.pity || 0)} ${K.PITY_EPIC - (S.pity || 0) === 1 ? 'summon' : 'summons'}</span><small class="empty-note">Only Ancient, Mythic and Legendary Fate Shards count towards this.</small><div class="bar"><i style="width:${Math.round((S.pity || 0) / K.PITY_EPIC * 100)}%"></i></div>
            ${(() => { const s = evNow('storm'); return s ? `<span class="ev-badge" style="--evc:#9a7cf0">Shard Storm: ${esc(K.SHARD[s.shard].name)} counts double</span>` : ''; })()}<span class="tag pity-leg">Legendary guaranteed in ${K.PITY_LEG - (S.lpity || 0)} ${K.PITY_LEG - (S.lpity || 0) === 1 ? 'summon' : 'summons'}</span><div class="bar leg"><i style="width:${Math.round((S.lpity || 0) / K.PITY_LEG * 100)}%"></i></div></div>
        </div>
        <div class="fs-grid">${cards}</div>
      </div>`;
  }
  let altarRaf = 0;
  function paintAltar() {
    const c = $('#altar-cv'); if (!c) return;
    const g = c.getContext('2d');
    cancelAnimationFrame(altarRaf);
    const draw = now => {
      if (!document.body.contains(c)) return;
      g.clearRect(0, 0, 64, 64);
      const t = now / 400;
      g.fillStyle = '#2a2236'; g.fillRect(14, 50, 36, 8); g.fillStyle = '#3a3048'; g.fillRect(18, 44, 28, 7); g.fillStyle = '#4a3e5c'; g.fillRect(18, 44, 28, 2);
      g.fillStyle = '#1a1422'; g.fillRect(14, 57, 36, 2);
      const y = 20 + Math.round(Math.sin(t) * 2);
      g.fillStyle = 'rgba(176,138,255,0.25)'; g.fillRect(24, y - 4, 16, 26);
      const cr = [[31, y - 8, 2, 2, '#e8d8ff'], [29, y - 6, 6, 4, '#b08aff'], [27, y - 2, 10, 6, '#8a5ae8'], [29, y + 4, 6, 4, '#6a3ac8'], [31, y + 8, 2, 2, '#4a2a98'], [30, y - 5, 1, 7, '#ffffff']];
      cr.forEach(([x, yy, w, h, col]) => { g.fillStyle = col; g.fillRect(x, yy, w, h); });
      for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * 1.05, r = 18; g.fillStyle = i % 2 ? '#b08aff' : '#e8d8ff'; g.fillRect(Math.round(32 + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.4), 1, 1); }
      altarRaf = requestAnimationFrame(draw);
    };
    altarRaf = requestAnimationFrame(draw);
  }

  // ----- team -----
  function cardHtml(id, opts) {
    const c = C[id], owned = !!S.roster[id];
    if (!owned) {
      const st = K.STAGES.findIndex(s => K.stageUnlock(s, S.starter) === id);
      const where = st >= 0 ? `Ch ${ROMAN[K.STAGES[st].chapter]}-${K.STAGES[st].n + 1}` : '';
      return `<div class="card lockedc rar-${c.rar}" title="${st >= 0 ? 'Earn in ' + stageName(st) + ' or at the Fate Altar' : 'Fate Altar only'}">${por(id)}<span class="nm">???</span><span class="sub">${where ? where + ' / Fate Altar' : 'Fate Altar'}</span></div>`;
    }
    const cls = [opts.sel ? 'sel' : '', opts.inteam ? 'inteam' : ''].join(' ');
    const slot = S.team.indexOf(id) + 1; // --tord: team members first in the phone strip (see CSS)
    return `<button class="card rar-${c.rar} ${cls}" data-act="${opts.act}" data-id="${id}"${slot ? ` data-slot="${slot}"` : ''} style="--ec:${AFF_COL[c.aff]}${slot ? `;--tord:${slot - 5}` : ''}">${affChip(c.aff)}<span class="lv" title="Level ${S.roster[id].lvl}">${S.roster[id].lvl}</span>${S.roster[id].lock ? '<span class="lockmark" title="Locked">🔒</span>' : ''}${por(id)}<span class="nm">${esc(c.short)}</span>${starStr(S.roster[id].stars, K.maxStars(id))}<span class="sub">${roleStr(c)}</span></button>`;
  }
  const sortedIds = () => [...K.CHAMP_ORDER, ...K.DEV_HEROES.filter(id => S.roster[id]), ...K.CAPTURE_ORDER.filter(id => S.roster[id])].sort((a, b) => (!!S.roster[b] - !!S.roster[a]) || C[b].rar - C[a].rar || ((S.roster[b]?.lvl || 0) - (S.roster[a]?.lvl || 0)));
  // what a team brings: healing (heal, shield or revive skills, or a healing passive), protection (tanks, Defense Up,
  // taunt), damage and control. Fights from Chapter IV on are long enough that a team without healing wears down.
  const HEAL_PASSIVES = ['beacon', 'harmony', 'divineward'];
  const skillFx = id => C[id].skills.flatMap(s => s.fx.map(f => f.t === 'buff' || f.t === 'debuff' ? f.k : f.t));
  const heals = id => HEAL_PASSIVES.includes(C[id].passive) || skillFx(id).some(t => t === 'heal' || t === 'shield' || t === 'revive');
  function teamRoles(ids) {
    const has = f => ids.some(f);
    return [
      ['Damage', has(id => ['Warrior', 'Assassin', 'Ranger', 'Mage'].includes(C[id].role)), 'Attackers to finish fights quickly'],
      ['Healing', has(heals), 'From Boss Hall level 3 on, bosses drain your whole team every turn (Blight Aura): only healing and shields keep you standing'],
      ['Protection', has(id => C[id].role === 'Tank' || C[id].role2 === 'Tank' || skillFx(id).some(t => t === 'defUp' || t === 'taunt')), 'A tank or Defense Up keeps the damage off your attackers'],
      ['Control', has(id => skillFx(id).some(t => ['stun', 'freeze', 'spdDown', 'defDown', 'atkDown', 'tmDrain'].includes(t))), 'Stuns, slows and debuffs blunt the enemy'],
    ];
  }
  const rolesHtml = ids => `<ul class="roles-chk">${teamRoles(ids).map(([k, ok, tip]) => `<li class="${ok ? 'ok' : 'miss'} role-${k.toLowerCase()}" title="${k}${ok ? '' : ' missing'}: ${esc(tip)}" aria-label="${k}${ok ? '' : ' missing'}"><i aria-hidden="true">${{ Damage: '⚔', Healing: '✚', Protection: '⛨', Control: '✦' }[k]}</i></li>`).join('')}</ul>${ids.length && !teamRoles(ids)[1][1] ? '<p class="empty-note roles-tip">No healer in this team. That works in the campaign, but from Boss Hall level 3 on bosses drain your whole team every turn (Blight Aura), and without healing or shields you will not outlast them.</p>' : ''}`;
  // Heroes: one screen like a gacha hero screen. On the left the roster (its own scroll; Show, Sort and a Filter
  // panel), in the middle the chosen hero (art, level, power, team and lock), on the right its tabs (champTab): Gear
  // (the six slots, total stats with what gear adds, the active sets), Skills, Level up and Ascend. The Teams view
  // (HX.view) puts the teams in the middle: tapping heroes in the roster puts them in the team or takes them out.
  // Phones stack it: a strip of four heroes, the hero, the tabs. Nothing scrolls the page on PC, only the columns.
  const HX = { view: 'hero', filt: false };
  const HX_TABS = [['gear', 'Gear'], ['skills', 'Skills'], ['level', 'Level up'], ['ascend', 'Ascend']];
  function rosterTile(id) {
    const c = C[id], r = S.roster[id];
    if (!r) return `<button type="button" class="hx-t missing rar-${c.rar}" style="--ec:${AFF_COL[c.aff]};--rc:var(--r${c.rar})" data-act="hinfo" data-id="${id}" title="${esc(c.name)} · not unlocked yet: ${esc(heroSource(id))}">${por(id)}<span class="hx-lk" aria-hidden="true">${LOCK_SVG}</span></button>`;
    const slot = S.team.indexOf(id) + 1, teams = HX.view === 'teams';
    return `<button type="button" class="hx-t rar-${c.rar} ${id === selChamp ? "on" : ""} ${slot ? "tm" : ""}" style="--ec:${AFF_COL[c.aff]};--rc:var(--r${c.rar})" data-act="${teams ? 'toggle' : 'sel'}" data-id="${id}" title="${esc(c.name)} · Lv ${r.lvl}${slot ? ` · in ${esc(S.teams[S.tsel].name)}` : ''}${teams ? (slot ? ' · tap to take out' : ' · tap to add') : ''}">
      ${por(id)}${essBadge(c.aff)}<span class="hx-lv">${r.lvl}</span>${slot ? `<span class="hx-slot">${slot}</span>` : ''}${r.lock ? '<span class="hx-lock" aria-hidden="true">🔒</span>' : ''}<span class="hx-st">${'★'.repeat(r.stars)}</span></button>`;
  }
  // on PC the Heroes screen fills the window below the header: only its columns scroll, never the page
  // Screens built as columns that scroll on their own fill the window below the header: Heroes (.hx) on PC and on a
  // phone on its side, others (.lfit: Boss Hall, Tower…) only on a phone on its side
  const landPhone = () => innerHeight < 500 && innerWidth > innerHeight;
  function hxFit() {
    for (const h of document.querySelectorAll('.hx, .lfit')) {
      if (h.classList.contains('lfit') ? !landPhone() : innerWidth <= 760 && !landPhone()) { h.style.height = ''; continue; }
      const top = h.getBoundingClientRect().top + scrollY;
      const pad = parseFloat(getComputedStyle($('#app')).paddingBottom) || 0; // the page's own bottom padding
      h.style.height = Math.max(innerHeight < 500 ? 150 : 520, innerHeight - top - pad - 4) + 'px'; // a phone on its side is ~360-430 px high
    }
  }
  addEventListener('resize', () => { navTop(); hxFit(); });
  // where the screens start below the header: the icon bar on the left is never taller than the window below it
  // (with all its buildings it would make the page scroll, most of all on a phone on its side)
  function navTop() {
    const nw = document.querySelector('.navwrap'), st = document.documentElement.style; if (!nw) return;
    st.setProperty('--nav-top', Math.round(nw.getBoundingClientRect().top + scrollY) + 'px');
    st.setProperty('--app-pb', (parseFloat(getComputedStyle($('#app')).paddingBottom) || 0) + 'px');
  }
  function teamHtml() {
    if (!S.roster[selChamp]) selChamp = S.team[0] || Object.keys(S.roster)[0];
    if (!HX_TABS.some(([k]) => k === champTab)) champTab = 'gear';
    const list = filteredIds(TF.own), nf = [TF.aff, TF.rar, TF.role].filter(v => v !== 'all').length;
    const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
    const roster = `<aside class="hx-col hx-ros">
      <div class="hx-rh"><select data-filter="own" aria-label="Show">${[['owned', 'My heroes'], ['all', 'All heroes'], ['missing', 'Not unlocked']].map(([v, l]) => opt(v, l, TF.own)).join('')}</select><select data-filter="sort" aria-label="Sort">${[['power', 'Power'], ['level', 'Level'], ['rarity', 'Rarity'], ['name', 'Name']].map(([v, l]) => opt(v, l, TF.sort)).join('')}</select>
        <button type="button" class="btn small ${HX.filt || nf ? 'on' : ''}" data-act="hxfilt" aria-expanded="${HX.filt}">Filter${nf ? ` · ${nf}` : ''}</button>
        <button type="button" class="btn small ${HX.view === 'teams' ? 'primary' : ''} hx-teams" data-act="hxview" data-v="${HX.view === 'teams' ? 'hero' : 'teams'}">${HX.view === 'teams' ? 'Done' : 'Teams'}</button></div>
      ${HX.filt ? filterBar() : ''}
      ${HX.view === 'teams' ? '<p class="empty-note hx-tip">Tap a hero to put it in the team or take it out.</p>' : ''}
      <div class="hx-list">${list.length ? list.map(rosterTile).join('') : '<p class="empty-note">No heroes match these filters.</p>'}</div>
      <small class="empty-note hx-count">${K.CHAMP_ORDER.filter(x => S.roster[x]).length} / ${K.CHAMP_ORDER.length} heroes unlocked</small></aside>`;
    const mid = HX.view === 'teams' ? hxTeams() : hxHero(selChamp);
    const bag = HB.open && HX.view !== 'teams';
    return `<div class="hx ${HX.view === 'teams' ? 'teams' : ''} ${bag ? 'bag' : ''}">${roster}${mid}${bag ? `<aside class="hx-col hx-side hb-side">${hxBag(selChamp)}</aside>` : hxSide(selChamp)}</div>`;
  }
  // the middle in the Teams view: the teams, the four places (tap one to see that hero), what the team brings
  function hxTeams() {
    const order = S.teams.map((t, i) => i).sort((a, b) => (b === S.tfav) - (a === S.tfav) || a - b);
    const tabs = order.map(i => { const t = S.teams[i], fav = i === S.tfav; return `<button type="button" class="tm-tab ${i === S.tsel ? 'on' : ''} ${fav ? 'fav' : ''}" data-act="tmsel" data-i="${i}" aria-pressed="${i === S.tsel}"><b>${fav ? '<span class="tm-star" title="Favourite team">★</span> ' : ''}${esc(t.name)}</b><small>${t.ids.length}/4 · ${TEAM_MODES.filter(([m]) => S.modeTeam[m] === i).map(([, l]) => l).join(', ') || 'not used'}</small></button>`; }).join('')
      + (S.teams.length < TEAM_MAX ? `<button type="button" class="tm-tab add" data-act="tmnew"><b>+ Create a team</b><small>up to ${TEAM_MAX}</small></button>` : '');
    const modes = TEAM_MODES.map(([m, l]) => { const on = S.modeTeam[m] === S.tsel; return `<button type="button" class="tm-mode ${on ? 'on' : ''}" data-act="tmmode" data-m="${m}" aria-pressed="${on}" title="${on ? `${l} uses this team` : `Use this team for ${l}`}">${on ? '✓ ' : ''}${l}</button>`; }).join('');
    const slots = [0, 1, 2, 3].map(i => { const id = S.team[i]; return id
      ? `<button type="button" class="hx-ts rar-${C[id].rar} ${id === selChamp ? "on" : ""}" style="--ec:${AFF_COL[C[id].aff]};--rc:var(--r${C[id].rar})" data-act="sel" data-id="${id}">${por(id)}<b>${esc(C[id].short)}</b><small>Lv ${S.roster[id].lvl} · ${roleStr(C[id])}</small><small>Power ${power(statsOf(id)).toLocaleString('en-US')}</small></button>`
      : '<div class="hx-ts empty"><small>Empty: tap a hero on the left</small></div>'; }).join('');
    return `<section class="hx-col hx-mid hx-tm">
      <div class="tm-tabs" role="group" aria-label="Your teams">${tabs}</div>
      <div class="tm-row"><span class="tm-lbl">Use ${esc(S.teams[S.tsel].name)} for</span>${modes}</div>
      <div class="tm-row"><span class="tm-acts"><button type="button" class="linkbtn" data-act="tmfav" aria-pressed="${S.tsel === S.tfav}">${S.tsel === S.tfav ? '★ Favourite' : '☆ Make favourite'}</button><button type="button" class="linkbtn" data-act="tmname">Rename</button>${S.teams.length > 1 ? '<button type="button" class="linkbtn" data-act="tmdel">Delete</button>' : ''}</span><span class="hx-tpow">Team power <b>${teamPower().toLocaleString('en-US')}</b></span></div>
      <div class="hx-tslots">${slots}</div>
      ${rolesHtml(S.team)}</section>`;
  }
  // the middle in the hero view: the hero on its essence's stage, who it is, level and power, team and lock
  function hxHero(id) {
    const c = C[id], r = S.roster[id], st = statsOf(id), cap = K.maxLvl(r.stars, id), mxs = K.maxStars(id), need = K.xpNeed(r.lvl), atCap = r.lvl >= cap, inTeam = S.team.includes(id);
    const other = S.teams.filter((t, i) => i !== S.tsel && t.ids.includes(id)).map(t => esc(t.name));
    return `<section class="hx-col hx-mid" style="--ec:${AFF_COL[c.aff]}">
      <div class="fg-art hx-art"><div class="fg-scene" style="--scene:url(${CHAPTER_BG[ESS_BG[c.aff] || 0]})"></div><div class="fg-ring"></div><div class="fg-floor"></div><img class="${c.dev ? 'dev-art' : ''}" src="${SPR.url(id, 2)}" alt=""></div>
      <div class="hx-id"><div class="fg-name">${essBadge(c.aff, 'big')}<div><h2>${esc(c.name)}</h2>${starStr(r.stars, mxs)}</div><div class="hx-pow"><small>Power</small><b>${power(st).toLocaleString('en-US')}</b></div></div>
        <div class="fg-sub"><span class="rartxt rar-${c.rar}">${K.RARITIES[c.rar]}</span> · ${roleStr(c)} · ${c.aff}</div>
        <div class="hx-lvl"><b>Lv ${r.lvl}</b><span>/ ${cap}</span><div class="xpbar"><i style="width:${atCap ? 100 : Math.round(r.xp / need * 100)}%"></i></div><small class="empty-note">${atCap ? (r.stars < mxs ? 'Max for this star: ascend' : 'Max level') : `${r.xp.toLocaleString('en-US')} / ${need.toLocaleString('en-US')} XP`}</small></div></div>
        <div class="hx-acts"><button type="button" class="btn small ${inTeam || c.pc ? '' : 'primary'}" data-act="toggle" data-id="${id}" ${c.pc ? 'disabled title="Your hero always fights with you"' : ''}>${c.pc ? 'Always in your team' : inTeam ? `Remove from ${esc(S.teams[S.tsel].name)}` : `Add to ${esc(S.teams[S.tsel].name)}`}</button><button type="button" class="btn small lock-btn ${r.lock ? 'on' : ''}" data-act="hlock" data-id="${id}" aria-pressed="${!!r.lock}" title="${r.lock ? 'Locked: this hero can never be fed. Tap to unlock.' : 'Lock this hero so it can never be fed by accident'}">${r.lock ? '🔒 Locked' : '🔓 Lock'}</button>${c.pc ? `<button type="button" class="btn small fcs-btn" data-act="fcopen">${FCS_SVG} Change class</button>` : ''}</div>
        ${HB.open ? `<div class="fg-sgrid hx-mslots">${gearTilesHtml(id, 'hxslot')}</div>` : ''}
        ${other.length ? `<small class="empty-note hx-also">Also in ${other.join(', ')}</small>` : ''}</section>`;
  }
  // the right: the hero's tabs
  function hxSide(id) {
    const c = C[id], r = S.roster[id];
    let canRank = false, rank = '';
    if (c.pc) rank = `<div class="rank"><span class="empty-note">Your hero gains stars by itself: 5★ at level 40, 6★ at level 50. Its skills grow every 12 levels.</span></div>
      <div class="rank fcs-rank"><button class="btn small" data-act="fcopen">${FCS_SVG} Change class</button><span class="empty-note">With a Fate Changing Stone (Market): level, gear and team places move along.</span></div>`;
    else if (r.stars < K.maxStars(id)) {
      const atCap = r.lvl >= K.maxLvl(r.stars, id), rc = K.rankCost(r.stars), ok = atCap && stoneN(rc.tier) >= rc.stones && S.silver >= rc.silver;
      canRank = ok;
      rank = `<div class="rank"><button class="btn primary small" data-act="rank" ${ok ? '' : 'disabled'}>Ascend to ${r.stars + 1}★</button><span class="empty-note">${stoneIc(rc.tier)} ${rc.stones} ${stoneName(rc.tier, rc.stones)} (you have ${stoneN(rc.tier)}) · ${sigils(rc.silver)}${atCap ? '' : ` · reach level ${K.maxLvl(r.stars, id)} first`}</span></div>`;
    }
    const st = statsOf(id), base = K.heroStats(id, r, []), items = itemsOf(id), sets = setRowsHtml(items);
    const stats = [['hp'], ['atk'], ['def'], ['spd'], ['crit', 1], ['cdmg', 1], ['acc'], ['res']].map(([k, p]) => `<dt>${K.STAT_NAMES[k]}</dt><dd>${st[k].toLocaleString('en-US')}${p ? '%' : ''}${st[k] > base[k] ? `<small>+${(st[k] - base[k]).toLocaleString('en-US')}${p ? '%' : ''}</small>` : ''}</dd>`).join('');
    const body = champTab === 'skills' ? skillsHtml(id, r)
      : champTab === 'level' ? elixirHtml(id) + fodderHtml(id)
      : champTab === 'ascend' ? `<div class="ascend">${rank || `<p class="empty-note">${esc(c.short)} has the maximum number of stars.</p>`}</div>`
      : `<div class="fg-sgrid hx-slots">${gearTilesHtml(id, 'hxslot')}</div>
        <div class="hx-gacts"><button type="button" class="btn small primary" data-act="bestgear">Equip best</button><button type="button" class="btn small" data-act="unequipall" ${items.length ? '' : 'disabled'}>Remove all</button></div>
        <dl class="stats hx-stats">${stats}</dl><small class="empty-note">Green: what gear and sets add.</small>
        <div class="fg-sets"><h3>Active set bonuses</h3>${sets || '<p class="empty-note">No set bonus yet.</p>'}</div>`;
    return `<aside class="hx-col hx-side"><div class="dtabs hx-tabs" role="tablist" aria-label="Hero">${HX_TABS.map(([k, l]) => `<button type="button" role="tab" data-act="ctab" data-t="${k}" aria-selected="${champTab === k}">${l}${k === 'ascend' && canRank ? '<span class="dot"></span>' : ''}</button>`).join('')}</div>
      <div class="hx-body" data-t="${champTab}">${body}</div></aside>`;
  }
  // ----- hero filters: essence, rarity and class filter the list; power, level, rarity or name sort it.
  // own: 'owned' (Team), or on the Heroes index 'all' / 'owned' / 'missing' (TF.own) -----
  const CLASSES = ['Tank', 'Warrior', 'Assassin', 'Ranger', 'Mage', 'Support', 'Controller'];
  const TF = { aff: 'all', rar: 'all', role: 'all', sort: 'power', own: 'owned' };
  function filteredIds(own) {
    const keep = id => (TF.aff === 'all' || C[id].aff === TF.aff) && (TF.rar === 'all' || C[id].rar === +TF.rar)
      && (TF.role === 'all' || C[id].role === TF.role || C[id].role2 === TF.role) && (own === 'all' || (own === 'owned') === !!S.roster[id]);
    const val = id => !S.roster[id] ? -1 : TF.sort === 'level' ? S.roster[id].lvl : TF.sort === 'rarity' ? C[id].rar : power(statsOf(id));
    const ids = [...new Set([...K.PC_IDS.filter(id => S.roster[id]), ...K.CHAMP_ORDER, ...K.DEV_HEROES.filter(id => S.roster[id]), ...K.CAPTURE_ORDER.filter(id => S.roster[id])])].filter(keep);
    return ids.sort((a, b) => (!!S.roster[b] - !!S.roster[a]) || (TF.sort === 'name' ? C[a].name.localeCompare(C[b].name) : val(b) - val(a) || C[b].rar - C[a].rar));
  }
  // the Filter panel of the Heroes roster (Show and Sort sit above it)
  function filterBar() {
    const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
    const essences = ['all', ...K.ESSENCES].map(a => `<button type="button" class="ess-f ${TF.aff === a ? 'on' : ''}" data-act="tfaff" data-aff="${a}" aria-pressed="${TF.aff === a}" title="${a === 'all' ? 'All essences' : a}">${a === 'all' ? 'All' : affChip(a)}</button>`).join('');
    return `<div class="tfilter">
      <div class="tf-ess" role="group" aria-label="Essence">${essences}</div>
      <label>Rarity<select data-filter="rar">${opt('all', 'All', TF.rar)}${K.RARITIES.slice(0, 5).map((r, i) => opt(i, r, TF.rar)).join('')}</select></label>
      <label>Class<select data-filter="role">${opt('all', 'All', TF.role)}${CLASSES.map(r => opt(r, r, TF.role)).join('')}</select></label>
      ${TF.aff !== 'all' || TF.rar !== 'all' || TF.role !== 'all' ? '<button type="button" class="linkbtn" data-act="tfreset">Clear filters</button>' : ''}
    </div>`;
  }

  // what a skill level adds: the skill's damage, healing and shields are multiplied (not added to its %), shown with the
  // skill's own first damage or heal number so "+8%" cannot be read as "90% becomes 98%"
  function skillLvTxt(s, lv) {
    const k = 1 + lv * K.SKILL_STEP, f = (s.fx || []).find(x => x.t === 'dmg' && x.m) || (s.fx || []).find(x => x.pct), v = f && (f.m || f.pct);
    return `Skill level ${lv}: ×${k.toFixed(2)} damage, healing and shields` + (v ? ` (${Math.round(v * 100)}% → ${Math.round(v * k * 100)}%)` : '');
  }
  // the skills of a hero (r: its roster entry, or null for a hero not unlocked yet: no skill levels)
  function skillsHtml(id, r) {
    const c = C[id], pips = lv => `<span class="pips" title="Skill-level ${lv}/${K.SKILL_MAX}">${Array.from({ length: K.SKILL_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>`;
    return c.skills.map((s, i) => { const lv = r ? r.sk[i] || 0 : 0; const cd = s.cd && lv >= K.SKILL_MAX ? s.cd - 1 : s.cd; return `<div class="skill"><b>${SKILL_TAG[i] || 'A' + (i + 1)} · ${esc(s.name)}</b>${r ? pips(lv) : ''}<span class="cd">${cd ? `cooldown ${cd}` : 'no cooldown'} · ${TARGET_LABEL[s.target]}</span><p>${esc(s.desc)}${lv ? ` <span style="color:var(--violet)">${skillLvTxt(s, lv)}${lv >= K.SKILL_MAX && s.cd ? ', cooldown −1' : ''}</span>` : ''}</p></div>`; }).join('')
      + (c.passive ? `<div class="skill passive"><b>Passive · ${esc(c.passiveName)}</b><p>${esc(c.passiveDesc)}</p></div>` : '');
  }
  // where a hero can be found: a campaign stage unlock (Easy) and/or the Fate Altar
  function heroSource(id) {
    const c = C[id], st = K.STAGES.findIndex(s => K.stageUnlock(s, S.starter) === id);
    if (c.captured) return 'Captured in the campaign';
    if (K.ENEMIES[id]) return 'Fate Altar, or capture one in the campaign';
    if (c.dev) return 'Gift only';
    return st >= 0 ? `Unlock: ${stageName(st)} (Easy), or the Fate Altar` : 'Fate Altar';
  }

  // popup with a hero's details from the Heroes index; an owned hero links to the Team screen
  function heroInfo(id) {
    const c = C[id], r = S.roster[id], m = $('#modal');
    const st = r ? statsOf(id) : K.heroStats(id, { lvl: 1, xp: 0, stars: K.baseStars(id), sk: c.skills.map(() => 0) }, []);
    const row = (k, pct) => `<dt>${K.STAT_NAMES[k]}</dt><dd>${st[k]}${pct ? '%' : ''}</dd>`;
    m.innerHTML = `<div class="modal-box hero-pop rar-${c.rar}" role="dialog" aria-modal="true" aria-labelledby="hp-t">
      <div class="hp-head"><img class="spr bigspr ${r ? '' : 'missing'} ${c.dev ? 'dev-art' : ''}" src="${SPR.url(id, 2)}" alt=""><div>
        <h2 id="hp-t">${esc(c.name)}</h2>
        <div class="tags"><span class="rartxt">${K.RARITIES[c.rar]}</span> · ${esc(c.faction)} · ${roleStr(c)} · ${affChip(c.aff)} ${c.aff}</div>
        <div>${r ? `${starStr(r.stars, K.maxStars(id))} · Level <b>${r.lvl}</b> / ${K.maxLvl(r.stars, id)} · Power <b>${power(st).toLocaleString('en-US')}</b>${S.team.includes(id) ? ' <span class="team-tag">In your team</span>' : ''}` : `<span class="tag">Not unlocked</span> <span class="empty-note">${esc(heroSource(id))}</span>`}</div>
      </div></div>
      <div class="dtabs hp-tabs" role="tablist" aria-label="Stats or skills"><button type="button" role="tab" data-act="hptab" data-t="stats" aria-selected="true">Stats</button><button type="button" role="tab" data-act="hptab" data-t="skills" aria-selected="false">Skills</button></div>
      <section class="hp-sec" data-sec="stats">${r ? '' : '<p class="empty-note">At level 1.</p>'}<dl class="stats">${row('hp')}${row('atk')}${row('def')}${row('spd')}${row('crit', 1)}${row('cdmg', 1)}${row('acc')}${row('res')}</dl></section>
      <section class="hp-sec" data-sec="skills" hidden><div class="hp-skills">${skillsHtml(id, r)}</div></section>
      <div class="modal-actions">${r ? `<button class="btn primary" data-act="hteam" data-id="${id}">Upgrade in Team</button>` : ''}<button class="btn" data-act="modal" data-go="close">Close</button></div></div>`;
    m.hidden = false;
    m.querySelector('.btn').focus({ preventScroll: true }); m.querySelector('.modal-box').scrollTop = 0;
  }

  // Feed: spare copies (captured enemies and summoned duplicates) and any other hero outside the team can be fed for XP;
  // a copy of the selected hero itself levels one of its skills instead
  // Essence Elixirs (K.ELIXIR): a hero drinks the elixirs of its own essence and Aether Elixirs for XP at its own level
  const elxName = (e, n) => `${e} Elixir${n === 1 ? '' : 's'}`;
  const elxIc = e => `<svg class="elx-ic" viewBox="0 0 16 16" aria-hidden="true" style="--c:${AFF_COL[e] || '#ccc'}"><path d="M6 1.5h4M6.6 1.5v4L3 12.3A1.5 1.5 0 0 0 4.3 14.5h7.4A1.5 1.5 0 0 0 13 12.3L9.4 5.5v-4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4.6 10h6.8l1 2.4a.8.8 0 0 1-.7 1.1H4.3a.8.8 0 0 1-.7-1.1z" fill="var(--c)"/></svg>`;
  const unitAff = id => { const u = K.ENEMIES[id] || K.BOSSES[id] || C[id]; return u && u.aff ? u.aff : 'Aether'; };
  function elixirHtml(id) {
    const h = S.roster[id], atCap = h.lvl >= K.maxLvl(h.stars, id), gain = K.elixirXp(h.lvl);
    const kinds = [...new Set([C[id].aff, 'Aether'])];
    const row = e => { const n = S.elx[e] || 0; return `<div class="fd elx-row" style="--c:${AFF_COL[e]}">${elxIc(e)}<div><b>${elxName(e, 2)}</b> <span class="tag">×${n}</span><small class="empty-note">${e === 'Aether' ? 'Fits every hero' : `Fits ${e} heroes`}</small></div>
        <div class="row"><button class="btn small primary" data-act="elixir" data-e="${e}" data-n="1" ${!n || atCap ? 'disabled' : ''}>Drink · +${gain.toLocaleString('en-US')} XP</button>${n > 1 ? `<button class="btn small" data-act="elixir" data-e="${e}" data-n="10" ${atCap ? 'disabled' : ''}>×${Math.min(10, n)}</button>` : ''}</div></div>`; };
    return `<div class="fodder elixirs"><h3 style="margin:0 0 4px">Essence Elixirs</h3>
      <p class="empty-note">Each elixir gives ${esc(C[id].short)} the XP of ${K.ELIXIR.wins} campaign wins at its level${atCap ? '. Max level for this star: ascend first.' : '.'} They drop now and then from campaign and Boss Hall wins and every 10th Tower floor.</p>
      <div class="fodder-list">${kinds.map(row).join('')}</div></div>`;
  }
  // ----- Level up: one popup that fills the screen (the hero's Level up tab opens it) -----
  // Left the hero (level now → after, the XP bar with the gain lit, the cap for its stars, Level up); right the Essence
  // Elixirs that fit it (− count + Max) and every possible food as tiles: spare copies (tap again for another copy) and
  // heroes outside every team (not locked, not away). Tapping only selects; Level up feeds the selection first (fixed XP
  // per food) and then drinks the elixirs (each at the level the hero has by then, so after feeding they give more).
  // Auto-fill takes Common and Uncommon food, cheapest first, until the level cap. Rare or better food asks for a
  // second tap on Level up. Copies of the hero itself raise a skill instead (Skill up); spare copies can be broken down
  // into Ascension Stones from here too (Break down, the selected copies).
  const LU = { id: null, copies: {}, heroes: new Set(), elx: {}, arm: false };
  function openLevelUp(id) {
    Object.assign(LU, { id, copies: {}, heroes: new Set(), elx: {}, arm: false });
    luPaint();
  }
  const luFoodCopies = id => Object.keys(S.fodder).filter(f => S.fodder[f] > 0 && C[f] && f !== id).sort((a, b) => C[a].rar - C[b].rar || K.feedXp(a, 1) - K.feedXp(b, 1));
  const luFoodHeroes = id => Object.keys(S.roster).filter(x => x !== id && C[x] && !C[x].pc && !inAnyTeam(x) && !onExp(x) && !S.roster[x].lock).sort((a, b) => C[a].rar - C[b].rar || S.roster[a].lvl - S.roster[b].lvl);
  // XP from the chosen food (it does not depend on the hero's level)
  function luFeedXp(id) {
    let xp = 0;
    for (const f in LU.copies) xp += K.feedXp(f, 1) * LU.copies[f];
    for (const x of LU.heroes) if (S.roster[x]) xp += K.feedXp(x, 1, S.roster[x].lvl);
    return xp;
  }
  // what the hero ends up at: the food first, then the elixirs one by one at the level it has by then
  function luSim(id, elx) {
    const h = S.roster[id], cap = K.maxLvl(h.stars, id);
    let lvl = h.lvl, xp = h.xp, wasted = 0, elxXp = 0; const used = {};
    const add = g => { if (lvl >= cap) { wasted += g; return; } xp += g; while (lvl < cap && xp >= K.xpNeed(lvl)) { xp -= K.xpNeed(lvl); lvl++; } if (lvl >= cap) { wasted += xp; xp = 0; } };
    const feed = luFeedXp(id); add(feed);
    for (const e in (elx || LU.elx)) { used[e] = 0; for (let n = (elx || LU.elx)[e]; n > 0 && lvl < cap; n--) { const g = K.elixirXp(lvl); elxXp += g; add(g); used[e]++; } }
    return { lvl, xp, cap, wasted, feed, elxXp, used };
  }
  // the most elixirs of one kind that still help (up to the cap), with the food chosen now
  function luElxMax(id, e) {
    const have = S.elx[e] || 0; let n = 0;
    while (n < have) { const r = luSim(id, { ...LU.elx, [e]: n }); if (r.lvl >= r.cap) break; n++; }
    return n;
  }
  function luPaint() {
    const id = LU.id, c = C[id], h = id && S.roster[id];
    if (!c || !h) return;
    const r = luSim(id), cap = r.cap, atCap = h.lvl >= cap, need = K.xpNeed(h.lvl);
    const copies = luFoodCopies(id), heroes = luFoodHeroes(id), own = S.fodder[id] || 0;
    const kinds = [...new Set([c.aff, 'Aether'])].filter(e => K.elixirFits(e, id));
    const nSel = Object.values(LU.copies).reduce((a, b) => a + b, 0) + LU.heroes.size, nElx = Object.values(LU.elx).reduce((a, b) => a + b, 0);
    const rare = Object.keys(LU.copies).filter(f => LU.copies[f] && C[f].rar >= 2).reduce((a, f) => a + LU.copies[f], 0) + [...LU.heroes].filter(x => C[x].rar >= 2).length;
    // the XP bar: now (gold) and, on the same level, what the choice adds (bright); a new level shows the bar of the level it reaches
    const pctNow = atCap ? 100 : h.xp / need * 100, pctNew = r.lvl >= cap ? 100 : r.xp / K.xpNeed(r.lvl) * 100;
    const bar = r.lvl > h.lvl ? `<i class="lu-bar up"><b style="width:${pctNew}%"></b></i>` : `<i class="lu-bar"><b style="width:${pctNow}%"></b><em style="left:${pctNow}%;width:${Math.max(0, pctNew - pctNow)}%"></em></i>`;
    const gain = r.feed + r.elxXp;
    const elxRow = e => { const n = S.elx[e] || 0, k = LU.elx[e] || 0; return `<div class="lu-elx" style="--c:${AFF_COL[e]}">${elxIc(e)}<div class="lu-elx-t"><b>${elxName(e, 2)}</b><small>×${n} · +${K.elixirXp(h.lvl).toLocaleString('en-US')} XP each now</small></div>
        <div class="lu-step"><button type="button" class="btn small" data-act="luelx" data-e="${e}" data-d="-1" ${k ? '' : 'disabled'} aria-label="One less">−</button><b>${k}</b><button type="button" class="btn small" data-act="luelx" data-e="${e}" data-d="1" ${k < n && r.lvl < cap ? '' : 'disabled'} aria-label="One more">+</button><button type="button" class="btn small" data-act="luelx" data-e="${e}" data-d="max" ${n && !atCap ? '' : 'disabled'}>Max</button></div></div>`; };
    const tile = (k, f, sub, xp, n, of) => `<button type="button" class="lu-t rar-${C[f].rar} ${n ? 'on' : ''}" style="--rc:var(--r${C[f].rar})" data-act="lutile" data-k="${k}" title="${esc(C[f].name)} · ${K.RARITIES[C[f].rar]} · +${xp.toLocaleString('en-US')} XP">
        ${por(f)}<span class="lu-tn">${esc(C[f].short || C[f].name)}</span><span class="lu-ts">${sub}</span><span class="lu-tx">+${xp >= 1000 ? (xp / 1000).toFixed(xp >= 10000 ? 0 : 1) + 'k' : xp}</span>${n ? `<span class="lu-ck">${of > 1 ? `${n}/${of}` : '✓'}</span>` : ''}</button>`;
    const tiles = copies.map(f => tile('c:' + f, f, `×${S.fodder[f]}`, K.feedXp(f, 1), LU.copies[f] || 0, S.fodder[f]))
      .concat(heroes.map(x => tile('h:' + x, x, `Lv ${S.roster[x].lvl}`, K.feedXp(x, 1, S.roster[x].lvl), LU.heroes.has(x) ? 1 : 0, 1))).join('');
    const skills = own ? `<button type="button" class="btn small violet lu-sk" data-act="luskill" ${h.sk.every(v => v >= K.SKILL_MAX) ? 'disabled title="All skills are at the maximum level"' : ''} title="Use a spare copy of ${esc(c.short)} to raise one of its skills">Skill up · ${own}× copy</button>` : '';
    const brk = Object.keys(LU.copies).filter(f => LU.copies[f]).reduce((a, f) => a + K.breakStones(f) * LU.copies[f], 0);
    const goTxt = atCap ? `Max level for ${h.stars}★` : !nSel && !nElx ? 'Pick food or elixirs' : LU.arm ? `Includes ${rare} Rare or better · tap to feed` : `Level up${r.lvl > h.lvl ? ` to ${r.lvl}` : ''}`;
    // drawn again after every tap: no pop-in animation, and the food list keeps its scroll position
    const m = $('#modal'), again = !m.hidden && !!m.querySelector('.modal-box.lu'), grid = again && m.querySelector('.lu-grid'), keepTop = grid ? grid.scrollTop : 0;
    m.innerHTML = `<div class="modal-box lu ${again ? 'still' : ''}" role="dialog" aria-modal="true" aria-labelledby="lu-h">
      <div class="lu-top"><h2 id="lu-h">Level up · ${esc(c.short)}</h2><button type="button" class="lu-x" data-act="luclose" aria-label="Close">✕</button></div>
      <div class="lu-body">
        <section class="lu-hero rar-${c.rar}" style="--ec:${AFF_COL[c.aff]}">
          <img class="lu-art" src="${SPR.url(id, 2)}" alt="">
          <div class="lu-lv"><span class="lu-stars">${'★'.repeat(h.stars)}</span><b>Lv ${h.lvl}${r.lvl > h.lvl ? ` <span class="lu-arrow">→</span> <span class="lu-new">${r.lvl}</span>` : ''}</b><small>/ ${cap}</small></div>
          ${bar}
          <p class="lu-gain">${gain ? `+${gain.toLocaleString('en-US')} XP` : atCap ? 'Ascend for a higher cap' : `${(need - h.xp).toLocaleString('en-US')} XP to level ${h.lvl + 1}`}${r.wasted > 0 ? ` <span class="warn">· ${r.wasted.toLocaleString('en-US')} past the cap</span>` : ''}</p>
          ${skills}
          <button type="button" class="btn primary lu-go ${LU.arm ? 'armed' : ''}" data-act="lugo" ${atCap || (!nSel && !nElx) ? 'disabled' : ''}>${goTxt}</button>
        </section>
        <section class="lu-main">
          ${kinds.length ? `<div class="lu-elxs">${kinds.map(elxRow).join('')}</div>` : ''}
          <div class="lu-tools"><b>Feed</b><small class="empty-note">${nSel ? `${nSel} selected · +${r.feed.toLocaleString('en-US')} XP` : 'Tap heroes and spare copies to feed them'}</small>
            <button type="button" class="btn small" data-act="luauto" ${atCap || !tiles ? 'disabled' : ''} title="Common and Uncommon food, cheapest first, up to the level cap">Auto-fill</button>
            <button type="button" class="btn small" data-act="luclear" ${nSel || nElx ? '' : 'disabled'}>Clear</button>
            ${brk ? `<button type="button" class="btn small" data-act="lubreak" title="Break the selected spare copies down into Ascension Stones">Break down · +${brk} ${ic('stone')}</button>` : ''}</div>
          <div class="lu-grid">${tiles || '<p class="empty-note">Nothing to feed yet. Summon at the Fate Altar or capture enemies in the campaign; heroes outside your teams can be fed too.</p>'}</div>
        </section>
      </div></div>`;
    m.hidden = false;
    if (keepTop) { const g = m.querySelector('.lu-grid'); if (g) g.scrollTop = keepTop; }
  }
  // the popup's taps (called from the click handler)
  function luAct(act, a) {
    const id = LU.id, h = S.roster[id]; if (!h) return;
    const cap = K.maxLvl(h.stars, id);
    if (act === 'luclose') { $('#modal').hidden = true; render(); return; }
    if (act !== 'lugo') LU.arm = false;
    if (act === 'lutile') {
      const [t, k] = a.dataset.k.split(':');
      if (t === 'c') { const n = LU.copies[k] || 0; LU.copies[k] = n < S.fodder[k] && luSim(id).lvl < cap ? n + 1 : 0; if (!LU.copies[k]) delete LU.copies[k]; }
      else if (LU.heroes.has(k)) LU.heroes.delete(k); else if (luSim(id).lvl < cap) LU.heroes.add(k);
      // the elixirs never go past the cap: trim them when the food got bigger
      for (const e in LU.elx) LU.elx[e] = Math.min(LU.elx[e], luElxMax(id, e));
    } else if (act === 'luelx') {
      const e = a.dataset.e, d = a.dataset.d, n = LU.elx[e] || 0;
      LU.elx[e] = d === 'max' ? luElxMax(id, e) : Math.max(0, Math.min(S.elx[e] || 0, n + +d));
      if (d === '1' && luSim(id).lvl >= cap && luSim(id, { ...LU.elx, [e]: n }).lvl >= cap) LU.elx[e] = n;
    } else if (act === 'luclear') { LU.copies = {}; LU.heroes = new Set(); LU.elx = {}; }
    else if (act === 'luauto') {
      // Common and Uncommon food, cheapest first (spare copies before heroes), until the cap
      const pool = [...luFoodCopies(id).filter(f => C[f].rar <= 1).flatMap(f => Array.from({ length: S.fodder[f] - (LU.copies[f] || 0) }, () => ['c', f])),
        ...luFoodHeroes(id).filter(x => C[x].rar <= 1 && !LU.heroes.has(x)).map(x => ['h', x])];
      for (const [t, k] of pool) { if (luSim(id).lvl >= cap) break; if (t === 'c') LU.copies[k] = (LU.copies[k] || 0) + 1; else LU.heroes.add(k); }
    } else if (act === 'luskill') {
      if (!(S.fodder[id] > 0)) return;
      const i = K.skillUp(h, id); if (i < 0) return;
      S.fodder[id]--; track('feed'); SFX.summon(3); save();
      toast(`${C[id].skills[i].name} is now skill level ${h.sk[i]}/${K.SKILL_MAX}.`);
    } else if (act === 'lubreak') {
      let st = 0; for (const f in LU.copies) { const n = Math.min(LU.copies[f], S.fodder[f] || 0); S.fodder[f] -= n; st += K.breakStones(f) * n; }
      S.stones += st; LU.copies = {}; save(); hud(); toast(`Broken down into ${st} Ascension ${st === 1 ? 'Stone' : 'Stones'}.`);
    } else if (act === 'lugo') {
      const rare = Object.keys(LU.copies).some(f => C[f].rar >= 2) || [...LU.heroes].some(x => C[x].rar >= 2);
      if (rare && !LU.arm) { LU.arm = true; luPaint(); return; }
      LU.arm = false;
      const l0 = h.lvl, before = luFeedXp(id); let fed = 0, gear = 0;
      // the food first (selChamp is the hero being raised: giveXp works on it)
      const keep = selChamp; selChamp = id;
      for (const f in LU.copies) { const n = Math.min(LU.copies[f], S.fodder[f] || 0); for (let i = 0; i < n && h.lvl < cap; i++) { S.fodder[f]--; giveXp(K.feedXp(f, 1)); fed++; } }
      for (const x of LU.heroes) {
        if (!S.roster[x] || h.lvl >= cap || inAnyTeam(x) || S.roster[x].lock) continue;
        const g = K.feedXp(x, 1, S.roster[x].lvl), worn = itemsOf(x); gear += worn.length;
        delete S.roster[x]; worn.forEach(it => (it.owner = null)); if (S.p.avatar === x) S.p.avatar = null;
        giveXp(g); fed++;
      }
      // then the elixirs, each at the level reached by then
      let drank = 0;
      for (const e in LU.elx) for (let n = LU.elx[e]; n > 0 && (S.elx[e] || 0) > 0 && h.lvl < cap; n--) { S.elx[e]--; giveXp(K.elixirXp(h.lvl)); drank++; }
      selChamp = keep;
      if (fed || drank) track('feed', fed + drank);
      LU.copies = {}; LU.heroes = new Set(); LU.elx = {};
      SFX.up(); save(); hud();
      toast(`${C[id].short}: ${h.lvl > l0 ? `level ${l0} → ${h.lvl}` : `+${before.toLocaleString('en-US')} XP`}${fed ? ` · ${fed} fed` : ''}${drank ? ` · ${drank} ${drank === 1 ? 'elixir' : 'elixirs'}` : ''}${gear ? ' · their gear went back to your Vault' : ''}.`);
      render();
    }
    luPaint();
  }
  function fodderHtml(id) {
    const h = S.roster[id], cap = K.maxLvl(h.stars, id), atCap = h.lvl >= cap;
    const skillsMaxed = h.sk.every(v => v >= K.SKILL_MAX);
    const copies = Object.keys(S.fodder).filter(f => S.fodder[f] > 0 && C[f]).sort((a, b) => (b === id) - (a === id) || C[a].rar - C[b].rar);
    const others = Object.keys(S.roster).filter(x => x !== id && C[x] && !inAnyTeam(x) && !onExp(x) && !S.roster[x].lock).sort((a, b) => C[a].rar - C[b].rar || S.roster[a].lvl - S.roster[b].lvl);
    const release = C[id].captured && !inAnyTeam(id) && !onExp(id) ? `<button class="btn small" data-act="release" data-id="${id}">Turn ${esc(C[id].short)} into a spare copy</button>` : '';
    const xpBtn = (xp, attrs) => `<button class="btn small primary" ${attrs} ${atCap ? 'disabled title="Max level for this star"' : ''}>Feed · +${xp.toLocaleString('en-US')} XP</button>`;
    const copyRow = f => `<div class="fd rar-${C[f].rar} ${f === id ? 'self' : ''}">${por(f)}<div><b>${esc(C[f].name)}</b> <span class="tag">×${S.fodder[f]}</span><small class="empty-note">${K.RARITIES[C[f].rar]} · spare copy</small></div>
        <div class="row">${f === id
          ? `<button class="btn small violet" data-act="skillup" data-f="${f}" ${skillsMaxed ? 'disabled title="All skills are at the maximum level"' : ''}>Skill up · +1 skill level</button>`
          : xpBtn(K.feedXp(f, h.lvl), `data-act="feed" data-f="${f}"`)}<button class="btn small" data-act="breakdown" data-f="${f}">Break down · +${K.breakStones(f)} ${ic('stone')}</button></div></div>`;
    const heroRow = x => `<div class="fd rar-${C[x].rar}">${por(x)}<div><b>${esc(C[x].short)}</b> <span class="tag">Lv ${S.roster[x].lvl}</span><small class="empty-note">${K.RARITIES[C[x].rar]} · ${roleStr(C[x])}</small></div>
        <div class="row">${xpBtn(K.feedXp(x, h.lvl, S.roster[x].lvl), `data-act="feedhero" data-id="${x}"`)}</div></div>`;
    return `<div class="fodder"><div class="section-head" style="margin-bottom:6px"><h3 style="margin:0">Feed</h3>${release}</div>
      <p class="empty-note">Feed spare copies or other heroes to give ${esc(C[id].short)} XP. Locked heroes are never offered. A copy of ${esc(C[id].short)} itself raises one skill level instead (max ${K.SKILL_MAX} per skill). Duplicates from the Fate Altar and captured enemies become spare copies.</p>
      ${copies.length ? `<h4 class="fd-h">Spare copies</h4><div class="fodder-list">${copies.map(copyRow).join('')}</div>` : ''}
      ${others.length ? `<h4 class="fd-h">Heroes outside your team</h4><div class="fodder-list">${others.map(heroRow).join('')}</div>` : ''}
      ${!copies.length && !others.length ? '<p class="empty-note">Nothing to feed yet. Summon at the Fate Altar or capture enemies in the campaign.</p>' : ''}</div>`;
  }
  // a small popup asking for a team name (Create a team / Rename); onOk(name) with the trimmed name
  let nameOk = null;
  // every player picks a name of their own once (the default "Adventurer" is not one): asked on Home after the first
  // battle, and the popup has no way out but saving a name (the first name is free)
  // every player picks a name of their own: one still called "Adventurer" (in any spelling) gets the name box on every
  // screen after the first battle (render), and nobody can take "Adventurer" back later
  const isAdv = n => /^\s*adventurer\s*$/i.test(n || 'Adventurer');
  const needName = () => !noHero() && !firstSteps() && isAdv(S.p.name);
  function showNameBox() {
    const m = $('#modal'); if (!m.hidden || !needName()) return;
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="pn-t"><h2 id="pn-t">Choose your player name</h2>
      <form data-form="pname" class="nb-form"><label class="empty-note" for="pn-in">Other players see it in the arena, on the leaderboards, in your guild and in their friend lists. 2 to 20 characters; changing it later costs ${RENAME_COST.toLocaleString('en-US')} Sigils.</label>
      <input id="pn-in" name="pname" maxlength="20" required autocomplete="nickname" placeholder="Your name" value="${S.hero && S.hero.name && S.hero.name !== 'Adventurer' ? esc(S.hero.name) : ''}">
      <div class="modal-actions"><button class="btn primary" type="submit">Save name</button></div></form></div>`;
    m.hidden = false; m.querySelector('input').focus();
  }
  function nameBox(title, value, ok, onOk) {
    nameOk = onOk;
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="nb-t"><h2 id="nb-t">${title}</h2>
      <form data-form="tmname" class="nb-form"><label class="empty-note" for="nb-in">Team name (up to 20 characters)</label><input id="nb-in" name="tname" maxlength="20" required value="${esc(value)}" autocomplete="off">
      <div class="modal-actions"><button class="btn primary" type="submit">${ok}</button><button class="btn" type="button" data-act="modal" data-go="close">Cancel</button></div></form></div>`;
    m.hidden = false; const i = m.querySelector('input'); i.focus(); i.select();
  }
  // "Are you sure?" before feeding away a Rare or better hero
  // skip: a key for questions the player may silence until the game is opened again (a tick box, kept in memory only)
  let confirmYes = null, confirmSkip = null;
  const skipAsk = {};
  function confirmBox(title, text, yes, onYes, skip) {
    if (skip && skipAsk[skip]) { onYes(); return; }
    confirmYes = onYes; confirmSkip = skip || null;
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="cf-q"><h2 id="cf-q">${title}</h2><p class="lede">${text}</p>
      ${skip ? '<label class="cf-skip"><input type="checkbox" id="cf-skip"> Don\'t ask again until next login</label>' : ''}
      <div class="modal-actions"><button class="btn primary" data-act="cfyes">${yes}</button><button class="btn" data-act="cfno">Cancel</button></div></div>`;
    m.hidden = false; m.querySelector('.btn').focus();
  }
  // Item Ascension: what the next orange star costs and gives, and its button (worn gear needs a 5★ hero)
  function ascHtml(it) {
    const ac = K.ascCost(it), n = it.asc || 0;
    if (!ac) return n >= K.MAX_ASC ? '<p class="gp-ascp">Fully ascended: <span class="asc-st">★★★</span> · +30% to all its stats.</p>' : '';
    const t = ac.greater ? 'greater' : 'ancient', need = ac.greater || ac.ancient;
    const who = it.owner && S.roster[it.owner] && S.roster[it.owner].stars < K.ASC_STARS ? ` <b class="warn">${esc(C[it.owner].short)} needs ${K.ASC_STARS}★ to wear ascended gear.</b>` : '';
    return `<p class="gp-ascp">Ascend to <span class="asc-st">${'★'.repeat(n + 1)}</span>: ${stoneIc(t)} ${need} ${stoneName(t, need)} (you have ${stoneN(t)}) + ${sigils(ac.silver)} · +${(n + 1) * 10}% to all its stats. Always succeeds; ascended gear is worn by heroes of ${K.ASC_STARS}★ or more.${who}</p>`;
  }
  function ascBtn(it, pop) {
    const ac = K.ascCost(it); if (!ac) return '';
    const t = ac.greater ? 'greater' : 'ancient', ok = stoneN(t) >= (ac.greater || ac.ancient) && S.silver >= ac.silver && !(it.owner && !wearOk(it.owner, { asc: 1 }));
    return `<button class="btn violet" data-act="ascend" data-item="${it.id}" ${pop ? 'data-pop="1"' : ''} ${ok ? '' : 'disabled'}>Ascend <span class="asc-st">★</span></button>`;
  }
  // gives XP to the selected hero; returns the levels gained
  function giveXp(gain) {
    const h = S.roster[selChamp], cap = K.maxLvl(h.stars, selChamp), l0 = h.lvl;
    h.xp += gain;
    while (h.lvl < cap && h.xp >= K.xpNeed(h.lvl)) { h.xp -= K.xpNeed(h.lvl); h.lvl++; }
    if (h.lvl >= cap) h.xp = 0;
    return h.lvl - l0;
  }

  // ----- Create your hero (replaces the old starter choice) -----
  // One of six classes (engine PC_CLASSES; always Aether), the gender (only the look) and a name. The six classes are
  // cards (one row on wide screens, a grid on phones); tapping one shows its kit below. New players and older saves without a hero see this
  // first; an older save's hero starts at the level of its best hero, so it is useful straight away.
  const STARTER_BG = 4; // chapter background: the brick-and-lava dungeon hall
  let pcSel = { g: 'm', cls: null, name: '' };
  const pcName = () => (pcSel.name || '').replace(/[<>&"]/g, '').trim().slice(0, 16);
  const pcReady = () => !!(pcSel.cls && pcName());
  // the look of the six classes: a colour each (card glow, the details panel's light) and a small icon
  const PC_COL = { tank: '#6f9bd1', warrior: '#e0542e', mage: '#9b62ff', ranger: '#4fbf72', rogue: '#c23a55', healer: '#f2d27a' };
  const PC_IC = {
    tank: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
    warrior: '<path d="M5 19L17 7l2-3-3 2L4 18"/><path d="M8 14l2 2M4 20l2-2"/>',
    mage: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v13"/>',
    ranger: '<path d="M6 4c7 2 12 7 14 14"/><path d="M6 4L20 18"/><path d="M4 20l9-9M4 20h4M4 20v-4"/>',
    rogue: '<path d="M14 4l6 6-9 9-3 1 1-3z"/><path d="M8 16l-4 4M12 8l4 4"/>',
    healer: '<circle cx="12" cy="7" r="3.2"/><path d="M12 10.2V21M7 14h10"/>',
  };
  const STAT_IC = {
    hp: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    atk: '<path d="M5 19L17 7l2-3-3 2L4 18"/><path d="M8 14l2 2"/>',
    def: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
    spd: '<path d="M7 4h4l-1 7h5l-1 9H8l1-6H5z"/>',
  };
  const svgI = (p, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  // the dice next to the name: a fitting fantasy name for the chosen gender
  const PC_NAMES = { m: ['Aldric', 'Bran', 'Cassian', 'Darian', 'Eamon', 'Fenris', 'Garrick', 'Halvard', 'Ivor', 'Kael', 'Lucan', 'Orrin', 'Roderic', 'Soren', 'Theron', 'Varek'],
    f: ['Aria', 'Brynn', 'Celeste', 'Elara', 'Freya', 'Isolde', 'Kira', 'Lyra', 'Maeve', 'Nyra', 'Rowan', 'Seren', 'Talia', 'Vera', 'Wren', 'Ysolde'] };
  function createHtml() {
    const ids = Object.keys(K.PC_CLASSES).map(k => `pc_${k}_${pcSel.g}`);
    const st = id => K.heroStats(id, { lvl: 1, xp: 0, stars: K.pcStars(1), sk: [0, 0, 0] }, []);
    const top = { hp: 0, atk: 0, def: 0, spd: 0 };
    for (const id of ids) { const s = st(id); for (const k in top) top[k] = Math.max(top[k], s[k]); }
    const bar = (id, k) => { const v = st(id)[k]; return `<div class="sbar">${svgI(STAT_IC[k], 'pcx-si')}<span>${K.STAT_NAMES[k]}</span><i><b style="width:${Math.round(v / top[k] * 100)}%"></b></i><em>${v}</em></div>`; };
    const PC_TAG = { tank: 'Front line · taunts and shields', warrior: 'Heavy hits · cleaves groups', mage: 'Spells on every enemy', ranger: 'Arrows and crits from afar', rogue: 'Stealth and executes', healer: 'Keeps the team alive' };
    // a class card: its painted art (cards.js CLASS_CARD, per class and gender) or else the hero's portrait, its icon and name at the bottom
    const cards = ids.map(id => { const k = C[id].pcClass; return `<button type="button" class="pc-card pcx-card ${k === pcSel.cls ? 'sel' : ''}" style="--cc:${PC_COL[k]}" data-act="pcclass" data-k="${k}" aria-pressed="${k === pcSel.cls}" title="${esc(PC_TAG[k])}">${typeof CLASS_CARD !== 'undefined' && CLASS_CARD[`${k}_${pcSel.g}`] ? `<img class="pcx-art full" src="${CLASS_CARD[`${k}_${pcSel.g}`]}" alt="">` : `<img class="pcx-art" src="${SPR.url(id)}" alt="">`}<span class="pcx-cn">${svgI(PC_IC[k], 'pcx-ci')}<b>${K.PC_CLASSES[k].name}</b></span></button>`; }).join('');
    const p = pcSel.cls && K.PC_CLASSES[pcSel.cls], id = p && `pc_${pcSel.cls}_${pcSel.g}`, c = id && C[id];
    // the details: the hero large on the right, fading into the panel, lit in its class's colour; its stats and skills with icons
    const skRow = (tag, name, desc, s) => `<li><span class="pcx-sic sk-${s ? skKind(s) : 'pass'}">${svgI(s ? SK_GLYPH[skGlyph(s)] : SK_GLYPH.star)}</span><div><b><small>${tag} ·</small> ${esc(name)}</b><p>${esc(desc)}</p></div></li>`;
    const info = p ? `<div class="st-card pcx-info" style="--cc:${PC_COL[pcSel.cls]}">${typeof CLASS_PANEL !== 'undefined' && CLASS_PANEL[`${pcSel.cls}_${pcSel.g}`] ? `<img class="pcx-big paint" src="${CLASS_PANEL[`${pcSel.cls}_${pcSel.g}`]}" alt="">` : `<img class="pcx-big" src="${SPR.url(id, 2)}" alt="">`}
        <div class="pcx-body"><div class="starter-top">${por(id)}<div><h3 id="pc-h">${esc(pcName() || p.name)}</h3><div class="tags">${affChip('Aether')} Aether · ${roleStr(c)}</div></div></div>
        <p class="st-pitch">${esc(p.pitch)}</p>
        <div class="sbars">${['hp', 'atk', 'def', 'spd'].map(k => bar(id, k)).join('')}</div>
        <ul class="pcx-sk">${skRow('Passive', p.passiveName, p.passiveDesc, null)}${p.skills.map((s, i) => skRow(SKILL_TAG[i], s.name, s.desc, s)).join('')}</ul></div>
      </div>` : `<div class="st-card pcx-info pcx-empty"><img class="pcx-crest" src="${LOGO_URL}" alt=""><p>Tap a class to see what your hero can do.</p></div>`;
    const cl = window.FFH_CLOUD && window.FFH_CLOUD.info();
    const signin = cl && cl.enabled && !cl.email && !Object.keys(S.roster).length ? `<div class="prof-acc starter-acc"><p class="empty-note">Played before? Sign in to load your progress instead of starting over.</p><div class="row"><button class="btn small" data-act="account">Sign in</button></div></div>` : '';
    const g = (k, sym, label) => `<button type="button" class="btn ${pcSel.g === k ? 'primary' : ''}" data-act="pcgender" data-g="${k}" aria-pressed="${pcSel.g === k}"><span class="pcx-gs" aria-hidden="true">${sym}</span>${label}</button>`;
    // (.pc-wrap: on a phone on its side the choices on the left and the class's details on the right, .pc-left; elsewhere
    // one column with the details between the gender and the name)
    return `<div class="pc-wrap pcx lfit"><div class="pc-left"><h2 class="st-title pcx-title">Create your hero</h2>
      <p class="lede pc-lede">Your hero is forged by fate: <b>Aether</b>, never strong or weak against anyone, and always at your side in every fight. Later you can change its class with a Fate Changing Stone from the Market.</p>
      <div class="pc-row"><span class="pcx-step">1. Choose a class</span></div>
      <div class="pc-cards">${cards}</div>
      <div class="pc-row"><span class="pcx-step">2. Your hero is</span><div class="seg pc-g">${g('m', '♂', 'Male')}${g('f', '♀', 'Female')}</div></div>
      <div class="pc-row pc-namerow"><label class="pcx-step" for="pc-name">3. Name your hero</label><div class="pcx-name"><input id="pc-name" maxlength="16" autocomplete="off" placeholder="Your hero's name" value="${esc(pcSel.name)}"><button type="button" class="pcx-dice" data-act="pcdice" title="A random name" aria-label="A random name"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8.5" cy="15.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/></svg></button></div></div>
      <div class="st-go"><button class="btn primary pcx-go" id="pc-go" data-act="pccreate" ${pcReady() ? '' : 'disabled'}>${pcReady() ? `Create ${esc(pcName())}` : 'Create your hero'}</button></div>${signin}</div><div class="st-info">${info}</div></div>`;
  }
  // the name box updates the Create button without a re-render (keeps the focus)
  document.addEventListener('input', e => {
    if (e.target.id !== 'pc-name') return;
    pcSel.name = e.target.value; const b = document.getElementById('pc-go');
    if (b) { b.disabled = !pcReady(); b.textContent = pcReady() ? `Create ${pcName()}` : 'Create your hero'; }
    const h = document.getElementById('pc-h'); if (h && pcSel.cls) h.textContent = pcName() || K.PC_CLASSES[pcSel.cls].name; // the card shows the hero by its own name
  });
  function confirmHero() {
    const p = K.PC_CLASSES[pcSel.cls], m = $('#modal');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="pc-q"><h2 id="pc-q">Are you sure?</h2>
      <p class="lede">Create <b>${esc(pcName())}</b>, a ${pcSel.g === 'f' ? 'female' : 'male'} <b>${esc(p.name)}</b>? You can change it later with a Fate Changing Stone from the Market.</p>
      <div class="modal-actions"><button class="btn primary" data-act="pcok">Yes, create ${esc(pcName())}</button><button class="btn" data-act="pccancel">Cancel</button></div></div>`;
    m.hidden = false; m.querySelector('.btn').focus();
  }
  function createHero() {
    if (!pcReady()) return;
    const k = pcSel.cls, g = pcSel.g, name = pcName(), id = `pc_${k}_${g}`;
    const others = Object.keys(S.roster).filter(x => C[x] && !C[x].pc), old = others.length > 0;
    const lvl = Math.min(60, Math.max(1, ...others.map(x => S.roster[x].lvl)));
    S.roster[id] = { lvl, xp: 0, stars: K.pcStars(lvl), sk: K.pcSkills(id, lvl) };
    S.hero = { id, name, g, cls: k };
    if (!Array.isArray(S.teams) || !S.teams.length) { S.teams = [{ name: 'Team 1', ids: [] }]; S.tsel = 0; S.modeTeam = {}; }
    if (!S.starter) S.starter = id;
    delete S.needStarter;
    linkTeams(S); syncHero(S);
    pcSel = { g: 'm', cls: null, name: '' };
    tab = 'home'; save(); render();
    const call = $('.tut-call'); if (call) call.scrollIntoView({ block: 'center', behavior: 'smooth' });
    toast(old ? `${name} joins your teams and will fight at your side in every battle.` : `${name} is ready. Tap the Campaign to begin your adventure.`, false, 4500);
  }

  // ----- player profile -----
  let editName = false;
  // ================= ARENA =================
  // Everything that counts is decided by the `arena` Edge Function (supabase/functions/arena): this screen shows its
  // state, sends your team and replays the fights it played. Leaderboards come from the `leaderboard` database function.
  const AR = { st: null, busy: false, err: '', lb: 'arena', board: null, boardErr: '', loadedAt: 0, who: null };
  const cloud = () => window.FFH_CLOUD;
  // team snapshot in the shape the server checks (K.checkTeam)
  const snapTeam = ids => ids.filter(id => S.roster[id] && C[id]).map(id => { const h = S.roster[id]; return { id, lvl: h.lvl, stars: h.stars, sk: C[id].skills.map((_, i) => Math.min(K.SKILL_MAX, (h.sk || [])[i] || 0)), items: itemsOf(id).map(K.snapItem) }; });
  async function arenaCall(action, extra) {
    AR.busy = true; if (tab === 'arena' && !B) render();
    let r;
    try { r = await cloud().fn('arena', { action, name: S.p.name, avatar: avatarId(), team: snapTeam(teamIds('arena')), ...extra }); }
    catch (e) { r = { error: 'No connection to the arena. Check your internet and try again.' }; }
    AR.busy = false;
    if (r.state) { AR.st = r.state; AR.loadedAt = Date.now(); defSeen(r.state); }
    AR.err = r.error || '';
    if (tab === 'arena' && !B) render();
    return r;
  }
  // The arena defense follows your heroes. The server keeps a snapshot of the defending heroes (levels, stars, skills,
  // gear), so when one of them levels up, ascends, learns a skill or changes gear, the same heroes are sent again: quietly,
  // 15 s after the save that changed them (never during a battle), and only when the snapshot really differs. Which
  // heroes defend and the last snapshot sent are kept per account in localStorage (ffh-ardef:<email>), not in the save.
  const defKey = () => { const cl = cloud(); return cl && cl.signedIn && cl.signedIn() ? 'ffh-ardef:' + cl.info().email : null; };
  const defGet = () => { try { return JSON.parse(localStorage.getItem(defKey()) || 'null'); } catch (e) { return null; } };
  const defPut = v => { try { localStorage.setItem(defKey(), JSON.stringify(v)); } catch (e) { /* ignore */ } };
  // the heroes the server last showed as the defense (a Fateborn that changed class keeps its place)
  const defIds = d => (d.ids || []).map(id => (S.roster[id] ? id : K.PC_IDS.includes(id) && S.hero ? S.hero.id : null)).filter(id => id && S.roster[id] && C[id]);
  function defSeen(st) {
    if (!defKey()) return;
    const d = defGet() || {}, ids = st.defense ? st.defense.map(h => h.id) : [];
    if (!d.ids || JSON.stringify(ids) !== JSON.stringify(d.ids)) defPut({ ids, sig: null });
  }
  let defT = 0, defBusy = false;
  function defSoon() { if (!defKey()) return; clearTimeout(defT); defT = setTimeout(defSync, 15000); }
  async function defSync() {
    const d = defKey() && defGet();
    if (!d || defBusy || !unlocked('arena')) return;
    if (B) { defSoon(); return; }
    const ids = defIds(d); if (!ids.length) return;
    const team = snapTeam(ids), sig = JSON.stringify(team);
    if (sig === d.sig) return;
    defBusy = true; let r = null;
    try { r = await cloud().fn('arena', { action: 'defense', name: S.p.name, avatar: avatarId(), team }); } catch (e) { /* no connection: the next save tries again */ }
    defBusy = false;
    if (!r) return;
    // remembered also after a refusal, so a team the server will not take is not sent again and again
    defPut({ ids: r.state && r.state.defense ? r.state.defense.map(h => h.id) : ids, sig });
    if (r.state) { AR.st = r.state; AR.loadedAt = Date.now(); if (tab === 'arena' && !B) render(); }
  }
  async function loadBoard(kind) {
    AR.lb = kind; AR.board = null; AR.boardErr = '';
    if (tab === 'arena' && !B) render();
    let rows = null;
    try { rows = await cloud().rpc('leaderboard', { kind }); } catch (e) { AR.boardErr = 'The leaderboard could not be loaded.'; }
    if (AR.lb !== kind) return;
    AR.board = named(rows || []);
    if (tab === 'arena' && !B) render();
  }
  function arenaEnter() {
    const cl = cloud();
    if (!unlocked('arena') || !cl || !cl.signedIn()) return;
    const who = cl.info().email;
    if (AR.who !== who) Object.assign(AR, { who, st: null, board: null, err: '' });
    if (!AR.busy && (!AR.st || Date.now() - AR.loadedAt > 60000)) arenaCall('state');
    if (!AR.board) loadBoard(AR.lb);
  }
  const miniTeam = team => `<div class="ar-team">${team.filter(h => C[h.id]).map(h => `<span class="ar-h rar-${C[h.id].rar}" title="${esc(C[h.id].name)} · level ${h.lvl}">${por(h.id)}<i>${h.lvl}</i></span>`).join('')}</div>`;
  const tierReward = t => [...(t.silver ? [sigils(t.silver)] : []), ...Object.entries(t.fs).map(([k, n]) => `${shardIc(k)} ${n}× ${esc(K.SHARD[k].name)}`), ...Object.entries(t.st || {}).map(([k, n]) => `${stoneIc(k)} ${n}× ${stoneName(k, 1)}`)].join(' · ');
  function campaignText(r) {
    const d = r.detail || {}, dcl = Array.isArray(d.dcl) ? d.dcl : [];
    for (let i = dcl.length - 1; i >= 1; i--) if (dcl[i] >= 0 && K.DIFFS[i] && K.STAGES[dcl[i]]) return `${K.DIFFS[i].name} · ${stageName(dcl[i])}`;
    return K.STAGES[d.cleared] ? `Easy · ${stageName(d.cleared)}` : `${r.score} stages`;
  }
  // the arena bots on the leaderboard (marked, without a rank, so the players' ranks stay those the weekly rewards use):
  // the same names as the server's bots, a rating, record and hero picked per UTC week, so the list changes now and then
  function boardBots() {
    const wk = Math.floor(Date.now() / 6048e5), pool = K.CHAMP_ORDER.filter(id => C[id] && C[id].rar >= 2);
    const h = (i, s) => { let x = (Math.imul(wk + 1, 2654435761) ^ Math.imul(i + 1, 40503) ^ Math.imul(s + 1, 2246822507)) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
    return K.BOT_NAMES.map((name, i) => {
      const score = Math.round(950 + h(i, 1) * 450), n = 8 + Math.floor(h(i, 2) * 40), wins = Math.round(n * Math.min(0.8, 0.3 + (score - 950) / 900));
      return { bot: true, name, avatar: pool[Math.floor(h(i, 3) * pool.length)], score, detail: { wins, losses: n - wins } };
    });
  }
  function boardHtml() {
    const kinds = [['arena', 'Arena'], ['campaign', 'Campaign'], ['bosses', 'Boss Hall']];
    const seg = `<div class="seg" role="group" aria-label="Leaderboard">${kinds.map(([k, l]) => `<button type="button" data-act="arlb" data-kind="${k}" aria-pressed="${AR.lb === k}">${l}</button>`).join('')}</div>`;
    const fmt = r => AR.lb === 'arena' ? `${r.score} rating · ${r.detail.wins} W / ${r.detail.losses} L` : AR.lb === 'campaign' ? campaignText(r) : `${r.score} boss levels${r.detail.maxed ? ` · ${r.detail.maxed} maxed` : ''}`;
    const list = AR.board && AR.lb === 'arena' ? AR.board.concat(boardBots()).sort((a, b) => b.score - a.score) : AR.board;
    const rows = list ? list.map(r => `<li class="${r.me ? 'me' : ''}${r.bot ? ' bot' : ''}"><span class="lb-rank">${r.bot ? '–' : r.rank}</span>${r.avatar && C[r.avatar] ? por(r.avatar) : '<span class="lb-noav"></span>'}<span class="lb-name"><b>${esc(r.name)}</b>${r.bot ? '<small class="empty-note">Arena bot</small>' : r.lvl ? `<small class="empty-note">Player level ${r.lvl}</small>` : ''}</span><span class="lb-score">${fmt(r)}</span></li>`).join('') : '';
    const note = AR.lb === 'arena' ? 'Ratings from fights the server played. Arena bots are the opponents the arena fills in: they have no rank and win no rewards.' : 'From cloud saves of signed-in players.';
    return `<section class="ar-board"><div class="section-head"><h3>Leaderboard</h3>${seg}</div><p class="empty-note">${note}</p>
      ${AR.boardErr ? `<p class="ar-err">${esc(AR.boardErr)}</p>` : !AR.board ? '<p class="empty-note">Loading…</p>' : rows ? `<ol class="lb">${rows}</ol>` : '<p class="empty-note">Nobody here yet. Be the first!</p>'}</section>`;
  }
  function arenaHtml() {
    const lede = 'Fight the defense teams of other players. You choose every move (or switch on auto); the server replays your fight to check it, so the ranking is fair. A fight you leave unfinished counts as a loss. Every Monday you get a reward for your rating.';
    if (!unlocked('arena')) return lockedHtml('arena', lede);
    const head = `<div class="section-head"><div><h2>Arena</h2><p class="lede">${lede}</p></div></div>`;
    const cl = cloud();
    if (!cl || !cl.enabled) return head + '<p class="empty-note">The arena needs the online version of the game.</p>';
    if (!cl.signedIn()) return head + `<div class="lockbox">${LOCK_SVG}<div><h3>Sign in to enter the arena</h3><p class="empty-note">Arena fights and rankings are kept on the server, so you need an account.</p><button class="btn primary" data-act="account">Sign in or create an account</button></div></div>`;
    const st = AR.st;
    if (!st) return head + (AR.err ? `<p class="ar-err">${esc(AR.err)}</p><button class="btn" data-act="arstate">Try again</button>` : '<p class="empty-note">Entering the arena…</p>') + boardHtml();
    const tier = K.arenaTier(st.rating), next = K.ARENA_TIERS[K.ARENA_TIERS.indexOf(tier) + 1];
    const secs = Math.max(0, st.nextToken - Math.round((Date.now() - AR.loadedAt) / 1000));
    const me = `<div class="ar-me tier-${tier.name.toLowerCase()}">
        <div class="ar-rating"><span class="tag">${tier.name}</span><b>${st.rating}</b><small class="empty-note">rating</small></div>
        <dl class="stats"><dt>Attacks</dt><dd>${st.wins} won · ${st.losses} lost</dd><dt>Defense</dt><dd>${st.defWins} won · ${st.defLosses} lost</dd><dt>Tokens</dt><dd>${st.tokens} / ${K.ARENA_TOKENS}${st.tokens >= K.ARENA_TOKENS ? '' : ` · next in ${Math.max(1, Math.ceil(secs / 60))} min`}</dd></dl>
        <p class="empty-note">Weekly reward (${tier.name}): ${tierReward(tier)}. ${st.weekFights ? `You fought ${st.weekFights}× this week.` : 'Fight at least once this week to earn it.'}${next ? ` ${next.name} from ${next.min} rating.` : ''}</p>
        <div class="ar-top5"><span class="tag">Top 5 of the week (extra)</span><ol>${K.ARENA_RANK_REWARDS.map((t, i) => `<li><b>#${i + 1}</b> ${tierReward(t)}</li>`).join('')}</ol><small class="empty-note">Ranked by rating among everyone who fought that week.</small></div>
        ${st.rewards ? `<button class="btn primary" data-act="arclaim">Claim ${st.rewards} weekly ${st.rewards === 1 ? 'reward' : 'rewards'}</button>` : ''}</div>`;
    const def = `<div class="ar-def"><h3>Your defense</h3>${st.defense ? miniTeam(st.defense) + `<small class="empty-note">Power ${st.defensePower.toLocaleString('en-US')} · levels, skills and gear stay up to date by themselves</small>` : '<p class="empty-note">No defense team yet, so other players cannot find you. Your first attack team becomes your defense.</p>'}
        <div class="row"><button class="btn small" data-act="ardef" ${AR.busy ? 'disabled' : ''}>Defend with my current team</button><button class="btn small" data-act="editteam" data-mode="arena">Edit arena team</button></div></div>`;
    const offers = st.offers.map((o, i) => `<div class="ar-opp">${o.avatar && C[o.avatar] ? por(o.avatar) : '<span class="lb-noav"></span>'}<div class="ar-opp-main"><b>${esc(o.name)}</b>${o.kind === 'bot' ? ' <span class="tag">Bot</span>' : ''}<small class="empty-note">Rating ${o.rating} · power ${o.power.toLocaleString('en-US')}</small>${miniTeam(o.team)}</div><button class="btn primary small" data-act="arfight" data-n="${i}" ${AR.busy || st.tokens < 1 ? 'disabled' : ''}>Fight</button></div>`).join('');
    const opps = `<section class="ar-opps"><div class="section-head"><h3>Opponents</h3><button class="btn small" data-act="arrefresh" ${AR.busy ? 'disabled' : ''}>New opponents</button></div>
      <p class="empty-note">You attack with your arena team (power ${K.teamPower(snapTeam(teamIds('arena'))).toLocaleString('en-US')}). A fight costs 1 token; you get a new token every hour.</p>${offers}</section>`;
    // on a phone on its side the arena is four tabs (AR.tab, shell.html .ar-wrap[data-t]): Battle (rating and opponents),
    // Defense, Rewards (the weekly ones) and Rankings; a bigger screen shows everything under each other
    const t = AR.tab || 'fight', tabs = `<div class="ar-tabs" role="tablist" aria-label="Arena">${[['fight', 'Battle'], ['def', 'Defense'], ['week', 'Rewards'], ['board', 'Rankings']].map(([k, l]) => `<button type="button" role="tab" data-act="artab" data-t="${k}" aria-selected="${k === t}">${l}${k === 'week' && st.rewards ? '<span class="dot"></span>' : ''}</button>`).join('')}</div>`;
    return head + (AR.err ? `<p class="ar-err">${esc(AR.err)}</p>` : '') + `<div class="ar-wrap lfit" data-t="${t}">${tabs}<div class="arena">${me}${def}</div>${opps}${boardHtml()}</div>`;
  }
  function startArena(f) {
    runBattle({ type: 'arena', att: f.att, def: f.def, seed: f.seed, win: f.win, fight: f, area: f.seed % 5, bg: chapterBg(f.seed % K.CHAPTERS.length), title: `Arena · vs ${f.opponent.name}` });
  }
  function finishArena(cfg) {
    const f = cfg.fight, m = $('#modal'), tier = K.arenaTier(f.rating), was = K.arenaTier(f.before);
    AR.board = null;
    m.innerHTML = `<div class="modal-box result ${f.win ? '' : 'lose'}" role="dialog" aria-modal="true"><h2>${f.win ? 'Victory' : 'Defeated'}</h2><p class="tag">${esc(cfg.title)} · rating ${f.opponent.rating}</p>
      <ul class="rewards"><li><span class="aff" style="--c:var(--gold)">R</span><span>Rating ${f.before} → <b>${f.rating}</b> (${f.delta >= 0 ? '+' : ''}${f.delta})</span></li>
        ${tier !== was ? `<li class="loot lvup"><span class="aff" style="--c:var(--gold)">★</span><span><b>${tier.name}</b> tier${f.rating > f.before ? ' reached!' : ''}</span></li>` : ''}
        ${f.error ? `<li><span class="aff" style="--c:var(--bad)">!</span><span>${esc(f.error)}</span></li>` : ''}
        <li><span class="aff" style="--c:var(--info)">T</span><span>Tokens left: ${AR.st ? AR.st.tokens : '?'} / ${K.ARENA_TOKENS}</span></li></ul>
      <div class="modal-actions"><button class="btn primary" data-act="modal" data-go="arena">Back to the arena</button></div></div>`;
    m.hidden = false;
    m.querySelector('.btn').focus();
  }
  async function claimArena() {
    let rows;
    try { rows = await cloud().rpc('claim_arena_rewards'); } catch (e) { toast('Could not claim the rewards. Try again.', true); return; }
    let silver = 0; const fs = {}, st = {};
    const add = t => { silver += t.silver; for (const k in t.fs) fs[k] = (fs[k] || 0) + t.fs[k]; for (const k in t.st || {}) st[k] = (st[k] || 0) + t.st[k]; };
    let best = 0;
    for (const r of rows || []) { add(K.arenaTier(r.rating)); const top = K.ARENA_RANK_REWARDS[r.rank - 1]; if (top) { add(top); best = best ? Math.min(best, r.rank) : r.rank; } }
    S.silver += silver; for (const k in fs) S.fs[k] = (S.fs[k] || 0) + fs[k]; addStones(st);
    if (AR.st) AR.st.rewards = 0;
    save(); render(); SFX.up();
    const got = [...(silver ? [`+${silver.toLocaleString('en-US')} Sigils`] : []), ...Object.keys(fs).map(k => `+${fs[k]} ${K.SHARD[k].name}`), ...Object.keys(st).map(k => `+${st[k]} ${stoneName(k, st[k])}`)].join(' · ');
    toast(got ? `${best ? `Top 5 of the week (#${best})! ` : ''}Weekly arena rewards: ${got}.` : 'No rewards to claim.', false, 5000);
  }
  // ================= GUILDS =================
  // Guilds live in Supabase (0006_guilds.sql): name, tag, info (the guildmaster writes it, max 250 characters), up to
  // 25 members with roles. The guild boss is played by the server (Edge Function `arena`, action 'gboss') and
  // replayed here like an arena fight; the weekly Guild Chest arrives as mail. The Guild Shop is not built yet.
  const GUILD_COST = 5000, GUILD_MAX = 25;
  const GD = { mine: undefined, list: null, q: '', err: '', busy: false, view: 'home', editInfo: false, d: 0, who: null };
  async function guildLoad() {
    if (!signedIn()) return;
    const who = cloud().info().email;
    if (GD.who !== who) Object.assign(GD, { who, mine: undefined, list: null, view: 'home' });
    GD.busy = true;
    try {
      GD.mine = (await cloud().rpc('guild_mine')) || null;
      if (!GD.mine) GD.list = (await cloud().rpc('guild_list', { q: GD.q })) || [];
      GD.err = '';
    } catch (e) { GD.err = 'Could not reach the server. Check your connection and try again.'; if (GD.mine === undefined) GD.mine = null; }
    GD.busy = false;
    if (tab === 'social' && SO.tab === 'guild' && !B) render();
  }
  async function guildAct(fn, body, msgs, after) {
    let r;
    try { r = await cloud().rpc(fn, body); } catch (e) { toast('That did not work. Try again in a moment.', true); return null; }
    const m = msgs && msgs[r]; if (m) toast(m, r !== 'ok');
    if (after && r === 'ok') after();
    await guildLoad();
    return r;
  }
  // the guild's emblem: its tag on a shield in a colour picked from the name
  const guildHue = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const emblem = g => `<span class="g-emb" style="--h:${guildHue(g.name)}"><b>${esc(g.tag)}</b></span>`;
  const ROLE_NAME = { leader: 'Guildmaster', officer: 'Officer', member: 'Member' };
  const roleChip = r => `<span class="g-role ${r}">${ROLE_NAME[r]}</span>`;
  // time left until a moment, as "2d 5h" / "5h 20m"; keys reset at midnight UTC, the chest every Monday 00:00 UTC
  function untilUtc(ms) { const s = Math.max(0, Math.round((ms - Date.now()) / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; }
  const today = () => Math.floor(Date.now() / 86400000);
  const nextMidnight = () => (today() + 1) * 86400000;
  // the guild boss keys reset at 00:00 UTC: a live countdown next to them (h:mm:ss, ticked every second below)
  const keyClock = () => { const s = Math.max(0, Math.ceil((nextMidnight() - Date.now()) / 1000)), p = n => String(n).padStart(2, '0'); return `${Math.floor(s / 3600)}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`; };
  const keyReset = () => `<span class="gb-reset" title="The guild boss keys reset every day at 00:00 UTC">Resets in <b data-kclock>${keyClock()}</b></span>`;
  let kcDay = today();
  setInterval(() => {
    const els = document.querySelectorAll('[data-kclock]'); if (!els.length) { kcDay = today(); return; }
    const t = keyClock(); els.forEach(e => { e.textContent = t; });
    if (today() !== kcDay) { kcDay = today(); guildLoad(); } // a new day: fetch the fresh keys
  }, 1000);
  const nextMonday = () => { const day = today(), dow = (day + 3) % 7; return (day + (7 - dow)) * 86400000; }; // day 0 (1970-01-01) was a Thursday
  // a guild boss difficulty is open when that campaign difficulty is (the server checks the same)
  const gbOpen = d => d === 0 || (d === 1 ? S.cleared >= K.STAGES.length - 1 : clearedOn(d - 1) >= K.STAGES.length - 1);
  const myGuildRow = () => (GD.mine && GD.mine.members.find(m => m.me)) || { points: 0, hits: 0 };
  function guildHtml() {
    if (!signedIn()) return needAccount('Guilds');
    if (!unlocked('guild')) return `<div class="lockbox">${LOCK_SVG}<div><h3>Guilds open after ${needTxt('guild')}</h3><p class="empty-note">Campaign (Easy): ${S.cleared + 1} of ${UNLOCKS.guild.ch * 7} stages cleared.</p></div></div>`;
    if (GD.mine === undefined) { if (!GD.busy) guildLoad(); return '<p class="empty-note">Loading your guild…</p>'; }
    const err = GD.err ? `<p class="ar-err">${esc(GD.err)}</p>` : '';
    if (!GD.mine) return err + guildBrowseHtml();
    if (GD.view === 'boss') return err + gbossHtml();
    if (GD.view === 'chest') return err + gchestHtml();
    return err + guildHomeHtml();
  }
  function guildBrowseHtml() {
    const rows = (GD.list || []).map(g => `<li class="g-row">${emblem(g)}<span class="g-main"><b>${esc(g.name)}</b> <span class="tag">[${esc(g.tag)}]</span><small class="empty-note">${g.members} / ${GUILD_MAX} members · Guildmaster ${esc(g.leader_name || '?')}</small>${g.info ? `<span class="g-info-s">${esc(g.info)}</span>` : ''}</span>
      <span class="fr-acts">${!g.open ? '<span class="tag">Closed</span>' : g.members >= GUILD_MAX ? '<span class="tag">Full</span>' : `<button class="btn primary small" data-act="gjoin" data-id="${g.id}" ${GD.busy ? 'disabled' : ''}>Join</button>`}</span></li>`).join('');
    const can = S.silver >= GUILD_COST;
    return `<div class="soc-top">
        <section class="soc-card g-create"><span class="tag">Create a guild</span>
          <form class="g-form" data-form="gcreate">
            <label>Name<input name="gname" id="g-name" maxlength="20" minlength="3" required autocomplete="off" placeholder="e.g. Ashen Vanguard"></label>
            <label>Tag<input name="gtag" id="g-tag" maxlength="4" minlength="2" required autocomplete="off" autocapitalize="characters" placeholder="AV"></label>
            <button class="btn primary small" type="submit" ${can ? '' : 'disabled'}>Create · ${ic('coin')} ${GUILD_COST.toLocaleString('en-US')}</button>
          </form>
          <small class="empty-note">${can ? 'You become its Guildmaster. Name 3-20 characters, tag 2-4 letters or numbers.' : `You need ${GUILD_COST.toLocaleString('en-US')} Sigils to create a guild.`}</small></section>
        <section class="soc-card"><span class="tag">Find a guild</span><form class="fr-add" data-form="gsearch"><input name="q" id="g-q" value="${esc(GD.q)}" maxlength="20" autocomplete="off" placeholder="Name or tag" aria-label="Search guilds"><button class="btn small" type="submit">Search</button></form><small class="empty-note">Join an open guild to fight the guild boss together.</small></section>
      </div>
      <section class="fr-sec"><h3>Guilds</h3>${GD.list === null ? '<p class="empty-note">Loading…</p>' : rows ? `<ul class="fr-list">${rows}</ul>` : '<p class="empty-note">No guilds found. Create the first one!</p>'}</section>`;
  }
  function guildHomeHtml() {
    const g = GD.mine, me = g.role, leader = me === 'leader', gm = g.members.find(m => m.role === 'leader');
    const mine = myGuildRow(), myPts = Number(mine.points) || 0, tier = K.gchestTier(myPts);
    const info = GD.editInfo && leader
      ? `<form class="g-edit" data-form="ginfo"><textarea name="ginfo" id="g-info" maxlength="250" rows="4" placeholder="Tell players what your guild is about: goals, activity, rules.">${esc(g.info)}</textarea>
          <div class="row"><small class="empty-note"><span id="g-count">${g.info.length}</span> / 250</small><label class="g-check"><input type="checkbox" name="gopen" id="g-open" ${g.open ? 'checked' : ''}> Open to new members</label><button class="btn small" type="button" data-act="ginfocancel">Cancel</button><button class="btn primary small" type="submit">Save</button></div></form>`
      : `<p class="g-info">${g.info ? esc(g.info) : `<span class="empty-note">${leader ? 'No guild info yet. Write a few lines about your guild.' : 'The Guildmaster has not written anything yet.'}</span>`}</p>${leader ? '<button class="btn small" data-act="ginfoedit">Edit guild info</button>' : ''}`;
    const memberRow = m => {
      const acts = [];
      if (!m.me && leader) acts.push(m.role === 'member' ? `<button class="btn small" data-act="grole" data-id="${m.user_id}" data-r="officer">Make officer</button>` : `<button class="btn small" data-act="grole" data-id="${m.user_id}" data-r="member">Make member</button>`, `<button class="btn small" data-act="grole" data-id="${m.user_id}" data-r="leader" data-name="${esc(m.name)}">Make Guildmaster</button>`);
      if (!m.me && (leader || (me === 'officer' && m.role === 'member'))) acts.push(`<button class="btn small danger" data-act="gkick" data-id="${m.user_id}" data-name="${esc(m.name)}">Remove</button>`);
      // portrait with a level badge, name and role, then the numbers in their own small frames
      const st = m.cleared != null && m.cleared >= 0 && K.STAGES[m.cleared], camp = st ? `Ch ${ROMAN[st.chapter]} · ${st.n + 1}` : 'Starting';
      const cell = (label, value, cls) => `<span class="gm-stat ${cls || ''}"><small>${label}</small><b>${value}</b></span>`;
      return `<li class="gm-row pf-open ${m.me ? 'me' : ''}" data-act="profile" data-id="${m.user_id}" title="View profile"><span class="gm-av">${m.avatar && C[m.avatar] ? por(m.avatar) : ''}${m.lvl ? `<span class="gm-lv">${m.lvl}</span>` : ''}</span>
        <span class="gm-id"><b>${esc(m.name)}${m.me ? ' <small>(you)</small>' : ''}</b>${roleChip(m.role)}</span>
        <span class="gm-stats">${cell('Level', m.lvl || '?')}${cell('Campaign', esc(camp))}${cell('Boss points', Number(m.points).toLocaleString('en-US'), 'gold')}${cell('Fights', `${m.hits}`)}</span>
        ${acts.length ? `<span class="fr-acts gm-acts">${acts.join('')}</span>` : ''}</li>`;
    };
    const keysLeft = Math.max(0, K.GBOSS.keys - (g.keys_used || 0));
    // the guild home: on a phone on its side the guild, its tiles and invites on the left and the members beside them
    // (.g-home); elsewhere everything under each other with Leave guild last
    return `<div class="g-home"><div class="g-left"><section class="g-card">${emblem(g)}<div class="g-head"><h3>${esc(g.name)} <span class="tag">[${esc(g.tag)}]</span></h3>
        <small class="empty-note">${g.members.length} / ${GUILD_MAX} members · Guildmaster ${esc(gm ? gm.name : '?')} · ${g.open ? 'open to new members' : 'closed'} · you: ${ROLE_NAME[me]}</small>
        ${info}</div></section>
      <div class="g-tiles">
        <button type="button" class="g-tile" data-act="gview" data-v="boss"><img class="spr" src="${SPR.url(K.GBOSS.art[K.gbossEss(today())], 1)}" alt=""><b>Guild Boss</b><small>${keysLeft} / ${K.GBOSS.keys} keys left today</small><small>${keyReset()}</small></button>
        <button type="button" class="g-tile" data-act="gview" data-v="chest"><span class="g-chest-ic">${svgIcon('gift')}</span><b>Guild Chest</b><small>${tier ? tier.name : 'No chest yet'} · ${myPts.toLocaleString('en-US')} points</small></button>
        <div class="g-tile locked" aria-disabled="true"><span class="g-medal">${LOCK_SVG}</span><b>Guild Shop</b><small>Coming soon</small></div>
      </div>
      <div class="row g-leave">${me === 'leader' || me === 'officer' ? '<button class="btn small primary" data-act="ginvopen">Invite members</button>' : ''}<button class="btn small danger" data-act="gleave">Leave guild</button></div></div>
      <section class="fr-sec g-mem"><h3>Members <small class="empty-note">${g.members.length} / ${GUILD_MAX}</small></h3><ul class="fr-list g-members">${g.members.map(memberRow).join('')}</ul></section></div>`;
  }
  // Guildmaster and officers: invite by friend code, or one of your friends who is not in this guild yet
  const friendCode = uid => String(uid).replace(/-/g, '').slice(0, 8).toUpperCase();
  function guildInviteHtml(g) {
    const inGuild = new Set(g.members.map(m => m.user_id));
    const friends = (SO.friends || []).filter(f => f.kind === 'friend' && !inGuild.has(f.user_id));
    const full = g.members.length >= GUILD_MAX;
    return `<section class="fr-sec g-invite"><h3>Invite a player</h3>
      ${full ? '<p class="empty-note">The guild is full (25 members).</p>' : `<form class="fr-add" data-form="ginvite"><input name="icode" id="g-icode" maxlength="9" autocomplete="off" spellcheck="false" placeholder="Friend code, e.g. 1A2B 3C4D" aria-label="Friend code to invite"><button class="btn primary small" type="submit">Send invite</button></form>
      <small class="empty-note">The invite arrives in their Mail. They can join even when the guild is closed.</small>
      ${friends.length ? `<ul class="g-inv-friends">${friends.map(f => `<li>${f.avatar && C[f.avatar] ? por(f.avatar) : ''}<b>${esc(f.name)}</b><button class="btn small" data-act="ginvf" data-code="${friendCode(f.user_id)}">Invite</button></li>`).join('')}</ul>` : ''}`}</section>`;
  }
  const INVITE_MSG = { sent: 'Invite sent: it is waiting in their Mail.', already: 'This player already has an invite from your guild.', in_guild: 'This player is already in a guild.', self: 'That is your own friend code.', full: 'Your guild is full.', not_found: 'No player has that friend code.', not_allowed: 'Only the Guildmaster and officers can invite.' };
  // Invite members (Guildmaster and officers): the friend code form and the friends not in the guild yet, in a popup
  function openInvite() {
    if (!GD.mine) return;
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box g-invbox" role="dialog" aria-modal="true" aria-label="Invite members"><button class="btn small pf-close" data-act="pfclose" aria-label="Close">✕</button><h2>Invite members</h2>${guildInviteHtml(GD.mine)}</div>`;
    m.hidden = false; const i = $('#g-icode'); if (i) i.focus();
  }
  async function sendInvite(code) {
    const c = String(code || '').replace(/[^0-9a-f]/gi, '');
    if (c.length !== 8) { toast('A friend code has 8 characters (letters A-F and numbers).', true); return; }
    let r; try { r = await cloud().rpc('guild_invite', { code: c }); } catch (e) { toast('Could not send the invite. Try again.', true); return; }
    toast(INVITE_MSG[r] || 'Could not send the invite.', r !== 'sent');
  }
  async function answerInvite(gid, accept) {
    let r; try { r = await cloud().rpc('guild_invite_respond', { gid, accept }); } catch (e) { toast('That did not work. Try again in a moment.', true); return; }
    const MSG = accept ? { ok: 'Welcome to the guild!', in_guild: 'Leave your current guild first.', full: 'That guild is full.', locked: 'Guilds open after clearing Chapter II.', not_found: 'That invite is no longer valid.' } : { ok: 'Invite declined.' };
    toast(MSG[r] || 'That did not work.', r !== 'ok');
    GD.mine = undefined; socialLoad();
    if (accept && r === 'ok') { SO.tab = 'guild'; GD.view = 'home'; setTab('social'); guildLoad(); }
  }
  const guildBack = '<button class="btn small" data-act="gview" data-v="home">‹ Guild</button>';
  function gbossHtml() {
    const g = GD.mine, ess = K.gbossEss(today()), art = K.GBOSS.art[ess], keysLeft = Math.max(0, K.GBOSS.keys - (g.keys_used || 0));
    if (!gbOpen(GD.d)) GD.d = 0;
    const diffs = K.DIFFS.map((x, i) => `<button type="button" class="${i === GD.d ? 'sel' : ''}" data-act="gbd" data-n="${i}" ${gbOpen(i) ? '' : 'disabled title="Clear the previous campaign difficulty first"'}>${gbOpen(i) ? '' : LOCK_SVG}${esc(x.name)}<small>×${K.GBOSS.mult[i]} points</small></button>`).join('');
    const beaten = K.ESSENCES.filter(e => K.BEATS[e] === ess);
    return `<div class="section-head" style="margin:0">${guildBack}</div>
      <section class="gb-card"><div class="gb-art"><img class="spr" src="${SPR.url(art, 2)}" alt="${esc(K.BOSSES[art].name)}"></div>
        <div class="gb-main"><span class="tag">Today's guild boss · a new one every day</span><h3>${esc(K.BOSSES[art].name)} ${affChip(ess)}</h3>${K.BOSSES[art].title ? `<span class="gb-title">${esc(K.BOSSES[art].title)}</span>` : ''}
          <p class="empty-note">It cannot be killed: deal as much damage as you can before your team falls or the boss has taken ${K.GBOSS.turns} turns. It enrages after ${K.ENRAGE.at} of its turns. ${ess === 'Aether' ? 'No essence has the advantage today.' : `Strong against it today: ${beaten.map(e => affChip(e) + ' ' + e).join(', ')}.`}</p>
          <div class="gb-keys">${Array.from({ length: K.GBOSS.keys }, (_, i) => `<i class="${i < keysLeft ? 'on' : ''}"></i>`).join('')}<span>${keysLeft} / ${K.GBOSS.keys} keys left today</span>${keyReset()}</div>
        </div></section>
      <div class="gb-diffs" role="group" aria-label="Difficulty">${diffs}</div>
      <div class="section-head" style="margin:0"><span class="empty-note">Your team: power ${K.teamPower(snapTeam(teamIds('guild'))).toLocaleString('en-US')} · <button class="linkbtn" data-act="editteam" data-mode="guild">change</button></span>
        <button class="btn primary" data-act="gbfight" ${keysLeft && !GD.busy ? '' : 'disabled'}>${GD.busy ? 'Fighting…' : 'Attack · 1 key'}</button></div>`;
  }
  function gchestHtml() {
    const me = myGuildRow(), pts = Number(me.points) || 0, tier = K.gchestTier(pts);
    const next = K.GCHEST.find(c => c.min > pts), prevMin = tier ? tier.min : 0;
    const reward = c => [`${ic('coin')} ${c.silver.toLocaleString('en-US')}`, `${ic('stone')} ${c.stones}`, ...Object.keys(c.fs).map(k => `${shardIc(k)} ${c.fs[k]}`)].join(' ');
    const rows = K.GCHEST.map(c => `<tr class="${tier === c ? 'cur' : ''}"><td>${esc(c.name)}</td><td class="num">${c.min === 1 ? 'any damage' : c.min.toLocaleString('en-US') + '+'}</td><td>${reward(c)}</td></tr>`).join('');
    return `<div class="section-head" style="margin:0">${guildBack}<span class="tag">Opens in ${untilUtc(nextMonday())}</span></div>
      <section class="gb-card chest"><span class="g-chest-ic big">${svgIcon('gift')}</span><div class="gb-main"><span class="tag">Your Guild Chest this week</span><h3>${tier ? esc(tier.name) : 'No chest yet'}</h3>
        <p class="empty-note">${pts.toLocaleString('en-US')} points from ${me.hits || 0} guild boss ${me.hits === 1 ? 'fight' : 'fights'} this week.${next ? ` ${(next.min - pts).toLocaleString('en-US')} more for the ${esc(next.name)}.` : ' The best chest!'}</p>
        ${next ? `<div class="xpbar"><i style="width:${Math.round((pts - prevMin) / (next.min - prevMin) * 100)}%"></i></div>` : ''}
        <small class="empty-note">Points = damage × the difficulty's multiplier. Every Monday (UTC) your chest arrives in your Mail.</small></div></section>
      <div class="tbl-wrap"><table class="g-tiers"><tr><th>Chest</th><th>Points</th><th>Reward</th></tr>${rows}</table></div>`;
  }
  async function gbossFight() {
    if (GD.busy) return;
    GD.busy = true; render();
    let r;
    try { r = await cloud().fn('arena', { action: 'gboss', d: GD.d, name: S.p.name, avatar: avatarId(), team: snapTeam(teamIds('guild')) }); }
    catch (e) { r = { error: 'No connection to the server. Check your internet and try again.' }; }
    GD.busy = false;
    if (r.error || !r.gboss) { toast(r.error || 'The fight could not start.', true); guildLoad(); return; }
    const f = r.gboss;
    track('gboss');
    runBattle({ type: 'gboss', team: f.team, d: f.d, ess: f.ess, seed: f.seed, fight: f, area: AREA_OF[f.ess] ?? 1, bg: chapterBg(ESS_CH[f.ess] ?? 9), title: `Guild boss · ${K.BOSSES[K.GBOSS.art[f.ess]].name}` });
  }
  // ================= GEAR VAULT =================
  // All gear in one place (tab 'vault', next to Heroes and Team), filter by slot,
  // rarity, set and whether it is worn, sort it, lock pieces you want to keep (it.lock) and sell several at once.
  // Sell mode: tap pieces to select them; worn and locked gear can never be selected.
  const VT = { slot: 'all', rar: 'all', set: 'all', st: 'all', sort: 'rar', sell: false, sel: new Set(), open: null, up: null };
  const VT_SORTS = { rar: ['Rarity', (a, b) => b.rar - a.rar || b.lvl - a.lvl || b.il - a.il], lvl: ['Upgrade level', (a, b) => b.lvl - a.lvl || b.rar - a.rar], new: ['Newest', (a, b) => b.id - a.id], value: ['Sell value', (a, b) => K.sellValue(b) - K.sellValue(a)] };
  const sellable = it => !it.owner && !it.lock;
  function vaultItems() {
    return S.inv.filter(it => (VT.slot === 'all' || it.slot === VT.slot) && (VT.rar === 'all' || it.rar === +VT.rar) && (VT.set === 'all' || it.set === VT.set)
      && (VT.st === 'all' || (VT.st === 'free' ? !it.owner : VT.st === 'worn' ? !!it.owner : VT.st === 'asc' ? !!it.asc : !!it.lock))).sort((VT_SORTS[VT.sort] || VT_SORTS.rar)[1]);
  }
  // ================= GEAR: the bag on the Heroes screen, and the Forge (Items) =================
  // Heroes → Gear: tapping a slot opens the gear bag over the right column (HB.open): the filters, what the hero wears
  // in that slot next to the piece picked (stat by stat with ▲/▼, the set's progress, the power change), Equip /
  // Upgrade / Lock / Sell, and the slot's pieces as one grid (each with its set's essence badge, or a gold dot for a
  // campaign set). Upgrade turns the bag into the upgrade panel (HB.up: the +0…+16 track, chance, cost, Upgrade and
  // To +N; ascension at +16), "‹ Bag" goes back. The Forge is Items: every piece of gear plus stones, shards and
  // elixirs, with all filters and selling (the old Vault, state VT); a piece can be upgraded there too (VT.up).
  // The hero being geared is selChamp.
  const FG = { view: 'items', slot: 'wapen', pick: null, rar: 'all', set: 'all', main: 'all', sub: 'all', sort: 'power', worn: true, free: true, cat: 'all' };
  const HB = { open: false, up: null };
  const ESS_BG = { Ember: 2, Frost: 5, Radiant: 4, Aether: 0, Verdant: 3, Umbral: 8, Storm: 1 };
  const essBadge = (e, cls) => e ? `<span class="fg-ess ${cls || ''}" style="--ec:${AFF_COL[e]}">${essIcon(e)}</span>` : '';
  const setEss = k => (K.SETS[k] && K.SETS[k].ess) || null;
  // a set's bonuses as [pieces, text] (boss sets: 2/4/6, the Ascended version left out; campaign sets: one bonus)
  const setTiersOf = k => { const SS = K.SETS[k]; return SS.tiers ? SS.tiers.filter(t => !t.asc).map(t => [t.n, t.d]) : [[SS.n, SS.desc.replace(/^\d pieces: /, '')]]; };
  const statMap = it => { const o = {}; if (it) for (const [k, v] of K.gearStats(it)) o[k] = (o[k] || 0) + v; return o; };
  const fmtDelta = (k, v) => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v)).toLocaleString('en-US')}${K.PCT_STATS && K.PCT_STATS.includes(k) ? '%' : ''}`;
  const fmtVal = (k, v) => K.fmtStat(k, v).replace(/^[^+]*\+/, '+');
  // power change for hero `id` when it wears `it` in that slot instead of what it wears now
  // ----- gear that suits the hero's role (Equip best, the ▲ and "Best first" in the gear bag, "Equip on" after an
  // Auto ×10 run). Power (the number shown everywhere) weighs every stat the same for every hero; this instead asks what
  // the hero's job needs, the way the battle works:
  //   damage    = Attack × (1 + Crit Rate × Crit Damage), Crit Rate counted up to its cap (every hit scales with Attack)
  //   toughness = HP × (100 + Defense) / 100 (Defense cuts the damage taken to 100 / (100 + Defense))
  //   Speed     = how often the hero acts: more hits, heals, shields and taunts
  //   Accuracy  = how often its debuffs land (chance × (1 + (Accuracy − the foe's Resistance) / 100))
  //   Resistance= how often the foe's stuns, freezes and debuffs miss it
  // The score multiplies these, each raised to the role's weight (ROLE_W; a log sum), so a stat that is already high is
  // worth less than one that is low, and Crit Rate past the cap is worth nothing. The hero's own kit adjusts it: without
  // debuffs Accuracy hardly counts; shields scale with the caster's HP, so a shielder values HP; heals scale with the
  // healed hero's max HP, not the healer's Attack, so a healer barely values Attack. A second role (role2) counts 30%.
  // Set mechanics without a stat (lifesteal, counter, the 4- and 6-piece effects of boss sets) add a little for the
  // roles they suit (SET_FIT, by the set's own role).
  const ROLE_W = {
    Tank:       { off: 0.2,  tough: 1.0,  spd: 0.5,  acc: 0.25, res: 0.5 },
    Warrior:    { off: 1.0,  tough: 0.65, spd: 0.8,  acc: 0.2,  res: 0.2 },
    Mage:       { off: 0.9,  tough: 0.42, spd: 0.8,  acc: 0.55, res: 0.15 },
    Ranger:     { off: 1.0,  tough: 0.38, spd: 0.85,  acc: 0.25, res: 0.1 },
    Assassin:   { off: 1.1,  tough: 0.33, spd: 0.9,  acc: 0.15, res: 0.1 },
    Support:    { off: 0.05, tough: 0.65, spd: 1.0,  acc: 0.15, res: 0.55 },
    Controller: { off: 0.35, tough: 0.45, spd: 0.9,  acc: 0.9,  res: 0.25 },
  };
  // which hero roles a set mechanic helps: campaign set flags, and boss sets by their role
  const SET_FIT = {
    lifesteal: ['Warrior', 'Assassin', 'Ranger'], pierce: ['Warrior', 'Assassin', 'Ranger', 'Mage'], counter: ['Tank', 'Warrior'], curse: ['Mage', 'Controller'],
    Bruiser: ['Warrior'], Berserker: ['Warrior'], Lifesteal: ['Warrior', 'Assassin'], Breaker: ['Warrior', 'Assassin', 'Ranger'],
    Assassin: ['Assassin'], Executioner: ['Assassin', 'Ranger'], Marker: ['Ranger', 'Assassin'],
    'Area damage': ['Mage'], Waves: ['Mage'], Poison: ['Mage', 'Controller', 'Ranger'], Debuffer: ['Mage', 'Controller'], Control: ['Controller', 'Mage'], Chaos: ['Controller', 'Mage'],
    Tank: ['Tank'], Protector: ['Tank'], Reflect: ['Tank'], Evasion: ['Tank', 'Assassin'], Rebirth: ['Tank', 'Support', 'Warrior'],
    Guardian: ['Support', 'Tank'], Healer: ['Support'], Speed: ['Support', 'Controller'],
  };
  const FIT = {};
  function roleW(id) {
    if (FIT[id]) return FIT[id];
    const c = C[id], a = ROLE_W[c.role] || ROLE_W.Warrior, b = c.role2 && ROLE_W[c.role2];
    const w = {}; for (const k in a) w[k] = b ? a[k] * 0.7 + b[k] * 0.3 : a[k];
    const fx = (c.skills || []).flatMap(s => s.fx || []);
    const debuffs = fx.filter(f => f.t === 'debuff' || f.t === 'randomDebuff').length;
    if (!debuffs) w.acc *= 0.1; else if (debuffs >= 3) w.acc = Math.max(w.acc, 0.45);
    w.hp = fx.some(f => f.t === 'shield') ? 0.25 : 0;
    if (fx.some(f => f.t === 'heal' || f.t === 'revive')) w.off = Math.min(w.off, 0.15);
    if (!fx.some(f => f.t === 'dmg' || f.m)) w.off = Math.min(w.off, 0.05);
    w.roles = [c.role, c.role2].filter(Boolean);
    return (FIT[id] = w);
  }
  function gearFit(id, h, items) {
    const s = K.heroStats(id, h, items), w = roleW(id), L = Math.log;
    const off = s.atk * (1 + Math.min(s.crit, K.CRIT_CAP) / 100 * s.cdmg / 100), tough = s.hp * (100 + s.def) / 100;
    let v = w.off * L(off) + w.tough * L(tough) + w.hp * L(s.hp) + w.spd * L(s.spd) + w.acc * L(1 + Math.max(0, s.acc) / 100) + w.res * L(1 + Math.max(0, s.res) / 100);
    for (const t of K.setTiers(items)) {
      if (!t.flag) continue;
      const S = K.SETS[t.k] || {}, fits = SET_FIT[S.role] || SET_FIT[t.flag] || []; // (a family bonus is no set of its own)
      v += (fits.some(r => w.roles.includes(r)) ? (t.n >= 6 ? 0.07 : 0.05) * (t.asc ? 1.4 : 1) : t.flag === 'fate' ? 0.04 : 0.01);
    }
    return v;
  }
  // how much a piece would suit a hero in its slot (0 = no better, > 0 = better for its role)
  function fitGain(id, it) {
    const r = S.roster[id]; if (!r || it.owner === id || !wearOk(id, it)) return 0;
    const now = itemsOf(id), next = [...now.filter(x => x.slot !== it.slot), it];
    return gearFit(id, r, next) - gearFit(id, r, now);
  }
  function gainFor(id, it) {
    const r = S.roster[id]; if (!r || it.owner === id) return 0;
    const now = itemsOf(id), next = [...now.filter(x => x.slot !== it.slot), it];
    return power(K.heroStats(id, r, next)) - power(K.heroStats(id, r, now));
  }
  function fgList(id) {
    let l = S.inv.filter(x => x.owner !== id && (!FG.slot || x.slot === FG.slot));
    if (!FG.worn) l = l.filter(x => !x.owner); // the tick boxes: pieces other heroes wear, spare pieces
    if (!FG.free) l = l.filter(x => !!x.owner);
    if (FG.rar !== 'all') l = l.filter(x => x.rar === +FG.rar);
    if (FG.set !== 'all') l = l.filter(x => x.set === FG.set);
    if (FG.main !== 'all') l = l.filter(x => x.main === FG.main);
    if (FG.sub !== 'all') l = l.filter(x => x.subs.some(s => s[0] === FG.sub));
    const by = { power: (a, b) => fitGain(id, b) - fitGain(id, a) || b.rar - a.rar, rarity: (a, b) => b.rar - a.rar || b.lvl - a.lvl, level: (a, b) => b.lvl - a.lvl || b.rar - a.rar };
    return l.sort(by[FG.sort] || by.power);
  }
  // a piece in the bag's grid: rarity frame, +level, its set, who wears it, ▲ when it makes this hero stronger; the
  // piece the hero wears in the slot comes first with a gold ring
  function fgCell(it, id) {
    const g = fitGain(id, it), owner = it.owner && C[it.owner], mine = it.owner === id;
    return `<button type="button" class="fg-cell rar-${it.rar} ${FG.pick === it.id ? 'on' : ''} ${mine ? 'mine' : ''}" style="--rc:var(--r${it.rar})" data-act="hbpick" data-item="${it.id}" title="${esc(itemName(it))} · ${esc(K.SETS[it.set].name)}${mine ? ' · equipped' : owner ? ' · worn by ' + esc(owner.short) : ''}">${gearIcon(it, 'fg-ic')}<span class="fg-plv">+${it.lvl}</span>${setDot(it.set)}${it.asc ? `<span class="fg-ast">${"★".repeat(it.asc)}</span>` : ""}${owner && !mine ? `<span class="fg-who">${por(it.owner)}</span>` : ''}${it.lock ? `<span class="fg-lk">${LOCK_SVG}</span>` : ''}${g > 0.0005 ? '<span class="fg-up" title="Better for the role of this hero">▲</span>' : ''}</button>`;
  }
  // a set's mark: its essence badge, or a gold dot for a campaign set
  const setDot = k => essBadge(setEss(k)) || '<span class="hb-sd" aria-hidden="true"></span>';
  function gearTilesHtml(id, act) { const items = itemsOf(id), c = C[id];
    return K.SLOTS.map(sl => { const it = items.find(x => x.slot === sl), on = HB.open && FG.slot === sl ? 'on' : ''; return it
      ? `<button type="button" class="fg-tile rar-${it.rar} ${on}" style="--rc:var(--r${it.rar})" data-act="${act}" data-slot="${sl}"><span class="fg-lab">${K.SLOT_NAMES[sl]}</span>${it.lock ? `<span class="fg-lk tile" title="Locked to ${esc(c.short)}">${LOCK_SVG}</span>` : ''}${gearIcon(it, 'fg-ic')}${essBadge(setEss(it.set))}${it.asc ? `<span class="fg-ast">${"★".repeat(it.asc)}</span>` : ""}<span class="fg-plv">+${it.lvl}</span></button>`
      : `<button type="button" class="fg-tile empty ${on}" data-act="${act}" data-slot="${sl}"><span class="fg-lab">${K.SLOT_NAMES[sl]}</span><span class="fg-plus">+</span></button>`; }).join('');
  }
  // the active set bonuses of what a hero wears (a live set: its circle glows)
  function setRowsHtml(items) { const counts = K.setCounts(items), active = K.setTiers(items);
    return Object.keys(counts).filter(k => K.SETS[k]).map(k => { const SS = K.SETS[k], n = counts[k], tiers = setTiersOf(k), max = tiers[tiers.length - 1][0], on = tiers.filter(([t]) => n >= t), nx = tiers.find(([t]) => t > n), asc = active.some(t => t.k === k && t.asc);
      return `<div class="fg-srow ${on.length ? 'live' : ''}">${essBadge(SS.ess) || '<span class="fg-ess"></span>'}<span class="${on.length ? 'on' : 'off'}">${esc(SS.name)} (${n}/${max})</span><span class="fg-sb ${on.length ? '' : 'off'}">${on.length ? esc(on.map(t => t[1]).join(' · ')) + (asc ? ' · <span class="asc-st">★★★</span> Ascended' : '') : `${nx[0] - n} more`}</span></div>`; }).join('')
      + active.filter(t => t.fam).map(t => `<div class="fg-srow live"><span class="fg-ess"></span><span class="on">${t.fam} family</span><span class="fg-sb">${esc(t.d)}</span></div>`).join('');
  }
  // the bag (Heroes → Gear → a slot): filters, the comparison, the slot's pieces as one grid
  function hxBag(id) {
    if (HB.up) { const it = S.inv.find(x => x.id === HB.up); if (it) return hbUp(it, id); HB.up = null; }
    const cur = itemsOf(id).find(x => x.slot === FG.slot), pick = FG.pick ? S.inv.find(x => x.id === FG.pick && x.owner !== id) : null;
    const list = fgList(id), cells = (cur ? [cur] : []).concat(list).map(it => fgCell(it, id)).join('');
    const none = list.length ? '' : `<p class="empty-note hb-none">${S.inv.some(x => x.slot === FG.slot && x.owner !== id) ? 'No other piece matches these filters.' : `No other ${K.SLOT_NAMES[FG.slot].toLowerCase()} yet. Play the campaign or the Boss Hall to find gear.`}</p>`;
    return `<div class="hb">
      <div class="hb-head"><b>${K.SLOT_NAMES[FG.slot]} <small>· ${S.inv.filter(x => x.slot === FG.slot).length}</small></b><label class="hb-chk"><input type="checkbox" data-gf="worn" ${FG.worn ? 'checked' : ''}> Worn by others</label><label class="hb-chk"><input type="checkbox" data-gf="free" ${FG.free ? 'checked' : ''}> Not worn</label><button type="button" class="hb-x" data-act="hbclose" aria-label="Close the bag" title="Close">✕</button>${hbFilters()}</div>
      ${hbCompare(cur, pick, id)}
      <div class="hb-grid">${cells}</div>${none}</div>`;
  }
  function hbFilters() {
    const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`, stats = Object.keys(K.STAT_NAMES);
    const sets = [...new Set(S.inv.filter(x => x.slot === FG.slot).map(x => x.set))].filter(k => K.SETS[k]).sort((a, b) => K.SETS[a].name.localeCompare(K.SETS[b].name));
    const nf = [FG.rar, FG.set, FG.main, FG.sub].filter(v => v !== 'all').length + !FG.worn + !FG.free;
    return `<div class="hb-filt"><select data-gf="rar" aria-label="Rarity">${opt('all', 'Rarity', FG.rar)}${K.RARITIES.map((r, i) => opt(i, r, FG.rar)).join('')}</select><select data-gf="set" aria-label="Set">${opt('all', 'Set', FG.set)}${sets.map(k => opt(k, K.SETS[k].name, FG.set)).join('')}</select><select data-gf="main" aria-label="Main stat">${opt('all', 'Main stat', FG.main)}${stats.map(k => opt(k, STAT_SHORT[k], FG.main)).join('')}</select><select data-gf="sub" aria-label="Substat">${opt('all', 'Substat', FG.sub)}${stats.map(k => opt(k, STAT_SHORT[k], FG.sub)).join('')}</select><select data-gf="sort" aria-label="Sort">${opt('power', 'Best first', FG.sort)}${opt('rarity', 'Rarity', FG.sort)}${opt('level', 'Level', FG.sort)}</select>${nf ? '<button type="button" class="linkbtn" data-act="fgreset">Clear</button>' : ''}</div>`;
  }
  // short stat names for tight tables (HP% next to HP)
  const STAT_SHORT = { hp: 'HP', hpP: 'HP%', atk: 'ATK', atkP: 'ATK%', def: 'DEF', defP: 'DEF%', spd: 'SPD', crit: 'C.Rate', cdmg: 'C.DMG', acc: 'ACC', res: 'RES' };
  // what the hero wears in the slot (left) and the piece picked (right), each with its set's pieces now → after the
  // swap (▲ a new set bonus, ▼ one lost); below them one stat table in two blocks (Now, New, ▲/▼), the power change and
  // the buttons
  function hbCompare(cur, pick, id) {
    if (!cur && !pick) return '<div class="hb-cmp empty"><p class="empty-note">Nothing in this slot. Pick a piece below.</p></div>';
    const now = itemsOf(id), next = pick ? [...now.filter(x => x.slot !== pick.slot), pick] : now, cn = K.setCounts(now), ca = K.setCounts(next);
    const setLine = x => { const tiers = setTiersOf(x.set), max = tiers[tiers.length - 1][0], n = cn[x.set] || 0, af = ca[x.set] || 0;
      const up = tiers.some(([t]) => n < t && af >= t), dn = tiers.some(([t]) => n >= t && af < t);
      return `<div class="hb-set">${setDot(x.set)}<span>${esc(K.SETS[x.set].name)}</span><small>${n}/${max}${af !== n ? ` → ${af}/${max}` : ''}</small>${up ? '<i class="u" title="A new set bonus">▲</i>' : dn ? '<i class="d" title="A set bonus is lost">▼</i>' : ''}</div>`; };
    const head = (x, tag) => `<div class="hb-cs"><div class="hb-ch"><span class="hb-ic rar-${x.rar}" style="--rc:var(--r${x.rar})">${gearIcon(x, 'fg-ic')}<span class="fg-plv">+${x.lvl}</span></span><div><small class="fg-ctag">${tag}</small><b class="rartxt rar-${x.rar}">${itemNameH(x)}</b></div></div>${setLine(x)}</div>`;
    const a = statMap(cur), b = statMap(pick), ord = ['hp', 'hpP', 'atk', 'atkP', 'def', 'defP', 'spd', 'crit', 'cdmg', 'acc', 'res'];
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort((x, y) => ord.indexOf(x) - ord.indexOf(y));
    const v = (m, k) => k in m ? fmtVal(k, m[k]) : '—';
    if (!pick) {
      const lk = cur.lock ? 'disabled title="Locked to this hero: unlock it first"' : '';
      return `<div class="hb-cmp one">${head(cur, `Equipped${cur.lock ? ' ' + LOCK_SVG : ''}`)}<div class="hb-st">${keys.map(k => `<span>${STAT_SHORT[k]}</span><b>${v(a, k)}</b>`).join('')}</div>
        <div class="hb-acts"><button type="button" class="btn primary" data-act="hbup" data-item="${cur.id}">${cur.lvl < K.MAX_GEAR_LVL ? 'Upgrade' : 'Ascend'}</button><button type="button" class="btn ${cur.lock ? 'on' : ''}" data-act="vlock" data-item="${cur.id}">${cur.lock ? `${LOCK_SVG} Locked` : `Lock to ${esc(C[id].short)}`}</button><button type="button" class="btn danger" data-act="unequip" data-item="${cur.id}" ${lk}>Remove</button></div></div>`;
    }
    const left = cur ? head(cur, `Equipped${cur.lock ? ' ' + LOCK_SVG : ''}`) : '<div class="hb-cs empty"><small class="fg-ctag">Equipped</small><p class="empty-note">Nothing in this slot.</p></div>';
    const right = head(pick, `Selected${pick.owner && C[pick.owner] ? ` · worn by ${esc(C[pick.owner].short)}` : ''}`).replace('class="hb-cs"', 'class="hb-cs sel"');
    const hdr = '<span></span><small>Now</small><small>New</small><i></i>';
    const rows = keys.map(k => { const d = (b[k] || 0) - (a[k] || 0); return `<span>${STAT_SHORT[k]}</span><b class="was">${v(a, k)}</b><b>${v(b, k)}</b><i class="${d > 0 ? 'u' : d < 0 ? 'd' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : ''}</i>`; }).join('');
    const g = gainFor(id, pick), blk = equipBlock(id, pick);
    const eq = blk ? `<button type="button" class="btn" disabled title="${esc(blk)}">${LOCK_SVG} ${lockedTo(pick) && lockedTo(pick) !== id ? `Locked to ${esc(C[pick.owner].short)}` : 'Slot locked'}</button>`
      : `<button type="button" class="btn primary" data-act="equip" data-item="${pick.id}" ${wearOk(id, pick) ? '' : `disabled title="Ascended gear needs a ${K.ASC_STARS}★ hero"`}>${wearOk(id, pick) ? 'Equip' : `Needs ${K.ASC_STARS}★`}</button>`;
    return `<div class="hb-cmp">${left}${right}<div class="hb-st two">${hdr}${keys.length > 1 ? hdr : ''}${rows}</div>
      <div class="hb-acts"><span class="hb-pow ${g >= 0 ? 'u' : 'd'}" title="Power for ${esc(C[id].short)}">Power ${g >= 0 ? '+' : '−'}${Math.abs(g).toLocaleString('en-US')} ${g >= 0 ? '▲' : '▼'}</span>${(() => { const f = fitGain(id, pick), up = f > 0.0005, dn = f < -0.0005; return `<span class="hb-pow hb-fit ${up ? 'u' : dn ? 'd' : ''}" title="How well it suits ${esc(C[id].short)}'s role (what Equip best goes by)">${esc(C[id].role)} fit ${up ? '▲' : dn ? '▼' : '='}</span>`; })()}${eq}<button type="button" class="btn" data-act="hbup" data-item="${pick.id}">${pick.lvl < K.MAX_GEAR_LVL ? 'Upgrade' : 'Ascend'}</button><button type="button" class="btn" data-act="vlock" data-item="${pick.id}">${pick.lock ? 'Unlock' : 'Lock'}</button>${pick.owner ? '' : `<button type="button" class="btn danger" data-act="sell" data-item="${pick.id}" ${pick.lock ? 'disabled title="Locked: unlock it first"' : ''}>Sell · ${K.sellValue(pick).toLocaleString('en-US')}</button>`}</div></div>`;
  }
  // the bag turned into the upgrade panel of one piece; "‹ Bag" goes back
  function hbUp(it, id) {
    const w = it.owner && C[it.owner];
    return `<div class="hb hb-upv"><div class="hb-head"><button type="button" class="btn small" data-act="hbback">‹ Bag</button><b>${it.lvl < K.MAX_GEAR_LVL ? 'Upgrade' : 'Ascend'}</b><button type="button" class="hb-x" data-act="hbclose" aria-label="Close the bag" title="Close">✕</button></div>
      <div class="hb-ch big"><span class="hb-ic rar-${it.rar}" style="--rc:var(--r${it.rar})">${gearIcon(it, 'fg-ic')}<span class="fg-plv">+${it.lvl}</span></span><div><b class="rartxt rar-${it.rar}">${itemNameH(it)}</b><small>${K.RARITIES[it.rar]} ${K.SLOT_NAMES[it.slot].toLowerCase()} · ${esc(K.SETS[it.set].name)} · ${it.owner === id ? 'equipped' : w ? `worn by ${esc(w.short)}` : 'not worn'}</small></div></div>
      ${fgForge(it)}</div>`;
  }
  // the Forge tab: one place for upgrades (+0 to +16, milestones at +4/8/12/16) and, at +16, ascension
  function fgForge(it) {
    if (!it) return '<p class="empty-note fg-none">Pick a piece to upgrade it here.</p>';
    if (it.lvl < K.MAX_GEAR_LVL) {
      const ms = [4, 8, 12, 16].find(m => m > it.lvl), cost = K.upgradeCost(it), now = K.gearStats(it)[0], next = K.gearStats({ ...it, lvl: it.lvl + 1 })[0];
      return `<div class="fg-forge"><div class="fg-track">${Array.from({ length: K.MAX_GEAR_LVL }, (_, i) => `<i class="${i < it.lvl ? 'done' : ''} ${(i + 1) % 4 === 0 ? 'ms' : ''}"></i>`).join('')}</div><div class="fg-tlab"><span>+0</span><span>+4</span><span>+8</span><span>+12</span><span>+16</span></div>
        <div class="fg-next"><div><small>Now +${it.lvl}</small><b>${K.fmtStat(...now)}</b></div><span>➜</span><div><small>Next +${it.lvl + 1}</small><b class="u">${K.fmtStat(...next)}</b></div></div>
        <div class="fg-facts"><div><small>Chance</small><b>${Math.round(K.upgradeChance(it) * 100)}%</b></div><div><small>Cost</small><b>${cost.toLocaleString('en-US')}</b></div><div><small>You have</small><b>${S.silver.toLocaleString('en-US')}</b></div></div>
        <p class="fg-ms">${ms === it.lvl + 1 ? `★ This step is a milestone: ${it.subs.length < 4 ? 'a new substat' : 'a substat gets stronger'}` : `Next milestone at +${ms}: ${it.subs.length < 4 ? 'a new substat' : 'a substat boost'}`}</p>
        <div class="fg-go"><button type="button" class="btn primary" data-act="up" data-item="${it.id}" ${S.silver < cost ? 'disabled' : ''}>Upgrade</button><button type="button" class="btn" data-act="fgupms" data-item="${it.id}" ${S.silver < cost ? 'disabled' : ''}>To +${ms}</button></div></div>`;
    }
    return `<div class="fg-forge"><div class="fg-ascs">${Array.from({ length: K.MAX_ASC }, (_, i) => `<span class="${i < (it.asc || 0) ? 'on' : ''}">★</span>`).join('')}</div>${ascHtml(it)}<div class="fg-go">${ascBtn(it) || ''}</div></div>`;
  }
  // ----- Items: every piece of gear plus stones, shards and elixirs -----
  function itemsHtml() {
    const list = vaultItems(), sets = [...new Set(S.inv.map(it => it.set))].filter(k => K.SETS[k]).sort((a, b) => K.SETS[a].name.localeCompare(K.SETS[b].name));
    for (const i of [...VT.sel]) if (!S.inv.some(it => it.id === i && sellable(it))) VT.sel.delete(i);
    const mats = [
      ...['lesser', 'greater', 'ancient'].map(t => ({ k: 'stone', id: t, n: stoneN(t), name: stoneName(t, 2), ic: stoneIc(t), rar: { lesser: 1, greater: 3, ancient: 4 }[t], tip: 'Ascend heroes (stars) and, Greater and Ancient, gear (orange stars).', go: 'team' })),
      ...(fcs().n ? [{ k: 'stone', id: 'fcs', n: fcs().n, name: 'Fate Changing Stone', ic: FCS_SVG, rar: 4, tip: 'Turn your Fateborn into another class or gender; level, XP, stars, skills and gear move along. One change every 72 hours.', go: 'fcs' }] : []),
      ...K.FATE_SHARDS.map((f, i) => ({ k: 'shard', id: f.id, n: S.fs[f.id] || 0, name: K.SHARD[f.id].name, ic: shardIc(f.id), rar: Math.min(5, i + 1), tip: 'Summon heroes at the Fate Altar.', go: 'altaar' })),
      ...K.ESSENCES.map(e => ({ k: 'elixir', id: e, n: S.elx[e] || 0, name: elxName(e, 2), ic: elxIc(e), rar: e === 'Aether' ? 4 : 3, tip: `Drink in Heroes → Level up: XP for ${e === 'Aether' ? 'any hero' : e + ' heroes'}.`, go: 'team' })),
    ].filter(m => m.n > 0);
    const cnt = { all: S.inv.length + mats.length, gear: S.inv.length, stone: mats.filter(m => m.k === 'stone').length, shard: mats.filter(m => m.k === 'shard').length, elixir: mats.filter(m => m.k === 'elixir').length };
    const showGear = FG.cat === 'all' || FG.cat === 'gear', showMats = mats.filter(m => FG.cat === 'all' || FG.cat === m.k);
    const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
    const nf = [VT.slot, VT.rar, VT.set, VT.st].filter(v => v !== 'all').length;
    const filters = `<details class="fg-panel it-filt" ${FG.fOpen ?? innerWidth > 760 ? 'open' : ''}><summary><h3>Filters</h3><small>${nf || 'none'} active</small></summary>
      <label><small>Slot</small><select data-vf="slot">${opt('all', 'All slots', VT.slot)}${K.SLOTS.map(s => opt(s, K.SLOT_NAMES[s], VT.slot)).join('')}</select></label>
      <label><small>Rarity</small><select data-vf="rar">${opt('all', 'All rarities', VT.rar)}${K.RARITIES.map((r, i) => opt(i, r, VT.rar)).join('')}</select></label>
      <label><small>Set</small><select data-vf="set">${opt('all', 'All sets', VT.set)}${sets.map(k => opt(k, K.SETS[k].name, VT.set)).join('')}</select></label>
      <label><small>Show</small><select data-vf="st">${opt('all', 'All gear', VT.st)}${opt('free', 'Spare (not worn)', VT.st)}${opt('worn', 'Worn by a hero', VT.st)}${opt('lock', 'Locked', VT.st)}${opt('asc', 'Ascended', VT.st)}</select></label>
      <label><small>Sort</small><select data-vf="sort">${Object.keys(VT_SORTS).map(k => opt(k, VT_SORTS[k][0], VT.sort)).join('')}</select></label>
      <button type="button" class="btn small" data-act="vreset">Clear filters</button></details>`;
    const gearCell = it => { const picked = VT.sel.has(it.id), can = sellable(it);
      return `<button type="button" class="fg-cell rar-${it.rar} ${VT.open === it.id ? 'on' : ''} ${VT.sell && !can ? 'nosell' : ''} ${picked ? 'picked' : ''}" style="--rc:var(--r${it.rar})" data-act="vpick" data-item="${it.id}" title="${esc(itemName(it))}">${gearIcon(it, 'fg-ic')}<span class="fg-plv">+${it.lvl}</span>${essBadge(setEss(it.set))}${it.asc ? `<span class="fg-ast">${"★".repeat(it.asc)}</span>` : ""}${it.owner && C[it.owner] ? `<span class="fg-who">${por(it.owner)}</span>` : ''}${it.lock ? `<span class="fg-lk">${LOCK_SVG}</span>` : ''}${picked ? '<span class="fg-tick">✓</span>' : ''}</button>`; };
    const gearCells = showGear ? list.map(gearCell).join('') : '';
    const matCell = m => `<button type="button" class="fg-cell mat rar-${m.rar} ${FG.mat === m.k + m.id ? 'on' : ''}" style="--rc:var(--r${m.rar})" data-act="imat" data-id="${m.k + ':' + m.id}" title="${esc(m.name)}"><span class="it-mic">${m.ic}</span><span class="it-n">×${m.n.toLocaleString('en-US')}</span></button>`;
    const matCells = showMats.map(matCell).join('');
    // by default the gear is split into blocks, one per set (the sets with the most pieces first); stones, shards and elixirs follow as plain tiles
    let grouped = '';
    {
      const g = {}; if (showGear) for (const it of list) (g[it.set] = g[it.set] || []).push(it);
      const order = Object.keys(g).filter(k => K.SETS[k]).sort((a, b) => g[b].length - g[a].length || K.SETS[a].name.localeCompare(K.SETS[b].name));
      grouped = order.map(k => { const SS = K.SETS[k], worn = g[k].filter(x => x.owner).length;
        return `<section class="fg-sg" style="--ec:${SS.ess ? AFF_COL[SS.ess] : '#d9b45a'}"><header>${essBadge(SS.ess) || '<span class="fg-ess"></span>'}<div><b>${esc(SS.name)}</b><div class="fg-tiers">${setTiersOf(k).map(([t, d]) => `<span>${t} pc: ${esc(d)}</span>`).join(' · ')}</div></div><span class="fg-cnt">${g[k].length} ${g[k].length === 1 ? 'piece' : 'pieces'}${worn ? ` · ${worn} worn` : ''}</span></header><div class="fg-cells">${g[k].map(gearCell).join('')}</div></section>`; }).join('')
        + (matCells ? `<div class="fg-cells it-grid it-mats">${matCells}</div>` : '');
    }
    const o = VT.open && !VT.sell ? S.inv.find(it => it.id === VT.open) : null, mo = !o && FG.mat ? mats.find(m => m.k + m.id === FG.mat) : null;
    const detail = o ? `<div class="fg-detail rar-${o.rar}" style="--rc:var(--r${o.rar})"><div class="fg-big">${gearIcon(o, 'fg-ic')}<span class="fg-plv">+${o.lvl}</span>${essBadge(setEss(o.set))}</div>
        <div class="fg-dmain"><h3 class="rartxt">${itemNameH(o)}</h3><div class="fg-dsub">${esc(K.SETS[o.set].name)} · ${o.owner && C[o.owner] ? `worn by <b>${esc(C[o.owner].short)}</b>` : 'not worn'}</div><div class="fg-dstats">${K.gearStats(o).map(([k, v]) => `<span>${K.STAT_NAMES[k]}</span><b>${fmtVal(k, v)}</b><i></i>`).join('')}</div></div>
        <div class="fg-acts"><button type="button" class="btn primary" data-act="iequip" data-item="${o.id}">Equip on… ›</button><button type="button" class="btn" data-act="vlock" data-item="${o.id}">${o.lock ? 'Unlock' : o.owner && C[o.owner] ? `Lock to ${esc(C[o.owner].short)}` : 'Lock'}</button>${sellable(o) ? `<button type="button" class="btn danger" data-act="sell" data-item="${o.id}">Sell · ${K.sellValue(o).toLocaleString('en-US')}</button>` : ''}</div><div class="it-up">${fgForge(o)}</div></div>`
      : mo ? `<div class="fg-detail mat"><div class="fg-big">${mo.ic}</div><div class="fg-dmain"><h3>${esc(mo.name)} ×${mo.n.toLocaleString('en-US')}</h3><p class="empty-note">${esc(mo.tip)}</p></div><div class="fg-acts"><button type="button" class="btn primary" ${mo.go === 'fcs' ? 'data-act="fcopen">Use on your hero ›' : `data-act="go" data-go="${mo.go}">${mo.go === 'altaar' ? 'Fate Altar ›' : 'Heroes ›'}`}</button></div></div>` : '';
    const selItems = S.inv.filter(it => VT.sel.has(it.id)), selValue = selItems.reduce((t, it) => t + K.sellValue(it), 0);
    const tools = VT.sell
      ? `<span class="it-shown">${selItems.length} selected</span><button type="button" class="btn small" data-act="vquick" data-r="2">Spare up to Rare</button><button type="button" class="btn small" data-act="vquick" data-r="-1">None</button><button type="button" class="btn small" data-act="vsellmode">Done</button>`
      : `<span class="it-shown">${(showGear ? list.length : 0) + showMats.length} shown</span><button type="button" class="btn small primary" data-act="vsellmode" ${showGear ? '' : 'disabled'}>Select to sell</button>`;

    return `<div class="it">
      <section class="fg-head it-head" style="--forge:url(${CHAPTER_BG[2]})"><div><h1>Vault</h1><p>Everything you own in one place. Filter, lock what you want to keep and sell the rest.</p></div>
        <div class="it-cats">${[['all', 'All'], ['gear', 'Gear'], ['stone', 'Stones'], ['shard', 'Fate Shards'], ['elixir', 'Elixirs']].map(([k, l]) => `<button type="button" class="${FG.cat === k ? 'on' : ''}" data-act="icat" data-k="${k}">${l} <small>${cnt[k]}</small></button>`).join('')}</div></section>
      <div class="it-work">${filters}<section class="fg-panel it-list"><div class="it-tools">${tools}</div>
        ${gearCells || matCells ? `<div class="fg-groups">${grouped}</div>` : '<p class="empty-note">Nothing matches these filters.</p>'}
        ${VT.sell ? `<div class="it-sellbar"><span><b>${selItems.length}</b> selected · ${ic('coin')} <b>${selValue.toLocaleString('en-US')}</b> · worn and locked pieces cannot be sold</span><button type="button" class="btn danger" data-act="vsell" ${selItems.length ? '' : 'disabled'}>Sell ${selItems.length || ''}</button></div>` : ''}</section></div></div>
      ${detail && !VT.sell ? `<div class="it-pop" data-act="iclose"><div class="it-pop-box ${o ? 'gear' : 'mat'}" data-act="inop" role="dialog" aria-modal="true" aria-label="${esc(o ? itemName(o) : mo.name)}"><button type="button" class="it-x" data-act="iclose" aria-label="Close">✕</button>${detail}</div></div>` : ''}`;
  }
  function forgeHtml() { return itemsHtml(); }

  // ================= PLAYER PROFILES =================
  // Friends and guild mates can be opened (0007_profiles.sql, player_profile): their best 5 champions by power (tap
  // one to see the gear it wears), arena rating and rank, their best Boss Hall levels and the furthest campaign stage.
  const PF = { id: null, data: null, err: '', sel: null };
  async function openProfile(uid) {
    Object.assign(PF, { id: uid, data: null, err: '', sel: null }); renderProfile();
    try { PF.data = await cloud().rpc('player_profile', { other: uid }); if (!PF.data) PF.err = 'This profile is only visible to friends and guild mates.'; }
    catch (e) { PF.err = 'Could not load the profile. Check your connection and try again.'; }
    if (PF.id === uid) renderProfile();
  }
  function renderProfile() { const m = $('#modal'); m.innerHTML = `<div class="modal-box pf-box" role="dialog" aria-modal="true" aria-label="Player profile">${profileBody()}</div>`; m.hidden = false; }
  function profileBody() {
    const close = '<button class="btn small pf-close" data-act="pfclose" aria-label="Close">✕</button>';
    if (!PF.data) return close + (PF.err ? `<p class="ar-err">${esc(PF.err)}</p>` : '<p class="empty-note">Loading the profile…</p>');
    const p = PF.data, roster = p.roster || {}, gear = p.gear || [];
    const itemsFor = id => gear.filter(it => it.owner === id);
    const heroes = Object.keys(roster).filter(id => C[id] && roster[id] && roster[id].lvl).map(id => ({ id, h: roster[id], pw: power(K.heroStats(id, roster[id], itemsFor(id))) })).sort((a, b) => b.pw - a.pw).slice(0, 5);
    if (!PF.sel || !heroes.some(x => x.id === PF.sel)) PF.sel = heroes[0] && heroes[0].id;
    // furthest campaign stage: the hardest difficulty with progress, else Easy
    const dcl = Array.isArray(p.dcl) ? p.dcl : [];
    let d = 0, idx = p.cleared ?? -1;
    for (let i = K.DIFFS.length - 1; i >= 1; i--) if ((dcl[i] ?? -1) >= 0) { d = i; idx = dcl[i]; break; }
    const st = idx >= 0 && K.STAGES[idx];
    const camp = st ? `<b>${K.DIFFS[d].name}</b><span>Chapter ${ROMAN[st.chapter]} · Stage ${st.n + 1}${idx === K.STAGES.length - 1 ? ' · complete' : ''}</span>` : '<b>Not started</b><span>No stage cleared yet</span>';
    const bh = Object.entries(p.bh || {}).filter(([id, n]) => K.BOSSES[id] && n > 0).sort((a, b) => b[1] - a[1] || K.BOSS_ORDER.indexOf(b[0]) - K.BOSS_ORDER.indexOf(a[0]));
    const tier = p.rating ? K.arenaTier(p.rating) : null;
    const card = (label, body, cls) => `<section class="pf-stat ${cls || ''}"><span class="tag">${label}</span>${body}</section>`;
    const bossRows = bh.slice(0, 3).map(([id, n]) => `<li>${por(id)}<span>${esc(K.BOSSES[id].name)}</span><b>Lv ${n}</b></li>`).join('');
    const sel = heroes.find(x => x.id === PF.sel);
    const slots = sel ? K.SLOTS.map(slot => { const it = itemsFor(sel.id).find(x => x.slot === slot); return it
      ? `<div class="pf-item rar-${it.rar}">${gearIcon(it)}<div><b class="rartxt">${itemNameH(it)}</b><small>${esc(K.SETS[it.set] ? K.SETS[it.set].name : '')}</small>${itemStatsHtml(it)}</div></div>`
      : `<div class="pf-item empty"><span class="pf-slot">${SLOT_GLYPH[slot] || ''}</span><div><b>${K.SLOT_NAMES[slot]}</b><small>Empty</small></div></div>`; }).join('') : '';
    // a friend: their friend code and Remove (the friends list shows only portrait, name and level)
    const isFriend = (SO.friends || []).some(f => f.kind === 'friend' && f.user_id === PF.id);
    const frBits = isFriend ? `<small class="fr-fc pf-fc">Friend code ${friendCode(PF.id).replace(/^(.{4})/, '$1 ')}</small><button class="btn small pf-rm" data-act="frremove" data-id="${PF.id}" data-name="${esc(p.name)}">Remove friend</button>` : '';
    return `${close}<header class="pf-head">${p.avatar && C[p.avatar] ? por(p.avatar) : ''}<div><h2>${esc(p.name)}</h2><span class="empty-note">Player level ${p.lvl || 1}${p.guild ? ` · ${esc(p.guild)}` : ''}</span>${frBits}</div></header>
      <div class="pf-stats">
        ${card('Arena', tier ? `<b>${p.rating} · ${esc(tier.name)}</b><span>Rank #${p.rank}</span>` : '<b>Unranked</b><span>No arena fights yet</span>', 'arena')}
        ${card('Campaign', camp, 'camp')}
        ${card('Boss Hall', `<b>${bh.length} / ${K.BOSS_ORDER.length} bosses beaten</b>${bossRows ? `<ul class="pf-bosses">${bossRows}</ul>` : '<span>No boss beaten yet</span>'}`, 'boss')}
      </div>
      <h3 class="pf-h">Best champions</h3>
      <div class="pf-heroes">${heroes.map(x => `<button type="button" class="pf-hero rar-${C[x.id].rar} ${x.id === PF.sel ? 'sel' : ''}" data-act="pfhero" data-id="${x.id}">${por(x.id)}<span class="lv">${x.h.lvl}</span><b>${esc(C[x.id].short || C[x.id].name)}</b>${starStr(x.h.stars || K.baseStars(x.id), K.maxStars(x.id))}<small>Power ${x.pw.toLocaleString('en-US')}</small></button>`).join('') || '<p class="empty-note">No champions yet.</p>'}</div>
      ${sel ? `<h3 class="pf-h">${esc(C[sel.id].name)}'s gear</h3><div class="pf-gear">${slots}</div>` : ''}`;
  }

  // ================= DAILY LOGIN REWARDS =================
  // Once per UTC day, on the homebase, a popup hands out that day's reward: a 7-day cycle that grows towards day 7.
  // Missing a day does not reset anything: the next claim is simply the next day.
  // S.login = { last: UTC day number of the last claim, n: claims so far }.
  // ---------- Ascension Stones (K.STONES): S.stones = Lesser, S.stx = { greater, ancient } ----------
  const stoneN = t => (t === 'lesser' ? S.stones : (S.stx && S.stx[t]) || 0);
  function addStones(o) { S.stx = S.stx || {}; for (const t in o || {}) { const n = Math.floor(+o[t] || 0); if (n <= 0) continue; if (t === 'lesser') S.stones += n; else if (t === 'greater' || t === 'ancient') S.stx[t] = (S.stx[t] || 0) + n; } }
  const stoneName = (t, n) => K.STONES.find(s => s.id === t).name + (n === 1 ? '' : 's');
  const stoneIc = t => ic('stone', 'ic st-' + t);
  // a reward's stones as { lesser, greater, ancient }: the old field `stones` is Lesser, `st` holds the others
  const rewardStones = r => Object.assign({}, +r.stones > 0 ? { lesser: +r.stones } : {}, r.st || {});
  const stoneParts = r => Object.entries(rewardStones(r)).filter(([, n]) => n > 0);
  const LOGIN_REWARDS = [{ silver: 2000 }, { fs: { greater: 2 } }, { fs: { greater: 2 } }, { fs: { ancient: 1 } }, { silver: 10000 }, { stones: 5, st: { greater: 2 } }, { fs: { ancient: 1 }, gems: 30 }];
  const loginReward = n => LOGIN_REWARDS[n % 7];
  const loginDue = () => !noHero() && S.seen.home && S.seen.tour && (S.login ? S.login.last : -1) < today();
  let loginShown = false;
  function rewardIcons(r) {
    return [...(r.silver ? [`${ic('coin')}<b>${r.silver.toLocaleString('en-US')}</b>`] : []), ...(r.gems ? [`${GEM_SVG}<b>${r.gems}</b>`] : []), ...stoneParts(r).map(([t, n]) => `${stoneIc(t)}<b>${n}</b>`), ...Object.keys(r.fs || {}).map(k => `${shardIc(k)}<b>${r.fs[k]}</b>`)].join('');
  }
  function showLogin() {
    if (loginShown || !loginDue() || !$('#modal').hidden || document.querySelector('.unlock-pop')) return;
    loginShown = true;
    const n = (S.login && S.login.n) || 0, start = n - (n % 7), week = Math.floor(n / 7) + 1;
    // each reward as medallion icons and a short amount line
    const parts = r => [...(r.silver ? [[ic('coin'), `${r.silver.toLocaleString('en-US')} Sigils`]] : []), ...(r.gems ? [[GEM_SVG, `${r.gems} Crystals`]] : []), ...stoneParts(r).map(([t, n]) => [stoneIc(t), `${n} ${t[0].toUpperCase() + t.slice(1)} ${n === 1 ? 'Stone' : 'Stones'}`]), ...Object.keys(r.fs || {}).map(k => [shardIc(k), `${r.fs[k]} ${K.SHARD[k].name.replace(' Fate Shard', '').replace('Fate Shard', 'Fate')} ${r.fs[k] === 1 ? 'Shard' : 'Shards'}`])];
    const tiles = Array.from({ length: 7 }, (_, i) => {
      const k = start + i, r = loginReward(k), state = k < n ? 'done' : k === n ? 'today' : 'next', p = parts(r);
      const ribbon = state === 'today' ? '<span class="lg-rib">Today</span>' : i === 6 ? '<span class="lg-rib best">Best</span>' : '';
      return `<li class="lg-day ${state} ${i === 6 ? 'big' : ''}">${ribbon}<span class="lg-n">Day ${i + 1}</span><span class="lg-medal">${p.map(x => x[0]).join('')}</span><span class="lg-amt">${p.map(x => `<b>${x[1]}</b>`).join('')}</span>${state === 'done' ? '<span class="lg-ok" aria-label="claimed">✓</span>' : ''}</li>`;
    }).join('');
    const el = document.createElement('div');
    el.className = 'unlock-pop login-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Daily reward');
    el.innerHTML = `<div class="unlock-card login-card"><div class="lg-head"><span class="lg-orn" aria-hidden="true"></span><span class="tag">Daily reward · week ${week}</span><span class="lg-orn" aria-hidden="true"></span></div>
      <h2>Welcome back!</h2><p class="lg-sub">Log in every day to collect a reward. Day 7 holds the best one.</p><ol class="lg-days">${tiles}</ol>
      <button class="btn primary lg-claim" type="button">Claim day ${n % 7 + 1}</button><small class="lg-foot">A new reward every day at midnight (UTC). Missing a day loses nothing.</small></div>`;
    document.body.appendChild(el);
    el.querySelector('button').addEventListener('click', () => {
      if (!loginDue()) { el.remove(); return; }
      const r = loginReward(n);
      grantGift(r); S.login = { last: today(), n: n + 1 }; save(); hud(); SFX.up();
      el.remove(); toast(`Daily reward: ${giftParts(r).join(' · ')}`, false, 3500);
      setTimeout(showDiscord, 1500);
      if (tab === 'home') render();
    });
    el.querySelector('button').focus();
  }

  // ================= TOWN HALL: QUESTS, MISSIONS, COLLECTION, ACHIEVEMENTS =================
  // The Town Hall has five tabs (TH.tab): Profile, Quests (daily + weekly), Missions (a long path of goals in chapters),
  // Collection (heroes and captured enemies ever owned) and Achievements (tiered feats). Rewards lean on Energy,
  // Greater and Ancient Fate Shards. Everything runs client-side like the campaign, so nothing here pays out between players.
  // S.q = { day, dn: { quest: count today }, dp: daily points, dc: [daily chests claimed], wk, wp, wc: weekly points/chests,
  //   tot: { counter: lifetime count }, m: { mission or 'f<chapter>': 1 }, col: { milestone: 1 }, a: { achievement: tiers claimed },
  //   hs: { hero ever owned: 1 }, be: { enemy ever captured: 1 } }
  const TH = { tab: 'profile' };
  const EN_SVG = typeof ENERGY_ART !== 'undefined' ? `<img class="en-ic" src="${ENERGY_ART}" alt="">` : '<svg class="en-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 1 3 9h4.2L6 15l7-8.5H8.8z"/></svg>';
  const weekNo = () => Math.floor((today() + 3) / 7); // weeks start on Monday 00:00 UTC
  // daily quests: points per quest; quests for modes that are still locked show what opens them
  const QUESTS = [
    { id: 'login', n: 1, pts: 10, t: 'Log in' },
    { id: 'camp', n: 5, pts: 20, t: 'Win 5 campaign battles', go: 'campagne' },
    { id: 'energy', n: 60, pts: 15, t: 'Spend 60 Energy', go: 'campagne', open: () => S.cleared >= 6, need: 'clearing Chapter I' },
    { id: 'upg', n: 3, pts: 15, t: 'Upgrade gear 3 times', go: 'team' },
    { id: 'feed', n: 1, pts: 10, t: 'Feed a hero or train a skill', go: 'team' },
    { id: 'summon', n: 1, pts: 10, t: 'Summon a hero at the Fate Altar', go: 'altaar', u: 'altaar' },
    { id: 'exp', n: 1, pts: 10, t: 'Send out an expedition', go: 'expedition', u: 'expedition' },
    { id: 'tower', n: 1, pts: 15, t: 'Fight in the Tower of Essence', go: 'tower', u: 'tower' },
    { id: 'siege', n: 1, pts: 10, t: 'Defend the Siege', go: 'siege', u: 'siege' },
    { id: 'boss', n: 1, pts: 15, t: 'Win a Boss Hall battle', go: 'kerkers', u: 'kerkers' },
    { id: 'arena', n: 2, pts: 15, t: 'Attack twice in the Arena', go: 'arena', u: 'arena', acc: true },
    { id: 'gboss', n: 1, pts: 10, t: 'Fight the Guild Boss', go: 'guild', u: 'guild', acc: true },
  ];
  const qOpen = t => (!t.u || unlocked(t.u)) && (!t.open || t.open()) && (!t.acc || signedIn());
  const qNeed = t => (t.u && !unlocked(t.u) ? `Opens after ${needTxt(t.u)}` : t.open && !t.open() ? `Opens after ${t.need}` : t.acc && !signedIn() ? 'Needs an account: sign in first' : '');
  const DAILY_CHESTS = [{ at: 30, r: { energy: 10, silver: 2000 } }, { at: 60, r: { energy: 20, fs: { fate: 1 } } }, { at: 100, r: { energy: 30, fs: { greater: 1 }, gems: 10 } }];
  const WEEKLY_CHESTS = [{ at: 250, r: { energy: 40, fs: { greater: 2 }, gems: 15 } }, { at: 450, r: { energy: 60, fs: { greater: 3, ancient: 1 }, gems: 25 } }, { at: 650, r: { energy: 80, fs: { ancient: 2 }, gems: 40 } }];
  function qState() {
    const q = S.q || (S.q = {}), d = today(), w = weekNo();
    q.tot = q.tot || {}; q.m = q.m || {}; q.col = q.col || {}; q.a = q.a || {}; q.hs = q.hs || {}; q.be = q.be || {};
    if (q.wk !== w) { q.wk = w; q.wp = 0; q.wc = []; }
    if (q.day !== d) { q.day = d; q.dn = {}; q.dp = 0; q.dc = []; qAdd(q, 'login', 1, true); }
    return q;
  }
  function qAdd(q, k, n, quiet) {
    q.tot[k] = (q.tot[k] || 0) + n;
    const t = QUESTS.find(x => x.id === k); if (!t || !qOpen(t)) return;
    const was = q.dn[k] || 0; q.dn[k] = was + n;
    if (was < t.n && was + n >= t.n) { q.dp += t.pts; q.wp += t.pts; if (!quiet) toast(`Daily quest done: ${t.t} · +${t.pts} points`, false, 3000); }
  }
  // count an action for the quests and achievements (k: a QUESTS id, or a lifetime-only counter such as 'asc', 'flaw')
  function track(k, n = 1) { if (!S || noHero() || !(n > 0)) return; qAdd(qState(), k, n); }
  const qBest = (k, v) => { const q = qState(); q.tot[k] = Math.max(q.tot[k] || 0, v); };
  // collection: heroes and captured enemies ever owned (feeding one away keeps it in the collection)
  const isHeroId = id => C[id] && !C[id].captured && !C[id].dev;
  const BEASTS = Object.keys(K.ENEMIES).filter(id => C[id] && C[id].captured);
  function colSync() {
    const q = qState();
    for (const id in S.roster) { if (isHeroId(id)) q.hs[id] = 1; else if (C[id] && C[id].captured) q.be[id] = 1; }
    for (const id in S.fodder) if (C[id] && C[id].captured) q.be[id] = 1;
    return q;
  }
  const heroesAt = f => Object.keys(S.roster).filter(id => isHeroId(id) && f(S.roster[id])).length;
  const bestHero = k => Object.keys(S.roster).reduce((m, id) => Math.max(m, S.roster[id][k] || 0), 0);
  const bestGear = () => S.inv.reduce((m, it) => Math.max(m, it.lvl || 0), 0);
  const bestTower = () => Math.max(0, ...Object.values((S.tw && S.tw.prog) || {}));
  const bhAt = n => Object.values(S.bh).filter(x => x >= n).length;
  const tot = k => (qState().tot[k] || 0);
  const everHeroes = () => K.CHAMP_ORDER.filter(id => colSync().hs[id]).length;
  // the mission path: chapters of six goals; a chapter's final reward needs all six claimed, and only the current chapter is open
  const MISSIONS = [
    { name: 'First Steps', r: { energy: 50, fs: { greater: 2 }, gems: 50 }, list: [
      { t: 'Clear Chapter I on Easy', v: () => S.cleared + 1, n: 7, r: { energy: 30, silver: 2000 } },
      { t: 'Have 4 heroes', v: () => heroesAt(() => true), n: 4, r: { fs: { fate: 2 } } },
      { t: 'Upgrade gear 5 times', v: () => tot('upg'), n: 5, r: { silver: 3000 } },
      { t: 'Reach player level 5', v: () => effLvl(S), n: 5, r: { fs: { greater: 1 } } },
      { t: 'Summon a hero at the Fate Altar', v: () => S.p.st.summons, n: 1, r: { energy: 30 } },
      { t: 'Feed a hero or train a skill', v: () => tot('feed'), n: 1, r: { stones: 5 } }] },
    { name: 'Rising Power', r: { hero: 'epic', energy: 50, gems: 75 }, list: [
      { t: 'Clear Chapter III on Easy', v: () => S.cleared + 1, n: 21, r: { fs: { greater: 1 } } },
      { t: 'Bring a hero to level 30', v: () => bestHero('lvl'), n: 30, r: { energy: 50 } },
      { t: 'Upgrade a piece of gear to +8', v: bestGear, n: 8, r: { silver: 5000 } },
      { t: 'Win 50 battles', v: () => S.p.st.won, n: 50, r: { energy: 40 } },
      { t: 'Send out an expedition', v: () => tot('exp'), n: 1, r: { fs: { fate: 2 } } },
      { t: 'Ascend a hero to 4★', v: () => bestHero('stars'), n: 4, r: { stones: 10 } }] },
    { name: 'Proving Grounds', r: { energy: 100, fs: { ancient: 1 }, gems: 100 }, list: [
      { t: 'Clear Chapter V on Easy', v: () => S.cleared + 1, n: 35, r: { fs: { ancient: 1 } } },
      { t: 'Beat 3 different Boss Hall bosses', v: () => bhAt(1), n: 3, r: { fs: { greater: 2 } } },
      { t: 'Reach floor 25 in a Tower of Essence', v: bestTower, n: 25, r: { energy: 60 } },
      { t: 'Have 4 heroes at level 40', v: () => heroesAt(h => h.lvl >= 40), n: 4, r: { fs: { greater: 1 } } },
      { t: 'Upgrade a piece of gear to +12', v: bestGear, n: 12, r: { silver: 10000 } },
      { t: 'Win 10 Boss Hall battles', v: () => S.p.st.bossWon, n: 10, r: { energy: 60 } }] },
    { name: 'Champion of Fate', r: { hero: 'epic', fs: { ancient: 1 }, gems: 150 }, list: [
      { t: 'Finish the campaign on Easy', v: () => S.cleared + 1, n: 70, r: { fs: { ancient: 1 } } },
      { t: 'Ascend a hero to 5★', v: () => bestHero('stars'), n: 5, r: { energy: 80, st: { greater: 2 } } },
      { t: 'Beat Boss Hall level 5 of any boss', v: () => bhAt(5), n: 1, r: { fs: { greater: 3 } } },
      { t: 'Reach floor 75 in a Tower of Essence', v: bestTower, n: 75, r: { fs: { ancient: 1 } } },
      { t: 'Upgrade a piece of gear to +16', v: bestGear, n: 16, r: { silver: 20000 } },
      { t: 'Reach player level 30', v: () => effLvl(S), n: 30, r: { fs: { greater: 2 } } }] },
    { name: 'Legend', r: { hero: 'legendary', gems: 200 }, list: [
      { t: 'Finish the campaign on Normal', v: () => (S.dcl[1] ?? -1) + 1, n: 70, r: { fs: { ancient: 2 } } },
      { t: 'Ascend a hero to 6★', v: () => bestHero('stars'), n: 6, r: { energy: 120, st: { ancient: 2 } } },
      { t: 'Beat Boss Hall level 8 of any boss', v: () => bhAt(8), n: 1, r: { fs: { ancient: 1 } } },
      { t: 'Reach floor 150 in a Tower of Essence', v: bestTower, n: 150, r: { fs: { ancient: 1 } } },
      { t: 'Clear Chapter V on Hard', v: () => (S.dcl[2] ?? -1) + 1, n: 35, r: { fs: { greater: 3 } } },
      { t: 'Collect 30 different heroes', v: everHeroes, n: 30, r: { energy: 100 } }] },
  ];
  const misChapter = () => { const q = qState(); const i = MISSIONS.findIndex((_, c) => !q.m['f' + c]); return i < 0 ? MISSIONS.length : i; };
  const misDone = m => Math.min(m.n, m.v()) >= m.n;
  // collection milestones: heroes ever owned, each essence and rarity complete, and the Bestiary of captured enemies
  const RAR_FULL = [[1, { fs: { greater: 2 } }], [2, { fs: { ancient: 1 } }], [3, { fs: { ancient: 2 } }], [4, { fs: { mythic: 1 } }]];
  const COL_HEROES = [[5, { energy: 30 }], [10, { fs: { greater: 1 } }], [15, { energy: 60 }], [20, { fs: { greater: 2 } }], [25, { fs: { ancient: 1 } }], [30, { energy: 100 }], [40, { fs: { ancient: 1 } }], [K.CHAMP_ORDER.length, { fs: { mythic: 1 } }]];
  const COL_BEASTS = [[5, { energy: 20 }], [10, { fs: { greater: 1 } }], [20, { energy: 50 }], [30, { fs: { greater: 2 } }], [40, { fs: { ancient: 1 } }], [BEASTS.length, { energy: 100, fs: { ancient: 1 } }]];
  const essHeroes = e => K.CHAMP_ORDER.filter(id => C[id].aff === e);
  const rarHeroes = r => K.CHAMP_ORDER.filter(id => C[id].rar === r);
  function colList() {
    const q = colSync(), have = ids => ids.filter(id => q.hs[id]).length, nb = BEASTS.filter(id => q.be[id]).length, nh = everHeroes();
    return [
      ...COL_HEROES.map(([n, r]) => ({ id: 'h' + n, t: `Collect ${n} heroes`, v: nh, n, r })),
      ...K.ESSENCES.filter(e => essHeroes(e).length).map(e => ({ id: 'e' + e, t: `Every ${e} hero`, v: have(essHeroes(e)), n: essHeroes(e).length, r: { fs: { ancient: 1 }, gems: 30 }, ess: e })),
      ...RAR_FULL.map(([ra, r]) => ({ id: 'r' + ra, t: `Every ${K.RARITIES[ra]} hero`, v: have(rarHeroes(ra)), n: rarHeroes(ra).length, r, rar: ra })),
      ...COL_BEASTS.map(([n, r]) => ({ id: 'b' + n, t: `Capture ${n} kinds of enemies`, v: nb, n, r })),
    ];
  }
  // achievements: tiers with growing rewards
  const ACH_RW = [{ energy: 40, gems: 10 }, { energy: 60, fs: { greater: 1 }, gems: 20 }, { energy: 80, fs: { greater: 2 }, gems: 30 }, { energy: 100, fs: { ancient: 1 }, gems: 50 }, { energy: 120, fs: { ancient: 1 }, gems: 75 }];
  const diffsDone = () => { let n = 0; while (n < K.DIFFS.length && clearedOn(n) >= K.STAGES.length - 1) n++; return n; };
  const plural = (n, one, many) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
  const ACH = [
    { id: 'won', name: 'Battle-Hardened', t: n => `Win ${plural(n, 'battle', 'battles')}`, v: () => S.p.st.won, at: [100, 500, 2000, 5000] },
    { id: 'diff', name: 'Conqueror', t: n => `Finish the campaign on ${K.DIFFS[n - 1].name}`, v: diffsDone, at: [1, 2, 3, 4, 5] },
    { id: 'boss', name: 'Boss Slayer', t: n => `Win ${plural(n, 'Boss Hall battle', 'Boss Hall battles')}`, v: () => S.p.st.bossWon, at: [10, 100, 300, 1000] },
    { id: 'bh10', name: 'Hall of Legends', t: n => `Beat level 10 of ${plural(n, 'Boss Hall boss', 'Boss Hall bosses')}`, v: () => bhAt(10), at: [1, 5, 15, K.BOSS_ORDER.length] },
    { id: 'tower', name: 'Tower Climber', t: n => `Reach floor ${n} in a Tower of Essence`, v: bestTower, at: [50, 100, 200, 300] },
    { id: 'towers', name: 'Master of Essences', t: n => `Reach floor 100 in ${plural(n, 'Tower of Essence', 'Towers of Essence')}`, v: () => Object.values((S.tw && S.tw.prog) || {}).filter(f => f >= 100).length, at: [3, K.TOWERS.length] },
    { id: 'siege', name: 'Gatekeeper', t: n => `Hold the Siege until wave ${n}`, v: () => (S.sg && S.sg.best) || 0, at: [50, 100, 200, 300, 500] },
    { id: 'solo', name: 'Lone Wolf', t: n => `Clear floor ${n} of a Tower of Essence with a single hero`, v: () => tot('solo'), at: [10, 25, 50] },
    { id: 'flaw', name: 'Untouchable', t: n => `Win ${plural(n, 'Nightmare stage', 'Nightmare stages')} without losing a hero`, v: () => tot('flaw'), at: [1, 25, 100] },
    { id: 'stars', name: 'Ascendant', t: n => `Ascend ${plural(n, 'hero', 'heroes')} to 6★`, v: () => heroesAt(h => h.stars >= 6), at: [1, 4, 10] },
    { id: 'smith', name: 'Master Smith', t: n => `Upgrade gear ${plural(n, 'time', 'times')}`, v: () => tot('upg'), at: [100, 500, 2000] },
    { id: 'myth', name: 'Mythical Hoard', t: n => `Own ${plural(n, 'piece', 'pieces')} of Mythical gear`, v: () => S.inv.filter(it => it.rar === 5).length, at: [1, 6, 24] },
    { id: 'summ', name: 'Summoner', t: n => `Summon ${plural(n, 'hero', 'heroes')}`, v: () => S.p.st.summons, at: [10, 100, 500] },
    { id: 'exp', name: 'Seafarer', t: n => `Send out ${plural(n, 'expedition', 'expeditions')}`, v: () => tot('exp'), at: [10, 50, 200] },
    { id: 'arena', name: 'Gladiator', t: n => `Attack ${plural(n, 'time', 'times')} in the Arena`, v: () => tot('arena'), at: [10, 100, 500] },
    { id: 'gboss', name: 'Guild Champion', t: n => `Fight the Guild Boss ${plural(n, 'time', 'times')}`, v: () => tot('gboss'), at: [10, 100, 300] },
    { id: 'plvl', name: 'Veteran', t: n => `Reach player level ${n}`, v: () => effLvl(S), at: [25, 50, 100] },
    { id: 'pres', name: 'Reborn', t: n => `Prestige ${plural(n, 'time', 'times')}`, v: () => S.p.prestige || 0, at: [1, 3, 5] },
  ];
  // what can be claimed right now, per tab (badges on the Town Hall and its tabs)
  function thClaims() {
    if (!S || noHero()) return { quests: 0, missions: 0, collection: 0, achievements: 0 };
    const q = qState(), c = misChapter(), mc = MISSIONS[c];
    const quests = DAILY_CHESTS.filter((x, i) => q.dp >= x.at && !q.dc.includes(i)).length + WEEKLY_CHESTS.filter((x, i) => q.wp >= x.at && !q.wc.includes(i)).length;
    const missions = mc ? mc.list.filter((m, i) => !q.m[c + '.' + i] && misDone(m)).length + (mc.list.every((m, i) => q.m[c + '.' + i]) ? 1 : 0) : 0;
    const collection = colList().filter(x => !q.col[x.id] && x.v >= x.n).length;
    const achievements = ACH.filter(a => (q.a[a.id] || 0) < a.at.length && a.v() >= a.at[q.a[a.id] || 0]).length;
    return { quests, missions, collection, achievements };
  }
  const thClaimN = () => { const c = thClaims(); return c.quests + c.missions + c.collection + c.achievements; };
  // a reward as small chips; `hero` is 'epic' or 'legendary' (a random one you do not own yet, rolled on claim)
  function rwChips(r) {
    const out = [];
    if (r.energy) out.push(`<span class="rw en">${EN_SVG}<b>${r.energy}</b></span>`);
    if (r.gems) out.push(`<span class="rw gem">${GEM_SVG}<b>${r.gems}</b></span>`);
    for (const k of RW_KEYS) if (r.fs && r.fs[k]) out.push(`<span class="rw" title="${esc(K.SHARD[k].name)}">${shardIc(k)}<b>${r.fs[k]}</b></span>`);
    for (const [t, n] of stoneParts(r)) out.push(`<span class="rw" title="${esc(stoneName(t, n))}">${stoneIc(t)}<b>${n}</b></span>`);
    if (r.silver) out.push(`<span class="rw">${ic('coin')}<b>${r.silver.toLocaleString('en-US')}</b></span>`);
    if (r.hero) out.push(`<span class="rw hero rar-${r.hero === 'legendary' ? 4 : 3}"><b>${r.hero === 'legendary' ? 'Legendary' : 'Epic'} hero</b></span>`);
    return `<span class="rws">${out.join('')}</span>`;
  }
  function rollHero(rar) { const all = K.CHAMP_ORDER.filter(id => C[id].rar === rar), fresh = all.filter(id => !S.roster[id]); return K.pick(fresh.length ? fresh : all); }
  function claimReward(r, what) {
    const g = { ...r }; if (r.hero) g.hero = rollHero(r.hero === 'legendary' ? 4 : 3);
    grantGift(g); save(); hud(); SFX.up(); render();
    if (g.hero) { const m = $('#modal'); m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><h2>${esc(what)}</h2><p class="tag">A new hero joins you</p><div class="mvp th-hero">${por(g.hero, 2)}<span><b class="rartxt rar-${C[g.hero].rar}">${esc(C[g.hero].name)}</b> · ${K.RARITIES[C[g.hero].rar]} ${esc(C[g.hero].role)}</span></div><ul class="rewards">${giftParts(g).filter(x => !x.startsWith('Hero')).map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="modal-actions"><button class="btn primary" data-act="modal" data-go="close">Great!</button></div></div>`; m.hidden = false; }
    else toast(`${what}: ${giftParts(g).join(' · ')}`, false, 4000);
  }
  function thClaim(a) {
    const q = qState(), k = a.dataset.k, i = +a.dataset.i;
    if (k === 'd' || k === 'w') {
      const list = k === 'd' ? DAILY_CHESTS : WEEKLY_CHESTS, got = k === 'd' ? q.dc : q.wc, pts = k === 'd' ? q.dp : q.wp;
      if (!list[i] || got.includes(i) || pts < list[i].at) return;
      got.push(i); claimReward(list[i].r, `${k === 'd' ? 'Daily' : 'Weekly'} chest`);
    } else if (k === 'm') {
      const c = misChapter(), m = MISSIONS[c] && MISSIONS[c].list[i];
      if (!m || q.m[c + '.' + i] || !misDone(m)) return;
      q.m[c + '.' + i] = 1; claimReward(m.r, 'Mission complete');
    } else if (k === 'mf') {
      const c = misChapter(), mc = MISSIONS[c];
      if (!mc || !mc.list.every((m, j) => q.m[c + '.' + j])) return;
      q.m['f' + c] = 1; claimReward(mc.r, `Missions: ${mc.name} complete`);
    } else if (k === 'c') {
      const x = colList().find(y => y.id === a.dataset.id);
      if (!x || q.col[x.id] || x.v < x.n) return;
      q.col[x.id] = 1; claimReward(x.r, 'Collection reward');
    } else if (k === 'a') {
      const x = ACH.find(y => y.id === a.dataset.id), t = x && (q.a[x.id] || 0);
      if (!x || t >= x.at.length || x.v() < x.at[t]) return;
      q.a[x.id] = t + 1; claimReward(ACH_RW[t], `Achievement: ${x.name}`);
    }
  }
  const thBar = (v, n) => `<span class="th-bar"><i style="width:${Math.min(100, Math.round(v / n * 100))}%"></i></span>`;
  const claimBtn = (k, extra, ok, label) => `<button class="btn small ${ok ? 'primary' : ''}" data-act="thclaim" data-k="${k}" ${extra} ${ok ? '' : 'disabled'}>${label || 'Claim'}</button>`;
  function chestsHtml(list, pts, got, k, max) {
    return `<div class="th-track"><span class="th-bar big"><i style="width:${Math.min(100, Math.round(pts / max * 100))}%"></i></span>${list.map((c, i) => {
      const st = got.includes(i) ? 'done' : pts >= c.at ? 'ready' : '';
      return `<div class="th-chest ${st}" style="--x:${Math.round(c.at / max * 100)}%"><button type="button" class="th-chest-b" data-act="thclaim" data-k="${k}" data-i="${i}" ${st === 'ready' ? '' : 'disabled'} aria-label="Chest at ${c.at} points${st === 'done' ? ' (claimed)' : st === 'ready' ? ': claim' : ''}">${CHEST_SVG}</button><b>${c.at}</b>${rwChips(c.r)}</div>`;
    }).join('')}</div>`;
  }
  const CHEST_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="lid" d="M3 10V7.5C3 5 5 3.5 7.5 3.5h9C19 3.5 21 5 21 7.5V10z"/><path class="box" d="M3 10h18v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path class="band" d="M10 8.5h4v4.5h-4z"/></svg>';
  function questsHtml() {
    const q = qState(), now = Date.now();
    const rows = QUESTS.map(t => {
      const open = qOpen(t), v = Math.min(t.n, q.dn[t.id] || 0), done = v >= t.n;
      return `<li class="th-row ${done ? 'done' : ''} ${open ? '' : 'locked'}"><span class="th-pts">+${t.pts}</span><span class="th-main"><b>${t.t}</b>${open ? `${thBar(v, t.n)}<small>${v.toLocaleString('en-US')} / ${t.n.toLocaleString('en-US')}</small>` : `<small>${qNeed(t)}</small>`}</span>${done ? '<span class="th-ok" aria-label="done">✓</span>' : open && t.go ? `<button class="btn small" data-act="go" data-go="${t.go}">Go</button>` : ''}</li>`;
    }).join('');
    const weekLeft = ((q.wk + 1) * 7 - 3) * 86400000 - now;
    return `<section class="th-sec"><div class="th-head"><h3>Daily quests</h3><small class="empty-note">New quests in ${fmtLeft(86400000 - now % 86400000)}</small></div>
        <p class="empty-note">Finish quests for points. Every chest along the bar opens at its points: energy, Sigils and Fate Shards.</p>
        ${chestsHtml(DAILY_CHESTS, q.dp, q.dc, 'd', 100)}<p class="th-score"><b>${q.dp}</b> daily points today</p><ul class="th-list">${rows}</ul></section>
      <section class="th-sec"><div class="th-head"><h3>Weekly chests</h3><small class="empty-note">Resets in ${weekLeft > 86400000 ? `${Math.floor(weekLeft / 86400000)} d ${Math.floor(weekLeft % 86400000 / 3600000)} h` : fmtLeft(weekLeft)} (Monday, UTC)</small></div>
        <p class="empty-note">Every daily point also counts for the week. Keep at it for Greater Fate Shards and an Ancient Fate Shard.</p>
        ${chestsHtml(WEEKLY_CHESTS, q.wp, q.wc, 'w', 650)}<p class="th-score"><b>${q.wp}</b> points this week</p></section>`;
  }
  function missionsHtml() {
    const q = qState(), c = misChapter();
    const path = MISSIONS.map((m, i) => `<li class="${i < c ? 'done' : i === c ? 'on' : ''}"><span>${i + 1}</span><b>${m.name}</b></li>`).join('');
    if (c >= MISSIONS.length) return `<section class="th-sec"><ol class="th-path">${path}</ol><p class="lede">You completed every mission. More are on the way!</p></section>`;
    const mc = MISSIONS[c], all = mc.list.every((m, i) => q.m[c + '.' + i]);
    const rows = mc.list.map((m, i) => {
      const got = q.m[c + '.' + i], v = Math.min(m.n, Math.max(0, m.v())), ok = v >= m.n;
      return `<li class="th-row ${got ? 'done' : ''}"><span class="th-main"><b>${m.t}</b>${thBar(v, m.n)}<small>${v.toLocaleString('en-US')} / ${m.n.toLocaleString('en-US')}</small></span>${rwChips(m.r)}${got ? '<span class="th-ok" aria-label="claimed">✓</span>' : claimBtn('m', `data-i="${i}"`, ok)}</li>`;
    }).join('');
    const n = mc.list.filter((m, i) => q.m[c + '.' + i]).length;
    return `<section class="th-sec"><ol class="th-path">${path}</ol>
      <div class="th-head"><h3>Chapter ${c + 1}: ${mc.name}</h3><small class="empty-note">${n} / ${mc.list.length} claimed</small></div>
      <ul class="th-list">${rows}</ul>
      <div class="th-final ${all ? 'ready' : ''}"><span><b>Chapter reward</b><small>${all ? 'Claim it to open the next chapter.' : 'Claim all six missions to earn it.'}</small></span>${rwChips(mc.r)}${claimBtn('mf', '', all)}</div></section>`;
  }
  function collectionHtml() {
    const q = colSync(), list = colList(), get = p => list.filter(x => x.id[0] === p);
    const ms = xs => `<ul class="th-ms">${xs.map(x => `<li class="${q.col[x.id] ? 'done' : x.v >= x.n ? 'ready' : ''}"><b>${x.n}</b>${rwChips(x.r)}${q.col[x.id] ? '<span class="th-ok" aria-label="claimed">✓</span>' : claimBtn('c', `data-id="${x.id}"`, x.v >= x.n)}</li>`).join('')}</ul>`;
    const face = (id, have) => `<span class="th-face ${have ? '' : 'miss'} rar-${C[id].rar}" title="${esc(C[id].name)}${have ? '' : ' (not collected yet)'}">${por(id)}</span>`;
    const group = (x, ids, chip) => `<li class="th-grp ${q.col[x.id] ? 'done' : ''}"><div class="th-grp-h">${chip}<b>${x.t}</b><small>${x.v} / ${x.n}</small>${rwChips(x.r)}${q.col[x.id] ? '<span class="th-ok" aria-label="claimed">✓</span>' : claimBtn('c', `data-id="${x.id}"`, x.v >= x.n)}</div><div class="th-faces">${ids.map(id => face(id, q.hs[id])).join('')}</div></li>`;
    const nh = everHeroes(), nb = BEASTS.filter(id => q.be[id]).length;
    return `<section class="th-sec"><div class="th-head"><h3>Heroes</h3><small class="empty-note">${nh} / ${K.CHAMP_ORDER.length} collected</small></div>
        ${thBar(nh, K.CHAMP_ORDER.length)}<p class="empty-note">Every hero you ever owned counts, also the ones you fed away.</p>${ms(get('h'))}</section>
      <section class="th-sec"><div class="th-head"><h3>By essence</h3></div><ul class="th-grps">${get('e').map(x => group(x, essHeroes(x.ess), affChip(x.ess))).join('')}</ul></section>
      <section class="th-sec"><div class="th-head"><h3>By rarity</h3></div><ul class="th-grps">${get('r').map(x => group(x, rarHeroes(x.rar), '')).join('')}</ul></section>
      <section class="th-sec"><div class="th-head"><h3>Bestiary</h3><small class="empty-note">${nb} / ${BEASTS.length} kinds captured</small></div>
        ${thBar(nb, BEASTS.length)}<p class="empty-note">Campaign battles sometimes capture an enemy. Every kind you catch fills a page.</p>${ms(get('b'))}
        <div class="th-faces beasts">${BEASTS.map(id => face(id, q.be[id])).join('')}</div></section>`;
  }
  function achievementsHtml() {
    const q = qState();
    const total = ACH.reduce((s, a) => s + a.at.length, 0), have = ACH.reduce((s, a) => s + (q.a[a.id] || 0), 0);
    const cards = ACH.map(a => {
      const t = q.a[a.id] || 0, maxed = t >= a.at.length, n = a.at[Math.min(t, a.at.length - 1)], v = a.v(), ok = !maxed && v >= n;
      const pips = a.at.map((_, i) => `<i class="${i < t ? 'on' : ''}"></i>`).join('');
      return `<li class="th-ach ${maxed ? 'done' : ok ? 'ready' : ''}"><div class="th-ach-h"><b>${a.name}</b><span class="th-pips" aria-label="Tier ${t} of ${a.at.length}">${pips}</span></div>
        <small>${maxed ? `Complete: ${a.t(a.at[a.at.length - 1])}` : a.t(n)}</small>${maxed ? '' : `${thBar(Math.min(v, n), n)}<div class="th-ach-f"><small>${Math.min(v, n).toLocaleString('en-US')} / ${n.toLocaleString('en-US')}</small>${rwChips(ACH_RW[t])}${claimBtn('a', `data-id="${a.id}"`, ok)}</div>`}</li>`;
    }).join('');
    return `<section class="th-sec"><div class="th-head"><h3>Achievements</h3><small class="empty-note">${have} / ${total} tiers</small></div>${thBar(have, total)}<ul class="th-achs">${cards}</ul></section>`;
  }
  // ----- global leaderboards (Town Hall tab): campaign, Boss Hall (all bosses or one), arena, Tower of Essence (all
  // towers or one). The rows come from the `leaderboard` database function (0003 + 0010); the arena list adds the bots.
  const LB = { kind: 'campaign', rows: null, err: '', loading: '' };
  // players who never picked a name (still "Adventurer") stay off every leaderboard (the database leaves them out too,
  // 0014_leaderboard_names.sql; this also covers a database without that file)
  const named = rows => rows.filter(r => !/^\s*adventurer\s*$/i.test(r.name || 'Adventurer'));
  async function lbLoad(kind) {
    const cl = cloud();
    LB.kind = kind; LB.rows = null; LB.err = '';
    if (!cl || !cl.signedIn()) return;
    LB.loading = kind; if (tab === 'profiel' && !B) render();
    let rows = null;
    // the guilds have their own function (0012_guild_board.sql): 'guilds' = this week, 'guilds:all', 'guilds:best'
    try { rows = kind.startsWith('guilds') ? await cl.rpc('guild_board', { kind: kind.split(':')[1] || 'week' }) : await cl.rpc('leaderboard', { kind }); } catch (e) { LB.err = 'The leaderboard could not be loaded.'; }
    if (LB.kind !== kind) return;
    LB.rows = kind.startsWith('guilds') ? rows || [] : named(rows || []); LB.loading = '';
    if (tab === 'profiel' && TH.tab === 'leaders' && !B) render();
  }
  function leadersHtml() {
    const cl = cloud();
    if (!cl || !cl.enabled) return '<section class="th-sec"><p class="empty-note">Leaderboards need the online version of the game.</p></section>';
    if (!cl.signedIn()) return `<section class="th-sec"><div class="lockbox">${LOCK_SVG}<div><h3>Sign in to see the leaderboards</h3><p class="empty-note">Rankings are read from the accounts of signed-in players.</p><button class="btn primary" data-act="account">Sign in or create an account</button></div></div></section>`;
    if (!LB.rows && !LB.err && LB.loading !== LB.kind) lbLoad(LB.kind);
    const main = LB.kind.split(':')[0], sub = LB.kind.split(':')[1] || '';
    const groups = [['campaign', 'Campaign'], ['bosses', 'Boss Hall'], ['arena', 'Arena'], ['tower', 'Tower of Essence'], ['siege', 'Siege'], ['guilds', 'Guilds']];
    const seg = `<div class="seg" role="group" aria-label="Leaderboard">${groups.map(([k, l]) => `<button type="button" data-act="lbkind" data-kind="${k}" aria-pressed="${main === k || (k === 'bosses' && main === 'boss')}">${l}</button>`).join('')}</div>`;
    // Boss Hall and the towers: everything together, or one boss / one tower
    const pick = main === 'bosses' || main === 'boss' ? `<label class="lb-pick">Boss <select id="lb-sub" data-base="boss" data-all="bosses"><option value="">All bosses (total levels)</option>${K.BOSS_ORDER.map(id => `<option value="${id}" ${sub === id ? 'selected' : ''}>${esc(K.BOSSES[id].name)}</option>`).join('')}</select></label>`
      : main === 'tower' ? `<label class="lb-pick">Tower <select id="lb-sub" data-base="tower" data-all="tower"><option value="">All towers (total floors)</option>${K.TOWERS.map(e => `<option value="${e}" ${sub === e ? 'selected' : ''}>${twName(e)}</option>`).join('')}</select></label>`
      : main === 'guilds' ? `<label class="lb-pick">Rank by <select id="lb-sub" data-base="guilds" data-all="guilds">${[['', 'Guild boss points this week'], ['all', 'Guild boss points of all time'], ['best', 'Biggest single hit']].map(([v, l]) => `<option value="${v}" ${sub === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : '';
    const fmt = r => main === 'guilds' ? `${Math.round(Number(r.score)).toLocaleString('en-US')} ${sub === 'best' ? 'damage' : 'points'}` : main === 'arena' ? `${r.score} rating · ${r.detail.wins} W / ${r.detail.losses} L` : main === 'campaign' ? campaignText(r)
      : main === 'bosses' ? `${r.score} boss levels${r.detail && r.detail.maxed ? ` · ${r.detail.maxed} maxed` : ''}` : main === 'boss' ? `Level ${r.score} / ${K.BOSS_LEVELS}`
      : main === 'siege' ? `Wave ${r.score} / ${K.SIEGE.waves}${r.detail && r.detail.kills ? ` · ${Number(r.detail.kills).toLocaleString('en-US')} enemies defeated` : ''}`
      : sub ? `Floor ${r.score} / ${K.TOWER.floors}` : `${r.score.toLocaleString('en-US')} floors${r.detail && r.detail.best ? ` · best ${r.detail.best}` : ''}`;
    const list = LB.rows && main === 'arena' ? LB.rows.concat(boardBots()).sort((a, b) => b.score - a.score) : LB.rows;
    const rows = list ? list.map(r => main === 'guilds' ? `<li class="${r.me ? 'me' : ''}"><span class="lb-rank">${r.rank}</span>${emblem(r)}<span class="lb-name"><b>${esc(r.name)}</b><small class="empty-note">${r.members} ${r.members === 1 ? 'member' : 'members'} · ${Number(r.hits).toLocaleString('en-US')} boss ${Number(r.hits) === 1 ? 'fight' : 'fights'}</small></span><span class="lb-score">${fmt(r)}</span></li>` : `<li class="${r.me ? 'me' : ''}${r.bot ? ' bot' : ''}"><span class="lb-rank">${r.bot ? '–' : r.rank}</span>${r.avatar && C[r.avatar] ? por(r.avatar) : '<span class="lb-noav"></span>'}<span class="lb-name"><b>${esc(r.name)}</b>${r.bot ? '<small class="empty-note">Arena bot</small>' : r.lvl ? `<small class="empty-note">Player level ${r.lvl}</small>` : ''}</span><span class="lb-score">${fmt(r)}</span></li>`).join('') : '';
    const note = main === 'guilds' ? 'Every guild ranked by its guild boss fights (counted by the server), plus your own guild. A fight counts for the guild its player was in at the time.' : main === 'arena' ? 'Ratings from fights the server played; arena bots have no rank.' : 'Top 100 of every player with an account, plus your own place.';
    return `<section class="th-sec lbg"><div class="th-head"><h3>Leaderboards</h3>${seg}</div>${pick}<p class="empty-note">${note}</p>
      ${LB.err ? `<p class="ar-err">${esc(LB.err)}</p>` : !LB.rows ? '<p class="empty-note">Loading…</p>' : rows ? `<ol class="lb">${rows}</ol>` : '<p class="empty-note">Nobody here yet. Be the first!</p>'}</section>`;
  }
  function townHallHtml() {
    const c = thClaims(), dot = n => (n ? `<span class="dot" aria-label="${n} to claim"></span>` : '');
    const tabs = [['profile', 'Profile', 0], ['quests', 'Quests', c.quests], ['missions', 'Missions', c.missions], ['collection', 'Collection', c.collection], ['achievements', 'Achievements', c.achievements], ['leaders', 'Leaderboards', 0], ['settings', `${svgIcon('gear')}Settings`, 0]];
    const bar = `<div class="dtabs th-tabs" role="tablist" aria-label="Town Hall">${tabs.map(([k, l, n]) => `<button type="button" role="tab" data-act="thtab" data-t="${k}" aria-selected="${TH.tab === k}">${l}${dot(n)}</button>`).join('')}</div>`;
    // on a phone on its side the tab's content scrolls in its own box below the tabs (.th-body.lfit), so the page never does
    return bar + `<div class="th-body lfit">${TH.tab === 'quests' ? questsHtml() : TH.tab === 'missions' ? missionsHtml() : TH.tab === 'collection' ? collectionHtml() : TH.tab === 'achievements' ? achievementsHtml() : TH.tab === 'leaders' ? leadersHtml() : TH.tab === 'settings' ? settingsHtml() : profileHtml()}</div>`;
  }

  // ----- Fate Changing Stone: turn your Fateborn into another one (another class and/or gender) -----
  // A stone comes from the Market (the first one free, then FCS_PRICE Crystals; at most one held). Using it moves
  // everything to the new hero: level, XP, stars and skills (they follow the level), all its gear (locks too), its
  // places in every team and Tower team, the avatar; the name stays. One change every FCS_CD. S.fcs = { n, got, at }:
  // stones held, stones ever bought (the first is free), when the last change was made.
  const FCS_PRICE = 50, FCS_CD = 72 * 3600e3;
  const fcs = () => S.fcs || (S.fcs = { n: 0, got: 0, at: 0 });
  const fcsPrice = () => (fcs().got ? FCS_PRICE : 0);
  const fcsWait = () => Math.max(0, (fcs().at || 0) + FCS_CD - Date.now());
  const FCS_SVG = '<svg class="fcs-ic" viewBox="0 0 24 24" aria-hidden="true"><path class="fcs-g" d="M12 2.5l6.5 5.5-2.3 12.5H7.8L5.5 8z"/><path d="M8.6 11.2a3.8 3.8 0 0 1 6.6-1.6M15.4 13.2a3.8 3.8 0 0 1-6.6 1.6"/><path d="M15.4 7.6v2.1h-2.1M8.6 16.6v-2.1h2.1"/></svg>';
  let fcSel = null;
  function fcsHtml() {
    const cur = heroId(), sel = fcSel || (fcSel = { cls: C[cur].pcClass, g: C[cur].pcGender }), nid = `pc_${sel.cls}_${sel.g}`, p = K.PC_CLASSES[sel.cls], r = S.roster[cur];
    const st = fcs(), wait = fcsWait(), same = nid === cur;
    const cards = Object.keys(K.PC_CLASSES).map(k => { const id = `pc_${k}_${sel.g}`; return `<button type="button" class="pc-card ${k === sel.cls ? 'sel' : ''}" data-act="fccls" data-k="${k}" aria-pressed="${k === sel.cls}"><span class="pc-por">${por(id)}</span><b>${K.PC_CLASSES[k].name}</b>${k === C[cur].pcClass ? '<small>Now</small>' : ''}</button>`; }).join('');
    const g = (k, label) => `<button type="button" class="btn small ${sel.g === k ? 'primary' : ''}" data-act="fcg" data-g="${k}" aria-pressed="${sel.g === k}">${label}</button>`;
    const now = K.heroStats(cur, r, itemsOf(cur)), next = K.heroStats(nid, r, itemsOf(cur));
    const cmp = ['hp', 'atk', 'def', 'spd'].map(k => { const d = next[k] - now[k]; return `<span>${K.STAT_NAMES[k]}</span><b>${next[k].toLocaleString('en-US')}</b><i class="${d > 0 ? 'u' : d < 0 ? 'd' : ''}">${d ? (d > 0 ? '▲ ' : '▼ ') + Math.abs(d).toLocaleString('en-US') : ''}</i>`; }).join('');
    const why = same ? 'This is your hero now: pick another class or gender.' : !st.n ? 'You need a Fate Changing Stone from the Market.' : wait ? `You changed your hero recently: the next change is possible in ${fmtLeft(wait)}.` : '';
    return `<div class="modal-box fcs-box" role="dialog" aria-modal="true" aria-labelledby="fcs-q"><button class="btn small pf-close" data-act="fcclose" aria-label="Close">✕</button>
      <h2 id="fcs-q">${FCS_SVG} Change your Fateborn</h2>
      <p class="lede">Turn <b>${esc(S.hero.name)}</b> into another Fateborn. Level, XP, stars, skill levels and all gear move to the new hero; the name stays. One change every 72 hours.</p>
      <div class="pc-row"><span class="tag">Choose your new hero</span><div class="seg pc-g">${g('m', 'Male')}${g('f', 'Female')}</div></div>
      <div class="pc-cards fcs-cards">${cards}</div>
      <div class="fcs-info">${por(nid)}<div><h3>${esc(S.hero.name)} · ${esc(p.name)}</h3><div class="tags">${affChip('Aether')} Aether · ${roleStr(C[nid])} · Level ${r.lvl}</div>
        <div class="skill passive"><b>Passive · ${esc(p.passiveName)}</b><p>${esc(p.passiveDesc)}</p></div>
        <ul class="starter-sk">${p.skills.map((s, i) => `<li><b>${SKILL_TAG[i]}</b> ${esc(s.name)} <span>${esc(s.desc)}</span></li>`).join('')}</ul>
        ${same ? '' : `<div class="fg-dstats fcs-stats">${cmp}</div><small class="empty-note">Stats with your current gear, ▲/▼ against now.</small>`}</div></div>
      <div class="fcs-foot"><span class="fcs-have">${FCS_SVG} ${st.n} Fate Changing ${st.n === 1 ? 'Stone' : 'Stones'}</span>${why ? `<small class="empty-note">${why}</small>` : ''}
        <div class="modal-actions">${!st.n && !same ? `<button class="btn primary" data-act="fcmarket">${fcsPrice() ? `Get one in the Market (${fcsPrice()} Crystals)` : 'Get your free stone in the Market'}</button>` : `<button class="btn primary" data-act="fcgo" ${why ? 'disabled' : ''}>Change to ${esc(p.name)}</button>`}<button class="btn" data-act="fcclose">Cancel</button></div></div></div>`;
  }
  function fcsOpen() { if (!heroId()) return; fcSel = null; const m = $('#modal'); m.innerHTML = fcsHtml(); m.hidden = false; }
  const fcsPaint = () => { const m = $('#modal'); if (!m.hidden && m.querySelector('.fcs-box')) m.innerHTML = fcsHtml(); };
  function changeHero(nid) {
    const old = heroId(), st = fcs();
    if (!old || nid === old || !C[nid] || !C[nid].pc || st.n < 1 || fcsWait()) return;
    S.roster[nid] = { ...S.roster[old] }; delete S.roster[old];
    for (const it of S.inv) if (it.owner === old) it.owner = nid;
    const swap = ids => { if (Array.isArray(ids)) ids.forEach((x, i) => { if (x === old) ids[i] = nid; }); };
    S.teams.forEach(t => swap(t.ids));
    if (S.tw && S.tw.team) Object.values(S.tw.team).forEach(swap);
    if (S.p.avatar === old) S.p.avatar = nid;
    if (S.starter === old) S.starter = nid;
    if (selChamp === old) selChamp = nid;
    C[old].name = C[old].short = 'Fateborn ' + K.PC_CLASSES[C[old].pcClass].name;
    S.hero.id = nid; S.hero.cls = C[nid].pcClass; S.hero.g = C[nid].pcGender;
    st.n--; st.at = Date.now();
    linkTeams(S); syncHero(S); SPR.loadSheet && SPR.loadSheet(nid);
    save(); $('#modal').hidden = true; render(); SFX.up();
    toast(`${S.hero.name} is now a Fateborn ${K.PC_CLASSES[S.hero.cls].name}. Level, gear and team places came along.`, false, 4500);
  }

  // ================= GEMS AND THE MARKET =================
  // Crystals (S.gems) are the premium currency: earned from level-ups (LEVEL_GEMS), the daily and weekly quest chests,
  // missions, achievements, collection, login day 7 and mail gifts ({ "gems": n }); spent in the Market (the tree
  // building on the homebase). Every offer has a limit per UTC day or week (S.mk); the energy refill gets dearer per buy.
  const LEVEL_GEMS = 10;
  const GEM_SVG = typeof CRYSTAL_ART !== 'undefined' ? `<img class="gem-ic" src="${CRYSTAL_ART}" alt="">` : '';
  // Bought Crystals (0015_wallet.sql) live on the server, not in the save: PAID.n is the balance read from there
  // (wallet_mine), and only the server adds to it. The game shows earned + bought as one number (gemsAll) and spends
  // the earned ones first, then the bought ones through wallet_spend (payGems), so an edited save cannot mint them.
  const PAID = { n: 0, at: 0 };
  const gemsAll = () => (S.gems || 0) + PAID.n;
  async function paidLoad() {
    const cl = cloud(); PAID.at = Date.now(); if (!cl || !cl.signedIn()) { PAID.n = 0; return; }
    try { const n = await cl.rpc('wallet_mine'); PAID.n = Math.max(0, +n || 0); } catch (e) { PAID.n = 0; } // no wallet table yet: nothing bought
    hud(); if (tab === 'market') render();
  }
  // pay a price in Crystals: true when paid; the bought part is taken by the server first, so a failed call costs nothing
  async function payGems(price, item) {
    const own = Math.min(S.gems || 0, price), rest = price - own;
    if (rest > 0) {
      if (rest > PAID.n) { toast(`Not enough Crystals: this costs ${price}, you have ${gemsAll()}.`, true); return false; }
      try { PAID.n = Math.max(0, +(await cloud().rpc('wallet_spend', { amount: rest, item })) || 0); }
      catch (e) { toast(/not enough/i.test(String(e && e.message)) ? 'Not enough Crystals.' : 'Could not reach the server. Nothing was spent: try again.', true); paidLoad(); return false; }
    }
    S.gems -= own; return true;
  }
  const MARKET = [
    { id: 'energy', group: 'Energy', name: 'Energy Refill', desc: '+100 Energy, on top of your bar (you can hold up to twice your bar). Dearer with every refill on the same day.', r: { energy: 100 }, price: [30, 40, 60, 80, 100], per: 'day' },
    { id: 'fate', group: 'Fate Shards', name: K.SHARD.fate.name, desc: 'Summons a hero at the Fate Altar, mostly Uncommon or Rare.', r: { fs: { fate: 1 } }, price: 15, limit: 10, per: 'day' },
    { id: 'greater', group: 'Fate Shards', name: K.SHARD.greater.name, desc: 'Better odds on Rare and Epic heroes.', r: { fs: { greater: 1 } }, price: 90, limit: 3, per: 'day' },
    { id: 'ancient', group: 'Fate Shards', name: K.SHARD.ancient.name, desc: 'Epic and Legendary heroes; counts for the Epic pity.', r: { fs: { ancient: 1 } }, price: 300, limit: 3, per: 'week' },
    { id: 'sil10', group: 'Sigils', name: '10,000 Sigils', desc: 'For gear upgrades, ascending and Fate Shards.', r: { silver: 10000 }, price: 25, limit: 5, per: 'day' },
    { id: 'sil50', group: 'Sigils', name: '50,000 Sigils', desc: 'A big pouch: a little cheaper per Sigil.', r: { silver: 50000 }, price: 110, limit: 2, per: 'day' },
    { id: 'stl', group: 'Ascension Stones', name: '10 Lesser Ascension Stones', desc: 'Ascend heroes to 2-4★.', r: { stones: 10 }, price: 30, limit: 3, per: 'day' },
    { id: 'stg', group: 'Ascension Stones', name: '2 Greater Ascension Stones', desc: 'Ascend heroes to 5★.', r: { st: { greater: 2 } }, price: 80, limit: 2, per: 'week' },
    { id: 'fcs', group: 'Fateborn', name: 'Fate Changing Stone', desc: 'Turn your Fateborn into another class or gender. Level, XP, stars, skills and gear all move to the new hero. One change every 72 hours.', fcs: true },
  ];
  function mkState() {
    const m = S.mk || (S.mk = {}), d = today(), w = weekNo();
    if (m.day !== d) { m.day = d; m.d = {}; }
    if (m.wk !== w) { m.wk = w; m.w = {}; }
    return m;
  }
  const mkBought = it => { const m = mkState(); return (it.per === 'week' ? m.w : m.d)[it.id] || 0; };
  const mkLimit = it => (Array.isArray(it.price) ? it.price.length : it.limit);
  const mkPrice = it => (Array.isArray(it.price) ? it.price[Math.min(mkBought(it), it.price.length - 1)] : it.price);
  const MK = { busy: false }; // a purchase waiting for the server: no second one meanwhile
  function mkBuy(id) {
    const it = MARKET.find(x => x.id === id); if (!it) return;
    if (it.fcs) { // the Fate Changing Stone: the first one free, then FCS_PRICE; at most one held
      const price = fcsPrice();
      if (fcs().n >= 1) { fcsOpen(); return; }
      if (gemsAll() < price) { toast(`Not enough Crystals: this costs ${price}, you have ${gemsAll()}.`, true); return; }
      if (MK.busy) return; MK.busy = true;
      payGems(price, 'fcs').then(ok => { MK.busy = false; if (!ok) return;
        fcs().n++; fcs().got++; save(); hud(); SFX.up(); render();
        toast(price ? 'Bought: a Fate Changing Stone. Use it on your Fateborn.' : 'Your free Fate Changing Stone is ready. Use it on your Fateborn.', false, 3500); });
      return;
    }
    const n = mkBought(it), price = mkPrice(it);
    if (n >= mkLimit(it)) { toast(`Sold out for ${it.per === 'week' ? 'this week' : 'today'}.`); return; }
    if (gemsAll() < price) { toast(`Not enough Crystals: this costs ${price}, you have ${gemsAll()}.`, true); return; }
    if (it.r.energy) { energyTick(); if (S.energy + it.r.energy > enCeil()) { toast(`Your energy is nearly full: you can hold at most ${enCeil()} (twice your bar). Spend some first.`, true, 4000); return; } }
    const go = async () => {
      if (MK.busy || gemsAll() < mkPrice(it) || mkBought(it) >= mkLimit(it)) return;
      MK.busy = true; const ok = await payGems(mkPrice(it), it.id); MK.busy = false; if (!ok) return;
      const m = mkState(), book = it.per === 'week' ? m.w : m.d;
      book[it.id] = (book[it.id] || 0) + 1;
      grantGift(it.r); save(); hud(); SFX.up(); render();
      toast(`Bought: ${giftParts(it.r).join(' · ')}.`, false, 3000);
    };
    if (price >= 100) confirmBox('Buy this?', `<b>${esc(it.name)}</b> for <b>${price} Crystals</b>. You have ${gemsAll()}.`, `Buy for ${price} Crystals`, go); else go();
  }
  function marketHtml() {
    if (Date.now() - PAID.at > 30000) setTimeout(paidLoad, 0); // the bought Crystals, fresh when the Market opens
    const icon = it => it.fcs ? `<span class="mk-ic fcs">${FCS_SVG}</span>` : it.r.energy ? `<span class="mk-ic en">${EN_SVG}</span>` : it.r.fs ? `<span class="mk-ic">${shardIc(Object.keys(it.r.fs)[0])}</span>` : it.r.silver ? `<span class="mk-ic">${ic('coin')}</span>` : `<span class="mk-ic">${stoneIc(rewardStones(it.r).greater ? 'greater' : 'lesser')}</span>`;
    const card = it => {
      if (it.fcs) {
        const have = fcs().n >= 1, price = fcsPrice(), wait = fcsWait();
        return `<li class="mk-card">${icon(it)}<div class="mk-main"><b>${esc(it.name)}</b><small>${esc(it.desc)}</small><span class="mk-left">${have ? 'You have one: use it on your hero' : price ? 'Hold one at a time' : 'Your first one is free!'}${wait ? ` · next change in ${fmtLeft(wait)}` : ''}</span></div>
          ${have ? `<button type="button" class="btn primary mk-buy" data-act="fcopen">Use</button>` : `<button type="button" class="btn primary mk-buy" data-act="mkbuy" data-id="${it.id}" ${gemsAll() < price ? 'disabled' : ''}>${price ? GEM_SVG + price : 'Free'}</button>`}</li>`;
      }
      const n = mkBought(it), lim = mkLimit(it), left = lim - n, price = mkPrice(it), out = left <= 0;
      return `<li class="mk-card ${out ? 'out' : ''}">${icon(it)}<div class="mk-main"><b>${esc(it.name)}</b><small>${esc(it.desc)}</small><span class="mk-left">${out ? `Sold out ${it.per === 'week' ? 'this week' : 'today'}` : `${left} of ${lim} left ${it.per === 'week' ? 'this week' : 'today'}`}</span></div>
        <button type="button" class="btn ${out ? '' : 'primary'} mk-buy" data-act="mkbuy" data-id="${it.id}" ${out || gemsAll() < price ? 'disabled' : ''}>${GEM_SVG}${price}</button></li>`;
    };
    const groups = [...new Set(MARKET.map(x => x.group))].map(g => `<section class="mk-sec"><h3>${g}</h3><ul class="mk-list">${MARKET.filter(x => x.group === g).map(card).join('')}</ul></section>`).join('');
    const dayLeft = fmtLeft(86400000 - Date.now() % 86400000);
    return `<div class="section-head"><div><h2>Market</h2><p class="lede">Spend Crystals on Energy, Fate Shards, Sigils and Ascension Stones. Daily offers come back at midnight (UTC, in ${dayLeft}), weekly ones on Monday.</p></div>
        <div class="mk-bal">${GEM_SVG}<b>${gemsAll().toLocaleString('en-US')}</b><small>Crystals</small></div></div>
      <div class="mk-wrap">${groups}</div>
      <section class="mk-sec mk-soon"><h3>Gear</h3><p class="empty-note">Coming soon: gear pieces for Crystals.</p></section>
      <p class="empty-note mk-how">Get Crystals from every player level (+${LEVEL_GEMS}), the daily and weekly quest chests, missions, achievements, your hero collection and day 7 of the login rewards. All in the Town Hall.</p>`;
  }

  // ================= DISCORD =================
  // A popup on the homebase invites players to the Discord, at most once every DISCORD_DAYS days (S.disc = UTC day it
  // was last shown), never during the first steps or the tour, and after the daily reward. The link is also in the
  // ☰ menu and the Town Hall.
  const DISCORD_URL = 'https://discord.gg/xCybP7kkDj', DISCORD_DAYS = 3;
  const DISCORD_SVG = '<svg class="dc-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.6 5.3A17 17 0 0 0 15.4 4l-.5 1a15.7 15.7 0 0 0-5.8 0l-.5-1a17 17 0 0 0-4.2 1.3C1.7 9.3 1 13.2 1.3 17a17 17 0 0 0 5.2 2.6l1.1-1.7a11 11 0 0 1-1.8-.9l.4-.3a12 12 0 0 0 11.6 0l.4.3a11 11 0 0 1-1.8.9l1.1 1.7a17 17 0 0 0 5.2-2.6c.4-4.4-.6-8.3-3.1-11.7zM8.7 14.7c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2zm6.6 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2z"/></svg>';
  const discordDue = () => !noHero() && S.seen.home && S.seen.tour && !loginDue() && today() - (S.disc ?? -99) >= DISCORD_DAYS;
  // a guest (the cloud is on but nobody signed in) is asked every LINK_DAYS days, from the end of Chapter I, to link an
  // email, so the progress that lives only in this browser is safe; S.link = the UTC day it was last asked
  const LINK_DAYS = 3;
  const linkDue = () => { const cl = cloud(); return !!(cl && cl.enabled && !cl.signedIn() && !noHero() && S.seen.home && S.seen.tour && S.cleared >= 6 && !loginDue() && today() - (S.link ?? -99) >= LINK_DAYS); };
  function showLink() {
    if (tab !== 'home' || !linkDue() || !$('#modal').hidden || document.querySelector('.unlock-pop')) return;
    S.link = today(); save();
    showLinkOffer();
  }
  function showDiscord() {
    if (tab !== 'home' || !discordDue() || !$('#modal').hidden || document.querySelector('.unlock-pop')) return;
    S.disc = today(); save();
    const el = document.createElement('div');
    el.className = 'unlock-pop dc-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Join our Discord');
    el.innerHTML = `<div class="unlock-card dc-card">${DISCORD_SVG}<span class="tag">Community</span><h2>Join our Discord</h2>
      <p>Chat with other heroes, find a guild, share your best pulls, report bugs and hear about updates first.</p>
      <a class="btn dc-btn" href="${DISCORD_URL}" target="_blank" rel="noopener">${DISCORD_SVG}Join the Discord</a><button class="btn small" type="button">Not now</button></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('button, a')) el.remove(); });
  }

  // the guild info counter while the Guildmaster types
  document.addEventListener('input', e => { if (e.target.id === 'g-info') { const c = $('#g-count'); if (c) c.textContent = e.target.value.length; } });
  function finishGboss(cfg, b) {
    const f = cfg.fight, m = $('#modal');
    SFX.win();
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><h2>Guild boss</h2><p class="tag">${esc(cfg.title)} · ${K.DIFFS[f.d].name}</p>
      <ul class="rewards"><li><span class="aff" style="--c:var(--ember)">D</span><span>Damage dealt: <b>${f.dmg.toLocaleString('en-US')}</b></span></li>
        <li><span class="aff" style="--c:var(--gold)">P</span><span>+${f.points.toLocaleString('en-US')} points for your Guild Chest (×${K.GBOSS.mult[f.d]})</span></li>
        <li><span class="aff" style="--c:var(--info)">K</span><span>Keys left today: ${f.keysLeft} / ${K.GBOSS.keys}</span></li></ul>
      ${meterHtml(b)}
      <div class="modal-actions"><button class="btn primary" data-act="modal" data-go="gboss">Back to the guild boss</button></div></div>`;
    m.hidden = false; m.querySelector('.btn').focus();
    guildLoad();
  }

  // ================= GUIDE =================
  // Every term and abbreviation in the game, in groups with a search box. Lists (status effects, sets, shards,
  // difficulties, arena tiers) come straight from the engine data, so the guide stays right when numbers change.
  function guideHtml() {
    const row = (term, text, chip) => `<li class="gl-item"><span class="gl-term">${chip || ''}<b>${term}</b></span><span class="gl-text">${text}</span></li>`;
    const sec = (id, title, items) => `<section class="gl-sec" id="gl-${id}"><h3>${title}</h3><ul class="gl-list">${items.join('')}</ul></section>`;
    const pct = n => `${n}%`;
    const fx = Object.entries(K.EFFECTS).map(([k, e]) => row(esc(e.n), esc(e.d) + (e.buff ? '.' : '.'), fxBadge(k)));
    const beats = Object.entries(K.BEATS).map(([a, b]) => `${affChip(a)} ${a} beats ${b}`).join(' · ');
    const sections = [
      sec('battle', 'Battle', [
        row('Turn meter', 'Every unit fills its turn meter by its Speed; whoever reaches 100 first acts. The bar at the top of a battle shows the turn order.'),
        row('Phases', `A stage or Boss Hall level is ${K.PHASES} fights in a row. Survivors keep their HP and recover 15% between phases; fallen heroes stay down.`),
        row('Enrage', `A Boss Hall boss still standing after ${K.ENRAGE.at} of its own turns (${K.ENRAGE.blightAt} for bosses with a Blight Aura) is enraged: +${Math.round(K.ENRAGE.atk * 100)}% Attack, and another stack every ${K.ENRAGE.every} turns. The ⏳ on the boss counts down.`),
        row('Blight Aura', `Boss Hall bosses from level ${K.BLIGHT.bh} on drain your whole team every turn (${Math.round(K.BLIGHT.pct[1] * 100)}% of max HP on levels 3-4, up to ${Math.round(K.BLIGHT.pct[4] * 100)}% on levels 9-10), whatever its Defense. Only healing and shields outlast it; a stunned or broken boss skips it.`),
        row('Skills', 'Every hero has a <b>Basic</b> attack, a <b>Skill</b> and an <b>Ultimate</b>. <b>CD</b> (cooldown) is how many turns a skill needs before it can be used again.'),
        row('Strong / Normal / Weak Hit', 'Decided by essences. <b>Strong Hit</b>: +20% damage, stronger debuffs, 2 Break damage. <b>Normal Hit</b>: normal damage. <b>Weak Hit</b>: −25% damage, no critical hits, half the debuff chance, no Break damage.'),
        row('Critical hit (CRIT)', `A lucky hit that does extra damage: Crit Rate is the chance, Crit Damage the bonus. Crit Rate is capped at ${K.CRIT_CAP}%.`),
        row('Break Meter', 'Bosses have a Break Meter. Strong Hits break it faster.'),
        row('Affinity Break', 'When a boss\'s Break Meter is empty it is stunned for 2 turns and takes 15% more damage.'),
        row('Auto', 'Your heroes pick their own skills and targets. Opens after you clear Chapter I · Stage 1 and stays on until you turn it off.'),
        row('Focus', 'On auto, tap an enemy: all your heroes aim their single-target attacks at it (a red target marks it). Tap it again to clear. Taunt still wins.'),
        row('Speed 1× – 5×', 'How fast battles play. 2× opens at Chapter I · Stage 4, 3× at Chapter III, 5× from Chapter II but only when replaying something you already beat.'),
        row('Formation', 'Tanks and warriors stand in the front line, everyone else behind them.'),
      ]),
      sec('essences', 'Essences', [
        `<li class="gl-item gl-art"><img class="ess-art" src="${ESSENCE_ART}" alt="Essences: Ember beats Verdant, Verdant beats Storm, Storm beats Frost, Frost beats Radiant, Radiant beats Umbral, Umbral beats Ember; Aether is neutral"><span class="gl-text">Every hero and enemy has one. ${beats}. Aether is neutral: it always lands a Normal Hit.</span></li>`,
      ]),
      sec('stats', 'Stats', [
        row('HP', 'Health. At 0 the unit falls.'), row('ATK', 'Attack: how hard a unit hits.'), row('DEF', 'Defense: reduces damage taken.'),
        row('SPD', 'Speed: how quickly the turn meter fills, so how often a unit acts.'), row('CR', `Crit Rate: chance of a critical hit (max ${K.CRIT_CAP}%).`),
        row('CD', 'Crit Damage: extra damage on a critical hit. (In skill cards CD means cooldown.)'), row('ACC', 'Accuracy: raises the chance that your debuffs land.'),
        row('RES', 'Resistance: lowers the chance that enemy debuffs land on you.'),
        row('+% and +flat', 'Gear gives stats as a flat number (Attack +40) or as a percentage of the hero\'s own stat (Attack +8%).'),
        row('Power', 'One number for how strong a hero or team is, from all stats together.'),
      ]),
      sec('effects', 'Status effects (buffs and debuffs)', fx),
      sec('heroes', 'Heroes', [
        row('Rarity', `${[0, 1, 2, 3, 4].map(r => `<b class="rar-${r} rartxt">${K.RARITIES[r]}</b>`).join(' → ')}. Rarer heroes have better stats; Legendary heroes only come from the Fate Altar.`),
        row('Roles', `${Object.keys(K.ROLES).join(', ')}. Tanks protect, Warriors and Assassins deal damage, Supports heal and buff, Controllers debuff.`),
        row('Level and stars (★)', 'Level cap = stars × 10 (up to the rarity\'s cap). At the cap, ascend for another star.'),
        row('Tower of Essence', `Seven towers of ${K.TOWER.floors} floors (homebase, opens after Chapter II): six for the essences, where only heroes of that essence may climb, and the Tower of Fate for every hero, with much tougher foes; each floor is one fight and pays once (Sigils, XP, and shards and stones on boss and milestone floors). No energy needed.`),
        row('Ascend', 'Spend Ascension Stones and Sigils for an extra star: a higher level cap and +5% stats.'),
        row('Feeding', 'Feed a hero you don\'t use, or a spare copy, to another hero for XP. Rarer and higher-level food gives more.'),
        row('Spare copy / duplicate', 'Summoning a hero you already own gives a spare copy. Feed it to the same hero to level up a skill.'),
        row('Skill level', `Each skill can be levelled ${K.SKILL_MAX} times. Every level multiplies the skill's damage, healing and shields by another ${Math.round(K.SKILL_STEP * 100)}% of the base (level 1 ×${(1 + K.SKILL_STEP).toFixed(2)}, level ${K.SKILL_MAX} ×${(1 + K.SKILL_MAX * K.SKILL_STEP).toFixed(2)}): a 90% Attack hit becomes ${Math.round(90 * (1 + K.SKILL_STEP))}% at level 1 and ${Math.round(90 * (1 + K.SKILL_MAX * K.SKILL_STEP))}% at level ${K.SKILL_MAX}. At the maximum the cooldown is also 1 turn shorter.`),
        row('Captured', 'Enemies you capture in the campaign (5% per win) join as weak heroes or as fodder to feed.'),
        row('Essence Elixirs', `One kind per essence. A hero drinks elixirs of its own essence (Team · Upgrade) for the XP of ${K.ELIXIR.wins} campaign wins at its own level; an Aether Elixir fits every hero. They drop now and then: ${Math.round(K.ELIXIR.camp * 100)}% per campaign win (a foe's essence), ${Math.round(K.ELIXIR.hall * 100)}% per Boss Hall win (the boss's essence), and one on the first clear of every 10th Tower floor.`),
        row('Team', 'Up to 4 heroes fight together. Pick them in Heroes and gear them there (tap a gear slot).'),
      ]),
      sec('gear', 'Gear', [
        row('Slots and main stat', `One piece per slot per hero; the slot decides the main stat it can have. <b>Weapon</b>: Attack. <b>Helmet</b>: HP. <b>Shield</b>: Defense. <b>Gloves</b>: Attack %, Defense %, HP %, Crit Rate or Crit Damage. <b>Chestplate</b>: Attack %, Defense %, HP %, Accuracy or Resistance. <b>Boots</b>: Attack %, Defense %, HP % or Speed.`),
        row('Gear rarity', `${[0, 1, 2, 3, 4, 5].map(r => `<b class="rar-${r} rartxt">${K.RARITIES[r]}</b>`).join(' → ')}. Each step adds +20% to the main stat (a Legendary's is 1.8× a Common's). It also sets how many substats a piece starts with: Common 0, Uncommon 1, Rare 2, Epic 3, Legendary and Mythical 4; Mythical rolls its substats 25% higher. Each difficulty drops two rarities: ${Math.round((1 - K.LOOT_UP) * 100)}% the lower one, ${Math.round(K.LOOT_UP * 100)}% the higher (Easy Uncommon / Rare … Nightmare Legendary / Mythical).`),

        row('Substats', 'Random extra stats (Crit Rate, Speed, Attack % and more), each rolled within a range, so two pieces that look alike can differ a lot: a great roll is worth farming for. A piece never has the same stat twice, nor its main stat as a substat.'),
        row(`+1 … +${K.MAX_GEAR_LVL}`, `Upgrade level, paid with Sigils. Each level adds +4.5% to the main stat (+${K.MAX_GEAR_LVL} is +${Math.round(K.MAX_GEAR_LVL * 4.5)}%). At +4, +8, +12 and +16 the piece gains a substat (while it has fewer than four) or boosts one. The chance falls as you climb: 100% at +0, down to ${Math.round(K.upgradeChance({ lvl: K.MAX_GEAR_LVL - 1 }) * 100)}% for the last step. A failed try costs the Sigils, the piece keeps its level.`),
        row(`<span class="asc-st">★</span> Ascension`, `Any +${K.MAX_GEAR_LVL} piece can ascend ${K.MAX_ASC} times with Ascension Stones and Sigils, always successfully. Each orange star adds +10% to all its stats, main stat and substats alike. Only heroes with ${K.ASC_STARS}★ or more can wear ascended gear, whatever their rarity.`),
        row('Sell value', 'Selling gives Sigils; higher rarity, upgrade level and ascension raise the price. Lock a piece so it is never sold by accident.'),
        row('In short', '<b>Rarity</b>: how many stats a piece has and how good its main stat is; harder stages also drop stronger pieces of the same rarity. <b>Substats</b>: the luck of the roll. <b>Upgrade level and ascension</b>: how much you have invested in it. <b>Set</b>: the extra effects it unlocks together with its siblings.'),
        row('Upgrade all', 'Upgrades the gear a hero wears as far as your Sigils go, the most important piece for its role first.'),
        row('Sets', 'Wearing enough pieces of one set gives a bonus; each set counts once, so extra pieces add nothing. <b>Campaign sets</b> (one per chapter) have one bonus at 2 or 4 pieces. <b>Boss sets</b> (one per Boss Hall boss) have bonuses at 2, 4 and 6 pieces: a stat, a mechanic and the boss\'s signature effect. With all six pieces at <span class="asc-st">★★★</span> the 6-piece bonus becomes a stronger <b>Ascended</b> version. Four or more boss set pieces of one essence, from at least two different sets, add a small <b>family bonus</b>.'),
        ...Object.values(K.SETS).map(s => row(esc(s.name), esc(s.desc))),
      ]),
      sec('currency', 'Currencies and summoning', [
        row(`${ic('coin')} Sigils`, `The main currency: gear upgrades, ascending, Fate Shards (${K.SHARD_PRICE.toLocaleString('en-US')} each) and name changes.`),
        row(`${ic('stone')} Ascension Stones`, 'Needed to ascend heroes (extra stars), in three kinds by the star: Lesser (to 2-4★) drop everywhere; Greater (to 5★) from boss stages, Normal and harder, and Boss Hall level 3 on; Ancient (to 6★) only from Brutal and Nightmare boss stages, Boss Hall levels 9-10 and the weekly arena rewards.'),
        ...K.FATE_SHARDS.map(f => row(`${shardIc(f.id)} ${esc(f.name)}`, esc(f.desc))),
        row('Pity', `After ${K.PITY_EPIC} summons without an Epic or better, the next one is at least Epic, and after ${K.PITY_LEG} summons without a Legendary, the next one is Legendary. Only Ancient, Mythic and Legendary Fate Shards count.`),
      ]),
      sec('modes', 'Game modes', [
        row('Campaign', `10 chapters of 7 stages. Each stage drops one gear slot; stage 7 has the chapter boss. Replay cleared stages to farm.`),
        ...K.DIFFS.map((x, i) => row(`${esc(x.name)}`, `${i ? `Enemies level ${K.diffLvl(K.STAGES[0], i)}–${K.diffLvl(K.STAGES[K.STAGES.length - 1], i)}. ` : 'The first run through the campaign. '}Drops ${rarsHtml(x.rars)} gear.${i < K.DIFFS.length - 1 ? ` Clear all ${K.STAGES.length} stages to open ${K.DIFFS[i + 1].name}.` : ''}`)),
        row('Boss Hall', `${K.BOSS_ORDER.length} bosses with ${K.BOSS_LEVELS} levels each. Every two levels match a campaign difficulty: 1-2 Easy, 3-4 Normal, 5-6 Hard, 7-8 Brutal, 9-10 Nightmare, with that difficulty's gear. Opens after clearing Chapter ${ROMAN[UNLOCKS.kerkers.ch - 1]}.`),
        row('Fate Altar', `Summon heroes with Fate Shards. Opens at player level ${PLAYER_UNLOCK.altaar}.`),
        row('Arena', `Fight the defense teams of other players (needs an account, opens after clearing Chapter ${ROMAN[UNLOCKS.arena.ch - 1]}). A fight costs 1 token (max ${K.ARENA_TOKENS}, 1 per hour).`),
        row('Rating and tiers', `Win to gain rating, lose to drop. Tiers: ${K.ARENA_TIERS.map(t => `${t.name} (${t.min}+)`).join(', ')}. Every Monday you get a reward for your tier, plus extra for the top 5.`),
        row('Player level', 'Your account level. Grows with every battle and opens new buildings.'),
        row('Social and mail', 'Add friends with their friend code. Mail holds friend requests, gifts and arena rewards.'),
      ]),
    ];
    const nav = [['battle', 'Battle'], ['essences', 'Essences'], ['stats', 'Stats'], ['effects', 'Effects'], ['heroes', 'Heroes'], ['gear', 'Gear'], ['currency', 'Currencies'], ['modes', 'Modes']];
    return `<div class="guide"><div class="section-head"><div><h2>Guide</h2><p class="lede">Every term and abbreviation in the game.</p></div></div>
      <input class="gl-search" type="search" id="gl-search" placeholder="Search, e.g. STN, Crit, Sigils" aria-label="Search the guide" autocomplete="off">
      <nav class="gl-nav" aria-label="Guide sections">${nav.map(([id, l]) => `<a href="#gl-${id}" data-act="glnav" data-id="${id}">${l}</a>`).join('')}</nav>
      ${sections.join('')}<p class="empty-note gl-none" hidden>Nothing found.</p></div>`;
  }
  // ================= SOCIAL + MAIL =================
  // Friends and mail live in Supabase (0005_social.sql): friend codes and requests, gifts from the server, and the
  // weekly arena rewards. Everything needs a signed-in account; the header's mail button shows how much is waiting.
  const SO = { tab: 'friends', code: '', friends: null, mail: null, invites: [], err: '', who: null, loading: false };
  const RW_KEYS = ['fate', 'greater', 'ancient', 'mythic', 'legendary'];
  const signedIn = () => { const cl = cloud(); return !!(cl && cl.signedIn && cl.signedIn()); };
  // fetches friends and mail; paints the header badge and re-renders an open Social or Mail screen
  async function socialLoad() {
    if (!signedIn()) PAID.n = 0;
    if (!signedIn() || SO.loading) { paintMail(); return; }
    paidLoad(); admCheck();
    // the arena defense follows the heroes (defSync); an account whose defense this device has not seen yet asks once
    if (unlocked('arena') && !defGet() && !AR.busy) arenaCall('state');
    const cl = cloud(), who = cl.info().email;
    if (SO.who !== who) Object.assign(SO, { who, code: '', friends: null, mail: null });
    SO.loading = true;
    try {
      // guild invites (0008) come with the mail; a database without them yet just shows none
      const [code, friends, mail, invites] = await Promise.all([cl.rpc('my_friend_code'), cl.rpc('friend_list'), cl.rpc('mail_list'), cl.rpc('guild_invites').catch(() => [])]);
      Object.assign(SO, { code: code || '', friends: friends || [], mail: mail || [], invites: invites || [], err: '' });
    } catch (e) { SO.err = 'Could not reach the server. Check your connection and try again.'; }
    SO.loading = false;
    paintMail();
    if ((tab === 'social' || tab === 'mail') && !B) render();
  }
  const mailCount = () => (SO.invites || []).length + (SO.friends || []).filter(f => f.kind === 'incoming').length + (SO.mail || []).filter(m => !m.claimed).length;
  // ---------- phone navigation (the Menu button top left): Home and every building in a panel that opens downwards
  // over the screen (the icon column on the left is left out on phones). Locked buildings are dimmed and say what
  // opens them; a dot shows where something waits. ----------
  function navDropHtml() {
    const cur = tab === 'prep' && PREP.tower ? 'tower' : tab === 'prep' && PREP.boss ? 'kerkers' : NAV_OF[tab] || tab, shards = K.FATE_SHARDS.some(f => (S.fs[f.id] || 0) > 0);
    const home = `<button type="button" class="nd-it" data-act="tab" data-tab="home"><span class="nd-ic nd-home"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 15V7l2-1V3h1.6v2.2L8 4l6 3v8H9.8v-4H6.2v4z"/></svg></span><span class="nd-t"><b>Home</b><small>Your homebase</small></span></button>`;
    return `<div class="nd-box" role="menu" aria-label="Buildings">${home}${HOME_LIST.map(z => {
      const locked = !unlocked(z.go), dot = !locked && ((z.go === 'altaar' && shards) || (z.go === 'profiel' && thClaimN()) || (z.go === 'expedition' && expDone()) || (z.go === 'siege' && sgFull()));
      return `<button type="button" class="nd-it ${z.go === cur ? 'on' : ''} ${locked ? 'locked' : ''}" data-act="go" data-go="${z.go}" ${z.go === cur ? 'aria-current="page"' : ''}><span class="nd-ic sn-ic ${z.go}" style="background-image:url(${MENU_ART[z.go]})"></span><span class="nd-t"><b>${esc(z.label)}</b><small>${locked ? `${LOCK_SVG} Opens after ${esc(needTxt(z.go))}` : esc(homeStatus(z.go) || '')}</small></span>${dot ? '<i class="sn-dot" aria-hidden="true"></i>' : ''}</button>`;
    }).join('')}</div>`;
  }
  function setNav(open) {
    const m = $('#navdrop'), b = $('#homebtn'); if (!m || !b) return;
    m.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.classList.toggle('open', !!open);
    if (open) { setMenu(false); m.innerHTML = navDropHtml(); }
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#navdrop').hidden) setNav(false); });
  // ---------- phone menu (☰ in the header): Guide, Mail, profile, sound and music, and the currencies the slim header hides ----------
  function menuHtml() {
    const n = signedIn() ? mailCount() : 0;
    const item = (act, icon, label, extra) => `<button type="button" class="mm-it" data-mm="${act}"><span class="mm-ic">${icon}</span><span>${label}</span>${extra || ''}</button>`;
    return `<div class="mm-box" role="menu">
      <a class="mm-it" href="${DISCORD_URL}" target="_blank" rel="noopener"><span class="mm-ic">${DISCORD_SVG}</span><span>Discord</span></a><a class="mm-it" href="${DISCORD_URL}" target="_blank" rel="noopener" title="Report a bug or share an idea in the Discord"><span class="mm-ic">!</span><span>Feedback and bugs</span></a>${item('events', '★', 'Events')}${ADM.ok ? item('admin', '♛', 'Admin', ADM.rev ? `<b class="mm-n">${ADM.rev > 9 ? '9+' : ADM.rev}</b>` : '') : ''}${item('guide', '?', 'Guide')}${item('mail', '✉', 'Mail', n ? `<b class="mm-n">${n > 9 ? '9+' : n}</b>` : '')}${item('profile', '♜', 'Profile')}
      <div class="mm-it mm-vol">${volSlider('music')}</div><div class="mm-it mm-vol">${volSlider('sfx')}</div>
      <div class="mm-cur"><span class="tag">Crystals</span><span>${GEM_SVG} ${gemsAll().toLocaleString('en-US')} <small>Crystals</small></span>
        <span class="tag">Fate Shards</span>${K.FATE_SHARDS.map(f => `<span>${shardIc(f.id)} ${S.fs[f.id] || 0} <small>${esc(f.name.replace(/ Fate Shard$/, '').replace(/^Fate Shard$/, 'Fate'))}</small></span>`).join('')}
        <span class="tag">Ascension Stones</span>${K.STONES.map(s => `<span>${stoneIc(s.id)} ${stoneN(s.id)} <small>${s.name.replace(/ Ascension Stone$/, '')}</small></span>`).join('')}</div></div>`;
  }
  function setMenu(open) {
    const m = $('#mmenu'), b = $('#menubtn'); if (!m || !b) return;
    m.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) m.innerHTML = menuHtml();
  }
  document.addEventListener('click', e => {
    if (e.target.closest('#menubtn')) { SFX.click(); setMenu($('#mmenu').hidden); return; }
    const it = e.target.closest('[data-mm]');
    if (it) {
      const a = it.dataset.mm; setMenu(false);
      if (a === 'events') { if (B) toast('Not during a battle.', true); else setTab('events'); return; }
      if (a === 'admin') { if (B) toast('Not during a battle.', true); else { ADM.data = null; setTab('admin'); } return; }
      ({ guide: '#guide', mail: '#mail', profile: '#account' })[a] && $(({ guide: '#guide', mail: '#mail', profile: '#account' })[a]).click();
      return;
    }
    if (!$('#mmenu').hidden && !e.target.closest('#mmenu')) setMenu(false);
    if (!$('#navdrop').hidden && !e.target.closest('#navdrop, #homebtn')) setNav(false);
    if (e.target.closest('#homebtn')) { if (B) return; SFX.click(); setNav($('#navdrop').hidden); }
    else if (e.target.closest('#navdrop [data-act]')) setNav(false);
  });
  // ---------- landscape on phones: the game is played sideways. In portrait a cover asks to turn the phone (shell.html
  // .rotate, CSS only); where the browser can (Android Chrome), Fullscreen hides the browser bars and locks landscape.
  // iPhones cannot lock it: there the cover is the only guard. ----------
  const fsCan = () => !!document.documentElement.requestFullscreen && !!(screen.orientation && screen.orientation.lock) && matchMedia('(pointer: coarse)').matches;
  async function goFullscreen() {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return; }
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      try { await screen.orientation.lock('landscape'); } catch (e) {}
    } catch (e) { toast('Fullscreen is not available in this browser.', true); }
  }
  function paintFs() {
    const b = $('#fsbtn'), r = $('#rotate-fs'), ok = fsCan(), on = !!document.fullscreenElement;
    if (b) { b.hidden = !ok; b.title = on ? 'Leave fullscreen' : 'Fullscreen'; b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); }
    if (r) r.hidden = !ok;
  }
  document.addEventListener('fullscreenchange', paintFs);
  document.addEventListener('click', e => { if (e.target.closest('#fsbtn, #rotate-fs')) { SFX.click(); goFullscreen(); } });
  paintFs();
  function paintMail() {
    const b = $('#mail'); if (!b) return;
    const n = signedIn() ? mailCount() : 0, badge = b.querySelector('.mail-n');
    badge.hidden = !n; badge.textContent = n > 9 ? '9+' : n; b.classList.toggle('has', n > 0);
    const mb = document.querySelector('#menubtn .menu-n'); if (mb) { mb.hidden = !n; mb.title = n ? `${n} new in your Mail` : ''; } // the ☰ button: a red square with an envelope while mail waits
    b.title = n ? `Mail: ${n} new` : 'Mail: gifts and friend requests';
  }
  // what a gift gives, as text and as additions to the save
  const giftParts = r => [...(r.hero && C[r.hero] ? [`Hero: ${C[r.hero].name}`] : []), ...(+r.silver > 0 ? [`${(+r.silver).toLocaleString('en-US')} Sigils`] : []), ...(+r.energy > 0 ? [`${(+r.energy).toLocaleString("en-US")} Energy`] : []), ...(+r.gems > 0 ? [`${(+r.gems).toLocaleString('en-US')} Crystals`] : []), ...stoneParts(r).map(([t, n]) => `${n} ${stoneName(t, n)}`), ...RW_KEYS.filter(k => r.fs && +r.fs[k] > 0).map(k => `${+r.fs[k]} ${K.SHARD[k].name}${+r.fs[k] > 1 ? "s" : ""}`)];
  function grantGift(r) {
    // a hero gift (e.g. the developer hero): joins the roster, or becomes a spare copy when already owned
    if (r.hero && C[r.hero]) { if (!S.roster[r.hero]) S.roster[r.hero] = newHero(r.hero); else S.fodder[r.hero] = (S.fodder[r.hero] || 0) + 1; }
    if (+r.silver > 0) S.silver += Math.floor(+r.silver);
    if (r.elx) for (const e of K.ESSENCES) if (+r.elx[e] > 0) S.elx[e] = (S.elx[e] || 0) + Math.floor(+r.elx[e]);
    if (+r.gems > 0) S.gems += Math.floor(+r.gems);
    if (+r.energy > 0) { addEnergy(+r.energy); paintEnergy(); } // may go above the bar (up to its ceiling); regen waits until it drops below
    addStones(rewardStones(r));
    for (const k of RW_KEYS) if (r.fs && +r.fs[k] > 0) S.fs[k] = (S.fs[k] || 0) + Math.floor(+r.fs[k]);
  }
  const progressText = f => f.cleared != null && f.cleared >= 0 && K.STAGES[f.cleared] ? stageName(f.cleared) : 'Just started';
  // a friend as a small tile: portrait, name and player level; everything else (progress, arena, friend code, Remove)
  // is in their profile, which a tap opens
  const friendTile = f => `<li class="fr-tile pf-open" data-act="profile" data-id="${f.user_id}" title="${esc(f.name)}: view profile"><span class="fr-av">${f.avatar && C[f.avatar] ? por(f.avatar) : ''}</span><b>${esc(f.name)}</b><small>Lv ${f.lvl || 1}</small></li>`;
  // a friend row opens their profile (buttons inside keep their own action)
  const personRow = (f, acts) => `<li${f.kind === 'friend' ? ` class="pf-open" data-act="profile" data-id="${f.user_id}" title="View profile"` : ''}><span class="fr-av">${f.avatar && C[f.avatar] ? por(f.avatar) : ''}</span><span class="fr-main"><b>${esc(f.name)}${f.user_id ? ` <small class="fr-fc" title="Friend code">(${friendCode(f.user_id).replace(/^(.{4})/, '$1 ')})</small>` : ''}</b><small class="empty-note">${f.lvl ? `Player level ${f.lvl} · ` : ''}${esc(progressText(f))}${f.rating ? ` · Arena ${f.rating}` : ''}</small></span><span class="fr-acts">${acts}</span></li>`;
  function needAccount(title) {
    const cl = cloud();
    if (!cl || !cl.enabled) return `<p class="empty-note">${title} needs the online version of the game.</p>`;
    return `<div class="lockbox">${LOCK_SVG}<div><h3>Sign in to use ${title.toLowerCase()}</h3><p class="empty-note">Friends, gifts and rewards are kept with your account.</p><button class="btn primary" data-act="account">Sign in or create an account</button></div></div>`;
  }
  function socialHtml() {
    const incoming = (SO.friends || []).filter(f => f.kind === 'incoming');
    const tabs = `<div class="dtabs soc-tabs" role="tablist" aria-label="Social"><button type="button" role="tab" data-act="soctab" data-t="friends" aria-selected="${SO.tab === 'friends'}">Friends${incoming.length ? '<span class="dot"></span>' : ''}</button><button type="button" role="tab" data-act="soctab" data-t="guild" aria-selected="${SO.tab === 'guild'}">Guild</button></div>`;
    // the Discord invite, big, between the title and the Friends / Guild tabs (also when not signed in)
    const dc = `<a class="dc-banner" href="${DISCORD_URL}" target="_blank" rel="noopener">${DISCORD_SVG}<span class="dc-bt"><b>Join our Discord</b><small>Chat with other heroes, find a guild, share your pulls, report bugs and hear about updates first.</small></span><span class="btn dc-btn">Join</span></a>`;
    const head = `<div class="section-head"><div><h2>Social</h2><p class="lede">Add friends with their friend code and see how far they are.</p></div></div>${dc}${tabs}`;
    if (SO.tab === 'guild') return head + guildHtml();
    if (!signedIn()) return head + needAccount('Friends');
    if (!SO.friends) return head + (SO.err ? `<p class="ar-err">${esc(SO.err)}</p><button class="btn" data-act="socreload">Try again</button>` : '<p class="empty-note">Loading your friends…</p>');
    const friends = SO.friends.filter(f => f.kind === 'friend'), out = SO.friends.filter(f => f.kind === 'outgoing');
    const code = SO.code ? SO.code.slice(0, 4) + ' ' + SO.code.slice(4) : '…';
    return head + (SO.err ? `<p class="ar-err">${esc(SO.err)}</p>` : '') + `<div class="soc-top">
        <section class="soc-card"><span class="tag">Your friend code</span><div class="fr-code"><b>${code}</b><button class="btn small" data-act="copycode">Copy</button></div><small class="empty-note">Share it with a friend so they can add you.</small></section>
        <section class="soc-card"><span class="tag">Add a friend</span><form class="fr-add" data-form="addfriend"><input name="fcode" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Friend code, e.g. 1A2B 3C4D" aria-label="Friend code"><button class="btn primary small" type="submit">Send request</button></form></section></div>
      ${incoming.length ? `<section class="fr-sec"><h3>Friend requests</h3><ul class="fr-list">${incoming.map(f => personRow(f, `<button class="btn primary small" data-act="fraccept" data-id="${f.user_id}">Accept</button><button class="btn small" data-act="frdecline" data-id="${f.user_id}">Decline</button>`)).join('')}</ul></section>` : ''}
      <section class="fr-sec"><h3>Friends <small class="empty-note">${friends.length}</small></h3>${friends.length ? `<ul class="fr-grid">${friends.map(friendTile).join('')}</ul>` : '<p class="empty-note">No friends yet. Send your friend code to someone, or add theirs above.</p>'}</section>
      ${out.length ? `<section class="fr-sec"><h3>Sent requests</h3><ul class="fr-list">${out.map(f => personRow(f, `<button class="btn small" data-act="frremove" data-id="${f.user_id}" data-name="">Cancel</button>`)).join('')}</ul></section>` : ''}`;
  }
  // ---------- chat (0011_chat.sql): World (write from player level 10) and one chat per guild ----------
  // A floating button (#chatbtn, bottom right, also during battles) opens a panel (#chatbox) with the tabs World and
  // Guild. While open the shown channel is fetched every 4 s (chat_list after the last id); while closed one call
  // every 25 s counts what is new (chat_unread) for the badge. The server takes name, portrait, level and guild
  // tag from the save, cleans the text and keeps the pace; here: tap a name for Profile, Block (S.cblock, hidden
  // here), Report and Delete (own messages; Guildmaster and officers in their guild chat).
  const CH = { open: false, tab: 'world', msgs: { world: [], guild: [] }, last: { world: 0, guild: 0 }, info: { world: null, guild: null }, unread: { world: 0, guild: 0 }, menu: null, busy: false, err: '', at: 0 };
  const CH_SEEN = 'ffh-chat-seen';
  const chSeen = () => { try { return JSON.parse(localStorage.getItem(CH_SEEN)) || {}; } catch (e) { return {}; } };
  const chSetSeen = (k, id) => { try { const s = chSeen(); if (id > (s[k] || 0)) { s[k] = id; localStorage.setItem(CH_SEEN, JSON.stringify(s)); } } catch (e) {} };
  const CHAT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>';
  const chatOn = () => { const cl = cloud(); return !!(cl && cl.enabled) && !noHero() && !firstSteps() && !!S.seen.home; };
  const chTime = iso => { const d = new Date(iso), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  function chatPaintBtn() {
    if (!$('#chatbtn')) { // made once, outside #screen so a redraw never takes them away
      document.body.insertAdjacentHTML('beforeend', `<button type="button" id="chatbtn" class="chat-fab" aria-label="Chat" hidden>${CHAT_SVG}<b class="chat-n" hidden></b></button><div id="chatbox" class="chat-box" role="dialog" aria-label="Chat" hidden></div>`);
    }
    const b = $('#chatbtn');
    b.hidden = !chatOn();
    // something new: a "!" on the button (green when the guild wrote) and a soft pulse, the count in its label
    const n = CH.unread.world + CH.unread.guild, g = CH.unread.guild, nw = !!n && !CH.open;
    b.querySelector('.chat-n').textContent = '!';
    b.querySelector('.chat-n').hidden = !nw;
    b.classList.toggle('guild', !!g); b.classList.toggle('new', nw);
    b.setAttribute('aria-label', n ? `Chat: ${n > 99 ? '99+' : n} new ${n === 1 ? 'message' : 'messages'}` : 'Chat');
    b.title = n ? `${n > 99 ? '99+' : n} new in the ${g && CH.unread.world ? 'World and Guild chats' : g ? 'Guild chat' : 'World chat'}` : 'Chat';
  }
  function chatMsg(m, role) {
    const blocked = (S.cblock || []).includes(m.user_id);
    if (blocked) return '';
    const canDel = m.mine || (CH.tab === 'guild' && (role === 'leader' || role === 'officer'));
    const menu = CH.menu === m.id ? `<div class="cm-menu">${m.mine ? '' : `<button type="button" data-ch="prof" data-uid="${m.user_id}">Profile</button>${chFriendBtn(m.user_id)}<button type="button" data-ch="block" data-uid="${m.user_id}" data-name="${esc(m.name)}">Block</button><button type="button" data-ch="report" data-id="${m.id}">Report</button>`}${canDel ? `<button type="button" class="bad" data-ch="del" data-id="${m.id}">Delete</button>` : ''}</div>` : '';
    return `<div class="cm ${m.mine ? 'mine' : ''}" data-mid="${m.id}"><button type="button" class="cm-av" data-ch="menu" data-id="${m.id}" aria-label="${esc(m.name)}">${m.avatar && C[m.avatar] ? por(m.avatar) : ''}</button>
      <div class="cm-b"><div class="cm-h"><button type="button" class="cm-name" data-ch="menu" data-id="${m.id}">${esc(m.name)}</button>${CH.tab === 'world' && m.tag ? `<span class="cm-tag">[${esc(m.tag)}]</span>` : ''}<small>${m.lvl ? `Lv ${m.lvl} · ` : ''}${chTime(m.created_at)}</small></div><p>${esc(m.body)}</p>${menu}</div></div>`;
  }
  function chatFoot() {
    const inf = CH.info[CH.tab];
    if (!signedIn()) return `<div class="ch-note">Sign in to chat with other players. <button type="button" class="btn small primary" data-ch="signin">Sign in</button></div>`;
    if (!inf) return '';
    if (inf.banned) return `<div class="ch-note">You are muted in the chat${inf.banned === 'forever' ? '' : ` until ${new Date(inf.banned).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}.</div>`;
    if (CH.tab === 'guild' && !inf.channel) return `<div class="ch-note">Join a guild to chat with your guild mates. <button type="button" class="btn small" data-ch="guild">Find a guild</button></div>`;
    if (!inf.can) return `<div class="ch-note">You can read along; writing in World opens at player level ${inf.need || 10} (you are level ${S.p.lvl}).</div>`;
    return `<form class="ch-form" data-chform="1"><input id="ch-in" maxlength="200" autocomplete="off" enterkeyhint="send" placeholder="${CH.tab === 'world' ? 'Message everyone…' : 'Message your guild…'}" aria-label="Message"><button type="submit" class="btn primary small" ${CH.busy ? 'disabled' : ''}>Send</button></form>${CH.err ? `<p class="ch-err">${esc(CH.err)}</p>` : ''}`;
  }
  // the whole panel (tabs, list, the writing line) or, while polling, only the tabs and the list, so typing is never disturbed
  const chTabs = () => ['world', 'guild'].map(k => `<button type="button" role="tab" data-ch="tab" data-t="${k}" aria-selected="${CH.tab === k}">${k === 'world' ? 'World' : 'Guild'}${CH.unread[k] && CH.tab !== k ? `<b class="ch-dot" title="${CH.unread[k] > 99 ? '99+' : CH.unread[k]} new">!</b>` : ''}</button>`).join('');
  function chatList(box) {
    const inf = CH.info[CH.tab], old = box.querySelector('.ch-list'), atEnd = !old || old.scrollHeight - old.scrollTop - old.clientHeight < 40, top = old ? old.scrollTop : 0;
    const list = CH.msgs[CH.tab].map(m => chatMsg(m, inf && inf.role)).join('');
    box.querySelector('.ch-tabs').innerHTML = chTabs();
    const nl = box.querySelector('.ch-list');
    nl.innerHTML = !signedIn() ? '' : !inf ? '<p class="empty-note ch-empty">Loading…</p>' : list || `<p class="empty-note ch-empty">${CH.tab === 'world' ? 'No messages yet. Say hello!' : inf.channel ? 'No messages in your guild chat yet.' : ''}</p>`;
    nl.scrollTop = atEnd ? nl.scrollHeight : top;
  }
  function chatPaint(onlyList) {
    const box = $('#chatbox'); if (!box) return;
    box.hidden = !CH.open; chatPaintBtn(); if (!CH.open) return;
    if (onlyList && box.querySelector('.ch-list')) { chatList(box); return; }
    const inp = box.querySelector('#ch-in'), val = inp ? inp.value : '', focus = inp && document.activeElement === inp;
    const old = box.querySelector('.ch-list'), top = old && old.scrollTop;
    box.innerHTML = `<div class="ch-head"><div class="ch-tabs" role="tablist" aria-label="Chat"></div><button type="button" class="ch-x" data-ch="close" aria-label="Close the chat">✕</button></div><div class="ch-list" aria-live="polite"></div>${chatFoot()}`;
    if (old) box.querySelector('.ch-list').scrollTop = top;
    chatList(box);
    const ni = box.querySelector('#ch-in'); if (ni) { ni.value = val; if (focus) ni.focus(); }
  }
  // fetch the shown channel (open) or the unread counts (closed)
  async function chatPoll(force) {
    if (!chatOn() || !signedIn() || document.hidden) return;
    const cl = cloud();
    if (CH.open) {
      const k = CH.tab;
      try {
        const r = await cl.rpc('chat_list', { ch: k, after: CH.last[k] });
        if (!r || r.error) return;
        const had = CH.info[k], same = had && had.channel === r.channel && had.can === r.can && had.banned === r.banned && had.role === r.role;
        CH.info[k] = r;
        if (had && had.channel !== r.channel) { CH.msgs[k] = []; CH.last[k] = 0; } // joined or left a guild
        const del = new Set(r.del || []);
        CH.msgs[k] = CH.msgs[k].filter(m => !del.has(m.id)).concat((r.msgs || []).filter(m => !del.has(m.id) && !CH.msgs[k].some(x => x.id === m.id))).slice(-150);
        if (r.msgs && r.msgs.length) CH.last[k] = Math.max(CH.last[k], ...r.msgs.map(m => m.id));
        chSetSeen(k === 'world' ? 'w' : 'g', CH.last[k]); CH.unread[k] = 0;
        if (CH.open && CH.tab === k) chatPaint(same);
      } catch (e) {}
    }
    // the unread counts: while closed for the badge, while open for the other tab's "!"
    if (force || Date.now() - CH.at > 24000) {
      CH.at = Date.now();
      const s = chSeen();
      try {
        const r = await cl.rpc('chat_unread', { w_after: s.w || 0, g_after: s.g || 0 });
        if (!r) return;
        // the first time on this device: what is there already does not count as new
        if (s.w == null && r.wl) { chSetSeen('w', r.wl); r.w = 0; }
        if (s.g == null && r.gl) { chSetSeen('g', r.gl); r.g = 0; }
        // during a battle a new message runs along the top of the field for a moment (tap it to open the chat)
        if (B && !CH.open && ((r.g || 0) > CH.unread.guild || (r.w || 0) > CH.unread.world)) chatTicker((r.g || 0) > CH.unread.guild ? 'guild' : 'world', (r.g || 0) > CH.unread.guild ? r.gl : r.wl);
        CH.unread.world = CH.open && CH.tab === 'world' ? 0 : r.w || 0; CH.unread.guild = CH.open && CH.tab === 'guild' ? 0 : r.g || 0;
        if (CH.open) chatPaint(true); else chatPaintBtn();
      } catch (e) {}
    }
  }
  let tickT = 0;
  async function chatTicker(k, lastId) {
    const el = $('#b-chat'); if (!el || !lastId) return;
    let r; try { r = await cloud().rpc('chat_list', { ch: k, after: lastId - 1 }); } catch (e) { return; }
    const m = r && r.msgs && r.msgs[r.msgs.length - 1]; if (!m || m.mine || (S.cblock || []).includes(m.user_id) || !B) return;
    el.innerHTML = `${k === 'guild' ? '<b class="g">Guild</b>' : ''}<b>${esc(m.name)}</b> ${esc(m.body)}`; el.dataset.t = k; el.hidden = false;
    clearTimeout(tickT); tickT = setTimeout(() => { el.hidden = true; }, 7000);
  }
  function chatOpen(open) {
    CH.open = open; CH.menu = null; CH.err = '';
    if (open && !CH.info.world && CH.unread.guild && !CH.unread.world) CH.tab = 'guild';
    chatPaint(); if (open) { chatPoll(true); const i = $('#ch-in'); if (i && innerWidth > 760) i.focus(); }
  }
  async function chatSend(text) {
    const t = text.trim(); if (!t || CH.busy) return;
    CH.busy = true; CH.err = '';
    let r; try { r = await cloud().rpc('chat_send', { ch: CH.tab, msg: t }); } catch (e) { r = { error: 'net' }; }
    CH.busy = false;
    const why = { slow: 'Slow down a little: one message every few seconds.', repeat: 'You just said that.', level: 'Writing in World opens at player level 10.', noguild: 'You are not in a guild.', banned: 'You are muted in the chat.', empty: '', net: 'Not sent: no connection. Try again.' };
    if (!r || r.error) { CH.err = why[r && r.error] ?? 'Not sent. Try again in a moment.'; chatPaint(); return; }
    const i = $('#ch-in'); if (i) i.value = '';
    await chatPoll(true); chatPaint();
  }
  document.addEventListener('submit', e => { if (!e.target.matches('[data-chform]')) return; e.preventDefault(); const i = $('#ch-in'); if (i) chatSend(i.value); });
  document.addEventListener('click', async e => {
    if (e.target.closest('#chatbtn')) { SFX.click(); chatOpen(!CH.open); return; }
    { const t = e.target.closest('#b-chat'); if (t) { t.hidden = true; CH.tab = t.dataset.t || 'world'; chatOpen(true); return; } }
    const a = e.target.closest('[data-ch]'); if (!a) return;
    const k = a.dataset.ch, id = +a.dataset.id;
    if (k === 'close') chatOpen(false);
    else if (k === 'tab') { CH.tab = a.dataset.t; CH.menu = null; CH.err = ''; const i = $('#ch-in'); if (i) i.value = ''; chatPaint(); chatPoll(true); }
    else if (k === 'menu') { CH.menu = CH.menu === id ? null : id; chatPaint(true); }
    else if (k === 'signin') { if (B) { toast('Sign in after the battle.', true); return; } chatOpen(false); cloud().openAccount(); }
    else if (k === 'guild') { if (B) { toast('Not during a battle.', true); return; } chatOpen(false); SO.tab = 'guild'; GD.view = 'home'; setTab('social'); guildLoad(); }
    else if (k === 'prof') { CH.menu = null; chatPaint(true); openProfile(a.dataset.uid); chatTopModal(); }
    else if (k === 'friend') { // a friend code is the first 8 hex of the account id, so a name in the chat is enough
      if (a.disabled) return; a.disabled = true; a.textContent = 'Sending…';
      addFriend(String(a.dataset.uid).replace(/-/g, '').slice(0, 8)).then(() => { CH.menu = null; chatPaint(true); });
    }
    else if (k === 'block') {
      const uid = a.dataset.uid, name = a.dataset.name;
      confirmBox(`Block ${name}?`, `You will no longer see ${name}'s messages in the chat. You can unblock players in Town Hall → Settings.`, 'Block', () => {
        S.cblock = [...new Set([...(S.cblock || []), uid])]; S.cbname = { ...(S.cbname || {}), [uid]: name }; save(); CH.menu = null; chatPaint(); toast(`${name} is blocked.`);
      });
      chatTopModal();
    }
    else if (k === 'report') {
      CH.menu = null; let r; try { r = await cloud().rpc('chat_report', { mid: id, why: null }); } catch (e) { r = null; }
      toast(r === 'ok' ? 'Thank you. The message was reported to the moderators.' : 'Could not report it. Try again.', r !== 'ok'); chatPaint();
    }
    else if (k === 'del') {
      let r; try { r = await cloud().rpc('chat_delete', { mid: id }); } catch (e) { r = null; }
      if (r === 'ok') { const t = CH.tab; CH.msgs[t] = CH.msgs[t].filter(m => m.id !== id); CH.menu = null; chatPaint(); } else toast('You cannot delete that message.', true);
    }
    else if (k === 'unblock') { S.cblock = (S.cblock || []).filter(x => x !== a.dataset.uid); save(); render(); chatPaint(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && CH.open && $('#modal').hidden) chatOpen(false); });
  // the open chat sits above the game's popups (a battle result never covers it); a popup opened from the chat
  // (a profile, Block?) goes above the chat until it closes
  function chatTopModal() {
    const m = $('#modal'); m.classList.add('over-chat');
    const ob = new MutationObserver(() => { if (m.hidden) { m.classList.remove('over-chat'); ob.disconnect(); } });
    ob.observe(m, { attributes: true, attributeFilter: ['hidden'] });
  }
  setInterval(() => chatPoll(), 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) chatPoll(true); });
  // blocked players, in Town Hall → Settings
  const blockedHtml = () => { const l = S.cblock || []; return `<section class="prof-acc"><h3>Chat</h3><p class="empty-note">${l.length ? 'Players you blocked: their messages are hidden from you.' : 'Tap a name in the chat to view a profile, block a player or report a message.'}</p>${l.length ? `<ul class="ch-blocked">${l.map(u => `<li><span>${esc((S.cbname || {})[u] || 'Player')}</span><button type="button" class="btn small" data-ch="unblock" data-uid="${u}">Unblock</button></li>`).join('')}</ul>` : ''}</section>`; };
  function mailHtml() {
    const head = `<div class="section-head"><div><h2>Mail</h2><p class="lede">Gifts, rewards and friend requests.</p></div>${signedIn() ? '<button class="btn small" data-act="socreload">Refresh</button>' : ''}</div>`;
    if (!signedIn()) return head + needAccount('Mail');
    if (!SO.mail) return head + (SO.err ? `<p class="ar-err">${esc(SO.err)}</p>` : '<p class="empty-note">Checking your mail…</p>');
    const incoming = (SO.friends || []).filter(f => f.kind === 'incoming');
    const items = [
      ...(SO.invites || []).map(v => `<li class="ml-item new invite"><span class="ml-ic">${svgIcon('banner')}</span><span class="ml-main"><b>Guild invite: ${esc(v.name)} [${esc(v.tag)}]</b><small class="empty-note">From ${esc(v.invited_by || 'the Guildmaster')} · ${v.members} / ${GUILD_MAX} members</small></span><span class="fr-acts"><button class="btn primary small" data-act="ginvacc" data-id="${v.guild_id}">Accept</button><button class="btn small" data-act="ginvdec" data-id="${v.guild_id}">Decline</button></span></li>`),
      ...incoming.map(f => `<li class="ml-item new"><span class="ml-ic">${svgIcon('people')}</span><span class="ml-main"><b>Friend request from ${esc(f.name)}</b><small class="empty-note">${f.lvl ? `Player level ${f.lvl} · ` : ''}${esc(progressText(f))}</small></span><span class="fr-acts"><button class="btn primary small" data-act="fraccept" data-id="${f.user_id}">Accept</button><button class="btn small" data-act="frdecline" data-id="${f.user_id}">Decline</button></span></li>`),
      ...SO.mail.map(m => {
        if (m.kind === 'arena') { const t = K.arenaTier(m.rewards.rating), top = K.ARENA_RANK_REWARDS[(m.rewards.rank || 0) - 1]; return `<li class="ml-item new"><span class="ml-ic">${svgIcon('swords')}</span><span class="ml-main"><b>Weekly arena reward</b><small class="empty-note">${t.name} tier${top ? ` · #${m.rewards.rank} of the week` : ''} · ${tierReward(t)}${top ? ' + ' + tierReward(top) : ''}</small></span><span class="fr-acts"><button class="btn primary small" data-act="arclaim">Claim</button></span></li>`; }
        const parts = giftParts(m.rewards || {}), when = new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return `<li class="ml-item ${m.claimed ? 'done' : 'new'}"><span class="ml-ic">${svgIcon('gift')}</span><span class="ml-main"><b>${esc(m.title)}</b>${m.body ? `<span class="ml-body">${esc(m.body)}</span>` : ''}<small class="empty-note">${when}${parts.length ? ' · ' + esc(parts.join(' · ')) : ''}</small></span><span class="fr-acts">${m.claimed ? '<span class="tag">Claimed</span>' : `<button class="btn primary small" data-act="mailclaim" data-id="${m.id}">Claim</button>`}</span></li>`;
      }),
    ];
    return head + (SO.err ? `<p class="ar-err">${esc(SO.err)}</p>` : '') + (items.length ? `<ul class="ml-list">${items.join('')}</ul>` : '<div class="lockbox"><div><h3>No mail</h3><p class="empty-note">Gifts from the game and friend requests show up here.</p></div></div>');
  }
  const SVG_IC = {
    people: '<circle cx="5.5" cy="5.5" r="2.2"/><circle cx="11" cy="6" r="1.8"/><path d="M1.5 14c0-2.6 1.8-4.3 4-4.3s4 1.7 4 4.3M9.8 13.5c.2-2 1.1-3.3 2.9-3.3 1.4 0 2.3 1.2 2.3 3.3"/>',
    gift: '<rect x="2" y="6" width="12" height="3"/><path d="M3 9v5.5h10V9M8 6v8.5M8 6c-1-2.5-4-3-4-1.2C4 6 8 6 8 6zm0 0c1-2.5 4-3 4-1.2C12 6 8 6 8 6z"/>',
    swords: '<path d="M2 2l7 7M2 2h2.5L11 8.5 8.5 11 2 4.5zM14 2l-7 7M14 2h-2.5L5 8.5 7.5 11 14 4.5zM4 12l2-2M12 12l-2-2"/>',
    banner: '<path d="M3 1.5h10V13l-5-3-5 3z"/>',
    gear: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/><circle cx="8" cy="8" r="4.6"/>',
  };
  const svgIcon = k => `<svg viewBox="0 0 16 16" aria-hidden="true">${SVG_IC[k]}</svg>`;
  async function friendAct(fn, body, okMsg) {
    try { await cloud().rpc(fn, body); if (okMsg) toast(okMsg); } catch (e) { toast('That did not work. Try again in a moment.', true); }
    socialLoad();
  }
  // the chat's name menu: Add friend, or what is already between you (friends, a request sent, a request to accept)
  function chFriendBtn(uid) {
    const f = (SO.friends || []).find(x => x.user_id === uid);
    if (f && f.kind === 'friend') return '<button type="button" disabled>✓ Friends</button>';
    if (f && f.kind === 'outgoing') return '<button type="button" disabled>Request sent</button>';
    return `<button type="button" class="ok" data-ch="friend" data-uid="${uid}">${f && f.kind === 'incoming' ? 'Accept friend' : 'Add friend'}</button>`;
  }
  async function addFriend(raw) {
    const code = String(raw || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
    if (code.length !== 8) { toast('A friend code has 8 characters (letters A-F and numbers).', true); return; }
    let r; try { r = await cloud().rpc('friend_request', { code }); } catch (e) { toast('Could not send the request. Try again.', true); return; }
    const MSG = { sent: 'Friend request sent.', accepted: 'You are now friends!', already: 'You are already friends, or a request is waiting.', self: 'That is your own friend code.', not_found: 'No player has that friend code.', full: 'You have reached 50 friends and requests.' };
    toast(MSG[r] || 'Done.', r === 'not_found' || r === 'self' || r === 'full');
    socialLoad();
  }
  async function claimMail(id) {
    let r; try { r = await cloud().rpc('claim_mail', { mail_id: +id }); } catch (e) { toast('Could not claim this gift. Try again.', true); return; }
    if (!r) { toast('This gift was already claimed.'); socialLoad(); return; }
    grantGift(r); save(); hud(); SFX.up();
    toast(`Claimed: ${giftParts(r).join(' · ') || 'a gift'}.`, false, 4000);
    socialLoad();
  }
  // Start over: a player may wipe their own progress and create a new hero, at any time.
  // The current progress is kept as a backup first.
  function startOverHtml() {
    return `<section class="prof-bk"><h3>Start over</h3><p class="empty-note">Wipe your progress and begin again by creating a new hero: heroes, gear, Sigils, shards, campaign and Boss Hall progress and player level all reset. Your name stays. Your current progress is saved as a backup on this device first.</p>
      <div class="row"><button class="btn small danger" data-act="startover">Start over</button></div></section>`;
  }
  function startOver() {
    if (noHero()) return;
    backupRaw(JSON.stringify(S), true);
    const s = linkTeams(resetSave(S)); delete s.wasReset;
    S = s; tab = 'home'; save(); hud(); render(); window.scrollTo({ top: 0 });
    toast('Your adventure starts over. Create your hero!', false, 5000);
  }
  function backupsHtml() {
    const rows = readBackups().map((b, i) => {
      let o = {}; try { o = JSON.parse(b.raw) || {}; } catch (e) { /* unreadable copy */ }
      const when = new Date(b.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const what = [o.p && o.p.lvl ? `player level ${o.p.lvl}` : '', o.cleared != null ? `${o.cleared + 1} stages cleared` : '', o.roster ? `${Object.keys(o.roster).length} ${Object.keys(o.roster).length === 1 ? "hero" : "heroes"}` : ''].filter(Boolean).join(' · ');
      return `<li><span><b>${when}</b><small class="empty-note">${what || 'saved game'}</small></span><button class="btn small" data-act="restorebk" data-n="${i}">Restore</button></li>`;
    }).join('');
    return rows ? `<section class="prof-bk"><h3>Backups on this device</h3><p class="empty-note">A copy of your save is kept every 12 hours. Restore one if something went wrong; your current progress is kept as a backup too.</p><ul class="bk-list">${rows}</ul></section>` : '';
  }
  function restoreBackup(n) {
    const b = readBackups()[n];
    let m = null; try { m = migrate(JSON.parse(b.raw)); } catch (e) { /* unreadable copy */ }
    if (!m) { toast('This backup cannot be read.', true); return; }
    backupRaw(JSON.stringify(S), true);
    S = fixup(m); save(); hud(); render();
    toast('Backup restored.');
  }
  function profileHtml() {
    const p = S.p, need = pxNeed(p.lvl), av = avatarId();
    const bossesBeaten = Object.values(S.bh).filter(n => n > 0).length;
    const heroes = K.CHAMP_ORDER.filter(x => S.roster[x]).length;
    const cost = renameCost(), costTxt = cost ? `${ic('coin')} ${cost.toLocaleString('en-US')}` : 'free once';
    const nameRow = editName
      ? `<form class="pname" data-form="pname"><input name="pname" value="${esc(p.name)}" maxlength="20" autocomplete="nickname" aria-label="Player name" required><button class="btn primary small" type="submit">Save · ${costTxt}</button><button class="btn small" type="button" data-act="pnamecancel">Cancel</button></form>`
      : `<div class="pname"><h2>${esc(p.name)}</h2><button class="btn small" data-act="pnameedit" ${S.silver < cost ? `disabled title="Changing your name costs ${cost.toLocaleString('en-US')} Sigils"` : ''}>Change name · ${costTxt}</button></div>`;
    const road = Object.keys(UNLOCKS).map(t => {
      const ok = unlocked(t), u = UNLOCKS[t], left = u.lvl ? u.lvl - p.lvl : u.ch * 7 - 1 - S.cleared;
      return `<li class="${ok ? 'on' : ''}"><span class="lvtag">${needTag(t)}</span><b>${UNLOCK_NAME[t]}</b><span class="empty-note">${ok ? 'Unlocked' : `${left} ${u.lvl ? (left === 1 ? 'level' : 'levels') : (left === 1 ? 'stage' : 'stages')} to go`}</span></li>`;
    }).join('');
    const avatars = Object.keys(S.roster).filter(id => C[id]).sort((a, b) => C[b].rar - C[a].rar).map(id => `<button type="button" class="av-pick rar-${C[id].rar} ${id === av ? 'sel' : ''}" data-act="avatar" data-id="${id}" title="${esc(C[id].name)}" aria-label="${esc(C[id].name)}" aria-pressed="${id === av}">${por(id)}</button>`).join('');
    const stat = (k, v) => `<dt>${k}</dt><dd>${typeof v === 'number' ? v.toLocaleString('en-US') : v}</dd>`;
    return `<div class="profile">
      <div class="prof-head rar-${C[av].rar}"><div class="prof-av">${por(av)}</div>
        <div class="prof-main">${nameRow}
          <div class="prof-lv"><span class="lvbadge">${p.lvl}</span><span>Player level ${p.lvl}${p.prestige ? ` · Prestige ${p.prestige}` : ''}</span>${presEmblem(p.prestige, 'lg')}</div>
          <div class="xpbar"><i style="width:${p.lvl >= PLAYER_MAX ? 100 : Math.round(p.xp / need * 100)}%"></i></div>
          ${p.lvl >= PLAYER_MAX ? `<div class="prestige-box"><p><b>Maximum level reached!</b> Prestige to start again at level 1 with everything you own, earn prestige emblem ${romanN((p.prestige || 0) + 1)}, ${sigils(PRESTIGE_REWARD.silver)} and a ${esc(K.SHARD.mythic.name)}, and collect every level-up reward again.</p><button class="btn primary" data-act="prestige">Prestige ${romanN((p.prestige || 0) + 1)}</button></div>`
            : `<small class="empty-note">${p.xp.toLocaleString('en-US')} / ${need.toLocaleString('en-US')} XP to level ${p.lvl + 1} · win battles to earn player XP${p.lvl >= PLAYER_MAX - 10 ? ` · at level ${PLAYER_MAX} you can prestige` : ''}</small>`}</div></div>
      ${guest() && !S.lk ? `<div class="prof-link"><div><h3>Link your account to an email</h3><p>Your heroes are saved only in this browser. Link an email to keep them safe and play on any device.</p></div>${linkRw()}<button class="btn primary small" data-act="account">Create an account</button></div>` : ''}
      <div class="prof-cols">
        <section><h3>Unlocks</h3><ul class="road">${road}</ul><p class="empty-note">Every level up pays out Sigils. Every fifth level also gives a Greater Fate Shard.</p></section>
        <section><h3>Statistics</h3><dl class="stats">${stat('Battles won', p.st.won)}${stat('Battles lost', p.st.lost)}${stat('Campaign stages cleared', `${S.cleared + 1} / ${K.STAGES.length}`)}${K.DIFFS.slice(1).map((x, i) => S.dcl[i + 1] >= 0 ? stat(`${x.name} stages cleared`, `${S.dcl[i + 1] + 1} / ${K.STAGES.length}`) : '').join('')}${stat('Boss victories', p.st.bossWon)}${stat('Bosses beaten', `${bossesBeaten} / ${K.BOSS_ORDER.length}`)}${stat('Heroes collected', `${heroes} / ${K.CHAMP_ORDER.length}`)}${stat('Summons', p.st.summons)}${stat('Team power', teamPower())}</dl></section>
      </div>
      <section><h3>Avatar</h3><div class="av-grid">${avatars}</div></section>
    </div>`;
  }
  // Town Hall → Settings: sound and music, the cloud account, start over and the save backups on this device
  function settingsHtml() {
    const cl = window.FFH_CLOUD && window.FFH_CLOUD.info();
    const account = !cl || !cl.enabled
      ? '<p class="empty-note">Offline mode: your progress is saved in this browser only.</p>'
      : cl.email
        ? `<p class="empty-note">Signed in as <b>${esc(cl.email)}</b>. ${cl.status === 'error' ? 'The last cloud save failed.' : 'Your progress saves to your account automatically.'}</p><div class="row"><button class="btn small" data-act="account">Account settings</button></div>`
        : `<p class="empty-note">Not signed in: your progress is only saved in this browser. Sign in to keep it safe and play on any device.${S.lk ? '' : ` Linking an account pays <b>${LINK_GEMS} Crystals</b>.`}</p><div class="row"><button class="btn primary small" data-act="account">Sign in or create an account</button></div>`;
    // feedback and bug reports go to the Discord, so everything stays in one place
    const feedback = `<section class="prof-acc fb-sec"><h3>Feedback and bugs</h3><p class="empty-note">Found a bug or have an idea? Tell us in the Discord: post it in the feedback or bug channel, with a screenshot if you can.</p><div class="row"><a class="btn dc-btn small" href="${DISCORD_URL}" target="_blank" rel="noopener">${DISCORD_SVG}Give feedback in Discord</a></div></section>`;
    return `<div class="profile settings">
      <section class="prof-acc set-sound"><h3>Sound</h3><div class="vol-rows">${volSlider('music')}${volSlider('sfx')}</div><p class="empty-note">Tap a speaker (or slide to 0) to switch that sound off. The speaker in the top bar mutes both.</p></section>
      <section class="prof-acc"><h3>Battle</h3><div class="set-rows"><div class="set-row"><span><b>Screen shake</b><small>The screen shakes on critical hits and big blows.</small></span><button class="set-tog${S.shake === false ? '' : ' on'}" data-act="shake" aria-pressed="${S.shake !== false}">${S.shake === false ? 'Off' : 'On'}</button></div></div></section>
      ${blockedHtml()}
      <section class="prof-acc"><h3>Account</h3>${account}</section>
      ${feedback}
      ${startOverHtml()}
      ${backupsHtml()}
    </div>`;
  }

  // ---------- screen events ----------
  document.addEventListener('change', e => {
    if (e.target.id === 'cp-diff') { S.diff = +e.target.value; delete S.chap; campSel = null; save(); render(); return; }
    if (e.target.id === 'lb-sub') { const t = e.target; lbLoad(t.value ? `${t.dataset.base}:${t.value}` : t.dataset.all); return; }
    if (e.target.id === 'bh-team') { const aff = e.target.dataset.aff, v = e.target.value; S.bossTeam = S.bossTeam || {}; if (v === '') delete S.bossTeam[aff]; else S.bossTeam[aff] = +v; save(); render(); return; }
    const vf = e.target.closest('[data-vf]'); if (vf) { VT[vf.dataset.vf] = vf.value; VT.open = null; render(); return; }
    if (e.target.matches && e.target.matches('[data-pp="bteam"]')) { const aff = e.target.dataset.aff, v = e.target.value; S.bossTeam = S.bossTeam || {}; if (v === '') delete S.bossTeam[aff]; else S.bossTeam[aff] = +v; useBossTeam(aff); save(); render(); return; } // a boss level's team pick
    if (e.target.matches && e.target.matches('[data-pp="team"]')) { S.modeTeam.campaign = +e.target.value; useTeam('campaign'); save(); render(); return; } // the prep screen's team pick
    const gf = e.target.closest('[data-gf]'); if (gf) { FG[gf.dataset.gf] = gf.type === 'checkbox' ? gf.checked : gf.value; FG.pick = null; render(); return; }
    const f = e.target.closest('[data-filter]'); if (!f) return;
    TF[f.dataset.filter] = f.type === 'checkbox' ? f.checked : f.value; render();
  });
  // the Items filters fold away on phones; remember whether the player opened them
  document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('it-filt')) FG.fOpen = e.target.open; }, true);
  // guide search: hide terms that do not match, and sections left empty
  document.addEventListener('input', e => {
    if (e.target.id !== 'gl-search') return;
    const q = e.target.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('.gl-sec').forEach(sec => {
      let n = 0;
      sec.querySelectorAll('.gl-item').forEach(li => { const hit = !q || li.textContent.toLowerCase().includes(q); li.hidden = !hit; if (hit) n++; });
      sec.hidden = !n; shown += n;
    });
    const none = document.querySelector('.gl-none'); if (none) none.hidden = shown > 0;
  });
  document.addEventListener('submit', e => {
    const tn = e.target.closest('[data-form="tmname"]');
    if (tn) { e.preventDefault(); const name = tn.tname.value.trim().slice(0, 20); if (!name) return; $('#modal').hidden = true; const f = nameOk; nameOk = null; if (f) f(name); return; }
    const gc = e.target.closest('[data-form="gcreate"]');
    if (gc) {
      e.preventDefault();
      if (S.silver < GUILD_COST) { toast(`You need ${GUILD_COST.toLocaleString('en-US')} Sigils to create a guild.`, true); return; }
      guildAct('guild_create', { gname: gc.gname.value, gtag: gc.gtag.value, ginfo: '' }, { ok: 'Your guild is created!', name_taken: 'That name is taken.', tag_taken: 'That tag is taken.', bad_name: 'Use 3-20 letters, numbers, spaces, - or \'.', bad_tag: 'The tag needs 2-4 letters or numbers.', in_guild: 'You are already in a guild.', locked: 'Guilds open after clearing Chapter II.' },
        () => { S.silver -= GUILD_COST; save(); hud(); });
      return;
    }
    const gv = e.target.closest('[data-form="ginvite"]'); if (gv) { e.preventDefault(); sendInvite(gv.icode.value); gv.icode.value = ''; return; }
    const gs = e.target.closest('[data-form="gsearch"]'); if (gs) { e.preventDefault(); GD.q = gs.q.value.trim(); GD.list = null; render(); guildLoad(); return; }
    const gi = e.target.closest('[data-form="ginfo"]');
    if (gi) { e.preventDefault(); GD.editInfo = false; guildAct('guild_set', { ginfo: gi.ginfo.value.trim().slice(0, 250), gopen: gi.gopen.checked }, { ok: 'Guild info saved.', not_leader: 'Only the Guildmaster can change this.' }); return; }
    const af = e.target.closest('[data-form="addfriend"]'); if (af) { e.preventDefault(); addFriend(af.fcode.value); af.fcode.value = ''; return; }
    const f = e.target.closest('[data-form="pname"]'); if (!f) return;
    e.preventDefault();
    const name = f.pname.value.replace(/[<>"&\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    if (name.length < 2) { toast('Pick a name of at least 2 characters.', true); return; }
    const forced = !!f.closest('#modal');
    if (isAdv(name)) { toast('Pick a name of your own.', true); return; }
    if (name === S.p.name) { editName = false; render(); return; }
    const cost = forced ? 0 : renameCost(); // the name a player has to pick is always free
    if (S.silver < cost) { toast(`Changing your name costs ${cost.toLocaleString('en-US')} Sigils.`, true); return; }
    S.silver -= cost; S.p.renames++;
    S.p.name = name; editName = false; if (forced) $('#modal').hidden = true;
    save(); render(); toast(cost ? `Name saved. −${cost.toLocaleString('en-US')} Sigils.` : forced ? `Welcome, ${name}!` : 'Name saved.');
  });
  document.addEventListener('click', e => {
    SFX.unlock(); MUSIC.unlock();
    const tb = e.target.closest('#tabs button');
    if (tb) { SFX.click(); setTab(tb.dataset.tab); return; }
    if (e.target.closest('#sound')) { toggleAudio(); return; }
    // during a battle (also an Auto ×10 run) the header cannot leave the battle screen: the buttons are dimmed
    // (body.in-battle) and say why; the Guide opens as the in-battle popup instead
    const busy = () => { toast('Not during a battle. Finish it, or stop the Auto ×10 run, first.', true); };
    if (e.target.closest('.brand') && B) { busy(); return; }
    if (e.target.closest('.brand') && !noHero()) { SFX.click(); setTab('home'); window.scrollTo({ top: 0 }); return; }
    if (e.target.closest('#guide')) { if (B) { $('#b-help').click(); return; } SFX.click(); setTab('guide'); window.scrollTo({ top: 0 }); return; }
    if (B && e.target.closest('.res-plus, #mail, #account, #homebtn')) { busy(); return; }
    // the + next to a header counter: get more in the Market
    if (e.target.closest('.res-plus')) { if (B) return; if (firstSteps()) { toast('Fight your first campaign battle to open the rest of your homebase.'); return; } SFX.click(); setTab('market'); window.scrollTo({ top: 0 }); return; }
    if (e.target.closest('#mail')) { if (B) return; if (firstSteps()) { toast('Fight your first campaign battle to open the rest of your homebase.'); return; } SFX.click(); setTab('mail'); window.scrollTo({ top: 0 }); return; }
    if (e.target.closest('#account')) { if (B) return; if (firstSteps()) { toast('Fight your first campaign battle to open the rest of your homebase.'); return; } SFX.click(); editName = false; TH.tab = 'profile'; setTab('profiel'); window.scrollTo({ top: 0 }); return; }
    const a = e.target.closest('[data-act]');
    if (!a || a.closest('#battle')) return;
    const act = a.dataset.act, id = a.dataset.id, item = S.inv.find(x => x.id === +a.dataset.item);
    if (act !== 'modal') SFX.click();
    if (act === 'tfaff') { TF.aff = a.dataset.aff; render(); }
    else if (act === 'tfreset') { Object.assign(TF, { aff: 'all', rar: 'all', role: 'all' }); render(); }
    else if (act === 'pcgender') { pcSel.g = a.dataset.g; render(); }
    else if (act === 'pcclass') { pcSel.cls = a.dataset.k; render(); }
    else if (act === 'pcdice') { const l = PC_NAMES[pcSel.g].filter(n => n !== pcSel.name); pcSel.name = l[Math.floor(Math.random() * l.length)]; render(); const inp = document.getElementById('pc-name'); if (inp) inp.focus(); }
    else if (act === 'pccreate') { if (pcReady()) confirmHero(); }
    else if (act === 'pcok') { $('#modal').hidden = true; createHero(); }
    else if (act === 'pccancel') $('#modal').hidden = true;
    else if (act === 'tab') { setTab(a.dataset.tab); window.scrollTo({ top: 0 }); }
    else if (act === 'go') { if (a.dataset.go === 'campagne') CV.view = 'chapters'; if (a.dataset.go === 'kerkers') BV.view = 'bosses'; if (a.dataset.go === 'tower') TV.view = 'towers'; if (a.dataset.go === 'team' && S.teams[S.tfav]) { S.tsel = S.tfav; S.team = S.teams[S.tfav].ids; } if (a.dataset.go === 'guild') { SO.tab = 'guild'; GD.view = 'home'; setTab('social'); guildLoad(); } else setTab(a.dataset.go); window.scrollTo({ top: 0 }); }
    else if (act === 'soon') toast('Coming soon.');
    else if (act === 'tutlock') toast('Fight your first campaign battle to open the rest of your homebase.');
    else if (act === 'pnameedit') { editName = true; render(); const i = $('#screen input[name=pname]'); if (i) { i.focus(); i.select(); } }
    else if (act === 'pnamecancel') { editName = false; render(); }
    else if (act === 'avatar') { S.p.avatar = id; save(); render(); }
    else if (act === 'shake') { S.shake = S.shake === false; save(); render(); }
    else if (act === 'account') { if (window.FFH_CLOUD) window.FFH_CLOUD.openAccount(); }
    else if (act === 'arstate') arenaCall('state');
    else if (act === 'arrefresh') arenaCall('refresh');
    else if (act === 'ardef') arenaCall('defense').then(r => { if (r.state) toast('Your current team now defends you in the arena.'); });
    else if (act === 'arfight') arenaCall('start', { offer: +a.dataset.n }).then(r => { if (r.fight) { track('arena'); startArena(r.fight); } });
    else if (act === 'arlb') loadBoard(a.dataset.kind);
    else if (act === 'arclaim') claimArena().then(socialLoad);
    else if (act === 'hptab') { const box = a.closest('.modal-box'); box.querySelectorAll('[data-act=hptab]').forEach(b => b.setAttribute('aria-selected', b === a ? 'true' : 'false')); box.querySelectorAll('.hp-sec').forEach(s => { s.hidden = s.dataset.sec !== a.dataset.t; }); }
    else if (act === 'thtab') { TH.tab = a.dataset.t; editName = false; render(); }
    else if (act === 'lbkind') lbLoad(a.dataset.kind);
    else if (act === 'thclaim') thClaim(a);
    else if (act === 'mkbuy') mkBuy(a.dataset.id);
    else if (act === 'fcopen') fcsOpen();
    else if (act === 'fcclose') $('#modal').hidden = true;
    else if (act === 'fccls') { fcSel.cls = a.dataset.k; fcsPaint(); }
    else if (act === 'fcg') { fcSel.g = a.dataset.g; fcsPaint(); }
    else if (act === 'fcmarket') { $('#modal').hidden = true; setTab('market'); window.scrollTo({ top: 0 }); }
    else if (act === 'fcgo') { const nid = `pc_${fcSel.cls}_${fcSel.g}`, name = K.PC_CLASSES[fcSel.cls].name; confirmBox('Change your hero?', `<b>${esc(S.hero.name)}</b> becomes a ${fcSel.g === 'f' ? 'female' : 'male'} Fateborn <b>${esc(name)}</b>. This uses your Fate Changing Stone, and the next change is possible in 72 hours.`, `Yes, become a ${esc(name)}`, () => changeHero(nid)); }
    else if (act === 'soctab') { SO.tab = a.dataset.t; if (SO.tab === 'guild') { GD.view = 'home'; guildLoad(); } render(); }
    else if (act === 'gjoin') guildAct('guild_join', { gid: +id }, { ok: 'Welcome to the guild!', full: 'That guild is full.', closed: 'That guild is closed.', in_guild: 'You are already in a guild.', locked: 'Guilds open after clearing Chapter II.', not_found: 'That guild no longer exists.' });
    else if (act === 'gleave') confirmBox('Leave guild?', `Leave <b>${esc(GD.mine ? GD.mine.name : '')}</b>? ${GD.mine && GD.mine.role === 'leader' ? 'The lead passes to the longest-serving officer or member. ' : ''}Your guild boss points of this week still count for your own chest.`, 'Leave', () => guildAct('guild_leave', {}, { ok: 'You left the guild.' }, () => { GD.view = 'home'; }));
    else if (act === 'ginfoedit') { GD.editInfo = true; render(); const t = $('#g-info'); if (t) t.focus(); }
    else if (act === 'ginfocancel') { GD.editInfo = false; render(); }
    else if (act === 'grole') {
      const r = a.dataset.r;
      if (r === 'leader') confirmBox('Hand over the guild?', `Make <b>${esc(a.dataset.name)}</b> the Guildmaster? You become an officer.`, 'Hand over', () => guildAct('guild_set_role', { other: id, new_role: 'leader' }, { ok: 'You handed over the guild.' }));
      else guildAct('guild_set_role', { other: id, new_role: r }, { ok: r === 'officer' ? 'Promoted to officer.' : 'Now a member again.' });
    }
    else if (act === 'gkick') confirmBox('Remove member?', `Remove <b>${esc(a.dataset.name)}</b> from the guild?`, 'Remove', () => guildAct('guild_kick', { other: id }, { ok: 'Member removed.', not_allowed: 'You cannot remove this member.' }));
    else if (act === 'gview') { GD.view = a.dataset.v; GD.editInfo = false; render(); window.scrollTo({ top: 0 }); }
    else if (act === 'gbd') { GD.d = +a.dataset.n; render(); }
    else if (act === 'gbfight') gbossFight();
    else if (act === 'profile') openProfile(id);
    else if (act === 'ginvf') sendInvite(a.dataset.code);
    else if (act === 'ginvopen') openInvite();
    else if (act === 'ginvacc') answerInvite(+id, true);
    else if (act === 'ginvdec') answerInvite(+id, false);
    else if (act === 'pfhero') { PF.sel = id; renderProfile(); }
    else if (act === 'pfclose') { PF.id = null; $('#modal').hidden = true; }

    else if (act === 'glnav') { e.preventDefault(); const s = document.getElementById('gl-' + a.dataset.id); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (act === 'socreload') socialLoad();
    else if (act === 'copycode') { const c = SO.code; navigator.clipboard.writeText(c).then(() => toast('Friend code copied.'), () => toast('Your friend code: ' + c, false, 5000)); }
    else if (act === 'fraccept') friendAct('friend_respond', { other: id, accept: true }, 'Friend added!');
    else if (act === 'frdecline') friendAct('friend_respond', { other: id, accept: false }, 'Request declined.');
    else if (act === 'frremove') { if (a.dataset.name) confirmBox('Remove friend?', `Remove <b>${esc(a.dataset.name)}</b> from your friends?`, 'Remove', () => friendAct('friend_remove', { other: id }, 'Friend removed.')); else friendAct('friend_remove', { other: id }, 'Request cancelled.'); }
    else if (act === 'mailclaim') claimMail(a.dataset.id);
    else if (act === 'startover') confirmBox('Start over?', `All your heroes, gear, Sigils, shards and progress will be gone and you begin again by creating a new hero. Your name stays.<br><br>A backup of your current progress is kept on this device (Town Hall → Backups), just in case.`, 'Yes, start over', startOver);
    else if (act === 'restorebk') { const n = +a.dataset.n; confirmBox('Restore this backup?', 'Your game goes back to this saved copy. Your current progress is kept as a backup, so you can switch back.', 'Restore', () => restoreBackup(n)); }
    else if (act === 'mode') { S.diff = +a.dataset.diff; delete S.chap; campSel = null; save(); render(); }
    else if (act === 'chap') { S.chap = +a.dataset.n; save(); render(); }
    else if (act === 'chopen') { S.chap = +a.dataset.n; CV.view = 'stages'; campSel = null; save(); render(); window.scrollTo({ top: 0 }); }
    else if (act === 'chlist') { CV.view = 'chapters'; render(); window.scrollTo({ top: 0 }); }
    else if (act === 'csel') { campSel = campSel === +a.dataset.stage ? -1 : +a.dataset.stage; render(); } // a stage row opens and closes
    else if (act === 'chclaim') { const c = +a.dataset.chap, d = S.diff || 0; if (clearedOn(d) >= c * 7 + 6 && !chrClaimed(c, d)) { S.chr = S.chr || {}; (S.chr[d] = S.chr[d] || []).push(c); grantGift(chapterReward(c, d)); save(); hud(); render(); SFX.up(); chestPop(c, d, true); } }
    else if (act === 'chpeek') { const c = +a.dataset.chap, d = S.diff || 0; chestPop(c, d, false); }
    else if (act === 'play') { if (fightSpot() || firstSteps()) { spotFight = false; startCampaign(+a.dataset.stage); } else openPrep(+a.dataset.stage); } // Fight opens the team screen first (prepHtml)
    else if (act === 'ppgo') { spotFight = false; if (PREP.tower) startTower(PREP.tower, twProg(PREP.tower) + 1); else if (PREP.boss) startDungeon(PREP.boss, PREP.n); else startCampaign(PREP.stage); }
    else if (act === 'ppback') { if (PREP.tower) { TV.view = 'floors'; setTab('tower'); } else if (PREP.boss) { BV.view = 'levels'; setTab('kerkers'); } else { CV.view = 'stages'; setTab('campagne'); } window.scrollTo({ top: 0 }); }
    else if (act === 'ppph') { PREP.ph = +a.dataset.n; render(); }
    else if (act === 'auto10') startCampaign(+a.dataset.stage, { n: 10, k: 1, won: 0 });
    else if (act === 'bhauto') startDungeon(id, +a.dataset.n, { n: 10, k: 1, won: 0 });
    else if (act === 'spotblock') toast('Tap the glowing Fight button to start.');
    else if (act === 'tournext') { if (tourStep < TOUR.length - 1) { tourStep++; render(); } else { S.seen.tour = true; tourStep = 0; save(); spotFight = true; setTab('campagne'); window.scrollTo({ top: 0 }); } }
    else if (act === 'tourskip') { S.seen.tour = true; tourStep = 0; save(); render(); }
    else if (act === 'bhopen') { S.bhCur = id; BV.view = 'levels'; BV.open = -1; save(); render(); window.scrollTo({ top: 0 }); }
    else if (act === 'bhlist') { BV.view = 'bosses'; render(); window.scrollTo({ top: 0 }); }
    else if (act === 'bhlvl') { BV.open = BV.open === +a.dataset.n ? -1 : +a.dataset.n; render(); } // a level row opens and closes
    else if (act === 'bhplay') openBossPrep(id, +a.dataset.n); // Fight opens the team screen first
    else if (act === 'summon') doSummon(+a.dataset.n, a.dataset.type);
    else if (act === 'buyshard') { if (S.silver >= K.SHARD_PRICE) { S.silver -= K.SHARD_PRICE; S.fs.fate++; save(); render(); toast('Fate Shard bought.'); } }
    else if (act === 'toggle' && id === heroId()) toast('Your hero is always at your side: they fight in every team.');
    else if (act === 'toggle') {
      const i = S.team.indexOf(id);
      if (i >= 0) { if (S.team.length > 1) S.team.splice(i, 1); else toast('Your team needs at least one champion.', true); }
      else if (onExp(id)) toast(`${C[id].short} is away on an expedition.`, true);
      else if (S.team.length < 4) S.team.push(id);
      else toast('Your team is full. Remove someone first.', true);
      save(); render();
    } else if (act === 'sel') { selChamp = id; FG.pick = null; HB.up = null; render(); }
    else if (act === 'tmsel') { S.tsel = +a.dataset.i; S.team = S.teams[S.tsel].ids; if (!S.team.includes(selChamp)) selChamp = S.team[0] || selChamp; save(); render(); }
    else if (act === 'tmmode') { S.modeTeam[a.dataset.m] = S.tsel; save(); render(); }
    else if (act === 'editteam') { useTeam(a.dataset.mode); setTab('team'); }
    else if (act === 'editbteam') { useBossTeam(a.dataset.aff); setTab('team'); }
    else if (act === 'tmnew') nameBox('Create a team', freeTeamName(), 'Create', name => { S.teams.push({ name, ids: [...S.team] }); S.tsel = S.teams.length - 1; S.team = S.teams[S.tsel].ids; save(); render(); toast(`${name} is created with the heroes of your current team. Change them below.`, false, 4000); });
    else if (act === 'tmname') nameBox('Rename team', S.teams[S.tsel].name, 'Save', name => { S.teams[S.tsel].name = name; save(); render(); });
    else if (act === 'tmfav') { S.tfav = S.tfav === S.tsel ? null : S.tsel; save(); render(); }
    else if (act === 'tmdel') {
      const i = S.tsel, t = S.teams[i];
      confirmBox(`Delete ${esc(t.name)}?`, 'The heroes stay in your roster; only this team is removed. Game modes that used it switch to your first team.', 'Delete', () => {
        S.teams.splice(i, 1);
        for (const [m] of TEAM_MODES) S.modeTeam[m] = S.modeTeam[m] === i ? 0 : S.modeTeam[m] > i ? S.modeTeam[m] - 1 : S.modeTeam[m];
        for (const k in S.bossTeam || {}) { if (S.bossTeam[k] === i) delete S.bossTeam[k]; else if (S.bossTeam[k] > i) S.bossTeam[k]--; }
        S.tfav = S.tfav === i ? null : S.tfav > i ? S.tfav - 1 : S.tfav;
        S.tsel = 0; linkTeams(S); save(); render();
      });
    }
    else if (act === 'expsel') {
      if (EXSEL.has(id)) { EXSEL.delete(id); render(); return; }
      if (EXSEL.size >= K.EXP_HEROES) { toast(`A crew has at most ${K.EXP_HEROES} heroes.`, true); return; }
      const tms = S.teams.filter(t => t.ids.includes(id));
      if (!tms.length) { EXSEL.add(id); render(); return; }
      const alone = tms.find(t => t.ids.length === 1);
      if (alone) { toast(`${C[id].short} is the only hero in ${alone.name}. Add another hero to that team first.`, true, 4000); return; }
      confirmBox(`${esc(C[id].short)} is in a team`, `${esc(C[id].short)} is in ${esc(tms.map(t => t.name).join(' and '))}. Take ${esc(C[id].short)} out of ${tms.length > 1 ? 'those teams' : 'that team'} to send ${esc(C[id].short)} on the expedition?`, 'Take out of the team', () => {
        for (const t of tms) t.ids.splice(t.ids.indexOf(id), 1); // in place: S.team is one of these arrays
        EXSEL.add(id); save(); render(); toast(`${C[id].short} left ${tms.map(t => t.name).join(' and ')} and joins the crew.`);
      });
    }
    else if (act === 'expgo') {
      if (S.exp || !EXSEL.size) return;
      const k = +a.dataset.k, now = Date.now();
      S.exp = { k, ids: [...EXSEL].filter(x => S.roster[x] && !inAnyTeam(x)), start: now, end: now + K.EXPEDITIONS[k].hours * 3600e3, lvl: expLvl() };
      track('exp');
      EXSEL.clear(); save(); render(); toast(`${K.EXPEDITIONS[k].name}: the ship sets sail. Back in ${K.EXPEDITIONS[k].hours} ${K.EXPEDITIONS[k].hours === 1 ? 'hour' : 'hours'}.`);
    }
    else if (act === 'expclaim') expClaim();
    else if (act === 'exprecall') confirmBox('Recall the ship?', 'The crew comes home now, without any rewards.', 'Recall', () => { S.exp = null; save(); render(); });
    else if (act === 'artab') { AR.tab = a.dataset.t; render(); }
    else if (act === 'twsel') { S.tw.cur = a.dataset.e; TV.view = 'floors'; TV.open = 0; save(); render(); window.scrollTo({ top: 0 }); }
    else if (act === 'twlist') { TV.view = 'towers'; render(); window.scrollTo({ top: 0 }); }
    else if (act === 'twrow') { TV.open = TV.open === +a.dataset.n ? 0 : +a.dataset.n; render(); } // a floor row opens and closes
    else if (act === 'twteam') openTowerPrep(S.tw.cur || 'Ember');
    else if (act === 'sggo') startSiege(+a.dataset.n);
    else if (act === 'evpop') evPop(+a.dataset.d, a.dataset.k);
    else if (act === 'admload') { ADM.data = null; ADM.err = ''; render(); }
    else if (act === 'admlb') admLbSet(a.dataset.uid, a.dataset.s);
    else if (act === 'admview') { ADM.view = a.dataset.v; render(); window.scrollTo({ top: 0 }); }
    else if (act === 'admchf') { ADM.chF = a.dataset.k; render(); }
    else if (act === 'admchopen') { ADM.open = ADM.open === a.dataset.uid ? '' : a.dataset.uid; render(); }
    else if (act === 'admws') { ADM.ws = a.dataset.k; cloud().rpc('admin_watch', { sort: ADM.ws }).then(w => { ADM.watch = w; if (tab === 'admin') render(); }, () => {}); }
    else if (act === 'story') { if (storyOpen(a.dataset.k)) playScene(a.dataset.k).then(() => render()); }
    else if (act === 'sgrow') { SGV.open = SGV.open === +a.dataset.n ? 0 : +a.dataset.n; render(); }
    else if (act === 'twpick') { const e = S.tw.cur || 'Ember', t = twTeam(e), i = t.indexOf(id); if (!twFits(id, e)) return; if (id === heroId()) { toast('Your hero always climbs with you.'); return; } if (i >= 0) t.splice(i, 1); else if (t.length < 4) t.push(id); else { toast('A tower team has at most four heroes.', true); return; } S.tw.team[e] = t; save(); render(); }
    else if (act === 'twgo') openTowerPrep(S.tw.cur || 'Ember'); // Fight opens the team screen first
    else if (act === 'prestige') {
      if (S.p.lvl < PLAYER_MAX) return;
      const n = (S.p.prestige || 0) + 1;
      confirmBox(`Prestige ${romanN(n)}?`, `You go back to player level 1 and keep everything else: heroes, gear, campaign progress, open buildings and your maximum energy. You earn prestige emblem ${romanN(n)}, ${PRESTIGE_REWARD.silver.toLocaleString('en-US')} Sigils and a ${esc(K.SHARD.mythic.name)}, and every level-up pays its reward again.`, `Prestige ${romanN(n)}`, () => {
        S.p.prestige = n; S.p.lvl = 1; S.p.xp = 0; S.silver += PRESTIGE_REWARD.silver; for (const t in PRESTIGE_REWARD.fs) S.fs[t] = (S.fs[t] || 0) + PRESTIGE_REWARD.fs[t];
        save(); hud(); render(); SFX.up(); toast(`Prestige ${romanN(n)}! A new emblem is yours. Level 1 again, with everything you own.`, false, 5000);
      });
    }
    else if (act === 'hlock') { const h = S.roster[id]; if (!h) return; h.lock = !h.lock; if (!h.lock) delete h.lock; save(); render(); toast(h.lock ? `${C[id].short} is locked: it will never be offered as food.` : `${C[id].short} is unlocked.`); }
    else if (act === 'hinfo') heroInfo(id);
    else if (act === 'hteam') { $('#modal').hidden = true; selChamp = id; champTab = 'gear'; HX.view = 'hero'; setTab('team'); }
    else if (act === 'ctab') { if (a.dataset.t === 'level') { openLevelUp(selChamp); return; } champTab = a.dataset.t; render(); } // Level up opens its own popup
    else if (['luclose', 'lutile', 'luelx', 'luclear', 'luauto', 'luskill', 'lubreak', 'lugo'].includes(act)) luAct(act, a);
    else if (act === 'hxfilt') { HX.filt = !HX.filt; render(); }
    else if (act === 'hxview') { HX.view = a.dataset.v; render(); }
    // ----- the gear bag on the Heroes screen (HB) -----
    else if (act === 'hxslot' && S.roster[selChamp]) { FG.slot = a.dataset.slot; FG.pick = null; HB.open = true; HB.up = null; render(); }
    else if (act === 'hbpick' && item) { FG.pick = item.owner === selChamp || FG.pick === item.id ? null : item.id; HB.up = null; render(); }
    else if (act === 'hbup' && item) { HB.up = item.id; render(); }
    else if (act === 'hbback') { HB.up = null; render(); }
    else if (act === 'hbclose') { HB.open = false; HB.up = null; FG.pick = null; render(); }
    // Gear › elsewhere: that hero's bag
    else if (act === 'fgo' && S.roster[id]) { selChamp = id; champTab = 'gear'; HX.view = 'hero'; FG.pick = null; HB.open = true; HB.up = null; setTab('team'); window.scrollTo({ top: 0 }); }
    else if (act === 'fgreset') { Object.assign(FG, { rar: 'all', set: 'all', main: 'all', sub: 'all', sort: 'power', worn: true, free: true }); render(); }
    else if (act === 'fgforge' && item) {
      // in Items: the upgrade panel under the piece; elsewhere: the bag's upgrade panel, with its wearer or the current hero
      if (tab === 'forge') { VT.open = item.id; VT.up = VT.up === item.id ? null : item.id; render(); return; }
      if (item.owner && S.roster[item.owner]) selChamp = item.owner;
      FG.slot = item.slot; FG.pick = item.owner === selChamp ? null : item.id; HB.open = true; HB.up = item.id; champTab = 'gear'; HX.view = 'hero';
      if (tab !== 'team') setTab('team'); else render();
    }
    else if (act === 'fgupms' && item) {
      const target = [4, 8, 12, 16].find(m => m > item.lvl), r = upgradeTo(item, target);
      if (!r.ok && !r.fail) { toast('Not enough Sigils.', true); return; }
      (item.lvl >= target ? SFX.up : SFX.fail)();
      save(); render(); upgGlow('fgupms', item, item.lvl >= target ? 'ok' : 'fail'); // gold when it got there, red when the Sigils ran out first
    }
    else if (act === 'icat') { FG.cat = a.dataset.k; FG.mat = null; if (FG.cat !== 'all' && FG.cat !== 'gear') { VT.sell = false; VT.sel.clear(); } VT.open = null; render(); }
    else if (act === 'imat') { FG.mat = FG.mat === a.dataset.id.replace(':', '') ? null : a.dataset.id.replace(':', ''); VT.open = null; render(); }
    else if (act === 'iequip' && item) { selChamp = item.owner && S.roster[item.owner] ? item.owner : selChamp; FG.slot = item.slot; FG.pick = item.owner === selChamp ? null : item.id; HB.open = true; HB.up = null; champTab = 'gear'; HX.view = 'hero'; VT.open = null; setTab('team'); window.scrollTo({ top: 0 }); }

    else if (act === 'vreset') { Object.assign(VT, { slot: 'all', rar: 'all', set: 'all', st: 'all', sort: 'rar' }); render(); }
    else if (act === 'equip' && item && !wearOk(selChamp, item)) toast(`Ascended gear needs a ${K.ASC_STARS}★ hero.`, true);
    else if (act === 'equip' && item && equipBlock(selChamp, item)) toast(equipBlock(selChamp, item), true);
    else if (act === 'equip' && item) {
      S.inv.filter(x => x.owner === selChamp && x.slot === item.slot).forEach(x => (x.owner = null));
      item.owner = selChamp; FG.pick = null; save(); render(); toast(`${itemName(item)} equipped.`);
    } else if (act === 'unequip' && item && item.lock) toast(`This ${K.SLOT_NAMES[item.slot].toLowerCase()} is locked to ${C[item.owner] ? C[item.owner].short : 'its hero'}. Unlock it first.`, true);
    else if (act === 'unequip' && item) { $('#modal').hidden = true; item.owner = null; save(); render(); }
    else if (act === 'repequip' && item && S.roster[a.dataset.id] && !wearOk(a.dataset.id, item)) toast(`Ascended gear needs a ${K.ASC_STARS}★ hero.`, true);
    else if (act === 'repequip' && item && S.roster[a.dataset.id] && equipBlock(a.dataset.id, item)) toast(equipBlock(a.dataset.id, item), true);
    else if (act === 'repequip' && item && S.roster[a.dataset.id]) {
      // from the Auto ×10 summary: on the hero it suits best, in place of what that hero wore in that slot
      const id = a.dataset.id;
      S.inv.filter(x => x.owner === id && x.slot === item.slot).forEach(x => (x.owner = null));
      item.owner = id; save(); SFX.click(); toast(`${itemName(item)} equipped on ${C[id].short}.`);
      repRefresh();
    }
    // the Auto ×10 summary's gear boxes (repSummary): open one, or pick several in select mode, and act on them
    else if (act === 'rbox' && item) {
      RSUM.arm = null;
      if (RSUM.selecting) { if (!sellable(item)) { toast(item.lock ? 'Locked gear cannot be sold.' : 'Worn gear cannot be sold.', true); return; } RSUM.sel.has(item.id) ? RSUM.sel.delete(item.id) : RSUM.sel.add(item.id); }
      else RSUM.open = RSUM.open === item.id ? null : item.id;
      repRefresh();
    }
    else if (act === 'rselmode') { RSUM.selecting = !RSUM.selecting; RSUM.sel.clear(); RSUM.arm = null; repRefresh(); }
    else if (act === 'rselall') { RSUM.arm = null; if (lastRep) lastRep.sum.items.map(i => S.inv.find(x => x.id === i)).filter(it => it && sellable(it)).forEach(it => RSUM.sel.add(it.id)); repRefresh(); }
    else if (act === 'rupg' && item) {
      RSUM.arm = null;
      const res = tryUpgrade(item); if (!res) return;
      save(); repRefresh(); upgGlow('rupg', item, res);
    }
    else if (act === 'rlock' && item) { item.lock = !item.lock; if (!item.lock) delete item.lock; RSUM.arm = null; save(); repRefresh(); }
    else if (act === 'rsell1' && item && sellable(item)) {
      // Epic or better asks once more (on the button itself: a confirm dialog would replace the result)
      if ((item.rar >= 3 || item.asc) && RSUM.arm !== 'one' + item.id) { RSUM.arm = 'one' + item.id; repRefresh(); return; }
      const v = K.sellValue(item); S.silver += v; S.inv = S.inv.filter(x => x !== item); RSUM.open = null; RSUM.arm = null; save(); SFX.up(); toast(`Sold for ${v.toLocaleString('en-US')} Sigils.`); repRefresh();
    }
    else if (act === 'rsellsel') {
      const list = S.inv.filter(it => RSUM.sel.has(it.id) && sellable(it)); if (!list.length) return;
      if (list.some(it => it.rar >= 3 || it.asc) && RSUM.arm !== 'sel') { RSUM.arm = 'sel'; repRefresh(); return; }
      const v = list.reduce((t, it) => t + K.sellValue(it), 0); S.silver += v; S.inv = S.inv.filter(it => !list.includes(it));
      RSUM.sel.clear(); RSUM.selecting = false; RSUM.arm = null; save(); SFX.up(); toast(`Sold ${list.length} ${list.length === 1 ? 'piece' : 'pieces'} for ${v.toLocaleString('en-US')} Sigils.`); repRefresh();
    }
    else if (act === 'sell' && item) {
      if (item.lock) { toast('This gear is locked. Unlock it first to sell it.', true); return; }
      const v = K.sellValue(item), doSell = () => { $('#modal').hidden = true; S.silver += v; S.inv = S.inv.filter(x => x !== item); if (VT.open === item.id) VT.open = null; save(); render(); toast(`Sold for ${v} Sigils.`); };
      // ascended gear cost Ascension Stones and Sigils: ask first
      if (item.asc) confirmBox('Sell ascended gear?', `${esc(itemName(item))} is ascended (${item.asc}/${K.MAX_ASC} orange stars). Selling it gives ${v.toLocaleString('en-US')} Sigils; the Ascension Stones are not returned.`, 'Sell', doSell); else doSell();
    }
    else if (act === 'ascend' && item) {
      // Item Ascension: always succeeds, costs Ascension Stones and Sigils (K.ASC_COST)
      const ac = K.ascCost(item); if (!ac) return;
      if (item.owner && !wearOk(item.owner, { asc: 1 })) { toast(`${C[item.owner].short} needs ${K.ASC_STARS}★ to wear ascended gear.`, true); return; }
      const t = ac.greater ? 'greater' : 'ancient', need = ac.greater || ac.ancient;
      if (stoneN(t) < need || S.silver < ac.silver) { toast(`You need ${need} ${stoneName(t, need)} and ${ac.silver.toLocaleString('en-US')} Sigils.`, true); return; }
      const r = a.getBoundingClientRect();
      S.stx[t] -= need; S.silver -= ac.silver; item.asc = (item.asc || 0) + 1;
      SFX.up(); upgFx(r, true, '★'.repeat(item.asc)); toast(`Ascended: ${itemName(item)}${item.asc >= K.MAX_ASC ? ' · fully ascended!' : ''}`);
      save(); render();
    }
    else if (act === 'iclose') { VT.open = null; VT.up = null; FG.mat = null; render(); }
    else if (act === 'vsellmode') { VT.sell = !VT.sell; VT.sel.clear(); VT.open = null; render(); }
    else if (act === 'vpick' && item) {
      FG.mat = null;
      if (VT.sell) { if (!sellable(item)) { toast(item.lock ? 'Locked gear cannot be sold.' : 'Worn gear cannot be sold.', true); return; } VT.sel.has(item.id) ? VT.sel.delete(item.id) : VT.sel.add(item.id); }
      else VT.open = VT.open === item.id ? null : item.id;
      render();
    }
    else if (act === 'vquick') { const r = +a.dataset.r; VT.sel.clear(); if (r >= 0) vaultItems().filter(it => sellable(it) && it.rar <= r).forEach(it => VT.sel.add(it.id)); render(); }
    else if (act === 'vlock' && item) { item.lock = !item.lock; if (!item.lock) delete item.lock; save(); render(); const w = item.owner && C[item.owner] ? C[item.owner].short : null; toast(item.lock ? (w ? `Locked to ${w}: it stays on ${w} until you unlock it.` : 'Locked: this gear cannot be sold.') : 'Unlocked.'); }
    else if (act === 'vsell') {
      const list = S.inv.filter(it => VT.sel.has(it.id) && sellable(it)); if (!list.length) return;
      const v = list.reduce((t, it) => t + K.sellValue(it), 0), rare = list.filter(it => it.rar >= 3 || it.asc).length;
      const doSell = () => { S.silver += v; S.inv = S.inv.filter(it => !list.includes(it)); VT.sel.clear(); save(); render(); hud(); SFX.up(); toast(`Sold ${list.length} ${list.length === 1 ? 'piece' : 'pieces'} for ${v.toLocaleString('en-US')} Sigils.`); };
      // Epic or better in the selection: ask first
      if (rare) confirmBox('Sell this gear?', `You are selling ${list.length} pieces, <b>${rare} of them Epic or better</b>, for ${v.toLocaleString('en-US')} Sigils.`, 'Sell', doSell); else doSell();
    }
    else if (act === 'up' && item) {
      const res = tryUpgrade(item); if (!res) return;
      save(); render(); upgGlow('up', item, res);
    } else if (act === 'bestgear') {
      // slot by slot, repeated until nothing improves: a swap can complete or break a set and so change what is best
      // for the other slots (one pass used to leave work for a second click)
      const h = S.roster[selChamp], was = new Set(itemsOf(selChamp));
      for (let pass = 0, more = true; more && pass < 8; pass++) {
        more = false;
        for (const slot of K.SLOTS) {
          const cur = S.inv.find(x => x.owner === selChamp && x.slot === slot);
          const others = itemsOf(selChamp).filter(x => x.slot !== slot);
          if (cur && cur.lock) continue; // a piece locked to this hero stays
          const cands = S.inv.filter(x => x.slot === slot && (!x.owner || x.owner === selChamp) && wearOk(selChamp, x));
          // by what the hero's role needs (gearFit), not raw Power
          let best = cur, bestP = gearFit(selChamp, h, cur ? [...others, cur] : others);
          for (const c of cands) { const pw = gearFit(selChamp, h, [...others, c]); if (pw > bestP + 1e-6) { best = c; bestP = pw; } }
          if (best && best !== cur) { if (cur) cur.owner = null; best.owner = selChamp; more = true; }
        }
      }
      const changed = itemsOf(selChamp).filter(x => !was.has(x)).length;
      save(); render(); toast(changed ? `Swapped ${changed} ${changed === 1 ? 'piece' : 'pieces'} of gear.` : 'Already wearing the best available gear.');
    } else if (act === 'unequipall') {
      const all = itemsOf(selChamp), worn = all.filter(x => !x.lock), kept = all.length - worn.length;
      worn.forEach(x => (x.owner = null));
      save(); render(); toast(`Removed ${worn.length} ${worn.length === 1 ? 'piece' : 'pieces'} of gear.${kept ? ` ${kept} locked ${kept === 1 ? 'piece stays' : 'pieces stay'}.` : ''}`);
    } else if (act === 'elixir') {
      // drink elixirs one by one (each at the hero's current level) until the count, the stock or the level cap runs out
      const e = a.dataset.e, h = S.roster[selChamp], to = selChamp;
      if (!h || !K.elixirFits(e, to)) return;
      let n = Math.min(+a.dataset.n || 1, S.elx[e] || 0), used = 0, gain = 0; const l0 = h.lvl;
      while (n-- > 0 && h.lvl < K.maxLvl(h.stars, to)) { const g = K.elixirXp(h.lvl); S.elx[e]--; used++; gain += g; giveXp(g); }
      if (!used) return;
      track('feed'); SFX.up(); save(); render();
      toast(`${C[to].short} drank ${used} ${elxName(e, used)}: +${gain.toLocaleString('en-US')} XP${h.lvl > l0 ? `, now level ${h.lvl}` : ''}.`);
    } else if (act === 'feed') {
      const f = a.dataset.f, h = S.roster[selChamp], to = selChamp;
      if (!(S.fodder[f] > 0) || h.lvl >= K.maxLvl(h.stars, selChamp)) return;
      const go = () => {
        if (!(S.fodder[f] > 0) || selChamp !== to) return;
        const gain = K.feedXp(f, h.lvl); S.fodder[f]--; const up = giveXp(gain); track('feed');
        SFX.up(); save(); render(); toast(`${C[to].short} was fed a copy of ${C[f].name}: +${gain.toLocaleString('en-US')} XP${up ? `, now level ${h.lvl}` : ''}.`);
      };
      if (C[f].rar >= 2) confirmBox('Are you sure?', `Feed a ${K.RARITIES[C[f].rar]} copy of <b>${esc(C[f].name)}</b> to ${esc(C[to].short)}? The copy is used up.`, 'Yes, feed it', go, 'feedcopy'); else go();
    } else if (act === 'feedhero') {
      const x = id, h = S.roster[selChamp], to = selChamp;
      if (!S.roster[x] || S.roster[x].lock || x === to || inAnyTeam(x) || onExp(x) || h.lvl >= K.maxLvl(h.stars, to)) return;
      const go = () => {
        if (!S.roster[x] || selChamp !== to) return;
        const gain = K.feedXp(x, h.lvl, S.roster[x].lvl), worn = itemsOf(x);
        delete S.roster[x]; worn.forEach(it => (it.owner = null)); if (S.p.avatar === x) S.p.avatar = null;
        track('feed');
        const up = giveXp(gain);
        SFX.up(); save(); render(); toast(`${C[to].short} absorbed ${C[x].name}: +${gain.toLocaleString('en-US')} XP${up ? `, now level ${h.lvl}` : ''}.${worn.length ? ' Their gear went back to your inventory.' : ''}`);
      };
      if (C[x].rar >= 2) confirmBox('Are you sure?', `Feed <b>${esc(C[x].name)}</b> (${K.RARITIES[C[x].rar]}, level ${S.roster[x].lvl}) to ${esc(C[to].short)}? ${esc(C[x].short)} is gone for good; their gear goes back to your inventory.`, `Yes, feed ${esc(C[x].short)}`, go, 'feedhero'); else go();
    } else if (act === 'skillup') {
      const f = a.dataset.f, h = S.roster[selChamp];
      if (f !== selChamp || !(S.fodder[f] > 0)) return;
      const i = K.skillUp(h, f); if (i < 0) return;
      track('feed');
      S.fodder[f]--; SFX.summon(3); save(); render();
      toast(`${C[f].skills[i].name} is now skill level ${h.sk[i]}/${K.SKILL_MAX}: ${skillLvTxt(C[f].skills[i], h.sk[i]).replace(/^Skill level \d+: /, '')}${h.sk[i] >= K.SKILL_MAX && C[f].skills[i].cd ? ', cooldown −1' : ''}.`);
    } else if (act === 'cfyes') { const tick = $('#cf-skip'); if (confirmSkip && tick && tick.checked) skipAsk[confirmSkip] = true; $('#modal').hidden = true; const f = confirmYes; confirmYes = null; confirmSkip = null; if (f) f(); }
    else if (act === 'cfno') { $('#modal').hidden = true; confirmYes = null; }
    else if (act === 'breakdown') {
      const f = a.dataset.f; if (!(S.fodder[f] > 0)) return;
      S.fodder[f]--; S.stones += K.breakStones(f); save(); render(); toast(`${C[f].name} broken down into ${K.breakStones(f)} Ascension ${K.breakStones(f) === 1 ? 'Stone' : 'Stones'}.`);
    } else if (act === 'release') {
      if (!C[id] || !C[id].captured || inAnyTeam(id) || onExp(id)) return;
      delete S.roster[id]; S.fodder[id] = (S.fodder[id] || 0) + 1;
      S.inv.forEach(x => { if (x.owner === id) x.owner = null; });
      selChamp = S.team[0]; save(); render(); toast(`${C[id].name} is now a spare copy. Capture another to use it as a hero again.`);
    } else if (act === 'rank') {
      const h = S.roster[selChamp], rc = K.rankCost(h.stars);
      if (C[selChamp].pc) return; // the own hero gains its stars by itself (pcStars)
      if (h.stars >= K.maxStars(selChamp) || h.lvl < K.maxLvl(h.stars, selChamp) || stoneN(rc.tier) < rc.stones || S.silver < rc.silver) return;
      if (rc.tier === 'lesser') S.stones -= rc.stones; else S.stx[rc.tier] -= rc.stones; S.silver -= rc.silver; h.stars++; track('asc'); SFX.summon(3); save(); render(); toast(`${C[selChamp].short} is now ${h.stars}★. New maximum: level ${K.maxLvl(h.stars, selChamp)}.`);
    } else if (act === 'modal') modalAction(a.dataset.go);
  });

  // ---------- summon ----------
  let lastType = 'fate';
  // ----- the summon reveal: a Rare or better summon builds up before the result. The shard charges in blue and, one step
  // at a time, turns violet for an Epic and gold for a Legendary, then bursts open on the hero. A 10x summon shows every
  // Epic and Legendary (or its best Rare) this way, the best first, then the usual result. A tap while it charges jumps to
  // the burst, Skip goes straight to the result.
  function summonReveal(res, type, done) {
    const best = Math.max(...res.map(r => r.rar));
    let show = res.filter(r => r.rar >= 3); if (!show.length) show = [res.find(r => r.rar === best)];
    show = show.slice().sort((a, b) => b.rar - a.rar);
    const calmFx = matchMedia('(prefers-reduced-motion: reduce)').matches, STEP = calmFx ? 350 : 950;
    const art = {}; show.forEach(r => SPR.loadHi(r.id).then(h => { if (h) art[r.id] = h.src; })); // the sharp picture (k = 4), on its way while the shard charges
    const el = document.createElement('div'); el.className = 'sfx lv2 charge'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Summoning');
    const motes = Array.from({ length: 28 }, () => { const a = Math.random() * 6.283, d = 34 + Math.random() * 30; return `<i style="--dx:${(Math.cos(a) * d).toFixed(1)}vmin;--dy:${(Math.sin(a) * d).toFixed(1)}vmin;animation-delay:${(-Math.random() * 1.2).toFixed(2)}s"></i>`; }).join('');
    const sparks = Array.from({ length: 34 }, () => { const a = Math.random() * 6.283, d = 30 + Math.random() * 45; return `<i style="--dx:${(Math.cos(a) * d).toFixed(1)}vmin;--dy:${(Math.sin(a) * d).toFixed(1)}vmin;--s:${(0.5 + Math.random()).toFixed(2)}"></i>`; }).join('');
    el.innerHTML = `<div class="sfx-motes">${motes}</div><div class="sfx-circle"></div><div class="sfx-glow"></div><img class="sfx-shard" src="${SHARD_ART[type + '0']}" alt=""><div class="sfx-sparks">${sparks}</div><div class="sfx-flash"></div><div class="sfx-stage"></div><button type="button" class="sfx-skip">Skip ›</button>`;
    document.body.appendChild(el);
    let T = [], phase = 'charge', idx = 0, shownAt = 0;
    const at = (ms, f) => T.push(setTimeout(f, ms)), clear = () => { T.forEach(clearTimeout); T = []; };
    const set = (r, ph) => { el.className = `sfx lv${r} ${ph}`; };
    const flash = () => { const f = el.querySelector('.sfx-flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); };
    const steps = [2, 3, 4].filter(r => r <= best);
    SFX.sumCharge(steps.length);
    steps.forEach((r, k) => { if (k) at(k * STEP, () => { set(r, 'charge'); flash(); SFX.sumStep(r); }); });
    at(steps.length * STEP + 250, burst);
    function burst() {
      clear(); phase = 'burst'; set(best, 'burst'); flash(); SFX.sumBurst(best);
      at(calmFx ? 150 : 520, () => reveal(0));
    }
    function reveal(n) {
      const r = show[n], c = C[r.id]; idx = n; phase = 'reveal'; shownAt = Date.now();
      if (n) { flash(); SFX.sumBurst(r.rar); }
      el.querySelector('.sfx-stage').innerHTML = `<div class="sfx-hw"><div class="sfx-rays"></div><img class="sfx-hero" src="${art[r.id] || bossBig(r.id)}" alt=""></div>
        <div class="sfx-info" style="--ec:${AFF_COL[c.aff]}"><small class="sfx-rar">${K.RARITIES[r.rar]}</small><h2>${esc(c.name)}</h2>${starStr(K.baseStars(r.id), r.rar + 1)}
        <span class="sfx-id">${essBadge(c.aff)}<span>${c.aff} · ${roleStr(c)}</span></span>${r.isNew ? '<span class="sfx-new">New hero!</span>' : '<small class="sfx-dup">Spare copy: feed it to level a skill</small>'}</div>
        <div class="sfx-tap">${show.length > 1 ? `${n + 1} / ${show.length} · ` : ''}Tap to continue</div>`;
      set(r.rar, 'reveal' + (n ? ' again' : ''));
    }
    function finish() { clear(); document.removeEventListener('keydown', key, true); el.remove(); done(); }
    function next() {
      if (phase === 'charge') burst();
      else if (phase === 'reveal' && Date.now() - shownAt > 450) { if (idx + 1 < show.length) reveal(idx + 1); else finish(); }
    }
    function key(e) { e.preventDefault(); e.stopPropagation(); if (e.key === 'Escape') finish(); else if (e.key === 'Enter' || e.key === ' ') next(); }
    el.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('.sfx-skip')) finish(); else next(); });
    document.addEventListener('keydown', key, true);
  }
  function doSummon(n, type) {
    type = type || lastType; lastType = type;
    if ((S.fs[type] || 0) < n || !unlocked('altaar')) return;
    S.fs[type] -= n; S.p.st.summons += n; track('summon', n);
    const res = [];
    const storm = evNow('storm'), step = storm && storm.shard === type ? 2 : 1; // a Shard Storm: this shard counts double for the Legendary pity
    for (let i = 0; i < n; i++) res.push(K.summonOne(S, type, step));
    save(); render();
    const best = Math.max(...res.map(r => r.rar));
    if (best >= 2) summonReveal(res, type, () => summonResult(res, type, best));
    else { SFX.summon(best); summonResult(res, type, best); }
  }
  function summonResult(res, type, best) {
    const n = res.length;
    const cards = res.map((r, i) => `<div class="sum-card rar-${r.rar}" style="animation-delay:${i * 0.12}s">${por(r.id)}<span class="nm">${esc(C[r.id].short)}</span><small class="rartxt">${K.RARITIES[r.rar]}</small>${r.isNew ? '<span class="new">NEW</span>' : '<small>Spare copy: feed it to level a skill</small>'}</div>`).join('');
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box violet sum-box ${n > 1 ? 'wide' : ''}" role="dialog" aria-modal="true"><h2>${best >= 4 ? 'Legendary!' : best >= 3 ? 'Epic!' : 'Summoned'}</h2><p class="tag">${esc(K.SHARD[type].name)} · ${S.fs[type]} left</p><div class="summon-grid">${cards}</div>
      <div class="modal-actions"><button class="btn violet" data-act="modal" data-go="summon1" ${S.fs[type] < 1 ? 'disabled' : ''}>1 more · ${shardIc(type)}</button>${S.fs[type] >= 10 ? '<button class="btn violet" data-act="modal" data-go="summon10">10 more</button>' : ''}<button class="btn" data-act="modal" data-go="close">Close</button></div></div>`;
    m.hidden = false;
  }

  // ================= BATTLE VIEW =================
  const W = 480, H = 270;
  // where the units stand (x, feet y on the 480 × 270 field): both sides pulled back to their own edge and spread out,
  // so the field looks roomy (front line 0/2, back line 1/3)
  const HERO_POS = [[150, 188], [66, 206], [160, 250], [76, 266]];
  const ENEMY_POS = { 1: [[372, 236]], 2: [[344, 198], [352, 256]], 3: [[336, 190], [414, 220], [344, 258]], 4: [[334, 188], [414, 204], [328, 250], [408, 266]] };
  const BOSS_POS = [390, 244], GBOSS_POS = [372, 266], ADD_POS = [[306, 190], [310, 264], [282, 228]];
  // the Siege: up to ten enemies in three loose columns over the deep courtyard, filled from the middle of the front
  // column outwards; a boss wave puts its boss at the back and the guards in front
  const SIEGE_POS = [[310, 212], [302, 166], [306, 258], [364, 190], [360, 236], [358, 146], [418, 210], [412, 164], [416, 256], [458, 232]];
  const SIEGE_BOSS = [414, 228], SIEGE_FIG = 0.72, SIEGE_HERO = [[178, 176], [94, 192], [188, 232], [104, 248]];
  function siegeLayout(enemies) {
    const boss = enemies.find(u => u.isBoss); let k = 0;
    enemies.forEach(u => place(u, u === boss ? SIEGE_BOSS : SIEGE_POS[boss ? [0, 1, 2, 4, 3][k++ % 5] : k++ % SIEGE_POS.length], 260));
  }
  const R = { running: false, units: [], projs: [], parts: [], fx: [], ash: [], shake: 0, area: 0, hl: new Set(), hlKind: 'bad', active: null, dim: 0 };
  let B = null, pending = null, selSkill = 0, quitArm = 0;
  // battle speed: S.speed is the player's preferred speed, spd the speed this battle actually runs at.
  // Speeds unlock with campaign progress (stage index that must be reached); 5× only when replaying something already beaten.
  const SPEED_UNLOCK = [[2, 3], [3, 14], [5, 7]];
  let spd = 1, speeds = [1];
  // arena fights are replays of a fight already decided, so every unlocked speed (also 5×) may be used
  const beatenBefore = cfg => cfg.type === 'arena' || cfg.type === 'gboss' || cfg.type === 'siege' || (cfg.type === 'stage' ? cfg.i <= clearedOn(cfg.diff) : cfg.n <= (S.bh[cfg.id] || 0));
  function speedsFor(cfg) {
    const reached = S.cleared + 1, replay = beatenBefore(cfg);
    return [1, ...SPEED_UNLOCK.filter(([sp, at]) => reached >= at && (sp < 5 || replay)).map(([sp]) => sp)].sort((a, b) => a - b);
  }
  function speedHint() {
    const next = SPEED_UNLOCK.filter(([sp]) => !speeds.includes(sp)).sort((a, b) => a[1] - b[1])[0];
    if (!next) return '';
    return S.cleared + 1 >= next[1] ? `${next[0]}× works on stages you have already cleared.` : `${next[0]}× unlocks at ${stageName(next[1])}.`;
  }
  const cvs = $('#bc'), g = cvs.getContext('2d');
  g.imageSmoothingEnabled = false;
  // ----- battle clock -----
  // Pause: while the in-battle guide is open the battle clock stops, and every wait below holds until it resumes.
  // Background: a hidden tab gets no animation frames and throttled timers (once a second, later once a minute), so
  // there the waits run on a Web Worker timer (bgSleep), which browsers do not throttle like that: the fight plays on
  // at the same pace as when it is watched, it just is not drawn.
  const PAUSE = { on: false, since: 0, total: 0, waiters: [] };
  const clock = () => (PAUSE.on ? PAUSE.since : performance.now()) - PAUSE.total;
  const resumed = () => (PAUSE.on ? new Promise(r => PAUSE.waiters.push(r)) : Promise.resolve());
  function setPaused(on) {
    if (on === PAUSE.on) return;
    if (on) { PAUSE.on = true; PAUSE.since = performance.now(); return; }
    PAUSE.total += performance.now() - PAUSE.since; PAUSE.on = false;
    PAUSE.waiters.splice(0).forEach(r => r());
  }
  const bgSleep = (() => {
    let w = null, id = 0; const wait = new Map();
    try {
      w = new Worker(URL.createObjectURL(new Blob(['onmessage = e => setTimeout(() => postMessage(e.data.id), e.data.ms);'], { type: 'text/javascript' })));
      w.onmessage = e => { const r = wait.get(e.data); wait.delete(e.data); if (r) r(); };
    } catch (e) { w = null; }
    return ms => new Promise(r => { if (!w) { setTimeout(r, ms); return; } wait.set(++id, r); w.postMessage({ id, ms }); });
  })();
  // wait ms of battle time (already divided by the speed), in short steps so a pause or a tab switch takes effect soon
  async function later(ms) {
    let left = ms;
    while (left > 0) {
      if (PAUSE.on) await resumed();
      const t0 = clock(), step = Math.min(left, 100);
      await (document.hidden ? bgSleep(step) : new Promise(r => setTimeout(r, step)));
      left -= clock() - t0;
    }
  }
  const sleep = ms => later(ms / spd);
  // tweens step on animation frames, or on the worker timer while the tab is hidden; kick() restarts the stepping
  // when the tab is hidden or shown again (a frame that was waiting may never come)
  const TWEENS = new Set();
  function tween(ms, fn) {
    ms /= spd;
    return new Promise(async res => {
      await resumed();
      const t0 = clock(); let gen = 0;
      const run = g => {
        if (g !== gen) return;
        const k = Math.min(1, (clock() - t0) / ms); fn(k);
        if (k >= 1) { TWEENS.delete(tw); res(); return; }
        if (document.hidden) bgSleep(16).then(() => run(g)); else requestAnimationFrame(() => run(g));
      };
      const tw = { kick() { run(++gen); } };
      TWEENS.add(tw); tw.kick();
    });
  }
  document.addEventListener('visibilitychange', () => [...TWEENS].forEach(t => t.kick()));
  const ease = k => 1 - (1 - k) * (1 - k);
  const VIEW = { x: 0, w: 480 };
  let RS = 1; // device pixels per game pixel on the battle canvas (set in runBattle)
  const pctX = x => ((x - VIEW.x) / VIEW.w * 100) + '%', pctW = w => (w / VIEW.w * 100) + '%', pctY = y => (y / H * 100) + '%';

  // manga heroes in battle: a little taller and narrower than drawn (the painted figures are broad: wide capes and weapons)
  const STRETCH = [0.9, 1.12], baseStretch = id => (SPR.manga(id) && K.CHAMPS[id] ? STRETCH : [1, 1]);
  // size per character in battle: the figure's height from crown to feet in game pixels (the field is 270 high), set by
  // the owner per character so a goblin or a hound stands smaller than a hero and a boss towers over them; a character
  // not listed keeps the size it was drawn at. The scale reaching that height (fitOf) is folded into stretch(), so every
  // way a figure is drawn (manga pictures, pose sheets, the procedural poses) and its metrics follow it; sheet figures
  // (sheets.js) are drawn at SH.w x SH.h and take fitOf themselves
  const BATTLE_H = {
    pc_tank_m: 80, pc_tank_f: 80, pc_warrior_m: 79, pc_warrior_f: 79, pc_mage_m: 78, pc_mage_f: 78, pc_ranger_m: 78, pc_ranger_f: 78, pc_rogue_m: 78,
    pc_rogue_f: 78, pc_healer_m: 78, pc_healer_f: 78, bromir: 80, grythor: 79, skavren: 78, draelyn: 78, vaessa: 78, brukkar: 79, karnok: 79,
    morgrim: 78, vorlund: 80, valkessa: 78, faedrin: 78, krothar: 79, ithyra: 78, nyressa: 78, selenia: 78, drakulen: 79, keldrax: 79, oraneth: 78,
    zarvion: 80, sylreth: 78, thalnir: 80, aurelion: 80, zyrael: 78, velmira: 78, nithara: 78, kaelira: 78, vorak: 80, elyndra: 78, morveth: 78,
    theryn: 78, arkanis: 78, liora: 78, gorvann: 79, sylvara: 78, veyrith: 80, astraea: 78, korran: 79, zephara: 78, malreth: 78, eryndor: 80,
    ignara: 78, thalessa: 78, ravok: 79, seraphine: 78, draevan: 79, mirella: 78, volkaris: 79, nyxara: 78, orvyn: 78, celesthyr: 78, grimtar: 77,
    krogash: 77, zulgroth: 77, bloodsnarl: 77, dio: 78, malvek: 78, j3duin: 78, botkrijger: 78, cryptschutter: 78, schim: 76, zombie: 78,
    pestbrenger: 81, skeletridder: 80, doodsmagier: 78, banshee: 76, vampier: 78, bloedpriesteres: 78, gevallenridder: 76, hellehond: 70,
    helsebruut: 81, succubus: 76, afgrondsduivel: 81, hagedisstrijder: 78, hagedissjamaan: 78, hagedisbruut: 79, moerasheks: 76, krokodilbeest: 70,
    cultist: 78, cultgruwel: 80, wouddruide: 78, steengolem: 81, ijselementaal: 81, gravestalker: 78, cryptguard: 78, soulreaver: 78, dreadarcher: 78,
    gravewarden: 79, ashgoblin: 72, flameberserker: 76, cinderhound: 70, magmabrute: 80, hellfireshaman: 76, mosscrawler: 70, thornbeast: 70,
    rotvineshambler: 80, bogreaper: 78, woodwraith: 79, frostfangwolf: 70, iceboundknight: 79, glacierbrute: 81, frostbornwitch: 76, frozenhorror: 80,
    stormimp: 72, thunderraider: 78, tempestharpy: 76, stormcaller: 78, thundergolem: 80, brimstone: 90, voidtitan: 90, frostcolossus: 90,
    plaguelord: 90, bloodempress: 90, stormbehemoth: 90, ashenphoenix: 90, shadowlich: 90, ironjuggernaut: 90, sealeviathan: 90, celestial: 90,
    overlord: 90, boneking: 90, treant: 90, dunewyrm: 90, netherqueen: 90, grakk: 90, frostwitch: 90, serpentpriest: 90, doomharvester: 90,
    crystaltitan: 90, vampirelord: 90, lizardking: 90, chaosabom: 90, stonedragon: 90, zaroth: 100, frostborn: 100, seraphimfallen: 100,
    blightedtitan: 100, endlessoracle: 100
  };
  // the idle frame's content box, measured once per character
  const boxes = {};
  function bbox(id) {
    if (boxes[id]) return boxes[id];
    const s = SPR.frame(id, 'idle0'), d = s.getContext('2d').getImageData(0, 0, s.width, s.height).data;
    let x0 = s.width, x1 = 0, y0 = s.height, y1 = 0;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (d[(y * s.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return (boxes[id] = { w: s.width, h: s.height, x0, x1, y0, y1 });
  }
  // the share of a figure's box above its crown, for those whose staff, bow or flames reach well above the head (measured
  // on their sharp art): their height and name bar go by the head, or they would stand about a fifth smaller than the rest
  const CROWN = { celesthyr: 0.186, krogash: 0.222, elyndra: 0.195, oraneth: 0.178, theryn: 0.185 };
  const crownH = (id, h) => h * (1 - (CROWN[id] || 0));
  const fits = {};
  function fitOf(id) {
    if (fits[id] != null) return fits[id];
    const want = BATTLE_H[id]; if (!want) return (fits[id] = 1);
    const b = bbox(id), top = crownH(id, b.y1 - b.y0) / SPR.k(id) * baseStretch(id)[1];
    return (fits[id] = top > 0 ? want / top : 1);
  }
  // FIG: the whole battle's figure scale (1; the Siege draws everyone smaller so ten enemies fit, SIEGE_FIG); a change
  // drops every measured figure so the metrics follow
  let FIG = 1;
  const setFig = v => { if (v === FIG) return; FIG = v; for (const k in metrics) delete metrics[k]; };
  // (a boss shrinks less, so it still towers over the rest)
  const figOf = id => (FIG < 1 && K.BOSSES[id] ? Math.min(1, FIG * 1.3) : FIG);
  const stretch = id => { const [x, y] = baseStretch(id), f = fitOf(id) * figOf(id); return [x * f, y * f]; };
  // sprite metrics: feet offset + content box, from the idle frame
  const metrics = {};
  // a character whose sharp art (sprites.js hires) was just switched on is measured again
  const forgetArt = ids => { for (const id of ids || []) { delete metrics[id]; delete boxes[id]; delete fits[id]; } };
  function info(id) {
    if (metrics[id]) return metrics[id];
    const s = bbox(id), { x0, x1, y0, y1 } = s;
    // a fine picture (manga figure) counts in game pixels; manga heroes are drawn a little taller and narrower (STRETCH),
    // and every figure is scaled to its BATTLE_H
    const k = SPR.k(id), [sx, sy] = stretch(id);
    return (metrics[id] = { w: s.w / k * sx, h: s.h / k * sy, fy: y1 / k * sy, top: crownH(id, y1 - y0) / k * sy, cx: (x0 + x1) / 2 / k * sx, cw: (x1 - x0) / k * sx });
  }
  function place(u, [x, y], off) {
    const m = info(u.id);
    u._rs = { x, y, hx: x, ox: off || 0, oy: 0, flash: 0, alpha: 1, glow: 0, phase: Math.random() * 4, m, pose: null, poseUntil: 0, popN: 0, jump: 0 };
  }
  // formation: tanks and warriors in the front line (HERO_POS 0 and 2), attackers and supports behind them (1 and 3);
  // a line with more than two heroes spills over into the other one
  const FRONT_ROLES = ['Tank', 'Warrior'];
  const frontRank = u => { const c = C[u.id] || {}; return c.role === 'Tank' ? 0 : c.role2 === 'Tank' ? 1 : FRONT_ROLES.includes(c.role) ? 2 : 3; };
  function formation(heroes) {
    const sorted = [...heroes].sort((a, b) => frontRank(a) - frontRank(b));
    const front = sorted.filter(u => frontRank(u) < 3), back = sorted.filter(u => frontRank(u) === 3);
    const out = new Map(), fs = [0, 2], bs = [1, 3];
    for (const u of front) out.set(u, fs.length ? fs.shift() : bs.shift());
    for (const u of back) out.set(u, bs.length ? bs.shift() : fs.shift());
    return out;
  }
  function layout(heroes, enemies) {
    const pos = formation(heroes);
    const siege = B && B.cfg.type === 'siege';
    heroes.forEach(u => place(u, (siege ? SIEGE_HERO : HERO_POS)[pos.get(u)], -220));
    if (siege) { siegeLayout(enemies); return; }
    const boss = enemies.find(u => u.big || u.id === 'morwenna');
    // the guild boss is huge: further right and lower, so it towers over the field and spills past the edge
    if (boss && boss.immortal) { place(boss, GBOSS_POS, 220); return; }
    if (boss) {
      let a = 0;
      enemies.forEach(u => { if (u === boss) place(u, BOSS_POS, 220); else place(u, ADD_POS[a++ % ADD_POS.length], 220); });
    } else {
      // arena defenders are heroes: they line up like heroes (tanks in front), mirrored
      if (B && B.cfg.type === 'arena') { const pos = formation(enemies); enemies.forEach(u => place(u, ENEMY_POS[4][pos.get(u)], 220)); return; }
      const ep = ENEMY_POS[Math.min(4, enemies.length)];
      enemies.forEach((u, i) => place(u, ep[i % ep.length], 220));
    }
  }
  function buildOverlay(u) {
    const rs = u._rs, m = rs.m, ov = $('#ov');
    const o = document.createElement('div');
    o.className = `ou ${u.side}${u.boss ? ' boss' : ''}`;
    o.style.left = pctX(rs.x); o.style.top = pctY(rs.y - m.top - 3);
    if (u.big) o.style.width = '17%';
    o.innerHTML = `<span class="onm">${esc(u.name)}${u.isBoss ? ` <small class="ph"></small>` : ''}</span><div class="hprow"><span class="ess" style="--c:${AFF_COL[u.aff]}" title="${u.aff}">${essIcon(u.aff)}</span><div class="hp"><b></b><i></i><em></em></div></div>${u.isBoss ? '<div class="brk" title="Break Meter"><i></i><span></span></div>' : ''}<div class="fxrow"></div>`;
    ov.appendChild(o); rs.el = o;
    const hb = document.createElement('button');
    hb.className = 'hitbox ' + u.side; hb.type = 'button'; hb.tabIndex = -1;
    hb.setAttribute('aria-label', 'Target: ' + u.name);
    hb.style.left = pctX(rs.x - m.cw / 2 - 2); hb.style.top = pctY(rs.y - m.top);
    hb.style.width = pctW(m.cw + 4); hb.style.height = pctY(m.top + 4);
    hb.addEventListener('click', () => clickUnit(u));
    ov.appendChild(hb); rs.hb = hb;
  }
  function setupRender(heroes, enemies) {
    R.units = [...heroes, ...enemies];
    layout(heroes, enemies);
    const ov = $('#ov'); ov.innerHTML = '';
    for (const u of R.units) buildOverlay(u);
    R.ash = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: -0.05 - Math.random() * 0.15, vy: 0.1 + Math.random() * 0.2 }));
    R.projs = []; R.parts = []; R.fx = []; R.hl = new Set(); R.active = null; R.dim = 0;
    updateOverlay();
  }
  function updateOverlay() {
    $('#ov').classList.toggle('can-focus', !!canFocus());
    for (const u of R.units) {
      const rs = u._rs; if (!rs || !rs.el) continue;
      rs.el.classList.toggle('dead', !u.alive);
      rs.el.classList.toggle('focus', !!(canFocus() && B.b.focus === u && u.alive));
      rs.el.classList.toggle('turn', R.active === u && u.side === 'hero' && u.alive); // a green arrow above it: its turn
      rs.el.style.left = pctX(rs.x + rs.ox);
      const w = Math.max(0, u.hp / u.maxHp * 100) + '%';
      rs.el.querySelector('.hp i').style.width = w; rs.el.querySelector('.hp b').style.width = w;
      const sh = u.effects.find(e => e.k === 'shield');
      rs.el.querySelector('.hp em').style.width = sh ? Math.min(100, sh.v / u.maxHp * 100) + '%' : '0';
      // status badges (fxBadge): an icon per effect, turns left in the corner
      const chips = u.effects.map(e => e.k === 'enrage' ? fxBadge('enrage', null, `Enraged: +${Math.round(K.ENRAGE.atk * e.v * 100)}% Attack, growing every ${K.ENRAGE.every} of its turns`, '×' + e.v) : fxBadge(e.k, e.n));
      // a boss shows how many of its turns are left before it enrages
      if (u.hall && u.alive && B && B.b && !u.effects.some(e => e.k === 'enrage')) { const left = B.b.enrageIn(u); chips.push(`<span class="fxi clock ${left <= 3 ? 'soon' : ''}" title="Enrages after ${left} more of its turns: its Attack then keeps rising">⏳<i>${left}</i></span>`); }
      if (u.stacks.smids) chips.unshift(fxBadge('atkUp', null, `Blood Frenzy: +${u.stacks.smids * 10}% Attack`, '×' + u.stacks.smids));
      if (u.stacks.charge) chips.unshift(fxBadge('broken', null, 'Static Charge', u.stacks.charge));
      if (u.isBoss) {
        const bk = rs.el.querySelector('.brk'), broken = u.effects.some(e => e.k === 'broken');
        bk.classList.toggle('broken', broken);
        bk.querySelector('i').style.width = (broken ? 100 : u.brk / u.breakMax * 100) + '%';
        bk.querySelector('span').textContent = broken ? 'BROKEN' : `${Math.ceil(u.brk)}/${u.breakMax}`;
        rs.el.querySelector('.ph').textContent = `· Phase ${u.phase + 1}/${u.nPhases}`;
        if (u.immortal && B) { const m = B.b.meter[u.uid]; rs.el.querySelector('.ph').textContent = `· ${Math.round(m ? m.taken : 0).toLocaleString('en-US')} damage`; }
      }
      rs.el.querySelector('.fxrow').innerHTML = chips.join('');
      rs.hb.classList.toggle('valid', R.hl.has(u));
      rs.hb.style.display = u.alive || R.hl.has(u) ? '' : 'none';
    }
    renderOrder();
  }
  function renderOrder() {
    const el = $('#order'); if (!B) { el.innerHTML = ''; return; }
    const b = B.b, act = b.active;
    const cell = (u, now) => `<div class="oc ${u.side} ${now ? 'now' : ''}" title="${esc(u.name)} · Speed ${Math.round(b.speed(u))}"><img class="spr" src="${SPR.url(u.id, 1, u.side === 'enemy')}" alt=""></div>`;
    const next = b.predict(act && act.alive ? 7 : 8);
    el.innerHTML = `<span class="tag ord-l">Turn order</span>` + (act && act.alive ? cell(act, true) + '<span class="sep"></span>' : '') + next.map(u => cell(u, false)).join('');
  }
  function popup(u, text, cls) {
    const rs = u._rs; if (!rs) return;
    const el = document.createElement('div');
    el.className = 'pop ' + cls; el.textContent = text;
    const n = rs.popN++;
    el.style.left = pctX(rs.x + rs.ox + (n % 2 ? 8 : -6));
    el.style.top = pctY(rs.y - rs.m.top - 2 + (n % 3) * 10);
    $('#ov').appendChild(el);
    setTimeout(() => { el.remove(); rs.popN = Math.max(0, rs.popN - 1); }, 1050);
  }
  // calm() = 5× speed: no screen flashes or shakes and fewer sounds (too flashy at that speed)
  const calm = () => spd >= 5;
  function flash() { if (calm()) return; const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  const center = u => [u._rs.x + u._rs.ox, u._rs.y - u._rs.m.top * 0.5];
  const headOf = u => [u._rs.x + u._rs.ox, u._rs.y - u._rs.m.top];

  // ----- particles & fx -----
  function part(x, y, vx, vy, col, life, size, grav) { R.parts.push({ x, y, vx, vy, col, life, max: life, size: size || 1, grav: grav ?? 0.06 }); }
  function burst(x, y, col, n, spd, size, grav) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * (spd || 1.4); part(x, y, Math.cos(a) * s, Math.sin(a) * s - 0.4, Array.isArray(col) ? col[i % col.length] : col, 18 + Math.random() * 16, size || 1, grav); } }
  function rise(x, y, col, n, spread) { for (let i = 0; i < n; i++) part(x + (Math.random() - 0.5) * (spread || 24), y + Math.random() * 10, (Math.random() - 0.5) * 0.2, -0.5 - Math.random() * 0.7, Array.isArray(col) ? col[i % col.length] : col, 30 + Math.random() * 20, Math.random() < 0.3 ? 2 : 1, -0.005); }
  function addFx(o) { o.t0 = performance.now(); o.dur = (o.dur || 300) / spd; R.fx.push(o); return later(o.dur); }
  function projectile(u, t, kind, col) {
    const [sx, sy] = center(u), [tx, ty] = center(t);
    const dir = u.side === 'hero' ? 1 : -1;
    const dur = (kind === 'cannon' ? 380 : kind === 'arrow' || kind === 'knife' ? 230 : 300) / spd;
    const p = { sx: sx + dir * 12, sy: sy - 6, tx, ty, t0: performance.now(), dur, kind, col };
    R.projs.push(p);
    return later(dur).then(() => { R.projs = R.projs.filter(x => x !== p); });
  }
  function falling(t, kind, col, n) {
    const [tx, ty] = center(t); const ps = [];
    for (let i = 0; i < n; i++) {
      const dx = (Math.random() - 0.5) * 30, delay = i * 60;
      ps.push(later(delay / spd).then(() => new Promise(res => {
        const dur = (kind === 'rock' ? 320 : 200) / spd;
        const p = { sx: tx + dx + 40, sy: -20, tx: tx + dx * 0.4, ty: ty + (Math.random() - 0.5) * 12, t0: performance.now(), dur, kind, col, straight: true };
        R.projs.push(p);
        later(dur).then(() => { R.projs = R.projs.filter(x => x !== p); if (kind === 'rock') { burst(p.tx, p.ty, ['#ff8a2a', '#ffd060', '#5a3a2a'], 12, 1.8, 2); R.shake = Math.max(R.shake, 3); } res(); });
      })));
    }
    return Promise.all(ps);
  }
  const VFXCOL = { fire: '#ff8a2a', water: '#7ad0ff', dark: '#9a6aff', blood: '#e0303a', poison: '#9ae050', smoke: '#a8a8b0', curse: '#c080ff', holy: '#ffe8a0', thorns: '#6ac04a', rune: '#7ab8ff' };
  function impactFx(u, skill, t) {
    const v = skill.vfx || (skill.anim === 'melee' ? 'slash' : 'dark');
    const [x, y] = center(t), dir = u.side === 'hero' ? 1 : -1;
    if (v === 'slash') { addFx({ kind: 'slash', x, y, dir, col: '#fff4e0', dur: 200 }); burst(x, y, '#fff0c8', 6, 1.2); }
    else if (v === 'smash') { addFx({ kind: 'star', x, y, col: '#ffe8b0', dur: 180 }); burst(x, t._rs.y - 2, ['#8a7a68', '#6a5a4a'], 10, 1.2, 2, 0.1); R.shake = Math.max(R.shake, 3); }
    else if (v === 'stab') { addFx({ kind: 'thrust', x, y, dir, col: '#f0f4ff', dur: 160 }); burst(x, y, '#ffffff', 5, 1); }
    else if (v === 'claw') { addFx({ kind: 'claw', x, y, dir, col: '#ff5a4a', dur: 220 }); burst(x, y, '#c02030', 8, 1.3); }
    else if (v === 'bite') { addFx({ kind: 'bite', x, y, col: '#efe6cf', dur: 220 }); burst(x, y, '#c02030', 6, 1); }
    else if (v === 'arrow' || v === 'knife' || v === 'arrowrain') { burst(x, y, '#fff0c8', 5, 1); }
    else if (v === 'cannon' || v === 'meteor' || v === 'fire') { addFx({ kind: 'boom', x, y, col: '#ff8a2a', dur: 260 }); burst(x, y, ['#ff8a2a', '#ffd060', '#ff5a2a'], 14, 1.8, 2); if (v !== 'fire') R.shake = Math.max(R.shake, 4); }
    else if (v === 'sunfall') { addFx({ kind: 'boom', x, y, col: '#ffe8a0', dur: 320, r: 30 }); burst(x, y, ['#fff0b0', '#ffd060'], 22, 2.2, 2); R.shake = 7; flash(); }
    else if (v === 'quake') { burst(x, t._rs.y - 2, ['#8a7a68', '#5a4a3a'], 12, 1.5, 2, 0.12); }
    else { const col = VFXCOL[v] || AFF_COL[u.aff]; addFx({ kind: 'ring', x, y, col, dur: 240, r: 16 }); burst(x, y, col, 10, 1.4, v === 'smoke' ? 2 : 1, v === 'poison' || v === 'smoke' ? -0.02 : 0.06); }
  }
  function drawFx(now) {
    R.fx = R.fx.filter(f => now - f.t0 < f.dur);
    for (const f of R.fx) {
      const k = Math.max(0, (now - f.t0) / f.dur); // the frame time can be a hair before the effect started
      g.globalAlpha = 1 - k * 0.6;
      if (f.kind === 'slash') {
        g.fillStyle = f.col;
        for (let i = 0; i < 14; i++) { const a = -1.2 + (i / 13) * 2.4 * Math.min(1, k * 2); const r = 16; const px = f.x + Math.cos(a) * r * -f.dir * -1, py = f.y + Math.sin(a) * r; g.fillRect(Math.round(px - f.dir * 4), Math.round(py), 3 - (i % 2), 2); }
      } else if (f.kind === 'star') {
        g.fillStyle = f.col; const r = 6 + k * 14;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; for (let j = 3; j < r; j += 2) g.fillRect(Math.round(f.x + Math.cos(a) * j), Math.round(f.y + Math.sin(a) * j), 2, 2); }
      } else if (f.kind === 'thrust') {
        g.fillStyle = f.col; const L = 26 * Math.min(1, k * 2.5);
        g.fillRect(Math.round(f.dir > 0 ? f.x - 18 : f.x + 18 - L), Math.round(f.y), Math.round(L), 2); g.fillRect(Math.round(f.x + f.dir * 6), Math.round(f.y - 2), 2, 6);
      } else if (f.kind === 'claw') {
        g.fillStyle = f.col; const L = Math.min(1, k * 2.5) * 22;
        for (let s = -1; s <= 1; s++) for (let j = 0; j < L; j++) g.fillRect(Math.round(f.x - 10 * f.dir + j * 0.8 * f.dir + s * 5), Math.round(f.y - 11 + j), 2, 1);
      } else if (f.kind === 'bite') {
        g.fillStyle = f.col; const c = 10 * (1 - Math.min(1, k * 2));
        for (let i = -8; i <= 8; i += 4) { g.fillRect(Math.round(f.x + i), Math.round(f.y - 6 - c), 2, 4); g.fillRect(Math.round(f.x + i + 2), Math.round(f.y + 3 + c), 2, 4); }
      } else if (f.kind === 'boom') {
        const r = (f.r || 18) * (0.4 + k); g.fillStyle = f.col; g.globalAlpha = 1 - k;
        g.beginPath(); g.arc(f.x, f.y, r, 0, 7); g.fill(); g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(f.x, f.y, r * 0.5, 0, 7); g.fill();
      } else if (f.kind === 'ring') {
        const r = (f.r || 16) * (0.3 + k); g.fillStyle = f.col;
        for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; g.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r * 0.8), 2, 2); }
      } else if (f.kind === 'beam') {
        const w = (f.w || 12) * (k < 0.3 ? k / 0.3 : 1 - (k - 0.3) * 0.8); g.fillStyle = f.col; g.globalAlpha = 0.85;
        g.fillRect(Math.round(f.x - w / 2), 0, Math.round(w), Math.round(f.y + 6)); g.fillStyle = '#ffffff'; g.fillRect(Math.round(f.x - w / 6), 0, Math.max(1, Math.round(w / 3)), Math.round(f.y + 6));
      } else if (f.kind === 'glyph') {
        g.fillStyle = f.col; const r = 18 * Math.min(1, k * 2);
        for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + k * 2; g.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r * 0.35), 2, 1); }
        for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - k * 3; g.fillRect(Math.round(f.x + Math.cos(a) * r * 0.6), Math.round(f.y + Math.sin(a) * r * 0.2), 2, 2); }
      } else if (f.kind === 'spikes') {
        g.fillStyle = f.col; const h = 18 * Math.sin(Math.min(1, k * 1.4) * Math.PI);
        for (let i = -2; i <= 2; i++) { const hh = h * (1 - Math.abs(i) * 0.25); for (let j = 0; j < hh; j++) g.fillRect(Math.round(f.x + i * 6 - (hh - j) * 0.12), Math.round(f.y - j), Math.max(1, Math.round(3 * (1 - j / hh))), 1); }
      } else if (f.kind === 'thread') {
        g.fillStyle = f.col; const n = 24, L = Math.min(1, k * 2.2);
        for (let i = 0; i < n * L; i++) { const t = i / n; g.fillRect(Math.round(f.sx + (f.tx - f.sx) * t), Math.round(f.sy + (f.ty - f.sy) * t + Math.sin(t * 12 + k * 10) * 3), 1, 1); }
      } else if (f.kind === 'dome') {
        g.strokeStyle = f.col; g.lineWidth = 1; g.globalAlpha = 0.9 * (1 - k * 0.7);
        g.beginPath(); g.ellipse(f.x, f.y, f.rx * (0.6 + 0.4 * Math.min(1, k * 3)), f.ry * (0.6 + 0.4 * Math.min(1, k * 3)), 0, Math.PI, 0); g.stroke();
        g.fillStyle = f.col; g.globalAlpha = 0.15; g.beginPath(); g.ellipse(f.x, f.y, f.rx, f.ry, 0, Math.PI, 0); g.fill();
      } else if (f.kind === 'wave') {
        g.fillStyle = f.col; const x = f.sx + (f.tx - f.sx) * k;
        for (let i = 0; i < 6; i++) g.fillRect(Math.round(x - i * 3 * Math.sign(f.tx - f.sx)), Math.round(f.y - Math.abs(Math.sin(i + k * 20)) * 6), 3, 3);
      }
      g.globalAlpha = 1;
    }
  }
  function drawProjs(now) {
    for (const p of R.projs) {
      const k = Math.max(0, Math.min(1, (now - p.t0) / p.dur));
      const arc = p.straight ? 0 : p.kind === 'cannon' ? 26 : p.kind === 'arrow' ? 12 : 5;
      const x = p.sx + (p.tx - p.sx) * k, y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * arc;
      const d = Math.sign(p.tx - p.sx) || 1, X = Math.round(x), Y = Math.round(y);
      if (p.kind === 'arrow') {
        if (p.straight) { g.fillStyle = '#d8c8a8'; g.fillRect(X, Y - 8, 1, 8); g.fillStyle = '#c8cdd6'; g.fillRect(X - 1, Y, 3, 2); }
        else { g.fillStyle = '#d8c8a8'; g.fillRect(X - 5 * d, Y, 9, 1); g.fillStyle = '#c8cdd6'; g.fillRect(X + 4 * d, Y - 1, 2, 3); g.fillStyle = '#e6e0d0'; g.fillRect(X - 6 * d, Y - 1, 2, 3); }
      } else if (p.kind === 'knife') {
        g.fillStyle = '#e8ecf0'; const a = k * 20; g.fillRect(Math.round(X + Math.cos(a) * 3), Math.round(Y + Math.sin(a) * 3), 2, 2); g.fillRect(Math.round(X - Math.cos(a) * 3), Math.round(Y - Math.sin(a) * 3), 2, 2); g.fillRect(X, Y, 2, 2);
      } else if (p.kind === 'cannon') {
        g.fillStyle = '#1a1a1e'; g.fillRect(X - 3, Y - 3, 6, 6); g.fillStyle = '#5a5a60'; g.fillRect(X - 2, Y - 2, 2, 2);
        if (Math.random() < 0.6) part(x, y, 0, -0.2, '#8a8a90', 16, 2, -0.01);
      } else if (p.kind === 'rock') {
        g.fillStyle = '#5a3a2a'; g.fillRect(X - 4, Y - 4, 8, 8); g.fillStyle = '#ff8a2a'; g.fillRect(X - 2, Y - 2, 4, 4);
        part(x + (Math.random() - 0.5) * 4, y - 6, 0, -0.2, Math.random() < 0.5 ? '#ff8a2a' : '#ffd060', 14, 2, -0.02);
      } else if (p.kind === 'glob') {
        g.fillStyle = p.col; g.fillRect(X - 3, Y - 3, 6, 6); g.fillStyle = '#ffffff'; g.fillRect(X - 2, Y - 2, 2, 2);
      } else {
        g.fillStyle = p.col; g.fillRect(X - 3, Y - 3, 7, 7); g.fillStyle = '#fff6e0'; g.fillRect(X - 1, Y - 1, 3, 3);
        part(x - d * 4, y + (Math.random() - 0.5) * 4, -d * 0.3, (Math.random() - 0.5) * 0.3, p.col, 14, Math.random() < 0.5 ? 2 : 1, 0);
      }
    }
  }
  function pxEllipse(cx, cy, rx, ry, col, ring) {
    g.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2)));
      if (ring) { g.fillRect(cx - w, cy + dy, 2, 1); g.fillRect(cx + w - 1, cy + dy, 2, 1); if (Math.abs(dy) === ry) g.fillRect(cx - w, cy + dy, w * 2, 1); }
      else g.fillRect(cx - w, cy + dy, w * 2, 1);
    }
  }
  // ----- unit animation -----
  // Every battle figure is one picture; pose() works out how it is held this frame (tilt around the feet, squash and
  // stretch, a small shift, darkening when dead) and frame() draws it that way. One set of curves animates all heroes,
  // enemies and bosses: idle (a slow one-pixel bob; hunched and quicker below 30% HP; wobbling when stunned), walk (bobbing),
  // attack 1 (basic: wind-up, strike, recover), attack 2 (skills: crouch, leap, smash), cast (magic and buffs: charge,
  // release), injured (recoil with a damped spring back) and death (stagger, fall backwards, settle, darken).
  // rot > 0 leans forward (towards the enemy); dx > 0 moves forward.
  const lerp = (a, b, k) => a + (b - a) * k, eo = k => 1 - (1 - k) ** 3, ei = k => k * k;
  function pose(u, now) {
    const rs = u._rs, P = { rot: 0, sx: 1, sy: 1, dx: 0, dy: 0, dim: 0 }, t = now / 1000 + rs.phase;
    if (!u.alive) {
      const k = rs.deadAt ? Math.min(1, (now - rs.deadAt) / (780 / spd)) : 1, wide = rs.m.w > rs.m.fy * 1.05;
      if (k < 0.18) { const q = k / 0.18; P.rot = -0.12 * Math.sin(q * Math.PI / 2); P.sy = 1 - 0.04 * q; return P; }
      const q = Math.min(1, (k - 0.18) / 0.5), f = ei(q);
      if (wide) { P.sy = lerp(0.96, 0.45, f); P.sx = lerp(1, 1.18, f); P.rot = -0.12 * (1 - f); } // beasts sink down
      else { P.rot = lerp(-0.12, -Math.PI / 2, f); P.dx = f * rs.m.fy * 0.45; } // humanoids fall backwards
      if (k > 0.68) { const s = (k - 0.68) / 0.32; P.dy = -2.5 * Math.sin(s * Math.PI) * (1 - s); }
      P.dim = Math.max(0, (k - 0.55) / 0.45);
      return P;
    }
    const active = rs.pose && now < rs.poseUntil, k = active ? Math.min(1, (now - rs.poseAt) / Math.max(1, rs.poseUntil - rs.poseAt)) : 0;
    if (active && rs.pose === 'atk') {
      if (k < 0.18) { const q = eo(k / 0.18); Object.assign(P, { rot: -0.1 * q, sx: 1 - 0.05 * q, sy: 1 + 0.05 * q, dx: -2 * q }); }
      else if (k < 0.36) { const q = eo((k - 0.18) / 0.18); Object.assign(P, { rot: lerp(-0.1, 0.22, q), sx: lerp(0.95, 1.08, q), sy: lerp(1.05, 0.93, q), dx: lerp(-2, 5, q) }); }
      else { const q = eo((k - 0.36) / 0.64); Object.assign(P, { rot: lerp(0.22, 0, q), sx: lerp(1.08, 1, q), sy: lerp(0.93, 1, q), dx: lerp(5, 0, q) }); }
      return P;
    }
    if (active && rs.pose === 'atk2') {
      if (k < 0.28) { const q = eo(k / 0.28); Object.assign(P, { sx: 1 + 0.08 * q, sy: 1 - 0.1 * q, rot: -0.05 * q }); }
      else if (k < 0.5) { const q = (k - 0.28) / 0.22; Object.assign(P, { dy: -12 * Math.sin(q * Math.PI / 2), sx: lerp(1.08, 0.94, q), sy: lerp(0.9, 1.1, q), rot: lerp(-0.05, -0.15, q) }); }
      else if (k < 0.64) { const q = (k - 0.5) / 0.14; Object.assign(P, { dy: lerp(-12, 0, ei(q)), rot: lerp(-0.15, 0.3, eo(q)), sx: lerp(0.94, 1.12, q), sy: lerp(1.1, 0.88, q), dx: 6 * q }); }
      else { const q = eo((k - 0.64) / 0.36); Object.assign(P, { rot: lerp(0.3, 0, q), sx: lerp(1.12, 1, q), sy: lerp(0.88, 1, q), dx: lerp(6, 0, q) }); }
      return P;
    }
    if (active && rs.pose === 'cast') {
      if (k < 0.45) { const q = eo(k / 0.45); Object.assign(P, { sy: 1 + 0.07 * q, sx: 1 - 0.04 * q, dy: -4 * q, rot: -0.06 * q }); }
      else if (k < 0.6) { const q = (k - 0.45) / 0.15; Object.assign(P, { sy: lerp(1.07, 0.94, q), sx: lerp(0.96, 1.07, q), dy: lerp(-4, 0, q), rot: lerp(-0.06, 0.1, q) }); }
      else { const q = eo((k - 0.6) / 0.4); Object.assign(P, { sy: lerp(0.94, 1, q), sx: lerp(1.07, 1, q), rot: lerp(0.1, 0, q) }); }
      return P;
    }
    if (active && rs.pose === 'hit') {
      if (k < 0.2) { const q = eo(k / 0.2); Object.assign(P, { rot: -0.18 * q, sx: 1 + 0.06 * q, sy: 1 - 0.06 * q, dx: -4 * q }); }
      else { const q = (k - 0.2) / 0.8, d = (1 - q) ** 2; Object.assign(P, { rot: -0.18 * d * Math.cos(q * 7), sx: 1 + 0.06 * d, sy: 1 - 0.06 * d, dx: -4 * d }); }
      return P;
    }
    if (rs.walking) { const s = Math.sin(t * Math.PI / 0.3); P.dy = -2.2 * Math.abs(s); P.rot = 0.06 + 0.03 * s; return P; }
    // idle: breathing, hunched and panting when low, wobbling when stunned, still when frozen
    if (u.effects.some(e => e.k === 'freeze')) return P;
    // breathing is a whole-pixel bob (stretching pixel art makes its rows crawl): one pixel up and down, slow;
    // faster when low on HP
    const low = u.hp / u.maxHp < 0.3, br = Math.sin(t * Math.PI * 2 / (low ? 0.9 : 2.4));
    P.dy = br > 0.35 ? -1 : 0;
    if (low) P.rot = 0.07;
    if (u.effects.some(e => e.k === 'stun' || e.k === 'broken')) P.rot += 0.05 * Math.sin(t * 9);
    return P;
  }
  // An animated hero's frame for this moment: dead plays its frames once and stays on the last; attack 1 (basics) and
  // attack 2 (skills, heals and other casts) play over the pose's time, and a sheet with a skill row (the ranger's special shot) plays
  // that for its third skill; a hit shows blocking when the sheet has it and the hero a shield or Defense Up, else the
  // first two hurt frames (the last two lie on the ground); otherwise the idle frame stands (or loops, if there are more).
  function sheetFrame(u, SH, now) {
    const rs = u._rs, at = (list, k) => list[Math.min(list.length - 1, Math.floor(k * list.length))];
    if (!u.alive) { const k = rs.deadAt ? (now - rs.deadAt) / (760 / spd) : 1; return at(SH.dead, Math.max(0, Math.min(0.999, k))); }
    const active = rs.pose && now < rs.poseUntil, k = active ? Math.min(0.999, (now - rs.poseAt) / Math.max(1, rs.poseUntil - rs.poseAt)) : 0;
    if (active && (rs.pose === 'atk' || (rs.pose === 'cast' && rs.skIdx === 0))) return at(SH.atk1, k); // a basic spell is attack 1 too
    if (active && (rs.pose === 'atk2' || rs.pose === 'cast')) return at(SH.skill && rs.skIdx === 2 ? SH.skill : SH.atk2, k);
    if (active && rs.pose === 'hit') return SH.block && u.effects.some(e => e.k === 'shield' || e.k === 'defUp') ? at(SH.block, k) : SH.hurt[Math.min(1, Math.floor(k * 3))];
    return SH.idle[Math.floor(now / 260 + rs.phase * 4) % SH.idle.length];
  }
  // A manga figure (manga.js) is one smooth picture, so it gets more life than the old pixel figures: it is placed at
  // sub-pixel positions, a strike leaves
  // a few afterimages, a melee strike draws a slash in the essence colour, and skills and spells make it glow in that colour.
  // each manga picture is scaled once to the screen's resolution (with the stretch), so a frame draws it nearly 1:1: the
  // high-quality downscale of a big picture is far too slow to do 16 times per figure on every frame
  // a white (hit flash) or darkened (fallen) copy of a pose picture, made once
  const TINT = { white: new WeakMap(), dark: new WeakMap() };
  function tint(img, kind) {
    let c = TINT[kind].get(img); if (c) return c;
    c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const cg = c.getContext('2d'); cg.drawImage(img, 0, 0);
    cg.globalCompositeOperation = 'source-atop'; cg.fillStyle = kind === 'white' ? '#fff6e0' : 'rgba(8,6,12,0.55)'; cg.fillRect(0, 0, c.width, c.height); TINT[kind].set(img, c); return c;
  }
  // ----- standing in the scene: shadows on the floor, and the glow of a burning, bleeding or poisoned unit -----
  // a blurred one-colour copy of a picture (its silhouette) with a margin p around it, made once per picture and colour
  let SIL = new WeakMap();
  function silhouette(img, col, blur) {
    let m = SIL.get(img); if (!m) SIL.set(img, (m = {}));
    const key = col + ':' + blur; if (m[key]) return m[key];
    const p = Math.ceil(blur * 1.6), c = document.createElement('canvas'); c.width = img.width + 2 * p; c.height = img.height + 2 * p;
    const cg = c.getContext('2d'); cg.shadowColor = col; cg.shadowBlur = blur; cg.shadowOffsetX = c.width + 20; cg.drawImage(img, p - c.width - 20, p);
    return (m[key] = { c, p });
  }
  // a picture filled with one colour (sharp): the status tint laid over a figure
  let TINTC = new WeakMap();
  function tintCol(img, col) {
    let m = TINTC.get(img); if (!m) TINTC.set(img, (m = {})); if (m[col]) return m[col];
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const cg = c.getContext('2d'); cg.drawImage(img, 0, 0);
    cg.globalCompositeOperation = 'source-atop'; cg.fillStyle = col; cg.fillRect(0, 0, c.width, c.height); return (m[col] = c);
  }
  // the status a unit shows (burning before bleeding before poisoned): a pulsing glow around its silhouette in that colour,
  // a tint over it and a few particles (embers, drops, bubbles); bleeding also leaves a pool of blood under it
  const STATUS_FX = {
    burn: { glow: 'rgb(255,80,20)', tint: 'rgb(255,96,32)', ta: 0.17, parts: ['#ff8a2a', '#ffd060', '#ff5a1e'] },
    bleed: { glow: 'rgb(110,0,12)', tint: 'rgb(96,0,10)', ta: 0.22, parts: ['#a0101c', '#6a0008'] },
    poison: { glow: 'rgb(96,224,72)', tint: 'rgb(96,214,64)', ta: 0.15, parts: ['#a8e060', '#6a9a3a', '#c8ff90'] },
  };
  const statusFx = u => (u.alive && ['burn', 'bleed', 'poison'].find(k => u.effects.some(e => e.k === k))) || null;
  // draws a picture at (x, y, w, h) in the current transform, with the status glow behind it and its tint over it
  function drawFig(img, x, y, w, h, st, now) {
    if (!st) { g.drawImage(img, x, y, w, h); return; }
    const F = STATUS_FX[st], s = w / img.width, a = g.globalAlpha, pulse = 0.68 + 0.32 * Math.sin(now / 230);
    const S = silhouette(img, F.glow, Math.max(4, Math.round(img.height / 24)));
    g.globalAlpha = a * pulse; for (let n = st === 'bleed' ? 2 : 1; n > 0; n--) g.drawImage(S.c, x - S.p * s, y - S.p * s, S.c.width * s, S.c.height * s);
    g.globalAlpha = a; g.drawImage(img, x, y, w, h);
    g.globalAlpha = a * F.ta * (0.75 + 0.25 * pulse); g.drawImage(tintCol(img, F.tint), x, y, w, h); g.globalAlpha = a;
  }
  // a figure's shadow cast over the floor: its silhouette flattened and flipped down from the feet (fx, fy), leaning away
  // from the middle of the field (the light comes from the painted background behind it); (x, y, w, h) is the picture's
  // place around the feet, mir -1 for a picture mirrored in drawing
  function castShadow(img, x, y, w, h, fx, fy, mir, a) {
    const S = silhouette(img, 'rgb(0,0,0)', Math.max(3, Math.round(img.height / 34))), s = w / img.width, lean = fx < 240 ? 0.34 : -0.34;
    g.save(); g.globalAlpha = a; g.translate(fx, fy); g.transform(1, 0, lean, -0.3, 0, 0); g.scale(mir, 1);
    g.drawImage(S.c, x - S.p * s, y - S.p * s, S.c.width * s, S.c.height * s); g.restore();
  }
  // the soft dark patch right under the feet, and a pool of blood under a bleeding unit
  function softShadow(x, y, rx, ry, a) {
    g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.55 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
  }
  function bloodPool(x, y, cw, now, ph) {
    const r = cw * 0.46 * (0.93 + 0.07 * Math.sin(now / 700 + ph * 3));
    g.save(); g.translate(x + 3, y + 1); g.scale(1, 0.26); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, 'rgba(118,0,10,.9)'); gr.addColorStop(0.62, 'rgba(84,0,8,.78)'); gr.addColorStop(0.85, 'rgba(50,0,4,.35)'); gr.addColorStop(1, 'rgba(30,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,140,140,.22)'; g.beginPath(); g.ellipse(-r * 0.25, -r * 0.18, r * 0.28, r * 0.1, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  // now and then a particle of the unit's status: embers rising, bubbles rising, drops of blood falling
  function statusParts(u, st) {
    if (!st || calm() || Math.random() > 0.08) return;
    const rs = u._rs, m = rs.m, P = STATUS_FX[st].parts, x = rs.x + rs.ox + (Math.random() - 0.5) * m.cw * 0.6;
    if (st === 'bleed') part(x, rs.y - m.top * (0.3 + Math.random() * 0.3), (Math.random() - 0.5) * 0.15, 0.2, P[Math.random() * P.length | 0], 26, 1, 0.08);
    else rise(x, rs.y - m.top * (0.2 + Math.random() * 0.5), P, 1, 6);
  }
  let MCV = new WeakMap();
  // a sharp painted background, scaled once to the battle canvas's resolution (high quality), so a frame draws it 1:1
  let BGPRE = new WeakMap();
  // a soft dark band over the top of a painted background: the title, the turn order and the corners stay readable on a bright sky
  let BG_SHADE = null;
  const topShade = () => { const s = g.createLinearGradient(0, 0, 0, 70); s.addColorStop(0, "rgba(8,6,12,.55)"); s.addColorStop(1, "rgba(8,6,12,0)"); return s; };
  function bgPre(img) {
    const e = BGPRE.get(img); if (e && e.rs === RS) return e.c;
    const c = document.createElement('canvas'); c.width = 480 * RS; c.height = 270 * RS;
    const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(img, 0, 0, c.width, c.height); BGPRE.set(img, { rs: RS, c }); return c;
  }
  function mangaPre(img, ak, kx, ky) {
    const e = MCV.get(img); if (e && e.rs === RS && e.kx === kx) return e.c;
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width / ak * kx * RS)); c.height = Math.max(1, Math.round(img.height / ak * ky * RS));
    const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(img, 0, 0, c.width, c.height); MCV.set(img, { rs: RS, kx, c }); return c;
  }
  // back from another app (phones): pictures the phone wiped while the game was hidden are drawn again (SPR.heal), the
  // copies made from them are made anew, and a screen with painted canvases is drawn again; once more a moment later,
  // in case the phone hands the canvases back only after the page shows
  function healArt() {
    if (document.hidden) return;
    SPR.heal(); MCV = new WeakMap(); BGPRE = new WeakMap(); SIL = new WeakMap(); TINTC = new WeakMap(); TINT.white = new WeakMap(); TINT.dark = new WeakMap();
    if (!B && S && !noHero() && document.querySelector('#screen canvas')) render();
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { healArt(); setTimeout(healArt, 1200); } });
  addEventListener('pageshow', e => { if (e.persisted) healArt(); });
  function drawManga(u, P, now, a, flip, dir, fr, sh, shy) {
    const rs = u._rs, m = rs.m, ak = SPR.k(u.id), [kx, ky] = stretch(u.id), ess = AFF_COL[u.aff] || '#ffffff', t = now / 1000 + rs.phase;
    const PZ = SPR.poses(u.id), mir = PZ && flip ? -1 : 1;
    const cur = { px: rs.x + rs.ox + P.dx * dir + sh, py: rs.y + rs.oy - rs.jump + P.dy + shy, rot: P.rot, sx: P.sx, sy: P.sy };
    const active = u.alive && rs.pose && now < rs.poseUntil, k = active ? Math.min(1, (now - rs.poseAt) / Math.max(1, rs.poseUntil - rs.poseAt)) : 0;
    const striking = active && ((rs.pose === 'atk' && k > 0.16 && k < 0.5) || (rs.pose === 'atk2' && k > 0.3 && k < 0.72));
    rs.trail = (rs.trail || []).filter(p => now - p.at < 210 / spd);
    if (striking && !calm()) rs.trail.push(Object.assign({ at: now }, cur));
    if (rs.trail.length > 5) rs.trail.splice(0, rs.trail.length - 5);
    const glow = !u.alive || calm() ? 0 : active && rs.pose === 'cast' ? Math.sin(k * Math.PI) : active && rs.pose === 'atk2' ? 0.8 * Math.sin(k * Math.PI) : 0;
    const fig = (img, al, o, gl) => {
      if (!img || al <= 0.01) return;
      const pre = mangaPre(img, ak, kx, ky), W = pre.width / RS, H = pre.height / RS, x0 = -m.w / 2, y0 = -m.fy;
      g.save(); g.globalAlpha = al; g.translate(o.px, o.py); if (o.rot) g.rotate(o.rot * dir); g.scale(o.sx * mir, o.sy);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';
      if (gl > 0.02) { g.shadowColor = ess; g.shadowBlur = gl * 18 * RS; g.drawImage(pre, x0, y0, W, H); if (gl > 0.4) g.drawImage(pre, x0, y0, W, H); g.shadowBlur = 0; }
      else drawFig(pre, x0, y0, W, H, o.st, now);
      g.restore();
    };
    // a character with real poses (pose sheet) shows the pose for what it does; its pictures face right and are mirrored here
    let base = PZ ? SPR.frame(u.id, fr) : SPR.frame(u.id, fr, flip ? 'flip' : '');
    if (PZ) {
      if (!u.alive) {
        const dk = rs.deadAt ? Math.min(1, (now - rs.deadAt) / (780 / spd)) : 1;
        base = (dk < 0.22 ? PZ.hurt : PZ.dead) || base; Object.assign(cur, { px: rs.x + rs.ox + sh, py: rs.y + rs.oy + shy, rot: 0, sx: 1, sy: 1 });
      } else if (active) {
        const pick = rs.pose === 'atk' && rs.alt && !u.skills.some(s => s.cd > 0) ? PZ.atk2 : rs.pose === 'atk' || (rs.pose === 'cast' && rs.skIdx === 0) ? PZ.atk1 : rs.pose === 'atk2' || rs.pose === 'cast' ? PZ.atk2
          : rs.pose === 'hit' ? (PZ.block && u.effects.some(e => e.k === 'shield' || e.k === 'defUp') ? PZ.block : PZ.hurt) : null;
        if (pick) base = pick;
      }
    }
    rs.trail.forEach((p, i) => fig(base, a * 0.3 * (i + 1) / rs.trail.length, p, 0));
    if (u.alive) { const pre = mangaPre(base, ak, kx, ky); castShadow(pre, -m.w / 2, -m.fy, pre.width / RS, pre.height / RS, cur.px, rs.y + rs.oy + shy, mir, a * 0.7); }
    fig(base, a, Object.assign({}, cur, { st: statusFx(u) }), glow);
    if (P.dim > 0) fig(PZ ? tint(base, 'dark') : SPR.frame(u.id, 'dim', flip ? 'flip' : ''), a * P.dim, cur, 0);
    if (rs.flash > 0.02 && u.alive) { fig(PZ ? tint(base, 'white') : SPR.frame(u.id, fr, flip ? 'whiteflip' : 'white'), Math.min(1, rs.flash), cur, 0); rs.flash *= FADE; }
    // the slash of a melee strike: a crescent sweeping down in front of the figure, white in the middle, the essence colour around
    const sl = active && rs.skAnim === 'melee' ? (rs.pose === 'atk' ? (k - 0.14) / 0.48 : rs.pose === 'atk2' ? (k - 0.46) / 0.4 : -1) : -1;
    if (sl > 0 && sl < 1 && !calm()) {
      const r = m.fy * 0.72, a1 = -1.4 + 2.7 * eo(Math.min(1, sl * 1.6)), a0 = Math.max(-1.4, a1 - 1.6);
      g.save(); g.translate(cur.px + dir * m.cw * 0.2, cur.py - m.fy * 0.52); g.scale(dir, 1); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      g.globalAlpha = sl < 0.55 ? 1 : (1 - sl) / 0.45; g.shadowColor = ess; g.shadowBlur = 14 * RS;
      for (const [rr, lw] of [[r, 6], [r * 0.86, 3]]) { g.beginPath(); g.arc(0, 0, rr, a0, a1); g.strokeStyle = ess; g.lineWidth = lw; g.stroke(); }
      g.shadowBlur = 0; g.beginPath(); g.arc(0, 0, r, a0 + 0.25, a1); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.stroke();
      g.restore();
    }
    g.imageSmoothingEnabled = false; g.globalAlpha = 1;
  }
  let FADE = 0.8; // this frame's fade factor for hit flashes (frame())
  function setPose(u, pose, ms) { const now = performance.now(); Object.assign(u._rs, { pose, poseAt: now, poseUntil: now + ms / spd }); }
  // test hook (only with ?debug in the address): lets a test page play poses on the battle figures while the battle is paused
  if (/[?&]debug\b/.test(location.search)) window.FFH_DBG = { R, setPose, setPaused, info, animBefore, animAfter, updateOverlay, repSummary: r => { lastRep = r; RSUM.open = null; RSUM.sel.clear(); RSUM.selecting = false; RSUM.arm = null; return repSummary(r); }, S: () => S };
  function frame(now) {
    if (!R.running) return;
    const shk = R.shake > 0.3 && !calm() && S.shake !== false; // Settings → Battle → Screen shake (S.shake false: never)
    const sh = shk ? Math.round((Math.random() - 0.5) * R.shake * 2) : 0, shy = shk ? Math.round((Math.random() - 0.5) * R.shake) : 0;
    R.shake *= 0.86;
    // hit flashes fade by time, not by drawn frames (a slow screen would keep them white for long)
    FADE = Math.pow(0.8, Math.min(6, Math.max(0.5, (now - (R.lastNow || now - 16.7)) / 16.7))); R.lastNow = now;
    g.setTransform(RS, 0, 0, RS, -VIEW.x * RS, 0); g.imageSmoothingEnabled = false; // set every frame: a context the phone restored starts from defaults
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    { const bgc = SPR.bg(R.bg || R.area); if (bgc.width > 480) { g.imageSmoothingEnabled = true; g.drawImage(bgPre(bgc), sh, shy, 480, 270); g.imageSmoothingEnabled = false; g.fillStyle = BG_SHADE || (BG_SHADE = topShade()); g.fillRect(0, 0, 480, 70); } else g.drawImage(bgc, sh, shy); }
    if (B && B.cfg.type === 'siege' && B.cfg.moon) { g.fillStyle = 'rgba(150, 10, 20, 0.22)'; g.fillRect(0, 0, 480, 270); } // the Blood Moon's red sky
    const ashCol = [ 'rgba(190,160,150,.5)', 'rgba(180,210,225,.4)', 'rgba(200,190,170,.35)', 'rgba(200,255,140,.55)', 'rgba(255,150,60,.65)' ][R.area];
    g.fillStyle = ashCol;
    for (const a of R.ash) { a.x += a.vx; a.y += R.area === 4 ? -a.vy : a.vy; if (a.y > H) a.y = -2; if (a.y < -2) a.y = H; if (a.x < 0) a.x = W; g.fillRect(Math.round(a.x), Math.round(a.y), 1, 1); }
    const sorted = [...R.units].sort((a, b) => a._rs.y - b._rs.y);
    const pulse = 0.55 + 0.45 * Math.sin(now / 160);
    for (const u of sorted) {
      const rs = u._rs, rx = Math.round(rs.m.cw / 2.6);
      if (!u.alive && !R.hl.has(u)) continue;
      if (u.alive && u.effects.some(e => e.k === 'bleed')) bloodPool(rs.x + rs.ox + sh, rs.y, rs.m.cw, now, rs.phase);
      softShadow(rs.x + rs.ox + sh, rs.y + 0.5, rx * 1.45, 6.5, 0.85);
      if (R.hl.has(u)) { g.globalAlpha = pulse; pxEllipse(Math.round(rs.x + rs.ox) + sh, rs.y, rx + 4, 4, R.hlKind === 'good' ? '#7cc35a' : '#d9b45a', true); g.globalAlpha = 1; }
    }
    for (const u of sorted) {
      const rs = u._rs, m = rs.m;
      if (!u.alive && rs.gone && !R.hl.has(u)) continue; // fell in an earlier phase: stays behind unless it can be revived
      // the figure is drawn around its feet with this frame's pose (see pose())
      const flip = u.side === 'enemy', dir = flip ? -1 : 1, fr = u.effects.some(e => e.k === 'burrow') ? 'burrow' : 'idle0', P = pose(u, now);
      const px = Math.round(rs.x + rs.ox + P.dx * dir) + sh, py = Math.round(rs.y + rs.oy - rs.jump + P.dy) + shy;
      // a fine picture (manga figure, k > 1) is drawn k times smaller and smoothly; the old pixel figures stay blocky
      const ak = SPR.k(u.id), draw = (img, a) => { g.globalAlpha = a; g.save(); g.translate(px, py); if (P.rot) g.rotate(P.rot * dir); if (P.sx !== 1 || P.sy !== 1) g.scale(P.sx, P.sy); if (ak > 1) { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; { const [sx, sy] = stretch(u.id); g.drawImage(img, -m.w / 2, -m.fy, img.width / ak * sx, img.height / ak * sy); } } else g.drawImage(img, -Math.round(m.w / 2), -m.fy); g.restore(); };
      const a = (u.alive ? rs.alpha : 0.85) * (u.id === 'nevelgeest' && u.alive ? 0.9 : 1);
      const SH = SPR.sheet(u.id);
      if (SH) {
        // an animated hero (sheets.js): this moment's frame of its move, feet on the spot, mirrored on the enemy side
        const img = sheetFrame(u, SH, now), sx = rs.x + rs.ox + (u.alive ? P.dx * dir : 0) + sh, sy = rs.y + rs.oy - rs.jump + (u.alive ? P.dy : 0) + shy;
        if (img) {
          const f = fitOf(u.id) * figOf(u.id), bx = -SH.w * f / 2, by = (-SH.h + 1 / SH.k) * f, bw = SH.w * f, bh = SH.h * f;
          g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
          if (u.alive) castShadow(img, bx, by, bw, bh, sx, rs.y + rs.oy + shy, flip ? -1 : 1, a * 0.7);
          g.globalAlpha = a; g.save(); g.translate(sx, sy); if (flip) g.scale(-1, 1); drawFig(img, bx, by, bw, bh, statusFx(u), now); g.restore(); g.imageSmoothingEnabled = false;
        }
        if (rs.flash > 0.02) rs.flash *= FADE;
      } else if (SPR.manga(u.id)) drawManga(u, P, now, a, flip, dir, fr, sh, shy);
      else {
        draw(SPR.frame(u.id, fr, flip ? 'flip' : ''), a);
        if (P.dim > 0) draw(SPR.frame(u.id, 'dim', flip ? 'flip' : ''), a * P.dim);
        if (rs.flash > 0.02 && u.alive) { draw(SPR.frame(u.id, fr, flip ? 'whiteflip' : 'white'), Math.min(1, rs.flash)); rs.flash *= FADE; }
      }
      statusParts(u, statusFx(u));
      if (rs.glow > 0.02) { g.globalAlpha = rs.glow * 0.8; pxEllipse(Math.round(rs.x + rs.ox) + sh, Math.round(rs.y - m.top / 2), Math.round(m.cw / 2) + 4, Math.round(m.top / 2) + 3, AFF_COL[u.aff], true); }
      g.globalAlpha = 1;
      if (R.active === u && u.alive && !rs.walking) {
        const ax = Math.round(rs.x + rs.ox) + sh, ay = Math.round(rs.y - m.top - 8 - (Math.floor(now / 300) % 2));
        g.fillStyle = '#120c10'; g.fillRect(ax - 5, ay - 5, 11, 3); g.fillRect(ax - 4, ay - 2, 9, 2); g.fillRect(ax - 3, ay, 7, 2); g.fillRect(ax - 1, ay + 2, 3, 1);
        g.fillStyle = u.side === 'hero' ? '#d9b45a' : '#d9533f'; g.fillRect(ax - 4, ay - 4, 9, 1); g.fillRect(ax - 3, ay - 3, 7, 2); g.fillRect(ax - 2, ay - 1, 5, 1); g.fillRect(ax - 1, ay, 3, 1); g.fillRect(ax, ay + 1, 1, 1);
      }
    }
    drawProjs(now);
    drawFx(now);
    R.parts = R.parts.filter(p => (p.life -= 1) > 0);
    for (const p of R.parts) { p.x += p.vx; p.y += p.vy; p.vy += p.grav; g.fillStyle = p.col; g.globalAlpha = Math.min(1, p.life / 12); g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size); }
    g.globalAlpha = 1;
    if (R.dim > 0.01) { g.fillStyle = `rgba(6,4,8,${R.dim})`; g.fillRect(0, 0, W, H); }
    requestAnimationFrame(frame);
  }

  // ----- banners -----
  async function showBanner(title, sub, cls, ms) {
    const b = $('#banner');
    b.className = cls || ''; b.innerHTML = `${sub ? `<span class="bs">${esc(sub)}</span>` : ''}<span class="bt">${esc(title)}</span>`;
    b.hidden = false;
    await sleep(ms || 600);
    b.hidden = true;
  }

  // ----- status icons -----
  // Every buff and debuff on a unit is a small icon badge: a symbol per effect, green for buffs and red for debuffs
  // (damage over time in its own colour), an arrow for stat ups and downs and the turns left in the corner.
  const FXP = {
    sword: 'M12.5 1.5h2v2L7 11 5 9zM4 9.5 6.5 12l-1 1-.8-.8-1.6 1.6-1.2-1.2 1.6-1.6-.8-.8z',
    shield: 'M8 1l6 2.2v4.3c0 3.8-2.7 6.3-6 7.5-3.3-1.2-6-3.7-6-7.5V3.2z',
    bolt: 'M9.5 1 3 9h4.2L6 15l7-8.5H8.8z',
    target: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm0 2.3a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zM8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z',
    star: 'M8 1l1.9 4.3 4.6.5-3.5 3.1 1 4.6L8 11.2l-4 2.3 1-4.6L1.5 5.8l4.6-.5z',
    plus: 'M6.3 1.5h3.4v4.8h4.8v3.4H9.7v4.8H6.3V9.7H1.5V6.3h4.8z',
    eye: 'M8 3.5C4.3 3.5 1.5 8 1.5 8s2.8 4.5 6.5 4.5S14.5 8 14.5 8 11.7 3.5 8 3.5zm0 2.3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z',
    counter: 'M1.5 5h8V2.2L14 6.2l-4.5 4V7.4h-8zM14.5 11h-8v2.8L2 9.8l4.5-4v2.8h8z',
    down: 'M6.3 1.5h3.4v6h3.8L8 14.5 2.5 7.5h3.8z',
    flame: 'M8 .8c1.2 3.2 4.7 4.6 4.7 8.8A4.7 4.7 0 0 1 3.3 9.6c0-2.3 1.5-3.4 2.2-5 .5 1.6 1.2 2.3 2.1 2.6C7.8 5.2 7.4 3 8 .8z',
    drop: 'M8 1.2S3.2 7 3.2 10.2a4.8 4.8 0 0 0 9.6 0C12.8 7 8 1.2 8 1.2z',
    skull: 'M8 1.3a5.7 5.7 0 0 0-5.7 5.7c0 2.1 1 3.4 2.1 4V13.5h2.2V12h2.8v1.5h2.2V11c1.1-.6 2.1-1.9 2.1-4A5.7 5.7 0 0 0 8 1.3zM5.6 6.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zm4.8 0a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z',
    snow: 'M7.2.8h1.6v14.4H7.2zM.8 7.2h14.4v1.6H.8zM2.4 3.5l1.1-1.1 10.1 10.1-1.1 1.1zM12.5 2.4l1.1 1.1L3.5 13.6l-1.1-1.1z',
    stun: 'M5 .8l1.1 2.6 2.8.3-2.1 1.9.6 2.8L5 7 2.6 8.4l.6-2.8L1.1 3.7l2.8-.3zM11.5 6.8l1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.3-2.1 1.3.5-2.4-1.8-1.6 2.4-.3z',
    mute: 'M2 6h12v4.2H2zM1.3 13.6 13.6 1.3l1.1 1.1L2.4 14.7z',
    heart: 'M8 14.3S1.3 10 1.3 5.6A3.4 3.4 0 0 1 8 4.2a3.4 3.4 0 0 1 6.7 1.4C14.7 10 8 14.3 8 14.3z',
    bang: 'M6.4 1.3h3.2L9 10H7zM6.7 11.4h2.6v2.9H6.7z',
    cross: 'M7.2.8h1.6v4.4H7.2zM7.2 10.8h1.6v4.4H7.2zM.8 7.2h4.4v1.6H.8zM10.8 7.2h4.4v1.6h-4.4zM8 5.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2z',
  };
  const FX_ICON = { atkUp: 'sword', atkDown: 'sword', defUp: 'shield', defDown: 'shield', spdUp: 'bolt', spdDown: 'bolt', critUp: 'target', cdmgUp: 'star', shield: 'shield', regen: 'plus', stealth: 'eye', immune: 'shield', counter: 'counter', burrow: 'down', burn: 'flame', bleed: 'drop', poison: 'skull', freeze: 'snow', iceTomb: 'snow', stun: 'stun', silence: 'mute', healRed: 'heart', accDown: 'eye', taunt: 'bang', mark: 'cross', broken: 'bolt', enrage: 'flame', blight: 'skull', ironhide: 'shield', swift: 'bolt' };
  const fxSvg = k => `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="${FXP[FX_ICON[k] || 'star']}"/></svg>`;
  // one badge; n = turns left (none for lasting effects), extra = a count shown instead (stacks)
  function fxBadge(k, n, title, extra) {
    const E0 = K.EFFECTS[k] || {}, arrow = /Up$/.test(k) ? '▲' : /Down$|^healRed$/.test(k) ? '▼' : '';
    const kind = k === 'enrage' ? 'rage' : E0.buff ? 'good' : 'bad';
    const left = n != null && n < 99 ? ` · ${n} turn${n === 1 ? '' : 's'} left` : '';
    return `<span class="fxi ${kind} fx-${k}" title="${esc((title || (E0.n ? `${E0.n}: ${E0.d}` : k)) + left)}">${fxSvg(k)}${arrow ? `<em>${arrow}</em>` : ''}${extra != null ? `<i>${extra}</i>` : n != null && n < 99 ? `<i>${n}</i>` : ''}</span>`;
  }

  // a status badge says what it does on hover (title); phones have no hover, so a tap shows the same text in a bubble
  // (the tap is caught before it reaches the unit underneath, so it does not pick a target)
  document.addEventListener('click', e => {
    let tip = $('#fx-tip');
    const b = e.target.closest && e.target.closest('.fxi[title], .fxi[data-tip]');
    if (!b) { if (tip) tip.hidden = true; return; }
    e.stopPropagation(); e.preventDefault();
    if (b.title) { b.dataset.tip = b.title; b.removeAttribute('title'); } // no second (native) tooltip on top of ours
    if (!tip) { tip = document.createElement('div'); tip.id = 'fx-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    if (!tip.hidden && tip.textContent === b.dataset.tip) { tip.hidden = true; return; }
    tip.textContent = b.dataset.tip; tip.hidden = false;
    const r = b.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + 'px';
    clearTimeout(tip._t); tip._t = setTimeout(() => (tip.hidden = true), 4000);
  }, true);

  // ----- battle hooks -----
  const SELF_KINDS = ['heal', 'shield', 'buff', 'revive', 'dust'];
  async function animBefore(u, skill, targets) {
    const rs = u._rs, dir = u.side === 'hero' ? 1 : -1, v = skill.vfx || '';
    rs.skIdx = u.skills.indexOf(skill); // which skill (an animated sheet may have its own row for the third)
    rs.skAnim = skill.anim; // melee, ranged, magic, buff (manga figures draw a slash for melee strikes)
    if (!skill.cd) rs.alt = !rs.alt; // a character with poses but no skill swings attack 1 and attack 2 in turn
    if (skill.anim === 'melee') {
      SFX.swing();
      const tx = targets.reduce((s, t) => s + t._rs.x, 0) / targets.length - dir * ((u.big ? 30 : 22) + Math.max(...targets.map(t => t.immortal ? Math.round(t._rs.m.cw * 0.38) : t.big ? 20 : 8)));
      const ty = targets.reduce((s, t) => s + t._rs.y, 0) / targets.length;
      const dx = tx - rs.x, dy = ty - rs.y;
      await tween(200, k => { const e = ease(k); rs.ox = dx * e; rs.oy = dy * e - Math.sin(k * Math.PI) * 8; });
      // attack 1 (basic) or attack 2 (skill, a leap and smash); wait for the strike so the damage lands on it
      if (skill.cd > 0) { setPose(u, 'atk2', 560); await sleep(560 * 0.55); } else { setPose(u, 'atk', 360); await sleep(360 * 0.3); }
    } else if (skill.anim === 'slam') {
      setPose(u, 'cast', 400);
      await tween(260, k => { rs.jump = 20 * Math.sin(k * Math.PI); });
      rs.jump = 0; R.shake = 8; SFX.boom();
      const gy = Math.max(...targets.map(t => t._rs.y));
      for (let i = 0; i < 14; i++) burst(rs.x - dir * i * 18, gy - 2, ['#8a7a68', '#5a4a3a', '#3a2e24'], 3, 1.4, 2, 0.12);
      await sleep(120);
    } else if (SELF_KINDS.includes(v) || skill.anim === 'buff') {
      setPose(u, 'cast', 500);
      const allies = targets.filter(t => t.side === u.side);
      const list = allies.length ? allies : [u];
      if (v === 'heal') { SFX.heal(); for (const t of list) { rise(t._rs.x, t._rs.y - 8, ['#9be070', '#d8ffb0'], 14, 26); addFx({ kind: 'ring', x: t._rs.x, y: t._rs.y - 4, col: '#9be070', r: 20, dur: 420 }); } }
      else if (v === 'shield') { SFX.shield(); for (const t of list) addFx({ kind: 'dome', x: t._rs.x, y: t._rs.y, rx: t._rs.m.cw / 2 + 8, ry: t._rs.m.top + 6, col: '#9fd0ff', dur: 520 }); }
      else if (v === 'revive') { SFX.heal(); for (const t of targets) { addFx({ kind: 'beam', x: t._rs.x, y: t._rs.y, col: '#ffe8a0', w: 18, dur: 500 }); rise(t._rs.x, t._rs.y - 6, ['#ffe8a0', '#ffffff'], 20, 20); } }
      else if (v === 'dust') { for (let i = 0; i < 4; i++) burst(rs.x + (Math.random() - 0.5) * 40, rs.y - 4, ['#6a5040', '#8a7058'], 8, 1.6, 2, 0.08); R.shake = 4; SFX.boom(); }
      else if (v === 'curse') { SFX.magic(); rise(rs.x, rs.y - 10, ['#c080ff', '#6a3a9a'], 18, 40); }
      else if (v === 'dark') { SFX.magic(); for (const t of targets) { const [x, y] = center(t); burst(x, y, ['#9a6aff', '#3a1a5a'], 12, 1.2); } }
      else { SFX.buff(); for (const t of list) { rise(t._rs.x, t._rs.y - 4, [AFF_COL[u.aff], '#fff6e0'], 12, 24); } }
      await tween(340, k => { rs.glow = Math.sin(k * Math.PI); for (const t of list) if (t !== u) t._rs.glow = Math.sin(k * Math.PI) * 0.7; });
      rs.glow = 0; for (const t of list) t._rs.glow = 0;
    } else {
      setPose(u, skill.anim === 'ranged' ? (skill.cd > 0 ? 'atk2' : 'atk') : 'cast', 520);
      await tween(120, k => { rs.ox = -dir * 3 * Math.sin(k * Math.PI); rs.glow = skill.anim === 'magic' ? Math.sin(k * Math.PI) : 0; });
      rs.ox = 0; rs.glow = 0;
      const list = skill.random ? [targets[0]] : targets;
      const col = VFXCOL[v] || AFF_COL[u.aff];
      if (v === 'arrowrain') { SFX.arrow(); await Promise.all(list.map(t => falling(t, 'arrow', '#d8c8a8', 5))); }
      else if (v === 'meteor') { SFX.fire(); await Promise.all(list.map(t => falling(t, 'rock', '#ff8a2a', 2))); SFX.boom(); }
      else if (v === 'holy' || v === 'sunfall') { SFX.magic(); await Promise.all(list.map(t => addFx({ kind: 'beam', x: center(t)[0], y: t._rs.y, col, w: v === 'sunfall' ? 30 : 12, dur: v === 'sunfall' ? 420 : 300 }))); }
      else if (v === 'rune') { SFX.magic(); await Promise.all(list.map(t => addFx({ kind: 'glyph', x: t._rs.x, y: t._rs.y - 2, col, dur: 360 }))); }
      else if (v === 'thorns') { SFX.magic(); await Promise.all(list.map(t => addFx({ kind: 'spikes', x: t._rs.x, y: t._rs.y, col, dur: 320 }))); }
      else if (v === 'curse') { SFX.magic(); const [sx, sy] = center(u); await Promise.all(list.map(t => addFx({ kind: 'thread', sx, sy, tx: center(t)[0], ty: center(t)[1], col, dur: 340 }))); }
      else if (v === 'water' && list.length === 1) { SFX.magic(); await addFx({ kind: 'wave', sx: rs.x + dir * 10, tx: center(list[0])[0], y: list[0]._rs.y - 6, col, dur: 300 }); }
      else {
        const kind = v === 'arrow' ? 'arrow' : v === 'knife' ? 'knife' : v === 'cannon' ? 'cannon' : v === 'poison' || v === 'smoke' ? 'glob' : 'orb';
        if (kind === 'arrow' || kind === 'knife') SFX.arrow(); else if (v === 'fire') SFX.fire(); else SFX.magic();
        await Promise.all(list.map(t => projectile(u, t, kind, col)));
      }
    }
  }
  async function animAfter(u, skill) {
    const rs = u._rs;
    if (skill.anim === 'melee') {
      await sleep(150);
      const sx = rs.ox, sy = rs.oy;
      await tween(210, k => { const e = ease(k); rs.ox = sx * (1 - e); rs.oy = sy * (1 - e); });
      rs.ox = 0; rs.oy = 0;
    }
    await sleep(240);
  }
  function log(text, side) {
    const ol = $('#b-log'), li = document.createElement('li');
    li.textContent = text; li.className = side || '';
    ol.appendChild(li);
    while (ol.children.length > 40) ol.firstChild.remove();
    ol.scrollTop = ol.scrollHeight;
  }
  const hooks = {
    chooseAction: (u, b) => new Promise(res => {
      pending = { u, res, b };
      selSkill = u.skills.findIndex(s => b.usable(u, s));
      refreshChoice(); coachTurn(u, b);
    }),
    // manual arena fights: every hero action goes to the server at the end (K.arenaReplay)
    // an auto move aimed at the focus is sent as a plain move (skill and target), so the server replays exactly that
    // (the AI took the focus without drawing a random number, so the replay stays in step)
    record: (u, act, auto) => { if (B && B.moves && B.cfg.type === 'arena') B.moves.push([...K.arenaMove(u, act), auto && !(B.b.focus && act.target === B.b.focus) ? 1 : 0]); },
    turnStart: async u => { await bannerQ; R.active = u; renderBar(u); updateOverlay(); await sleep(u.side === 'enemy' ? 300 : 110); },
    before: animBefore,
    after: animAfter,
    pause: ms => sleep(ms),
    round: r => { $('#b-round').textContent = (B && B.cfg.type === 'siege' ? `Wave ${B.cfg.from + B.ph} · ` : B && B.nPh > 1 ? `Phase ${B.ph + 1}/${B.nPh} · ` : '') + 'Turn ' + r + (B && B.cfg.type === 'siege' ? (r < K.SIEGE.rageAt ? ` · rage at ${K.SIEGE.rageAt}` : ' · ENRAGED') : B && B.cfg.type === 'arena' && r > K.ARENA_FURY.at - 20 ? (r >= K.ARENA_FURY.at + K.ARENA_FURY.every ? ` · FURY +${Math.round(K.ARENA_FURY.atk * Math.floor((r - K.ARENA_FURY.at) / K.ARENA_FURY.every) * 100)}%` : ` · fury at ${K.ARENA_FURY.at + K.ARENA_FURY.every}`) : ''); },
    fury: v => { if (v === 1) { SFX.banner(); if (!calm()) R.shake = 6; queueBanner('Arena fury!', 'The fight took too long: both teams deal more damage every 10 turns', 'big enemy', 1000); } updateOverlay(); },
    impact: (u, skill, t) => impactFx(u, skill, t),
    banner: async (u, skill) => {
      await bannerQ;
      SFX.banner(); R.dim = 0.35;
      await showBanner(skill.name, u.name, u.side === 'enemy' ? 'enemy' : '', 620);
      R.dim = 0;
    },
    hit: (t, amt, info) => {
      const rs = t._rs; rs.flash = calm() ? 0.35 : 1;
      if (info.kind === 'poison' || info.kind === 'burn' || info.kind === 'bleed') { popup(t, '-' + amt, info.kind); rise(rs.x, rs.y - 10, info.kind === 'burn' ? ['#ff8a2a', '#ffd060'] : info.kind === 'bleed' ? ['#e0303a', '#801018'] : ['#a8e060', '#6a9a3a'], 6, 16); }
      else {
        if (info.hit === 'strong') popup(t, 'STRONG HIT', 'strong'); else if (info.hit === 'weak') popup(t, 'WEAK HIT', 'weak');
        popup(t, String(amt), info.crit ? 'crit' : 'dmg');
        setPose(t, 'hit', 340);
        if (info.crit) { SFX.crit(); R.shake = Math.max(R.shake, 5); } else SFX.hit(); // no white screen flash on a crit (it was too much)
      }
      if (info.armored === true) popup(t, 'Armor', 'resist');
      if (info.armored === 'pop') popup(t, 'Protected', 'resist');
      const ox0 = rs.ox, d = t.side === 'hero' ? -1 : 1;
      tween(150, k => { rs.ox = ox0 + d * 3 * Math.sin(k * Math.PI); }).then(() => { if (!B || B.b.active !== t) rs.ox = ox0; });
      updateOverlay();
    },
    healed: (t, amt) => { popup(t, '+' + amt, 'heal'); rise(t._rs.x, t._rs.y - 10, ['#9be070', '#d8ffb0'], 6, 18); updateOverlay(); },
    float: (t, txt, kind) => popup(t, txt, kind),
    death: t => { t._rs.deadAt = performance.now(); SFX.death(); burst(t._rs.x, t._rs.y - t._rs.m.top / 2, ['#6a5a58', '#3a3036', '#8a7a78'], 18, 1.6, 2, 0.08); updateOverlay(); },
    revive: t => { t._rs.deadAt = 0; popup(t, 'Revived!', 'heal'); rise(t._rs.x, t._rs.y - 8, ['#ffe8a0', '#aef08a'], 18, 22); updateOverlay(); },
    spawn: (u, respawn) => {
      if (!respawn) {
        const used = R.units.filter(x => x.side === 'enemy' && x.alive && x !== u).map(x => x._rs && x._rs.hx + ',' + x._rs.y);
        const pos = ADD_POS.find(p => !used.includes(p[0] + ',' + p[1])) || ADD_POS[0];
        place(u, pos, 0); R.units.push(u); buildOverlay(u);
      }
      setPose(u, 'cast', 300);
      rise(u._rs.x, u._rs.y - 6, ['#c080ff', '#6a3a9a'], 20, 26);
      popup(u, 'Summoned', 'debuff');
      updateOverlay();
    },
    breakHit: () => updateOverlay(),
    affinityBreak: t => {
      R.shake = 9; flash(); SFX.crit(); SFX.boom();
      const [x, y] = center(t); burst(x, y, ['#fff6d0', AFF_COL[t.aff], '#ffffff'], 30, 2.6, 2);
      queueBanner('AFFINITY BREAK', t.name + ' is stunned', 'big brkb', 900);
      updateOverlay();
    },
    phase: (t, n) => { SFX.banner(); R.shake = 5; queueBanner(`Phase ${n}`, t.name, 'big enemy', 900); updateOverlay(); },
    enrage: (t, v) => { if (v === 1) { SFX.banner(); if (!calm()) R.shake = 6; queueBanner('Enraged!', B && B.cfg.type === 'siege' ? `The wave took too long: every enemy hits harder and harder` : `${t.name} took too long to fall: its Attack keeps rising`, 'big enemy', 1000); } updateOverlay(); },
    log,
    update: updateOverlay,
  };
  let bannerQ = Promise.resolve();
  function queueBanner(title, sub, cls, ms) { bannerQ = bannerQ.then(() => { R.dim = 0.3; return showBanner(title, sub, cls, ms); }).then(() => { R.dim = 0; }); return bannerQ; }

  // the skill column shows every skill whole: when the texts do not fit, all of them shrink together a step at a time
  // (--fs, down to 60%); again when the window changes size
  function fitSkills() {
    const box = $('#b-skills'); if (!box || !box.children.length || $('#battle').hidden) return;
    let fs = 1; box.style.setProperty('--fs', fs);
    for (const b of box.querySelectorAll('.sk > b')) b.style.fontSize = '';
    while (fs > 0.6 && box.scrollHeight > box.clientHeight + 1) { fs = Math.round((fs - 0.04) * 100) / 100; box.style.setProperty('--fs', fs); }
    // a name with a word too long for the column (Thunderstrike) shrinks on its own, the rest keeps its size
    for (const b of box.querySelectorAll('.sk > b')) { let px = parseFloat(getComputedStyle(b).fontSize); while (px > 8 && b.scrollWidth > b.clientWidth + 1) { px -= 0.5; b.style.fontSize = px + 'px'; } }
  }
  // measured on the next frame and once more a moment later (the column only gets its final width when the battle view settles)
  const fitSoon = () => { requestAnimationFrame(fitSkills); setTimeout(fitSkills, 300); };
  addEventListener('resize', fitSoon);
  function renderBar(u) {
    const isHero = u.side === 'hero';
    $('#b-por').src = SPR.url(u.id, 1, !isHero);
    $('#b-name').textContent = (isHero ? '' : 'Enemy: ') + u.name;
    const box = $('#b-skills');
    if (!isHero) { box.innerHTML = ''; $('#b-hint').textContent = 'Enemy turn…'; return; }
    if (!pending || pending.u !== u) {
      box.innerHTML = u.skills.map((s, i) => skillBtn(u, s, i, false)).join(''); fitSoon();
      $('#b-hint').textContent = B && B.b.auto ? 'Auto is playing this turn.' : ' ';
    }
  }
  // the round skill buttons of the battle (bottom right): a glyph by the skill's effect, coloured by its kind
  const SK_GLYPH = {
    blade: '<path d="M5 19L17 7l2-3-3 2L4 18"/><path d="M8 14l2 2M4 20l2-2"/>',
    arrow: '<path d="M4 20L19 5M19 5h-5M19 5v5"/><path d="M4 20l3-1-2-2z"/>',
    fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 2 4 1-2 1-5 1-8z"/>',
    drop: '<path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z"/>',
    dark: '<path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z"/>',
    star: '<path d="M12 3l2.4 6 6.6.4-5 4.2 1.6 6.4L12 16.5 6.4 20l1.6-6.4-5-4.2 6.6-.4z"/>',
    heal: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
    shield: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
    leaf: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z"/><path d="M5 19L13 11"/>',
  };
  const skGlyph = s => ({ arrow: 'arrow', arrowrain: 'arrow', fire: 'fire', sunfall: 'fire', meteor: 'fire', water: 'drop', poison: 'drop', blood: 'drop', dark: 'dark', curse: 'dark', smoke: 'dark', rune: 'star', holy: 'star', heal: 'heal', revive: 'heal', shield: 'shield', buff: 'shield', thorns: 'leaf' })[s.vfx] || 'blade';
  const skKind = s => s.fx.some(f => f.t === 'heal' || f.t === 'revive') ? 'heal' : s.fx.some(f => f.t === 'shield') || s.anim === 'buff' ? 'guard' : s.anim === 'magic' ? 'magic' : 'hit';
  function skillBtn(u, s, i, sel) {
    const ok = B && B.b.usable(u, s);
    const sub = s.cdLeft > 0 ? `${s.cdLeft} more ${s.cdLeft === 1 ? 'turn' : 'turns'}` : (!ok ? (u.oneRevive && u.flags.revUsed && s.fx.some(f => f.t === 'revive') ? 'Used: once per arena fight' : 'Nobody has fallen') : TARGET_LABEL[s.target]);
    return `<button class="sk sk-${skKind(s)} ${sel ? 'sel' : ''} ${ok ? 'ready' : ''} ${s.cd >= 3 ? 'big' : ''}" type="button" data-i="${i}" ${ok && pending ? '' : 'disabled'} title="${esc(s.name)}: ${esc(s.desc)}"><span class="sk-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${SK_GLYPH[skGlyph(s)]}</svg></span>${s.cdLeft > 0 ? `<span class="sk-cd">${s.cdLeft}</span>` : ''}<span class="sk-n">${esc(s.name)}</span><span class="k">${i + 1} · ${SKILL_TAG[i] || ''}${s.cd ? ' · cd ' + s.cd : ''}${s.lv ? ' · lv ' + s.lv : ''}</span><b>${esc(s.name)}</b><small>${sub}</small><span class="sk-d">${esc(s.desc)}</span></button>`;
  }
  // ----- coach: explains the game step by step in the very first battle (Chapter I · Stage 1, first time) -----
  const TUT = { on: false, turns: 0 };
  // shows a coach card under the battlefield; with a button label it waits until the player taps it
  // (cards that wait for a tap sit over the battlefield; short turn tips sit just above the skills)
  function coach(html, btn) {
    if (!btn) { const el = $('#coach'); el.innerHTML = `<div class="coach-body">${html}</div>`; el.hidden = false; return Promise.resolve(); }
    const pop = $('#coach-pop');
    pop.innerHTML = `<div class="coach-card"><div class="coach-body">${html}</div><button class="btn primary" type="button">${btn}</button></div>`;
    pop.hidden = false;
    return new Promise(res => { const b = pop.querySelector('button'); b.focus({ preventScroll: true }); b.addEventListener('click', () => { pop.hidden = true; res(); }, { once: true }); });
  }
  const coachHide = () => { const el = $('#coach'), pop = $('#coach-pop'); if (el) el.hidden = true; if (pop) pop.hidden = true; };
  // the player's turn in the tutorial: what to tap, and when a stronger skill is ready
  function coachTurn(u, b) {
    if (!TUT.on) return;
    TUT.turns++;
    const ready = u.skills.slice(1).filter(s => b.usable(u, s));
    if (TUT.turns === 1) coach(`<b>Your turn!</b><ol><li>Pick a skill on the right. <b>Basic</b> is always ready; stronger skills need a few turns to recharge (the <b>cooldown</b>, CD).</li><li>Tap a highlighted enemy (the glowing marker at its feet) to attack it.</li></ol>`);
    else if (TUT.turns === 2) coach(`<b>Tip:</b> the colored icon next to every name is its <b>essence</b>. Some essences beat others and deal extra damage (a <b>Strong Hit</b>). Your Guide (the ? button) explains them all.`);
    else if (ready.length && TUT.turns <= 4) coach(`<b>${esc(ready[0].name)}</b> is ready: it hits harder than your Basic attack. Try it!`);
    else coachHide();
  }
  function refreshChoice() {
    if (!pending) { R.hl = new Set(); updateOverlay(); return; }
    const { u, b } = pending, s = u.skills[selSkill];
    $('#b-skills').innerHTML = u.skills.map((sk, i) => skillBtn(u, sk, i, i === selSkill)).join('') + `<p class="b-desc">${esc(s.desc)}</p>`; fitSoon();
    R.hl = new Set(b.validTargets(u, s));
    R.hlKind = ['ally', 'allies', 'self', 'deadAlly', 'lowestAlly'].includes(s.target) ? 'good' : 'bad';
    const taunted = s.target === 'enemy' && b.tauntTarget(u);
    $('#b-hint').textContent = taunted ? `Taunted: you must attack ${taunted.name}.`
      : s.target === 'enemy' ? 'Tap an enemy to attack.'
      : s.target === 'ally' ? 'Tap an ally.'
      : s.target === 'deadAlly' ? 'Tap a fallen ally.'
      : 'Tap the skill again or a highlighted target.';
    updateOverlay();
  }
  function resolveChoice(target) {
    if (!pending) return;
    const { u, res, b } = pending, s = u.skills[selSkill];
    if (!s || !b.usable(u, s)) return; // a skill on cooldown is never used, whatever the page says
    pending = null; R.hl = new Set();
    if (TUT.on && TUT.turns === 1) coachHide();
    $('#b-skills').querySelectorAll('button').forEach(b => (b.disabled = true));
    $('#b-hint').textContent = ' ';
    updateOverlay();
    res({ skill: s, target });
  }
  // on auto tapping an enemy makes it every hero's focus; tap it again to clear (not against the guild boss: one target)
  const canFocus = () => B && B.b.auto && B.cfg.type !== 'gboss' && !(B.cfg.type === 'arena' && !(B.cfg.fight && B.cfg.fight.manual));
  function clickUnit(u) {
    if (!pending && canFocus() && u.side === 'enemy' && u.alive) {
      const b = B.b; b.focus = b.focus === u ? null : u; SFX.click();
      toast(b.focus ? `Focus: all heroes attack ${u.name}.` : 'Focus cleared: heroes pick their own targets.');
      updateOverlay(); return;
    }
    if (!pending || !R.hl.has(u)) return;
    const s = pending.u.skills[selSkill];
    resolveChoice(['enemy', 'ally', 'deadAlly'].includes(s.target) ? u : null);
  }
  $('#b-skills').addEventListener('click', e => {
    const btn = e.target.closest('.sk'); if (!btn || !pending || btn.disabled) return;
    { const sk = pending.u.skills[+btn.dataset.i]; if (!sk || !pending.b.usable(pending.u, sk)) return; } // not by the button alone (devtools can switch it on)
    SFX.click();
    const i = +btn.dataset.i, s = pending.u.skills[i];
    if (i === selSkill && !['enemy', 'ally', 'deadAlly'].includes(s.target)) { resolveChoice(null); return; }
    selSkill = i; refreshChoice();
  });
  document.addEventListener('keydown', e => {
    if ($('#battle').hidden || !pending) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= pending.u.skills.length && pending.b.usable(pending.u, pending.u.skills[n - 1])) {
      const s = pending.u.skills[n - 1];
      if (selSkill === n - 1 && !['enemy', 'ally', 'deadAlly'].includes(s.target)) resolveChoice(null);
      else { selSkill = n - 1; refreshChoice(); }
    }
  });
  // Auto battle opens after the first clear of Chapter I · Stage 1: the first battle is played by hand, with the coach
  const autoOk = () => S.cleared >= 0;
  // on auto the skill buttons give way (#battle.auto)
  function setAutoBtn() { const b = $('#b-auto'), on = B && B.cfg.type === 'arena' ? B.b.auto : S.auto && autoOk(); b.classList.toggle('on', on); $('#battle').classList.toggle('auto', !!(on || (B && B.b.auto))); b.classList.toggle('locked', !autoOk()); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = autoOk() ? 'Auto battle: ' + (on ? 'on' : 'off') : 'Auto battle unlocks when you clear Chapter I · Stage 1'; }
  function setSpeedBtn() { const b = $('#b-speed'); b.innerHTML = `<b>${spd}×</b>`; b.classList.toggle('on', spd > 1); b.title = 'Battle speed ' + spd + '×' + (speedHint() ? '. ' + speedHint() : ''); b.setAttribute('aria-label', b.title); SFX.calm = calm(); }
  $('#b-auto').addEventListener('click', () => {
    if (B && (B.cfg.type === 'gboss' || (B.cfg.type === 'arena' && !(B.cfg.fight && B.cfg.fight.manual)))) { toast(B.cfg.type === 'gboss' ? 'Guild boss fights always play on auto.' : 'Arena fights always play on auto.'); return; }
    // arena: auto only for this fight (every arena fight starts by hand)
    const arenaFight = B && B.cfg.type === 'arena';
    if (!arenaFight && !autoOk()) { toast('Auto battle unlocks when you clear Chapter I · Stage 1.'); return; }
    if (arenaFight) B.b.auto = !B.b.auto; else { S.auto = !S.auto; save(); if (B) B.b.auto = S.auto; }
    setAutoBtn();
    if (B && B.b.auto && pending) { const { res } = pending; pending = null; R.hl = new Set(); updateOverlay(); $('#b-hint').textContent = 'Auto is playing this turn.'; res({ auto: true }); }
  });
  $('#b-speed').addEventListener('click', () => {
    if (speeds.length === 1) { toast(speedHint()); return; }
    spd = speeds[(speeds.indexOf(spd) + 1) % speeds.length]; S.speed = spd; save(); setSpeedBtn();
    if (spd === 1 && speedHint()) toast(speedHint());
  });
  // in-battle guide: the battle clock stops while it is open (see PAUSE)
  $('#b-help').addEventListener('click', () => {
    SFX.click();
    const p = $('#guide-pop');
    p.querySelector('.gp-body').innerHTML = guideHtml(); p.hidden = false; setPaused(true);
    p.querySelector('#gp-close').focus();
  });
  function closeGuidePop() { const p = $('#guide-pop'); if (p.hidden) return; p.hidden = true; setPaused(false); }
  $('#gp-close').addEventListener('click', closeGuidePop);
  $('#guide-pop').addEventListener('click', e => { if (e.target.id === 'guide-pop') closeGuidePop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGuidePop(); });
  // Escape closes the Vault's item window
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && tab === 'forge' && (VT.open || FG.mat) && $('#modal').hidden && !B) { VT.open = null; VT.up = null; FG.mat = null; render(); } });
  // a fight the server already played (the guild boss, an arena fight on auto) is a replay: Skip to the end plays it out
  // at once (the result is the server's either way)
  const replayFight = () => !!B && (B.cfg.type === 'gboss' || (B.cfg.type === 'arena' && !(B.cfg.fight && B.cfg.fight.manual)));
  $('#b-skip').addEventListener('click', () => { if (!replayFight()) return; spd = 40; SFX.calm = true; toast('Skipping to the end…'); });
  // the flag cancels the fight (a second tap within 3 s confirms). A replay ends at once with the server's result (the
  // guild boss keeps the damage the server counted); any other fight is given up
  $('#b-quit').addEventListener('click', () => {
    const btn = $('#b-quit');
    if (Date.now() - quitArm > 3000) { quitArm = Date.now(); btn.classList.add('armed'); btn.setAttribute('aria-label', 'Tap again to cancel the fight'); setTimeout(() => { btn.classList.remove('armed'); btn.setAttribute('aria-label', 'Cancel the fight'); }, 3000); return; }
    quitArm = 0; btn.classList.remove('armed'); btn.setAttribute('aria-label', 'Cancel the fight');
    if (!B) return;
    B.b.aborted = true;
    if (pending) { const { u, res, b } = pending; pending = null; res(b.ai(u)); }
  });

  // ----- start / intro / finish -----
  // rep: an "Auto ×10" run ({ n: 10, k: battle number, won }): the same stage on auto, one battle after the other
  // ----- before a campaign battle or a Boss Hall level (tab 'prep'): your team on the left (pick a team,
  // tap a hero to take it out), VS in the middle (enemy level, drops, energy, how your essences hit theirs), the
  // enemies of each phase on the right, every hero below (tap to put in or take out), Auto ×10 and Fight. A campaign
  // stage edits the Campaign's team (S.modeTeam.campaign), a boss level the team for the boss's essence (S.bossTeam,
  // else the Boss Hall team). A new player's first battle skips it. PREP = { stage, ph, boss, n }
  const PREP = { stage: 0, ph: 0, boss: null, n: 1, tower: null };
  function openPrep(i) { Object.assign(PREP, { stage: i, ph: 0, boss: null, tower: null }); preBg(K.STAGES[i].chapter); useTeam('campaign'); setTab('prep'); window.scrollTo({ top: 0 }); }
  function openBossPrep(id, n) { Object.assign(PREP, { boss: id, n, ph: 0, tower: null }); preBg(Math.floor(K.BOSS_ORDER.indexOf(id) * K.CHAPTERS.length / K.BOSS_ORDER.length)); S.bhCur = id; useBossTeam(K.BOSSES[id].aff); setTab('prep'); window.scrollTo({ top: 0 }); }
  function openTowerPrep(e) { Object.assign(PREP, { tower: e, boss: null, ph: 0 }); preBg(ESS_CH[e] ?? 9); S.tw.cur = e; setTab('prep'); window.scrollTo({ top: 0 }); }
  function prepHtml() {
    const tower = PREP.tower && K.TOWERS.includes(PREP.tower) ? PREP.tower : null, boss = !tower && PREP.boss && K.BOSSES[PREP.boss] ? PREP.boss : null;
    let ph, lvl, rars = [], tile, energy, back, title, sub, teamSel, auto = '', act = 'toggle', fits = () => true, drops = '', warn = '';
    if (tower) {
      // a tower floor: its own team (heroes of its essence and your own hero, tapped in and out with twpick), one fight, no energy
      const f = Math.min(K.TOWER.floors, twProg(tower) + 1), F = K.towerFloor(f), n = twTeam(tower).length;
      ph = [K.towerFoes(tower, f)]; lvl = F.lvl; energy = 'Free'; act = 'twpick'; fits = id => twFits(id, tower);
      back = twName(tower); title = `${F.boss ? 'Boss floor' : 'Floor'} ${f}`; sub = twName(tower);
      teamSel = `<span class="pp-tn">${tower === 'All' ? 'Any hero' : `${tower} heroes`}</span>`;
      drops = `<span><small>First clear</small><span class="tw-msi">${twBigIc(K.towerReward(f)) || `${ic('coin')} ${K.towerReward(f).silver.toLocaleString('en-US')}`}</span></span>`;
      if (n && n < 4) warn = `<p class="tw-warn">${n === 1 ? 'One hero' : `${n} heroes`}: foes ${Math.round((K.TOWER.solo[n - 1] - 1) * 100)}% stronger.</p>`;
    } else if (boss) {
      const bo = K.BOSSES[boss], bi = K.BOSS_ORDER.indexOf(boss), n = PREP.n, own = S.bossTeam && S.bossTeam[bo.aff] != null && S.bossTeam[bo.aff] < S.teams.length;
      useBossTeam(bo.aff);
      ph = K.bossPhases(boss, n); lvl = K.bossLvl(bi, n); rars = K.bossLoot(n).rars; tile = 'random'; energy = K.bossEnergy(n);
      back = esc(bo.name); title = `Level ${n}`; sub = `${esc(bo.name)} · ${K.DIFFS[K.bossDiff(n)].name}`;
      teamSel = `<select data-pp="bteam" data-aff="${bo.aff}" aria-label="Team against ${bo.aff} bosses"><option value="" ${own ? '' : 'selected'}>Boss Hall team (${esc(S.teams[S.modeTeam.boss || 0].name)})</option>${S.teams.map((t, k) => `<option value="${k}" ${own && k === S.tsel ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>`;
      auto = n <= (S.bh[boss] || 0) ? `<button type="button" class="btn violet" data-act="bhauto" data-id="${boss}" data-n="${n}">Auto ×10</button>` : '';
    } else {
      const i = PREP.stage, st = K.STAGES[i], d = S.diff || 0, D = K.DIFFS[d], chapDone = clearedOn(d) >= st.chapter * 7 + 6;
      useTeam('campaign');
      ph = K.stagePhases(st, d); lvl = K.diffLvl(st, d); rars = D.rars; tile = st.slot || 'random'; energy = stEn(i, d);
      back = esc(K.CHAPTERS[st.chapter].name); title = st.n === 6 ? 'Boss stage' : `Stage ${st.n + 1}`; sub = `Chapter ${ROMAN[st.chapter]} · ${esc(D.name)}`;
      teamSel = `<select data-pp="team" aria-label="Team for the campaign">${S.teams.map((t, k) => `<option value="${k}" ${k === S.modeTeam.campaign ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>`;
      auto = clearedOn(d) >= i ? `<button type="button" class="btn ${chapDone ? 'violet' : ''}" data-act="auto10" data-stage="${i}" ${chapDone ? '' : `disabled title="Clear all of Chapter ${ROMAN[st.chapter]} on ${esc(D.name)} first"`}>${chapDone ? '' : LOCK_SVG}Auto ×10</button>` : '';
    }
    const tids = tower ? twTeam(tower) : S.team, foes = ph[PREP.ph] || ph[0];
    // the sharp battle art of this fight starts loading while the team is picked (sprites.js hires)
    for (const id of [...tids, ...ph.flat()]) SPR.loadHi(id);
    const card = (id, cls, act) => `<button type="button" class="pp-c ${cls || ''} rar-${C[id].rar}" style="--ec:${AFF_COL[C[id].aff]};--rc:var(--r${C[id].rar})" ${act || ''} title="${esc(C[id].name)}">${por(id)}${essBadge(C[id].aff)}<span class="hx-lv">${S.roster[id].lvl}</span><span class="hx-st">${'★'.repeat(S.roster[id].stars)}</span></button>`;
    const slots = [0, 1, 2, 3].map(k => tids[k] ? card(tids[k], 'pp-slot', `data-act="${act}" data-id="${tids[k]}"`) : '<div class="pp-c pp-slot empty"><small>Empty</small></div>').join('');
    const foeCard = f => { const u = E[f]; return `<span class="pp-c foe ${K.BOSSES[f] ? 'boss' : ''}" style="--ec:${AFF_COL[u.aff]}" title="${esc(u.name)}">${por(f)}${essBadge(u.aff)}<span class="hx-lv">${lvl}</span></span>`; };
    // how the team's essences meet these foes: Strong / Weak hits, counted per hero against the phase's foes
    const edge = tids.map(id => { const hits = foes.map(f => K.hitType(C[id].aff, E[f].aff)); return [id, hits.filter(h => h === 'strong').length, hits.filter(h => h === 'weak').length]; });
    const strong = edge.filter(e => e[1] > e[2]).length, weak = edge.filter(e => e[2] > e[1]).length;
    const list = Object.keys(S.roster).filter(id => C[id] && !C[id].captured && fits(id)).sort((a, b) => (tids.includes(b) - tids.includes(a)) || power(statsOf(b)) - power(statsOf(a)));
    const roster = list.map(id => card(id, `${tids.includes(id) ? 'in' : ''} ${onExp(id) ? 'away' : ''}`, `data-act="${act}" data-id="${id}"`)).join('');
    return `<div class="pp">
      <div class="pp-top"><button type="button" class="btn small" data-act="ppback">‹ ${back}</button><h2>${title} <small>${sub}</small></h2></div>
      <div class="pp-field">
        <section class="pp-side me"><div class="pp-h">${teamSel}<span class="pp-pw">Power <b>${teamPower(tids).toLocaleString('en-US')}</b></span></div>
          <div class="pp-slots">${slots}</div>${rolesHtml(tids)}${warn}</section>
        <section class="pp-vs"><b class="pp-vsb">VS</b>
          <div class="pp-info"><span><small>Enemy level</small><b>${lvl}</b></span>${drops || `<span><small>Drops</small><span class="st-dic">${rars.map(r => `<img class="gt-ic rar-${r}" src="${GEAR_TILE[tile][Math.max(1, r)]}" alt="" title="${K.RARITIES[r]} gear">`).join('')}</span></span>`}<span><small>Energy</small><b>${energy}</b></span></div>
          <p class="pp-edge">${strong ? `<span class="good">${strong} ${strong === 1 ? 'hero hits' : 'heroes hit'} Strong</span>` : ''}${strong && weak ? ' · ' : ''}${weak ? `<span class="bad">${weak} ${weak === 1 ? 'hero hits' : 'heroes hit'} Weak</span>` : ''}${!strong && !weak ? 'No essence edge either way' : ''}</p></section>
        <section class="pp-side foe"><div class="pp-h">${ph.length > 1 ? `<div class="seg pp-ph" role="group" aria-label="Phase">${ph.map((p, k) => `<button type="button" class="${k === PREP.ph ? 'on' : ''}" data-act="ppph" data-n="${k}" aria-pressed="${k === PREP.ph}">Phase ${k + 1}${p.some(f => K.BOSSES[f]) ? ' · Boss' : ''}</button>`).join('')}</div>` : `<span class="pp-tn">${foes.length} ${foes.length === 1 ? 'foe' : 'foes'}</span>`}</div>
          <div class="pp-slots foes">${foes.map(foeCard).join('')}</div>
          <p class="pp-ess">${[...new Set(foes.map(f => E[f].aff))].map(e => `<b class="cv-ess" style="--c:${AFF_COL[e]}">${e}</b>`).join('')}</p></section>
      </div>
      <div class="pp-bottom"><div class="pp-roster">${roster}</div>
        <div class="pp-go">${auto}<button type="button" class="btn primary pp-fight" data-act="ppgo" ${tids.length ? '' : 'disabled'}>Fight${typeof energy === 'number' ? enCost(energy) : ''}</button></div></div>
    </div>`;
  }
  function startCampaign(i, rep) {
    const st = K.STAGES[i], diff = S.diff || 0, D = K.DIFFS[diff], lvl = K.diffLvl(st, diff);
    if (!spendEnergy(stEn(i, diff))) { render(); return; }
    useTeam('campaign');
    S.chap = st.chapter;
    runBattle({ type: 'stage', i, diff, hard: diff > 0, lvl, stage: st, foes: K.stagePhases(st, diff)[2], area: st.area, bg: chapterBg(st.chapter), rep, title: `${stageName(i)}${diff ? ' · ' + D.name : ''}${st.boss ? ' · ' + st.boss : ''}` });
  }
  function startDungeon(id, n, rep) {
    if (!bhLvlOpen(n)) { toast(`${bhLvlNeed(n)}.`, true); render(); return; }
    if (!spendEnergy(K.bossEnergy(n))) { render(); return; }
    const bi = K.BOSS_ORDER.indexOf(id), bo = K.BOSSES[id];
    useBossTeam(bo.aff);
    runBattle({ type: 'boss', id, bi, n, rep, lvl: K.bossLvl(bi, n), foes: K.bossFoes(id, n), phases: K.bossPhases(id, n), area: AREA_OF[bo.aff], bg: chapterBg(Math.floor(bi * K.CHAPTERS.length / K.BOSS_ORDER.length)), title: `${bo.name} · level ${n}` });
  }
  // enemies of phase p (0-based): campaign stages and Boss Hall levels both have K.PHASES phases
  const phaseUnits = (cfg, p) => cfg.type === 'siege' ? K.siegeUnits(cfg.from + p) : cfg.type === 'tower' ? K.towerUnits(cfg.ess, cfg.floor, cfg.ids.length) : cfg.stage ? K.stageUnits(cfg.stage, cfg.lvl, p, cfg.diff) : K.bossUnits(cfg.id, cfg.n, p);
  // phase cleared: the survivors walk off to the right, then everyone walks in for the next phase
  async function nextPhase(heroes, enemies, p) {
    const alive = heroes.filter(u => u.alive), hi = SPR.hires([...heroes, ...enemies].map(u => u.id), 1800); // everyone is placed anew below
    await showBanner(`Phase ${p} cleared`, 'Onward!', '', 700);
    if (TUT.on && p === 1) await coach(`<b>Phase 1 cleared!</b> Two more to go. Your heroes walk on with the HP they have left and recover 15%. Skills that were recharging are ready again.`, 'Continue');
    alive.forEach(u => (u._rs.walking = true));
    await tween(1100, k => { const e = k * k; alive.forEach(u => { u._rs.ox = e * 420; }); updateOverlay(); });
    K.phaseRest(heroes);
    forgetArt(await hi);
    setupRender(heroes, enemies);
    heroes.filter(u => !u.alive).forEach(u => (u._rs.gone = true));
    R.units.forEach(u => (u._rs.walking = true));
    await tween(900, k => { const e = ease(k); R.units.forEach(u => { u._rs.ox = (u.side === 'hero' ? -220 : 220) * (1 - e); }); updateOverlay(); });
    R.units.forEach(u => { u._rs.walking = false; u._rs.ox = 0; });
    updateOverlay();
  }
  async function runBattle(cfg) {
    SFX.unlock(); MUSIC.play(cfg.type === 'gboss' || cfg.type === 'boss' || (cfg.stage && cfg.stage.boss) ? 'boss' : 'battle');
    // Arena: both teams come from the server's snapshots and the dice from its seed (K.arenaSetup). A manual fight
    // (cfg.fight.manual) is played here by hand and its moves go to the server, which replays it (K.arenaReplay) and decides.
    // Guild boss: also a replay of the server's fight (K.gbossSetup), on auto, until the boss's turn cap.
    const gb = cfg.type === 'gboss', arena = cfg.type === 'arena' || gb, nPh = arena ? 1 : cfg.nPh || K.PHASES;
    let heroes, enemies;
    if (gb) ({ heroes, enemies } = K.gbossSetup(cfg.team, cfg.d, cfg.ess, cfg.seed));
    else if (arena) ({ heroes, enemies } = K.arenaSetup(cfg.att, cfg.def, cfg.seed));
    else { heroes = (cfg.ids || S.team).map(id => K.heroUnit(id, S.roster[id], itemsOf(id))); enemies = phaseUnits(cfg, 0); }
    $('#screen').hidden = true; $('#tabs').hidden = true; $('#battle').hidden = false; document.body.classList.add('in-battle');
    { const cb = $('#chatbtn'), ctl = $('#battle .b-ctl'); if (cb && ctl) ctl.appendChild(cb); } // the chat button joins the round controls
    $('#toast').hidden = true;
    const siege = cfg.type === 'siege';
    $('#b-title').textContent = cfg.title; $('#b-round').textContent = (siege ? `Wave ${cfg.from} · ` : nPh > 1 ? `Phase 1/${nPh} · ` : '') + 'Turn 1';
    $('#battle').classList.toggle('siege', siege); setFig(siege ? SIEGE_FIG : 1);
    $('#b-log').innerHTML = ''; $('#b-skills').innerHTML = ''; $('#b-hint').textContent = ' ';
    R.area = cfg.area; R.bg = cfg.bg;
    const narrow = window.innerWidth < 640 && !siege; // the Siege always shows its whole courtyard (ten enemies on the right)
    VIEW.x = narrow ? 60 : 0; VIEW.w = narrow ? 360 : 480;
    // the canvas is drawn at the screen's own resolution (RS device pixels per game pixel): pixel-art backgrounds stay
    // blocky (smoothing off), animated heroes are drawn smoothly from their finer frames
    RS = Math.max(1, Math.min(4, Math.ceil((cvs.getBoundingClientRect().width || VIEW.w * 2) * (window.devicePixelRatio || 1) / VIEW.w)));
    cvs.width = VIEW.w * RS; cvs.height = H * RS; g.imageSmoothingEnabled = false;
    $('.stage-wrap').style.aspectRatio = narrow ? '4 / 3' : '16 / 9';
    speeds = speedsFor(cfg);
    // Auto ×10 runs may go 8× (only those), and show which battle of the run this is
    if (cfg.rep) speeds = [...speeds, 8];
    $('#b-rep').hidden = !cfg.rep && !siege; if (cfg.rep) $('#b-rep').innerHTML = `Auto <b>${cfg.rep.k}</b> / ${cfg.rep.n}`;
    if (siege) sgChip(cfg, cfg.from);
    spd = speeds.filter(x => x <= (S.speed || 1)).pop();
    // auto battle is remembered: once switched on it stays on for every battle until the player turns it off
    let b = new K.Battle(heroes, enemies, hooks);
    // a manual arena fight starts by hand every time (auto can be switched on for that fight only); its moves go to the server
    const manualArena = cfg.type === 'arena' && cfg.fight && cfg.fight.manual;
    $('#b-skip').hidden = !(gb || (cfg.type === 'arena' && !manualArena)); // a replay of the server's fight can be skipped
    b.auto = manualArena ? false : arena || !!cfg.rep || (S.auto && autoOk());
    if (gb) { b.capUnit = enemies[0]; b.cap = K.GBOSS.turns; }
    B = { b, cfg, ph: 0, nPh, moves: [] }; paintVersion();
    // sharp battle art (sprites.js hires): wait a moment for this fight's characters; the later phases' enemies load meanwhile
    if (!arena) for (let p = 1; p < nPh; p++) for (const u of phaseUnits(cfg, p)) SPR.loadHi(u.id);
    // and the chapter's sharp background ('h<chapter>'); one that has not arrived in time leaves the chapter's old one
    const hiBg = /^h\d/.test(cfg.bg || '') ? preBg(+cfg.bg.slice(1)) : siege ? SPR.bgHi('hsiege', SIEGE_BG) : null;
    const [arts, bgOk] = await Promise.all([SPR.hires([...heroes, ...enemies].map(u => u.id), 2500), hiBg && Promise.race([hiBg, new Promise(r => setTimeout(r, 2500))])]);
    forgetArt(arts); if (hiBg && !bgOk) R.bg = siege ? 'c2' : 'c' + CHAPTER_BG_OF[+cfg.bg.slice(1)];
    setupRender(heroes, enemies);
    setAutoBtn(); setSpeedBtn();
    R.running = true; requestAnimationFrame(frame);
    window.scrollTo({ top: 0 });
    // intro: everyone walks in
    R.units.forEach(u => (u._rs.walking = true));
    await tween(800, k => { const e = ease(k); R.units.forEach(u => { u._rs.ox = (u.side === 'hero' ? -220 : 220) * (1 - e); }); updateOverlay(); });
    R.units.forEach(u => { u._rs.walking = false; u._rs.ox = 0; });
    updateOverlay();
    if (storyDue(cfg, 's')) await playScene(cfg.stage.chapter + 's'); // the story: the chapter begins
    bannerQ = Promise.resolve();
    await showBanner(cfg.title, gb ? `Guild boss · ${K.DIFFS[cfg.d].name} · deal as much damage as you can` : arena ? (manualArena ? 'Arena · you choose every move' : 'Arena · both teams fight on auto') : cfg.type === 'tower' ? `${twName(cfg.ess)} · one fight, ${enemies.length} enemies` : siege ? `Wave ${cfg.from} · hold the gate as long as you can` : `Phase 1 / ${K.PHASES} · The battle begins`, 'big', 800);
    // the very first battle: the coach explains the goal, phases and the turn order before the fight starts
    TUT.on = !arena && cfg.type === 'stage' && cfg.i === 0 && !cfg.diff && S.cleared < 0; TUT.turns = 0; coachHide();
    if (TUT.on) await coach(`<b>Your first battle!</b><ul><li><b>Goal:</b> defeat every enemy. A stage has <b>${K.PHASES} phases</b>: ${K.PHASES} fights in a row. Your heroes keep their HP between them and recover 15%.</li><li><b>Turn order:</b> the portraits at the top show who acts next. Faster units act more often.</li><li>Win to earn <b>gear, Sigils and XP</b> and to open the next stage.</li></ul>`, "Let's fight");
    log(arena ? 'The arena fight begins. Speed decides the turn order.' : nPh > 1 ? `The battle begins: ${K.PHASES} phases. Speed decides the turn order.` : 'The battle begins. Speed decides the turn order.');
    // phases: the same hero units fight on; damage stats add up over the phases
    const tot = { dmg: {}, crits: 0, maxHit: 0, turns: 0 }, meter = {};
    const addStats = x => { addMeter(meter, x.meter); for (const k in x.stats.dmg) tot.dmg[k] = (tot.dmg[k] || 0) + x.stats.dmg[k]; tot.crits += x.stats.crits; tot.maxHit = Math.max(tot.maxHit, x.stats.maxHit); tot.turns += x.turns; };
    let res;
    for (let p = 0; p < nPh; p++) {
      if (p && siege) {
        // the Siege: the team holds its ground and the next wave walks in from the right
        enemies = phaseUnits(cfg, p);
        await siegeNext(heroes, enemies, cfg.from + p);
        b = new K.Battle(heroes, enemies, hooks); b.auto = S.auto && autoOk();
        B.b = b; B.ph = p;
      } else if (p) {
        enemies = phaseUnits(cfg, p);
        await nextPhase(heroes, enemies, p);
        if (p === nPh - 1 && storyDue(cfg, 'b')) await playScene(cfg.stage.chapter + 'b'); // the story: the boss arrives
        b = new K.Battle(heroes, enemies, hooks); b.auto = !!cfg.rep || (S.auto && autoOk());
        B.b = b; B.ph = p;
        const boss = enemies.find(u => u.isBoss);
        await showBanner(boss ? boss.name : `Phase ${p + 1} / ${K.PHASES}`, boss ? `Boss fight · ${boss.aff} · ${boss.nPhases} boss phases` : `${enemies.length} enemies`, 'big', 800);
        log(`Phase ${p + 1} of ${K.PHASES}: ${enemies.length} ${enemies.length === 1 ? 'enemy' : 'enemies'}.`);
        if (boss) log(`${boss.name} · ${E[boss.id].passiveName}: ${E[boss.id].passiveDesc}`, 'enemy');
        if (boss && boss.blight) { log(`Blight Aura: every turn of ${boss.name} costs each of your heroes ${Math.round(boss.blight * 100)}% of their max HP. Bring healing.`, 'enemy'); queueBanner('Blight Aura', `Every turn of the boss drains your whole team. Heal or fall.`, 'big enemy', 1100); }
      }
      if (siege) for (const u of phaseUnits(cfg, p + 1 < nPh ? p + 1 : p)) SPR.loadHi(u.id); // the next wave's art, while this one fights
      res = await b.run();
      addStats(b);
      R.active = null; R.hl = new Set(); updateOverlay();
      if (siege) sgWave(cfg, b, cfg.from + p, res === 'win' && !b.aborted);
      if (res !== 'win' || b.aborted) break;
    }
    if (arena) K.setRng(null);
    b.stats = tot; b.turns = tot.turns; b.meterAll = meter;
    // arena: the server's result counts (the replay should always agree; warn if it ever does not)
    if (gb) { finishGboss(cfg, b); return; }
    if (siege) {
      const run = cfg.run, won = run.last >= K.SIEGE.waves;
      if (won) SFX.win(); else { SFX.lose(); R.dim = 0.4; }
      await showBanner(won ? 'The siege is over!' : b.aborted ? 'Retreated' : 'The gate has fallen', run.last >= cfg.from ? `Wave ${run.last} held · ${run.kills} enemies defeated` : 'Not one wave held', won ? 'big' : 'big lose', 1100);
      finishSiege(cfg, b); return;
    }
    if (manualArena) {
      // the server replays the fight with the recorded moves; only its result counts
      const r = await arenaCall('finish', { moves: B.moves });
      if (r.fight) { cfg.fight = { ...cfg.fight, ...r.fight }; cfg.win = r.fight.win; if (cfg.win !== (res === 'win' && !b.aborted)) console.warn('Arena replay differs from the server result', cfg.seed); }
      else { cfg.fight = { ...cfg.fight, win: false, delta: 0, rating: cfg.fight.before, error: r.error || 'The result could not be saved.' }; cfg.win = false; }
    } else if (arena && (res === 'win') !== cfg.win) console.warn('Arena replay differs from the server result', cfg.seed);
    const win = arena ? cfg.win : res === 'win' && !b.aborted;
    if (win) {
      SFX.win();
      const alive = heroes.filter(u => u.alive);
      for (let j = 0; j < 2; j++) await tween(300, k => alive.forEach(u => (u._rs.jump = 10 * Math.sin(k * Math.PI))));
      for (let i = 0; i < 40; i++) part(Math.random() * W, -4, (Math.random() - 0.5) * 0.6, 0.6 + Math.random(), ['#d9b45a', '#fff0b0', '#e8743b'][i % 3], 120, 2, 0.01);
      await showBanner('Victory!', cfg.title, 'big', 900);
    } else {
      SFX.lose(); R.dim = 0.4;
      await showBanner(b.aborted && !arena ? 'Surrendered' : 'Defeated', cfg.title, 'big lose', 900);
    }
    if (arena) finishArena(cfg); else finishBattle(win);
  }

  function grantXp(amount0, ids) {
    const ups = [], tide = evNow('tide');
    for (const id of ids || S.team) {
      const h = S.roster[id], cap = K.maxLvl(h.stars, id), amount = tide && C[id] && C[id].aff === tide.ess ? Math.round(amount0 * 1.5) : amount0; // the Essence Tide: +50% XP
      if (h.lvl >= cap) continue;
      const l0 = h.lvl; h.xp += amount;
      while (h.lvl < cap && h.xp >= K.xpNeed(h.lvl)) { h.xp -= K.xpNeed(h.lvl); h.lvl++; }
      if (h.lvl >= cap) h.xp = 0;
      if (h.lvl > l0) ups.push([id, h.lvl, h.lvl >= cap]);
    }
    return ups;
  }
  // returns one entry per level gained: [level, silver, shard, unlocked tab or null]
  // ---------- Tower of Essence (tab `tower`, K.TOWER): seven towers, one per essence, climbed one floor at a time with heroes
  // of that essence only. S.tw = { prog: { essence: highest floor cleared }, team: { essence: [ids] }, cur } ----------
  const twProg = e => (S.tw.prog[e] || 0);
  const twName = e => (e === 'All' ? 'Tower of Fate' : `Tower of ${e}`);
  const twFits = (id, e) => e === 'All' || C[id].aff === e || !!C[id].pc; // the own hero (Aether) is a joker in every tower
  const twChip = e => (e === 'All' ? '<span class="aff tw-all" title="Every essence">✦</span>' : affChip(e));
  // the tower's team: owned heroes of that essence that are not away on an expedition, at most 4
  function twTeam(e) { const t = (S.tw.team[e] || []).filter(id => S.roster[id] && twFits(id, e) && !onExp(id)).slice(0, 4); keepHero(t, heroId()); S.tw.team[e] = t; return t; }
  function startTower(e, f) {
    const ids = twTeam(e);
    if (!ids.length) { toast(`Pick heroes for the ${twName(e)} first.`, true); render(); return; }
    if (f !== twProg(e) + 1 || f > K.TOWER.floors) { render(); return; }
    runBattle({ type: 'tower', ess: e, floor: f, ids, nPh: 1, lvl: K.towerFloor(f).lvl, area: AREA_OF[e] ?? 1, bg: chapterBg(ESS_CH[e] ?? 9), title: `${twName(e)} · floor ${f}` });
  }
  function twRewards(rw, withXp) {
    return [sigils(rw.silver), ...(withXp ? [`${rw.xp.toLocaleString('en-US')} XP per hero`] : []), ...Object.entries(rw.fs).map(([t, n]) => `${shardIc(t)} ${n} ${esc(K.SHARD[t].name)}`), ...Object.entries(rw.st).map(([t, n]) => `${stoneIc(t)} ${n} ${stoneName(t, n)}`)];
  }
  // The Tower of Essence is laid out like the Campaign and the Boss Hall. First the seven towers under each other
  // (TV.view = 'towers'): its essence on its scene, who may climb, progress and the next big reward. Tapping one
  // (twsel) opens its floors (TV.view = 'floors'): on the left the tower, its team and the milestones ahead; on the
  // right a row per floor around the next one (enemy level, its foes, the first-clear reward, Fight on the next
  // floor); tapping a row shows the foes and the reward. Fight opens the team screen first (openTowerPrep).
  const TV = { view: 'towers', open: 0 };
  const twArt = e => chapterArt(ESS_CH[e] ?? 9); // the tower's scene: the chapter background it fights on
  const twCol = e => e === 'All' ? '#e3c06a' : AFF_COL[e];
  // a reward as small icon tiles (icon, amount, short label)
  const twTiles = (r, xp) => [[ic('coin'), r.silver.toLocaleString('en-US'), 'Sigils'], ...(xp ? [['<b class="tw-xp">XP</b>', r.xp.toLocaleString('en-US'), 'per hero']] : []),
    ...Object.entries(r.fs).map(([t, n]) => [shardIc(t), n, K.SHARD[t].name.replace(/ Fate Shard$/, '').replace(/^Fate Shard$/, 'Fate') + ' shard']),
    ...Object.entries(r.st).map(([t, n]) => [stoneIc(t), n, t[0].toUpperCase() + t.slice(1) + ' stone'])]
    .map(([i, n, l]) => `<span class="tw-tile" title="${esc(l)}"><span class="tw-ti">${i}</span><b>${n}</b><small>${esc(l)}</small></span>`).join('');
  // the shards and stones of a floor's reward as small icons (Sigils and XP come with every floor)
  const twBigIc = r => [...Object.entries(r.fs).map(([t, n]) => `<span title="${n} ${esc(K.SHARD[t].name)}">${shardIc(t)}${n > 1 ? `<i>${n}</i>` : ''}</span>`), ...Object.entries(r.st).map(([t, n]) => `<span title="${n} ${stoneName(t, n)}">${stoneIc(t)}${n > 1 ? `<i>${n}</i>` : ''}</span>`)].join('');
  const twNextBig = (from, k) => { const out = []; for (let f = from; f <= K.TOWER.floors && out.length < k; f++) { const r = K.towerReward(f); if (r.fs.greater || r.fs.ancient || r.fs.mythic || r.st.ancient) out.push([f, r]); } return out; };
  const twHead = back => `<div class="cv-head">${back}<span class="cv-emb" style="background-image:url(${MENU_ART.tower})" aria-hidden="true"></span><div class="cv-ht"><h2>Tower of Essence</h2><p>Climb floor by floor; every floor pays once and costs no energy.</p></div></div>`;
  function towerListHtml() {
    const rows = K.TOWERS.map(e => {
      const prog = twProg(e), team = twTeam(e), nb = twNextBig(prog + 1, 1)[0], col = twCol(e);
      return `<button type="button" class="cl-ch tl-ch ${prog >= K.TOWER.floors ? 'done' : ''}" data-act="twsel" data-e="${e}" style="--art:url(${twArt(e)});--c:${col}">
        <span class="cl-num tl-ess" style="color:${col}">${e === 'All' ? '✦' : essIcon(e)}</span>
        <span class="cl-t"><small>${e === 'All' ? 'Every hero · foes twice as strong' : `${e} heroes only`}</small><b class="cl-name">${twName(e)}${evTideOf(e) ? '<span class="ev-badge" style="--evc:#5fb4e8">Tide</span>' : ''}</b>
          <span class="cl-prog"><span class="tl-bar"><i style="width:${prog / K.TOWER.floors * 100}%"></i></span>${prog} / ${K.TOWER.floors}</span>
          <span class="cl-desc">${team.length ? `Team of ${team.length} · power ${teamPower(team).toLocaleString('en-US')}` : 'No team yet'}</span></span>
        <span class="cl-gear tl-next">${nb ? `<small>Next milestone: floor ${nb[0]}</small><span class="tw-msi">${twBigIc(nb[1])}</span>` : '<small>Every floor cleared</small>'}</span></button>`;
    }).join('');
    return `<div class="campaign cv cl twl">${twHead('')}
      <p class="cl-hint">Six towers of ${K.TOWER.floors} floors, one per essence, where only heroes of that essence may climb, and the Tower of Fate for every hero with far tougher foes. Your own hero may climb every tower.</p>
      <div class="cl-list">${rows}</div></div>`;
  }
  function towerHtml() {
    const e = K.TOWERS.includes(S.tw.cur) ? S.tw.cur : 'Ember';
    if (TV.view === 'towers') return towerListHtml();
    const prog = twProg(e), next = prog + 1, team = twTeam(e), col = twCol(e);
    const ms = twNextBig(next, 3).map(([f, r]) => `<li class="tw-ms"><span class="tw-msf">${f}</span><span class="tw-msi">${twBigIc(r)}</span><small>${f - prog} floors</small></li>`).join('');
    const side = `<aside class="sv-side tw-sidec">
      <div class="sv-ch" style="--art:url(${twArt(e)})"><small style="color:${col}">${e === 'All' ? 'Every hero' : `${e} heroes only`}</small><h3>${twName(e)}</h3><span class="tl-bar"><i style="width:${prog / K.TOWER.floors * 100}%"></i></span><small>${prog} / ${K.TOWER.floors} floors</small></div>
      <section class="sv-box sv-team"><h4>Your team</h4><div class="cv-heroes">${team.map(id => `<span class="cv-hero rar-${C[id].rar}">${por(id)}<span class="cv-hero-e">${affChip(C[id].aff)}</span><i>Lv ${S.roster[id].lvl}</i></span>`).join('') || '<p class="empty-note">No heroes picked yet.</p>'}</div>
        ${team.length && team.length < 4 ? `<p class="tw-warn">${team.length === 1 ? 'One hero' : `${team.length} heroes`}: foes ${Math.round((K.TOWER.solo[team.length - 1] - 1) * 100)}% stronger.</p>` : ''}
        <div class="sv-pw"><span>Power <b>${teamPower(team).toLocaleString('en-US')}</b></span><button class="btn small" data-act="twteam">Edit team</button></div></section>
      ${ms ? `<section class="sv-box"><h4>Milestones ahead</h4><ul class="tw-mss">${ms}</ul></section>` : ''}
      <section class="sv-box"><h4>The rules</h4><small class="sv-note">One fight per floor. Each floor pays once, on its first clear; a defeat costs nothing. ${e === 'All' ? 'Every hero may climb, but the foes are twice as strong.' : `Only ${e} heroes (and your own hero) may climb.`} A team of fewer than four meets tougher foes.</small></section></aside>`;
    // a row per floor: the last one cleared above the next, then the floors ahead
    const from = Math.max(1, next - 1), to = Math.min(K.TOWER.floors, from + 9), open = TV.open;
    const rows = Array.from({ length: to - from + 1 }, (_, k) => from + k).map(f => {
      const F = K.towerFloor(f), st = f <= prog ? 'cleared' : f === next ? 'next' : 'locked', foes = K.towerFoes(e, f), rw = K.towerReward(f), isOpen = f === open;
      const go = st === 'next' ? `<button class="btn primary" data-act="twgo" ${team.length ? '' : 'disabled title="Pick heroes first"'}>Fight</button>` : st === 'locked' ? `<button class="btn" disabled>${LOCK_SVG} Locked</button>` : '';
      return `<div class="sv-row ${st} ${F.boss ? 'boss' : ''} ${isOpen ? 'open' : ''}">
        <button type="button" class="sv-sel" data-act="twrow" data-n="${f}" aria-expanded="${isOpen}" aria-label="Floor ${f}: show its foes and reward"></button>
        <span class="tw-rfl">${f}</span>
        <span class="sv-t"><b>${F.boss ? 'Boss floor' : 'Floor'} ${f}</b><small>${st === 'cleared' ? '<span class="sv-ok">✓ Cleared</span>' : st === 'next' ? '<span class="sv-nx">Next battle</span>' : `${LOCK_SVG} Locked`} · Lv ${F.lvl}</small></span>
        <span class="sv-foes">${foes.map(x => `<span class="cv-foe ${K.BOSSES[x] ? 'boss' : ''}" title="${esc(E[x].name)}">${por(x)}</span>`).join('')}</span>
        <span class="sv-go"><span class="tw-msi tw-rw">${st === 'cleared' ? '' : twBigIc(rw)}</span>${go}</span>
        ${isOpen ? `<div class="sv-more"><div class="tw-foes">${foes.map(x => `<span class="tw-foe ${K.BOSSES[x] ? 'boss' : ''}" title="${esc(E[x].name)} · ${E[x].aff}">${por(x)}${affChip(E[x].aff)}<small>${esc(E[x].name)}</small></span>`).join('')}</div>
          ${st === 'cleared' ? '<p class="empty-note">Cleared: its reward is yours.</p>' : `<div class="tw-tiles">${twTiles(rw, true)}</div>`}</div>` : ''}</div>`;
    }).join('');
    return `<div class="campaign cv sv tws">
      ${twHead('<button type="button" class="btn small cl-back" data-act="twlist">‹ Towers</button>')}
      ${prog >= K.TOWER.floors ? `<p class="cl-hint">All ${K.TOWER.floors} floors of the ${twName(e)} are cleared. Few heroes ever stand here.</p>` : ''}
      <div class="sv-wrap lfit">${side}<div class="sv-list">${rows}</div></div></div>`;
  }
  // ---------- Events (tab `events`) ----------
  // A calendar that repeats every four weeks, read from the date alone (UTC days, weeks start on Monday), so nothing is
  // stored and every player sees the same events. Always on: the Essence Tide (one essence a week, round the seven
  // essences). Week 1 of the cycle: a Blood Moon over the Siege on the weekend. Week 2: a Boss Hunt all week (a different
  // Boss Hall boss each day) and a Shard Storm of Ancient Fate Shards on the weekend. Week 4: a Shard Storm of Mythic
  // Fate Shards on the weekend. Each event's effect lives where that mode pays out (grantXp, finishBattle, sgWave,
  // sgMs, doSummon); evNow(kind) answers whether it runs now.
  const evDay = (ms = Date.now()) => Math.floor(ms / 86400000);
  const evWeek = d => Math.floor((d + 3) / 7); // UTC day 4 (Monday 5 January 1970) starts week 1
  const EVENTS = {
    tide: { name: 'Essence Tide', col: '#5fb4e8', go: 'tower' },
    blood: { name: 'Blood Moon Siege', col: '#d8443a', go: 'siege', u: 'siege' },
    storm: { name: 'Shard Storm', col: '#9a7cf0', go: 'altaar', u: 'altaar' },
    hunt: { name: 'Boss Hunt', col: '#e8933a', go: 'kerkers', u: 'kerkers' },
  };
  const EV_SVG = {
    blood: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 1.5A6.5 6.5 0 1 0 14.5 11 5.5 5.5 0 0 1 10.5 1.5z"/></svg>',
    hunt: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7.2 1h1.6v2.1A5 5 0 0 1 12.9 7.2H15v1.6h-2.1A5 5 0 0 1 8.8 12.9V15H7.2v-2.1A5 5 0 0 1 3.1 8.8H1V7.2h2.1A5 5 0 0 1 7.2 3.1zM8 4.6A3.4 3.4 0 1 0 8 11.4 3.4 3.4 0 0 0 8 4.6zm0 2.2A1.2 1.2 0 1 1 8 9.2 1.2 1.2 0 0 1 8 6.8z"/></svg>',
  };
  // every event that runs on UTC day d, with its first day and the day after its last
  function evOnDay(d) {
    const w = evWeek(d), ws = 7 * w - 3, c = ((w % 4) + 4) % 4, dow = d - ws, out = [];
    out.push({ k: 'tide', ess: K.ESSENCES[((w % 7) + 7) % 7], from: ws, to: ws + 7 });
    if (c === 1 && dow >= 5) out.push({ k: 'blood', from: ws + 5, to: ws + 7 });
    if (c === 2) out.push({ k: 'hunt', boss: K.BOSS_ORDER[((d % 25) + 25) % 25], from: ws, to: ws + 7, day: d });
    if ((c === 2 || c === 0) && dow >= 5) out.push({ k: 'storm', shard: c === 2 ? 'ancient' : 'mythic', from: ws + 5, to: ws + 7 });
    return out;
  }
  const evNow = k => evOnDay(evDay()).find(e => e.k === k) || null;
  const evIc = e => e.k === 'tide' ? essIcon(e.ess) : e.k === 'storm' ? shardIc(e.shard) : EV_SVG[e.k];
  const evTitle = e => e.k === 'tide' ? `${e.ess} Tide` : e.k === 'storm' ? `Shard Storm · ${K.SHARD[e.shard].name.replace(/ Fate Shard$/, '')}` : EVENTS[e.k].name;
  function evText(e) {
    if (e.k === 'tide') return `${e.ess} heroes gain 50% more XP, ${e.ess} Elixirs drop twice${e.ess !== 'Aether' ? `, and the ${twName(e.ess)} pays double Sigils and XP on first clears` : ''}.`;
    if (e.k === 'blood') return 'A blood moon hangs over the Siege: tickets come back every hour instead of every two, and every kill pays double XP and Sigils.';
    if (e.k === 'storm') return `Every ${K.SHARD[e.shard].name} you summon counts double towards the Legendary pity.`;
    return `Today's hunted boss: ${K.BOSSES[e.boss].name}. Every Boss Hall win against it drops one more set piece and ${/^[AEIOU]/.test(K.BOSSES[e.boss].aff) ? 'an' : 'a'} ${K.BOSSES[e.boss].aff} Elixir. A new boss every day.`;
  }
  const evLeft = e => untilUtc(e.to * 86400000);
  const evChip = e => `<span class="ev-chip" style="--evc:${EVENTS[e.k].col}"><span class="ev-ic">${evIc(e)}</span>${esc(evTitle(e))}</span>`;
  // the line on Home: what runs now, tap for the events screen
  function evRibbon() {
    const now = evOnDay(evDay());
    return `<button type="button" class="ev-rib" data-act="go" data-go="events"><span class="ev-tag">Events</span><span class="ev-chips">${now.map(evChip).join('')}</span><span class="ev-go">›</span></button>`;
  }
  // a hint on the screen an event touches
  const evHint = (e, extra) => e ? `<div class="ev-hint" style="--evc:${EVENTS[e.k].col}"><span class="ev-ic">${evIc(e)}</span><span><b>${esc(evTitle(e))}</b> · ${esc(extra || evText(e))} <small>(${evLeft(e)} left)</small></span></div>` : '';
  const evHunted = id => { const e = evNow('hunt'); return !!e && e.boss === id; };
  const evTideOf = aff => { const e = evNow('tide'); return !!e && e.ess === aff; };
  // ---------- Admin (0016_admin.sql): player numbers, only for accounts in the admins table ----------
  // admin_check says whether this account may see them (then the ☰ menu has an Admin item); admin_stats returns them
  const ADM = { ok: false, who: '', data: null, err: '', busy: false, view: 'stats', ch: null, chF: 'review', open: '', watch: null, ws: 'gems', rev: 0 };
  async function admCheck() {
    const cl = cloud(); if (!cl || !cl.signedIn()) { ADM.ok = false; return; }
    // asked again on every social refresh until it says yes (so running 0016 later needs no reload), once per account after that
    const who = cl.info().email; if (ADM.who !== who) { ADM.who = who; ADM.ok = false; } if (ADM.ok) return;
    try { ADM.ok = !!(await cl.rpc('admin_check')); } catch (e) { ADM.ok = false; }
    if (ADM.ok && document.querySelector('.mmenu:not([hidden])')) setMenu(true);
  }
  async function admLoad() {
    if (ADM.busy) return; ADM.busy = true; ADM.err = '';
    try { ADM.data = await cloud().rpc('admin_stats'); ADM.at = Date.now(); } catch (e) { ADM.err = String(e && e.message || e); }
    try { ADM.lb = await cloud().rpc('admin_lb_list'); } catch (e) { ADM.lb = null; } // no 0017 yet: no list
    await admChLoad();
    ADM.busy = false; if (tab === 'admin') render();
  }
  // the cheat watch (0019): every flagged or reviewed account, and the richest accounts to compare by hand
  async function admChLoad() {
    try { ADM.ch = await cloud().rpc('admin_cheaters'); } catch (e) { ADM.ch = null; } // no 0019 yet: the old list
    try { ADM.watch = await cloud().rpc('admin_watch', { sort: ADM.ws }); } catch (e) { ADM.watch = null; }
    ADM.rev = (ADM.ch || []).filter(admToReview).length;
  }
  const admToReview = r => !r.state || r.again;
  const admAgo = t => { if (!t) return '-'; const m = Math.max(0, (Date.now() - new Date(t)) / 60000); return m < 1 ? 'just now' : m < 60 ? Math.round(m) + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
  const admN = v => { v = +v || 0; return v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? Math.round(v / 1e3) + 'k' : v.toLocaleString('en-US'); };
  function admChCard(r) {
    const x = r.stats || {}, open = ADM.open === r.user_id, log = r.log || [];
    const num = (l, v, w) => `<span class="adm-num${w ? ' w' : ''}"><small>${l}</small><b>${v}</b></span>`;
    const pill = r.again ? '<span class="adm-pill bad">Flagged again after you allowed it</span>' : r.state === 'hidden' ? '<span class="adm-pill off">Hidden by you</span>' : r.state === 'allowed' ? '<span class="adm-pill ok">Allowed by you</span>' : '<span class="adm-pill bad">Suspected · off the leaderboards</span>';
    const when = t => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const btns = (r.state !== 'hidden' || r.again ? `<button class="btn small danger" data-act="admlb" data-uid="${r.user_id}" data-s="hidden">Hide from the boards</button>` : '')
      + (r.state !== 'allowed' || r.again ? `<button class="btn small" data-act="admlb" data-uid="${r.user_id}" data-s="allowed">Allow (false alarm)</button>` : '')
      + (r.state || r.n ? `<button class="btn small" data-act="admlb" data-uid="${r.user_id}" data-s="">Clear</button>` : '')
      + `<button class="btn small" data-act="admchopen" data-uid="${r.user_id}">${open ? 'Hide history' : `History (${log.length})`}</button>`;
    return `<li class="adm-cc ${r.again ? 'again' : r.state || 'flag'}">
      <div class="adm-cc-h"><span><b>${esc(r.name || 'Player')}</b> <small>Lv ${x.lvl || 1}${x.prestige ? ` · Prestige ${x.prestige}` : ''}</small></span>${pill}</div>
      <div class="adm-cc-who">${esc(r.email || '')} · id ${esc(String(r.user_id).slice(0, 8))} · joined ${admAgo(r.joined)} · last played ${admAgo(r.played)}</div>
      <div class="adm-cc-when">${r.n ? `Flagged <b>${r.n}×</b> · first ${admAgo(r.first)} · last ${admAgo(r.last)}` : 'Left out by the leaderboard checks'}${r.reviewed ? ` · you decided ${admAgo(r.reviewed)}` : ''}</div>
      <ul class="adm-why">${(r.reasons || []).map(w => `<li>${esc(w)}</li>`).join('') || '<li>No reason kept</li>'}</ul>
      <div class="adm-nums">${num('Crystals', admN(x.gems), 1)}${num('Sigils', admN(x.silver), 1)}${num('Legendaries', x.legend || 0, 1)}${num('Mythic shards', x.mythic || 0, 1)}${num('Ancient shards', x.ancient || 0)}${num('Heroes', x.heroes || 0)}${num('Gear', x.gear || 0)}${num('Battles won', admN(x.won))}${num('Progress', x.progress || 0)}${r.rating != null ? num('Arena', r.rating) : ''}</div>
      ${open ? `<div class="adm-log"><b>Every flagged upload (newest first)</b>${log.map(l => `<div><small>${when(l.at)}</small> ${esc((l.reasons || []).join(' · '))}</div>`).join('') || '<div><small>No history yet (flagged before 0019).</small></div>'}</div>` : ''}
      <div class="adm-cc-b">${btns}</div></li>`;
  }
  function admWatchHtml() {
    const w = ADM.watch; if (w == null) return '';
    const sorts = [['gems', 'Crystals'], ['silver', 'Sigils'], ['legend', 'Legendaries'], ['mythic', 'Mythic shards'], ['won', 'Battles won'], ['lvl', 'Level'], ['progress', 'Progress']];
    const row = (r, i) => { const x = r.stats || {}; return `<tr class="${r.flagged ? 'flag' : ''}${r.state === 'hidden' ? ' hid' : ''}"><td>${i + 1}</td><td><b>${esc(r.name || 'Player')}</b>${r.flagged ? ' <span class="adm-dot" title="Flagged by the checks">●</span>' : ''}<small>${esc(r.email || '')}</small></td><td>${x.lvl || 1}</td><td>${admN(x.gems)}</td><td>${admN(x.silver)}</td><td>${x.legend || 0}</td><td>${x.mythic || 0}</td><td>${admN(x.won)}</td><td>${x.progress || 0}</td><td>${admAgo(r.played)}</td><td>${r.state === 'hidden' ? '<small>Hidden</small>' : `<button class="btn small danger" data-act="admlb" data-uid="${r.user_id}" data-s="hidden">Hide</button>`}</td></tr>`; };
    return `<section class="adm-sec adm-watch"><h3>Watch list: the top 25 of the last 30 days</h3><p class="empty-note">A careful cheater stays under every limit but still stands out here: lots of Crystals, Legendaries or progress with few battles won. A red dot is already flagged. Sort by:</p>
      <div class="adm-fs">${sorts.map(([k, l]) => `<button type="button" class="adm-f${ADM.ws === k ? ' on' : ''}" data-act="admws" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="adm-tw"><table class="adm-tbl"><thead><tr><th>#</th><th>Player</th><th>Lv</th><th>Crystals</th><th>Sigils</th><th>Legend.</th><th>Mythic</th><th>Won</th><th>Progress</th><th>Played</th><th></th></tr></thead><tbody>${w.map(row).join('') || '<tr><td colspan="11">No players yet.</td></tr>'}</tbody></table></div></section>`;
  }
  function admChHtml() {
    const all = ADM.ch || [], ok = r => r.state === 'allowed' && !r.again;
    const cnt = { review: all.filter(admToReview).length, hidden: all.filter(r => r.state === 'hidden').length, allowed: all.filter(ok).length, all: all.length };
    const list = all.filter(r => ADM.chF === 'all' ? true : ADM.chF === 'review' ? admToReview(r) : ADM.chF === 'hidden' ? r.state === 'hidden' : ok(r));
    const chip = (k, l) => `<button type="button" class="adm-f ${k}${ADM.chF === k ? ' on' : ''}" data-act="admchf" data-k="${k}">${l} <b>${cnt[k]}</b></button>`;
    return `<section class="adm-sec adm-ch"><h3>Cheaters</h3><p class="empty-note adm-help">Flagged by the server's save check and kept off every leaderboard. <b>Hide</b>: off for good · <b>Allow</b>: a false alarm, back on · <b>Clear</b>: forget the flag. Saves are never changed.</p>
      <div class="adm-fs">${chip('review', 'To review')}${chip('hidden', 'Hidden')}${chip('allowed', 'Allowed')}${chip('all', 'All')}</div>
      ${list.length ? `<ul class="adm-ccl">${list.map(admChCard).join('')}</ul>` : `<p class="adm-none">${ADM.chF === 'review' ? 'Nobody to review: no cheater found. 👍' : 'Nobody here.'}</p>`}</section>${admWatchHtml()}`;
  }
  // the leaderboard checks (0017): accounts whose save cannot be real are left out; the owner hides or allows by hand
  function admLbHtml() {
    if (ADM.lb == null) return `<section class="adm-sec adm-lb"><h3>Leaderboard checks</h3><p class="empty-note">Run 0017_leaderboard_checks.sql to see flagged accounts here.</p></section>`;
    const st = { hidden: 'Hidden by you', allowed: 'Allowed by you' };
    const rows = ADM.lb.map(r => `<li class="${r.state || 'flag'}"><span><b>${esc(r.name || 'Player')}</b> <small>Lv ${r.lvl || 1} · ${esc(String(r.user_id).slice(0, 8))}</small><em>${esc(r.reason || 'No problem found')}</em></span>
      <span class="adm-lbs">${r.state ? `<i>${st[r.state]}</i>` : '<i class="off">Left out automatically</i>'}${r.state !== 'hidden' ? `<button class="btn small danger" data-act="admlb" data-uid="${r.user_id}" data-s="hidden">Hide</button>` : ''}${r.state !== 'allowed' ? `<button class="btn small" data-act="admlb" data-uid="${r.user_id}" data-s="allowed">Allow</button>` : ''}${r.state ? `<button class="btn small" data-act="admlb" data-uid="${r.user_id}" data-s="">Clear</button>` : ''}</span></li>`).join('');
    return `<section class="adm-sec adm-lb"><h3>Leaderboard checks</h3><p class="empty-note">Every cloud save is checked by the server (0018): impossible heroes, gear or amounts, and impossible jumps between two uploads (Crystals, shards, stones, progress) flag the account; flagged accounts and saves with more progress than battles won stay off every leaderboard. Hide keeps an account off every board for good; Allow keeps a false alarm on; Clear forgets the flag (a new bad upload flags it again).</p>${rows ? `<ul class="adm-lbl">${rows}</ul>` : '<p class="empty-note">No account flagged. 👍</p>'}</section>`;
  }
  async function admLbSet(uid, s) {
    try { await cloud().rpc('admin_lb_set', { uid, state: s || null }); ADM.lb = await cloud().rpc('admin_lb_list'); await admChLoad(); toast(s === 'hidden' ? 'Hidden from the leaderboards.' : s === 'allowed' ? 'Allowed on the leaderboards.' : 'Back to the automatic checks.'); }
    catch (e) { toast('Could not change it: ' + (e && e.message || e), true); }
    if (tab === 'admin') render();
  }
  function adminHtml() {
    if (!ADM.ok) return '<p class="empty-note">Only for the owner.</p>';
    if (!ADM.data && !ADM.err) { setTimeout(admLoad, 0); return '<div class="adm"><div class="section-head"><div><h2>Admin</h2></div></div><p class="empty-note">Loading the numbers…</p></div>'; }
    if (ADM.err) return `<div class="adm"><div class="section-head"><div><h2>Admin</h2></div></div><p class="empty-note">Could not load: ${esc(ADM.err)}</p><button class="btn small" data-act="admload">Try again</button></div>`;
    const x = ADM.data, n = v => (+v || 0).toLocaleString('en-US');
    const tile = (v, l, s) => `<div class="adm-t"><b>${n(v)}</b><span>${l}</span>${s ? `<small>${s}</small>` : ''}</div>`;
    const bars = (rows, k, col) => { const max = Math.max(1, ...rows.map(r => +r[k] || 0)); return `<div class="adm-bars" style="--bc:${col}">${rows.map(r => `<div class="adm-b" title="${esc(r.d)}: ${n(r[k])}"><i style="height:${Math.round((+r[k] || 0) / max * 100)}%"></i><em>${n(r[k])}</em><small>${esc(r.d.split(' ')[0])}</small></div>`).join('')}</div>`; };
    const days = x.days || [], lv = x.levels || [], lmax = Math.max(1, ...lv.map(r => r.n));
    const tabs = ADM.ch == null ? '' : `<div class="adm-tabs"><button type="button" class="${ADM.view === 'stats' ? 'on' : ''}" data-act="admview" data-v="stats">Players</button><button type="button" class="${ADM.view === 'cheat' ? 'on' : ''}" data-act="admview" data-v="cheat">Cheaters${ADM.rev ? ` <b class="adm-badge">${ADM.rev}</b>` : ''}</button></div>`;
    const head = `<div class="section-head"><div><h2>Admin</h2><p class="lede">Accounts only: guests play in their browser and are not counted. Updated ${new Date(ADM.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.</p></div><button class="btn small" data-act="admload">Refresh</button></div>${tabs}`;
    if (ADM.ch != null && ADM.view === 'cheat') return `<div class="adm">${head}${admChHtml()}</div>`;
    return `<div class="adm">${head}
      ${ADM.rev ? `<button type="button" class="adm-alert" data-act="admview" data-v="cheat">⚠ ${ADM.rev} suspected cheater${ADM.rev > 1 ? 's' : ''} to review ›</button>` : ''}
      <div class="adm-tiles">${tile(x.active24h, 'Active today', 'last 24 hours')}${tile(x.active7d, 'Active this week', 'last 7 days')}${tile(x.active30d, 'Active this month', 'last 30 days')}${tile(x.accounts, 'Accounts', `${n(x.new24h)} new today · ${n(x.new7d)} this week`)}
        ${tile(x.arenaWeek, 'In the arena', `this week · ${n(x.arenaFights24h)} fights today`)}${tile(x.chatters7d, 'Chatting', `last 7 days · ${n(x.messages24h)} messages today`)}${tile(x.guilds, 'Guilds', `${n(x.guildMembers)} members`)}${tile(x.bought, 'Bought Crystals', 'in wallets')}</div>
      <div class="adm-cols"><section class="adm-sec"><h3>Active players per day</h3>${bars(days, 'active', '#e9c46f')}<p class="empty-note">A player counts on a day a save of theirs was written (approximate for very busy players).</p></section>
        <section class="adm-sec"><h3>New accounts per day</h3>${bars(days, 'new', '#5fb4e8')}</section>
        <section class="adm-sec"><h3>Player levels</h3><p class="empty-note">Active in the last 30 days.</p><div class="adm-lv">${lv.map(r => `<div><span>Lv ${r.band || 1}${r.band >= 100 ? '' : `-${r.band + 9}`}</span><i style="width:${Math.round(r.n / lmax * 100)}%"></i><b>${n(r.n)}</b></div>`).join('') || '<p class="empty-note">No players yet.</p>'}</div></section></div>
      ${ADM.ch == null ? admLbHtml() : ''}</div>`;
  }
  // a tap on an event in the calendar: what it is, when it runs and whether it runs now, in a popup
  const evDate = d => { const x = new Date(d * 86400000); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x.getUTCDay()]} ${x.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x.getUTCMonth()]}`; };
  function evPop(d, k) {
    const e = evOnDay(d).find(x => x.k === k); if (!e) return;
    const E0 = EVENTS[k], d0 = evDay(), one = k === 'hunt' ? { from: d, to: d + 1 } : e, now = d0 >= one.from && d0 < one.to;
    const when = one.to - one.from === 1 ? evDate(one.from) : `${evDate(one.from)} to ${evDate(one.to - 1)}`;
    const state = now ? `Running now · ${k === 'hunt' ? untilUtc((d0 + 1) * 86400000) : evLeft(e)} left` : d0 < one.from ? `Starts in ${untilUtc(one.from * 86400000)}` : 'Over';
    const text = k === 'hunt' && d !== d0 ? `The hunted boss on ${evDate(d)}: ${K.BOSSES[e.boss].name}. Every Boss Hall win against it drops one more set piece and ${/^[AEIOU]/.test(K.BOSSES[e.boss].aff) ? 'an' : 'a'} ${K.BOSSES[e.boss].aff} Elixir. A new boss every day of the Boss Hunt week.` : evText(e);
    const locked = E0.u && !unlocked(E0.u);
    const el = document.createElement('div');
    el.className = 'unlock-pop ev-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', evTitle(e)); el.style.setProperty('--evc', E0.col);
    el.innerHTML = `<div class="unlock-card"><span class="ev-pic">${evIc(e)}</span><span class="tag">${esc(E0.name)}</span><h2>${esc(k === 'hunt' ? K.BOSSES[e.boss].name : evTitle(e))}</h2>
      <span class="ev-when">${esc(when)} · <b>${esc(state)}</b></span><p>${esc(text)}</p>${locked ? `<span class="ev-lock">${LOCK_SVG} Opens after ${needTxt(E0.u)}</span>` : ''}
      <div class="ev-pbtn">${now && !locked ? `<button class="btn primary" type="button" data-go="${k === 'tide' && !unlocked('tower') ? 'team' : E0.go}">Go ›</button>` : ''}<button class="btn" type="button">Close</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', ev => { const b = ev.target.closest('button'); if (ev.target === el || b) { el.remove(); if (b && b.dataset.go) setTab(b.dataset.go); } });
  }
  function eventsHtml() {
    const d0 = evDay(), now = evOnDay(d0);
    const cards = now.map(e => { const E0 = EVENTS[e.k], locked = E0.u && !unlocked(E0.u);
      return `<article class="ev-card" style="--evc:${E0.col}"><header><span class="ev-ic">${evIc(e)}</span><div><h3>${esc(evTitle(e))}</h3><span class="ev-left">${evLeft(e)} left</span></div></header>
        <p>${esc(evText(e))}</p>${locked ? `<span class="ev-lock">${LOCK_SVG} Opens after ${needTxt(E0.u)}</span>` : `<button type="button" class="btn small primary" data-act="go" data-go="${e.k === 'tide' && !unlocked('tower') ? 'team' : E0.go}">Go ›</button>`}</article>`; }).join('');
    // the calendar: this week and the three after it, a row per week (its Essence Tide on the left), a cell per day
    const w0 = evWeek(d0), days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let cal = `<span></span>${days.map(x => `<span class="ev-h">${x}</span>`).join('')}`;
    for (let w = w0; w < w0 + 4; w++) {
      const ws = 7 * w - 3, tide = evOnDay(ws)[0];
      cal += `<button type="button" class="ev-wk" data-act="evpop" data-d="${ws}" data-k="tide" title="${esc(evTitle(tide))}">${essIcon(tide.ess)}${tide.ess}</button>`;
      for (let d = ws; d < ws + 7; d++) {
        const evs = evOnDay(d).filter(e => e.k !== 'tide'), date = new Date(d * 86400000);
        cal += `<span class="ev-day ${d < d0 ? 'past' : d === d0 ? 'today' : ''}"><b>${date.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()]}</b>${evs.map(e => `<button type="button" class="ev-mini" style="--evc:${EVENTS[e.k].col}" data-act="evpop" data-d="${d}" data-k="${e.k}" title="${esc(evTitle(e))}">${esc(e.k === 'hunt' ? K.BOSSES[e.boss].name : e.k === 'storm' ? K.SHARD[e.shard].name.replace(/ Fate Shard$/, '') + ' Storm' : 'Blood Moon')}</button>`).join('')}</span>`;
      }
    }
    return `<div class="evs"><div class="section-head"><div><h2>Events</h2><p class="lede">Every week brings its own events. They follow a four-week cycle, so they keep coming back.</p></div></div>
      <section><h3>Happening now</h3><div class="ev-now">${cards}</div></section>
      <section><h3>Calendar</h3><div class="ev-cal">${cal}</div><p class="empty-note">Days follow UTC: an event starts and ends at 00:00 UTC.</p></section></div>`;
  }

  // ---------- The story (story.js STORY_TEXT) ----------
  // Twenty scenes: one at the start of every chapter (before its first battle) and one at its boss (when the boss walks
  // onto the field in the boss stage's last phase). Each plays once, the first time a player gets there on Easy
  // (S.story[key] = seen, key = chapter index + 's' or 'b'); every scene of a chapter reached can be read again from its
  // Story buttons on the stage view. STORY: key -> [[speaker, text], ...], read from the text in story.js.
  const STORY = (() => {
    const o = {}; let cur = null;
    if (typeof STORY_TEXT === 'undefined') return o;
    for (const raw of STORY_TEXT.split('\n')) {
      const l = raw.trim(); if (!l) continue;
      const h = l.match(/^#+\s*CHAPTER\s+(\d+)\s*\S*\s*(START|BOSS)/i);
      if (h) { cur = o[(+h[1] - 1) + (h[2].toUpperCase() === 'START' ? 's' : 'b')] = []; continue; }
      const m = l.match(/^([^:]{1,40}):\s*(.+)$/); if (cur && m) cur.push([m[1].trim(), m[2].trim()]);
    }
    return o;
  })();
  // a speaker's name -> its id (heroes and bosses), so the scene can show their picture
  let storyIds = null;
  const storyId = n => {
    if (!storyIds) { storyIds = {}; for (const id in K.CHAMPS) storyIds[K.CHAMPS[id].name.toLowerCase()] = id; for (const id in K.BOSSES) storyIds[K.BOSSES[id].name.toLowerCase()] = id; }
    return storyIds[n.toLowerCase()] || null;
  };
  const heroId0 = () => (S.hero && S.roster[S.hero.id] ? S.hero.id : avatarId());
  // a speaker's picture cut to the figure itself (the pictures have empty room around them), made once per character
  const STORY_PIC = {};
  function storyPic(id) {
    return STORY_PIC[id] || (STORY_PIC[id] = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
          let x0 = c.width, x1 = -1, y0 = c.height, y1 = -1;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          if (x1 < 0) { res(im.src); return; }
          const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
          o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); res(o.toDataURL('image/webp', 0.92));
        } catch (e) { res(im.src); }
      };
      im.onerror = () => res(''); im.src = bossBig(id);
    }));
  }
  // a scene can be read again once its stage was reached on any difficulty
  const storyOpen = k => { const c = parseInt(k, 10), i = c * 7 + (k.endsWith('b') ? 6 : 0); return !!STORY[k] && (!!S.story[k] || K.DIFFS.some((x, d) => i <= clearedOn(d) + 1)); };
  // plays a scene; resolves when it is done or skipped. In a battle it lies over the field (the battle waits), elsewhere
  // over the chapter's art
  function playScene(k) {
    let lines = STORY[k]; if (!lines || !lines.length) return Promise.resolve();
    S.story[k] = 1; save();
    const c = parseInt(k, 10), inBattle = B && !$('#battle').hidden, host = inBattle ? $('#battle .stage-wrap') || $('#battle') : document.body;
    const heroName = (S.hero && S.hero.name) || S.p.name, heroId = heroId0();
    // the player's own team tells the story: every companion who speaks (anyone but the hero, a boss or the narrator) is
    // played by a hero of the team, the first one to speak by the first team member and so on (round the team when more
    // speak than it has); in a battle the heroes still standing, else the campaign team. A team of the hero alone keeps
    // the written companions. Their names in the lines change along.
    const team = (inBattle ? B.b.heroes.filter(u => u.alive).map(u => u.id) : teamIds('campaign')).filter(id => id !== heroId && C[id] && !C[id].pc);
    const cast = {}; let ci = 0;
    if (team.length) for (const [who] of lines) {
      if (/^(hero|narrator)$/i.test(who) || cast[who]) continue;
      const id = storyId(who); if (id && K.BOSSES[id] && !K.CHAMPS[id]) continue;
      cast[who] = C[team[ci++ % team.length]].name;
    }
    const recast = s => Object.keys(cast).reduce((x, w) => x.split(w).join(cast[w]), s);
    lines = lines.map(([who, said]) => [cast[who] || who, recast(said)]);
    const el = document.createElement('div');
    el.className = 'story' + (inBattle ? '' : ' page'); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `Chapter ${ROMAN[c]} story`);
    el.innerHTML = `${inBattle ? '' : `<div class="sc-bg" style="--art:url(${chapterArt(c)})"></div>`}<img class="sc-fig sc-l" alt=""><img class="sc-fig sc-r" alt="">
      <span class="sc-ch">Chapter ${ROMAN[c]} · ${esc(K.CHAPTERS[c].name)}</span><button type="button" class="sc-skip">Skip ›</button>
      <div class="sc-box"><b class="sc-name"></b><p class="sc-text"></p><span class="sc-next" aria-hidden="true">▼</span></div>`;
    host.appendChild(el); if (inBattle) $('#battle').classList.add('in-story');
    const L = el.querySelector('.sc-l'), Rr = el.querySelector('.sc-r'), nm = el.querySelector('.sc-name'), tx = el.querySelector('.sc-text');
    let i = -1, typing = 0, full = '';
    for (const [who] of lines) { const id = /^hero$/i.test(who) ? heroId : storyId(who); if (id) storyPic(id); }
    return new Promise(done => {
      const finish = () => { clearInterval(typing); document.removeEventListener('keydown', key, true); el.remove(); $('#battle').classList.remove('in-story'); done(); };
      const show = () => {
        i++; if (i >= lines.length) { finish(); return; }
        const [who, said] = lines[i], hero = /^hero$/i.test(who), narr = /^narrator$/i.test(who), id = hero ? heroId : narr ? null : storyId(who);
        const boss = id && K.BOSSES[id] && !K.CHAMPS[id];
        if (id) { const img = boss ? Rr : L, at = i; storyPic(id).then(u => { if (u && i === at) { img.src = u; img.classList.add('on'); } }); }
        L.classList.toggle('talk', !!id && !boss); Rr.classList.toggle('talk', !!boss);
        el.classList.toggle('narr', narr);
        nm.textContent = narr ? '' : hero ? heroName : who;
        full = said.replace(/\{name\}/g, heroName);
        // the line appears letter by letter; a tap shows it whole, the next tap moves on
        let n = 0; tx.textContent = ''; clearInterval(typing);
        typing = setInterval(() => { n += 2; tx.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = 0; } }, 18);
      };
      const next = () => { if (typing) { clearInterval(typing); typing = 0; tx.textContent = full; } else show(); };
      function key(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); next(); } }
      el.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('.sc-skip')) finish(); else next(); });
      document.addEventListener('keydown', key, true);
      show();
    });
  }
  // the scene a campaign battle opens with (the chapter's start), or shows when its boss arrives
  // a scene plays the first time a player gets there on any difficulty, and only if they never saw it (so players who
  // finished Easy before the story existed meet it on Normal and up, and nobody sees a scene play twice)
  const storyDue = (cfg, part) => cfg.type === 'stage' && !cfg.rep && cfg.i > clearedOn(cfg.diff) && cfg.stage.n === (part === 's' ? 0 : 6) && STORY[cfg.stage.chapter + part] && !S.story[cfg.stage.chapter + part];

  // ---------- The Siege (tab `siege`, engine K.SIEGE): an endless defence. The team holds its gate while waves of
  // enemies walk at it (more of them and stronger every wave) until it falls. Every kill pays hero XP and Sigils at
  // once (siegeKill), the first clear of every 25th wave pays a checkpoint reward (siegeReward), and a run may start
  // just after a checkpoint SIEGE.back waves below the best. A run costs a Siege ticket: one comes back every
  // SIEGE.ticketMin minutes, at most SIEGE.tickets (S.sgT, S.sgAt: like energy, filled lazily by sgTick).
  // S.sg = { best, runs, kills }. The battle draws every figure smaller (SIEGE_FIG) on its own deep courtyard. ----------
  const SIEGE_BG = 'backgrounds/siege.webp', SGV = { open: 0 };
  const sgMs = () => (evNow('blood') ? 60 : K.SIEGE.ticketMin) * 60000; // a Blood Moon brings a ticket every hour
  function sgTick() {
    const now = Date.now(), max = K.SIEGE.tickets;
    if (S.sgT == null || !S.sgAt) { S.sgT = S.sgT ?? max; S.sgAt = now; }
    if (S.sgT >= max) { S.sgAt = now; return; }
    const ms = sgMs(), n = Math.floor((now - S.sgAt) / ms); if (n <= 0) return;
    S.sgT = Math.min(max, S.sgT + n); S.sgAt = S.sgT >= max ? now : S.sgAt + n * ms;
  }
  const sgFull = () => { sgTick(); return S.sgT >= K.SIEGE.tickets; };
  // where a run may start: wave 1, or just after a checkpoint at least SIEGE.back waves below the best checkpoint reached
  const sgStarts = () => { const top = Math.floor(S.sg.best / K.SIEGE.cp) * K.SIEGE.cp - K.SIEGE.back, out = [1]; for (let w = K.SIEGE.cp; w <= top; w += K.SIEGE.cp) out.push(w + 1); return out; };
  const GATE_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 15V4.5h2V2.5h2v2h1.2v-2h2.6v2h1.2v-2h2v2h2V15H10v-3.6a2 2 0 0 0-4 0V15z"/></svg>';
  const TICKET_SVG = '<svg class="sg-tk" viewBox="0 0 20 14" aria-hidden="true"><path d="M2 1h16v4a2 2 0 0 0 0 4v4H2V9a2 2 0 0 0 0-4z"/><path d="M7 3.5v7" stroke-dasharray="1.4 1.2"/></svg>';
  function startSiege(from) {
    sgTick();
    const ids = teamIds('siege').filter(id => S.roster[id] && !onExp(id));
    if (!unlocked('siege')) { render(); return; }
    if (!ids.length) { toast('Pick a team for the Siege first.', true); render(); return; }
    if (!sgStarts().includes(from)) { render(); return; }
    if (S.sgT < 1) { toast(`No Siege tickets left. The next one comes in ${fmtLeft(S.sgAt + sgMs() - Date.now())}.`, true); render(); return; }
    S.sgT--; useTeam('siege'); save();
    runBattle({ type: 'siege', moon: !!evNow('blood'), from, ids, nPh: K.SIEGE.waves - from + 1, lvl: K.siegeWave(from).lvl, area: 4, bg: 'hsiege', title: 'The Siege',
      run: { last: from - 1, kills: 0, xp: 0, silver: 0, fs: {}, st: {}, elx: 0, ups: {}, best0: S.sg.best } });
  }
  // the wave chip on the battlefield: which wave, and the best so far
  function sgChip(cfg, n) { const el = $('#b-rep'); el.hidden = false; el.innerHTML = `Wave <b>${n}</b>${S.sg.best ? ` · best ${Math.max(S.sg.best, cfg.run.last)}` : ''}`; }
  // between waves: the survivors stay where they stand and recover a little, the fallen are gone, and the next wave
  // walks in from the right (a boss wave with a banner)
  async function siegeNext(heroes, enemies, n) {
    const hi = SPR.hires(enemies.map(u => u.id), 1500);
    K.siegeRest(heroes);
    forgetArt(await hi);
    const keep = new Map(heroes.map(u => [u, u._rs]));
    setupRender(heroes, enemies);
    heroes.forEach(u => { const o = keep.get(u); if (o) { u._rs.x = o.x; u._rs.y = o.y; } u._rs.ox = 0; if (!u.alive) u._rs.gone = true; });
    sgChip(B.cfg, n);
    enemies.forEach(u => (u._rs.walking = true));
    await tween(1000, k => { const e = ease(k); enemies.forEach(u => { u._rs.ox = 260 * (1 - e); }); updateOverlay(); });
    enemies.forEach(u => { u._rs.walking = false; u._rs.ox = 0; });
    updateOverlay();
    const boss = enemies.find(u => u.isBoss);
    if (boss) await showBanner(`Wave ${n} · ${boss.name}`, `Boss wave · ${boss.aff}`, 'big', 800);
    else if (n % 10 === 0) queueBanner(`Wave ${n}`, `${enemies.length} enemies`, '', 600);
  }
  // a wave ends: every enemy that fell pays its kill at once (XP for each hero in the team, Sigils), and the first
  // clear of a checkpoint wave pays its reward; the best wave is saved after every wave
  function sgWave(cfg, b, n, won) {
    const run = cfg.run;
    let xp = 0, silver = 0, kills = 0;
    const moon = evNow('blood') ? 2 : 1; // a Blood Moon: every kill pays double
    for (const u of b.enemies) if (!u.alive) { const k = K.siegeKill(n, u.isBoss); xp += k.xp * moon; silver += k.silver * moon; kills++; }
    run.kills += kills; run.xp += xp; run.silver += silver; S.silver += silver; S.sg.kills += kills;
    grantXp(xp, cfg.ids).forEach(([id, l]) => (run.ups[id] = l));
    if (won) {
      run.last = n;
      if (n > S.sg.best) {
        if (n % K.SIEGE.cp === 0) {
          const r = K.siegeReward(n);
          S.silver += r.silver; run.silver += r.silver; addStones(r.st);
          for (const [t, c] of Object.entries(r.fs)) { S.fs[t] = (S.fs[t] || 0) + c; run.fs[t] = (run.fs[t] || 0) + c; }
          for (const [t, c] of Object.entries(r.st)) run.st[t] = (run.st[t] || 0) + c;
          if (r.elx) { S.elx.Aether = (S.elx.Aether || 0) + r.elx; run.elx += r.elx; }
          queueBanner(`Checkpoint ${n}`, 'First clear: shards and stones', 'big', 900);
        }
        S.sg.best = n;
      }
      sgChip(cfg, n + 1);
    }
    save();
  }
  // the end of a run: what it paid (paid already, wave by wave), the heroes and the way to the next run
  function finishSiege(cfg, b) {
    const run = cfg.run, best = run.last > run.best0, n0 = v => Math.round(v).toLocaleString('en-US');
    S.sg.runs = (S.sg.runs || 0) + 1; if (run.kills) track('siege');
    save(); sgTick();
    let dl = 0; const d = () => `style="animation-delay:${(dl++) * 0.12}s"`;
    const tile = (icon, amount, title, cls) => `<li class="rt ${cls || ''}" title="${esc(title)}" ${d()}><span class="rt-ic">${icon}</span>${amount !== '' ? `<b>${amount}</b>` : ''}</li>`;
    const tiles = [
      tile('<span class="rt-t sg-k">✕</span>', run.kills.toLocaleString('en-US'), 'Enemies defeated'),
      run.silver ? tile(ic('coin'), n0(run.silver), 'Sigils') : '',
      run.xp ? tile('<span class="rt-t xp">XP</span>', n0(run.xp), 'XP for every hero in the team') : '',
      ...Object.entries(run.fs).map(([t, c]) => tile(shardIc(t), c, K.SHARD[t].name, `rar-${K.FATE_SHARDS.findIndex(f => f.id === t)}`)),
      ...Object.entries(run.st).filter(([, c]) => c > 0).map(([t, c]) => tile(stoneIc(t), c, stoneName(t, c))),
      run.elx ? tile(elxIc('Aether'), run.elx, `${elxName('Aether', run.elx)}: any hero drinks it for XP`) : '',
    ].filter(Boolean);
    const meter = b.meterAll || {};
    const heroCards = b.heroes.map(u => {
      const r = S.roster[u.id], up = run.ups[u.id], x = meter[u.uid] || { dmg: {}, heal: {}, taken: 0 }, cap = r && r.lvl >= K.maxLvl(r.stars, u.id);
      return `<div class="rs-h ${u.alive ? '' : 'fell'}"><span class="rs-hl ${up ? 'up' : ''}">${up ? (cap ? 'Max level' : 'Level up!') : cap ? 'Max level' : '&nbsp;'}</span>${r ? `<i class="rs-xp"><i style="width:${cap ? 100 : Math.round(r.xp / K.xpNeed(r.lvl) * 100)}%"></i></i>` : ''}
        <span class="pp-c rar-${C[u.id] ? C[u.id].rar : 0}" style="--ec:${AFF_COL[u.aff]};--rc:var(--r${C[u.id] ? C[u.id].rar : 0})">${por(u.id)}${essBadge(u.aff)}<span class="hx-lv">${r ? r.lvl : ''}</span>${r ? `<span class="hx-st">${'★'.repeat(r.stars)}</span>` : ''}</span>
        <b class="rs-nm">${esc(u.name)}</b><span class="rs-n dmg" title="Damage dealt">${n0(sumOf(x.dmg))}</span><span class="rs-n tak" title="Damage taken">${n0(x.taken)}</span><span class="rs-n heal" title="Healed">${n0(sumOf(x.heal))}</span></div>`;
    }).join('');
    const nav = `<div class="rs-nav"><button class="rs-rb" data-act="modal" data-go="open-home" title="Home"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 15V7l2-1V3h1.6v2.2L8 4l6 3v8H9.8v-4H6.2v4z"/></svg><small>Home</small></button><button class="rs-rb" data-act="modal" data-go="back" title="The Siege">${GATE_SVG}<small>Siege</small></button><button class="rs-rb" data-act="modal" data-go="champs" title="Heroes"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.5 2.7-6 6-6s6 2.5 6 6z"/></svg><small>Heroes</small></button></div>`;
    const big = (go, label, icon, extra, cls) => `<button class="btn rs-big ${cls || ''}" data-act="modal" data-go="${go}"><span class="rs-bi">${icon}</span><span>${label}${extra || ''}</span></button>`;
    const acts = big('again', 'New run', '↻', `<span class="rs-en">${TICKET_SVG}1</span>`, 'primary') + big('prep', 'Edit team', '⇄');
    const reached = run.last >= cfg.from ? run.last : 0;
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box result rs2 sg-res ${reached >= K.SIEGE.waves ? '' : 'lose'}" role="dialog" aria-modal="true" aria-label="The Siege">
      <div class="rs-top"><div class="rs-stage"><b>The Siege</b><small>From wave ${cfg.from} · ${b.turns} turns${best ? ' · new best!' : ''}</small></div>
        <div class="rs-ban"><h2>${reached ? `Wave ${reached}` : 'Fallen'}</h2></div><span class="rs-sp"></span></div>
      <div class="rs-strip"><span class="rs-lbl">${best ? `New best: wave ${S.sg.best}` : `Best: wave ${S.sg.best}`} · ${S.sgT} / ${K.SIEGE.tickets} tickets</span></div>
      <ul class="rewards rs-rw">${tiles.join('')}</ul>
      <div class="rs-heroes">${heroCards}</div>
      ${meterHtml(b)}
      <div class="rs-foot">${nav}<div class="rs-acts">${acts}</div></div></div>`;
    m.hidden = false;
    const f = m.querySelector('.btn'); if (f) f.focus();
    setTimeout(() => showUnlocks(newUnlocks()), 500);
  }
  // the Siege screen, laid out like the Tower's floors: on the left the courtyard with the best wave, the tickets, the
  // team, the checkpoints ahead and the rules; on the right a row per wave a run may start at (its foes, Start)
  function siegeHtml() {
    sgTick(); S.seen.siege = true; // opening it is its unlock message enough
    const best = S.sg.best, ids = teamIds('siege').filter(id => S.roster[id]), starts = sgStarts(), max = K.SIEGE.tickets, t = S.sgT;
    const nextIn = t >= max ? 'Full' : `Next in ${fmtLeft(S.sgAt + sgMs() - Date.now())}`;
    const ahead = []; for (let w = (Math.floor(best / K.SIEGE.cp) + 1) * K.SIEGE.cp; w <= K.SIEGE.waves && ahead.length < 3; w += K.SIEGE.cp) ahead.push(w);
    // the checkpoints ahead as rows under the starts: the boss of that wave and what its first clear pays
    const ms = ahead.map(w => { const F = K.siegeWave(w), boss = K.siegeFoes(w)[0]; return `<div class="sv-row locked boss sg-cp">
        <span class="tw-rfl">${w}</span>
        <span class="sv-t"><b>Checkpoint ${w}</b><small>${esc(E[boss].name)} · Lv ${F.lvl} · ${w - best} waves to go</small></span>
        <span class="sv-foes"><span class="cv-foe boss" title="${esc(E[boss].name)}">${por(boss)}</span></span>
        <span class="sv-go"><span class="tw-msi tw-rw">${twBigIc(K.siegeReward(w))}</span></span></div>`; }).join('');
    const side = `<aside class="sv-side tw-sidec sg-side">
      <div class="sv-ch" style="--art:url(${SIEGE_BG})"><small>Best wave</small><h3>${best ? `Wave ${best}` : 'Not defended yet'}</h3><span class="tl-bar"><i style="width:${best / K.SIEGE.waves * 100}%"></i></span><small>${best} / ${K.SIEGE.waves} waves · ${(S.sg.kills || 0).toLocaleString('en-US')} enemies defeated</small></div>
      <section class="sv-box sg-tix"><h4>Siege tickets</h4><div class="sg-tks">${Array.from({ length: max }, (_, i) => `<i class="${i < t ? 'on' : ''}">${TICKET_SVG}</i>`).join('')}<b>${t} / ${max}</b></div><small class="sv-note">A run costs one ticket. One comes back every ${sgMs() >= 7200000 ? `${sgMs() / 3600000} hours` : 'hour (Blood Moon)'}, at most ${max}. ${nextIn}.</small></section>
      <section class="sv-box sv-team"><h4>Your team</h4><div class="cv-heroes">${ids.map(id => `<span class="cv-hero rar-${C[id].rar}">${por(id)}<span class="cv-hero-e">${affChip(C[id].aff)}</span><i>Lv ${S.roster[id].lvl}</i></span>`).join('') || '<p class="empty-note">No heroes picked yet.</p>'}</div>
        <div class="sv-pw"><span>Power <b>${teamPower(ids).toLocaleString('en-US')}</b></span><button class="btn small" data-act="editteam" data-mode="siege">Edit team</button></div></section>
      <section class="sv-box"><h4>The rules</h4><small class="sv-note">Waves of enemies walk at your gate, more and stronger every wave, until your team falls. Between waves your heroes recover ${Math.round(K.SIEGE.rest * 100)}% HP; skills and effects carry on. A wave still standing at turn ${K.SIEGE.rageAt} enrages: its enemies hit harder every ${K.SIEGE.rageEvery} turns. Every kill pays XP and Sigils at once. Every ${K.SIEGE.cp}th wave is a boss wave and a checkpoint: its first clear pays shards and stones, and later runs may start ${K.SIEGE.back} waves below your best checkpoint.</small></section></aside>`;
    // the four furthest starts and the very first wave (the starts in between are rarely wanted)
    const shown = starts.slice().reverse().filter((w, i) => i < 4 || w === 1);
    const rows = shown.map((w, i) => {
      const F = K.siegeWave(w), foes = K.siegeFoes(w), isOpen = SGV.open === w;
      return `<div class="sv-row ${i === 0 ? 'next' : 'start'} ${isOpen ? 'open' : ''}">
        <button type="button" class="sv-sel" data-act="sgrow" data-n="${w}" aria-expanded="${isOpen}" aria-label="Wave ${w}: show its first enemies"></button>
        <span class="tw-rfl">${w}</span>
        <span class="sv-t"><b>${w === 1 ? 'From the start' : `From wave ${w}`}</b><small>Lv ${F.lvl} · ${F.count} ${F.count === 1 ? 'enemy' : 'enemies'} a wave${i === 0 && w > 1 ? ' · <span class="sv-nx">furthest start</span>' : ''}</small></span>
        <span class="sv-foes">${foes.slice(0, 4).map(x => `<span class="cv-foe ${K.BOSSES[x] ? 'boss' : ''}" title="${esc(E[x].name)}">${por(x)}</span>`).join('')}${foes.length > 4 ? `<span class="sg-more">+${foes.length - 4}</span>` : ''}</span>
        <span class="sv-go"><button class="btn ${i === 0 ? 'primary' : ''}" data-act="sggo" data-n="${w}" ${ids.length && t > 0 ? '' : `disabled title="${ids.length ? 'No tickets left' : 'Pick heroes first'}"`}>Start <span class="sg-cost">${TICKET_SVG}1</span></button></span>
        ${isOpen ? `<div class="sv-more"><div class="tw-foes">${foes.map(x => `<span class="tw-foe ${K.BOSSES[x] ? 'boss' : ''}" title="${esc(E[x].name)} · ${E[x].aff}">${por(x)}${affChip(E[x].aff)}<small>${esc(E[x].name)}</small></span>`).join('')}</div><p class="empty-note">The first wave of this run. Later waves bring more enemies; every ${K.SIEGE.cp}th wave a boss.</p></div>` : ''}</div>`;
    }).join('');
    return `<div class="campaign cv sv tws sgs">
      <div class="cv-head"><span class="cv-emb" style="background-image:url(${MENU_ART.siege})" aria-hidden="true"></span><div class="cv-ht"><h2>The Siege</h2><p>Hold your gate against endless waves. How far can your team get?</p></div></div>
      ${evHint(evNow('blood'))}
      <div class="sv-wrap lfit">${side}<div class="sv-list">${rows}${ms ? `<h4 class="sg-lh">Checkpoints ahead</h4>${ms}` : ''}</div></div></div>`;
  }
  // ---------- Expeditions (the ship, tab `expedition`, K.EXPEDITIONS) ----------
  // S.exp = { k, ids, start, end, lvl } while a trip is out; heroes on it are away: not addable to a team, not fed
  const EXSEL = new Set();
  const onExp = id => !!(S.exp && S.exp.ids.includes(id));
  // the player's campaign level: the level of the furthest stage cleared on the hardest difficulty reached
  function expLvl() {
    for (let d = K.DIFFS.length - 1; d >= 1; d--) if (S.dcl && S.dcl[d] >= 0) return K.diffLvl(K.STAGES[S.dcl[d]], d);
    return Math.max(1, K.STAGES[Math.max(0, S.cleared)].lvl);
  }
  const fmtLeft = ms => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const expDone = () => S.exp && Date.now() >= S.exp.end;
  // what a trip may bring, as text (n ≥ 1: that many; below 1: a chance)
  function expPreview(E0, lvl) {
    const one = (ic0, name, n) => n >= 1 ? `${ic0} ${n} ${name}${n > 1 ? 's' : ''}` : `${ic0} ${Math.round(n * 100)}% chance of a ${name}`;
    return [`<b>${Math.round(E0.xp * K.winXp(lvl)).toLocaleString('en-US')} XP</b> for each hero`, sigils(Math.round(E0.silver * K.winSilver(lvl))),
      ...E0.fs.map(([t, n]) => one(shardIc(t), K.SHARD[t].name, n)), ...E0.st.map(([t, n]) => one(stoneIc(t), stoneName(t, 1), n))];
  }
  function expedHtml() {
    const lvl = expLvl(), head = `<div class="section-head"><div><h2>Expeditions</h2><p class="lede">Send up to ${K.EXP_HEROES} heroes who are not in one of your teams on a voyage. They come back with XP, Sigils, Fate Shards and Ascension Stones. One expedition at a time; longer voyages bring more, but fighting yourself is always faster.</p></div></div>`;
    if (S.exp) {
      const E0 = K.EXPEDITIONS[S.exp.k], done = expDone(), pct = Math.min(100, Math.round((Date.now() - S.exp.start) / (S.exp.end - S.exp.start) * 100));
      return head + `<div class="exp-out ${done ? 'done' : ''}"><div class="exp-top"><div><span class="tag">${done ? 'Back in port' : 'At sea'}</span><h3>${esc(E0.name)}</h3><p class="empty-note">${esc(E0.desc)}</p></div>
        <div class="exp-crew">${S.exp.ids.map(id => `<span class="exp-hero rar-${C[id].rar}" title="${esc(C[id].name)}">${por(id)}<small>${esc(C[id].short)}</small></span>`).join('')}</div></div>
        <div class="exp-bar"><i style="width:${pct}%"></i></div>
        <div class="exp-foot"><span class="exp-left">${done ? 'The ship is back. Collect the rewards!' : `Back in ${fmtLeft(S.exp.end - Date.now())}`}</span>
          ${done ? '<button class="btn primary" data-act="expclaim">Collect rewards</button>' : '<button class="btn small" data-act="exprecall">Recall the ship</button>'}</div>
        <ul class="exp-rw">${expPreview(E0, S.exp.lvl).map(x => `<li>${x}</li>`).join('')}</ul></div>`;
    }
    for (const id of [...EXSEL]) if (!S.roster[id] || inAnyTeam(id)) EXSEL.delete(id);
    // every hero can be picked; one in a team asks first whether to take it out of that team (expsel)
    const free = Object.keys(S.roster).filter(id => C[id] && !C[id].pc).sort((a, b) => !!inAnyTeam(a) - !!inAnyTeam(b) || C[b].rar - C[a].rar || S.roster[b].lvl - S.roster[a].lvl);
    const crew = free.length ? `<div class="grid-cards exp-pick">${free.map(id => { const r = S.roster[id], on = EXSEL.has(id), capped = r.lvl >= K.maxLvl(r.stars, id), tm = teamsOf(id); return `<button type="button" class="card rar-${C[id].rar} ${on ? 'sel inteam' : ''} ${tm.length ? 'in-team' : ''}" data-act="expsel" data-id="${id}" aria-pressed="${on}" title="${tm.length ? `In ${esc(tm.join(', '))}: picking it asks to take it out of that team` : capped ? 'At its level cap: its XP goes to the rest of the crew' : ''}">${affChip(C[id].aff)}<span class="lv">${r.lvl}</span>${por(id)}<span class="nm">${esc(C[id].short)}</span><span class="sub">${tm.length ? `In ${esc(tm.join(', '))}` : capped ? 'Level cap' : roleStr(C[id])}</span></button>`; }).join('')}</div>`
      : '<p class="empty-note">You have no heroes yet.</p>';
    const trips = K.EXPEDITIONS.map((E0, k) => `<div class="exp-trip"><div class="exp-th"><h3>${esc(E0.name)}</h3><span class="tag">${E0.hours} ${E0.hours === 1 ? 'hour' : 'hours'}</span></div><p class="empty-note">${esc(E0.desc)}</p>
      <ul class="exp-rw">${expPreview(E0, lvl).map(x => `<li>${x}</li>`).join('')}</ul>
      <button class="btn primary" data-act="expgo" data-k="${k}" ${EXSEL.size ? '' : 'disabled title="Pick heroes for the crew first"'}>Set sail</button></div>`).join('');
    return head + `<div class="exp-wrap lfit"><section class="exp-crewcol"><div class="section-head"><h3 style="margin:0">Crew</h3><span class="tag">${EXSEL.size} / ${K.EXP_HEROES} chosen</span></div>${crew}</section>
      <div class="exp-trips">${trips}</div></div><p class="empty-note exp-note">Rewards follow your campaign progress (enemy level ${lvl} now). A hero at its level cap passes its XP on to the rest of the crew.</p>`;
  }
  function expClaim() {
    if (!expDone()) return;
    const x = S.exp, rw = K.expReward(x.k, x.lvl), ups = [], gain = {};
    // the crew shares rw.xp × crew size: a hero at (or reaching) its level cap passes the rest on to the others
    const room = id => { const h = S.roster[id], cap = K.maxLvl(h.stars, id); let r = -h.xp; for (let l = h.lvl; l < cap; l++) r += K.xpNeed(l); return Math.max(0, r); };
    let crew = x.ids.filter(id => S.roster[id]), pool = rw.xp * crew.length, open = crew.filter(id => room(id) > 0);
    const lv0 = Object.fromEntries(crew.map(id => [id, S.roster[id].lvl]));
    while (pool > 0 && open.length) {
      const share = Math.floor(pool / open.length) || pool; let used = 0;
      for (const id of open) { const g = Math.min(share, room(id), pool - used); if (g <= 0) continue; const h = S.roster[id]; h.xp += g; used += g; gain[id] = (gain[id] || 0) + g; while (h.lvl < K.maxLvl(h.stars, id) && h.xp >= K.xpNeed(h.lvl)) { h.xp -= K.xpNeed(h.lvl); h.lvl++; } if (h.lvl >= K.maxLvl(h.stars, id)) h.xp = 0; }
      pool -= used; open = open.filter(id => room(id) > 0); if (!used) break;
    }
    for (const id of crew) if (S.roster[id].lvl > lv0[id]) ups.push(`${C[id].short} → ${S.roster[id].lvl}`);
    S.silver += rw.silver; for (const t in rw.fs) S.fs[t] = (S.fs[t] || 0) + rw.fs[t]; addStones(rw.st);
    S.exp = null; save(); hud(); render(); SFX.up();
    // what the trip brought, in a popup: the crew with the XP each got (and a level-up), then every reward as a tile
    const heroes = crew.map(id => `<span class="exr-h rar-${C[id].rar}">${por(id)}<b>${esc(C[id].short)}</b><i>${gain[id] ? `+${gain[id].toLocaleString('en-US')} XP` : 'Max level'}</i>${S.roster[id].lvl > lv0[id] ? `<em>Lv ${S.roster[id].lvl}</em>` : ''}</span>`).join('');
    const tiles = [`<span class="cv-rw" title="${rw.silver.toLocaleString('en-US')} Sigils">${ic('coin')}<b>${rw.silver.toLocaleString('en-US')}</b></span>`,
      ...Object.entries(rw.fs).filter(([, n]) => n > 0).map(([t, n]) => `<span class="cv-rw" title="${n} × ${esc(K.SHARD[t].name)}">${shardIc(t)}<b>${n}</b></span>`),
      ...Object.entries(rw.st).filter(([, n]) => n > 0).map(([t, n]) => `<span class="cv-rw" title="${n} × ${esc(stoneName(t, n))}">${stoneIc(t)}<b>${n}</b></span>`)].join('');
    const el = document.createElement('div');
    el.className = 'unlock-pop ex-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The ship is back');
    el.innerHTML = `<div class="unlock-card"><span class="tag">${esc(K.EXPEDITIONS[x.k].name)}</span><h2>The ship is back!</h2>
      <div class="exr-crew">${heroes}</div><div class="cv-rws">${tiles}</div><button class="btn primary" type="button">OK</button></div>`;
    document.body.appendChild(el); el.querySelector('button').focus();
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('button')) el.remove(); });
  }
  // keep the time left on the Expeditions screen and the ship's badge on the homebase current
  setInterval(() => { if (!S || !S.exp) return; if (tab === 'expedition' && $('#modal').hidden) { const el = document.querySelector('.exp-left'); if (el && !expDone()) { el.textContent = `Back in ${fmtLeft(S.exp.end - Date.now())}`; const b = document.querySelector('.exp-bar i'); if (b) b.style.width = Math.min(100, Math.round((Date.now() - S.exp.start) / (S.exp.end - S.exp.start) * 100)) + '%'; } else if (expDone() && !document.querySelector('[data-act=expclaim]')) render(); } else if (tab === 'home' && expDone() && !document.querySelector('.hb-dot')) render(); }, 30000);
  // ---------- Energy (K.ENERGY): S.energy, refilled by time from S.enAt (ms) ----------
  const EN_MS = K.ENERGY.regenMin * 60000;
  const enMax = () => K.energyMax(effLvl(S));
  // energy from rewards may go above the bar, up to K.ENERGY.over times it; the rest is lost. Returns what was added.
  const enCeil = () => enMax() * K.ENERGY.over;
  function addEnergy(n) { energyTick(); const got = Math.min(Math.max(0, enCeil() - S.energy), Math.max(0, Math.floor(n))); S.energy += got; return got; }
  function energyTick() {
    const now = Date.now(), max = enMax();
    if (S.energy == null || !S.enAt) { S.energy = S.energy ?? max; S.enAt = now; }
    if (S.energy >= max) { S.enAt = now; return; }
    const n = Math.floor((now - S.enAt) / EN_MS); if (n <= 0) return;
    S.energy = Math.min(max, S.energy + n); S.enAt = S.energy >= max ? now : S.enAt + n * EN_MS;
  }
  const fmtMins = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
  // minutes until the bar holds `need` energy (0 if it already does)
  function energyWait(need) { energyTick(); const short = need - S.energy; return short <= 0 ? 0 : Math.max(1, Math.ceil((short * EN_MS - (Date.now() - S.enAt)) / 60000)); }
  const enIc = () => EN_SVG;
  const enCost = c => c ? `<span class="en-cost" title="Costs ${c} energy">${enIc()}${c}</span>` : '';
  // energy for stage i on difficulty d: Easy Chapter I is free only while that stage is not cleared yet
  const stEn = (i, d) => K.stageEnergy(K.STAGES[i], d, !d && i > S.cleared);
  // pay for a battle; false (with a message) when there is not enough
  function spendEnergy(cost) {
    energyTick();
    if (cost && S.energy < cost) { toast(`Not enough energy: this battle costs ${cost}, you have ${S.energy}. You get 1 every ${K.ENERGY.regenMin} minutes, enough in ${fmtMins(energyWait(cost))}, or buy a refill with Crystals in the Market.`, true, 5000); return false; }
    track('energy', cost || 0);
    S.energy -= cost || 0; save(); paintEnergy(); return true;
  }
  function paintEnergy() {
    const el = $('#energy'); if (!el) return;
    energyTick(); const max = enMax();
    el.innerHTML = `${S.energy}<small>/${max}</small>`;
    el.parentElement.title = S.energy >= max ? `Energy: full (${max}). Campaign stages and Boss Hall levels cost energy.` : `Energy: +1 every ${K.ENERGY.regenMin} minutes, full in ${fmtMins(energyWait(max))}. Campaign stages and Boss Hall levels cost energy.`;
  }
  setInterval(paintEnergy, 20000);
  function grantPlayerXp(amount) {
    const p = S.p, ups = [];
    p.xp += amount;
    while (p.lvl < PLAYER_MAX && p.xp >= pxNeed(p.lvl)) {
      p.xp -= pxNeed(p.lvl); p.lvl++;
      const silver = levelSilver(p.lvl), shard = p.lvl % 5 === 0 ? 'greater' : null;
      S.silver += silver; if (shard) S.fs[shard] = (S.fs[shard] || 0) + 1; const en = addEnergy(levelEnergy(p.lvl)); S.gems += LEVEL_GEMS;
      ups.push([p.lvl, silver, shard, (!p.prestige && Object.keys(PLAYER_UNLOCK).find(t => PLAYER_UNLOCK[t] === p.lvl)) || null, en]);
    }
    if (p.lvl >= PLAYER_MAX) p.xp = 0; // the bar stops at the top: time to prestige
    return ups;
  }
  // unlock messages (S.seen remembers which were shown): speed 3× and 5×, Fate Altar, Boss Hall
  // what each building opens up, in the unlock message
  const UNLOCK_TEXT = {
    altaar: 'Use your Fate Shards at the Fate Altar to summon new heroes.',
    expedition: 'Send heroes you are not using on a voyage at the harbour. They come back with XP, Sigils, Fate Shards and Ascension Stones.',
    tower: 'Climb the Tower of Essence floor by floor with heroes of one essence. Every floor pays once, and climbing costs no energy.',
    arena: 'Fight the teams of other players, climb the ranking and earn weekly rewards.',
    guild: 'Create or join a guild in Social → Guild, fight the guild boss every day and earn a weekly Guild Chest.',
    kerkers: 'Challenge the bosses of the Boss Hall for their rare gear sets.',
    siege: 'Hold your gate in the Siege: endless waves of enemies, more and stronger every wave. Every kill pays XP and Sigils; see how far your team gets.',
  };
  function newUnlocks() {
    const out = [];
    if (!S.seen.auto && S.cleared >= 0) { S.seen.auto = true; out.push({ k: 'auto', title: 'Auto battle unlocked', text: 'Tap the round Auto button at the bottom left of a battle and your heroes fight on their own. It stays on until you turn it off.' }); }
    // the homebase opens after the first campaign battle (see firstSteps)
    if (!S.seen.home && !noHero() && !firstSteps()) { S.seen.home = true; out.push({ k: 'home', title: 'Your homebase is open', text: 'A short tour shows you every building and what it is for. After that, the campaign continues.' }); }
    for (const [sp, at] of SPEED_UNLOCK) if (sp > 2 && !S.seen['spd' + sp] && S.cleared + 1 >= at) {
      S.seen['spd' + sp] = true;
      out.push({ k: 'spd', title: `Speed ${sp}× unlocked`, text: sp === 5 ? 'Battles can now run at 5× when you replay a stage you already cleared or a Boss Hall level you already beat.' : `Tap the speed button in battle to switch to ${sp}×.` });
    }
    for (const k in UNLOCKS) if (!S.seen[k] && unlocked(k)) {
      S.seen[k] = true;
      out.push({ k, title: `${UNLOCK_NAME[k]} unlocked`, text: UNLOCK_TEXT[k] || '' });
    }
    // a whole difficulty cleared: the next one opens in the campaign, and with it two more levels of every Boss Hall boss
    for (let d = 1; d < K.DIFFS.length; d++) if (!S.seen['diff' + d] && diffOpen(d)) {
      S.seen['diff' + d] = true;
      const D = K.DIFFS[d], lv = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(n => K.bossDiff(n) === d);
      out.push({ k: 'diff', title: `${D.name} unlocked`, text: `You cleared the whole campaign on ${K.DIFFS[d - 1].name}. The campaign on ${D.name} is open (enemies level ${K.diffLvl(K.STAGES[0], d)}+, ${D.rars.map(r => K.RARITIES[r]).join(' and ')} gear), and in the Boss Hall levels ${lv.join(' and ')} of every boss you can reach.` });
    }
    // the homebase message comes last: its button leads there
    return out.sort((a, b) => (a.k === 'home') - (b.k === 'home'));
  }
  function showUnlocks(list) {
    if (!list.length) return;
    const u = list[0], el = document.createElement('div');
    el.className = 'unlock-pop'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', u.title);
    const svg = u.k === 'auto' ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 8A5.5 5.5 0 1 1 11.9 4.1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.6 1.6l3.9.4-.9 3.8z" fill="currentColor"/></svg>' : u.k === 'spd' ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 3l6 5-6 5zM8 3l6 5-6 5z" fill="currentColor"/></svg>' : LOCK_SVG.replace('M5 7V5a3 3 0 0 1 6 0v2', 'M5 7V5a3 3 0 0 1 6 0');
    el.innerHTML = `<div class="unlock-card"><div class="unlock-ic">${svg}</div><span class="tag">New unlock</span><h2>${esc(u.title)}</h2><p>${esc(u.text)}</p><button class="btn primary" type="button">${u.k === 'home' ? 'Go to homebase' : list.length > 1 ? 'Next' : 'Great!'}</button></div>`;
    document.body.appendChild(el);
    SFX.up();
    const btn = el.querySelector('button'); btn.focus();
    // "Your homebase is open": the button closes the battle result and goes to the homebase
    btn.addEventListener('click', () => { el.remove(); if (u.k === 'home') { SFX.click(); if (B) modalAction('open-home'); else setTab('home'); window.scrollTo({ top: 0 }); return; } showUnlocks(list.slice(1)); });
  }
  function finishBattle(win) {
    const cfg = B.cfg, b = B.b, lvl = cfg.lvl;
    const items = [], loot = [];
    let xp, silver, stones = {}, unlock = null, first = false, captured = null, elixir = null;
    const gotShards = [];
    if (win) {
      xp = K.winXp(lvl); silver = K.winSilver(lvl);
      if (cfg.type === 'stage') {
        const hard = cfg.hard, cleared = clearedOn(cfg.diff);
        if (cfg.i > cleared) { first = true; if (cfg.diff) S.dcl[cfg.diff] = cfg.i; else S.cleared = cfg.i; gotShards.push(cfg.stage.n === 6 ? 'greater' : 'fate'); }
        stones = K.stageStones(cfg.stage, cfg.diff, first);
        if (first || Math.random() < 0.65) loot.push(K.genGear({ il: lvl, slot: cfg.stage.slot || K.pick(K.SLOTS), ...K.stageLoot(cfg.stage, cfg.diff), sets: [cfg.stage.set] }, S.nid++));
        if (first && cfg.stage.n === 6) delete S.chap;
        const u = K.stageUnlock(K.STAGES[cfg.i], S.starter);
        const catchable = [...new Set(K.stagePhases(cfg.stage, cfg.diff).flat())].filter(f => !K.BOSSES[f]);
        if (catchable.length && Math.random() < K.CAPTURE_CHANCE) {
          const cid = K.pick(catchable);
          if (!S.roster[cid]) { S.roster[cid] = newHero(cid); captured = { id: cid, isNew: true }; }
          else { S.fodder[cid] = (S.fodder[cid] || 0) + 1; captured = { id: cid, isNew: false }; }
        }
        if (Math.random() < K.ELIXIR.camp) { const foes = K.stagePhases(cfg.stage, cfg.diff).flat(); elixir = unitAff(K.pick(foes)); }
        if (!hard && u && !S.roster[u]) { S.roster[u] = newHero(u); S.roster[u].lvl = Math.max(1, Math.min(K.maxLvl(S.roster[u].stars, u), Math.min(...S.team.map(id => S.roster[id].lvl)) - 1)); unlock = u; if (S.team.length < 4) S.team.push(u); }
      } else if (cfg.type === 'tower') {
        // a floor pays once, on its first clear (the tower climbs one floor at a time)
        if (cfg.floor > (S.tw.prog[cfg.ess] || 0)) { S.tw.prog[cfg.ess] = cfg.floor; first = true; }
        const rw = K.towerReward(cfg.floor);
        const twTide = evTideOf(cfg.ess) ? 2 : 1; // the Essence Tide: double Sigils and XP on first clears
        if (first) { silver = rw.silver * twTide; xp = rw.xp * twTide; for (const [t, n] of Object.entries(rw.fs)) for (let i = 0; i < n; i++) gotShards.push(t); stones = rw.st; } else { silver = 0; xp = 0; }
        if (first && cfg.floor % 10 === 0) elixir = cfg.ess === 'All' ? 'Aether' : cfg.ess;
      } else {
        if (cfg.n > (S.bh[cfg.id] || 0)) { S.bh[cfg.id] = cfg.n; first = true; S.bhSel[cfg.id] = Math.min(K.BOSS_LEVELS, cfg.n + 1); }
        stones = K.bossStones(cfg.n, first);
        if (first && cfg.n === 1) gotShards.push('fate');
        if (first && cfg.n === 5) gotShards.push('greater');
        if (first && cfg.n === 7) gotShards.push('ancient');
        if (first && cfg.n === 10) gotShards.push('ancient');
        const hunted = evHunted(cfg.id); // the Boss Hunt: one more set piece and a sure elixir
        const drops = 1 + (cfg.n >= 5 ? 1 : 0) + (first ? 1 : 0) + (hunted ? 1 : 0);
        for (let i = 0; i < drops; i++) loot.push(K.genGear({ il: lvl, ...K.bossLoot(cfg.n), sets: K.bossSets(cfg.bi) }, S.nid++));
        if (first && cfg.n === 1 && cfg.bi + 1 < K.BOSS_ORDER.length) S.bhCur = K.BOSS_ORDER[cfg.bi + 1];
        if (hunted || Math.random() < K.ELIXIR.hall) elixir = unitAff(cfg.id);
      }
      xp = Math.round(xp * (cfg.type === 'boss' ? 1.2 : 1));
    } else if (cfg.type === 'tower') { xp = 0; silver = 0; } // tower tries are free, so a defeat pays nothing
    else { xp = Math.round(K.winXp(lvl) * 0.25); silver = Math.round(K.winSilver(lvl) * 0.3); }
    // a lost campaign stage or Boss Hall level gives half its energy back (also when given up)
    const refund = !win && (cfg.type === 'stage' || cfg.type === 'boss') ? addEnergy(Math.ceil((cfg.type === 'stage' ? stEn(cfg.i, cfg.diff) : K.bossEnergy(cfg.n)) / 2)) : 0;
    if (refund) paintEnergy();
    if (win && cfg.type !== 'tower') gotShards.push(...K.rollShards());
    // an elixir drop: now and then an Aether Elixir (fits any hero) instead (the tower's own reward stays as it is)
    if (elixir && cfg.type !== 'tower' && Math.random() < K.ELIXIR.aether) elixir = 'Aether';
    const elxN = elixir && evTideOf(elixir) ? 2 : 1; // the Essence Tide: its elixirs drop twice
    if (elixir) S.elx[elixir] = (S.elx[elixir] || 0) + elxN;
    S.silver += silver; addStones(stones);
    for (const t of gotShards) S.fs[t] = (S.fs[t] || 0) + 1;
    loot.forEach(it => S.inv.push(it));
    const ups = grantXp(xp, cfg.ids);
    const pxp = win ? (first || cfg.type !== 'tower' ? playerWinXp(lvl, first, cfg.type === 'boss') : 0) : b.aborted || cfg.type === 'tower' ? 0 : Math.round(playerWinXp(lvl) * 0.25);
    const pups = grantPlayerXp(pxp); if (pups.length) paintEnergy();
    if (win) { S.p.st.won++; if (cfg.type === 'boss') S.p.st.bossWon++; } else if (!b.aborted) S.p.st.lost++;
    if (win && cfg.type === 'stage') { track('camp'); if (cfg.diff === 4 && b.heroes.every(u => u.alive)) track('flaw'); }
    if (win && cfg.type === 'boss') track('boss');
    if (cfg.type === 'tower' && !b.aborted) { track('tower'); if (win && cfg.ids && cfg.ids.length === 1) qBest('solo', cfg.floor); }
    // Auto ×10: everything this battle paid is added to the run's totals (shown when the run ends, repSummary)
    if (cfg.rep) {
      const s = cfg.rep.sum || (cfg.rep.sum = { battles: 0, energy: 0, silver: 0, xp: 0, pxp: 0, fs: {}, st: {}, items: [], caps: [], ups: {} });
      s.battles++; s.energy += (cfg.type === 'stage' ? stEn(cfg.i, cfg.diff) : K.bossEnergy(cfg.n)) - refund;
      s.silver += silver; s.xp += xp; s.pxp += pxp;
      for (const t of gotShards) s.fs[t] = (s.fs[t] || 0) + 1;
      for (const [t, n] of Object.entries(stones)) if (n > 0) s.st[t] = (s.st[t] || 0) + n;
      loot.forEach(it => s.items.push(it.id));
      if (captured) s.caps.push(captured.id);
      if (elixir) { s.elx = s.elx || {}; s.elx[elixir] = (s.elx[elixir] || 0) + elxN; }
      ups.forEach(([id, l]) => (s.ups[id] = l));
    }
    const unlocks = newUnlocks();
    save();
    let dl = 0; const d = () => `style="animation-delay:${(dl++) * 0.12}s"`;
    items.push(`<li ${d()}>${ic('coin')}+${silver.toLocaleString('en-US')} Sigils</li>`);
    if (refund) items.push(`<li ${d()}>${enIc()}+${refund} energy back: a defeat costs only half</li>`);
    items.push(`<li ${d()}><span class="aff" style="--c:var(--info)">XP</span>+${xp} XP for every champion in your team</li>`);
    if (pxp) items.push(`<li ${d()}><span class="aff" style="--c:var(--gold)">P</span>+${pxp} player XP${pups.length ? '' : S.p.lvl >= PLAYER_MAX ? ' · max level: prestige in the Town Hall' : ` · ${S.p.xp} / ${pxNeed(S.p.lvl)} to level ${S.p.lvl + 1}`}</li>`);
    pups.forEach(([l, sv, sh, t, en]) => items.push(`<li class="loot lvup" ${d()}><span class="lvbadge">${l}</span><span><b>Player level ${l}!</b> +${en} Energy · +${sv.toLocaleString('en-US')} Sigils · +${LEVEL_GEMS} Crystals${sh ? ` · +1 ${esc(K.SHARD[sh].name)}` : ''}${t ? ` · <b>The ${UNLOCK_NAME[t]} is now open.</b>` : ''}</span></li>`));
    for (const t of gotShards) items.push(`<li class="loot rar-${K.FATE_SHARDS.findIndex(f => f.id === t)}" ${d()}>${shardIc(t)}+1 ${esc(K.SHARD[t].name)}</li>`);
    for (const [t, n] of Object.entries(stones)) if (n > 0) items.push(`<li ${d()}>${stoneIc(t)}+${n} ${stoneName(t, n)}</li>`);
    ups.forEach(([id, l, cap]) => items.push(`<li class="up" ${d()}>${por(id)}${esc(C[id].short)} is now level ${l}${cap ? ' (maximum, ascend for more)' : ''}</li>`));
    if (win && isStageCfg(cfg) && !loot.length) items.push(`<li ${d()}><span class="aff" style="--c:var(--muted)">–</span>No ${esc(dropName(cfg.stage).toLowerCase())} dropped this time.</li>`);
    loot.forEach(it => items.push(`<li class="loot rar-${it.rar}" ${d()}>${gearIcon(it, 'loot-ic')}<span><span class="item-name">${itemNameH(it)}</span> · <span class="item-set">${K.SETS[it.set].name}</span></span></li>`));
    if (elixir) items.push(`<li class="loot elx-loot" ${d()}>${elxIc(elixir)}<span>+${elxN} <b style="color:${AFF_COL[elixir]}">${elxName(elixir, 1)}</b> · ${elixir === 'Aether' ? 'any hero' : `${elixir} heroes`} drink it for XP (Team · Upgrade)</span></li>`);
    if (captured) items.push(`<li class="loot rar-${C[captured.id].rar}" ${d()}>${por(captured.id)}<span>${captured.isNew ? `Captured: <b class="rartxt">${esc(C[captured.id].name)}</b> joins your roster as a hero.` : `Captured another <b class="rartxt">${esc(C[captured.id].name)}</b> as fodder.`}</span></li>`);
    if (unlock) items.push(`<li class="loot rar-${C[unlock].rar}" ${d()}>${por(unlock)}<span>New champion: <b class="rartxt">${esc(C[unlock].name)}</b> (${K.RARITIES[C[unlock].rar]})${S.team.includes(unlock) ? ' joins your team' : ''}</span></li>`);
    // MVP
    let mvp = '';
    if (win) {
      const top = b.heroes.map(u => [u, b.stats.dmg[u.uid] || 0]).sort((a, c) => c[1] - a[1])[0];
      if (top && top[1] > 0) mvp = `<div class="mvp">${por(top[0].id)}<span>Most damage: <b>${esc(top[0].name)}</b> (${top[1].toLocaleString('en-US')}) · Biggest hit ${b.stats.maxHit.toLocaleString('en-US')} · ${b.turns} turns</span></div>`;
    }
    const isStage = cfg.type === 'stage';
    const last = isStage && cfg.i === K.STAGES.length - 1;
    const nd = isStage && K.DIFFS[cfg.diff + 1];
    const note = win && TUT.on ? `<div class="coach-note"><b>Well done! What now?</b><ul><li><b>Next stage</b> continues the story; clearing stages 1-3 brings new heroes to your team.</li><li>The gear you win goes to your <b>Vault</b>; to equip it, open a hero in <b>Heroes</b> and tap a gear slot.</li><li>Stuck later on? <b>Replay</b> cleared stages to level up and farm gear.</li></ul></div>`
      : win && first && last ? `<p class="lede">You finished all ten chapters on ${K.DIFFS[cfg.diff].name}.${nd ? ` ${nd.name} difficulty is now open: tougher enemies, better gear (${rarsHtml(nd.rars)}).` : ' You beat the hardest difficulty!'}</p>`
      : win && first && isStage && cfg.stage.n === 6 && cfg.stage.chapter + 1 < K.CHAPTERS.length ? `<p class="lede">Chapter ${ROMAN[cfg.stage.chapter]} cleared. Chapter ${ROMAN[cfg.stage.chapter + 1]}, ${esc(K.CHAPTERS[cfg.stage.chapter + 1].name)}, is now open.</p>`
      : win && first && cfg.type === 'boss' && cfg.n === 1 && cfg.bi + 1 < K.BOSS_ORDER.length ? `<p class="lede">${esc(K.BOSSES[K.BOSS_ORDER[cfg.bi + 1]].name)} is now open in the Boss Hall.</p>`
      : win ? '' : !b.aborted && cfg.type === 'tower' ? `<p class="lede">Tip: ${cfg.ess === 'All' ? 'the Tower of Fate takes any hero, but its foes are far tougher' : `only ${cfg.ess} heroes can climb this tower`}. Level, ascend and gear them, and bring your four strongest. Trying again costs nothing.</p>`
        : !b.aborted && cfg.type === 'boss' && cfg.n >= K.BTRAIT.from && !S.team.some(id => skillFx(id).includes(K.BTRAIT.answer[K.bossTrait(cfg.bi)])) ? `<p class="lede">Tip: this boss has <b>${K.EFFECTS[K.bossTrait(cfg.bi)].n}</b>. ${esc(K.EFFECTS[K.bossTrait(cfg.bi)].d)}.</p>`
        : !b.aborted && cfg.type === 'boss' && cfg.n >= K.BLIGHT.bh && !S.team.some(heals) ? '<p class="lede">Tip: your team has no healer. This boss drains your whole team every turn (Blight Aura); bring a hero who heals or shields (Draelyn, or a Support from the Fate Altar).</p>'
        : '<p class="lede">Tip: level your team, equip better gear, bring faster champions, or pick essences that land Strong Hits. If a stage keeps beating you, replay earlier stages for gear and levels first.</p>';
    const tower = cfg.type === 'tower';
    const canNext = isStage ? cfg.i + 1 < K.STAGES.length : tower ? cfg.floor < K.TOWER.floors : cfg.n < K.BOSS_LEVELS && (S.bh[cfg.id] || 0) >= cfg.n;
    // the result: the outcome on a banner, what it paid as tiles, a card per hero (level up, damage, taken,
    // healed), the meter folded away, round buttons home / stages / heroes and the big ones Fight again / Edit team / Next
    const cost = (i) => cfg.type === 'stage' ? stEn(i, cfg.diff) : cfg.type === 'boss' ? K.bossEnergy(i) : 0;
    const here = isStage ? cfg.i : tower ? cfg.floor : cfg.n, en = n => n ? `<span class="rs-en">${enIc()}${n}</span>` : '';
    const tile = (icon, amount, title, cls) => `<li class="rt ${cls || ''}" title="${esc(title)}" ${d()}><span class="rt-ic">${icon}</span>${amount !== '' ? `<b>${amount}</b>` : ''}</li>`;
    const shardN = {}; gotShards.forEach(t => (shardN[t] = (shardN[t] || 0) + 1));
    dl = 0;
    const tiles = [
      ...loot.map(it => tile(gearIcon(it, 'loot-ic'), `+${it.lvl}`, `${itemName(it)} · ${K.SETS[it.set].name}`, `gear rar-${it.rar}`)),
      silver ? tile(ic('coin'), silver.toLocaleString('en-US'), 'Sigils') : '',
      xp ? tile('<span class="rt-t xp">XP</span>', xp.toLocaleString('en-US'), 'XP for every hero in the team') : '',
      pxp ? tile('<span class="rt-t px">P</span>', pxp.toLocaleString('en-US'), `Player XP · ${S.p.xp} / ${pxNeed(S.p.lvl)} to level ${S.p.lvl + 1}`) : '',
      refund ? tile(enIc(), `+${refund}`, 'Energy back: a defeat costs only half') : '',
      ...Object.entries(shardN).map(([t, n]) => tile(shardIc(t), n, K.SHARD[t].name, `rar-${K.FATE_SHARDS.findIndex(f => f.id === t)}`)),
      ...Object.entries(stones).filter(([, n]) => n > 0).map(([t, n]) => tile(stoneIc(t), n, stoneName(t, n))),
      elixir ? tile(elxIc(elixir), elxN, `${elxName(elixir, 1)}: ${elixir === 'Aether' ? 'any hero' : elixir + ' heroes'} drink it for XP`) : '',
      captured ? tile(por(captured.id), captured.isNew ? 'New' : '+1', `Captured: ${C[captured.id].name}`, `hero rar-${C[captured.id].rar}`) : '',
      unlock ? tile(por(unlock), 'New', `New champion: ${C[unlock].name}`, `hero rar-${C[unlock].rar}`) : '',
      ...pups.map(([l, sv, sh, t, en2]) => tile(`<span class="lvbadge">${l}</span>`, 'Level up', `Player level ${l}! +${en2} Energy · +${sv.toLocaleString('en-US')} Sigils · +${LEVEL_GEMS} Crystals${sh ? ` · +1 ${K.SHARD[sh].name}` : ''}${t ? ` · ${UNLOCK_NAME[t]} unlocked` : ''}`, 'lvup')),
    ].filter(Boolean);
    const meter = b.meterAll || {}, n0 = v => Math.round(v).toLocaleString('en-US');
    const heroCards = b.heroes.map(u => {
      const r = S.roster[u.id], up = ups.find(x => x[0] === u.id), x = meter[u.uid] || { dmg: {}, heal: {}, taken: 0 };
      const cap = r && r.lvl >= K.maxLvl(r.stars, u.id), lab = up ? (up[2] ? 'Max level' : 'Level up!') : cap ? 'Max level' : '';
      return `<div class="rs-h ${u.alive ? '' : 'fell'}"><span class="rs-hl ${up ? 'up' : ''}">${lab || '&nbsp;'}</span>${r ? `<i class="rs-xp"><i style="width:${cap ? 100 : Math.round(r.xp / K.xpNeed(r.lvl) * 100)}%"></i></i>` : ''}
        <span class="pp-c rar-${C[u.id] ? C[u.id].rar : 0}" style="--ec:${AFF_COL[u.aff]};--rc:var(--r${C[u.id] ? C[u.id].rar : 0})">${por(u.id)}${essBadge(u.aff)}<span class="hx-lv">${r ? r.lvl : ''}</span>${r ? `<span class="hx-st">${'★'.repeat(r.stars)}</span>` : ''}</span>
        <b class="rs-nm">${esc(u.name)}</b><span class="rs-n dmg" title="Damage dealt">${n0(sumOf(x.dmg))}</span><span class="rs-n tak" title="Damage taken">${n0(x.taken)}</span><span class="rs-n heal" title="Healed">${n0(sumOf(x.heal))}</span></div>`;
    }).join('');
    const nav = `<div class="rs-nav"><button class="rs-rb" data-act="modal" data-go="open-home" title="Home"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 15V7l2-1V3h1.6v2.2L8 4l6 3v8H9.8v-4H6.2v4z"/></svg><small>Home</small></button><button class="rs-rb" data-act="modal" data-go="back" title="${isStage ? 'Stage selection' : tower ? 'Tower' : 'Boss Hall'}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3l4-1.5 4 1.5 4-1.5v11L10 14l-4-1.5L2 14z"/><path d="M6 1.5v11M10 3v11"/></svg><small>${isStage ? 'Stages' : tower ? 'Tower' : 'Bosses'}</small></button><button class="rs-rb" data-act="modal" data-go="champs" title="Heroes"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l5 2v4c0 3.3-2.2 5.7-5 7-2.8-1.3-5-3.7-5-7v-4z"/></svg><small>Heroes</small></button></div>`;
    const big = (go, label, icon, n, cls) => `<button class="btn rs-big ${cls || ''}" data-act="modal" data-go="${go}"><span class="rs-bi">${icon}</span><span>${label}${en(n)}</span></button>`;
    const acts = [
      tower && win ? '' : big('again', win ? 'Fight again' : 'Try again', '↻', cost(here)),
      isStage || cfg.type === 'boss' || tower ? big('prep', 'Edit team', '⇄', 0) : '', // editing the team is free: no energy on it
      win && canNext ? big('next', isStage ? 'Next stage' : tower ? 'Next floor' : 'Next level', '➜', cost(isStage ? here + 1 : here + 1), 'primary') : '',
    ].join("");
    const openBtns = pups.map(u => u[3]).filter(Boolean).map(t => `<button class="btn violet" data-act="modal" data-go="open-${t}">Open the ${UNLOCK_NAME[t]}</button>`).join('');
    if (pups.length) SFX.up();
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box result rs2 ${win ? '' : 'lose'}" role="dialog" aria-modal="true" aria-label="${win ? 'Victory' : 'Defeat'}">
      <div class="rs-top"><div class="rs-stage"><b>${esc(cfg.title)}</b><small>${b.turns} turns${win && first ? ' · first clear' : ''}</small></div>
        <div class="rs-ban"><h2>${win ? 'Victory' : b.aborted ? 'Surrendered' : 'Defeat'}</h2></div><span class="rs-sp"></span></div>
      <div class="rs-strip"><span class="rs-lbl">${win ? 'Reward' : 'Consolation'}</span></div>
      <ul class="rewards rs-rw">${tiles.join('') || '<li class="rt none">Nothing this time</li>'}</ul>
      <div class="rs-heroes">${heroCards}</div>
      ${note}${meterHtml(b)}
      <div class="rs-foot">${nav}<div class="rs-acts">${openBtns}${acts}</div></div></div>`;
    m.hidden = false;
    const f = m.querySelector('.btn'); if (f) f.focus();
    setTimeout(() => showUnlocks(unlocks), 500);
    if (win && first && isStage && cfg.i === 2 && !cfg.diff && guest() && !S.seen.lkOffer) {
      S.seen.lkOffer = true; save();
      const offer = (n) => document.querySelector('.unlock-pop') && n < 30 ? setTimeout(() => offer(n + 1), 700) : showLinkOffer('Chapter I · Stage 3 cleared');
      setTimeout(() => offer(0), 1400);
    }
    if (cfg.rep) repStep(cfg, win);
  }
  // damage meter: the engine's per-battle meter (uid -> dealt by source, healed by source, taken) added up over the phases
  function addMeter(into, m) {
    for (const uid in m) {
      const a = into[uid] || (into[uid] = { dmg: {}, heal: {}, taken: 0 }), x = m[uid];
      for (const k of ['dmg', 'heal']) for (const s in x[k]) a[k][s] = (a[k][s] || 0) + x[k][s];
      a.taken += x.taken;
    }
  }
  const sumOf = o => Object.values(o).reduce((t, v) => t + v, 0);
  const DOT_NAMES = new Set(['Burn', 'Poison', 'Bleed']);
  // after a battle: who did how much damage and healing, and from what (skills, and damage over time from Burn,
  // Poison and Bleed, so players see whether those effects pull their weight); collapsed under the rewards
  function meterHtml(b) {
    const m = b.meterAll || {}, rows = b.heroes.map(u => { const x = m[u.uid] || { dmg: {}, heal: {}, taken: 0 }; return { u, x, d: sumOf(x.dmg), h: sumOf(x.heal) }; });
    if (!rows.some(r => r.d || r.h || r.x.taken)) return '';
    const top = Math.max(1, ...rows.map(r => Math.max(r.d, r.h, r.x.taken))), n = v => Math.round(v).toLocaleString('en-US');
    const bar = (v, cls) => `<i class="mt-bar ${cls}" style="width:${Math.max(v ? 2 : 0, Math.round(v / top * 100))}%"></i>`;
    const parts = (o, total) => Object.entries(o).sort((a, c) => c[1] - a[1]).map(([s, v]) => `<li class="${DOT_NAMES.has(s) ? 'dot' : ''}"><span>${esc(s)}</span><b>${n(v)}</b><small>${Math.round(v / total * 100)}%</small></li>`).join('');
    const body = rows.sort((a, c) => c.d - a.d).map(({ u, x, d, h }) => `<details class="mt-row"><summary>${por(u.id)}<span class="mt-nm">${esc(u.name)}${u.alive ? '' : ' <small>(fell)</small>'}</span>
        <span class="mt-bars"><span class="mt-l"><em>Damage</em><b>${n(d)}</b>${bar(d, 'dmg')}</span>${h ? `<span class="mt-l"><em>Healing</em><b>${n(h)}</b>${bar(h, 'heal')}</span>` : ''}<span class="mt-l"><em>Taken</em><b>${n(x.taken)}</b>${bar(x.taken, 'taken')}</span></span></summary>
        ${d ? `<ul class="mt-src"><li class="mt-h">Damage by source</li>${parts(x.dmg, d)}</ul>` : ''}${h ? `<ul class="mt-src"><li class="mt-h">Healing by source</li>${parts(x.heal, h)}</ul>` : ''}</details>`).join('');
    return `<details class="meter"><summary>Damage meter <small>tap a hero for details · damage over time in red</small></summary>${body}</details>`;
  }
  function endBattleView() {
    R.running = false; pending = null; document.body.classList.remove("in-battle"); { const cb = $('#chatbtn'); if (cb && cb.parentElement !== document.body) document.body.insertBefore(cb, $('#chatbox')); } { const t = $("#b-chat"); if (t) t.hidden = true; }
    coachHide(); closeGuidePop();
    $('#battle').hidden = true; $('#screen').hidden = false; $('#tabs').hidden = false; $('#ov').innerHTML = ''; $('#banner').hidden = true;
    $('#battle').classList.remove('siege'); setFig(1);
  }
  // the hero a piece of gear helps most: the biggest gain in power (as a share of the hero's power, so a low-level hero
  // is not passed over) if it replaced what that hero wears in that slot; heroes in a team first, then the rest
  function bestWearer(it) {
    const pool = Object.keys(S.roster).filter(id => C[id] && !onExp(id));
    let best = null;
    for (const ids of [pool.filter(inAnyTeam), pool]) {
      for (const id of ids) {
        const h = S.roster[id], cur = itemsOf(id).find(x => x.slot === it.slot); if (cur === it || !wearOk(id, it)) continue;
        // the role score is a log, so its gain is already a share (0.05 = about 5% better for that hero's role)
        const rest = itemsOf(id).filter(x => x.slot !== it.slot), g = gearFit(id, h, [...rest, it]) - gearFit(id, h, cur ? [...rest, cur] : rest);
        if (g > 0.0005 && (!best || g > best.g)) best = { id, g };
      }
      if (best) break;
    }
    return best;
  }
  // the end of an Auto ×10 run: the gear it dropped as boxes (tap one for its stats, Equip on the hero it suits best,
  // Upgrade, Sell or Lock; or Select several and sell them together), then what the whole run paid. The rest of the last
  // battle's result is hidden (.rep-done), so it all fits on one screen; the boxes scroll.
  let lastRep = null;
  const RSUM = { open: null, sel: new Set(), selecting: false, arm: null };
  function repSummary(r) {
    const s = r && r.sum; if (!s || !s.battles) return '';
    const n = v => v.toLocaleString('en-US'), tot = [`${enIc()} ${n(s.energy)} energy`, `${ic('coin')} +${n(s.silver)} Sigils`, `<span class="aff" style="--c:var(--info)">XP</span> +${n(s.xp)} XP per champion`];
    if (s.pxp) tot.push(`<span class="aff" style="--c:var(--gold)">P</span> +${n(s.pxp)} player XP`);
    for (const [t, c] of Object.entries(s.fs)) tot.push(`${shardIc(t)} +${c} ${esc(K.SHARD[t].name)}`);
    for (const [t, c] of Object.entries(s.st)) tot.push(`${stoneIc(t)} +${c} ${stoneName(t, c)}`);
    for (const [e, c] of Object.entries(s.elx || {})) tot.push(`${elxIc(e)} +${c} ${elxName(e, c)}`);
    for (const id of s.caps) if (C[id]) tot.push(`${por(id)} Captured ${esc(C[id].short)}`);
    const ups = Object.entries(s.ups).filter(([id]) => C[id]).map(([id, l]) => `${esc(C[id].short)} ${l}`).join(', ');
    if (ups) tot.push(`<span class="aff" style="--c:var(--info)">▲</span> Levels now: ${ups}`);
    const items = s.items.map(id => S.inv.find(x => x.id === id)).filter(Boolean).sort((a, b) => b.rar - a.rar || b.lvl - a.lvl);
    for (const id of [...RSUM.sel]) if (!items.some(it => it.id === id && sellable(it))) RSUM.sel.delete(id);
    if (RSUM.open != null && !items.some(it => it.id === RSUM.open)) RSUM.open = null;
    const box = it => `<button type="button" class="rbox rar-${it.rar} ${RSUM.open === it.id ? 'open' : ''} ${RSUM.sel.has(it.id) ? 'sel' : ''}" data-act="rbox" data-item="${it.id}" title="${esc(itemName(it))} · ${esc(K.SETS[it.set].name)}">
        ${gearIcon(it, 'rbox-ic')}${it.lvl ? `<b class="rbox-lv">+${it.lvl}</b>` : ''}${it.owner && C[it.owner] ? `<span class="rbox-own">${por(it.owner)}</span>` : ''}${it.lock ? '<span class="rbox-lock">🔒</span>' : ''}${RSUM.selecting ? `<span class="rbox-chk">${RSUM.sel.has(it.id) ? '✓' : ''}</span>` : ''}</button>`;
    // the piece that is open: its stats and what can be done with it
    const op = RSUM.open != null && items.find(it => it.id === RSUM.open);
    let detail = '<p class="empty-note rdet-hint">Tap a piece to see its stats, equip, upgrade or sell it.</p>';
    if (op && !RSUM.selecting) {
      const w = op.owner ? null : bestWearer(op), maxed = op.lvl >= K.MAX_GEAR_LVL, cost = K.upgradeCost(op), val = K.sellValue(op);
      const eq = op.owner && C[op.owner] ? `<span class="rep-on">Worn by ${esc(C[op.owner].short)}</span>`
        : w ? `<button class="btn small primary" type="button" data-act="repequip" data-item="${op.id}" data-id="${w.id}" title="${esc(C[w.id].short)}'s power goes up by about ${Math.max(1, Math.round(w.g * 100))}%">Equip on ${esc(C[w.id].short)} <small>+${Math.max(1, Math.round(w.g * 100))}%</small></button>`
        : '<small class="empty-note">No upgrade for your heroes</small>';
      const armed = RSUM.arm === 'one' + op.id;
      detail = `<div class="rdet rar-${op.rar}">${gearIcon(op, 'rdet-ic')}<div class="rdet-main"><b class="item-name">${itemNameH(op)}</b> <span class="item-set">${esc(K.SETS[op.set].name)}</span>${itemStatsHtml(op)}</div>
        <div class="rdet-acts">${eq}
          ${maxed ? '<small class="empty-note">Fully upgraded</small>' : `<button class="btn small" type="button" data-act="rupg" data-item="${op.id}" ${S.silver < cost ? 'disabled' : ''}>Upgrade ${ic('coin')} ${n(cost)} <small>${Math.round(K.upgradeChance(op) * 100)}%</small></button>`}
          ${sellable(op) ? `<button class="btn small ${armed ? 'danger' : ''}" type="button" data-act="rsell1" data-item="${op.id}">${armed ? 'Sure? Sell' : 'Sell'} ${ic('coin')} ${n(val)}</button>` : ''}
          <button class="btn small" type="button" data-act="rlock" data-item="${op.id}">${op.lock ? 'Unlock' : 'Lock'}</button></div></div>`;
    }
    const selV = items.filter(it => RSUM.sel.has(it.id)).reduce((t, it) => t + K.sellValue(it), 0), armedAll = RSUM.arm === 'sel';
    const tools = !items.length ? '' : RSUM.selecting
      ? `<button class="btn small" type="button" data-act="rselall">All spare</button><button class="btn small ${armedAll ? 'danger' : 'primary'}" type="button" data-act="rsellsel" ${RSUM.sel.size ? '' : 'disabled'}>${armedAll ? 'Sure? Sell' : 'Sell'} ${RSUM.sel.size} · ${ic('coin')} ${n(selV)}</button><button class="btn small" type="button" data-act="rselmode">Done</button>`
      : `<button class="btn small" type="button" data-act="rselmode">Select to sell</button>`;
    return `<div class="rep-sum"><div class="rep-head"><h3>Gear <small>${items.length} ${items.length === 1 ? 'piece' : 'pieces'} from ${s.battles} ${s.battles === 1 ? 'battle' : 'battles'}${RSUM.selecting ? ' · tap pieces to select' : ''}</small></h3><div class="rep-tools">${tools}</div></div>
      ${items.length ? `<div class="rep-grid">${items.map(box).join('')}</div>${detail}` : '<p class="empty-note">No gear dropped in this run (or it was sold).</p>'}
      <ul class="rep-tot">${tot.map(t => `<li>${t}</li>`).join('')}</ul></div>`;
  }
  // redraw the summary in place (after equipping, upgrading, selling or picking a box)
  function repRefresh() { const el = document.querySelector('.rep-sum'); if (el && lastRep) el.outerHTML = repSummary(lastRep); hud(); }
  // Auto ×10: after a win the next battle starts by itself after a short countdown (Stop keeps the result open);
  // a defeat or the tenth battle ends the run with a summary of the whole run (repSummary)
  let repTimer = null;
  function repStep(cfg, win) {
    const r = cfg.rep, won = r.won + (win ? 1 : 0), more = win && r.k < r.n, box = $('#modal .modal-box');
    const el = document.createElement('div'); el.className = 'rep-bar';
    el.innerHTML = more ? `<b>Auto ×${r.n}</b> · battle ${r.k} of ${r.n} won · next battle in <span>3</span>s <button class="btn small" type="button">Stop</button>`
      : `<b>Auto ×${r.n} finished</b> · ${won} of ${r.k} ${r.k === 1 ? 'battle' : 'battles'} won${win ? '' : ' (stopped after a defeat)'}`;
    box.insertBefore(el, box.querySelector('.rewards'));
    clearInterval(repTimer);
    // when the run is over (ten battles, a defeat, Stop or no energy): its summary, and a big Auto ×10 to go again
    const done = () => {
      lastRep = r; RSUM.open = null; RSUM.sel.clear(); RSUM.selecting = false; RSUM.arm = null; box.classList.add('rep-done'); el.insertAdjacentHTML('afterend', repSummary(r));
      const acts = box.querySelector('.rs-acts'), c = cfg.type === 'stage' ? stEn(cfg.i, cfg.diff) : K.bossEnergy(cfg.n);
      if (acts && !acts.querySelector('[data-go="auto10"]')) acts.insertAdjacentHTML('afterbegin', `<button class="btn rs-big violet" data-act="modal" data-go="auto10" title="Play this ${cfg.type === 'stage' ? 'stage' : 'level'} ten more times on auto"><span class="rs-bi">»</span><span>Auto ×10${enCost(c)}</span></button>`);
    };
    if (!more) { done(); return; }
    let left = 3;
    repTimer = setInterval(() => {
      if ($('#modal').hidden) { clearInterval(repTimer); return; }
      if (document.querySelector('.unlock-pop')) return; // wait while an unlock message is open
      left--; const s = el.querySelector('span'); if (s) s.textContent = left;
      if (left <= 0) { clearInterval(repTimer); const c = cfg.type === 'stage' ? stEn(cfg.i, cfg.diff) : K.bossEnergy(cfg.n); if (energyWait(c)) { el.innerHTML = `<b>Auto ×${r.n} stopped</b> · out of energy (${won} of ${r.k} won). Enough for the next battle in ${fmtMins(energyWait(c))}.`; done(); return; } $('#modal').hidden = true; endBattleView(); B = null; const nx = { n: r.n, k: r.k + 1, won, sum: r.sum }; if (cfg.type === 'stage') startCampaign(cfg.i, nx); else startDungeon(cfg.id, cfg.n, nx); }
    }, 1000);
    el.querySelector('button').addEventListener('click', () => { clearInterval(repTimer); el.innerHTML = `<b>Auto ×${r.n} stopped</b> · ${won} of ${r.k} won`; done(); });
  }
  function modalAction(go) {
    $('#modal').hidden = true;
    clearInterval(repTimer);
    if (go === 'summon1') { doSummon(1); return; }
    if (go === 'summon10') { doSummon(10); return; }
    if (go === 'close') { render(); return; }
    const cfg = B && B.cfg;
    endBattleView(); B = null;
    if (!cfg) { render(); return; }
    if (go.startsWith('open-')) setTab(go.slice(5));
    else if (cfg.type === 'siege') { if (go === 'again') startSiege(cfg.from); else if (go === 'prep') { useTeam('siege'); setTab('team'); } else if (go === 'champs') setTab('team'); else setTab('siege'); }
    else if (go === 'next') { if (cfg.type === 'stage') startCampaign(cfg.i + 1); else if (cfg.type === 'tower') startTower(cfg.ess, cfg.floor + 1); else startDungeon(cfg.id, cfg.n + 1); }
    else if (go === 'again') { if (cfg.type === 'stage') startCampaign(cfg.i); else if (cfg.type === 'tower') startTower(cfg.ess, cfg.floor); else startDungeon(cfg.id, cfg.n); }
    else if (go === 'auto10') { if (cfg.type === 'stage') startCampaign(cfg.i, { n: 10, k: 1, won: 0 }); else startDungeon(cfg.id, cfg.n, { n: 10, k: 1, won: 0 }); }
    else if (go === 'champs') setTab('team');
    else if (go === 'prep' && cfg.type === 'stage') openPrep(cfg.i); // Edit team: the team screen before this stage or level
    else if (go === 'prep' && cfg.type === 'boss') openBossPrep(cfg.id, cfg.n);
    else if (go === 'prep' && cfg.type === 'tower') openTowerPrep(cfg.ess);
    else if (cfg.type === 'arena') setTab('arena');
    else if (cfg.type === 'gboss') { SO.tab = 'guild'; GD.view = 'boss'; setTab('social'); }
    else setTab(cfg.type === 'stage' ? 'campagne' : cfg.type === 'tower' ? 'tower' : 'kerkers');
  }

  // ---------- on a computer: every time the game opens, a notice that it is made for phones (some screens may be laid
  // out wrong in a desktop browser); "I Understand" closes it. Above every other popup (.pc-pop), so the daily reward
  // and the like wait underneath. A computer: a mouse or trackpad that can hover (no touch screen as the main input). ----------
  function showPcNotice() {
    if (IN_FRAME) return; // inside the desktop phone frame (desktop.html) the game already looks as on a phone
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || document.querySelector('.pc-pop')) return;
    const el = document.createElement('div');
    el.className = 'pc-pop'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'pc-pop-h');
    el.innerHTML = `<div class="unlock-card pc-card"><svg class="pc-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 5h3M11 18.5h2"/></svg><span class="tag">Made for mobile</span><h2 id="pc-pop-h">Best played on your phone</h2>
      <p>Fate Forged Heroes is optimised for mobile gaming, not for playing in a desktop browser. On a computer some screens may not be laid out correctly.</p>
      <button class="btn primary" type="button">I Understand</button></div>`;
    document.body.appendChild(el);
    const b = el.querySelector('button'); b.addEventListener('click', () => { SFX.click(); el.remove(); }); b.focus();
  }
  // ---------- boot ----------
  function announceReset() {
    if (!S.wasReset) return false;
    delete S.wasReset; save();
    toast('A new season has begun: everyone starts fresh. Choose your hero!', false, 7000);
    return true;
  }
  // ---- new version notice: build.mjs stamps window.FFH_BUILD into the page and writes the same id to /version.json.
  // A tab left open for days finds a newer build there and shows a banner (never during a battle: render() and the
  // battle start repaint it); tapping it saves, uploads the save and reloads. Offline or opened from a file: silent.
  let newBuild = '';
  async function checkVersion() {
    if (!window.FFH_BUILD || newBuild || location.protocol === 'file:') return;
    try {
      const r = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const v = await r.json();
      if (v && v.build && v.build !== window.FFH_BUILD) { newBuild = v.build; paintVersion(); }
    } catch (e) { /* no network: try again later */ }
  }
  // a newer build: a popup over the whole game (only "Reload now"), shown as soon as no battle is running
  function paintVersion() {
    const el = $('#newver'); if (!el) return;
    const show = !!newBuild && !B, was = !el.hidden;
    el.hidden = !show;
    if (show && !was) { setMenu(false); requestAnimationFrame(() => { const b = $('#newver-go'); if (b) b.focus(); }); }
  }
  async function reloadForVersion() {
    const b = $('#newver-go'); if (B || !b || b.disabled) return;
    b.disabled = true; b.textContent = 'Saving and reloading…';
    save();
    const cl = window.FFH_CLOUD;
    if (cl && cl.upload) await Promise.race([cl.upload().catch(() => {}), new Promise(r => setTimeout(r, 4000))]);
    location.reload();
  }
  function start(data) {
    S = load(data && data.S);
    fixup(S);
    if (window.FFH_CLOUD) window.FFH_CLOUD.attach({
      get: () => S,
      set: ns => { const m = migrate(ns); if (!m) return; S = fixup(m); save(); if (!B) render(); else hud(); announceReset(); },
      toast: msg => toast(msg),
      paint: () => paintAccount(),
      hasProgress: () => !!S && !noHero() && S.cleared >= 0, // a guest with something to lose (the sign-in screen then says "Save your progress")
      rewardHtml: () => (S && !S.lk ? linkRw() : ''), // the Crystals for linking, on that screen
      flush: () => save(), // the save in local storage up to date (before switching accounts)
      busy: () => !!B, // in a battle: no switching accounts
      // short description of any save (also an older version), for the "which save to keep" dialog
      summary: s => {
        const p = s.p || {}, heroes = Object.keys(s.roster || {}).filter(id => C[id]).length;
        const top = Object.entries(s.roster || {}).filter(([id]) => C[id]).sort((a, b) => b[1].lvl - a[1].lvl)[0];
        return `<b>${esc(p.name || 'Adventurer')}</b> · player level ${p.lvl || 1}<br>${(s.cleared ?? -1) + 1} / ${K.STAGES.length} stages · ${heroes} heroes${top ? ` · best: ${esc(C[top[0]].short)} lv ${top[1].lvl}` : ''}<br>${(s.silver || 0).toLocaleString('en-US')} Sigils`;
      },
    });
    save();
    $('#logo').src = LOGO_URL;
    $('#ic-coin').src = SIGIL_ART; $('#ic-coin').className = 'sigil-ic'; $('#ic-shard').src = SHARD_ART.fate0; $('#ic-shard').className = 'shard-ic'; $('#ic-stone').src = STONE_ART; $('#ic-stone').className = 'shard-ic'; if (typeof CRYSTAL_ART !== 'undefined') $('#ic-crystal').src = CRYSTAL_ART; if (typeof ENERGY_ART !== 'undefined') $('#ic-energy').src = ENERGY_ART;
    render();
    showPcNotice(); // on a computer: the game is made for phones
    // new mail (gifts, friend requests, arena rewards) is checked every 2 minutes while the game is open
    paintMail(); setInterval(() => { if (!B && document.visibilityState === 'visible') socialLoad(); }, 120000);
    // a newer build on the server: checked every 5 minutes and whenever the tab is shown again
    $('#newver-go').addEventListener('click', reloadForVersion);
    // the popup blocks the game: keys go nowhere else while it is open (Tab stays on its button)
    document.addEventListener('keydown', e => { const el = $('#newver'); if (el && !el.hidden && e.target !== $('#newver-go')) { e.preventDefault(); e.stopPropagation(); $('#newver-go').focus(); } }, true);
    setInterval(() => { if (document.visibilityState === 'visible') checkVersion(); }, 300000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });
    if (announceReset()) return;
    const m7 = S.migrated7; delete S.migrated7;
    if (S.migrated) { delete S.migrated; delete S.migrated4; delete S.migrated5; delete S.migrated6; save(); toast('Your progress was carried over. Your champions were replaced by the new heroes.'); }
    else if (S.migrated4) { delete S.migrated4; delete S.migrated5; save(); toast('New combat system: Essences, Speed and the Boss Hall. Your progress was kept.'); }
    else if (S.migrated5) { delete S.migrated5; delete S.migrated6; save(); toast('The campaign now has 10 chapters of 7 stages. Your progress was moved to the matching stage.'); }
    else if (S.migrated6) { delete S.migrated6; save(); toast('The Fate Altar is open: your crown shards are now Fate Shards, and you got a Greater Fate Shard.'); }
    else if (m7) { save(); toast(`New: player levels. Win battles to level up. The Fate Altar opens at level ${PLAYER_UNLOCK.altaar}, the Boss Hall after Chapter ${ROMAN[UNLOCKS.kerkers.ch - 1]}. Tap your avatar for your profile.`, false, 7000); }
  }
  const boot = data => SPR.preload().then(() => { start(data); if (S.hero) SPR.loadSheet(S.hero.id); if (S && S.team) S.team.forEach(id => SPR.loadHi(id)); }); // the own hero's moves and the team's sharp art load in the background
  boot({});
})();

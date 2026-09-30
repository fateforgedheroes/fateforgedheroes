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

  // ---------- state ----------
  // player profile: account level gates the Fate Altar and the Boss Hall
  const PLAYER_UNLOCK = { altaar: 5, kerkers: 10, arena: 12 };
  const UNLOCK_NAME = { altaar: 'Fate Altar', kerkers: 'Boss Hall', arena: 'Arena' };
  // player XP per level: steeper than before (level 10, the Boss Hall, now takes ~75-130 battles instead of ~25)
  const pxNeed = l => 60 * l + 12 * l * l;
  // per cleared stage / Boss Hall level
  const playerWinXp = (lvl, first, boss) => Math.round((40 + lvl * 6) * (first ? 1.5 : 1) * (boss ? 1.2 : 1));
  const levelSilver = l => 100 * l;
  const RENAME_COST = 2500; // the first name change is free
  const renameCost = () => (S.p.renames ? RENAME_COST : 0);
  function newPlayer() { return { name: 'Adventurer', avatar: null, renames: 0, lvl: 1, xp: 0, st: { won: 0, lost: 0, bossWon: 0, summons: 0 } }; }
  // fields added to v7 after release: fill them in on load (a player who already changed their name used the free change)
  // Campaign difficulties (K.DIFFS): S.cleared = Easy progress (the old Normal), S.dcl[d] = highest stage cleared on difficulty d >= 1,
  // S.diff = selected difficulty. The old Brutal mode (S.hard, S.clearedHard) carries over as Normal progress.
  // S.seen: unlock messages already shown (speed 3×/5×, Fate Altar, Boss Hall); existing players don't get old ones again.
  function fixup(s) {
    if (s.p.renames == null) s.p.renames = s.p.name !== 'Adventurer' ? 1 : 0; s.fodder = s.fodder || {};
    if (!s.dcl) { s.dcl = [null, s.clearedHard ?? -1, -1, -1, -1]; s.diff = 0; delete s.hard; delete s.clearedHard; }
    if (!s.seen) {
      s.seen = {};
      for (const [sp, at] of SPEED_UNLOCK) if (sp > 2 && s.cleared + 1 >= at) s.seen['spd' + sp] = true;
      for (const k in PLAYER_UNLOCK) if (s.p.lvl >= PLAYER_UNLOCK[k]) s.seen[k] = true;
    }
    return s;
  }
  const clearedOn = d => (d ? S.dcl[d] ?? -1 : S.cleared);
  function newHero(id) { return { lvl: 1, xp: 0, stars: K.baseStars(id), sk: C[id].skills.map(() => 0) }; }
  // A new save has no heroes yet: the player first picks one of K.STARTERS (needStarter), the rest is earned in Chapter I.
  function fresh() {
    const s = { v: 7, reset: RESET, p: newPlayer(), silver: 400, fs: { fate: 3, greater: 1, ancient: 0, mythic: 0, legendary: 0 }, stones: 0, roster: {}, team: [], needStarter: true, inv: [], nid: 1, cleared: -1, dcl: [null, -1, -1, -1, -1], diff: 0, seen: {}, bh: {}, bhSel: {}, bhCur: K.BOSS_ORDER[0], auto: false, speed: 1, sound: true };
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
  function save() { S.savedAt = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } if (window.FFH_CLOUD) window.FFH_CLOUD.queue(); }

  // ---------- sound ----------
  const SFX = (() => {
    let ctx = null, master = null, volK = 1;
    function ac() {
      if (!S || !S.sound) return null;
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.2; master.connect(ctx.destination); } catch (e) { return null; } }
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
    return api;
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
  const gearIcon = (it, cls) => `<img class="gear-ic ${cls || ''}" src="${gearArt(it.slot, it.rar, it.id)}" alt="">`;
  // which stats matter most per role, used by "Upgrade all" to upgrade the most important gear first
  const GEAR_PRI = {
    Tank: { hp: 3, hpP: 3, def: 3, defP: 3, res: 2, spd: 2, acc: 1, atk: 0.5, atkP: 0.5, crit: 0.3, cdmg: 0.3 },
    Warrior: { atk: 3, atkP: 3, hp: 2, hpP: 2, def: 2, defP: 2, crit: 2, cdmg: 2, spd: 2, acc: 1, res: 1 },
    Assassin: { atk: 3, atkP: 3, crit: 3, cdmg: 3, spd: 2, acc: 1, hp: 1, hpP: 1, def: 0.5, defP: 0.5, res: 0.5 },
    Ranger: { atk: 3, atkP: 3, crit: 3, cdmg: 3, spd: 2, acc: 1.5, hp: 1, hpP: 1, def: 0.5, defP: 0.5, res: 0.5 },
    Mage: { atk: 3, atkP: 3, crit: 2, cdmg: 2, acc: 2.5, spd: 2, hp: 1, hpP: 1, def: 0.5, defP: 0.5, res: 1 },
    Support: { hp: 3, hpP: 3, spd: 3, def: 2, defP: 2, res: 2, acc: 1, atk: 1, atkP: 1, crit: 0.5, cdmg: 0.5 },
    Controller: { acc: 3, spd: 3, hp: 2, hpP: 2, atk: 1.5, atkP: 1.5, def: 1.5, defP: 1.5, res: 1.5, crit: 1, cdmg: 1 },
  };
  function gearPri(heroId, it) {
    const c = C[heroId], a = GEAR_PRI[c.role] || GEAR_PRI.Warrior, b = GEAR_PRI[c.role2];
    const w = k => b ? (a[k] || 0) * 0.75 + (b[k] || 0) * 0.25 : a[k] || 0;
    return w(it.main) * 2 + it.subs.reduce((s, x) => s + w(x[0]) * 0.5, 0) + it.rar * 0.1;
  }
  // upgrades the hero's gear, most important item first, each as far as it goes, until the Sigils run out
  function upgradeAll(heroId) {
    const list = itemsOf(heroId).sort((x, y) => gearPri(heroId, y) - gearPri(heroId, x));
    let ok = 0, fail = 0, spent = 0;
    for (const it of list) {
      while (it.lvl < K.MAX_GEAR_LVL && S.silver >= K.upgradeCost(it)) {
        const cost = K.upgradeCost(it); S.silver -= cost; spent += cost;
        if (Math.random() < K.upgradeChance(it)) { it.lvl++; K.upgradeMilestone(it); ok++; } else fail++;
      }
    }
    return { ok, fail, spent };
  }
  // gear rarities as coloured words, e.g. "Rare / Epic"
  const rarsHtml = rars => rars.map(r => `<b class="rar-${r} rartxt">${K.RARITIES[r]}</b>`).join(' / ');
  const sigils = n =>`${ic('coin')} ${n.toLocaleString('en-US')} Sigils`;
  const itemsOf = id => S.inv.filter(it => it.owner === id);
  const itemName = it => `${K.RARITIES[it.rar]} ${K.SLOT_NAMES[it.slot].toLowerCase()}${it.lvl ? ' +' + it.lvl : ''}`;
  const starStr = (n, max) => `<span class="stars" title="${n} sterren">${'★'.repeat(n)}<i>${'★'.repeat((max || K.MAX_STARS) - n)}</i></span>`;
  function itemStatsHtml(it) {
    return `<ul class="item-stats">${K.gearStats(it).map(([k, v], i) => `<li class="${i === 0 ? 'main' : ''}">${K.fmtStat(k, v)}</li>`).join('')}</ul>`;
  }
  function statsOf(id) { return K.heroStats(id, S.roster[id], itemsOf(id)); }
  function power(st) { return Math.round(st.hp * 0.12 + st.atk * 1.8 + st.def * 1.3 + st.spd * 4 + st.crit * 5 + st.cdmg * 2 + (st.acc + st.res) * 0.8); }
  const teamPower = () => S.team.reduce((s, id) => s + power(statsOf(id)), 0);
  let toastT;
  function toast(msg, bad, ms) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms || 2400);
  }
  function hud() {
    $('#silver').textContent = S.silver.toLocaleString('en-US');
    const totalFs = K.FATE_SHARDS.reduce((t, f) => t + (S.fs[f.id] || 0), 0);
    $('#shards').textContent = totalFs; $('#shards').parentElement.title = 'Fate Shards: ' + K.FATE_SHARDS.map(f => `${f.name} ${S.fs[f.id] || 0}`).join(', '); $('#stones').textContent = S.stones;
    const sb = $('#sound'); sb.classList.toggle('on', S.sound); sb.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
    sb.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 6h3l4-3v10l-4-3h-3z"/><path d="${S.sound ? 'M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6.3 6.3 0 0 1 0 9' : 'M11 6l4 4M15 6l-4 4'}"/></svg><span class="lbl">${S.sound ? 'Sound on' : 'Sound off'}</span>`;
    document.querySelector('#tabs [data-tab="altaar"] .dot').hidden = !(totalFs > 0 && unlocked('altaar'));
    for (const t in PLAYER_UNLOCK) document.querySelector(`#tabs [data-tab="${t}"]`)?.classList.toggle('locked', !unlocked(t));
    paintAccount();
  }
  const unlocked = t => !PLAYER_UNLOCK[t] || S.p.lvl >= PLAYER_UNLOCK[t];
  const avatarId = () => (S.p.avatar && S.roster[S.p.avatar] ? S.p.avatar : S.team[0]);
  function paintAccount() {
    // no hero yet (starter choice): a plain person icon instead of an avatar
    if (!avatarId()) { $('#account').innerHTML = `<svg class="acc-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/></svg><span class="acc-lv">Lv ${S.p.lvl}</span>`; return; }
    const b = $('#account'), cl = window.FFH_CLOUD && window.FFH_CLOUD.info();
    const dot = cl && cl.email ? `<i class="acc-dot ${cl.status === 'error' ? 'err' : cl.status === 'syncing' ? 'sync' : ''}"></i>` : '';
    b.innerHTML = `${por(avatarId(), 1, 'acc-av')}<span class="acc-lv">Lv ${S.p.lvl}</span><span class="acc-name">${esc(S.p.name)}</span>${dot}`;
    b.title = `${S.p.name} · player level ${S.p.lvl}` + (cl && cl.email ? (cl.status === 'error' ? ' · cloud save failed' : ' · saved to your account') : cl && cl.enabled ? ' · not signed in' : '');
    if (tab === 'profiel' && !B && !$('#screen').hidden && !$('#screen input:focus')) $('#screen').innerHTML = profileHtml();
  }
  function lockedHtml(t, lede) {
    const need = PLAYER_UNLOCK[t];
    return `<div class="section-head"><div><h2>${UNLOCK_NAME[t]}</h2><p class="lede">${lede}</p></div></div>
      <div class="lockbox"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>
        <div><h3>Unlocks at player level ${need}</h3><p class="empty-note">You are level ${S.p.lvl}. Win battles in the campaign to earn player XP.</p>
        <div class="xpbar"><i style="width:${Math.round(levelProgress(need) * 100)}%"></i></div>
        <button class="btn primary" data-act="tab" data-tab="campagne">To the campaign</button></div></div>`;
  }
  // share of the XP between level 1 and level `to` that the player already has
  function levelProgress(to) {
    let have = S.p.xp, total = 0;
    for (let l = 1; l < to; l++) { total += pxNeed(l); if (l < S.p.lvl) have += pxNeed(l); }
    return Math.min(1, have / total);
  }

  // ---------- tabs ----------
  let tab = 'home', selChamp = 'draelyn', invSlot = null, champTab = 'stats';

  // ----- Home: the homebase map is the main menu. Boxes are image pixels of HOME_ART (1536x1024): the building and
  // its name plate. Zones without `go` are "Coming soon": their names are covered, so the buildings can become any mode later.
  const HOME_W = 1536, HOME_H = 1024;
  const HOME_ZONES = [
    { go: 'kerkers', label: 'Boss Hall', box: [20, 0, 450, 330], plate: [150, 243, 222, 44] },
    { go: 'arena', label: 'Arena', box: [500, 110, 320, 175], plate: [560, 283, 176, 50] },
    { go: 'profiel', label: 'Town Hall: your profile', box: [830, 20, 320, 265], plate: [864, 283, 214, 50] },
    { go: 'altaar', label: 'Fate Altar', box: [1190, 30, 346, 275], plate: [1244, 301, 238, 50] },
    { box: [90, 320, 380, 215], plate: [206, 533, 178, 50] },
    { go: 'champions', label: 'Heroes & Gear', box: [900, 330, 340, 195], plate: [950, 524, 250, 46] },
    { box: [1250, 400, 286, 147], plate: [1308, 545, 200, 50] },
    { box: [0, 580, 360, 223], plate: [72, 803, 226, 50] },
    { box: [380, 600, 320, 211], plate: [453, 809, 192, 50] },
    { go: 'campagne', label: 'Campaign', box: [860, 600, 330, 238], plate: [945, 838, 210, 46] },
    { box: [1200, 660, 336, 204], plate: [1273, 862, 220, 50] },
  ];
  let homeScroll = null;
  function homeHtml() {
    const pc = (v, d) => (v / d * 100).toFixed(3) + '%';
    const at = ([x, y, w, h]) => `left:${pc(x, HOME_W)};top:${pc(y, HOME_H)};width:${pc(w, HOME_W)};height:${pc(h, HOME_H)}`;
    const shardsReady = K.FATE_SHARDS.some(f => (S.fs[f.id] || 0) > 0);
    const zones = HOME_ZONES.map(z => {
      // one button covers the building and its plate
      const [bx, by, bw, bh] = z.box, [px, py, pw, ph] = z.plate, x0 = Math.min(bx, px), y0 = Math.min(by, py);
      const area = [x0, y0, Math.max(bx + bw, px + pw) - x0, Math.max(by + bh, py + ph) - y0];
      if (!z.go) return `<button type="button" class="hz soon" style="${at(area)}" data-act="soon" aria-label="Coming soon"></button>
        <span class="hz-plate" style="${at(z.plate)}"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>Coming soon</span>`;
      const need = PLAYER_UNLOCK[z.go], locked = need && !unlocked(z.go);
      const badge = locked ? `<span class="hz-badge lock" style="left:${pc(px + pw - 6, HOME_W)};top:${pc(py - 14, HOME_H)}">Lv ${need}</span>`
        : z.go === 'altaar' && shardsReady ? `<span class="hz-badge dot" style="left:${pc(px + pw - 10, HOME_W)};top:${pc(py - 8, HOME_H)}"></span>` : '';
      return `<button type="button" class="hz ${locked ? 'locked' : ''}" style="${at(area)}" data-act="go" data-go="${z.go}" aria-label="${z.label}${locked ? ` (unlocks at player level ${need})` : ''}" title="${z.label}"></button>${badge}`;
    }).join('');
    return `<div class="home-map"><div class="home-img"><img src="${HOME_ART}" alt="Homebase: tap a building">${zones}</div></div>`;
  }
  // every screen but Home gets a way back; Heroes and Team share a switch (there is no Team building)
  function backBar() {
    const sw = tab === 'champions' || tab === 'team' ? `<div class="seg" role="group" aria-label="Heroes or team"><button type="button" data-act="tab" data-tab="champions" aria-pressed="${tab === 'champions'}">Heroes</button><button type="button" data-act="tab" data-tab="team" aria-pressed="${tab === 'team'}">Team</button></div>` : '';
    return `<div class="backbar"><button type="button" class="btn small" data-act="tab" data-tab="home">‹ Home</button>${sw}</div>`;
  }
  function setTab(t) {
    tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'));
    render();
    if (t === 'arena') arenaEnter();
  }
  function render() {
    hud();
    const el = $('#screen');
    if (S.needStarter) { el.innerHTML = starterHtml(); paintDungeonArt(); return; }
    if (tab === 'home') {
      el.innerHTML = homeHtml();
      // phones: the map scrolls sideways; start in the middle, later keep where the player left it
      const map = el.querySelector('.home-map');
      map.scrollLeft = homeScroll ?? (map.scrollWidth - map.clientWidth) / 2;
      map.addEventListener('scroll', () => { homeScroll = map.scrollLeft; }, { passive: true });
      return;
    }
    el.innerHTML = backBar() + (tab === 'campagne' ? campaignHtml() : tab === 'kerkers' ? dungeonsHtml() : tab === 'altaar' ? altarHtml() : tab === 'team' ? teamHtml() : tab === 'profiel' ? profileHtml() : tab === 'arena' ? arenaHtml() : champsHtml());
    if (tab === 'kerkers') paintDungeonArt();
    if (tab === 'altaar') paintAltar();
    // on phones the roster is a horizontal strip: keep the selected hero in view after every re-render
    const sel = tab === 'champions' && el.querySelector('.champ-layout .card.sel');
    if (sel) { const strip = sel.parentElement; strip.scrollLeft += sel.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - sel.offsetWidth) / 2; }
  }

  // ----- campaign -----
  const isStageCfg = cfg => cfg.type === 'stage';
  const stageName = i => { const st = K.STAGES[i]; return `Chapter ${ROMAN[st.chapter]} · Stage ${st.n + 1}`; };
  const dropName = st => st.slot ? K.SLOT_NAMES[st.slot] : 'Random gear';
  function campaignHtml() {
    const d = S.diff || 0, D = K.DIFFS[d], hard = d > 0, cleared = clearedOn(d), next = cleared + 1;
    const strip = S.team.map(id => `<div class="mini rar-${C[id].rar}" title="${esc(C[id].name)}">${por(id)}<span>Lv ${S.roster[id].lvl}</span></div>`).join('');
    const maxChap = Math.min(K.CHAPTERS.length - 1, K.STAGES[Math.min(next, K.STAGES.length - 1)].chapter);
    const chap = Math.min(S.chap ?? maxChap, maxChap);
    const tile = (st, i) => {
      const state = i <= cleared ? 'cleared' : i === next ? 'next' : 'locked';
      const label = state === 'cleared' ? 'Cleared' : state === 'next' ? 'Next' : 'Locked';
      const lvl = K.diffLvl(st, d);
      const rw = [];
      if (!hard && st.unlock && !S.roster[st.unlock]) rw.push(`<span class="rw">${por(st.unlock)}${esc(C[st.unlock].short)}</span>`);
      if (i > cleared) rw.push(`<span class="rw" title="${st.n === 6 ? 'Greater Fate Shard' : 'Fate Shard'}">${shardIc(st.n === 6 ? 'greater' : 'fate')}+1</span>`);
      return `<button class="stage ${state} ${st.boss ? 'bossst' : ''}" data-act="play" data-stage="${i}" ${state === 'locked' ? 'disabled' : ''}>
        <div class="st-top"><span class="st-n">Stage ${st.n + 1}</span><span class="st-state tag">${label}</span></div>
        <div class="st-foes">${st.foes.map(f => `<img class="spr ${K.BOSSES[f] ? 'bossimg' : ''}" src="${SPR.url(f, 1, true)}" alt="${esc(E[f].name)}" title="${esc(E[f].name)}">`).join('')}</div>
        <div class="st-meta"><span class="st-ess">${[...new Set(st.phases.flat().map(f => E[f].aff))].map(affChip).join('')}</span><span class="pill">Lv ${lvl}</span><span class="pill">${K.PHASES} phases</span><span class="pill">${st.phases.flat().length} foes</span></div>
        ${st.boss ? `<div class="st-boss">Boss: ${esc(st.boss)}</div>` : ''}
        <div class="st-drop"><span class="st-dic">${st.slot ? `<img class="gear-ic" src="${gearArt(st.slot, D.rars[D.rars.length - 1], 0)}" alt="">` : '<b>?</b>'}</span><span class="st-dtx"><b>${dropName(st)}</b><small>${K.SETS[st.set].name}</small></span></div>
        <div class="st-rars">${D.rars.map(r => `<span class="rpill rar-${r}">${K.RARITIES[r]}</span>`).join('')}</div>
        ${rw.length ? `<div class="st-reward"><span>First clear:</span>${rw.join('')}</div>` : ''}</button>`;
    };
    const diffOk = i => !i || clearedOn(i - 1) >= K.STAGES.length - 1;
    const chapBtns = K.CHAPTERS.map((ch, c) => {
      const done = K.STAGES.filter(st => st.chapter === c).filter(st => K.STAGES.indexOf(st) <= cleared).length;
      return `<button type="button" class="${c === chap ? 'sel' : ''} ${done === 7 ? 'done' : ''}" data-act="chap" data-n="${c}" ${c > maxChap ? 'disabled' : ''} title="${esc(ch.name)} · ${done}/7">${ROMAN[c]}</button>`;
    }).join('');
    const idx = K.STAGES.map((st, i) => i).filter(i => K.STAGES[i].chapter === chap);
    const cdone = idx.filter(i => i <= cleared).length;
    return `<div class="${hard ? 'hardmode diff-' + D.id : ''}"><div class="camp-head"><div><h2>Campaign</h2><p class="lede">Ten chapters of seven stages, each fought in ${K.PHASES} phases: your survivors march on with their HP and recover 15% between phases. Every stage drops its own gear slot; the chapter boss waits in the last phase of stage 7. Replay cleared stages to farm the slot you need.</p>
        <div style="margin-top:10px" class="seg diffs" role="group" aria-label="Difficulty">${K.DIFFS.map((x, i) => `<button type="button" data-act="mode" data-diff="${i}" aria-pressed="${i === d}" ${diffOk(i) ? '' : `disabled title="Clear every stage on ${K.DIFFS[i - 1].name} first"`}>${diffOk(i) ? '' : LOCK_SVG}${x.name}</button>`).join('')}</div>
        <p class="diff-note">${esc(D.name)}: ${d ? `enemies level ${K.diffLvl(K.STAGES[0], d)}–${K.diffLvl(K.STAGES[K.STAGES.length - 1], d)} and much stronger. ` : ''}Gear drops: ${rarsHtml(D.rars)} only.${d < K.DIFFS.length - 1 ? ` Clear all ${K.STAGES.length} stages to open ${K.DIFFS[d + 1].name}.` : ''}</p></div>
      <div class="teamstrip">${strip}<div class="power"><span class="tag">Team power</span><b>${teamPower().toLocaleString('en-US')}</b></div><button class="btn small" data-act="tab" data-tab="team">Edit team</button></div></div>
      <div class="chapters" role="group" aria-label="Chapter"><span class="tag">Chapter</span>${chapBtns}</div>
      <div class="area-label tag">Chapter ${ROMAN[chap]} · ${esc(K.CHAPTERS[chap].name)} · ${cdone}/7 cleared</div>
      <p class="chap-desc">${esc(K.CHAPTERS[chap].desc)}</p>
      <div class="chap-set"><span class="tag">Chapter set</span> <b>${K.SETS[K.CHAPTERS[chap].set].name}</b> · ${K.SETS[K.CHAPTERS[chap].set].desc}</div>
      <div class="stages">${idx.slice(0, 6).map(i => tile(K.STAGES[i], i)).join('')}</div>
      <div class="stages boss-row">${tile(K.STAGES[idx[6]], idx[6])}</div>
      <div class="help">
        <div><h3>Essences</h3><div class="tri">${['Ember', 'Verdant', 'Storm', 'Frost', 'Radiant', 'Umbral', 'Ember'].map(affChip).join('<span class="arr">›</span>')}</div>
        <p><b>Strong Hit</b>: +20% damage, stronger debuffs, 2 Break damage. <b>Weak Hit</b>: −25% damage, no crits, half debuff chance, no Break damage. ${affChip('Aether')} Aether is neutral and always lands a Normal Hit.</p></div>
        <div><h3>Speed and bosses</h3><p>Every unit fills its turn meter by its Speed; faster champions act more often. Bosses have a <b>Break Meter</b>: hit them with Strong Hits to cause an <b>Affinity Break</b>, stunning them for 2 turns while they take 15% more damage.</p></div>
        <div><h3>Getting stronger</h3><p>Level your champions to their maximum and ascend them with Ascension Stones for an extra star. Duplicate heroes from the Fate Altar upgrade their skills. Legendary heroes are far stronger, and only the Fate Altar has them.</p></div>
        <div><h3>Gear and sets</h3><p>Six gear slots per champion. Two or four pieces from the same set grant a bonus. Every chapter drops its own set; the Boss Hall has exclusive sets such as Fury, Nightshard, Vengeance and Ashcurse.</p></div>
      </div></div>`;
  }

  // ----- boss hall -----
  const bossOpen = i => i === 0 ? unlocked('kerkers') : (S.bh[K.BOSS_ORDER[i - 1]] || 0) >= 1;
  function dungeonsHtml() {
    if (!unlocked('kerkers')) return lockedHtml('kerkers', 'Twenty-five bosses, each with phases, a passive and a Break Meter. Each boss has ten levels and drops gear from its own sets.');
    const cur = S.bhCur && K.BOSSES[S.bhCur] ? S.bhCur : K.BOSS_ORDER[0];
    const ci = K.BOSS_ORDER.indexOf(cur), B0 = K.BOSSES[cur];
    const list = K.BOSS_ORDER.map((id, i) => {
      const bo = K.BOSSES[id], open = bossOpen(i), best = S.bh[id] || 0;
      return `<button type="button" class="bh-row ${id === cur ? 'sel' : ''} ${open ? '' : 'locked'}" data-act="bhsel" data-id="${id}">
        <img class="spr" src="${SPR.url(id, 1)}" alt=""><span class="bh-nm">${open ? esc(bo.name) : '???'}</span>${affChip(bo.aff)}<span class="bh-prog">${best}/${K.BOSS_LEVELS}</span></button>`;
    }).join('');
    const open = bossOpen(ci), best = S.bh[cur] || 0;
    const sel = Math.min(S.bhSel[cur] || best + 1, K.BOSS_LEVELS, best + 1);
    const lv = K.bossLvl(ci, sel);
    const lvls = Array.from({ length: K.BOSS_LEVELS }, (_, i) => `<button type="button" class="${i < best ? 'done' : ''} ${i + 1 === sel ? 'sel' : ''}" data-act="bhlvl" data-id="${cur}" data-n="${i + 1}" ${!open || i > best ? 'disabled' : ''} aria-label="Level ${i + 1}">${i + 1}</button>`).join('');
    const sets = K.bossSets(ci).map(k => `<div><b>${K.SETS[k].name}</b> <span>${K.SETS[k].desc}</span></div>`).join('');
    const beaten = Object.keys(K.ESSENCES.reduce((o, e) => (K.BEATS[e] === B0.aff ? (o[e] = 1) : 0, o), {}));
    const detail = open ? `<div class="dg">
        <div class="dg-art bh-art"><canvas data-bg="${AREA_OF[B0.aff]}" width="480" height="270"></canvas><img class="spr" src="${SPR.url(cur, 2)}" alt="${esc(B0.name)}"></div>
        <div class="dg-body"><div class="section-head" style="margin:0"><h3 style="margin:0">${esc(B0.name)}</h3><span class="tag">${best}/${K.BOSS_LEVELS} cleared</span></div>
          <div class="tags">${affChip(B0.aff)} ${B0.aff} · ${esc(B0.arch)} · ${B0.nPhases} boss phases · Break ${B0.breakMax}</div>
          <p>${K.PHASES - 1} phases of ${K.bossPhases(cur, 1)[0].length} minions first, then the boss.</p>
          <p><b>${esc(B0.passiveName)}</b>: ${esc(B0.passiveDesc)}</p>
          <p>${B0.aff === 'Aether' ? 'No essence has the advantage here.' : `Strong against it: ${beaten.map(e => affChip(e) + ' ' + e).join(', ')}.`}</p>
          <div class="setlist">${sets}</div>
          <div class="lvls" role="group" aria-label="Level">${lvls}</div>
          <div class="section-head" style="margin:0"><span class="empty-note">Level ${sel} · boss level ${lv}</span><button class="btn primary" data-act="bhplay" data-id="${cur}" data-n="${sel}">Challenge</button></div>
        </div></div>`
      : `<div class="dg locked"><div class="dg-body"><h3 style="margin:0">Locked</h3><p class="empty-note">${ci === 0 ? `Reach player level ${PLAYER_UNLOCK.kerkers} to open the Boss Hall.` : `Defeat ${esc(K.BOSSES[K.BOSS_ORDER[ci - 1]].name)} on level 1 first.`}</p></div></div>`;
    return `<div class="section-head"><div><h2>Boss Hall</h2><p class="lede">Twenty-five bosses, each with phases, a passive and a Break Meter. Beat a boss once to unlock the next. Each boss has ten levels and drops gear from its own sets.</p></div></div>
      <div class="bh"><div class="bh-list">${list}</div><div>${detail}</div></div>`;
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
          <div class="pity"><span class="tag">Epic or better guaranteed in ${K.PITY_EPIC - (S.pity || 0)} ${K.PITY_EPIC - (S.pity || 0) === 1 ? 'summon' : 'summons'}</span><small class="empty-note">Only Ancient, Mythic and Legendary Fate Shards count towards this.</small><div class="bar"><i style="width:${Math.round((S.pity || 0) / K.PITY_EPIC * 100)}%"></i></div></div>
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
      const st = K.STAGES.findIndex(s => s.unlock === id);
      const where = st >= 0 ? `Ch ${ROMAN[K.STAGES[st].chapter]}-${K.STAGES[st].n + 1}` : '';
      return `<div class="card lockedc rar-${c.rar}" title="${st >= 0 ? 'Earn in ' + stageName(st) + ' or at the Fate Altar' : 'Fate Altar only'}">${por(id)}<span class="nm">???</span><span class="sub">${where ? where + ' / Fate Altar' : 'Fate Altar'}</span></div>`;
    }
    const cls = [opts.sel ? 'sel' : '', opts.inteam ? 'inteam' : ''].join(' ');
    const slot = S.team.indexOf(id) + 1; // --tord: team members first in the phone strip (see CSS)
    return `<button class="card rar-${c.rar} ${cls}" data-act="${opts.act}" data-id="${id}"${slot ? ` data-slot="${slot}" style="--tord:${slot - 5}"` : ''}>${affChip(c.aff)}<span class="lv" title="Level ${S.roster[id].lvl}">${S.roster[id].lvl}</span>${por(id)}<span class="nm">${esc(c.short)}</span>${starStr(S.roster[id].stars, K.maxStars(id))}<span class="sub">${roleStr(c)}</span></button>`;
  }
  const sortedIds = () => [...K.CHAMP_ORDER, ...K.CAPTURE_ORDER.filter(id => S.roster[id])].sort((a, b) => (!!S.roster[b] - !!S.roster[a]) || C[b].rar - C[a].rar || ((S.roster[b]?.lvl || 0) - (S.roster[a]?.lvl || 0)));
  function teamHtml() {
    const slots = [0, 1, 2, 3].map(i => {
      const id = S.team[i];
      if (!id) return `<div class="slot"><small>Empty</small></div>`;
      return `<button class="slot filled rar-${C[id].rar}" data-act="toggle" data-id="${id}" title="Click to remove from your team"><span class="lv" title="Level ${S.roster[id].lvl}">${S.roster[id].lvl}</span>${por(id)}<b>${esc(C[id].short)}</b>${starStr(S.roster[id].stars, K.maxStars(id))}<small>${roleStr(C[id])}</small><small>Power ${power(statsOf(id)).toLocaleString('en-US')}</small></button>`;
    }).join('');
    const list = filteredIds(), owned = list.filter(id => S.roster[id]).length;
    return `<div class="section-head"><div><h2>Team</h2><p class="lede">Choose up to four champions. Speed decides who acts first. A mix of damage, protection and healing beats four attackers, and bringing several essences means you always have a Strong Hit.</p></div><div class="power"><span class="tag">Team power</span><b>${teamPower().toLocaleString('en-US')}</b></div></div>
      <div class="slots">${slots}</div>
      <div class="section-head"><h3 style="margin:0">Your champions</h3><span class="tag">${owned} of ${Object.keys(S.roster).length} heroes</span></div>
      ${filterBar()}
      ${list.length ? `<div class="grid-cards">${list.map(id => cardHtml(id, { act: 'toggle', inteam: S.team.includes(id) })).join('')}</div>` : '<p class="empty-note">No champions match these filters.</p>'}`;
  }
  // ----- team filters: essence, rarity and class filter the list; power, level, rarity or name sort it -----
  const CLASSES = ['Tank', 'Warrior', 'Assassin', 'Ranger', 'Mage', 'Support', 'Controller'];
  const TF = { aff: 'all', rar: 'all', role: 'all', sort: 'power', unowned: false };
  function filteredIds() {
    const keep = id => (TF.aff === 'all' || C[id].aff === TF.aff) && (TF.rar === 'all' || C[id].rar === +TF.rar)
      && (TF.role === 'all' || C[id].role === TF.role || C[id].role2 === TF.role) && (TF.unowned || S.roster[id]);
    const val = id => !S.roster[id] ? -1 : TF.sort === 'level' ? S.roster[id].lvl : TF.sort === 'rarity' ? C[id].rar : power(statsOf(id));
    const ids = [...new Set([...K.CHAMP_ORDER, ...K.CAPTURE_ORDER.filter(id => S.roster[id])])].filter(keep);
    return ids.sort((a, b) => (!!S.roster[b] - !!S.roster[a]) || (TF.sort === 'name' ? C[a].name.localeCompare(C[b].name) : val(b) - val(a) || C[b].rar - C[a].rar));
  }
  function filterBar() {
    const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
    const essences = ['all', ...K.ESSENCES].map(a => `<button type="button" class="ess-f ${TF.aff === a ? 'on' : ''}" data-act="tfaff" data-aff="${a}" aria-pressed="${TF.aff === a}" title="${a === 'all' ? 'All essences' : a}">${a === 'all' ? 'All' : affChip(a)}</button>`).join('');
    return `<div class="tfilter">
      <div class="tf-ess" role="group" aria-label="Essence">${essences}</div>
      <label>Rarity<select data-filter="rar">${opt('all', 'All', TF.rar)}${K.RARITIES.slice(0, 5).map((r, i) => opt(i, r, TF.rar)).join('')}</select></label>
      <label>Class<select data-filter="role">${opt('all', 'All', TF.role)}${CLASSES.map(r => opt(r, r, TF.role)).join('')}</select></label>
      <label>Sort by<select data-filter="sort">${[['power', 'Power'], ['level', 'Level'], ['rarity', 'Rarity'], ['name', 'Name']].map(([v, l]) => opt(v, l, TF.sort)).join('')}</select></label>
      <label class="tf-check"><input type="checkbox" data-filter="unowned" ${TF.unowned ? 'checked' : ''}> Show unowned</label>
      ${TF.aff !== 'all' || TF.rar !== 'all' || TF.role !== 'all' ? '<button type="button" class="linkbtn" data-act="tfreset">Clear filters</button>' : ''}
    </div>`;
  }

  // ----- champions -----
  function champsHtml() {
    if (!S.roster[selChamp]) selChamp = S.team[0];
    const id = selChamp, c = C[id], r = S.roster[id];
    const st = statsOf(id), base = K.heroStats(id, r, []);
    const cap = K.maxLvl(r.stars, id), mxs = K.maxStars(id), need = K.xpNeed(r.lvl), atCap = r.lvl >= cap;
    const statRow = (k, pct) => `<dt>${K.STAT_NAMES[k]}</dt><dd>${st[k]}${pct ? '%' : ''}${st[k] > base[k] ? `<small>+${st[k] - base[k]}</small>` : ''}</dd>`;
    const pips = lv => `<span class="pips" title="Skill-level ${lv}/${K.SKILL_MAX}">${Array.from({ length: K.SKILL_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>`;
    const skills = c.skills.map((s, i) => { const lv = r.sk[i] || 0; const cd = s.cd && lv >= K.SKILL_MAX ? s.cd - 1 : s.cd; return `<div class="skill"><b>${SKILL_TAG[i] || 'A' + (i + 1)} · ${esc(s.name)}</b>${pips(lv)}<span class="cd">${cd ? `cooldown ${cd}` : 'no cooldown'} · ${TARGET_LABEL[s.target]}</span><p>${esc(s.desc)}${lv ? ` <span style="color:var(--violet)">+${Math.round(lv * K.SKILL_STEP * 100)}% power${lv >= K.SKILL_MAX && s.cd ? ', cooldown −1' : ''}</span>` : ''}</p></div>`; }).join('')
      + (c.passive ? `<div class="skill passive"><b>Passive · ${esc(c.passiveName)}</b><p>${esc(c.passiveDesc)}</p></div>` : '');
    let rank = '', canRank = false;
    if (r.stars < mxs) {
      const rc = K.rankCost(r.stars), ok = atCap && S.stones >= rc.stones && S.silver >= rc.silver;
      canRank = ok;
      rank = `<div class="rank"><button class="btn primary small" data-act="rank" ${ok ? '' : 'disabled'}>Ascend to ${r.stars + 1}★</button><span class="empty-note">${ic('stone')} ${rc.stones} Ascension Stones · ${sigils(rc.silver)}${atCap ? '' : ` · reach level ${cap} first`}</span></div>`;
    }
    const items = itemsOf(id), counts = K.setCounts(items);
    const setInfo = Object.keys(counts).map(k => { const SS = K.SETS[k], on = counts[k] >= SS.n; return `<div class="${on ? 'on' : 'off'}">${on ? '✓' : '·'} ${SS.name} (${counts[k]}/${SS.n}): ${SS.desc.replace(/^\d pieces: /, '')}</div>`; }).join('');
    // gear: one compact tile per slot (tap it for the item's stats), with its own Upgrade button
    const gear = K.SLOTS.map(slot => {
      const it = items.find(x => x.slot === slot);
      if (!it) return `<div class="gtile empty"><button type="button" class="gt-main" data-act="inv" data-slot="${slot}" aria-label="Choose a ${K.SLOT_NAMES[slot].toLowerCase()}"><span class="gt-slot">${K.SLOT_NAMES[slot]}</span><span class="gt-ic">${SLOT_GLYPH[slot]}</span><span class="gt-name">Empty</span></button><button type="button" class="btn small" data-act="inv" data-slot="${slot}">Choose</button></div>`;
      const maxed = it.lvl >= K.MAX_GEAR_LVL, cost = K.upgradeCost(it);
      return `<div class="gtile rar-${it.rar}"><button type="button" class="gt-main" data-act="gearpop" data-slot="${slot}" aria-label="${esc(itemName(it))}: show stats"><span class="gt-slot">${K.SLOT_NAMES[slot]}</span><span class="gt-ic">${gearIcon(it)}${it.lvl ? `<i class="gt-lv">+${it.lvl}</i>` : ''}</span><span class="gt-name rartxt">${K.RARITIES[it.rar]}</span><span class="gt-set">${K.SETS[it.set].name.replace(/ Set$/, '')}</span></button>
        <button type="button" class="btn small primary gt-up" data-act="up" data-item="${it.id}" ${maxed || S.silver < cost ? 'disabled' : ''}>${maxed ? 'Maxed' : `Upgrade<small>${ic('coin')}${cost.toLocaleString('en-US')}</small>`}</button></div>`;
    }).join('');
    let inv = '';
    if (invSlot) {
      const list = S.inv.filter(x => x.slot === invSlot && x.owner !== id).sort((a, b) => b.rar - a.rar || b.il - a.il || b.lvl - a.lvl);
      inv = `<div class="inv" id="invpanel"><div class="section-head"><h3>Choose ${K.SLOT_NAMES[invSlot].toLowerCase()}</h3><div class="row" style="display:flex;gap:6px"><button class="btn small" data-act="sellbad" data-slot="${invSlot}">Sell spare common and uncommon</button><button class="btn small" data-act="invclose">Close</button></div></div>
        ${list.length ? `<div class="inv-list">${list.map(x => `<div class="inv-item rar-${x.rar}"><div class="inv-head">${gearIcon(x)}<div><span class="item-name">${itemName(x)}</span><span class="item-set">${K.SETS[x.set].name} · level ${x.il}</span></div></div>${x.owner ? `<span class="owner">Worn by ${esc(C[x.owner].short)}</span>` : ''}${itemStatsHtml(x)}
          <div class="row"><button class="btn small primary" data-act="equip" data-item="${x.id}">Equip</button>${x.owner ? '' : `<button class="btn small" data-act="sell" data-item="${x.id}">Sell · ${K.sellValue(x)}</button>`}</div></div>`).join('')}</div>`
          : `<p class="empty-note">You have no spare ${K.SLOT_NAMES[invSlot].toLowerCase()}. Play stages or the Boss Hall to find gear.</p>`}</div>`;
    }
    return `<div class="champ-layout">
      <div><div class="section-head"><h2>Champions</h2><span class="tag">${K.CHAMP_ORDER.filter(x => S.roster[x]).length} / ${K.CHAMP_ORDER.length} heroes${K.CAPTURE_ORDER.some(x => S.roster[x]) ? ` · ${K.CAPTURE_ORDER.filter(x => S.roster[x]).length} captured` : ''}</span></div><div class="grid-cards">${sortedIds().map(x => cardHtml(x, { act: 'sel', sel: x === id, inteam: S.team.includes(x) })).join('')}</div></div>
      <div class="detail rar-${c.rar}" data-dtab="${champTab}">
        <div class="d-head"><img class="spr bigspr" src="${SPR.url(id, 2)}" alt=""><div>
          <h2>${esc(c.name)}${S.team.includes(id) ? ` <span class="team-tag">Team ${S.team.indexOf(id) + 1}</span>` : ''}</h2>
          <div class="tags"><span class="rartxt">${K.RARITIES[c.rar]}</span> · ${esc(c.faction)} · ${roleStr(c)} · ${affChip(c.aff)} ${c.aff}</div>
          <div>${starStr(r.stars, mxs)} · Level <b>${r.lvl}</b> / ${cap} · Power <b>${power(st).toLocaleString('en-US')}</b></div>
          <div class="xpbar"><i style="width:${atCap ? 100 : Math.round(r.xp / need * 100)}%"></i></div>
          <small class="empty-note">${atCap ? (r.stars < mxs ? 'Max level for this star. Ascend for more.' : `Maxed (${K.RARITIES[c.rar]} cap ${cap})`) : `${r.xp} / ${need} XP`}</small>
        </div></div>
        <div class="dtabs" role="tablist" aria-label="Hero details">${[['stats', 'Stats'], ['skills', 'Skills'], ['gear', `Gear <small>${items.length}/${K.SLOTS.length}</small>`], ['upgrade', 'Upgrade' + (canRank ? '<span class="dot"></span>' : '')]].map(([k, l]) => `<button type="button" role="tab" data-act="ctab" data-t="${k}" aria-selected="${champTab === k}">${l}</button>`).join('')}</div>
        <div class="dpanel" data-p="stats"><dl class="stats">${statRow('hp')}${statRow('atk')}${statRow('def')}${statRow('spd')}${statRow('crit', 1)}${statRow('cdmg', 1)}${statRow('acc')}${statRow('res')}</dl></div>
        <div class="dpanel" data-p="skills">${skills}</div>
        <div class="dpanel" data-p="gear"><div class="section-head" style="margin-bottom:6px"><span class="empty-note">${items.length} of ${K.SLOTS.length} slots filled</span><div class="gear-acts"><button class="btn small" data-act="bestgear">Equip best gear</button><button class="btn small primary" data-act="upall" ${items.some(x => x.lvl < K.MAX_GEAR_LVL) ? '' : 'disabled'}>Upgrade all</button><button class="btn small" data-act="unequipall" ${items.length ? '' : 'disabled'}>Remove all</button></div></div><div class="gear-grid">${gear}</div>${setInfo ? `<div class="setbonus">${setInfo}<small class="empty-note">A set bonus counts once, however many extra pieces you wear.</small></div>` : ''}${inv}</div>
        <div class="dpanel" data-p="upgrade"><div class="ascend"><h3>Ascend</h3>${rank || `<p class="empty-note">${esc(c.short)} has the maximum number of stars.</p>`}</div>${fodderHtml(id)}</div>
      </div></div>`;
  }

  // Feed: spare copies (captured enemies and summoned duplicates) and any other hero outside the team can be fed for XP;
  // a copy of the selected hero itself levels one of its skills instead
  function fodderHtml(id) {
    const h = S.roster[id], cap = K.maxLvl(h.stars, id), atCap = h.lvl >= cap;
    const skillsMaxed = h.sk.every(v => v >= K.SKILL_MAX);
    const copies = Object.keys(S.fodder).filter(f => S.fodder[f] > 0 && C[f]).sort((a, b) => (b === id) - (a === id) || C[a].rar - C[b].rar);
    const others = Object.keys(S.roster).filter(x => x !== id && C[x] && !S.team.includes(x)).sort((a, b) => C[a].rar - C[b].rar || S.roster[a].lvl - S.roster[b].lvl);
    const release = C[id].captured && !S.team.includes(id) ? `<button class="btn small" data-act="release" data-id="${id}">Turn ${esc(C[id].short)} into a spare copy</button>` : '';
    const xpBtn = (xp, attrs) => `<button class="btn small primary" ${attrs} ${atCap ? 'disabled title="Max level for this star"' : ''}>Feed · +${xp.toLocaleString('en-US')} XP</button>`;
    const copyRow = f => `<div class="fd rar-${C[f].rar} ${f === id ? 'self' : ''}">${por(f)}<div><b>${esc(C[f].name)}</b> <span class="tag">×${S.fodder[f]}</span><small class="empty-note">${K.RARITIES[C[f].rar]} · spare copy</small></div>
        <div class="row">${f === id
          ? `<button class="btn small violet" data-act="skillup" data-f="${f}" ${skillsMaxed ? 'disabled title="All skills are at the maximum level"' : ''}>Skill up · +1 skill level</button>`
          : xpBtn(K.feedXp(f, h.lvl), `data-act="feed" data-f="${f}"`)}<button class="btn small" data-act="breakdown" data-f="${f}">Break down · +${K.breakStones(f)} ${ic('stone')}</button></div></div>`;
    const heroRow = x => `<div class="fd rar-${C[x].rar}">${por(x)}<div><b>${esc(C[x].short)}</b> <span class="tag">Lv ${S.roster[x].lvl}</span><small class="empty-note">${K.RARITIES[C[x].rar]} · ${roleStr(C[x])}</small></div>
        <div class="row">${xpBtn(K.feedXp(x, h.lvl, S.roster[x].lvl), `data-act="feedhero" data-id="${x}"`)}</div></div>`;
    return `<div class="fodder"><div class="section-head" style="margin-bottom:6px"><h3 style="margin:0">Feed</h3>${release}</div>
      <p class="empty-note">Feed spare copies or other heroes to give ${esc(C[id].short)} XP. A copy of ${esc(C[id].short)} itself raises one skill level instead (max ${K.SKILL_MAX} per skill). Duplicates from the Fate Altar and captured enemies become spare copies.</p>
      ${copies.length ? `<h4 class="fd-h">Spare copies</h4><div class="fodder-list">${copies.map(copyRow).join('')}</div>` : ''}
      ${others.length ? `<h4 class="fd-h">Heroes outside your team</h4><div class="fodder-list">${others.map(heroRow).join('')}</div>` : ''}
      ${!copies.length && !others.length ? '<p class="empty-note">Nothing to feed yet. Summon at the Fate Altar or capture enemies in the campaign.</p>' : ''}</div>`;
  }
  // "Are you sure?" before feeding away a Rare or better hero
  let confirmYes = null;
  function confirmBox(title, text, yes, onYes) {
    confirmYes = onYes;
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="cf-q"><h2 id="cf-q">${title}</h2><p class="lede">${text}</p>
      <div class="modal-actions"><button class="btn primary" data-act="cfyes">${yes}</button><button class="btn" data-act="cfno">Cancel</button></div></div>`;
    m.hidden = false; m.querySelector('.btn').focus();
  }
  // popup with the stats of the item in `slot` of the selected hero, with Upgrade / Swap / Remove
  function gearPop(slot) {
    const it = itemsOf(selChamp).find(x => x.slot === slot), m = $('#modal');
    if (!it) { m.hidden = true; return; }
    const maxed = it.lvl >= K.MAX_GEAR_LVL, cost = K.upgradeCost(it), SS = K.SETS[it.set];
    m.innerHTML = `<div class="modal-box gear-pop rar-${it.rar}" role="dialog" aria-modal="true" aria-labelledby="gp-t">
      <div class="gp-head"><span class="gt-ic big">${gearIcon(it)}</span><div><h2 id="gp-t" class="rartxt">${esc(itemName(it))}</h2><span class="tag">${K.SLOT_NAMES[slot]} · item level ${it.il} · upgrade ${it.lvl} / ${K.MAX_GEAR_LVL}</span></div></div>
      ${itemStatsHtml(it)}
      <p class="gp-set"><b>${SS.name}</b> · ${SS.desc}</p>
      ${maxed ? '' : `<p class="empty-note">Upgrade: ${sigils(cost)} · ${Math.round(K.upgradeChance(it) * 100)}% chance. You have ${sigils(S.silver)}.</p>`}
      <div class="modal-actions"><button class="btn primary" data-act="up" data-item="${it.id}" data-pop="1" ${maxed || S.silver < cost ? 'disabled' : ''}>${maxed ? 'Maxed' : 'Upgrade'}</button><button class="btn" data-act="inv" data-slot="${slot}">Swap</button><button class="btn" data-act="unequip" data-item="${it.id}">Remove</button><button class="btn" data-act="gpclose">Close</button></div></div>`;
    m.hidden = false;
    const f = m.querySelector('.btn:not(:disabled)'); if (f) f.focus();
  }
  // gives XP to the selected hero; returns the levels gained
  function giveXp(gain) {
    const h = S.roster[selChamp], cap = K.maxLvl(h.stars, selChamp), l0 = h.lvl;
    h.xp += gain;
    while (h.lvl < cap && h.xp >= K.xpNeed(h.lvl)) { h.xp -= K.xpNeed(h.lvl); h.lvl++; }
    if (h.lvl >= cap) h.xp = 0;
    return h.lvl - l0;
  }

  // ----- starter choice (new players) -----
  const STARTER_PITCH = {
    krothar: 'The balanced bruiser. Hits harder when wounded and cleaves the whole enemy line with bleeding wounds.',
    drakulen: 'The survivor. Heals himself with every hit and lands huge critical hits once he has good gear.',
    zephara: 'The glass cannon. The fastest starter, with big single-target damage and stuns, but less HP and Defense.',
    thalnir: 'The unbreakable. Regenerates every turn, taunts the enemy team and poisons everything it touches.',
  };
  // the four starters stand side by side in a dungeon hall; tapping one shows its details below, "Choose" asks to confirm
  const STARTER_BG = 4; // chapter background: the brick-and-lava dungeon hall
  let starterSel = null;
  function starterHtml() {
    const st = id => K.heroStats(id, newHero(id), []);
    const top = { hp: 0, atk: 0, def: 0, spd: 0 };
    for (const id of K.STARTERS) { const s = st(id); for (const k in top) top[k] = Math.max(top[k], s[k]); }
    const bar = (id, k) => { const v = st(id)[k]; return `<div class="sbar"><span>${K.STAT_NAMES[k]}</span><i><b style="width:${Math.round(v / top[k] * 100)}%"></b></i><em>${v}</em></div>`; };
    const figs = K.STARTERS.map((id, i) => `<button type="button" class="st-fig ${id === starterSel ? 'sel' : ''}" style="left:${12.5 + i * 25}%" data-act="starterpick" data-id="${id}" aria-pressed="${id === starterSel}" aria-label="${esc(C[id].name)}">
        <img class="spr" src="${SPR.url(id, 2)}" alt=""><span class="st-ring"></span><span class="st-nm">${esc(C[id].short)}</span></button>`).join('');
    const c = starterSel && C[starterSel];
    const info = c ? `<div class="st-card rar-${c.rar}">
        <div class="starter-top">${por(starterSel)}<div><h3>${esc(c.name)}</h3><div class="tags">${affChip(c.aff)} ${c.aff} · ${roleStr(c)}</div><span class="rartxt tag">${K.RARITIES[c.rar]}</span></div></div>
        <p class="st-pitch">${STARTER_PITCH[starterSel]}</p>
        <div class="st-cols"><div class="sbars">${['hp', 'atk', 'def', 'spd'].map(k => bar(starterSel, k)).join('')}</div>
        <div><div class="skill passive"><b>Passive · ${esc(c.passiveName)}</b><p>${esc(c.passiveDesc)}</p></div>
        <ul class="starter-sk">${c.skills.map((s, i) => `<li><b>${SKILL_TAG[i]}</b> ${esc(s.name)} <span>${esc(s.desc)}</span></li>`).join('')}</ul></div></div>
      </div>` : '<p class="empty-note st-hint">Tap a hero to see what they can do.</p>';
    // returning players on a new device should load their account before picking
    const cl = window.FFH_CLOUD && window.FFH_CLOUD.info();
    const signin = cl && cl.enabled && !cl.email ? `<div class="prof-acc starter-acc"><p class="empty-note">Played before? Sign in to load your progress instead of starting over.</p><div class="row"><button class="btn small" data-act="account">Sign in</button></div></div>` : '';
    return `<h2 class="st-title">Choose your starter hero</h2>
      <div class="st-scene ${starterSel ? 'has-sel' : ''}"><canvas data-bg="${STARTER_BG}" width="480" height="270"></canvas>${figs}</div>
      <div class="st-info">${info}</div>
      <div class="st-go"><button class="btn primary" data-act="starterchoose" ${starterSel ? '' : 'disabled'}>${c ? `Choose ${esc(c.short)}` : 'Choose'}</button></div>${signin}`;
  }
  function confirmStarter() {
    const c = C[starterSel], m = $('#modal');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="st-q"><h2 id="st-q">Are you sure?</h2>
      <p class="lede">Begin your adventure with <b>${esc(c.name)}</b>? Your starter hero can't be changed later.</p>
      <div class="modal-actions"><button class="btn primary" data-act="starterok">Yes, choose ${esc(c.short)}</button><button class="btn" data-act="startercancel">Cancel</button></div></div>`;
    m.hidden = false; m.querySelector('.btn').focus();
  }
  function pickStarter(id) {
    S.roster[id] = newHero(id); S.team = [id]; delete S.needStarter; starterSel = null;
    tab = 'campagne'; save(); render();
    toast(`${C[id].name} joins you. Clear Chapter I to gather your team.`, false, 4000);
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
    try { r = await cloud().fn('arena', { action, name: S.p.name, avatar: avatarId(), team: snapTeam(S.team), ...extra }); }
    catch (e) { r = { error: 'No connection to the arena. Check your internet and try again.' }; }
    AR.busy = false;
    if (r.state) { AR.st = r.state; AR.loadedAt = Date.now(); }
    AR.err = r.error || '';
    if (tab === 'arena' && !B) render();
    return r;
  }
  async function loadBoard(kind) {
    AR.lb = kind; AR.board = null; AR.boardErr = '';
    if (tab === 'arena' && !B) render();
    let rows = null;
    try { rows = await cloud().rpc('leaderboard', { kind }); } catch (e) { AR.boardErr = 'The leaderboard could not be loaded.'; }
    if (AR.lb !== kind) return;
    AR.board = rows || [];
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
  const tierReward = t => [...(t.silver ? [sigils(t.silver)] : []), ...Object.entries(t.fs).map(([k, n]) => `${shardIc(k)} ${n}× ${esc(K.SHARD[k].name)}`)].join(' · ');
  function campaignText(r) {
    const d = r.detail || {}, dcl = Array.isArray(d.dcl) ? d.dcl : [];
    for (let i = dcl.length - 1; i >= 1; i--) if (dcl[i] >= 0 && K.DIFFS[i] && K.STAGES[dcl[i]]) return `${K.DIFFS[i].name} · ${stageName(dcl[i])}`;
    return K.STAGES[d.cleared] ? `Easy · ${stageName(d.cleared)}` : `${r.score} stages`;
  }
  function boardHtml() {
    const kinds = [['arena', 'Arena'], ['campaign', 'Campaign'], ['bosses', 'Boss Hall']];
    const seg = `<div class="seg" role="group" aria-label="Leaderboard">${kinds.map(([k, l]) => `<button type="button" data-act="arlb" data-kind="${k}" aria-pressed="${AR.lb === k}">${l}</button>`).join('')}</div>`;
    const fmt = r => AR.lb === 'arena' ? `${r.score} rating · ${r.detail.wins} W / ${r.detail.losses} L` : AR.lb === 'campaign' ? campaignText(r) : `${r.score} boss levels${r.detail.maxed ? ` · ${r.detail.maxed} maxed` : ''}`;
    const rows = AR.board ? AR.board.map(r => `<li class="${r.me ? 'me' : ''}"><span class="lb-rank">${r.rank}</span>${r.avatar && C[r.avatar] ? por(r.avatar) : '<span class="lb-noav"></span>'}<span class="lb-name"><b>${esc(r.name)}</b>${r.lvl ? `<small class="empty-note">Player level ${r.lvl}</small>` : ''}</span><span class="lb-score">${fmt(r)}</span></li>`).join('') : '';
    const note = AR.lb === 'arena' ? 'Ratings from fights the server played.' : 'From cloud saves of signed-in players.';
    return `<section class="ar-board"><div class="section-head"><h3>Leaderboard</h3>${seg}</div><p class="empty-note">${note}</p>
      ${AR.boardErr ? `<p class="ar-err">${esc(AR.boardErr)}</p>` : !AR.board ? '<p class="empty-note">Loading…</p>' : rows ? `<ol class="lb">${rows}</ol>` : '<p class="empty-note">Nobody here yet. Be the first!</p>'}</section>`;
  }
  function arenaHtml() {
    const lede = 'Fight the defense teams of other players. The server plays every fight, so the ranking is fair. Every Monday you get a reward for your rating.';
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
    const def = `<div class="ar-def"><h3>Your defense</h3>${st.defense ? miniTeam(st.defense) + `<small class="empty-note">Power ${st.defensePower.toLocaleString('en-US')}</small>` : '<p class="empty-note">No defense team yet, so other players cannot find you. Your first attack team becomes your defense.</p>'}
        <div class="row"><button class="btn small" data-act="ardef" ${AR.busy ? 'disabled' : ''}>Defend with my current team</button><button class="btn small" data-act="tab" data-tab="team">Edit team</button></div></div>`;
    const offers = st.offers.map((o, i) => `<div class="ar-opp">${o.avatar && C[o.avatar] ? por(o.avatar) : '<span class="lb-noav"></span>'}<div class="ar-opp-main"><b>${esc(o.name)}</b>${o.kind === 'bot' ? ' <span class="tag">Bot</span>' : ''}<small class="empty-note">Rating ${o.rating} · power ${o.power.toLocaleString('en-US')}</small>${miniTeam(o.team)}</div><button class="btn primary small" data-act="arfight" data-n="${i}" ${AR.busy || st.tokens < 1 ? 'disabled' : ''}>Fight</button></div>`).join('');
    const opps = `<section class="ar-opps"><div class="section-head"><h3>Opponents</h3><button class="btn small" data-act="arrefresh" ${AR.busy ? 'disabled' : ''}>New opponents</button></div>
      <p class="empty-note">You attack with your current team (power ${K.teamPower(snapTeam(S.team)).toLocaleString('en-US')}). A fight costs 1 token; you get a new token every hour.</p>${offers}</section>`;
    return head + (AR.err ? `<p class="ar-err">${esc(AR.err)}</p>` : '') + `<div class="arena">${me}${def}</div>${opps}${boardHtml()}`;
  }
  function startArena(f) {
    runBattle({ type: 'arena', att: f.att, def: f.def, seed: f.seed, win: f.win, fight: f, area: f.seed % 5, title: `Arena · vs ${f.opponent.name}` });
  }
  function finishArena(cfg) {
    const f = cfg.fight, m = $('#modal'), tier = K.arenaTier(f.rating), was = K.arenaTier(f.before);
    AR.board = null;
    m.innerHTML = `<div class="modal-box ${f.win ? '' : 'lose'}" role="dialog" aria-modal="true"><h2>${f.win ? 'Victory' : 'Defeated'}</h2><p class="tag">${esc(cfg.title)} · rating ${f.opponent.rating}</p>
      <ul class="rewards"><li><span class="aff" style="--c:var(--gold)">R</span><span>Rating ${f.before} → <b>${f.rating}</b> (${f.delta >= 0 ? '+' : ''}${f.delta})</span></li>
        ${tier !== was ? `<li class="loot lvup"><span class="aff" style="--c:var(--gold)">★</span><span><b>${tier.name}</b> tier${f.rating > f.before ? ' reached!' : ''}</span></li>` : ''}
        <li><span class="aff" style="--c:var(--info)">T</span><span>Tokens left: ${AR.st ? AR.st.tokens : '?'} / ${K.ARENA_TOKENS}</span></li></ul>
      <div class="modal-actions"><button class="btn primary" data-act="modal" data-go="arena">Back to the arena</button></div></div>`;
    m.hidden = false;
    m.querySelector('.btn').focus();
  }
  async function claimArena() {
    let rows;
    try { rows = await cloud().rpc('claim_arena_rewards'); } catch (e) { toast('Could not claim the rewards. Try again.', true); return; }
    let silver = 0; const fs = {};
    const add = t => { silver += t.silver; for (const k in t.fs) fs[k] = (fs[k] || 0) + t.fs[k]; };
    let best = 0;
    for (const r of rows || []) { add(K.arenaTier(r.rating)); const top = K.ARENA_RANK_REWARDS[r.rank - 1]; if (top) { add(top); best = best ? Math.min(best, r.rank) : r.rank; } }
    S.silver += silver; for (const k in fs) S.fs[k] = (S.fs[k] || 0) + fs[k];
    if (AR.st) AR.st.rewards = 0;
    save(); render(); SFX.up();
    const got = [...(silver ? [`+${silver.toLocaleString('en-US')} Sigils`] : []), ...Object.keys(fs).map(k => `+${fs[k]} ${K.SHARD[k].name}`)].join(' · ');
    toast(got ? `${best ? `Top 5 of the week (#${best})! ` : ''}Weekly arena rewards: ${got}.` : 'No rewards to claim.', false, 5000);
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
    const p = S.p, need = pxNeed(p.lvl), av = avatarId(), cl = window.FFH_CLOUD && window.FFH_CLOUD.info();
    const bossesBeaten = Object.values(S.bh).filter(n => n > 0).length;
    const heroes = K.CHAMP_ORDER.filter(x => S.roster[x]).length;
    const cost = renameCost(), costTxt = cost ? `${ic('coin')} ${cost.toLocaleString('en-US')}` : 'free once';
    const nameRow = editName
      ? `<form class="pname" data-form="pname"><input name="pname" value="${esc(p.name)}" maxlength="20" autocomplete="nickname" aria-label="Player name" required><button class="btn primary small" type="submit">Save · ${costTxt}</button><button class="btn small" type="button" data-act="pnamecancel">Cancel</button></form>`
      : `<div class="pname"><h2>${esc(p.name)}</h2><button class="btn small" data-act="pnameedit" ${S.silver < cost ? `disabled title="Changing your name costs ${cost.toLocaleString('en-US')} Sigils"` : ''}>Change name · ${costTxt}</button></div>`;
    const road = Object.keys(PLAYER_UNLOCK).sort((a, b) => PLAYER_UNLOCK[a] - PLAYER_UNLOCK[b]).map(t => {
      const ok = unlocked(t);
      return `<li class="${ok ? 'on' : ''}"><span class="lvtag">Lv ${PLAYER_UNLOCK[t]}</span><b>${UNLOCK_NAME[t]}</b><span class="empty-note">${ok ? 'Unlocked' : `${PLAYER_UNLOCK[t] - p.lvl} ${PLAYER_UNLOCK[t] - p.lvl === 1 ? 'level' : 'levels'} to go`}</span></li>`;
    }).join('');
    const avatars = Object.keys(S.roster).filter(id => C[id]).sort((a, b) => C[b].rar - C[a].rar).map(id => `<button type="button" class="av-pick rar-${C[id].rar} ${id === av ? 'sel' : ''}" data-act="avatar" data-id="${id}" title="${esc(C[id].name)}" aria-label="${esc(C[id].name)}" aria-pressed="${id === av}">${por(id)}</button>`).join('');
    const stat = (k, v) => `<dt>${k}</dt><dd>${typeof v === 'number' ? v.toLocaleString('en-US') : v}</dd>`;
    const account = !cl || !cl.enabled
      ? '<p class="empty-note">Offline mode: your progress is saved in this browser only.</p>'
      : cl.email
        ? `<p class="empty-note">Signed in as <b>${esc(cl.email)}</b>. ${cl.status === 'error' ? 'The last cloud save failed.' : 'Your progress saves to your account automatically.'}</p><div class="row"><button class="btn small" data-act="account">Account settings</button></div>`
        : `<p class="empty-note">Not signed in: your progress is only saved in this browser. Sign in to keep it safe and play on any device.</p><div class="row"><button class="btn primary small" data-act="account">Sign in or create an account</button></div>`;
    return `<div class="profile">
      <div class="prof-head rar-${C[av].rar}"><div class="prof-av">${por(av)}</div>
        <div class="prof-main">${nameRow}
          <div class="prof-lv"><span class="lvbadge">${p.lvl}</span><span>Player level ${p.lvl}</span></div>
          <div class="xpbar"><i style="width:${Math.round(p.xp / need * 100)}%"></i></div>
          <small class="empty-note">${p.xp.toLocaleString('en-US')} / ${need.toLocaleString('en-US')} XP to level ${p.lvl + 1} · win battles to earn player XP</small></div></div>
      <div class="prof-cols">
        <section><h3>Unlocks</h3><ul class="road">${road}</ul><p class="empty-note">Every level up pays out Sigils. Every fifth level also gives a Greater Fate Shard.</p></section>
        <section><h3>Statistics</h3><dl class="stats">${stat('Battles won', p.st.won)}${stat('Battles lost', p.st.lost)}${stat('Campaign stages cleared', `${S.cleared + 1} / ${K.STAGES.length}`)}${K.DIFFS.slice(1).map((x, i) => S.dcl[i + 1] >= 0 ? stat(`${x.name} stages cleared`, `${S.dcl[i + 1] + 1} / ${K.STAGES.length}`) : '').join('')}${stat('Boss victories', p.st.bossWon)}${stat('Bosses beaten', `${bossesBeaten} / ${K.BOSS_ORDER.length}`)}${stat('Heroes collected', `${heroes} / ${K.CHAMP_ORDER.length}`)}${stat('Summons', p.st.summons)}${stat('Team power', teamPower())}</dl></section>
      </div>
      <section><h3>Avatar</h3><div class="av-grid">${avatars}</div></section>
      <section class="prof-acc"><h3>Account</h3>${account}</section>
      ${backupsHtml()}
    </div>`;
  }

  // ---------- screen events ----------
  document.addEventListener('change', e => {
    const f = e.target.closest('[data-filter]'); if (!f) return;
    TF[f.dataset.filter] = f.type === 'checkbox' ? f.checked : f.value; render();
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form="pname"]'); if (!f) return;
    e.preventDefault();
    const name = f.pname.value.replace(/[<>"&\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    if (name.length < 2) { toast('Pick a name of at least 2 characters.', true); return; }
    if (name === S.p.name) { editName = false; render(); return; }
    const cost = renameCost();
    if (S.silver < cost) { toast(`Changing your name costs ${cost.toLocaleString('en-US')} Sigils.`, true); return; }
    S.silver -= cost; S.p.renames++;
    S.p.name = name; editName = false; save(); render(); toast(cost ? `Name saved. −${cost.toLocaleString('en-US')} Sigils.` : 'Name saved.');
  });
  document.addEventListener('click', e => {
    SFX.unlock();
    const tb = e.target.closest('#tabs button');
    if (tb) { invSlot = null; SFX.click(); setTab(tb.dataset.tab); return; }
    if (e.target.closest('#sound')) { S.sound = !S.sound; save(); hud(); if (S.sound) SFX.click(); return; }
    if (e.target.closest('.brand') && !B && !S.needStarter) { SFX.click(); setTab('home'); window.scrollTo({ top: 0 }); return; }
    if (e.target.closest('#account')) { if (B) return; SFX.click(); editName = false; setTab('profiel'); window.scrollTo({ top: 0 }); return; }
    const a = e.target.closest('[data-act]');
    if (!a || a.closest('#battle')) return;
    const act = a.dataset.act, id = a.dataset.id, item = S.inv.find(x => x.id === +a.dataset.item);
    if (act !== 'modal') SFX.click();
    if (act === 'tfaff') { TF.aff = a.dataset.aff; render(); }
    else if (act === 'tfreset') { Object.assign(TF, { aff: 'all', rar: 'all', role: 'all' }); render(); }
    else if (act === 'starterpick') { starterSel = id; render(); }
    else if (act === 'starterchoose') { if (starterSel) confirmStarter(); }
    else if (act === 'starterok') { $('#modal').hidden = true; if (starterSel) pickStarter(starterSel); }
    else if (act === 'startercancel') $('#modal').hidden = true;
    else if (act === 'tab') { setTab(a.dataset.tab); window.scrollTo({ top: 0 }); }
    else if (act === 'go') { invSlot = null; setTab(a.dataset.go); window.scrollTo({ top: 0 }); }
    else if (act === 'soon') toast('Coming soon.');
    else if (act === 'pnameedit') { editName = true; render(); const i = $('#screen input[name=pname]'); if (i) { i.focus(); i.select(); } }
    else if (act === 'pnamecancel') { editName = false; render(); }
    else if (act === 'avatar') { S.p.avatar = id; save(); render(); }
    else if (act === 'account') { if (window.FFH_CLOUD) window.FFH_CLOUD.openAccount(); }
    else if (act === 'arstate') arenaCall('state');
    else if (act === 'arrefresh') arenaCall('refresh');
    else if (act === 'ardef') arenaCall('defense').then(r => { if (r.state) toast('Your current team now defends you in the arena.'); });
    else if (act === 'arfight') arenaCall('fight', { offer: +a.dataset.n }).then(r => { if (r.fight) startArena(r.fight); });
    else if (act === 'arlb') loadBoard(a.dataset.kind);
    else if (act === 'arclaim') claimArena();
    else if (act === 'restorebk') { const n = +a.dataset.n; confirmBox('Restore this backup?', 'Your game goes back to this saved copy. Your current progress is kept as a backup, so you can switch back.', 'Restore', () => restoreBackup(n)); }
    else if (act === 'mode') { S.diff = +a.dataset.diff; delete S.chap; save(); render(); }
    else if (act === 'chap') { S.chap = +a.dataset.n; save(); render(); }
    else if (act === 'play') startCampaign(+a.dataset.stage);
    else if (act === 'bhsel') { S.bhCur = id; save(); render(); }
    else if (act === 'bhlvl') { S.bhSel[id] = +a.dataset.n; save(); render(); }
    else if (act === 'bhplay') startDungeon(id, +a.dataset.n);
    else if (act === 'summon') doSummon(+a.dataset.n, a.dataset.type);
    else if (act === 'buyshard') { if (S.silver >= K.SHARD_PRICE) { S.silver -= K.SHARD_PRICE; S.fs.fate++; save(); render(); toast('Fate Shard bought.'); } }
    else if (act === 'toggle') {
      const i = S.team.indexOf(id);
      if (i >= 0) { if (S.team.length > 1) S.team.splice(i, 1); else toast('Your team needs at least one champion.', true); }
      else if (S.team.length < 4) S.team.push(id);
      else toast('Your team is full. Remove someone first.', true);
      save(); render();
    } else if (act === 'sel') { selChamp = id; invSlot = null; render(); }
    else if (act === 'ctab') { champTab = a.dataset.t; invSlot = null; render(); }
    else if (act === 'inv') { $('#modal').hidden = true; invSlot = a.dataset.slot; champTab = 'gear'; render(); const p = $('#invpanel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    else if (act === 'invclose') { invSlot = null; render(); }
    else if (act === 'equip' && item) {
      S.inv.filter(x => x.owner === selChamp && x.slot === item.slot).forEach(x => (x.owner = null));
      item.owner = selChamp; invSlot = null; save(); render(); toast(`${itemName(item)} equipped.`);
    } else if (act === 'unequip' && item) { $('#modal').hidden = true; item.owner = null; save(); render(); }
    else if (act === 'sell' && item) { const v = K.sellValue(item); S.silver += v; S.inv = S.inv.filter(x => x !== item); save(); render(); toast(`Sold for ${v} Sigils.`); }
    else if (act === 'sellbad') {
      const bad = S.inv.filter(x => !x.owner && x.rar <= 1 && x.lvl === 0);
      if (!bad.length) { toast('No spare common or uncommon gear to sell.'); return; }
      const v = bad.reduce((s, x) => s + K.sellValue(x), 0); S.silver += v; S.inv = S.inv.filter(x => !bad.includes(x)); save(); render(); toast(`Sold ${bad.length} items for ${v} Sigils.`);
    } else if (act === 'up' && item) {
      const cost = K.upgradeCost(item);
      if (S.silver < cost || item.lvl >= K.MAX_GEAR_LVL) return;
      S.silver -= cost;
      if (Math.random() < K.upgradeChance(item)) { item.lvl++; const m = K.upgradeMilestone(item); SFX.up(); toast(`Success: ${itemName(item)}${m ? ' · ' + m : ''}.`); }
      else { SFX.fail(); toast('Failed. The Sigils are spent, the item stays intact.', true); }
      save(); render();
      if (a.dataset.pop) gearPop(item.slot);
    } else if (act === 'gearpop') gearPop(a.dataset.slot);
    else if (act === 'gpclose') $('#modal').hidden = true;
    else if (act === 'upall') {
      const h = selChamp, worn = itemsOf(h).filter(x => x.lvl < K.MAX_GEAR_LVL);
      if (!worn.length) return;
      const first = [...worn].sort((x, y) => gearPri(h, y) - gearPri(h, x))[0];
      confirmBox('Upgrade all gear?', `Upgrades the gear of <b>${esc(C[h].short)}</b> as far as your ${sigils(S.silver)} go, the most important piece for ${/^[AEIOU]/.test(C[h].role) ? "an" : "a"} ${esc(roleStr(C[h]))} first (starting with the ${K.SLOT_NAMES[first.slot].toLowerCase()}). Failed attempts cost Sigils too.`, 'Upgrade all', () => {
        const r = upgradeAll(h);
        $('#modal').hidden = true;
        if (!r.ok && !r.fail) { toast('Not enough Sigils for any upgrade.', true); return; }
        (r.ok ? SFX.up : SFX.fail)(); save(); render();
        toast(`${r.ok} ${r.ok === 1 ? 'upgrade' : 'upgrades'} succeeded, ${r.fail} failed · −${r.spent.toLocaleString('en-US')} Sigils.`, !r.ok, 3600);
      });
    } else if (act === 'bestgear') {
      const h = S.roster[selChamp]; let changed = 0;
      for (const slot of K.SLOTS) {
        const cur = S.inv.find(x => x.owner === selChamp && x.slot === slot);
        const others = itemsOf(selChamp).filter(x => x.slot !== slot);
        const cands = S.inv.filter(x => x.slot === slot && (!x.owner || x.owner === selChamp));
        let best = cur, bestP = power(K.heroStats(selChamp, h, cur ? [...others, cur] : others));
        for (const c of cands) { const pw = power(K.heroStats(selChamp, h, [...others, c])); if (pw > bestP) { best = c; bestP = pw; } }
        if (best && best !== cur) { if (cur) cur.owner = null; best.owner = selChamp; changed++; }
      }
      save(); render(); toast(changed ? `Swapped ${changed} ${changed === 1 ? 'piece' : 'pieces'} of gear.` : 'Already wearing the best available gear.');
    } else if (act === 'unequipall') {
      const worn = itemsOf(selChamp);
      worn.forEach(x => (x.owner = null));
      invSlot = null; save(); render(); toast(`Removed ${worn.length} ${worn.length === 1 ? 'piece' : 'pieces'} of gear.`);
    } else if (act === 'feed') {
      const f = a.dataset.f, h = S.roster[selChamp], to = selChamp;
      if (!(S.fodder[f] > 0) || h.lvl >= K.maxLvl(h.stars, selChamp)) return;
      const go = () => {
        if (!(S.fodder[f] > 0) || selChamp !== to) return;
        const gain = K.feedXp(f, h.lvl); S.fodder[f]--; const up = giveXp(gain);
        SFX.up(); save(); render(); toast(`${C[to].short} was fed a copy of ${C[f].name}: +${gain.toLocaleString('en-US')} XP${up ? `, now level ${h.lvl}` : ''}.`);
      };
      if (C[f].rar >= 2) confirmBox('Are you sure?', `Feed a ${K.RARITIES[C[f].rar]} copy of <b>${esc(C[f].name)}</b> to ${esc(C[to].short)}? The copy is used up.`, 'Yes, feed it', go); else go();
    } else if (act === 'feedhero') {
      const x = id, h = S.roster[selChamp], to = selChamp;
      if (!S.roster[x] || x === to || S.team.includes(x) || h.lvl >= K.maxLvl(h.stars, to)) return;
      const go = () => {
        if (!S.roster[x] || selChamp !== to) return;
        const gain = K.feedXp(x, h.lvl, S.roster[x].lvl), worn = itemsOf(x);
        delete S.roster[x]; worn.forEach(it => (it.owner = null)); if (S.p.avatar === x) S.p.avatar = null;
        const up = giveXp(gain);
        SFX.up(); save(); render(); toast(`${C[to].short} absorbed ${C[x].name}: +${gain.toLocaleString('en-US')} XP${up ? `, now level ${h.lvl}` : ''}.${worn.length ? ' Their gear went back to your inventory.' : ''}`);
      };
      if (C[x].rar >= 2) confirmBox('Are you sure?', `Feed <b>${esc(C[x].name)}</b> (${K.RARITIES[C[x].rar]}, level ${S.roster[x].lvl}) to ${esc(C[to].short)}? ${esc(C[x].short)} is gone for good; their gear goes back to your inventory.`, `Yes, feed ${esc(C[x].short)}`, go); else go();
    } else if (act === 'skillup') {
      const f = a.dataset.f, h = S.roster[selChamp];
      if (f !== selChamp || !(S.fodder[f] > 0)) return;
      const i = K.skillUp(h, f); if (i < 0) return;
      S.fodder[f]--; SFX.summon(3); save(); render();
      toast(`${C[f].skills[i].name} is now skill level ${h.sk[i]}/${K.SKILL_MAX}${h.sk[i] >= K.SKILL_MAX && C[f].skills[i].cd ? ' (cooldown −1)' : ''}.`);
    } else if (act === 'cfyes') { $('#modal').hidden = true; const f = confirmYes; confirmYes = null; if (f) f(); }
    else if (act === 'cfno') { $('#modal').hidden = true; confirmYes = null; }
    else if (act === 'breakdown') {
      const f = a.dataset.f; if (!(S.fodder[f] > 0)) return;
      S.fodder[f]--; S.stones += K.breakStones(f); save(); render(); toast(`${C[f].name} broken down into ${K.breakStones(f)} Ascension ${K.breakStones(f) === 1 ? 'Stone' : 'Stones'}.`);
    } else if (act === 'release') {
      if (!C[id] || !C[id].captured || S.team.includes(id)) return;
      delete S.roster[id]; S.fodder[id] = (S.fodder[id] || 0) + 1;
      S.inv.forEach(x => { if (x.owner === id) x.owner = null; });
      selChamp = S.team[0]; save(); render(); toast(`${C[id].name} is now a spare copy. Capture another to use it as a hero again.`);
    } else if (act === 'rank') {
      const h = S.roster[selChamp], rc = K.rankCost(h.stars);
      if (h.stars >= K.maxStars(selChamp) || h.lvl < K.maxLvl(h.stars, selChamp) || S.stones < rc.stones || S.silver < rc.silver) return;
      S.stones -= rc.stones; S.silver -= rc.silver; h.stars++; SFX.summon(3); save(); render(); toast(`${C[selChamp].short} is now ${h.stars}★. New maximum: level ${K.maxLvl(h.stars, selChamp)}.`);
    } else if (act === 'modal') modalAction(a.dataset.go);
  });

  // ---------- summon ----------
  let lastType = 'fate';
  function doSummon(n, type) {
    type = type || lastType; lastType = type;
    if ((S.fs[type] || 0) < n || !unlocked('altaar')) return;
    S.fs[type] -= n; S.p.st.summons += n;
    const res = [];
    for (let i = 0; i < n; i++) res.push(K.summonOne(S, type));
    save(); render();
    const best = Math.max(...res.map(r => r.rar));
    SFX.summon(best);
    const cards = res.map((r, i) => `<div class="sum-card rar-${r.rar}" style="animation-delay:${i * 0.12}s">${por(r.id)}<span class="nm">${esc(C[r.id].short)}</span><small class="rartxt">${K.RARITIES[r.rar]}</small>${r.isNew ? '<span class="new">NEW</span>' : '<small>Spare copy: feed it to level a skill</small>'}</div>`).join('');
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box violet ${n > 1 ? 'wide' : ''}" role="dialog" aria-modal="true"><h2>${best >= 4 ? 'Legendary!' : best >= 3 ? 'Epic!' : 'Summoned'}</h2><p class="tag">${esc(K.SHARD[type].name)} · ${S.fs[type]} left</p><div class="summon-grid">${cards}</div>
      <div class="modal-actions"><button class="btn violet" data-act="modal" data-go="summon1" ${S.fs[type] < 1 ? 'disabled' : ''}>1 more · ${shardIc(type)}</button>${S.fs[type] >= 10 ? '<button class="btn violet" data-act="modal" data-go="summon10">10 more</button>' : ''}<button class="btn" data-act="modal" data-go="close">Close</button></div></div>`;
    m.hidden = false;
  }

  // ================= BATTLE VIEW =================
  const W = 480, H = 270;
  const HERO_POS = [[162, 196], [96, 212], [170, 252], [104, 266]];
  const ENEMY_POS = { 1: [[356, 236]], 2: [[326, 204], [332, 256]], 3: [[322, 196], [390, 218], [330, 258]], 4: [[322, 194], [390, 208], [318, 250], [386, 266]] };
  const BOSS_POS = [374, 244], ADD_POS = [[296, 198], [300, 262], [270, 232]];
  const R = { running: false, units: [], projs: [], parts: [], fx: [], ash: [], shake: 0, area: 0, hl: new Set(), hlKind: 'bad', active: null, dim: 0 };
  let B = null, pending = null, selSkill = 0, quitArm = 0;
  // battle speed: S.speed is the player's preferred speed, spd the speed this battle actually runs at.
  // Speeds unlock with campaign progress (stage index that must be reached); 5× only when replaying something already beaten.
  const SPEED_UNLOCK = [[2, 3], [3, 14], [5, 7]];
  let spd = 1, speeds = [1];
  // arena fights are replays of a fight already decided, so every unlocked speed (also 5×) may be used
  const beatenBefore = cfg => cfg.type === 'arena' || (cfg.type === 'stage' ? cfg.i <= clearedOn(cfg.diff) : cfg.n <= (S.bh[cfg.id] || 0));
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
  const sleep = ms => new Promise(r => setTimeout(r, ms / spd));
  function tween(ms, fn) {
    ms /= spd;
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / ms); fn(k); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
  }
  const ease = k => 1 - (1 - k) * (1 - k);
  const VIEW = { x: 0, w: 480 };
  const pctX = x => ((x - VIEW.x) / VIEW.w * 100) + '%', pctW = w => (w / VIEW.w * 100) + '%', pctY = y => (y / H * 100) + '%';

  // sprite metrics: feet offset + content box, from the idle frame
  const metrics = {};
  function info(id) {
    if (metrics[id]) return metrics[id];
    const s = SPR.frame(id, 'idle0'), d = s.getContext('2d').getImageData(0, 0, s.width, s.height).data;
    let x0 = s.width, x1 = 0, y0 = s.height, y1 = 0;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (d[(y * s.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return (metrics[id] = { w: s.width, h: s.height, fy: y1, top: y1 - y0, cx: (x0 + x1) / 2, cw: x1 - x0 });
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
    heroes.forEach(u => place(u, HERO_POS[pos.get(u)], -220));
    const boss = enemies.find(u => u.big || u.id === 'morwenna');
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
    hb.className = 'hitbox'; hb.type = 'button'; hb.tabIndex = -1;
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
    for (const u of R.units) {
      const rs = u._rs; if (!rs || !rs.el) continue;
      rs.el.classList.toggle('dead', !u.alive);
      rs.el.style.left = pctX(rs.x + rs.ox);
      const w = Math.max(0, u.hp / u.maxHp * 100) + '%';
      rs.el.querySelector('.hp i').style.width = w; rs.el.querySelector('.hp b').style.width = w;
      const sh = u.effects.find(e => e.k === 'shield');
      rs.el.querySelector('.hp em').style.width = sh ? Math.min(100, sh.v / u.maxHp * 100) + '%' : '0';
      const chips = u.effects.map(e => `<span class="fxc ${K.EFFECTS[e.k].buff ? '' : 'bad'}" title="${K.EFFECTS[e.k].n}: ${K.EFFECTS[e.k].d}">${K.EFFECTS[e.k].s}${e.n}</span>`);
      if (u.stacks.smids) chips.unshift(`<span class="fxc" title="Blood Frenzy: +${u.stacks.smids * 10}% Attack">FRN${u.stacks.smids}</span>`);
      if (u.stacks.charge) chips.unshift(`<span class="fxc bad" title="Static Charge">CHG${u.stacks.charge}</span>`);
      if (u.isBoss) {
        const bk = rs.el.querySelector('.brk'), broken = u.effects.some(e => e.k === 'broken');
        bk.classList.toggle('broken', broken);
        bk.querySelector('i').style.width = (broken ? 100 : u.brk / u.breakMax * 100) + '%';
        bk.querySelector('span').textContent = broken ? 'BROKEN' : `${Math.ceil(u.brk)}/${u.breakMax}`;
        rs.el.querySelector('.ph').textContent = `· Phase ${u.phase + 1}/${u.nPhases}`;
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
  function addFx(o) { o.t0 = performance.now(); o.dur = (o.dur || 300) / spd; R.fx.push(o); return new Promise(r => setTimeout(r, o.dur)); }
  function projectile(u, t, kind, col) {
    const [sx, sy] = center(u), [tx, ty] = center(t);
    const dir = u.side === 'hero' ? 1 : -1;
    const dur = (kind === 'cannon' ? 380 : kind === 'arrow' || kind === 'knife' ? 230 : 300) / spd;
    const p = { sx: sx + dir * 12, sy: sy - 6, tx, ty, t0: performance.now(), dur, kind, col };
    R.projs.push(p);
    return new Promise(res => setTimeout(() => { R.projs = R.projs.filter(x => x !== p); res(); }, dur));
  }
  function falling(t, kind, col, n) {
    const [tx, ty] = center(t); const ps = [];
    for (let i = 0; i < n; i++) {
      const dx = (Math.random() - 0.5) * 30, delay = i * 60;
      ps.push(new Promise(res => setTimeout(() => {
        const dur = (kind === 'rock' ? 320 : 200) / spd;
        const p = { sx: tx + dx + 40, sy: -20, tx: tx + dx * 0.4, ty: ty + (Math.random() - 0.5) * 12, t0: performance.now(), dur, kind, col, straight: true };
        R.projs.push(p);
        setTimeout(() => { R.projs = R.projs.filter(x => x !== p); if (kind === 'rock') { burst(p.tx, p.ty, ['#ff8a2a', '#ffd060', '#5a3a2a'], 12, 1.8, 2); R.shake = Math.max(R.shake, 3); } res(); }, dur);
      }, delay / spd)));
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
      const k = (now - f.t0) / f.dur;
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
      const k = Math.min(1, (now - p.t0) / p.dur);
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
  function frameName(u, now) {
    const rs = u._rs;
    if (!u.alive) return 'dead';
    if (rs.pose && now < rs.poseUntil) return rs.pose;
    if (u.effects.some(e => e.k === 'burrow')) return 'burrow';
    return (Math.floor(now / (rs.walking ? 140 : 520) + rs.phase) % 2) ? 'idle1' : 'idle0';
  }
  function setPose(u, pose, ms) { u._rs.pose = pose; u._rs.poseUntil = performance.now() + ms / spd; }
  function frame(now) {
    if (!R.running) return;
    const sh = R.shake > 0.3 && !calm() ? Math.round((Math.random() - 0.5) * R.shake * 2) : 0, shy = R.shake > 0.3 && !calm() ? Math.round((Math.random() - 0.5) * R.shake) : 0;
    R.shake *= 0.86;
    g.setTransform(1, 0, 0, 1, -VIEW.x, 0);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.drawImage(SPR.bg(R.area), sh, shy);
    const ashCol = [ 'rgba(190,160,150,.5)', 'rgba(180,210,225,.4)', 'rgba(200,190,170,.35)', 'rgba(200,255,140,.55)', 'rgba(255,150,60,.65)' ][R.area];
    g.fillStyle = ashCol;
    for (const a of R.ash) { a.x += a.vx; a.y += R.area === 4 ? -a.vy : a.vy; if (a.y > H) a.y = -2; if (a.y < -2) a.y = H; if (a.x < 0) a.x = W; g.fillRect(Math.round(a.x), Math.round(a.y), 1, 1); }
    const sorted = [...R.units].sort((a, b) => a._rs.y - b._rs.y);
    const pulse = 0.55 + 0.45 * Math.sin(now / 160);
    for (const u of sorted) {
      const rs = u._rs, rx = Math.round(rs.m.cw / 2.6);
      if (!u.alive && !R.hl.has(u)) continue;
      pxEllipse(Math.round(rs.x + rs.ox) + sh, rs.y, rx, 3, 'rgba(0,0,0,.42)');
      if (R.hl.has(u)) { g.globalAlpha = pulse; pxEllipse(Math.round(rs.x + rs.ox) + sh, rs.y, rx + 4, 4, R.hlKind === 'good' ? '#7cc35a' : '#d9b45a', true); g.globalAlpha = 1; }
    }
    for (const u of sorted) {
      const rs = u._rs, m = rs.m;
      if (!u.alive && rs.gone && !R.hl.has(u)) continue; // fell in an earlier phase: stays behind unless it can be revived
      const fr = frameName(u, now), flip = u.side === 'enemy';
      const img = SPR.frame(u.id, fr, flip ? 'flip' : '');
      const x = Math.round(rs.x + rs.ox - m.w / 2) + sh, y = Math.round(rs.y + rs.oy - m.fy - rs.jump) + shy;
      g.globalAlpha = u.alive ? rs.alpha : 0.75;
      if (u.id === 'nevelgeest' && u.alive) g.globalAlpha = 0.9;
      g.drawImage(img, x, y);
      if (rs.flash > 0.02 && u.alive) { g.globalAlpha = Math.min(1, rs.flash); g.drawImage(SPR.frame(u.id, fr, flip ? 'whiteflip' : 'white'), x, y); rs.flash *= 0.8; }
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

  // ----- battle hooks -----
  const SELF_KINDS = ['heal', 'shield', 'buff', 'revive', 'dust'];
  async function animBefore(u, skill, targets) {
    const rs = u._rs, dir = u.side === 'hero' ? 1 : -1, v = skill.vfx || '';
    if (skill.anim === 'melee') {
      SFX.swing();
      const tx = targets.reduce((s, t) => s + t._rs.x, 0) / targets.length - dir * ((u.big ? 30 : 22) + (targets.some(t => t.big) ? 20 : 8));
      const ty = targets.reduce((s, t) => s + t._rs.y, 0) / targets.length;
      const dx = tx - rs.x, dy = ty - rs.y;
      await tween(200, k => { const e = ease(k); rs.ox = dx * e; rs.oy = dy * e - Math.sin(k * Math.PI) * 8; });
      setPose(u, 'atk', 360);
      await tween(70, k => { rs.ox = dx + dir * 5 * Math.sin(k * Math.PI); });
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
      setPose(u, skill.anim === 'ranged' ? 'atk' : 'cast', 520);
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
      refreshChoice();
    }),
    turnStart: async u => { await bannerQ; R.active = u; renderBar(u); updateOverlay(); await sleep(u.side === 'enemy' ? 300 : 110); },
    before: animBefore,
    after: animAfter,
    pause: ms => sleep(ms),
    round: r => { $('#b-round').textContent = (B && B.nPh > 1 ? `Phase ${B.ph + 1}/${B.nPh} · ` : '') + 'Turn ' + r; },
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
        setPose(t, 'hit', 240);
        if (info.crit) { SFX.crit(); flash(); R.shake = Math.max(R.shake, 5); } else SFX.hit();
      }
      if (info.armored === true) popup(t, 'Armor', 'resist');
      if (info.armored === 'pop') popup(t, 'Protected', 'resist');
      const ox0 = rs.ox, d = t.side === 'hero' ? -1 : 1;
      tween(150, k => { rs.ox = ox0 + d * 3 * Math.sin(k * Math.PI); }).then(() => { if (!B || B.b.active !== t) rs.ox = ox0; });
      updateOverlay();
    },
    healed: (t, amt) => { popup(t, '+' + amt, 'heal'); rise(t._rs.x, t._rs.y - 10, ['#9be070', '#d8ffb0'], 6, 18); updateOverlay(); },
    float: (t, txt, kind) => popup(t, txt, kind),
    death: t => { SFX.death(); burst(t._rs.x, t._rs.y - t._rs.m.top / 2, ['#6a5a58', '#3a3036', '#8a7a78'], 18, 1.6, 2, 0.08); updateOverlay(); },
    revive: t => { popup(t, 'Revived!', 'heal'); rise(t._rs.x, t._rs.y - 8, ['#ffe8a0', '#aef08a'], 18, 22); updateOverlay(); },
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
    log,
    update: updateOverlay,
  };
  let bannerQ = Promise.resolve();
  function queueBanner(title, sub, cls, ms) { bannerQ = bannerQ.then(() => { R.dim = 0.3; return showBanner(title, sub, cls, ms); }).then(() => { R.dim = 0; }); return bannerQ; }

  function renderBar(u) {
    const isHero = u.side === 'hero';
    $('#b-por').src = SPR.url(u.id, 1, !isHero);
    $('#b-name').textContent = (isHero ? '' : 'Enemy: ') + u.name;
    const box = $('#b-skills');
    if (!isHero) { box.innerHTML = ''; $('#b-hint').textContent = 'Enemy turn…'; return; }
    if (!pending || pending.u !== u) {
      box.innerHTML = u.skills.map((s, i) => skillBtn(u, s, i, false)).join('');
      $('#b-hint').textContent = B && B.b.auto ? 'Auto is playing this turn.' : ' ';
    }
  }
  function skillBtn(u, s, i, sel) {
    const ok = B && B.b.usable(u, s);
    const sub = s.cdLeft > 0 ? `${s.cdLeft} more ${s.cdLeft === 1 ? 'turn' : 'turns'}` : (!ok ? 'Nobody has fallen' : TARGET_LABEL[s.target]);
    return `<button class="sk ${sel ? 'sel' : ''} ${ok ? 'ready' : ''} ${s.cd >= 3 ? 'big' : ''}" type="button" data-i="${i}" ${ok && pending ? '' : 'disabled'} title="${esc(s.desc)}"><span class="k">${i + 1} · ${SKILL_TAG[i] || ''}${s.cd ? ' · cd ' + s.cd : ''}${s.lv ? ' · lv ' + s.lv : ''}</span><b>${esc(s.name)}</b><small>${sub}</small></button>`;
  }
  function refreshChoice() {
    if (!pending) { R.hl = new Set(); updateOverlay(); return; }
    const { u, b } = pending, s = u.skills[selSkill];
    $('#b-skills').innerHTML = u.skills.map((sk, i) => skillBtn(u, sk, i, i === selSkill)).join('') + `<p class="b-desc">${esc(s.desc)}</p>`;
    R.hl = new Set(b.validTargets(u, s));
    R.hlKind = ['ally', 'allies', 'self', 'deadAlly', 'lowestAlly'].includes(s.target) ? 'good' : 'bad';
    const taunted = s.target === 'enemy' && b.tauntTarget(u);
    $('#b-hint').textContent = taunted ? `Taunted: you must attack ${taunted.name}.`
      : s.target === 'enemy' ? 'Click an enemy to attack.'
      : s.target === 'ally' ? 'Click an ally.'
      : s.target === 'deadAlly' ? 'Click a fallen ally.'
      : 'Click the skill again or a highlighted target.';
    updateOverlay();
  }
  function resolveChoice(target) {
    if (!pending) return;
    const { u, res } = pending, s = u.skills[selSkill];
    pending = null; R.hl = new Set();
    $('#b-skills').querySelectorAll('button').forEach(b => (b.disabled = true));
    $('#b-hint').textContent = ' ';
    updateOverlay();
    res({ skill: s, target });
  }
  function clickUnit(u) {
    if (!pending || !R.hl.has(u)) return;
    const s = pending.u.skills[selSkill];
    resolveChoice(['enemy', 'ally', 'deadAlly'].includes(s.target) ? u : null);
  }
  $('#b-skills').addEventListener('click', e => {
    const btn = e.target.closest('.sk'); if (!btn || !pending || btn.disabled) return;
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
  function setAutoBtn() { const b = $('#b-auto'); b.classList.toggle('on', S.auto); b.setAttribute('aria-pressed', S.auto ? 'true' : 'false'); b.title = 'Auto battle: ' + (S.auto ? 'on' : 'off'); }
  function setSpeedBtn() { const b = $('#b-speed'); b.innerHTML = `<b>${spd}×</b>`; b.classList.toggle('on', spd > 1); b.title = 'Battle speed ' + spd + '×' + (speedHint() ? '. ' + speedHint() : ''); b.setAttribute('aria-label', b.title); SFX.calm = calm(); }
  $('#b-auto').addEventListener('click', () => {
    if (B && B.cfg.type === 'arena') { toast('Arena fights always play on auto.'); return; }
    S.auto = !S.auto; save(); setAutoBtn();
    if (B) B.b.auto = S.auto;
    if (S.auto && pending) { const { u, res, b } = pending; pending = null; R.hl = new Set(); updateOverlay(); $('#b-hint').textContent = 'Auto is playing this turn.'; res(b.ai(u)); }
  });
  $('#b-speed').addEventListener('click', () => {
    if (speeds.length === 1) { toast(speedHint()); return; }
    spd = speeds[(speeds.indexOf(spd) + 1) % speeds.length]; S.speed = spd; save(); setSpeedBtn();
    if (spd === 1 && speedHint()) toast(speedHint());
  });
  $('#b-quit').addEventListener('click', () => {
    // arena: the result is already known, so this skips ahead (fast forward) instead of surrendering
    if (B && B.cfg.type === 'arena') { spd = 40; SFX.calm = true; toast('Skipping to the result…'); return; }
    const btn = $('#b-quit');
    if (Date.now() - quitArm > 3000) { quitArm = Date.now(); btn.classList.add('armed'); btn.setAttribute('aria-label', 'Tap again to give up'); setTimeout(() => { btn.classList.remove('armed'); btn.setAttribute('aria-label', 'Give up'); }, 3000); return; }
    quitArm = 0; btn.classList.remove('armed'); btn.setAttribute('aria-label', 'Give up');
    if (!B) return;
    B.b.aborted = true;
    if (pending) { const { u, res, b } = pending; pending = null; res(b.ai(u)); }
  });

  // ----- start / intro / finish -----
  function startCampaign(i) {
    const st = K.STAGES[i], diff = S.diff || 0, D = K.DIFFS[diff], lvl = K.diffLvl(st, diff);
    S.chap = st.chapter;
    runBattle({ type: 'stage', i, diff, hard: diff > 0, lvl, stage: st, foes: st.foes, area: st.area, title: `${stageName(i)}${diff ? ' · ' + D.name : ''}${st.boss ? ' · ' + st.boss : ''}` });
  }
  function startDungeon(id, n) {
    const bi = K.BOSS_ORDER.indexOf(id), bo = K.BOSSES[id];
    runBattle({ type: 'boss', id, bi, n, lvl: K.bossLvl(bi, n), foes: K.bossFoes(id, n), phases: K.bossPhases(id, n), area: AREA_OF[bo.aff], title: `${bo.name} · level ${n}` });
  }
  // enemies of phase p (0-based): campaign stages and Boss Hall levels both have K.PHASES phases
  const phaseUnits = (cfg, p) => cfg.stage ? K.stageUnits(cfg.stage, cfg.lvl, p, cfg.diff) : K.bossUnits(cfg.id, cfg.n, p);
  // phase cleared: the survivors walk off to the right, then everyone walks in for the next phase
  async function nextPhase(heroes, enemies, p) {
    const alive = heroes.filter(u => u.alive);
    await showBanner(`Phase ${p} cleared`, 'Onward!', '', 700);
    alive.forEach(u => (u._rs.walking = true));
    await tween(1100, k => { const e = k * k; alive.forEach(u => { u._rs.ox = e * 420; }); updateOverlay(); });
    K.phaseRest(heroes);
    setupRender(heroes, enemies);
    heroes.filter(u => !u.alive).forEach(u => (u._rs.gone = true));
    R.units.forEach(u => (u._rs.walking = true));
    await tween(900, k => { const e = ease(k); R.units.forEach(u => { u._rs.ox = (u.side === 'hero' ? -220 : 220) * (1 - e); }); updateOverlay(); });
    R.units.forEach(u => { u._rs.walking = false; u._rs.ox = 0; });
    updateOverlay();
  }
  async function runBattle(cfg) {
    SFX.unlock();
    // Arena: a replay of the fight the server already played. Both teams come from the server's snapshots and the dice
    // from its seed (K.arenaSetup), so this plays out exactly like on the server; both sides play on auto.
    const arena = cfg.type === 'arena', nPh = arena ? 1 : K.PHASES;
    let heroes, enemies;
    if (arena) ({ heroes, enemies } = K.arenaSetup(cfg.att, cfg.def, cfg.seed));
    else { heroes = S.team.map(id => K.heroUnit(id, S.roster[id], itemsOf(id))); enemies = phaseUnits(cfg, 0); }
    $('#screen').hidden = true; $('#tabs').hidden = true; $('#battle').hidden = false;
    $('#b-title').textContent = cfg.title; $('#b-round').textContent = (nPh > 1 ? `Phase 1/${nPh} · ` : '') + 'Turn 1';
    $('#b-log').innerHTML = ''; $('#b-skills').innerHTML = ''; $('#b-hint').textContent = ' ';
    R.area = cfg.area;
    const narrow = window.innerWidth < 640;
    VIEW.x = narrow ? 60 : 0; VIEW.w = narrow ? 360 : 480;
    cvs.width = VIEW.w; g.imageSmoothingEnabled = false;
    $('.stage-wrap').style.aspectRatio = narrow ? '4 / 3' : '16 / 9';
    speeds = speedsFor(cfg);
    spd = speeds.filter(x => x <= (S.speed || 1)).pop();
    // auto battle is remembered: once switched on it stays on for every battle until the player turns it off
    let b = new K.Battle(heroes, enemies, hooks);
    b.auto = arena || S.auto;
    B = { b, cfg, ph: 0, nPh };
    setupRender(heroes, enemies);
    setAutoBtn(); setSpeedBtn();
    R.running = true; requestAnimationFrame(frame);
    window.scrollTo({ top: 0 });
    // intro: everyone walks in
    R.units.forEach(u => (u._rs.walking = true));
    await tween(800, k => { const e = ease(k); R.units.forEach(u => { u._rs.ox = (u.side === 'hero' ? -220 : 220) * (1 - e); }); updateOverlay(); });
    R.units.forEach(u => { u._rs.walking = false; u._rs.ox = 0; });
    updateOverlay();
    bannerQ = Promise.resolve();
    await showBanner(cfg.title, arena ? 'Arena · both teams fight on auto' : `Phase 1 / ${K.PHASES} · The battle begins`, 'big', 800);
    log(arena ? 'The arena fight begins. Speed decides the turn order.' : `The battle begins: ${K.PHASES} phases. Speed decides the turn order.`);
    // phases: the same hero units fight on; damage stats add up over the phases
    const tot = { dmg: {}, crits: 0, maxHit: 0, turns: 0 };
    const addStats = x => { for (const k in x.stats.dmg) tot.dmg[k] = (tot.dmg[k] || 0) + x.stats.dmg[k]; tot.crits += x.stats.crits; tot.maxHit = Math.max(tot.maxHit, x.stats.maxHit); tot.turns += x.turns; };
    let res;
    for (let p = 0; p < nPh; p++) {
      if (p) {
        enemies = phaseUnits(cfg, p);
        await nextPhase(heroes, enemies, p);
        b = new K.Battle(heroes, enemies, hooks); b.auto = S.auto;
        B.b = b; B.ph = p;
        const boss = enemies.find(u => u.isBoss);
        await showBanner(boss ? boss.name : `Phase ${p + 1} / ${K.PHASES}`, boss ? `Boss fight · ${boss.aff} · ${boss.nPhases} boss phases` : `${enemies.length} enemies`, 'big', 800);
        log(`Phase ${p + 1} of ${K.PHASES}: ${enemies.length} ${enemies.length === 1 ? 'enemy' : 'enemies'}.`);
        if (boss) log(`${boss.name} · ${E[boss.id].passiveName}: ${E[boss.id].passiveDesc}`, 'enemy');
      }
      res = await b.run();
      addStats(b);
      R.active = null; R.hl = new Set(); updateOverlay();
      if (res !== 'win' || b.aborted) break;
    }
    if (arena) K.setRng(null);
    b.stats = tot; b.turns = tot.turns;
    // arena: the server's result counts (the replay should always agree; warn if it ever does not)
    if (arena && (res === 'win') !== cfg.win) console.warn('Arena replay differs from the server result', cfg.seed);
    const win = arena ? cfg.win : res === 'win' && !b.aborted;
    if (win) {
      SFX.win();
      const alive = heroes.filter(u => u.alive);
      for (let j = 0; j < 2; j++) await tween(300, k => alive.forEach(u => (u._rs.jump = 10 * Math.sin(k * Math.PI))));
      for (let i = 0; i < 40; i++) part(Math.random() * W, -4, (Math.random() - 0.5) * 0.6, 0.6 + Math.random(), ['#d9b45a', '#fff0b0', '#e8743b'][i % 3], 120, 2, 0.01);
      await showBanner('Victory!', cfg.title, 'big', 900);
    } else {
      SFX.lose(); R.dim = 0.4;
      await showBanner(b.aborted ? 'Surrendered' : 'Defeated', cfg.title, 'big lose', 900);
    }
    if (arena) finishArena(cfg); else finishBattle(win);
  }

  function grantXp(amount) {
    const ups = [];
    for (const id of S.team) {
      const h = S.roster[id], cap = K.maxLvl(h.stars, id);
      if (h.lvl >= cap) continue;
      const l0 = h.lvl; h.xp += amount;
      while (h.lvl < cap && h.xp >= K.xpNeed(h.lvl)) { h.xp -= K.xpNeed(h.lvl); h.lvl++; }
      if (h.lvl >= cap) h.xp = 0;
      if (h.lvl > l0) ups.push([id, h.lvl, h.lvl >= cap]);
    }
    return ups;
  }
  // returns one entry per level gained: [level, silver, shard, unlocked tab or null]
  function grantPlayerXp(amount) {
    const p = S.p, ups = [];
    p.xp += amount;
    while (p.xp >= pxNeed(p.lvl)) {
      p.xp -= pxNeed(p.lvl); p.lvl++;
      const silver = levelSilver(p.lvl), shard = p.lvl % 5 === 0 ? 'greater' : null;
      S.silver += silver; if (shard) S.fs[shard] = (S.fs[shard] || 0) + 1;
      ups.push([p.lvl, silver, shard, Object.keys(PLAYER_UNLOCK).find(t => PLAYER_UNLOCK[t] === p.lvl) || null]);
    }
    return ups;
  }
  // unlock messages (S.seen remembers which were shown): speed 3× and 5×, Fate Altar, Boss Hall
  function newUnlocks() {
    const out = [];
    for (const [sp, at] of SPEED_UNLOCK) if (sp > 2 && !S.seen['spd' + sp] && S.cleared + 1 >= at) {
      S.seen['spd' + sp] = true;
      out.push({ k: 'spd', title: `Speed ${sp}× unlocked`, text: sp === 5 ? 'Battles can now run at 5× when you replay a stage you already cleared or a Boss Hall level you already beat.' : `Tap the speed button in battle to switch to ${sp}×.` });
    }
    for (const k in PLAYER_UNLOCK) if (!S.seen[k] && S.p.lvl >= PLAYER_UNLOCK[k]) {
      S.seen[k] = true;
      out.push({ k, title: `${UNLOCK_NAME[k]} unlocked`, text: k === 'altaar' ? 'Use your Fate Shards at the Fate Altar to summon new heroes.' : k === 'arena' ? 'Fight the teams of other players, climb the ranking and earn weekly rewards.' : 'Challenge the bosses of the Boss Hall for their rare gear sets.' });
    }
    return out;
  }
  function showUnlocks(list) {
    if (!list.length) return;
    const u = list[0], el = document.createElement('div');
    el.className = 'unlock-pop'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-label', u.title);
    const svg = u.k === 'spd' ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 3l6 5-6 5zM8 3l6 5-6 5z" fill="currentColor"/></svg>' : LOCK_SVG.replace('M5 7V5a3 3 0 0 1 6 0v2', 'M5 7V5a3 3 0 0 1 6 0');
    el.innerHTML = `<div class="unlock-card"><div class="unlock-ic">${svg}</div><span class="tag">New unlock</span><h2>${esc(u.title)}</h2><p>${esc(u.text)}</p><button class="btn primary" type="button">${list.length > 1 ? 'Next' : 'Great!'}</button></div>`;
    document.body.appendChild(el);
    SFX.up();
    const btn = el.querySelector('button'); btn.focus();
    btn.addEventListener('click', () => { el.remove(); showUnlocks(list.slice(1)); });
  }
  function finishBattle(win) {
    const cfg = B.cfg, b = B.b, lvl = cfg.lvl;
    const items = [], loot = [];
    let xp, silver, stones = 0, unlock = null, first = false, captured = null;
    const gotShards = [];
    if (win) {
      xp = K.winXp(lvl); silver = K.winSilver(lvl);
      if (cfg.type === 'stage') {
        const hard = cfg.hard, cleared = clearedOn(cfg.diff);
        if (cfg.i > cleared) { first = true; if (cfg.diff) S.dcl[cfg.diff] = cfg.i; else S.cleared = cfg.i; gotShards.push(cfg.stage.n === 6 ? 'greater' : 'fate'); stones = 3; }
        else { stones = Math.random() < 0.35 ? 1 : 0; }
        if (first || Math.random() < 0.65) loot.push(K.genGear({ il: lvl, slot: cfg.stage.slot || K.pick(K.SLOTS), ...K.stageLoot(cfg.stage, cfg.diff), sets: [cfg.stage.set] }, S.nid++));
        if (first && cfg.stage.n === 6) delete S.chap;
        const u = K.STAGES[cfg.i].unlock;
        const catchable = [...new Set(cfg.stage.phases.flat())].filter(f => !K.BOSSES[f]);
        if (catchable.length && Math.random() < K.CAPTURE_CHANCE) {
          const cid = K.pick(catchable);
          if (!S.roster[cid]) { S.roster[cid] = newHero(cid); captured = { id: cid, isNew: true }; }
          else { S.fodder[cid] = (S.fodder[cid] || 0) + 1; captured = { id: cid, isNew: false }; }
        }
        if (!hard && u && !S.roster[u]) { S.roster[u] = newHero(u); S.roster[u].lvl = Math.max(1, Math.min(K.maxLvl(S.roster[u].stars, u), Math.min(...S.team.map(id => S.roster[id].lvl)) - 1)); unlock = u; if (S.team.length < 4) S.team.push(u); }
      } else {
        if (cfg.n > (S.bh[cfg.id] || 0)) { S.bh[cfg.id] = cfg.n; first = true; S.bhSel[cfg.id] = Math.min(K.BOSS_LEVELS, cfg.n + 1); }
        stones = 1 + Math.floor(cfg.n / 3);
        if (first && cfg.n === 1) gotShards.push('fate');
        if (first && cfg.n === 5) gotShards.push('greater');
        if (first && cfg.n === 10) gotShards.push('ancient');
        const drops = 1 + (cfg.n >= 5 ? 1 : 0) + (first ? 1 : 0);
        for (let i = 0; i < drops; i++) loot.push(K.genGear({ il: lvl, ...K.bossLoot(cfg.n), sets: K.bossSets(cfg.bi) }, S.nid++));
        if (first && cfg.n === 1 && cfg.bi + 1 < K.BOSS_ORDER.length) S.bhCur = K.BOSS_ORDER[cfg.bi + 1];
      }
      xp = Math.round(xp * (cfg.type === 'boss' ? 1.2 : 1));
    } else { xp = Math.round(K.winXp(lvl) * 0.25); silver = Math.round(K.winSilver(lvl) * 0.3); }
    if (win) gotShards.push(...K.rollShards());
    S.silver += silver; S.stones += stones;
    for (const t of gotShards) S.fs[t] = (S.fs[t] || 0) + 1;
    loot.forEach(it => S.inv.push(it));
    const ups = grantXp(xp);
    const pxp = win ? playerWinXp(lvl, first, cfg.type === 'boss') : b.aborted ? 0 : Math.round(playerWinXp(lvl) * 0.25);
    const pups = grantPlayerXp(pxp);
    if (win) { S.p.st.won++; if (cfg.type === 'boss') S.p.st.bossWon++; } else if (!b.aborted) S.p.st.lost++;
    const unlocks = newUnlocks();
    save();
    let dl = 0; const d = () => `style="animation-delay:${(dl++) * 0.12}s"`;
    items.push(`<li ${d()}>${ic('coin')}+${silver.toLocaleString('en-US')} Sigils</li>`);
    items.push(`<li ${d()}><span class="aff" style="--c:var(--info)">XP</span>+${xp} XP for every champion in your team</li>`);
    if (pxp) items.push(`<li ${d()}><span class="aff" style="--c:var(--gold)">P</span>+${pxp} player XP${pups.length ? '' : ` · ${S.p.xp} / ${pxNeed(S.p.lvl)} to level ${S.p.lvl + 1}`}</li>`);
    pups.forEach(([l, sv, sh, t]) => items.push(`<li class="loot lvup" ${d()}><span class="lvbadge">${l}</span><span><b>Player level ${l}!</b> +${sv.toLocaleString('en-US')} Sigils${sh ? ` · +1 ${esc(K.SHARD[sh].name)}` : ''}${t ? ` · <b>The ${UNLOCK_NAME[t]} is now open.</b>` : ''}</span></li>`));
    for (const t of gotShards) items.push(`<li class="loot rar-${K.FATE_SHARDS.findIndex(f => f.id === t)}" ${d()}>${shardIc(t)}+1 ${esc(K.SHARD[t].name)}</li>`);
    if (stones) items.push(`<li ${d()}>${ic('stone')}+${stones} ${stones === 1 ? 'Ascension Stone' : 'Ascension Stones'}</li>`);
    ups.forEach(([id, l, cap]) => items.push(`<li class="up" ${d()}>${por(id)}${esc(C[id].short)} is now level ${l}${cap ? ' (maximum, ascend for more)' : ''}</li>`));
    if (win && isStageCfg(cfg) && !loot.length) items.push(`<li ${d()}><span class="aff" style="--c:var(--muted)">–</span>No ${esc(dropName(cfg.stage).toLowerCase())} dropped this time.</li>`);
    loot.forEach(it => items.push(`<li class="loot rar-${it.rar}" ${d()}>${gearIcon(it, 'loot-ic')}<span><span class="item-name">${itemName(it)}</span> · <span class="item-set">${K.SETS[it.set].name}</span></span></li>`));
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
    const note = win && first && last ? `<p class="lede">You finished all ten chapters on ${K.DIFFS[cfg.diff].name}.${nd ? ` ${nd.name} difficulty is now open: tougher enemies, better gear (${rarsHtml(nd.rars)}).` : ' You beat the hardest difficulty!'}</p>`
      : win && first && isStage && cfg.stage.n === 6 && cfg.stage.chapter + 1 < K.CHAPTERS.length ? `<p class="lede">Chapter ${ROMAN[cfg.stage.chapter]} cleared. Chapter ${ROMAN[cfg.stage.chapter + 1]}, ${esc(K.CHAPTERS[cfg.stage.chapter + 1].name)}, is now open.</p>`
      : win && first && cfg.type === 'boss' && cfg.n === 1 && cfg.bi + 1 < K.BOSS_ORDER.length ? `<p class="lede">${esc(K.BOSSES[K.BOSS_ORDER[cfg.bi + 1]].name)} is now open in the Boss Hall.</p>`
      : win ? '' : '<p class="lede">Tip: level your team, equip better gear, bring faster champions, or pick essences that land Strong Hits.</p>';
    const canNext = isStage ? cfg.i + 1 < K.STAGES.length : cfg.n < K.BOSS_LEVELS && (S.bh[cfg.id] || 0) >= cfg.n;
    const acts = win
      ? `${canNext ? `<button class="btn primary" data-act="modal" data-go="next">${isStage ? 'Next stage' : 'Next level'}</button>` : ''}<button class="btn" data-act="modal" data-go="again">Replay</button><button class="btn" data-act="modal" data-go="champs">Champions</button><button class="btn" data-act="modal" data-go="back">Back</button>`
      : `<button class="btn primary" data-act="modal" data-go="again">Try again</button><button class="btn" data-act="modal" data-go="champs">Upgrade champions</button><button class="btn" data-act="modal" data-go="back">Back</button>`;
    const openBtns = pups.map(u => u[3]).filter(Boolean).map(t => `<button class="btn violet" data-act="modal" data-go="open-${t}">Open the ${UNLOCK_NAME[t]}</button>`).join('');
    if (pups.length) SFX.up();
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box ${win ? '' : 'lose'}" role="dialog" aria-modal="true"><h2>${win ? 'Victory' : b.aborted ? 'Surrendered' : 'Defeated'}</h2><p class="tag">${esc(cfg.title)}${win && first ? ' · first clear' : ''}</p>${mvp}<ul class="rewards">${items.join('')}</ul>${note}<div class="modal-actions">${openBtns}${acts}</div></div>`;
    m.hidden = false;
    const f = m.querySelector('.btn'); if (f) f.focus();
    setTimeout(() => showUnlocks(unlocks), 500);
  }
  function endBattleView() {
    R.running = false; pending = null;
    $('#battle').hidden = true; $('#screen').hidden = false; $('#tabs').hidden = false; $('#ov').innerHTML = ''; $('#banner').hidden = true;
  }
  function modalAction(go) {
    $('#modal').hidden = true;
    if (go === 'summon1') { doSummon(1); return; }
    if (go === 'summon10') { doSummon(10); return; }
    if (go === 'close') { render(); return; }
    const cfg = B && B.cfg;
    endBattleView(); B = null;
    if (!cfg) { render(); return; }
    if (go.startsWith('open-')) setTab(go.slice(5));
    else if (go === 'next') { if (cfg.type === 'stage') startCampaign(cfg.i + 1); else startDungeon(cfg.id, cfg.n + 1); }
    else if (go === 'again') { if (cfg.type === 'stage') startCampaign(cfg.i); else startDungeon(cfg.id, cfg.n); }
    else if (go === 'champs') setTab('champions');
    else if (cfg.type === 'arena') setTab('arena');
    else setTab(cfg.type === 'stage' ? 'campagne' : 'kerkers');
  }

  // ---------- boot ----------
  function announceReset() {
    if (!S.wasReset) return false;
    delete S.wasReset; save();
    toast('A new season has begun: everyone starts fresh. Choose your hero!', false, 7000);
    return true;
  }
  function start(data) {
    S = load(data && data.S);
    fixup(S);
    if (window.FFH_CLOUD) window.FFH_CLOUD.attach({
      get: () => S,
      set: ns => { const m = migrate(ns); if (!m) return; S = fixup(m); save(); if (!B) render(); else hud(); announceReset(); },
      toast: msg => toast(msg),
      paint: () => paintAccount(),
      // short description of any save (also an older version), for the "which save to keep" dialog
      summary: s => {
        const p = s.p || {}, heroes = Object.keys(s.roster || {}).filter(id => C[id]).length;
        const top = Object.entries(s.roster || {}).filter(([id]) => C[id]).sort((a, b) => b[1].lvl - a[1].lvl)[0];
        return `<b>${esc(p.name || 'Adventurer')}</b> · player level ${p.lvl || 1}<br>${(s.cleared ?? -1) + 1} / ${K.STAGES.length} stages · ${heroes} heroes${top ? ` · best: ${esc(C[top[0]].short)} lv ${top[1].lvl}` : ''}<br>${(s.silver || 0).toLocaleString('en-US')} Sigils`;
      },
    });
    save();
    $('#logo').src = LOGO_URL;
    $('#ic-coin').src = SIGIL_ART; $('#ic-coin').className = 'sigil-ic'; $('#ic-shard').src = SHARD_ART.fate0; $('#ic-shard').className = 'shard-ic'; $('#ic-stone').src = STONE_ART; $('#ic-stone').className = 'shard-ic';
    render();
    if (announceReset()) return;
    const m7 = S.migrated7; delete S.migrated7;
    if (S.migrated) { delete S.migrated; delete S.migrated4; delete S.migrated5; delete S.migrated6; save(); toast('Your progress was carried over. Your champions were replaced by the new heroes.'); }
    else if (S.migrated4) { delete S.migrated4; delete S.migrated5; save(); toast('New combat system: Essences, Speed and the Boss Hall. Your progress was kept.'); }
    else if (S.migrated5) { delete S.migrated5; delete S.migrated6; save(); toast('The campaign now has 10 chapters of 7 stages. Your progress was moved to the matching stage.'); }
    else if (S.migrated6) { delete S.migrated6; save(); toast('The Fate Altar is open: your crown shards are now Fate Shards, and you got a Greater Fate Shard.'); }
    else if (m7) { save(); toast(`New: player levels. Win battles to level up. The Fate Altar opens at level ${PLAYER_UNLOCK.altaar}, the Boss Hall at level ${PLAYER_UNLOCK.kerkers}. Tap your avatar for your profile.`, false, 7000); }
  }
  window.claude?.hot?.snapshot?.(() => ({ S }));
  const boot = data => SPR.preload().then(() => start(data));
  if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
})();

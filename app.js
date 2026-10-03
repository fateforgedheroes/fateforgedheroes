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
  // what opens a building: the Fate Altar at a player level, the Arena and the Boss Hall after clearing a chapter (Easy)
  const UNLOCKS = { altaar: { lvl: 5 }, arena: { ch: 2 }, guild: { ch: 2 }, kerkers: { ch: 3 } };
  const PLAYER_UNLOCK = { altaar: 5 }; // the player-level ones (level-up messages)
  const isOpen = (s, t) => { const u = UNLOCKS[t]; return !u || (u.lvl ? s.p.lvl >= u.lvl : s.cleared >= u.ch * 7 - 1); };
  const needTxt = t => { const u = UNLOCKS[t]; return u.lvl ? `player level ${u.lvl}` : `clearing Chapter ${ROMAN[u.ch - 1]}`; };
  const needTag = t => { const u = UNLOCKS[t]; return u.lvl ? `Lv ${u.lvl}` : `Ch ${ROMAN[u.ch - 1]}`; };
  const UNLOCK_NAME = { altaar: 'Fate Altar', kerkers: 'Boss Hall', arena: 'Arena', guild: 'Guilds' };
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
  // ---------- Teams: up to TEAM_MAX named teams (S.teams[i] = { name, ids }); S.modeTeam says which team each game mode
  // uses. S.team is the team in use (the one on the Team screen and in the last battle): the same array as
  // S.teams[S.tsel].ids, linked again after every load (JSON drops the link) ----------
  const TEAM_MAX = 3, TEAM_MODES = [['campaign', 'Campaign'], ['boss', 'Boss Hall'], ['arena', 'Arena'], ['guild', 'Guild Boss']];
  function linkTeams(s) {
    if (!Array.isArray(s.teams) || !s.teams.length) s.teams = [{ name: 'Team 1', ids: Array.isArray(s.team) ? s.team : [] }];
    s.tsel = Math.min(Math.max(0, s.tsel | 0), s.teams.length - 1);
    s.modeTeam = s.modeTeam || {};
    for (const [m] of TEAM_MODES) if (!(s.modeTeam[m] < s.teams.length)) s.modeTeam[m] = 0;
    s.team = s.teams[s.tsel].ids;
    return s;
  }
  const teamIds = mode => (S.teams[S.modeTeam[mode]] || S.teams[0]).ids;
  const inAnyTeam = id => S.teams.some(t => t.ids.includes(id));
  // switch to the team a mode uses (before its battle)
  function useTeam(mode) { S.tsel = S.modeTeam[mode] || 0; S.team = S.teams[S.tsel].ids; }
  function fixup(s) {
    linkTeams(s); s.stx = s.stx || { greater: 0, ancient: 0 };
    if (s.p.renames == null) s.p.renames = s.p.name !== 'Adventurer' ? 1 : 0; s.fodder = s.fodder || {};
    if (s.music == null) s.music = true; // background music (MUSIC), on by default
    // the starter hero (default portrait); older saves did not store it, so take the starter that is in the roster
    if (!s.starter && !s.needStarter) s.starter = K.STARTERS.find(id => s.roster[id]) || null;
    // the homebase tour (TOUR) is for new players; anyone past the first stage has found their way already
    if (s.seen && s.seen.tour == null && s.cleared > 0) s.seen.tour = true;
    if (!s.dcl) { s.dcl = [null, s.clearedHard ?? -1, -1, -1, -1]; s.diff = 0; delete s.hard; delete s.clearedHard; }
    if (!s.seen) {
      s.seen = {};
      for (const [sp, at] of SPEED_UNLOCK) if (sp > 2 && s.cleared + 1 >= at) s.seen['spd' + sp] = true;
      for (const k in UNLOCKS) if (isOpen(s, k)) s.seen[k] = true;
    }
    return s;
  }
  const clearedOn = d => (d ? S.dcl[d] ?? -1 : S.cleared);
  function newHero(id) { return { lvl: 1, xp: 0, stars: K.baseStars(id), sk: C[id].skills.map(() => 0) }; }
  // A new save has no heroes yet: the player first picks one of K.STARTERS (needStarter), the rest is earned in Chapter I.
  function fresh() {
    const s = { v: 7, reset: RESET, p: newPlayer(), silver: 400, fs: { fate: 3, greater: 1, ancient: 0, mythic: 0, legendary: 0 }, stones: 0, roster: {}, team: [], needStarter: true, inv: [], nid: 1, cleared: -1, dcl: [null, -1, -1, -1, -1], diff: 0, seen: {}, bh: {}, bhSel: {}, bhCur: K.BOSS_ORDER[0], auto: false, speed: 1, sound: true, music: true };
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

  // ---------- music ----------
  // 8-bit background music made live with WebAudio, like an old console sound chip: a pulse-wave lead (25% duty), a
  // square arpeggio, a triangle bass and noise drums. Tracks are written as notes per eighth note ('-' holds the note
  // before, '.' is a rest); bass and arpeggio follow the chord of each bar. A Web Worker tick schedules ahead, so the
  // music keeps time in a hidden tab too. S.music switches it on or off (separate from the sound effects).
  const MUSIC = (() => {
    const TRACKS = {
      home: {
        bpm: 100,
        chords: 'C G Am F C G F G Am F C G Am F G C',
        lead: [
          'E5 - G5 - C6 - B5 A5', 'G5 - - - D5 - G5 -', 'A5 - B5 C6 B5 - A5 G5', 'A5 - - - F5 - . .',
          'E5 - G5 - C6 - D6 E6', 'D6 - B5 - G5 - B5 -', 'C6 - A5 - F5 - A5 C6', 'B5 - - - G5 - - -',
          'A4 - C5 - E5 - A5 -', 'G5 F5 E5 - F5 - C5 -', 'E5 - G5 - E5 - C5 -', 'D5 - - - B4 - D5 -',
          'C5 - E5 - A5 - C6 -', 'B5 A5 G5 - A5 - F5 -', 'G5 - A5 B5 D6 - B5 -', 'C6 - - - - - . .',
        ],
        // drums per bar: k kick, s snare, h hi-hat (first half calm, second half with snare)
        drums: ['k . h . k . h .', 'k h s h k h s h'],
        drumBars: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      },
    };
    const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    const freq = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
    const CHORD = { C: ['C', 'E', 'G'], G: ['G', 'B', 'D'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], Dm: ['D', 'F', 'A'], Em: ['E', 'G', 'B'], E: ['E', 'G#', 'B'] };
    // a track as a list of events per channel: { step, f, len } in eighth notes
    function build(t) {
      const ev = { lead: [], arp: [], bass: [], drum: [] }, chords = t.chords.split(' ');
      t.lead.forEach((bar, b) => bar.split(' ').forEach((tok, i) => {
        const step = b * 8 + i;
        if (tok === '-') { const last = ev.lead[ev.lead.length - 1]; if (last) last.len++; } else if (tok !== '.') ev.lead.push({ step, f: freq(tok), len: 1 });
      }));
      chords.forEach((c, b) => {
        const [r, th, fi] = CHORD[c], low = fi + (NOTE[fi] < NOTE[r] ? 3 : 2);
        // bass: root, fifth below, and a pickup on the last eighth
        ev.bass.push({ step: b * 8, f: freq(r + 3), len: 3 }, { step: b * 8 + 4, f: freq(low), len: 3 }, { step: b * 8 + 7, f: freq(r + 3), len: 1 });
        [r, th, fi, th].forEach((n, k) => { const oct = NOTE[n] < NOTE[r] ? 5 : 4; ev.arp.push({ step: b * 8 + k, f: freq(n + oct), len: 1 }, { step: b * 8 + 4 + k, f: freq(n + oct), len: 1 }); });
        t.drums[t.drumBars[b]].split(' ').forEach((d, i) => { if (d !== '.') ev.drum.push({ step: b * 8 + i, d }); });
      });
      return { ev, steps: chords.length * 8, spb: 60 / t.bpm / 2 };
    }
    let ctx = null, out = null, pulse = null, noiseBuf = null, cur = null, want = null, startAt = 0, next = 0, timer = null;
    function init() {
      if (ctx) return ctx;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);
        const N = 32, re = new Float32Array(N), im = new Float32Array(N);
        for (let n = 1; n < N; n++) re[n] = 2 * Math.sin(n * Math.PI * 0.25) / (n * Math.PI);
        pulse = ctx.createPeriodicWave(re, im);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const w = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 100);'], { type: 'text/javascript' })));
        w.onmessage = () => schedule();
      } catch (e) { ctx = null; }
      return ctx;
    }
    function note(f, t, dur, wave, vol) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      if (wave === 'pulse') o.setPeriodicWave(pulse); else o.type = wave;
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.linearRampToValueAtTime(vol * 0.6, t + 0.08);
      g.gain.setValueAtTime(vol * 0.6, t + Math.max(0.09, dur - 0.03)); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
    }
    function drum(d, t) {
      if (d === 'k') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.16); return; }
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), len = d === 's' ? 0.12 : 0.035;
      s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = d === 's' ? 1200 : 7000;
      g.gain.setValueAtTime(d === 's' ? 0.22 : 0.09, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.01);
    }
    // schedules every eighth note that starts within the look-ahead window
    function schedule() {
      if (!cur || !ctx) return;
      const ahead = ctx.currentTime + 1.2;
      while (startAt + next * cur.spb < ahead) {
        const step = next % cur.steps, t = startAt + next * cur.spb;
        for (const e of cur.ev.lead) if (e.step === step) note(e.f, t, e.len * cur.spb * 0.95, 'pulse', 0.1);
        for (const e of cur.ev.arp) if (e.step === step) note(e.f, t, cur.spb * 0.6, 'square', 0.025);
        for (const e of cur.ev.bass) if (e.step === step) note(e.f, t, e.len * cur.spb * 0.9, 'triangle', 0.22);
        for (const e of cur.ev.drum) if (e.step === step) drum(e.d, t);
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
      if (cur && cur.name === want) { out.gain.linearRampToValueAtTime(0.5, now + 0.4); return; }
      cur = Object.assign(built[want] || (built[want] = build(TRACKS[want])), { name: want });
      startAt = now + 0.1; next = 0;
      out.gain.setValueAtTime(0, now); out.gain.linearRampToValueAtTime(0.5, now + 1.5);
    }
    return {
      // play a track ('home') or null for silence; starts for real after the first click (browser rule)
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
    $('#silver').textContent = S.silver.toLocaleString('en-US'); paintEnergy();
    const totalFs = K.FATE_SHARDS.reduce((t, f) => t + (S.fs[f.id] || 0), 0);
    $('#shards').textContent = totalFs; $('#shards').parentElement.title = 'Fate Shards: ' + K.FATE_SHARDS.map(f => `${f.name} ${S.fs[f.id] || 0}`).join(', '); $('#stones').textContent = S.stones; $('#stones').parentElement.title = 'Ascension Stones: ' + K.STONES.map(s => `${stoneN(s.id)} ${s.name.replace(/ Ascension Stone$/, '')}`).join(', ') + '. Lesser for 2-4★, Greater for 5★, Ancient for 6★.';
    const sb = $('#sound'); sb.classList.toggle('on', S.sound); sb.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
    sb.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 6h3l4-3v10l-4-3h-3z"/><path d="${S.sound ? 'M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6.3 6.3 0 0 1 0 9' : 'M11 6l4 4M15 6l-4 4'}"/></svg><span class="lbl">${S.sound ? 'Sound on' : 'Sound off'}</span>`;
    document.querySelector('#tabs [data-tab="altaar"] .dot').hidden = !(totalFs > 0 && unlocked('altaar'));
    for (const t in UNLOCKS) document.querySelector(`#tabs [data-tab="${t}"]`)?.classList.toggle('locked', !unlocked(t));
    paintAccount();
  }
  const unlocked = t => isOpen(S, t);
  // the portrait a player shows: the avatar they picked, else their starter hero, else their first team member
  const avatarId = () => (S.p.avatar && S.roster[S.p.avatar] ? S.p.avatar : S.starter && S.roster[S.starter] ? S.starter : S.team[0]);
  function paintAccount() {
    // the mail badge follows the account: load friends and mail when someone signs in (or switches account)
    paintMail(); if (signedIn() && SO.who !== cloud().info().email) socialLoad();
    // no hero yet (starter choice): a plain person icon instead of an avatar
    if (!avatarId()) { $('#account').innerHTML = `<svg class="acc-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/></svg><span class="acc-lv">Lv ${S.p.lvl}</span>`; return; }
    const b = $('#account'), cl = window.FFH_CLOUD && window.FFH_CLOUD.info();
    const dot = cl && cl.email ? `<i class="acc-dot ${cl.status === 'error' ? 'err' : cl.status === 'syncing' ? 'sync' : ''}"></i>` : '';
    b.innerHTML = `${por(avatarId(), 1, 'acc-av')}<span class="acc-lv">Lv ${S.p.lvl}</span><span class="acc-name">${esc(S.p.name)}</span>${dot}`;
    b.title = `${S.p.name} · player level ${S.p.lvl}` + (cl && cl.email ? (cl.status === 'error' ? ' · cloud save failed' : ' · saved to your account') : cl && cl.enabled ? ' · not signed in' : '');
    if (tab === 'profiel' && !B && !$('#screen').hidden && !$('#screen input:focus')) $('#screen').innerHTML = profileHtml();
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
  let tab = 'home', selChamp = 'draelyn', invSlot = null, champTab = 'stats';

  // ----- Home: the homebase map is the main menu. Boxes are image pixels of HOME_ART (1536x1024): the building and
  // its name plate. Zones without `go` are "Coming soon": their names are covered, so the buildings can become any mode later.
  const HOME_W = 1536, HOME_H = 1024;
  const HOME_ZONES = [
    { go: 'kerkers', label: 'Boss Hall', box: [20, 0, 450, 330], plate: [150, 243, 222, 44] },
    { go: 'arena', label: 'Arena', box: [500, 110, 320, 175], plate: [560, 283, 176, 50] },
    { go: 'profiel', label: 'Town Hall: your profile', box: [830, 20, 320, 265], plate: [864, 283, 214, 50] },
    { go: 'altaar', label: 'Fate Altar', box: [1190, 30, 346, 275], plate: [1244, 301, 238, 50] },
    { go: 'team', label: 'Heroes & Gear', name: 'Heroes & Gear', icon: 'helm', box: [90, 320, 380, 215], plate: [170, 533, 250, 50] },
    { go: 'social', label: 'Social: friends and guild', name: 'Social', icon: 'people', box: [900, 330, 340, 195], plate: [950, 524, 250, 46] },
    { go: 'guild', label: 'Guild Hall: your guild and the guild boss', name: 'Guild Hall', icon: 'banner', box: [1250, 400, 286, 147], plate: [1308, 545, 200, 50] },
    { box: [0, 580, 360, 223], plate: [72, 803, 226, 50] },
    { box: [380, 600, 320, 211], plate: [453, 809, 192, 50] },
    { go: 'campagne', label: 'Campaign', box: [860, 600, 330, 238], plate: [945, 838, 210, 46] },
    { box: [1200, 660, 336, 204], plate: [1273, 862, 220, 50] },
  ];
  let homeScroll = null;
  // First steps: a new player (starter picked, no campaign battle yet) sees only the Campaign lit up on the homebase;
  // every other building (and the profile) opens after the first campaign battle, won or lost.
  const firstSteps = () => !S.needStarter && S.cleared < 0 && !(S.p.st.won + S.p.st.lost);
  const CAMP_AT = [1025, 735]; // centre of the Campaign building in image pixels
  // Homebase tour: once the homebase opens (after the first battle) a short tour shows every building, one at a time
  // (shade, spotlight and a card with Next). The last step leads back to the campaign, where the Fight button is
  // spotlighted (spotFight). S.seen.tour = done or skipped.
  const TOUR = [
    { go: 'team', title: 'Heroes & Gear', text: 'Your heroes. Level them up, equip and upgrade the gear you win, feed spare heroes for XP and ascend them for higher level caps. Build your team of four here.' },
    { go: 'altaar', title: 'Fate Altar', text: 'Summon new heroes with Fate Shards. Shards drop from battles and level-ups; rarer shards bring Epic and Legendary heroes.' },
    { go: 'kerkers', title: 'Boss Hall', text: 'Twenty-five bosses with ten levels each; every two levels match a campaign difficulty. Bosses drop their own gear sets.' },
    { go: 'arena', title: 'Arena', text: 'Fight the defense teams of other players, climb the ranking and earn weekly rewards. Needs a free account.' },
    { go: 'profiel', title: 'Town Hall', text: 'Your profile: name, avatar and player level, sound settings, your account and save backups. The ? Guide in the top bar explains every term.' },
    { go: 'social', title: 'Social', text: 'Add friends with their friend code. Mail (top bar) holds friend requests, gifts and arena rewards.' },
    { go: 'guild', title: 'Guild Hall', text: 'Create or join a guild. Fight the guild boss every day and earn a Guild Chest every week.' },
    { zone: 7, title: 'More to come', text: 'The buildings marked Coming soon will open as new game modes in future updates.' },
    { go: 'campagne', title: 'Campaign', text: 'Ten chapters on five difficulties: the heart of the game. Clearing chapters opens the Arena and the Boss Hall. On to the next stage!' },
  ];
  let tourStep = 0, spotFight = false;
  const tourOn = () => tab === 'home' && !S.needStarter && !firstSteps() && S.seen.home && !S.seen.tour;
  const tourZone = st => (st.go ? HOME_ZONES.find(z => z.go === st.go) : HOME_ZONES[st.zone]);
  const zoneCentre = z => [z.box[0] + z.box[2] / 2, z.box[1] + z.box[3] / 2];
  function tourCard() {
    const st = TOUR[tourStep], last = tourStep === TOUR.length - 1;
    const status = !st.go || st.go === 'campagne' ? '' : unlocked(st.go) ? '<span class="tc-open">Open now</span>' : `<span class="tc-lock">${LOCK_SVG} Opens after ${needTxt(st.go)}</span>`;
    return `<div class="tour-card" role="dialog" aria-label="Homebase tour"><span class="tag">Homebase tour · ${tourStep + 1} / ${TOUR.length}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p>${status}
      <div class="tc-acts">${last ? '' : '<button class="btn small" type="button" data-act="tourskip">Skip tour</button>'}<button class="btn primary" type="button" data-act="tournext">${last ? 'Continue the campaign' : 'Next ›'}</button></div></div>`;
  }
  // a new player's campaign: the Fight button is the only thing to press (before the first battle and after the tour)
  const fightSpot = () => tab === 'campagne' && !(S.diff) && (firstSteps() || spotFight);
  function homeHtml() {
    const pc = (v, d) => (v / d * 100).toFixed(3) + '%';
    const at = ([x, y, w, h]) => `left:${pc(x, HOME_W)};top:${pc(y, HOME_H)};width:${pc(w, HOME_W)};height:${pc(h, HOME_H)}`;
    const shardsReady = K.FATE_SHARDS.some(f => (S.fs[f.id] || 0) > 0);
    const tut = firstSteps();
    const tour = tourOn() ? TOUR[tourStep] : null, tc = tour && zoneCentre(tourZone(tour));
    // renamed buildings get a name plate over the name painted in the image (the forge is Heroes & Gear, the campfire Social)
    const PLATE_IC = { banner: '<path d="M3 1.5h10V12l-5-3-5 3z"/><path d="M2 1.5h12" stroke="currentColor" stroke-width="1.4"/>', helm: '<path d="M3 9.5a5 5 0 0 1 10 0V14h-2.6v-3.4H5.6V14H3z"/>', people: '<circle cx="5.5" cy="5.5" r="2.2"/><circle cx="11" cy="6" r="1.8"/><path d="M1.5 14c0-2.6 1.8-4.3 4-4.3s4 1.7 4 4.3M9.8 13.5c.2-2 1.1-3.3 2.9-3.3 1.4 0 2.3 1.2 2.3 3.3"/>' };
    const namePlate = z => z.name ? `<span class="hz-plate named" style="${at(z.plate)}"><i><svg viewBox="0 0 16 16" aria-hidden="true">${PLATE_IC[z.icon] || ''}</svg></i>${esc(z.name)}</span>` : '';
    const zones = HOME_ZONES.map(z => {
      // one button covers the building and its plate
      const [bx, by, bw, bh] = z.box, [px, py, pw, ph] = z.plate, x0 = Math.min(bx, px), y0 = Math.min(by, py);
      const area = [x0, y0, Math.max(bx + bw, px + pw) - x0, Math.max(by + bh, py + ph) - y0];
      if (tut && z.go && z.go !== 'campagne') return `<button type="button" class="hz" style="${at(area)}" data-act="tutlock" aria-label="${z.label} (opens after your first battle)"></button>${namePlate(z)}`;
      if (tut && z.go === 'campagne') return `<button type="button" class="hz tut-go" style="${at(area)}" data-act="go" data-go="campagne" aria-label="Campaign: start here" title="Campaign"></button>`;
      if (!z.go) return `<button type="button" class="hz soon" style="${at(area)}" data-act="soon" aria-label="Coming soon"></button>
        <span class="hz-plate" style="${at(z.plate)}"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>Coming soon</span>`;
      const locked = !unlocked(z.go);
      const badge = locked ? `<span class="hz-badge lock" style="left:${pc(px + pw - 6, HOME_W)};top:${pc(py - 14, HOME_H)}">${needTag(z.go)}</span>`
        : z.go === 'altaar' && shardsReady ? `<span class="hz-badge dot" style="left:${pc(px + pw - 10, HOME_W)};top:${pc(py - 8, HOME_H)}"></span>` : '';
      return `<button type="button" class="hz ${locked ? 'locked' : ''}" style="${at(area)}" data-act="go" data-go="${z.go}" aria-label="${z.label}${locked ? ` (opens after ${needTxt(z.go)})` : ''}" title="${z.label}"></button>${namePlate(z)}${badge}`;
    }).join('');
    // first steps: a shade over the map with a spotlight on the Campaign and a "Start here" marker above it
    const spot = tut ? `<div class="tut-shade" style="--x:${pc(CAMP_AT[0], HOME_W)};--y:${pc(CAMP_AT[1], HOME_H)}"></div>
      <div class="tut-call" style="left:${pc(CAMP_AT[0], HOME_W)};top:${pc(575, HOME_H)}"><b>Start here</b><span>Your adventure begins in the Campaign</span><i aria-hidden="true"></i></div>` : '';
    const tourShade = tour ? `<div class="tut-shade" style="--x:${pc(tc[0], HOME_W)};--y:${pc(tc[1], HOME_H)}"></div>` : '';
    return `<div class="home-map"><div class="home-img ${tut ? 'tut' : ''} ${tour ? 'touring' : ''}"><img src="${HOME_ART}" alt="Homebase: tap a building">${zones}${spot}${tourShade}</div></div>${tour ? tourCard() : ''}`;
  }
  // every screen but Home gets a way back; Heroes and Team share a switch (there is no Team building)
  function backBar() {
    // Heroes, Team and Gear share a tab bar with an icon on each tab
    const tb = (t, label, icon) => `<button type="button" data-act="tab" data-tab="${t}" aria-pressed="${tab === t}"><span class="seg-ic">${icon}</span>${label}</button>`;
    const sw = tab === 'champions' || tab === 'team' || tab === 'vault' ? `<div class="seg big-tabs" role="group" aria-label="Team, heroes or gear">${tb('team', 'Team', svgIcon('swords'))}${tb('champions', 'Heroes', svgIcon('people'))}${tb('vault', 'Gear', SLOT_GLYPH.borstpantser)}</div>` : '';
    return `<div class="backbar"><button type="button" class="btn small" data-act="tab" data-tab="home">‹ Home</button>${sw}</div>`;
  }
  function setTab(t) {
    tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'));
    render();
    if (t === 'arena') arenaEnter();
    if (t === 'social' || t === 'mail') socialLoad();
  }
  // a screen that fails to draw shows what went wrong and a way home, instead of leaving the old screen frozen
  function render() {
    try { renderScreen(); }
    catch (e) {
      console.error(e);
      $('#screen').innerHTML = `<div class="lockbox"><div><h3>Something went wrong on this screen</h3><p class="empty-note">Please send this message to the developer: <code>${esc(tab)}: ${esc(e && e.message || e)}</code></p><button class="btn primary" data-act="tab" data-tab="home">Back to Home</button></div></div>`;
      if (tab === 'home') $('#screen').querySelector('button').hidden = true;
    }
  }
  function renderScreen() {
    if (!B) MUSIC.play('home');
    hud();
    const el = $('#screen');
    if (S.needStarter) { el.innerHTML = starterHtml(); paintDungeonArt(); return; }
    if (tab === 'home') {
      el.innerHTML = homeHtml();
      // phones: the map scrolls sideways; start in the middle, later keep where the player left it
      const map = el.querySelector('.home-map');
      map.scrollLeft = firstSteps() ? CAMP_AT[0] / HOME_W * map.scrollWidth - map.clientWidth / 2 : tourOn() ? zoneCentre(tourZone(TOUR[tourStep]))[0] / HOME_W * map.scrollWidth - map.clientWidth / 2 : homeScroll ?? (map.scrollWidth - map.clientWidth) / 2;
      map.addEventListener('scroll', () => { homeScroll = map.scrollLeft; }, { passive: true });
      // the daily reward pops up on the homebase once a day (after the first battle and the tour)
      if (loginDue()) setTimeout(showLogin, 600);
      return;
    }
    el.innerHTML = backBar() + (tab === 'campagne' ? campaignHtml() : tab === 'kerkers' ? dungeonsHtml() : tab === 'altaar' ? altarHtml() : tab === 'team' ? teamHtml() : tab === 'profiel' ? profileHtml() : tab === 'arena' ? arenaHtml() : tab === 'social' ? socialHtml() : tab === 'guide' ? guideHtml() : tab === 'mail' ? mailHtml() : tab === 'vault' ? vaultHtml() : champsHtml());
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
  // the set a chapter drops: name, bonus, rarities on this difficulty and how many pieces the player already owns
  function setBanner(k, D) {
    const set = K.SETS[k], [need, bonus] = set.desc.split(': '), own = S.inv.filter(it => it.set === k).length, hi = D.rars[D.rars.length - 1];
    return `<div class="set-banner rar-${hi}"><img class="sb-ic" src="${gearArt('borstpantser', hi, 0)}" alt="">
      <div class="sb-main"><span class="sb-tag">Set drops in this chapter</span><b class="sb-name">${esc(set.name)}</b><span class="sb-bonus"><i>${esc(need)}</i> ${esc(bonus)}</span></div>
      <div class="sb-side"><span>${rarsHtml(D.rars)}</span><small>${own ? `${own} ${own === 1 ? 'piece' : 'pieces'} owned` : 'none owned yet'}</small></div></div>`;
  }
  function campaignHtml() {
    const d = S.diff || 0, D = K.DIFFS[d], hard = d > 0, cleared = clearedOn(d), next = cleared + 1;
    const strip = teamIds('campaign').map(id => `<div class="mini rar-${C[id].rar}" title="${esc(C[id].name)}">${por(id)}<span>Lv ${S.roster[id].lvl}</span></div>`).join('');
    const maxChap = Math.min(K.CHAPTERS.length - 1, K.STAGES[Math.min(next, K.STAGES.length - 1)].chapter);
    const chap = Math.min(S.chap ?? maxChap, maxChap);
    const foeImgs = st => st.foes.map(f => `<img class="spr ${K.BOSSES[f] ? 'bossimg' : ''}" src="${SPR.url(f, 1, true)}" alt="${esc(E[f].name)}" title="${esc(E[f].name)}">`).join('');
    // drop icons from the gear sheet (GEAR_TILE), one per rarity that can drop on this difficulty, in that rarity's colours
    const dropIc = st => D.rars.map(r => `<img class="gt-ic rar-${r}" src="${GEAR_TILE[st.slot || 'random'][Math.max(1, r)]}" alt="${K.RARITIES[r]}" title="${K.RARITIES[r]} ${esc(dropName(st).toLowerCase())}">`).join('');
    const firstRewards = (st, i) => {
      if (i <= cleared) return [];
      const rw = [];
      if (!hard && st.unlock && !S.roster[st.unlock]) rw.push(`<span class="rw">${por(st.unlock)}${esc(C[st.unlock].short)}</span>`);
      rw.push(`<span class="rw" title="${st.n === 6 ? 'Greater Fate Shard' : 'Fate Shard'}">${shardIc(st.n === 6 ? 'greater' : 'fate')}+1</span>`);
      return rw;
    };
    // a stage tile: what you fight, its level, what it drops, and what tapping it does (Fight / Replay / locked)
    const tile = (st, i) => {
      const state = i <= cleared ? 'cleared' : i === next ? 'next' : 'locked';
      const rw = firstRewards(st, i);
      const go = state === 'next' ? `Fight ›${enCost(K.stageEnergy(st, d))}` : `${LOCK_SVG} Locked`;
      // a cleared stage has two buttons: Replay, and Auto ×10 once the whole chapter is cleared on this difficulty
      const chapDone = clearedOn(d) >= st.chapter * 7 + 6, tag = state === 'cleared' ? 'div' : 'button';
      const foot = state === 'cleared'
        ? `<div class="st-acts"><button type="button" class="btn small" data-act="play" data-stage="${i}">Replay${enCost(K.stageEnergy(st, d))}</button><button type="button" class="btn small ${chapDone ? 'violet' : ''}" data-act="auto10" data-stage="${i}" ${chapDone ? '' : `disabled title="Clear all of Chapter ${ROMAN[st.chapter]} on ${esc(D.name)} first"`}>${chapDone ? '' : LOCK_SVG}Auto ×10</button></div>`
        : `<span class="st-go">${go}</span>`;
      return `<${tag} class="stage ${state} ${st.boss ? 'bossst' : ''}" ${tag === 'button' ? `data-act="play" data-stage="${i}" ${state === 'locked' ? 'disabled' : ''}` : ''}>
        <div class="st-top"><span class="st-n">Stage ${st.n + 1}</span>${state === 'cleared' ? '<span class="st-state tag">✓</span>' : ''}</div>
        <div class="st-foes">${foeImgs(st)}</div>
        <div class="st-meta"><span class="st-ess">${[...new Set(st.phases.flat().map(f => E[f].aff))].map(affChip).join('')}</span><span class="pill">Lv ${K.diffLvl(st, d)}</span></div>
        ${st.boss ? `<div class="st-boss">Boss: ${esc(st.boss)}</div>` : ''}
        <div class="st-drop"><span class="st-dic">${dropIc(st)}</span><span class="st-dtx"><b>${dropName(st)}</b></span></div>
        ${rw.length ? `<div class="st-reward"><span>First clear:</span>${rw.join('')}</div>` : ''}
        ${foot}</${tag}>`;
    };
    const diffOk = i => !i || clearedOn(i - 1) >= K.STAGES.length - 1;
    const chapBtns = K.CHAPTERS.map((ch, c) => {
      const done = K.STAGES.filter(st => st.chapter === c).filter(st => K.STAGES.indexOf(st) <= cleared).length;
      return `<button type="button" class="${c === chap ? 'sel' : ''} ${done === 7 ? 'done' : ''}" data-act="chap" data-n="${c}" ${c > maxChap ? 'disabled' : ''} title="${esc(ch.name)} · ${done}/7">${ROMAN[c]}</button>`;
    }).join('');
    const idx = K.STAGES.map((st, i) => i).filter(i => K.STAGES[i].chapter === chap);
    const cdone = idx.filter(i => i <= cleared).length;
    // the one big call to action: the next stage on this difficulty
    const nx = K.STAGES[next], nrw = nx ? firstRewards(nx, next) : [];
    const cont = nx ? `<section class="camp-next ${nx.boss ? 'boss' : ''}">
        <div class="cn-main"><span class="tag">Next battle${d ? ' · ' + esc(D.name) : ''}</span><h3>${stageName(next)}</h3>
          ${nx.boss ? `<span class="st-boss">Boss: ${esc(nx.boss)}</span>` : `<span class="cn-sub">${esc(K.CHAPTERS[nx.chapter].name)}</span>`}
          <div class="cn-foes">${foeImgs(nx)}</div>
          <div class="st-meta"><span class="pill">Lv ${K.diffLvl(nx, d)}</span><span class="pill">${K.PHASES} phases</span><span class="pill cn-drop"><span class="st-dic">${dropIc(nx)}</span>${dropName(nx)}</span>${nrw.length ? `<span class="cn-rw">First clear: ${nrw.join('')}</span>` : ''}</div></div>
        ${fightSpot() ? `<span class="spot-wrap"><button class="btn primary cn-go spot-go" data-act="play" data-stage="${next}">Fight${enCost(K.stageEnergy(K.STAGES[next], d))}</button><span class="spot-call">Tap <b>Fight</b> to start</span></span></section><div class="spot-block" data-act="spotblock"></div>` : `<button class="btn primary cn-go" data-act="play" data-stage="${next}">Fight${enCost(K.stageEnergy(K.STAGES[next], d))}</button></section>`}`
      : `<section class="camp-next done"><div class="cn-main"><span class="tag">${esc(D.name)} complete</span><h3>Every stage cleared!</h3><span class="cn-sub">${K.DIFFS[d + 1] ? `${K.DIFFS[d + 1].name} is open: pick it above for better gear.` : 'You beat the hardest difficulty.'} Replay stages to farm gear.</span></div></section>`;
    return `<div class="campaign ${hard ? 'hardmode diff-' + D.id : ''}">
      <div class="camp-head"><h2>Campaign</h2>
        <div class="seg diffs" role="group" aria-label="Difficulty">${K.DIFFS.map((x, i) => `<button type="button" data-act="mode" data-diff="${i}" aria-pressed="${i === d}" ${diffOk(i) ? '' : `disabled title="Clear every stage on ${K.DIFFS[i - 1].name} first"`}>${diffOk(i) ? '' : LOCK_SVG}${x.name}</button>`).join('')}</div>
        <p class="diff-note">Drops ${rarsHtml(D.rars)} gear${d ? ` · enemies Lv ${K.diffLvl(K.STAGES[0], d)}–${K.diffLvl(K.STAGES[K.STAGES.length - 1], d)}` : ''}</p></div>
      ${cont}
      <div class="teamstrip">${strip}<div class="power"><span class="tag">Team power</span><b>${teamPower(teamIds('campaign')).toLocaleString('en-US')}</b></div><button class="btn small" data-act="editteam" data-mode="campaign">${esc(S.teams[S.modeTeam.campaign].name)} · Edit</button></div>
      <div class="chapters" role="group" aria-label="Chapter"><span class="tag">Chapter</span>${chapBtns}</div>
      <div class="chap-head"><h3>Chapter ${ROMAN[chap]} · ${esc(K.CHAPTERS[chap].name)}</h3><span class="tag">${cdone}/7 cleared</span></div>
      ${setBanner(K.CHAPTERS[chap].set, D)}
      <div class="stages">${idx.slice(0, 6).map(i => tile(K.STAGES[i], i)).join('')}</div>
      <div class="stages boss-row">${tile(K.STAGES[idx[6]], idx[6])}</div>
      <details class="camp-info"><summary>How the campaign works</summary>
        <p>Ten chapters of seven stages, each fought in ${K.PHASES} phases: your survivors march on with their HP and recover 15% between phases. Every stage drops its own gear slot; the chapter boss waits in the last phase of stage 7. Replay cleared stages to farm the slot you need. Clear all ${K.STAGES.length} stages to open the next difficulty.</p>
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
          ${sel >= K.BTRAIT.from ? (() => { const tr = K.bossTrait(ci), ef = K.EFFECTS[tr], ok = teamIds('boss').some(id => skillFx(id).includes(K.BTRAIT.answer[tr])); return `<p class="bh-trait">${fxBadge(tr)} <span><b>${ef.n}</b> (level ${K.BTRAIT.from} and up): ${esc(ef.d)}. ${ok ? 'Your team can do this.' : '<b class="warn">Nobody in your team can.</b>'}</span></p>`; })() : ''}
          <div class="lvls" role="group" aria-label="Level">${lvls}</div>
          <div class="section-head" style="margin:0"><span class="empty-note">Level ${sel} · ${K.DIFFS[K.bossDiff(sel)].name} · enemy level ${lv} · drops ${rarsHtml(K.bossLoot(sel).rars)}</span><span class="bh-btns"><button class="btn violet" data-act="bhauto" data-id="${cur}" data-n="${sel}" ${sel <= best ? '' : `disabled title="Beat level ${sel} once first"`}>Auto ×10${enCost(K.bossEnergy(sel))}</button><button class="btn primary" data-act="bhplay" data-id="${cur}" data-n="${sel}">Challenge${enCost(K.bossEnergy(sel))}</button></span></div>
        </div></div>`
      : `<div class="dg locked"><div class="dg-body"><h3 style="margin:0">Locked</h3><p class="empty-note">${ci === 0 ? `Clear Chapter ${ROMAN[UNLOCKS.kerkers.ch - 1]} of the campaign to open the Boss Hall.` : `Defeat ${esc(K.BOSSES[K.BOSS_ORDER[ci - 1]].name)} on level 1 first.`}</p></div></div>`;
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
  const rolesHtml = ids => `<ul class="roles-chk">${teamRoles(ids).map(([k, ok, tip]) => `<li class="${ok ? 'ok' : 'miss'}" title="${esc(tip)}">${ok ? '✓' : '✗'} ${k}</li>`).join('')}</ul>${ids.length && !teamRoles(ids)[1][1] ? '<p class="empty-note roles-tip">No healer in this team. That works in the campaign, but from Boss Hall level 3 on bosses drain your whole team every turn (Blight Aura), and without healing or shields you will not outlast them.</p>' : ''}`;
  // Team: the four slots, and every owned hero with its details (stats, skills, gear, ascend and feed) next to the list;
  // tap a hero to see it, "Add to team" / "Remove from team" in its details
  function teamHtml() {
    if (!S.roster[selChamp]) selChamp = S.team[0];
    const slots = [0, 1, 2, 3].map(i => {
      const id = S.team[i];
      if (!id) return `<div class="slot"><small>Empty</small></div>`;
      return `<button class="slot filled rar-${C[id].rar} ${id === selChamp ? 'sel' : ''}" data-act="sel" data-id="${id}" title="Show ${esc(C[id].short)}"><span class="lv" title="Level ${S.roster[id].lvl}">${S.roster[id].lvl}</span>${por(id)}<b>${esc(C[id].short)}</b>${starStr(S.roster[id].stars, K.maxStars(id))}<small>${roleStr(C[id])}</small><small>Power ${power(statsOf(id)).toLocaleString('en-US')}</small></button>`;
    }).join('');
    const tabs = S.teams.map((t, i) => `<button type="button" class="tm-tab ${i === S.tsel ? 'on' : ''}" data-act="tmsel" data-i="${i}" aria-pressed="${i === S.tsel}"><b>${esc(t.name)}</b><small>${t.ids.length}/4 · ${TEAM_MODES.filter(([m]) => S.modeTeam[m] === i).map(([, l]) => l).join(', ') || 'not used'}</small></button>`).join('')
      + (S.teams.length < TEAM_MAX ? '<button type="button" class="tm-tab add" data-act="tmnew"><b>+ Create a team</b><small>up to 3</small></button>' : '');
    const modes = TEAM_MODES.map(([m, l]) => { const on = S.modeTeam[m] === S.tsel; return `<button type="button" class="tm-mode ${on ? 'on' : ''}" data-act="tmmode" data-m="${m}" aria-pressed="${on}" title="${on ? `${l} uses this team` : `Use this team for ${l}`}">${on ? '✓ ' : ''}${l}</button>`; }).join('');
    const bar = `<div class="tm-bar"><div class="tm-tabs" role="group" aria-label="Your teams">${tabs}</div>
      <div class="tm-row"><span class="tm-lbl">Use ${esc(S.teams[S.tsel].name)} for</span>${modes}<span class="tm-acts"><button type="button" class="linkbtn" data-act="tmname">Rename</button>${S.teams.length > 1 ? '<button type="button" class="linkbtn" data-act="tmdel">Delete</button>' : ''}</span></div></div>`;
    const list = filteredIds('owned');
    return `<div class="section-head"><div><h2>Team</h2><p class="lede">Choose up to four champions and make them stronger: tap a hero for its stats, skills and gear, to feed it, ascend it or add it to your team. A mix of damage, protection and healing beats four attackers.</p></div><div class="power"><span class="tag">Team power</span><b>${teamPower().toLocaleString('en-US')}</b></div></div>
      ${bar}
      <div class="slots">${slots}</div>
      ${rolesHtml(S.team)}
      <div class="champ-layout"><div>${filterBar(false)}
        ${list.length ? `<div class="grid-cards">${list.map(id => cardHtml(id, { act: 'sel', sel: id === selChamp, inteam: S.team.includes(id) })).join('')}</div>` : '<p class="empty-note">No champions match these filters.</p>'}</div>
        ${heroDetail(selChamp)}</div>`;
  }
  // ----- hero filters: essence, rarity and class filter the list; power, level, rarity or name sort it.
  // own: 'owned' (Team), or on the Heroes index 'all' / 'owned' / 'missing' (TF.own) -----
  const CLASSES = ['Tank', 'Warrior', 'Assassin', 'Ranger', 'Mage', 'Support', 'Controller'];
  const TF = { aff: 'all', rar: 'all', role: 'all', sort: 'power', own: 'all' };
  function filteredIds(own) {
    const keep = id => (TF.aff === 'all' || C[id].aff === TF.aff) && (TF.rar === 'all' || C[id].rar === +TF.rar)
      && (TF.role === 'all' || C[id].role === TF.role || C[id].role2 === TF.role) && (own === 'all' || (own === 'owned') === !!S.roster[id]);
    const val = id => !S.roster[id] ? -1 : TF.sort === 'level' ? S.roster[id].lvl : TF.sort === 'rarity' ? C[id].rar : power(statsOf(id));
    const ids = [...new Set([...K.CHAMP_ORDER, ...K.DEV_HEROES.filter(id => S.roster[id]), ...K.CAPTURE_ORDER.filter(id => S.roster[id])])].filter(keep);
    return ids.sort((a, b) => (!!S.roster[b] - !!S.roster[a]) || (TF.sort === 'name' ? C[a].name.localeCompare(C[b].name) : val(b) - val(a) || C[b].rar - C[a].rar));
  }
  function filterBar(index) {
    const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
    const essences = ['all', ...K.ESSENCES].map(a => `<button type="button" class="ess-f ${TF.aff === a ? 'on' : ''}" data-act="tfaff" data-aff="${a}" aria-pressed="${TF.aff === a}" title="${a === 'all' ? 'All essences' : a}">${a === 'all' ? 'All' : affChip(a)}</button>`).join('');
    return `<div class="tfilter">
      <div class="tf-ess" role="group" aria-label="Essence">${essences}</div>
      <label>Rarity<select data-filter="rar">${opt('all', 'All', TF.rar)}${K.RARITIES.slice(0, 5).map((r, i) => opt(i, r, TF.rar)).join('')}</select></label>
      <label>Class<select data-filter="role">${opt('all', 'All', TF.role)}${CLASSES.map(r => opt(r, r, TF.role)).join('')}</select></label>
      <label>Sort by<select data-filter="sort">${[['power', 'Power'], ['level', 'Level'], ['rarity', 'Rarity'], ['name', 'Name']].map(([v, l]) => opt(v, l, TF.sort)).join('')}</select></label>
      ${index ? `<label>Show<select data-filter="own">${[['all', 'All heroes'], ['owned', 'Unlocked'], ['missing', 'Not unlocked']].map(([v, l]) => opt(v, l, TF.own)).join('')}</select></label>` : ''}
      ${TF.aff !== 'all' || TF.rar !== 'all' || TF.role !== 'all' || (index && TF.own !== 'all') ? '<button type="button" class="linkbtn" data-act="tfreset">Clear filters</button>' : ''}
    </div>`;
  }

  // ----- hero details (Team screen): stats, skills, gear, ascend and feed of an owned hero -----
  function heroDetail(id) {
    const c = C[id], r = S.roster[id];
    const st = statsOf(id), base = K.heroStats(id, r, []);
    const cap = K.maxLvl(r.stars, id), mxs = K.maxStars(id), need = K.xpNeed(r.lvl), atCap = r.lvl >= cap;
    const statRow = (k, pct) => `<dt>${K.STAT_NAMES[k]}</dt><dd>${st[k]}${pct ? '%' : ''}${st[k] > base[k] ? `<small>+${st[k] - base[k]}</small>` : ''}</dd>`;
    const pips = lv => `<span class="pips" title="Skill-level ${lv}/${K.SKILL_MAX}">${Array.from({ length: K.SKILL_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>`;
    const skills = skillsHtml(id, r);
    let rank = '', canRank = false;
    if (r.stars < mxs) {
      const rc = K.rankCost(r.stars), ok = atCap && stoneN(rc.tier) >= rc.stones && S.silver >= rc.silver;
      canRank = ok;
      rank = `<div class="rank"><button class="btn primary small" data-act="rank" ${ok ? '' : 'disabled'}>Ascend to ${r.stars + 1}★</button><span class="empty-note">${stoneIc(rc.tier)} ${rc.stones} ${stoneName(rc.tier, rc.stones)} (you have ${stoneN(rc.tier)}) · ${sigils(rc.silver)}${atCap ? '' : ` · reach level ${cap} first`}</span></div>`;
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
    const inTeam = S.team.includes(id);
    return `<div class="detail rar-${c.rar}" data-dtab="${champTab}">
        <div class="d-head"><img class="spr bigspr ${c.dev ? 'dev-art' : ''}" src="${SPR.url(id, 2)}" alt=""><div>
          <h2>${esc(c.name)}${S.team.includes(id) ? ` <span class="team-tag">Team ${S.team.indexOf(id) + 1}</span>` : ''}</h2>
          <div class="tags"><span class="rartxt">${K.RARITIES[c.rar]}</span> · ${esc(c.faction)} · ${roleStr(c)} · ${affChip(c.aff)} ${c.aff}</div>
          <div>${starStr(r.stars, mxs)} · Level <b>${r.lvl}</b> / ${cap} · Power <b>${power(st).toLocaleString('en-US')}</b></div>
          <div class="xpbar"><i style="width:${atCap ? 100 : Math.round(r.xp / need * 100)}%"></i></div>
          <small class="empty-note">${atCap ? (r.stars < mxs ? 'Max level for this star. Ascend for more.' : `Maxed (${K.RARITIES[c.rar]} cap ${cap})`) : `${r.xp} / ${need} XP`}</small>
          <div class="d-team"><button type="button" class="btn small ${inTeam ? '' : 'primary'}" data-act="toggle" data-id="${id}">${inTeam ? 'Remove from team' : 'Add to team'}</button></div>
        </div></div>
        <div class="dtabs" role="tablist" aria-label="Hero details">${[['stats', 'Stats'], ['skills', 'Skills'], ['gear', `Gear <small>${items.length}/${K.SLOTS.length}</small>`], ['upgrade', 'Upgrade' + (canRank ? '<span class="dot"></span>' : '')]].map(([k, l]) => `<button type="button" role="tab" data-act="ctab" data-t="${k}" aria-selected="${champTab === k}">${l}</button>`).join('')}</div>
        <div class="dpanel" data-p="stats"><dl class="stats">${statRow('hp')}${statRow('atk')}${statRow('def')}${statRow('spd')}${statRow('crit', 1)}${statRow('cdmg', 1)}${statRow('acc')}${statRow('res')}</dl></div>
        <div class="dpanel" data-p="skills">${skills}</div>
        <div class="dpanel" data-p="gear"><div class="section-head" style="margin-bottom:6px"><span class="empty-note">${items.length} of ${K.SLOTS.length} slots filled</span><div class="gear-acts"><button class="btn small" data-act="bestgear">Equip best gear</button><button class="btn small primary" data-act="upall" ${items.some(x => x.lvl < K.MAX_GEAR_LVL) ? '' : 'disabled'}>Upgrade all</button><button class="btn small" data-act="unequipall" ${items.length ? '' : 'disabled'}>Remove all</button></div></div><div class="gear-grid">${gear}</div>${setInfo ? `<div class="setbonus">${setInfo}<small class="empty-note">A set bonus counts once, however many extra pieces you wear.</small></div>` : ''}${inv}</div>
        <div class="dpanel" data-p="upgrade"><div class="ascend"><h3>Ascend</h3>${rank || `<p class="empty-note">${esc(c.short)} has the maximum number of stars.</p>`}</div>${fodderHtml(id)}</div>
      </div>`;
  }
  // the skills of a hero (r: its roster entry, or null for a hero not unlocked yet: no skill levels)
  function skillsHtml(id, r) {
    const c = C[id], pips = lv => `<span class="pips" title="Skill-level ${lv}/${K.SKILL_MAX}">${Array.from({ length: K.SKILL_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>`;
    return c.skills.map((s, i) => { const lv = r ? r.sk[i] || 0 : 0; const cd = s.cd && lv >= K.SKILL_MAX ? s.cd - 1 : s.cd; return `<div class="skill"><b>${SKILL_TAG[i] || 'A' + (i + 1)} · ${esc(s.name)}</b>${r ? pips(lv) : ''}<span class="cd">${cd ? `cooldown ${cd}` : 'no cooldown'} · ${TARGET_LABEL[s.target]}</span><p>${esc(s.desc)}${lv ? ` <span style="color:var(--violet)">+${Math.round(lv * K.SKILL_STEP * 100)}% power${lv >= K.SKILL_MAX && s.cd ? ', cooldown −1' : ''}</span>` : ''}</p></div>`; }).join('')
      + (c.passive ? `<div class="skill passive"><b>Passive · ${esc(c.passiveName)}</b><p>${esc(c.passiveDesc)}</p></div>` : '');
  }
  // where a hero can be found: a campaign stage unlock (Easy) and/or the Fate Altar
  function heroSource(id) {
    const c = C[id], st = K.STAGES.findIndex(s => s.unlock === id);
    if (c.captured) return 'Captured in the campaign';
    if (c.dev) return 'Gift only';
    return st >= 0 ? `Unlock: ${stageName(st)} (Easy), or the Fate Altar` : 'Fate Altar';
  }

  // ----- Heroes: every hero in the game, unlocked or not, with filters; tap one for its details -----
  function champsHtml() {
    const ids = filteredIds(TF.own), have = K.CHAMP_ORDER.filter(x => S.roster[x]).length;
    const cards = ids.map(id => {
      const c = C[id], r = S.roster[id];
      return `<button type="button" class="card rar-${c.rar} ${r ? '' : 'missing'}" data-act="hinfo" data-id="${id}" title="${esc(c.name)}${r ? '' : ' · not unlocked yet'}">${affChip(c.aff)}${r ? `<span class="lv" title="Level ${r.lvl}">${r.lvl}</span>` : `<span class="lockpin" aria-hidden="true">${LOCK_SVG}</span>`}${por(id)}<span class="nm">${esc(c.short)}</span>${r ? starStr(r.stars, K.maxStars(id)) : `<span class="rartxt mini">${K.RARITIES[c.rar]}</span>`}<span class="sub">${r ? roleStr(c) : esc(heroSource(id).replace(/^Unlock: /, '').replace(/ \(Easy\), or the Fate Altar$/, ' / Altar'))}</span></button>`;
    }).join('');
    return `<div class="section-head"><div><h2>Heroes</h2><p class="lede">Every hero in the game. The ones you have not unlocked yet are dimmed, with where to find them. Tap a hero for its stats and skills.</p></div><span class="tag">${have} / ${K.CHAMP_ORDER.length} unlocked${K.CAPTURE_ORDER.some(x => S.roster[x]) ? ` · ${K.CAPTURE_ORDER.filter(x => S.roster[x]).length} captured` : ''}</span></div>
      ${filterBar(true)}
      ${ids.length ? `<div class="grid-cards hero-index">${cards}</div>` : '<p class="empty-note">No heroes match these filters.</p>'}`;
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
      <h3 class="hp-h">Stats${r ? '' : ' at level 1'}</h3>
      <dl class="stats">${row('hp')}${row('atk')}${row('def')}${row('spd')}${row('crit', 1)}${row('cdmg', 1)}${row('acc')}${row('res')}</dl>
      <h3 class="hp-h">Skills</h3>
      <div class="hp-skills">${skillsHtml(id, r)}</div>
      <div class="modal-actions">${r ? `<button class="btn primary" data-act="hteam" data-id="${id}">Upgrade in Team</button>` : ''}<button class="btn" data-act="modal" data-go="close">Close</button></div></div>`;
    m.hidden = false;
    m.querySelector('.btn').focus({ preventScroll: true }); m.querySelector('.modal-box').scrollTop = 0;
  }

  // Feed: spare copies (captured enemies and summoned duplicates) and any other hero outside the team can be fed for XP;
  // a copy of the selected hero itself levels one of its skills instead
  function fodderHtml(id) {
    const h = S.roster[id], cap = K.maxLvl(h.stars, id), atCap = h.lvl >= cap;
    const skillsMaxed = h.sk.every(v => v >= K.SKILL_MAX);
    const copies = Object.keys(S.fodder).filter(f => S.fodder[f] > 0 && C[f]).sort((a, b) => (b === id) - (a === id) || C[a].rar - C[b].rar);
    const others = Object.keys(S.roster).filter(x => x !== id && C[x] && !inAnyTeam(x)).sort((a, b) => C[a].rar - C[b].rar || S.roster[a].lvl - S.roster[b].lvl);
    const release = C[id].captured && !inAnyTeam(id) ? `<button class="btn small" data-act="release" data-id="${id}">Turn ${esc(C[id].short)} into a spare copy</button>` : '';
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
  // a small popup asking for a team name (Create a team / Rename); onOk(name) with the trimmed name
  let nameOk = null;
  function nameBox(title, value, ok, onOk) {
    nameOk = onOk;
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="nb-t"><h2 id="nb-t">${title}</h2>
      <form data-form="tmname" class="nb-form"><label class="empty-note" for="nb-in">Team name (up to 20 characters)</label><input id="nb-in" name="tname" maxlength="20" required value="${esc(value)}" autocomplete="off">
      <div class="modal-actions"><button class="btn primary" type="submit">${ok}</button><button class="btn" type="button" data-act="modal" data-go="close">Cancel</button></div></form></div>`;
    m.hidden = false; const i = m.querySelector('input'); i.focus(); i.select();
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
    ithyra: 'The frost mage. Freezes and slows enemies, deals 30% more damage to them, and hits the whole enemy team with Blizzard.',
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
    S.roster[id] = newHero(id); S.teams = [{ name: 'Team 1', ids: [id] }]; S.tsel = 0; S.modeTeam = {}; linkTeams(S); S.starter = id; delete S.needStarter; starterSel = null;
    tab = 'home'; homeScroll = null; save(); render();
    const call = $('.tut-call'); if (call) call.scrollIntoView({ block: 'center', behavior: 'smooth' });
    toast(`${C[id].name} joins you. Tap the Campaign to begin your adventure.`, false, 4500);
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
  const tierReward = t => [...(t.silver ? [sigils(t.silver)] : []), ...Object.entries(t.fs).map(([k, n]) => `${shardIc(k)} ${n}× ${esc(K.SHARD[k].name)}`), ...Object.entries(t.st || {}).map(([k, n]) => `${stoneIc(k)} ${n}× ${stoneName(k, 1)}`)].join(' · ');
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
        <div class="row"><button class="btn small" data-act="ardef" ${AR.busy ? 'disabled' : ''}>Defend with my current team</button><button class="btn small" data-act="editteam" data-mode="arena">Edit arena team</button></div></div>`;
    const offers = st.offers.map((o, i) => `<div class="ar-opp">${o.avatar && C[o.avatar] ? por(o.avatar) : '<span class="lb-noav"></span>'}<div class="ar-opp-main"><b>${esc(o.name)}</b>${o.kind === 'bot' ? ' <span class="tag">Bot</span>' : ''}<small class="empty-note">Rating ${o.rating} · power ${o.power.toLocaleString('en-US')}</small>${miniTeam(o.team)}</div><button class="btn primary small" data-act="arfight" data-n="${i}" ${AR.busy || st.tokens < 1 ? 'disabled' : ''}>Fight</button></div>`).join('');
    const opps = `<section class="ar-opps"><div class="section-head"><h3>Opponents</h3><button class="btn small" data-act="arrefresh" ${AR.busy ? 'disabled' : ''}>New opponents</button></div>
      <p class="empty-note">You attack with your arena team (power ${K.teamPower(snapTeam(teamIds('arena'))).toLocaleString('en-US')}). A fight costs 1 token; you get a new token every hour.</p>${offers}</section>`;
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
    return `<section class="g-card">${emblem(g)}<div class="g-head"><h3>${esc(g.name)} <span class="tag">[${esc(g.tag)}]</span></h3>
        <small class="empty-note">${g.members.length} / ${GUILD_MAX} members · Guildmaster ${esc(gm ? gm.name : '?')} · ${g.open ? 'open to new members' : 'closed'} · you: ${ROLE_NAME[me]}</small>
        ${info}</div></section>
      <div class="g-tiles">
        <button type="button" class="g-tile" data-act="gview" data-v="boss"><img class="spr" src="${SPR.url(K.GBOSS.art[K.gbossEss(today())], 1)}" alt=""><b>Guild Boss</b><small>${keysLeft} / ${K.GBOSS.keys} keys left today</small></button>
        <button type="button" class="g-tile" data-act="gview" data-v="chest"><span class="g-chest-ic">${svgIcon('gift')}</span><b>Guild Chest</b><small>${tier ? tier.name : 'No chest yet'} · ${myPts.toLocaleString('en-US')} points</small></button>
        <div class="g-tile locked" aria-disabled="true"><span class="g-medal">${LOCK_SVG}</span><b>Guild Shop</b><small>Coming soon</small></div>
      </div>
      ${me === 'leader' || me === 'officer' ? guildInviteHtml(g) : ''}
      <section class="fr-sec"><h3>Members <small class="empty-note">${g.members.length} / ${GUILD_MAX}</small></h3><ul class="fr-list g-members">${g.members.map(memberRow).join('')}</ul></section>
      <div class="row g-leave"><button class="btn small danger" data-act="gleave">Leave guild</button></div>`;
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
    return `<div class="section-head" style="margin:0">${guildBack}<span class="tag">Keys reset in ${untilUtc(nextMidnight())}</span></div>
      <section class="gb-card"><div class="gb-art"><img class="spr" src="${SPR.url(art, 2)}" alt="${esc(K.BOSSES[art].name)}"></div>
        <div class="gb-main"><span class="tag">Today's guild boss · a new one every day</span><h3>${esc(K.BOSSES[art].name)} ${affChip(ess)}</h3>${K.BOSSES[art].title ? `<span class="gb-title">${esc(K.BOSSES[art].title)}</span>` : ''}
          <p class="empty-note">It cannot be killed: deal as much damage as you can before your team falls or the boss has taken ${K.GBOSS.turns} turns. It enrages after ${K.ENRAGE.at} of its turns. ${ess === 'Aether' ? 'No essence has the advantage today.' : `Strong against it today: ${beaten.map(e => affChip(e) + ' ' + e).join(', ')}.`}</p>
          <div class="gb-keys">${Array.from({ length: K.GBOSS.keys }, (_, i) => `<i class="${i < keysLeft ? 'on' : ''}"></i>`).join('')}<span>${keysLeft} / ${K.GBOSS.keys} keys left today</span></div>
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
    runBattle({ type: 'gboss', team: f.team, d: f.d, ess: f.ess, seed: f.seed, fight: f, area: AREA_OF[f.ess] ?? 1, title: `Guild boss · ${K.BOSSES[K.GBOSS.art[f.ess]].name}` });
  }
  // ================= GEAR VAULT =================
  // All gear in one place (tab 'vault', next to Heroes and Team), like the artifact screen in RAID: filter by slot,
  // rarity, set and whether it is worn, sort it, lock pieces you want to keep (it.lock) and sell several at once.
  // Sell mode: tap pieces to select them; worn and locked gear can never be selected.
  const VT = { slot: 'all', rar: 'all', set: 'all', st: 'all', sort: 'rar', sell: false, sel: new Set(), open: null };
  const VT_SORTS = { rar: ['Rarity', (a, b) => b.rar - a.rar || b.lvl - a.lvl || b.il - a.il], lvl: ['Level', (a, b) => b.lvl - a.lvl || b.rar - a.rar], il: ['Item level', (a, b) => b.il - a.il || b.rar - a.rar], new: ['Newest', (a, b) => b.id - a.id], value: ['Sell value', (a, b) => K.sellValue(b) - K.sellValue(a)] };
  const sellable = it => !it.owner && !it.lock;
  function vaultItems() {
    return S.inv.filter(it => (VT.slot === 'all' || it.slot === VT.slot) && (VT.rar === 'all' || it.rar === +VT.rar) && (VT.set === 'all' || it.set === VT.set)
      && (VT.st === 'all' || (VT.st === 'free' ? !it.owner : VT.st === 'worn' ? !!it.owner : !!it.lock))).sort(VT_SORTS[VT.sort][1]);
  }
  function vaultHtml() {
    const list = vaultItems(), sets = [...new Set(S.inv.map(it => it.set))].filter(k => K.SETS[k]).sort((a, b) => K.SETS[a].name.localeCompare(K.SETS[b].name));
    for (const id of [...VT.sel]) if (!S.inv.some(it => it.id === id && sellable(it))) VT.sel.delete(id);
    const opt = (v, label, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${label}</option>`;
    const filters = `<div class="vt-filters">
      <label>Slot<select data-vf="slot">${opt('all', 'All slots', VT.slot)}${K.SLOTS.map(s => opt(s, K.SLOT_NAMES[s], VT.slot)).join('')}</select></label>
      <label>Rarity<select data-vf="rar">${opt('all', 'All rarities', VT.rar)}${K.RARITIES.map((r, i) => opt(i, r, VT.rar)).join('')}</select></label>
      <label>Set<select data-vf="set">${opt('all', 'All sets', VT.set)}${sets.map(k => opt(k, K.SETS[k].name, VT.set)).join('')}</select></label>
      <label>Show<select data-vf="st">${opt('all', 'All gear', VT.st)}${opt('free', 'Not worn', VT.st)}${opt('worn', 'Worn', VT.st)}${opt('lock', 'Locked', VT.st)}</select></label>
      <label>Sort<select data-vf="sort">${Object.keys(VT_SORTS).map(k => opt(k, VT_SORTS[k][0], VT.sort)).join('')}</select></label></div>`;
    const selItems = S.inv.filter(it => VT.sel.has(it.id)), selValue = selItems.reduce((t, it) => t + K.sellValue(it), 0);
    const sellBar = VT.sell
      ? `<div class="vt-sellbar"><span><b>${selItems.length}</b> selected · ${ic('coin')} <b>${selValue.toLocaleString('en-US')}</b></span>
          <span class="vt-quick">Select all not worn: ${[0, 1, 2, 3].map(r => `<button type="button" class="btn small" data-act="vquick" data-r="${r}">up to ${K.RARITIES[r]}</button>`).join('')}<button type="button" class="btn small" data-act="vquick" data-r="-1">None</button></span>
          <span class="vt-sellacts"><button type="button" class="btn small" data-act="vsellmode">Done</button><button type="button" class="btn primary small" data-act="vsell" ${selItems.length ? '' : 'disabled'}>Sell ${selItems.length || ''}</button></span></div>`
      : '';
    const cards = list.map(it => {
      const owner = it.owner && C[it.owner], picked = VT.sel.has(it.id), can = sellable(it);
      return `<button type="button" class="vt-item rar-${it.rar} ${picked ? 'picked' : ''} ${VT.sell && !can ? 'nosell' : ''} ${VT.open === it.id ? 'open' : ''}" data-act="vpick" data-item="${it.id}" title="${esc(itemName(it))}">
        ${gearIcon(it)}${it.lvl ? `<span class="vt-lv">+${it.lvl}</span>` : ''}${it.lock ? `<span class="vt-lock">${LOCK_SVG}</span>` : ''}${owner ? `<span class="vt-own">${por(it.owner)}</span>` : ''}
        <span class="vt-main">${K.fmtStat(...K.gearStats(it)[0])}</span>${picked ? '<span class="vt-check">✓</span>' : ''}</button>`;
    }).join('');
    const o = VT.open && !VT.sell ? S.inv.find(it => it.id === VT.open) : null;
    const detail = o ? `<section class="vt-detail rar-${o.rar}">${gearIcon(o)}<div class="vt-dmain"><b class="rartxt">${itemName(o)}</b><small>${esc(K.SETS[o.set] ? K.SETS[o.set].name + ' · ' + K.SETS[o.set].desc : '')} · item level ${o.il}</small>${itemStatsHtml(o)}
        <small>${o.owner && C[o.owner] ? `Worn by ${esc(C[o.owner].name)}` : 'Not worn'}</small></div>
        <div class="vt-dacts"><button type="button" class="btn small" data-act="vlock" data-item="${o.id}">${o.lock ? 'Unlock' : 'Lock'}</button>${sellable(o) ? `<button type="button" class="btn small" data-act="sell" data-item="${o.id}">Sell · ${ic('coin')} ${K.sellValue(o).toLocaleString('en-US')}</button>` : `<small class="empty-note">${o.lock ? 'Locked gear cannot be sold.' : 'Take it off its hero to sell it.'}</small>`}</div></section>` : '';
    return `<div class="section-head"><div><h2>Gear</h2><p class="lede">All your gear: filter, sort, lock what you want to keep and sell the rest for Sigils.</p></div>
        <div class="row"><span class="tag">${S.inv.length} pieces · ${S.inv.filter(it => !it.owner).length} not worn</span>${VT.sell ? '' : '<button type="button" class="btn primary small" data-act="vsellmode">Sell gear</button>'}</div></div>
      ${filters}${sellBar}${detail}
      ${list.length ? `<div class="vt-grid">${cards}</div>` : '<p class="empty-note">No gear matches these filters.</p>'}`;
  }

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
      ? `<div class="pf-item rar-${it.rar}">${gearIcon(it)}<div><b class="rartxt">${itemName(it)}</b><small>${esc(K.SETS[it.set] ? K.SETS[it.set].name : '')}</small>${itemStatsHtml(it)}</div></div>`
      : `<div class="pf-item empty"><span class="pf-slot">${SLOT_GLYPH[slot] || ''}</span><div><b>${K.SLOT_NAMES[slot]}</b><small>Empty</small></div></div>`; }).join('') : '';
    return `${close}<header class="pf-head">${p.avatar && C[p.avatar] ? por(p.avatar) : ''}<div><h2>${esc(p.name)}</h2><span class="empty-note">Player level ${p.lvl || 1}${p.guild ? ` · ${esc(p.guild)}` : ''}</span></div></header>
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
  const LOGIN_REWARDS = [{ silver: 2000 }, { fs: { greater: 2 } }, { fs: { greater: 2 } }, { silver: 5000 }, { silver: 10000 }, { stones: 5, st: { greater: 2 } }, { fs: { ancient: 1 } }];
  const loginReward = n => LOGIN_REWARDS[n % 7];
  const loginDue = () => !S.needStarter && S.seen.home && S.seen.tour && (S.login ? S.login.last : -1) < today();
  let loginShown = false;
  function rewardIcons(r) {
    return [...(r.silver ? [`${ic('coin')}<b>${r.silver.toLocaleString('en-US')}</b>`] : []), ...stoneParts(r).map(([t, n]) => `${stoneIc(t)}<b>${n}</b>`), ...Object.keys(r.fs || {}).map(k => `${shardIc(k)}<b>${r.fs[k]}</b>`)].join('');
  }
  function showLogin() {
    if (loginShown || !loginDue() || !$('#modal').hidden || document.querySelector('.unlock-pop')) return;
    loginShown = true;
    const n = (S.login && S.login.n) || 0, start = n - (n % 7), week = Math.floor(n / 7) + 1;
    // each reward as medallion icons and a short amount line
    const parts = r => [...(r.silver ? [[ic('coin'), `${r.silver.toLocaleString('en-US')} Sigils`]] : []), ...stoneParts(r).map(([t, n]) => [stoneIc(t), `${n} ${t[0].toUpperCase() + t.slice(1)} ${n === 1 ? 'Stone' : 'Stones'}`]), ...Object.keys(r.fs || {}).map(k => [shardIc(k), `${r.fs[k]} ${K.SHARD[k].name.replace(' Fate Shard', '').replace('Fate Shard', 'Fate')} ${r.fs[k] === 1 ? 'Shard' : 'Shards'}`])];
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
      if (tab === 'home') render();
    });
    el.querySelector('button').focus();
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
        row('Ascend', 'Spend Ascension Stones and Sigils for an extra star: a higher level cap and +5% stats.'),
        row('Feeding', 'Feed a hero you don\'t use, or a spare copy, to another hero for XP. Rarer and higher-level food gives more.'),
        row('Spare copy / duplicate', 'Summoning a hero you already own gives a spare copy. Feed it to the same hero to level up a skill.'),
        row('Skill level', `Each skill can be levelled ${K.SKILL_MAX} times: +${Math.round(K.SKILL_STEP * 100)}% power per level, and 1 turn less cooldown at the maximum.`),
        row('Captured', 'Enemies you capture in the campaign (5% per win) join as weak heroes or as fodder to feed.'),
        row('Team', 'Up to 4 heroes fight together. Pick them in Heroes & Gear → Team.'),
      ]),
      sec('gear', 'Gear', [
        row('Slots', `${K.SLOTS.map(s => K.SLOT_NAMES[s]).join(', ')}. One piece per slot per hero.`),
        row('Gear rarity', `${[0, 1, 2, 3, 4, 5].map(r => `<b class="rar-${r} rartxt">${K.RARITIES[r]}</b>`).join(' → ')}. Rarer gear has stronger stats and more substats. Mythical only drops in Nightmare.`),
        row('Level (item level)', 'How strong a piece is at its base; higher stages drop higher-level gear.'),
        row(`+1 … +${K.MAX_GEAR_LVL}`, `Upgrade level. Each upgrade costs Sigils and can fail (the item stays safe). Every 4 levels adds a substat or boosts one. Max +${K.MAX_GEAR_LVL}.`),
        row('Main stat / substats', 'The first stat is the main stat; the others are substats.'),
        row('Upgrade all', 'Upgrades the gear a hero wears as far as your Sigils go, the most important piece for its role first.'),
        row('Sets', 'Wearing enough pieces of one set gives a bonus. Each set counts once: extra pieces do not stack.'),
        ...Object.values(K.SETS).map(s => row(esc(s.name), esc(s.desc))),
      ]),
      sec('currency', 'Currencies and summoning', [
        row(`${ic('coin')} Sigils`, `The main currency: gear upgrades, ascending, Fate Shards (${K.SHARD_PRICE.toLocaleString('en-US')} each) and name changes.`),
        row(`${ic('stone')} Ascension Stones`, 'Needed to ascend heroes (extra stars), in three kinds by the star: Lesser (to 2-4★) drop everywhere; Greater (to 5★) from boss stages, Normal and harder, and Boss Hall level 3 on; Ancient (to 6★) only from Brutal and Nightmare boss stages, Boss Hall levels 9-10 and the weekly arena rewards.'),
        ...K.FATE_SHARDS.map(f => row(`${shardIc(f.id)} ${esc(f.name)}`, esc(f.desc))),
        row('Pity', `After ${K.PITY_EPIC} summons without an Epic or better, the next one is at least Epic. Only Ancient, Mythic and Legendary Fate Shards count.`),
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
    if (!signedIn() || SO.loading) { paintMail(); return; }
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
  function paintMail() {
    const b = $('#mail'); if (!b) return;
    const n = signedIn() ? mailCount() : 0, badge = b.querySelector('.mail-n');
    badge.hidden = !n; badge.textContent = n > 9 ? '9+' : n; b.classList.toggle('has', n > 0);
    b.title = n ? `Mail: ${n} new` : 'Mail: gifts and friend requests';
  }
  // what a gift gives, as text and as additions to the save
  const giftParts = r => [...(r.hero && C[r.hero] ? [`Hero: ${C[r.hero].name}`] : []), ...(+r.silver > 0 ? [`${(+r.silver).toLocaleString('en-US')} Sigils`] : []), ...stoneParts(r).map(([t, n]) => `${n} ${stoneName(t, n)}`), ...RW_KEYS.filter(k => r.fs && +r.fs[k] > 0).map(k => `${+r.fs[k]} ${K.SHARD[k].name}${+r.fs[k] > 1 ? "s" : ""}`)];
  function grantGift(r) {
    // a hero gift (e.g. the developer hero): joins the roster, or becomes a spare copy when already owned
    if (r.hero && C[r.hero]) { if (!S.roster[r.hero]) S.roster[r.hero] = newHero(r.hero); else S.fodder[r.hero] = (S.fodder[r.hero] || 0) + 1; }
    if (+r.silver > 0) S.silver += Math.floor(+r.silver);
    addStones(rewardStones(r));
    for (const k of RW_KEYS) if (r.fs && +r.fs[k] > 0) S.fs[k] = (S.fs[k] || 0) + Math.floor(+r.fs[k]);
  }
  const progressText = f => f.cleared != null && f.cleared >= 0 && K.STAGES[f.cleared] ? stageName(f.cleared) : 'Just started';
  // a friend row opens their profile (buttons inside keep their own action)
  const personRow = (f, acts) => `<li${f.kind === 'friend' ? ` class="pf-open" data-act="profile" data-id="${f.user_id}" title="View profile"` : ''}><span class="fr-av">${f.avatar && C[f.avatar] ? por(f.avatar) : ''}</span><span class="fr-main"><b>${esc(f.name)}</b><small class="empty-note">${f.lvl ? `Player level ${f.lvl} · ` : ''}${esc(progressText(f))}${f.rating ? ` · Arena ${f.rating}` : ''}</small></span><span class="fr-acts">${acts}</span></li>`;
  function needAccount(title) {
    const cl = cloud();
    if (!cl || !cl.enabled) return `<p class="empty-note">${title} needs the online version of the game.</p>`;
    return `<div class="lockbox">${LOCK_SVG}<div><h3>Sign in to use ${title.toLowerCase()}</h3><p class="empty-note">Friends, gifts and rewards are kept with your account.</p><button class="btn primary" data-act="account">Sign in or create an account</button></div></div>`;
  }
  function socialHtml() {
    const incoming = (SO.friends || []).filter(f => f.kind === 'incoming');
    const tabs = `<div class="dtabs soc-tabs" role="tablist" aria-label="Social"><button type="button" role="tab" data-act="soctab" data-t="friends" aria-selected="${SO.tab === 'friends'}">Friends${incoming.length ? '<span class="dot"></span>' : ''}</button><button type="button" role="tab" data-act="soctab" data-t="guild" aria-selected="${SO.tab === 'guild'}">Guild</button></div>`;
    const head = `<div class="section-head"><div><h2>Social</h2><p class="lede">Add friends with their friend code and see how far they are.</p></div></div>${tabs}`;
    if (SO.tab === 'guild') return head + guildHtml();
    if (!signedIn()) return head + needAccount('Friends');
    if (!SO.friends) return head + (SO.err ? `<p class="ar-err">${esc(SO.err)}</p><button class="btn" data-act="socreload">Try again</button>` : '<p class="empty-note">Loading your friends…</p>');
    const friends = SO.friends.filter(f => f.kind === 'friend'), out = SO.friends.filter(f => f.kind === 'outgoing');
    const code = SO.code ? SO.code.slice(0, 4) + ' ' + SO.code.slice(4) : '…';
    return head + (SO.err ? `<p class="ar-err">${esc(SO.err)}</p>` : '') + `<div class="soc-top">
        <section class="soc-card"><span class="tag">Your friend code</span><div class="fr-code"><b>${code}</b><button class="btn small" data-act="copycode">Copy</button></div><small class="empty-note">Share it with a friend so they can add you.</small></section>
        <section class="soc-card"><span class="tag">Add a friend</span><form class="fr-add" data-form="addfriend"><input name="fcode" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Friend code, e.g. 1A2B 3C4D" aria-label="Friend code"><button class="btn primary small" type="submit">Send request</button></form></section></div>
      ${incoming.length ? `<section class="fr-sec"><h3>Friend requests</h3><ul class="fr-list">${incoming.map(f => personRow(f, `<button class="btn primary small" data-act="fraccept" data-id="${f.user_id}">Accept</button><button class="btn small" data-act="frdecline" data-id="${f.user_id}">Decline</button>`)).join('')}</ul></section>` : ''}
      <section class="fr-sec"><h3>Friends <small class="empty-note">${friends.length}</small></h3>${friends.length ? `<ul class="fr-list">${friends.map(f => personRow(f, `<button class="btn small" data-act="frremove" data-id="${f.user_id}" data-name="${esc(f.name)}">Remove</button>`)).join('')}</ul>` : '<p class="empty-note">No friends yet. Send your friend code to someone, or add theirs above.</p>'}</section>
      ${out.length ? `<section class="fr-sec"><h3>Sent requests</h3><ul class="fr-list">${out.map(f => personRow(f, `<button class="btn small" data-act="frremove" data-id="${f.user_id}" data-name="">Cancel</button>`)).join('')}</ul></section>` : ''}`;
  }
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
  };
  const svgIcon = k => `<svg viewBox="0 0 16 16" aria-hidden="true">${SVG_IC[k]}</svg>`;
  async function friendAct(fn, body, okMsg) {
    try { await cloud().rpc(fn, body); if (okMsg) toast(okMsg); } catch (e) { toast('That did not work. Try again in a moment.', true); }
    socialLoad();
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
  // Start over: a player may wipe their own progress and pick a starter again, at any time.
  // The current progress is kept as a backup first.
  function startOverHtml() {
    return `<section class="prof-bk"><h3>Start over</h3><p class="empty-note">Wipe your progress and begin again from the starter choice: heroes, gear, Sigils, shards, campaign and Boss Hall progress and player level all reset. Your name stays. Your current progress is saved as a backup on this device first.</p>
      <div class="row"><button class="btn small danger" data-act="startover">Start over</button></div></section>`;
  }
  function startOver() {
    if (S.needStarter) return;
    backupRaw(JSON.stringify(S), true);
    const s = linkTeams(resetSave(S)); delete s.wasReset;
    S = s; homeScroll = null; tab = 'home'; save(); hud(); render(); window.scrollTo({ top: 0 });
    toast('Your adventure starts over. Choose your starter hero!', false, 5000);
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
    const road = Object.keys(UNLOCKS).map(t => {
      const ok = unlocked(t), u = UNLOCKS[t], left = u.lvl ? u.lvl - p.lvl : u.ch * 7 - 1 - S.cleared;
      return `<li class="${ok ? 'on' : ''}"><span class="lvtag">${needTag(t)}</span><b>${UNLOCK_NAME[t]}</b><span class="empty-note">${ok ? 'Unlocked' : `${left} ${u.lvl ? (left === 1 ? 'level' : 'levels') : (left === 1 ? 'stage' : 'stages')} to go`}</span></li>`;
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
      <section class="prof-acc"><h3>Settings</h3><div class="row"><button class="btn small" data-act="soundtoggle" aria-pressed="${S.sound}">Sound: ${S.sound ? "on" : "off"}</button><button class="btn small" data-act="musictoggle" aria-pressed="${S.music}">Music: ${S.music ? "on" : "off"}</button></div></section>
      <section class="prof-acc"><h3>Account</h3>${account}</section>
      ${startOverHtml()}
      ${backupsHtml()}
    </div>`;
  }

  // ---------- screen events ----------
  document.addEventListener('change', e => {
    const vf = e.target.closest('[data-vf]'); if (vf) { VT[vf.dataset.vf] = vf.value; VT.open = null; render(); return; }
    const f = e.target.closest('[data-filter]'); if (!f) return;
    TF[f.dataset.filter] = f.type === 'checkbox' ? f.checked : f.value; render();
  });
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
    if (name === S.p.name) { editName = false; render(); return; }
    const cost = renameCost();
    if (S.silver < cost) { toast(`Changing your name costs ${cost.toLocaleString('en-US')} Sigils.`, true); return; }
    S.silver -= cost; S.p.renames++;
    S.p.name = name; editName = false; save(); render(); toast(cost ? `Name saved. −${cost.toLocaleString('en-US')} Sigils.` : 'Name saved.');
  });
  document.addEventListener('click', e => {
    SFX.unlock(); MUSIC.unlock();
    const tb = e.target.closest('#tabs button');
    if (tb) { invSlot = null; SFX.click(); setTab(tb.dataset.tab); return; }
    if (e.target.closest('#sound')) { S.sound = !S.sound; save(); hud(); if (S.sound) SFX.click(); return; }
    if (e.target.closest('.brand') && !B && !S.needStarter) { SFX.click(); setTab('home'); window.scrollTo({ top: 0 }); return; }
    if (e.target.closest('#guide')) { if (B) return; SFX.click(); setTab('guide'); window.scrollTo({ top: 0 }); return; }
    if (e.target.closest('#mail')) { if (B) return; if (firstSteps()) { toast('Fight your first campaign battle to open the rest of your homebase.'); return; } SFX.click(); setTab('mail'); window.scrollTo({ top: 0 }); return; }
    if (e.target.closest('#account')) { if (B) return; if (firstSteps()) { toast('Fight your first campaign battle to open the rest of your homebase.'); return; } SFX.click(); editName = false; setTab('profiel'); window.scrollTo({ top: 0 }); return; }
    const a = e.target.closest('[data-act]');
    if (!a || a.closest('#battle')) return;
    const act = a.dataset.act, id = a.dataset.id, item = S.inv.find(x => x.id === +a.dataset.item);
    if (act !== 'modal') SFX.click();
    if (act === 'tfaff') { TF.aff = a.dataset.aff; render(); }
    else if (act === 'tfreset') { Object.assign(TF, { aff: 'all', rar: 'all', role: 'all', own: 'all' }); render(); }
    else if (act === 'starterpick') { starterSel = id; render(); }
    else if (act === 'starterchoose') { if (starterSel) confirmStarter(); }
    else if (act === 'starterok') { $('#modal').hidden = true; if (starterSel) pickStarter(starterSel); }
    else if (act === 'startercancel') $('#modal').hidden = true;
    else if (act === 'tab') { setTab(a.dataset.tab); window.scrollTo({ top: 0 }); }
    else if (act === 'go') { invSlot = null; if (a.dataset.go === 'guild') { SO.tab = 'guild'; GD.view = 'home'; setTab('social'); guildLoad(); } else setTab(a.dataset.go); window.scrollTo({ top: 0 }); }
    else if (act === 'soon') toast('Coming soon.');
    else if (act === 'tutlock') toast('Fight your first campaign battle to open the rest of your homebase.');
    else if (act === 'pnameedit') { editName = true; render(); const i = $('#screen input[name=pname]'); if (i) { i.focus(); i.select(); } }
    else if (act === 'pnamecancel') { editName = false; render(); }
    else if (act === 'avatar') { S.p.avatar = id; save(); render(); }
    else if (act === 'account') { if (window.FFH_CLOUD) window.FFH_CLOUD.openAccount(); }
    else if (act === 'arstate') arenaCall('state');
    else if (act === 'arrefresh') arenaCall('refresh');
    else if (act === 'ardef') arenaCall('defense').then(r => { if (r.state) toast('Your current team now defends you in the arena.'); });
    else if (act === 'arfight') arenaCall('fight', { offer: +a.dataset.n }).then(r => { if (r.fight) startArena(r.fight); });
    else if (act === 'arlb') loadBoard(a.dataset.kind);
    else if (act === 'arclaim') claimArena().then(socialLoad);
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
    else if (act === 'ginvacc') answerInvite(+id, true);
    else if (act === 'ginvdec') answerInvite(+id, false);
    else if (act === 'pfhero') { PF.sel = id; renderProfile(); }
    else if (act === 'pfclose') { PF.id = null; $('#modal').hidden = true; }
    else if (act === 'soundtoggle') { S.sound = !S.sound; save(); hud(); render(); if (S.sound) SFX.click(); }
    else if (act === 'musictoggle') { S.music = !S.music; save(); render(); MUSIC.refresh(); }
    else if (act === 'glnav') { e.preventDefault(); const s = document.getElementById('gl-' + a.dataset.id); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (act === 'socreload') socialLoad();
    else if (act === 'copycode') { const c = SO.code; navigator.clipboard.writeText(c).then(() => toast('Friend code copied.'), () => toast('Your friend code: ' + c, false, 5000)); }
    else if (act === 'fraccept') friendAct('friend_respond', { other: id, accept: true }, 'Friend added!');
    else if (act === 'frdecline') friendAct('friend_respond', { other: id, accept: false }, 'Request declined.');
    else if (act === 'frremove') { if (a.dataset.name) confirmBox('Remove friend?', `Remove <b>${esc(a.dataset.name)}</b> from your friends?`, 'Remove', () => friendAct('friend_remove', { other: id }, 'Friend removed.')); else friendAct('friend_remove', { other: id }, 'Request cancelled.'); }
    else if (act === 'mailclaim') claimMail(a.dataset.id);
    else if (act === 'startover') confirmBox('Start over?', `All your heroes, gear, Sigils, shards and progress will be gone and you begin again at the starter choice. Your name stays.<br><br>A backup of your current progress is kept on this device (Town Hall → Backups), just in case.`, 'Yes, start over', startOver);
    else if (act === 'restorebk') { const n = +a.dataset.n; confirmBox('Restore this backup?', 'Your game goes back to this saved copy. Your current progress is kept as a backup, so you can switch back.', 'Restore', () => restoreBackup(n)); }
    else if (act === 'mode') { S.diff = +a.dataset.diff; delete S.chap; save(); render(); }
    else if (act === 'chap') { S.chap = +a.dataset.n; save(); render(); }
    else if (act === 'play') { spotFight = false; startCampaign(+a.dataset.stage); }
    else if (act === 'auto10') startCampaign(+a.dataset.stage, { n: 10, k: 1, won: 0 });
    else if (act === 'bhauto') startDungeon(id, +a.dataset.n, { n: 10, k: 1, won: 0 });
    else if (act === 'spotblock') toast('Tap the glowing Fight button to start.');
    else if (act === 'tournext') { if (tourStep < TOUR.length - 1) { tourStep++; render(); } else { S.seen.tour = true; tourStep = 0; save(); spotFight = true; setTab('campagne'); window.scrollTo({ top: 0 }); } }
    else if (act === 'tourskip') { S.seen.tour = true; tourStep = 0; save(); render(); }
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
    else if (act === 'tmsel') { S.tsel = +a.dataset.i; S.team = S.teams[S.tsel].ids; if (!S.team.includes(selChamp)) selChamp = S.team[0] || selChamp; invSlot = null; save(); render(); }
    else if (act === 'tmmode') { S.modeTeam[a.dataset.m] = S.tsel; save(); render(); }
    else if (act === 'editteam') { useTeam(a.dataset.mode); setTab('team'); }
    else if (act === 'tmnew') nameBox('Create a team', `Team ${S.teams.length + 1}`, 'Create', name => { S.teams.push({ name, ids: [...S.team] }); S.tsel = S.teams.length - 1; S.team = S.teams[S.tsel].ids; save(); render(); toast(`${name} is created with the heroes of your current team. Change them below.`, false, 4000); });
    else if (act === 'tmname') nameBox('Rename team', S.teams[S.tsel].name, 'Save', name => { S.teams[S.tsel].name = name; save(); render(); });
    else if (act === 'tmdel') {
      const i = S.tsel, t = S.teams[i];
      confirmBox(`Delete ${esc(t.name)}?`, 'The heroes stay in your roster; only this team is removed. Game modes that used it switch to your first team.', 'Delete', () => {
        S.teams.splice(i, 1);
        for (const [m] of TEAM_MODES) S.modeTeam[m] = S.modeTeam[m] === i ? 0 : S.modeTeam[m] > i ? S.modeTeam[m] - 1 : S.modeTeam[m];
        S.tsel = 0; linkTeams(S); save(); render();
      });
    }
    else if (act === 'hinfo') heroInfo(id);
    else if (act === 'hteam') { $('#modal').hidden = true; selChamp = id; invSlot = null; champTab = 'stats'; setTab('team'); }
    else if (act === 'ctab') { champTab = a.dataset.t; invSlot = null; render(); }
    else if (act === 'inv') { $('#modal').hidden = true; invSlot = a.dataset.slot; champTab = 'gear'; render(); const p = $('#invpanel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    else if (act === 'invclose') { invSlot = null; render(); }
    else if (act === 'equip' && item) {
      S.inv.filter(x => x.owner === selChamp && x.slot === item.slot).forEach(x => (x.owner = null));
      item.owner = selChamp; invSlot = null; save(); render(); toast(`${itemName(item)} equipped.`);
    } else if (act === 'unequip' && item) { $('#modal').hidden = true; item.owner = null; save(); render(); }
    else if (act === 'sell' && item) {
      if (item.lock) { toast('This gear is locked. Unlock it first to sell it.', true); return; }
      const v = K.sellValue(item); S.silver += v; S.inv = S.inv.filter(x => x !== item); if (VT.open === item.id) VT.open = null; save(); render(); toast(`Sold for ${v} Sigils.`);
    }
    else if (act === 'vsellmode') { VT.sell = !VT.sell; VT.sel.clear(); VT.open = null; render(); }
    else if (act === 'vpick' && item) {
      if (VT.sell) { if (!sellable(item)) { toast(item.lock ? 'Locked gear cannot be sold.' : 'Worn gear cannot be sold.', true); return; } VT.sel.has(item.id) ? VT.sel.delete(item.id) : VT.sel.add(item.id); }
      else VT.open = VT.open === item.id ? null : item.id;
      render();
    }
    else if (act === 'vquick') { const r = +a.dataset.r; VT.sel.clear(); if (r >= 0) vaultItems().filter(it => sellable(it) && it.rar <= r).forEach(it => VT.sel.add(it.id)); render(); }
    else if (act === 'vlock' && item) { item.lock = !item.lock; if (!item.lock) delete item.lock; save(); render(); toast(item.lock ? 'Locked: this gear cannot be sold.' : 'Unlocked.'); }
    else if (act === 'vsell') {
      const list = S.inv.filter(it => VT.sel.has(it.id) && sellable(it)); if (!list.length) return;
      const v = list.reduce((t, it) => t + K.sellValue(it), 0), rare = list.filter(it => it.rar >= 3).length;
      const doSell = () => { S.silver += v; S.inv = S.inv.filter(it => !list.includes(it)); VT.sel.clear(); save(); render(); hud(); SFX.up(); toast(`Sold ${list.length} ${list.length === 1 ? 'piece' : 'pieces'} for ${v.toLocaleString('en-US')} Sigils.`); };
      // Epic or better in the selection: ask first
      if (rare) confirmBox('Sell this gear?', `You are selling ${list.length} pieces, <b>${rare} of them Epic or better</b>, for ${v.toLocaleString('en-US')} Sigils.`, 'Sell', doSell); else doSell();
    }
    else if (act === 'sellbad') {
      const bad = S.inv.filter(x => !x.owner && !x.lock && x.rar <= 1 && x.lvl === 0);
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
      // slot by slot, repeated until nothing improves: a swap can complete or break a set and so change what is best
      // for the other slots (one pass used to leave work for a second click)
      const h = S.roster[selChamp], was = new Set(itemsOf(selChamp));
      for (let pass = 0, more = true; more && pass < 8; pass++) {
        more = false;
        for (const slot of K.SLOTS) {
          const cur = S.inv.find(x => x.owner === selChamp && x.slot === slot);
          const others = itemsOf(selChamp).filter(x => x.slot !== slot);
          const cands = S.inv.filter(x => x.slot === slot && (!x.owner || x.owner === selChamp));
          let best = cur, bestP = power(K.heroStats(selChamp, h, cur ? [...others, cur] : others));
          for (const c of cands) { const pw = power(K.heroStats(selChamp, h, [...others, c])); if (pw > bestP + 1e-9) { best = c; bestP = pw; } }
          if (best && best !== cur) { if (cur) cur.owner = null; best.owner = selChamp; more = true; }
        }
      }
      const changed = itemsOf(selChamp).filter(x => !was.has(x)).length;
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
      if (!S.roster[x] || x === to || inAnyTeam(x) || h.lvl >= K.maxLvl(h.stars, to)) return;
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
      if (!C[id] || !C[id].captured || inAnyTeam(id)) return;
      delete S.roster[id]; S.fodder[id] = (S.fodder[id] || 0) + 1;
      S.inv.forEach(x => { if (x.owner === id) x.owner = null; });
      selChamp = S.team[0]; save(); render(); toast(`${C[id].name} is now a spare copy. Capture another to use it as a hero again.`);
    } else if (act === 'rank') {
      const h = S.roster[selChamp], rc = K.rankCost(h.stars);
      if (h.stars >= K.maxStars(selChamp) || h.lvl < K.maxLvl(h.stars, selChamp) || stoneN(rc.tier) < rc.stones || S.silver < rc.silver) return;
      if (rc.tier === 'lesser') S.stones -= rc.stones; else S.stx[rc.tier] -= rc.stones; S.silver -= rc.silver; h.stars++; SFX.summon(3); save(); render(); toast(`${C[selChamp].short} is now ${h.stars}★. New maximum: level ${K.maxLvl(h.stars, selChamp)}.`);
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
  const BOSS_POS = [374, 244], GBOSS_POS = [372, 266], ADD_POS = [[296, 198], [300, 262], [270, 232]];
  const R = { running: false, units: [], projs: [], parts: [], fx: [], ash: [], shake: 0, area: 0, hl: new Set(), hlKind: 'bad', active: null, dim: 0 };
  let B = null, pending = null, selSkill = 0, quitArm = 0;
  // battle speed: S.speed is the player's preferred speed, spd the speed this battle actually runs at.
  // Speeds unlock with campaign progress (stage index that must be reached); 5× only when replaying something already beaten.
  const SPEED_UNLOCK = [[2, 3], [3, 14], [5, 7]];
  let spd = 1, speeds = [1];
  // arena fights are replays of a fight already decided, so every unlocked speed (also 5×) may be used
  const beatenBefore = cfg => cfg.type === 'arena' || cfg.type === 'gboss' || (cfg.type === 'stage' ? cfg.i <= clearedOn(cfg.diff) : cfg.n <= (S.bh[cfg.id] || 0));
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
  function setPose(u, pose, ms) { const now = performance.now(); Object.assign(u._rs, { pose, poseAt: now, poseUntil: now + ms / spd }); }
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
      // the figure is drawn around its feet with this frame's pose (see pose())
      const flip = u.side === 'enemy', dir = flip ? -1 : 1, fr = u.effects.some(e => e.k === 'burrow') ? 'burrow' : 'idle0', P = pose(u, now);
      const px = Math.round(rs.x + rs.ox + P.dx * dir) + sh, py = Math.round(rs.y + rs.oy - rs.jump + P.dy) + shy;
      const draw = (img, a) => { g.globalAlpha = a; g.save(); g.translate(px, py); if (P.rot) g.rotate(P.rot * dir); if (P.sx !== 1 || P.sy !== 1) g.scale(P.sx, P.sy); g.drawImage(img, -Math.round(m.w / 2), -m.fy); g.restore(); };
      const a = (u.alive ? rs.alpha : 0.85) * (u.id === 'nevelgeest' && u.alive ? 0.9 : 1);
      draw(SPR.frame(u.id, fr, flip ? 'flip' : ''), a);
      if (P.dim > 0) draw(SPR.frame(u.id, 'dim', flip ? 'flip' : ''), a * P.dim);
      if (rs.flash > 0.02 && u.alive) { draw(SPR.frame(u.id, fr, flip ? 'whiteflip' : 'white'), Math.min(1, rs.flash)); rs.flash *= 0.8; }
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
  const FX_ICON = { atkUp: 'sword', atkDown: 'sword', defUp: 'shield', defDown: 'shield', spdUp: 'bolt', spdDown: 'bolt', critUp: 'target', cdmgUp: 'star', shield: 'shield', regen: 'plus', stealth: 'eye', immune: 'shield', counter: 'counter', burrow: 'down', burn: 'flame', bleed: 'drop', poison: 'skull', freeze: 'snow', stun: 'stun', silence: 'mute', healRed: 'heart', accDown: 'eye', taunt: 'bang', mark: 'cross', broken: 'bolt', enrage: 'flame', blight: 'skull', ironhide: 'shield', swift: 'bolt' };
  const fxSvg = k => `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="${FXP[FX_ICON[k] || 'star']}"/></svg>`;
  // one badge; n = turns left (none for lasting effects), extra = a count shown instead (stacks)
  function fxBadge(k, n, title, extra) {
    const E0 = K.EFFECTS[k] || {}, arrow = /Up$/.test(k) ? '▲' : /Down$|^healRed$/.test(k) ? '▼' : '';
    const kind = k === 'enrage' ? 'rage' : E0.buff ? 'good' : 'bad';
    return `<span class="fxi ${kind} fx-${k}" title="${esc(title || (E0.n ? `${E0.n}: ${E0.d}` : k))}">${fxSvg(k)}${arrow ? `<em>${arrow}</em>` : ''}${extra != null ? `<i>${extra}</i>` : n != null && n < 99 ? `<i>${n}</i>` : ''}</span>`;
  }

  // ----- battle hooks -----
  const SELF_KINDS = ['heal', 'shield', 'buff', 'revive', 'dust'];
  async function animBefore(u, skill, targets) {
    const rs = u._rs, dir = u.side === 'hero' ? 1 : -1, v = skill.vfx || '';
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
        setPose(t, 'hit', 340);
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
    enrage: (t, v) => { if (v === 1) { SFX.banner(); if (!calm()) R.shake = 6; queueBanner('Enraged!', `${t.name} took too long to fall: its Attack keeps rising`, 'big enemy', 1000); } updateOverlay(); },
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
    if (TUT.turns === 1) coach(`<b>Your turn!</b><ol><li>Pick a skill below. <b>Basic</b> is always ready; stronger skills need a few turns to recharge (the <b>cooldown</b>, CD).</li><li>Tap a highlighted enemy (the glowing marker at its feet) to attack it.</li></ol>`);
    else if (TUT.turns === 2) coach(`<b>Tip:</b> the colored icon next to every name is its <b>essence</b>. Some essences beat others and deal extra damage (a <b>Strong Hit</b>). Your Guide (the ? button) explains them all.`);
    else if (ready.length && TUT.turns <= 4) coach(`<b>${esc(ready[0].name)}</b> is ready: it hits harder than your Basic attack. Try it!`);
    else coachHide();
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
    if (TUT.on && TUT.turns === 1) coachHide();
    $('#b-skills').querySelectorAll('button').forEach(b => (b.disabled = true));
    $('#b-hint').textContent = ' ';
    updateOverlay();
    res({ skill: s, target });
  }
  // on auto (not in the arena, whose fights are replays) tapping an enemy makes it every hero's focus; tap it again to clear
  const canFocus = () => B && B.b.auto && B.cfg.type !== 'arena' && B.cfg.type !== 'gboss';
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
  function setAutoBtn() { const b = $('#b-auto'), on = S.auto && autoOk(); b.classList.toggle('on', on); b.classList.toggle('locked', !autoOk()); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = autoOk() ? 'Auto battle: ' + (on ? 'on' : 'off') : 'Auto battle unlocks when you clear Chapter I · Stage 1'; }
  function setSpeedBtn() { const b = $('#b-speed'); b.innerHTML = `<b>${spd}×</b>`; b.classList.toggle('on', spd > 1); b.title = 'Battle speed ' + spd + '×' + (speedHint() ? '. ' + speedHint() : ''); b.setAttribute('aria-label', b.title); SFX.calm = calm(); }
  $('#b-auto').addEventListener('click', () => {
    if (B && (B.cfg.type === 'arena' || B.cfg.type === 'gboss')) { toast(B.cfg.type === 'gboss' ? 'Guild boss fights always play on auto.' : 'Arena fights always play on auto.'); return; }
    if (!autoOk()) { toast('Auto battle unlocks when you clear Chapter I · Stage 1.'); return; }
    S.auto = !S.auto; save(); setAutoBtn();
    if (B) B.b.auto = S.auto;
    if (S.auto && pending) { const { u, res, b } = pending; pending = null; R.hl = new Set(); updateOverlay(); $('#b-hint').textContent = 'Auto is playing this turn.'; res(b.ai(u)); }
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
  $('#b-quit').addEventListener('click', () => {
    // arena: the result is already known, so this skips ahead (fast forward) instead of surrendering
    if (B && (B.cfg.type === 'arena' || B.cfg.type === 'gboss')) { spd = 40; SFX.calm = true; toast('Skipping to the result…'); return; }
    const btn = $('#b-quit');
    if (Date.now() - quitArm > 3000) { quitArm = Date.now(); btn.classList.add('armed'); btn.setAttribute('aria-label', 'Tap again to give up'); setTimeout(() => { btn.classList.remove('armed'); btn.setAttribute('aria-label', 'Give up'); }, 3000); return; }
    quitArm = 0; btn.classList.remove('armed'); btn.setAttribute('aria-label', 'Give up');
    if (!B) return;
    B.b.aborted = true;
    if (pending) { const { u, res, b } = pending; pending = null; res(b.ai(u)); }
  });

  // ----- start / intro / finish -----
  // rep: an "Auto ×10" run ({ n: 10, k: battle number, won }): the same stage on auto, one battle after the other
  function startCampaign(i, rep) {
    const st = K.STAGES[i], diff = S.diff || 0, D = K.DIFFS[diff], lvl = K.diffLvl(st, diff);
    if (!spendEnergy(K.stageEnergy(st, diff))) { render(); return; }
    useTeam('campaign');
    S.chap = st.chapter;
    runBattle({ type: 'stage', i, diff, hard: diff > 0, lvl, stage: st, foes: st.foes, area: st.area, rep, title: `${stageName(i)}${diff ? ' · ' + D.name : ''}${st.boss ? ' · ' + st.boss : ''}` });
  }
  function startDungeon(id, n, rep) {
    if (!spendEnergy(K.bossEnergy(n))) { render(); return; }
    useTeam('boss');
    const bi = K.BOSS_ORDER.indexOf(id), bo = K.BOSSES[id];
    runBattle({ type: 'boss', id, bi, n, rep, lvl: K.bossLvl(bi, n), foes: K.bossFoes(id, n), phases: K.bossPhases(id, n), area: AREA_OF[bo.aff], title: `${bo.name} · level ${n}` });
  }
  // enemies of phase p (0-based): campaign stages and Boss Hall levels both have K.PHASES phases
  const phaseUnits = (cfg, p) => cfg.stage ? K.stageUnits(cfg.stage, cfg.lvl, p, cfg.diff) : K.bossUnits(cfg.id, cfg.n, p);
  // phase cleared: the survivors walk off to the right, then everyone walks in for the next phase
  async function nextPhase(heroes, enemies, p) {
    const alive = heroes.filter(u => u.alive);
    await showBanner(`Phase ${p} cleared`, 'Onward!', '', 700);
    if (TUT.on && p === 1) await coach(`<b>Phase 1 cleared!</b> Two more to go. Your heroes walk on with the HP they have left and recover 15%. Skills that were recharging are ready again.`, 'Continue');
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
    SFX.unlock(); MUSIC.play(null);
    // Arena: a replay of the fight the server already played. Both teams come from the server's snapshots and the dice
    // from its seed (K.arenaSetup), so this plays out exactly like on the server; both sides play on auto.
    // Guild boss: also a replay of the server's fight (K.gbossSetup), on auto, until the boss's turn cap.
    const gb = cfg.type === 'gboss', arena = cfg.type === 'arena' || gb, nPh = arena ? 1 : K.PHASES;
    let heroes, enemies;
    if (gb) ({ heroes, enemies } = K.gbossSetup(cfg.team, cfg.d, cfg.ess, cfg.seed));
    else if (arena) ({ heroes, enemies } = K.arenaSetup(cfg.att, cfg.def, cfg.seed));
    else { heroes = S.team.map(id => K.heroUnit(id, S.roster[id], itemsOf(id))); enemies = phaseUnits(cfg, 0); }
    $('#screen').hidden = true; $('#tabs').hidden = true; $('#battle').hidden = false;
    $('#toast').hidden = true;
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
    b.auto = arena || !!cfg.rep || (S.auto && autoOk());
    if (gb) { b.capUnit = enemies[0]; b.cap = K.GBOSS.turns; }
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
    await showBanner(cfg.title, gb ? `Guild boss · ${K.DIFFS[cfg.d].name} · deal as much damage as you can` : arena ? 'Arena · both teams fight on auto' : `Phase 1 / ${K.PHASES} · The battle begins`, 'big', 800);
    // the very first battle: the coach explains the goal, phases and the turn order before the fight starts
    TUT.on = !arena && cfg.type === 'stage' && cfg.i === 0 && !cfg.diff && S.cleared < 0; TUT.turns = 0; coachHide();
    if (TUT.on) await coach(`<b>Your first battle!</b><ul><li><b>Goal:</b> defeat every enemy. A stage has <b>${K.PHASES} phases</b>: ${K.PHASES} fights in a row. Your heroes keep their HP between them and recover 15%.</li><li><b>Turn order:</b> the portraits at the top show who acts next. Faster units act more often.</li><li>Win to earn <b>gear, Sigils and XP</b> and to open the next stage.</li></ul>`, "Let's fight");
    log(arena ? 'The arena fight begins. Speed decides the turn order.' : `The battle begins: ${K.PHASES} phases. Speed decides the turn order.`);
    // phases: the same hero units fight on; damage stats add up over the phases
    const tot = { dmg: {}, crits: 0, maxHit: 0, turns: 0 }, meter = {};
    const addStats = x => { addMeter(meter, x.meter); for (const k in x.stats.dmg) tot.dmg[k] = (tot.dmg[k] || 0) + x.stats.dmg[k]; tot.crits += x.stats.crits; tot.maxHit = Math.max(tot.maxHit, x.stats.maxHit); tot.turns += x.turns; };
    let res;
    for (let p = 0; p < nPh; p++) {
      if (p) {
        enemies = phaseUnits(cfg, p);
        await nextPhase(heroes, enemies, p);
        b = new K.Battle(heroes, enemies, hooks); b.auto = !!cfg.rep || (S.auto && autoOk());
        B.b = b; B.ph = p;
        const boss = enemies.find(u => u.isBoss);
        await showBanner(boss ? boss.name : `Phase ${p + 1} / ${K.PHASES}`, boss ? `Boss fight · ${boss.aff} · ${boss.nPhases} boss phases` : `${enemies.length} enemies`, 'big', 800);
        log(`Phase ${p + 1} of ${K.PHASES}: ${enemies.length} ${enemies.length === 1 ? 'enemy' : 'enemies'}.`);
        if (boss) log(`${boss.name} · ${E[boss.id].passiveName}: ${E[boss.id].passiveDesc}`, 'enemy');
        if (boss && boss.blight) { log(`Blight Aura: every turn of ${boss.name} costs each of your heroes ${Math.round(boss.blight * 100)}% of their max HP. Bring healing.`, 'enemy'); queueBanner('Blight Aura', `Every turn of the boss drains your whole team. Heal or fall.`, 'big enemy', 1100); }
      }
      res = await b.run();
      addStats(b);
      R.active = null; R.hl = new Set(); updateOverlay();
      if (res !== 'win' || b.aborted) break;
    }
    if (arena) K.setRng(null);
    b.stats = tot; b.turns = tot.turns; b.meterAll = meter;
    // arena: the server's result counts (the replay should always agree; warn if it ever does not)
    if (gb) { finishGboss(cfg, b); return; }
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
  // ---------- Energy (K.ENERGY): S.energy, refilled by time from S.enAt (ms) ----------
  const EN_MS = K.ENERGY.regenMin * 60000;
  const enMax = () => K.energyMax(S.p.lvl);
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
  const enIc = () => `<svg class="en-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="${FXP.bolt}"/></svg>`;
  const enCost = c => c ? `<span class="en-cost" title="Costs ${c} energy">${enIc()}${c}</span>` : '';
  // pay for a battle; false (with a message) when there is not enough
  function spendEnergy(cost) {
    energyTick();
    if (cost && S.energy < cost) { toast(`Not enough energy: this battle costs ${cost}, you have ${S.energy}. You get 1 every ${K.ENERGY.regenMin} minutes, enough in ${fmtMins(energyWait(cost))}.`, true, 4200); return false; }
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
    while (p.xp >= pxNeed(p.lvl)) {
      p.xp -= pxNeed(p.lvl); p.lvl++;
      const silver = levelSilver(p.lvl), shard = p.lvl % 5 === 0 ? 'greater' : null;
      S.silver += silver; if (shard) S.fs[shard] = (S.fs[shard] || 0) + 1; energyTick(); const en = enMax(); S.energy += en;
      ups.push([p.lvl, silver, shard, Object.keys(PLAYER_UNLOCK).find(t => PLAYER_UNLOCK[t] === p.lvl) || null, en]);
    }
    return ups;
  }
  // unlock messages (S.seen remembers which were shown): speed 3× and 5×, Fate Altar, Boss Hall
  function newUnlocks() {
    const out = [];
    if (!S.seen.auto && S.cleared >= 0) { S.seen.auto = true; out.push({ k: 'auto', title: 'Auto battle unlocked', text: 'Tap the round Auto button at the top right of a battle and your heroes fight on their own. It stays on until you turn it off.' }); }
    // the homebase opens after the first campaign battle (see firstSteps)
    if (!S.seen.home && !S.needStarter && !firstSteps()) { S.seen.home = true; out.push({ k: 'home', title: 'Your homebase is open', text: 'A short tour shows you every building and what it is for. After that, the campaign continues.' }); }
    for (const [sp, at] of SPEED_UNLOCK) if (sp > 2 && !S.seen['spd' + sp] && S.cleared + 1 >= at) {
      S.seen['spd' + sp] = true;
      out.push({ k: 'spd', title: `Speed ${sp}× unlocked`, text: sp === 5 ? 'Battles can now run at 5× when you replay a stage you already cleared or a Boss Hall level you already beat.' : `Tap the speed button in battle to switch to ${sp}×.` });
    }
    for (const k in UNLOCKS) if (!S.seen[k] && unlocked(k)) {
      S.seen[k] = true;
      out.push({ k, title: `${UNLOCK_NAME[k]} unlocked`, text: k === 'altaar' ? 'Use your Fate Shards at the Fate Altar to summon new heroes.' : k === 'guild' ? 'Create or join a guild in the Guild Hall, fight the guild boss every day and earn a weekly Guild Chest.' : k === 'arena' ? 'Fight the teams of other players, climb the ranking and earn weekly rewards.' : 'Challenge the bosses of the Boss Hall for their rare gear sets.' });
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
    let xp, silver, stones = {}, unlock = null, first = false, captured = null;
    const gotShards = [];
    if (win) {
      xp = K.winXp(lvl); silver = K.winSilver(lvl);
      if (cfg.type === 'stage') {
        const hard = cfg.hard, cleared = clearedOn(cfg.diff);
        if (cfg.i > cleared) { first = true; if (cfg.diff) S.dcl[cfg.diff] = cfg.i; else S.cleared = cfg.i; gotShards.push(cfg.stage.n === 6 ? 'greater' : 'fate'); }
        stones = K.stageStones(cfg.stage, cfg.diff, first);
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
        stones = K.bossStones(cfg.n, first);
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
    S.silver += silver; addStones(stones);
    for (const t of gotShards) S.fs[t] = (S.fs[t] || 0) + 1;
    loot.forEach(it => S.inv.push(it));
    const ups = grantXp(xp);
    const pxp = win ? playerWinXp(lvl, first, cfg.type === 'boss') : b.aborted ? 0 : Math.round(playerWinXp(lvl) * 0.25);
    const pups = grantPlayerXp(pxp); if (pups.length) paintEnergy();
    if (win) { S.p.st.won++; if (cfg.type === 'boss') S.p.st.bossWon++; } else if (!b.aborted) S.p.st.lost++;
    const unlocks = newUnlocks();
    save();
    let dl = 0; const d = () => `style="animation-delay:${(dl++) * 0.12}s"`;
    items.push(`<li ${d()}>${ic('coin')}+${silver.toLocaleString('en-US')} Sigils</li>`);
    items.push(`<li ${d()}><span class="aff" style="--c:var(--info)">XP</span>+${xp} XP for every champion in your team</li>`);
    if (pxp) items.push(`<li ${d()}><span class="aff" style="--c:var(--gold)">P</span>+${pxp} player XP${pups.length ? '' : ` · ${S.p.xp} / ${pxNeed(S.p.lvl)} to level ${S.p.lvl + 1}`}</li>`);
    pups.forEach(([l, sv, sh, t, en]) => items.push(`<li class="loot lvup" ${d()}><span class="lvbadge">${l}</span><span><b>Player level ${l}!</b> +${en} Energy · +${sv.toLocaleString('en-US')} Sigils${sh ? ` · +1 ${esc(K.SHARD[sh].name)}` : ''}${t ? ` · <b>The ${UNLOCK_NAME[t]} is now open.</b>` : ''}</span></li>`));
    for (const t of gotShards) items.push(`<li class="loot rar-${K.FATE_SHARDS.findIndex(f => f.id === t)}" ${d()}>${shardIc(t)}+1 ${esc(K.SHARD[t].name)}</li>`);
    for (const [t, n] of Object.entries(stones)) if (n > 0) items.push(`<li ${d()}>${stoneIc(t)}+${n} ${stoneName(t, n)}</li>`);
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
    const note = win && TUT.on ? `<div class="coach-note"><b>Well done! What now?</b><ul><li><b>Next stage</b> continues the story; clearing stages 1-3 brings new heroes to your team.</li><li>The gear you win goes to <b>Heroes &amp; Gear</b> on your homebase: equip and upgrade it there.</li><li>Stuck later on? <b>Replay</b> cleared stages to level up and farm gear.</li></ul></div>`
      : win && first && last ? `<p class="lede">You finished all ten chapters on ${K.DIFFS[cfg.diff].name}.${nd ? ` ${nd.name} difficulty is now open: tougher enemies, better gear (${rarsHtml(nd.rars)}).` : ' You beat the hardest difficulty!'}</p>`
      : win && first && isStage && cfg.stage.n === 6 && cfg.stage.chapter + 1 < K.CHAPTERS.length ? `<p class="lede">Chapter ${ROMAN[cfg.stage.chapter]} cleared. Chapter ${ROMAN[cfg.stage.chapter + 1]}, ${esc(K.CHAPTERS[cfg.stage.chapter + 1].name)}, is now open.</p>`
      : win && first && cfg.type === 'boss' && cfg.n === 1 && cfg.bi + 1 < K.BOSS_ORDER.length ? `<p class="lede">${esc(K.BOSSES[K.BOSS_ORDER[cfg.bi + 1]].name)} is now open in the Boss Hall.</p>`
      : win ? '' : !b.aborted && cfg.type === 'boss' && cfg.n >= K.BTRAIT.from && !S.team.some(id => skillFx(id).includes(K.BTRAIT.answer[K.bossTrait(cfg.bi)])) ? `<p class="lede">Tip: this boss has <b>${K.EFFECTS[K.bossTrait(cfg.bi)].n}</b>. ${esc(K.EFFECTS[K.bossTrait(cfg.bi)].d)}.</p>`
        : !b.aborted && cfg.type === 'boss' && cfg.n >= K.BLIGHT.bh && !S.team.some(heals) ? '<p class="lede">Tip: your team has no healer. This boss drains your whole team every turn (Blight Aura); bring a hero who heals or shields (Draelyn, or a Support from the Fate Altar).</p>'
        : '<p class="lede">Tip: level your team, equip better gear, bring faster champions, or pick essences that land Strong Hits. If a stage keeps beating you, replay earlier stages for gear and levels first.</p>';
    const canNext = isStage ? cfg.i + 1 < K.STAGES.length : cfg.n < K.BOSS_LEVELS && (S.bh[cfg.id] || 0) >= cfg.n;
    const acts = win
      ? `${canNext ? `<button class="btn primary" data-act="modal" data-go="next">${isStage ? 'Next stage' : 'Next level'}</button>` : ''}<button class="btn" data-act="modal" data-go="again">Replay</button><button class="btn" data-act="modal" data-go="champs">Champions</button><button class="btn" data-act="modal" data-go="back">Back</button>`
      : `<button class="btn primary" data-act="modal" data-go="again">Try again</button><button class="btn" data-act="modal" data-go="champs">Upgrade champions</button><button class="btn" data-act="modal" data-go="back">Back</button>`;
    const openBtns = pups.map(u => u[3]).filter(Boolean).map(t => `<button class="btn violet" data-act="modal" data-go="open-${t}">Open the ${UNLOCK_NAME[t]}</button>`).join('');
    if (pups.length) SFX.up();
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box ${win ? '' : 'lose'}" role="dialog" aria-modal="true"><h2>${win ? 'Victory' : b.aborted ? 'Surrendered' : 'Defeated'}</h2><p class="tag">${esc(cfg.title)}${win && first ? ' · first clear' : ''}</p>${mvp}<ul class="rewards">${items.join('')}</ul>${meterHtml(b)}${note}<div class="modal-actions">${openBtns}${acts}</div></div>`;
    m.hidden = false;
    const f = m.querySelector('.btn'); if (f) f.focus();
    setTimeout(() => showUnlocks(unlocks), 500);
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
    R.running = false; pending = null;
    coachHide(); closeGuidePop();
    $('#battle').hidden = true; $('#screen').hidden = false; $('#tabs').hidden = false; $('#ov').innerHTML = ''; $('#banner').hidden = true;
  }
  // Auto ×10: after a win the next battle starts by itself after a short countdown (Stop keeps the result open);
  // a defeat or the tenth battle ends the run with a summary line
  let repTimer = null;
  function repStep(cfg, win) {
    const r = cfg.rep, won = r.won + (win ? 1 : 0), more = win && r.k < r.n, box = $('#modal .modal-box');
    const el = document.createElement('div'); el.className = 'rep-bar';
    el.innerHTML = more ? `<b>Auto ×${r.n}</b> · battle ${r.k} of ${r.n} won · next battle in <span>3</span>s <button class="btn small" type="button">Stop</button>`
      : `<b>Auto ×${r.n} finished</b> · ${won} of ${r.k} ${r.k === 1 ? 'battle' : 'battles'} won${win ? '' : ' (stopped after a defeat)'}`;
    box.insertBefore(el, box.querySelector('.rewards'));
    clearInterval(repTimer);
    if (!more) return;
    let left = 3;
    repTimer = setInterval(() => {
      if ($('#modal').hidden) { clearInterval(repTimer); return; }
      if (document.querySelector('.unlock-pop')) return; // wait while an unlock message is open
      left--; const s = el.querySelector('span'); if (s) s.textContent = left;
      if (left <= 0) { clearInterval(repTimer); const c = cfg.type === 'stage' ? K.stageEnergy(K.STAGES[cfg.i], cfg.diff) : K.bossEnergy(cfg.n); if (energyWait(c)) { el.innerHTML = `<b>Auto ×${r.n} stopped</b> · out of energy (${won} of ${r.k} won). Enough for the next battle in ${fmtMins(energyWait(c))}.`; return; } $('#modal').hidden = true; endBattleView(); B = null; const nx = { n: r.n, k: r.k + 1, won }; if (cfg.type === 'stage') startCampaign(cfg.i, nx); else startDungeon(cfg.id, cfg.n, nx); }
    }, 1000);
    el.querySelector('button').addEventListener('click', () => { clearInterval(repTimer); el.innerHTML = `<b>Auto ×${r.n} stopped</b> · ${won} of ${r.k} won`; });
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
    else if (go === 'next') { if (cfg.type === 'stage') startCampaign(cfg.i + 1); else startDungeon(cfg.id, cfg.n + 1); }
    else if (go === 'again') { if (cfg.type === 'stage') startCampaign(cfg.i); else startDungeon(cfg.id, cfg.n); }
    else if (go === 'champs') setTab('team');
    else if (cfg.type === 'arena') setTab('arena');
    else if (cfg.type === 'gboss') { SO.tab = 'guild'; GD.view = 'boss'; setTab('social'); }
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
    // new mail (gifts, friend requests, arena rewards) is checked every 2 minutes while the game is open
    paintMail(); setInterval(() => { if (!B && document.visibilityState === 'visible') socialLoad(); }, 120000);
    if (announceReset()) return;
    const m7 = S.migrated7; delete S.migrated7;
    if (S.migrated) { delete S.migrated; delete S.migrated4; delete S.migrated5; delete S.migrated6; save(); toast('Your progress was carried over. Your champions were replaced by the new heroes.'); }
    else if (S.migrated4) { delete S.migrated4; delete S.migrated5; save(); toast('New combat system: Essences, Speed and the Boss Hall. Your progress was kept.'); }
    else if (S.migrated5) { delete S.migrated5; delete S.migrated6; save(); toast('The campaign now has 10 chapters of 7 stages. Your progress was moved to the matching stage.'); }
    else if (S.migrated6) { delete S.migrated6; save(); toast('The Fate Altar is open: your crown shards are now Fate Shards, and you got a Greater Fate Shard.'); }
    else if (m7) { save(); toast(`New: player levels. Win battles to level up. The Fate Altar opens at level ${PLAYER_UNLOCK.altaar}, the Boss Hall after Chapter ${ROMAN[UNLOCKS.kerkers.ch - 1]}. Tap your avatar for your profile.`, false, 7000); }
  }
  window.claude?.hot?.snapshot?.(() => ({ S }));
  const boot = data => SPR.preload().then(() => start(data));
  if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {});
})();

// ================= ENGINE v4: Essences, hit types, speed/turn meter, bosses with phases + break =================
const K = (function () {
  // All engine randomness goes through rnd(). Arena fights swap in a seeded generator (setRng) so the server and the
  // browser play out exactly the same fight from the same seed; visual effects in app.js keep using Math.random.
  let rnd = Math.random;
  const setRng = fn => { rnd = fn || Math.random; };
  // mulberry32: small, fast, good enough for game dice; seed = 32-bit integer
  function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Essences ----------
  const ESSENCES = ['Ember', 'Verdant', 'Storm', 'Frost', 'Radiant', 'Umbral', 'Aether'];
  const BEATS = { Ember: 'Verdant', Verdant: 'Storm', Storm: 'Frost', Frost: 'Radiant', Radiant: 'Umbral', Umbral: 'Ember' };
  const HIT = {
    strong: { mult: 1.2, crit: true, debuff: 1.15, brk: 2, text: 'STRONG HIT' },
    normal: { mult: 1.0, crit: true, debuff: 1.0, brk: 1, text: 'NORMAL HIT' },
    weak: { mult: 0.75, crit: false, debuff: 0.5, brk: 0, text: 'WEAK HIT' },
  };
  function hitType(a, d) {
    if (a === 'Aether' || d === 'Aether') return 'normal';
    if (BEATS[a] === d) return 'strong';
    if (BEATS[d] === a) return 'weak';
    return 'normal';
  }
  const affMult = (a, d) => HIT[hitType(a, d)].mult;

  // index 5 (Mythical) exists for gear only (Nightmare campaign); heroes go up to Legendary
  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];
  const CRIT_CAP = 75; // crit rate never goes above this, also with buffs
  // Common and Uncommon heroes reach level 50 like Rares (5 stars) and stay a little weaker (90% / 95% stats), so a
  // well-built one is a real team member, not just food
  const RAR_MULT = [0.9, 0.95, 1, 1.12, 1.4];
  const RAR_CAP = [50, 50, 50, 60, 60];
  const ROLES = {
    Tank: { hp: 1250, atk: 72, def: 105, spd: 96, crit: 0, cdmg: 0, acc: 0, res: 15 },
    Warrior: { hp: 1050, atk: 98, def: 80, spd: 100, crit: 0, cdmg: 0, acc: 0, res: 5 },
    Assassin: { hp: 860, atk: 122, def: 56, spd: 110, crit: 10, cdmg: 20, acc: 0, res: 0 },
    Ranger: { hp: 880, atk: 114, def: 60, spd: 108, crit: 5, cdmg: 10, acc: 5, res: 0 },
    Mage: { hp: 900, atk: 116, def: 58, spd: 102, crit: 0, cdmg: 15, acc: 15, res: 5 },
    Support: { hp: 1000, atk: 80, def: 82, spd: 104, crit: 0, cdmg: 0, acc: 5, res: 10 },
    Controller: { hp: 950, atk: 90, def: 70, spd: 106, crit: 0, cdmg: 0, acc: 20, res: 5 },
  };

  const EFFECTS = {
    atkUp: { n: 'Attack Up', s: 'ATK+', buff: true, d: '+50% Attack' },
    defUp: { n: 'Defense Up', s: 'DEF+', buff: true, d: '+60% Defense' },
    spdUp: { n: 'Speed Up', s: 'SPD+', buff: true, d: '+30% Speed' },
    critUp: { n: 'Crit Rate Up', s: 'CR+', buff: true, d: '+25% Crit Rate' },
    cdmgUp: { n: 'Crit Damage Up', s: 'CD+', buff: true, d: '+30% Crit Damage' },
    shield: { n: 'Shield', s: 'SHD', buff: true, d: 'Absorbs damage before HP' },
    regen: { n: 'Regeneration', s: 'RGN', buff: true, d: 'Restores 10% HP each turn' },
    stealth: { n: 'Stealth', s: 'STL', buff: true, d: 'Cannot be targeted by single-target attacks' },
    immune: { n: 'Immunity', s: 'IMM', buff: true, d: 'Blocks new debuffs' },
    counter: { n: 'Counterattack', s: 'CTR', buff: true, d: '50% chance to strike back when hit' },
    burrow: { n: 'Burrowed', s: 'BUR', buff: true, d: 'Untargetable and immune to damage' },
    enrage: { n: 'Enrage', s: 'RGE', buff: true, d: 'The boss took too long to beat: +25% Attack per stack, one more stack every 2 of its turns' },
    blight: { n: 'Blight Aura', s: 'BLT', buff: true, d: 'Each of its turns every enemy loses part of its max HP, whatever its Defense: only healing and shields keep a team standing' },
    ironhide: { n: 'Iron Hide', s: 'IRN', buff: true, d: 'Takes 60% less damage until a Defense Down lands on it: bring a hero who lowers Defense' },
    swift: { n: 'Swift', s: 'SWF', buff: true, d: '+40% Speed until a Speed Down lands on it: bring a hero who lowers Speed' },
    atkDown: { n: 'Attack Down', s: 'ATK-', buff: false, d: '-50% Attack' },
    defDown: { n: 'Defense Down', s: 'DEF-', buff: false, d: '-60% Defense' },
    spdDown: { n: 'Speed Down', s: 'SPD-', buff: false, d: '-30% Speed' },
    burn: { n: 'Burn', s: 'BRN', buff: false, d: '4% max HP damage each turn' },
    bleed: { n: 'Bleed', s: 'BLD', buff: false, d: '4% max HP damage each turn' },
    poison: { n: 'Poison', s: 'PSN', buff: false, d: '5% max HP damage each turn' },
    freeze: { n: 'Freeze', s: 'FRZ', buff: false, d: 'Loses its turn' },
    stun: { n: 'Stun', s: 'STN', buff: false, d: 'Loses its turn' },
    silence: { n: 'Silence', s: 'SIL', buff: false, d: 'Can only use its basic attack' },
    healRed: { n: 'Heal Reduction', s: 'HRD', buff: false, d: '-60% healing received' },
    accDown: { n: 'Accuracy Down', s: 'ACC-', buff: false, d: '-30 Accuracy' },
    taunt: { n: 'Taunt', s: 'TNT', buff: false, d: 'Must attack the taunter' },
    mark: { n: 'Death Mark', s: 'MRK', buff: false, d: 'Takes 30% more damage' },
    broken: { n: 'Affinity Break', s: 'BRK', buff: false, d: 'Stunned, takes 15% more damage' },
    iceTomb: { n: 'Encased in Ice', s: 'ICE', buff: true, d: 'Takes no damage and cannot act; shatters in a Frozen Nova' },
  };
  const SKIP = ['stun', 'freeze', 'broken', 'iceTomb'];
  // Enrage (Boss Hall bosses only, u.hall): a boss that is still standing after ENRAGE.at of its own turns gets an Attack stack, and another one every
  // ENRAGE.every turns after that, so a team that cannot kill it in time is worn down. Counted per battle (phase).
  // blightAt: bosses with a Blight Aura fight longer (more HP, and a team needs time to out-heal the aura), so they enrage later
  const ENRAGE = { at: 14, blightAt: 22, every: 2, atk: 0.25 };
  // Blight Aura (Boss Hall only, campaign bosses stay as they are): Boss Hall bosses from level BLIGHT.bh on hit the whole
  // enemy team each of their turns for a share of max HP (pct per campaign difficulty) that Defense does not reduce.
  // A team without healing (heal, shield, revive) wears down before it can win, so from there a healer is needed.
  // A stunned, frozen or broken boss skips its aura, so control helps too.
  // hp / atk: a blighted boss has more HP and hits less hard itself, so the fight lasts long enough for the aura to matter
  const BLIGHT = { bh: 3, pct: [0.1, 0.11, 0.12, 0.13, 0.14], hp: 2.2, atk: 0.5 };
  const blighted = (u, d) => { if (u.isBoss) { u.blight = BLIGHT.pct[d || 0]; u.maxHp = u.hp = Math.round(u.maxHp * BLIGHT.hp); u.atk = Math.round(u.atk * BLIGHT.atk); } return u; };
  // Boss Hall walls (from level BTRAIT.from, Hard): like a RAID dungeon, each boss has a trait that only a specific tool
  // answers, and the first time that answer lands the trait breaks for the rest of the fight. Iron Hide: takes dmg × damage
  // until a Defense Down lands (a debuffer is needed). Swift: Speed ×spd until a
  // Speed Down lands (it acts 1.4× as often). The trait shows as a badge on the boss.
  const BTRAIT = { from: 5, kinds: ['ironhide', 'swift'], answer: { ironhide: 'defDown', swift: 'spdDown' }, dmg: 0.4, spd: 1.4 };
  const bossTrait = i => BTRAIT.kinds[i % BTRAIT.kinds.length];
  const DOT = { poison: 0.05, burn: 0.04, bleed: 0.04 };
  const STAT_NAMES = { hp: 'HP', atk: 'Attack', def: 'Defense', spd: 'Speed', crit: 'Crit Rate', cdmg: 'Crit Damage', acc: 'Accuracy', res: 'Resistance', hpP: 'HP', atkP: 'Attack', defP: 'Defense' };
  const PCT_STATS = ['crit', 'cdmg', 'hpP', 'atkP', 'defP'];

  // ---------- skill helpers ----------
  const D = (m, x) => Object.assign({ t: 'dmg', m }, x || {});
  const DB = (k, n, ch) => ({ t: 'debuff', k, n, ch });
  const BF = (k, n, to) => ({ t: 'buff', k, n, to });
  const HEAL = (pct, to) => ({ t: 'heal', pct, to });
  const SH = (pct, n) => ({ t: 'shield', pct, n });
  const TMF = (pct, to) => ({ t: 'tmFill', pct, to });
  const TMD = pct => ({ t: 'tmDrain', pct });
  const SK = (name, target, anim, vfx, cd, desc, fx, extra) => Object.assign({ name, target, anim, vfx, cd, desc, fx }, extra || {});

  // ---------- Heroes ----------
  const CHAMPS = {
    zarvion: { name: 'Zarvion', faction: 'Grey Flame', role: 'Tank', role2: 'Support', rar: 4, aff: 'Radiant',
      passive: 'lightbearer', passiveName: 'Lightbearer', passiveDesc: 'While Zarvion lives, all allies take 10% less damage.',
      skills: [
        SK('Dawnblade', 'enemy', 'melee', 'slash', 0, 'Strike of 100%. 50% chance of Taunt for 1 turn.', [D(1.0), DB('taunt', 1, 0.5)]),
        SK('Aegis of Dawn', 'allies', 'buff', 'shield', 4, 'All allies gain a shield of 20% of Zarvion’s max HP and Defense Up for 2 turns.', [SH(0.2, 2), BF('defUp', 2)]),
        SK('Solar Bastion', 'enemies', 'buff', 'holy', 5, '80% chance to Taunt all enemies for 2 turns. Zarvion gains Counterattack, all allies gain Immunity for 1 turn.', [DB('taunt', 2, 0.8), BF('counter', 2, 'self'), BF('immune', 1, 'allAllies')]),
      ] },
    krothar: { name: 'Krothar', faction: 'Beast Horde', role: 'Warrior', rar: 3, aff: 'Ember',
      passive: 'bloodlust', passiveName: 'Bloodlust', passiveDesc: '+30% Attack while his HP is below 50%.',
      skills: [
        SK('Axe Cleave', 'enemy', 'melee', 'smash', 0, 'Two strikes of 60%.', [D(0.6)], { hits: 2 }),
        SK('Blood Rage', 'enemy', 'melee', 'smash', 3, 'Gains Attack Up for 2 turns, then strikes for 140%.', [BF('atkUp', 2, 'self'), D(1.4)]),
        SK('Warpath', 'enemies', 'slam', 'quake', 4, 'Hits all enemies for 90%. 50% chance of Bleed for 2 turns.', [D(0.9), DB('bleed', 2, 0.5)]),
      ] },
    sylreth: { name: 'Sylreth', faction: 'Silvertongues', role: 'Assassin', role2: 'Controller', rar: 4, aff: 'Umbral',
      passive: 'shadowhunter', passiveName: 'Shadow Hunter', passiveDesc: '+25% Crit Rate against targets with a debuff.',
      skills: [
        SK('Shade Spear', 'enemy', 'melee', 'stab', 0, 'Thrust of 110%. 30% chance of Speed Down for 1 turn.', [D(1.1), DB('spdDown', 1, 0.3)]),
        SK('Veil Step', 'lowestEnemy', 'melee', 'stab', 3, 'Gains Stealth for 2 turns, then strikes the weakest enemy for 160%. +50% damage if the target is below 30% HP.', [BF('stealth', 2, 'self'), D(1.6, { execute: [0.3, 0.5] })]),
        SK('Night Sentence', 'enemy', 'melee', 'dark', 5, 'Strike of 260%. +60% damage below 35% HP. 60% chance of Silence for 2 turns.', [D(2.6, { execute: [0.35, 0.6] }), DB('silence', 2, 0.6)]),
      ] },
    valkessa: { name: 'Valkessa', faction: 'Willow Children', role: 'Ranger', rar: 2, aff: 'Storm',
      passive: 'eagleeye', passiveName: 'Eagle Eye', passiveDesc: '+15% Crit Rate. Critical hits drain 10% of the target’s Turn Meter.',
      skills: [
        SK('Twin Shot', 'enemy', 'ranged', 'arrow', 0, 'Two arrows of 55%.', [D(0.55)], { hits: 2 }),
        SK('Arrow Rain', 'enemies', 'ranged', 'arrowrain', 3, 'Hits all enemies for 60%. 40% chance of Attack Down for 2 turns.', [D(0.6), DB('atkDown', 2, 0.4)]),
        SK('Storm Volley', 'random', 'ranged', 'arrow', 4, 'Five arrows of 50% on random enemies.', [D(0.5)], { hits: 5 }),
      ] },
    draelyn: { name: 'Draelyn', faction: 'Grey Flame', role: 'Support', rar: 1, aff: 'Verdant',
      passive: 'steadfast', passiveName: 'Steadfast', passiveDesc: '+50% Defense while her HP is below 50%.',
      skills: [
        SK('Thorned Bash', 'enemy', 'melee', 'slash', 0, 'Strike of 90%.', [D(0.9)]),
        SK('Verdant Aegis', 'allies', 'buff', 'shield', 3, 'All allies gain a shield of 15% of Draelyn’s max HP for 2 turns and are cleansed.', [SH(0.15, 2), { t: 'cleanse' }]),
        SK('Rally', 'allies', 'buff', 'heal', 4, 'Heals all allies for 20% and grants Attack Up for 2 turns.', [HEAL(0.2), BF('atkUp', 2)]),
      ] },
    // the four orcs: Uncommon heroes (starter choice and Fate Altar) who also fight as enemies in Chapters II and IV
    // (same id as their enemy entry; a captured one joins as this hero)
    grimtar: { name: 'Grimtar', faction: 'Beast Horde', role: 'Mage', role2: 'Controller', rar: 1, aff: 'Verdant',
      passive: 'toxicpresence', passiveName: 'Restless Spirits', passiveDesc: 'At the end of each of his turns, every enemy has a 15% chance to be Poisoned.',
      skills: [
        SK('Spirit Bolt', 'enemy', 'magic', 'poison', 0, 'Attack of 100%. 30% chance of Poison for 2 turns.', [D(1.0), DB('poison', 2, 0.3)]),
        SK('Wailing Spirits', 'enemies', 'magic', 'curse', 3, 'Hits all enemies for 55%. 40% chance of Heal Reduction for 2 turns.', [D(0.55), DB('healRed', 2, 0.4)]),
        SK('Ancestral Hex', 'enemy', 'magic', 'curse', 4, 'Attack of 160%. 60% chance of Defense Down for 2 turns.', [D(1.6), DB('defDown', 2, 0.6)]),
      ] },
    krogash: { name: 'Krogash', faction: 'Beast Horde', role: 'Mage', rar: 1, aff: 'Ember',
      passive: 'kindling', passiveName: 'Ashen Fury', passiveDesc: 'Burn applied by Krogash deals 50% more damage.',
      skills: [
        SK('Ashen Bolt', 'enemy', 'magic', 'fire', 0, 'Attack of 100%. 30% chance of Burn for 2 turns.', [D(1.0), DB('burn', 2, 0.3)]),
        SK('Ash Storm', 'enemies', 'magic', 'meteor', 3, 'Hits all enemies for 60%. 40% chance of Burn and 40% chance of Speed Down, each for 2 turns.', [D(0.6), DB('burn', 2, 0.4), DB('spdDown', 2, 0.4)]),
        SK('Pyre of the Warlord', 'enemy', 'magic', 'fire', 4, 'Attack of 180%. 60% chance of Burn for 2 turns.', [D(1.8), DB('burn', 2, 0.6)]),
      ] },
    zulgroth: { name: 'Zulgroth', faction: 'Beast Horde', role: 'Support', rar: 1, aff: 'Umbral',
      passive: 'beacon', passiveName: 'Void Mending', passiveDesc: 'Heals the weakest ally for 5% at the start of each of his turns.',
      skills: [
        SK('Void Orb', 'enemy', 'magic', 'dark', 0, 'Attack of 90%. 30% chance of Speed Down for 1 turn.', [D(0.9), DB('spdDown', 1, 0.3)]),
        SK('Void Pact', 'allies', 'buff', 'heal', 3, 'Heals all allies for 15% and grants Attack Up for 2 turns.', [HEAL(0.15), BF('atkUp', 2)]),
        SK('Shadow Ward', 'allies', 'buff', 'shield', 4, 'All allies gain a shield of 15% of Zulgroth’s max HP for 2 turns and are cleansed.', [SH(0.15, 2), { t: 'cleanse' }]),
      ] },
    bloodsnarl: { name: 'Bloodsnarl', faction: 'Beast Horde', role: 'Ranger', rar: 1, aff: 'Ember',
      passive: 'scavenger', passiveName: 'Pack Hunter', passiveDesc: '+20% damage against targets below 50% HP.',
      skills: [
        SK('Blood Arrow', 'enemy', 'ranged', 'arrow', 0, 'Attack of 100%. 30% chance of Bleed for 2 turns.', [D(1.0), DB('bleed', 2, 0.3)]),
        SK('Loose the Wolf', 'lowestEnemy', 'melee', 'bite', 3, 'His wolf mauls the weakest enemy for 140%. 50% chance of Bleed for 2 turns.', [D(1.4), DB('bleed', 2, 0.5)]),
        SK('Volley of Fangs', 'random', 'ranged', 'arrow', 4, 'Four arrows of 50% on random enemies. Each has a 25% chance of Bleed for 2 turns.', [D(0.5), DB('bleed', 2, 0.25)], { hits: 4 }),
      ] },
    ithyra: { name: 'Ithyra', faction: 'Mistspawn', role: 'Mage', role2: 'Controller', rar: 3, aff: 'Frost',
      passive: 'frostbite', passiveName: 'Frostbite', passiveDesc: '+30% damage against Frozen or slowed targets.',
      skills: [
        SK('Ice Bolt', 'enemy', 'magic', 'water', 0, 'Attack of 100%. 30% chance of Speed Down for 1 turn.', [D(1.0), DB('spdDown', 1, 0.3)]),
        SK('Deep Freeze', 'enemy', 'magic', 'water', 3, 'Attack of 80%. 60% chance to Freeze for 1 turn.', [D(0.8), DB('freeze', 1, 0.6)]),
        SK('Blizzard', 'enemies', 'magic', 'water', 5, 'Hits all enemies for 70%. 30% chance to Freeze and 50% chance of Speed Down for 2 turns.', [D(0.7), DB('freeze', 1, 0.3), DB('spdDown', 2, 0.5)]),
      ] },
    thalnir: { name: 'Thalnir', faction: 'Ashborn', role: 'Tank', role2: 'Warrior', rar: 3, aff: 'Verdant',
      passive: 'deeproots', passiveName: 'Deep Roots', passiveDesc: 'Restores 5% of his max HP at the start of each of his turns.',
      skills: [
        SK('Venom Blade', 'enemy', 'melee', 'stab', 0, 'Stab of 100%. 50% chance of Poison for 2 turns.', [D(1.0), DB('poison', 2, 0.5)]),
        SK('Ironbark', 'enemies', 'buff', 'shield', 4, '70% chance to Taunt all enemies for 2 turns. Gains Defense Up and Counterattack for 2 turns.', [DB('taunt', 2, 0.7), BF('defUp', 2, 'self'), BF('counter', 2, 'self')]),
        SK('Green Plague', 'enemies', 'magic', 'poison', 4, 'Hits all enemies for 80%. 70% chance of Poison for 2 turns.', [D(0.8), DB('poison', 2, 0.7)]),
      ] },
    nyressa: { name: 'Nyressa', faction: 'Hellwardens', role: 'Mage', role2: 'Controller', rar: 2, aff: 'Ember',
      passive: 'kindling', passiveName: 'Kindling', passiveDesc: 'Burn applied by Nyressa deals 50% more damage.',
      skills: [
        SK('Embers', 'enemy', 'magic', 'fire', 0, 'Attack of 90%. 50% chance of Burn for 2 turns.', [D(0.9), DB('burn', 2, 0.5)]),
        SK('Searing Hex', 'enemy', 'magic', 'curse', 3, 'Attack of 80%. 70% chance of Defense Down and Heal Reduction for 2 turns.', [D(0.8), DB('defDown', 2, 0.7), DB('healRed', 2, 0.7)]),
        SK('Sea of Flames', 'enemies', 'magic', 'meteor', 4, 'Hits all enemies for 80%. 60% chance of Burn for 2 turns.', [D(0.8), DB('burn', 2, 0.6)]),
      ] },
    vaessa: { name: 'Vaessa', faction: 'Ashborn', role: 'Controller', role2: 'Support', rar: 1, aff: 'Umbral',
      passive: 'undying', passiveName: 'Undying Blood', passiveDesc: 'Returns once per battle with 30% HP.',
      skills: [
        SK('Blood Drain', 'enemy', 'magic', 'blood', 0, 'Attack of 100%. Heals self for 30% of the damage.', [D(1.0, { steal: 0.3 })]),
        SK('Night Veil', 'enemies', 'magic', 'dark', 3, 'Hits all enemies for 50%. 80% chance of Defense Down for 2 turns.', [D(0.5), DB('defDown', 2, 0.8)]),
        SK('Dark Hymn', 'allies', 'buff', 'heal', 4, 'Heals all allies for 15% and fills their Turn Meter by 20%.', [HEAL(0.15), TMF(0.2)]),
      ] },
    grythor: { name: 'Grythor', faction: 'Beast Horde', role: 'Warrior', rar: 1, aff: 'Ember',
      passive: 'thickhide', passiveName: 'Thick Scales', passiveDesc: 'Takes 10% less damage.',
      skills: [
        SK('Scale Strike', 'enemy', 'melee', 'claw', 0, 'Strike of 105%.', [D(1.05)]),
        SK('Fire Breath', 'enemies', 'magic', 'fire', 3, 'Hits all enemies for 70%. 40% chance of Burn for 2 turns.', [D(0.7), DB('burn', 2, 0.4)]),
        SK('Rending Bite', 'enemy', 'melee', 'bite', 4, 'Attack of 160%. Bleed for 2 turns.', [D(1.6), DB('bleed', 2, 1)]),
      ] },
    selenia: { name: 'Selenia', faction: 'Grey Flame', role: 'Support', rar: 2, aff: 'Radiant',
      passive: 'beacon', passiveName: 'Beacon', passiveDesc: 'Heals the weakest ally for 5% at the start of each of her turns.',
      skills: [
        SK('Lance of Light', 'enemy', 'melee', 'stab', 0, 'Thrust of 100%. 30% chance of Accuracy Down for 2 turns.', [D(1.0), DB('accDown', 2, 0.3)]),
        SK('Holy Light', 'allies', 'buff', 'heal', 3, 'Heals all allies for 22%.', [HEAL(0.22)]),
        SK('Radiant Oath', 'allies', 'buff', 'holy', 5, 'Cleanses all allies, grants Immunity for 1 turn and Crit Rate Up for 2 turns.', [{ t: 'cleanse' }, BF('immune', 1), BF('critUp', 2)]),
      ] },
    brukkar: { name: 'Brukkar', faction: 'Beast Horde', role: 'Warrior', role2: 'Tank', rar: 1, aff: 'Ember',
      passive: 'bloodfrenzy', passiveName: 'Blood Frenzy', passiveDesc: '+10% Attack for every enemy he defeats (max. 3 times).',
      skills: [
        SK('Horn Charge', 'enemy', 'melee', 'smash', 0, 'Heavy strike of 110%.', [D(1.1)]),
        SK('Crush', 'enemies', 'slam', 'quake', 3, 'Hits all enemies for 80%. 40% chance of Defense Down for 2 turns.', [D(0.8), DB('defDown', 2, 0.4)]),
        SK('Unstoppable', 'enemy', 'melee', 'smash', 4, 'Gains Defense Up and Counterattack for 2 turns, then strikes for 130%.', [BF('defUp', 2, 'self'), BF('counter', 2, 'self'), D(1.3)]),
      ] },
    aurelion: { name: 'Aurelion', faction: 'Grey Flame', role: 'Tank', role2: 'Support', rar: 4, aff: 'Radiant',
      passive: 'divineward', passiveName: 'Divine Ward', passiveDesc: 'At the start of battle, all allies gain a shield of 12% of Aurelion’s max HP for 3 turns.',
      skills: [
        SK('Sun Strike', 'enemy', 'magic', 'holy', 0, 'Attack of 90%. Heals the weakest ally for 8%.', [D(0.9), HEAL(0.08, 'lowestAlly')]),
        SK('Halo of Light', 'allies', 'buff', 'heal', 3, 'Heals all allies for 25% and removes all debuffs.', [HEAL(0.25), { t: 'cleanse' }]),
        SK('Resurrection', 'deadAlly', 'buff', 'revive', 5, 'Revives a fallen ally with 50% HP.', [{ t: 'revive', pct: 0.5 }]),
      ] },
    zyrael: { name: 'Zyrael', faction: 'Silvertongues', role: 'Assassin', rar: 3, aff: 'Umbral',
      passive: 'killingspree', passiveName: 'Killing Spree', passiveDesc: 'Fills her Turn Meter by 50% whenever she defeats an enemy.',
      skills: [
        SK('Twin Blades', 'enemy', 'melee', 'slash', 0, 'Two strikes of 60%.', [D(0.6)], { hits: 2 }),
        SK('Deadly Dance', 'random', 'melee', 'slash', 3, 'Three strikes of 60% on random enemies.', [D(0.6)], { hits: 3 }),
        SK('Execution', 'lowestEnemy', 'melee', 'dark', 4, 'Strikes the weakest enemy for 240%. +80% damage below 40% HP.', [D(2.4, { execute: [0.4, 0.8] })]),
      ] },
    drakulen: { name: 'Drakulen', faction: 'Hellwardens', role: 'Warrior', role2: 'Tank', rar: 3, aff: 'Umbral',
      passive: 'dragonblood', passiveName: 'Dragon Blood', passiveDesc: '+20% Crit Rate and +20% Crit Damage.',
      skills: [
        SK('Dragon Claw', 'enemy', 'melee', 'claw', 0, 'Claw of 110%. Heals self for 25% of the damage.', [D(1.1, { steal: 0.25 })]),
        SK('Green Fire', 'enemies', 'magic', 'poison', 3, 'Hits all enemies for 90% and heals for 20% of the damage. 40% chance of Defense Down for 2 turns.', [D(0.9, { steal: 0.2 }), DB('defDown', 2, 0.4)]),
        SK('Devastation', 'enemy', 'melee', 'dark', 5, 'Attack of 240% and Heal Reduction for 2 turns.', [D(2.4), DB('healRed', 2, 1)]),
      ] },
    keldrax: { name: 'Keldrax', faction: 'Mistspawn', role: 'Warrior', role2: 'Controller', rar: 2, aff: 'Frost',
      passive: 'glacial', passiveName: 'Glacial Hide', passiveDesc: 'Attackers have a 20% chance to receive Speed Down.',
      skills: [
        SK('Frost Fist', 'enemy', 'melee', 'smash', 0, 'Strike of 100%. 40% chance of Speed Down for 1 turn.', [D(1.0), DB('spdDown', 1, 0.4)]),
        SK('Ice Armor', 'allies', 'buff', 'shield', 4, 'All allies gain a shield of 15% of his max HP for 2 turns.', [SH(0.15, 2)]),
        SK('Polar Storm', 'enemies', 'slam', 'quake', 4, 'Hits all enemies for 70%. 35% chance to Freeze for 1 turn.', [D(0.7), DB('freeze', 1, 0.35)]),
      ] },
    faedrin: { name: 'Faedrin', faction: 'Willow Children', role: 'Support', role2: 'Controller', rar: 2, aff: 'Verdant',
      passive: 'bloom', passiveName: 'Bloom', passiveDesc: 'Her heals are 20% stronger.',
      skills: [
        SK('Thorn Vine', 'enemy', 'magic', 'thorns', 0, 'Attack of 90%. 30% chance of Attack Down for 1 turn.', [D(0.9), DB('atkDown', 1, 0.3)]),
        SK('Forest Blessing', 'allies', 'buff', 'heal', 3, 'Heals all allies for 20% and grants Regeneration for 2 turns.', [HEAL(0.2), BF('regen', 2)]),
        SK('Entangle', 'enemies', 'magic', 'thorns', 4, 'Hits all enemies for 50%. 60% chance of Speed Down for 2 turns and drains 20% Turn Meter.', [D(0.5), DB('spdDown', 2, 0.6), TMD(0.2)]),
      ] },
    skavren: { name: 'Skavren', faction: 'Silvertongues', role: 'Assassin', rar: 1, aff: 'Storm',
      passive: 'scavenger', passiveName: 'Scavenger', passiveDesc: '+20% damage against targets below 50% HP.',
      skills: [
        SK('Rust Knife', 'enemy', 'melee', 'stab', 0, 'Stab of 100%. 40% chance of Bleed for 2 turns.', [D(1.0), DB('bleed', 2, 0.4)]),
        SK('Rat Trick', 'lowestEnemy', 'melee', 'claw', 3, 'Gains Stealth for 2 turns and strikes the weakest enemy for 130%.', [BF('stealth', 2, 'self'), D(1.3)]),
        SK('Throat Cut', 'lowestEnemy', 'melee', 'stab', 4, 'Strikes the weakest enemy for 200%. +60% damage below 35% HP.', [D(2.0, { execute: [0.35, 0.6] })]),
      ] },
    velmira: { name: 'Velmira', faction: 'Hellwardens', role: 'Mage', role2: 'Controller', rar: 4, aff: 'Ember',
      passive: 'crimsonwings', passiveName: 'Crimson Wings', passiveDesc: '+15 Speed.',
      skills: [
        SK('Blood Sword', 'enemy', 'melee', 'slash', 0, 'Strike of 115%.', [D(1.15)]),
        SK('Wing Storm', 'enemies', 'magic', 'blood', 3, 'Hits all enemies for 80%. 50% chance of Burn for 2 turns.', [D(0.8), DB('burn', 2, 0.5)]),
        SK('Blood Sacrifice', 'enemy', 'melee', 'blood', 5, 'Attack of 220% that heals self for 40% of the damage. 50% chance to Stun for 1 turn.', [D(2.2, { steal: 0.4 }), DB('stun', 1, 0.5)]),
      ] },
    oraneth: { name: 'Oraneth', faction: 'Ashborn', role: 'Mage', rar: 2, aff: 'Storm',
      passive: 'overcharge', passiveName: 'Overcharge', passiveDesc: '+30% Crit Damage.',
      skills: [
        SK('Storm Staff', 'enemy', 'magic', 'rune', 0, 'Attack of 100%.', [D(1.0)]),
        SK('Chain Lightning', 'random', 'magic', 'rune', 3, 'Four bolts of 50% on random enemies.', [D(0.5)], { hits: 4 }),
        SK('Thunder Decree', 'enemies', 'magic', 'meteor', 5, 'Hits all enemies for 100% and drains 15% Turn Meter.', [D(1.0), TMD(0.15)]),
      ] },
    nithara: { name: 'Nithara', faction: 'Hellwardens', role: 'Mage', role2: 'Controller', rar: 3, aff: 'Umbral',
      passive: 'seduction', passiveName: 'Seduction', passiveDesc: '+15% chance for her debuffs to land.',
      skills: [
        SK('Hex Gaze', 'enemy', 'magic', 'curse', 0, 'Attack of 90%. 35% chance of Attack Down for 1 turn.', [D(0.9), DB('atkDown', 1, 0.35)]),
        SK('Enchantment', 'enemy', 'magic', 'curse', 3, 'Attack of 60%. 60% chance to Stun for 1 turn.', [D(0.6), DB('stun', 1, 0.6)]),
        SK('Mass Silence', 'enemies', 'magic', 'dark', 5, 'Hits all enemies for 60%. 60% chance of Silence for 2 turns.', [D(0.6), DB('silence', 2, 0.6)]),
      ] },
    bromir: { name: 'Bromir', faction: 'Beast Horde', role: 'Tank', role2: 'Warrior', rar: 1, aff: 'Frost',
      passive: 'thickhide', passiveName: 'Thick Fur', passiveDesc: 'Takes 10% less damage.',
      skills: [
        SK('Bear Claw', 'enemy', 'melee', 'claw', 0, 'Strike of 95%.', [D(0.95)]),
        SK('Growl', 'enemies', 'buff', 'dark', 4, '70% chance to Taunt all enemies for 2 turns. Gains Defense Up for 2 turns.', [DB('taunt', 2, 0.7), BF('defUp', 2, 'self')]),
        SK('Mauling Strike', 'enemy', 'melee', 'claw', 3, 'Strike of 140% and Speed Down for 2 turns.', [D(1.4), DB('spdDown', 2, 1)]),
      ] },
    morgrim: { name: 'Morgrim', faction: 'Hellwardens', role: 'Mage', rar: 2, aff: 'Ember',
      passive: 'hellbrand', passiveName: 'Hellbrand', passiveDesc: '+50% damage against enemies with a debuff.',
      skills: [
        SK('Hellfire', 'enemy', 'magic', 'fire', 0, 'Fireball of 115%.', [D(1.15)]),
        SK('Meteor', 'enemies', 'magic', 'meteor', 4, 'Hits all enemies for 90%. 50% chance of Heal Reduction and 35% chance of Speed Down, each for 2 turns.', [D(0.9), DB('healRed', 2, 0.5), DB('spdDown', 2, 0.35)]),
        SK('Brand of Ruin', 'enemy', 'magic', 'fire', 3, 'Attack of 130%. 70% chance of Burn for 2 turns.', [D(1.3), DB('burn', 2, 0.7)], { startCd: 1 }),
      ] },
    vorlund: { name: 'Vorlund', faction: 'Grey Flame', role: 'Tank', rar: 1, aff: 'Radiant',
      passive: 'retribution', passiveName: 'Retribution', passiveDesc: '30% chance to counterattack when hit.',
      skills: [
        SK('Lance Thrust', 'enemy', 'melee', 'stab', 0, 'Thrust of 100%. 50% chance of Taunt for 1 turn.', [D(1.0), DB('taunt', 1, 0.5)]),
        SK('Golden Bulwark', 'allies', 'buff', 'shield', 4, 'All allies gain Defense Up for 2 turns and a shield of 12% of his max HP.', [BF('defUp', 2), SH(0.12, 2)]),
        SK('Radiant Judgment', 'enemy', 'melee', 'stab', 3, 'Strike of 130%. 60% chance of Attack Down and 50% chance of Defense Down, each for 2 turns.', [D(1.3), DB('atkDown', 2, 0.6), DB('defDown', 2, 0.5)], { startCd: 1 }),
      ] },
    karnok: { name: 'Karnok', faction: 'Ironbeard Clans', role: 'Warrior', rar: 1, aff: 'Storm',
      skills: [
        SK('Hammer Blow', 'enemy', 'melee', 'smash', 0, 'Strike of 95%. 20% chance to Stun for 1 turn.', [D(0.95), DB('stun', 1, 0.2)]),
        SK('Anvil Wall', 'allies', 'buff', 'shield', 3, 'All allies gain Defense Up for 2 turns.', [BF('defUp', 2)]),
        SK('Thunderclap', 'enemies', 'slam', 'quake', 4, 'Hits all enemies for 70%. 25% chance to Stun for 1 turn, 40% chance of Defense Down for 2 turns.', [D(0.7), DB('stun', 1, 0.25), DB('defDown', 2, 0.4)], { startCd: 1 }),
      ] },
    // ----- heroes 26-50 (Fate Altar only) -----
    kaelira: { name: 'Kaelira', faction: 'Grey Flame', role: 'Mage', role2: 'Support', rar: 3, aff: 'Radiant',
      passive: 'bloom', passiveName: 'Dawn Grace', passiveDesc: 'Her heals are 20% stronger.',
      skills: [
        SK('Sunbolt', 'enemy', 'magic', 'holy', 0, 'Attack of 100%. 30% chance of Accuracy Down for 2 turns.', [D(1.0), DB('accDown', 2, 0.3)]),
        SK('Radiant Hymn', 'allies', 'buff', 'heal', 3, 'Heals all allies for 20% and grants Crit Rate Up for 2 turns.', [HEAL(0.2), BF('critUp', 2)]),
        SK('Solar Flare', 'enemies', 'magic', 'sunfall', 4, 'Hits all enemies for 85%. 50% chance of Accuracy Down and 40% chance of Speed Down, each for 2 turns.', [D(0.85), DB('accDown', 2, 0.5), DB('spdDown', 2, 0.4)]),
      ] },
    vorak: { name: 'Vorak', faction: 'Beast Horde', role: 'Tank', rar: 3, aff: 'Ember',
      passive: 'retribution', passiveName: 'Hellforged Hide', passiveDesc: '30% chance to counterattack when hit.',
      skills: [
        SK('Brutal Chop', 'enemy', 'melee', 'smash', 0, 'Strike of 100%. 50% chance of Taunt for 1 turn.', [D(1.0), DB('taunt', 1, 0.5)]),
        SK('War Bellow', 'enemies', 'buff', 'fire', 4, '75% chance to Taunt all enemies for 2 turns. Gains Defense Up and Counterattack for 2 turns.', [DB('taunt', 2, 0.75), BF('defUp', 2, 'self'), BF('counter', 2, 'self')]),
        SK('Magma Cleave', 'enemies', 'slam', 'quake', 4, 'Hits all enemies for 80%. 50% chance of Burn for 2 turns.', [D(0.8), DB('burn', 2, 0.5)]),
      ] },
    elyndra: { name: 'Elyndra', faction: 'Willow Children', role: 'Ranger', rar: 2, aff: 'Verdant',
      passive: 'scavenger', passiveName: 'Hunter’s Instinct', passiveDesc: '+20% damage against targets below 50% HP.',
      skills: [
        SK('Thorn Arrow', 'enemy', 'ranged', 'arrow', 0, 'Arrow of 100%. 40% chance of Poison for 2 turns.', [D(1.0), DB('poison', 2, 0.4)]),
        SK('Barbed Volley', 'enemies', 'ranged', 'arrowrain', 3, 'Hits all enemies for 60%. 40% chance of Poison and 35% chance of Defense Down, each for 2 turns.', [D(0.6), DB('poison', 2, 0.4), DB('defDown', 2, 0.35)]),
        SK('Heartseeker', 'lowestEnemy', 'ranged', 'arrow', 4, 'Shoots the weakest enemy for 200%. +50% damage below 35% HP.', [D(2.0, { execute: [0.35, 0.5] })]),
      ] },
    morveth: { name: 'Morveth', faction: 'Silvertongues', role: 'Assassin', role2: 'Mage', rar: 4, aff: 'Umbral',
      passive: 'soulharvest', passiveName: 'Soul Reaper', passiveDesc: '+10% Attack for every unit that has fallen in this battle (max. 5).',
      skills: [
        SK('Void Scythe', 'enemy', 'melee', 'slash', 0, 'Two strikes of 60%. 30% chance of Bleed for 2 turns.', [D(0.6), DB('bleed', 2, 0.3)], { hits: 2 }),
        SK('Umbral Rift', 'enemies', 'magic', 'dark', 3, 'Hits all enemies for 80%. 60% chance of Defense Down for 2 turns.', [D(0.8), DB('defDown', 2, 0.6)]),
        SK('Eclipse Reap', 'lowestEnemy', 'melee', 'dark', 4, 'Gains Stealth for 1 turn, then strikes the weakest enemy for 280%. +70% damage below 40% HP.', [BF('stealth', 1, 'self'), D(2.8, { execute: [0.4, 0.7] })]),
      ] },
    theryn: { name: 'Theryn', faction: 'Mistspawn', role: 'Support', rar: 2, aff: 'Frost',
      passive: 'beacon', passiveName: 'Frost Blessing', passiveDesc: 'Heals the weakest ally for 5% at the start of each of her turns.',
      skills: [
        SK('Frost Shard', 'enemy', 'magic', 'water', 0, 'Attack of 90%. 30% chance of Speed Down for 1 turn.', [D(0.9), DB('spdDown', 1, 0.3)]),
        SK('Glacial Ward', 'allies', 'buff', 'shield', 3, 'All allies gain a shield of 15% of Theryn’s max HP for 2 turns and are cleansed.', [SH(0.15, 2), { t: 'cleanse' }]),
        SK('Winter’s Mercy', 'allies', 'buff', 'heal', 4, 'Heals all allies for 20% and grants Regeneration for 2 turns.', [HEAL(0.2), BF('regen', 2)]),
      ] },
    arkanis: { name: 'Arkanis', faction: 'Ashborn', role: 'Controller', rar: 3, aff: 'Storm',
      passive: 'staticcharge', passiveName: 'Static Charge', passiveDesc: 'Every fourth hit he lands deals 50% more damage.',
      skills: [
        SK('Arc Bolt', 'enemy', 'magic', 'rune', 0, 'Attack of 95%. 20% chance to Stun for 1 turn.', [D(0.95), DB('stun', 1, 0.2)]),
        SK('Chain Storm', 'random', 'magic', 'rune', 3, 'Four bolts of 45% on random enemies.', [D(0.45)], { hits: 4 }),
        SK('Tempest Lock', 'enemies', 'magic', 'meteor', 5, 'Hits all enemies for 70%, drains 20% Turn Meter and has a 40% chance to Stun for 1 turn.', [D(0.7), TMD(0.2), DB('stun', 1, 0.4)]),
      ] },
    liora: { name: 'Liora', faction: 'Grey Flame', role: 'Support', role2: 'Mage', rar: 4, aff: 'Aether',
      passive: 'harmony', passiveName: 'Aether Harmony', passiveDesc: 'Heals all allies for 4% at the start of each of her turns.',
      skills: [
        SK('Prism Orb', 'enemy', 'magic', 'holy', 0, 'Attack of 100%. Heals the weakest ally for 10%.', [D(1.0), HEAL(0.1, 'lowestAlly')]),
        SK('Starlight Veil', 'allies', 'buff', 'shield', 4, 'All allies gain a shield of 18% of Liora’s max HP for 2 turns and Immunity for 1 turn.', [SH(0.18, 2), BF('immune', 1)]),
        SK('Aether Nova', 'allies', 'buff', 'heal', 5, 'Heals all allies for 30%, removes all debuffs and fills their Turn Meter by 20%.', [HEAL(0.3), { t: 'cleanse' }, TMF(0.2)]),
      ] },
    gorvann: { name: 'Gorvann', faction: 'Beast Horde', role: 'Warrior', rar: 2, aff: 'Ember',
      passive: 'bloodlust', passiveName: 'Rage of the Pit', passiveDesc: '+30% Attack while his HP is below 50%.',
      skills: [
        SK('Flame Axe', 'enemy', 'melee', 'smash', 0, 'Strike of 105%. 30% chance of Burn for 2 turns.', [D(1.05), DB('burn', 2, 0.3)]),
        SK('Molten Swing', 'enemies', 'slam', 'fire', 3, 'Hits all enemies for 70%. 40% chance of Burn for 2 turns.', [D(0.7), DB('burn', 2, 0.4)]),
        SK('Pit Fury', 'enemy', 'melee', 'smash', 4, 'Gains Attack Up for 2 turns, then strikes for 150%.', [BF('atkUp', 2, 'self'), D(1.5)]),
      ] },
    sylvara: { name: 'Sylvara', faction: 'Willow Children', role: 'Mage', role2: 'Controller', rar: 3, aff: 'Verdant',
      passive: 'toxicpresence', passiveName: 'Spore Bloom', passiveDesc: 'At the end of each of her turns, every enemy has a 15% chance to be Poisoned.',
      skills: [
        SK('Wild Orb', 'enemy', 'magic', 'thorns', 0, 'Attack of 95%. 40% chance of Poison for 2 turns.', [D(0.95), DB('poison', 2, 0.4)]),
        SK('Strangling Roots', 'enemies', 'magic', 'thorns', 3, 'Hits all enemies for 60%, drains 15% Turn Meter. 50% chance of Speed Down for 2 turns.', [D(0.6), TMD(0.15), DB('spdDown', 2, 0.5)]),
        SK('Nature’s Wrath', 'enemies', 'magic', 'poison', 5, 'Hits all enemies for 90%. 60% chance of Poison for 3 turns.', [D(0.9), DB('poison', 3, 0.6)]),
      ] },
    veyrith: { name: 'Veyrith', faction: 'Hellwardens', role: 'Tank', role2: 'Controller', rar: 3, aff: 'Umbral',
      passive: 'scalearmor', passiveName: 'Shadowplate', passiveDesc: 'Takes 25% less damage from melee attacks.',
      skills: [
        SK('Night Edge', 'enemy', 'melee', 'slash', 0, 'Strike of 100%. 50% chance of Taunt for 1 turn.', [D(1.0), DB('taunt', 1, 0.5)]),
        SK('Dread Aura', 'enemies', 'magic', 'dark', 3, 'Hits all enemies for 50%. 60% chance of Attack Down for 2 turns.', [D(0.5), DB('atkDown', 2, 0.6)]),
        SK('Umbral Aegis', 'enemies', 'buff', 'dark', 4, '70% chance to Taunt all enemies for 2 turns. All allies gain Defense Up for 2 turns.', [DB('taunt', 2, 0.7), BF('defUp', 2, 'allAllies')]),
      ] },
    astraea: { name: 'Astraea', faction: 'Grey Flame', role: 'Ranger', role2: 'Support', rar: 4, aff: 'Radiant',
      passive: 'eagleeye', passiveName: 'Seraph’s Eye', passiveDesc: '+15% Crit Rate. Critical hits drain 10% of the target’s Turn Meter.',
      skills: [
        SK('Sunlit Arrow', 'enemy', 'ranged', 'arrow', 0, 'Arrow of 110%. Heals the weakest ally for 6%.', [D(1.1), HEAL(0.06, 'lowestAlly')]),
        SK('Wings of Dawn', 'allies', 'buff', 'holy', 4, 'All allies gain Attack Up and Speed Up for 2 turns.', [BF('atkUp', 2), BF('spdUp', 2)]),
        SK('Heaven’s Barrage', 'random', 'ranged', 'arrowrain', 4, 'Five arrows of 50% on random enemies.', [D(0.5)], { hits: 5 }),
      ] },
    korran: { name: 'Korran', faction: 'Mistspawn', role: 'Warrior', rar: 2, aff: 'Frost',
      passive: 'frostbite', passiveName: 'Winter’s Bite', passiveDesc: '+30% damage against Frozen or slowed targets.',
      skills: [
        SK('Glacier Axe', 'enemy', 'melee', 'smash', 0, 'Strike of 100%. 40% chance of Speed Down for 1 turn.', [D(1.0), DB('spdDown', 1, 0.4)]),
        SK('Frost Cleave', 'enemies', 'slam', 'quake', 3, 'Hits all enemies for 70%. 25% chance to Freeze for 1 turn.', [D(0.7), DB('freeze', 1, 0.25)]),
        SK('Shatter', 'enemy', 'melee', 'smash', 4, 'Heavy strike of 170%. 60% chance of Defense Down for 2 turns.', [D(1.7), DB('defDown', 2, 0.6)]),
      ] },
    zephara: { name: 'Zephara', faction: 'Silvertongues', role: 'Assassin', rar: 3, aff: 'Storm',
      passive: 'crimsonwings', passiveName: 'Tailwind', passiveDesc: '+15 Speed.',
      skills: [
        SK('Lightning Claws', 'enemy', 'melee', 'slash', 0, 'Two strikes of 55%.', [D(0.55)], { hits: 2 }),
        SK('Storm Dash', 'lowestEnemy', 'melee', 'stab', 3, 'Gains Stealth for 2 turns and strikes the weakest enemy for 150%.', [BF('stealth', 2, 'self'), D(1.5)]),
        SK('Thunderstrike', 'enemy', 'melee', 'rune', 4, 'Strike of 220%. 40% chance to Stun for 1 turn, 50% chance of Defense Down for 2 turns.', [D(2.2), DB('stun', 1, 0.4), DB('defDown', 2, 0.5)]),
      ] },
    malreth: { name: 'Malreth', faction: 'Hellwardens', role: 'Mage', rar: 3, aff: 'Umbral',
      passive: 'deathmark', passiveName: 'Grave Mark', passiveDesc: 'Every second turn he places a Death Mark on a random enemy for 2 turns.',
      skills: [
        SK('Soul Bolt', 'enemy', 'magic', 'dark', 0, 'Attack of 110%.', [D(1.1)]),
        SK('Skull Swarm', 'random', 'magic', 'curse', 3, 'Four skulls of 45% on random enemies.', [D(0.45)], { hits: 4 }),
        SK('Necrotic Blast', 'enemies', 'magic', 'dark', 5, 'Hits all enemies for 90% and heals for 20% of the damage. 60% chance of Heal Reduction for 2 turns.', [D(0.9, { steal: 0.2 }), DB('healRed', 2, 0.6)]),
      ] },
    eryndor: { name: 'Eryndor', faction: 'Willow Children', role: 'Tank', rar: 4, aff: 'Verdant',
      passive: 'ancientroots', passiveName: 'Ancient Roots', passiveDesc: 'Attackers have a 20% chance to be Rooted (Speed Down for 2 turns).',
      skills: [
        SK('Oakfist', 'enemy', 'melee', 'smash', 0, 'Strike of 100%. 50% chance of Taunt for 1 turn.', [D(1.0), DB('taunt', 1, 0.5)]),
        SK('Bark Fortress', 'allies', 'buff', 'shield', 4, 'All allies gain a shield of 20% of Eryndor’s max HP and Defense Up for 2 turns.', [SH(0.2, 2), BF('defUp', 2)]),
        SK('World Tree', 'enemies', 'buff', 'thorns', 5, '80% chance to Taunt all enemies for 2 turns. Eryndor gains Counterattack, all allies gain Regeneration for 2 turns.', [DB('taunt', 2, 0.8), BF('counter', 2, 'self'), BF('regen', 2, 'allAllies')]),
      ] },
    ignara: { name: 'Ignara', faction: 'Hellwardens', role: 'Mage', rar: 3, aff: 'Ember',
      passive: 'kindling', passiveName: 'Wildfire', passiveDesc: 'Burn applied by Ignara deals 50% more damage.',
      skills: [
        SK('Fire Lash', 'enemy', 'magic', 'fire', 0, 'Attack of 100%. 50% chance of Burn for 2 turns.', [D(1.0), DB('burn', 2, 0.5)]),
        SK('Twin Flames', 'random', 'magic', 'fire', 3, 'Three fireballs of 60% on random enemies.', [D(0.6)], { hits: 3 }),
        SK('Inferno', 'enemies', 'magic', 'meteor', 4, 'Hits all enemies for 90%. 60% chance of Burn for 2 turns.', [D(0.9), DB('burn', 2, 0.6)]),
      ] },
    thalessa: { name: 'Thalessa', faction: 'Mistspawn', role: 'Controller', rar: 3, aff: 'Frost',
      passive: 'frozencurse', passiveName: 'Frozen Touch', passiveDesc: 'Her hits have a 30% chance to inflict Speed Down for 2 turns.',
      skills: [
        SK('Rime Bolt', 'enemy', 'magic', 'water', 0, 'Attack of 95%.', [D(0.95)]),
        SK('Frost Prison', 'enemy', 'magic', 'water', 3, 'Attack of 70%. 65% chance to Freeze for 1 turn.', [D(0.7), DB('freeze', 1, 0.65)]),
        SK('Glacial Tide', 'enemies', 'magic', 'water', 5, 'Hits all enemies for 70% and drains 25% Turn Meter. 35% chance to Freeze for 1 turn.', [D(0.7), TMD(0.25), DB('freeze', 1, 0.35)]),
      ] },
    ravok: { name: 'Ravok', faction: 'Ironbeard Clans', role: 'Warrior', role2: 'Tank', rar: 2, aff: 'Storm',
      passive: 'thickhide', passiveName: 'Iron Plating', passiveDesc: 'Takes 10% less damage.',
      skills: [
        SK('Thunder Fist', 'enemy', 'melee', 'smash', 0, 'Strike of 100%. 20% chance to Stun for 1 turn.', [D(1.0), DB('stun', 1, 0.2)]),
        SK('Storm Slam', 'enemies', 'slam', 'quake', 3, 'Hits all enemies for 75%. 30% chance of Speed Down for 2 turns.', [D(0.75), DB('spdDown', 2, 0.3)]),
        SK('Overload', 'enemies', 'buff', 'rune', 4, '70% chance to Taunt all enemies for 2 turns. Gains Defense Up and Counterattack for 2 turns.', [DB('taunt', 2, 0.7), BF('defUp', 2, 'self'), BF('counter', 2, 'self')]),
      ] },
    seraphine: { name: 'Seraphine', faction: 'Grey Flame', role: 'Support', rar: 3, aff: 'Radiant',
      passive: 'divineward', passiveName: 'Guardian Wings', passiveDesc: 'At the start of battle, all allies gain a shield of 12% of Seraphine’s max HP for 3 turns.',
      skills: [
        SK('Halo Strike', 'enemy', 'magic', 'holy', 0, 'Attack of 90%. Heals the weakest ally for 8%. 30% chance of Speed Down for 2 turns.', [D(0.9), HEAL(0.08, 'lowestAlly'), DB('spdDown', 2, 0.3)]),
        SK('Blessing of Light', 'allies', 'buff', 'heal', 3, 'Heals all allies for 25%.', [HEAL(0.25)]),
        SK('Seraph’s Grace', 'deadAlly', 'buff', 'revive', 5, 'Revives a fallen ally with 40% HP.', [{ t: 'revive', pct: 0.4 }]),
      ] },
    draevan: { name: 'Draevan', faction: 'Hellwardens', role: 'Warrior', rar: 4, aff: 'Umbral',
      passive: 'infernalfury', passiveName: 'Dark Resolve', passiveDesc: 'Deals up to 50% more damage the lower his HP is.',
      skills: [
        SK('Void Cleaver', 'enemy', 'melee', 'slash', 0, 'Strike of 115%. Heals self for 20% of the damage.', [D(1.15, { steal: 0.2 })]),
        SK('Shadow Rend', 'enemies', 'melee', 'slash', 3, 'Hits all enemies for 80%. 50% chance of Bleed for 2 turns.', [D(0.8), DB('bleed', 2, 0.5)]),
        SK('Oblivion Edge', 'enemy', 'melee', 'dark', 5, '80% chance of Defense Down for 2 turns, then a strike of 260%.', [DB('defDown', 2, 0.8), D(2.6)]),
      ] },
    mirella: { name: 'Mirella', faction: 'Willow Children', role: 'Support', role2: 'Controller', rar: 2, aff: 'Verdant',
      passive: 'bloom', passiveName: 'Wildbloom', passiveDesc: 'Her heals are 20% stronger.',
      skills: [
        SK('Vine Whip', 'enemy', 'magic', 'thorns', 0, 'Attack of 90%. 30% chance of Speed Down for 1 turn.', [D(0.9), DB('spdDown', 1, 0.3)]),
        SK('Sap of Life', 'allies', 'buff', 'heal', 3, 'Heals all allies for 18% and grants Regeneration for 2 turns.', [HEAL(0.18), BF('regen', 2)]),
        SK('Thorn Snare', 'enemies', 'magic', 'thorns', 4, 'Hits all enemies for 50%. 50% chance of Attack Down for 2 turns.', [D(0.5), DB('atkDown', 2, 0.5)]),
      ] },
    volkaris: { name: 'Volkaris', faction: 'Hellwardens', role: 'Warrior', role2: 'Controller', rar: 4, aff: 'Ember',
      passive: 'warlord', passiveName: 'Warlord of Cinders', passiveDesc: 'Gains Attack Up for 2 turns whenever he defeats an enemy.',
      skills: [
        SK('Hellblade', 'enemy', 'melee', 'slash', 0, 'Strike of 110%. 40% chance of Burn for 2 turns.', [D(1.1), DB('burn', 2, 0.4)]),
        SK('Chains of Ruin', 'enemies', 'magic', 'fire', 3, 'Hits all enemies for 70%. 50% chance of Burn and 35% chance to Stun for 1 turn.', [D(0.7), DB('burn', 2, 0.5), DB('stun', 1, 0.35)]),
        SK('Apocalypse', 'enemies', 'slam', 'meteor', 5, '60% chance of Defense Down for 2 turns on all enemies, then hits them for 120%.', [DB('defDown', 2, 0.6), D(1.2)]),
      ] },
    nyxara: { name: 'Nyxara', faction: 'Silvertongues', role: 'Assassin', rar: 3, aff: 'Aether',
      passive: 'shadowhunter', passiveName: 'Aether Hunter', passiveDesc: '+25% Crit Rate against targets with a debuff.',
      skills: [
        SK('Phase Strike', 'enemy', 'melee', 'stab', 0, 'Thrust of 105%. 25% chance of Death Mark for 2 turns.', [D(1.05), DB('mark', 2, 0.25)]),
        SK('Void Step', 'lowestEnemy', 'melee', 'stab', 3, 'Gains Stealth for 2 turns and strikes the weakest enemy for 150%.', [BF('stealth', 2, 'self'), D(1.5)]),
        SK('Aether Rend', 'enemy', 'melee', 'dark', 4, 'Strike of 230%. +60% damage below 35% HP. 50% chance of Defense Down for 2 turns.', [D(2.3, { execute: [0.35, 0.6] }), DB('defDown', 2, 0.5)]),
      ] },
    orvyn: { name: 'Orvyn', faction: 'Silvertongues', role: 'Ranger', rar: 2, aff: 'Storm',
      passive: 'overcharge', passiveName: 'Charged Arrows', passiveDesc: '+30% Crit Damage.',
      skills: [
        SK('Spark Shot', 'enemy', 'ranged', 'arrow', 0, 'Arrow of 100%.', [D(1.0)]),
        SK('Lightning Volley', 'random', 'ranged', 'arrow', 3, 'Four arrows of 50% on random enemies.', [D(0.5)], { hits: 4 }),
        SK('Thunder Arrow', 'enemy', 'ranged', 'arrow', 4, 'Arrow of 180% that drains 30% Turn Meter. 40% chance of Speed Down for 2 turns.', [D(1.8), TMD(0.3), DB('spdDown', 2, 0.4)]),
      ] },
    // gift-only (dev: true, like J3DUIN): no summon, unlock, capture or bot gives him; any player may use him in the arena
    dio: { name: 'Dio', faction: 'Mistspawn', role: 'Support', rar: 4, aff: 'Frost', dev: true,
      passive: 'frozencore', passiveName: 'Polar Hide', passiveDesc: 'Attackers have a 25% chance to receive Speed Down.',
      skills: [
        SK('Glacier Hammer', 'enemy', 'melee', 'smash', 0, 'Strike of 100%. 40% chance of Speed Down for 2 turns.', [D(1.0), DB('spdDown', 2, 0.4)]),
        SK('Dio, Can You Hear Me?', 'allies', 'buff', 'heal', 3, 'Heals all allies for 22% of their max HP and removes all debuffs.', [HEAL(0.22), { t: 'cleanse' }]),
        SK('Chill Vibes', 'allies', 'buff', 'shield', 5, 'All allies gain a shield of 20% of Dio’s max HP, Defense Up and Regeneration for 2 turns.', [SH(0.2, 2), BF('defUp', 2), BF('regen', 2)]),
      ] },
    // gift-only like Dio
    malvek: { name: 'Malvek', faction: 'Grey Flame', role: 'Warrior', rar: 4, aff: 'Ember', dev: true,
      passive: 'kindling', passiveName: 'Burning Faith', passiveDesc: 'Burn applied by Malvek deals 50% more damage.',
      skills: [
        SK('Solar Edge', 'enemy', 'melee', 'slash', 0, 'Strike of 110%. 40% chance of Burn for 2 turns.', [D(1.1), DB('burn', 2, 0.4)]),
        SK('Purging Flame', 'enemy', 'melee', 'fire', 3, 'Strike of 220%, 40% more against a target below 50% HP. 60% chance of Burn for 2 turns.', [D(2.2, { execute: [0.5, 0.4] }), DB('burn', 2, 0.6)]),
        SK('The Light Within', 'enemies', 'magic', 'fire', 5, 'Attack of 120% on all enemies. 75% chance of Burn for 2 turns. Malvek gains Attack Up for 2 turns.', [D(1.2), DB('burn', 2, 0.75), BF('atkUp', 2, 'self')]),
      ] },
    celesthyr: { name: 'Celesthyr', faction: 'Grey Flame', role: 'Mage', role2: 'Controller', rar: 4, aff: 'Radiant',
      passive: 'seduction', passiveName: 'Celestial Will', passiveDesc: '+15% chance for his debuffs to land.',
      skills: [
        SK('Starfire', 'enemy', 'magic', 'holy', 0, 'Attack of 110%. 30% chance of Accuracy Down for 2 turns.', [D(1.1), DB('accDown', 2, 0.3)]),
        SK('Judgement', 'enemy', 'magic', 'sunfall', 3, 'Attack of 140%. 60% chance of Silence for 2 turns.', [D(1.4), DB('silence', 2, 0.6)]),
        SK('Sunfall', 'enemies', 'magic', 'sunfall', 5, 'Hits all enemies for 90%. 45% chance to Stun for 1 turn.', [D(0.9), DB('stun', 1, 0.45)]),
      ] },
    // Developer hero: the owner's own avatar. A normal Legendary in every way, but never in CHAMP_ORDER, so no summon,
    // unlock, capture or bot can ever give him; he only arrives as a mail gift ({"hero": "j3duin"}) and the arena
    // server accepts him only in the owner's team (DEV_HERO_OWNERS in supabase/functions/arena/logic.js).
    j3duin: { name: 'J3DUIN', faction: 'Fateforgers', role: 'Warrior', role2: 'Mage', rar: 4, aff: 'Ember', dev: true,
      passive: 'dragonblood', passiveName: 'Forged by Fate', passiveDesc: '+20% Crit Rate and +20% Crit Damage.',
      skills: [
        SK('Forged Edge', 'enemy', 'melee', 'slash', 0, 'Strike of 115%. 35% chance of Burn for 2 turns.', [D(1.15), DB('burn', 2, 0.35)]),
        SK('Fate Spark', 'enemies', 'magic', 'fire', 3, 'Hits all enemies for 75% and gains Attack Up for 2 turns.', [D(0.75), BF('atkUp', 2, 'self')]),
        SK('Shard Eruption', 'enemies', 'magic', 'meteor', 5, 'A Fate Shard erupts: 50% chance of Defense Down for 2 turns on all enemies, then hits them for 125%.', [DB('defDown', 2, 0.5), D(1.25)]),
      ] },
  };
  // ---------- The player's own hero (Fateborn) ----------
  // Made at the start (replaces the old starter choice): a gender and one of six classes, always Aether (no Strong or
  // Weak Hits: a joker that fits every team and every Tower of Essence). Each class × gender is its own hero id
  // `pc_<class>_<m|f>` (the gender only changes the art), Epic strength with 6 stars from the start (no ascending),
  // and its skills level up by themselves with its level (pcSkills). Not in CHAMP_ORDER: no summon, unlock or bot gives it.
  const PC_CLASSES = {
    tank: { name: 'Tank', role: 'Tank', passive: 'thickhide', passiveName: 'Fate-Forged Plate', passiveDesc: 'Takes 10% less damage.',
      pitch: 'Stands in front, taunts the enemy and shields the team. Hard to bring down.',
      skills: [
        SK('Shield Bash', 'enemy', 'melee', 'smash', 0, 'Strike of 100%. 40% chance of Taunt for 1 turn.', [D(1.0), DB('taunt', 1, 0.4)]),
        SK('Bulwark', 'allies', 'buff', 'shield', 4, 'All allies gain a shield of 15% of your max HP for 2 turns; you gain Defense Up for 2 turns.', [SH(0.15, 2), BF('defUp', 2, 'self')]),
        SK('Unbreakable', 'enemies', 'buff', 'holy', 5, '70% chance to Taunt all enemies for 2 turns. You gain Counterattack for 2 turns.', [DB('taunt', 2, 0.7), BF('counter', 2, 'self')]),
      ] },
    warrior: { name: 'Warrior', role: 'Warrior', passive: 'bloodlust', passiveName: 'Battle Fury', passiveDesc: '+30% Attack while your HP is below 50%.',
      pitch: 'Heavy blows, cleaves through groups and makes enemies bleed. Simple and strong.',
      skills: [
        SK('Cleave', 'enemy', 'melee', 'slash', 0, 'Two strikes of 60%.', [D(0.6)], { hits: 2 }),
        SK('Sundering Blow', 'enemy', 'melee', 'smash', 3, 'Strike of 150%. 60% chance of Defense Down for 2 turns.', [D(1.5), DB('defDown', 2, 0.6)]),
        SK('Whirlwind', 'enemies', 'slam', 'quake', 4, 'Hits all enemies for 85%. 50% chance of Bleed for 2 turns.', [D(0.85), DB('bleed', 2, 0.5)]),
      ] },
    mage: { name: 'Mage', role: 'Mage', passive: 'seduction', passiveName: 'Weave of Fate', passiveDesc: '+15% chance for your debuffs to land.',
      pitch: 'Aether spells that hit every enemy, weaken them and end with a huge blast.',
      skills: [
        SK('Aether Bolt', 'enemy', 'magic', 'rune', 0, 'Attack of 100%. 30% chance of Speed Down for 1 turn.', [D(1.0), DB('spdDown', 1, 0.3)]),
        SK('Arcane Nova', 'enemies', 'magic', 'meteor', 3, 'Hits all enemies for 65%. 40% chance of Defense Down for 2 turns.', [D(0.65), DB('defDown', 2, 0.4)]),
        SK('Starfall', 'enemy', 'magic', 'holy', 4, 'Attack of 220%.', [D(2.2)]),
      ] },
    ranger: { name: 'Ranger', role: 'Ranger', passive: 'eagleeye', passiveName: 'Hawk Sight', passiveDesc: '+15% Crit Rate. Critical hits drain 10% of the target’s Turn Meter.',
      pitch: 'Fast arrows and crits from the back line; picks off the weakest enemy.',
      skills: [
        SK('Twin Shot', 'enemy', 'ranged', 'arrow', 0, 'Two arrows of 55%.', [D(0.55)], { hits: 2 }),
        SK('Arrow Storm', 'enemies', 'ranged', 'arrowrain', 3, 'Hits all enemies for 60%. 40% chance of Defense Down for 2 turns.', [D(0.6), DB('defDown', 2, 0.4)]),
        SK('Fated Shot', 'lowestEnemy', 'ranged', 'arrow', 4, 'An arrow of 200% at the weakest enemy. +50% damage below 30% HP.', [D(2.0, { execute: [0.3, 0.5] })]),
      ] },
    rogue: { name: 'Rogue', role: 'Assassin', passive: 'scavenger', passiveName: 'Cutthroat', passiveDesc: '+20% damage against targets below 50% HP.',
      pitch: 'Quick and deadly: stealth, execute strikes and a flurry of bleeding cuts.',
      skills: [
        SK('Backstab', 'enemy', 'melee', 'stab', 0, 'Strike of 110%.', [D(1.1)]),
        SK('Shadowstep', 'lowestEnemy', 'melee', 'stab', 3, 'Gains Stealth for 2 turns, then strikes the weakest enemy for 160%. +50% damage below 30% HP.', [BF('stealth', 2, 'self'), D(1.6, { execute: [0.3, 0.5] })]),
        SK('Thousand Cuts', 'random', 'melee', 'slash', 4, 'Five cuts of 45% on random enemies. Each has a 25% chance of Bleed for 2 turns.', [D(0.45), DB('bleed', 2, 0.25)], { hits: 5 }),
      ] },
    healer: { name: 'Healer', role: 'Support', passive: 'bloom', passiveName: 'Fate’s Mercy', passiveDesc: 'Your heals are 20% stronger.',
      pitch: 'Keeps the whole team alive: big heals, shields and cleansing light.',
      skills: [
        SK('Light Strike', 'enemy', 'magic', 'holy', 0, 'Attack of 90%. 30% chance of Attack Down for 2 turns.', [D(0.9), DB('atkDown', 2, 0.3)]),
        SK('Mending Light', 'allies', 'buff', 'heal', 3, 'Heals all allies for 22%.', [HEAL(0.22)]),
        SK('Sanctuary', 'allies', 'buff', 'shield', 4, 'Heals all allies for 15%, gives them a shield of 15% of your max HP for 2 turns and cleanses them.', [HEAL(0.15), SH(0.15, 2), { t: 'cleanse' }]),
      ] },
  };
  const PC_GENDERS = { m: 'Male', f: 'Female' };
  const PC_IDS = [];
  for (const k in PC_CLASSES) for (const g in PC_GENDERS) {
    const p = PC_CLASSES[k], id = `pc_${k}_${g}`;
    CHAMPS[id] = { name: 'Fateborn ' + p.name, faction: 'Fateborn', role: p.role, role2: p.role2, rar: 3, aff: 'Aether', pc: true, pcClass: k, pcGender: g,
      passive: p.passive, passiveName: p.passiveName, passiveDesc: p.passiveDesc, skills: p.skills };
    PC_IDS.push(id);
  }
  const isPC = id => !!(CHAMPS[id] && CHAMPS[id].pc);
  // stars follow the level (4★ up to 40, 5★ up to 50, 6★ after), so the hero grows like an Epic without Ascension Stones
  const pcStars = lvl => (lvl < 40 ? 4 : lvl < 50 ? 5 : 6), PC_STARS = 6;
  // skill levels of the own hero: +1 on each skill at levels 12, 24, 36, 48 and 60
  const pcSkills = (id, lvl) => CHAMPS[id].skills.map(() => Math.min(SKILL_MAX_PC, Math.floor(lvl / 12)));
  const SKILL_MAX_PC = 5;
  for (const id in CHAMPS) CHAMPS[id].short = CHAMPS[id].name;
  // heroes outside every pool (see j3duin); they only come from a mail gift
  const DEV_HEROES = Object.keys(CHAMPS).filter(id => CHAMPS[id].dev);
  const CHAMP_ORDER = ['bromir', 'grythor', 'skavren', 'draelyn', 'vaessa', 'brukkar', 'karnok', 'morgrim', 'vorlund', 'valkessa', 'faedrin', 'krothar', 'ithyra', 'nyressa', 'selenia', 'drakulen', 'keldrax', 'oraneth', 'zarvion', 'sylreth', 'thalnir', 'aurelion', 'zyrael', 'velmira', 'nithara',
    'kaelira', 'vorak', 'elyndra', 'morveth', 'theryn', 'arkanis', 'liora', 'gorvann', 'sylvara', 'veyrith', 'astraea', 'korran', 'zephara', 'malreth', 'eryndor', 'ignara', 'thalessa', 'ravok', 'seraphine', 'draevan', 'mirella', 'volkaris', 'nyxara', 'orvyn', 'celesthyr', 'grimtar', 'krogash', 'zulgroth', 'bloodsnarl'];

  // ---------- Enemies (fodder) ----------
  let FOE_ATK = +(typeof process!=='undefined'&&process.env.FA||2.0), BOSS_ATK = +(typeof process!=='undefined'&&process.env.BA||5), BOSS_HP = +(typeof process!=='undefined'&&process.env.BH||1);
  const TIER = { Common: 1, Uncommon: 1.12, Rare: 1.25 };
  const E = (name, aff, tier, type, hp, atk, def, spd, skills, x) => Object.assign({ name, aff, tier, type, hp, atk, def, spd, skills }, x || {});
  const ENEMIES = {
    botkrijger: E('Bone Warrior', 'Umbral', 'Common', 'Skeleton', 480, 62, 40, 94, [SK('Rusty Blade', 'enemy', 'melee', 'slash', 0, '', [D(1.0)])]),
    cryptschutter: E('Crypt Archer', 'Umbral', 'Common', 'Skeleton', 400, 68, 28, 100, [SK('Bone Arrow', 'enemy', 'ranged', 'arrow', 0, '', [D(1.0)]), SK('Volley', 'enemies', 'ranged', 'arrowrain', 4, '', [D(0.5)], { startCd: 1 })]),
    schim: E('Wraith', 'Umbral', 'Uncommon', 'Undead', 500, 62, 38, 104, [SK('Chill', 'enemy', 'magic', 'water', 0, '', [D(0.9), DB('atkDown', 1, 0.4)]), SK('Grave Grasp', 'enemy', 'magic', 'dark', 4, '', [D(0.6), DB('stun', 1, 0.5)], { startCd: 2 })]),
    zombie: E('Rotting Zombie', 'Umbral', 'Common', 'Undead', 640, 56, 36, 86, [SK('Rotten Bite', 'enemy', 'melee', 'bite', 0, '', [D(0.95), DB('poison', 2, 0.3)])]),
    pestbrenger: E('Plague Bringer', 'Verdant', 'Uncommon', 'Mutant', 900, 60, 52, 88, [SK('Plague Slam', 'enemy', 'melee', 'smash', 0, '', [D(1.0)]), SK('Plague Cloud', 'enemies', 'magic', 'poison', 3, '', [D(0.4), DB('poison', 2, 0.6)], { startCd: 1 })]),
    skeletridder: E('Skeleton Knight', 'Umbral', 'Uncommon', 'Undead', 620, 64, 70, 92, [SK('Grave Sword', 'enemy', 'melee', 'slash', 0, '', [D(1.0)]), SK('Sentinel', 'self', 'buff', 'shield', 4, '', [BF('defUp', 2)])]),
    doodsmagier: E('Death Mage', 'Umbral', 'Rare', 'Caster', 440, 76, 30, 102, [SK('Soul Bolt', 'enemy', 'magic', 'dark', 0, '', [D(1.05)]), SK('Danse Macabre', 'enemies', 'magic', 'dark', 3, '', [D(0.55)], { startCd: 1 })]),
    banshee: E('Banshee', 'Umbral', 'Rare', 'Undead', 480, 66, 32, 108, [SK('Wail', 'enemy', 'magic', 'dark', 0, '', [D(0.9)]), SK('Death Shriek', 'enemies', 'magic', 'curse', 4, '', [D(0.45), DB('stun', 1, 0.25)], { startCd: 1 })]),
    vampier: E('Blood Vampire', 'Umbral', 'Uncommon', 'Vampire', 560, 72, 40, 104, [SK('Blood Bite', 'enemy', 'melee', 'bite', 0, '', [D(1.0, { steal: 0.35 })]), SK('Night Flight', 'enemy', 'melee', 'claw', 3, '', [D(1.4, { steal: 0.3 })], { startCd: 1 })]),
    bloedpriesteres: E('Blood Priestess', 'Ember', 'Rare', 'Cultist', 520, 58, 38, 98, [SK('Blood Bolt', 'enemy', 'magic', 'blood', 0, '', [D(0.85)]), SK('Blood Ritual', 'allies', 'buff', 'heal', 3, '', [HEAL(0.16)])]),
    gevallenridder: E('Fallen Knight', 'Umbral', 'Uncommon', 'Knight', 700, 74, 60, 94, [SK('Cursed Sword', 'enemy', 'melee', 'slash', 0, '', [D(1.15), DB('defDown', 1, 0.3)])]),
    hellehond: E('Demon Hound', 'Ember', 'Uncommon', 'Beast', 470, 72, 30, 112, [SK('Fire Bite', 'enemy', 'melee', 'bite', 0, '', [D(0.95), DB('burn', 2, 0.35)]), SK('Rend', 'enemy', 'melee', 'claw', 3, '', [D(1.4)], { startCd: 1 })]),
    helsebruut: E('Infernal Brute', 'Ember', 'Rare', 'Demon', 820, 70, 58, 90, [SK('Trident Thrust', 'enemy', 'melee', 'stab', 0, '', [D(1.05)]), SK('Roar', 'self', 'buff', 'buff', 4, '', [BF('atkUp', 2)])]),
    succubus: E('Succubus', 'Ember', 'Rare', 'Demon', 500, 68, 34, 106, [SK('Seductive Kiss', 'enemy', 'magic', 'curse', 0, '', [D(0.9), DB('atkDown', 1, 0.35)]), SK('Enchantment', 'enemy', 'magic', 'curse', 4, '', [D(0.5), DB('stun', 1, 0.55)], { startCd: 2 })]),
    afgrondsduivel: E('Pit Fiend', 'Ember', 'Uncommon', 'Demon', 900, 78, 55, 96, [SK('Hell Axe', 'enemy', 'melee', 'smash', 0, '', [D(1.1)]), SK('Abyssal Fire', 'enemies', 'magic', 'meteor', 3, '', [D(0.6), DB('burn', 2, 0.4)], { startCd: 1 })]),
    hagedisstrijder: E('Lizardman Warrior', 'Verdant', 'Common', 'Lizardman', 600, 66, 52, 96, [SK('Spear Thrust', 'enemy', 'melee', 'stab', 0, '', [D(1.0)]), SK('Shield Rampart', 'self', 'buff', 'shield', 4, '', [BF('defUp', 2)])]),
    hagedissjamaan: E('Lizardman Shaman', 'Verdant', 'Uncommon', 'Lizardman', 520, 56, 40, 100, [SK('Venom Spit', 'enemy', 'magic', 'poison', 0, '', [D(0.8), DB('poison', 2, 0.4)]), SK('Swamp Prayer', 'allies', 'buff', 'heal', 3, '', [HEAL(0.15)])]),
    hagedisbruut: E('Lizardman Brute', 'Verdant', 'Uncommon', 'Lizardman', 800, 72, 55, 90, [SK('Axe Swing', 'enemy', 'melee', 'smash', 0, '', [D(1.1)]), SK('Tail Whip', 'enemies', 'slam', 'quake', 3, '', [D(0.6)], { startCd: 1 })]),
    moerasheks: E('Swamp Witch', 'Verdant', 'Rare', 'Witch', 480, 70, 32, 102, [SK('Bog Curse', 'enemy', 'magic', 'curse', 0, '', [D(0.95), DB('defDown', 1, 0.35)]), SK('Toxic Mist', 'enemies', 'magic', 'poison', 3, '', [D(0.4), DB('poison', 2, 0.55)], { startCd: 1 })]),
    krokodilbeest: E('Crocodile Beast', 'Verdant', 'Rare', 'Beast', 980, 80, 62, 92, [SK('Jaws', 'enemy', 'melee', 'bite', 0, '', [D(1.1), DB('bleed', 2, 0.35)]), SK('Death Roll', 'enemy', 'melee', 'claw', 3, '', [D(1.6), DB('stun', 1, 0.3)], { startCd: 1 })]),
    cultist: E('Dark Cultist', 'Umbral', 'Common', 'Cultist', 430, 74, 28, 100, [SK('Fire Incantation', 'enemy', 'magic', 'fire', 0, '', [D(1.0)]), SK('Sacrificial Fire', 'enemy', 'magic', 'fire', 3, '', [D(0.6), DB('burn', 2, 0.6)], { startCd: 1 })]),
    cultgruwel: E('Cult Abomination', 'Umbral', 'Rare', 'Aberration', 860, 70, 45, 90, [SK('Tentacle Grab', 'enemy', 'melee', 'bite', 0, '', [D(1.0)]), SK('Horror Howl', 'enemies', 'magic', 'blood', 3, '', [D(0.55), DB('atkDown', 1, 0.4)], { startCd: 1 })]),
    wouddruide: E('Forest Druid', 'Verdant', 'Uncommon', 'Caster', 540, 60, 42, 100, [SK('Thorn Vines', 'enemy', 'magic', 'thorns', 0, '', [D(0.85)]), SK('Forest Renewal', 'allies', 'buff', 'heal', 3, '', [HEAL(0.15), BF('regen', 2)])]),
    steengolem: E('Stone Golem', 'Frost', 'Rare', 'Construct', 950, 64, 90, 84, [SK('Stone Fist', 'enemy', 'melee', 'smash', 0, '', [D(1.05)]), SK('Tremor', 'enemies', 'slam', 'quake', 3, '', [D(0.55), DB('stun', 1, 0.2)], { startCd: 1 })]),
    ijselementaal: E('Ice Elemental', 'Frost', 'Rare', 'Elemental', 560, 70, 45, 104, [SK('Ice Shard', 'enemy', 'magic', 'water', 0, '', [D(0.95)]), SK('Freeze', 'enemy', 'magic', 'water', 4, '', [D(0.6), DB('freeze', 1, 0.5)], { startCd: 1 })]),
    // ----- enemies 26-50 -----
    gravestalker: E('Grave Stalker', 'Umbral', 'Common', 'Undead', 460, 70, 30, 106, [SK('Shadow Slash', 'enemy', 'melee', 'slash', 0, '', [D(1.0), DB('bleed', 2, 0.3)]), SK('Stalk', 'lowestEnemy', 'melee', 'stab', 3, '', [D(1.3)], { startCd: 1 })]),
    cryptguard: E('Crypt Guard', 'Umbral', 'Common', 'Skeleton', 620, 58, 64, 90, [SK('Guard Strike', 'enemy', 'melee', 'slash', 0, '', [D(1.0), DB('taunt', 1, 0.4)]), SK('Bone Wall', 'self', 'buff', 'shield', 4, '', [BF('defUp', 2)], { startCd: 1 })]),
    soulreaver: E('Soul Reaver', 'Umbral', 'Uncommon', 'Undead', 520, 68, 34, 106, [SK('Soul Siphon', 'enemy', 'magic', 'dark', 0, '', [D(0.95, { steal: 0.3 })]), SK('Wail of Souls', 'enemies', 'magic', 'curse', 3, '', [D(0.5), DB('atkDown', 1, 0.4)], { startCd: 1 })]),
    dreadarcher: E('Dread Archer', 'Umbral', 'Uncommon', 'Skeleton', 460, 74, 32, 102, [SK('Dread Arrow', 'enemy', 'ranged', 'arrow', 0, '', [D(1.0), DB('spdDown', 1, 0.25)]), SK('Cursed Volley', 'enemies', 'ranged', 'arrowrain', 3, '', [D(0.5), DB('healRed', 2, 0.3)], { startCd: 1 })]),
    gravewarden: E('Grave Warden', 'Umbral', 'Rare', 'Undead', 900, 72, 66, 90, [SK('Warden’s Cleave', 'enemy', 'melee', 'smash', 0, '', [D(1.05)]), SK('Grave Command', 'allies', 'buff', 'shield', 4, '', [BF('defUp', 2)], { startCd: 1 }), SK('Doom Strike', 'enemy', 'melee', 'dark', 3, '', [D(1.4), DB('defDown', 1, 0.4)], { startCd: 2 })]),
    ashgoblin: E('Ash Goblin', 'Ember', 'Common', 'Goblin', 400, 66, 26, 108, [SK('Torch Stab', 'enemy', 'melee', 'stab', 0, '', [D(1.0), DB('burn', 2, 0.3)]), SK('Firebomb', 'enemies', 'magic', 'fire', 4, '', [D(0.45), DB('burn', 2, 0.3)], { startCd: 2 })]),
    flameberserker: E('Flame Berserker', 'Ember', 'Uncommon', 'Orc', 700, 78, 44, 98, [SK('Blazing Axes', 'enemy', 'melee', 'slash', 0, '', [D(0.55)], { hits: 2 }), SK('Berserk', 'self', 'buff', 'fire', 4, '', [BF('atkUp', 2)], { startCd: 1 })]),
    cinderhound: E('Cinder Hound', 'Ember', 'Common', 'Beast', 450, 70, 30, 112, [SK('Cinder Bite', 'enemy', 'melee', 'bite', 0, '', [D(0.95), DB('burn', 2, 0.25)]), SK('Pounce', 'enemy', 'melee', 'claw', 3, '', [D(1.35)], { startCd: 1 })]),
    magmabrute: E('Magma Brute', 'Ember', 'Rare', 'Demon', 980, 76, 70, 84, [SK('Magma Fist', 'enemy', 'melee', 'smash', 0, '', [D(1.05), DB('burn', 2, 0.3)]), SK('Eruption', 'enemies', 'slam', 'quake', 3, '', [D(0.6), DB('burn', 2, 0.35)], { startCd: 1 })]),
    hellfireshaman: E('Hellfire Shaman', 'Ember', 'Rare', 'Cultist', 500, 72, 34, 102, [SK('Hellfire Bolt', 'enemy', 'magic', 'fire', 0, '', [D(1.0)]), SK('Infernal Rite', 'allies', 'buff', 'heal', 3, '', [HEAL(0.15), BF('atkUp', 2)], { startCd: 1 })]),
    mosscrawler: E('Mosscrawler', 'Verdant', 'Common', 'Beast', 520, 62, 40, 104, [SK('Venom Fang', 'enemy', 'melee', 'bite', 0, '', [D(0.95), DB('poison', 2, 0.4)]), SK('Web Spit', 'enemy', 'magic', 'poison', 3, '', [D(0.6), DB('spdDown', 2, 0.5)], { startCd: 1 })]),
    thornbeast: E('Thorn Beast', 'Verdant', 'Uncommon', 'Beast', 760, 72, 56, 96, [SK('Thorn Maul', 'enemy', 'melee', 'claw', 0, '', [D(1.05), DB('bleed', 2, 0.3)]), SK('Spine Burst', 'enemies', 'slam', 'thorns', 3, '', [D(0.55)], { startCd: 1 })]),
    rotvineshambler: E('Rotvine Shambler', 'Verdant', 'Uncommon', 'Mutant', 880, 60, 54, 86, [SK('Rot Slam', 'enemy', 'melee', 'smash', 0, '', [D(1.0), DB('poison', 2, 0.35)]), SK('Rotting Embrace', 'enemy', 'melee', 'poison', 3, '', [D(0.8, { steal: 0.3 }), DB('healRed', 2, 0.5)], { startCd: 1 })]),
    bogreaper: E('Bog Reaper', 'Verdant', 'Rare', 'Aberration', 520, 80, 34, 104, [SK('Bog Scythe', 'enemy', 'melee', 'slash', 0, '', [D(1.05), DB('poison', 2, 0.3)]), SK('Reap', 'lowestEnemy', 'melee', 'dark', 3, '', [D(1.5, { execute: [0.35, 0.5] })], { startCd: 1 })]),
    woodwraith: E('Ancient Wood Wraith', 'Verdant', 'Rare', 'Elemental', 880, 66, 62, 92, [SK('Root Lash', 'enemy', 'magic', 'thorns', 0, '', [D(0.95), DB('spdDown', 1, 0.3)]), SK('Ancient Grove', 'allies', 'buff', 'heal', 3, '', [HEAL(0.14), BF('regen', 2)], { startCd: 1 })]),
    frostfangwolf: E('Frostfang Wolf', 'Frost', 'Common', 'Beast', 460, 70, 32, 110, [SK('Frost Bite', 'enemy', 'melee', 'bite', 0, '', [D(0.95), DB('spdDown', 1, 0.3)]), SK('Pack Howl', 'allies', 'buff', 'buff', 4, '', [BF('atkUp', 2)], { startCd: 1 })]),
    iceboundknight: E('Icebound Knight', 'Frost', 'Uncommon', 'Undead', 720, 66, 70, 92, [SK('Frozen Blade', 'enemy', 'melee', 'slash', 0, '', [D(1.0), DB('freeze', 1, 0.2)]), SK('Ice Guard', 'self', 'buff', 'shield', 4, '', [BF('defUp', 2)], { startCd: 1 })]),
    glacierbrute: E('Glacier Brute', 'Frost', 'Rare', 'Giant', 1000, 78, 66, 84, [SK('Glacier Cleaver', 'enemy', 'melee', 'smash', 0, '', [D(1.1)]), SK('Avalanche', 'enemies', 'slam', 'quake', 3, '', [D(0.6), DB('freeze', 1, 0.25)], { startCd: 1 })]),
    frostbornwitch: E('Frostborn Witch', 'Frost', 'Rare', 'Witch', 480, 74, 32, 104, [SK('Frost Hex', 'enemy', 'magic', 'water', 0, '', [D(0.95), DB('spdDown', 2, 0.35)]), SK('Winter Curse', 'enemies', 'magic', 'curse', 3, '', [D(0.45), DB('defDown', 2, 0.4)], { startCd: 1 })]),
    frozenhorror: E('Frozen Horror', 'Frost', 'Rare', 'Aberration', 900, 70, 50, 90, [SK('Tentacle Crush', 'enemy', 'melee', 'bite', 0, '', [D(1.05), DB('spdDown', 1, 0.3)]), SK('Frozen Scream', 'enemies', 'magic', 'water', 3, '', [D(0.55), DB('atkDown', 1, 0.35)], { startCd: 1 })]),
    stormimp: E('Storm Imp', 'Storm', 'Common', 'Demon', 420, 68, 28, 112, [SK('Spark Claw', 'enemy', 'melee', 'claw', 0, '', [D(0.95)]), SK('Static Burst', 'random', 'magic', 'rune', 3, '', [D(0.4)], { hits: 3, startCd: 1 })]),
    thunderraider: E('Thunder Raider', 'Storm', 'Uncommon', 'Warrior', 720, 76, 52, 98, [SK('Storm Axe', 'enemy', 'melee', 'smash', 0, '', [D(1.05), DB('stun', 1, 0.2)]), SK('Raid', 'enemy', 'melee', 'slash', 3, '', [D(1.4)], { startCd: 1 })]),
    tempestharpy: E('Tempest Harpy', 'Storm', 'Uncommon', 'Beast', 480, 72, 32, 110, [SK('Talon Rake', 'enemy', 'melee', 'claw', 0, '', [D(0.5)], { hits: 2 }), SK('Gale Wings', 'enemies', 'magic', 'rune', 3, '', [D(0.5), TMD(0.15)], { startCd: 1 })]),
    stormcaller: E('Stormcaller', 'Storm', 'Rare', 'Caster', 480, 76, 32, 104, [SK('Lightning Bolt', 'enemy', 'magic', 'rune', 0, '', [D(1.05)]), SK('Thunderstorm', 'enemies', 'magic', 'meteor', 3, '', [D(0.55), DB('stun', 1, 0.2)], { startCd: 1 })]),
    thundergolem: E('Thunderbound Golem', 'Storm', 'Rare', 'Construct', 1000, 66, 88, 82, [SK('Charged Fist', 'enemy', 'melee', 'smash', 0, '', [D(1.05), DB('stun', 1, 0.2)]), SK('Overcharge', 'self', 'buff', 'shield', 4, '', [BF('defUp', 2), BF('counter', 2)], { startCd: 1 })]),
    // ----- the orc shamans and hunter (enemies 51-54) -----
    grimtar: E('Grimtar', 'Verdant', 'Uncommon', 'Orc', 500, 72, 34, 100, [SK('Spirit Bolt', 'enemy', 'magic', 'poison', 0, '', [D(1.0), DB('poison', 2, 0.3)]), SK('Wailing Spirits', 'enemies', 'magic', 'curse', 3, '', [D(0.5), DB('healRed', 2, 0.35)], { startCd: 1 })]),
    krogash: E('Krogash', 'Ember', 'Uncommon', 'Orc', 520, 74, 36, 98, [SK('Ashen Bolt', 'enemy', 'magic', 'fire', 0, '', [D(1.0), DB('burn', 2, 0.3)]), SK('Ash Storm', 'enemies', 'magic', 'meteor', 3, '', [D(0.55), DB('burn', 2, 0.35)], { startCd: 1 })]),
    zulgroth: E('Zulgroth', 'Umbral', 'Uncommon', 'Orc', 560, 58, 42, 100, [SK('Void Orb', 'enemy', 'magic', 'dark', 0, '', [D(0.85), DB('spdDown', 1, 0.3)]), SK('Void Pact', 'allies', 'buff', 'heal', 3, '', [HEAL(0.12), BF('atkUp', 2)], { startCd: 1 })]),
    bloodsnarl: E('Bloodsnarl', 'Ember', 'Uncommon', 'Orc', 540, 74, 34, 104, [SK('Blood Arrow', 'enemy', 'ranged', 'arrow', 0, '', [D(1.0), DB('bleed', 2, 0.3)]), SK('Loose the Wolf', 'lowestEnemy', 'melee', 'bite', 3, '', [D(1.35), DB('bleed', 2, 0.4)], { startCd: 1 })]),
  };

  // ---------- Captured enemies: playable as heroes (weaker kits) and usable as fodder. Bosses can never be captured. ----------
  const CAPTURE_ROLE = {
    botkrijger: 'Warrior', cryptschutter: 'Ranger', schim: 'Controller', zombie: 'Tank', pestbrenger: 'Tank', skeletridder: 'Tank',
    doodsmagier: 'Mage', banshee: 'Controller', vampier: 'Assassin', bloedpriesteres: 'Support', gevallenridder: 'Warrior', hellehond: 'Assassin',
    helsebruut: 'Warrior', succubus: 'Controller', afgrondsduivel: 'Warrior', hagedisstrijder: 'Warrior', hagedissjamaan: 'Support', hagedisbruut: 'Tank',
    moerasheks: 'Mage', krokodilbeest: 'Warrior', cultist: 'Mage', cultgruwel: 'Tank', wouddruide: 'Support', steengolem: 'Tank', ijselementaal: 'Mage',
    gravestalker: 'Assassin', cryptguard: 'Tank', soulreaver: 'Controller', dreadarcher: 'Ranger', gravewarden: 'Tank',
    ashgoblin: 'Assassin', flameberserker: 'Warrior', cinderhound: 'Assassin', magmabrute: 'Tank', hellfireshaman: 'Support',
    mosscrawler: 'Controller', thornbeast: 'Warrior', rotvineshambler: 'Tank', bogreaper: 'Assassin', woodwraith: 'Support',
    frostfangwolf: 'Assassin', iceboundknight: 'Tank', glacierbrute: 'Warrior', frostbornwitch: 'Mage', frozenhorror: 'Controller',
    stormimp: 'Assassin', thunderraider: 'Warrior', tempestharpy: 'Controller', stormcaller: 'Mage', thundergolem: 'Tank',
  };
  const TIER_RAR = { Common: 0, Uncommon: 1, Rare: 2 };
  const TGT_TXT = { enemy: 'one enemy', enemies: 'all enemies', random: 'random enemies', lowestEnemy: 'the weakest enemy', ally: 'one ally', allies: 'all allies', lowestAlly: 'the weakest ally', self: 'self' };
  function describe(sk) {
    const parts = [];
    for (const f of sk.fx) {
      if (f.t === 'dmg') parts.push(`${sk.hits > 1 ? sk.hits + ' hits' : 'Attack'} of ${Math.round(f.m * 100)}% on ${TGT_TXT[sk.target]}${f.steal ? `, healing for ${Math.round(f.steal * 100)}% of the damage` : ''}.`);
      else if (f.t === 'debuff') parts.push(`${Math.round(f.ch * 100)}% chance of ${EFFECTS[f.k].n} for ${f.n} ${f.n === 1 ? 'turn' : 'turns'}.`);
      else if (f.t === 'buff') parts.push(`Grants ${EFFECTS[f.k].n} for ${f.n} ${f.n === 1 ? 'turn' : 'turns'}${sk.target === 'self' ? ' to self' : ''}.`);
      else if (f.t === 'heal') parts.push(`Heals ${TGT_TXT[sk.target]} for ${Math.round(f.pct * 100)}%.`);
    }
    return parts.join(' ');
  }
  const CAPTURE_ORDER = Object.keys(CAPTURE_ROLE);
  for (const id of CAPTURE_ORDER) {
    const e = ENEMIES[id];
    CHAMPS[id] = { name: e.name, short: e.name, faction: 'Captured · ' + e.type, role: CAPTURE_ROLE[id], rar: TIER_RAR[e.tier], aff: e.aff, captured: true,
      skills: e.skills.map(sk => Object.assign({}, sk, { desc: describe(sk), startCd: 0 })) };
  }
  const CAPTURE_CHANCE = 0.05;
  const isCaptured = id => !!(CHAMPS[id] && CHAMPS[id].captured);
  // XP a hero gets from eating one fodder unit: a share of the hero's next level, more for rarer fodder
  // XP from feeding a hero (a spare copy at level 1, or any hero from the roster at its level) to another hero
  // Feeding gives a fixed amount of XP by the food's rarity and level. It does not depend on the hero that eats it:
  // it used to be a share of the eater's next level, so every feed was worth the same part of a level at any level
  // and feeding a high-level hero gave several levels at once. heroLvl is kept in the signature but unused.
  // Uncommon food gives 500 XP at level 1: a meal, not a shortcut past battles
  const FEED_BASE = [250, 500, 1000, 2000, 4000];
  const feedXp = (foodId, heroLvl, foodLvl) => Math.round(FEED_BASE[CHAMPS[foodId].rar] * (1 + ((foodLvl || 1) - 1) / 10));
  const breakStones = fodderId => CHAMPS[fodderId].rar + 1;

  // ---------- Bosses ----------
  // phases: array of skill lists (index 0 = phase 1). onPhase: effects applied when a phase starts.
  const B = (name, aff, arch, phases, x) => Object.assign({ name, aff, arch, nPhases: phases.length, phases, boss: true, isBoss: true, hp: 2600, atk: 92, def: 62, spd: 100, breakMax: phases.length === 3 ? 36 : 28, breakRes: 0 }, x);
  const BOSSES = {
    brimstone: B('Brimstone Dragon', 'Ember', 'Dragon', [
      [SK('Fire Breath', 'enemies', 'magic', 'fire', 0, '', [D(0.7), DB('burn', 2, 0.3)]), SK('Tail Sweep', 'enemies', 'slam', 'quake', 3, '', [D(0.8)], { startCd: 1 }), SK('Burning Scales', 'self', 'buff', 'shield', 4, '', [BF('defUp', 2)], { startCd: 2 })],
      [SK('Inferno Roar', 'enemies', 'magic', 'meteor', 0, '', [D(0.75), BF('atkUp', 2, 'self')]), SK('Meteor Flame', 'random', 'magic', 'meteor', 3, '', [D(1.8)], { startCd: 1 }), SK('Tail Sweep', 'enemies', 'slam', 'quake', 3, '', [D(0.8)], { startCd: 2 })],
    ], { passive: 'molten', passiveName: 'Molten Blood', passiveDesc: 'Weak Hits against the Brimstone Dragon have a 20% chance to Burn the attacker. Below 30% HP it enrages and deals 30% more damage.', hp: 3000, atk: 98, spd: 98 }),
    voidtitan: B('Void Titan', 'Umbral', 'Titan', [
      [SK('Void Strike', 'enemy', 'melee', 'dark', 0, '', [D(1.2)]), SK('Dark Pulse', 'enemies', 'magic', 'dark', 3, '', [D(0.7), DB('defDown', 2, 0.35)], { startCd: 1 })],
      // phase 2: the basic attack is single-target again (an every-turn team hit made him a wall on every difficulty)
      [SK('Void Strike', 'enemy', 'melee', 'dark', 0, '', [D(1.3)]), SK('Summon Void Shards', 'self', 'buff', 'curse', 4, '', [{ t: 'summon', id: 'schim', max: 2 }], { startCd: 0 }), SK('Void Collapse', 'enemies', 'magic', 'dark', 2, '', [D(0.85)], { startCd: 1 })],
    ], { passive: 'voidarmor', passiveName: 'Void Armor', passiveDesc: 'Takes 10% less damage while the Break Meter is above 50%.', onPhase: [null, [BF('spdUp', 3, 'self')]], hp: 3200, def: 70, spd: 92 }),
    frostcolossus: B('Frost Colossus', 'Frost', 'Golem', [
      [SK('Ice Smash', 'enemy', 'melee', 'smash', 0, '', [D(1.2)]), SK('Frost Wave', 'enemies', 'magic', 'water', 3, '', [D(0.7), DB('spdDown', 2, 0.4)], { startCd: 1 })],
      [SK('Absolute Zero', 'enemies', 'magic', 'water', 3, '', [D(0.8), DB('freeze', 1, 0.3)], { startCd: 0 }), SK('Frozen Armor', 'self', 'buff', 'shield', 4, '', [BF('defUp', 2), SH(0.1, 2)], { startCd: 1 }), SK('Ice Smash', 'enemy', 'melee', 'smash', 0, '', [D(1.2)])],
    ], { passive: 'frozencore', passiveName: 'Frozen Core', passiveDesc: 'Has a 25% chance to apply Speed Down to attackers.', hp: 3200, def: 72, spd: 90 }),
    plaguelord: B('Plague Lord', 'Verdant', 'Abomination', [
      [SK('Plague Strike', 'enemy', 'melee', 'smash', 0, '', [D(1.1), DB('poison', 2, 0.4)]), SK('Toxic Cloud', 'enemies', 'magic', 'poison', 3, '', [D(0.5), DB('poison', 2, 0.6)], { startCd: 1 })],
      [SK('Pandemic', 'enemies', 'magic', 'poison', 3, '', [D(0.7), DB('poison', 3, 0.7)], { startCd: 0 }), SK('Summon Plague Spawn', 'self', 'buff', 'poison', 4, '', [{ t: 'summon', id: 'zombie', max: 2 }], { startCd: 1 }), SK('Plague Strike', 'enemy', 'melee', 'smash', 0, '', [D(1.1)])],
    ], { passive: 'toxicpresence', passiveName: 'Toxic Presence', passiveDesc: 'After each of his turns, every enemy has a 15% chance to be Poisoned.', hp: 3300, spd: 90 }),
    bloodempress: B('Blood Empress', 'Umbral', 'Vampire', [
      [SK('Blood Bolt', 'enemy', 'magic', 'blood', 0, '', [D(1.1)]), SK('Vampiric Kiss', 'enemy', 'melee', 'bite', 3, '', [D(1.4, { steal: 0.5 })], { startCd: 1 })],
      [SK('Crimson Storm', 'enemies', 'magic', 'blood', 3, '', [D(0.75)], { startCd: 0 }), SK('Summon Blood Thralls', 'self', 'buff', 'blood', 4, '', [{ t: 'summon', id: 'vampier', max: 2 }], { startCd: 1 }), SK('Blood Bolt', 'enemy', 'magic', 'blood', 0, '', [D(1.1)])],
      [SK('Queen’s Hunger', 'enemy', 'melee', 'bite', 2, '', [D(1.8, { steal: 0.5 })], { startCd: 0 }), SK('Blood Nova', 'enemies', 'magic', 'blood', 3, '', [D(0.9), DB('healRed', 2, 0.5)], { startCd: 1 }), SK('Blood Bolt', 'enemy', 'magic', 'blood', 0, '', [D(1.1)])],
    ], { passive: 'sanguine', passiveName: 'Sanguine Rebirth', passiveDesc: 'Heals 5% of her max HP whenever she defeats a unit.', onPhase: [null, null, [BF('atkUp', 3, 'self')]], hp: 3400, spd: 106 }),
    stormbehemoth: B('Storm Behemoth', 'Storm', 'Elemental', [
      [SK('Lightning Strike', 'enemy', 'magic', 'rune', 0, '', [D(1.15)]), SK('Thunder Roar', 'enemies', 'magic', 'rune', 3, '', [D(0.7), DB('spdDown', 2, 0.4)], { startCd: 1 })],
      [SK('Chain Lightning', 'random', 'magic', 'rune', 2, '', [D(0.6)], { hits: 4, startCd: 0 }), SK('Overcharge', 'self', 'buff', 'buff', 4, '', [BF('atkUp', 2), BF('spdUp', 2)], { startCd: 1 }), SK('Lightning Strike', 'enemy', 'magic', 'rune', 0, '', [D(1.15)])],
    ], { passive: 'staticcharge', passiveName: 'Static Charge', passiveDesc: 'Every attack builds a Charge. At 3 Charges its next attack deals 50% more damage.', hp: 3000, spd: 110 }),
    ashenphoenix: B('Ashen Phoenix', 'Ember', 'Phoenix', [
      [SK('Flame Wing', 'enemy', 'magic', 'fire', 0, '', [D(1.1), DB('burn', 2, 0.4)]), SK('Ash Storm', 'enemies', 'magic', 'meteor', 3, '', [D(0.7), DB('accDown', 2, 0.4)], { startCd: 1 })],
      [SK('Rebirth Flame', 'self', 'buff', 'heal', 5, '', [HEAL(0.15), BF('atkUp', 2)], { startCd: 2 }), SK('Inferno Dive', 'enemy', 'melee', 'fire', 2, '', [D(1.9), DB('burn', 2, 0.6)], { startCd: 0 }), SK('Flame Wing', 'enemy', 'magic', 'fire', 0, '', [D(1.1)])],
    ], { passive: 'rebirth', passiveName: 'Rebirth', passiveDesc: 'On first death, returns with 25% HP.', hp: 2600, spd: 112 }),
    shadowlich: B('Shadow Lich', 'Umbral', 'Undead', [
      [SK('Shadow Bolt', 'enemy', 'magic', 'dark', 0, '', [D(1.1)]), SK('Curse', 'enemy', 'magic', 'curse', 3, '', [D(0.6), DB('defDown', 2, 0.7), DB('atkDown', 2, 0.5)], { startCd: 1 })],
      [SK('Raise Dead', 'self', 'buff', 'dark', 4, '', [{ t: 'summon', id: 'botkrijger', max: 2 }], { startCd: 0 }), SK('Soul Drain', 'enemies', 'magic', 'dark', 3, '', [D(0.6, { steal: 0.3 })], { startCd: 1 }), SK('Shadow Bolt', 'enemy', 'magic', 'dark', 0, '', [D(1.1)])],
      [SK('Death Nova', 'enemies', 'magic', 'dark', 3, '', [D(1.0)], { startCd: 0 }), SK('Mass Curse', 'enemies', 'magic', 'curse', 4, '', [DB('defDown', 2, 0.6), DB('healRed', 2, 0.6)], { startCd: 1 }), SK('Shadow Bolt', 'enemy', 'magic', 'dark', 0, '', [D(1.1)])],
    ], { passive: 'soulharvest', passiveName: 'Soul Harvest', passiveDesc: 'Gains 10% Attack whenever any unit dies (max. 5 times).', hp: 3200, def: 55, spd: 102 }),
    ironjuggernaut: B('Iron Juggernaut', 'Storm', 'Construct', [
      [SK('Cannon Blast', 'enemy', 'ranged', 'cannon', 0, '', [D(1.2)]), SK('Iron Slam', 'enemies', 'slam', 'quake', 3, '', [D(0.75), DB('stun', 1, 0.25)], { startCd: 1 })],
      [SK('Overdrive', 'self', 'buff', 'buff', 4, '', [BF('atkUp', 2), BF('spdUp', 2)], { startCd: 0 }), SK('Missile Barrage', 'random', 'ranged', 'cannon', 2, '', [D(0.55)], { hits: 5, startCd: 1 }), SK('Cannon Blast', 'enemy', 'ranged', 'cannon', 0, '', [D(1.2)])],
    ], { passive: 'ironhull', passiveName: 'Reinforced Hull', passiveDesc: '+50% Defense while not Broken. Break it to crack the hull.', hp: 3000, def: 80, spd: 88 }),
    sealeviathan: B('Sea Leviathan', 'Frost', 'Sea Monster', [
      [SK('Tidal Strike', 'enemy', 'melee', 'bite', 0, '', [D(1.15)]), SK('Water Jet', 'enemy', 'magic', 'water', 3, '', [D(1.4), TMD(0.3)], { startCd: 1 })],
      [SK('Whirlpool', 'enemies', 'magic', 'water', 3, '', [D(0.7), DB('spdDown', 2, 0.5)], { startCd: 0 }), SK('Freeze Wave', 'enemies', 'magic', 'water', 4, '', [D(0.5), DB('freeze', 1, 0.35)], { startCd: 1 }), SK('Tidal Strike', 'enemy', 'melee', 'bite', 0, '', [D(1.15)])],
      [SK('Tsunami', 'enemies', 'magic', 'water', 3, '', [D(1.0)], { startCd: 0 }), SK('Abyssal Roar', 'enemies', 'magic', 'dark', 4, '', [DB('atkDown', 2, 0.6), TMD(0.25)], { startCd: 1 }), SK('Tidal Strike', 'enemy', 'melee', 'bite', 0, '', [D(1.2)])],
    ], { passive: 'deepwater', passiveName: 'Deepwater', passiveDesc: 'Takes 25% less damage while above 70% HP.', hp: 3500, spd: 98 }),
    celestial: B('Celestial Guardian', 'Radiant', 'Angel', [
      [SK('Holy Strike', 'enemy', 'melee', 'slash', 0, '', [D(1.15)]), SK('Radiant Beam', 'enemy', 'magic', 'holy', 3, '', [D(1.6)], { startCd: 1 })],
      [SK('Divine Judgment', 'enemies', 'magic', 'sunfall', 3, '', [D(0.9)], { startCd: 0 }), SK('Mass Heal', 'allies', 'buff', 'heal', 4, '', [HEAL(0.12), BF('defUp', 2)], { startCd: 1 }), SK('Holy Strike', 'enemy', 'melee', 'slash', 0, '', [D(1.15)])],
    ], { passive: 'divinebarrier', passiveName: 'Divine Barrier', passiveDesc: 'Begins combat with a shield of 25% of its max HP.', onPhase: [null, [BF('defUp', 2, 'self')]], hp: 2900, spd: 104 }),
    overlord: B('Infernal Overlord', 'Ember', 'Demon', [
      [SK('Hellfire', 'enemy', 'magic', 'fire', 0, '', [D(1.1), DB('burn', 2, 0.35)]), SK('Demonic Slash', 'enemies', 'melee', 'slash', 3, '', [D(0.75)], { startCd: 1 })],
      [SK('Infernal Wave', 'enemies', 'magic', 'meteor', 3, '', [D(0.85), DB('burn', 2, 0.5)], { startCd: 0 }), SK('Summon Demon', 'self', 'buff', 'fire', 4, '', [{ t: 'summon', id: 'hellehond', max: 2 }], { startCd: 1 }), SK('Hellfire', 'enemy', 'magic', 'fire', 0, '', [D(1.1)])],
      [SK('Apocalypse', 'enemies', 'magic', 'meteor', 3, '', [D(1.1)], { startCd: 0 }), SK('Enrage', 'self', 'buff', 'buff', 4, '', [BF('atkUp', 3), BF('critUp', 3)], { startCd: 1 }), SK('Hellfire', 'enemy', 'magic', 'fire', 0, '', [D(1.2)])],
    ], { passive: 'infernalfury', passiveName: 'Infernal Fury', passiveDesc: 'Deals up to 50% more damage as its HP decreases.', hp: 3400, spd: 100 }),
    boneking: B('Bone King', 'Umbral', 'Skeleton King', [
      [SK('Bone Strike', 'enemy', 'melee', 'smash', 0, '', [D(1.15)]), SK('Summon Skeleton', 'self', 'buff', 'dark', 4, '', [{ t: 'summon', id: 'botkrijger', max: 2 }], { startCd: 1 })],
      [SK('Bone Storm', 'enemies', 'magic', 'arrowrain', 3, '', [D(0.75)], { startCd: 0 }), SK('Raise the Fallen', 'self', 'buff', 'dark', 4, '', [{ t: 'summon', id: 'cryptschutter', max: 2 }], { startCd: 1 }), SK('Bone Strike', 'enemy', 'melee', 'smash', 0, '', [D(1.15)])],
      [SK('King’s Wrath', 'enemy', 'melee', 'smash', 2, '', [D(2.0), DB('defDown', 2, 0.6)], { startCd: 0 }), SK('Army of Bones', 'self', 'buff', 'dark', 4, '', [{ t: 'summon', id: 'skeletridder', max: 2 }], { startCd: 1 }), SK('Bone Strike', 'enemy', 'melee', 'smash', 0, '', [D(1.2)])],
    ], { passive: 'undyinglegion', passiveName: 'Undying Legion', passiveDesc: 'Summons skeletons to fight at his side. Break him to stop the tide.', hp: 2600, spd: 98 }),
    treant: B('The Corrupted Treant', 'Verdant', 'Ancient Treant', [
      [SK('Root Strike', 'enemy', 'melee', 'thorns', 0, '', [D(1.1), DB('spdDown', 1, 0.4)]), SK('Vine Lash', 'enemies', 'magic', 'thorns', 3, '', [D(0.7)], { startCd: 1 })],
      [SK('Corruption Wave', 'enemies', 'magic', 'poison', 3, '', [D(0.8), DB('poison', 2, 0.5)], { startCd: 0 }), SK('Summon Vines', 'self', 'buff', 'thorns', 4, '', [{ t: 'summon', id: 'wouddruide', max: 1 }], { startCd: 1 }), SK('Root Strike', 'enemy', 'melee', 'thorns', 0, '', [D(1.1)])],
    ], { passive: 'ancientroots', passiveName: 'Ancient Roots', passiveDesc: 'Has a 20% chance to Root attackers (Speed Down).', hp: 3400, def: 70, spd: 86 }),
    dunewyrm: B('Dune Wyrm', 'Verdant', 'Sand Dragon', [
      [SK('Sand Bite', 'enemy', 'melee', 'bite', 0, '', [D(1.2), DB('bleed', 2, 0.35)]), SK('Burrow', 'self', 'buff', 'dust', 3, '', [BF('burrow', 1)], { startCd: 1 })],
      [SK('Sandstorm', 'enemies', 'magic', 'smoke', 3, '', [D(0.8), DB('accDown', 2, 0.5)], { startCd: 0 }), SK('Devour', 'lowestEnemy', 'melee', 'bite', 3, '', [D(2.0, { steal: 0.3 })], { startCd: 1 }), SK('Burrow', 'self', 'buff', 'dust', 4, '', [BF('burrow', 1)], { startCd: 2 })],
    ], { passive: 'burrower', passiveName: 'Burrow', passiveDesc: 'Occasionally burrows and becomes untargetable. Use that time to heal and buff.', hp: 3000, spd: 100 }),
    netherqueen: B('Nether Queen', 'Umbral', 'Demon Queen', [
      [SK('Shadow Bolt', 'enemy', 'magic', 'dark', 0, '', [D(1.1)]), SK('Dark Charm', 'enemy', 'magic', 'curse', 3, '', [D(0.6), DB('stun', 1, 0.5)], { startCd: 1 })],
      [SK('Summon Minions', 'self', 'buff', 'curse', 4, '', [{ t: 'summon', id: 'succubus', max: 2 }], { startCd: 0 }), SK('Nether Wave', 'enemies', 'magic', 'dark', 3, '', [D(0.75)], { startCd: 1 }), SK('Shadow Bolt', 'enemy', 'magic', 'dark', 0, '', [D(1.1)])],
      [SK('Queen’s Wrath', 'enemy', 'magic', 'dark', 2, '', [D(2.0)], { startCd: 0 }), SK('Mass Silence', 'enemies', 'magic', 'curse', 4, '', [D(0.5), DB('silence', 2, 0.6)], { startCd: 1 }), SK('Shadow Bolt', 'enemy', 'magic', 'dark', 0, '', [D(1.15)])],
    ], { passive: 'darkdominion', passiveName: 'Dark Dominion', passiveDesc: 'Umbral allies deal 20% more damage while she lives.', hp: 3200, spd: 106 }),
    grakk: B('Warlord Grakk', 'Ember', 'Orc', [
      [SK('Heavy Smash', 'enemy', 'melee', 'smash', 0, '', [D(1.2)]), SK('War Cry', 'allies', 'buff', 'buff', 4, '', [BF('atkUp', 2)], { startCd: 1 })],
      [SK('Berserker Rage', 'self', 'buff', 'buff', 4, '', [BF('atkUp', 2), BF('spdUp', 2)], { startCd: 0 }), SK('Cleave', 'enemies', 'melee', 'slash', 3, '', [D(0.8), DB('bleed', 2, 0.4)], { startCd: 1 }), SK('Heavy Smash', 'enemy', 'melee', 'smash', 0, '', [D(1.25)])],
    ], { passive: 'warlord', passiveName: 'Bloodlust', passiveDesc: 'Gains Attack Up after killing a target.', hp: 2400, spd: 98, breakMax: 24 }),
    frostwitch: B('Frostwitch Matriarch', 'Frost', 'Witch', [
      [SK('Ice Bolt', 'enemy', 'magic', 'water', 0, '', [D(1.1)]), SK('Frost Curse', 'enemy', 'magic', 'curse', 3, '', [D(0.7), DB('defDown', 2, 0.6)], { startCd: 1 })],
      [SK('Blizzard', 'enemies', 'magic', 'water', 3, '', [D(0.75)], { startCd: 0 }), SK('Freeze', 'enemy', 'magic', 'water', 3, '', [D(0.6), DB('freeze', 1, 0.6)], { startCd: 1 }), SK('Ice Bolt', 'enemy', 'magic', 'water', 0, '', [D(1.1)])],
      [SK('Absolute Frost', 'enemies', 'magic', 'water', 3, '', [D(1.0)], { startCd: 0 }), SK('Mass Freeze', 'enemies', 'magic', 'water', 5, '', [DB('freeze', 1, 0.4)], { startCd: 1 }), SK('Ice Bolt', 'enemy', 'magic', 'water', 0, '', [D(1.15)])],
    ], { passive: 'frozencurse', passiveName: 'Frozen Curse', passiveDesc: 'Her damaging attacks have a 30% chance to apply Speed Down.', hp: 3000, spd: 104 }),
    serpentpriest: B('Serpent Priest', 'Verdant', 'Serpent', [
      [SK('Venom Strike', 'enemy', 'magic', 'poison', 0, '', [D(1.05), DB('poison', 2, 0.5)]), SK('Poison Cloud', 'enemies', 'magic', 'poison', 3, '', [D(0.5), DB('poison', 2, 0.6)], { startCd: 1 })],
      [SK('Serpent Summon', 'self', 'buff', 'poison', 4, '', [{ t: 'summon', id: 'hagedisstrijder', max: 2 }], { startCd: 0 }), SK('Venomous Storm', 'enemies', 'magic', 'poison', 3, '', [D(0.8), DB('poison', 3, 0.7)], { startCd: 1 }), SK('Venom Strike', 'enemy', 'magic', 'poison', 0, '', [D(1.05)])],
    ], { passive: 'venomfaith', passiveName: 'Venomous Faith', passiveDesc: 'Poison applied by its side deals 50% more damage.', hp: 3000, spd: 102 }),
    doomharvester: B('Doom Harvester', 'Storm', 'Death Knight', [
      [SK('Scythe Strike', 'enemy', 'melee', 'slash', 0, '', [D(1.2)]), SK('Death Mark', 'random', 'magic', 'curse', 3, '', [DB('mark', 2, 1)], { startCd: 1 })],
      [SK('Harvest Souls', 'enemies', 'melee', 'slash', 3, '', [D(0.8, { steal: 0.2 })], { startCd: 0 }), SK('Chain Lightning', 'random', 'magic', 'rune', 3, '', [D(0.55)], { hits: 4, startCd: 1 }), SK('Scythe Strike', 'enemy', 'melee', 'slash', 0, '', [D(1.2)])],
      [SK('Doom', 'enemy', 'melee', 'dark', 2, '', [D(2.2, { execute: [0.4, 0.6] })], { startCd: 0 }), SK('Soul Harvest', 'enemies', 'magic', 'dark', 3, '', [D(0.9, { steal: 0.3 })], { startCd: 1 }), SK('Scythe Strike', 'enemy', 'melee', 'slash', 0, '', [D(1.25)])],
    ], { passive: 'deathmark', passiveName: 'Death Mark', passiveDesc: 'Periodically marks a hero. Marked heroes take 30% more damage.', hp: 3200, spd: 108 }),
    crystaltitan: B('Crystal Titan', 'Aether', 'Crystal Golem', [
      [SK('Crystal Smash', 'enemy', 'melee', 'smash', 0, '', [D(1.2)]), SK('Arcane Beam', 'enemy', 'magic', 'holy', 3, '', [D(1.6)], { startCd: 1 })],
      [SK('Crystal Prison', 'enemy', 'magic', 'rune', 3, '', [D(0.8), DB('stun', 1, 0.6)], { startCd: 0 }), SK('Shatterstorm', 'enemies', 'magic', 'rune', 3, '', [D(0.9)], { startCd: 1 }), SK('Crystal Smash', 'enemy', 'melee', 'smash', 0, '', [D(1.2)])],
    ], { passive: 'aethercore', passiveName: 'Aether Core', passiveDesc: 'Immune to affinity modifiers: every hit is a Normal Hit. Aether attacks deal 50% more Break Damage.', hp: 3300, def: 75, spd: 94 }),
    vampirelord: B('Vampire Lord', 'Umbral', 'Vampire', [
      [SK('Vampiric Strike', 'enemy', 'melee', 'claw', 0, '', [D(1.15)]), SK('Blood Drain', 'enemy', 'magic', 'blood', 3, '', [D(1.4, { steal: 0.5 })], { startCd: 1 })],
      [SK('Bat Swarm', 'random', 'magic', 'blood', 3, '', [D(0.5)], { hits: 5, startCd: 0 }), SK('Blood Shield', 'self', 'buff', 'shield', 4, '', [SH(0.2, 2)], { startCd: 1 }), SK('Vampiric Strike', 'enemy', 'melee', 'claw', 0, '', [D(1.15)])],
      [SK('Eternal Hunger', 'enemy', 'melee', 'bite', 2, '', [D(2.0, { steal: 0.5 })], { startCd: 0 }), SK('Mass Drain', 'enemies', 'magic', 'blood', 3, '', [D(0.8, { steal: 0.4 })], { startCd: 1 }), SK('Vampiric Strike', 'enemy', 'melee', 'claw', 0, '', [D(1.2)])],
    ], { passive: 'bloodfeast', passiveName: 'Blood Feast', passiveDesc: 'Heals for 25% of all damage he deals.', hp: 3200, spd: 108 }),
    lizardking: B('Lizard King', 'Verdant', 'Lizardman', [
      [SK('Scale Strike', 'enemy', 'melee', 'stab', 0, '', [D(1.15)]), SK('Tail Sweep', 'enemies', 'slam', 'quake', 3, '', [D(0.7)], { startCd: 1 })],
      [SK('King’s Roar', 'allies', 'buff', 'buff', 4, '', [BF('atkUp', 2), BF('defUp', 2)], { startCd: 1 }), SK('Summon Lizardmen', 'self', 'buff', 'thorns', 4, '', [{ t: 'summon', id: 'hagedisstrijder', max: 2 }], { startCd: 0 }), SK('Scale Strike', 'enemy', 'melee', 'stab', 0, '', [D(1.2)])],
    ], { passive: 'scalearmor', passiveName: 'Scale Armor', passiveDesc: 'Takes 25% less damage from melee attacks.', hp: 2600, spd: 98, breakMax: 24 }),
    chaosabom: B('Chaos Abomination', 'Aether', 'Aberration', [
      [SK('Chaos Strike', 'enemy', 'melee', 'bite', 0, '', [D(1.2)]), SK('Random Debuff', 'enemies', 'magic', 'curse', 3, '', [{ t: 'randomDebuff' }], { startCd: 1 })],
      [SK('Mutation', 'self', 'buff', 'blood', 4, '', [HEAL(0.1), BF('atkUp', 2)], { startCd: 1 }), SK('Chaos Wave', 'enemies', 'magic', 'blood', 3, '', [D(0.85)], { startCd: 0 }), SK('Chaos Strike', 'enemy', 'melee', 'bite', 0, '', [D(1.2)])],
      [SK('Absolute Chaos', 'enemies', 'magic', 'blood', 2, '', [D(0.9), { t: 'randomDebuff' }], { startCd: 0 }), SK('Chaos Wave', 'enemies', 'magic', 'blood', 3, '', [D(0.9)], { startCd: 1 }), SK('Chaos Strike', 'enemy', 'melee', 'bite', 0, '', [D(1.25)])],
    ], { passive: 'chaoticform', passiveName: 'Chaotic Form', passiveDesc: 'At the start of each phase it gains a random buff.', hp: 3400, spd: 100 }),
    stonedragon: B('Ancient Stone Dragon', 'Frost', 'Dragon', [
      [SK('Stone Breath', 'enemies', 'magic', 'smoke', 0, '', [D(0.7)]), SK('Claw Strike', 'enemy', 'melee', 'claw', 3, '', [D(1.5)], { startCd: 1 })],
      [SK('Avalanche', 'enemies', 'slam', 'quake', 3, '', [D(0.9), DB('stun', 1, 0.25)], { startCd: 0 }), SK('Stone Armor', 'self', 'buff', 'shield', 4, '', [BF('defUp', 3), SH(0.12, 2)], { startCd: 1 }), SK('Claw Strike', 'enemy', 'melee', 'claw', 0, '', [D(1.3)])],
      [SK('Ancient Roar', 'enemies', 'magic', 'dark', 4, '', [DB('atkDown', 2, 0.6), BF('atkUp', 2, 'self')], { startCd: 0 }), SK('Mountainfall', 'enemies', 'magic', 'meteor', 3, '', [D(1.1)], { startCd: 1 }), SK('Claw Strike', 'enemy', 'melee', 'claw', 0, '', [D(1.35)])],
    ], { passive: 'ancientscales', passiveName: 'Ancient Scales', passiveDesc: '+60% Defense until its first Affinity Break.', hp: 3600, def: 72, spd: 94, breakMax: 40 }),
  };
  const BOSS_PW = {"grakk":0.95,"lizardking":0.6,"plaguelord":1.32,"boneking":0.55,"frostcolossus":1.74,"ashenphoenix":0.88,"celestial":1.49,"treant":0.76,"dunewyrm":1.29,"stormbehemoth":1.13,"ironjuggernaut":1.27,"serpentpriest":0.84,"bloodempress":0.67,"voidtitan":0.76,"brimstone":0.94,"shadowlich":1.05,"frostwitch":1.79,"sealeviathan":1.68,"overlord":0.77,"netherqueen":0.86,"vampirelord":0.74,"doomharvester":1.13,"crystaltitan":1.61,"chaosabom":1.05,"stonedragon":1.29};
  for (const id in BOSS_PW) BOSSES[id].pw = BOSS_PW[id];
  const BOSS_ORDER = ['grakk', 'lizardking', 'plaguelord', 'boneking', 'frostcolossus', 'ashenphoenix', 'celestial', 'treant', 'dunewyrm', 'stormbehemoth', 'ironjuggernaut', 'serpentpriest', 'bloodempress', 'voidtitan', 'brimstone', 'shadowlich', 'frostwitch', 'sealeviathan', 'overlord', 'netherqueen', 'vampirelord', 'doomharvester', 'crystaltitan', 'chaosabom', 'stonedragon'];
  const ALL_UNITS = Object.assign({}, ENEMIES, BOSSES);

  // ---------- Campaign ----------
  // 10 chapters x 7 stages. Stage 1-6 each drop a fixed gear slot, stage 7 (chapter boss) a random one.
  // Chapter names/settings are placeholders.
  const CHAPTERS = [
    // pool[0] = regular foes, pool[1] = elites; stages mix them per phase (see stageGroup), so bigger pools mean more variety
    // Chapter I builds the team: the starter fights alone in stage 1, the first clears of stages 1-3 add Draelyn, Bromir and Skavren
    { name: 'The Fallen Kingdom', set: 'krijger', desc: 'The heroes begin in a fallen realm, overrun by monsters and darkness.', area: 0, pool: [['botkrijger', 'gravestalker', 'cryptschutter', 'ashgoblin', 'zombie'], ['hellehond', 'cultist', 'cryptguard']], boss: 'grakk', adds: ['ashgoblin', 'cultist'], unlock: { 0: 'draelyn', 1: 'bromir', 2: 'skavren', 3: 'karnok', 6: 'morgrim' }, shapes: { 0: [1, 0], 1: [2, 0], 2: [2, 0] },
      // stage 1 is a solo fight for any starter: mixed essences, so no starter faces only foes it is weak against
      first: [['ashgoblin'], ['cryptschutter'], ['zombie']] },
    { name: 'Whispers of the Dead', set: 'levensbron', desc: 'Ancient ruins, the undead and secrets of the past come to light.', area: 0, pool: [['cryptguard', 'botkrijger', 'gravestalker', 'cryptschutter', 'schim', 'grimtar'], ['skeletridder', 'soulreaver', 'doodsmagier', 'dreadarcher', 'banshee', 'zulgroth']], boss: 'boneking', adds: ['cryptguard', 'dreadarcher'], unlock: { 2: 'grythor', 6: 'vorlund' } },
    { name: 'The Blighted Wilds', set: 'precisie', desc: 'A cursed forest where nature itself has been corrupted.', area: 3, pool: [['mosscrawler', 'hagedisstrijder', 'thornbeast', 'hagedissjamaan', 'wouddruide'], ['rotvineshambler', 'hagedisbruut', 'moerasheks', 'pestbrenger']], boss: 'treant', adds: ['mosscrawler', 'rotvineshambler'], unlock: { 2: 'vaessa', 6: 'valkessa' } },
    { name: 'Embers of War', set: 'vlammenhart', desc: 'War rages across the land as demonic forces rise.', area: 4, pool: [['ashgoblin', 'cinderhound', 'hellehond', 'flameberserker', 'cultist', 'bloodsnarl'], ['hellfireshaman', 'helsebruut', 'magmabrute', 'succubus', 'gevallenridder', 'krogash']], boss: 'overlord', adds: ['flameberserker'], unlock: { 2: 'brukkar' } },
    { name: 'The Frozen Wastes', set: 'wilgenbast', desc: 'A desolate northern land, ravaged by eternal frost.', area: 1, pool: [['frostfangwolf', 'iceboundknight', 'schim', 'skeletridder'], ['frostbornwitch', 'ijselementaal', 'glacierbrute', 'steengolem']], boss: 'frostcolossus', adds: ['frostfangwolf'], unlock: { 6: 'faedrin' } },
    { name: 'Kingdom of Shadows', set: 'vampierbloed', desc: 'The heroes enter a realm ruled entirely by Umbral forces.', area: 2, pool: [['vampier', 'soulreaver', 'gevallenridder', 'dreadarcher', 'cultist'], ['gravewarden', 'banshee', 'bloedpriesteres', 'doodsmagier']], boss: 'netherqueen', adds: ['vampier'] },
    { name: 'The Stormbound Realm', set: 'windloper', desc: 'A ruined land where endless storms and elemental beings reign.', area: 1, pool: [['stormimp', 'thunderraider', 'tempestharpy', 'steengolem'], ['stormcaller', 'thundergolem', 'frozenhorror', 'ijselementaal']], boss: 'stormbehemoth', adds: ['thunderraider'] },
    { name: 'The Forsaken Gods', set: 'scherpte', desc: 'The heroes discover that ancient divine powers are behind everything.', area: 2, pool: [['cultist', 'hellfireshaman', 'gevallenridder', 'soulreaver', 'doodsmagier'], ['bogreaper', 'cultgruwel', 'gravewarden', 'succubus', 'banshee']], boss: 'celestial', adds: ['doodsmagier', 'cultist'] },
    { name: 'The Shattered Fate', set: 'vernieling', desc: 'Reality starts to fall apart, and the true origin of the Fate Shards is revealed.', area: 2, pool: [['schim', 'stormimp', 'banshee', 'frozenhorror', 'cultgruwel'], ['woodwraith', 'afgrondsduivel', 'glacierbrute', 'ijselementaal', 'helsebruut']], boss: 'crystaltitan', adds: ['cultgruwel'], unlock: { 6: 'thalnir' } },
    { name: 'Fate Forged', set: 'lotsbestemming', desc: 'The final battle. The heroes must forge their own fate and face the evil behind the world.', area: 4, pool: [['gevallenridder', 'thunderraider', 'afgrondsduivel', 'flameberserker', 'cultgruwel'], ['magmabrute', 'helsebruut', 'stormcaller', 'krokodilbeest', 'bogreaper', 'succubus']], boss: 'voidtitan', adds: ['afgrondsduivel', 'gevallenridder'] },
  ];
  const STAGE_SLOTS = ['wapen', 'helm', 'schild', 'handschoenen', 'borstpantser', 'laarzen', null];
  // how many foes and how many of them from the elite pool, per stage 1-6
  const STAGE_SHAPE = [[2, 0], [3, 0], [3, 1], [4, 1], [3, 2], [4, 2]];
  // Every stage is fought in 3 phases of equal size and level. `foes` is the last phase (shown on the stage tile).
  const PHASES = 3;
  // s = stage (0-5) for the pool offsets, [n, elite] = group size and elites (chapter `shapes` override STAGE_SHAPE),
  // k = variant (k 0 is the original line-up, 1 and 2 shuffle the chapter pool)
  function stageGroup(ch, c, s, k) {
    const [n, elite] = (ch.shapes && ch.shapes[s]) || STAGE_SHAPE[s], base = ch.pool[0], hi = ch.pool[1], foes = [];
    for (let j = 0; j < n; j++) foes.push(j >= n - elite ? hi[(j + s + c + k) % hi.length] : base[(j + s * 2 + c + k * 2) % base.length]);
    return foes;
  }
  const STAGES = [];
  CHAPTERS.forEach((ch, c) => {
    for (let s = 0; s < 7; s++) {
      const lvl = 1 + c * 6 + s;
      const foes = s === 6 ? [ch.boss, ...ch.adds] : s === 0 && ch.first ? ch.first[2] : stageGroup(ch, c, s, 0);
      const shape = Math.min(s, STAGE_SHAPE.length - 1);
      const phases = s === 0 && ch.first ? ch.first : [stageGroup(ch, c, shape, 1), stageGroup(ch, c, shape, 2), foes];
      STAGES.push({ chapter: c, n: s, lvl, foes, phases, slot: STAGE_SLOTS[s], set: ch.set, area: ch.area, boss: s === 6 ? BOSSES[ch.boss].name : null, unlock: ch.unlock && ch.unlock[s] });
    }
  });
  // Campaign difficulties: the whole campaign again at a higher level band. Enemy level = base + stage level × slope,
  // so a harder difficulty is a challenge from its first chapter on (not trivial early and a wall late), and the
  // chapter-to-chapter growth (chDiff) is squeezed by `spread`; `f` makes every enemy stronger.
  // Each one opens when every stage of the previous one is cleared. `rars` = the only gear rarities that drop
  // (the higher one is rarer, see stageLoot). Easy is the base campaign that campaign-sim.cjs tunes.
  const DIFFS = [
    { id: 'easy', name: 'Easy', base: 0, slope: 1, f: 1, spread: 1, rars: [1, 2] },
    { id: 'normal', name: 'Normal', base: 18, slope: 0.75, f: 1.5, spread: 0.75, rars: [2, 3] },
    { id: 'hard', name: 'Hard', base: 30, slope: 0.65, f: 2.1, spread: 0.7, rars: [3, 4] },
    { id: 'brutal', name: 'Brutal', base: 40, slope: 0.6, f: 2.4, spread: 0.65, rars: [4] },
    { id: 'nightmare', name: 'Nightmare', base: 50, slope: 0.55, f: 2.9, spread: 0.6, rars: [4, 5] },
  ];
  // enemy level of a campaign stage on difficulty d
  const diffLvl = (st, d) => { const D = DIFFS[d || 0]; return Math.round(D.base + st.lvl * D.slope); };
  // gear drop options for a campaign stage: the higher rarity gets likelier in later chapters and on the boss stage
  function stageLoot(st, d) {
    const D = DIFFS[d || 0], hi = D.rars[D.rars.length - 1];
    const up = hi === 5 ? 0.06 + st.chapter * 0.015 + (st.n === 6 ? 0.06 : 0) : 0.15 + st.chapter * 0.035 + (st.n === 6 ? 0.15 : 0);
    return { rars: D.rars, up: Math.min(0.6, up) };
  }
  // Boss Hall gear: the loot of the level's campaign difficulty (bossDiff): levels 1-2 Easy (Uncommon/Rare),
  // 3-4 Normal (Rare/Epic), 5-6 Hard (Epic/Legendary), 7-8 Brutal (Legendary), 9-10 Nightmare (Legendary/Mythical).
  // The higher rarity is a bit likelier on the second level of a pair.
  const bossDiff = n => Math.min(DIFFS.length - 1, Math.floor((n - 1) / 2));
  const bossLoot = n => { const D = DIFFS[bossDiff(n)], hi = D.rars[D.rars.length - 1]; return { rars: D.rars, up: (hi === 5 ? 0.06 : 0.2) + (n - 1) % 2 * (hi === 5 ? 0.04 : 0.1) }; };
  // Campaign difficulty (the grind): enemies get stronger than same-level heroes chapter by chapter (chDiff per chapter,
  // squeezed by each difficulty's spread), chBoss scales the chapter boss itself, bossWall the whole boss stage.
  // Rewards per win are scaled by xp/silver. Tuned with campaign-sim.cjs (Easy) and balance-sim.html (all difficulties):
  // Easy takes a new player ~1,400-2,900 battles; all five difficulties together ~5,000-16,000 for most players, and
  // unlucky rosters hit a wall on Nightmare that only better heroes (Ancient+ summons) and Mythical upgrades get past.
  // Late chapters need summoned Epic/Legendary heroes and upgraded gear; levels alone are not enough.
  const TUNE = { chDiff: 0.15, bossWall: 1, chBoss: 0.7, wall: 1.4, hit: 0.75, foeHp: 1.5, hitFrom: 2, rest: 0.15, xp: 1, silver: 1 };
  // Chapters I-II play at the base level; from Chapter III on every chapter adds chDiff
  // strength factor of a stage on difficulty d: chapters I-II at the base, from Chapter III on +chDiff per chapter
  // (squeezed by the difficulty's spread), times the difficulty's f and bossWall on the boss stage
  const stageDiff = (st, d) => { const D = DIFFS[d || 0]; return D.f * (1 + TUNE.chDiff * Math.max(0, st.chapter - 1) * D.spread) * (st.n === 6 ? TUNE.bossWall : 1); };
  function toughen(u, f) { u.maxHp = u.hp = Math.round(u.maxHp * f); u.atk = Math.round(u.atk * f); return u; }
  // chapter bosses fight a few levels below the stage level (they bring adds); p = phase index, default the last phase
  // d = difficulty index (DIFFS); lvl already includes the difficulty's level bonus
  // chBoss scales only the chapter boss itself (not its adds), so a boss stage is a step up and not a wall
  // STAGE_PW: per-stage correction from Chapter III on, calibrated by simulation (4 end-of-Easy teams, the enemy
  // strength at which each stage is won half the time, compared with a smooth ~4.8%-per-stage curve; 75% of the
  // correction is applied). It removes the spikes (4-foe elite stages, chapter bosses) that were walls, and keeps a
  // chapter's boss a bit harder than its first stage.
  const STAGE_PW = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.34, 1.04, 1.07, 0.78, 0.92, 0.77, 0.77, 1.46, 1.19, 1.04, 0.87, 1, 0.85, 0.85, 1.59, 1.17, 1.04, 0.87, 0.95, 0.85, 0.83, 1.36, 1.03, 1.04, 0.84, 1.01, 0.85, 0.87, 1.36, 1.09, 0.98, 0.85, 1, 0.86, 0.82, 1.35, 1.06, 1.05, 0.89, 1.11, 0.87, 0.79, 1.45, 1.18, 1.14, 0.89, 0.96, 0.81, 0.9, 1.4, 1.07, 1.08, 0.85, 1.03, 0.95, 0.93];
  // Walls: two stages per chapter (from Chapter II on, never the boss stage) are a clear step up (TUNE.wall), so the
  // player has to go back and farm earlier stages for gear and levels. Spread over the chapter by hand so they differ.
  const WALLS = [[], [2, 4], [1, 4], [3, 5], [2, 5], [1, 3], [3, 4], [2, 5], [1, 4], [3, 5]];
  const isWall = st => WALLS[st.chapter].includes(st.n);
  // Attrition: from Chapter III (TUNE.hitFrom) on, regular campaign enemies (not the chapter bosses) hit softer (TUNE.hit)
  // but have more HP (TUNE.foeHp). Fights last longer and the damage comes as a steady stream, which healing absorbs and a
  // team without healing does not: measured, a team without a healer then needs ~1.4x the power, one with a healer about
  // the same as before. (Harder hits did the opposite: burst kills heroes before a healer can help.)
  const attrition = (u, st) => { if (!u.isBoss && st.chapter >= TUNE.hitFrom) { u.atk = Math.round(u.atk * TUNE.hit); u.maxHp = u.hp = Math.round(u.maxHp * TUNE.foeHp); } return u; };
  // Easy Chapter I · Stage 1 is the starter's solo fight: soft enough that every starter, even an Uncommon, wins it
  const FIRST_PW = 0.7;
  const stageUnits = (st, lvl, p, d) => (p == null ? st.foes : st.phases[p]).map(f => attrition(toughen(enemyUnit(f, BOSSES[f] ? Math.max(1, lvl - 3) : lvl), stageDiff(st, d) * STAGE_PW[st.chapter * 7 + st.n] * (!d && !st.chapter && !st.n ? FIRST_PW : 1) * (isWall(st) ? TUNE.wall : 1) * (BOSSES[f] ? TUNE.chBoss : 1)), st));
  // ---------- Tower of Essence: six essence towers (only heroes of that essence) and the Tower of Fate (all heroes) ----------
  // One fight per floor (no phases), each floor won once. Floor f: enemy level and strength climb from Easy Chapter I to
  // past the end of Brutal (t = how far up, curved: gentle at first, steep near the top) while the team is limited to one
  // essence, so a Brutal player has to work for the last floors. Higher floors bring more enemies whose essence beats
  // the tower's. Every 10th floor a boss with guards (boss × TOWER.boss). The seventh tower, the Tower of Fate (`All`),
  // takes heroes of every essence: a free pick of the best mix, so its foes are × TOWER.open (boss floors × openBoss);
  // measured with four Legendaries it ends about where the essence towers do. Measured (best Ember team; floor still won half
  // the time): a Chapter III-IV team ~60, Easy done ~130, Brutal start ~200, Brutal done ~270, Nightmare done ~300 (floor
  // 300 itself ~20% a try). Teams without a Legendary stop 30-70 floors earlier.
  // curve: [floor, enemy level, strength] points, straight lines in between (calibrated by simulation, see CLAUDE.md)
  const TOWERS = ['Ember', 'Verdant', 'Storm', 'Frost', 'Radiant', 'Umbral', 'All'];
  const TOWER = { floors: 300, curve: [[1, 1, 0.9], [50, 25, 2.0], [100, 45, 4.3], [200, 65, 7.4], [300, 85, 10.5]], boss: 0.45, open: 2, openBoss: 1.15, solo: [3, 1.7, 1.25, 1] };
  function towerFloor(f) {
    const c = TOWER.curve, i = Math.max(1, c.findIndex(p => p[0] >= f)), [f0, l0, s0] = c[i - 1], [f1, l1, s1] = c[i], k = (f - f0) / (f1 - f0);
    return { lvl: Math.round(l0 + (l1 - l0) * k), str: s0 + (s1 - s0) * k, boss: f % 10 === 0, t: (f - 1) / (TOWER.floors - 1) };
  }
  // the enemies of floor f in the tower of essence ess: the same every time (picked with a hash of tower and floor)
  function towerFoes(ess, f) {
    const ei = ESSENCES.indexOf(ess), F = towerFloor(f);
    const h = n => { let x = ((ei + 1) * 7919 + f * 104729 + n * 1299709) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
    const all = Object.keys(ENEMIES), counter = all.filter(id => ess !== 'All' && BEATS[ENEMIES[id].aff] === ess), rest = all.filter(id => !counter.includes(id));
    const n = f <= 20 ? 2 : 3, out = [];
    for (let i = 0; i < n; i++) { const pool = counter.length && h(i * 2) < 0.15 + 0.4 * F.t ? counter : rest; out.push(pool[Math.floor(h(i * 2 + 1) * pool.length)]); }
    if (F.boss) out[0] = BOSS_ORDER[(f / 10 - 1) % BOSS_ORDER.length];
    return out;
  }
  // a smaller team meets tougher foes (TOWER.solo by team size), so a single strong hero cannot solo the tower
  function towerUnits(ess, f, n) {
    const F = towerFloor(f), st = { chapter: f >= 60 ? TUNE.hitFrom : 0 };
    // every tower foe enrages like a Boss Hall boss (u.hall), so a fight that neither side can win ends within ~30 turns
    return towerFoes(ess, f).map(id => { const u = attrition(toughen(enemyUnit(id, BOSSES[id] ? Math.max(1, F.lvl - 3) : F.lvl), F.str * (BOSSES[id] ? TOWER.boss : 1) * (ess !== 'All' ? 1 : F.boss ? TOWER.openBoss : TOWER.open) * TOWER.solo[Math.max(1, Math.min(4, n || 4)) - 1]), st); u.hall = true; return u; });
  }
  // first-clear reward of floor f: Sigils and hero XP every floor; shards and stones on boss floors and milestones
  function towerReward(f) {
    const F = towerFloor(f), o = { silver: Math.round(winSilver(F.lvl) * 0.6), xp: winXp(F.lvl), fs: {}, st: {} };
    if (F.boss) { o.fs.fate = 1; o.st.lesser = 2; }
    if (f % 30 === 0) { o.fs.greater = 1; o.st.greater = 1; }
    if (f % 50 === 0) o.fs.ancient = 1;
    if (f % 100 === 0) o.st.ancient = 1;
    if (f === TOWER.floors) o.fs.mythic = 1;
    return o;
  }
  // between phases: survivors recover 15% HP, cooldowns reset, buffs and debuffs end; the fallen stay down
  function phaseRest(heroes) {
    for (const u of heroes) {
      if (!u.alive) continue;
      u.hp = Math.min(u.maxHp, Math.round(u.hp + u.maxHp * TUNE.rest));
      u.effects = []; u.tm = rnd() * 20;
      for (const s of u.skills) s.cdLeft = 0;
    }
  }
  // a new player picks one starter; the rest of the team is earned in Chapter I (see CHAPTERS[0].unlock)
  // the eight Uncommons a new player picks from (every one of them is also a campaign unlock, see CHAPTERS)
  const STARTERS = ['bromir', 'grythor', 'skavren', 'draelyn', 'vaessa', 'brukkar', 'karnok', 'vorlund', 'grimtar', 'krogash', 'zulgroth', 'bloodsnarl'];
  // when a campaign unlock is the player's own starter, that stage gives this Rare of a similar role instead, so the
  // team still grows the same way whichever starter was picked
  const STARTER_SUB = { bromir: 'ravok', grythor: 'korran', skavren: 'orvyn', draelyn: 'selenia', vaessa: 'mirella', brukkar: 'keldrax', karnok: 'gorvann', vorlund: 'theryn' };
  const stageUnlock = (st, starter) => (st.unlock && st.unlock === starter && STARTER_SUB[starter]) || st.unlock || null;
  // legacy starting roster, only used to migrate very old saves
  const START_ROSTER = ['bromir', 'grythor', 'skavren', 'draelyn', 'vaessa', 'brukkar'];
  const START_TEAM = ['bromir', 'grythor', 'skavren', 'draelyn'];
  const xpNeed = lvl => 60 * lvl + 6 * lvl * lvl;
  // rewards per cleared stage or Boss Hall level; kept low on purpose so progress needs replays (see TUNE)
  const winXp = lvl => Math.round(TUNE.xp * (40 + lvl * 28));
  const winSilver = lvl => Math.round(TUNE.silver * (120 + lvl * 60));

  // ---------- Energy (like RAID) ----------
  // Every campaign stage and Boss Hall level costs energy when it starts (won or lost); energy refills by 1 every
  // regenMin minutes up to energyMax (base + player level), and a player level-up adds energy on top (app.js levelEnergy:
  // a full bar up to level 15, then 60; it may go over
  // the max; it then stops refilling until it is below the max again). Easy Chapter I is free: the tutorial chapter.
  // Arena and guild boss have their own tokens and keys. Pace (campaign-sim battles × cost against ~480 a day plus
  // level-ups): Easy about a week and a half, all five difficulties a few months, as in RAID.
  const ENERGY = { base: 100, regenMin: 3, stage: [3, 4, 6, 8, 10], boss: 6 };
  const energyMax = plvl => ENERGY.base + (plvl || 1);
  // Easy Chapter I is free the first time through (new players never wait); a replay costs like the rest of Easy
  const stageEnergy = (st, d, first) => (!d && st.chapter === 0 && first ? 0 : ENERGY.stage[d || 0]);
  const bossEnergy = n => ENERGY.boss + n;
  // ---------- Expeditions (the ship): one at a time, up to EXP_HEROES heroes that are in none of the player's teams ----------
  // Each hero gets xp × winXp(lvl) XP (a won stage gives 1×; a hero at its level cap passes its share to the rest of the crew) and the trip brings silver × winSilver(lvl) Sigils, with lvl
  // the player's campaign level. Per hour that is 3 (1 h), 2 (12 h) and 1.5 (24 h) stages' worth: far below fighting,
  // where a day of energy pays ~160 Easy stages for the whole team. fs / st: [kind, n]; n ≥ 1 is that many, below 1 the
  // chance of one.
  const EXP_HEROES = 4;
  const EXPEDITIONS = [
    { id: 'coast', name: 'Coastal Patrol', hours: 1, xp: 3, silver: 1.5, desc: 'A short sail along the coast to chase off raiders.', fs: [['fate', 0.15]], st: [['lesser', 1]] },
    { id: 'ruins', name: 'The Sunken Ruins', hours: 12, xp: 24, silver: 12, desc: 'Dive for relics in a drowned city off the cliffs.', fs: [['fate', 1], ['greater', 0.3]], st: [['lesser', 4], ['greater', 0.25]] },
    { id: 'isles', name: 'The Far Isles', hours: 24, xp: 36, silver: 20, desc: 'A long voyage to uncharted islands at the edge of the map.', fs: [['fate', 2], ['greater', 1], ['ancient', 0.05]], st: [['lesser', 8], ['greater', 1], ['ancient', 0.1]] },
  ];
  // the rewards of a finished expedition (rolled once, when it is collected)
  function expReward(k, lvl) {
    const E0 = EXPEDITIONS[k], roll = list => { const o = {}; for (const [t, n] of list) { const c = n >= 1 ? n : rnd() < n ? 1 : 0; if (c) o[t] = (o[t] || 0) + c; } return o; };
    return { xp: Math.round(E0.xp * winXp(lvl)), silver: Math.round(E0.silver * winSilver(lvl)), fs: roll(E0.fs), st: roll(E0.st) };
  }
  // ---------- Boss Hall ----------
  const BOSS_LEVELS = 10;
  // Every Boss Hall level plays like a campaign stage, so the Boss Hall is never a shortcut to better gear:
  // boss i belongs to chapter floor(i × 10 / 25); every two levels are one campaign difficulty (bossDiff: 1-2 Easy,
  // 3-4 Normal, 5-6 Hard, 7-8 Brutal, 9-10 Nightmare, whose loot bossLoot hands out), the first level of a pair like
  // that chapter's third stage, the second like its boss stage. Enemies get that stage's level and
  // strength, times BOSS_ROOM for the boss room.
  const BOSS_ROOM = 1.1;
  function bossRoom(i, n) {
    const c = Math.min(CHAPTERS.length - 1, Math.floor(i * CHAPTERS.length / BOSS_ORDER.length));
    const d = bossDiff(n), st = STAGES[c * 7 + [2, 6][(n - 1) % 2]];
    return { lvl: diffLvl(st, d), f: stageDiff(st, d) * BOSS_ROOM, d };
  }
  const bossLvl = (i, n) => bossRoom(i, n).lvl;
  // the enemies of phase p of Boss Hall level n (minions, minions, boss), toughened like the matching campaign stage
  function bossUnits(id, n, p) { const r = bossRoom(BOSS_ORDER.indexOf(id), n); return bossPhases(id, n)[p].map(f => { const u = toughen(enemyUnit(f, r.lvl), r.f); if (u.isBoss) u.hall = true; if (u.isBoss && n >= BTRAIT.from) u.trait = bossTrait(BOSS_ORDER.indexOf(id)); return n >= BLIGHT.bh ? blighted(u, r.d) : u; }); }
  // every boss drops its own set (see BOSS_SET_LIST); Fury, Nightshard, Vengeance and Ashcurse no longer drop
  const bossSets = i => ['bs_' + BOSS_ORDER[i]];
  function bossFoes(id, n) { return [id]; }
  // Boss Hall: two phases of three minions sharing the boss's essence, then the boss
  function bossPhases(id, n) {
    const i = BOSS_ORDER.indexOf(id);
    let pool = Object.keys(ENEMIES).filter(e => ENEMIES[e].aff === BOSSES[id].aff);
    if (pool.length < 2) pool = Object.keys(ENEMIES);
    const grp = k => [0, 1, 2].map(j => pool[(i + j * 2 + k * 3) % pool.length]);
    return [grp(0), grp(1), bossFoes(id, n)];
  }

  // ---------- Gear ----------
  const SLOTS = ['wapen', 'helm', 'schild', 'handschoenen', 'borstpantser', 'laarzen'];
  const SLOT_NAMES = { wapen: 'Weapon', helm: 'Helmet', schild: 'Shield', handschoenen: 'Gloves', borstpantser: 'Chestplate', laarzen: 'Boots' };
  // Campaign sets: one per chapter (see CHAPTERS[].set). Fury, Nightshard, Vengeance and Ashcurse were the old Boss Hall sets:
  // they no longer drop (every boss has its own set now, BOSS_SET_LIST) but items that have them keep working.
  const SETS = {
    krijger: { name: 'Warrior Set', n: 2, bonus: { atkP: 8, defP: 8 }, desc: '2 pieces: +8% Attack and +8% Defense' },
    levensbron: { name: 'Vitality Set', n: 2, bonus: { hpP: 15 }, desc: '2 pieces: +15% HP' },
    precisie: { name: 'Accuracy Set', n: 2, bonus: { acc: 40 }, desc: '2 pieces: +40 Accuracy' },
    vlammenhart: { name: 'Attack Set', n: 2, bonus: { atkP: 15 }, desc: '2 pieces: +15% Attack' },
    wilgenbast: { name: 'Defense Set', n: 2, bonus: { defP: 15 }, desc: '2 pieces: +15% Defense' },
    vampierbloed: { name: 'Lifesteal Set', n: 4, flag: 'lifesteal', desc: '4 pieces: heals 30% of damage dealt' },
    windloper: { name: 'Speed Set', n: 2, bonus: { spdP: 12 }, desc: '2 pieces: +12% Speed' },
    scherpte: { name: 'Critical Set', n: 2, bonus: { crit: 12 }, desc: '2 pieces: +12% Crit Rate' },
    vernieling: { name: 'Destruction Set', n: 4, bonus: { cdmg: 25 }, flag: 'pierce', desc: '4 pieces: +25% Crit Damage and attacks ignore 25% of Defense' },
    lotsbestemming: { name: 'Fate Set', n: 4, bonus: { hpP: 10, atkP: 10, defP: 10, spdP: 10 }, flag: 'fate', desc: '4 pieces: +10% HP, Attack, Defense and Speed; once per battle survives a killing blow with 1 HP' },
    woede: { name: 'Fury', n: 2, bonus: { cdmg: 20 }, desc: '2 pieces: +20% Crit Damage' },
    nachtscherf: { name: 'Nightshard', n: 4, flag: 'extraTurn', desc: '4 pieces: 18% chance of an extra turn after a critical hit' },
    wraak: { name: 'Vengeance', n: 4, flag: 'counter', desc: '4 pieces: 25% chance to counterattack when hit' },
    asvloek: { name: 'Ashcurse', n: 4, flag: 'curse', desc: '4 pieces: +25% chance for your debuffs to land' },
  };
  // Boss sets (Boss Hall): every boss drops its own six-piece set (id 'bs_' + boss id) with bonuses at 2, 4 and 6 pieces
  // (tiers): a stat at 2, a mechanic at 4 and its signature at 6. They are side-grades with a role each, not a ladder.
  // The mechanics are flags the Battle reads (see "boss set" in Battle). Wearing 4 or more pieces from boss sets of one
  // essence, spread over at least two different sets, adds that essence's family bonus (SET_FAMILY).
  const BOSS_SET_LIST = [
    ['grakk', "Warlord's Trophies", 'Ember', 'Bruiser', { atkP: 12 }, '+12% Attack',
      'killAtkUp', 'defeating an enemy grants Attack Up for 2 turns',
      'warlord', 'defeating an enemy fills 30% Turn Meter; +15% damage to enemies below 50% HP'],
    ['lizardking', 'Scales of the Swamp King', 'Verdant', 'Bruiser', { defP: 12 }, '+12% Defense',
      'strongRes', 'take 15% less damage from Strong Hits',
      'critCounter', 'when hit by a critical hit, strike back'],
    ['plaguelord', "Plaguebearer's Rags", 'Verdant', 'Poison', { acc: 30 }, '+30 Accuracy',
      'poisonHit', 'your hits have a 25% chance to Poison for 2 turns',
      'plague', 'your Poisons also apply Heal Reduction'],
    ['boneking', 'Ossuary Regalia', 'Umbral', 'Tank', { defP: 12 }, '+12% Defense',
      'fallShield', 'when an ally falls, gain a Shield of 20% of your max HP',
      'boneKing', 'once per battle, a killing blow leaves you at 1 HP with Immunity for 2 turns'],
    ['frostcolossus', 'Regalia of the Frozen Heart', 'Frost', 'Tank', { defP: 15 }, '+15% Defense',
      'skillSlow', 'skills have a 20% chance to apply Speed Down for 2 turns',
      'iceTomb', 'once per battle below 30% HP: encased in ice for 2 turns (no damage, cannot act), then a Frozen Nova hits all enemies for 80% Attack with a 40% chance to Freeze'],
    ['ashenphoenix', 'Plumes of the Ashen Phoenix', 'Ember', 'Rebirth', { hpP: 12 }, '+12% HP',
      'burnHit', 'your hits have a 20% chance to Burn for 2 turns',
      'phoenix', 'once per battle, when defeated: rise with 30% HP and Burn every enemy for 2 turns'],
    ['celestial', 'Raiment of the Celestial Choir', 'Radiant', 'Guardian', { hpP: 12 }, '+12% HP',
      'choir', 'at the start of your turn, the weakest ally heals 5% of their max HP',
      'guardian', 'once per battle, an ally who would die survives with 1 HP and is Immune for 1 turn'],
    ['treant', 'Bark of the Worldroot', 'Verdant', 'Tank', { hpP: 15 }, '+15% HP',
      'treantRegen', 'heal 3% of your max HP at the start of your turn',
      'treantWard', 'allies take 10% less damage while you are alive'],
    ['dunewyrm', 'Sandstorm Carapace', 'Verdant', 'Evasion', { spdP: 10 }, '+10% Speed',
      'accHit', 'your hits have a 30% chance to apply Accuracy Down for 2 turns',
      'sandBurrow', 'once per battle below 50% HP: burrow for 1 turn (untargetable) and gain Attack Up'],
    ['stormbehemoth', 'Thundercore Harness', 'Storm', 'Speed', { spdP: 10 }, '+10% Speed',
      'startTm', 'start the battle with +25% Turn Meter',
      'chain', 'basic attacks have a 30% chance to chain to another enemy for 40% Attack'],
    ['ironjuggernaut', 'Juggernaut Plating', 'Storm', 'Breaker', { atkP: 12 }, '+12% Attack',
      'pierce15', 'attacks ignore 15% of Defense',
      'juggernaut', 'Strong Hits deal +2 Break damage; +20% damage to Broken enemies'],
    ['serpentpriest', 'Vestments of the Coiled Faith', 'Verdant', 'Healer', { res: 30 }, '+30 Resistance',
      'healPlus', 'your heals are 20% stronger',
      'healCleanse', 'healing or shielding an ally also removes 1 debuff from them'],
    ['bloodempress', 'Crimson Court', 'Umbral', 'Lifesteal', { atkP: 12 }, '+12% Attack',
      'steal20', 'heal 20% of the damage you deal',
      'overheal', 'healing beyond full HP becomes a Shield (up to 25% of max HP)'],
    ['voidtitan', 'Void-Touched Plate', 'Umbral', 'Protector', { hpP: 15 }, '+15% HP',
      'aoeRes', 'take 15% less damage from attacks that hit all allies',
      'voidBarrier', 'at the start of battle and every 4 of your turns: a Shield of 10% of your max HP on the whole team'],
    ['brimstone', 'Brimstone Scales', 'Ember', 'Area damage', { cdmg: 15 }, '+15% Crit Damage',
      'aoeDmg', 'attacks on all enemies deal +15% damage',
      'brimstone', 'your Burns deal 50% more damage; a critical hit on a Burning enemy spreads Burn to another enemy'],
    ['shadowlich', 'Phylactery Robes', 'Umbral', 'Debuffer', { acc: 30 }, '+30 Accuracy',
      'silenceHit', 'your hits have a 20% chance to Silence for 1 turn',
      'lich', 'enemies with 2 or more of your debuffs take 15% more damage from you'],
    ['frostwitch', "Witch's Winter Veil", 'Frost', 'Control', { spdP: 10 }, '+10% Speed',
      'freezeHit', 'your hits have a 15% chance to Freeze for 1 turn',
      'frozenDmg', 'Frozen enemies take 25% more damage from you'],
    ['sealeviathan', "Tidecaller's Scales", 'Frost', 'Waves', { hpP: 15 }, '+15% HP',
      'aoeSlow', 'attacks on all enemies have a 25% chance to apply Speed Down for 2 turns',
      'tidal', 'every 3rd turn, a Tidal Wave also hits all enemies for 40% Attack'],
    ['overlord', 'Infernal Crown', 'Ember', 'Berserker', { crit: 12 }, '+12% Crit Rate',
      'fury', 'deal up to +30% damage as your HP drops',
      'overlord', 'below 40% HP: +25% Crit Damage and heal 20% of the damage you deal'],
    ['netherqueen', 'Thorns of the Nether', 'Umbral', 'Marker', { crit: 12 }, '+12% Crit Rate',
      'critMark', 'critical hits have a 40% chance to apply Death Mark for 1 turn',
      'markTm', 'hitting a Marked enemy fills 15% Turn Meter'],
    ['vampirelord', "Nightlord's Mantle", 'Umbral', 'Assassin', { spdP: 10 }, '+10% Speed',
      'startStealth', 'start the battle in Stealth for 1 turn',
      'killStealth', 'defeating an enemy grants Stealth for 1 turn and heals 15% of your max HP'],
    ['doomharvester', "Reaper's Shroud", 'Storm', 'Executioner', { crit: 12 }, '+12% Crit Rate',
      'execute20', '+20% damage to enemies below 30% HP',
      'reaper', 'attacks on enemies below 30% HP always crit'],
    ['crystaltitan', 'Prismatic Shell', 'Aether', 'Reflect', { hpP: 15 }, '+15% HP',
      'reflect', 'reflect 15% of the damage you take back to the attacker',
      'prism', 'every 3rd turn, gain Immunity for 1 turn'],
    ['chaosabom', 'Aberrant Fragments', 'Aether', 'Chaos', { cdmg: 15 }, '+15% Crit Damage',
      'chaosDebuff', 'your hits have a 20% chance to apply a random debuff for 2 turns',
      'chaosBuff', 'at the start of your turn, gain a random buff for 2 turns'],
    ['stonedragon', 'Mountainheart Armor', 'Frost', 'Tank', { defP: 15 }, '+15% Defense',
      'tauntHit', 'when hit, 20% chance to Taunt the attacker for 1 turn',
      'mountain', 'start the battle with a Shield of 25% of your max HP; when it breaks, Stun the attacker for 1 turn'],
  ];
  const bossSetId = id => 'bs_' + id;
  for (const [boss, name, ess, role, b2, d2, f4, d4, f6, d6] of BOSS_SET_LIST) {
    const tiers = [{ n: 2, bonus: b2, d: d2 }, { n: 4, flag: f4, d: d4 }, { n: 6, flag: f6, d: d6 }];
    SETS[bossSetId(boss)] = { name, boss, ess, role, n: 2, tiers, desc: tiers.map(t => `${t.n} pieces: ${t.d}`).join(' · ') };
  }
  // the family bonus per essence (Radiant has one boss, so none)
  const SET_FAMILY = {
    Ember: { flag: 'burnPlus', d: 'your Burns last 1 turn longer' },
    Verdant: { flag: 'regenPlus', d: 'your Regeneration heals 50% more' },
    Umbral: { flag: 'drain5', d: 'your attacks heal you for 5% of the damage dealt' },
    Frost: { flag: 'freezePlus', d: '+5% chance for your Freezes to land' },
    Storm: { bonus: { spdP: 5 }, d: '+5% Speed' },
    Aether: { bonus: { res: 20 }, d: '+20 Resistance' },
  };
  const BASIC_SETS = ['krijger', 'levensbron', 'vlammenhart', 'wilgenbast'];
  const MAIN_OPTIONS = {
    wapen: ['atk'], helm: ['hp'], schild: ['def'],
    handschoenen: ['atkP', 'defP', 'hpP', 'crit', 'cdmg'],
    borstpantser: ['atkP', 'defP', 'hpP', 'acc', 'res'],
    laarzen: ['atkP', 'defP', 'hpP', 'spd'],
  };
  function mainValue(k, il, rar) {
    const q = 1 + rar * 0.2;
    const base = { atk: 5 + il * 0.9, hp: 40 + il * 7, def: 3 + il * 0.35, atkP: 3 + il * 0.09, defP: 3 + il * 0.09, hpP: 3 + il * 0.09, crit: 3 + il * 0.08, cdmg: 5 + il * 0.2, acc: 6 + il * 0.3, res: 6 + il * 0.3, spd: 5 + il * 0.12 }[k];
    return Math.round(base * q);
  }
  // substat rolls: wide ranges around the same average as before, so a great piece is a lucky roll worth farming for (RAID)
  const SUB_POOL = [['hpP', 2, 7], ['atkP', 2, 7], ['defP', 2, 7], ['crit', 1, 6], ['cdmg', 2, 8], ['acc', 2, 9], ['res', 2, 9], ['atk', 3, 11], ['hp', 20, 80], ['def', 1, 6], ['spd', 1, 5]];
  // substat scale: grows with item level; Mythical rolls 25% higher
  const subScale = (it, k) => (k === 'spd' ? 1 : 1 + it.il / 25) * (it.rar >= 5 ? 1.25 : 1);
  function rollSub(it, exclude) {
    const pool = SUB_POOL.filter(p => !exclude.includes(p[0]));
    const p = pick(pool);
    return [p[0], Math.round(rint(p[1], p[2]) * subScale(it, p[0]))];
  }
  // opts.rars + opts.up: fixed loot table (campaign difficulty / Boss Hall, see stageLoot and bossLoot);
  // without them the rarity rolls freely from Common to Legendary (starting gear)
  function genGear(opts, id) {
    const il = opts.il || 1;
    let rar;
    if (opts.rars) rar = opts.rars.length > 1 && rnd() < (opts.up ?? 0.3) ? opts.rars[1] : opts.rars[0];
    else { const roll = rnd() + il * 0.02 + (opts.rarBoost || 0); rar = roll > 1.32 ? 4 : roll > 1.08 ? 3 : roll > 0.78 ? 2 : roll > 0.42 ? 1 : 0; }
    const slot = opts.slot || pick(SLOTS), mk = pick(MAIN_OPTIONS[slot]);
    const set = opts.sets ? pick(opts.sets) : pick(BASIC_SETS);
    const it = { id, slot, rar, lvl: 0, il, set, main: mk, subs: [], owner: null };
    for (let i = 0; i < Math.min(4, rar); i++) it.subs.push(rollSub(it, [mk, ...it.subs.map(s => s[0])]));
    return it;
  }
  function gearStats(it) {
    const out = [[it.main, Math.round(mainValue(it.main, it.il, it.rar) * (1 + 0.045 * it.lvl))]];
    for (const s of it.subs) out.push([s[0], s[1]]);
    return out;
  }
  // +16 like RAID: a substat added or boosted at +4, +8, +12 and +16; the main stat grows 4.5% per level, so +16 is what +12 was
  const MAX_GEAR_LVL = 16;
  const upgradeCost = it => Math.round(40 * (it.lvl + 1) * (it.rar + 1) * (1 + it.il / 10));
  // chance per try by the current level: low levels almost always succeed, the last steps to +16 are a real gamble
  const UPG_CHANCE = [1, 0.95, 0.9, 0.85, 0.8, 0.72, 0.65, 0.58, 0.5, 0.44, 0.38, 0.32, 0.26, 0.2, 0.16, 0.12];
  const upgradeChance = it => UPG_CHANCE[Math.max(0, Math.min(UPG_CHANCE.length - 1, it.lvl | 0))];
  const fmtStat = (k, v) => `${STAT_NAMES[k]} +${v}${PCT_STATS.includes(k) ? '%' : ''}`;
  function upgradeMilestone(it) {
    if (it.lvl % 4 !== 0) return null;
    if (it.subs.length < 4) { const s = rollSub(it, [it.main, ...it.subs.map(x => x[0])]); it.subs.push(s); return 'new stat: ' + fmtStat(s[0], s[1]); }
    const s = pick(it.subs), pool = SUB_POOL.find(p => p[0] === s[0]);
    const add = Math.round(rint(pool[1], pool[2]) * subScale(it, s[0])); s[1] += add; return fmtStat(s[0], add) + ' extra';
  }
  const sellValue = it => Math.round(30 * (it.rar + 1) * (it.lvl + 1) * (1 + it.il / 15));
  function setCounts(items) { const c = {}; for (const it of items) c[it.set] = (c[it.set] || 0) + 1; return c; }
  // sets do not stack: a set's bonus counts once, however many extra pieces are worn
  function activeSets(items) {
    const c = setCounts(items), out = [];
    for (const k in c) if (SETS[k] && c[k] >= SETS[k].n) out.push(k);
    return out;
  }
  // every set bonus a gear loadout gives: campaign sets at their piece count, boss sets per reached tier (2/4/6), and the
  // family bonus of an essence with 4+ boss pieces from 2+ different sets. Each: { k, n, bonus?, flag?, d, fam? }
  function setTiers(items) {
    const c = setCounts(items), out = [], fam = {};
    for (const k in c) {
      const S = SETS[k]; if (!S) continue;
      if (S.tiers) { for (const t of S.tiers) if (c[k] >= t.n) out.push({ k, n: t.n, bonus: t.bonus, flag: t.flag, d: t.d }); }
      else if (c[k] >= S.n) out.push({ k, n: S.n, bonus: S.bonus, flag: S.flag, d: S.desc });
      if (S.ess) { const f = fam[S.ess] || (fam[S.ess] = { n: 0, sets: 0 }); f.n += c[k]; f.sets++; }
    }
    for (const e in fam) if (fam[e].n >= 4 && fam[e].sets >= 2 && SET_FAMILY[e]) out.push({ k: 'family:' + e, fam: e, ...SET_FAMILY[e] });
    return out;
  }

  // ---------- Stars / ranks / skill levels ----------
  const baseStars = id => CHAMPS[id].rar + 1;
  const MAX_STARS = 6;
  function maxLvl(stars, id) { const cap = id && CHAMPS[id] ? RAR_CAP[CHAMPS[id].rar] : 60; return Math.min(cap, stars * 10); }
  function maxStars(id) { return Math.min(MAX_STARS, Math.ceil(RAR_CAP[CHAMPS[id].rar] / 10)); }
  // Ascension Stones in three tiers, by the star a hero ascends to: Lesser (to 2-4★, the save's `stones`), Greater (to
  // 5★) and Ancient (to 6★). Lesser drop everywhere; Greater mostly from boss stages, Normal on and Boss Hall level 3 on;
  // Ancient mostly from boss stages (Easy from Chapter IV, now and then a late Easy stage; every boss stage on Brutal
  // and Nightmare), Boss Hall 9-10 and
  // weekly rewards, so the last stars are slow.
  const STONES = [{ id: 'lesser', name: 'Lesser Ascension Stone' }, { id: 'greater', name: 'Greater Ascension Stone' }, { id: 'ancient', name: 'Ancient Ascension Stone' }];
  const stoneTier = stars => (stars >= 5 ? 'ancient' : stars >= 4 ? 'greater' : 'lesser');
  const rankCost = stars => ({ tier: stoneTier(stars), stones: stars >= 4 ? 8 : stars * 4, silver: 400 * stars * stars });
  // stones for a won campaign stage on difficulty d (first: first clear) and a won Boss Hall level n
  function stageStones(st, d, first) {
    const o = {}, boss = st.n === 6, late = st.chapter >= 3;
    if (first) o.lesser = 3; else if (rnd() < 0.35) o.lesser = 1;
    if (first && (d >= 1 || boss)) o.greater = boss ? 2 : 1;
    else if (!first && rnd() < (boss ? 0.25 : d >= 1 ? 0.08 : 0.03)) o.greater = 1;
    if (boss && (d >= 3 || late)) { if (first) o.ancient = 1; else if (rnd() < 0.15) o.ancient = 1; }
    else if (!first && st.chapter >= 6 && rnd() < 0.04) o.ancient = 1;
    return o;
  }
  function bossStones(n, first) {
    const o = { lesser: 1 + Math.floor(n / 3) };
    if (n >= 3) { const g = first ? (n >= 5 ? 2 : 1) : rnd() < (n >= 5 ? 0.3 : 0.15) ? 1 : 0; if (g) o.greater = g; }
    if (n >= 9) { const a = first ? 1 : rnd() < 0.1 ? 1 : 0; if (a) o.ancient = a; }
    return o;
  }
  // every skill can be levelled SKILL_MAX times (by feeding a duplicate of the same hero): +SKILL_STEP power per level,
  // and at the maximum level a skill with a cooldown gets 1 turn shorter
  const SKILL_MAX = 5, SKILL_STEP = 0.08;

  // ---------- Summon ----------
  // Fate Shards: each tier has its own rarity table (index = rarity) and a drop chance per victory.
  const FATE_SHARDS = [
    { id: 'fate', name: 'Fate Shard', drop: 0.15, rates: [0, 75, 25, 0, 0], desc: 'Normal summon: Uncommon, with a chance of Rare.' },
    { id: 'greater', name: 'Greater Fate Shard', drop: 0.03, rates: [0, 55, 40, 5, 0], desc: 'Better pool: Uncommon, a bigger chance of Rare and a small chance of Epic.' },
    { id: 'ancient', name: 'Ancient Fate Shard', drop: 0.01, rates: [0, 0, 79, 20, 1], desc: 'Guaranteed Rare, with a chance of Epic and a 1% chance of Legendary.' },
    { id: 'mythic', name: 'Mythic Fate Shard', drop: 0.0015, rates: [0, 0, 0, 95, 5], desc: 'Guaranteed Epic, with a small chance of Legendary.' },
    { id: 'legendary', name: 'Legendary Fate Shard', drop: 0.00025, rates: [0, 0, 0, 35, 65], desc: 'Guaranteed Epic or better, with a big chance of Legendary.' },
  ];
  const SHARD = Object.fromEntries(FATE_SHARDS.map(f => [f.id, f]));
  const SHARD_PRICE = 2500;
  function rollShards() { return FATE_SHARDS.filter(f => rnd() < f.drop).map(f => f.id); }
  // pity: after PITY_EPIC summons in a row without an Epic or better, the next one is at least Epic (st.pity counts).
  // Only shards in PITY_SHARDS (Ancient and up) count and can trigger it; Fate and Greater Fate Shards leave it alone.
  const PITY_EPIC = 40;
  const PITY_SHARDS = ['ancient', 'mythic', 'legendary'];
  function summonOne(st, type) {
    const T = SHARD[type || 'fate'];
    const r = rnd() * 100; let acc = 0, rar = 1;
    for (let i = 4; i >= 0; i--) { if (!T.rates[i]) continue; acc += T.rates[i]; if (r < acc) { rar = i; break; } }
    if (acc < 100 && r >= acc) rar = T.rates.findIndex(x => x > 0);
    if (PITY_SHARDS.includes(T.id)) {
      if (rar < 3 && (st.pity || 0) + 1 >= PITY_EPIC) rar = 3;
      st.pity = rar >= 3 ? 0 : (st.pity || 0) + 1;
    }
    let pool = CHAMP_ORDER.filter(id => CHAMPS[id].rar === rar);
    if (!pool.length) pool = CHAMP_ORDER.filter(id => CHAMPS[id].rar === 2);
    const id = pick(pool);
    const res = { id, rar: CHAMPS[id].rar, isNew: !st.roster[id] };
    if (res.isNew) st.roster[id] = { lvl: 1, xp: 0, stars: baseStars(id), sk: CHAMPS[id].skills.map(() => 0) };
    else { st.fodder = st.fodder || {}; st.fodder[id] = (st.fodder[id] || 0) + 1; res.spare = true; } // a duplicate becomes a spare copy
    return res;
  }
  // feeding a spare copy of the same hero: +1 level on its lowest skill; returns the skill index or -1 when all are maxed
  function skillUp(h, id) {
    let best = -1;
    h.sk.forEach((v, i) => { if (v < SKILL_MAX && (best < 0 || v < h.sk[best])) best = i; });
    if (best >= 0) h.sk[best]++;
    return best;
  }

  // ---------- Stats & units ----------
  function roleBase(c) {
    const a = ROLES[c.role], b = c.role2 ? ROLES[c.role2] : null, o = {};
    for (const k in a) o[k] = b ? a[k] * 0.75 + b[k] * 0.25 : a[k];
    return o;
  }
  function heroStats(id, h, items) {
    const c = CHAMPS[id], rb = roleBase(c), r = RAR_MULT[c.rar], lvl = h.lvl, stars = h.stars || baseStars(id);
    const star = 1 + 0.05 * (stars - baseStars(id));
    const m = (1 + 0.09 * (lvl - 1)) * star, md = (1 + 0.045 * (lvl - 1)) * star;
    const base = { hp: rb.hp * r * m, atk: rb.atk * r * m, def: rb.def * r * md, spd: rb.spd + (c.rar - 2) * 2 + (c.rar === 4 ? 6 : 0) + stars };
    const s = { hp: base.hp, atk: base.atk, def: base.def, spd: base.spd, crit: 15 + rb.crit, cdmg: 50 + rb.cdmg, acc: rb.acc, res: 10 + rb.res };
    const P = c.passive;
    if (P === 'dragonblood') { s.crit += 20; s.cdmg += 20; }
    if (P === 'eagleeye') s.crit += 15;
    if (P === 'overcharge') s.cdmg += 30;
    if (P === 'crimsonwings') s.spd += 15;
    const add = (k, v) => {
      if (k === 'hpP') s.hp += base.hp * v / 100; else if (k === 'atkP') s.atk += base.atk * v / 100; else if (k === 'defP') s.def += base.def * v / 100; else if (k === 'spdP') s.spd += base.spd * v / 100; else s[k] += v;
    };
    for (const it of items) for (const [k, v] of gearStats(it)) add(k, v);
    const flags = {};
    for (const t of setTiers(items)) { if (t.bonus) for (const bk in t.bonus) add(bk, t.bonus[bk]); if (t.flag) flags[t.flag] = true; }
    for (const k in s) s[k] = Math.round(s[k]);
    s.crit = Math.min(CRIT_CAP, s.crit);
    s.flags = flags;
    return s;
  }
  let UID = 0;
  function mkSkills(list, skLv) {
    return list.map((s, i) => { const lv = (skLv && skLv[i]) || 0; return { ...s, lv, cd: s.cd && lv >= SKILL_MAX ? s.cd - 1 : s.cd, cdLeft: s.startCd || 0 }; });
  }
  function makeUnit(src, side, st, skLv) {
    return {
      uid: ++UID, id: src.id, name: src.name, side, aff: src.aff,
      maxHp: st.hp, hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit, cdmg: st.cdmg, acc: st.acc, res: st.res, sets: st.flags || {},
      skills: mkSkills(src.phases ? src.phases[0] : src.skills, skLv),
      passive: src.passive || null, effects: [], alive: true, stacks: {}, flags: {}, boss: !!src.boss, big: !!src.isBoss, slot: 0, tm: rnd() * 20,
    };
  }
  function heroUnit(id, h, items) { return makeUnit({ ...CHAMPS[id], id }, 'hero', heroStats(id, h, items), h.sk); }
  function enemyUnit(id, lvl, spdBonus, summoned) {
    const e = ALL_UNITS[id];
    const t = e.isBoss ? 1 : TIER[e.tier] || 1;
    const mh = (1 + 0.09 * (lvl - 1)) * t * (summoned ? 0.6 : 1), ma = (1 + 0.2 * (lvl - 1)) * t, md = (1 + 0.045 * (lvl - 1));
    const st = { hp: Math.round(e.hp * mh * (e.isBoss ? BOSS_HP : 1)), atk: Math.round(e.atk * ma * (e.isBoss ? BOSS_ATK * (e.pw || 1) : FOE_ATK)), def: Math.round(e.def * md), spd: Math.round((e.spd || 95) * (1 + (spdBonus || 0))), crit: 10, cdmg: 50, acc: e.isBoss ? 20 + lvl : 5 + lvl, res: e.isBoss ? 30 + lvl : 10 + lvl };
    const u = makeUnit({ ...e, id }, 'enemy', st);
    u.lvl = lvl;
    if (e.isBoss) {
      u.isBoss = true; u.phase = 0; u.nPhases = e.nPhases; u.breakMax = e.breakMax; u.brk = e.breakMax; u.breakRes = e.breakRes || 0;
      u.thresholds = e.nPhases === 3 ? [0.66, 0.33] : [0.5];
    }
    return u;
  }
  function bossUnit(id, lvl, spdBonus) { return enemyUnit(id, lvl, spdBonus); }

  // ---------- Battle ----------
  const wait = () => Promise.resolve();
  const NOHOOKS = {
    chooseAction: null, record: null, turnStart: wait, before: wait, after: wait, pause: wait, round() {}, hit() {}, healed() {},
    float() {}, death() {}, revive() {}, log() {}, update() {}, spawn() {}, banner: wait, breakHit() {}, affinityBreak: wait, phase: wait,
  };
  const lowest = list => list.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));

  class Battle {
    constructor(heroes, enemies, hooks) {
      this.heroes = heroes; this.enemies = enemies;
      heroes.forEach((u, i) => (u.slot = i)); enemies.forEach((u, i) => (u.slot = i));
      this.h = Object.assign({}, NOHOOKS, hooks || {});
      this.turns = 0; this.auto = !this.h.chooseAction; this.over = null; this.active = null; this.aborted = false;
      this.stats = { dmg: {}, crits: 0, maxHit: 0 };
      // damage meter: per unit uid, damage dealt and healing done by source (skill or effect name), and damage taken
      this.meter = {};
      this.deaths = 0;
      // a Boss Hall trait shows as a lasting badge on its boss
      for (const u of enemies) if (u.trait && !u.effects.some(e => e.k === u.trait)) u.effects.push({ k: u.trait, n: 999 });
    }
    allies(u) { return u.side === 'hero' ? this.heroes : this.enemies; }
    foes(u) { return u.side === 'hero' ? this.enemies : this.heroes; }
    living(l) { return l.filter(x => x.alive); }
    all() { return [...this.heroes, ...this.enemies]; }
    has(u, k) { return u.effects.some(e => e.k === k); }
    check() {
      if (this.aborted) this.over = 'lose';
      else if (!this.living(this.enemies).length) this.over = 'win';
      else if (!this.living(this.heroes).length) this.over = 'lose';
      return this.over;
    }
    speed(u) {
      let s = u.spd;
      if (this.has(u, 'spdUp')) s *= 1.3;
      if (this.has(u, 'spdDown')) s *= 0.7;
      else if (u.trait === 'swift') s *= BTRAIT.spd;
      return Math.max(10, s);
    }
    // advance turn meters until someone reaches 100; returns that unit
    nextActor() {
      const alive = this.all().filter(u => u.alive);
      let best = null, bestT = Infinity;
      for (const u of alive) { const t = Math.max(0, (100 - u.tm) / this.speed(u)); if (t < bestT - 1e-9 || (Math.abs(t - bestT) < 1e-9 && best && (this.speed(u) > this.speed(best) || (this.speed(u) === this.speed(best) && u.side === 'hero' && best.side !== 'hero')))) { best = u; bestT = t; } }
      for (const u of alive) u.tm += this.speed(u) * bestT;
      return best;
    }
    predict(n) {
      const alive = this.all().filter(u => u.alive), sim = alive.map(u => ({ u, tm: u.tm, s: this.speed(u) })), out = [];
      for (let i = 0; i < n; i++) {
        let best = null, bt = Infinity;
        for (const x of sim) { const t = Math.max(0, (100 - x.tm) / x.s); if (t < bt - 1e-9 || (Math.abs(t - bt) < 1e-9 && best && x.s > best.s)) { best = x; bt = t; } }
        for (const x of sim) x.tm += x.s * bt;
        out.push(best.u); best.tm -= 100;
      }
      return out;
    }
    async start() {
      for (const u of this.heroes) if (u.passive === 'divineward') for (const a of this.heroes) this.addEffect(a, { k: 'shield', n: 3, v: Math.round(u.maxHp * 0.12) }, true);
      for (const u of this.enemies) if (u.passive === 'divinebarrier') this.addEffect(u, { k: 'shield', n: 4, v: Math.round(u.maxHp * 0.25) }, true);
      // boss sets that act at the start of battle (either side: arena defenders wear gear too)
      for (const u of this.all()) {
        if (u.sets.startStealth) this.addEffect(u, { k: 'stealth', n: 1 }, true);
        if (u.sets.startTm) u.tm = Math.min(99, u.tm + 25);
        if (u.sets.voidBarrier) this.teamShield(u);
        if (u.sets.mountain) { this.addEffect(u, { k: 'shield', n: 99, v: Math.round(u.maxHp * 0.25) }, true); const sh = u.effects.find(e => e.k === 'shield'); if (sh) sh.mountain = true; }
      }
    }
    unit(uid) { return uid ? this.all().find(x => x.uid === uid) || null : null; }
    teamShield(u) { for (const a of this.living(this.allies(u))) this.addEffect(a, { k: 'shield', n: 3, v: Math.round(u.maxHp * 0.1) }, true); this.h.float(u, 'Void Barrier', 'buff'); }
    // boss sets at the start of a unit's own turn
    setTurn(u) {
      const S = u.sets; let did = false;
      if (S.treantRegen) { this.heal(u, u.maxHp * 0.03, u, 'Worldroot'); did = true; }
      if (S.choir) { const l = lowest(this.living(this.allies(u))); if (l && l.hp < l.maxHp) { this.heal(l, l.maxHp * 0.05, u, 'Celestial Choir'); did = true; } }
      if (S.chaosBuff) { this.addEffect(u, { k: pick(['atkUp', 'critUp', 'spdUp', 'defUp']), n: 2 }); did = true; }
      if (S.prism && (u.stacks.prism = (u.stacks.prism || 0) + 1) % 3 === 0) { this.addEffect(u, { k: 'immune', n: 1 }); did = true; }
      if (S.voidBarrier && (u.stacks.void = (u.stacks.void || 0) + 1) % 4 === 0) { this.teamShield(u); did = true; }
      return did;
    }
    // a strike from a set (Frozen Nova, Tidal Wave, chain lightning): m × Attack on each target, no further set effects
    setStrike(u, list, m, label, freezeCh) {
      for (const t of list.filter(t => t.alive)) {
        const r = this.calc(u, t, m, {}, { name: label, target: 'enemies' });
        this.damage(t, r.dmg, u, r);
        if (freezeCh && t.alive && rnd() < freezeCh + (u.sets.freezePlus ? 0.05 : 0)) this.addEffect(t, { k: 'freeze', n: 1, src: u.uid });
      }
    }
    async run() {
      await this.start();
      while (!this.check()) {
        if (this.turns > 300) { this.over = 'lose'; break; }
        if (this.capUnit && (this.capUnit.stacks.bossTurns || 0) >= this.cap) { this.over = 'done'; break; }
        const u = this.nextActor();
        if (!u) break;
        u.tm -= 100; if (u.tm < 0) u.tm = 0;
        this.turns++;
        this.h.round(this.turns);
        await this.turn(u);
      }
      this.active = null;
      return this.over;
    }
    async turn(u) {
      this.active = u;
      this.h.update();
      await this.h.turnStart(u, this);
      let ticked = false;
      for (const e of u.effects.filter(e => DOT[e.k])) {
        if (!u.alive) break;
        const by = this.unit(e.src), boost = e.k === 'burn' && by && by.sets.brimstone ? 1.5 : 1; // Brimstone Scales: stronger Burns
        this.damage(u, Math.round((u.baseHp || u.maxHp) * DOT[e.k] * (e.v || 1) * boost), null, { kind: e.k, from: e.src }); ticked = true;
      }
      if (u.alive && this.has(u, 'regen')) { this.heal(u, u.maxHp * 0.1 * (u.sets.regenPlus ? 1.5 : 1), u, 'Regeneration'); ticked = true; }
      if (u.alive && this.setTurn(u)) ticked = true;
      if (u.alive && u.passive === 'deeproots') { this.heal(u, u.maxHp * 0.05, u, 'Passive'); ticked = true; }
      if (u.alive && u.passive === 'beacon') { const l = lowest(this.living(this.allies(u))); if (l.hp < l.maxHp) { this.heal(l, l.maxHp * 0.05, u, 'Passive'); ticked = true; } }
      if (u.alive && u.passive === 'harmony') for (const a of this.living(this.allies(u))) if (a.hp < a.maxHp) { this.heal(a, a.maxHp * 0.04, u, 'Passive'); ticked = true; }
      if (ticked) await this.h.pause(360);
      if (!u.alive || this.check()) { this.endTurn(u, null); return; }
      if (u.hall) this.rage(u);
      if (u.blight && u.alive && !SKIP.some(k => this.has(u, k))) { await this.aura(u); if (this.check()) { this.endTurn(u, null); return; } }
      let used = null;
      const skip = SKIP.find(k => this.has(u, k));
      if (skip) {
        this.h.log(`${u.name} is ${skip === 'broken' ? 'broken' : skip === 'freeze' ? 'frozen' : skip === 'iceTomb' ? 'encased in ice' : 'stunned'} and loses the turn.`, u.side);
        this.h.float(u, EFFECTS[skip].n, 'debuff');
        await this.h.pause(480);
      } else {
        let extra = 0;
        do {
          u.flags.crit = false;
          // a manual choice may hand the turn to the AI ({ auto: true }, e.g. when auto is switched on mid-turn); record()
          // notes every hero action (the arena sends them to the server, which replays the fight with them: arenaReplay)
          let manual = u.side === 'hero' && !this.auto && !!this.h.chooseAction;
          let act = manual ? await this.h.chooseAction(u, this) : this.ai(u);
          if (this.aborted) return;
          // a manual choice must be one the hero can make now (a skill off cooldown, a valid target): anything else, e.g. a
          // button switched back on in the browser's devtools, hands the turn to the AI
          if (manual && act && !act.auto && (!u.skills.includes(act.skill) || !this.usable(u, act.skill) || (act.target && !this.validTargets(u, act.skill).includes(act.target)))) act = { auto: true };
          if (act && act.auto) { act = this.ai(u); manual = false; }
          if (u.side === 'hero' && this.h.record) this.h.record(u, act, !manual);
          used = act.skill;
          await this.perform(u, act.skill, act.target);
          if (extra === 0 && u.alive && u.flags.crit && u.sets.extraTurn && rnd() < 0.18 && !this.check()) {
            extra = 1; this.h.float(u, 'Extra turn!', 'buff'); this.h.log(`${u.name} gets an extra turn.`, u.side);
            for (const s of u.skills) s.cdLeft = s === used ? s.cd : Math.max(0, s.cdLeft - 1);
            await this.h.pause(300);
          } else break;
        } while (true);
        // Tidecaller's Scales: every 3rd turn a Tidal Wave
        if (u.alive && u.sets.tidal && (u.stacks.tide = (u.stacks.tide || 0) + 1) % 3 === 0 && !this.check()) {
          this.h.float(u, 'Tidal Wave', 'buff'); this.h.log(`${u.name}'s Tidal Wave crashes over the enemies.`, u.side);
          this.setStrike(u, this.living(this.foes(u)), 0.4, 'Tidal Wave'); await this.h.pause(300);
        }
      }
      // boss end-of-turn passives
      if (u.alive && u.passive === 'toxicpresence') for (const t of this.living(this.foes(u))) if (rnd() < 0.15) this.addEffect(t, { k: 'poison', n: 2, v: 1 });
      if (u.alive && u.passive === 'deathmark') { u.stacks.mark = (u.stacks.mark || 0) + 1; if (u.stacks.mark % 2 === 0) { const t = pick(this.living(this.foes(u))); if (t) this.addEffect(t, { k: 'mark', n: 2 }); } }
      this.endTurn(u, used);
    }
    note(u, kind, label, amt) {
      if (!amt) return;
      const m = this.meter[u.uid] || (this.meter[u.uid] = { dmg: {}, heal: {}, taken: 0 });
      if (kind === 'taken') m.taken += amt; else m[kind][label] = (m[kind][label] || 0) + amt;
    }
    // a boss's own turns count towards its enrage (see ENRAGE); the stack count lives in the effect's v
    rage(u) {
      const t = u.stacks.bossTurns = (u.stacks.bossTurns || 0) + 1, at = u.blight ? ENRAGE.blightAt : ENRAGE.at;
      if (t < at) return;
      const v = 1 + Math.floor((t - at) / ENRAGE.every), e = u.effects.find(x => x.k === 'enrage'), old = e ? e.v : 0;
      if (e) e.v = v; else u.effects.push({ k: 'enrage', n: 999, v });
      if (v === old) return;
      this.h.float(u, v === 1 ? 'ENRAGED!' : `Enrage ×${v}`, 'debuff');
      this.h.log(v === 1 ? `${u.name} is ENRAGED: its Attack keeps rising until it falls.` : `${u.name}'s rage grows (+${Math.round(ENRAGE.atk * v * 100)}% Attack).`, 'enemy');
      if (this.h.enrage) this.h.enrage(u, v);
    }
    // Blight Aura (see BLIGHT): the boss's foes lose u.blight of their max HP; shields absorb it, Defense does not
    async aura(u) {
      if (!u.effects.some(e => e.k === 'blight')) u.effects.push({ k: 'blight', n: 999 });
      for (const t of this.living(this.foes(u))) this.damage(t, Math.max(1, Math.round(t.maxHp * u.blight)), null, { kind: 'blight', from: u.uid });
      await this.h.pause(300);
    }
    enrageIn(u) { const t = u.stacks.bossTurns || 0; return Math.max(0, (u.blight ? ENRAGE.blightAt : ENRAGE.at) - t); }
    endTurn(u, used) {
      for (const s of u.skills) s.cdLeft = s === used ? s.cd : Math.max(0, s.cdLeft - 1);
      for (const e of u.effects) { if (e.fresh) e.fresh = false; else e.n--; }
      const wasBroken = this.has(u, 'broken'), wasTomb = this.has(u, 'iceTomb');
      u.effects = u.effects.filter(e => e.n > 0);
      // Regalia of the Frozen Heart: the ice shatters in a Frozen Nova
      if (wasTomb && !this.has(u, 'iceTomb') && u.alive) {
        this.h.float(u, 'Frozen Nova', 'buff'); this.h.log(`The ice around ${u.name} shatters in a Frozen Nova.`, u.side);
        this.setStrike(u, this.living(this.foes(u)), 0.8, 'Frozen Nova', 0.4);
      }
      if (wasBroken && !this.has(u, 'broken')) { this.h.float(u, 'Recovered', 'resist'); this.h.log(`${u.name} recovers from the Affinity Break.`, u.side); }
      this.h.update();
    }
    tauntTarget(u) {
      const e = u.effects.find(e => e.k === 'taunt');
      if (!e) return null;
      return this.foes(u).find(x => x.uid === e.src && x.alive) || null;
    }
    targetable(list) {
      const open = list.filter(f => !this.has(f, 'burrow'));
      const vis = open.filter(f => !this.has(f, 'stealth'));
      return vis.length ? vis : open.length ? open : list;
    }
    validTargets(u, skill) {
      const foes = this.living(this.foes(u)), allies = this.living(this.allies(u));
      switch (skill.target) {
        case 'enemy': { const t = this.tauntTarget(u); return t ? [t] : this.targetable(foes); }
        case 'enemies': case 'random': case 'lowestEnemy': return foes;
        case 'ally': case 'allies': case 'lowestAlly': return allies;
        case 'self': return [u];
        case 'deadAlly': return this.allies(u).filter(x => !x.alive && x.revivable !== false);
      }
      return [];
    }
    usable(u, skill) {
      if (skill.cdLeft > 0) return false;
      if (this.has(u, 'silence') && skill.cd > 0) return false;
      if (u.oneRevive && u.flags.revUsed && skill.fx.some(f => f.t === 'revive')) return false; // arena: one revive per champion
      if (skill.target === 'deadAlly') return this.validTargets(u, skill).length > 0;
      return true;
    }
    spawn(side, id, lvl) {
      const list = side === 'enemy' ? this.enemies : this.heroes;
      if (this.living(list).length >= 4) return null;
      const dead = list.find(x => !x.alive && x.id === id && x.summoned);
      let u;
      if (dead) { u = dead; const f = enemyUnit(id, lvl, 0, true); Object.assign(u, { hp: f.maxHp, maxHp: f.maxHp, alive: true, effects: [], skills: f.skills, tm: 0 }); }
      else { u = enemyUnit(id, lvl, 0, true); u.slot = list.length; u.revivable = false; u.summoned = true; u.tm = 0; list.push(u); }
      this.h.spawn(u, !!dead);
      return u;
    }
    resolveTargets(u, skill, target) {
      const foes = this.living(this.foes(u)), allies = this.living(this.allies(u));
      const tt = this.tauntTarget(u);
      switch (skill.target) {
        case 'enemy': { const vt = this.validTargets(u, skill); const t = tt || (target && target.alive && vt.includes(target) ? target : null) || this.pickFoe(u, vt); return [t]; }
        case 'lowestEnemy': return [tt || lowest(this.targetable(foes))];
        case 'random': return [tt || pick(this.targetable(foes))];
        case 'enemies': return foes;
        case 'ally': return [target && target.alive ? target : lowest(allies)];
        case 'lowestAlly': return [lowest(allies)];
        case 'allies': return allies;
        case 'self': return [u];
        case 'deadAlly': return target ? [target] : this.validTargets(u, skill).slice(0, 1);
      }
      return [];
    }
    async perform(u, skill, target, isCounter) {
      const targets = this.resolveTargets(u, skill, target).filter(Boolean);
      if (!targets.length) return;
      if (!isCounter) this.h.log(`${u.name} uses ${skill.name}.`, u.side);
      if (!isCounter && (skill.cd >= 3 || (u.isBoss && skill.cd > 0))) await this.h.banner(u, skill);
      await this.h.before(u, skill, targets, this);
      let killed = 0;
      const hitMap = new Map(), counters = [];
      const lvMult = 1 + SKILL_STEP * (skill.lv || 0);
      for (const fx of skill.fx) {
        if (fx.t === 'dmg') {
          const hits = skill.hits || 1;
          for (let i = 0; i < hits; i++) {
            const foesNow = this.targetable(this.living(this.foes(u)));
            const list = skill.target === 'random' ? (i === 0 ? targets.filter(t => t.alive) : [this.tauntTarget(u) || pick(foesNow)]).filter(Boolean)
              : targets.filter(t => t.alive);
            for (const t of list) {
              const r = this.calc(u, t, fx.m * lvMult, fx, skill);
              const was = t.alive;
              this.h.impact && this.h.impact(u, skill, t, i);
              const dealt = this.damage(t, r.dmg, u, r);
              if (r.crit) { u.flags.crit = true; if (u.passive === 'eagleeye') t.tm = Math.max(0, t.tm - 10); }
              if (fx.steal) this.heal(u, dealt * fx.steal, u, 'Lifesteal');
              if (u.sets.lifesteal) this.heal(u, dealt * 0.3, u, 'Lifesteal');
              if (u.passive === 'bloodfeast') this.heal(u, dealt * 0.25, u, 'Lifesteal');
              if (u.passive === 'frozencurse' && t.alive && rnd() < 0.3) this.addEffect(t, { k: 'spdDown', n: 2 });
              if (u.passive === 'staticcharge') u.stacks.charge = (u.stacks.charge || 0) >= 3 ? 0 : (u.stacks.charge || 0) + 1;
              if (was && !t.alive) killed++;
              hitMap.set(t, r.hit);
              if (dealt > 0) this.onHitPassives(u, t, r, skill);
              if (dealt > 0) this.setHit(u, t, r, skill, dealt, isCounter, counters);
              if (!isCounter && t.alive && dealt > 0 && !SKIP.some(k => this.has(t, k)) && !counters.includes(t)) {
                const ch = (t.passive === 'retribution' ? 0.3 : 0) + (t.sets.counter ? 0.25 : 0) + (this.has(t, 'counter') ? 0.5 : 0);
                if (ch > 0 && rnd() < ch) counters.push(t);
              }
            }
            if (hits > 1 && i < hits - 1) await this.h.pause(160);
          }
        } else if (fx.t === 'debuff') {
          for (const t of targets.filter(t => t.alive && t.side !== u.side)) {
            const ht = hitMap.get(t) || hitType(u.aff, t.aff);
            let base = fx.ch * HIT[ht].debuff * (1 + (u.sets.curse ? 0.25 : 0) + (u.passive === 'seduction' ? 0.15 : 0));
            let acc = u.acc - (this.has(u, 'accDown') ? 30 : 0);
            const ch = clamp(base * (1 + (acc - t.res) / 100), 0, 1);
            if (this.has(t, 'immune')) { this.h.float(t, 'Immune', 'resist'); continue; }
            if (rnd() < ch) this.addEffect(t, { k: fx.k, n: fx.n, src: u.uid, v: (fx.k === 'burn' && u.passive === 'kindling') || (fx.k === 'poison' && (u.passive === 'venomfaith' || this.enemies.some(x => x.alive && x.passive === 'venomfaith' && x.side === u.side))) ? 1.5 : 1 });
            else this.h.float(t, 'Resisted', 'resist');
          }
        } else if (fx.t === 'randomDebuff') {
          for (const t of targets.filter(t => t.alive && t.side !== u.side)) { if (this.has(t, 'immune')) continue; if (rnd() < 0.6) this.addEffect(t, { k: pick(['atkDown', 'defDown', 'spdDown', 'poison', 'burn', 'silence', 'accDown']), n: 2 }); }
        } else if (fx.t === 'buff') {
          const list = fx.to === 'self' ? [u] : fx.to === 'allAllies' ? this.living(this.allies(u)) : targets.filter(t => t.side === u.side);
          for (const t of (list.length ? list : [u]).filter(t => t.alive)) this.addEffect(t, { k: fx.k, n: fx.n });
        } else if (fx.t === 'heal') {
          const list = fx.to === 'lowestAlly' ? [lowest(this.living(this.allies(u)))] : targets.filter(t => t.side === u.side);
          for (const t of list.filter(t => t.alive)) { this.heal(t, t.maxHp * fx.pct * lvMult * (u.passive === 'bloom' ? 1.2 : 1), u, skill.name); if (u.sets.healCleanse) this.cleanseOne(t); }
        } else if (fx.t === 'shield') {
          for (const t of targets.filter(t => t.alive && t.side === u.side)) { this.addEffect(t, { k: 'shield', n: fx.n, v: Math.round(u.maxHp * fx.pct * lvMult) }); if (u.sets.healCleanse) this.cleanseOne(t); }
        } else if (fx.t === 'cleanse') {
          for (const t of targets.filter(t => t.alive && t.side === u.side)) {
            const before = t.effects.length;
            t.effects = t.effects.filter(e => EFFECTS[e.k].buff || e.k === 'broken');
            if (t.effects.length < before) this.h.float(t, 'Cleansed', 'buff');
          }
        } else if (fx.t === 'revive') {
          const t = targets[0];
          if (u.oneRevive) u.flags.revUsed = true;
          if (t && !t.alive) { t.alive = true; t.hp = Math.round(t.maxHp * fx.pct * lvMult); t.effects = []; t.tm = 0; this.h.revive(t); this.h.log(`${t.name} returns to the fight.`, u.side); }
        } else if (fx.t === 'tmFill') {
          for (const t of targets.filter(t => t.alive && t.side === u.side)) if (t !== u) { t.tm = Math.min(100, t.tm + fx.pct * 100); this.h.float(t, 'Turn Meter +', 'buff'); }
        } else if (fx.t === 'tmDrain') {
          for (const t of targets.filter(t => t.alive && t.side !== u.side)) { t.tm = Math.max(0, t.tm - fx.pct * 100); }
        } else if (fx.t === 'summon') {
          let n = 0;
          for (let i = this.enemies.filter(x => x.alive && x.id === fx.id).length; i < fx.max; i++) if (this.spawn(u.side, fx.id, u.lvl || 1)) n++;
          if (n) this.h.log(`${u.name} summons reinforcements.`, u.side);
        }
      }
      // Thundercore Harness: a basic attack may chain to another enemy
      if (u.sets.chain && !isCounter && u.alive && skill === u.skills[0] && skill.fx.some(f => f.t === 'dmg') && rnd() < 0.3) {
        const o = this.living(this.foes(u)).filter(x => !targets.includes(x));
        if (o.length) { const c = pick(o); this.h.float(c, 'Chain Lightning', 'debuff'); this.setStrike(u, [c], 0.4, 'Chain Lightning'); }
      }
      if (killed) {
        if (u.alive && u.sets.killAtkUp) this.addEffect(u, { k: 'atkUp', n: 2 });
        if (u.alive && u.sets.warlord) u.tm = Math.min(100, u.tm + 30);
        if (u.alive && u.sets.killStealth) { this.addEffect(u, { k: 'stealth', n: 1 }); this.heal(u, u.maxHp * 0.15, u, "Nightlord's Mantle"); }
        if (u.passive === 'bloodfrenzy') u.stacks.smids = Math.min(3, (u.stacks.smids || 0) + killed);
        if (u.passive === 'killingspree' && u.alive) u.tm = Math.min(100, u.tm + 50);
        if (u.passive === 'sanguine') this.heal(u, u.maxHp * 0.05 * killed, u, 'Passive');
        if (u.passive === 'warlord') this.addEffect(u, { k: 'atkUp', n: 2 });
      }
      await this.h.after(u, skill, targets, this);
      this.h.update();
      for (const c of counters) {
        if (!c.alive || !u.alive || this.check()) break;
        this.h.float(c, 'Counter', 'buff'); this.h.log(`${c.name} strikes back.`, c.side);
        await this.perform(c, c.skills[0], u, true);
      }
    }
    // boss sets on every damaging hit: the attacker's procs and lifesteal, then the target's answers
    setHit(u, t, r, skill, dealt, isCounter, counters) {
      const A = u.sets, T = t.sets;
      const steal = (A.steal20 ? 0.2 : 0) + (A.drain5 ? 0.05 : 0) + (A.overlord && u.hp < u.maxHp * 0.4 ? 0.2 : 0);
      if (steal && u.alive) this.heal(u, dealt * steal, u, 'Lifesteal');
      if (t.alive && t.side !== u.side) {
        const add = (k, n, ch) => { if (rnd() < ch) this.addEffect(t, { k, n, src: u.uid }); };
        if (A.burnHit) add('burn', 2, 0.2);
        if (A.poisonHit) add('poison', 2, 0.25);
        if (A.accHit) add('accDown', 2, 0.3);
        if (A.silenceHit) add('silence', 1, 0.2);
        if (A.freezeHit) add('freeze', 1, 0.15 + (A.freezePlus ? 0.05 : 0));
        if (A.chaosDebuff && rnd() < 0.2) this.addEffect(t, { k: pick(['burn', 'poison', 'defDown', 'spdDown', 'atkDown']), n: 2, src: u.uid });
        if (A.skillSlow && skill && skill.cd > 0) add('spdDown', 2, 0.2);
        if (A.aoeSlow && skill && skill.target === 'enemies') add('spdDown', 2, 0.25);
        if (A.critMark && r.crit) add('mark', 1, 0.4);
        if (A.markTm && this.has(t, 'mark')) u.tm = Math.min(100, u.tm + 15);
        if (A.brimstone && r.crit && this.has(t, 'burn')) { const o = this.living(this.foes(u)).filter(x => x !== t); if (o.length) this.addEffect(pick(o), { k: 'burn', n: 2, src: u.uid }); }
      }
      if (t.alive && u.alive && t.side !== u.side) {
        if (T.tauntHit && rnd() < 0.2) this.addEffect(u, { k: 'taunt', n: 1, src: t.uid });
        if (T.reflect) this.damage(u, Math.max(1, Math.round(dealt * 0.15)), null, { kind: 'reflect', from: t.uid });
        if (T.critCounter && r.crit && !isCounter && !SKIP.some(k => this.has(t, k)) && !counters.includes(t)) counters.push(t);
      }
    }
    cleanseOne(t) { const i = t.effects.findIndex(e => !EFFECTS[e.k].buff && e.k !== 'broken'); if (i >= 0) { t.effects.splice(i, 1); this.h.float(t, 'Cleansed', 'buff'); } }
    onHitPassives(a, t, r) {
      if (!t.alive || !a.alive) return;
      if (t.passive === 'molten' && r.hit === 'weak' && rnd() < 0.2) this.addEffect(a, { k: 'burn', n: 2 });
      if (t.passive === 'frozencore' && rnd() < 0.25) this.addEffect(a, { k: 'spdDown', n: 2 });
      if (t.passive === 'ancientroots' && rnd() < 0.2) { this.addEffect(a, { k: 'spdDown', n: 2 }); this.h.float(a, 'Rooted', 'debuff'); }
      if (t.passive === 'glacial' && rnd() < 0.2) this.addEffect(a, { k: 'spdDown', n: 1 });
    }
    addEffect(t, e, quiet) {
      if (!EFFECTS[e.k].buff && e.k !== 'broken' && this.has(t, 'immune')) return;
      // boss sets of the one who placed it: Ember family Burns last a turn longer, Plaguebearer's Poison cuts healing
      const by = e.src && (e.k === 'burn' || e.k === 'poison') ? this.unit(e.src) : null;
      if (by && e.k === 'burn' && by.sets.burnPlus) e.n += 1;
      if (by && e.k === 'poison' && by.sets.plague) this.addEffect(t, { k: 'healRed', n: e.n, src: e.src }, true);
      e.fresh = t === this.active;
      const ex = t.effects.find(x => x.k === e.k);
      if (ex) { ex.n = Math.max(ex.n, e.n); if (e.v) ex.v = Math.max(ex.v || 0, e.v); if (e.src) ex.src = e.src; ex.fresh = ex.fresh || e.fresh; }
      else t.effects.push(e);
      if (!quiet) this.h.float(t, EFFECTS[e.k].n, EFFECTS[e.k].buff ? 'buff' : 'debuff');
      // a Boss Hall trait breaks for the rest of the fight once its answer lands (BTRAIT)
      if (t.trait && BTRAIT.answer[t.trait] === e.k) { const k = t.trait; t.trait = null; t.effects = t.effects.filter(x => x.k !== k); this.h.float(t, EFFECTS[k].n + ' broken', 'debuff'); }
    }
    calc(a, t, m, fx, skill) {
      let atk = a.atk;
      if (this.has(a, 'atkUp')) atk *= 1.5;
      if (this.has(a, 'atkDown')) atk *= 0.5;
      const rg = a.isBoss && a.effects.find(e => e.k === 'enrage'); if (rg) atk *= 1 + ENRAGE.atk * rg.v;
      if (a.stacks.smids) atk *= 1 + 0.1 * a.stacks.smids;
      if (a.passive === 'bloodlust' && a.hp < a.maxHp * 0.5) atk *= 1.3;
      if (a.passive === 'soulharvest') atk *= 1 + 0.1 * Math.min(5, this.deaths);
      let def = t.def;
      if (a.sets && a.sets.pierce) def *= 0.75;
      if (a.sets && a.sets.pierce15) def *= 0.85;
      if (this.has(t, 'defUp')) def *= 1.6;
      if (this.has(t, 'defDown')) def *= 0.4;
      if (t.passive === 'steadfast' && t.hp < t.maxHp * 0.5) def *= 1.5;
      if (t.passive === 'ironhull' && !this.has(t, 'broken')) def *= 1.5;
      if (t.passive === 'ancientscales' && !t.flags.everBroken) def *= 1.6;
      // hit type
      let hit = hitType(a.aff, t.aff);
      if (t.passive === 'aethercore' || a.passive === 'aethercore') hit = 'normal';
      const H = HIT[hit];
      let raw = m * atk;
      let crit = false;
      if (H.crit) {
        let cr = a.crit + (this.has(a, 'critUp') ? 25 : 0);
        if (a.passive === 'shadowhunter' && t.effects.some(e => !EFFECTS[e.k].buff)) cr += 25;
        crit = rnd() * 100 < Math.min(CRIT_CAP, cr);
        if (a.sets.reaper && t.hp < t.maxHp * 0.3) crit = true; // Reaper's Shroud
      }
      if (crit) raw *= 1 + (a.cdmg + (this.has(a, 'cdmgUp') ? 30 : 0) + (a.sets.overlord && a.hp < a.maxHp * 0.4 ? 25 : 0)) / 100;
      let d = raw * H.mult * (100 / (100 + def));
      if (t.trait === 'ironhide' && !this.has(t, 'defDown')) d *= BTRAIT.dmg;
      // attacker modifiers
      if (a.passive === 'hellbrand' && t.effects.some(e => !EFFECTS[e.k].buff)) d *= 1.5;
      if (a.passive === 'frostbite' && (this.has(t, 'freeze') || this.has(t, 'spdDown'))) d *= 1.3;
      if (a.passive === 'scavenger' && t.hp < t.maxHp * 0.5) d *= 1.2;
      if (fx && fx.execute && t.hp < t.maxHp * fx.execute[0]) d *= 1 + fx.execute[1];
      if (a.passive === 'molten' && a.phase >= 1 && a.hp < a.maxHp * 0.3) d *= 1.3;
      if (a.passive === 'infernalfury') d *= 1 + 0.5 * (1 - a.hp / a.maxHp);
      if (a.passive === 'staticcharge' && a.stacks.charge >= 3) d *= 1.5;
      if (a.aff === 'Umbral' && a.side === 'enemy' && this.enemies.some(x => x.alive && x.passive === 'darkdominion')) d *= 1.2;
      // target modifiers
      if (this.has(t, 'broken')) d *= 1.15;
      if (this.has(t, 'mark')) d *= 1.3;
      if (t.passive === 'voidarmor' && t.brk > t.breakMax * 0.5) d *= 0.9;
      if (t.passive === 'deepwater' && t.hp > t.maxHp * 0.7) d *= 0.75;
      if (t.passive === 'scalearmor' && skill && skill.anim === 'melee') d *= 0.75;
      if (t.passive === 'thickhide') d *= 0.9;
      if (this.living(this.allies(t)).some(x => x.passive === 'lightbearer')) d *= 0.9;
      // boss sets: the attacker's damage boosts, then the target's protection
      const A = a.sets, T = t.sets, aoe = skill && skill.target === 'enemies';
      if (A.aoeDmg && aoe) d *= 1.15;
      if (A.fury) d *= 1 + 0.3 * (1 - a.hp / a.maxHp);
      if (A.warlord && t.hp < t.maxHp * 0.5) d *= 1.15;
      if (A.execute20 && t.hp < t.maxHp * 0.3) d *= 1.2;
      if (A.frozenDmg && this.has(t, 'freeze')) d *= 1.25;
      if (A.juggernaut && this.has(t, 'broken')) d *= 1.2;
      if (A.lich && t.effects.filter(e => !EFFECTS[e.k].buff && e.src === a.uid).length >= 2) d *= 1.15;
      if (T.strongRes && hit === 'strong') d *= 0.85;
      if (T.aoeRes && aoe) d *= 0.85;
      if (this.living(this.allies(t)).some(x => x.sets.treantWard)) d *= 0.9;
      d *= 0.95 + rnd() * 0.1;
      return { dmg: Math.max(1, Math.round(d)), crit, hit, skill };
    }
    damage(t, amount, src, info) {
      if (!t.alive) return 0;
      if (this.has(t, 'burrow') || this.has(t, 'iceTomb')) { this.h.float(t, 'Immune', 'resist'); return 0; }
      let left = amount;
      const sh = t.effects.find(e => e.k === 'shield');
      const hpBefore = t.hp;
      if (sh) {
        const ab = Math.min(sh.v, left); sh.v -= ab; left -= ab;
        if (sh.v <= 0) {
          t.effects = t.effects.filter(e => e !== sh);
          // Mountainheart Armor: the opening Shield stuns whoever breaks it
          if (sh.mountain && src && src.alive && src.side !== t.side) { this.addEffect(src, { k: 'stun', n: 1, src: t.uid }); this.h.log(`${t.name}'s stone shield shatters and stuns ${src.name}.`, t.side); }
        }
      }
      t.hp -= left;
      if (t.immortal) t.hp = Math.max(1, t.hp);
      const real = amount - left + Math.min(left, Math.max(0, hpBefore)), by = src || (info && info.from && this.all().find(x => x.uid === info.from));
      if (by) this.note(by, 'dmg', info && info.skill ? info.skill.name : info && info.kind ? (EFFECTS[info.kind] ? EFFECTS[info.kind].n : 'Reflect') : 'Other', real);
      this.note(t, 'taken', null, real);
      if (src) { this.stats.dmg[src.uid] = (this.stats.dmg[src.uid] || 0) + amount; if (info && info.crit) this.stats.crits++; this.stats.maxHit = Math.max(this.stats.maxHit, amount); }
      this.h.hit(t, amount, info || {}, left < amount);
      // break meter
      if (src && t.isBoss && t.alive && info && info.hit && !this.has(t, 'broken')) {
        let b = (HIT[info.hit].brk * (info.skill && info.skill.brk || 1) + (src.sets.juggernaut && info.hit === 'strong' ? 2 : 0)) * (1 - (t.breakRes || 0));
        if (t.passive === 'aethercore' && src.aff === 'Aether') b *= 1.5;
        if (b > 0) {
          t.brk = Math.max(0, t.brk - b); this.h.breakHit(t, b);
          if (t.brk <= 0) {
            t.flags.everBroken = true;
            t.effects = t.effects.filter(e => e.k !== 'burrow');
            this.addEffect(t, { k: 'broken', n: 2 }, true);
            if (t === this.active) { const e = t.effects.find(x => x.k === 'broken'); if (e) e.fresh = true; }
            t.breakMax = Math.round(t.breakMax * 1.2); t.brk = t.breakMax;
            this.h.log(`AFFINITY BREAK! ${t.name} is stunned for 2 turns and takes 15% more damage.`, src.side);
            this.h.affinityBreak(t);
          }
        }
      }
      if (t.hp <= 0 && t.sets && t.sets.fate && !t.flags.fated) {
        t.flags.fated = true; t.hp = 1;
        this.h.float(t, 'Fate holds!', 'buff'); this.h.log(`The Fate Set keeps ${t.name} standing.`, t.side);
      }
      // boss sets that save a hero from a killing blow, once per battle each
      if (t.hp <= 0 && t.sets.boneKing && !t.flags.boneUsed) {
        t.flags.boneUsed = true; t.hp = 1; this.addEffect(t, { k: 'immune', n: 2 }, true);
        this.h.float(t, 'Ossuary Regalia!', 'buff'); this.h.log(`${t.name} refuses to fall: Immune for 2 turns.`, t.side);
      }
      if (t.hp <= 0) {
        const g = this.living(this.allies(t)).find(x => x.sets.guardian && !x.flags.guardUsed);
        if (g) { g.flags.guardUsed = true; t.hp = 1; this.addEffect(t, { k: 'immune', n: 1 }, true); this.h.float(t, 'Guardian Angel!', 'buff'); this.h.log(`${g.name}'s Celestial Choir keeps ${t.name} alive.`, t.side); }
      }
      if (t.hp <= 0) {
        if ((t.passive === 'undying' || t.passive === 'rebirth') && !t.flags.revived) {
          t.flags.revived = true; t.hp = Math.round(t.maxHp * (t.passive === 'rebirth' ? 0.25 : 0.3)); t.effects = [];
          this.h.float(t, t.passive === 'rebirth' ? 'Rebirth!' : 'Undying!', 'buff'); this.h.log(`${t.name} refuses to die.`, t.side);
        } else if (t.sets.phoenix && !t.flags.phoenixUsed) {
          // Plumes of the Ashen Phoenix: rise again and set the enemy team on fire
          t.flags.phoenixUsed = true; t.hp = Math.round(t.maxHp * 0.3); t.effects = [];
          this.h.float(t, 'Phoenix Rebirth!', 'buff'); this.h.log(`${t.name} rises from the ashes.`, t.side);
          for (const f of this.living(this.foes(t))) this.addEffect(f, { k: 'burn', n: 2, src: t.uid });
        } else {
          t.hp = 0; t.alive = false; t.effects = []; this.deaths++;
          this.h.death(t); this.h.log(`${t.name} is defeated.`, t.side === 'hero' ? 'enemy' : 'hero');
          if (t.isBoss) for (const m of this.enemies) if (m.summoned && m.alive) { m.hp = 0; m.alive = false; this.h.death(m); }
          // Ossuary Regalia: the fallen one's allies with it gain a Shield
          for (const a of this.living(this.allies(t))) if (a.sets.fallShield) this.addEffect(a, { k: 'shield', n: 3, v: Math.round(a.maxHp * 0.2) });
        }
      }
      // boss sets that react to falling low, once per battle each
      if (t.alive && t.hp > 0) {
        if (t.sets.sandBurrow && !t.flags.sandUsed && t.hp < t.maxHp * 0.5) {
          t.flags.sandUsed = true; this.addEffect(t, { k: 'burrow', n: 1 }, true); this.addEffect(t, { k: 'atkUp', n: 3 }, true);
          this.h.float(t, 'Burrowed!', 'buff'); this.h.log(`${t.name} burrows into the sand.`, t.side);
        }
        if (t.sets.iceTomb && !t.flags.tombUsed && t.hp < t.maxHp * 0.3) {
          t.flags.tombUsed = true; this.addEffect(t, { k: 'iceTomb', n: 2 }, true);
          this.h.float(t, 'Encased in Ice!', 'buff'); this.h.log(`${t.name} is encased in ice.`, t.side);
        }
      }
      if (t.alive && t.isBoss) this.checkPhase(t);
      return amount;
    }
    checkPhase(t) {
      while (t.phase < t.nPhases - 1 && t.hp / t.maxHp <= t.thresholds[t.phase]) {
        t.phase++;
        const def = BOSSES[t.id];
        t.skills = mkSkills(def.phases[t.phase]);
        this.h.log(`${t.name} enters phase ${t.phase + 1}!`, 'enemy');
        this.pendingPhase = t;
        const op = def.onPhase && def.onPhase[t.phase];
        if (op) for (const fx of op) if (fx.t === 'buff') this.addEffect(t, { k: fx.k, n: fx.n });
        if (t.passive === 'chaoticform') this.addEffect(t, { k: pick(['atkUp', 'defUp', 'spdUp', 'critUp', 'regen']), n: 3 });
        this.h.phase(t, t.phase + 1);
      }
    }
    // by + label: who healed and with what, for the damage meter
    heal(t, amt, by, label) {
      if (!t.alive) return;
      if (by && by.sets.healPlus && label !== 'Lifesteal') amt *= 1.2; // Vestments of the Coiled Faith
      if (this.has(t, 'healRed')) amt *= 0.4;
      // Crimson Court: healing beyond full HP becomes a Shield (up to 25% of max HP)
      const over = amt - (t.maxHp - t.hp);
      if (t.sets.overheal && over >= 1) {
        const cap = Math.round(t.maxHp * 0.25), sh = t.effects.find(e => e.k === 'shield');
        if (sh) sh.v = Math.max(sh.v, Math.min(cap, sh.v + Math.round(over))); else this.addEffect(t, { k: 'shield', n: 3, v: Math.min(cap, Math.round(over)) }, true);
      }
      amt = Math.round(Math.min(amt, t.maxHp - t.hp));
      if (amt <= 0) return;
      t.hp += amt;
      this.note(by || t, 'heal', label || 'Healing', amt);
      this.h.healed(t, amt);
    }
    ai(u) {
      const allies = this.living(this.allies(u)), foes = this.living(this.foes(u));
      const dead = this.validTargets(u, { target: 'deadAlly' });
      const ready = u.skills.filter(s => this.usable(u, s)).sort((a, b) => b.cd - a.cd);
      let skill = u.skills[0];
      const allHidden = foes.every(f => this.has(f, 'burrow'));
      for (const s of ready) {
        const kinds = s.fx.map(f => f.t);
        if (s.target === 'deadAlly') { if (dead.length) { skill = s; break; } continue; }
        if (kinds.includes('heal') && !kinds.includes('dmg')) { if (allies.some(a => a.hp < a.maxHp * 0.7) || (kinds.includes('cleanse') && allies.some(a => a.effects.some(e => !EFFECTS[e.k].buff)))) { skill = s; break; } continue; }
        if (kinds.every(k => k === 'buff' || k === 'shield' || k === 'tmFill')) { const k = s.fx[0].k || 'shield'; const who = s.target === 'self' ? [u] : allies; if (who.every(a => this.has(a, k))) continue; }
        if (kinds.includes('summon') && (this.living(this.enemies).length >= 4)) continue;
        if (kinds.includes('dmg') && allHidden && s.cd > 0) continue;
        skill = s; break;
      }
      let target = null;
      // focus: on auto the player can tap an enemy and every hero aims single-target skills at it (taunt still wins)
      if (skill.target === 'enemy') target = this.tauntTarget(u) || this.focusTarget(u, skill) || this.pickFoe(u, this.validTargets(u, skill));
      else if (skill.target === 'ally') target = lowest(allies);
      else if (skill.target === 'deadAlly') target = dead[0];
      return { skill, target };
    }
    focusTarget(u, skill) { const f = this.focus; return f && u.side === 'hero' && f.alive && this.validTargets(u, skill).includes(f) ? f : null; }
    pickFoe(u, foes) {
      foes = this.targetable(foes.filter(f => f.alive));
      if (!foes.length) return null;
      if (u.side === 'hero') {
        const minions = foes.filter(f => f.summoned);
        const strong = foes.filter(f => hitType(u.aff, f.aff) === 'strong');
        const okk = foes.filter(f => hitType(u.aff, f.aff) !== 'weak');
        const p = minions.length && minions.length < foes.length && rnd() < 0.4 ? minions : strong.length ? strong : okk.length ? okk : foes;
        return p.reduce((a, b) => (a.hp < b.hp ? a : b));
      }
      return rnd() < 0.5 ? foes.reduce((a, b) => (a.hp < b.hp ? a : b)) : pick(foes);
    }
  }

  // ---------- Guild boss (shared by the game and the server) ----------
  // Like a clan boss: it cannot die. A fight lasts until the boss has taken GBOSS.turns of its own turns (or the team
  // falls); the damage dealt counts. Its essence changes every day (UTC) and it enrages like a Boss Hall boss
  // (u.hall), so every team eventually falls. Five difficulties like the campaign; damage on a harder one is worth
  // more points (mult). Each player has GBOSS.keys fights a day; the weekly Guild Chest pays out by points (GCHEST).
  const GBOSS = {
    keys: 3, turns: 30,
    ess: ['Ember', 'Verdant', 'Storm', 'Frost', 'Radiant', 'Umbral', 'Aether'],
    // the boss of each essence: five guild bosses of their own (animated sheets in sheets/), Storm and Radiant borrow a Boss Hall boss
    art: { Ember: 'zaroth', Verdant: 'blightedtitan', Storm: 'stormbehemoth', Frost: 'frostborn', Radiant: 'celestial', Umbral: 'seraphimfallen', Aether: 'endlessoracle' },
    lvl: [18, 34, 48, 60, 72], f: [1, 1.5, 2.1, 2.4, 2.9], mult: [1, 2.5, 5, 9, 16],
    skills: [
      SK('Rending Sweep', 'enemies', 'slam', 'quake', 0, 'Attack of 70% on all enemies. 50% chance of Defense Down for 2 turns.', [D(0.7), DB('defDown', 2, 0.5)]),
      SK('Crushing Grip', 'enemy', 'melee', 'smash', 2, 'Strike of 160%. 60% chance to Stun for 1 turn.', [D(1.6), DB('stun', 1, 0.6)]),
      SK('Cataclysm', 'enemies', 'magic', 'dark', 3, 'Attack of 110% on all enemies. 60% chance of Speed Down for 2 turns.', [D(1.1), DB('spdDown', 2, 0.6)]),
    ],
  };
  // the guild bosses: stats from a Boss Hall boss of the same essence (the guild boss gets its own skills anyway);
  // registered in BOSSES and ALL_UNITS but not in BOSS_ORDER, so the Boss Hall does not show them
  const GUILD_BOSSES = {
    zaroth: { name: 'Zaroth', title: 'The Ashen Devourer', aff: 'Ember', base: 'overlord' },
    frostborn: { name: 'Frostborn Sovereign', title: 'The Eternal Lich King', aff: 'Frost', base: 'stonedragon' },
    seraphimfallen: { name: 'Seraphim Fallen', title: 'The Void Ascended', aff: 'Umbral', base: 'voidtitan' },
    blightedtitan: { name: 'The Blighted Titan', title: 'Heart of Decay', aff: 'Verdant', base: 'treant' },
    endlessoracle: { name: 'The Endless Oracle', title: 'Lord of Forgotten Knowledge', aff: 'Aether', base: 'crystaltitan' },
  };
  for (const id in GUILD_BOSSES) { const g = GUILD_BOSSES[id]; BOSSES[id] = ALL_UNITS[id] = Object.assign({}, BOSSES[g.base], { name: g.name, title: g.title, aff: g.aff, guild: true }); }
  // essence of the day: day number since 1970 (UTC)
  const gbossEss = day => GBOSS.ess[((day % 7) + 7) % 7];
  function gbossUnit(d, ess) {
    const id = GBOSS.art[ess], u = enemyUnit(id, GBOSS.lvl[d]);
    toughen(u, GBOSS.f[d]);
    Object.assign(u, { aff: ess, immortal: true, hall: true, nPhases: 1, thresholds: [], skills: mkSkills(GBOSS.skills), passive: null });
    // it cannot die: a huge HP pool, but effects that work on max HP (Burn, Poison, Bleed) use its real HP (baseHp)
    u.baseHp = u.maxHp; u.maxHp = u.hp = 1e9;
    return u;
  }
  // sets the seeded dice and builds the fight; the caller runs it with b.auto, b.capUnit = boss, b.cap = GBOSS.turns
  function gbossSetup(team, d, ess, seed) { setRng(seeded(seed)); return { heroes: arenaUnits(team, 'hero'), enemies: [gbossUnit(d, ess)] }; }
  const gbossPoints = (dmg, d) => Math.round(dmg * GBOSS.mult[d]);
  async function gbossFight(team, d, ess, seed) {
    try {
      const { heroes, enemies } = gbossSetup(team, d, ess, seed), b = new Battle(heroes, enemies);
      b.auto = true; b.capUnit = enemies[0]; b.cap = GBOSS.turns;
      await b.run();
      const dmg = (b.meter[enemies[0].uid] || { taken: 0 }).taken;
      return { dmg, points: gbossPoints(dmg, d), turns: b.turns };
    } finally { setRng(null); }
  }
  // weekly Guild Chest by points (personal damage × difficulty mult, summed over the week)
  const GCHEST = [
    { name: 'Wooden Chest', min: 1, silver: 2000, stones: 2, fs: {} },
    { name: 'Bronze Chest', min: 50000, silver: 5000, stones: 4, fs: { fate: 1 } },
    { name: 'Silver Chest', min: 150000, silver: 8000, stones: 6, fs: { fate: 2 } },
    { name: 'Gold Chest', min: 400000, silver: 12000, stones: 10, fs: { greater: 1 } },
    { name: 'Royal Chest', min: 1000000, silver: 18000, stones: 14, fs: { greater: 2 } },
    { name: 'Mythic Chest', min: 2500000, silver: 26000, stones: 20, fs: { ancient: 1 } },
  ];
  const gchestTier = pts => GCHEST.filter(c => pts >= c.min).pop() || null;

  // ---------- Arena (shared by the game and the server, supabase/functions/arena) ----------
  // A team snapshot is what the server stores and fights with: [{ id, lvl, stars, sk: [..], items: [{ slot, rar, lvl, il, set, main, subs }] }].
  const power = st => Math.round(st.hp * 0.12 + st.atk * 1.8 + st.def * 1.3 + st.spd * 4 + st.crit * 5 + st.cdmg * 2 + (st.acc + st.res) * 0.8);
  const snapItem = it => ({ slot: it.slot, rar: it.rar, lvl: it.lvl, il: it.il, set: it.set, main: it.main, subs: it.subs.map(s => [s[0], s[1]]) });
  const teamPower = team => team.reduce((t, h) => t + power(heroStats(h.id, h, h.items)), 0);
  // highest item level that can drop: last campaign stage on the top difficulty, or the last Boss Hall level
  const MAX_IL = Math.max(diffLvl(STAGES[STAGES.length - 1], DIFFS.length - 1), bossLvl(BOSS_ORDER.length - 1, BOSS_LEVELS));
  const isInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  // Checks that a snapshot could exist in a fair game (levels, stars, skills, gear rolls within the rules).
  // Returns null when fine, else a short reason. It cannot prove the player earned it; it stops edited saves.
  function checkTeam(team) {
    if (!Array.isArray(team) || team.length < 1 || team.length > 4) return 'team size';
    const ids = new Set();
    for (const h of team) {
      const c = h && CHAMPS[h.id];
      if (!c) return 'unknown hero';
      if (ids.has(h.id)) return 'duplicate hero'; ids.add(h.id);
      // the own hero: at most one per team, always 6 stars, skills no higher than its level gives (pcSkills)
      if (c.pc) { if ([...ids].filter(isPC).length > 1) return 'own hero'; if (h.stars !== pcStars(h.lvl) || !Array.isArray(h.sk) || h.sk.some((v, i) => v > pcSkills(h.id, h.lvl)[i])) return 'own hero'; }
      if (!isInt(h.stars, baseStars(h.id), maxStars(h.id))) return 'stars';
      if (!isInt(h.lvl, 1, maxLvl(h.stars, h.id))) return 'level';
      if (!Array.isArray(h.sk) || h.sk.length > c.skills.length || !h.sk.every(v => isInt(v, 0, SKILL_MAX))) return 'skills';
      if (!Array.isArray(h.items) || h.items.length > SLOTS.length) return 'items';
      const slots = new Set();
      for (const it of h.items) {
        if (!it || !SLOTS.includes(it.slot) || slots.has(it.slot)) return 'item slot'; slots.add(it.slot);
        if (!isInt(it.rar, 0, 5) || !isInt(it.lvl, 0, MAX_GEAR_LVL) || !isInt(it.il, 1, MAX_IL) || !SETS[it.set]) return 'item';
        if (!MAIN_OPTIONS[it.slot].includes(it.main)) return 'item main stat';
        const boosts = Math.floor(it.lvl / 4);
        if (!Array.isArray(it.subs) || it.subs.length > Math.min(4, it.rar + boosts)) return 'item substats';
        const keys = new Set([it.main]);
        for (const s of it.subs) {
          const p = Array.isArray(s) && SUB_POOL.find(x => x[0] === s[0]);
          if (!p || keys.has(s[0])) return 'item substat'; keys.add(s[0]);
          // every roll is at most round(max × scale); +25% slack for items from older game versions
          if (!isInt(s[1], 1, Math.ceil((1 + boosts) * Math.round(p[2] * subScale(it, s[0])) * 1.25))) return 'item substat value';
        }
      }
    }
    return null;
  }
  // units for an arena fight; side 'hero' attacks, side 'enemy' defends
  const arenaUnits = (team, side) => team.map(h => makeUnit({ ...CHAMPS[h.id], id: h.id }, side, heroStats(h.id, h, h.items), h.sk));
  // Sets the seeded dice and builds both teams; the caller runs the Battle (auto for both sides) and then calls setRng(null).
  // In the arena a champion may revive an ally only once per fight (oneRevive: usable() refuses the revive skill after
  // that); the browser and the server set the same flag here, so their fights stay in step.
  function arenaSetup(att, def, seed) {
    setRng(seeded(seed));
    const heroes = arenaUnits(att, 'hero'), enemies = arenaUnits(def, 'enemy');
    for (const u of [...heroes, ...enemies]) u.oneRevive = true;
    return { heroes, enemies };
  }
  async function arenaFight(att, def, seed) {
    try { const { heroes, enemies } = arenaSetup(att, def, seed); const b = new Battle(heroes, enemies); b.auto = true; const res = await b.run(); return { win: res === 'win', turns: b.turns }; }
    finally { setRng(null); }
  }
  // A manual arena fight: the browser plays it (from the same seed) and records every hero action as
  // [skill index, target side 'h'/'e'/'', target slot, auto 0/1]; the server replays it with those moves and decides.
  // An auto move lets the AI choose, exactly as it did in the browser. When the moves run out before the fight is over
  // (the player gave up or left), the attacker loses. A move that is not possible falls back to the AI.
  const arenaMove = (u, act) => { const t = act.target; return [u.skills.indexOf(act.skill), t ? (t.side === 'hero' ? 'h' : 'e') : '', t ? t.slot : -1]; };
  async function arenaReplay(att, def, seed, moves) {
    try {
      const { heroes, enemies } = arenaSetup(att, def, seed), list = Array.isArray(moves) ? moves.slice(0, 2000) : [];
      let i = 0;
      const b = new Battle(heroes, enemies, { chooseAction: (u, bt) => {
        const m = list[i++];
        if (!Array.isArray(m)) { bt.aborted = true; return { skill: u.skills[0], target: null }; }
        if (m[3]) return { auto: true };
        const sk = u.skills[m[0] | 0];
        if (!sk || !bt.usable(u, sk)) return { auto: true };
        let t = (m[1] === 'e' ? bt.enemies : m[1] === 'h' ? bt.heroes : []).find(x => x.slot === m[2]) || null;
        if (t && ['enemy', 'ally', 'deadAlly'].includes(sk.target) && !bt.validTargets(u, sk).includes(t)) t = null;
        return { skill: sk, target: t };
      } });
      b.auto = false;
      const res = await b.run();
      return { win: res === 'win', turns: b.turns };
    } finally { setRng(null); }
  }
  // rating: Elo with K 32 for the attacker; the defender (who did not play) moves half as much
  function arenaElo(ra, rd, win) {
    const exp = 1 / (1 + Math.pow(10, (rd - ra) / 400));
    let att = Math.round(32 * ((win ? 1 : 0) - exp));
    if (win && att < 1) att = 1;
    if (!win && att > -1) att = -1;
    return { att, def: -Math.round(att / 2) };
  }
  // weekly rewards by rating at the end of the week (only for players who fought that week)
  const ARENA_TIERS = [
    { name: 'Bronze', min: 0, silver: 2000, fs: {} },
    { name: 'Silver', min: 1100, silver: 4000, fs: { greater: 1 } },
    { name: 'Gold', min: 1300, silver: 7000, fs: { greater: 2 }, st: { greater: 2 } },
    { name: 'Platinum', min: 1500, silver: 10000, fs: { ancient: 1 }, st: { greater: 3 } },
    { name: 'Legend', min: 1700, silver: 15000, fs: { ancient: 2 }, st: { ancient: 1 } },
  ];
  const arenaTier = rating => ARENA_TIERS.filter(t => rating >= t.min).pop();
  // extra weekly reward for the top 5 (rank among everyone who fought that week), on top of the tier reward
  const ARENA_RANK_REWARDS = [
    { silver: 0, fs: { mythic: 1 }, st: { ancient: 2 } },
    { silver: 0, fs: { ancient: 1 }, st: { ancient: 1 } },
    { silver: 0, fs: { greater: 3 } },
    { silver: 10000, fs: {} },
    { silver: 5000, fs: {} },
  ];
  const ARENA_TOKENS = 10, ARENA_TOKEN_MIN = 60; // max tokens, minutes per new token
  // Arena bots fill the opponent list while there are few players: a team near the attacker's level, stronger at a higher rating.
  const BOT_NAMES = ['Arena Warden', 'Iron Sentinel', 'Ashen Duelist', 'Gravecourt Knight', 'Stormblade Champion', 'Frostbound Guard', 'Umbral Gladiator', 'Radiant Vanguard'];
  function arenaBot(rating, refLvl, seed) {
    setRng(seeded(seed));
    try {
      const tier = Math.max(0, Math.min(4, Math.floor((rating - 900) / 200)));
      const rarW = [[60, 40, 0, 0], [30, 55, 15, 0], [10, 50, 35, 5], [0, 35, 50, 15], [0, 15, 55, 30]][tier];
      const pool = CHAMP_ORDER.filter(id => CHAMPS[id].rar >= 1), team = [];
      while (team.length < 4) {
        let r = rnd() * 100, rar = 1;
        for (let i = 0; i < 4; i++) { r -= rarW[i]; if (r < 0) { rar = i + 1; break; } }
        const cand = pool.filter(id => CHAMPS[id].rar === rar && !team.some(h => h.id === id));
        if (!cand.length) continue;
        const id = pick(cand), stars = Math.min(maxStars(id), baseStars(id) + rint(0, 2));
        const lvl = Math.max(1, Math.min(maxLvl(stars, id), Math.round(refLvl + (rating - 1000) / 50 + rint(-2, 2))));
        const rars = [[1, 2], [2, 3], [2, 3], [3, 4], [4]][tier];
        const items = SLOTS.map(slot => { const it = genGear({ il: Math.max(1, lvl), slot, rars, up: 0.3, sets: pick([BASIC_SETS, ['scherpte', 'woede'], ['wilgenbast', 'levensbron']]) }, 0); for (let n = rint(0, 3 + tier * 2); n > 0 && it.lvl < MAX_GEAR_LVL; n--) { it.lvl++; upgradeMilestone(it); } return snapItem(it); });
        team.push({ id, lvl, stars, sk: CHAMPS[id].skills.map(() => rint(0, tier)), items });
      }
      return { name: BOT_NAMES[seed % BOT_NAMES.length], team };
    } finally { setRng(null); }
  }

  return {
    GBOSS, gbossEss, gbossUnit, gbossSetup, gbossFight, gbossPoints, GCHEST, gchestTier,
    power, snapItem, teamPower, MAX_IL, checkTeam, arenaUnits, arenaSetup, arenaFight, arenaReplay, arenaMove, arenaElo, ARENA_TIERS, arenaTier, ARENA_RANK_REWARDS, ARENA_TOKENS, ARENA_TOKEN_MIN, arenaBot, BOT_NAMES, setRng, seeded,
    ESSENCES, BEATS, HIT, hitType, affMult, RARITIES, RAR_CAP, ROLES, EFFECTS, STAT_NAMES, PCT_STATS, CHAMPS, CHAMP_ORDER, DEV_HEROES, ENEMIES, BOSSES, BOSS_ORDER, ALL_UNITS, STAGES, CHAPTERS, DIFFS, diffLvl, stageDiff, stageLoot, bossLoot, CRIT_CAP, stageUnits,
    START_ROSTER, START_TEAM, STARTERS, STARTER_SUB, stageUnlock, TUNE, xpNeed, winXp, winSilver, BOSS_LEVELS, bossLvl, bossRoom, bossDiff, isWall, WALLS, ENRAGE, BLIGHT, BTRAIT, bossTrait, TOWERS, TOWER, towerFloor, towerFoes, towerUnits, towerReward, EXP_HEROES, EXPEDITIONS, expReward, ENERGY, energyMax, stageEnergy, bossEnergy, bossUnits, bossSets, bossFoes, bossPhases, PHASES, phaseRest,
    SLOTS, SLOT_NAMES, SETS, SET_FAMILY, setTiers, genGear, gearStats, upgradeCost, upgradeChance, upgradeMilestone, MAX_GEAR_LVL, fmtStat, sellValue, setCounts, activeSets,
    PC_CLASSES, PC_GENDERS, PC_IDS, isPC, PC_STARS, pcStars, pcSkills, baseStars, maxLvl, maxStars, MAX_STARS, rankCost, STONES, stoneTier, stageStones, bossStones, SKILL_MAX, SKILL_STEP, skillUp, FATE_SHARDS, SHARD, rollShards, CAPTURE_ORDER, CAPTURE_CHANCE, isCaptured, feedXp, breakStones, SHARD_PRICE, summonOne, PITY_EPIC, PITY_SHARDS,
    heroStats, heroUnit, enemyUnit, bossUnit, Battle, pick,
  };
})();
if (typeof module !== 'undefined') module.exports = K;

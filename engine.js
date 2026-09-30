// ================= ENGINE v4: Essences, hit types, speed/turn meter, bosses with phases + break =================
const K = (function () {
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
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
  const RAR_MULT = [0.85, 0.92, 1, 1.12, 1.4];
  const RAR_CAP = [40, 40, 50, 60, 60];
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
  };
  const SKIP = ['stun', 'freeze', 'broken'];
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
        SK('Crush', 'enemies', 'slam', 'quake', 3, 'Hits all enemies for 80%.', [D(0.8)]),
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
        SK('Green Fire', 'enemies', 'magic', 'poison', 3, 'Hits all enemies for 90% and heals for 20% of the damage.', [D(0.9, { steal: 0.2 })]),
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
        SK('Meteor', 'enemies', 'magic', 'meteor', 4, 'Hits all enemies for 90%. 50% chance of Heal Reduction for 2 turns.', [D(0.9), DB('healRed', 2, 0.5)]),
      ] },
    vorlund: { name: 'Vorlund', faction: 'Grey Flame', role: 'Tank', rar: 1, aff: 'Radiant',
      passive: 'retribution', passiveName: 'Retribution', passiveDesc: '30% chance to counterattack when hit.',
      skills: [
        SK('Lance Thrust', 'enemy', 'melee', 'stab', 0, 'Thrust of 100%. 50% chance of Taunt for 1 turn.', [D(1.0), DB('taunt', 1, 0.5)]),
        SK('Golden Bulwark', 'allies', 'buff', 'shield', 4, 'All allies gain Defense Up for 2 turns and a shield of 12% of his max HP.', [BF('defUp', 2), SH(0.12, 2)]),
      ] },
    karnok: { name: 'Karnok', faction: 'Ironbeard Clans', role: 'Warrior', rar: 1, aff: 'Storm',
      skills: [
        SK('Hammer Blow', 'enemy', 'melee', 'smash', 0, 'Strike of 95%. 20% chance to Stun for 1 turn.', [D(0.95), DB('stun', 1, 0.2)]),
        SK('Anvil Wall', 'allies', 'buff', 'shield', 3, 'All allies gain Defense Up for 2 turns.', [BF('defUp', 2)]),
      ] },
    // ----- heroes 26-50 (Fate Altar only) -----
    kaelira: { name: 'Kaelira', faction: 'Grey Flame', role: 'Mage', role2: 'Support', rar: 3, aff: 'Radiant',
      passive: 'bloom', passiveName: 'Dawn Grace', passiveDesc: 'Her heals are 20% stronger.',
      skills: [
        SK('Sunbolt', 'enemy', 'magic', 'holy', 0, 'Attack of 100%. 30% chance of Accuracy Down for 2 turns.', [D(1.0), DB('accDown', 2, 0.3)]),
        SK('Radiant Hymn', 'allies', 'buff', 'heal', 3, 'Heals all allies for 20% and grants Crit Rate Up for 2 turns.', [HEAL(0.2), BF('critUp', 2)]),
        SK('Solar Flare', 'enemies', 'magic', 'sunfall', 4, 'Hits all enemies for 85%. 50% chance of Accuracy Down for 2 turns.', [D(0.85), DB('accDown', 2, 0.5)]),
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
        SK('Barbed Volley', 'enemies', 'ranged', 'arrowrain', 3, 'Hits all enemies for 60%. 40% chance of Poison for 2 turns.', [D(0.6), DB('poison', 2, 0.4)]),
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
        SK('Shatter', 'enemy', 'melee', 'smash', 4, 'Heavy strike of 170%.', [D(1.7)]),
      ] },
    zephara: { name: 'Zephara', faction: 'Silvertongues', role: 'Assassin', rar: 3, aff: 'Storm',
      passive: 'crimsonwings', passiveName: 'Tailwind', passiveDesc: '+15 Speed.',
      skills: [
        SK('Lightning Claws', 'enemy', 'melee', 'slash', 0, 'Two strikes of 55%.', [D(0.55)], { hits: 2 }),
        SK('Storm Dash', 'lowestEnemy', 'melee', 'stab', 3, 'Gains Stealth for 2 turns and strikes the weakest enemy for 150%.', [BF('stealth', 2, 'self'), D(1.5)]),
        SK('Thunderstrike', 'enemy', 'melee', 'rune', 4, 'Strike of 220%. 40% chance to Stun for 1 turn.', [D(2.2), DB('stun', 1, 0.4)]),
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
        SK('Halo Strike', 'enemy', 'magic', 'holy', 0, 'Attack of 90%. Heals the weakest ally for 8%.', [D(0.9), HEAL(0.08, 'lowestAlly')]),
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
        SK('Aether Rend', 'enemy', 'melee', 'dark', 4, 'Strike of 230%. +60% damage below 35% HP.', [D(2.3, { execute: [0.35, 0.6] })]),
      ] },
    orvyn: { name: 'Orvyn', faction: 'Silvertongues', role: 'Ranger', rar: 2, aff: 'Storm',
      passive: 'overcharge', passiveName: 'Charged Arrows', passiveDesc: '+30% Crit Damage.',
      skills: [
        SK('Spark Shot', 'enemy', 'ranged', 'arrow', 0, 'Arrow of 100%.', [D(1.0)]),
        SK('Lightning Volley', 'random', 'ranged', 'arrow', 3, 'Four arrows of 50% on random enemies.', [D(0.5)], { hits: 4 }),
        SK('Thunder Arrow', 'enemy', 'ranged', 'arrow', 4, 'Arrow of 180% that drains 30% Turn Meter. 40% chance of Speed Down for 2 turns.', [D(1.8), TMD(0.3), DB('spdDown', 2, 0.4)]),
      ] },
    celesthyr: { name: 'Celesthyr', faction: 'Grey Flame', role: 'Mage', role2: 'Controller', rar: 4, aff: 'Radiant',
      passive: 'seduction', passiveName: 'Celestial Will', passiveDesc: '+15% chance for his debuffs to land.',
      skills: [
        SK('Starfire', 'enemy', 'magic', 'holy', 0, 'Attack of 110%. 30% chance of Accuracy Down for 2 turns.', [D(1.1), DB('accDown', 2, 0.3)]),
        SK('Judgement', 'enemy', 'magic', 'sunfall', 3, 'Attack of 140%. 60% chance of Silence for 2 turns.', [D(1.4), DB('silence', 2, 0.6)]),
        SK('Sunfall', 'enemies', 'magic', 'sunfall', 5, 'Hits all enemies for 90%. 45% chance to Stun for 1 turn.', [D(0.9), DB('stun', 1, 0.45)]),
      ] },
  };
  for (const id in CHAMPS) CHAMPS[id].short = CHAMPS[id].name;
  const CHAMP_ORDER = ['bromir', 'grythor', 'skavren', 'draelyn', 'vaessa', 'brukkar', 'karnok', 'morgrim', 'vorlund', 'valkessa', 'faedrin', 'krothar', 'ithyra', 'nyressa', 'selenia', 'drakulen', 'keldrax', 'oraneth', 'zarvion', 'sylreth', 'thalnir', 'aurelion', 'zyrael', 'velmira', 'nithara',
    'kaelira', 'vorak', 'elyndra', 'morveth', 'theryn', 'arkanis', 'liora', 'gorvann', 'sylvara', 'veyrith', 'astraea', 'korran', 'zephara', 'malreth', 'eryndor', 'ignara', 'thalessa', 'ravok', 'seraphine', 'draevan', 'mirella', 'volkaris', 'nyxara', 'orvyn', 'celesthyr'];

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
  const FEED_RATE = [0.25, 0.4, 0.6, 0.9, 1.3];
  const feedXp = (foodId, heroLvl, foodLvl) => Math.round(xpNeed(heroLvl) * FEED_RATE[CHAMPS[foodId].rar] * (1 + ((foodLvl || 1) - 1) / 20));
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
      [SK('Void Collapse', 'enemies', 'magic', 'dark', 0, '', [D(0.85)]), SK('Summon Void Shards', 'self', 'buff', 'curse', 4, '', [{ t: 'summon', id: 'schim', max: 2 }], { startCd: 0 }), SK('Void Strike', 'enemy', 'melee', 'dark', 2, '', [D(1.3)], { startCd: 1 })],
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
    { name: 'The Fallen Kingdom', set: 'krijger', desc: 'The heroes begin in a fallen realm, overrun by monsters and darkness.', area: 0, pool: [['botkrijger', 'gravestalker', 'cryptschutter', 'ashgoblin', 'zombie'], ['hellehond', 'cultist', 'cryptguard']], boss: 'grakk', adds: ['ashgoblin', 'cultist'], unlock: { 0: 'draelyn', 1: 'bromir', 2: 'skavren', 3: 'karnok', 6: 'morgrim' }, shapes: { 0: [1, 0], 1: [2, 0], 2: [2, 0] } },
    { name: 'Whispers of the Dead', set: 'levensbron', desc: 'Ancient ruins, the undead and secrets of the past come to light.', area: 0, pool: [['cryptguard', 'botkrijger', 'gravestalker', 'cryptschutter', 'schim'], ['skeletridder', 'soulreaver', 'doodsmagier', 'dreadarcher', 'banshee']], boss: 'boneking', adds: ['cryptguard', 'dreadarcher'], unlock: { 2: 'grythor', 6: 'vorlund' } },
    { name: 'The Blighted Wilds', set: 'precisie', desc: 'A cursed forest where nature itself has been corrupted.', area: 3, pool: [['mosscrawler', 'hagedisstrijder', 'thornbeast', 'hagedissjamaan', 'wouddruide'], ['rotvineshambler', 'hagedisbruut', 'moerasheks', 'pestbrenger']], boss: 'treant', adds: ['mosscrawler', 'rotvineshambler'], unlock: { 2: 'vaessa', 6: 'valkessa' } },
    { name: 'Embers of War', set: 'vlammenhart', desc: 'War rages across the land as demonic forces rise.', area: 4, pool: [['ashgoblin', 'cinderhound', 'hellehond', 'flameberserker', 'cultist'], ['hellfireshaman', 'helsebruut', 'magmabrute', 'succubus', 'gevallenridder']], boss: 'overlord', adds: ['flameberserker'], unlock: { 2: 'brukkar' } },
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
      const foes = s === 6 ? [ch.boss, ...ch.adds] : stageGroup(ch, c, s, 0);
      const shape = Math.min(s, STAGE_SHAPE.length - 1);
      const phases = [stageGroup(ch, c, shape, 1), stageGroup(ch, c, shape, 2), foes];
      STAGES.push({ chapter: c, n: s, lvl, foes, phases, slot: STAGE_SLOTS[s], set: ch.set, area: ch.area, boss: s === 6 ? BOSSES[ch.boss].name : null, unlock: ch.unlock && ch.unlock[s] });
    }
  });
  // Campaign difficulties: the whole campaign again, with enemies `lvl` levels higher and `f` times stronger.
  // Each one opens when every stage of the previous one is cleared. `rars` = the only gear rarities that drop
  // (the higher one is rarer, see stageLoot). Easy is the base campaign that campaign-sim.cjs tunes.
  const DIFFS = [
    { id: 'easy', name: 'Easy', lvl: 0, f: 1, rars: [1, 2] },
    { id: 'normal', name: 'Normal', lvl: 6, f: 1.35, rars: [2, 3] },
    { id: 'hard', name: 'Hard', lvl: 12, f: 1.8, rars: [3, 4] },
    { id: 'brutal', name: 'Brutal', lvl: 18, f: 2.4, rars: [4] },
    { id: 'nightmare', name: 'Nightmare', lvl: 24, f: 3.2, rars: [4, 5] },
  ];
  // gear drop options for a campaign stage: the higher rarity gets likelier in later chapters and on the boss stage
  function stageLoot(st, d) {
    const D = DIFFS[d || 0], hi = D.rars[D.rars.length - 1];
    const up = hi === 5 ? 0.06 + st.chapter * 0.015 + (st.n === 6 ? 0.06 : 0) : 0.15 + st.chapter * 0.035 + (st.n === 6 ? 0.15 : 0);
    return { rars: D.rars, up: Math.min(0.6, up) };
  }
  // Boss Hall gear: Rare/Epic on levels 1-4, Epic/Legendary on 5-8, only Legendary on 9-10 (never Mythical)
  const bossLoot = n => ({ rars: n <= 4 ? [2, 3] : n <= 8 ? [3, 4] : [4], up: 0.25 + (n - 1) % 4 * 0.05 });
  // Campaign difficulty (the grind): enemies get stronger than same-level heroes chapter by chapter (chDiff per chapter),
  // and the chapter boss stage is an extra wall. Rewards per win are scaled by xp/silver. Tuned with campaign-sim.cjs.
  // chDiff 0.2 / bossWall 1.05 (retuned for the Easy loot table, non-stacking sets, the crit cap and 2500-Sigil shards):
  // a new player who farms, upgrades, ascends and summons needs roughly 2,000-4,000 battles (median ~2,800) to finish
  // the Easy campaign, most of them in Chapters VII-X (campaign-sim.cjs).
  // Late chapters need summoned Epic/Legendary heroes and upgraded gear; levels alone are not enough.
  const TUNE = { chDiff: 0.2, bossWall: 1.05, xp: 1, silver: 1 };
  // Chapters I-II play at the base level; from Chapter III on every chapter adds chDiff
  const stageDiff = st => (1 + TUNE.chDiff * Math.max(0, st.chapter - 1)) * (st.n === 6 ? TUNE.bossWall : 1);
  function toughen(u, f) { u.maxHp = u.hp = Math.round(u.maxHp * f); u.atk = Math.round(u.atk * f); return u; }
  // chapter bosses fight a few levels below the stage level (they bring adds); p = phase index, default the last phase
  // d = difficulty index (DIFFS); lvl already includes the difficulty's level bonus
  const stageUnits = (st, lvl, p, d) => (p == null ? st.foes : st.phases[p]).map(f => toughen(enemyUnit(f, BOSSES[f] ? Math.max(1, lvl - 3) : lvl), stageDiff(st) * DIFFS[d || 0].f));
  // between phases: survivors recover 15% HP, cooldowns reset, buffs and debuffs end; the fallen stay down
  function phaseRest(heroes) {
    for (const u of heroes) {
      if (!u.alive) continue;
      u.hp = Math.min(u.maxHp, Math.round(u.hp + u.maxHp * 0.15));
      u.effects = []; u.tm = Math.random() * 20;
      for (const s of u.skills) s.cdLeft = 0;
    }
  }
  // a new player picks one starter; the rest of the team is earned in Chapter I (see CHAPTERS[0].unlock)
  const STARTERS = ['krothar', 'drakulen', 'zephara', 'thalnir'];
  // legacy starting roster, only used to migrate very old saves
  const START_ROSTER = ['bromir', 'grythor', 'skavren', 'draelyn', 'vaessa', 'brukkar'];
  const START_TEAM = ['bromir', 'grythor', 'skavren', 'draelyn'];
  const xpNeed = lvl => 60 * lvl + 6 * lvl * lvl;
  // rewards per cleared stage or Boss Hall level; kept low on purpose so progress needs replays (see TUNE)
  const winXp = lvl => Math.round(TUNE.xp * (40 + lvl * 28));
  const winSilver = lvl => Math.round(TUNE.silver * (120 + lvl * 60));

  // ---------- Boss Hall ----------
  const BOSS_LEVELS = 10;
  const bossLvl = (i, n) => Math.round(9 + i * 1.5 + (n - 1) * 4);
  const SET_GROUPS = [['vlammenhart', 'scherpte', 'nachtscherf'], ['woede', 'asvloek', 'vampierbloed'], ['wilgenbast', 'levensbron', 'wraak'], ['windloper', 'scherpte', 'vlammenhart']];
  const bossSets = i => SET_GROUPS[i % SET_GROUPS.length];
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
  // Campaign sets: one per chapter (see CHAPTERS[].set). Fury, Nightshard, Vengeance and Ashcurse only drop in the Boss Hall.
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
  const SUB_POOL = [['hpP', 3, 6], ['atkP', 3, 6], ['defP', 3, 6], ['crit', 2, 5], ['cdmg', 3, 7], ['acc', 3, 8], ['res', 3, 8], ['atk', 4, 10], ['hp', 30, 70], ['def', 2, 5], ['spd', 2, 4]];
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
    if (opts.rars) rar = opts.rars.length > 1 && Math.random() < (opts.up ?? 0.3) ? opts.rars[1] : opts.rars[0];
    else { const roll = Math.random() + il * 0.02 + (opts.rarBoost || 0); rar = roll > 1.32 ? 4 : roll > 1.08 ? 3 : roll > 0.78 ? 2 : roll > 0.42 ? 1 : 0; }
    const slot = opts.slot || pick(SLOTS), mk = pick(MAIN_OPTIONS[slot]);
    const set = opts.sets ? pick(opts.sets) : pick(BASIC_SETS);
    const it = { id, slot, rar, lvl: 0, il, set, main: mk, subs: [], owner: null };
    for (let i = 0; i < Math.min(4, rar); i++) it.subs.push(rollSub(it, [mk, ...it.subs.map(s => s[0])]));
    return it;
  }
  function gearStats(it) {
    const out = [[it.main, Math.round(mainValue(it.main, it.il, it.rar) * (1 + 0.06 * it.lvl))]];
    for (const s of it.subs) out.push([s[0], s[1]]);
    return out;
  }
  const MAX_GEAR_LVL = 12;
  const upgradeCost = it => Math.round(40 * (it.lvl + 1) * (it.rar + 1) * (1 + it.il / 10));
  const upgradeChance = it => Math.max(0.35, 1 - it.lvl * 0.055);
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

  // ---------- Stars / ranks / skill levels ----------
  const baseStars = id => CHAMPS[id].rar + 1;
  const MAX_STARS = 6;
  function maxLvl(stars, id) { const cap = id && CHAMPS[id] ? RAR_CAP[CHAMPS[id].rar] : 60; return Math.min(cap, stars * 10); }
  function maxStars(id) { return Math.min(MAX_STARS, Math.ceil(RAR_CAP[CHAMPS[id].rar] / 10)); }
  const rankCost = stars => ({ stones: stars * 4, silver: 400 * stars * stars });
  // every skill can be levelled SKILL_MAX times (by feeding a duplicate of the same hero): +SKILL_STEP power per level,
  // and at the maximum level a skill with a cooldown gets 1 turn shorter
  const SKILL_MAX = 5, SKILL_STEP = 0.08;

  // ---------- Summon ----------
  // Fate Shards: each tier has its own rarity table (index = rarity) and a drop chance per victory.
  const FATE_SHARDS = [
    { id: 'fate', name: 'Fate Shard', drop: 0.15, rates: [0, 75, 25, 0, 0], desc: 'Normal summon: Uncommon, with a chance of Rare.' },
    { id: 'greater', name: 'Greater Fate Shard', drop: 0.03, rates: [0, 55, 40, 5, 0], desc: 'Better pool: Uncommon, a bigger chance of Rare and a small chance of Epic.' },
    { id: 'ancient', name: 'Ancient Fate Shard', drop: 0.01, rates: [0, 0, 80, 20, 0], desc: 'Guaranteed Rare, with a chance of Epic.' },
    { id: 'mythic', name: 'Mythic Fate Shard', drop: 0.0015, rates: [0, 0, 0, 95, 5], desc: 'Guaranteed Epic, with a small chance of Legendary.' },
    { id: 'legendary', name: 'Legendary Fate Shard', drop: 0.00025, rates: [0, 0, 0, 35, 65], desc: 'Guaranteed Epic or better, with a big chance of Legendary.' },
  ];
  const SHARD = Object.fromEntries(FATE_SHARDS.map(f => [f.id, f]));
  const SHARD_PRICE = 2500;
  function rollShards() { return FATE_SHARDS.filter(f => Math.random() < f.drop).map(f => f.id); }
  // pity: after PITY_EPIC summons in a row without an Epic or better, the next one is at least Epic (st.pity counts).
  // Only shards in PITY_SHARDS (Ancient and up) count and can trigger it; Fate and Greater Fate Shards leave it alone.
  const PITY_EPIC = 40;
  const PITY_SHARDS = ['ancient', 'mythic', 'legendary'];
  function summonOne(st, type) {
    const T = SHARD[type || 'fate'];
    const r = Math.random() * 100; let acc = 0, rar = 1;
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
    for (const k of activeSets(items)) { const S = SETS[k]; if (S.bonus) for (const bk in S.bonus) add(bk, S.bonus[bk]); if (S.flag) flags[S.flag] = true; }
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
      passive: src.passive || null, effects: [], alive: true, stacks: {}, flags: {}, boss: !!src.boss, big: !!src.isBoss, slot: 0, tm: Math.random() * 20,
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
    chooseAction: null, turnStart: wait, before: wait, after: wait, pause: wait, round() {}, hit() {}, healed() {},
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
      this.deaths = 0;
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
    }
    async run() {
      await this.start();
      while (!this.check()) {
        if (this.turns > 300) { this.over = 'lose'; break; }
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
        this.damage(u, Math.round(u.maxHp * DOT[e.k] * (e.v || 1)), null, { kind: e.k }); ticked = true;
      }
      if (u.alive && this.has(u, 'regen')) { this.heal(u, u.maxHp * 0.1); ticked = true; }
      if (u.alive && u.passive === 'deeproots') { this.heal(u, u.maxHp * 0.05); ticked = true; }
      if (u.alive && u.passive === 'beacon') { const l = lowest(this.living(this.allies(u))); if (l.hp < l.maxHp) { this.heal(l, l.maxHp * 0.05); ticked = true; } }
      if (u.alive && u.passive === 'harmony') for (const a of this.living(this.allies(u))) if (a.hp < a.maxHp) { this.heal(a, a.maxHp * 0.04); ticked = true; }
      if (ticked) await this.h.pause(360);
      if (!u.alive || this.check()) { this.endTurn(u, null); return; }
      let used = null;
      const skip = SKIP.find(k => this.has(u, k));
      if (skip) {
        this.h.log(`${u.name} is ${skip === 'broken' ? 'broken' : skip === 'freeze' ? 'frozen' : 'stunned'} and loses the turn.`, u.side);
        this.h.float(u, EFFECTS[skip].n, 'debuff');
        await this.h.pause(480);
      } else {
        let extra = 0;
        do {
          u.flags.crit = false;
          const act = (u.side === 'hero' && !this.auto && this.h.chooseAction) ? await this.h.chooseAction(u, this) : this.ai(u);
          if (this.aborted) return;
          used = act.skill;
          await this.perform(u, act.skill, act.target);
          if (extra === 0 && u.alive && u.flags.crit && u.sets.extraTurn && Math.random() < 0.18 && !this.check()) {
            extra = 1; this.h.float(u, 'Extra turn!', 'buff'); this.h.log(`${u.name} gets an extra turn.`, u.side);
            for (const s of u.skills) s.cdLeft = s === used ? s.cd : Math.max(0, s.cdLeft - 1);
            await this.h.pause(300);
          } else break;
        } while (true);
      }
      // boss end-of-turn passives
      if (u.alive && u.passive === 'toxicpresence') for (const t of this.living(this.foes(u))) if (Math.random() < 0.15) this.addEffect(t, { k: 'poison', n: 2, v: 1 });
      if (u.alive && u.passive === 'deathmark') { u.stacks.mark = (u.stacks.mark || 0) + 1; if (u.stacks.mark % 2 === 0) { const t = pick(this.living(this.foes(u))); if (t) this.addEffect(t, { k: 'mark', n: 2 }); } }
      this.endTurn(u, used);
    }
    endTurn(u, used) {
      for (const s of u.skills) s.cdLeft = s === used ? s.cd : Math.max(0, s.cdLeft - 1);
      for (const e of u.effects) { if (e.fresh) e.fresh = false; else e.n--; }
      const wasBroken = this.has(u, 'broken');
      u.effects = u.effects.filter(e => e.n > 0);
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
              if (fx.steal) this.heal(u, dealt * fx.steal);
              if (u.sets.lifesteal) this.heal(u, dealt * 0.3);
              if (u.passive === 'bloodfeast') this.heal(u, dealt * 0.25);
              if (u.passive === 'frozencurse' && t.alive && Math.random() < 0.3) this.addEffect(t, { k: 'spdDown', n: 2 });
              if (u.passive === 'staticcharge') u.stacks.charge = (u.stacks.charge || 0) >= 3 ? 0 : (u.stacks.charge || 0) + 1;
              if (was && !t.alive) killed++;
              hitMap.set(t, r.hit);
              if (dealt > 0) this.onHitPassives(u, t, r, skill);
              if (!isCounter && t.alive && dealt > 0 && !SKIP.some(k => this.has(t, k)) && !counters.includes(t)) {
                const ch = (t.passive === 'retribution' ? 0.3 : 0) + (t.sets.counter ? 0.25 : 0) + (this.has(t, 'counter') ? 0.5 : 0);
                if (ch > 0 && Math.random() < ch) counters.push(t);
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
            if (Math.random() < ch) this.addEffect(t, { k: fx.k, n: fx.n, src: u.uid, v: (fx.k === 'burn' && u.passive === 'kindling') || (fx.k === 'poison' && (u.passive === 'venomfaith' || this.enemies.some(x => x.alive && x.passive === 'venomfaith' && x.side === u.side))) ? 1.5 : 1 });
            else this.h.float(t, 'Resisted', 'resist');
          }
        } else if (fx.t === 'randomDebuff') {
          for (const t of targets.filter(t => t.alive && t.side !== u.side)) { if (this.has(t, 'immune')) continue; if (Math.random() < 0.6) this.addEffect(t, { k: pick(['atkDown', 'defDown', 'spdDown', 'poison', 'burn', 'silence', 'accDown']), n: 2 }); }
        } else if (fx.t === 'buff') {
          const list = fx.to === 'self' ? [u] : fx.to === 'allAllies' ? this.living(this.allies(u)) : targets.filter(t => t.side === u.side);
          for (const t of (list.length ? list : [u]).filter(t => t.alive)) this.addEffect(t, { k: fx.k, n: fx.n });
        } else if (fx.t === 'heal') {
          const list = fx.to === 'lowestAlly' ? [lowest(this.living(this.allies(u)))] : targets.filter(t => t.side === u.side);
          for (const t of list.filter(t => t.alive)) this.heal(t, t.maxHp * fx.pct * lvMult * (u.passive === 'bloom' ? 1.2 : 1));
        } else if (fx.t === 'shield') {
          for (const t of targets.filter(t => t.alive && t.side === u.side)) this.addEffect(t, { k: 'shield', n: fx.n, v: Math.round(u.maxHp * fx.pct * lvMult) });
        } else if (fx.t === 'cleanse') {
          for (const t of targets.filter(t => t.alive && t.side === u.side)) {
            const before = t.effects.length;
            t.effects = t.effects.filter(e => EFFECTS[e.k].buff || e.k === 'broken');
            if (t.effects.length < before) this.h.float(t, 'Cleansed', 'buff');
          }
        } else if (fx.t === 'revive') {
          const t = targets[0];
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
      if (killed) {
        if (u.passive === 'bloodfrenzy') u.stacks.smids = Math.min(3, (u.stacks.smids || 0) + killed);
        if (u.passive === 'killingspree' && u.alive) u.tm = Math.min(100, u.tm + 50);
        if (u.passive === 'sanguine') this.heal(u, u.maxHp * 0.05 * killed);
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
    onHitPassives(a, t, r) {
      if (!t.alive || !a.alive) return;
      if (t.passive === 'molten' && r.hit === 'weak' && Math.random() < 0.2) this.addEffect(a, { k: 'burn', n: 2 });
      if (t.passive === 'frozencore' && Math.random() < 0.25) this.addEffect(a, { k: 'spdDown', n: 2 });
      if (t.passive === 'ancientroots' && Math.random() < 0.2) { this.addEffect(a, { k: 'spdDown', n: 2 }); this.h.float(a, 'Rooted', 'debuff'); }
      if (t.passive === 'glacial' && Math.random() < 0.2) this.addEffect(a, { k: 'spdDown', n: 1 });
    }
    addEffect(t, e, quiet) {
      if (!EFFECTS[e.k].buff && e.k !== 'broken' && this.has(t, 'immune')) return;
      e.fresh = t === this.active;
      const ex = t.effects.find(x => x.k === e.k);
      if (ex) { ex.n = Math.max(ex.n, e.n); if (e.v) ex.v = Math.max(ex.v || 0, e.v); if (e.src) ex.src = e.src; ex.fresh = ex.fresh || e.fresh; }
      else t.effects.push(e);
      if (!quiet) this.h.float(t, EFFECTS[e.k].n, EFFECTS[e.k].buff ? 'buff' : 'debuff');
    }
    calc(a, t, m, fx, skill) {
      let atk = a.atk;
      if (this.has(a, 'atkUp')) atk *= 1.5;
      if (this.has(a, 'atkDown')) atk *= 0.5;
      if (a.stacks.smids) atk *= 1 + 0.1 * a.stacks.smids;
      if (a.passive === 'bloodlust' && a.hp < a.maxHp * 0.5) atk *= 1.3;
      if (a.passive === 'soulharvest') atk *= 1 + 0.1 * Math.min(5, this.deaths);
      let def = t.def;
    if (a.sets && a.sets.pierce) def *= 0.75;
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
        crit = Math.random() * 100 < Math.min(CRIT_CAP, cr);
      }
      if (crit) raw *= 1 + (a.cdmg + (this.has(a, 'cdmgUp') ? 30 : 0)) / 100;
      let d = raw * H.mult * (100 / (100 + def));
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
      d *= 0.95 + Math.random() * 0.1;
      return { dmg: Math.max(1, Math.round(d)), crit, hit, skill };
    }
    damage(t, amount, src, info) {
      if (!t.alive) return 0;
      if (this.has(t, 'burrow')) { this.h.float(t, 'Immune', 'resist'); return 0; }
      let left = amount;
      const sh = t.effects.find(e => e.k === 'shield');
      if (sh) { const ab = Math.min(sh.v, left); sh.v -= ab; left -= ab; if (sh.v <= 0) t.effects = t.effects.filter(e => e !== sh); }
      t.hp -= left;
      if (src) { this.stats.dmg[src.uid] = (this.stats.dmg[src.uid] || 0) + amount; if (info && info.crit) this.stats.crits++; this.stats.maxHit = Math.max(this.stats.maxHit, amount); }
      this.h.hit(t, amount, info || {}, left < amount);
      // break meter
      if (src && t.isBoss && t.alive && info && info.hit && !this.has(t, 'broken')) {
        let b = HIT[info.hit].brk * (info.skill && info.skill.brk || 1) * (1 - (t.breakRes || 0));
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
      if (t.hp <= 0) {
        if ((t.passive === 'undying' || t.passive === 'rebirth') && !t.flags.revived) {
          t.flags.revived = true; t.hp = Math.round(t.maxHp * (t.passive === 'rebirth' ? 0.25 : 0.3)); t.effects = [];
          this.h.float(t, t.passive === 'rebirth' ? 'Rebirth!' : 'Undying!', 'buff'); this.h.log(`${t.name} refuses to die.`, t.side);
        } else {
          t.hp = 0; t.alive = false; t.effects = []; this.deaths++;
          this.h.death(t); this.h.log(`${t.name} is defeated.`, t.side === 'hero' ? 'enemy' : 'hero');
          if (t.isBoss) for (const m of this.enemies) if (m.summoned && m.alive) { m.hp = 0; m.alive = false; this.h.death(m); }
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
    heal(t, amt) {
      if (!t.alive) return;
      if (this.has(t, 'healRed')) amt *= 0.4;
      amt = Math.round(Math.min(amt, t.maxHp - t.hp));
      if (amt <= 0) return;
      t.hp += amt;
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
      if (skill.target === 'enemy') target = this.tauntTarget(u) || this.pickFoe(u, this.validTargets(u, skill));
      else if (skill.target === 'ally') target = lowest(allies);
      else if (skill.target === 'deadAlly') target = dead[0];
      return { skill, target };
    }
    pickFoe(u, foes) {
      foes = this.targetable(foes.filter(f => f.alive));
      if (!foes.length) return null;
      if (u.side === 'hero') {
        const minions = foes.filter(f => f.summoned);
        const strong = foes.filter(f => hitType(u.aff, f.aff) === 'strong');
        const okk = foes.filter(f => hitType(u.aff, f.aff) !== 'weak');
        const p = minions.length && minions.length < foes.length && Math.random() < 0.4 ? minions : strong.length ? strong : okk.length ? okk : foes;
        return p.reduce((a, b) => (a.hp < b.hp ? a : b));
      }
      return Math.random() < 0.5 ? foes.reduce((a, b) => (a.hp < b.hp ? a : b)) : pick(foes);
    }
  }

  return {
    ESSENCES, BEATS, HIT, hitType, affMult, RARITIES, RAR_CAP, ROLES, EFFECTS, STAT_NAMES, PCT_STATS, CHAMPS, CHAMP_ORDER, ENEMIES, BOSSES, BOSS_ORDER, ALL_UNITS, STAGES, CHAPTERS, DIFFS, stageLoot, bossLoot, CRIT_CAP, stageUnits,
    START_ROSTER, START_TEAM, STARTERS, TUNE, xpNeed, winXp, winSilver, BOSS_LEVELS, bossLvl, bossSets, bossFoes, bossPhases, PHASES, phaseRest,
    SLOTS, SLOT_NAMES, SETS, genGear, gearStats, upgradeCost, upgradeChance, upgradeMilestone, MAX_GEAR_LVL, fmtStat, sellValue, setCounts, activeSets,
    baseStars, maxLvl, maxStars, MAX_STARS, rankCost, SKILL_MAX, SKILL_STEP, skillUp, FATE_SHARDS, SHARD, rollShards, CAPTURE_ORDER, CAPTURE_CHANCE, isCaptured, feedXp, breakStones, SHARD_PRICE, summonOne, PITY_EPIC, PITY_SHARDS,
    heroStats, heroUnit, enemyUnit, bossUnit, Battle, pick,
  };
})();
if (typeof module !== 'undefined') module.exports = K;

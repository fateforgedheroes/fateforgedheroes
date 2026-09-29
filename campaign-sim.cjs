// Balance smoke test: an auto-played starter team must be able to finish the campaign.
// Run: npm test
const fs = require('fs'), path = require('path');
const K = new Function(fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8') + '\nreturn K;')();
const W = { atk: 3, hp: 0.12, def: 1, crit: 3, cdmg: 1.5, atkP: 4, hpP: 3, defP: 2, acc: 0.3, res: 0.3, spd: 4 };
const score = it => K.gearStats(it).reduce((s, [k, v]) => s + (W[k] || 0) * v, 0);
function newState() { const st = { roster: {}, team: K.START_TEAM.slice(), inv: [], cleared: -1, silver: 300, stones: 0, nid: 1 }; K.START_ROSTER.forEach(id => (st.roster[id] = { lvl: 1, xp: 0, stars: K.baseStars(id), sk: K.CHAMPS[id].skills.map(() => 0) })); return st; }
// a stage is 3 phases in a row; survivors carry their HP over (with the small rest in between)
async function fight(st, S) {
  const heroes = st.team.map(id => K.heroUnit(id, st.roster[id], st.inv.filter(i => i.owner === id)));
  for (let p = 0; p < K.PHASES; p++) {
    if (p) K.phaseRest(heroes);
    if ((await new K.Battle(heroes, K.stageUnits(S, S.lvl, p), {}).run()) !== 'win') return 'lose';
  }
  return 'win';
}
function reward(st, S, first) {
  for (const id of st.team) { const h = st.roster[id], cap = K.maxLvl(h.stars, id); if (h.lvl >= cap) continue; h.xp += K.winXp(S.lvl); while (h.lvl < cap && h.xp >= K.xpNeed(h.lvl)) { h.xp -= K.xpNeed(h.lvl); h.lvl++; } }
  st.silver += K.winSilver(S.lvl); st.stones += first ? 3 : Math.random() < 0.35 ? 1 : 0;
  if (first || Math.random() < 0.65) st.inv.push(K.genGear({ il: S.lvl, slot: S.slot || K.pick(K.SLOTS), sets: [S.set] }, st.nid++));
  for (const id of st.team) for (const slot of K.SLOTS) { const cur = st.inv.find(i => i.owner === id && i.slot === slot); const best = st.inv.filter(i => i.slot === slot && (!i.owner || i.owner === id)).sort((a, b) => score(b) - score(a))[0]; if (best && best !== cur) { if (cur) cur.owner = null; best.owner = id; } }
  for (const id of st.team) { const h = st.roster[id], c = K.rankCost(h.stars); if (h.lvl >= K.maxLvl(h.stars, id) && h.stars < K.maxStars(id) && st.stones >= c.stones && st.silver >= c.silver) { st.stones -= c.stones; st.silver -= c.silver; h.stars++; } }
  let sp = true; while (sp) { sp = false; for (const it of st.inv.filter(i => i.owner)) { const c = K.upgradeCost(it); if (it.lvl < K.MAX_GEAR_LVL && st.silver >= c + 2000) { st.silver -= c; if (Math.random() < K.upgradeChance(it)) { it.lvl++; K.upgradeMilestone(it); } sp = true; } } }
}
(async () => {
  const st = newState(); let n = 0;
  while (st.cleared < K.STAGES.length - 1 && n < 1500) {
    const s = st.cleared + 1, S = K.STAGES[s]; n++;
    if ((await fight(st, S)) === 'win') { st.cleared = s; reward(st, S, true); }
    else { const p = K.STAGES[Math.max(0, s - 1)]; n++; if ((await fight(st, p)) === 'win') reward(st, p, false); }
  }
  const ok = st.cleared === K.STAGES.length - 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}: cleared ${st.cleared + 1}/${K.STAGES.length} stages in ${n} battles`);
  process.exit(ok ? 0 : 1);
})();

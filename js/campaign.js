'use strict';
/* Step 8: the campaign «Four Seasons». One year of war on a war map of twelve areas: winter, spring, summer, autumn and the final
   battle in the next winter. The player chooses where to attack; taking the main area of a season brings the next season. Areas
   taken give lasting bonuses, victories give command points for nine upgrades, units with a star carry over into the next battle,
   the enemy grows stronger each season and brings veterans of its own. The campaign keeps a save of its own in this browser. */

/* ---------------------------------------------------------------- the war map: areas, battlefields, bonuses */
/* s: the season (0 winter, 1 spring, 2 summer, 3 autumn, 4 the next winter); x, y: the area's centre on the war map (160 x 240);
   nb: neighbours inside the winter (a season after winter opens all its areas at once); main: taking it ends the season */
const CAMP_AREAS = {
  village:   { map: 'village',   s: 0, x: 36,  y: 218, nb: ['river', 'forest'], start: true, bonus: 'militia' },
  forest:    { map: 'forest',    s: 0, x: 104, y: 218, nb: ['night', 'village'], start: true, bonus: 'rangers' },
  river:     { map: 'river',     s: 0, x: 34,  y: 190, nb: ['town'], bonus: 'fuel' },
  night:     { map: 'night',     s: 0, x: 102, y: 190, nb: ['town'], bonus: 'optics' },
  town:      { map: 'town',      s: 0, x: 68,  y: 168, main: true, bonus: 'town' },
  spring:    { map: 'spring',    s: 1, x: 46,  y: 141, main: true, bonus: 'sappers' },
  town_sp:   { map: 'town_sp',   s: 1, x: 114, y: 141, bonus: 'stores' },
  strait_su: { map: 'strait_su', s: 2, x: 42,  y: 99,  bonus: 'ferry' },
  summer:    { map: 'summer',    s: 2, x: 114, y: 99,  main: true, bonus: 'airfield' },
  autumn:    { map: 'autumn',    s: 3, x: 46,  y: 57,  main: true, bonus: 'battery' },
  river_au:  { map: 'river_au',  s: 3, x: 114, y: 57,  bonus: 'trophy' },
  bigwinter: { map: 'bigwinter', s: 4, x: 80,  y: 18,  main: true, final: true }
};
const CAMP_IDS = Object.keys(CAMP_AREAS);
const campAdj = (a, b) => (CAMP_AREAS[a].nb || []).includes(b) || (CAMP_AREAS[b].nb || []).includes(a);
const campMainOf = s => CAMP_IDS.find(id => CAMP_AREAS[id].s === s && CAMP_AREAS[id].main);
const areaName = id => t('map_' + CAMP_AREAS[id].map);
/* what an area gives for the rest of the campaign once taken */
const CAMP_BONUS = {
  militia: { units: ['riflemen'] }, rangers: { units: ['sniper'] }, fuel: { res: { fu: 80 } }, optics: { tech: ['optics'] },
  town: { inc: .1 }, sappers: { units: ['engineers'] }, stores: { res: { mp: 120, mu: 40 } }, airfield: { air: .85 },
  ferry: { sea: .7, ferry: 2 }, battery: { arty: .7 }, trophy: { units: ['light'] }
};
/* command upgrades: three branches (rear, infantry, vehicles and aircraft), each upgrade needs the one before it */
const CAMP_UPS = {
  sup1: { cp: 2, res: { mp: 100, mu: 40, fu: 40 } }, sup2: { cp: 3, cap: 10 }, sup3: { cp: 4, tix: .15 },
  inf1: { cp: 2, vetInf: 1 }, inf2: { cp: 3, vets: 8 }, inf3: { cp: 4, tech: ['lmg'], reinf: .75 },
  veh1: { cp: 2, vetVeh: 1 }, veh2: { cp: 3, tech: ['t2'] }, veh3: { cp: 4, tech: ['armor'] }
};
const CAMP_BRANCH = [['sup1', 'sup2', 'sup3'], ['inf1', 'inf2', 'inf3'], ['veh1', 'veh2', 'veh3']];

/* ---------------------------------------------------------------- the campaign record */
function campNew(diff, len, army) {
  return { v: 1, id: Math.random().toString(36).slice(2, 10), diff, len, army, season: 0, owned: [], taken: [], cp: 0, ups: [],
    vets: [], foeVets: [], wins: 0, losses: 0, battles: 0, time: 0, done: false, last: null };
}
function campLoad() { const c = store.get('camp', null); return c && c.v === 1 && c.id ? c : null; }
function campSave(c) { store.set('camp', c); }
/* ours, open (can be attacked now), closed (not reachable yet), later (a season to come) or lost (left behind in a season gone by) */
function campState(c, id) {
  const A = CAMP_AREAS[id];
  if (c.owned.includes(id)) return 'ours';
  if (c.done || A.s < c.season) return 'lost';
  if (A.s > c.season) return 'later';
  return A.s > 0 || A.start || c.owned.some(o => campAdj(o, id)) ? 'open' : 'closed';
}
const campVetCap = c => c.ups.includes('inf2') ? 8 : 6;
/* everything the player's side gets in the next battle: bonuses of the areas held and the upgrades bought */
function campMods(c) {
  const m = { res: { mp: 0, mu: 0, fu: 0 }, units: [], tech: [], inc: 1, air: 1, sea: 1, ferry: 1, arty: 1, cap: 0, tix: 1, vetInf: 0, vetVeh: 0, reinf: 1 };
  const add = o => {
    for (const r in o.res || {}) m.res[r] += o.res[r];
    m.units.push(...(o.units || [])); for (const k of o.tech || []) if (!m.tech.includes(k)) m.tech.push(k);
    if (o.inc) m.inc += o.inc; if (o.air) m.air *= o.air; if (o.sea) m.sea *= o.sea; if (o.ferry) m.ferry *= o.ferry; if (o.arty) m.arty *= o.arty;
    if (o.cap) m.cap += o.cap; if (o.tix) m.tix += o.tix; if (o.vetInf) m.vetInf = 1; if (o.vetVeh) m.vetVeh = 1; if (o.reinf) m.reinf *= o.reinf;
  };
  for (const id of c.owned) { const b = CAMP_BONUS[CAMP_AREAS[id].bonus]; if (b) add(b); }
  for (const k of c.ups) if (CAMP_UPS[k]) add(CAMP_UPS[k]);
  return m;
}
/* the enemy's strength follows the war: each victory of ours adds a level, each defeat takes one away, and it never falls below the
   season. A level brings a richer economy, research done before the battle, more troops at the start and, later on, seasoned ones
   (the numbers were tuned in whole AI-vs-AI campaigns) */
const campFoeLvl = c => Math.max(Math.min(4, c.season), c.wins - c.losses);
const CAMP_FOE = { eco: .03, ecoMax: 1.3, per: 1, units: ['riflemen', 'mg', 'at', 'riflemen', 'light', 'mortar', 'medium', 'mg', 'at', 'riflemen', 'medium', 'sniper'],
  tech: [[2, 't2'], [5, 'lmg'], [8, 'armor']], star: [4, 8], vets: [1, 3, 4] };
function campFoe(c) {
  const E = campFoeLvl(c), F = CAMP_FOE;
  return { eco: Math.min(F.ecoMax, 1 + F.eco * E), tech: F.tech.filter(([n]) => E >= n).map(([, k]) => k), units: F.units.slice(0, Math.floor(E / F.per)),
    star: E >= F.star[1] ? 2 : E >= F.star[0] ? 1 : 0 };
}
/* how many of its veterans the enemy brings after a battle we won: one at first, more as the war goes on */
const campFoeVetCap = c => Math.min(CAMP_FOE.vets[2], CAMP_FOE.vets[0] + Math.floor(campFoeLvl(c) / CAMP_FOE.vets[1]));

/* ---------------------------------------------------------------- a campaign battle */
const CAMP_SIDES = [-44, -72, 72, -100, 100, -128, 128];
const CAMP_VSIDES = [-24, 24, -52, 52, -80, 80, 0, -108, 108];
function campBattle(c, id) {
  const A = CAMP_AREAS[id], def = MAPS.find(m => m.id === A.map);
  newGame(def, c.diff, false, { 1: c.army });
  setBattleLength(c.len);
  const mods = campMods(c), foe = campFoe(c), T1 = G.teams[1], T2 = G.teams[2];
  G.camp = { cid: c.id, area: id, season: c.season, mods, foe, arrive: [], nv: 0 };
  T1.tickets = Math.round(G.tmax * mods.tix);
  for (const r in mods.res) T1.res[r] += mods.res[r];
  G.quiet = true;
  for (const k of mods.tech) if (!T1.tech.has(k)) applyTech(1, k);
  for (const k of foe.tech) if (!T2.tech.has(k)) applyTech(2, k);
  G.quiet = false;
  campSpawn(1, mods.units, 0); campSpawn(2, foe.units, foe.star || 0);
  campSchedule(1, c.vets); campSchedule(2, c.foeVets);
  rebuildE(); computeVis(1); computeVis(2); recalcSupply(1); recalcSupply(2);
  return G;
}
/* extra troops of the bonuses (ours) or of the enemy's growth, in front of the HQ beside the army's own start unit */
function campSpawn(team, types, star) {
  types.forEach((type, i) => {
    const [x, y] = hqFront(team, CAMP_SIDES[i % CAMP_SIDES.length]), u = spawnType(team, type, x, y);
    if (u.kind === 'air') u.cargo = false;
    if (star) u.vet = { xp: star > 1 ? 160 : 60, lvl: star };
    if (team === 2) u.ai = { task: null, until: 0 };
  });
}
/* veterans arrive one by one from behind the HQ: infantry first, then vehicles, then helicopters */
function campSchedule(team, vets) {
  const cls = v => UT[v.type] ? UT[v.type].cls : 'inf', n = { inf: 0, veh: 0, air: 0 };
  for (const k of ['inf', 'veh', 'air']) for (const v of vets) {
    if (cls(v) !== k || !UT[v.type]) continue;
    const t0 = k === 'inf' ? 6 + 7 * n.inf : k === 'veh' ? 40 + 15 * n.veh : 60 + 15 * n.air; n[k]++;
    G.camp.arrive.push({ t: t0, team, type: v.type, body: v.body || null, vet: { xp: v.vet.xp, lvl: v.vet.lvl }, done: false });
  }
}
function campTick() {
  const a = G.camp.arrive; if (!a.length) return;
  for (const v of a) if (!v.done && G.t >= v.t) { v.done = true; campArrive(v); }
}
function campArrive(v) {
  const team = v.team, k = G.camp.nv++, side = CAMP_VSIDES[k % CAMP_VSIDES.length], fwd = team === 1 ? 1 : -1;
  const [x, y] = hqFront(team, side), u = spawnType(team, v.type, x, y);
  u.vet = { xp: v.vet.xp, lvl: v.vet.lvl };
  const B = u.kind === 'air' ? HBODY[v.body] : u.kind === 'veh' ? VBODY[v.body] : null; if (B && B.t && B.t[team]) u.body = v.body;
  if (team === 2) u.ai = { task: null, until: 0 };
  if (u.kind === 'air') { u.cargo = false; u.dest = [x, y - 30 * fwd]; }
  else { const [ux, uy] = unitPos(u); orderMove(u, ux + rand(-8, 8), uy - fwd * rand(18, 30)); }
  recalcSupply(team);
  if (team === 1 && !G.demo) { hooks.toast(t('m_vetArrived', { u: t('u_' + v.type), s: '★'.repeat(v.vet.lvl) }), 'good'); const [px, py] = unitPos(u); hooks.ping(px, py, [255, 214, 120]); }
}
/* the campaign's modifiers inside a battle (all of them are 1 or 0 outside the campaign) */
const campInc = team => G && G.camp ? (team === 1 ? G.camp.mods.inc : G.camp.foe.eco) : 1;
const campCap = team => G && G.camp && team === 1 ? G.camp.mods.cap : 0;
const campReinf = team => G && G.camp && team === 1 ? G.camp.mods.reinf : 1;
const campBuildK = b => G && G.camp && b.team === 1 && b.bt.water ? G.camp.mods.ferry : 1;
function campCostK(team, ut) {
  if (!G || !G.camp || team !== 1) return 1;
  return ut.sea ? G.camp.mods.sea : ut.cls === 'air' ? G.camp.mods.air : 1;
}
/* new units of ours arrive with a star after the training upgrades */
function campNewUnit(u) {
  if (!G || !G.camp || u.team !== 1) return;
  const m = G.camp.mods, star = u.kind === 'squad' ? m.vetInf : m.vetVeh;
  if (star && u.vet.lvl < 1) u.vet = { xp: 60, lvl: 1 };
}
/* an artillery strike or another global order for a side: the campaign's battery makes the strike cheaper and quicker */
function globalOf(team, k) {
  const g = GLOBAL[k], q = k === 'artillery' && G && G.camp && team === 1 ? G.camp.mods.arty : 1;
  return q === 1 ? g : { cost: { mu: round5(g.cost.mu * q) }, cd: Math.round(g.cd * q) };
}
/* the best units of a side that are still alive (with at least one star), for the next battle */
function campGather(team, max) {
  const list = [];
  for (const u of G.units) {
    if (u.team !== team || !unitAlive(u) || u.gone || (u.ut && u.ut.sea) || !u.vet || u.vet.lvl < 1) continue;
    if (u.kind === 'air' && u.crash) continue;
    // the enemy's veterans come back with two stars at most, so no single ace of theirs returns battle after battle
    const lvl = team === 2 ? Math.min(2, u.vet.lvl) : u.vet.lvl, xp = team === 2 ? Math.min(Math.round(u.vet.xp), 300) : Math.round(u.vet.xp);
    list.push({ type: u.type, body: u.kind === 'squad' ? null : u.body, vet: { xp, lvl } });
  }
  for (const v of G.camp.arrive) if (!v.done && v.team === team) list.push({ type: v.type, body: v.body, vet: v.vet });      // still on the way
  list.sort((a, b) => b.vet.xp - a.vet.xp);
  return list.slice(0, max);
}
/* the end of a campaign battle: the area, command points, veterans of both sides, the season and the enemy's answer to a defeat */
function campApply(c, win, reason) {
  const gc = G.camp, A = CAMP_AREAS[gc.area], cap = campVetCap(c);
  const out = { area: gc.area, win, cp: 0, season: null, counter: null, vets: 0, foeVets: 0, done: false };
  c.battles++; c.time += Math.round(G.t);
  if (win) {
    c.wins++;
    if (!c.owned.includes(gc.area)) { c.owned.push(gc.area); c.taken.push(gc.area); }
    out.cp = 2 + (A.main ? 1 : 0) + (reason === 'hq' || G.teams[1].tickets >= G.tmax * .6 ? 1 : 0);
    c.cp += out.cp;
    c.vets = campGather(1, cap); c.foeVets = campGather(2, campFoeVetCap(c));
    if (A.main) { if (A.final) { c.done = true; out.done = true; } else { c.season++; out.season = c.season; } }
  } else {
    c.losses++;
    c.vets = campGather(1, Math.ceil(cap / 2)); c.foeVets = [];      // after its victory the enemy sends its veterans elsewhere: its strength falls
    const back = c.taken.slice().reverse().find(id => CAMP_AREAS[id].s === c.season && !CAMP_AREAS[id].main && c.owned.includes(id));
    if (back) { c.owned = c.owned.filter(id => id !== back); out.counter = back; }
  }
  out.vets = c.vets.length; out.foeVets = c.foeVets.length;
  c.last = out;
  return out;
}

/* ---------------------------------------------------------------- the war map, drawn in the game's pixel style */
const WM_W = 160, WM_H = 240, WM_REAR = 12, WM_HQ = 56;
const WM_BAND = [36, 78, 120, 160, 228];          // lower edges of the bands: next winter, autumn, summer, spring, winter
const wmWave = (x, k) => Math.round(2 * Math.sin(x * .12 + k * 1.9) + 1.2 * Math.sin(x * .31 + k * 2.7));
function wmSeasonAt(x, y) { for (let k = 0; k < 5; k++) if (y < WM_BAND[k] + (k === 4 ? wmWave(x, k) >> 1 : wmWave(x, k))) return 4 - k; return -1; }
let WM_LABEL = null;
/* which area every pixel of the war map belongs to: the nearest centre of its season's band (12 = our rear) */
function wmLabels() {
  if (WM_LABEL) return WM_LABEL;
  const L = new Uint8Array(WM_W * WM_H);
  for (let y = 0; y < WM_H; y++) for (let x = 0; x < WM_W; x++) {
    const s = wmSeasonAt(x, y), i = y * WM_W + x; if (s < 0) { L[i] = WM_REAR; continue; }
    let best = 0, bd = 1e9; const wx = x + 12 * (vnoise(x / 14, y / 14, 5) - .5), wy = y + 9 * (vnoise(x / 14, y / 14, 6) - .5);      // wavy borders
    CAMP_IDS.forEach((id, k) => { const A = CAMP_AREAS[id]; if (A.s !== s) return; const d = hyp(wx - A.x, (wy - A.y) * 1.15); if (d < bd) { bd = d; best = k; } });
    L[i] = best;
  }
  return (WM_LABEL = L);
}
const WM_GROUND = {
  0: [[206,212,228],[184,192,212],[194,201,220]], 1: [GROUND_SPRING[1], GROUND_SPRING[2], GROUND_SPRING[3]], 2: [GRASS_SUMMER[1], GRASS_SUMMER[2], GRASS_SUMMER[3]],
  3: [GRASS_AUTUMN[0], GRASS_AUTUMN[1], GRASS_AUTUMN[2]], 4: [[200,207,226],[178,187,209],[189,197,218]], rear: [[44,50,66],[38,44,58],[50,57,74]]
};
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/* the features of each area: forests, houses, fields, rivers and the sea (each clipped to its own area) */
function wmFeatures(put, water, isWater) {
  const P = (x, y, c, id) => put(Math.round(x), Math.round(y), c, id);
  const trees = (id, cx, cy, r, n, kind, seed) => {
    for (let i = 0; i < n; i++) {
      const a = hash2(i, 1, seed) * TAU, d = Math.sqrt(hash2(i, 2, seed)) * r, x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d * .8);
      if (isWater(x, y) || isWater(x, y - 2)) continue;
      const g = kind === 'gold' ? (hash2(i, 3, seed) < .6 ? LEAVES[1] : LEAVES[0]) : kind === 'green' ? [46,74,52] : PINE[1];
      const top = kind === 'snow' ? [232,238,250] : kind === 'gold' ? LEAVES[4] : [62,96,64];
      P(x, y - 2, top, id); P(x - 1, y - 1, g, id); P(x, y - 1, kind === 'snow' ? [214,224,240] : g, id); P(x + 1, y - 1, g, id); P(x, y, TRUNK[0], id);
    }
  };
  const house = (id, x, y, roof, lit) => { P(x - 1, y - 1, roof, id); P(x, y - 1, roof, id); P(x + 1, y - 1, roof, id); P(x - 1, y, [96,80,72], id); P(x, y, lit ? [255,214,120] : [70,58,54], id); P(x + 1, y, [96,80,72], id); };
  const field = (id, x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) P(x, y, (x + y) % 3 ? c[1] : c[2], id); };
  const snowRoof = [228,234,246], redRoof = [176,82,64], greyRoof = [120,124,138], brownRoof = [140,96,70];
  // winter: the village, the pine forest, the frozen river, the night raid, the town
  const iceA = [150,172,204], iceB = [184,202,228];
  water('river', [[0, 196], [18, 193], [34, 198], [52, 194], [70, 197]], 2, iceA, iceB);
  for (const [x, y] of [[26, 212], [32, 208], [44, 214], [40, 222], [50, 220]]) house('village', x, y, snowRoof);
  trees('village', 22, 226, 10, 9, 'snow', 11); trees('village', 58, 226, 8, 6, 'snow', 12);
  trees('forest', 104, 218, 24, 70, 'snow', 21);
  house('river', 26, 184, snowRoof); house('river', 46, 186, snowRoof); trees('river', 14, 178, 9, 8, 'snow', 31);
  for (const [x, y] of [[96, 186], [104, 192], [110, 184], [118, 194]]) house('night', x, y, snowRoof, 1);
  trees('night', 128, 182, 9, 8, 'snow', 41); trees('night', 86, 196, 6, 5, 'snow', 42);
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 4; gx++) house('town', 58 + gx * 5, 162 + gy * 5, snowRoof);
  trees('town', 40, 164, 7, 6, 'snow', 51); trees('town', 94, 166, 7, 6, 'snow', 52);
  // spring: the thaw (an open river, mud) and the town in the mud
  water('spring', [[0, 147], [20, 151], [44, 148], [66, 152], [86, 149]], 2, WATER[0], WATER[2]);
  for (let i = 0; i < 9; i++) { const x = 14 + Math.round(hash2(i, 5, 61) * 60), y = 128 + Math.round(hash2(i, 6, 61) * 14); if (!isWater(x, y)) { P(x, y, PLOUGH[1], 'spring'); P(x + 1, y, PLOUGH[2], 'spring'); } }
  trees('spring', 20, 132, 8, 7, 'green', 62); house('spring', 52, 132, brownRoof); house('spring', 60, 136, brownRoof);
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 4; gx++) house('town_sp', 106 + gx * 5, 136 + gy * 5, greyRoof);
  for (let i = 0; i < 7; i++) P(96 + Math.round(hash2(i, 7, 71) * 40), 128 + Math.round(hash2(i, 8, 71) * 26), PLOUGH[2], 'town_sp');
  // summer: the strait (sea, an island town) and the fields
  water('strait_su', [[0, 99], [30, 98], [56, 101], [82, 99]], 6, WATER[1], WATER[0]);
  for (const [x, y] of [[38, 99], [42, 99], [46, 99]]) { P(x - 2, y + 1, GRASS_SUMMER[2], 'strait_su'); P(x + 2, y + 1, GRASS_SUMMER[2], 'strait_su'); house('strait_su', x, y, greyRoof); }
  trees('strait_su', 18, 86, 7, 6, 'green', 81); trees('strait_su', 66, 112, 7, 6, 'green', 82);
  field('summer', 96, 88, 10, 6, WHEAT); field('summer', 120, 104, 12, 7, WHEAT); field('summer', 132, 86, 8, 5, WHEAT);
  for (const [x, y] of [[110, 98], [116, 96], [118, 101]]) house('summer', x, y, redRoof);
  trees('summer', 146, 110, 8, 7, 'green', 91);
  // autumn: the foggy woods and the open river with three bridges
  trees('autumn', 46, 57, 26, 60, 'gold', 101);
  water('river_au', [[84, 60], [100, 57], [118, 61], [136, 57], [160, 60]], 2, WATER[0], WATER[2]);
  for (const x of [98, 116, 134]) for (let d = -2; d <= 2; d++) P(x, 59 + d, [132,98,66], 'river_au');
  trees('river_au', 104, 46, 8, 8, 'gold', 111); trees('river_au', 130, 70, 8, 8, 'gold', 112); house('river_au', 120, 48, brownRoof);
  // the next winter: a wide valley with a frozen river, two towns and snowy forests
  water('bigwinter', [[0, 22], [30, 19], [60, 23], [90, 20], [120, 23], [160, 20]], 2, iceA, iceB);
  for (let gx = 0; gx < 3; gx++) { house('bigwinter', 50 + gx * 5, 12, snowRoof); house('bigwinter', 104 + gx * 5, 30, snowRoof); }
  trees('bigwinter', 20, 10, 10, 12, 'snow', 121); trees('bigwinter', 140, 10, 10, 12, 'snow', 122); trees('bigwinter', 80, 31, 8, 6, 'snow', 123);
}
/* draws the war map into a 160 x 240 canvas: the ground of each season, the features, who holds what, the front line and the roads */
function drawWarMap(cv, c, sel) {
  cv.width = WM_W; cv.height = WM_H;
  const x2 = cv.getContext('2d'), im = x2.createImageData(WM_W, WM_H), d = im.data, L = wmLabels(), W = WM_W, H = WM_H;
  const idx = id => CAMP_IDS.indexOf(id), col = new Float32Array(W * H * 3), wat = new Uint8Array(W * H);
  const set = (i, c3) => { col[i * 3] = c3[0]; col[i * 3 + 1] = c3[1]; col[i * 3 + 2] = c3[2]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = L[i], g = a === WM_REAR ? WM_GROUND.rear : WM_GROUND[CAMP_AREAS[CAMP_IDS[a]].s];
    const n = vnoise(x / 5, y / 5, 31) * .7 + hash2(x, y, 9) * .3;
    set(i, n > .62 ? g[2] : n > .4 ? g[0] : g[1]);
    if (a !== WM_REAR && CAMP_IDS[a] === 'night') set(i, mixc([col[i * 3], col[i * 3 + 1], col[i * 3 + 2]], [52,60,86], .3));      // the night raid: a darker winter
  }
  const put = (x, y, c3, id) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (id && L[i] !== idx(id)) return; set(i, c3); };
  const water = (id, pts, hw, c1, c2) => {
    for (let k = 0; k + 1 < pts.length; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1], n = Math.ceil(hyp(bx - ax, by - ay));
      for (let j = 0; j <= n; j++) { const x = Math.round(lerp(ax, bx, j / n)), y0 = Math.round(lerp(ay, by, j / n));
        for (let y = y0 - hw; y <= y0 + hw; y++) { if (x < 0 || y < 0 || x >= W || y >= H || L[y * W + x] !== idx(id)) continue; wat[y * W + x] = 1; set(y * W + x, hash2(x, y, 3) < .2 ? c2 : c1); } } }
  };
  wmFeatures(put, water, (x, y) => x >= 0 && y >= 0 && x < W && y < H && wat[y * W + x] === 1);
  // who holds what: ours tinted blue, the enemy's of this season a little red, the seasons to come in the fog of war
  const st = CAMP_IDS.map(id => campState(c, id));
  for (let i = 0; i < W * H; i++) {
    const a = L[i]; if (a === WM_REAR) continue;
    let p = [col[i * 3], col[i * 3 + 1], col[i * 3 + 2]]; const s = st[a];
    if (s === 'ours') p = mixc(p, TEAMC[1].main, .24);
    else if (s === 'open' || s === 'closed') p = mixc(p, TEAMC[2].main, .1);
    else if (s === 'later') p = mixc(p, [34,40,56], .42);
    else if (s === 'lost') { const g = (p[0] + p[1] + p[2]) / 3; p = mixc([g, g, g], [30,34,44], .45); }
    set(i, p);
  }
  // borders between areas, the front line (blue on our side, red on theirs) and the outline of the chosen area
  const isOurs = a => a !== WM_REAR && st[a] === 'ours', front = a => a !== WM_REAR && (st[a] === 'open' || st[a] === 'closed');
  const out = new Float32Array(col);
  const nbr = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([u, v]) => u >= 0 && v >= 0 && u < W && v < H).map(([u, v]) => L[v * W + u]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = L[i], ns = nbr(x, y); if (!ns.some(b => b !== a)) continue;
    let p = [col[i * 3], col[i * 3 + 1], col[i * 3 + 2]];
    const ourLine = (isOurs(a) || a === WM_REAR) && ns.some(front), theirLine = front(a) && ns.some(b => isOurs(b) || (b === WM_REAR));
    if (sel != null && a === idx(sel)) p = [250,250,255];
    else if (ourLine) p = TEAMC[1].main; else if (theirLine) p = TEAMC[2].main;
    else p = mixc(p, [20,24,34], .55);
    out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = p[2];
  }
  // dotted roads between the areas that lead into each other, and from our rear into the first areas
  const road = (ax, ay, bx, by) => { const n = Math.ceil(hyp(bx - ax, by - ay)); for (let j = 4; j <= n - 4; j += 2) { const x = Math.round(lerp(ax, bx, j / n)), y = Math.round(lerp(ay, by, j / n)), i = y * W + x; if (wat[i]) continue; out[i * 3] = 112; out[i * 3 + 1] = 92; out[i * 3 + 2] = 70; } };
  const links = [];
  for (const a of CAMP_IDS) for (const b of CAMP_IDS) if (a < b && CAMP_AREAS[a].s === 0 && CAMP_AREAS[b].s === 0 && campAdj(a, b)) links.push([a, b]);
  for (let s = 0; s < 4; s++) { const m = campMainOf(s); for (const b of CAMP_IDS) if (CAMP_AREAS[b].s === s + 1) links.push([m, b]); }
  for (const [a, b] of links) road(CAMP_AREAS[a].x, CAMP_AREAS[a].y, CAMP_AREAS[b].x, CAMP_AREAS[b].y);
  for (const id of CAMP_IDS) if (CAMP_AREAS[id].start) road(WM_HQ, 236, CAMP_AREAS[id].x, CAMP_AREAS[id].y);
  // our HQ in the rear: a small house with a flag
  const hq = [[-2, 233], [-1, 233], [0, 233], [1, 233], [2, 233], [-2, 234], [2, 234], [-2, 235], [-1, 235], [0, 235], [1, 235], [2, 235], [0, 230], [0, 231], [0, 232], [1, 230], [2, 230]];
  for (const [x, y] of hq.map(([dx, y]) => [WM_HQ + dx, y])) { const i = y * W + x; out[i * 3] = TEAMC[1].light[0]; out[i * 3 + 1] = TEAMC[1].light[1]; out[i * 3 + 2] = TEAMC[1].light[2]; }
  for (let i = 0; i < W * H; i++) { d[i * 4] = out[i * 3]; d[i * 4 + 1] = out[i * 3 + 1]; d[i * 4 + 2] = out[i * 3 + 2]; d[i * 4 + 3] = 255; }
  x2.putImageData(im, 0, 0);
}

/* ---------------------------------------------------------------- the campaign screens */
let campSel = null, campSure = false;
let CSET = null;          // the choices for a new campaign (read from the browser when the interface starts)
const campSeasonName = s => t('season_' + s);
const campTime = s => s >= 3600 ? `${Math.floor(s / 3600)}:${fmtTime(s % 3600)}` : fmtTime(s);
function campStars(n) { return '★'.repeat(n); }
function renderCamp() {
  const c = campLoad(); campSure = false; $('cNew').textContent = t('campNew');
  $('campSetup').hidden = !!c; $('campMain').hidden = !c;
  if (!c) {
    for (const [attr, key] of [['cdiff', 'diff'], ['clen', 'len'], ['carmy', 'army']]) document.querySelectorAll(`[data-${attr}]`).forEach(b => b.setAttribute('aria-pressed', b.dataset[attr] === CSET[key] ? 'true' : 'false'));
    $('cArmyDesc').textContent = t('army_' + CSET.army + '_d');
    return;
  }
  if (!campSel || !CAMP_AREAS[campSel]) campSel = CAMP_IDS.find(id => campState(c, id) === 'open') || campMainOf(Math.min(4, c.season));
  $('campStat').innerHTML = [c.done ? t('campDone') : t('campNow', { s: campSeasonName(c.season) }), t('campCP', { n: c.cp }), t('campScore', { w: c.wins, l: c.losses }), t('campFoe', { n: campFoeLvl(c) }),
    t('army_' + c.army), t('difficulty') + ': ' + t(c.diff), t('length') + ': ' + t('len_' + c.len)].map(s => `<span>${esc(s)}</span>`).join('');
  drawWarMap($('wmapCv'), c, campSel);
  // area labels over the map, and the season names at the left edge of each band
  const box = $('wmapL'); box.innerHTML = '';
  const tops = [0, WM_BAND[0], WM_BAND[1], WM_BAND[2], WM_BAND[3]];
  for (let s = 0; s < 5; s++) { const el = document.createElement('span'); el.className = 'wseason'; el.textContent = campSeasonName(4 - s); el.style.top = (tops[s] + 1) / WM_H * 100 + '%'; box.append(el); }
  for (const id of CAMP_IDS) {
    const A = CAMP_AREAS[id], s = campState(c, id), b = document.createElement('button');
    b.type = 'button'; b.className = 'btn wa ' + s + (id === campSel ? ' sel' : ''); b.style.left = A.x / WM_W * 100 + '%'; b.style.top = A.y / WM_H * 100 + '%';
    b.textContent = (A.main ? '★ ' : '') + areaName(id); b.setAttribute('aria-pressed', id === campSel ? 'true' : 'false');
    b.addEventListener('click', () => { campSel = id; SFX.play('ui'); renderCamp(); });
    box.append(b);
  }
  const rear = document.createElement('span'); rear.className = 'wrear'; rear.textContent = t('campRear'); rear.style.left = (WM_HQ + 6) / WM_W * 100 + '%'; box.append(rear);
  renderCampInfo(c);
  // the goal of the season, or the end of the war
  const m = campMainOf(Math.min(4, c.season));
  $('campGoal').textContent = c.done ? t('cr_wonText', { w: c.wins, l: c.losses, b: c.battles, t: campTime(c.time) }) : t(c.season >= 4 ? 'campGoalFinal' : 'campGoal', { a: areaName(m) });
  // veterans who will come to the next battle
  const cap = campVetCap(c); $('campVetsH').textContent = t('campVets', { n: c.vets.length, m: cap });
  const vb = $('campVets'); vb.innerHTML = '';
  if (!c.vets.length) { const p = document.createElement('p'); p.textContent = t('campNoVets'); vb.append(p); }
  for (const v of c.vets) { const el = document.createElement('div'); el.className = 'vchip'; el.title = t('u_' + v.type); el.append(iconEl(v.type, '#b1cbff', 2)); const s = document.createElement('b'); s.textContent = campStars(v.vet.lvl); el.append(s); vb.append(el); }
  const sv = store.get('save', null); $('cContinue').hidden = !(sv && sv.camp && sv.camp.cid === c.id);
}
function renderCampInfo(c) {
  const id = campSel, A = CAMP_AREAS[id], s = campState(c, id), def = MAPS.find(m => m.id === A.map), box = $('campInfo'); box.innerHTML = '';
  if (!previews[def.id]) previews[def.id] = previewMap(def);
  const cv = mkCanvas(previews[def.id].width, previews[def.id].height); cv.getContext('2d').drawImage(previews[def.id], 0, 0); cv.className = 'cprev';
  const txt = document.createElement('div'), bonus = A.final ? t('bn_final') : t('bn_' + A.bonus);
  const tags = t('map_' + def.id + '_t'), sz = campSeasonName(A.s);      // the season maps' tags already begin with their season
  txt.innerHTML = `<h3>${A.main ? '★ ' : ''}${esc(areaName(id))}</h3><div class="tags">${esc(tags.toLowerCase().startsWith(sz.toLowerCase()) ? tags : sz + ' · ' + tags)}</div>`
    + `<p class="cst ${s}">${esc(t('st_' + s))}${A.main ? ' · ' + esc(t('st_main')) : ''}</p><p>${esc(t('campBonus', { b: bonus }))}</p>`;
  if (s === 'open' && !c.done) { const go = document.createElement('button'); go.type = 'button'; go.className = 'btn primary'; go.id = 'cGo'; go.textContent = t('campAttack'); go.addEventListener('click', () => { SFX.init(); SFX.play('ui'); startCampBattle(id); }); txt.append(go); }
  box.append(cv, txt);
}
function renderUps() {
  const c = campLoad(); if (!c) { show('scrCamp'); return; }
  $('upsCP').textContent = t('campCP', { n: c.cp });
  const box = $('upsList'); box.innerHTML = '';
  CAMP_BRANCH.forEach((br, bi) => {
    const col = document.createElement('div'); col.className = 'upcol';
    const h = document.createElement('h3'); h.className = 'sec'; h.textContent = t('br_' + bi); col.append(h);
    br.forEach((k, i) => {
      const U = CAMP_UPS[k], own = c.ups.includes(k), prev = i === 0 || c.ups.includes(br[i - 1]), el = document.createElement('div');
      el.className = 'urow upr' + (own ? ' own' : '');
      el.innerHTML = `<div class="ui"><b class="upn">${'I'.repeat(i + 1)}</b></div><div><h4>${esc(t('up_' + k))}</h4><p>${esc(t('up_' + k + '_d'))}</p></div>`;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (own ? '' : prev && c.cp >= U.cp ? ' primary' : ' off');
      b.textContent = own ? t('upOwned') : t('upBuy', { n: U.cp });
      if (!own) b.addEventListener('click', () => {
        const cc = campLoad(); if (!cc || cc.ups.includes(k)) return;
        if (!prev) { b.textContent = t('upNeed'); return; } if (cc.cp < U.cp) { b.textContent = t('upNoCP'); return; }
        cc.cp -= U.cp; cc.ups.push(k); campSave(cc); SFX.play('capture'); renderUps();
      });
      el.querySelector('div:last-child').append(b); col.append(el);
    });
    box.append(col);
  });
}
/* the battle of an area: the same start as a single battle plus the campaign's own setup */
function startCampBattle(id) {
  const c = campLoad(); if (!c || c.done || campState(c, id) !== 'open') { renderCamp(); return; }
  curMapId = CAMP_AREAS[id].map;
  launchBattle(() => campBattle(c, id), g => {
    hooks.toast(t('m_campArea', { s: campSeasonName(c.season), a: areaName(id) }));
    if (c.foeVets.length) setTimeout(() => { if (G === g) hooks.toast(t('m_foeVets', { n: c.foeVets.length }), 'bad'); }, 5000);
  });
}
/* the lines under the result of a campaign battle */
function campEndLines(out) {
  const c = campLoad(), L = [];
  if (out.win) {
    L.push([t('cr_taken', { a: areaName(out.area) }), 'good']);
    const A = CAMP_AREAS[out.area]; if (!A.final) L.push([t('campBonus', { b: t('bn_' + A.bonus) }), '']);
    L.push([t('cr_cp', { n: out.cp, m: c ? c.cp : out.cp }), '']);
  } else {
    L.push([t('cr_held'), 'bad']);
    if (out.counter) L.push([t('cr_counter', { a: areaName(out.counter) }), 'bad']);
  }
  L.push([t(out.win ? 'cr_vets' : 'cr_retreat', { n: out.vets }), '']);
  if (out.foeVets) L.push([t('cr_foeVets', { n: out.foeVets }), '']);
  if (out.season != null) L.push([t('cr_season', { s: campSeasonName(out.season) }), 'good']);
  if (out.done && c) L.push([t('cr_won') + ' ' + t('cr_wonText', { w: c.wins, l: c.losses, b: c.battles, t: campTime(c.time) }), 'good']);
  return L;
}
function campInitUI() {
  CSET = { diff: store.get('cdiff', 'normal'), len: store.get('clen', 'normal'), army: ARMY[store.get('carmy', 'inf')] ? store.get('carmy', 'inf') : 'inf' };
  $('mCamp').addEventListener('click', () => { SFX.init(); SFX.play('ui'); show('scrCamp'); });
  document.querySelectorAll('[data-cdiff]').forEach(b => b.addEventListener('click', () => { CSET.diff = b.dataset.cdiff; store.set('cdiff', CSET.diff); SFX.play('ui'); renderCamp(); }));
  document.querySelectorAll('[data-clen]').forEach(b => b.addEventListener('click', () => { CSET.len = b.dataset.clen; store.set('clen', CSET.len); SFX.play('ui'); renderCamp(); }));
  document.querySelectorAll('[data-carmy]').forEach(b => b.addEventListener('click', () => { CSET.army = b.dataset.carmy; store.set('carmy', CSET.army); SFX.play('ui'); renderCamp(); }));
  $('cStart').addEventListener('click', () => {
    SFX.init(); const sv = store.get('save', null); if (sv && sv.camp) store.set('save', null);      // a battle of an older campaign cannot be continued
    campSave(campNew(CSET.diff, CSET.len, ARMY[CSET.army] ? CSET.army : 'inf')); campSel = null; SFX.play('capture'); renderCamp();
  });
  $('cNew').addEventListener('click', () => {
    SFX.play('ui');
    if (!campSure) { campSure = true; $('cNew').textContent = t('campNewSure'); return; }
    const sv = store.get('save', null); if (sv && sv.camp) store.set('save', null);
    store.set('camp', null); campSel = null; renderCamp();
  });
  $('cUps').addEventListener('click', () => { SFX.play('ui'); show('scrUps'); });
  $('upsBack').addEventListener('click', () => { SFX.play('ui'); show('scrCamp'); });
  $('cContinue').addEventListener('click', () => { SFX.init(); SFX.play('ui'); continueBattle(); });
  $('eCamp').addEventListener('click', () => { G = null; startDemo(); show('scrCamp'); });
}

'use strict';
/* Step 7: the army chosen before a battle (infantry, tank or airmobile: a start bonus, cheaper units, earlier unlocks, two upgrades
   of its own and a special ability), forward bases and the field workshop, and how the enemy commander uses all of it. */

/* ---------------------------------------------------------------- armies */
const ARMY = {
  inf: { start: 'riflemen', ab: 'charge', rt: ['vests', 'medics'], arm: ['riflemen', 'mg', 'sniper', 'at', 'mortar'], earlyAT: true },
  tank: { start: 'scout', ab: 'blitz', rt: ['crews', 'apds'], arm: ['scout', 'aa', 'light', 'medium', 'heavy', 'howitzer'] },
  air: { start: 'heli_trans', ab: 'para', rt: ['para3', 'heliarmor'], arm: ['heli_scout', 'heli_attack', 'heli_trans'] }
};
const ARMY_LIST = ['inf', 'tank', 'air'];
const armyOf = team => (G && G.teams[team] && G.teams[team].army) || null;
const abOf = team => { const a = ARMY[armyOf(team)]; return a ? a.ab : null; };
const round5 = v => Math.max(5, Math.round(v / 5) * 5);
/* what a unit costs this side: the infantry army pays less for infantry, the tank army less fuel for its vehicles,
   the airmobile army less for helicopters */
function costOf(team, type) {
  const ut = UT[type]; if (!ut) return (BT[type] || RT[type] || GLOBAL[type]).cost;
  const a = armyOf(team), q = campCostK(team, ut); let k = null;      // q: step 8, the campaign's airfield and crossing
  if (a === 'inf' && ut.cls === 'inf') k = { mp: .8, mu: .8 };
  else if (a === 'tank' && ut.cls === 'veh' && !ut.sea) k = { fu: .8 };
  else if (a === 'air' && ut.cls === 'air') k = { mp: .8, mu: .8, fu: .8 };
  if (!k && q === 1) return ut.cost;
  const c = {}; for (const r in ut.cost) c[r] = k && k[r] ? round5(ut.cost[r] * k[r] * q) : q !== 1 ? round5(ut.cost[r] * q) : ut.cost[r];
  return c;
}
/* the research a unit, building or upgrade needs on this side: the tank army gets its motor pool without Tier 2 and heavy armour
   at Tier 2, the airmobile army its helipad at Tier 2 */
function reqOf(team, key) {
  const a = armyOf(team);
  if (a === 'tank' && key === 'motor') return null;
  if (a === 'tank' && (key === 'heavy' || key === 'howitzer')) return 't2';
  if (a === 'air' && key === 'helipad') return 't2';
  if (a === 'inf' && key === 'at' && ARMY.inf.earlyAT) return null;      // the infantry army fields anti-tank teams without Tier 2
  const o = UT[key] || BT[key] || RT[key]; return (o && o.req) || null;
}
const hasReq = (team, key) => { const r = reqOf(team, key); return !r || G.teams[team].tech.has(r); };
/* the upgrades a building offers: the HQ adds the two of the side's own army */
function researchList(team, btype) { const l = RESEARCH_AT[btype] || [], a = ARMY[armyOf(team)]; return btype === 'hq' && a ? l.concat(a.rt) : l; }
/* points are taken a quarter faster by the infantry army */
const capK = team => armyOf(team) === 'inf' ? 1.25 : 1;
/* the enemy commander's choice: each map tips the odds toward the armies it plays well there
   (from 720 AI-vs-AI battles: tanks at night, helicopters on the big map, in the fog and at sea, infantry in the tall grass) */
function aiPickArmy(def, rnd) {
  const sz = seasonOf(def), w = { inf: 1, tank: 1, air: 1 };
  if (def.light === 'night') { w.tank *= 1.8; w.air *= .6; }
  if (def.big) { w.air *= 1.5; w.tank *= .6; }
  if (sz.fog) { w.air *= 1.5; w.tank *= .7; }
  if (def.sea) { w.air *= 1.8; w.tank *= .3; }
  if (sz.mud) { w.air *= 1.2; w.tank *= .8; }
  if (sz.grass) w.inf *= 1.3;
  const id = def.base || def.id;          // a season variant (step 8) counts as its winter map
  if (id === 'forest') w.inf *= 1.2;
  if (id === 'town') w.air *= .7;
  let tot = 0; for (const k of ARMY_LIST) tot += w[k];
  let r = (rnd || RND)() * tot; for (const k of ARMY_LIST) { r -= w[k]; if (r <= 0) return k; }
  return 'inf';
}
/* the spot in front of a side's HQ (the side facing the enemy) */
function hqFront(team, side) { const hq = G.teams[team].hq; return [hq.x + (side || 0), team === 2 ? hq.by + 22 : hq.by - hq.bt.foot[1] - 22]; }
/* at the start of a battle: the player's army from the menu, the enemy's own pick, and each army's start bonus in front of its HQ */
function setArmies(armies, demo) {
  for (const team of [1, 2]) {
    const want = armies && armies[team], T = G.teams[team];
    T.army = ARMY[want] ? want : team === 1 && !demo ? 'inf' : aiPickArmy(G.def, Math.random);      // a fresh pick every battle, not tied to the map's seed
    const [x, y] = hqFront(team, 44), u = spawnType(team, ARMY[T.army].start, x, y);
    if (u.kind === 'air') u.cargo = false;            // the airmobile army's transport starts empty
    if (team === 2) u.ai = { task: null, until: 0 };
  }
}

/* ---------------------------------------------------------------- bases: the HQ and forward bases */
const fobMax = () => G.def.big ? 3 : 2;
/* the finished bases of a side, gathered once per tick (squads ask for them every tick) */
function basesOf(team) {
  if (G.baseT !== G.t || !G.baseC) { G.baseT = G.t; G.baseC = { 1: [], 2: [] }; for (const b of G.blds) if (!b.dead && b.built >= 1 && (b.type === 'hq' || b.bt.fob)) G.baseC[b.team].push(b); }
  return G.baseC[team];
}
/* the nearest finished base of a side (within r if given) */
function nearBase(team, x, y, r) { let best = null, bd = r == null ? 1e9 : r; for (const b of basesOf(team)) { if (b.dead) continue; const d = dist(x, y, b.x, b.by); if (d < bd) { bd = d; best = b; } } return best; }
/* where retreating squads gather: in front of the HQ (as before), or on the home side of a forward base */
function retreatSpot(b, team) {
  if (b.type === 'hq') return [b.x + rand(-24, 24), team === 2 ? b.by + 20 : b.by - b.bt.foot[1] - 20];
  return [b.x + rand(-18, 18), team === 1 ? b.by + 16 : b.by - b.bt.foot[1] - 16];
}
/* a forward base stands on a sector or key point of ours, away from the HQ and from our other forward bases;
   null when it may stand at (x, y), otherwise the message saying why not */
function fobWhy(team, x, y) {
  const T = G.teams[team];
  if (G.blds.filter(b => b.team === team && b.bt.fob && !b.dead).length >= fobMax()) return 'm_fobMax';
  if (!G.map.points.some(p => p.owner === team && dist(x, y, p.cx, p.cy) < 95)) return 'm_fobWhere';
  if (T.hq && !T.hq.dead && dist(x, y, T.hq.x, T.hq.by) < 220) return 'm_fobWhere';
  if (G.blds.some(b => b.team === team && b.bt.fob && !b.dead && dist(x, y, b.ax, b.by) < 180)) return 'm_fobWhere';
  return null;
}
/* any ground of the given kinds (1 road, 4 bridge) under a footprint or within pad of it: forward bases and workshops keep clear
   of bridges, so they never close a crossing, and the enemy commander keeps them off the roads as well */
function kindNear(f, pad, kinds) {
  const m = G.map;
  for (let y = Math.max(0, Math.floor(f[1] - pad)); y <= Math.min(m.H - 1, Math.ceil(f[3] + pad)); y += 2) for (let x = Math.max(0, Math.floor(f[0] - pad)); x <= Math.min(m.W - 1, Math.ceil(f[2] + pad)); x += 2) if (kinds.includes(m.KIND[y * m.W + x])) return true;
  return false;
}
/* the field workshop mends our vehicles nearby and helicopters over it once they have been out of combat for a few seconds */
function shopTick(b, dt) {
  for (const u of G.units) {
    if (u.team !== b.team || u.kind === 'squad' || u.dead || u.crash || u.hp >= u.max || G.t - u.lastCombat < 5) continue;
    if (u.kind === 'veh' ? u.ut.sea || dist(u.x, u.y, b.x, b.by) > 90 : dist(u.x, u.y, b.x, b.by) > 70) continue;
    u.hp = Math.min(u.max, u.hp + 14 * dt);
    if (RND() < dt * 3) G.parts.push(P('spark', u.x + rand(-5, 5), u.y - 4 - (u.alt || 0) + rand(-3, 3), rand(-14, 14), rand(-18, -6), rand(.15, .35)));
  }
}
/* where a damaged vehicle goes to be mended: the nearer of our field workshops and the HQ */
function repairSpot(team, x, y) {
  let best = null, bd = 1e9;
  for (const b of G.blds) if (b.team === team && b.bt.shop && !b.dead && b.built >= 1) { const d = dist(x, y, b.x, b.by); if (d < bd) { bd = d; best = b; } }
  const hq = G.teams[team].hq, hd = hq && !hq.dead ? dist(x, y, hq.x, hq.by) : 1e9;
  if (best && bd < hd) return [best.x + rand(-20, 20), team === 1 ? best.by + 22 : best.by - best.bt.foot[1] - 22];
  return hq && !hq.dead ? [hq.x, team === 2 ? hq.by + 34 : hq.by - hq.bt.foot[1] - 34] : null;
}

/* ---------------------------------------------------------------- special abilities */
const AB_R = { charge: 70, blitz: 90, para: 30 };
const paraCount = team => G.teams[team].tech.has('para3') ? 3 : 2;
/* the units a charge or a breakthrough at (x, y) would carry along */
function abilityTargets(team, ab, x, y) {
  const out = [];
  for (const u of G.units) {
    if (u.team !== team || !unitAlive(u) || u.aboard || u.chute) continue;
    if (ab === 'charge' && u.kind === 'squad' && u.members.some(m => !m.dead && dist(m.x, m.y, x, y) < AB_R.charge)) out.push(u);
    else if (ab === 'blitz' && u.kind === 'veh' && !u.ut.sea && dist(u.x, u.y, x, y) < AB_R.blitz) out.push(u);
  }
  return out;
}
function useAbility(team, ab, x, y) {
  if (ab === 'para') { paraDrop(team, x, y); return; }
  for (const u of abilityTargets(team, ab, x, y)) u[ab] = G.t + 15;          // u.charge or u.blitz: until when it lasts
  hooks.sfx(ab === 'charge' ? 'bugle' : 'blitz', x, y);
}
/* the airmobile army's landing: a plane flies in from home over the spot and two (three) rifle squads come down on parachutes */
function paraDrop(team, x, y) {
  const hq = G.teams[team].hq, dx = x - hq.x, dy = y - hq.by, d = hyp(dx, dy) || 1, sp = 140, pm = PLANE_MODELS[team].filter(hasFrame);
  G.planes.push({ x: hq.x - dx / d * 60, y: hq.by - dy / d * 60, vx: dx / d * sp, vy: dy / d * sp, ang: Math.atan2(dy, dx), team, model: pm[Math.floor(RND() * pm.length)] });
  G.drops.push({ t: G.t + (d + 60) / sp, x, y, team, n: paraCount(team) });
  recalcSupply(team); hooks.sfx('plane');
}
function dropTick() {
  const offs = [[-14, -2], [14, 2], [0, 14]];
  for (const dr of G.drops) {
    if (G.t < dr.t) continue; dr.done = true;
    for (let i = 0; i < dr.n; i++) {
      const u = spawnType(dr.team, 'riflemen', dr.x + offs[i % 3][0], dr.y + offs[i % 3][1]);
      u.chute = { t0: G.t, until: G.t + 2.6 }; G.teams[dr.team].stats.made++;
      if (dr.team === 2) u.ai = { task: null, until: 0 };
    }
    if (!G.demo) {
      if (dr.team === 1) hooks.toast(t('m_paraDown'), 'good');
      else if (visAt(1, dr.x, dr.y)) { hooks.toast(t('m_enemyPara'), 'bad'); hooks.ping(dr.x, dr.y, [255, 200, 80]); }
    }
  }
  G.drops = G.drops.filter(d => !d.done);
}
/* the player's army ability, aimed at a spot on the map */
function cmdArmyAbility(x, y) {
  const T = G.teams[1], ab = abOf(1); if (!ab) return false;
  const g = GLOBAL[ab];
  if (G.t < T.cd[ab]) { hooks.toast(t('m_notReady'), 'bad'); return false; }
  const cm = costMissing(1, g.cost); if (cm) { hooks.toast(t(cm), 'bad'); return false; }
  if (ab === 'para') {
    if (!seenAt(x, y)) { hooks.toast(t('m_needVis'), 'bad'); return false; }
    if (!walkable(G.map, false, x, y)) { hooks.toast(t('m_cant'), 'bad'); return false; }
    if (T.used + paraCount(1) * UT.riflemen.sup > T.cap) { hooks.toast(t('m_supply'), 'bad'); return false; }
  } else if (!abilityTargets(1, ab, x, y).length) { hooks.toast(t(ab === 'charge' ? 'm_noInf' : 'm_noVeh'), 'bad'); return false; }
  pay(T, g.cost); T.cd[ab] = G.t + g.cd; useAbility(1, ab, x, y);
  G.marker = { x, y, t0: G.t, kind: ab === 'para' ? 'move' : 'barrage' }; return true;
}

/* ---------------------------------------------------------------- the enemy commander */
/* the army ability: charge or break through where two or more of our squads (vehicles) are fighting or closing on a point
   that is not ours; land paratroopers by a point that is not ours and not held in strength */
function aiAbility(T) {
  const id = T.id, ab = abOf(id); if (!ab || G.t < T.cd[ab] || G.t < 100 * G.diff.think || G.t < (T.abT || 0)) return;
  T.abT = G.t + 2;
  const g = GLOBAL[ab], c = g.cost; if (!afford(T, { mp: (c.mp || 0) + 40, mu: (c.mu || 0) + 50, fu: c.fu || 0 })) return;
  const foe = 3 - id; let at = null;
  if (ab === 'para') {
    if (T.used + paraCount(id) * UT.riflemen.sup > T.cap) return;
    let bs = -1e9;
    for (const p of G.map.points) {
      if (p.owner === id) continue;
      let foes = 0; for (const e of G.E[foe]) if (e.cls !== 'bld' && dist(e.x, e.y, p.cx, p.cy) < 110) foes++;
      if (foes > 4) continue;
      const guns = G.blds.some(b => b.team === foe && !b.dead && b.bt.w && dist(b.x, b.y, p.cx, p.cy) < 120);
      const s = (isKey(p) ? 200 : 40) + (p.owner === 0 ? 60 : 0) - foes * 40 - (guns ? 150 : 0) + rand(0, 30);
      if (s > bs) { bs = s; at = [p.cx, p.cy]; }
    }
    if (at && !walkable(G.map, false, at[0], at[1])) { const cc = cellOf(G.map, at[0], at[1]), w = nearestWalkable(G.map, false, cc[0], cc[1]); at = w ? [w[0] * CELL + CELL / 2, w[1] * CELL + CELL / 2] : null; }
  } else {
    let bn = 1;
    for (const u of G.units) {
      if (u.team !== id || !unitAlive(u) || u.aboard || u.chute || u.retreat) continue;
      if (ab === 'charge' ? u.kind !== 'squad' || u.type === 'engineers' : u.kind !== 'veh' || u.ut.sea) continue;
      const [ux, uy] = unitPos(u), task = u.ai && u.ai.task;
      if (!(G.t - u.lastCombat < 4 || (task && task.owner !== id && dist(ux, uy, task.cx, task.cy) < 170))) continue;
      const n = abilityTargets(id, ab, ux, uy).length;
      if (n > bn) { bn = n; at = [ux, uy]; }
    }
  }
  if (!at) return;
  pay(T, c); T.cd[ab] = G.t + g.cd; useAbility(id, ab, at[0], at[1]);
}
/* a forward base on the point of ours nearest the front; a field workshop once there are vehicles to mend */
function aiBases(T) {
  const id = T.id, hq = T.hq, foeHQ = G.teams[3 - id].hq, th = G.diff.think;
  const fobs = bldOf(id, 'fob');
  if (G.t > 140 * th && fobs.length < fobMax() && !fobs.some(b => b.built < 1) && foeHQ && afford(T, { mp: BT.fob.cost.mp + 80, mu: BT.fob.cost.mu, fu: BT.fob.cost.fu })) {
    let best = null, bs = -1e9;
    for (const p of G.map.points) {
      if (p.owner !== id || dist(p.cx, p.cy, hq.x, hq.by) < 260 || fobs.some(b => dist(b.ax, b.by, p.cx, p.cy) < 200)) continue;
      let foes = 0; for (const e of G.E[3 - id]) if (e.cls !== 'bld' && dist(e.x, e.y, p.cx, p.cy) < 130) foes++;
      if (foes > 1) continue;
      const s = (isKey(p) ? 140 : 0) - dist(p.cx, p.cy, foeHQ.x, foeHQ.by) * .4;
      if (s > bs) { bs = s; best = p; }
    }
    if (best) aiPlace(id, 'fob', [best.cx, best.cy + Math.sign(hq.by - best.cy) * 26]);
  }
  if (G.t > 200 * th && !bldOf(id, 'workshop').length && bldOf(id, 'motor', true).length && afford(T, { mp: BT.workshop.cost.mp + 60, fu: BT.workshop.cost.fu + 40 })
    && G.units.filter(u => u.team === id && u.kind === 'veh' && !u.ut.sea && unitAlive(u)).length >= 2) {
    const fob = foeHQ ? bldOf(id, 'fob', true).sort((a, b) => dist(a.x, a.by, foeHQ.x, foeHQ.by) - dist(b.x, b.by, foeHQ.x, foeHQ.by))[0] : null;
    aiPlace(id, 'workshop', fob ? [fob.ax + (fob.ax < G.map.W / 2 ? 52 : -52), fob.by + (id === 1 ? 24 : -24)] : slotsFor(id).motor);
  }
}
/* a transport helicopter takes on a squad of its side that is far from any point still to be won */
function ferryCandidate(u, id) {
  const targets = G.map.points.filter(p => p.owner !== id); if (!targets.length) return null;
  let best = null, bs = 0;
  for (const s of G.units) {
    if (s.team !== id || s.kind !== 'squad' || s.aboard || s.chute || s.retreat || s.order || s.type === 'engineers' || !unitAlive(s) || liveCount(s) < Math.min(3, s.ut.n) || G.t - s.lastCombat < 8) continue;
    const [sx, sy] = unitPos(s); let nd = 1e9; for (const p of targets) nd = Math.min(nd, dist(sx, sy, p.cx, p.cy));
    const gain = nd - 220 - dist(sx, sy, u.x, u.y) * .5;
    if (gain > bs) { bs = gain; best = s; }
  }
  return best;
}

/* ---------------------------------------------------------------- pictures: parachutes and icons */
const CHUTE_CV = {};
/* a canopy in the side's colours with its cords, render pixels; the cords meet at row 19, over the soldier's shoulders */
function chuteCv(team) {
  if (CHUTE_CV[team]) return CHUTE_CV[team];
  const W = 27, H = 20, p = new Px(W, H), main = team === 1 ? [214, 222, 236] : [196, 190, 180], band = team === 1 ? [96, 140, 220] : [200, 72, 62];
  const inside = (x, y) => y >= 0 && y < 8 && ((x + .5 - 13.5) / 13.5) ** 2 + ((y + .5 - 8) / 8) ** 2 <= 1;
  for (let y = 0; y < 8; y++) for (let x = 0; x < W; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || y === 7;
    const gore = Math.floor((x + 1) / 4.5) % 2 === 1;
    let c = edge ? OUTL : gore ? band : main;
    if (!edge && x > 15) c = c.map(v => Math.round(v * .86));            // light from the upper left
    p.set(x, y, c);
  }
  for (const [x0, x1] of [[1, 11], [7, 12], [19, 14], [25, 15]]) for (let y = 8; y < H; y++) { const k = (y - 8) / (H - 9); p.set(Math.round(x0 + (x1 - x0) * k), y, [60, 60, 66]); }
  return (CHUTE_CV[team] = p.canvas());
}
/* paratroopers coming down: drawn above everything on the ground, swaying a little until they land */
function drawChute(b, u) {
  const k = clamp((G.t - u.chute.t0) / (u.chute.until - u.chute.t0), 0, 1), alt = 40 * (1 - k), sway = Math.sin(G.t * 3 + u.id) * (1 - k) * 2, cv = chuteCv(u.team);
  for (const mm of u.members) {
    if (mm.dead) continue;
    const x = mm.x + sway, y = mm.y - alt;
    putFrame(b, soldierFrame(mm), x, y);
    drawS(b, cv, x - cv.width / RS / 2 + .5, y - 9.5 - cv.height / RS);
  }
}
Object.assign(ICON_ASCII, {
  charge: ["...X...", "..XXX..", ".XX.XX.", "XX...XX", "...X...", "..XXX..", ".XX.XX.", "XX...XX"],
  blitz: ["......XXX....", "XX..XXXXXXXXX", "...XXXXXXX...", "XX.XXXXXXXXX.", "...X.X.X.X.X.", "....XXXXXXX.."],
  para: ["..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "X.X.X.X.X", ".X..X..X.", "..X.X.X..", "...XXX...", "...XXX...", "...X.X..."],
  vests: [".XX.XX.", "XXX.XXX", "XXXXXXX", "XXXXXXX", "XX.X.XX", "XXXXXXX", ".XXXXX."],
  medics: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  crews: ["...X...", "..XXX..", "XXXXXXX", ".XXXXX.", ".XX.XX.", ".......", "XXXXXXX", "X.X.X.X"],
  apds: ["...X...", "...X...", "..XXX..", "..XXX..", "..XXX..", ".X.X.X.", "X..X..X"],
  para3: ["..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "X.X.X.X.X", ".X..X..X.", "..XXXXX..", ".........", "X...X...X"],
  heliarmor: ["XXXXXXX", "X.....X", "X.XXX.X", "X.XXX.X", ".X.X.X.", "..X.X..", "...X..."],
  fob: ["....X....", "....X....", "..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", ".X.X.X.X.", ".XXX.XXX.", ".XXX.XXX."],
  workshop: ["..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "X.......X", "X.XXXXX.X", "X.X...X.X", "X.XXXXX.X"]
});

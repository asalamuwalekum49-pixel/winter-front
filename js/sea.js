'use strict';
/* Step 6: the sea and crossings. Landing boats and gunboats (the reference sheets have no ships, so they are drawn here in code,
   in the style of the vehicle sprites), the dock that launches them, pontoon bridges thrown by engineers, squads boarding boats
   and transport helicopters and landing elsewhere, and how the enemy commander uses all of it. */

/* ---------------------------------------------------------------- pictures drawn in code */
const OUTL = [22, 22, 26];
const BOAT_COL = { 1: { hull: [86, 94, 78], deck: [112, 120, 98], dark: [52, 58, 48], trim: [140, 146, 124], well: [46, 50, 42] },
  2: { hull: [80, 84, 92], deck: [104, 108, 118], dark: [48, 50, 58], trim: [136, 140, 150], well: [44, 46, 52] } };
/* a top-down hull pointing up (bow at the top), len x wid render pixels; profile(t) is the share of the full width from bow (t = 0) to stern (t = 1) */
function hullPx(len, wid, profile, col) {
  const p = new Px(wid, len), cx = wid / 2;
  const inside = (x, y) => { if (x < 0 || y < 0 || x >= wid || y >= len) return false; const hw = profile((y + .5) / len) * wid / 2; return Math.abs(x + .5 - cx) <= hw; };
  for (let y = 0; y < len; y++) for (let x = 0; x < wid; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    const rim = !edge && (!inside(x - 2, y) || !inside(x + 2, y));
    let c = edge ? OUTL : rim ? col.trim : col.hull;
    if (!edge && x + .5 > cx + 1) c = c.map(v => v * .86);                 // light from the upper left: the right side darker
    p.set(x, y, c);
  }
  return { p, inside };
}
const darker = (c, k) => c.map(v => Math.round(v * k));
function boatHull(team) {
  const col = BOAT_COL[team], L = 46, Wd = 20;
  const { p, inside } = hullPx(L, Wd, t => t < .1 ? .8 + 2 * t : t > .94 ? 1 - (t - .94) * 3 : 1, col);
  for (let y = 2; y < L * .12; y++) for (let x = 2; x < Wd - 2; x++) if (inside(x, y) && inside(x - 1, y) && inside(x + 1, y)) p.set(x, y, y % 2 ? col.deck : col.dark);   // the bow ramp
  for (let y = Math.round(L * .16); y < L * .7; y++) for (let x = 4; x < Wd - 4; x++) p.set(x, y, (y % 4 === 0) ? darker(col.well, 1.25) : col.well);   // the cargo well
  for (let y = Math.round(L * .76); y < L * .9; y++) for (let x = 7; x < Wd - 7; x++) p.set(x, y, col.dark);        // engine hatch
  p.set(Wd / 2 - 1, Math.round(L * .72), col.trim); p.set(Wd / 2, Math.round(L * .72), col.trim);
  return p;
}
function gunboatHull(team) {
  const col = BOAT_COL[team], L = 72, Wd = 24;
  const { p, inside } = hullPx(L, Wd, t => t < .32 ? .1 + .9 * Math.sqrt(t / .32) : t > .9 ? 1 - (t - .9) * 1.6 : 1, col);
  for (let y = Math.round(L * .1); y < L * .95; y += 3) for (let x = 3; x < Wd - 3; x++) if (inside(x, y) && inside(x - 2, y) && inside(x + 2, y)) p.set(x, y, darker(col.hull, .92));   // deck seams
  const s0 = Math.round(L * .4), s1 = Math.round(L * .63);
  for (let y = s0; y < s1; y++) for (let x = 5; x < Wd - 5; x++) {
    const edge = y === s0 || y === s1 - 1 || x === 5 || x === Wd - 6;
    p.set(x, y, edge ? OUTL : y < s0 + 3 ? (x % 3 ? [40, 46, 56] : col.trim) : x + .5 > Wd / 2 + 1 ? darker(col.trim, .86) : col.trim);  // bridge with its windows
  }
  for (let y = Math.round(L * .53); y < L * .58; y++) for (let x = Wd / 2 - 2; x < Wd / 2 + 2; x++) p.set(x, y, col.dark);   // funnel
  for (let y = Math.round(L * .72); y < L * .8; y++) for (let x = 8; x < Wd - 8; x++) p.set(x, y, col.dark);           // stern hatch
  return p;
}
/* a turret drawn around its pivot (the centre of a square), barrel pointing up */
function boatTurret(team, gun) {
  const col = BOAT_COL[team], bl = gun ? 20 : 13, T = 2 * bl + 6, p = new Px(T, T), c = T / 2, r = gun ? 5 : 3;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const d = hyp(x + .5 - c, y + .5 - c); if (d <= r + .5) p.set(x, y, d > r - .7 ? OUTL : x + y < T - 2 ? col.trim : col.dark); }
  for (let k = r - 1; k < bl; k++) for (let w = -1; w <= (gun ? 1 : 0); w++) p.set(Math.floor(c) + w, Math.floor(c) - k, k > bl - 3 ? [64, 64, 70] : w < 0 ? [44, 44, 50] : [30, 30, 34]);
  return p;
}
const BOATS = { boat: { hull: boatHull, turret: t => boatTurret(t, false), piv: -6.9, bl: 6.5 }, gunboat: { hull: gunboatHull, turret: t => boatTurret(t, true), piv: 9.4, bl: 10 } };
function buildBoats() {
  for (const body in BOATS) {
    const spec = BOATS[body], B = VBODY[body] = { sea: true }; B.t = {}; VSPR[body] = {}; VWRECK[body] = {}; VTUR[body] = {}; VSHADOW[body] = {};
    for (const team of [1, 2]) {
      const hull = spec.hull(team), SB = turnSize(hull), burnt = hull.clone().tint([.42, .4, .38]), tur = spec.turret(team), dirs = [], wr = [], sh = [], td = [];
      for (let d = 0; d < 16; d++) { const th = d * TAU / 16 + Math.PI / 2; dirs.push(rotatePx(hull, th, SB).canvas()); wr.push(rotatePx(burnt, th, SB).canvas()); sh.push(rotatePx(hull, th, SB, [16, 18, 34]).canvas()); }
      for (let d = 0; d < 32; d++) td.push(rotatePx(tur, d * TAU / 32 + Math.PI / 2, tur.w).canvas());
      VSPR[body][team] = [dirs, dirs, dirs]; VWRECK[body][team] = wr; VSHADOW[body][team] = sh; VTUR[body][team] = td;
      const g = B.t[team] = { SB, S: SB / RS, piv: spec.piv, pivx: 0, bl: spec.bl, len: hull.h / RS, wid: hull.w / RS, wheeled: false, quad: false, trk: [], back: hull.h / RS / 2 - 2 };
      if (team === 1) Object.assign(B, g, { t: B.t });
      addModel(VMODELS, team, body, body);
    }
  }
}
/* the dock: a timber platform with a shed (roof in the side's colour) and crates; the pier into the water is drawn apart, under the units */
const CODE_BLD_CACHE = new Map();
function dockCv(team, damaged) {
  const key = 'dock' + team + (damaged ? 'd' : ''); let c = CODE_BLD_CACHE.get(key); if (c) return c;
  const Wd = 64, Hh = 48, p = new Px(Wd, Hh), roof = team === 2 ? [96, 98, 106] : [72, 94, 138];
  for (let y = 24; y < Hh; y++) for (let x = 0; x < Wd; x++) { const edge = y === 24 || y === Hh - 1 || x === 0 || x === Wd - 1; p.set(x, y, edge ? WOOD[4] : (y % 3 === 0 ? WOOD[3] : (y % 6 < 3 ? WOOD[1] : WOOD[2]))); }
  for (const px of [1, 30, 60]) for (let y = 38; y < Hh; y++) { p.set(px, y, WOOD[4]); p.set(px + 1, y, WOOD[4]); p.set(px + 2, y, WOOD[3]); }
  for (let y = 12; y < 32; y++) for (let x = 6; x < 38; x++) { const edge = y === 31 || x === 6 || x === 37; p.set(x, y, edge ? OUTL : (x % 4 === 0 ? [96, 90, 84] : [124, 116, 106])); }      // shed walls
  for (let y = 22; y < 31; y++) for (let x = 18; x < 25; x++) p.set(x, y, [36, 32, 30]);                                                                     // door
  for (let y = 2; y < 14; y++) for (let x = 3 + (13 - y) * 0; x < 41; x++) { const edge = y === 2 || y === 13 || x === 3 || x === 40; p.set(x, y, edge ? OUTL : (y % 3 === 0 ? darker(roof, .82) : x > 22 ? darker(roof, .9) : roof)); }
  for (let y = 0; y < 5; y++) for (let x = 30; x < 34; x++) p.set(x, y, y === 0 ? OUTL : [90, 70, 60]);                                                        // chimney
  for (const [bx, by] of [[44, 28], [52, 30]]) for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) p.set(bx + x, by + y, y === 0 || x === 0 || x === 7 || y === 7 ? WOOD[4] : (x + y) % 4 ? WOOD[2] : WOOD[1]);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) p.set(56 + x, 41 + y, (x === 0 || y === 0) ? [70, 72, 80] : [36, 36, 42]);                           // bollard
  if (damaged) { p.tint([.62, .6, .58]); const r = rng32(team * 7 + 3); for (let k = 0; k < 90; k++) p.set((r() * Wd) | 0, (r() * Hh) | 0, [24, 22, 22]); }
  c = p.canvas(); CODE_BLD_CACHE.set(key, c); return c;
}
const CODE_BLD = { dock: dockCv, pontoon: () => { let c = CODE_BLD_CACHE.get('pont'); if (!c) { c = mkCanvas(24, 24); CODE_BLD_CACHE.set('pont', c); } return c; } };
Object.assign(ICON_ASCII, {
  boat: ["......X......", "....XXXX.....", "XXXXXXXXXXXXX", ".XXXXXXXXXXX.", "..XXXXXXXXX..", ".X.X.X.X.X.X."],
  gunboat: [".....XX.......", "..XXXXXX....X.", "XXXXXXXXXXXXXX", ".XXXXXXXXXXXX.", "..XXXXXXXXXX..", "X.X.X.X.X.X.X."],
  dock: ["..XXXX...", ".XXXXXX..", ".X.XX.X..", "XXXXXXXXX", "X.X.X.X.X", ".X.X.X.X."],
  pontoon: ["XXXXXXXXXXX", "X.X.X.X.X.X", "XXXXXXXXXXX", ".XX..XX..XX", "X.X.X.X.X.X"]
});
/* the pier from a dock to its water, and a pontoon bridge, both lying flat under the units */
function drawPier(b, o) {
  if (!o.water) return;
  const x0 = Math.round(o.ax) - 3, down = o.water[1] > o.by, ya = down ? o.by : Math.round(o.water[1]) - 4, yb = down ? Math.round(o.water[1]) + 4 : o.foot[1];
  for (let y = ya; y < yb; y++) { fillPx(b, x0, y, WOOD[4], 1, 1); fillPx(b, x0 + 1, y, y % 3 === 0 ? WOOD[3] : y % 2 ? WOOD[1] : WOOD[2], 5, 1); fillPx(b, x0 + 6, y, WOOD[4], 1, 1); }
  for (let y = ya + 2; y < yb; y += 6) { fillPx(b, x0 - 1, y, [40, 34, 30], 1, 2); fillPx(b, x0 + 7, y, [40, 34, 30], 1, 2); }
}
function drawPontoon(b, o) {
  const x = Math.round(o.ax), [y0, y1] = o.span, end = o.built >= 1 ? y1 : Math.round(y0 + (y1 - y0) * o.built), dmg = o.built >= 1 && o.hp < o.max * .35;
  const plank = y => dmg && (y * 7 + x) % 5 === 0 ? [44, 36, 30] : y % 2 ? WOOD[1] : WOOD[2];
  if (o.built < 1) { b.globalAlpha = .25; for (let y = y0; y < y1; y++) fillPx(b, x - 5, y, WOOD[2], 11, 1); b.globalAlpha = 1; }
  for (let y = y0 + 3; y < end; y += 8) fillPx(b, x - 7, y, [46, 54, 50], 15, 4);                 // floats under the deck
  for (let y = y0; y < end; y++) { fillPx(b, x - 5, y, plank(y), 11, 1); if (y % 4 === 0) fillPx(b, x - 5, y, WOOD[3], 11, 1); }
  for (let y = y0; y < end; y++) { fillPx(b, x - 6, y, WOOD[4]); fillPx(b, x + 6, y, WOOD[4]); }
}

/* ---------------------------------------------------------------- docks and pontoons */
const isCarrier = u => !!u && u.kind !== 'bld' && u.kind !== 'squad' && (u.type === 'heli_trans' || (u.ut.sea && u.ut.cargo));
/* where a dock meets open water: the boat-grid cell nearest to its front, within reach of a short pier */
function dockWater(x, y) {
  const m = G.map, [cx, cy] = cellOf(m, x, y - 5); let best = null, bd = 1e9;
  for (let dy = -7; dy <= 7; dy++) for (let dx = -4; dx <= 4; dx++) {
    const gx = cx + dx, gy = cy + dy; if (gx < 0 || gy < 0 || gx >= m.cw || gy >= m.ch || !m.walkS[gy * m.cw + gx]) continue;
    const wx = gx * CELL + CELL / 2, wy = gy * CELL + CELL / 2, d = dist(wx, wy, x, y - 5); if (d < bd) { bd = d; best = [wx, wy]; }
  }
  return best && bd <= 40 ? best : null;
}
const PONTOON_MAX = 150;
/* a pontoon runs north-south across the water at x, from bank to bank, and reaches a few units onto each bank */
function pontoonSpan(x, y) {
  const m = G.map; x = Math.round(x); y = Math.round(y);
  const wet = (xx, yy) => { if (xx < 0 || yy < 0 || xx >= m.W || yy >= m.H) return false; const k = m.KIND[yy * m.W + xx]; return k === 2 || k === 3; };
  if (x < 10 || x > m.W - 10 || !wet(x, y)) return null;
  let y0 = y, y1 = y;
  while (y0 > 1 && wet(x, y0 - 1) && y - y0 < PONTOON_MAX) y0--;
  while (y1 < m.H - 2 && wet(x, y1 + 1) && y1 - y < PONTOON_MAX) y1++;
  if (y0 <= 2 || y1 >= m.H - 3 || y1 - y0 > PONTOON_MAX) return null;
  for (const dx of [-5, 5]) for (let yy = y0 + 6; yy < y1 - 6; yy++) if (!wet(x + dx, yy)) return null;
  return [y0 - 5, y1 + 6];
}
function canPontoon(team, x, y) {
  const span = pontoonSpan(x, y); if (!span) return null;
  const f = [Math.round(x) - 6, span[0], Math.round(x) + 6, span[1]], T = G.teams[team];
  for (const b of G.blds) if (!b.dead && !(f[2] + 4 < b.foot[0] || f[0] - 4 > b.foot[2] || f[3] + 2 < b.foot[1] || f[1] - 2 > b.foot[3])) return null;
  const ends = [[x, span[0] + 2], [x, span[1] - 2]];
  const near = (ex, ey) => (T.hq && !T.hq.dead && dist(ex, ey, T.hq.x, T.hq.by) < 220) || G.map.points.some(p => p.owner === team && dist(ex, ey, p.cx, p.cy) < 130)
    || G.units.some(u => u.team === team && u.kind === 'squad' && !u.aboard && unitAlive(u) && dist(...unitPos(u), ex, ey) < 180);
  return ends.some(([ex, ey]) => near(ex, ey)) ? span : null;
}
/* units standing on a pontoon when it goes down are pushed to the nearest dry cell */
function clearPontoon(b) {
  const m = G.map, off = (e, veh) => { if (walkable(m, veh, e.x, e.y)) return; const [cx, cy] = cellOf(m, e.x, e.y), w = nearestWalkable(m, veh, cx, cy); if (w) { e.x = w[0] * CELL + CELL / 2; e.y = w[1] * CELL + CELL / 2; } };
  for (const u of G.units) { if (!unitAlive(u) || u.kind === 'air' || (u.ut && u.ut.sea)) continue; if (u.kind === 'squad') { if (!u.aboard) for (const mm of u.members) if (!mm.dead) off(mm, false); } else off(u, true); }
  for (let i = 0; i < 26; i++) G.parts.push(P('snow', b.ax + rand(-6, 6), rand(b.foot[1], b.foot[3]), rand(-14, 14), rand(-8, 8), rand(.4, .8), { vz: rand(20, 50) }));
}

/* ---------------------------------------------------------------- boarding and landing */
/* a squad ordered aboard a boat or a transport helicopter walks to it; the boat comes to the nearest water, the helicopter lands by the squad */
function boardOrder(sq, c) {
  if (!sq || !c || c.cargo || sq.aboard) return false;
  stopUnit(sq); sq.order = { type: 'board', target: c }; sq.retreat = false;
  if (c.kind === 'air') { c.task = { type: 'pickup', sq }; c.mode = null; c.focus = null; c.dest = null; }
  else { const [sx, sy] = unitPos(sq); c.mode = null; c.focus = null; orderMove(c, sx, sy, 'move'); }
  return true;
}
function boardTick(u, live, dt) {
  const c = u.order.target;
  if (!c || c.dead || c.crash || c.cargo || !unitAlive(c)) { u.order = null; return; }
  const [cx, cy] = unitPos(u), reach = c.kind === 'air' ? 20 : 24;
  if (dist(cx, cy, c.x, c.y) <= reach && (c.kind !== 'air' || c.alt < 1.5)) { embark(u, c); return; }
  if (!u.path && G.t > (u.repath || 0)) { u.repath = G.t + 1.5; orderMove(u, c.x, c.y, 'move'); }
}
function embark(sq, c) {
  sq.aboard = c; c.cargoSq = sq; c.cargo = true; sq.order = null; sq.path = null; sq.mode = null; sq.focus = null; G.sel.delete(sq);
  for (const m of sq.members) if (!m.dead) { m.x = c.x; m.y = c.y; m.target = null; m.moving = false; m.arrived = true; m.goal = null; }
  if (c.kind !== 'air' && !c.task) c.path = null;
  if (sq.team === 1 && !G.demo) hooks.toast(t('m_boarded'), 'good');
  hooks.sfx('order', c.x, c.y);
}
/* put the squad ashore on the dry cell nearest to the carrier (ties go toward the target), then send it on to (tx, ty) */
function landSquad(c, tx, ty) {
  const sq = c.cargoSq; if (!sq) return false;
  const m = G.map, [cx, cy] = cellOf(m, c.x, c.y), [gx, gy] = cellOf(m, tx, ty), w = nearestWalkable(m, false, cx, cy, [gx, gy], c.x, c.y);
  if (!w) return false;
  const lx = w[0] * CELL + CELL / 2, ly = w[1] * CELL + CELL / 2; if (dist(lx, ly, c.x, c.y) > 40) return false;
  sq.aboard = null; c.cargoSq = null; c.cargo = false;
  sq.members.forEach((mm, i) => { if (mm.dead) return; const sl = SLOTS[i % SLOTS.length]; let x = lx + sl[0] * .8, y = ly + sl[1] * .8; if (!walkable(m, false, x, y)) { x = lx; y = ly; } mm.x = x; mm.y = y; mm.arrived = true; mm.goal = null; });
  sq.lx = lx; sq.ly = ly; sq.moveT = G.t;
  if (sq.team === 2 || G.auto || G.demo) sq.ai = { task: null, until: 0 };
  if (walkable(m, false, tx, ty) && dist(tx, ty, lx, ly) > 12) orderMove(sq, tx, ty, 'amove');
  hooks.sfx('order', lx, ly);
  return true;
}
/* everyone aboard a sunk boat or a downed helicopter is lost */
function loseCargo(c) {
  const sq = c.cargoSq; if (!sq) return; c.cargoSq = null; c.cargo = false; sq.aboard = null;
  for (const m of sq.members) if (!m.dead) { m.dead = true; m.baked = true; m.bled = true; m.deathT = G.t; lose(sq.team, 1); G.teams[sq.team].stats.lost++; G.teams[3 - sq.team].stats.kills++; }
}
function sinkBoat(u, src) {
  u.dead = true; u.gone = true; u.deathT = G.t; G.sel.delete(u);
  explode(u.x, u.y - 2, WT.burn, null, 0, { size: .9, kind: 'veh' });
  for (let i = 0; i < 30; i++) { const a = rand(0, TAU), sp = rand(10, 46); G.parts.push(P('dust', u.x + Math.cos(a) * 4, u.y + Math.sin(a) * 2, Math.cos(a) * sp, Math.sin(a) * sp * .6, rand(.6, 1.2), { r0: 1.2, r1: rand(2.5, 4.5), a0: .85, pal: FOAM })); }
  const S = VBODY[u.body].S, di = ((Math.round(u.ang / (TAU / 16)) % 16) + 16) % 16; addDecal(VWRECK[u.body][u.team][di], u.x - S / 2, u.y - S / 2, .45);
  G.emitters.push({ x: u.x, y: u.y - 2, w: 6, rate: 8, kind: 'smoke', pal: SMOKE_BLACK, vy: [-15, -9], r: [1.2, 3, 4.5], life: [3, 4.5], a0: .9, acc: 0, until: G.t + 12 });
  loseCargo(u);
  lose(u.team, 6); G.teams[u.team].stats.lost++; G.teams[3 - u.team].stats.kills++;
  if (!G.demo) hooks.toast(u.team === 1 ? t('m_unitLost', { u: t('u_' + u.type) }) : t('m_enemyDown', { u: t('u_' + u.type) }), u.team === 1 ? 'bad' : 'good');
}
/* every tick for a boat: the squad aboard rides along, a landing happens when the boat has come as close as the water allows; foam behind it */
function boatTick(u, dt) {
  const sq = u.cargoSq;
  if (sq) { for (const m of sq.members) if (!m.dead) { m.x = u.x; m.y = u.y; } sq.lx = u.x; sq.ly = u.y; }
  if (u.task && u.task.type === 'land' && !u.path) {
    const ok = landSquad(u, u.task.x, u.task.y);
    if (!ok && u.team === 1 && !G.demo) hooks.toast(t('m_noShore'), 'bad');
    u.task = null;
  }
  if (u.moving && RND() < dt * 16) { const ca = Math.cos(u.ang), sa = Math.sin(u.ang), bk = VBODY[u.body].len / 2, side = RND() < .5 ? -1 : 1;
    G.parts.push(P('dust', u.x - ca * bk - sa * side * 3, u.y - sa * bk + ca * side * 3, -ca * 8 - sa * side * 10, -sa * 8 + ca * side * 10, rand(.6, 1.1), { r0: .8, r1: rand(1.8, 3), a0: .8, pal: FOAM })); }
  if (G.t - u.lastCombat > 6) for (const b of G.blds) if (b.team === u.team && b.type === 'dock' && !b.dead && b.built >= 1 && dist(u.x, u.y, b.ax, b.by) < 70) { u.hp = Math.min(u.max, u.hp + 12 * dt); break; }
}

/* ---------------------------------------------------------------- the enemy commander at sea */
function aiNaval(T) {
  const id = T.id, m = G.map; if (!m.water) return;
  const sl = slotsFor(id);
  if (G.def.sea && sl.dock && G.t > 50 * G.diff.think && !bldOf(id, 'dock').length && bldOf(id, 'barracks', true).length) aiPlace(id, 'dock', sl.dock);
  for (const u of G.units) if (u.team === id && u.ut && u.ut.sea && unitAlive(u)) aiBoat(u, T);
}
/* engineers bridge the crossings listed for the map, their own side's first; returns true when it gave them work */
function aiPontoon(u, T) {
  const def = G.def; if (!def.crossings || G.t < 60 * G.diff.think) return false;
  const id = T.id, mine = G.blds.filter(b => b.team === id && b.type === 'pontoon' && !b.dead), open = mine.find(b => b.built < 1);
  if (open) { u.order = { type: 'build', target: open }; return true; }
  if (mine.length >= 2 || !afford(T, BT.pontoon.cost)) return false;
  const hq = T.hq, [ux, uy] = unitPos(u);
  for (const p of def.crossings.slice().sort((a, b) => dist(a[0], a[1], hq.x, hq.by) - dist(b[0], b[1], hq.x, hq.by))) {
    const span = pontoonSpan(p[0], p[1]); if (!span) continue;
    if (G.blds.some(b => b.type === 'pontoon' && !b.dead && Math.abs(b.ax - p[0]) < 50 && b.span[0] < span[1] && b.span[1] > span[0])) continue;      // bridged already
    if (!reachable(G.map, false, ux, uy, p[0], span[0] + 2) && !reachable(G.map, false, ux, uy, p[0], span[1] - 2)) continue;
    pay(T, BT.pontoon.cost); const b = addBld(id, 'pontoon', Math.round(p[0]), span[1], false, false, span); u.order = { type: 'build', target: b }; return true;
  }
  return false;
}
/* a point worth landing at: not ours, with water close to it that this boat can reach */
function landingTarget(u, id) {
  let best = null, bs = -1e9;
  for (const p of G.map.points) {
    if (p.owner === id) continue;
    const [cx, cy] = cellOf(G.map, p.cx, p.cy), w = nearestWalkable(G.map, 'sea', cx, cy, cellOf(G.map, u.x, u.y), p.cx, p.cy);
    if (!w || dist(w[0] * CELL + 3, w[1] * CELL + 3, p.cx, p.cy) > 110 || !reachable(G.map, 'sea', u.x, u.y, w[0] * CELL + 3, w[1] * CELL + 3)) continue;
    const s = -dist(u.x, u.y, p.cx, p.cy) + (isKey(p) ? 260 : 60) + (p.owner === 0 ? 80 : 0);
    if (s > bs) { bs = s; best = p; }
  }
  return best;
}
function aiBoat(u, T) {
  const id = T.id, dock = bldOf(id, 'dock', true)[0];
  if (!u.ai) u.ai = { task: null, until: 0 };
  if (u.hp < u.max * .35 && dock && dock.water && !u.ai.rtb) { u.ai.rtb = true; u.task = null; stopUnit(u); orderMove(u, dock.water[0], dock.water[1], 'move'); }
  if (u.ai.rtb) { if (u.hp > u.max * .9) u.ai.rtb = false; else return; }
  if (u.type === 'gunboat') {
    if (u.mode === 'attack' && u.focus && !u.focus.dead) return;
    if (u.path && G.t < u.ai.until) return;
    // cover the most valuable point that is not ours, from the water next to it
    const p = landingTarget(u, id) || G.map.points.find(q => isKey(q));
    if (p) { u.ai.until = G.t + 20; orderMove(u, p.cx + rand(-30, 30), p.cy + rand(-30, 30), 'amove'); }
    return;
  }
  if (u.cargoSq) {
    if (u.task && u.task.type === 'land') return;
    const p = landingTarget(u, id);
    if (p) { u.task = { type: 'land', x: p.cx, y: p.cy }; orderMove(u, p.cx, p.cy, 'move'); }
    return;
  }
  const w = u.ai.waitSq;
  if (w && unitAlive(w) && !w.aboard && w.order && w.order.type === 'board' && w.order.target === u) {
    if (!u.path && G.t > u.ai.until) { u.ai.until = G.t + 5; const [sx, sy] = unitPos(w); orderMove(u, sx, sy, 'move'); }
    return;
  }
  u.ai.waitSq = null;
  // take on a squad that has nothing left to do on its own shore
  let best = null, bd = 320;
  for (const s of G.units) {
    if (s.team !== id || s.kind !== 'squad' || s.aboard || s.retreat || s.order || s.type === 'engineers' || !unitAlive(s) || liveCount(s) < Math.min(3, s.ut.n)) continue;
    const [sx, sy] = unitPos(s), d = dist(sx, sy, u.x, u.y); if (d >= bd) continue;
    if (G.map.points.some(p => p.owner !== id && reachable(G.map, false, sx, sy, p.cx, p.cy))) continue;
    if (!landingTarget(u, id)) continue;
    bd = d; best = s;
  }
  if (best) { boardOrder(best, u); u.ai.waitSq = best; u.ai.until = G.t + 5; }
  else if (dock && dock.water && !u.path && dist(u.x, u.y, dock.water[0], dock.water[1]) > 50) orderMove(u, dock.water[0], dock.water[1], 'move');
}

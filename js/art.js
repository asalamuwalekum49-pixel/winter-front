'use strict';
/* Sprites: frames from the reference atlas (js/sprites.js) cut into canvases, mirrored and turned to 16 or 32 headings.
   Atlas frames are in render pixels: RS of them per world unit. */
let ATLAS_IMG = null;
const FRC = new Map();
function loadAtlas(done) {
  const im = new Image();
  im.onload = () => { ATLAS_IMG = im; done(); };
  im.onerror = () => done();
  im.src = ATLAS_SRC;
}
const fmeta = n => (ATLAS[n] && ATLAS[n][4]) || {};
const hasFrame = n => !!ATLAS[n];
function atlasCv(n) {
  let c = FRC.get(n); if (c) return c;
  const f = ATLAS[n];
  if (!f || !ATLAS_IMG) c = mkCanvas(1, 1);
  else { c = mkCanvas(f[2], f[3]); c.getContext('2d').drawImage(ATLAS_IMG, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]); }
  FRC.set(n, c); return c;
}
function toPx(c) { const p = new Px(c.width, c.height); p.d.set(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); return p; }
function flipCanvas(c) { const o = mkCanvas(c.width, c.height), x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; }
/* a canvas that repeats a strip frame along a length in world units (fences, sandbags, wire) */
function stripCanvas(n, L) {
  const t = atlasCv(n), w = Math.max(1, Math.round(L * RS)), c = mkCanvas(w, t.height), x = c.getContext('2d');
  for (let ox = 0; ox < w; ox += t.width - 2) x.drawImage(t, ox, 0);
  return c;
}
/* pad a frame so that the point (px, py) becomes the centre, then it can be turned around that point */
function centredPx(c, px, py) {
  const r = Math.ceil(Math.max(hyp(px, py), hyp(c.width - px, py), hyp(px, c.height - py), hyp(c.width - px, c.height - py))) + 1;
  const o = mkCanvas(2 * r, 2 * r); o.getContext('2d').drawImage(c, Math.round(r - px), Math.round(r - py));
  return toPx(o);
}
const turnSize = p => Math.ceil(hyp(p.w, p.h)) + 2;

/* ---------------------------------------------------------------- soldiers (facing right, mirrored for the left) */
const SPR = {};
const SOLDIER_POSES = ['idle', 'aim', 'kneel', 'walk0', 'walk1', 'walk2', 'walk3', 'prone', 'fall', 'fall2', 'dead'];
function soldierPair(n) {
  const m = fmeta(n), c = atlasCv(n);
  return [{ c, ax: m.ax, ay: m.ay, mx: m.mx, my: m.my }, { c: flipCanvas(c), ax: c.width - m.ax, ay: m.ay, mx: -m.mx, my: m.my }];
}
function buildSoldiers() {
  for (const team of [1, 2]) {
    SPR[team] = {};
    for (const role of ['rifle', 'eng', 'mg', 'sniper', 'at', 'mortar']) {
      const set = {}; for (const p of SOLDIER_POSES) set[p] = soldierPair(`s${team}_${role}_${p}`);
      set.walk = [set.walk0, set.walk1, set.walk2, set.walk3];
      SPR[team][role] = set;
    }
    SPR[team].mortar.setup = soldierPair(`s${team}_mortar_mortarset`);
  }
}

/* ---------------------------------------------------------------- vehicles (built facing up, turned to 16 headings; turrets to 32) */
const VCOL = {
  1: { m: [100, 108, 88], l: [128, 136, 112], d: [70, 76, 60], x: [28, 30, 26], b: [54, 58, 48] },
  2: { m: [78, 80, 88], l: [106, 108, 118], d: [54, 56, 62], x: [24, 24, 28], b: [44, 46, 52] }
};
/* S (turned canvas size), piv (turret pivot ahead of the hull centre), bl (barrel length) and the track offsets are
   filled in from the atlas; all in world units. B.t[team] holds that side's own measurements (the two sides' pictures differ).
   Bodies with 'base' are extra models of that type from the reference sheets: same stats, and a new vehicle
   picks one of the type's models at random (VMODELS) */
const VBODY = { car: { wheeled: true }, halftrack: { quad: true }, lt: {}, mt: {}, ht: { brake: true }, spg: { brake: true },
  car_b: { wheeled: true, base: 'car' }, halftrack_b: { quad: true, base: 'halftrack' }, lt_b: { base: 'lt' }, mt_b: { base: 'mt' }, mt_c: { base: 'mt' },
  ht_b: { brake: true, base: 'ht' }, spg_b: { brake: true, base: 'spg' },
  lt_c: { base: 'lt' }, ht_c: { brake: true, base: 'ht' }, halftrack_c: { quad: true, base: 'halftrack' } };
/* VMODELS[team][type body] lists the models a side can get: a model may exist for one side only */
const VSPR = {}, VWRECK = {}, VTUR = {}, VSHADOW = {}, VMODELS = {};
const dir32 = a => ((Math.round(a / (TAU / 32)) % 32) + 32) % 32;
const vgeo = u => VBODY[u.body].t[u.team];
const addModel = (lists, team, key, body) => { const l = lists[team] = lists[team] || {}; (l[key] = l[key] || []).push(body); };
function buildVehicles() {
  for (const body of Object.keys(VBODY)) {
    const teams = [1, 2].filter(t => hasFrame(`v${t}_${body}_hull`));
    if (!teams.length) { delete VBODY[body]; continue; }
    const B = VBODY[body]; VSPR[body] = {}; VWRECK[body] = {}; VTUR[body] = {}; VSHADOW[body] = {}; B.t = {};
    const hulls = {}; for (const t of teams) hulls[t] = toPx(atlasCv(`v${t}_${body}_hull`));
    const SB = Math.max(...teams.map(t => turnSize(hulls[t])));
    for (const team of teams) {
      const hn = `v${team}_${body}_hull`, tn = `v${team}_${body}_tur`, hm = fmeta(hn), tm = fmeta(tn);
      const hull = hulls[team], wreck = toPx(atlasCv(`v${team}_${body}_wreck`));
      const dirs = [], wr = [], sh = [];
      for (let d = 0; d < 16; d++) {
        const th = d * TAU / 16 + Math.PI / 2;
        dirs.push(rotatePx(hull, th, SB).canvas()); wr.push(rotatePx(wreck, th, SB).canvas()); sh.push(rotatePx(hull, th, SB, [16, 18, 34]).canvas());
      }
      VSPR[body][team] = [dirs, dirs, dirs]; VWRECK[body][team] = wr; VSHADOW[body][team] = sh;
      const tp = centredPx(atlasCv(tn), tm.px, tm.py), TS = tp.w, tur = [];
      for (let d = 0; d < 32; d++) tur.push(rotatePx(tp, d * TAU / 32 + Math.PI / 2, TS).canvas());
      VTUR[body][team] = tur;
      const g = B.t[team] = { SB, S: SB / RS, piv: hm.piv / RS, pivx: (hm.pivx || 0) / RS, bl: tm.bl / RS, len: hull.h / RS, wid: hull.w / RS, wheeled: B.wheeled, quad: B.quad };
      g.trk = g.wheeled ? [-(g.wid / 2 - 2), g.wid / 2 - 2] : [-(g.wid / 2 - 2), -(g.wid / 2 - 3), g.wid / 2 - 3, g.wid / 2 - 2];
      g.back = g.len / 2 - 2;
      if (team === teams[0]) Object.assign(B, g, { t: B.t });
      addModel(VMODELS, team, B.base || body, body);
    }
  }
}

/* ---------------------------------------------------------------- helicopters (fuselage only: the rotor is drawn spinning) */
const HBODY = { hs: { alt: 22, blades: 2 }, ha: { alt: 26, blades: 4 }, tr: { alt: 28, blades: 4 },
  hs_b: { alt: 22, blades: 2, base: 'hs' }, ha_b: { alt: 26, blades: 4, base: 'ha' }, tr_b: { alt: 28, blades: 4, base: 'tr' },
  hs_c: { alt: 22, blades: 2, base: 'hs' }, ha_c: { alt: 26, blades: 4, base: 'ha' } };
const HSPR = {}, HMODELS = {};
const hgeo = u => HBODY[u.body].t[u.team];
function buildHelis() {
  for (const body of Object.keys(HBODY)) {
    const teams = [1, 2].filter(t => hasFrame(`h${t}_${body}`));
    if (!teams.length) { delete HBODY[body]; continue; }
    HSPR[body] = {}; const B = HBODY[body]; B.t = {};
    const ps = {}; for (const t of teams) ps[t] = toPx(atlasCv(`h${t}_${body}`));
    const SB = Math.max(...teams.map(t => turnSize(ps[t])));
    for (const team of teams) {
      const m = fmeta(`h${team}_${body}`), p = ps[team], dirs = [], shadow = [];
      for (let d = 0; d < 16; d++) { const th = d * TAU / 16 + Math.PI / 2; dirs.push(rotatePx(p, th, SB).canvas()); shadow.push(rotatePx(p, th, SB, [16, 18, 34]).canvas()); }
      HSPR[body][team] = { dirs, shadow };
      const g = B.t[team] = { alt: B.alt, blades: B.blades, w: p.w / RS, h: p.h / RS, S: SB / RS, hub: [m.hub[0] / RS, m.hub[1] / RS], tail: [m.tail[0] / RS, m.tail[1] / RS], R: Math.max(9, m.R / RS) };
      if (team === teams[0]) Object.assign(B, g, { t: B.t });
      addModel(HMODELS, team, B.base || body, body);
    }
  }
}
/* recon planes: each side has its own pictures, two models each */
const PLANES = {}, PLANE_MODELS = { 1: ['plane1', 'plane1_b'], 2: ['plane2', 'plane2_b'] };
function planeSpr(team, model) {
  const n = model && hasFrame(model) ? model : `plane${team === 2 ? 2 : 1}`;
  let P = PLANES[n]; if (P) return P;
  const p = toPx(atlasCv(n)), S = turnSize(p);
  P = PLANES[n] = { dirs: [], sh: [], S: S / RS };
  for (let d = 0; d < 16; d++) { const th = d * TAU / 16 + Math.PI / 2; P.dirs.push(rotatePx(p, th, S).canvas()); P.sh.push(rotatePx(p, th, S, [16, 18, 34]).canvas()); }
  return P;
}

/* ---------------------------------------------------------------- base buildings
   fortifications have extra looks (b1_bunker_v1 ...): v is picked when the building is placed, 0 is the main look */
const bldName = (type, team, v) => { const n = `b${team === 2 ? 2 : 1}_${type}`; return v && hasFrame(`${n}_v${v}`) ? `${n}_v${v}` : n; };
function bldSprite(type, team, S, damaged, v) { if (typeof CODE_BLD !== 'undefined' && CODE_BLD[type]) return CODE_BLD[type](team, damaged); return atlasCv(bldName(type, team, v) + (damaged ? '_dmg' : '')); }
const bldMeta = (type, team, v) => fmeta(bldName(type, team, v));
const bldLooks = type => { let n = 1; while (hasFrame(`b1_${type}_v${n}`)) n++; return n; };

/* ---------------------------------------------------------------- scenery for the map generator */
/* how many kinds of snowy firs, bare trees and burnt-out tanks the atlas holds */
const countFrames = name => { let n = 0; while (hasFrame(name(n))) n++; return Math.max(1, n); };
const PINE_N = countFrames(k => `pine${k}_10`), BARE_N = countFrames(k => `bare${k}_14`), WT_N = countFrames(k => `wt${k}`);
function pineImg(v, h) { return atlasCv(`pine${v % PINE_N}_${clamp(h, 10, 23)}`); }
function bareImg(v, h) { return atlasCv(`bare${v % BARE_N}_${h < 15 ? 14 : h < 17 ? 16 : 18}`); }
/* step 4: green firs without snow for summer, spring and autumn (fewer heights: the nearest one is used);
   autumn larches are the same firs with the needles turned golden or rusty, the trunk and outline stay */
const GFIR_N = countFrames(k => `gfir${k}_10`), GFIR_H = [10, 12, 14, 16, 18, 20, 22];
const gfirName = (v, h) => `gfir${v % GFIR_N}_${GFIR_H.reduce((a, b) => Math.abs(b - h) < Math.abs(a - h) ? b : a)}`;
function gfirImg(v, h) { return atlasCv(gfirName(v, h)); }
const LARCH = [[[78,50,24],[120,78,28],[166,114,36],[204,154,52],[230,192,90]], [[84,42,22],[126,62,26],[170,92,34],[204,128,50],[228,166,80]]];
function larchImg(v, h, tone) {
  const n = gfirName(v, h), key = `${n}|larch${tone}`; let c = FRC.get(key); if (c) return c;
  const p = toPx(atlasCv(n)), d = p.d, pal = LARCH[tone % LARCH.length];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (!d[i + 3] || g < r - 2 || Math.max(r, g, b) < 34) continue;      // the brown trunk and the dark outline stay
    const px = (i >> 2) % p.w, py = ((i >> 2) / p.w) | 0, v2 = clamp(((r * 30 + g * 59 + b * 11) / 100 - 30) / 60, 0, 1) * (pal.length - 1), f = Math.floor(v2);
    const k = Math.min(pal.length - 1, f + (v2 - f > bay(px, py) ? 1 : 0)); d[i] = pal[k][0]; d[i + 1] = pal[k][1]; d[i + 2] = pal[k][2];
  }
  c = p.canvas(); FRC.set(key, c); return c;
}
/* off-season looks of a frame: the snow on a roof becomes tiles, shingles, tar or tent canvas (roof = a ROOFS key),
   the snow lying at the foot becomes bare earth. Snow is grown from clearly bluish-white seeds into nearby pale pixels;
   a blob high up is the roof, a blob at the bottom is the ground, small bluish bits on walls stay as they are */
const ROOFS = { tile: [[78,40,34],[102,54,42],[128,70,52],[152,90,64],[172,108,76]], tile2: [[70,46,40],[92,60,48],[114,76,58],[136,94,70],[156,110,80]],
  wood: [[56,44,38],[76,60,48],[96,76,58],[116,94,70],[134,110,82]], tar: [[50,52,56],[66,68,72],[84,86,90],[102,104,108],[120,122,126]],
  canvas: [[66,68,48],[86,88,60],[106,106,74],[126,124,88],[144,140,100]] };
const DIRT = [[60,52,44],[76,66,54],[92,80,64],[108,94,74]];
function thawCv(name, roof) {
  const key = `${name}|thaw|${roof || ''}`; let c = FRC.get(key); if (c) return c;
  const p = toPx(atlasCv(name)), w = p.w, h = p.h, d = p.d, n = w * h;
  const L = new Float32Array(n), strong = new Uint8Array(n), loose = new Uint8Array(n), edge = new Uint8Array(n), lab = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4; if (!d[o + 3]) continue;
    const r = d[o], g = d[o + 1], b = d[o + 2], sp = Math.max(r, g, b) - Math.min(r, g, b), l = (r * 30 + g * 59 + b * 11) / 100;
    L[i] = l; if (sp >= 90) continue;
    if (b >= r + 10 && b >= g && l >= 110) strong[i] = 1;
    if ((b >= r + 3 && b >= g - 6 && l >= (i / w < h * .6 ? 62 : 78)) || (sp <= 22 && l >= 120)) loose[i] = 1;
    if (l >= 136 && b >= r - 4 && sp < 60) edge[i] = 1;
  }
  const comps = [], near = (i, fn) => { const x = i % w, y = (i / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && fn(ny * w + nx)) return true; } return false; };
  for (let s = 0; s < n; s++) {
    if (!strong[s] || lab[s]) continue;
    const k = comps.length + 1, pts = [s]; lab[s] = k;
    for (let q = 0; q < pts.length; q++) near(pts[q], j => { if (!lab[j] && loose[j]) { lab[j] = k; pts.push(j); } return false; });
    comps.push(pts);
  }
  for (let pass = 0; pass < 2; pass++) {
    const add = [];
    for (let i = 0; i < n; i++) if (!lab[i] && edge[i]) { let k = 0; near(i, j => (k = lab[j]) > 0); if (k) add.push(i, k); }
    for (let a = 0; a < add.length; a += 2) { lab[add[a]] = add[a + 1]; comps[add[a + 1] - 1].push(add[a]); }
  }
  for (const pts of comps) {
    let sy = 0, my = 0, lo = 1e9, hi = -1e9;
    for (const i of pts) { const y = (i / w) | 0; sy += y; if (y > my) my = y; if (L[i] < lo) lo = L[i]; if (L[i] > hi) hi = L[i]; }
    const cy = sy / pts.length, ramp = cy < h * .58 && pts.length >= 6 ? (roof ? ROOFS[roof] : null) : my >= h * .8 && cy > h * .66 ? DIRT : null;
    if (!ramp) continue;
    for (const i of pts) { const x = i % w, y = (i / w) | 0, v = (L[i] - lo) / Math.max(1, hi - lo) * (ramp.length - 1), f = Math.floor(v), k = Math.min(ramp.length - 1, f + (v - f > bay(x, y) ? 1 : 0)), o = i * 4; d[o] = ramp[k][0]; d[o + 1] = ramp[k][1]; d[o + 2] = ramp[k][2]; }
  }
  c = p.canvas(); FRC.set(key, c); return c;
}
/* which roof a house gets outside winter: wooden houses keep shingles, stone ones get clay tiles (two shades), concrete gets tar */
function roofOf(name, x, y) {
  if (/^t_/.test(name)) return null;                // town buildings have no snow on their roofs, only at the foot
  if (/^(h_lit|h_lit2|h_barn|r_b)_/.test(name)) return 'wood';
  if (/^(h_conc|r_conc)_/.test(name)) return 'tar';
  return ((x * 7 + y * 13) >> 3) % 2 ? 'tile2' : 'tile';
}
/* a burnt-out tank lying on the map: the top-down wreck turned to one of 16 headings, with its shadow baked in */
const WTANK = new Map();
function wreckTankImg(k, d) {
  const key = (k % WT_N) * 16 + (d & 15); let c = WTANK.get(key); if (c) return c;
  const p = toPx(atlasCv(`wt${k % WT_N}`)), S = turnSize(p), th = (d & 15) * TAU / 16;
  c = mkCanvas(S + 4, S + 4); const x = c.getContext('2d');
  x.globalAlpha = .34; x.drawImage(rotatePx(p, th, S, [16, 18, 34]).canvas(), 4, 4); x.globalAlpha = 1; x.drawImage(rotatePx(p, th, S).canvas(), 0, 0);
  WTANK.set(key, c); return c;
}
const HOUSE_SIZES = [22, 26, 28, 30, 34, 36], RUIN_SIZES = [26, 30, 34];
const KIND_SIZES = { h_conc: [26, 30, 34], h_tiny: [22, 26], t_hall: [50], t_ware: [50], t_house: [50], t_store: [50], t_flats: [48], t_long: [58] };
/* burnt trucks on the maps: grey, rusty, and one whose flames are already in the picture */
const TRUCKS = ['truck', 'truck2', 'truck3'];
/* spec.kind picks a house picture by name ('h_long', 'h_conc', 'h_tiny', or the ruins 'r_a', 'r_b', 'r_conc') */
function houseName(spec) {
  const sizes = KIND_SIZES[spec.kind] || (spec.kind && spec.kind.startsWith('r_') ? RUIN_SIZES : HOUSE_SIZES);
  const w = sizes.reduce((a, b) => Math.abs(b - spec.w) < Math.abs(a - spec.w) ? b : a), pickH = (list) => list[((spec.x * 7 + spec.y * 3) >> 2) % list.length];
  if (spec.kind) return `${spec.kind}_${w}`;
  const lit = (spec.lit || []).some(v => v);
  const kind = spec.barn ? 'h_barn' : lit ? pickH(['h_lit', 'h_lit2']) : pickH(['h_stone', 'h_snow', 'h_small', 'h_long']);
  return `${kind}_${w}`;
}

/* ---------------------------------------------------------------- interface icons (one colour, 'X' = pixel) */
const ICON_ASCII = {
  mp: [".......","..XXX..",".XXXXX.",".XXXXX.","XXXXXXX","X.....X"], mu: ["...X...","..XXX..","..XXX..","..XXX..","..XXX..",".XXXXX.","..XXX.."],
  fu: ["..XXXX.",".X...XX","XXXXXXX","X.XXX.X","XX.X.XX","X.XXX.X","XXXXXXX"], sup: ["..XXX..",".X...X.","XXXXXXX","X.X.X.X","XXXXXXX","X.X.X.X","XXXXXXX"],
  plus: ["...X...","...X...","XXXXXXX","...X...","...X..."], minus: [".......",".......","XXXXXXX",".......","......."],
  nv: [".........",".XXX.XXX.","XX.XXX.XX","X...X...X","XX.XXX.XX",".XXX.XXX."], pause: ["XX..XX","XX..XX","XX..XX","XX..XX","XX..XX","XX..XX"],
  army: ["X.X.X.X","XXXXXXX",".......","X.X.X.X","XXXXXXX"], hq: ["X........","XXX......","XX.......","X..XXXX..","X.XXXXXX.","XXXXXXXXX","XX.XX.XXX","XXXXXXXXX"],
  engineers: ["XXX......","XXXX.....","..XXX....","...XXX...","....XXX..","....X.XX.","........X"],
  riflemen: ["..........X","XXXXXXXXXXX","XXXXX.X....","XX.........","X.........."], mg: ["....XX.....","XXXXXXXXXXX","XXXX.XX....","XX..X..X...","X..X....X.."],
  sniper: ["...XXXX....","....XX.....","XXXXXXXXXXX","XXX........","X.........."], at: [".........XX","XXXXXXXXXXX","XXXXXXXXXXX","....X......","....X......"],
  mortar: ["......XX.",".....XX..","....XX...","...XX....","..XX.X...",".X...X...","XXXXXXXX."],
  scout: ["....XXXX.....","...XX..XX....","XXXXXXXXXXXXX","XXXXXXXXXXXXX",".XX......XX..",".XX......XX.."], aa: ["..........X.X",".........X.X.","........XXX..","XXXXXXXXXXXX.","XXXXXXXXXXXX.",".X.X.X.X.XX.."],
  light: ["....XXX.....","...XXXXXXXX.",".XXXXXXXX...","XXXXXXXXXX..","X.X.X.X.X.X.",".XXXXXXXXX.."], medium: ["......XXX.....",".....XXXXXXXXX","..XXXXXXXX....",".XXXXXXXXXXX..","XXXXXXXXXXXXX.","X.X.X.X.X.X.X.",".XXXXXXXXXXX.."],
  heavy: [".....XXXX......","....XXXXXXXXXXX","..XXXXXXXXX....",".XXXXXXXXXXXX..","XXXXXXXXXXXXXX.","X.X.X.X.X.X.X.X",".XXXXXXXXXXXXX."], howitzer: ["...........XX.","........XXXX..",".....XXXX.....","..XXXXXXXXX...",".XXXXXXXXXXX..","X.X.X.X.X.X.X.",".XXXXXXXXXXX.."],
  heli_scout: ["XXXXXXXXXXXXX","......X......","....XXXX.....","...XXXXXXXXXX","....XXXX...X.","...X...X....."], heli_attack: ["XXXXXXXXXXXXX","......X......",".XXXXXXXXXXXX","XXXXXXXX....X",".XXX.........","..X.X........"],
  heli_trans: ["XXXXXXXXXXXXXX","......X.......","..XXXXXXXXXXXX",".XXXXXXXXXX..X","..XXXXXXXX....","..X.....X....."],
  barracks: ["....X....","..XXXXX..","XXXXXXXXX",".XXXXXXX.",".X.X.X.X.",".XXX.XXX.",".XXX.XXX."], motor: ["XXXXXXXXXX","X........X","XXXXXXXXXX","X.XXX.XXX.","X.X.X.X.X.","X.XXX.XXX."],
  helipad: [".XXXXXXX.","XX.....XX","X.X...X.X","X.XXXXX.X","X.X...X.X","XX.....XX",".XXXXXXX."], depot: ["...XXX...","..XXXXX..",".XX...XX.","XXXX.XXXX","X..X.X..X","XXXX.XXXX"],
  bunker: ["..XXXXX..",".XXXXXXX.","XX.....XX","XXXXXXXXX","XXXXXXXXX"], aanest: [".......XX","......XX.","..X..XX..","..XXXX...",".XXXXXX..","XXXXXXXXX"],
  sandbags: [".XX.XX.XX.","XXXXXXXXXX","XX.XX.XX.X","XXXXXXXXXX"], wire: ["X...X...X","XX.X.X.XX","X.X...X.X","XX.X.X.XX","X...X...X"],
  traps: ["X...X.X...X",".X.X...X.X.","..X.....X..",".X.X...X.X.","X...X.X...X"], mines: ["..XXX..",".X...X.","X..X..X",".X...X.","..XXX.."],
  t2: ["X.....X",".X...X.","..X.X..","...X...","X.....X",".X...X.","..X.X..","...X..."], t3: ["X.....X",".X...X.","..X.X..","...X...","X.....X",".X...X.","..X.X..","...X...","X.....X",".X...X.","..X.X..","...X..."],
  winter: ["...X...","X..X..X",".X.X.X.","..XXX..","XXXXXXX","..XXX..",".X.X.X.","X..X..X","...X..."], lmg: ["....XX.....","XXXXXXXXXXX","XXXX.XX....","XX..X..X...","X..X....X.."],
  armor: [".XXXXXXX.","XXXXXXXXX","XXX.X.XXX","XXXX.XXXX","XXX.X.XXX",".XXXXXXX.","..XXXXX..","...XXX..."], optics: ["..XXXXX..",".X.....X.","X..XXX..X","X..XXX..X",".X.....X.","..XXXXX.."],
  stop: ["XXXXXXX","XXXXXXX","XXXXXXX","XXXXXXX","XXXXXXX"], retreat: ["...X...X.","..X...X..",".X...X...","X...X....",".X...X...","..X...X..","...X...X."],
  reinforce: ["...X.....","...X.....",".XXXXX...","...X.XXX.","...XXXXXX","....XXXXX","....X...X"], grenade: ["....XX...","...X..X..","..XXX....",".XXXXX...","XXXXXXX..","XXXXXXX..",".XXXXX...","..XXX...."],
  ground: ["....X....","..XXXXX..",".X..X..X.",".X.....X.","XXX.X.XXX",".X.....X.",".X..X..X.","..XXXXX..","....X...."], build: ["XXXX.....","XXXX.....","..XX.....","...XX....","....XX...",".....XX..","......XX."],
  back: ["...X.....","..XX.....",".XXXXXXXX","XXXXXXXXX",".XXXXXXXX","..XX.....","...X....."], unload: ["X.....X",".X...X.","..X.X..","...X...","X.....X",".X...X.","..X.X..","...X..."],
  load: ["...X...","..X.X..",".X...X.","X.....X","...X...","..X.X..",".X...X.","X.....X"], rtb: ["X...X..X.","X...X.XXX","XXXXX..X.","X...X..X.","X...X..X."],
  artillery: ["...XX...","..XXXX..","..XXXX..","..XXXX..","..XXXX..",".XXXXXX.",".X.XX.X."], recon: ["...X...","...X...","XXXXXXX",".XXXXX.","...X...","..XXX.."],
  star: ["...X...","..XXX..","XXXXXXX",".XXXXX.",".XX.XX.","XX...XX"], lock: ["..XXX..",".X...X.",".X...X.","XXXXXXX","XXX.XXX","XXX.XXX","XXXXXXX"]
};
function buildArt() { buildSoldiers(); buildVehicles(); buildHelis(); buildBoats(); }

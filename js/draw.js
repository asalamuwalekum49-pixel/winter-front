'use strict';
/* Renderer: the world is drawn one pixel per world unit into a small buffer, which is then scaled up by a whole number. */
const stampCache = new Map();
function puffStamp(col, r, a) {
  r = Math.max(1, Math.round(r)); const al = Math.max(1, Math.min(4, Math.round(a * 4))); const key = css(col) + '|' + r + '|' + al;
  let c = stampCache.get(key);
  if (!c) { const n = 2 * r + 1, p = new Px(n, n); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if ((x - r) ** 2 + (y - r) ** 2 <= r * r + r * .6 && bay(x + r, y) < al / 4) p.set(x, y, col); c = p.canvas(); stampCache.set(key, c); }
  return c;
}
let patCache = null;
function patterns(b) {
  if (patCache) return patCache;
  const mk = (col, fn) => { const p = new Px(4, 4); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (fn(x, y)) p.set(x, y, col); return b.createPattern(p.canvas(), 'repeat'); };
  const sparse = (x, y) => (x + y) % 4 === 0 && y % 2 === 0, dense = (x, y) => (x + y) % 4 === 0;
  patCache = { grey: mk([124, 128, 146], sparse), blue: mk([92, 150, 255], sparse), red: mk([226, 84, 76], sparse), ok: mk([126, 226, 138], dense), bad: mk([238, 70, 60], dense) };
  return patCache;
}
let buf = null, bctx = null;
const VIEW = { s: 3, vw: 0, vh: 0, hudT: 0, hudB: 0, padT: 40, padB: 70 };
/* screen pixels per world unit: a whole number of screen pixels for every render pixel */
const zoomScale = (z, dpr) => RS * Math.max(1, Math.round(z * dpr / RS));
function viewMetrics(cw, ch, dpr) { const s = zoomScale(G.zoom, dpr); return { s, vw: cw / s, vh: ch / s }; }
function clampCam(vw, vh) {
  const m = G.map, pt = VIEW.padT, pb = VIEW.padB;
  if (vw >= m.W + 16) G.cam.x = (m.W - vw) / 2; else G.cam.x = clamp(G.cam.x, -8, m.W - vw + 8);
  if (vh >= m.H + pt + pb) G.cam.y = (m.H - vh - pt + pb) / 2; else G.cam.y = clamp(G.cam.y, -pt, m.H - vh + pb);
}
const dir16 = a => ((Math.round(a / (TAU / 16)) % 16) + 16) % 16;
const teamCol = o => o === 1 ? [66, 128, 255] : o === 2 ? [238, 58, 52] : [150, 156, 176];
function placeAnchor(type, wx, wy) { return [Math.round(wx), Math.round(wy + BT[type].foot[1] / 2)]; }
function fillPx(b, x, y, c, w = 1, h = 1) { b.fillStyle = css(c); b.fillRect(x, y, w, h); }
function ring(b, cx, cy, rx, ry, c, dashed, phase) {
  b.fillStyle = css(c); const n = Math.floor(TAU * Math.max(rx, ry) * 1.5) + 8;
  for (let i = 0; i < n; i++) { if (dashed && ((i + phase) / 3 | 0) % 2) continue; const a = TAU * i / n; b.fillRect(Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a)), 1, 1); }
}
function linePx(b, x0, y0, x1, y1, c) { b.fillStyle = css(c); const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const u = n ? i / n : 0; b.fillRect(Math.round(lerp(x0, x1, u)), Math.round(lerp(y0, y1, u)), 1, 1); } }
function dotPath(b, pts, col, phase) {
  let acc = phase % 4;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [cx, cy] = pts[i + 1], L = dist(ax, ay, cx, cy);
    for (let d = 0; d < L; d += 1) if (((d + acc) | 0) % 4 === 0) { const x = Math.round(ax + (cx - ax) * d / L), y = Math.round(ay + (cy - ay) * d / L); fillPx(b, x + 1, y + 1, [30, 40, 64]); fillPx(b, x, y, col); }
    acc = (acc + L) % 4;
  }
}
function brackets(b, x0, y0, x1, y1, col, len) {
  b.fillStyle = css(col); x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { b.fillRect(sx > 0 ? x : x - len + 1, y, len, 1); b.fillRect(x, sy > 0 ? y : y - len + 1, 1, len); }
}
function hpbar(b, x, y, w, frac, c) { x = Math.round(x - w / 2 - 1); y = Math.round(y); b.fillStyle = 'rgb(16,16,20)'; b.fillRect(x, y, w + 2, 3); b.fillStyle = 'rgb(64,64,70)'; b.fillRect(x + 1, y + 1, w, 1); b.fillStyle = css(c); b.fillRect(x + 1, y + 1, Math.max(0, Math.round(w * clamp(frac, 0, 1))), 1); }
const glyphPx = (b, rows, x, y, c) => { b.fillStyle = css(c); rows.forEach((r, yy) => { for (let xx = 0; xx < r.length; xx++) if (r[xx] === 'X') b.fillRect(x + xx, y + yy, 1, 1); }); };
const STAR = [".X.", "XXX", ".X."], CHEV = ["X...X", ".X.X.", "..X.."], ARROW = ["..X..", ".XXX.", "X.X.X", "..X..", "..X.."];
const BANG = ["X", "X", "X", ".", "X"], CHEV2 = ["X..X..", ".X..X.", "..X..X", ".X..X.", "X..X.."];
function flames(b, x0, x1, yb, hmax, seed) {
  const cx = (x0 + x1) / 2, half = (x1 - x0) / 2 + 1, t = G.t;
  for (let x = Math.floor(x0); x < x1; x++) {
    const n = .5 + .5 * Math.sin(t * 9.1 + x * 1.7 + seed) * Math.sin(t * 5.3 + x * .9 + seed * 2.1);
    const hh = Math.floor(hmax * (.3 + .7 * n) * (1 - Math.abs(x - cx) / half * .55));
    for (let k = 0; k < hh; k++) { const f = k / Math.max(hh, 1); let c = f < .3 ? FIRE[1] : f < .65 ? FIRE[2] : FIRE[3]; if (f < .2 && Math.abs(x - cx) < half * .4) c = FIRE[0]; fillPx(b, x, Math.round(yb) - k, c); }
    if (hh > 2 && ((t * 15 | 0) + x) % 7 === 0) fillPx(b, x, Math.round(yb) - hh - 1 - (((t * 20 + x) | 0) % 3), FIRE[2]);
  }
}
let glowCache = null;
function glowStamp() {
  if (glowCache) return glowCache;
  const R = 32, p = new Px(R * 2 + 1, Math.round(R * 1.4) + 1), ry = R * .7;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const d = hyp((x - R) / R, (y - ry) / ry); const k = Math.pow(clamp(1 - d, 0, 1), 1.5); if (k > 0 && bay(x, y) < k * .9) p.set(x, y, [255, 150, 70]); }
  glowCache = p.canvas(); return glowCache;
}
const discCache = new Map();
function rotorDisc(R) {
  let c = discCache.get(R); if (c) return c;
  const n = 2 * R + 1, p = new Px(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const d = hyp(x - R, y - R); if (d > R + .3) continue; if (d > R - 1.3) { if (bay(x, y) < .62) p.set(x, y, [168, 172, 184]); } else if (bay(x, y) < .1 + .1 * (d / R)) p.set(x, y, [132, 136, 150]); }
  c = p.canvas(); discCache.set(R, c); return c;
}
const GLYPH = { A: [".X.", "X.X", "XXX", "X.X", "X.X"], B: ["XX.", "X.X", "XX.", "X.X", "XX."], C: [".XX", "X..", "X..", "X..", ".XX"], D: ["XX.", "X.X", "X.X", "X.X", "XX."], E: ["XXX", "X..", "XX.", "X..", "XXX"] };
const sprRole = m => m.role === 'eng' ? 'eng' : m.w === 'hmg' || m.w === 'lmg' ? 'mg' : m.w === 'launcher' ? 'at' : m.w === 'mortar' ? 'mortar' : m.w === 'sniper' ? 'sniper' : 'rifle';

function render(ctx, cw, ch, dpr) {
  if (!G) return;
  const { s, vw, vh } = viewMetrics(cw, ch, dpr); VIEW.s = s; VIEW.vw = vw; VIEW.vh = vh;
  VIEW.padT = VIEW.hudT * dpr / s + 4; VIEW.padB = VIEW.hudB * dpr / s + 4;
  if (G.camCenter) { G.cam.x -= vw / 2; G.cam.y -= vh / 2; G.camCenter = false; }
  if (G.camFocus) { G.cam.x = G.camFocus[0] - vw / 2; G.cam.y = G.camFocus[1] - (vh + VIEW.padT - VIEW.padB) / 2; G.camFocus = null; }
  clampCam(vw, vh);
  const strategic = vw > Math.min(520, G.map.W * .62), rs = strategic ? 1 : RS;
  const bw = Math.ceil(vw) + 2, bh = Math.ceil(vh) + 2, pw = bw * rs, phh = bh * rs;
  if (!buf || buf.width < pw || buf.height < phh) { buf = mkCanvas(Math.max(pw, buf ? buf.width : 0), Math.max(phh, buf ? buf.height : 0)); bctx = buf.getContext('2d', { willReadFrequently: true }); patCache = null; }
  const b = bctx, m = G.map, ox = Math.floor(G.cam.x), oy = Math.floor(G.cam.y), ph = (G.t * 8) | 0;
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.imageSmoothingEnabled = false; b.fillStyle = '#0b0d13'; b.fillRect(0, 0, pw, phh);
  b.setTransform(rs, 0, 0, rs, -ox * rs, -oy * rs);
  const sx0 = clamp(ox, 0, m.W), sy0 = clamp(oy, 0, m.H), sx1 = clamp(ox + bw, 0, m.W), sy1 = clamp(oy + bh, 0, m.H);
  if (sx1 > sx0 && sy1 > sy0) b.drawImage(strategic ? m.comp : m.ground, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0, sy0, sx1 - sx0, sy1 - sy0);
  const inView = (x, y, pad) => x > ox - pad && x < ox + bw + pad && y > oy - pad && y < oy + bh + pad;
  const seen = e => G.demo || e.team === 1 || canSee(1, e);
  const spotted = o => { if (o.team === 1 || G.demo || o.spotted) return true; if (visAt(1, o.ax, o.by - 6)) o.spotted = true; return !!o.spotted; };
  // fire glow and muzzle flashes on the snow
  const gl = glowStamp();
  for (const l of G.lights) if (l.fire && inView(l.x, l.y, 60)) { const f = .7 + .3 * Math.sin(G.t * 13 + l.x) * Math.sin(G.t * 7.3); b.globalAlpha = .55 * f; b.drawImage(gl, Math.round(l.x - 32 * l.r / 40), Math.round(l.y - 22 * l.r / 40), Math.round(65 * l.r / 40), Math.round(45 * l.r / 40)); }
  for (const f of G.flashes) if (inView(f.x, f.y, 80)) { const k = 1 - (G.t - f.t0) / f.dur; b.globalAlpha = .7 * k; b.drawImage(gl, Math.round(f.x - f.r), Math.round(f.y - f.r * .7), Math.round(f.r * 2), Math.round(f.r * 1.4)); }
  b.globalAlpha = 1;
  const pat = patterns(b);
  if (G.place) drawTerritory(b, ph);
  for (const p of m.points) if (inView(p.cx, p.cy, 60)) drawZone(b, p, pat, ph);
  if (!strategic && m.season.snow) { b.fillStyle = 'rgb(226,230,252)'; for (let i = 0; i < 60; i++) { const x = ox + ((hash2(i, 1, (G.t * .7) | 0) * bw) | 0), y = oy + ((hash2(i, 2, (G.t * .7) | 0) * bh) | 0); if (x >= 0 && y >= 0 && x < m.W && y < m.H && m.KIND[y * m.W + x] === 0 && m.SIDX[y * m.W + x] <= 1) b.fillRect(x, y, 1, 1); } }
  // bodies, wrecks and ruins left on the ground
  if (!strategic) for (const d of G.decals) if (inView(d.x + d.w / 2, d.y + d.h / 2, d.w / 2 + 8)) { b.globalAlpha = d.a; b.drawImage(d.c, d.x, d.y, d.w, d.h); }
  b.globalAlpha = 1;
  // flat structures lie under everything: helipads and our own minefields
  for (const o of G.blds) { if (!(o.bt.flat || o.bt.mine) || (o.bt.mine && o.team !== 1 && !G.demo)) continue; if (inView(o.x, o.y, 40 + (o.span ? o.span[1] - o.span[0] : 0)) && spotted(o)) drawBld(b, o); }
  for (const o of G.blds) if (o.type === 'dock' && !o.dead && inView(o.ax, o.by, 60) && spotted(o)) drawPier(b, o);
  // shadows and selection rings
  for (const u of G.units) {
    if (u.kind === 'veh') { if (u.dead || !inView(u.x, u.y, 30) || !seen(u)) continue; const S = VBODY[u.body].S, sh = VSHADOW[u.body][u.team][dir16(u.ang)]; b.globalAlpha = .34; drawS(b, sh, u.x - S / 2 + 2, u.y - S / 2 + 2); b.globalAlpha = 1; if (G.sel.has(u)) ring(b, u.x + .5, u.y + 1, VBODY[u.body].len * .55, VBODY[u.body].len * .45, SEL); continue; }
    if (u.kind === 'air') { if (u.dead || !inView(u.x, u.y, 40) || !seen(u)) continue; const S = HBODY[u.body].S; b.globalAlpha = .42 * clamp(1.1 - u.alt / 50, .45, 1); drawS(b, HSPR[u.body][u.team].shadow[dir16(u.ang)], u.x + u.alt * .22 - S / 2, u.y + 2 - S / 2); b.globalAlpha = 1; if (G.sel.has(u)) ring(b, u.x + u.alt * .22 + .5, u.y + 2, HBODY[u.body].h * .5, HBODY[u.body].h * .36, SEL, true, ph); continue; }
    if (u.aboard) continue;
    for (const mm of u.members) if (!mm.dead && inView(mm.x, mm.y, 12) && seen(mm)) { b.fillStyle = 'rgba(10,12,30,.33)'; b.fillRect(Math.round(mm.x) - 3, Math.round(mm.y), 10, 1.5); if (G.sel.has(u)) ring(b, mm.x + .5, mm.y + .5, 6, 2.6, SEL); }
  }
  for (const o of G.sel) if (o.kind === 'bld' && !o.dead) brackets(b, o.foot[0] - 3, o.bt.flat ? o.foot[1] - 3 : bldTop(o) - 1, o.foot[2] + 3, o.foot[3] + 3, SEL, 5);
  // depth-sorted: trees, houses, buildings, soldiers and vehicles
  const items = [];
  for (const u of G.units) {
    if (u.kind === 'veh') { if (!u.dead && inView(u.x, u.y, 30) && seen(u)) items.push([u.y + 6, 1, u]); }
    else if (u.kind === 'squad' && !u.aboard && !u.chute) for (const mm of u.members) if (!mm.baked && inView(mm.x, mm.y, 14) && (mm.dead || seen(mm))) items.push([mm.y, 0, mm]);
  }
  for (const o of G.blds) if (!o.bt.flat && !o.bt.mine && inView(o.ax, o.by - 20, 50) && spotted(o)) items.push([o.by, 2, o]);
  items.sort((a, c) => a[0] - c[0]);
  if (!strategic) {
    const st = m.statics; let lo = 0, hi = st.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (st[mid].by < oy - 2) lo = mid + 1; else hi = mid; }
    let k = 0;
    for (let i = lo; i < st.length; i++) {
      const o = st[i]; if (o.by > oy + bh + 40) break;
      while (k < items.length && items[k][0] < o.by) drawItem(b, items[k++]);
      if (o.cut || o.x + o.w < ox || o.x > ox + bw) continue;
      b.drawImage(o.img, o.x, o.y, o.w, o.h);
    }
    while (k < items.length) drawItem(b, items[k++]);
  } else for (const it of items) drawItem(b, it);
  for (const p of m.points) if (inView(p.cx, p.cy, 60)) { if (isKey(p)) drawFlag(b, p); else drawSign(b, p); }
  for (const f of G.fires) if (inView(f.x, f.y, 30)) flames(b, f.x - f.w / 2, f.x + f.w / 2, f.y, f.h, f.seed);
  // aircraft fly above everything on the ground
  const air = G.units.filter(u => u.kind === 'air' && !u.dead && inView(u.x, u.y - u.alt, 40) && seen(u)).sort((a, c) => a.y - c.y);
  for (const r of G.ropes) { const hl = r.heli, k = (G.t - r.t0) / 1.4; if (!hl || k > 1) continue; const hx = hl.x, hy = hl.y - hl.alt + 3; b.globalAlpha = 1 - k * .6; for (const dx of [-2, 2]) linePx(b, hx + dx, hy, hx + dx * 1.5, hl.y, [60, 54, 46]); b.globalAlpha = 1; }
  for (const u of air) drawHeli(b, u);
  for (const u of G.units) if (u.chute && u.kind === 'squad' && inView(u.lx, u.ly - 30, 50) && (u.team === 1 || G.demo || visAt(1, u.lx, u.ly))) drawChute(b, u);      // step 7: paratroopers
  if (G.planes.length) for (const pl of G.planes) { const P_ = planeSpr(pl.team, pl.model), h = P_.S / 2, di = dir16(pl.ang); b.globalAlpha = .3; drawS(b, P_.sh[di], pl.x - h + 12, pl.y - h + 6); b.globalAlpha = 1; drawS(b, P_.dirs[di], pl.x - h, pl.y - h - 46); }
  // orders, waypoints and targeting
  for (const u of G.sel) drawOrders(b, u, ph);
  if (G.marker && G.t - G.marker.t0 < 1.2) {
    const mk = G.marker, age = G.t - mk.t0, col = mk.kind === 'move' ? SEL : mk.kind === 'barrage' ? [255, 180, 80] : [238, 58, 52];
    if (age < .35) { const k = 1 - smooth(age / .35); for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) for (let j = -2; j <= 2; j++) fillPx(b, Math.round(mk.x + Math.cos(a) * (4 + 10 * k) - Math.sin(a) * j - Math.cos(a) * Math.abs(j)), Math.round(mk.y + Math.sin(a) * (3 + 7 * k) + Math.cos(a) * j * .6 - Math.sin(a) * Math.abs(j)), [255, 255, 255]); }
    ring(b, mk.x, mk.y, mk.kind === 'barrage' ? 24 : 6, mk.kind === 'barrage' ? 17 : 3, col, true, (G.t * 10) | 0);
  }
  if (G.place && G.hover) drawGhost(b, pat);
  else if (G.armed && G.hover) {
    const [hx, hy] = G.hover, R = { artillery: 26, grenade: 16, ground: 18, recon: 70, unload: 8, rally: 5, charge: AB_R.charge, blitz: AB_R.blitz, para: AB_R.para }[G.armed] || 10;
    const col = G.armed === 'recon' || G.armed === 'unload' || G.armed === 'rally' || G.armed === 'para' ? SEL : G.armed === 'grenade' ? [255, 120, 90] : G.armed === 'charge' || G.armed === 'blitz' ? [255, 214, 120] : [255, 180, 80];
    ring(b, hx, hy, R, R * .7, col, true, (G.t * 12) | 0); fillPx(b, Math.round(hx), Math.round(hy), col);
  }
  if (G.sel.size === 1) drawRange(b, [...G.sel][0], ph);
  // projectiles
  for (const p of G.projs) {
    const u = (G.t - p.t0) / p.dur; if (u < 0 || u > 1) continue;
    const hx = lerp(p.x0, p.x1, u), hy = lerp(p.y0, p.y1, u);
    if (p.fx === 'bullet' || p.fx === 'flak') { const dx = p.x1 - p.x0, dy = p.y1 - p.y0, n = hyp(dx, dy) || 1, L = Math.min(p.fx === 'flak' ? 4 : 6, n * u); linePx(b, hx - dx / n * L, hy - dy / n * L, hx, hy, p.fx === 'flak' ? [255, 214, 130] : p.team === 1 ? TR_F : TR_E); fillPx(b, Math.round(hx), Math.round(hy), FIRE[0]); }
    else if (p.fx === 'rocket') { const dx = p.x1 - p.x0, dy = p.y1 - p.y0, n = hyp(dx, dy) || 1; for (let k = 7; k >= 0; k--) { const d = k * 1.2; if (d > n * u) continue; fillPx(b, Math.round(hx - dx / n * d), Math.round(hy - dy / n * d), k < 1 ? FIRE[0] : k < 3 ? FIRE[1] : SMOKE_ROCKET[Math.min(2, k - 3)]); } }
    else if (p.fx === 'shell') { for (let k = 0; k < 8; k++) { const uu = u - k * .035; if (uu < 0) continue; fillPx(b, Math.round(lerp(p.x0, p.x1, uu)), Math.round(lerp(p.y0, p.y1, uu)), k < 2 ? FIRE[0] : k < 5 ? FIRE[1] : FIRE[2]); } }
    else if (p.fx === 'gren') { const y = Math.round(hy - Math.sin(Math.PI * u) * p.apex); fillPx(b, Math.round(hx), y, [30, 34, 28], 2, 2); fillPx(b, Math.round(hx) + 2, Math.round(hy) + 1, [20, 22, 40]); }
    else { const y = Math.round(hy - Math.sin(Math.PI * u) * p.apex); if (p.falling) fillPx(b, Math.round(hx), y - 3, [40, 40, 44], 1, 4); else { fillPx(b, Math.round(hx), y, [36, 36, 40], 2, 2); fillPx(b, Math.round(hx), y, [110, 110, 118]); } if (!p.falling && u > .6) fillPx(b, Math.round(hx), Math.round(hy) + 1, [20, 22, 40]); }
  }
  // particles
  for (const p of G.parts) {
    if (!inView(p.x, p.y - p.z, 10)) continue;
    const u = p.age / p.life;
    if (p.kind === 'smoke' || p.kind === 'dust') {
      const rad = p.r0 + (p.r1 - p.r0) * Math.pow(u, .6), al = p.a0 * (1 - Math.pow(u, 1.6)), col = p.pal[Math.min(p.pal.length - 1, (u * p.pal.length) | 0)];
      if (al < .12) continue; const st = puffStamp(col, rad, al); b.drawImage(st, Math.round(p.x) - (st.width >> 1), Math.round(p.y) - (st.height >> 1));
      if (rad > 2.2) { const st2 = puffStamp(p.pal[Math.min(p.pal.length - 1, ((u * p.pal.length) | 0) + 1)], rad * .55, al * .8); b.drawImage(st2, Math.round(p.x - rad * .3) - (st2.width >> 1), Math.round(p.y - rad * .35) - (st2.height >> 1)); }
    } else if (p.kind === 'spark') fillPx(b, Math.round(p.x), Math.round(p.y), ((p.age * 20 | 0) + (p.x | 0)) % 3 ? FIRE[1] : FIRE[0]);
    else if (p.kind === 'fire') { const sz = u < .4 ? 2 : 1; fillPx(b, Math.round(p.x), Math.round(p.y), FIREBALL[Math.min(5, (u * 6) | 0)], sz, sz); }
    else if (p.kind === 'debris') { fillPx(b, Math.round(p.x), Math.round(p.y - p.z), p.pal); if (p.sh) { const sp = (p.age * 14 | 0) % 2; fillPx(b, Math.round(p.x) + 1 - sp, Math.round(p.y - p.z) + sp, p.pal); } }
    else if (p.kind === 'snow') fillPx(b, Math.round(p.x), Math.round(p.y - p.z), m.kick);
  }
  for (const bl of G.blasts) drawBlast(b, bl);
  // health, progress and status above units
  for (const u of G.units) {
    if (!unitAlive(u)) continue; const selU = G.sel.has(u), hc = u.team === 1 ? [122, 226, 138] : [236, 74, 62];
    if (u.kind === 'veh') { if (!seen(u) || !inView(u.x, u.y, 30)) continue; const S = VBODY[u.body].S, y = u.y - S * .5 - 3; if (selU || u.hp < u.max) hpbar(b, u.x, y, Math.round(S * .55), u.hp / u.max, hc); vetStars(b, u, u.x - S * .28 - 4 * u.vet.lvl, y - 4);
      if (u.blitz > G.t) glyphPx(b, CHEV2, Math.round(u.x + S * .28), Math.round(y) - 6, [255, 214, 120]); continue; }      // step 7: a breakthrough
    if (u.kind === 'air') { if (!seen(u) || !inView(u.x, u.y - u.alt, 40)) continue; const S = HBODY[u.body].S, y = u.y - u.alt - S * .5; if (selU || u.hp < u.max) hpbar(b, u.x, y, 14, u.hp / u.max, hc); vetStars(b, u, u.x - 8 - 4 * u.vet.lvl, y - 4);
      if (selU && u.ut.ammo) for (let k = 0; k < u.ut.ammo; k++) fillPx(b, Math.round(u.x) - 8 + k * 2, Math.round(y) + 4, k < u.ammo ? [255, 196, 80] : [70, 70, 78]);
      if (u.cargo) glyphPx(b, ["XXX", "X.X"], Math.round(u.x) + 9, Math.round(y), [200, 220, 255]); continue; }
    let any = false; if (u.aboard || u.chute) continue;
    for (const mm of u.members) if (!mm.dead && seen(mm) && inView(mm.x, mm.y, 12)) { any = true; if (selU || (mm.hp < mm.max && G.t - u.lastCombat < 8)) hpbar(b, mm.x + .5, mm.y - (mm.kneel ? 12 : 16), 8, mm.hp / mm.max, hc); }
    if (any) drawSquadStatus(b, u);
  }
  for (const o of G.blds) {
    if (o.bt.mine || !inView(o.ax, o.by - 20, 50) || !spotted(o)) continue;
    const img = bldSprite(o.type, o.team, m.S, false, o.v), top = bldTop(o) - 3, wbar = Math.max(10, Math.min(30, Math.round(img.width / RS * .55)));
    if (o.built < 1) { hpbar(b, o.ax, top, wbar, o.built, [110, 170, 255]); continue; }
    let y = top; if (G.sel.has(o) || o.hp < o.max) { hpbar(b, o.ax, y, wbar, o.hp / o.max, o.team === 1 ? [122, 226, 138] : [236, 74, 62]); y -= 3; }
    if (o.team === 1 && o.queue.length) { const q = o.queue[0]; hpbar(b, o.ax, y, wbar, q.t / q.total, [255, 196, 80]); y -= 3; }
    if (o.team === 1 && o.research) hpbar(b, o.ax, y, wbar, o.research.t / o.research.total, [196, 160, 255]);
  }
  // weather: snowfall in winter, rain in spring, falling leaves and fog in autumn
  if (m.season.snow) {
    b.fillStyle = 'rgb(214,220,236)';
    for (let i = 0; i < 260; i++) { const fx = (hash2(i, 3, 0) * m.W + 3 * G.t + 3 * Math.sin(G.t * .9 + i)) % m.W, fy = (hash2(i, 4, 0) * m.H + (6 + hash2(i, 5, 0) * 5) * G.t) % m.H; if (inView(fx, fy, 0)) b.fillRect(fx | 0, fy | 0, 1, 1); }
  } else if (m.season.rain && !strategic) {
    b.fillStyle = 'rgba(184,198,220,.6)';
    for (let i = 0; i < 80; i++) { const fx = ox + (hash2(i, 3, 1) * bw + 26 * G.t) % bw, fy = oy + (hash2(i, 4, 1) * bh + (150 + hash2(i, 5, 1) * 50) * G.t) % bh; b.fillRect(fx | 0, fy | 0, 1, 2); b.fillRect((fx | 0) - 1, (fy | 0) + 2, 1, 2); }
  } else if (m.season.leaves && !strategic) {
    for (let i = 0; i < 36; i++) { const fx = ox + (hash2(i, 3, 2) * bw + 10 * G.t + 5 * Math.sin(G.t * 1.3 + i)) % bw, fy = oy + (hash2(i, 4, 2) * bh + (11 + hash2(i, 5, 2) * 7) * G.t) % bh; fillPx(b, fx | 0, fy | 0, LEAVES[i % LEAVES.length]); }
  }
  if (m.season.fog) drawFog(b, ox, oy, bw, bh, strategic);
  // fog of war: a cell-sized alpha map scaled up smoothly
  if (!G.demo) {
    if (!G.fogCv) { G.fogCv = mkCanvas(G.vw, G.vh); G.fogImg = G.fogCv.getContext('2d').createImageData(G.vw, G.vh); G.fogDrawn = -1; }
    if (G.fogDrawn !== G.visStamp) {
      G.fogDrawn = G.visStamp; const d = G.fogImg.data, v = G.vis[1];
      for (let i = 0; i < v.length; i++) { d[i * 4] = 8; d[i * 4 + 1] = 10; d[i * 4 + 2] = 22; d[i * 4 + 3] = v[i] ? 0 : G.seen[i] ? 92 : 150; }
      G.fogCv.getContext('2d').putImageData(G.fogImg, 0, 0);
    }
    b.imageSmoothingEnabled = true; b.drawImage(G.fogCv, -4, -4, G.vw * 8, G.vh * 8); b.imageSmoothingEnabled = false;
  }
  for (const bl of G.blasts) { const age = G.t - bl.t0; if (age < .2 && bl.s >= 1 && inView(bl.x, bl.y, 120)) { b.globalAlpha = .22 * (1 - age / .2); b.fillStyle = 'rgb(255,170,60)'; b.fillRect(ox, oy, bw, bh); b.globalAlpha = 1; } }
  b.setTransform(1, 0, 0, 1, 0, 0);
  if (G.def.light === 'night' || G.nv) postProcess(b, pw, phh, ox, oy, rs);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b0d13'; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(buf, 0, 0, pw, phh, -Math.round((G.cam.x - ox) * s), -Math.round((G.cam.y - oy) * s), bw * s, bh * s);
  if (strategic) drawMarkers(ctx, s, dpr);
}
function drawItem(b, it) { if (it[1] === 0) drawSoldier(b, it[2]); else if (it[1] === 1) drawVeh(b, it[2]); else drawBld(b, it[2]); }
/* the frame a living soldier shows right now (also tells where his weapon's muzzle is) */
function soldierFrame(mm) {
  const f = mm.face > 0 ? 0 : 1, set = SPR[mm.team][sprRole(mm)], sq = mm.sq, W = WT[mm.w], setUp = W.setup && mm.setup >= W.setup && !mm.moving;
  if (mm.moving) return set.walk[Math.floor(mm.walk / 3.2) % 4][f];
  if (sq.pinned || (setUp && mm.w === 'hmg')) return set.prone[f];
  if (setUp && mm.w === 'mortar') return set.setup[f];
  let pose = mm.kneel ? 'kneel' : mm.target ? 'aim' : 'idle';
  if (sq.working) pose = ((G.t * 5 + mm.id) | 0) % 2 ? 'aim' : 'kneel';
  return set[pose][f];
}
const putFrame = (b, fr, x, y) => drawS(b, fr.c, x - fr.ax / RS, y + 1 - fr.ay / RS);
function drawSoldier(b, mm) {
  const f = mm.face > 0 ? 0 : 1, set = SPR[mm.team][sprRole(mm)], sq = mm.sq;
  if (mm.dead) { const a = G.t - mm.deathT; if (a < .12) putFrame(b, set.fall[f], mm.x, mm.y - Math.round(2 * Math.sin(Math.PI * a / .24))); else if (a < .24) putFrame(b, set.fall2[f], mm.x, mm.y); else putFrame(b, set.dead[f], mm.x, mm.y); return; }
  const W = WT[mm.w];
  if (mm.team === 1 && (camo(sq) || inGrass(mm))) b.globalAlpha = .5;
  const fr = soldierFrame(mm), bob = mm.moving && Math.floor(mm.walk / 3.2) % 2 ? .5 : 0;
  putFrame(b, fr, mm.x, mm.y - bob);
  b.globalAlpha = 1;
  if (G.map.hide) grassOver(b, mm);
  const since = G.t - mm.fireT, d = f === 0 ? 1 : -1;
  if (W.indirect) { if (since < .1) { const [tx, ty] = muzzleOf(mm); fillPx(b, tx, ty, FIRE[0]); fillPx(b, tx, ty - 1, FIRE[1]); fillPx(b, tx - d, ty - 1, FIRE[2]); } return; }
  if (since < .067) {
    const [mx, my] = muzzleOf(mm); fillPx(b, mx, my, FIRE[0]); fillPx(b, mx + d, my, FIRE[1]); fillPx(b, mx + 2 * d, my, FIRE[2]); fillPx(b, mx + d, my - 1, FIRE[1]); fillPx(b, mx + d, my + 1, FIRE[2]);
    if (mm.w === 'launcher') { const bx = mx - 12 * d; fillPx(b, bx, my, FIRE[1]); fillPx(b, bx - d, my, FIRE[2]); fillPx(b, bx - d, my - 1, SMOKE[4]); fillPx(b, bx - 2 * d, my + 1, SMOKE[4]); }
  }
}
/* summer: blades of tall grass or wheat drawn over the legs of a soldier standing in it */
function grassOver(b, mm) {
  const m = G.map, [cx, cy] = cellOf(m, mm.x, mm.y); if (!m.hide[cy * m.cw + cx]) return;
  const x0 = Math.round(mm.x), y0 = Math.round(mm.y), wheat = m.KIND[clamp(y0, 0, m.H - 1) * m.W + clamp(x0, 0, m.W - 1)] === 5, P = wheat ? WHEAT : m.S;
  for (let dx = -4; dx <= 5; dx++) { const h = 1 + ((hash2(x0 + dx, y0, 3) * 3) | 0); for (let k = 0; k < h; k++) fillPx(b, x0 + dx, y0 - k, k === h - 1 ? P[wheat ? 0 : 1] : P[wheat ? 2 : 3]); }
}
/* autumn fog: a soft tileable cloud texture drifting over the ground, plus a light haze */
let fogTex = null;
function drawFog(b, ox, oy, bw, bh, strategic) {
  const T = 256;
  if (!fogTex) {
    const n = 64, c = mkCanvas(n, n), x = c.getContext('2d'), im = x.createImageData(n, n), r = rng32(9071), waves = [];
    for (let k = 0; k < 9; k++) waves.push([1 + ((r() * 3) | 0), ((r() * 7) | 0) - 3, r() * TAU, 1 / (1 + k * .5)]);
    for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
      let f = 0, a = 0; for (const [p, q, ph, w] of waves) { f += w * Math.sin(TAU * (p * xx + q * y) / n + ph); a += w; }
      const v = clamp(.5 + .5 * f / a * 1.6, 0, 1), o = (y * n + xx) * 4;
      im.data[o] = 214; im.data[o + 1] = 216; im.data[o + 2] = 222; im.data[o + 3] = Math.round(255 * (.08 + .5 * v * v));
    }
    x.putImageData(im, 0, 0); fogTex = c;
  }
  const dx = (G.t * 4) % T, dy = (G.t * 1.5) % T;
  b.globalAlpha = strategic ? .45 : .8; b.imageSmoothingEnabled = true;
  for (let y = Math.floor((oy - dy) / T) * T + dy; y < oy + bh; y += T) for (let x = Math.floor((ox - dx) / T) * T + dx; x < ox + bw; x += T) b.drawImage(fogTex, x, y, T, T);
  b.imageSmoothingEnabled = false; b.globalAlpha = 1;
  b.fillStyle = 'rgba(206,210,218,.10)'; b.fillRect(ox, oy, bw, bh);
}
/* the turret's pivot on the hull, in world units */
function turretPivot(u) { const B = vgeo(u), ca = Math.cos(u.ang), sa = Math.sin(u.ang); return [u.x + ca * B.piv - sa * B.pivx, u.y + sa * B.piv + ca * B.pivx]; }
function drawVeh(b, u) {
  const B = vgeo(u);
  drawS(b, VSPR[u.body][u.team][0][dir16(u.ang)], u.x - B.S / 2, u.y - B.S / 2);
  if (u.cargoSq) { const ca = Math.cos(u.ang), sa = Math.sin(u.ang), hc = u.team === 1 ? [92, 104, 74] : [96, 98, 108]; for (const k of [-2, 1, 4]) for (const s of [-1.5, 1.5]) fillPx(b, Math.round(u.x + ca * k - sa * s), Math.round(u.y + sa * k + ca * s), hc); }
  const [px, py] = turretPivot(u), ca = Math.cos(u.tur), sa = Math.sin(u.tur);
  const W0 = WT[u.wp[0].k], big = W0.fx === 'shell' || W0.indirect, since = G.t - (u.mainT || -9);
  const rec = big && since < .4 ? (B.bl > 10 ? 2.5 : 1.5) * Math.pow(1 - since / .4, 2) : 0, L = B.bl - rec;
  const tc = VTUR[u.body][u.team][dir32(u.tur)], th = tc.width / RS / 2;
  drawS(b, tc, px - ca * rec - th, py - sa * rec - th);
  if (big && since < .1) { const ex = px + ca * (L + 1.5), ey = py + sa * (L + 1.5); for (const [col, r] of [[FIRE[2], B.bl > 12 ? 4.5 : 3.5], [FIRE[1], B.bl > 12 ? 3.5 : 2.5], [FIRE[0], 1.6]]) { const st = puffStamp(col, r, 1); b.drawImage(st, Math.round(ex) - (st.width >> 1), Math.round(ey) - (st.height >> 1)); } }
  else if (!big && since < .05) { const ex = Math.round(px + ca * (L + 1)), ey = Math.round(py + sa * (L + 1)); fillPx(b, ex, ey, FIRE[0]); fillPx(b, ex + Math.round(ca), ey + Math.round(sa), FIRE[1]); if (B.quad) fillPx(b, ex + Math.round(-sa * 2), ey + Math.round(ca * 2), FIRE[1]); }
  if (G.t - u.fireT < .05 && since > .05 && u.wp.length > 1) { const ex = Math.round(px + ca * 7), ey = Math.round(py + sa * 7); fillPx(b, ex, ey, FIRE[0]); fillPx(b, ex + Math.round(ca), ey, FIRE[2]); }
}
function drawHeli(b, u) {
  const B = hgeo(u), di = dir16(u.ang), x = u.x, y = u.y - u.alt;
  drawS(b, HSPR[u.body][u.team].dirs[di], x - B.S / 2, y - B.S / 2);
  const th = di * TAU / 16 + Math.PI / 2, c = Math.cos(th), s = Math.sin(th), rot = (ox, oy) => [x + ox * c - oy * s, y + ox * s + oy * c];
  const [hx, hy] = rot(B.hub[0] - B.w / 2, B.hub[1] - B.h / 2), [qx, qy] = rot(B.tail[0] - B.w / 2, B.tail[1] - B.h / 2);
  if (u.alt > .5 && !u.crash) { b.globalAlpha = .4; b.drawImage(rotorDisc(Math.round(B.R)), Math.round(hx) - Math.round(B.R), Math.round(hy) - Math.round(B.R)); b.globalAlpha = .8; }
  for (let k = 0; k < B.blades; k++) { const a = u.rotor + k * TAU / B.blades; linePx(b, hx, hy, hx + Math.cos(a) * B.R, hy + Math.sin(a) * B.R, [40, 42, 46]); }
  b.globalAlpha = 1; fillPx(b, Math.round(hx), Math.round(hy), [24, 24, 28]);
  const tl = 2.5 * Math.abs(Math.cos(u.rotor * 2.3)) + .5, ax = -s, ay = c;
  linePx(b, qx + c * 1.5 + ax * tl, qy + s * 1.5 + ay * tl, qx + c * 1.5 - ax * tl, qy + s * 1.5 - ay * tl, [52, 54, 60]);
  if (G.def.light === 'night' && (G.t * 1.6 + u.id * .3) % 1 < .14) fillPx(b, Math.round(qx), Math.round(qy), [255, 70, 60]);
  const [nx, ny] = rot(0, -B.h / 2 + 1);
  if (G.t - u.fireT < .06 && G.t - (u.mainT || -9) > .06) { fillPx(b, Math.round(nx), Math.round(ny), FIRE[0]); fillPx(b, Math.round(nx - s), Math.round(ny + c), FIRE[1]); }
  if (G.t - (u.mainT || -9) < .08 && u.ut.ammo) for (const side of [-1, 1]) { const [px, py] = rot(side * (B.w / 2 - 2), -3); fillPx(b, Math.round(px), Math.round(py), FIRE[0]); fillPx(b, Math.round(px - s * 2), Math.round(py + c * 2), FIRE[2]); }
}
/* top edge of a building's picture in world units */
function bldTop(o) { return o.by + 1 - bldSprite(o.type, o.team, null, false, o.v).height / RS; }
function drawBld(b, o) {
  if (o.type === 'pontoon') { drawPontoon(b, o); return; }
  const S = G.map.S, img = bldSprite(o.type, o.team, S, o.built >= 1 && o.hp < o.max * .35, o.v), w = img.width / RS, h = img.height / RS;
  const x = snapRS(o.ax - w / 2), y = snapRS(o.by + 1 - h);
  if (o.built < 1) {
    const hb = Math.max(1, Math.round(img.height * o.built)), cut = img.height - hb;
    b.globalAlpha = .22; b.drawImage(img, x, y, w, h); b.globalAlpha = 1;
    b.drawImage(img, 0, cut, img.width, hb, x, y + cut / RS, w, hb / RS);
    if (!o.bt.flat && !o.bt.small) { const top = Math.round(y + cut / RS) - 3, x0 = Math.round(x); for (const sx of [x0 + 1, x0 + Math.round(w) - 2]) fillPx(b, sx, top, WOOD[3], 1, Math.round(y + h) - top); fillPx(b, x0 + 1, top, WOOD[2], Math.round(w) - 2, 1); fillPx(b, x0 + 1, top - 1, S[0], Math.round(w) - 2, 1); }
    return;
  }
  b.drawImage(img, x, y, w, h);
  const tc = TEAMC[o.team], wave = (G.t * 5 + o.id) | 0, mt = bldMeta(o.type, o.team, o.v);
  if (mt.noflag) { /* the picture flies its own flag */ }
  else if (mt.pole) { const fx = Math.round(x + mt.pole[0] / RS), fy = Math.round(y + mt.pole[1] / RS); for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 7; xx++) fillPx(b, fx + 1 + xx, fy + yy + (xx > 1 && (xx + wave) % 3 === 0 ? 1 : 0), yy < 3 ? tc.main : tc.dark); }
  else if (!o.bt.small) {
    const fl = mt.flag || [4, img.height * .3], fx = Math.round(x + fl[0] / RS), fy = Math.round(y + fl[1] / RS) - 9;
    fillPx(b, fx, fy, [40, 36, 34], 1, 10); fillPx(b, fx, fy - 1, [150, 150, 158]);
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 5; xx++) fillPx(b, fx + 1 + xx, fy + yy + (xx > 1 && (xx + wave) % 3 === 0 ? 1 : 0), yy < 2 ? tc.main : tc.dark);
  }
  if (o.type === 'bunker' || o.type === 'aanest') {
    const g = mt.gun || [img.width / 2, img.height * .35], cx = x + g[0] / RS, cy = y + g[1] / RS, ca = Math.cos(o.tur), sa = Math.sin(o.tur), L = o.type === 'bunker' ? 6 : 9;
    for (const off of o.type === 'aanest' ? [-1, 1] : [0]) for (let k = 1; k <= L; k++) fillPx(b, Math.round(cx + ca * k - sa * off), Math.round(cy + sa * k * .7 + ca * off * .6), k === L ? STEEL[3] : o.type === 'aanest' ? STEEL[1] : [30, 30, 34]);
    if (G.t - o.fireT < .06) { const ex = Math.round(cx + ca * (L + 1)), ey = Math.round(cy + sa * (L + 1) * .7); fillPx(b, ex, ey, FIRE[0]); fillPx(b, ex + Math.round(ca), ey, FIRE[1]); fillPx(b, ex, ey - 1, FIRE[2]); }
  }
}
function drawZone(b, p, pat, ph) {
  const w = p.x1 - p.x0, h = p.y1 - p.y0, f = Math.abs(p.prog), col = teamCol(p.owner);
  if (isKey(p) || (f > 0 && f < 1)) {
    const fy = Math.round(p.y1 - f * h);
    b.fillStyle = pat.grey; b.fillRect(p.x0, p.y0, w, Math.max(0, fy - p.y0));
    if (f > 0) { b.fillStyle = p.prog > 0 ? pat.blue : pat.red; b.fillRect(p.x0, fy, w, p.y1 - fy); }
  }
  if (!isKey(p)) { brackets(b, p.x0, p.y0, p.x1, p.y1, col, 7); return; }
  b.fillStyle = css(col);
  for (let x = p.x0; x <= p.x1; x++) if (((x + ph) / 3 | 0) % 2 === 0 || x - p.x0 < 6 || p.x1 - x < 6) { b.fillRect(x, p.y0, 1, 1); b.fillRect(x, p.y1, 1, 1); }
  for (let y = p.y0; y <= p.y1; y++) if (((y + ph) / 3 | 0) % 2 === 0 || y - p.y0 < 6 || p.y1 - y < 6) { b.fillRect(p.x0, y, 1, 1); b.fillRect(p.x1, y, 1, 1); }
}
function drawFlag(b, p) {
  const fx = Math.round(p.x0 + 6), fy = Math.round(p.y0 + 10), col = p.owner === 1 ? [90, 150, 255] : p.owner === 2 ? [238, 70, 60] : [170, 172, 184], dk = p.owner === 1 ? [50, 96, 200] : p.owner === 2 ? [150, 30, 30] : [128, 130, 142];
  fillPx(b, fx, fy - 13, [40, 36, 34], 1, 14); fillPx(b, fx, fy - 14, [150, 150, 158]);
  const wave = (G.t * 5 | 0) % 3, top = fy - 13;
  for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 7; xx++) { const off = xx > 1 && (xx + wave) % 3 === 0 ? 1 : 0; fillPx(b, fx + 1 + xx, top + yy + off, yy < 5 ? col : dk); }
  const gl = GLYPH[p.id] || GLYPH.A; for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 3; xx++) if (gl[yy][xx] === 'X') fillPx(b, fx + 3 + xx, top + yy + ((xx + 2 + wave) % 3 === 0 ? 1 : 0), [255, 255, 255]);
  if (p.type === 'tw') glyphPx(b, STAR, fx - 1, top - 4, [255, 206, 90]);      // a town: a gold star on top of the pole
}
function drawSign(b, p) {
  const col = p.owner === 1 ? [74, 134, 255] : p.owner === 2 ? [226, 64, 58] : [140, 144, 160], dk = p.owner === 1 ? [34, 72, 170] : p.owner === 2 ? [140, 28, 28] : [90, 92, 106];
  const icon = ICON_ASCII[p.type], ih = icon.length, cx = Math.round(p.cx), cy = Math.round(p.cy), x0 = cx - 5, y0 = cy - 7 - ih - 3;
  fillPx(b, cx, y0 + ih + 3, [40, 36, 34], 1, cy - (y0 + ih + 3) + 1);
  fillPx(b, x0, y0, [16, 16, 20], 11, ih + 4); fillPx(b, x0 + 1, y0 + 1, col, 9, ih + 2); fillPx(b, x0 + 1, y0 + ih + 2, dk, 9, 1); fillPx(b, x0 + 1, y0 - 1, G.map.S[0], 9, 1);
  glyphPx(b, icon, x0 + 2, y0 + 1 + (ih < 7 ? 1 : 0), [255, 255, 255]);
  const f = Math.abs(p.prog); if (f > 0 && f < 1) { fillPx(b, x0, y0 + ih + 5, [16, 16, 20], 11, 3); fillPx(b, x0 + 1, y0 + ih + 6, p.prog > 0 ? [92, 150, 255] : [238, 70, 60], Math.max(1, Math.round(9 * f)), 1); }
}
function drawTerritory(b, ph) {
  const T = G.teams[1], col = [126, 226, 138], bad = [238, 70, 60];
  if (BT[G.place] && BT[G.place].fob) {        // step 7: a forward base goes on a point of ours away from the HQ and the other forward bases
    for (const p of G.map.points) if (p.owner === 1) ring(b, p.cx, p.cy, 95, 95, !T.hq || T.hq.dead || dist(p.cx, p.cy, T.hq.x, T.hq.by) >= 220 ? col : bad, true, ph);
    if (T.hq && !T.hq.dead) ring(b, T.hq.x, T.hq.by, 220, 220, bad, true, ph);
    for (const o of G.blds) if (o.team === 1 && o.bt.fob && !o.dead) ring(b, o.ax, o.by, 180, 180, bad, true, ph);
    return;
  }
  if (T.hq && !T.hq.dead) ring(b, T.hq.x, T.hq.by, 200, 200, col, true, ph);
  for (const p of G.map.points) if (p.owner === 1) ring(b, p.cx, p.cy, 95, 95, col, true, ph);
  for (const o of basesOf(1)) if (o.bt.fob) ring(b, o.x, o.by, 150, 150, col, true, ph);
}
function drawGhost(b, pat) {
  if (BT[G.place].bridge) {            // a pontoon: show the span the engineers would throw from bank to bank
    const [hx, hy] = G.hover, span = canPontoon(1, hx, hy) || pontoonSpan(hx, hy), ok = !!canPontoon(1, hx, hy), x = Math.round(hx);
    if (span) { b.fillStyle = ok ? pat.ok : pat.bad; b.fillRect(x - 6, span[0], 13, span[1] - span[0]); brackets(b, x - 7, span[0] - 1, x + 7, span[1] + 1, ok ? [126, 226, 138] : [238, 70, 60], 4); }
    else ring(b, hx, hy, 8, 6, [238, 70, 60], true, (G.t * 10) | 0);
    return;
  }
  const type = G.place, [ax, ay] = placeAnchor(type, G.hover[0], G.hover[1]), ok = canPlace(1, type, ax, ay), f = footOf(type, ax, ay), img = bldSprite(type, 1, G.map.S, false);
  b.fillStyle = ok ? pat.ok : pat.bad; b.fillRect(f[0], f[1], f[2] - f[0] + 1, f[3] - f[1] + 1);
  b.globalAlpha = .6; drawS(b, img, ax - img.width / RS / 2, ay + 1 - img.height / RS); b.globalAlpha = 1;
  brackets(b, f[0] - 1, f[1] - 1, f[2] + 1, f[3] + 1, ok ? [126, 226, 138] : [238, 70, 60], 4);
}
function drawOrders(b, u, ph) {
  if (u.kind === 'bld') { if (u.rally && UNIT_AT[u.type] && !u.dead) { dotPath(b, [[u.ax, u.by], u.rally], [255, 214, 120], ph); const rx = Math.round(u.rally[0]), ry = Math.round(u.rally[1]); fillPx(b, rx, ry - 8, [40, 36, 34], 1, 9); fillPx(b, rx + 1, ry - 8, [255, 214, 120], 4, 3); } return; }
  if (!unitAlive(u)) return;
  const [x, y] = unitPos(u);
  if (u.kind === 'air') {
    const pad = u.task && u.task.type === 'rtb' ? homePad(1, u.x, u.y) : null, d = u.task && u.task.type === 'unload' ? [u.task.x, u.task.y] : pad ? [pad.padX, pad.padY] : u.dest;
    if (d) dotPath(b, [[x, y], d], u.task && u.task.type === 'unload' ? [255, 214, 120] : [186, 226, 255], ph);
  } else if (u.path) {
    const idx = u.kind === 'veh' ? u.pi : Math.min(...u.members.filter(mm => !mm.dead).map(mm => mm.pi));
    dotPath(b, [[x, y]].concat(u.path.slice(Math.max(1, idx))), u.mode === 'amove' ? [255, 196, 120] : [186, 226, 255], ph);
  }
  const f = u.focus; if (f && !f.dead && !f.crash && seenEnt(f)) { const fy = f.cls === 'air' ? f.y - f.alt : f.y - (f.cls === 'inf' ? 6 : 4), r = f.cls === 'inf' ? 7 : f.cls === 'bld' ? 16 : 13; brackets(b, f.x - r, fy - r, f.x + r, fy + r, [238, 58, 52], 3); }
  if (u.order && u.order.target && !u.order.target.dead) dotPath(b, [[x, y], [u.order.target.x, u.order.target.y]], [255, 214, 120], ph);
  if (u.ground) { ring(b, u.ground[0], u.ground[1], 12, 8, [255, 180, 80], true, ph); }
}
const seenEnt = e => G.demo || e.team === 1 || canSee(1, e);
function drawRange(b, u, ph) {
  let W = null, x, y;
  if (u.kind === 'bld') {
    if (!u.dead && u.built >= 1 && (u.type === 'hq' || u.bt.fob)) { ring(b, u.x, u.by, 110, 110, [126, 226, 138], true, ph); return; }      // step 7: where squads heal and reinforce
    if (!u.dead && u.built >= 1 && u.bt.shop) { ring(b, u.x, u.by, 90, 90, [255, 214, 120], true, ph); return; }                      // where vehicles are mended
    if (!u.wp || u.dead) return; W = WT[u.wp[0].k]; x = u.x; y = u.y; }
  else { if (!unitAlive(u)) return; [x, y] = unitPos(u); W = WT[u.kind === 'squad' ? u.members.find(mm => !mm.dead).w : u.wp[0].k]; }
  ring(b, x, y, W.rng, W.rng, [120, 170, 230], true, ph);
  if (W.min) ring(b, x, y, W.min, W.min, [238, 110, 90], true, ph);
}
function vetStars(b, u, x, y) { for (let k = 0; k < u.vet.lvl; k++) glyphPx(b, STAR, Math.round(x + k * 4), Math.round(y), [255, 214, 120]); }
function drawSquadStatus(b, u) {
  let top = 1e9, sx = 0, n = 0;
  for (const mm of u.members) if (!mm.dead) { top = Math.min(top, mm.y); sx += mm.x; n++; }
  if (!n) return;
  sx = Math.round(sx / n); const y = Math.round(top) - 22;
  let x = sx - 2 * u.vet.lvl - (u.pinned || u.sup >= 40 || u.retreat ? 3 : 0);
  vetStars(b, u, x, y); x += 4 * u.vet.lvl;
  if (u.charge > G.t && !u.retreat) { glyphPx(b, BANG, x, y - 1, [255, 214, 120]); x += 3; }      // step 7: charging
  if (u.retreat) glyphPx(b, ARROW, x, y - 1, [236, 240, 255]);
  else if (u.pinned) { glyphPx(b, CHEV, x, y - 1, [255, 80, 70]); glyphPx(b, CHEV, x, y + 2, [255, 80, 70]); }
  else if (u.sup >= 40) glyphPx(b, CHEV, x, y, [255, 196, 80]);
  if (u.sup > 5 && !u.retreat) { fillPx(b, sx - 6, y + 6, [16, 16, 20], 13, 3); fillPx(b, sx - 5, y + 7, u.pinned ? [255, 80, 70] : [255, 196, 80], Math.max(1, Math.round(11 * u.sup / 100)), 1); }
}
const BLOBS = [[0, 0, 1], [-6, -4, .75], [6, -3, .8], [-2, -9, .7], [5, -10, .58], [-8, 1, .5], [8, 1, .5], [1, -15, .45]];
function drawBlast(b, bl) {
  const age = G.t - bl.t0, s = bl.s; if (age < 0 || age >= .5) return;
  if (age < .42) { const k = smooth(age / .42), rad = (6 + 44 * k) * s; const n = Math.floor(TAU * rad * 1.5) + 8; b.fillStyle = css(G.map.S[0]); for (let i = 0; i < n; i++) { const a = TAU * i / n, x = Math.round(bl.x + rad * Math.cos(a)), y = Math.round(bl.gy + rad * .6 * Math.sin(a)); if (bay(x, y) < 1 - k) b.fillRect(x, y, 1, 1); } }
  const cx = bl.x, cy = bl.y - 3 * s, grow = 1 - Math.pow(1 - Math.min(age / .12, 1), 2);
  const blobs = BLOBS.map(([ox, oy, fac]) => [cx + ox * s * (.5 + grow), cy + oy * s * (.5 + grow) - age * 20 * fac * s, (4 + 8 * grow) * fac * s]);
  const layers = age < .14 ? [[1, 1.5, FIRE[3], 1], [1, 0, FIRE[2], 1], [.65, 0, FIRE[1], 1], [.3, 0, FIRE[0], 1]]
    : (() => { const k = (age - .14) / .36; return [[1, 1, SMOKE[1], 1 - k * .6], [.8, 0, FIRE[3], 1 - k], [.5, 0, FIRE[2], .9 - k], [.25, 0, FIRE[1], .7 - k]]; })();
  for (const [sc, add, col, a] of layers) { if (a < .12) continue; for (const [x, y, R] of blobs) { const st = puffStamp(col, R * sc + add, a); b.drawImage(st, Math.round(x) - (st.width >> 1), Math.round(y) - (st.height >> 1)); } }
}
let grain = 1, lightBuf = null;
const NVG = Float32Array.from({ length: 256 }, (_, i) => Math.pow(i / 255, 1.15));
/* bw, bh: buffer size in render pixels. Light and dither work on the world grid (RS render pixels per cell),
   so the night looks the same as before while sprites keep their finer pixels. */
let colOf = null, NVK = null;
function nvTable() {
  // green level for every (scanline, dither threshold, brightness) so the per-pixel work is one lookup
  NVK = new Uint8Array(2 * 16 * 256);
  for (let r = 0; r < 2; r++) for (let t = 0; t < 16; t++) for (let g = 0; g < 256; g++) {
    const L = NVG[g] * (r ? 1 : .9), v = L * 5, base = v | 0, f = clamp((v - base - .5) * 1.6 + .5, 0, 1);
    NVK[(r * 16 + t) * 256 + g] = clamp(base + (f > B4[t] ? 1 : 0), 0, 5);
  }
}
function postProcess(b, bw, bh, ox, oy, RS) {
  const img = b.getImageData(0, 0, bw, bh), d = img.data, ww = Math.ceil(bw / RS), wh = Math.ceil(bh / RS), n = ww * wh;
  if (!colOf || colOf.length < bw) colOf = new Int32Array(bw);
  for (let x = 0; x < bw; x++) colOf[x] = (x / RS) | 0;
  if (G.nv) {
    if (!NVK) nvTable();
    for (let y = 0, p = 0; y < bh; y++) {
      const wy = ((y / RS) | 0) + oy, base = ((wy & 1) === 0 ? 0 : 16) * 256, by = (wy & 3) << 2;
      for (let x = 0; x < bw; x++, p += 4) {
        grain = (grain * 1103515245 + 12345) & 0x7fffffff;
        let g = ((d[p] * .3 + d[p + 1] * .59 + d[p + 2] * .11) * 1.12 - 10 + ((grain & 255) - 128) * .14) | 0;
        g = g < 0 ? 0 : g > 255 ? 255 : g;
        const c = NVP[NVK[base + (by | ((colOf[x] + ox) & 3)) * 256 + g]];
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
      }
    }
    b.putImageData(img, 0, 0); return;
  }
  // night: start from moonlight, add each lamp, fire and muzzle flash only inside its own box (world grid)
  if (!lightBuf || lightBuf.length < n * 3) lightBuf = new Float32Array(n * 3);
  const Lb = lightBuf;
  for (let i = 0; i < n * 3; i += 3) { Lb[i] = .3; Lb[i + 1] = .36; Lb[i + 2] = .55; }
  const add = (lx, ly, lrad, k, red) => {
    const x0 = Math.max(0, Math.floor(lx - lrad)), x1 = Math.min(ww - 1, Math.ceil(lx + lrad)), y0 = Math.max(0, Math.floor(ly - lrad * .75)), y1 = Math.min(wh - 1, Math.ceil(ly + lrad * .75)), r2 = lrad * lrad;
    for (let y = y0; y <= y1; y++) { const dy = (y - ly) / .75, dy2 = dy * dy; for (let x = x0; x <= x1; x++) { const dx = x - lx, dd = dx * dx + dy2; if (dd >= r2) continue; const q = 1 - Math.sqrt(dd) / lrad, w = q * q * k, i = (y * ww + x) * 3; if (red) Lb[i] += w * .8; else { Lb[i] += w * 1.05; Lb[i + 1] += w * .78; Lb[i + 2] += w * .45; } } }
  };
  for (const l of G.lights) { if (l.x < ox - 60 || l.x > ox + ww + 60 || l.y < oy - 60 || l.y > oy + wh + 60) continue; let k = l.s; if (l.fire) k *= .85 + .15 * Math.sin(G.t * 13 + l.x); if (l.blink) k *= (G.t % 1.2) < .3 ? 1 : 0; if (k > 0) add(l.x - ox, l.y - oy, l.r, k, l.red); }
  for (const f of G.flashes) add(f.x - ox, f.y - oy, f.r, 1.6 * (1 - (G.t - f.t0) / f.dur), false);
  // one multiplier per world cell, applied to its RS x RS render pixels (the buffer clamps to 0..255 itself)
  for (let wy = 0; wy < wh; wy++) {
    const by = ((wy + oy) & 3) << 2, y0 = wy * RS, y1 = Math.min(bh, y0 + RS);
    for (let wx = 0; wx < ww; wx++) {
      const i = (wy * ww + wx) * 3, lr = Lb[i], lvl = Math.min(1.25, lr), sc = (Math.round(lvl * 6 + B4[by | ((wx + ox) & 3)] - .5) / 6) / lvl || 0;
      const mr = lr * sc, mg = Math.min(1.2, Lb[i + 1]) * sc, mb = Math.min(1.1, Lb[i + 2]) * sc, x0 = wx * RS, x1 = Math.min(bw, x0 + RS);
      for (let y = y0; y < y1; y++) for (let x = x0, p = (y * bw + x0) * 4; x < x1; x++, p += 4) { d[p] = d[p] * mr; d[p + 1] = d[p + 1] * mg; d[p + 2] = d[p + 2] * mb; }
    }
  }
  b.putImageData(img, 0, 0);
}
/* map symbols for the zoomed-out view: blue frames are ours, red diamonds are the enemy */
const MARK = {};
function markerSprites() {
  if (MARK.f) return;
  const W_ = [236, 242, 255], K_ = [10, 12, 20];
  const mkF = sym => { const p = new Px(13, 11); for (let y = 0; y < 10; y++) for (let x = 0; x < 13; x++) { const edge = x === 0 || y === 0 || x === 11 || y === 8; if (x < 12 && y < 9) p.set(x, y, edge ? W_ : TEAMC[1].main); else if (x > 0 && y > 0) p.set(x, y, K_); } sym(p, 6, 4); return p.canvas(); };
  const mkE = sym => { const p = new Px(15, 15); for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) { const dd = Math.abs(x - 7) + Math.abs(y - 7); if (dd <= 7) p.set(x, y, dd === 7 ? [255, 226, 222] : TEAMC[2].main); } sym(p, 7, 7); return p.canvas(); };
  const sym = {
    inf: (p, cx, cy) => { for (let k = -3; k <= 3; k++) { p.set(cx + k, cy + Math.round(k * .6), W_); p.set(cx + k, cy - Math.round(k * .6), W_); } },
    veh: (p, cx, cy) => { for (let a = 0; a < 16; a++) p.set(Math.round(cx + Math.cos(a / 16 * TAU) * 3), Math.round(cy + Math.sin(a / 16 * TAU) * 2), W_); },
    air: (p, cx, cy) => { for (let k = -3; k <= 3; k++) { const h = Math.abs(k); for (let j = -h; j <= h; j++) if (Math.abs(j) === h || k === 0) p.set(cx + k, cy + Math.round(j * .7), W_); } },
    arty: (p, cx, cy) => { p.set(cx, cy, W_); p.set(cx - 1, cy, W_); p.set(cx + 1, cy, W_); p.set(cx, cy - 1, W_); p.set(cx, cy + 1, W_); for (let k = -3; k <= 3; k++) p.set(cx + k, cy + 3, W_); },
    aa: (p, cx, cy) => { for (let k = -3; k <= 3; k++) p.set(cx + k, cy + 2 - (3 - Math.abs(k)), W_); }
  };
  MARK.f = {}; MARK.e = {};
  for (const k in sym) { MARK.f[k] = mkF(sym[k]); MARK.e[k] = mkE(sym[k]); }
}
const markKind = u => u.kind === 'air' ? 'air' : u.ut.ground ? 'arty' : u.type === 'aa' ? 'aa' : u.kind === 'veh' ? 'veh' : 'inf';
function drawMarkers(ctx, s, dpr) {
  markerSprites();
  const U = Math.max(2, Math.round(2 * dpr)), toS = (x, y) => [(x - G.cam.x) * s, (y - G.cam.y) * s];
  ctx.imageSmoothingEnabled = false;
  for (const u of G.units) {
    if (!unitAlive(u) || u.aboard) continue; const [wx, wy] = unitPos(u);
    if (u.team === 2 && !G.demo && !(u.kind === 'squad' ? u.members.some(mm => !mm.dead && canSee(1, mm)) : canSee(1, u))) continue;
    let ly = u.kind === 'air' ? wy - u.alt : wy; if (u.kind === 'squad') for (const mm of u.members) if (!mm.dead) ly = Math.min(ly, mm.y);
    const [x, y] = toS(wx, ly - 14), img = (u.team === 1 ? MARK.f : MARK.e)[markKind(u)];
    ctx.drawImage(img, Math.round(x - img.width * U / 2), Math.round(y - img.height * U), img.width * U, img.height * U);
    if (G.sel.has(u)) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = U; ctx.strokeRect(Math.round(x - img.width * U / 2) - 2 * U, Math.round(y - img.height * U) - 2 * U, (img.width + 3) * U, (img.height + 3) * U); }
  }
}

'use strict';
/* Shared helpers, noise, pixel buffers and the palette. Every script on the page shares this global scope. */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const dist = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
function rng32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
let RND = rng32(12345);
const rand = (a = 0, b = 1) => a + (b - a) * RND();
const pick = arr => arr[(RND() * arr.length) | 0];
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const bay = (x, y) => B4[((y & 3) << 2) | (x & 3)];
function hash2(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
const NT = new Float32Array(65536);
{ const r = rng32(7771); for (let i = 0; i < 65536; i++) NT[i] = r(); }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const yb = (yi + s * 131) & 255, X = (xi + s * 57) & 255, X1 = (X + 1) & 255, Y = yb << 8, Y1 = ((yb + 1) & 255) << 8;
  const a = NT[X | Y], b = NT[X1 | Y], c = NT[X | Y1], d = NT[X1 | Y1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, o) { let t = 0, a = 1, n = 0; for (let i = 0; i < o; i++) { t += a * vnoise(x, y, s + i * 31); n += a; a *= .5; x *= 2.03; y *= 2.03; } return t / n; }
const cssCache = new Map();
const css = c => { const k = ((c[0] | 0) << 16) | ((c[1] | 0) << 8) | (c[2] | 0); let s = cssCache.get(k); if (!s) { s = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; cssCache.set(k, s); } return s; };
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
/* The battlefield is rendered at RS pixels per world unit: sprites keep the detail of the reference art,
   while ground, effects and the rules stay in world units. */
const RS = 2;
const snapRS = v => Math.round(v * RS) / RS;
/* draw a sprite canvas made at render resolution with its top-left corner at world (x, y) */
function drawS(b, c, x, y) { b.drawImage(c, snapRS(x), snapRS(y), c.width / RS, c.height / RS); }

class Px {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; }
  a(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  rect(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  clone() { const p = new Px(this.w, this.h); p.d.set(this.d); return p; }
  flip() { const p = new Px(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const s = (y * this.w + x) * 4, t = (y * this.w + this.w - 1 - x) * 4; for (let k = 0; k < 4; k++) p.d[t + k] = this.d[s + k]; } return p; }
  shade(k = .72) { const w = this.w, d = this.d; for (let y = 0; y < this.h; y++) { let last = -1, n = 0; for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { last = x; n++; } if (n > 2) { const i = (y * w + last) * 4; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; } } return this; }
  tint(m, add) { const d = this.d; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = d[i] * m[0] + (add ? add[0] : 0); d[i + 1] = d[i + 1] * m[1] + (add ? add[1] : 0); d[i + 2] = d[i + 2] * m[2] + (add ? add[2] : 0); } return this; }
  canvas() { const c = mkCanvas(this.w, this.h), x = c.getContext('2d'), im = x.createImageData(this.w, this.h); im.data.set(this.d); x.putImageData(im, 0, 0); return c; }
}
function ascii(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), p = new Px(w, h);
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = pal[r[x]]; if (c) p.set(x, y, c); } });
  return p;
}
function rotatePx(src, theta, size, tint) {
  const p = new Px(size, size), c = size / 2, ca = Math.cos(-theta), sa = Math.sin(-theta);
  for (let oy = 0; oy < size; oy++) for (let ox = 0; ox < size; ox++) {
    const dx = ox + .5 - c, dy = oy + .5 - c, sx = Math.floor(ca * dx - sa * dy + src.w / 2), sy = Math.floor(sa * dx + ca * dy + src.h / 2);
    if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
    const i = (sy * src.w + sx) * 4; if (!src.d[i + 3]) continue;
    const j = (oy * size + ox) * 4;
    if (tint) { p.d[j] = tint[0]; p.d[j + 1] = tint[1]; p.d[j + 2] = tint[2]; }
    else { p.d[j] = src.d[i]; p.d[j + 1] = src.d[i + 1]; p.d[j + 2] = src.d[i + 2]; }
    p.d[j + 3] = 255;
  }
  return p;
}

/* palette */
const SNOW_DUSK = [[176,180,206],[155,160,190],[134,140,173],[113,119,152],[93,98,129],[74,78,106],[56,58,82]];
const SNOW_DAY = [[206,212,228],[184,192,212],[160,168,192],[136,144,170],[112,119,146],[88,94,120],[66,70,94]];
const MUD = [[104,88,80],[84,71,65],[66,56,52],[49,42,41],[35,30,30]];
const PINE = [[64,88,84],[44,64,62],[30,46,48],[20,31,35],[11,17,22]];
const TRUNK = [[70,52,44],[44,33,30]];
const WOOD = [[138,104,76],[112,83,61],[88,65,49],[63,47,38],[42,32,28]];
const FIRE = [[255,248,214],[255,216,92],[255,150,40],[232,84,28],[160,44,22]];
const BLOOD = [[208,20,34],[156,12,26],[104,6,18]];
const SMOKE = [[20,20,24],[38,38,44],[60,60,68],[86,86,96],[116,116,126],[146,146,156]];
const WIN = [[255,206,112],[230,144,60]];
const ICE = [[178,194,214],[154,172,196],[212,224,240],[134,150,176]];
const WATER = [[40,54,78],[33,45,66],[58,74,100]];
const STEEL = [[150,154,164],[110,114,124],[76,80,90],[50,52,60]];
const CONCRETE = [[146,148,156],[124,126,134],[100,102,110],[76,78,86]];
const BRASS = [214,170,80];
const TR_F = [255,236,150], TR_E = [255,176,90];
const NVP = [[4,18,8],[10,44,16],[24,86,30],[48,140,52],[106,206,96],[200,255,180]];
const SEL = [156,214,255];
const SMOKE_TRUCK = [SMOKE[1],SMOKE[2],SMOKE[3],SMOKE[3],SMOKE[4],SMOKE[4],SMOKE[5]];
const SMOKE_BLACK = [SMOKE[0],SMOKE[0],SMOKE[1],SMOKE[2],SMOKE[3]];
const SMOKE_LIGHT = [[150,150,162],[166,168,180],[180,182,194]];
const SMOKE_GREY = [SMOKE[3],SMOKE[4],SMOKE[5]];
const SMOKE_DIRT = [[54,48,46],[78,72,72],[104,100,104],[130,128,136]];
const SMOKE_ROCKET = [[200,200,206],[170,170,180],[140,140,150]];
const EXHAUST = [[70,70,78],[96,96,106],[120,120,132]];
const DUST = [[196,200,218],[172,176,196],[150,154,176]];
const FIREBALL = [FIRE[0],FIRE[1],FIRE[2],FIRE[3],FIRE[4],SMOKE[1]];
const TEAMC = { 1: { main: [66,128,255], light: [160,196,255], dark: [34,72,170] }, 2: { main: [238,58,52], light: [255,168,158], dark: [150,28,28] } };

/* seasons (step 4): the ground palette of each season goes from light to dark like the snow palettes */
const GRASS_SUMMER = [[166,178,102],[146,160,88],[126,142,76],[108,124,66],[90,106,58],[72,88,50],[54,68,42]];
const GROUND_SPRING = [[152,160,106],[132,142,92],[114,124,80],[98,106,68],[82,88,58],[66,70,50],[50,54,42]];
const GRASS_AUTUMN = [[168,156,106],[150,138,92],[132,120,80],[114,104,68],[96,88,58],[78,72,50],[60,56,42]];
const GRASS_TALL = [[184,190,112],[156,166,90],[130,142,74],[108,120,62],[86,98,52]];
const WHEAT = [[226,200,122],[208,180,102],[186,158,86],[160,132,70],[128,104,58]];
const PLOUGH = [[116,96,76],[100,82,66],[84,68,56],[68,56,46],[52,42,38]];
const STUBBLE = [[204,184,128],[184,164,110],[160,142,96],[134,118,82]];
const LEAVES = [[214,128,44],[232,172,60],[186,80,38],[162,110,44],[240,202,98]];
const PUDDLE = [[92,112,136],[134,154,178],[70,86,106]];
const DUST_DRY = [[186,172,142],[162,148,120],[138,126,102]];
const SPRAY_MUD = [[122,106,88],[100,86,72],[82,70,60]];
const FOAM = [[214,224,236],[176,192,212],[140,160,186]], DEEP = [[30,42,64],[24,34,54]];      // step 6: the open sea
const SHINGLE = [[132,134,142],[112,114,124],[92,94,104],[66,68,78]];
const COBBLE = [[152,154,162],[134,136,144],[116,118,126],[94,96,104],[74,76,84]];      // step 5: paved town streets and squares
const DRYROAD = [[172,152,116],[152,134,102],[132,116,88],[112,98,76],[92,80,64]];
const AUTROAD = [[150,130,98],[132,114,86],[114,98,74],[96,82,64],[78,66,54]];
/* pal: ground tones; road and track: dirt roads (winter and spring roads use MUD); kick: what explosions and bullets
   throw up; dust: the cloud behind vehicles and helicopters */
const SEASONS = {
  winter: { id: 'winter', snow: true },
  spring: { id: 'spring', pal: GROUND_SPRING, mud: true, rain: true, track: PLOUGH, kick: [96,82,68], dust: SPRAY_MUD },
  summer: { id: 'summer', pal: GRASS_SUMMER, grass: true, road: DRYROAD, track: DRYROAD, kick: [124,110,82], dust: DUST_DRY },
  autumn: { id: 'autumn', pal: GRASS_AUTUMN, fog: true, leaves: true, road: AUTROAD, track: AUTROAD, kick: [128,110,80], dust: DUST_DRY }
};
const seasonOf = def => SEASONS[def.season] || SEASONS.winter;

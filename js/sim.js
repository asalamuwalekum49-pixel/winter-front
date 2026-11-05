'use strict';
/* Rules and simulation: weapons, units, buildings, research, economy, combat, construction and the enemy commander. */
const WT = {
  rifle: { rng: 76, rof: [1.3, 2.0], acc: [.62, .3], dmg: 34, pen: .6, sup: 4, vs: { inf: 1, veh: 1, air: .35, bld: .12 }, fx: 'bullet', snd: 'rifle' },
  carbine: { rng: 62, rof: [.9, 1.3], acc: [.58, .3], dmg: 22, pen: .5, sup: 3, vs: { inf: 1, veh: 1, air: .3, bld: .1 }, fx: 'bullet', snd: 'smg' },
  lmg: { rng: 84, rof: .11, burst: 7, pause: 1.8, acc: [.42, .2], dmg: 15, pen: .8, sup: 9, vs: { inf: 1, veh: 1, air: .5, bld: .12 }, fx: 'bullet', snd: 'mg', casings: true },
  hmg: { rng: 108, rof: .09, burst: 9, pause: 1.6, setup: 1.8, acc: [.44, .22], dmg: 17, pen: 1.5, sup: 15, vs: { inf: 1, veh: 1, air: .6, bld: .15 }, fx: 'bullet', snd: 'mg', casings: true },
  sniper: { rng: 150, rof: [4, 5], acc: [.92, .72], dmg: 140, pen: 2, sup: 6, vs: { inf: 1, veh: .2, air: 0, bld: 0 }, fx: 'bullet', snd: 'sniper' },
  launcher: { rng: 82, rof: [6, 7], acc: [.72, .42], dmg: 210, pen: 11, splash: 6, sup: 10, vs: { inf: .35, veh: 1, air: .25, bld: .8 }, fx: 'rocket', snd: 'rocket', prefer: 'veh', speed: 240 },
  mortar: { rng: 200, min: 46, rof: [4.2, 5], scatter: [6, 16], setup: 1.6, dmg: 105, splash: 15, pen: 3, sup: 25, vs: { inf: 1, veh: .35, air: 0, bld: .6 }, fx: 'arc', snd: 'mortar', indirect: true },
  mg_veh: { rng: 92, rof: .1, burst: 8, pause: 1.4, acc: [.4, .2], dmg: 13, pen: 1.5, sup: 10, vs: { inf: 1, veh: 1, air: .55, bld: .12 }, fx: 'bullet', snd: 'mg' },
  flak: { rng: 130, rof: .08, burst: 10, pause: 1.2, acc: [.5, .3], dmg: 15, pen: 2.5, sup: 12, vs: { inf: 1, veh: .8, air: 2.2, bld: .15 }, fx: 'flak', snd: 'flak', airFirst: true },
  gun_l: { rng: 124, rof: [3, 3.4], acc: [.78, .52], dmg: 120, pen: 6.5, splash: 7, sup: 12, vs: { inf: .75, veh: 1, air: 0, bld: 1 }, fx: 'shell', snd: 'cannon', speed: 330 },
  gun_m: { rng: 142, rof: [4.4, 5], acc: [.78, .5], dmg: 185, pen: 9.5, splash: 12, sup: 18, vs: { inf: .8, veh: 1, air: 0, bld: 1 }, fx: 'shell', snd: 'cannon', speed: 330 },
  gun_h: { rng: 160, rof: [6, 6.8], acc: [.8, .56], dmg: 270, pen: 15, splash: 15, sup: 24, vs: { inf: .8, veh: 1, air: 0, bld: 1.1 }, fx: 'shell', snd: 'cannon', speed: 340 },
  coax: { rng: 88, rof: .12, burst: 6, pause: 1.6, acc: [.38, .18], dmg: 11, pen: 1, sup: 8, vs: { inf: 1, veh: 1, air: .4, bld: .1 }, fx: 'bullet', snd: 'mg', coax: true },
  howitzer: { rng: 330, min: 70, rof: [8, 9], scatter: [10, 24], dmg: 250, splash: 22, pen: 8, sup: 35, vs: { inf: 1, veh: .9, air: 0, bld: 1.3 }, fx: 'arc', snd: 'howitzer', indirect: true },
  mg_air: { rng: 100, rof: .09, burst: 9, pause: 1.4, acc: [.42, .22], dmg: 12, pen: 1.5, sup: 10, vs: { inf: 1, veh: 1, air: .6, bld: .12 }, fx: 'bullet', snd: 'mg' },
  rockets: { rng: 130, rof: .22, burst: 4, pause: 6, acc: [.7, .45], dmg: 150, pen: 8, splash: 10, sup: 16, vs: { inf: .8, veh: 1, air: 0, bld: 1 }, fx: 'rocket', snd: 'rocket', prefer: 'veh', ammo: true, speed: 280, aim: .5 },
  chain: { rng: 110, rof: .07, burst: 12, pause: 1.3, acc: [.4, .2], dmg: 13, pen: 2.2, sup: 12, vs: { inf: 1, veh: 1, air: .5, bld: .2 }, fx: 'bullet', snd: 'chain' },
  door_mg: { rng: 90, rof: .1, burst: 8, pause: 1.6, acc: [.36, .16], dmg: 11, pen: 1, sup: 9, vs: { inf: 1, veh: 1, air: .4, bld: .1 }, fx: 'bullet', snd: 'mg' },
  hmg_bunker: { rng: 112, rof: .09, burst: 9, pause: 1.5, acc: [.46, .24], dmg: 17, pen: 1.5, sup: 15, vs: { inf: 1, veh: 1, air: .6, bld: .15 }, fx: 'bullet', snd: 'mg', casings: true },
  flak_static: { rng: 140, rof: .09, burst: 10, pause: 1.1, acc: [.52, .32], dmg: 15, pen: 2.5, sup: 10, vs: { inf: .8, veh: .6, air: 2.4, bld: .1 }, fx: 'flak', snd: 'flak', airFirst: true },
  grenade: { dmg: 120, splash: 16, pen: 3, sup: 30, vs: { inf: 1, veh: .6, air: 0, bld: .8 } },
  mine: { dmg: 170, splash: 12, pen: 9, sup: 40, vs: { inf: 1, veh: 1.2, air: 0, bld: 0 } },
  arty: { dmg: 220, splash: 20, pen: 7, sup: 40, vs: { inf: 1, veh: .9, air: 0, bld: 1.2 } },
  burn: { dmg: 90, splash: 16, pen: 0, sup: 20, vs: { inf: 1, veh: 0, air: 0, bld: 0 } }
};
const UT = {
  engineers: { cls: 'inf', n: 4, role: 'eng', w: ['carbine'], cost: { mp: 170 }, sup: 3, time: 16, at: 'hq', hp: 80, speed: 16, sight: 92 },
  riflemen: { cls: 'inf', n: 5, role: 'rifle', w: ['rifle'], cost: { mp: 260 }, sup: 5, time: 20, at: 'barracks', hp: 100, speed: 16.5, sight: 96, gren: true },
  mg: { cls: 'inf', n: 3, role: 'mg', w: ['hmg', 'carbine', 'carbine'], cost: { mp: 240, mu: 15 }, sup: 4, time: 22, at: 'barracks', hp: 90, speed: 14.5, sight: 100 },
  sniper: { cls: 'inf', n: 1, role: 'sniper', w: ['sniper'], cost: { mp: 300, mu: 20 }, sup: 3, time: 24, at: 'barracks', hp: 90, speed: 16.5, sight: 150, camo: true },
  at: { cls: 'inf', n: 3, role: 'at', w: ['launcher', 'launcher', 'carbine'], cost: { mp: 240, mu: 40 }, sup: 4, time: 22, at: 'barracks', hp: 90, speed: 16, sight: 96, req: 't2' },
  mortar: { cls: 'inf', n: 3, role: 'mortar', w: ['mortar', 'carbine', 'carbine'], cost: { mp: 250, mu: 30 }, sup: 4, time: 22, at: 'barracks', hp: 85, speed: 14, sight: 90, req: 't2', ground: true },
  scout: { cls: 'veh', body: 'car', w: ['mg_veh'], cost: { mp: 200, fu: 20 }, sup: 4, time: 22, at: 'motor', hp: 300, armor: [3, 2.5, 2], speed: 30, sight: 132 },
  aa: { cls: 'veh', body: 'halftrack', w: ['flak'], cost: { mp: 240, fu: 40 }, sup: 5, time: 26, at: 'motor', hp: 340, armor: [4, 3, 2.5], speed: 24, sight: 120 },
  light: { cls: 'veh', body: 'lt', w: ['gun_l', 'coax'], cost: { mp: 260, fu: 60 }, sup: 7, time: 30, at: 'motor', hp: 560, armor: [6, 4.5, 3.5], speed: 22, sight: 118 },
  medium: { cls: 'veh', body: 'mt', w: ['gun_m', 'coax'], cost: { mp: 340, fu: 110 }, sup: 10, time: 38, at: 'motor', hp: 820, armor: [9, 6.5, 5], speed: 17, sight: 118 },
  heavy: { cls: 'veh', body: 'ht', w: ['gun_h', 'coax'], cost: { mp: 460, fu: 180 }, sup: 14, time: 50, at: 'motor', hp: 1300, armor: [14, 10, 7], speed: 12, sight: 120, req: 't3' },
  howitzer: { cls: 'veh', body: 'spg', w: ['howitzer'], cost: { mp: 300, fu: 100 }, sup: 8, time: 40, at: 'motor', hp: 420, armor: [4, 3, 2], speed: 13, sight: 96, req: 't3', ground: true },
  heli_scout: { cls: 'air', body: 'hs', w: ['mg_air'], cost: { mp: 240, fu: 60 }, sup: 6, time: 28, at: 'helipad', hp: 280, armor: [2.5, 2.5, 2.5], speed: 46, sight: 170 },
  heli_attack: { cls: 'air', body: 'ha', w: ['rockets', 'chain'], cost: { mp: 400, fu: 150 }, sup: 12, time: 44, at: 'helipad', hp: 560, armor: [4, 4, 4], speed: 38, sight: 150, ammo: 8 },
  heli_trans: { cls: 'air', body: 'tr', w: ['door_mg'], cost: { mp: 380, fu: 80 }, sup: 10, time: 36, at: 'helipad', hp: 620, armor: [3, 3, 3], speed: 40, sight: 130, cargo: true },
  // step 6: boats from the dock (drawn in code); a landing boat carries one squad of any kind
  boat: { cls: 'veh', sea: true, body: 'boat', w: ['mg_veh'], cost: { mp: 140, fu: 30 }, sup: 3, time: 18, at: 'dock', hp: 320, armor: [3, 2.5, 2], speed: 30, sight: 120, cargo: true },
  gunboat: { cls: 'veh', sea: true, body: 'gunboat', w: ['gun_m', 'mg_veh'], cost: { mp: 300, mu: 40, fu: 90 }, sup: 9, time: 36, at: 'dock', hp: 950, armor: [7, 5.5, 4], speed: 22, sight: 140, req: 't2' }
};
const UNIT_AT = { hq: ['engineers'], barracks: ['riflemen', 'mg', 'sniper', 'at', 'mortar'], motor: ['scout', 'aa', 'light', 'medium', 'heavy', 'howitzer'], helipad: ['heli_scout', 'heli_attack', 'heli_trans'], dock: ['boat', 'gunboat'], fob: ['engineers'] };
const BT = {
  hq: { hp: 2600, sight: 130, foot: [22, 14] },
  barracks: { cost: { mp: 150 }, time: 24, hp: 1000, sight: 90, foot: [22, 13] },
  motor: { cost: { mp: 200, fu: 50 }, time: 32, hp: 1200, sight: 90, foot: [27, 15], req: 't2' },
  helipad: { cost: { mp: 220, fu: 100 }, time: 36, hp: 900, sight: 90, foot: [22, 26], req: 't3', flat: true },
  depot: { cost: { mp: 120 }, time: 20, hp: 700, sight: 70, foot: [14, 9] },
  bunker: { cost: { mp: 140, mu: 30 }, time: 26, hp: 1100, sight: 112, foot: [12, 9], w: ['hmg_bunker'], cover: 2 },
  aanest: { cost: { mp: 120, mu: 40 }, time: 22, hp: 600, sight: 130, foot: [13, 10], w: ['flak_static'], cover: 2 },
  sandbags: { cost: { mp: 20 }, time: 5, hp: 300, sight: 0, foot: [13, 4], noBlock: true, cover: 2, small: true },
  wire: { cost: { mp: 15 }, time: 5, hp: 150, sight: 0, foot: [15, 4], blockInf: true, small: true },
  traps: { cost: { mp: 30 }, time: 7, hp: 500, sight: 0, foot: [11, 6], blockVeh: true, small: true },
  mines: { cost: { mu: 30 }, time: 4, hp: 40, sight: 0, foot: [4, 3], noBlock: true, mine: true, small: true },
  // step 6: built only where there is water: a dock on the shore, a pontoon bridge from bank to bank (its length comes from the water)
  dock: { cost: { mp: 160, fu: 20 }, time: 26, hp: 900, sight: 100, foot: [16, 10], water: true, dock: true },
  pontoon: { cost: { mp: 160, mu: 20 }, time: 30, hp: 600, sight: 0, foot: [6, 0], water: true, bridge: true, flat: true, small: true },
  // step 7: a forward base on a point of ours far from the HQ (squads heal and reinforce by it, retreat to it, engineers are trained in it
  // and we may build around it) and a field workshop that mends vehicles and helicopters nearby
  fob: { cost: { mp: 220, mu: 40, fu: 30 }, time: 40, hp: 1500, sight: 110, foot: [19, 12], fob: true },
  workshop: { cost: { mp: 160, fu: 50 }, time: 30, hp: 1000, sight: 80, foot: [19, 12], shop: true }
};
const BUILD_LIST = ['barracks', 'motor', 'helipad', 'depot', 'fob', 'workshop', 'bunker', 'aanest', 'sandbags', 'wire', 'traps', 'mines', 'dock', 'pontoon'];
const RT = {
  t2: { cost: { mu: 120, fu: 80 }, time: 40, at: 'hq' },
  t3: { cost: { mu: 180, fu: 160 }, time: 55, at: 'hq', req: 't2' },
  winter: { cost: { mu: 60 }, time: 25, at: 'hq' },
  optics: { cost: { mu: 70, fu: 20 }, time: 30, at: 'hq' },
  lmg: { cost: { mu: 90 }, time: 30, at: 'barracks' },
  armor: { cost: { mu: 80, fu: 80 }, time: 35, at: 'motor' },
  // step 7: two upgrades of each army, researched at the HQ by that army only
  vests: { cost: { mu: 90 }, time: 30, at: 'hq', army: 'inf' },
  medics: { cost: { mu: 80, fu: 20 }, time: 30, at: 'hq', army: 'inf', req: 't2' },
  crews: { cost: { mu: 80, fu: 40 }, time: 30, at: 'hq', army: 'tank' },
  apds: { cost: { mu: 100, fu: 30 }, time: 35, at: 'hq', army: 'tank', req: 't2' },
  para3: { cost: { mu: 120 }, time: 35, at: 'hq', army: 'air' },
  heliarmor: { cost: { mu: 80, fu: 60 }, time: 35, at: 'hq', army: 'air', req: 't2' }
};
const RESEARCH_AT = { hq: ['t2', 't3', 'winter', 'optics'], barracks: ['lmg'], motor: ['armor'] };
const GLOBAL = { artillery: { cost: { mu: 120 }, cd: 70 }, recon: { cost: { mu: 50 }, cd: 45 },
  charge: { cost: { mu: 60 }, cd: 75 }, blitz: { cost: { mu: 50, fu: 30 }, cd: 75 }, para: { cost: { mp: 220, mu: 80 }, cd: 120 } };      // step 7: one per army
const DIFF = { easy: { acc: .75, dmg: .8, eco: .8, think: 1.5 }, normal: { acc: 1, dmg: 1, eco: 1, think: 1 }, hard: { acc: 1.1, dmg: 1.12, eco: 1.35, think: .7 } };
const SLOTS = [[-10, -4.5], [-2, -4.5], [6, -4.5], [-6, 4.5], [2, 4.5], [10, 4.5]];
const STEP = 1 / 30;
/* the difficulty's handicaps and bonuses belong to the enemy of a human player; when the AI plays both sides they are off */
const aiBoost = team => team === 2 && !G.auto && !G.demo;
const COVER_HIT = [1, .78, .55], COVER_SUP = [1, .75, .5], COVER_DMG = [1, .9, .8];
let G = null, UID = 1;
const hooks = { toast: () => {}, sfx: () => {}, end: () => {}, ping: () => {}, alert: () => {} };

/* ---------------------------------------------------------------- creation */
function mkTeam(id) { return { id, res: { mp: 420, mu: 70, fu: 50 }, inc: { mp: 0, mu: 0, fu: 0 }, tickets: 500, tech: new Set(), stats: { kills: 0, lost: 0, made: 0 }, hq: null, used: 0, cap: 40, cd: { artillery: 0, recon: 0, charge: 0, blitz: 0, para: 0 }, alertT: -99, lowAlert: false, army: null }; }
function memberWeapon(type, i, team) { const w = UT[type].w; let k = w[Math.min(i, w.length - 1)]; if (type === 'riflemen' && i === 0 && G.teams[team].tech.has('lmg')) k = 'lmg'; return k; }
function mkSoldier(sq, x, y, i) {
  return { id: UID++, cls: 'inf', team: sq.team, sq, x, y, hp: sq.ut.hp, max: sq.ut.hp, w: memberWeapon(sq.type, i, sq.team), role: sq.ut.role, face: sq.team === 1 ? 1 : -1,
    walk: 0, moving: false, kneel: false, reload: rand(0, 1.2), burst: 0, tgtT: rand(0, .3), target: null, fireT: -9, setup: 0, pi: 1, goal: null, arrived: true, lastFoot: 0,
    dead: false, deathT: 0, baked: false, bled: false, knock: null };
}
function mkSquad(team, type, x, y, n) {
  const ut = UT[type];
  const s = { id: UID++, kind: 'squad', cls: 'inf', team, type, ut, members: [], path: null, mode: null, dest: null, focus: null, ground: null, grenT: 0, gren: null, order: null, ai: null,
    lx: x, ly: y, gone: false, sup: 0, supT: -9, pinned: false, pinT: 0, retreat: false, vet: { xp: 0, lvl: 0 }, lastCombat: -99, moveT: 0, fireT: -99, working: false };
  const cnt = n == null ? ut.n : n;
  for (let i = 0; i < cnt; i++) { const sl = SLOTS[i % SLOTS.length]; s.members.push(mkSoldier(s, x + sl[0] + rand(-1, 1), y + sl[1] + rand(-1, 1), i)); }
  return s;
}
/* one of the type's models from the reference sheets (same stats, only the picture differs) */
const pickModel = (models, body) => { const l = models && models[body]; return l && l.length > 1 ? l[Math.floor(RND() * l.length)] : body; };
function mkVeh(team, type, x, y, ang) {
  const ut = UT[type], mul = G.teams[team].tech.has('armor') ? 1.15 : 1;
  return { id: UID++, kind: 'veh', cls: 'veh', team, type, ut, body: pickModel(VMODELS[team], ut.body), x, y, ang, tur: ang, hp: ut.hp * mul, max: ut.hp * mul, dead: false, path: null, pi: 1, mode: null, focus: null, ground: null,
    moving: false, dist: 0, lastTrack: 0, fireT: -9, ai: null, gone: false, vet: { xp: 0, lvl: 0 }, lastCombat: -99, stuck: 0, exhaust: 0, cargo: false, cargoSq: null, task: null,
    wp: ut.w.map(k => ({ k, reload: rand(.5, 1.5), burst: 0, target: null, tgtT: rand(0, .4) })) };
}
function mkAir(team, type, x, y, ang) {
  const ut = UT[type], mul = G.teams[team].tech.has('heliarmor') ? 1.2 : 1;
  return { id: UID++, kind: 'air', cls: 'air', team, type, ut, body: pickModel(HMODELS[team], ut.body), x, y, alt: 0, ang, vx: 0, vy: 0, hp: ut.hp * mul, max: ut.hp * mul, dead: false, dest: null, focus: null, mode: null, ai: null,
    gone: false, vet: { xp: 0, lvl: 0 }, lastCombat: -99, ammo: ut.ammo || 0, cargo: !!ut.cargo, task: null, rotor: rand(0, 6), crash: null, fireT: -9, landing: false,
    wp: ut.w.map(k => ({ k, reload: rand(.5, 1.5), burst: 0, target: null, tgtT: rand(0, .4) })) };
}
function spawnType(team, type, x, y, ang) {
  const ut = UT[type], veh = ut.cls === 'veh', mv = ut.sea ? 'sea' : veh;
  if (ut.cls !== 'air') { const c = cellOf(G.map, x, y), w = nearestWalkable(G.map, mv, c[0], c[1]); if (w) { x = w[0] * CELL + CELL / 2; y = w[1] * CELL + CELL / 2; } }
  const a = ang != null ? ang : (team === 1 ? -Math.PI / 2 : Math.PI / 2);
  const u = ut.cls === 'inf' ? mkSquad(team, type, x, y) : ut.cls === 'veh' ? mkVeh(team, type, x, y, a) : mkAir(team, type, x, y, a);
  G.units.push(u);
  return u;
}
function addBld(team, type, x, y, built, auto, span) {
  const bt = BT[type], foot = span ? [x - 6, span[0], x + 6, span[1]] : footOf(type, x, y);
  const b = { id: UID++, kind: 'bld', cls: 'bld', team, type, bt, ax: x, by: span ? span[1] : y, x, y: span ? (span[0] + span[1]) / 2 : y - bt.foot[1] / 2, foot, span: span || null, hp: bt.hp * (built ? 1 : .08), max: bt.hp, built: built ? 1 : 0, auto: !!auto,
    dead: false, queue: [], rally: null, research: null, tur: team === 1 ? -Math.PI / 2 : Math.PI / 2, vet: { xp: 0, lvl: 0 }, lastCombat: -99, fireT: -9,
    wp: bt.w ? bt.w.map(k => ({ k, reload: 1, burst: 0, target: null, tgtT: 0 })) : null };
  const looks = bldLooks(type); b.v = looks > 1 ? Math.floor(RND() * looks) : 0;      // which picture a fortification gets
  if (type === 'helipad') { b.padX = x; b.padY = y - 13; }
  if (bt.dock) b.water = dockWater(x, y);
  markFoot(b, true); cutTrees(G.map, foot);
  G.blds.push(b);
  return b;
}
function markFoot(b, on) {
  const m = G.map, bt = b.bt, f = b.foot; m.ver = (m.ver || 0) + 1;
  const cells = (r, fn) => { for (let cy = Math.max(0, Math.floor(r[1] / CELL)); cy <= Math.min(m.ch - 1, Math.floor(r[3] / CELL)); cy++) for (let cx = Math.max(0, Math.floor(r[0] / CELL)); cx <= Math.min(m.cw - 1, Math.floor(r[2] / CELL)); cx++) fn(cy * m.cw + cx); };
  // a pontoon closes the water to boats at once and opens it to infantry and vehicles when it is finished
  if (on && bt.bridge) { cells(f, c => { m.walkS[c] = 0; if (b.built >= 1) { m.walkI[c] = 1; m.walkV[c] = 1; } }); return; }
  if (on) {
    if (!bt.noBlock && !bt.flat) {
      cells([f[0] + 1, f[1] + 1, f[2] - 1, f[3] - 1], c => { if (!bt.blockVeh) m.walkI[c] = 0; if (!bt.blockInf) m.walkV[c] = 0; });
      if (!bt.blockInf && !bt.small) cells([f[0] - 4, f[1] - 4, f[2] + 4, f[3] + 4], c => { m.walkV[c] = 0; });
    }
    if (bt.cover) for (let y = Math.max(0, Math.floor(f[1] / 3)); y <= Math.min(m.cmH - 1, Math.floor(f[3] / 3)); y++) for (let x = Math.max(0, Math.floor(f[0] / 3)); x <= Math.min(m.cmW - 1, Math.floor(f[2] / 3)); x++) m.cmask[y * m.cmW + x] = Math.max(m.cmask[y * m.cmW + x], bt.cover);
  } else {
    cells([f[0] - 4, f[1] - 4, f[2] + 4, f[3] + 4], c => { m.walkI[c] = m.walkI0[c]; m.walkV[c] = m.walkV0[c]; m.walkS[c] = m.walkS0[c]; });
    for (const o of G.blds) if (o !== b && !o.dead) markFoot(o, true);
    if (bt.cover) for (let y = Math.max(0, Math.floor(f[1] / 3)); y <= Math.min(m.cmH - 1, Math.floor(f[3] / 3)); y++) for (let x = Math.max(0, Math.floor(f[0] / 3)); x <= Math.min(m.cmW - 1, Math.floor(f[2] / 3)); x++) m.cmask[y * m.cmW + x] = 0;
  }
}

function newGame(def, diff, demo, armies) {
  RND = rng32((def.seed * 7 + (diff === 'hard' ? 3 : diff === 'easy' ? 1 : 2)) >>> 0);
  UID = 1;
  const map = buildMap(def);
  G = { def, map, diffId: diff, diff: DIFF[diff] || DIFF.normal, demo: !!demo, t: 0, units: [], blds: [], parts: [], projs: [], blasts: [], pools: [], flashes: [], marker: null, ropes: [], decals: [],
    emitters: map.emitters.map(e => Object.assign({ acc: 0 }, e)), fires: map.fires.slice(), lights: map.lights.slice(),
    sel: new Set(), cam: { x: 0, y: 0 }, zoom: 3, nv: false, over: null, paused: false, teams: { 1: mkTeam(1), 2: mkTeam(2) }, E: { 1: [], 2: [] },
    vw: Math.ceil(map.W / 8), vh: Math.ceil(map.H / 8), visT: 0, aiT: 1, supT: 0, arty: [], planes: [], reveal: [], spotted: new Set(), seenAir: false, place: null, armed: null, hover: null, aiArtyT: 150, ePlaneT: 130, len: 'normal', tmax: 500, groups: {}, drops: [] };
  G.vis = { 1: new Uint8Array(G.vw * G.vh), 2: new Uint8Array(G.vw * G.vh) }; G.seen = new Uint8Array(G.vw * G.vh);
  for (const team of [1, 2]) { const [x, y] = def.hq[team]; G.teams[team].hq = addBld(team, 'hq', x, y, true); }
  for (const b of def.enemyBase.prebuilt) addBld(2, b.type, b.x, b.y, true);
  // both sides start equal: the south gets the north's prebuilt buildings (mirrored around the HQs) and the north the south's engineers
  placeNear(1, 'barracks', slotsFor(1).barracks);
  for (const b of def.enemyBase.prebuilt) if (b.type !== 'barracks') { const q = mirrorPt(def, [b.x, b.y], 1); placeNear(1, b.type, def.sym ? [q[0], q[1] + BT[b.type].foot[1]] : q); }
  for (const team of [1, 2]) for (const s of def.start[team]) { const u = spawnType(team, s.type, s.x, s.y); if (team === 2) u.ai = { task: null, until: 0 }; }
  const e1 = def.start[1].find(s => s.type === 'engineers');
  if (e1 && !def.start[2].some(s => s.type === 'engineers')) { const [x, y] = mirrorPt(def, [e1.x, e1.y], 2); spawnType(2, 'engineers', x, y).ai = { task: null, until: 0 }; }
  setArmies(armies, demo);
  rebuildE(); computeVis(1); computeVis(2); recalcSupply(1); recalcSupply(2);
  const hq = G.teams[1].hq; G.camFocus = [hq.x, hq.by - 46];
  return G;
}
/* battle length: the reserves both sides start with */
const BATTLE_LEN = { short: 300, normal: 500, long: 1000 };
function setBattleLength(len) { G.len = BATTLE_LEN[len] ? len : 'normal'; G.tmax = BATTLE_LEN[G.len]; for (const t of [1, 2]) G.teams[t].tickets = G.tmax; }

/* ---------------------------------------------------------------- queries */
const unitAlive = u => u.kind === 'squad' ? u.members.some(m => !m.dead) : !u.dead && !u.crash;
function unitPos(u) { if (u.kind !== 'squad') return [u.x, u.y]; let x = 0, y = 0, n = 0; for (const m of u.members) if (!m.dead) { x += m.x; y += m.y; n++; } if (n) { u.lx = x / n; u.ly = y / n; } return [u.lx, u.ly]; }
const unitOf = e => e.cls === 'inf' ? e.sq : e;
const liveCount = u => u.members.filter(m => !m.dead).length;
function bldOf(team, type, builtOnly) { return G.blds.filter(b => b.team === team && b.type === type && !b.dead && (!builtOnly || b.built >= 1)); }
function homePad(team, x, y) { let best = null, bd = 1e9; for (const b of bldOf(team, 'helipad', true)) { const d = dist(x, y, b.padX, b.padY); if (d < bd) { bd = d; best = b; } } return best; }
function rebuildE() {
  G.E[1] = []; G.E[2] = [];
  for (const u of G.units) { if (u.kind === 'squad') { if (!u.aboard && !u.chute) for (const m of u.members) if (!m.dead) G.E[u.team].push(m); } else if (!u.dead && !u.crash) G.E[u.team].push(u); }
  for (const b of G.blds) if (!b.dead && !b.bt.mine) G.E[b.team].push(b);
}
function sightOf(e) {
  const base = e.cls === 'inf' ? e.sq.ut.sight : e.cls === 'bld' ? e.bt.sight * (e.built >= 1 ? 1 : .5) : e.ut.sight;
  const T = G.teams[e.team], night = G.def.light === 'night';
  let k = night ? .62 : 1;
  if (night && T.tech.has('optics')) k *= 1.25;
  if (e.team === 1 && G.nv && night) k *= 1.4;
  if (G.map.season.fog) k *= T.tech.has('optics') ? .82 : .66;       // autumn fog shortens everyone's sight, thermal optics see a bit further
  return base * k;
}
function computeVis(team) {
  const v = G.vis[team]; v.fill(0);
  const stamp = (x, y, r) => { const rr = r / 8, cx = x / 8, cy = y / 8; for (let yy = Math.max(0, Math.floor(cy - rr)); yy <= Math.min(G.vh - 1, Math.ceil(cy + rr)); yy++) for (let xx = Math.max(0, Math.floor(cx - rr)); xx <= Math.min(G.vw - 1, Math.ceil(cx + rr)); xx++) if ((xx + .5 - cx) ** 2 + (yy + .5 - cy) ** 2 <= rr * rr) v[yy * G.vw + xx] = 1; };
  for (const e of G.E[team]) { const s = sightOf(e); if (s > 0) stamp(e.x, e.y, s); }
  if (team === 1) { for (const r of G.reveal) if (G.t < r.until) stamp(r.x, r.y, r.r); for (let i = 0; i < v.length; i++) if (v[i]) G.seen[i] = 1; G.visStamp = (G.visStamp || 0) + 1; }
}
function visAt(team, x, y) { const cx = Math.floor(x / 8), cy = Math.floor(y / 8); return cx >= 0 && cy >= 0 && cx < G.vw && cy < G.vh && G.vis[team][cy * G.vw + cx] === 1; }
function camo(sq) { return sq.ut.camo && G.t - sq.moveT > 2 && G.t - sq.fireT > 3; }
/* summer: a soldier in tall grass or wheat is hidden like a sniper while his squad holds fire */
function inGrass(m) { const h = G.map.hide; if (!h || G.t - m.sq.fireT <= 3) return false; const [cx, cy] = cellOf(G.map, m.x, m.y); return h[cy * G.map.cw + cx] === 1; }
function canSee(team, e) {
  if (G.demo) return true;
  if (e.cls === 'inf' && (camo(e.sq) || inGrass(e))) { const g = !camo(e.sq), r = G.teams[team].tech.has('optics') ? (g ? 70 : 62) : (g ? 50 : 42); for (const o of G.E[team]) if (o.cls !== 'bld' && dist(o.x, o.y, e.x, e.y) < r) return true; return false; }
  return visAt(team, e.x, e.y);
}
function coverAt(e, ax, ay) {
  if (e.cls !== 'inf') return 0;
  const m = G.map, [ox, oy] = cellOf(m, e.x, e.y); let c = m.omni[oy * m.cw + ox];
  const dx = ax - e.x, dy = ay - e.y, L = hyp(dx, dy) || 1, ux = dx / L, uy = dy / L;
  for (const k of [3, 6, 9]) { const cx = Math.floor((e.x + ux * k) / 3), cy = Math.floor((e.y - 1 + uy * k) / 3); if (cx < 0 || cy < 0 || cx >= m.cmW || cy >= m.cmH) continue; const v = m.cmask[cy * m.cmW + cx]; if (v > c) c = v; if (c === 2) break; }
  return c;
}
function armorOf(e, ax, ay) {
  const arm = e.ut.armor, k = G.teams[e.team].tech.has('armor') ? 1.1 : 1;
  if (e.cls === 'air') return arm[0] * k;
  const d = Math.abs(angDiff(Math.atan2(ay - e.y, ax - e.x), e.ang));
  return arm[d < .9 ? 0 : d > 2.2 ? 2 : 1] * k;
}

/* ---------------------------------------------------------------- movement */
function orderMove(u, x, y, mode) {
  if (u.kind === 'air') { u.dest = [clamp(x, 6, G.map.W - 6), clamp(y, 6, G.map.H - 6)]; u.mode = mode || 'move'; return true; }
  const veh = u.kind === 'veh', [cx, cy] = unitPos(u);
  const p = findPath(G.map, veh ? (u.ut.sea ? 'sea' : true) : false, cx, cy, x, y);
  if (!p) return false;
  u.path = p; u.mode = mode || 'move'; u.dest = [x, y];
  if (veh) { u.pi = 1; return true; }
  const live = u.members.filter(m => !m.dead), end = p[p.length - 1];
  live.forEach((m, i) => { const sl = SLOTS[i % SLOTS.length]; let gx = end[0] + sl[0], gy = end[1] + sl[1]; if (!walkable(G.map, false, gx, gy)) { gx = end[0]; gy = end[1]; } m.goal = [gx, gy]; m.pi = 1; m.arrived = false; });
  return true;
}
function stopUnit(u) {
  u.path = null; u.mode = null; u.focus = null; u.ground = null; u.gren = null; u.order = null;
  if (u.kind === 'squad') { u.working = false; for (const m of u.members) { m.arrived = true; m.goal = null; } }
  if (u.kind === 'air' || (u.ut && u.ut.sea)) { u.dest = null; u.task = null; }
}
function moveSoldier(m, u, dt, mul) {
  if (m.arrived || !u.path) { m.moving = false; return; }
  const path = u.path; let tx, ty, final = false;
  if (m.pi < path.length - 1) { tx = path[m.pi][0]; ty = path[m.pi][1]; if (dist(m.x, m.y, tx, ty) < 6) { m.pi++; return; } }
  else { tx = m.goal[0]; ty = m.goal[1]; final = true; }
  const d = dist(m.x, m.y, tx, ty);
  if (final && d < 1.2) { m.arrived = true; m.moving = false; return; }
  const [cx, cy] = cellOf(G.map, m.x, m.y); let slow = G.map.slowI[cy * G.map.cw + cx];
  if (slow > 1 && G.teams[u.team].tech.has('winter')) slow = 1 + (slow - 1) * .4;
  const sp = u.ut.speed / slow * mul * (m.hp < m.max * .4 ? .85 : 1);
  const stp = Math.min(d, sp * dt), nx = m.x + (tx - m.x) / d * stp, ny = m.y + (ty - m.y) / d * stp;
  if (walkable(G.map, false, nx, ny)) { m.x = nx; m.y = ny; } else if (walkable(G.map, false, nx, m.y)) m.x = nx; else if (walkable(G.map, false, m.x, ny)) m.y = ny;
  else { m.pi++; if (final) { m.arrived = true; } }
  m.moving = true; m.walk += stp;
  if (Math.abs(tx - m.x) > .4) m.face = tx > m.x ? 1 : -1;
  if (m.walk - m.lastFoot > 2.6) { m.lastFoot = m.walk; footprint(m.x + (m.walk % 5.2 < 2.6 ? -1 : 1), m.y + 1); }
}
function footprint(x, y) {
  x = Math.round(x); y = Math.round(y); const map = G.map; if (x < 0 || y < 1 || x >= map.W || y >= map.H) return;
  const i = y * map.W + x, k = map.KIND[i]; if (k !== 0 && k !== 5) return;
  if (k === 5 && !map.season.snow) { decal(x, y, PLOUGH[2]); return; }          // a trampled path through wheat, ploughland or stubble
  decal(x, y, map.S[Math.min(map.SIDX[i] + 2, 6)]);
  if (map.KIND[i - map.W] === 0 || map.KIND[i - map.W] === 5) decal(x, y - 1, map.S[Math.max(map.SIDX[i - map.W] - 1, 0)]);
}
function decal(x, y, c, w = 1, h = 1) { const s = css(c); G.map.gctx.fillStyle = s; G.map.gctx.fillRect(x, y, w, h); G.map.cctx.fillStyle = s; G.map.cctx.fillRect(x, y, w, h); }

/* ---------------------------------------------------------------- squads */
function addSup(sq, amt) { if (sq.retreat) amt *= .3; if (sq.charge > G.t) amt *= .25; sq.sup = Math.min(100, sq.sup + amt); sq.supT = G.t; sq.lastCombat = G.t; }
function distToEnt(x, y, e) { if (e.cls === 'bld') { const f = e.foot, dx = Math.max(f[0] - x, 0, x - f[2]), dy = Math.max(f[1] - y, 0, y - f[3]); return hyp(dx, dy); } return dist(x, y, e.x, e.y); }
function approachPoint(e, x, y) { if (e.cls !== 'bld') return [e.x + (x > e.x ? 10 : -10), e.y + 4]; const f = e.foot; return [clamp(x, f[0] - 7, f[2] + 7), clamp(y, f[1] - 7, f[3] + 8)]; }
function updateSquad(u, dt) {
  const live = u.members.filter(m => !m.dead);
  if (!live.length) { if (!u.gone) { u.gone = true; G.sel.delete(u); if (u.team === 1 && !G.demo) hooks.toast(t('m_unitLost', { u: t('u_' + u.type) }), 'bad'); } return; }
  if (u.chute) { if (G.t < u.chute.until) return; u.chute = null; u.moveT = G.t; }      // step 7: still coming down on parachutes
  if (u.aboard) return;                       // riding in a boat or a helicopter
  const [cx, cy] = unitPos(u), T = G.teams[u.team], chg = u.charge > G.t;
  if (G.t - u.supT > 1.2) u.sup = Math.max(0, u.sup - (u.retreat ? 30 : 13) * dt);
  if (!u.pinned && u.sup >= 80) { u.pinned = true; u.pinT = G.t; } else if (u.pinned && u.sup < 45) u.pinned = false;
  if (chg) u.pinned = false;                  // a charging squad does not go to ground
  if (u.retreat) {
    // back to the nearest of our bases: the HQ or a forward base
    let rb = u.retreatTo && !u.retreatTo.dead ? u.retreatTo : null; if (!rb) { rb = nearBase(u.team, cx, cy); u.retreatTo = rb; u.repath = 0; }
    if (!rb) u.retreat = false;
    else if (dist(cx, cy, rb.x, rb.by) < 64) { u.retreat = false; u.retreatTo = null; stopUnit(u); }
    else if (!u.path && G.t > (u.repath || 0)) { u.repath = G.t + 1.5; const [rx, ry] = retreatSpot(rb, u.team); orderMove(u, rx, ry, 'move'); }
  }
  if (G.t - u.lastCombat > 4 && nearBase(u.team, cx, cy, 90)) for (const m of live) m.hp = Math.min(m.max, m.hp + 12 * dt);
  else if (T.tech.has('medics') && G.t - u.lastCombat > 6) for (const m of live) m.hp = Math.min(m.max, m.hp + 3 * dt);      // the infantry army's field medics
  if (u.mode === 'attack') {
    const f = u.focus;
    if (!f || f.dead) { u.mode = null; u.focus = null; }
    else { const rng = WT[live[0].w].rng, d = dist(cx, cy, f.x, f.y);
      if (d > rng * .85 || !canSee(u.team, f)) { if (!u.path || G.t > (u.repath || 0)) { u.repath = G.t + 1.5; orderMove(u, f.x, f.y, 'attack'); u.focus = f; } }
      else if (u.path) { u.path = null; for (const m of live) m.arrived = true; } }
  }
  if (u.gren) {
    const d = dist(cx, cy, u.gren[0], u.gren[1]);
    if (d <= 62) { let best = live[0], bd = 1e9; for (const m of live) { const dd = dist(m.x, m.y, u.gren[0], u.gren[1]); if (dd < bd) { bd = dd; best = m; } } throwGrenade(best, u.gren[0], u.gren[1]); u.gren = null; u.path = null; for (const m of live) m.arrived = true; }
    else if (!u.path) orderMove(u, u.gren[0], u.gren[1], 'move');
  }
  if (u.order && u.order.type === 'board') { u.working = false; boardTick(u, live, dt); }
  else if (u.order) engineerWork(u, live, dt); else u.working = false;
  const supp = u.sup >= 40 && !u.retreat && !chg, canMove = !u.pinned || u.retreat, hold = u.mode === 'amove' && live.some(m => m.target);
  if (u.path && canMove && !hold) {
    const mul = (u.retreat ? 1.35 : 1) * (supp ? .55 : 1) * (chg ? 1.35 : 1);
    for (const m of live) moveSoldier(m, u, dt, mul);
    if (live.every(m => m.arrived)) { u.path = null; if (u.mode !== 'attack') u.mode = null; }
  } else for (const m of live) m.moving = false;
  if (live.some(m => m.moving)) u.moveT = G.t;
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy);
    if (d < 4.5 && d > .01) { const p = (4.5 - d) * .5 * Math.min(1, dt * 8), ax = a.x - dx / d * p, ay = a.y - dy / d * p, bx = b.x + dx / d * p, by = b.y + dy / d * p; if (walkable(G.map, false, ax, ay)) { a.x = ax; a.y = ay; } if (walkable(G.map, false, bx, by)) { b.x = bx; b.y = by; } }
  }
  for (const m of live) { soldierCombat(m, u, dt); m.kneel = !m.moving && (G.t - u.lastCombat < 10 || G.t - u.moveT > 3); }
}
function engineerWork(u, live, dt) {
  const o = u.order, tg = o.target;
  const [cx, cy] = unitPos(u);
  if (!tg || tg.dead || (o.type === 'build' && tg.built >= 1) || (o.type === 'repair' && (tg.hp >= tg.max || (tg.cls === 'bld' && tg.built < 1)))) {
    let next = null, bd = 160;
    for (const b of G.blds) if (b.team === u.team && b.built < 1 && !b.auto && !b.dead) { const d = distToEnt(cx, cy, b); if (d < bd) { bd = d; next = b; } }
    u.order = next ? { type: 'build', target: next } : null; u.working = false; return;
  }
  if (distToEnt(cx, cy, tg) > 16) {
    u.working = false;
    if (!u.path && G.t > (u.repath || 0)) { u.repath = G.t + 2; const p = approachPoint(tg, cx, cy); orderMove(u, p[0], p[1], 'move'); }
    return;
  }
  if (u.path) { u.path = null; for (const m of live) m.arrived = true; }
  u.working = true;
  const n = Math.min(4, live.length);
  if (o.type === 'build') { const rate = dt / tg.bt.time * n / 2 * campBuildK(tg); tg.built = Math.min(1, tg.built + rate); tg.hp = Math.min(tg.max, tg.hp + tg.max * rate * .92); if (tg.built >= 1) finishBld(tg); }
  else tg.hp = Math.min(tg.max, tg.hp + 7 * n * dt);
  for (const m of live) { m.face = tg.x >= m.x ? 1 : -1; m.moving = false; }
  if (RND() < dt * 7) { const f = tg.cls === 'bld' ? tg.foot : [tg.x - 6, tg.y - 6, tg.x + 6, tg.y]; G.parts.push(P('spark', rand(f[0], f[2]), rand(f[1], f[3]) - 2, rand(-14, 14), rand(-18, -6), rand(.15, .35))); if (o.type === 'build') G.parts.push(P('debris', rand(f[0], f[2]), f[3], rand(-10, 10), rand(-4, 4), 2, { pal: WOOD[1], z: 3, vz: rand(15, 35) })); hooks.sfx('hammer', tg.x, tg.y); }
}
function pickTarget(team, px, py, W, focus) {
  let best = null, bs = -1e9;
  for (const e of G.E[3 - team]) {
    const eff = W.vs[e.cls] || 0; if (eff < .05) continue;
    const d = dist(px, py, e.x, e.y); if (d > W.rng || (W.min && d < W.min)) continue;
    if (!canSee(team, e)) continue;
    let s = -d + eff * 70;
    if (focus) { if (e === focus) s += 2000; else if (focus.cls === 'inf' && e.cls === 'inf' && e.sq === focus.sq) s += 1500; }
    if (W.prefer && e.cls === W.prefer) s += 160;
    if (W.airFirst && e.cls === 'air') s += 320;
    if (e.cls === 'bld') s -= 140;
    if (s > bs) { bs = s; best = e; }
  }
  return best;
}
function soldierCombat(m, u, dt) {
  const W = WT[m.w]; m.reload -= dt;
  if (u.retreat || u.working) { m.target = null; return; }
  if (W.setup) { if (m.moving) { m.setup = 0; m.target = null; return; } if (m.setup < W.setup) { m.setup += dt; return; } }
  if (W.indirect) {
    if (m.reload > 0) return;
    let tx, ty;
    if (u.ground) { tx = u.ground[0]; ty = u.ground[1]; const d = dist(m.x, m.y, tx, ty); if (d > W.rng || d < W.min) return; }
    else { if (G.t >= m.tgtT) { m.tgtT = G.t + .5; m.target = pickTarget(m.team, m.x, m.y, W, u.focus); } if (!m.target || m.target.dead) return; tx = m.target.x; ty = m.target.y; }
    m.face = tx >= m.x ? 1 : -1;
    fireIndirect(m, m, W, tx, ty, m.x + m.face * 2, m.y - 6); u.fireT = G.t; u.lastCombat = G.t; return;
  }
  if (G.t >= m.tgtT) { m.tgtT = G.t + .3 + rand(0, .25); m.target = pickTarget(m.team, m.x, m.y, W, u.focus); }
  const tg = m.target; if (tg && (tg.dead || tg.crash || dist(m.x, m.y, tg.x, tg.y) > W.rng + 6)) m.target = null;
  if (m.target && m.reload <= 0) {
    if (u.pinned && RND() < .5) { m.reload = .5; return; }
    m.face = m.target.x >= m.x ? 1 : -1;
    const [mx, my] = muzzleOf(m); shoot(m, m, W, m.target, mx, my); u.fireT = G.t; u.lastCombat = G.t;
  }
}
function muzzleOf(m) { const fr = soldierFrame(m); return [Math.round(m.x + fr.mx / RS), Math.round(m.y + 1 + fr.my / RS)]; }
function setReload(slot, W, owner) {
  if (W.burst) { slot.burst = (slot.burst || 0) + 1; if (slot.burst >= W.burst) { slot.burst = 0; slot.reload = W.pause; } else slot.reload = W.rof; }
  else slot.reload = rand(W.rof[0], W.rof[1]);
  slot.reload *= 1 - .06 * unitOf(owner).vet.lvl;
  if (owner.blitz > G.t) slot.reload *= .7;           // step 7: a tank breakthrough fires faster
}
function shoot(owner, slot, W, tg, mx, my) {
  const team = owner.team, d = dist(owner.x, owner.y, tg.x, tg.y), ou = unitOf(owner);
  setReload(slot, W, owner); owner.fireT = G.t; ou.lastCombat = G.t; if (owner.wp && slot === owner.wp[0]) owner.mainT = G.t;
  const cv = coverAt(tg, owner.x, owner.y);
  if (tg.cls === 'inf') addSup(tg.sq, W.sup * COVER_SUP[cv]);
  let acc = lerp(W.acc[0], W.acc[1], clamp(d / W.rng, 0, 1));
  if (owner.cls === 'inf') { if (owner.moving) acc *= ou.charge > G.t ? .8 : .55; if (ou.pinned) acc *= .4; else if (ou.sup >= 40) acc *= .7; }
  else if (owner.cls === 'veh' && owner.moving) acc *= owner.blitz > G.t ? .9 : .75; else if (owner.cls === 'air') acc *= .85;
  if (tg.cls === 'inf') { acc *= COVER_HIT[cv]; if (tg.moving) acc -= .06; }
  else if (tg.cls === 'veh') { acc += .12; if (tg.moving) acc -= .1; }
  else if (tg.cls === 'bld') acc += .3;
  acc *= 1 + .06 * ou.vet.lvl; if (aiBoost(team)) acc *= G.diff.acc;
  const hit = RND() < acc, aimY = tg.cls === 'air' ? tg.y - tg.alt : tg.y - (tg.cls === 'inf' ? 4 : tg.cls === 'bld' ? 6 : 3);
  const tx = tg.x + (hit ? rand(-1, 1) : rand(-7, 7)), ty = aimY + (hit ? rand(-1, 1) : rand(-5, 5));
  G.projs.push({ fx: W.fx, W, x0: mx, y0: my, x1: tx, y1: ty, t0: G.t, dur: Math.max(.04, d / (W.speed || 620)), team, hit, tg, src: owner, air: tg.cls === 'air' });
  if (W.fx === 'rocket') for (let i = 0; i < 3; i++) G.parts.push(P('smoke', mx + rand(-1, 1), my + rand(-1, 1), rand(-4, 4), rand(-6, 0), rand(.5, .9), { r0: 1, r1: rand(2, 3), a0: .7, pal: SMOKE_ROCKET }));
  if (W.casings && RND() < .6) G.parts.push(P('debris', owner.x + (owner.face || 1) * -1, owner.y - 4, rand(-12, 12) - (owner.face || 1) * 8, rand(-4, 4), 1, { pal: BRASS, z: 4, vz: rand(20, 40) }));
  if (G.def.light === 'night' || W.fx === 'shell') G.flashes.push({ x: mx, y: my, t0: G.t, dur: W.fx === 'shell' ? .12 : .07, r: W.fx === 'shell' ? 50 : 18 });
  if (W.fx === 'shell') for (let i = 0; i < 8; i++) G.parts.push(P('smoke', mx + rand(-2, 2), my + rand(-2, 2), rand(-8, 8), rand(-12, -2), rand(1, 1.8), { r0: 1, r1: rand(2.5, 4), a0: .85, pal: SMOKE_GREY }));
  hooks.sfx(W.snd, owner.x, owner.y);
}
function fireIndirect(owner, slot, W, tx, ty, mx, my) {
  const d = dist(owner.x, owner.y, tx, ty), vet = unitOf(owner).vet.lvl;
  const sc = lerp(W.scatter[0], W.scatter[1], clamp(d / W.rng, 0, 1)) * (aiBoost(owner.team) ? 1.1 / G.diff.acc : 1) * (1 - .1 * vet);
  const a = rand(0, TAU), r = Math.sqrt(RND()) * sc;
  setReload(slot, W, owner); owner.fireT = G.t; if (owner.wp && slot === owner.wp[0]) owner.mainT = G.t;
  G.projs.push({ fx: 'arc', W, x0: mx, y0: my, x1: tx + Math.cos(a) * r, y1: ty + Math.sin(a) * r * .7, t0: G.t, dur: .9 + d / 260, team: owner.team, src: owner, apex: 40 + d * .35 });
  for (let i = 0; i < 5; i++) G.parts.push(P('smoke', mx + rand(-1, 1), my, rand(-4, 4), rand(-14, -6), rand(.8, 1.4), { r0: .8, r1: rand(2, 3), a0: .8, pal: SMOKE_GREY }));
  hooks.sfx(W.snd, owner.x, owner.y);
}
function throwGrenade(m, x, y) {
  if (m.team === 1) G.teams[1].res.mu -= 25;
  m.sq.grenT = G.t + 15; m.sq.lastCombat = G.t; m.face = x >= m.x ? 1 : -1;
  G.projs.push({ fx: 'gren', W: WT.grenade, x0: m.x, y0: m.y - 6, x1: x + rand(-3, 3), y1: y + rand(-3, 3), t0: G.t, dur: .95, team: m.team, src: m, apex: 22 });
}

/* ---------------------------------------------------------------- damage */
function credit(src, dmg, killed, e) {
  if (!src) return; const u = unitOf(src); if (!u.vet) return;
  u.vet.xp += dmg / 10 + (killed ? (e.cls === 'inf' ? 10 : e.cls === 'bld' ? 20 : 40) : 0);
  const lvl = u.vet.xp >= 320 ? 3 : u.vet.xp >= 160 ? 2 : u.vet.xp >= 60 ? 1 : 0;
  if (lvl > u.vet.lvl) { u.vet.lvl = lvl; if (u.team === 1 && !G.demo) hooks.ping(unitPos(u)[0], unitPos(u)[1], [255, 214, 120]); }
}
function applyDamage(e, W, src, mult, fx, fy) {
  if (e.dead || e.crash) return 0;
  if (e.team === 1 && src && src.team === 2 && !G.demo) hooks.alert(e.x, e.y);
  let dmg = W.dmg * (W.vs[e.cls] || 0) * (mult == null ? 1 : mult);
  if (src && aiBoost(src.team)) dmg *= G.diff.dmg;
  if (e.cls === 'inf') { if (e.sq.retreat) dmg *= .6; dmg *= 1 - .05 * e.sq.vet.lvl; if (G.teams[e.team].tech.has('vests')) dmg *= .85; if (src) dmg *= COVER_DMG[coverAt(e, src.x, src.y)]; }
  else if (e.cls === 'veh' || e.cls === 'air') {
    const ax = fx != null ? fx : src ? src.x : e.x + 1, ay = fy != null ? fy : src ? src.y : e.y;
    const pen = (W.pen || 0) * (W.fx === 'shell' && src && G.teams[src.team] && G.teams[src.team].tech.has('apds') ? 1.25 : 1);      // the tank army's sabot rounds
    if (RND() > clamp(pen / armorOf(e, ax, ay), .04, 1)) { deflect(e); return 0; }
    dmg *= 1 - .05 * e.vet.lvl;
  }
  if (dmg <= 0) return 0;
  e.hp -= dmg; unitOf(e).lastCombat = G.t;
  if (e.team === 1 && !G.demo && G.t - G.teams[1].alertT > 14) { G.teams[1].alertT = G.t; const isHQ = e.cls === 'bld' && e.type === 'hq'; hooks.toast(t(isHQ ? 'm_hqAttack' : 'm_attack'), 'bad'); hooks.ping(e.x, e.y, [255, 80, 70]); hooks.sfx('alert'); }
  const killed = e.hp <= 0;
  credit(src, dmg, killed, e);
  if (killed) { if (e.cls === 'inf') killSoldier(e, src); else if (e.cls === 'veh') killVeh(e, src); else if (e.cls === 'air') killAir(e, src); else destroyBld(e, src); }
  return dmg;
}
function deflect(e) { const y = e.cls === 'air' ? e.y - e.alt : e.y - 4; for (let i = 0; i < 4; i++) G.parts.push(P('spark', e.x + rand(-4, 4), y + rand(-3, 3), rand(-40, 40), rand(-40, 10), rand(.1, .25))); hooks.sfx('ricochet', e.x, e.y); }
function lose(team, n) { G.teams[team].tickets = Math.max(0, G.teams[team].tickets - n); }
function killSoldier(e, src) {
  e.dead = true; e.deathT = G.t; e.moving = false;
  let kx = rand(-1, 1), ky = rand(-1, 1); if (src) { kx = e.x - src.x; ky = e.y - src.y; }
  const n = hyp(kx, ky) || 1, k = src && src.blast ? 5.5 : 2.5; e.knock = [e.x, e.y, kx / n * k, ky / n * k * .7];
  lose(e.team, 1); G.teams[e.team].stats.lost++; G.teams[3 - e.team].stats.kills++;
}
function killVeh(u, src) {
  if (u.ut.sea) { sinkBoat(u, src); return; }
  u.dead = true; u.deathT = G.t; G.sel.delete(u);
  explode(u.x, u.y - 3, WT.burn, null, 0, { size: 1.3, kind: 'veh' });
  const di = ((Math.round(u.ang / (TAU / 16)) % 16) + 16) % 16, wr = VWRECK[u.body][u.team][di], S = VBODY[u.body].S;
  addDecal(wr, u.x - S / 2, u.y - S / 2);
  G.fires.push({ x: u.x, y: u.y - 4, w: 8, h: 8, seed: u.id, until: G.t + 40 });
  G.emitters.push({ x: u.x, y: u.y - 6, w: 6, rate: 12, kind: 'smoke', pal: SMOKE_BLACK, vy: [-17, -10], r: [1.5, 3.6, 5], life: [4, 5.5], a0: 1, acc: 0, until: G.t + 40 });
  G.lights.push({ x: u.x, y: u.y - 4, r: 46, s: 1.1, fire: true, until: G.t + 40 });
  lose(u.team, 6); G.teams[u.team].stats.lost++; G.teams[3 - u.team].stats.kills++;
  if (!G.demo) hooks.toast(u.team === 1 ? t('m_unitLost', { u: t('u_' + u.type) }) : t('m_enemyDown', { u: t('u_' + u.type) }), u.team === 1 ? 'bad' : 'good');
}
function killAir(u, src) {
  u.crash = { t0: G.t, spin: rand(4, 7) * (RND() < .5 ? -1 : 1) }; G.sel.delete(u); loseCargo(u);
  lose(u.team, 8); G.teams[u.team].stats.lost++; G.teams[3 - u.team].stats.kills++;
  if (!G.demo) hooks.toast(u.team === 1 ? t('m_unitLost', { u: t('u_' + u.type) }) : t('m_enemyDown', { u: t('u_' + u.type) }), u.team === 1 ? 'bad' : 'good');
}
function destroyBld(b, src) {
  b.dead = true; G.sel.delete(b); markFoot(b, false);
  if (b.bt.bridge) clearPontoon(b);
  const f = b.foot, big = !b.bt.small;
  if (big) {
    explode(b.x, b.y, WT.burn, null, 0, { size: 1.2, kind: 'bld' });
    // a destroyed building leaves its ruins from the reference sheets (or its damaged picture if there are none)
    const ruin = hasFrame('ruin_' + b.type), img = ruin ? atlasCv('ruin_' + b.type) : bldSprite(b.type, b.team, G.map.S, true, b.v);
    if (!b.bt.flat) addDecal(img, b.ax - img.width / RS / 2, b.by + 1 - img.height / RS, ruin ? 1 : .85);
    for (let i = 0; i < (f[2] - f[0]) * 2; i++) decal(Math.round(rand(f[0] - 4, f[2] + 4)), Math.round(rand(f[1], f[3] + 5)), pick([WOOD[3], WOOD[4], SMOKE[1], SMOKE[2]]));
    G.fires.push({ x: b.x, y: b.y + 2, w: 12, h: 9, seed: b.id, until: G.t + 30 });
    G.emitters.push({ x: b.x, y: b.y - 4, w: 12, rate: 10, kind: 'smoke', pal: SMOKE_BLACK, vy: [-16, -9], r: [1.5, 4, 6], life: [4, 5.5], a0: 1, acc: 0, until: G.t + 30 });
    G.lights.push({ x: b.x, y: b.y, r: 50, s: 1.2, fire: true, until: G.t + 30 });
    lose(b.team, b.type === 'hq' ? 0 : 10);
    if (!G.demo && b.type !== 'hq') hooks.toast(b.team === 1 ? t('m_unitLost', { u: t('b_' + b.type) }) : t('m_enemyDown', { u: t('b_' + b.type) }), b.team === 1 ? 'bad' : 'good');
  } else for (let i = 0; i < 6; i++) G.parts.push(P('debris', rand(f[0], f[2]), f[3], rand(-20, 20), rand(-8, 8), 2, { pal: WOOD[3], z: 2, vz: rand(20, 40) }));
}
function explode(x, y, W, src, team, opt) {
  opt = opt || {};
  const r = W.splash || 10, size = opt.size || clamp(r / 13, .45, 1.4);
  for (const tm of [1, 2]) {
    if (tm === team) continue;
    for (const e of G.E[tm]) {
      if (e === opt.skip || e.dead || e.crash) continue;
      if (e.cls === 'air' && e.alt > 6) continue;
      const d = dist(x, y, e.x, e.y); if (d > r + (e.cls === 'bld' ? 12 : 0)) continue;
      const f = Math.pow(1 - Math.min(1, d / (r + 1)), .6);
      if (e.cls === 'inf') { const cv = coverAt(e, x, y); applyDamage(e, W, src ? Object.assign({}, src, { x, y, blast: true }) : { x, y, team: 3 - tm, blast: true, cls: 'none' }, f * [1, .85, .6][cv]); if (!e.dead) addSup(e.sq, (W.sup || 10) * f); }
      else if (e.cls === 'veh') { if (d < r * .7) applyDamage(e, W, src, .8, x, y); }
      else if (e.cls === 'bld') applyDamage(e, W, src, Math.max(.3, f));
      else if (e.cls === 'air') applyDamage(e, W, src, f);
    }
  }
  boomFx(x, y, size, opt.kind);
}
function boomFx(x, y, s, kind) {
  for (let i = 0; i < 36 * s; i++) { const a = rand(0, TAU), sp = rand(18, 75) * s; G.parts.push(P('fire', x + rand(-3, 3), y + rand(-3, 3), Math.cos(a) * sp, Math.sin(a) * sp * .7 - 22 * s, rand(.22, .6))); }
  const house = G.map.houses.find(h => x > h.foot[0] - 4 && x < h.foot[2] + 4 && y > h.foot[1] - 14 && y < h.foot[3] + 4);
  const pals = house || kind === 'bld' ? [WOOD[1], WOOD[2], WOOD[3], WOOD[4], SMOKE[1]] : kind === 'veh' ? [STEEL[2], STEEL[3], SMOKE[1], SMOKE[0], WOOD[4]] : [MUD[1], MUD[2], MUD[3], G.map.S[4], SMOKE[1]];
  for (let i = 0; i < 40 * s; i++) { const a = rand(0, TAU), sp = rand(14, 75) * s; G.parts.push(P('debris', x + rand(-6, 6) * s, y + 8 * s + rand(-3, 3), Math.cos(a) * sp, Math.sin(a) * sp * .6 + 6, 3, { pal: pick(pals), z: rand(4, 12) * s, vz: rand(30, 115) * s, sh: RND() < .5 ? 1 : 0 })); }
  for (let i = 0; i < 24 * s; i++) { const a = rand(0, TAU), sp = rand(10, 55); G.parts.push(P('snow', x + rand(-8, 8), y + 12 * s + rand(-3, 3), Math.cos(a) * sp, Math.sin(a) * sp * .6, rand(.3, .6), { vz: rand(20, 70) })); }
  for (let i = 0; i < 12 * s; i++) G.parts.push(P('smoke', x + rand(-8, 8) * s, y + rand(-6, 4) * s, rand(-6, 6), rand(-14, -4), rand(2, 3.2), { r0: 2 * s, r1: rand(4.5, 7) * s, a0: 1, pal: house || kind ? SMOKE_BLACK : SMOKE_DIRT }));
  for (let i = 0; i < 12 * s; i++) { const a = rand(0, TAU), sp = rand(26, 48) * s; G.parts.push(P('dust', x + Math.cos(a) * 4, y + 9 * s + Math.sin(a) * 2, Math.cos(a) * sp, Math.sin(a) * sp * .6, rand(1, 1.6), { r0: 2 * s, r1: rand(4, 6.5) * s, a0: .8, pal: G.map.dust })); }
  const gy = y + 8 * s, R = 7 * s, m = G.map;
  for (let yy = Math.floor(gy - 8 * s); yy < gy + 10 * s; yy++) for (let xx = Math.floor(x - 13 * s); xx < x + 14 * s; xx++) {
    if (xx < 0 || yy < 0 || xx >= m.W || yy >= m.H) continue; const i = yy * m.W + xx, k = m.KIND[i]; if (k === 3 || k === 4) continue;
    const dd = hyp((xx - x) / 1.3, yy - gy) + vnoise(xx / 2.5, yy / 2.5, 9) * 3 - 1.5;
    if (dd < R && k !== 1) decal(xx, yy, (dd < R * .55 || bay(xx, yy) < .5) ? SMOKE[1] : SMOKE[2]);
    else if (dd < R * 1.45 && bay(xx, yy) < .4 && k !== 1) decal(xx, yy, m.S[5]);
    if (dd < R * .5 && k === 2) { m.KIND[i] = 3; decal(xx, yy, WATER[1]); const [cx, cy] = cellOf(m, xx, yy); m.walkI[cy * m.cw + cx] = 0; m.walkI0[cy * m.cw + cx] = 0; }
  }
  if (house && !house.broken) breakHouse(house);
  G.blasts.push({ t0: G.t, x, y, s, gy });
  G.flashes.push({ x, y, t0: G.t, dur: .5, r: 70 * s });
  hooks.sfx(s < .7 ? 'grenade' : 'boom', x, y, s);
}
function breakHouse(h) {
  h.broken = true;
  h.img = houseFrame(h, true); G.map.cctx.drawImage(h.img, h.x, h.y, h.w, h.h);
  const hx = h.x + Math.floor(h.w * .44), hy = h.y + h.cm + 5;
  G.fires.push({ x: hx, y: hy + 2, w: 13, h: 10, seed: hx, until: G.t + 60 });
  G.emitters.push({ x: hx, y: hy - 2, w: 10, rate: 14, kind: 'smoke', pal: SMOKE_BLACK, vy: [-17, -10], r: [1.5, 4.2, 6], life: [4, 5.5], a0: 1, acc: 0, until: G.t + 60 });
  G.emitters.push({ x: hx, y: hy - 3, w: 10, rate: 9, kind: 'spark', life: [.4, 1.1], acc: 0, until: G.t + 60 });
  G.lights.push({ x: hx, y: hy + 6, r: 50, s: 1.2, fire: true, until: G.t + 60 });
}
/* bodies, wrecks and ruins stay on the ground at render resolution; the oldest are baked into the terrain */
function addDecal(c, x, y, a) {
  const d = { c, x: snapRS(x), y: snapRS(y), w: c.width / RS, h: c.height / RS, a: a == null ? 1 : a };
  G.decals.push(d); G.map.cctx.drawImage(c, d.x, d.y, d.w, d.h);
  if (G.decals.length > 400) { const o = G.decals.shift(), g = G.map.gctx; g.imageSmoothingEnabled = false; g.globalAlpha = o.a; g.drawImage(o.c, o.x, o.y, o.w, o.h); g.globalAlpha = 1; }
}
function P(kind, x, y, vx, vy, life, o) { return Object.assign({ kind, x, y, z: 0, vx, vy, vz: 0, age: 0, life, r0: 1, r1: 1, a0: 1, pal: null, y0: y, sh: (RND() * 16) | 0 }, o || {}); }

/* ---------------------------------------------------------------- vehicles */
function barrelTip(u, L) { const [px, py] = turretPivot(u), l = L == null ? vgeo(u).bl : L; return [px + Math.cos(u.tur) * l, py + Math.sin(u.tur) * l]; }
function updateVeh(u, dt) {
  if (u.dead) return;
  const ut = u.ut, T = G.teams[u.team], mv = ut.sea ? 'sea' : true;
  if (u.mode === 'attack') {
    const f = u.focus;
    if (!f || f.dead || f.crash) { u.mode = null; u.focus = null; }
    else { const d = dist(u.x, u.y, f.x, f.y), rng = WT[ut.w[0]].rng; if (d < rng * .85 && canSee(u.team, f)) u.path = null; else if (!u.path || G.t > (u.repath || 0)) { u.repath = G.t + 2; orderMove(u, f.x, f.y, 'attack'); u.focus = f; } }
  }
  u.moving = false;
  const hold = u.mode === 'amove' && u.wp[0].target;
  if (u.path && !hold) {
    const wp = u.path[Math.min(u.pi, u.path.length - 1)], d = dist(u.x, u.y, wp[0], wp[1]);
    if (d < 5) { u.pi++; if (u.pi >= u.path.length) { u.path = null; if (u.mode !== 'attack') u.mode = null; } }
    else {
      const bz = u.blitz > G.t ? 1.4 : 1, a = Math.atan2(wp[1] - u.y, wp[0] - u.x), df = angDiff(a, u.ang), turn = (VBODY[u.body].wheeled ? 2.6 : 1.9) * (bz > 1 ? 1.3 : 1);
      u.ang += clamp(df, -turn * dt, turn * dt);
      if (Math.abs(df) < .6) {
        const [gx, gy] = cellOf(G.map, u.x, u.y), sp = ut.speed * bz / slowOf(G.map, mv)[gy * G.map.cw + gx] * (1 - Math.abs(df) * .8) * dt;
        const nx = u.x + Math.cos(u.ang) * sp, ny = u.y + Math.sin(u.ang) * sp;
        if (walkable(G.map, mv, nx, ny)) { u.x = nx; u.y = ny; u.dist += sp; u.moving = true; u.stuck = 0; }
        else { u.stuck += dt; if (u.stuck > .6) { u.stuck = 0; u.pi++; if (u.pi >= u.path.length) u.path = null; } }
      }
    }
  }
  for (const o of G.units) if (o !== u && o.kind === 'veh' && !o.dead && !o.ut.sea === !ut.sea) { const dx = o.x - u.x, dy = o.y - u.y, d = hyp(dx, dy); if (d < 16 && d > .01) { const p = (16 - d) * .5 * dt * 4, nx = u.x - dx / d * p, ny = u.y - dy / d * p; if (walkable(G.map, mv, nx, ny)) { u.x = nx; u.y = ny; } } }
  if (ut.sea) { boatTick(u, dt); for (let i = 0; i < u.wp.length; i++) vehWeapon(u, u.wp[i], i, dt); return; }
  if (u.moving) while (u.lastTrack < u.dist) {
    u.lastTrack += 1.2; const ca = Math.cos(u.ang), sa = Math.sin(u.ang), m = G.map, B = vgeo(u);
    for (const off of B.trk) { const x = Math.round(u.x - sa * off - ca * B.back), y = Math.round(u.y + ca * off - sa * B.back); if (x < 0 || y < 0 || x >= m.W || y >= m.H) continue; const k = m.KIND[y * m.W + x]; if (k === 1) decal(x, y, (x + y) % 3 ? MUD[4] : MUD[3]); else if (k === 5 && !m.season.snow) decal(x, y, PLOUGH[3]); else if (k === 0 || k === 5) decal(x, y, m.S[Math.min(m.SIDX[y * m.W + x] + 2, 6)]); }
  }
  u.exhaust += (u.moving ? 9 : 2) * (u.blitz > G.t ? 2 : 1) * dt;
  while (u.exhaust >= 1) { u.exhaust--; const bx = u.x - Math.cos(u.ang) * 11 + rand(-2, 2), by = u.y - Math.sin(u.ang) * 11; G.parts.push(P('smoke', bx, by, rand(-2, 2), rand(-6, -2), rand(.9, 1.6), { r0: .6, r1: rand(1.6, 2.6), a0: u.moving ? .75 : .5, pal: EXHAUST })); }
  if (u.hp < u.max * .5 && RND() < dt * 6) G.parts.push(P('smoke', u.x + rand(-3, 3), u.y - 6, rand(-2, 2), rand(-14, -8), rand(1.5, 2.5), { r0: 1, r1: rand(2.5, 4), a0: .9, pal: SMOKE_BLACK }));
  if (G.t - u.lastCombat > 8) { if (T.tech.has('armor')) u.hp = Math.min(u.max, u.hp + 4 * dt); if (T.hq && !T.hq.dead && dist(u.x, u.y, T.hq.x, T.hq.by) < 120) u.hp = Math.min(u.max, u.hp + 10 * dt); }
  for (let i = 0; i < u.wp.length; i++) vehWeapon(u, u.wp[i], i, dt);
}
function vehWeapon(u, s, i, dt) {
  const W = WT[s.k]; s.reload -= dt;
  if (W.indirect) {
    let tx, ty;
    if (u.ground) { tx = u.ground[0]; ty = u.ground[1]; const d = dist(u.x, u.y, tx, ty); if (d > W.rng || d < W.min) return; }
    else { if (G.t >= s.tgtT) { s.tgtT = G.t + .6; s.target = pickTarget(u.team, u.x, u.y, W, u.focus); } if (!s.target || s.target.dead) return; tx = s.target.x; ty = s.target.y; }
    const df = angDiff(Math.atan2(ty - u.y, tx - u.x), u.tur); u.tur += clamp(df, -1.2 * dt, 1.2 * dt);
    if (Math.abs(df) > .1 || s.reload > 0 || u.moving) return;
    const [mx, my] = barrelTip(u); fireIndirect(u, s, W, tx, ty, mx, my); u.lastCombat = G.t; return;
  }
  if (G.t >= s.tgtT) { s.tgtT = G.t + .4; s.target = pickTarget(u.team, u.x, u.y, W, u.focus); }
  const tg = s.target && !s.target.dead && !s.target.crash ? s.target : null;
  if (i === 0) {
    const want = tg ? Math.atan2(tg.y - u.y, tg.x - u.x) : u.ang, df = angDiff(want, u.tur);
    const tr = u.blitz > G.t ? 2.5 : 1.8; u.tur += clamp(df, -tr * dt, tr * dt);
    if (tg && s.reload <= 0 && Math.abs(df) < .08 && dist(u.x, u.y, tg.x, tg.y) <= W.rng) { const [mx, my] = barrelTip(u); shoot(u, s, W, tg, mx, my); }
  } else if (tg && s.reload <= 0) {
    if (!W.coax || Math.abs(angDiff(Math.atan2(tg.y - u.y, tg.x - u.x), u.tur)) < .6) { const [mx, my] = barrelTip(u, 6); shoot(u, s, W, tg, mx, my); }
  }
}

/* ---------------------------------------------------------------- helicopters */
function updateAir(u, dt) {
  const B = HBODY[u.body], ut = u.ut, pad = homePad(u.team, u.x, u.y);
  u.rotor += dt * (u.alt < .5 ? 5 : 38);
  if (u.crash) {
    const c = u.crash, a = G.t - c.t0;
    u.alt = Math.max(0, u.alt - (10 + a * 34) * dt); u.ang += c.spin * dt; u.x += u.vx * dt * .6; u.y += u.vy * dt * .6;
    if (RND() < dt * 30) G.parts.push(P('smoke', u.x + rand(-2, 2), u.y - u.alt, rand(-4, 4), rand(-10, -2), rand(1, 1.8), { r0: 1.5, r1: rand(3, 4.5), a0: 1, pal: SMOKE_BLACK }));
    if (u.alt <= 0) {
      u.dead = true; u.gone = true;
      explode(u.x, u.y, WT.burn, null, 0, { size: 1.2, kind: 'veh' });
      const di = ((Math.round(u.ang / (TAU / 16)) % 16) + 16) % 16, sh = HSPR[u.body][u.team].shadow[di], S = B.S;
      addDecal(sh, u.x - S / 2, u.y - S / 2, .9);
      G.fires.push({ x: u.x, y: u.y - 2, w: 8, h: 7, seed: u.id, until: G.t + 25 });
      G.emitters.push({ x: u.x, y: u.y - 4, w: 6, rate: 10, kind: 'smoke', pal: SMOKE_BLACK, vy: [-16, -9], r: [1.5, 3.5, 5], life: [3.5, 5], a0: 1, acc: 0, until: G.t + 25 });
    }
    return;
  }
  let tx = null, ty = null, face = null;
  if (u.mode === 'attack' && (!u.focus || u.focus.dead || u.focus.crash)) { u.mode = null; u.focus = null; }
  if (u.task && u.task.type === 'rtb') { if (!pad) u.task = null; else { tx = pad.padX; ty = pad.padY; if (dist(u.x, u.y, tx, ty) < 5) u.landing = true; } }
  else if (u.task && u.task.type === 'pickup') {
    const sq = u.task.sq;
    if (!sq || !unitAlive(sq) || sq.aboard || u.cargo) u.task = null;
    else { const [sx, sy] = unitPos(sq); tx = sx; ty = sy - 12; u.task.near = dist(u.x, u.y, tx, ty) < 7; if (u.alt < 1.5 && dist(sx, sy, u.x, u.y) < 22) { embark(sq, u); u.task = null; } }
  }
  else if (u.task && u.task.type === 'unload') {
    tx = u.task.x; ty = u.task.y;
    if (dist(u.x, u.y, tx, ty) < 6 && u.alt < 10) { u.task.hover = (u.task.hover || 0) + dt; if (u.task.hover > (armyOf(u.team) === 'air' ? .65 : 1.3) && u.cargo) { dropSquad(u); if (!u.cargoSq) { u.cargo = false; u.task = { type: 'rtb' }; } else u.task = null; } }
  } else if (u.mode === 'attack' && u.focus) { const W = WT[ut.w[0]], d = dist(u.x, u.y, u.focus.x, u.focus.y); face = u.focus; if (d > W.rng * .75) { tx = u.focus.x; ty = u.focus.y; } }
  else if (u.dest) { tx = u.dest[0]; ty = u.dest[1]; if (dist(u.x, u.y, tx, ty) < 4) u.dest = null; }
  const nearUnload = u.task && u.task.type === 'unload' && tx != null && dist(u.x, u.y, tx, ty) < 9;
  if (u.cargoSq) for (const m of u.cargoSq.members) if (!m.dead) { m.x = u.x; m.y = u.y; }
  const wantAlt = u.task && u.task.type === 'pickup' && u.task.near ? 0 : u.task && u.task.type === 'rtb' && u.landing ? 0 : nearUnload ? 8 : (tx == null && !u.focus && pad && dist(u.x, u.y, pad.padX, pad.padY) < 6 && !u.task && u.alt < 1 ? 0 : B.alt);
  const vz = armyOf(u.team) === 'air' ? 28 : 14; u.alt += clamp(wantAlt - u.alt, -vz * dt, vz * dt);      // step 7: the airmobile army lands and lifts off twice as fast
  let ax, ay;
  if (tx != null && u.alt > 4) { const dx = tx - u.x, dy = ty - u.y, d = hyp(dx, dy) || 1, want = Math.min(ut.speed, d * 1.6); ax = (dx / d * want - u.vx) * 2.2; ay = (dy / d * want - u.vy) * 2.2; }
  else { ax = -u.vx * 2.4; ay = -u.vy * 2.4; }
  for (const o of G.units) if (o !== u && o.kind === 'air' && !o.dead && !o.crash) { const dx = o.x - u.x, dy = o.y - u.y, d = hyp(dx, dy); if (d < 20 && d > .01) { ax -= dx / d * (20 - d) * 6; ay -= dy / d * (20 - d) * 6; } }
  u.vx += ax * dt; u.vy += ay * dt; const sp = hyp(u.vx, u.vy); if (sp > ut.speed) { u.vx *= ut.speed / sp; u.vy *= ut.speed / sp; }
  u.x = clamp(u.x + u.vx * dt, 4, G.map.W - 4); u.y = clamp(u.y + u.vy * dt, 4, G.map.H - 4);
  let wantAng = sp > 6 ? Math.atan2(u.vy, u.vx) : u.ang;
  const t0 = u.wp[0].target;
  if (face) wantAng = Math.atan2(face.y - u.y, face.x - u.x); else if (t0 && !t0.dead && sp < 14) wantAng = Math.atan2(t0.y - u.y, t0.x - u.x);
  u.ang += clamp(angDiff(wantAng, u.ang), -2.4 * dt, 2.4 * dt);
  if (u.alt < .5 && pad && dist(u.x, u.y, pad.padX, pad.padY) < 10) {
    u.hp = Math.min(u.max, u.hp + 40 * dt);
    if (ut.ammo) { u.rearm = (u.rearm || 0) + dt; if (u.rearm > .5 && u.ammo < ut.ammo) { u.rearm = 0; u.ammo++; } }
    if (u.task && u.task.type === 'rtb' && u.hp >= u.max && (!ut.ammo || u.ammo >= ut.ammo)) { u.task = null; u.landing = false; }
  }
  if (u.alt > 10) for (const s of u.wp) airWeapon(u, s, dt);
  if (u.alt > .5 && u.alt < 22 && RND() < dt * 14) { const a = rand(0, TAU), r = rand(6, 14); G.parts.push(P('dust', u.x + Math.cos(a) * r, u.y + Math.sin(a) * r * .6, Math.cos(a) * 30, Math.sin(a) * 18, rand(.5, .9), { r0: 1, r1: rand(2, 3.5), a0: .7, pal: G.map.dust })); }
  if (ut.ammo && u.ammo === 0 && u.team === 1 && !u.ammoWarned && !G.demo) { u.ammoWarned = true; hooks.toast(t('m_ammo'), 'bad'); }
  if (u.ammo > 0) u.ammoWarned = false;
}
function airWeapon(u, s, dt) {
  const W = WT[s.k]; s.reload -= dt;
  if (W.ammo && u.ammo <= 0) return;
  if (G.t >= s.tgtT) { s.tgtT = G.t + .35; s.target = pickTarget(u.team, u.x, u.y, W, u.focus); }
  const tg = s.target; if (!tg || tg.dead || tg.crash || s.reload > 0) return;
  if (W.aim && Math.abs(angDiff(Math.atan2(tg.y - u.y, tg.x - u.x), u.ang)) > W.aim) return;
  const side = W.ammo ? (s.burst % 2 ? 5 : -5) : 0, ca = Math.cos(u.ang), sa = Math.sin(u.ang);
  shoot(u, s, W, tg, u.x + ca * 6 - sa * side, u.y - u.alt + (sa * 6 + ca * side) * .85);
  if (W.ammo) u.ammo--;
}
function dropSquad(u) {
  if (u.cargoSq) { const sq = u.cargoSq; if (landSquad(u, u.x, u.y + 4)) G.ropes.push({ x: u.x, y: u.y, alt: u.alt, t0: G.t, heli: u }); else { sq.aboard = u; u.cargoSq = sq; } return; }
  const sq = spawnType(u.team, 'riflemen', u.x, u.y + 3);
  for (const m of sq.members) { m.x = u.x + rand(-6, 6); m.y = u.y + rand(-2, 5); }
  G.ropes.push({ x: u.x, y: u.y, alt: u.alt, t0: G.t, heli: u });
  if (u.team === 2) sq.ai = { task: null, until: 0 };
  hooks.sfx('order', u.x, u.y);
}

/* ---------------------------------------------------------------- buildings */
function updateBld(b, dt) {
  if (b.dead) return;
  if (b.built < 1) { if (b.auto) { b.built = Math.min(1, b.built + dt / b.bt.time); b.hp = Math.min(b.max, b.hp + b.max * dt / b.bt.time * .92); if (b.built >= 1) finishBld(b); } return; }
  if (b.bt.shop) shopTick(b, dt);
  if (b.queue.length) { const q = b.queue[0]; q.t += dt; if (q.t >= q.total) { b.queue.shift(); produceUnit(b, q.type); } }
  if (b.research) { b.research.t += dt; if (b.research.t >= b.research.total) { const k = b.research.key; b.research = null; applyTech(b.team, k); } }
  if (b.wp) for (const s of b.wp) {
    const W = WT[s.k]; s.reload -= dt;
    if (G.t >= s.tgtT) { s.tgtT = G.t + .4; s.target = pickTarget(b.team, b.x, b.y, W, null); }
    const tg = s.target; if (tg && !tg.dead && !tg.crash && s.reload <= 0) { b.tur = Math.atan2(tg.y - b.y, tg.x - b.x); shoot(b, s, W, tg, b.x + Math.cos(b.tur) * 6, b.y - 6 + Math.sin(b.tur) * 4); }
  }
  if (b.bt.mine) {
    for (const e of G.E[3 - b.team]) if ((e.cls === 'inf' || e.cls === 'veh') && dist(e.x, e.y, b.x, b.y) < 7) { b.dead = true; explode(b.x, b.y, WT.mine, b, b.team, { size: .8 }); break; }
  }
  if (b.hp < b.max * .5 && !b.bt.small && RND() < dt * 4) G.parts.push(P('smoke', b.x + rand(-8, 8), b.y - 6, rand(-2, 2), rand(-14, -8), rand(1.5, 2.5), { r0: 1, r1: rand(2.5, 4), a0: .9, pal: SMOKE_BLACK }));
}
function finishBld(b) {
  b.built = 1; b.hp = Math.max(b.hp, b.max * .9);
  if (b.bt.bridge) markFoot(b, true);
  if (b.team === 1 && !G.demo && !b.bt.small) { hooks.toast(t('m_built', { b: t('b_' + b.type) }), 'good'); hooks.sfx('built'); }
  recalcSupply(b.team);
}
function produceUnit(b, type) {
  // new units step out of a side of the building and head toward the front, the same for both sides
  const ut = UT[type], team = b.team, fwd = team === 1 ? 1 : -1, f = b.bt.foot, side = RND() < .5 ? -1 : 1;
  let x = ut.cls === 'air' ? b.padX : b.ax + side * (f[0] + 8), y = ut.cls === 'air' ? b.padY : b.by - f[1] / 2;
  if (ut.sea && b.water) { x = b.water[0]; y = b.water[1]; }          // boats are launched at the end of the dock's pier
  const u = spawnType(team, type, x, y);
  G.teams[team].stats.made++;
  if (ut.cls === 'veh' && !ut.sea && G.teams[team].tech.has('crews')) u.vet = { xp: 60, lvl: 1 };      // the tank army's veteran crews
  campNewUnit(u);                                                                                     // step 8: the campaign's training upgrades
  if (team === 2) u.ai = { task: null, until: 0 };
  if (ut.cls === 'air') { u.x = b.padX; u.y = b.padY; if (b.rally) orderMove(u, b.rally[0], b.rally[1]); else u.dest = [b.padX, b.padY - 18 * fwd]; }
  else if (b.rally) orderMove(u, b.rally[0], b.rally[1]);
  else if (!ut.sea) orderMove(u, x + side * rand(4, 16), y - fwd * rand(26, 34));
  if (team === 1 && !G.demo) { hooks.toast(t('m_ready', { u: t('u_' + type) }), 'good'); hooks.sfx('ready'); }
}
function applyTech(team, key) {
  const T = G.teams[team]; T.tech.add(key);
  if (key === 'lmg') for (const u of G.units) if (u.team === team && u.type === 'riflemen' && u.kind === 'squad') { const m = u.members.find(mm => !mm.dead); if (m) m.w = 'lmg'; }
  if (key === 'armor') for (const u of G.units) if (u.team === team && u.kind === 'veh') { u.max *= 1.15; u.hp *= 1.15; }
  if (key === 'heliarmor') for (const u of G.units) if (u.team === team && u.kind === 'air' && !u.crash) { u.max *= 1.2; u.hp *= 1.2; }
  if (team === 1 && !G.demo && !G.quiet) { hooks.toast(t('m_research', { r: t('r_' + key) }), 'good'); hooks.sfx('capture'); }
}

/* ---------------------------------------------------------------- economy */
function economy(dt) {
  for (const team of [1, 2]) {
    const T = G.teams[team], n = { vp: 0, tw: 0, mp: 0, mu: 0, fu: 0 };
    for (const p of G.map.points) if (p.owner === team) n[p.type]++;
    const k = (aiBoost(team) ? G.diff.eco : 1) * campInc(team);      // step 8: the campaign's towns and the enemy's growth
    // a town counts as a key point and also brings manpower, munitions and fuel of its own
    T.inc.mp = (2.4 + 2.0 * n.mp + .6 * (n.vp + n.tw) + .3 * (n.mu + n.fu) + 1.4 * n.tw) * k; T.inc.mu = (.5 + 1.1 * n.mu + .2 * (n.vp + n.tw) + .6 * n.tw) * k; T.inc.fu = (.4 + 1.0 * n.fu + .2 * (n.vp + n.tw) + .5 * n.tw) * k;
    for (const r of ['mp', 'mu', 'fu']) T.res[r] = Math.min(1500, T.res[r] + T.inc[r] * dt);
  }
  G.supT -= dt; if (G.supT <= 0) { G.supT = .5; recalcSupply(1); recalcSupply(2); }
}
function recalcSupply(team) {
  const T = G.teams[team]; let used = 0;
  for (const u of G.units) if (u.team === team && unitAlive(u)) used += u.ut.sup + (u.cargo && !u.cargoSq ? UT.riflemen.sup : 0);
  for (const b of G.blds) if (b.team === team && !b.dead) for (const q of b.queue) used += UT[q.type].sup;
  for (const d of G.drops || []) if (d.team === team) used += d.n * UT.riflemen.sup;      // paratroopers on their way
  T.used = used; T.cap = Math.min(120, 40 + 20 * bldOf(team, 'depot', true).length) + campCap(team);
}
function captureTick(dt) {
  for (const p of G.map.points) {
    let a = 0, e = 0;
    for (const u of G.units) { if (u.kind !== 'squad' || u.retreat || u.aboard || u.chute) continue; if (u.members.some(m => !m.dead && m.x > p.x0 && m.x < p.x1 && m.y > p.y0 && m.y < p.y1)) { if (u.team === 1) a++; else e++; } }
    const before = p.owner, rate = .1;
    if (a && !e) p.prog = Math.min(1, p.prog + rate * (1 + .5 * (Math.min(a, 3) - 1)) * capK(1) * dt);
    else if (e && !a) p.prog = Math.max(-1, p.prog - rate * (1 + .5 * (Math.min(e, 3) - 1)) * capK(2) * dt);
    if (p.prog >= 1) p.owner = 1; else if (p.prog <= -1) p.owner = 2; else if ((p.owner === 1 && p.prog <= 0) || (p.owner === 2 && p.prog >= 0)) p.owner = 0;
    if (p.owner !== before && !G.demo) {
      const name = isKey(p) ? p.id : t('pt_' + p.type);
      if (p.owner === 1) { hooks.toast(p.type === 'tw' ? t('m_townCaptured', { p: name }) : p.type === 'vp' ? t('m_captured', { p: name }) : t('m_secCaptured', { p: name }), 'good'); hooks.sfx('capture'); hooks.ping(p.cx, p.cy, [130, 180, 255]); }
      if (before === 1) { hooks.toast(p.type === 'tw' ? t('m_townLost', { p: name }) : p.type === 'vp' ? t('m_lost', { p: name }) : t('m_secLost', { p: name }), 'bad'); hooks.sfx('lost'); hooks.ping(p.cx, p.cy, [255, 90, 80]); }
    }
  }
}
function ticketsTick(dt) {
  let v1 = 0, v2 = 0; for (const p of G.map.points) if (isKey(p)) { if (p.owner === 1) v1++; else if (p.owner === 2) v2++; }
  const d = v1 - v2;
  if (d > 0) lose(2, d * .3 * dt); else if (d < 0) lose(1, -d * .3 * dt);
  if (G.teams[1].tickets < G.tmax * .24 && !G.teams[1].lowAlert && !G.demo) { G.teams[1].lowAlert = true; hooks.toast(t('m_reserves'), 'bad'); }
}
function spotting() {
  for (const u of G.units) {
    if (u.kind === 'squad' || !unitAlive(u)) continue;
    if (u.team === 1) { if (u.kind === 'air' && !G.seenAir && visAt(2, u.x, u.y)) G.seenAir = true; continue; }
    if (u.kind === 'air' && !G.seenAir1 && visAt(1, u.x, u.y)) G.seenAir1 = true;
    if (G.spotted.has(u.id) || !visAt(1, u.x, u.y)) continue;
    G.spotted.add(u.id);
    if (!G.demo && G.t - (G.spotT || -99) > 8) { G.spotT = G.t; hooks.toast(t(u.kind === 'air' ? 'm_heli' : 'm_armor'), 'bad'); hooks.ping(u.x, u.y, [255, 200, 80]); }
  }
}
function finish(win, reason) { if (G.over) return; G.over = { win, reason, t: G.t }; G.sel.clear(); G.armed = null; G.place = null; hooks.end(win, reason); }

/* ---------------------------------------------------------------- main step */
function step(dt) {
  if (!G || G.paused || G.over) return;
  G.t += dt;
  rebuildE();
  G.visT -= dt; if (G.visT <= 0) { G.visT = .2; computeVis(1); computeVis(2); spotting(); }
  G.aiT -= dt; if (G.aiT <= 0) { G.aiT = .5 * G.diff.think; aiTick(2); if (G.demo || G.auto) aiTick(1); }
  economy(dt);
  for (const b of G.blds) updateBld(b, dt);
  for (const u of G.units) { if (u.kind === 'squad') updateSquad(u, dt); else if (u.kind === 'veh') updateVeh(u, dt); else updateAir(u, dt); }
  for (const u of G.units) if (u.kind === 'squad') for (const m of u.members) if (m.dead) {
    const a = G.t - m.deathT;
    if (m.knock && a < .3) { const k = smooth(a / .28); m.x = m.knock[0] + m.knock[2] * k; m.y = m.knock[1] + m.knock[3] * k; }
    if (!m.bled && a > .14) { m.bled = true; bleed(m); }
    if (!m.baked && a > 2.4) { m.baked = true; const fr = SPR[m.team][m.role].dead[m.face > 0 ? 0 : 1]; addDecal(fr.c, m.x - fr.ax / RS, m.y + 1 - fr.ay / RS); }
  }
  for (const p of G.projs) if (!p.done && G.t >= p.t0 + p.dur) { p.done = true; resolveProj(p); }
    else if (!p.done && p.fx === 'rocket' && RND() < .8) { const u = (G.t - p.t0) / p.dur; G.parts.push(P('smoke', lerp(p.x0, p.x1, u), lerp(p.y0, p.y1, u), rand(-2, 2), rand(-4, 0), rand(.5, .9), { r0: .8, r1: rand(1.6, 2.4), a0: .75, pal: SMOKE_ROCKET })); }
  G.projs = G.projs.filter(p => !p.done || G.t < p.t0 + p.dur + .08);
  for (const a of G.arty) while (a.left > 0 && G.t >= a.next) {
    a.left--; a.next += .5; const ang = rand(0, TAU), r = Math.sqrt(RND()) * 26;
    G.projs.push({ fx: 'arc', W: WT.arty, x0: a.x + Math.cos(ang) * r, y0: a.y - 200, x1: a.x + Math.cos(ang) * r, y1: a.y + Math.sin(ang) * r * .7, t0: G.t, dur: .6, team: a.team, src: null, apex: 0, falling: true });
    hooks.sfx('whistle', a.x, a.y);
  }
  G.arty = G.arty.filter(a => a.left > 0);
  if (!G.demo && G.t >= G.ePlaneT) { G.ePlaneT = G.t + rand(150, 230); enemyRecon(); }
  for (const pl of G.planes) { pl.x += pl.vx * dt; pl.y += pl.vy * dt; }
  if (G.drops.length) dropTick();
  if (G.camp) campTick();                      // step 8: veterans arriving in a campaign battle
  G.planes = G.planes.filter(pl => pl.x > -60 && pl.x < G.map.W + 60 && pl.y > -60 && pl.y < G.map.H + 60);
  G.reveal = G.reveal.filter(r => G.t < r.until);
  captureTick(dt); ticketsTick(dt);
  if (!G.demo) { const T1 = G.teams[1], T2 = G.teams[2]; if (T2.hq.dead) finish(true, 'hq'); else if (T1.hq.dead) finish(false, 'hq'); else if (T2.tickets <= 0) finish(true, 'tickets'); else if (T1.tickets <= 0) finish(false, 'tickets'); }
  for (const e of G.emitters) {
    if (e.until && G.t > e.until) continue;
    e.acc += e.rate * dt;
    while (e.acc >= 1) { e.acc--; const x = e.x + rand(-e.w / 2, e.w / 2), y = e.y + rand(-1, 1);
      if (e.kind === 'smoke') G.parts.push(P('smoke', x, y, rand(-1.2, 1.2), rand(e.vy[0], e.vy[1]), rand(e.life[0], e.life[1]), { r0: e.r[0], r1: rand(e.r[1], e.r[2]), a0: e.a0, pal: e.pal }));
      else G.parts.push(P('spark', x, y, rand(-5, 5), rand(-30, -14), rand(e.life[0], e.life[1]))); }
  }
  updateParticles(dt); paintPools();
  G.fires = G.fires.filter(f => !f.until || G.t < f.until);
  G.emitters = G.emitters.filter(e => !e.until || G.t < e.until);
  G.blasts = G.blasts.filter(b => G.t - b.t0 < .6);
  G.flashes = G.flashes.filter(f => G.t - f.t0 < f.dur);
  G.lights = G.lights.filter(l => !l.until || G.t < l.until);
  G.ropes = G.ropes.filter(r => G.t - r.t0 < 1.4);
  G.units = G.units.filter(u => u.kind === 'squad' ? !(u.gone && u.members.every(m => m.baked)) : !u.dead);
  G.blds = G.blds.filter(b => !b.dead);
}
function resolveProj(p) {
  const W = p.W, tg = p.tg;
  if (p.fx === 'bullet' || p.fx === 'flak') {
    if (p.hit && tg && !tg.dead && !tg.crash) applyDamage(tg, W, p.src);
    else if (!p.air) for (let i = 0; i < 3; i++) G.parts.push(P('snow', p.x1, p.y1 + 3, rand(-14, 14), rand(-7, 7), rand(.2, .4), { vz: rand(16, 46) }));
    if (p.fx === 'flak' && p.air) for (let i = 0; i < 3; i++) G.parts.push(P('smoke', p.x1 + rand(-3, 3), p.y1 + rand(-3, 3), rand(-3, 3), rand(-3, 1), rand(.6, 1), { r0: 1.5, r1: rand(2.5, 3.5), a0: 1, pal: SMOKE_BLACK }));
  } else if (p.fx === 'rocket' || p.fx === 'shell') {
    const ok = p.hit && tg && !tg.dead && !tg.crash, gx = ok ? tg.x : p.x1, gy = ok ? tg.y : p.y1 + 3;
    if (ok) applyDamage(tg, W, p.src);
    explode(gx, gy, W, p.src, p.team, { skip: ok ? tg : null });
  } else explode(p.x1, p.y1, W, p.src, p.team, { size: p.fx === 'gren' ? .6 : clamp((W.splash || 12) / 14, .6, 1.4) });
}
function bleed(m) {
  const [x0, y0] = m.knock ? [m.knock[0], m.knock[1]] : [m.x, m.y], x = m.x, y = m.y, map = G.map;
  const kx = m.knock ? m.knock[2] : -m.face, ky = m.knock ? m.knock[3] : 0, n = hyp(kx, ky) || 1;
  for (let i = 0; i < 12; i++) { const d = rand(2, 10), px = Math.round(x + kx / n * d + rand(-2, 2)), py = Math.round(y + ky / n * d * .6 + rand(-1.5, 1.5)); if (px >= 0 && py >= 0 && px < map.W && py < map.H && map.KIND[py * map.W + px] !== 3) decal(px, py, RND() < .6 ? BLOOD[0] : BLOOD[1]); }
  for (let k = 0; k < 8; k++) { const u = k / 7; if (RND() < .8) decal(Math.round(lerp(x0, x, u)), Math.round(lerp(y0, y, u)), BLOOD[1]); }
  G.pools.push({ x: x - m.face, y, rmax: rand(3.4, 4.6), t0: G.t, grow: 1.8 });
}
function paintPools() {
  const map = G.map;
  for (const p of G.pools) {
    const age = G.t - p.t0; if (age > p.grow + .1) continue;
    const rad = p.rmax * (.25 + .75 * smooth(age / p.grow));
    for (let y = Math.floor(p.y - rad - 2); y < p.y + rad + 3; y++) for (let x = Math.floor(p.x - rad * 1.4 - 2); x < p.x + rad * 1.4 + 3; x++) {
      if (x < 0 || y < 0 || x >= map.W || y >= map.H || map.KIND[y * map.W + x] === 3) continue;
      const d = hyp((x - p.x) / 1.4, y - p.y) + (vnoise(x / 2.5, y / 2.5, 7) - .5) * 2.4;
      if (d < rad) decal(x, y, d < rad * .45 ? BLOOD[2] : d > rad - 1 ? BLOOD[0] : BLOOD[1]);
    }
  }
  G.pools = G.pools.filter(p => G.t - p.t0 <= p.grow + .1);
}
function updateParticles(dt) {
  const keep = [], map = G.map;
  for (const p of G.parts) {
    p.age += dt; if (p.age >= p.life) continue;
    if (p.kind === 'smoke') { const rise = p.y0 - p.y; p.x += (p.vx + 3 + .045 * rise + Math.sin(p.age * 1.7 + p.sh)) * dt; p.y += p.vy * dt; p.vy *= .997; }
    else if (p.kind === 'dust') { p.x += p.vx * dt; p.y += (p.vy - 3) * dt; p.vx *= .93; p.vy *= .93; }
    else if (p.kind === 'spark') { p.x += (p.vx + 3 * Math.sin(p.age * 11 + p.y)) * dt; p.y += p.vy * dt; }
    else if (p.kind === 'fire') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .9; p.vy = p.vy * .9 - 6 * dt; }
    else { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 230 * dt;
      if (p.z <= 0 && p.vz < 0) { if (p.kind === 'debris') { const x = Math.round(p.x), y = Math.round(p.y); if (x >= 0 && y >= 0 && x < map.W - 1 && y < map.H && map.KIND[y * map.W + x] !== 3) decal(x, y, p.pal, p.sh ? 2 : 1, 1); } continue; } }
    keep.push(p);
  }
  G.parts = keep.length > 1600 ? keep.slice(keep.length - 1600) : keep;
}

/* ---------------------------------------------------------------- enemy commander */
const afford = (T, cost) => (T.res.mp >= (cost.mp || 0)) && (T.res.mu >= (cost.mu || 0)) && (T.res.fu >= (cost.fu || 0));
function pay(T, cost) { for (const r in cost) T.res[r] -= cost[r]; }
function refund(T, cost, k) { for (const r in cost) T.res[r] += cost[r] * k; }
function canPlace(team, type, x, y) {
  const m = G.map, f = footOf(type, x, y), T = G.teams[team];
  if (f[0] < 4 || f[1] < 4 || f[2] > m.W - 4 || f[3] > m.H - 4) return false;
  const dk = !!BT[type].dock;           // a dock may stand a little further out, on the shore near our ground
  let ok = T.hq && !T.hq.dead && dist(x, y, T.hq.x, T.hq.by) < (dk ? 260 : 200);
  if (!ok) for (const p of m.points) if (p.owner === team && dist(x, y, p.cx, p.cy) < (dk ? 170 : 95)) { ok = true; break; }
  if (!ok) for (const b of basesOf(team)) if (b.bt.fob && dist(x, y, b.x, b.by) < (dk ? 200 : 150)) { ok = true; break; }      // step 7: around a forward base too
  if (BT[type].fob) ok = !fobWhy(team, x, y);
  if (!ok || (BT[type].bridge) || (dk && !dockWater(x, y))) return false;
  if ((BT[type].fob || BT[type].shop) && kindNear(f, 10, [4])) return false;      // step 7: never next to a bridge
  for (let cy = Math.floor(f[1] / CELL); cy <= Math.floor(f[3] / CELL); cy++) for (let cx = Math.floor(f[0] / CELL); cx <= Math.floor(f[2] / CELL); cx++) {
    if (cx < 0 || cy < 0 || cx >= m.cw || cy >= m.ch) return false; const c = cy * m.cw + cx;
    if (!m.walkI[c] || !m.walkI0[c]) return false;
    const k = m.KIND[Math.min(m.H - 1, cy * CELL + 3) * m.W + Math.min(m.W - 1, cx * CELL + 3)]; if (k === 2 || k === 3 || k === 4) return false;
  }
  for (const b of G.blds) if (!b.dead && !(f[2] + 2 < b.foot[0] || f[0] - 2 > b.foot[2] || f[3] + 2 < b.foot[1] || f[1] - 2 > b.foot[3])) return false;
  if (!BT[type].small) for (const u of G.units) if (u.kind === 'veh' && !u.dead && u.x > f[0] - 6 && u.x < f[2] + 6 && u.y > f[1] - 6 && u.y < f[3] + 6) return false;
  return true;
}
function aiTick(team) {
  const T = G.teams[team]; if (!T.hq || T.hq.dead) return;
  aiResearch(T); aiConstruct(T); aiBases(T); aiProduce(T); aiArmy(T); aiNaval(T); aiAbility(T);
}
function startResearch(b, key) { const T = G.teams[b.team]; pay(T, RT[key].cost); b.research = { key, t: 0, total: RT[key].time }; }
function aiResearch(T) {
  const hq = T.hq, th = G.diff.think, id = T.id;
  if (!hq.research) {
    const ark = ARMY[T.army] ? ARMY[T.army].rt.filter(k => !T.tech.has(k) && hasReq(id, k)) : [], nx = ark[0];
    if (!T.tech.has('t2') && G.t > 110 * th && afford(T, RT.t2.cost)) startResearch(hq, 't2');
    else if (nx && G.t > (nx === ARMY[T.army].rt[0] ? 150 : 260) * th && afford(T, { mu: (RT[nx].cost.mu || 0) + 60, fu: RT[nx].cost.fu || 0 })) startResearch(hq, nx);      // the army's own upgrades
    else if (T.tech.has('t2') && !T.tech.has('t3') && G.t > 320 * th && afford(T, RT.t3.cost)) startResearch(hq, 't3');
    else if (!T.tech.has('winter') && G.t > 220 * th && T.res.mu > 220) startResearch(hq, 'winter');
    else if ((G.def.light === 'night' || G.map.season.fog) && !T.tech.has('optics') && G.t > 160 * th && T.res.mu > 200 && T.res.fu > 60) startResearch(hq, 'optics');
  }
  const br = bldOf(id, 'barracks', true)[0]; if (br && !br.research && !T.tech.has('lmg') && G.t > 260 * th && T.res.mu > 260) startResearch(br, 'lmg');
  const mo = bldOf(id, 'motor', true)[0]; if (mo && !mo.research && !T.tech.has('armor') && G.t > 420 * th && T.res.mu > 200 && T.res.fu > 200) startResearch(mo, 'armor');
}
/* base slots are authored for the northern base; the southern base gets the same layout mirrored around its HQ.
   On maps marked sym (the same after a 180-degree turn) the southern base is the northern one turned 180 degrees as well,
   so its barracks and motor pool stand on the same side as the rest of the map's turned half */
const SLOT_TYPE = { motor: 'motor', helipad: 'helipad', depot: 'depot', aa: 'aanest', barracks: 'barracks', dock: 'dock' };
function slotsFor(team) {
  if (G.slots && G.slots[team]) return G.slots[team];
  const eb = G.def.enemyBase, src = Object.assign({}, eb.slots), pb = eb.prebuilt.find(b => b.type === 'barracks');
  if (pb) src.barracks = [pb.x, pb.y];
  const h1 = G.def.hq[1], h2 = G.def.hq[2], sym = G.def.sym;
  const mir = (q, k) => sym ? [G.def.w - q[0], G.def.h - q[1] + BT[SLOT_TYPE[k]].foot[1]] : [h1[0] + (q[0] - h2[0]), h1[1] - (q[1] - h2[1])];
  const out = {};
  for (const k in src) out[k] = Array.isArray(src[k][0]) ? src[k].map(q => team === 2 ? q : mir(q, k)) : (team === 2 ? src[k] : mir(src[k], k));
  G.slots = G.slots || {}; G.slots[team] = out; return out;
}
/* a point of one base moved to the same place of the other base (mirrored around the two HQs, turned 180 degrees on sym maps) */
function mirrorPt(def, q, toTeam) { if (def.sym) return [def.w - q[0], def.h - q[1]]; const a = def.hq[toTeam], b = def.hq[3 - toTeam]; return [a[0] + (q[0] - b[0]), a[1] - (q[1] - b[1])]; }
/* a finished building on the first free spot spiralling out from p (used at the start of a battle) */
function placeNear(team, type, p) {
  for (let k = 0; k < 40; k++) { const a = k * 2.4, r = k * 3, x = Math.round(p[0] + Math.cos(a) * r), y = Math.round(p[1] + Math.sin(a) * r); if (canPlace(team, type, x, y)) return addBld(team, type, x, y, true); }
  return null;
}
function aiPlace(team, type, p) {
  const T = G.teams[team]; if (!p || !afford(T, BT[type].cost)) return false;
  let at = null;
  const off = BT[type].fob || BT[type].shop;          // the enemy commander keeps forward bases and workshops off the roads
  for (let k = 0; k < (off ? 40 : 25) && !at; k++) { const a = k * 2.4, r = k * 3, x = Math.round(p[0] + Math.cos(a) * r), y = Math.round(p[1] + Math.sin(a) * r); if (canPlace(team, type, x, y) && !(off && kindNear(footOf(type, x, y), 6, [1, 4]))) at = [x, y]; }
  if (!at) return false;
  pay(T, BT[type].cost); addBld(team, type, at[0], at[1], false, true); return true;
}
function aiConstruct(T) {
  const id = T.id, sl = slotsFor(id);
  if (!bldOf(id, 'barracks').length) aiPlace(id, 'barracks', sl.barracks);
  if (hasReq(id, 'motor') && !bldOf(id, 'motor').length && (T.tech.has('t2') || G.t > 45 * G.diff.think)) aiPlace(id, 'motor', sl.motor);
  if (hasReq(id, 'helipad') && !bldOf(id, 'helipad').length) aiPlace(id, 'helipad', sl.helipad);
  if (T.used > T.cap - 8 && T.cap < 120 && bldOf(id, 'depot').filter(b => b.built < 1).length === 0) for (const p of sl.depot) if (aiPlace(id, 'depot', p)) break;
  if ((id === 2 ? G.seenAir : G.seenAir1) && bldOf(id, 'aanest').length < 2) for (const p of sl.aa) if (aiPlace(id, 'aanest', p)) break;
  if (G.t > 240 * G.diff.think && bldOf(id, 'bunker').length < 2 && T.res.mu > 120) {
    const foeHQ = G.teams[3 - id].hq;
    for (const p of G.map.points) if (p.owner === id && isKey(p) && !bldOf(id, 'bunker').some(b => dist(b.x, b.y, p.cx, p.cy) < 70)) { const dy = foeHQ && foeHQ.by < p.cy ? p.y0 - 6 : p.y1 + 14; if (aiPlace(id, 'bunker', [p.cx + rand(-16, 16), dy])) break; }
  }
}
function foeComp(team) { const c = { inf: 0, veh: 0, air: 0 }; for (const u of G.units) if (u.team !== team && unitAlive(u)) c[u.ut.cls]++; return c; }
/* each production building commits to one unit and saves for it; expensive plans reserve resources ahead of cheap ones */
function aiProduce(T) {
  const id = T.id, pc = foeComp(id), t2 = T.tech.has('t2'), saving = !t2 && G.t > 90 * G.diff.think;
  const wt = { riflemen: 3, mg: 1.2 + pc.inf * .08, sniper: .4 + pc.inf * .03, at: .6 + pc.veh * .9, mortar: .5 + pc.inf * .04, scout: pc.air ? .2 : .5, aa: .15 + pc.air * 1.6, light: 1, medium: 1.3 + pc.veh * .3, heavy: .8 + pc.veh * .2, howitzer: .35, heli_scout: .3, heli_attack: 1 + pc.veh * .15, heli_trans: .25 };
  // seasons: heavy armour bogs down in the spring mud (helicopters do not care); the fog calls for scouts and close fighters
  const sz = G.map.season;
  if (sz.mud) { wt.heavy *= .5; wt.medium *= .75; wt.howitzer *= .7; wt.heli_attack *= 1.3; wt.heli_trans *= 1.4; }
  if (sz.fog) { wt.scout += .5; wt.heli_scout += .3; wt.sniper *= .7; wt.mg += .4; }
  if (sz.grass) { wt.sniper += .3; wt.mortar += .3; }
  wt.boat = 1.2; wt.gunboat = .8;
  const ar = T.army; if (ARMY[ar]) for (const k of ARMY[ar].arm) wt[k] *= ar === 'air' ? 1.6 : 1.3;      // step 7: each army leans on its own arm
  const own = { inf: 0, veh: 0, air: 0, sea: 0 }, kindOf = ut => ut.sea ? 'sea' : ut.cls;
  for (const u of G.units) if (u.team === id && unitAlive(u) && u.type !== 'engineers') own[kindOf(u.ut)]++;
  for (const b of G.blds) if (b.team === id) for (const q of b.queue) own[kindOf(UT[q.type])]++;
  const reserve = { mp: 0, mu: 0, fu: 0 }, ok = k => { const c = costOf(id, k); return hasReq(id, k) && !(saving && ((c.mu || 0) > 0 || (c.fu || 0) > 0) && !(ar === 'tank' && UT[k].cls === 'veh') && !(ar === 'inf' && k === 'at' && ARMY.inf.earlyAT)); };
  for (const bt of ['helipad', 'dock', 'motor', 'barracks']) for (const b of bldOf(id, bt, true)) {
    if (b.queue.length) continue;
    if ((bt === 'barracks' && own.inf >= (t2 ? 7 : 9) + (ar === 'inf' ? 2 : 0)) || (bt === 'motor' && own.veh >= (ar === 'tank' ? 8 : 6)) || (bt === 'helipad' && own.air >= (ar === 'air' ? 5 : 3)) || (bt === 'dock' && own.sea >= 4)) continue;
    if (!b.aiPick || !ok(b.aiPick)) {
      const opts = UNIT_AT[bt].filter(ok); if (!opts.length) continue;
      let tot = 0; for (const k of opts) tot += wt[k]; let r = RND() * tot; b.aiPick = opts[0];
      for (const k of opts) { r -= wt[k]; if (r <= 0) { b.aiPick = k; break; } }
    }
    const ut = UT[b.aiPick], c = costOf(id, b.aiPick), urgent = bt === 'barracks' && own.inf < 4;
    if (bt !== 'dock' && ut.sea) { b.aiPick = null; continue; }
    const can = ['mp', 'mu', 'fu'].every(r => T.res[r] - (urgent ? 0 : reserve[r]) >= (c[r] || 0));
    if (can && T.used + ut.sup <= T.cap) { pay(T, c); b.queue.push({ type: b.aiPick, t: 0, total: ut.time, cost: c }); T.used += ut.sup; own[ut.cls]++; b.aiPick = null; }
    else for (const r in c) reserve[r] += c[r];
  }
}
function reinforceCost(u) { return Math.round(u.ut.cost.mp / u.ut.n * .8 * (armyOf(u.team) === 'inf' ? .7 : 1) * campReinf(u.team)); }
function reinforceOne(u) {
  const T = G.teams[u.team], live = liveCount(u); if (live >= u.ut.n || T.res.mp < reinforceCost(u)) return false;
  const [ux, uy] = unitPos(u), base = nearBase(u.team, ux, uy) || T.hq; if (!base || base.dead) return false;      // fresh soldiers come from the nearest base
  T.res.mp -= reinforceCost(u);
  const m = mkSoldier(u, base.x + rand(-10, 10), base.by + 10, u.members.filter(mm => !mm.dead).length);
  u.members = u.members.filter(mm => !mm.dead || !mm.baked); u.members.push(m);
  const [cx, cy] = unitPos(u); m.goal = [cx + rand(-6, 6), cy + rand(-4, 4)]; m.arrived = false; m.pi = 1; if (!u.path) u.path = [[m.x, m.y], m.goal];
  return true;
}
/* retreat to the front side of one's own HQ (the side facing the enemy), the same for both sides */
function retreatUnit(u) {
  const [ux, uy] = unitPos(u);
  if (u.kind === 'veh') { const sp = repairSpot(u.team, ux, uy); if (sp) { stopUnit(u); orderMove(u, sp[0], sp[1], 'move'); } return; }      // vehicles: to a workshop or the HQ
  const b = nearBase(u.team, ux, uy); if (!b) return;
  stopUnit(u); if (u.kind === 'squad') { u.retreat = true; u.retreatTo = b; }
  const [rx, ry] = retreatSpot(b, u.team); orderMove(u, rx, ry, 'move');
}
function aiArmy(T) {
  const id = T.id, foe = 3 - id, units = G.units.filter(u => u.team === id && unitAlive(u)), pts = G.map.points, hq = T.hq;
  const assigned = new Map(); for (const u of units) if (u.ai && u.ai.task) assigned.set(u.ai.task, (assigned.get(u.ai.task) || 0) + 1);
  const threat = p => { for (const e of G.E[foe]) if (e.cls !== 'bld' && dist(e.x, e.y, p.cx, p.cy) < 110) return true; return false; };
  for (const u of units) {
    if (!u.ai) u.ai = { task: null, until: 0 };
    if (u.ut.sea || u.aboard || (u.order && u.order.type === 'board')) continue;      // boats and their passengers: aiNaval
    const [ux, uy] = unitPos(u);
    if (u.kind === 'squad') {
      if (u.type === 'engineers') { aiEngineers(u, T); continue; }
      const live = liveCount(u), frac = live / u.ut.n;
      if (!u.retreat && (frac <= .4 || (u.pinned && G.t - u.pinT > 5))) { retreatUnit(u); u.ai.task = null; continue; }
      if (u.retreat) continue;
      const nearHQ = !!nearBase(id, ux, uy, 100);
      if (nearHQ && frac < 1) { reinforceOne(u); if (frac < .8) continue; }
    }
    if (u.kind === 'veh') { if (u.hp < u.max * .3 && !u.ai.rtb) { u.ai.rtb = true; stopUnit(u); const sp = repairSpot(id, ux, uy); if (sp) orderMove(u, sp[0], sp[1], 'move'); } if (u.ai.rtb) { if (u.hp > u.max * .85) u.ai.rtb = false; else continue; } }
    if (u.kind === 'air') { aiAir(u, T); continue; }
    if (u.ut.ground) { aiArty(u, T); continue; }
    if (u.ai.task && G.t < u.ai.until && (u.path || u.mode)) continue;
    if (u.ai.task && G.t < u.ai.until && dist(ux, uy, u.ai.task.cx, u.ai.task.cy) < 40 && (u.ai.task.owner === id ? threat(u.ai.task) || G.t < u.ai.until - 8 : true)) continue;
    let best = null, bs = -1e9;
    for (const p of pts) {
      if (!reachable(G.map, u.kind === 'veh', ux, uy, p.cx, p.cy)) continue;      // across water without a bridge: not on foot or wheels
      let s = -dist(ux, uy, p.cx, p.cy);
      if (p.owner === 0) s += u.kind === 'squad' ? 260 : 90;
      else if (p.owner === foe) s += 200 + (isKey(p) ? 120 : 0);
      else s += threat(p) ? 320 : -260;
      s += p.type === 'tw' ? 220 : p.type === 'vp' ? 140 : 40;             // towns are worth most: reserves and resources
      s -= (assigned.get(p) || 0) * (u.kind === 'squad' ? (p.type === 'tw' ? 70 : 120) : -40);      // and take a bigger garrison
      if (s > bs) { bs = s; best = p; }
    }
    if (best) { if (u.ai.task) assigned.set(u.ai.task, (assigned.get(u.ai.task) || 1) - 1); u.ai.task = best; u.ai.until = G.t + 25; assigned.set(best, (assigned.get(best) || 0) + 1);
      let tx = best.cx + rand(-14, 14), ty = best.cy + rand(-12, 12); if (u.kind === 'squad') [tx, ty] = hideSpot(tx, ty, best);
      orderMove(u, tx, ty, 'amove'); }
  }
  T.artyT = (T.artyT == null ? 150 : T.artyT) - .5 * G.diff.think;
  if (T.artyT <= 0 && T.res.mu > 260) {
    let best = null, bn = 3;
    for (const e of G.E[foe]) { if (e.cls === 'bld' || !visAt(id, e.x, e.y)) continue; let n = 0; for (const o of G.E[foe]) if (o.cls !== 'bld' && dist(o.x, o.y, e.x, e.y) < 30) n++; if (n > bn) { bn = n; best = e; } }
    if (best) { pay(T, globalOf(id, 'artillery').cost); G.arty.push({ x: best.x, y: best.y, left: 8, next: G.t + 2.5, team: id }); T.artyT = 100; }
  }
}
/* summer: inside the point's zone, the cell of tall grass or wheat nearest to (x, y), where a squad stays hidden until it fires */
function hideSpot(x, y, p) {
  const m = G.map; if (!m.hide) return [x, y];
  let best = null, bd = 1e9;
  for (let gy = Math.ceil((p.y0 + 4) / CELL); gy <= Math.floor((p.y1 - 4) / CELL) - 1; gy++) for (let gx = Math.ceil((p.x0 + 4) / CELL); gx <= Math.floor((p.x1 - 4) / CELL) - 1; gx++) {
    if (gx < 0 || gy < 0 || gx >= m.cw || gy >= m.ch) continue;
    const c = gy * m.cw + gx, px = gx * CELL + CELL / 2, py = gy * CELL + CELL / 2, d = dist(x, y, px, py);
    if (m.hide[c] && m.walkI[c] && d < bd) { bd = d; best = [px, py]; }
  }
  return best || [x, y];
}
function aiEngineers(u, T) {
  if (u.order || u.retreat) return;
  let best = null, bd = 260; const [ux, uy] = unitPos(u);
  for (const o of G.blds) if (o.team === T.id && !o.dead && o.built >= 1 && o.hp < o.max * .7) { const d = distToEnt(ux, uy, o); if (d < bd) { bd = d; best = o; } }
  for (const o of G.units) if (o.team === T.id && o.kind === 'veh' && !o.dead && o.hp < o.max * .6) { const d = dist(ux, uy, o.x, o.y); if (d < bd) { bd = d; best = o; } }
  if (best) u.order = { type: 'repair', target: best };
  else if (aiPontoon(u, T)) { /* off to throw a pontoon bridge */ }
  else if (!u.path && dist(ux, uy, T.hq.x, T.hq.by) > 60) orderMove(u, T.hq.x + rand(-20, 20), T.id === 2 ? T.hq.by + 26 : T.hq.by - T.hq.bt.foot[1] - 26, 'move');
}
function aiAir(u, T) {
  const id = T.id, foe = 3 - id;
  if (u.task && u.task.type === 'rtb') return;
  if (u.task && u.task.type === 'unload') return;
  if (u.hp < u.max * .35 || (u.ut.ammo && u.ammo === 0)) { u.task = { type: 'rtb' }; u.mode = null; u.focus = null; return; }
  if (u.type === 'heli_trans') {
    if (u.cargo) { const p = G.map.points.filter(q => q.owner !== id).sort((a, b) => dist(u.x, u.y, a.cx, a.cy) - dist(u.x, u.y, b.cx, b.cy))[0]; if (p) u.task = { type: 'unload', x: p.cx + rand(-10, 10), y: p.cy + rand(-10, 10) }; }
    else if (!(u.task && u.task.type === 'pickup')) {
      // step 7: first a squad of ours far from any point still to be won, flown there; otherwise a fresh squad at the helipad
      const sq = ferryCandidate(u, id);
      if (sq) boardOrder(sq, u);
      else { const pad = homePad(id, u.x, u.y), lc = costOf(id, 'riflemen').mp;
        if (pad && u.alt < .5 && dist(u.x, u.y, pad.padX, pad.padY) < 12 && T.res.mp >= lc && T.used + 5 <= T.cap) { T.res.mp -= lc; u.cargo = true; }
        else if (pad) { if (!u.task) u.task = { type: 'rtb' }; }
        else if (!u.dest && T.hq && !T.hq.dead && dist(u.x, u.y, T.hq.x, T.hq.by) > 90) u.dest = hqFront(id, 30); }
    }
    return;
  }
  if (u.mode === 'attack' && u.focus && !u.focus.dead && !u.focus.crash) return;
  let best = null, bs = -1e9;
  for (const e of G.E[foe]) { if (e.cls === 'bld' || !visAt(id, e.x, e.y)) continue; const d = dist(u.x, u.y, e.x, e.y); if (d > 300) continue; let s = -d; if (u.type === 'heli_attack' && e.cls === 'veh') s += 200; if (u.type === 'heli_scout' && e.cls === 'inf') s += 80; if (e.cls === 'air') s -= 100; if (s > bs) { bs = s; best = e; } }
  if (best) { u.mode = 'attack'; u.focus = best; u.dest = null; }
  else if (!u.dest) { const own = G.map.points.filter(p => p.owner === id); const p = own.length ? pick(own) : pick(G.map.points); u.dest = [p.cx + rand(-30, 30), p.cy + rand(-30, 30)]; }
}
function aiArty(u, T) {
  const id = T.id, foe = 3 - id, W = WT[u.kind === 'veh' ? u.ut.w[0] : 'mortar'], [ux, uy] = unitPos(u);
  for (const e of G.E[foe]) if (e.cls !== 'bld' && visAt(id, e.x, e.y)) { const d = dist(ux, uy, e.x, e.y); if (d < W.rng && d > (W.min || 0)) { if (u.path) { u.path = null; if (u.kind === 'squad') for (const m of u.members) m.arrived = true; } return; } }
  if (u.path || (u.ai.until && G.t < u.ai.until)) return;
  const hq = T.hq, fh = G.teams[foe].hq, own = G.map.points.filter(p => p.owner === id);
  const front = fh ? own.sort((a, b) => dist(a.cx, a.cy, fh.x, fh.by) - dist(b.cx, b.cy, fh.x, fh.by))[0] : null;
  const back = front ? Math.sign(hq.by - front.cy) * 50 : 0;
  const tx = front ? front.cx + rand(-20, 20) : hq.x, ty = front ? front.cy + back : hq.by + (id === 2 ? 60 : -60);
  orderMove(u, tx, ty, 'move'); u.ai.until = G.t + 20;
}

/* ---------------------------------------------------------------- player commands */
function reqMissing(team, key) {
  const T = G.teams[team];
  const rq = reqOf(team, key);            // step 7: an army may need less (or other) research
  if (UT[key]) { const ut = UT[key]; if (!bldOf(team, ut.at, true).length) return t('b_' + ut.at); if (rq && !T.tech.has(rq)) return t('r_' + rq); return null; }
  if (BT[key] || RT[key]) return rq && !T.tech.has(rq) ? t('r_' + rq) : null;
  return null;
}
function costMissing(team, cost) { const r = G.teams[team].res; if ((cost.mp || 0) > r.mp) return 'm_noMp'; if ((cost.mu || 0) > r.mu) return 'm_noMu'; if ((cost.fu || 0) > r.fu) return 'm_noFu'; return null; }
const selUnits = () => [...G.sel].filter(u => u.kind !== 'bld' && unitAlive(u));
const selSquads = type => selUnits().filter(u => u.kind === 'squad' && (!type || u.type === type));
function enemyAt(x, y) {
  let best = null, bd = 10;
  for (const e of G.E[2]) { if (!canSee(1, e)) continue; let d; if (e.cls === 'bld') d = distToEnt(x, y, e) - 2; else if (e.cls === 'air') d = dist(x, y, e.x, e.y - e.alt) - 9; else if (e.cls === 'veh') d = dist(x, y, e.x, e.y) - 9; else d = dist(x, y, e.x, e.y - 6); if (d < bd) { bd = d; best = e; } }
  return best;
}
function ownAt(x, y) {
  let best = null, bd = 10;
  for (const u of G.units) {
    if (u.team !== 1 || !unitAlive(u)) continue;
    if (u.kind === 'squad') { for (const m of u.members) if (!m.dead) { const d = dist(x, y, m.x, m.y - 6); if (d < bd) { bd = d; best = u; } } }
    else { const d = u.kind === 'air' ? dist(x, y, u.x, u.y - u.alt) - 10 : dist(x, y, u.x, u.y) - 9; if (d < bd) { bd = d; best = u; } }
  }
  if (best) return best;
  for (const b of G.blds) if (b.team === 1 && !b.dead) { const f = b.foot, top = b.bt.flat ? f[1] : Math.min(f[1] - 2, bldTop(b)); if (x >= f[0] && x <= f[2] && y >= top && y <= f[3] + 2) return b; }
  return null;
}
function cmdMove(units, x, y, mode) {
  let ok = false; const n = units.length;
  units.forEach((u, i) => {
    const [ux, uy] = unitPos(u), ang = Math.atan2(y - uy, x - ux) + Math.PI / 2, off = (i - (n - 1) / 2) * (u.kind === 'veh' ? 30 : 24);
    const tx = x + Math.cos(ang) * off, ty = y + Math.sin(ang) * off * .7;
    u.focus = null; u.gren = null; u.order = null; u.ground = null; u.retreat = false; if (u.kind === 'air' || (u.ut && u.ut.sea)) u.task = null;
    if (orderMove(u, tx, ty, mode || 'move') || orderMove(u, x, y, mode || 'move')) ok = true;
  });
  if (!ok && units.length) hooks.toast(t('m_noPath'), 'bad');
  return ok;
}
function cmdSmart(x, y) {
  const sel = [...G.sel].filter(u => u.kind === 'bld' ? !u.dead : unitAlive(u)); if (!sel.length) return false;
  const units = sel.filter(u => u.kind !== 'bld'), blds = sel.filter(u => u.kind === 'bld');
  if (!units.length) { for (const b of blds) if (UNIT_AT[b.type]) b.rally = [x, y]; G.marker = { x, y, t0: G.t, kind: 'move' }; hooks.sfx('order'); return true; }
  const foe = enemyAt(x, y);
  if (foe) { for (const u of units) { u.mode = 'attack'; u.focus = foe; u.repath = 0; u.order = null; u.ground = null; u.retreat = false; if (u.kind === 'air') u.task = null; } G.marker = { x: foe.x, y: foe.y, t0: G.t, kind: 'attack' }; hooks.sfx('order'); return true; }
  const own = ownAt(x, y), eng = units.filter(u => u.kind === 'squad' && u.type === 'engineers');
  // step 6: squads sent onto one of our boats or transport helicopters go aboard; a carrier sent onto one of our squads picks it up
  const boarder = units.find(u => u.kind === 'squad');
  if (own && isCarrier(own) && !own.cargo && boarder) { boardOrder(boarder, own); const rest = units.filter(u => u !== boarder && u !== own); if (rest.length) cmdMove(rest, x, y); G.marker = { x, y, t0: G.t, kind: 'move' }; hooks.sfx('order'); return true; }
  const carrier = units.find(u => isCarrier(u) && !u.cargo);
  if (own && own.kind === 'squad' && carrier && !units.includes(own)) { boardOrder(own, carrier); G.marker = { x, y, t0: G.t, kind: 'move' }; hooks.sfx('order'); return true; }
  if (own && eng.length && own.cls !== 'inf' && own.kind !== 'squad' && own.kind !== 'air' && ((own.kind === 'bld' && own.built < 1) || own.hp < own.max)) {
    const type = own.kind === 'bld' && own.built < 1 ? 'build' : 'repair';
    for (const u of eng) { stopUnit(u); u.order = { type, target: own }; }
    const rest = units.filter(u => !eng.includes(u)); if (rest.length) cmdMove(rest, x, y);
    G.marker = { x, y, t0: G.t, kind: 'move' }; hooks.sfx('order'); return true;
  }
  const ok = cmdMove(units, x, y);
  if (ok) { G.marker = { x, y, t0: G.t, kind: 'move' }; hooks.sfx('order'); }
  return ok;
}
function cmdStop() { for (const u of selUnits()) stopUnit(u); hooks.sfx('order'); }
function cmdRetreat() { const us = selUnits().filter(u => u.kind !== 'air'); for (const u of us) retreatUnit(u); if (us.length) hooks.sfx('order'); }
function cmdReinforce() {
  let any = false, near = false, full = true;
  for (const u of selSquads()) { const [x, y] = unitPos(u); if (!nearBase(1, x, y, 110)) continue; near = true; if (liveCount(u) < u.ut.n) { full = false; if (reinforceOne(u)) any = true; } }
  if (!near) hooks.toast(t('m_onlyHQ'), 'bad'); else if (full) hooks.toast(t('m_full'), 'bad'); else if (!any) hooks.toast(t('m_noMp'), 'bad'); else hooks.sfx('ready');
  return any;
}
function cmdGrenade(x, y) {
  const sq = selSquads('riflemen'); if (!sq.length) return false;
  if (G.teams[1].res.mu < 25) { hooks.toast(t('m_noMu'), 'bad'); return false; }
  const u = sq.find(s => G.t >= s.grenT); if (!u) { hooks.toast(t('m_notReady'), 'bad'); return false; }
  stopUnit(u); u.gren = [x, y]; G.marker = { x, y, t0: G.t, kind: 'attack' }; hooks.sfx('order'); return true;
}
function cmdGround(x, y) {
  const us = selUnits().filter(u => u.ut.ground); if (!us.length) return false;
  if (!seenAt(x, y)) { hooks.toast(t('m_needVis'), 'bad'); return false; }
  for (const u of us) { const W = WT[u.kind === 'veh' ? u.ut.w[0] : 'mortar'], [ux, uy] = unitPos(u), d = dist(ux, uy, x, y); if (d < W.min) { hooks.toast(t('m_tooClose'), 'bad'); continue; } u.ground = [x, y]; u.focus = null; if (d > W.rng) orderMove(u, x + (ux - x) / d * W.rng * .8, y + (uy - y) / d * W.rng * .8, 'move'); }
  G.marker = { x, y, t0: G.t, kind: 'barrage' }; hooks.sfx('order'); return true;
}
function seenAt(x, y) { const cx = Math.floor(x / 8), cy = Math.floor(y / 8); return cx >= 0 && cy >= 0 && cx < G.vw && cy < G.vh && G.seen[cy * G.vw + cx] === 1; }
function cmdRTB() { for (const u of selUnits()) if (u.kind === 'air') { u.task = { type: 'rtb' }; u.mode = null; u.focus = null; u.dest = null; } hooks.sfx('order'); }
function cmdUnload(x, y) { const hs = selUnits().filter(u => u.cargo && (u.kind === 'air' || u.ut.sea)); if (!hs.length) return false; for (const u of hs) { u.mode = null; u.focus = null; if (u.kind === 'air') u.task = { type: 'unload', x, y }; else { u.task = { type: 'land', x, y }; orderMove(u, x, y, 'move'); } } G.marker = { x, y, t0: G.t, kind: 'move' }; hooks.sfx('order'); return true; }
function cmdLoad() {
  const T = G.teams[1], lc = costOf(1, 'riflemen').mp;
  for (const u of selUnits()) if (u.type === 'heli_trans' && !u.cargo) {
    const pad = homePad(1, u.x, u.y); if (!pad || u.alt > .5 || dist(u.x, u.y, pad.padX, pad.padY) > 12) { hooks.toast(t('c_load_d'), 'bad'); continue; }
    if (T.res.mp < lc) { hooks.toast(t('m_noMp'), 'bad'); continue; }
    if (T.used + UT.riflemen.sup > T.cap) { hooks.toast(t('m_supply'), 'bad'); continue; }
    T.res.mp -= lc; u.cargo = true; hooks.sfx('ready');
  }
}
function cmdProduce(b, type) {
  const T = G.teams[1], ut = UT[type], cost = costOf(1, type), miss = reqMissing(1, type);
  if (miss) { hooks.toast(t('m_req', { x: miss }), 'bad'); return false; }
  const cm = costMissing(1, cost); if (cm) { hooks.toast(t(cm), 'bad'); return false; }
  if (T.used + ut.sup > T.cap) { hooks.toast(t('m_supply'), 'bad'); return false; }
  if (b.queue.length >= 5) { hooks.toast(t('m_queueFull'), 'bad'); return false; }
  pay(T, cost); b.queue.push({ type, t: 0, total: ut.time, cost }); T.used += ut.sup; hooks.sfx('ui'); return true;
}
function cmdCancel(b, i) { const q = b.queue[i]; if (!q) return; b.queue.splice(i, 1); refund(G.teams[b.team], q.cost || costOf(b.team, q.type), 1); recalcSupply(b.team); hooks.sfx('ui'); }
function cmdResearch(b, key) {
  const T = G.teams[1];
  if (T.tech.has(key) || (RT[key].army && RT[key].army !== T.army)) return false;
  if (b.research) { hooks.toast(t('m_busy'), 'bad'); return false; }
  const miss = reqMissing(1, key); if (miss) { hooks.toast(t('m_req', { x: miss }), 'bad'); return false; }
  const cm = costMissing(1, RT[key].cost); if (cm) { hooks.toast(t(cm), 'bad'); return false; }
  for (const o of G.blds) if (o.team === 1 && o.research && o.research.key === key) { hooks.toast(t('m_busy'), 'bad'); return false; }
  startResearch(b, key); hooks.sfx('ui'); return true;
}
function cmdPlace(type, x, y) {
  const eng = selSquads('engineers'); if (!eng.length) { hooks.toast(t('m_engineers'), 'bad'); return false; }
  const miss = reqMissing(1, type); if (miss) { hooks.toast(t('m_req', { x: miss }), 'bad'); return false; }
  const cm = costMissing(1, BT[type].cost); if (cm) { hooks.toast(t(cm), 'bad'); return false; }
  x = Math.round(x); y = Math.round(y);
  const span = BT[type].bridge ? canPontoon(1, x, y) : null;
  if (BT[type].bridge ? !span : !canPlace(1, type, x, y)) { hooks.toast(t(BT[type].bridge ? 'm_noSpan' : BT[type].dock ? 'm_noShore' : BT[type].fob ? fobWhy(1, x, y) || 'm_cant' : 'm_cant'), 'bad'); return false; }
  pay(G.teams[1], BT[type].cost);
  const b = span ? addBld(1, type, x, span[1], false, false, span) : addBld(1, type, x, y, false);
  for (const u of eng) { stopUnit(u); u.order = { type: 'build', target: b }; }
  hooks.sfx('order'); return true;
}
function cmdArtillery(x, y) {
  const T = G.teams[1], g = globalOf(1, 'artillery');
  if (G.t < T.cd.artillery) { hooks.toast(t('m_notReady'), 'bad'); return false; }
  const cm = costMissing(1, g.cost); if (cm) { hooks.toast(t(cm), 'bad'); return false; }
  if (!seenAt(x, y)) { hooks.toast(t('m_needVis'), 'bad'); return false; }
  pay(T, g.cost); T.cd.artillery = G.t + g.cd; G.arty.push({ x, y, left: 8, next: G.t + 2.5, team: 1 });
  G.marker = { x, y, t0: G.t, kind: 'barrage' }; hooks.sfx('radio'); return true;
}
function cmdRecon(x, y) {
  const T = G.teams[1], g = GLOBAL.recon;
  if (G.t < T.cd.recon) { hooks.toast(t('m_notReady'), 'bad'); return false; }
  const cm = costMissing(1, g.cost); if (cm) { hooks.toast(t(cm), 'bad'); return false; }
  pay(T, g.cost); T.cd.recon = G.t + g.cd;
  const hq = T.hq, dx = x - hq.x, dy = y - hq.by, d = hyp(dx, dy) || 1, sp = 140, pm = PLANE_MODELS[1].filter(hasFrame);
  G.planes.push({ x: hq.x - dx / d * 60, y: hq.by - dy / d * 60, vx: dx / d * sp, vy: dy / d * sp, ang: Math.atan2(dy, dx), team: 1, model: pm[Math.floor(RND() * pm.length)] });
  for (let k = 0; k < 4; k++) G.reveal.push({ x: lerp(hq.x, x, .4 + k * .2), y: lerp(hq.by, y, .4 + k * .2), r: k === 3 ? 110 : 70, until: G.t + 20 });
  G.marker = { x, y, t0: G.t, kind: 'move' }; hooks.sfx('plane'); computeVis(1); return true;
}
/* now and then the enemy's recon plane flies over our positions: only for show, it reveals nothing to the enemy */
function enemyRecon() {
  const hq = G.teams[2].hq, myHQ = G.teams[1].hq; if (!hq || hq.dead) return;
  const own = G.units.filter(u => u.team === 1 && u.kind !== 'air' && unitAlive(u));
  const tg = own.length ? unitPos(own[Math.floor(RND() * own.length)]) : myHQ && !myHQ.dead ? [myHQ.x, myHQ.by] : null; if (!tg) return;
  const [x, y] = tg, dx = x - hq.x, dy = y - hq.by, d = hyp(dx, dy) || 1, sp = 140, pm = PLANE_MODELS[2].filter(hasFrame);
  G.planes.push({ x: hq.x - dx / d * 60, y: hq.by - dy / d * 60, vx: dx / d * sp, vy: dy / d * sp, ang: Math.atan2(dy, dx), team: 2, model: pm[Math.floor(RND() * pm.length)] });
  hooks.toast(t('m_enemyPlane'), 'bad'); hooks.sfx('plane'); hooks.ping(x, y, [255, 200, 80]);
}

/* ---------------------------------------------------------------- saving a battle
   kept: time, both sides' resources, reserves, research, buildings with their queues, every unit with its place, wounds and
   experience, the points, broken houses and the explored ground; not kept: shots in flight, smoke, marks on the ground */
const rle = a => { const out = []; let cur = 0, run = 0; for (let i = 0; i < a.length; i++) { const v = a[i] ? 1 : 0; if (v === cur) run++; else { out.push(run); cur = v; run = 1; } } out.push(run); return out; };
const unrle = (r, a) => { let i = 0, v = 0; for (const n of r) { if (v) a.fill(1, i, Math.min(a.length, i + n)); i += n; v ^= 1; } };
const r1 = v => Math.round(v * 10) / 10;
function saveState() {
  const keep = G.units.filter(u => unitAlive(u) && !u.gone && !(u.kind === 'air' && u.crash));
  const team = id => { const T = G.teams[id]; return { res: T.res, tickets: T.tickets, tech: [...T.tech], stats: T.stats, cd: T.cd, lowAlert: T.lowAlert, artyT: T.artyT, army: T.army }; };
  const bld = b => ({ team: b.team, type: b.type, x: b.ax, y: b.by, hp: r1(b.hp), built: b.built, auto: b.auto, v: b.v, sp: !!b.spotted, tur: r1(b.tur),
    queue: b.queue.map(q => ({ type: q.type, t: q.t, total: q.total, cost: q.cost })), research: b.research, rally: b.rally, span: b.span || undefined });
  const unit = u => {
    const o = { kind: u.kind, team: u.team, type: u.type, body: u.body, vet: u.vet };
    if (u.kind === 'squad') { o.m = u.members.filter(m => !m.dead).map(m => [r1(m.x), r1(m.y), r1(m.hp), m.w]); o.retreat = u.retreat; if (u.aboard) o.ab = keep.indexOf(u.aboard); }
    else { o.x = r1(u.x); o.y = r1(u.y); o.ang = r1(u.ang); o.hp = r1(u.hp); o.max = u.max; if (u.kind === 'veh') { o.tur = r1(u.tur); if (u.ut.sea) o.cargo = u.cargo; } else { o.alt = r1(u.alt); o.ammo = u.ammo; o.cargo = u.cargo; } }
    if (u.charge > G.t) o.ch = r1(u.charge); if (u.blitz > G.t) o.bz = r1(u.blitz);
    return o;
  };
  return { v: 1, map: G.def.id, diff: G.diffId, len: G.len, t: G.t, ePlaneT: G.ePlaneT, seenAir: G.seenAir, teams: { 1: team(1), 2: team(2) },
    points: G.map.points.map(p => [p.owner, r1(p.prog)]), houses: G.map.houses.map((h, i) => h.broken ? i : -1).filter(i => i >= 0),
    blds: G.blds.filter(b => !b.dead).map(bld), units: keep.map(unit),
    seen: rle(G.seen), cam: [r1(G.cam.x), r1(G.cam.y), G.zoom], drops: G.drops.map(d => ({ t: r1(d.t), x: r1(d.x), y: r1(d.y), team: d.team, n: d.n })),
    camp: G.camp ? JSON.parse(JSON.stringify(G.camp)) : undefined };      // step 8: the campaign battle's setup and veterans still on the way
}
function loadState(d) {
  const def = d && d.v === 1 && MAPS.find(m => m.id === d.map); if (!def) return false;
  newGame(def, d.diff, false); setBattleLength(d.len);
  for (const b of G.blds) markFoot(b, false);
  G.blds = []; G.units = []; G.sel.clear();
  G.t = d.t; G.ePlaneT = d.ePlaneT; G.seenAir = d.seenAir; G.drops = (d.drops || []).map(x => Object.assign({}, x));
  G.camp = d.camp ? JSON.parse(JSON.stringify(d.camp)) : null;
  for (const id of [1, 2]) { const s = d.teams[id], T = G.teams[id]; Object.assign(T.res, s.res); T.tickets = s.tickets; T.tech = new Set(s.tech); Object.assign(T.stats, s.stats); Object.assign(T.cd, s.cd); T.lowAlert = s.lowAlert; if (s.artyT != null) T.artyT = s.artyT; T.army = ARMY[s.army] ? s.army : null; T.hq = null; }
  d.points.forEach((p, i) => { const q = G.map.points[i]; if (q) { q.owner = p[0]; q.prog = p[1]; } });
  for (const i of d.houses) { const h = G.map.houses[i]; if (h && !h.broken) { h.broken = true; h.img = houseFrame(h, true); G.map.cctx.drawImage(h.img, h.x, h.y, h.w, h.h); } }
  for (const s of d.blds) {
    const b = addBld(s.team, s.type, s.x, s.y, s.built >= 1, s.auto, s.span);
    b.hp = s.hp; b.built = s.built; b.v = s.v || 0; b.spotted = s.sp; b.queue = s.queue || []; b.research = s.research || null; b.rally = s.rally || null; if (s.tur != null) b.tur = s.tur;
    if (s.type === 'hq') G.teams[s.team].hq = b;
  }
  const made = [];
  for (const s of d.units) {
    let u;
    if (s.kind === 'squad') { if (!s.m.length) continue; u = mkSquad(s.team, s.type, s.m[0][0], s.m[0][1], s.m.length); u.members.forEach((m, i) => { const q = s.m[i]; m.x = q[0]; m.y = q[1]; m.hp = q[2]; m.w = q[3]; }); u.retreat = !!s.retreat; }
    else if (s.kind === 'veh') { u = mkVeh(s.team, s.type, s.x, s.y, s.ang); u.tur = s.tur; u.hp = s.hp; u.max = s.max; u.cargo = !!s.cargo; }
    else { u = mkAir(s.team, s.type, s.x, s.y, s.ang); u.alt = s.alt; u.hp = s.hp; u.max = s.max; u.ammo = s.ammo; u.cargo = s.cargo; }
    const B = s.kind === 'air' ? HBODY[s.body] : VBODY[s.body]; if (s.kind !== 'squad' && B && B.t && B.t[s.team]) u.body = s.body;
    if (s.vet) u.vet = s.vet; if (s.ch) u.charge = s.ch; if (s.bz) u.blitz = s.bz; if (s.team === 2) u.ai = { task: null, until: 0 };
    G.units.push(u); made[d.units.indexOf(s)] = u;
  }
  d.units.forEach((s, i) => { const c = s.ab != null ? made[s.ab] : null, sq = made[i]; if (c && sq) { sq.aboard = c; c.cargoSq = sq; c.cargo = true; } });
  if (d.seen) unrle(d.seen, G.seen);
  rebuildE(); computeVis(1); computeVis(2); recalcSupply(1); recalcSupply(2);
  if (d.cam) { G.cam.x = d.cam[0]; G.cam.y = d.cam[1]; G.zoom = d.cam[2]; G.camFocus = null; }
  return true;
}

'use strict';
/* Battlefields: map definitions, terrain generation, cover, walk grids and path finding. */
const CELL = 6;
const blob = (x, y, e, list) => { let v = -1e9; for (const [cx, cy, r] of list) v = Math.max(v, r + 30 * e - hyp(x - cx, (y - cy) * 1.1)); return v; };
const band = (lo, hi, y) => Math.min(y - lo, hi - y);
const PT = (id, type, cx, cy, own) => ({ id, type, cx, cy, w: type === 'tw' ? 96 : type === 'vp' ? 64 : 52, h: type === 'tw' ? 76 : type === 'vp' ? 58 : 46, own: own || 0 });
/* step 5: key points are victory points and towns (a town also adds manpower, munitions and fuel) */
const isKey = p => p.type === 'vp' || p.type === 'tw';
const H = (x, y, w, o) => Object.assign({ x, y, w, rd: w >= 30 ? 13 : 12, hw: 8, win: w >= 30 ? [4, w - 9] : [3, w - 8], lit: [0, 0], door: (w >> 1) - 2 }, o || {});
const START_TOP = [{ type: 'riflemen', x: 378, y: 128 }, { type: 'riflemen', x: 262, y: 128 }, { type: 'mg', x: 320, y: 150 }];
/* the big map is the same for both sides turned 180 degrees around its centre: one half is listed, the other is added */
const BW = 1200, BH = 1500;
const both = list => list.concat(list.map(([x, y, ...r]) => [BW - x, BH - y, ...r]));
const bothH = list => list.concat(list.map(h => Object.assign({}, h, { x: BW - h.x, y: BH - h.y + h.rd })));
const bothP = list => list.concat(list.map(p => p.x0 != null ? Object.assign({}, p, { x0: BW - p.x1, x1: BW - p.x0, y: BH - p.y }) : Object.assign({}, p, { x: BW - p.x - (p.L || 0), y: BH - p.y })));
const BIG_WOODS = both([[100,110,110],[1100,110,100],[160,400,80],[470,420,55],[760,580,60],[140,600,45],[330,1260,70],[1050,1180,60]]);
/* step 4: the same 180-degree halves for the mission-size season maps (W x H); roads and rectangles get their own mirrors */
function sym(W, H) {
  return {
    both: list => list.concat(list.map(([x, y, ...r]) => [W - x, H - y, ...r])),
    bothH: list => list.concat(list.map(h => Object.assign({}, h, { x: W - h.x, y: H - h.y + h.rd }))),
    bothP: list => list.concat(list.map(p => p.x0 != null ? Object.assign({}, p, { x0: W - p.x1, x1: W - p.x0, y: H - p.y }) : Object.assign({}, p, { x: W - p.x - (p.L || 0), y: H - p.y }))),
    bothR: list => list.concat(list.map(r => ({ pts: r.pts.map(([x, y]) => [W - x, H - y]).reverse(), hw: r.hw }))),
    bothF: list => list.concat(list.map(([x0, y0, x1, y1]) => [W - x1, H - y1, W - x0, H - y0]))
  };
}
const S640 = sym(640, 1000), S760 = sym(760, 900), SBW = sym(BW, BH);
const BASE640 = { hq: { 1: [320, 950], 2: [320, 64] }, clear: [[150,20,490,180],[150,820,490,990]], clearings: [[320,90,150],[320,910,150]],
  start: { 1: [{ type: 'engineers', x: 300, y: 890 }, { type: 'riflemen', x: 262, y: 872 }, { type: 'riflemen', x: 378, y: 872 }, { type: 'mg', x: 320, y: 850 }], 2: START_TOP },
  enemyBase: { prebuilt: [{ type: 'barracks', x: 226, y: 104 }, { type: 'depot', x: 414, y: 98 }], slots: { motor: [440, 168], helipad: [210, 178], depot: [[476, 70], [166, 64]], aa: [[372, 200], [262, 200]] } } };
/* step 5: a two-storey town building (t_hall, t_ware, t_house, t_store, t_flats, t_long) standing with its front on y */
const TB = (x, y, kind, o) => Object.assign({ x, y, w: KIND_SIZES[kind][0], rd: 18, hw: 9, win: [], lit: [], door: 20, kind }, o || {});
const S760T = sym(760, 1000);
const BASE760 = { hq: { 1: [380, 950], 2: [380, 64] }, clear: [[210,20,550,180],[210,820,550,990]], clearings: [[380,90,150],[380,910,150]],
  start: { 1: [{ type: 'engineers', x: 360, y: 890 }, { type: 'riflemen', x: 322, y: 872 }, { type: 'riflemen', x: 438, y: 872 }, { type: 'mg', x: 380, y: 850 }],
    2: [{ type: 'riflemen', x: 438, y: 128 }, { type: 'riflemen', x: 322, y: 128 }, { type: 'mg', x: 380, y: 150 }] },
  enemyBase: { prebuilt: [{ type: 'barracks', x: 286, y: 104 }, { type: 'depot', x: 474, y: 98 }], slots: { motor: [500, 168], helipad: [270, 178], depot: [[536, 70], [226, 64]], aa: [[432, 200], [322, 200]] } } };
/* step 6: the strait (960 x 1200, grids line up exactly): an open sea across the middle with an island town, a coast for each side */
const S960 = sym(960, 1200);
const STRAIT_WOODS = S960.both([[80,120,90],[880,130,80],[110,300,40],[850,320,40],[300,250,30],[650,262,26]]);
const TOWN_WOODS = S760T.both([[60,110,80],[700,110,70],[90,330,40],[680,320,36],[230,250,26]]);
const SPRING_WOODS = S760.both([[60,80,80],[700,90,64],[80,330,46],[290,350,30],[720,700,44]]);
const SUMMER_WOODS = S640.both([[60,96,64],[594,90,50],[96,360,24],[560,250,24],[250,250,18]]);

const MAPS = [
  { id: 'village', w: 640, h: 1000, seed: 1944, light: 'dusk',
    roads: [{ pts: [[320,92],[318,140],[324,230],[318,380],[320,500],[322,620],[316,770],[322,860],[320,910]], hw: 8 },
            { pts: [[-10,512],[110,506],[220,500],[320,500],[420,500],[530,494],[650,488]], hw: 7 }],
    tracks: [{ pts: [[324,230],[230,212],[140,190],[-10,170]], hw: 4 }, { pts: [[316,770],[410,788],[500,810],[650,830]], hw: 4 }],
    forest: (x, y, e) => Math.max(Math.min(110 + 60 * e - x, band(170, 830, y)), Math.min(x - (530 + 60 * e), band(170, 830, y)), blob(x, y, e, [[60,80,70],[580,920,70],[592,86,60],[48,914,60],[200,640,30],[440,360,30]])),
    clearings: [[320,90,150],[320,910,150]], clear: [[150,20,490,180],[150,820,490,990]], trample: [320,500,130],
    houses: [H(250,482,30,{ lit:[1,0], chim:20 }), H(392,480,28,{ lit:[0,1], chim:5 }), H(230,420,26,{ chim:17 }), H(410,410,30,{ lit:[1,0] }), H(420,300,26,{ lit:[1,1] }),
      H(390,531,30,{ lit:[0,1], chim:20 }), H(248,533,28,{ lit:[1,0] }), H(410,593,26,{ lit:[1,1], chim:17 }), H(230,603,30,{ lit:[0,1] }), H(220,711,26,{ lit:[1,0] }),
      { x: 464, y: 614, w: 36, rd: 14, hw: 9, win: [], lit: [], door: 14, barn: 1 },
      H(176,402,28,{ kind:'h_long' }), H(255,760,30,{ kind:'r_a' }), H(470,455,30,{ kind:'r_b' })],
    wrecks: [[350,640],[290,362],[140,700,1]], tanks: [[150,610,3,0,1],[410,790,10,5]], campfires: [], fields: [[370,860,470,940]],
    props: [{ t: 'bags', x: 296, y: 466, L: 26 }, { t: 'bags', x: 318, y: 540, L: 26 }, { t: 'bags', x: 150, y: 478, L: 24 }, { t: 'bags', x: 466, y: 526, L: 24 },
      { t: 'fence', x0: 196, x1: 236, y: 450 }, { t: 'fence', x0: 404, x1: 444, y: 552 }, { t: 'wood', x: 222, y: 474 }, { t: 'wood', x: 420, y: 526 }, { t: 'wood', x: 448, y: 404 },
      { t: 'hay', x: 396, y: 900 }, { t: 'hay', x: 440, y: 884 }, { t: 'bales', x: 420, y: 925 }, { t: 'bales', x: 210, y: 735 },
      { t: 'wtower', x: 215, y: 335 }, { t: 'stump', x: 515, y: 330 }, { t: 'stump2', x: 120, y: 640 }, { t: 'fence2', x0: 262, x1: 300, y: 600 }, { t: 'barrel2', x: 352, y: 455 },
      { t: 'crates', x: 300, y: 645 }, { t: 'lamp2', x: 300, y: 548 }, { t: 'crate', x: 296, y: 386 }, { t: 'crate', x: 340, y: 618 },
      { t: 'bare', x: 205, y: 370 }, { t: 'bare', x: 436, y: 632 }, { t: 'bare', x: 130, y: 560 }, { t: 'bare', x: 510, y: 440 }, { t: 'bare', x: 268, y: 300 }, { t: 'bare', x: 372, y: 700 }],
    craters: [[400,712,6],[240,288,6],[182,800,7],[458,200,7],[452,620,5],[188,380,5],[270,840,6],[370,160,6]],
    points: [PT('A','vp',320,500), PT('B','vp',170,440), PT('C','vp',470,560), PT('m1','mp',250,660,1), PT('m2','mp',390,340,2), PT('f1','fu',190,780), PT('f2','fu',450,220), PT('u1','mu',470,740), PT('u2','mu',170,260)],
    hq: { 1: [320, 950], 2: [320, 64] },
    start: { 1: [{ type: 'engineers', x: 300, y: 890 }, { type: 'riflemen', x: 262, y: 872 }, { type: 'riflemen', x: 378, y: 872 }, { type: 'mg', x: 320, y: 850 }], 2: START_TOP },
    enemyBase: { prebuilt: [{ type: 'barracks', x: 226, y: 104 }, { type: 'depot', x: 414, y: 98 }], slots: { motor: [440, 168], helipad: [210, 178], depot: [[476, 70], [166, 64]], aa: [[372, 200], [262, 200]] } } },
  { id: 'river', w: 760, h: 900, seed: 4210, light: 'day',
    river: { pts: [[-10,440],[120,458],[260,446],[380,450],[500,454],[640,442],[770,460]], hw: 16, ice: .55, iceZones: [[380,450,82]] },
    roads: [{ pts: [[200,110],[198,260],[200,380],[200,450],[200,520],[194,640],[200,790]], hw: 7 }, { pts: [[560,790],[562,640],[560,520],[560,450],[560,380],[566,260],[560,110]], hw: 7 },
            { pts: [[200,790],[290,815],[380,830],[470,815],[560,790]], hw: 7 }, { pts: [[200,110],[290,85],[380,70],[470,85],[560,110]], hw: 7 }],
    tracks: [],
    forest: (x, y, e) => blob(x, y, e, [[60,80,80],[700,820,80],[700,90,70],[60,810,70],[90,330,60],[670,570,60],[380,320,44],[380,580,44],[30,520,50],[730,380,50]]),
    clearings: [], clear: [[150,10,610,180],[150,720,610,890]], trample: null,
    houses: [H(300,240,30,{ lit:[1,0], chim:20 }), H(460,236,28,{ lit:[0,1] }), H(250,380,26,{ lit:[1,0], chim:17 }), H(300,682,28,{ lit:[1,0] }), H(460,686,30,{ lit:[0,1], chim:20 }), H(510,532,26,{ lit:[0,1] }),
      H(115,505,30,{ kind:'r_b' }), H(640,395,30,{ kind:'r_a' }), H(300,565,30,{ kind:'h_conc' }), H(470,330,30,{ kind:'r_conc' })],
    wrecks: [[236,522],[524,384],[520,620,2]], tanks: [[455,570,6,1],[275,335,13,6,1]], campfires: [], fields: [],
    props: [{ t: 'bags', x: 168, y: 424, L: 20 }, { t: 'bags', x: 572, y: 486, L: 20 }, { t: 'bags', x: 350, y: 416, L: 22 }, { t: 'bags', x: 390, y: 492, L: 22 },
      { t: 'wire', x: 230, y: 470, L: 30 }, { t: 'wire', x: 500, y: 436, L: 30 }, { t: 'wood', x: 270, y: 236 }, { t: 'wood', x: 490, y: 682 }, { t: 'crate', x: 230, y: 392 }, { t: 'crate', x: 528, y: 512 }, { t: 'bales', x: 520, y: 255 }, { t: 'bales', x: 250, y: 700 },
      { t: 'wtower', x: 595, y: 640 }, { t: 'stump', x: 150, y: 420 }, { t: 'stump2', x: 690, y: 300 }, { t: 'fence3', x0: 320, x1: 350, y: 690 }, { t: 'crates', x: 255, y: 410 },
      { t: 'lamp2', x: 580, y: 495 }, { t: 'tent2', x: 615, y: 160 },
      { t: 'bare', x: 140, y: 400 }, { t: 'bare', x: 620, y: 500 }, { t: 'bare', x: 300, y: 300 }, { t: 'bare', x: 460, y: 600 }],
    craters: [[250,560,6],[510,340,6],[330,250,5],[430,650,5],[110,560,6],[650,340,6]],
    points: [PT('A','vp',200,450), PT('B','vp',380,450), PT('C','vp',560,450), PT('m1','mp',380,690,1), PT('m2','mp',380,210,2), PT('f1','fu',130,640), PT('f2','fu',630,260), PT('u1','mu',640,690), PT('u2','mu',120,210)],
    hq: { 1: [380, 872], 2: [380, 42] },
    start: { 1: [{ type: 'engineers', x: 350, y: 846 }, { type: 'riflemen', x: 300, y: 842 }, { type: 'riflemen', x: 460, y: 842 }, { type: 'mg', x: 380, y: 806 }], 2: [{ type: 'riflemen', x: 460, y: 60 }, { type: 'riflemen', x: 300, y: 60 }, { type: 'mg', x: 380, y: 94 }] },
    enemyBase: { prebuilt: [{ type: 'barracks', x: 260, y: 40 }, { type: 'depot', x: 500, y: 36 }], slots: { motor: [520, 160], helipad: [250, 166], depot: [[620, 50], [140, 48]], aa: [[440, 150], [320, 150]] } } },
  { id: 'forest', w: 640, h: 1000, seed: 7781, light: 'dusk',
    roads: [{ pts: [[320,92],[318,180],[326,320],[320,500],[314,680],[322,820],[320,910]], hw: 7 }],
    tracks: [{ pts: [[320,500],[230,440],[150,380]], hw: 4 }, { pts: [[320,500],[410,560],[490,620]], hw: 4 }, { pts: [[322,820],[400,808],[480,800]], hw: 4 },
             { pts: [[318,180],[240,192],[160,200]], hw: 4 }, { pts: [[314,700],[230,740],[150,760]], hw: 4 }, { pts: [[326,300],[410,260],[490,240]], hw: 4 }],
    forest: (x, y, e) => 30 + 20 * e,
    clearings: [[320,90,150],[320,910,150],[320,500,74],[150,380,58],[490,620,58],[480,800,44],[160,200,44],[150,760,44],[490,240,44],[320,700,40],[320,300,40],[350,606,28],[292,406,28]],
    clear: [[150,20,490,180],[150,820,490,990]], trample: [320,500,70],
    houses: [{ x: 250, y: 484, w: 34, rd: 14, hw: 9, win: [], lit: [], door: 13, barn: 1 }, H(150,345,22,{ rd:10, hw:7, win:[3], lit:[1], door:12 }), H(530,668,28,{ lit:[1,0], chim:20 }), H(390,520,22,{ rd:10, hw:7, win:[3], lit:[0], door:12 }),
      H(528,584,30,{ kind:'r_a' })],
    wrecks: [], tanks: [[350,600,4,2,1],[292,400,12,7]], campfires: [[492,256],[150,742]], fields: [],
    props: [{ t: 'logs', x: 300, y: 540 }, { t: 'logs', x: 344, y: 548 }, { t: 'logs', x: 360, y: 462 }, { t: 'mast', x: 172, y: 348 }, { t: 'tent', x: 284, y: 462 },
      { t: 'bags', x: 300, y: 466, L: 24 }, { t: 'bags', x: 316, y: 534, L: 24 }, { t: 'bags', x: 130, y: 414, L: 22 }, { t: 'bags', x: 486, y: 590, L: 22 }, { t: 'crate', x: 468, y: 812 }, { t: 'crate', x: 172, y: 188 },
      { t: 'wood', x: 506, y: 662 }, { t: 'bales', x: 470, y: 662 },
      { t: 'stump', x: 270, y: 525 }, { t: 'stump2', x: 110, y: 400 }, { t: 'stump', x: 520, y: 272 }, { t: 'tent2', x: 360, y: 530 }, { t: 'bare', x: 300, y: 860 }, { t: 'bare', x: 340, y: 140 }],
    craters: [[318,640,5],[322,360,5],[200,420,5],[440,580,5]],
    points: [PT('A','vp',320,500), PT('B','vp',150,380), PT('C','vp',490,620), PT('m1','mp',320,700,1), PT('m2','mp',320,300,2), PT('f1','fu',480,800), PT('f2','fu',160,200), PT('u1','mu',150,760), PT('u2','mu',490,240)],
    hq: { 1: [320, 950], 2: [320, 64] },
    start: { 1: [{ type: 'engineers', x: 300, y: 890 }, { type: 'riflemen', x: 262, y: 872 }, { type: 'riflemen', x: 378, y: 872 }, { type: 'mg', x: 320, y: 850 }], 2: START_TOP },
    enemyBase: { prebuilt: [{ type: 'barracks', x: 226, y: 104 }, { type: 'depot', x: 414, y: 98 }], slots: { motor: [440, 168], helipad: [210, 176], depot: [[476, 70], [166, 64]], aa: [[372, 214], [262, 150]] } } },
  { id: 'night', w: 640, h: 960, seed: 3108, light: 'night',
    roads: [{ pts: [[320,90],[318,200],[326,330],[320,480],[314,630],[322,760],[320,872]], hw: 8 }, { pts: [[-10,488],[160,484],[320,480],[480,476],[650,472]], hw: 7 },
            { pts: [[326,330],[400,300],[470,280]], hw: 6 }, { pts: [[314,630],[240,660],[170,680]], hw: 6 }],
    tracks: [],
    forest: (x, y, e) => Math.max(Math.min(100 + 50 * e - x, band(160, 800, y)), Math.min(x - (540 + 50 * e), band(160, 800, y)), blob(x, y, e, [[60,80,70],[580,880,70],[590,80,60],[50,880,60]])),
    clearings: [[320,80,150],[320,880,150]], clear: [[150,20,490,180],[150,790,490,950]], trample: [320,480,120],
    houses: [H(250,466,30,{ lit:[1,1], chim:20 }), H(392,464,28,{ lit:[1,0] }), H(390,510,30,{ lit:[0,1], chim:20 }), H(248,512,28,{ lit:[1,0] }), H(230,400,26,{ lit:[0,1] }), H(410,580,26,{ lit:[1,0], chim:17 }),
      H(455,655,30,{ kind:'r_a' }), H(165,355,30,{ kind:'r_b' }), H(510,560,30,{ kind:'h_conc' }), H(155,525,30,{ kind:'r_conc' })],
    wrecks: [[350,560],[290,400],[430,700,2]], tanks: [[255,305,2,1,1],[400,790,9,8]], campfires: [[470,300],[170,660]], fields: [],
    props: [{ t: 'lamp', x: 300, y: 456 }, { t: 'lamp', x: 342, y: 508 }, { t: 'barrels', x: 446, y: 342 }, { t: 'barrels', x: 456, y: 346 }, { t: 'crate', x: 494, y: 336 }, { t: 'crate', x: 146, y: 626 },
      { t: 'tent', x: 150, y: 606 }, { t: 'bags', x: 290, y: 446, L: 26 }, { t: 'bags', x: 324, y: 520, L: 26 }, { t: 'bags', x: 440, y: 286, L: 26 }, { t: 'bags', x: 150, y: 676, L: 26 },
      { t: 'bare', x: 200, y: 560 }, { t: 'bare', x: 440, y: 400 }, { t: 'wood', x: 228, y: 458 },
      { t: 'bales', x: 520, y: 420 }, { t: 'haypile', x: 215, y: 592 }, { t: 'bare', x: 520, y: 700 }, { t: 'bare', x: 150, y: 300 },
      { t: 'wtower', x: 200, y: 760 }, { t: 'stump', x: 130, y: 250 }, { t: 'stump2', x: 530, y: 250 }, { t: 'lamp2', x: 200, y: 470 }, { t: 'crates', x: 470, y: 365 }, { t: 'post', x: 300, y: 600 }],
    craters: [[260,620,6],[380,340,6],[180,420,5],[460,540,5]],
    points: [PT('A','vp',320,480), PT('B','vp',470,320), PT('C','vp',170,640), PT('m1','mp',330,690,1), PT('m2','mp',310,270,2), PT('f1','fu',470,770), PT('f2','fu',170,190), PT('u1','mu',150,820), PT('u2','mu',490,140)],
    hq: { 1: [320, 912], 2: [320, 62] },
    start: { 1: [{ type: 'engineers', x: 300, y: 852 }, { type: 'riflemen', x: 262, y: 834 }, { type: 'riflemen', x: 378, y: 834 }, { type: 'mg', x: 320, y: 812 }], 2: [{ type: 'riflemen', x: 378, y: 126 }, { type: 'riflemen', x: 262, y: 126 }, { type: 'mg', x: 320, y: 148 }] },
    enemyBase: { prebuilt: [{ type: 'barracks', x: 226, y: 104 }, { type: 'depot', x: 414, y: 98 }], slots: { motor: [430, 200], helipad: [220, 250], depot: [[470, 66], [166, 62]], aa: [[372, 214], [262, 150]] } } },
  // step 3: one big walkable winter map, 2.8 times a mission; five victory points and twelve sectors for a long battle
  { id: 'bigwinter', w: BW, h: BH, seed: 5521, light: 'day', big: true, sym: true,
    river: { pts: [[-10,760],[150,740],[330,750],[470,770],[600,750],[730,730],[870,750],[1050,760],[1210,740]], hw: 16, ice: .55, iceZones: [[600,750,96]] },
    roads: [{ pts: [[600,1430],[560,1300],[430,1150],[340,960],[330,750],[300,560],[380,380],[520,210],[600,84]], hw: 8 },
            { pts: [[600,70],[640,200],[770,350],[860,540],[870,750],[900,940],[820,1120],[680,1290],[600,1416]], hw: 8 }]
      .concat(SBW.bothR([{ pts: [[190,500],[430,500]], hw: 6, paved: 1 }, { pts: [[190,620],[405,620]], hw: 6, paved: 1 }])),       // step 5: town streets
    paved: SBW.bothF([[286,470,336,690]]), squares: SBW.bothF([[262,536,338,584]]),
    tracks: [{ pts: [[600,1180],[600,980],[600,800]], hw: 4 }, { pts: [[600,320],[600,520],[600,700]], hw: 4 }],
    forest: (x, y, e) => Math.max(Math.min(70 + 40 * e - x, band(230, 1270, y)), Math.min(x - (1130 + 40 * e), band(230, 1270, y)), blob(x, y, e, BIG_WOODS)),
    clearings: [[600,90,170],[600,1410,170]], clear: [[420,10,780,215],[420,1285,780,1490]], trample: [600,750,150],
    houses: bothH([TB(255,488,'t_hall'), TB(358,488,'t_store'), TB(222,590,'t_flats'), H(220,536,30,{ lit:[1,0], chim:20 }), TB(380,580,'t_long'), H(378,530,28,{ lit:[0,1] }),
      TB(255,668,'t_ware'), TB(350,668,'t_house'), H(400,700,30,{ kind:'r_b' }), H(170,470,26,{ chim:17 }), H(420,470,28),
      H(980,400,26,{ lit:[1,0] }), H(860,380,28,{ kind:'r_a' })]),
    wrecks: both([[460,700,1],[620,360,2]]),
    tanks: [[520,860,3,1,1],[680,640,11,5,1],[760,300,5,3],[440,1200,13,7],[1000,560,7,2],[200,940,15,6]],
    campfires: both([[960,460]]), fields: [[100,1120,200,1200],[1000,300,1100,380]],
    props: bothP([{ t: 'bags', x: 560, y: 700, L: 26 }, { t: 'bags', x: 880, y: 470, L: 24 }, { t: 'bags', x: 270, y: 600, L: 24 },
      { t: 'fence', x0: 150, x1: 190, y: 485 }, { t: 'fence2', x0: 390, x1: 430, y: 600 }, { t: 'barrels', x: 200, y: 640 }, { t: 'lamp2', x: 258, y: 532 }, { t: 'lamp2', x: 344, y: 532 },
      { t: 'crates', x: 292, y: 692 }, { t: 'hay', x: 150, y: 1160 }, { t: 'bales', x: 180, y: 1215 }, { t: 'lamp2', x: 355, y: 820 },
      { t: 'bare', x: 520, y: 600 }, { t: 'bare', x: 700, y: 560 }, { t: 'bare', x: 160, y: 700 }, { t: 'stump', x: 360, y: 300 }, { t: 'stump2', x: 1040, y: 620 },
      { t: 'tent2', x: 660, y: 560 }, { t: 'crates', x: 900, y: 520 }, { t: 'barrel2', x: 940, y: 470 }]),
    craters: both([[600,640,6],[520,720,5],[930,520,6],[300,420,5]]),
    points: [PT('A','vp',600,750), PT('B','tw',300,560), PT('C','tw',900,940), PT('D','vp',920,430), PT('E','vp',280,1070),
      PT('m1','mp',470,1240,1), PT('m2','mp',730,260,2), PT('m3','mp',440,640), PT('m4','mp',760,860),
      PT('f1','fu',1000,1270), PT('f2','fu',200,230), PT('f3','fu',1080,640), PT('f4','fu',120,860),
      PT('u1','mu',160,1290), PT('u2','mu',1040,210), PT('u3','mu',560,1010), PT('u4','mu',640,490)],
    hq: { 1: [600, 1450], 2: [600, 64] },
    start: { 1: [{ type: 'engineers', x: 580, y: 1392 }, { type: 'riflemen', x: 540, y: 1384 }, { type: 'riflemen', x: 660, y: 1384 }, { type: 'mg', x: 600, y: 1362 }],
      2: [{ type: 'riflemen', x: 660, y: 130 }, { type: 'riflemen', x: 540, y: 130 }, { type: 'mg', x: 600, y: 152 }] },
    enemyBase: { prebuilt: [{ type: 'barracks', x: 506, y: 104 }, { type: 'depot', x: 694, y: 98 }], slots: { motor: [720, 168], helipad: [490, 178], depot: [[756, 70], [446, 64]], aa: [[602, 214], [470, 232]] } } },
  // step 4: three season maps of mission size; like the big map each is the same for both sides turned 180 degrees
  // spring thaw: an open river with three bridges, sodden fields and mud that holds vehicles off the roads
  { id: 'spring', w: 760, h: 900, seed: 3317, light: 'day', season: 'spring', sym: true,
    river: { pts: [[-10,440],[110,466],[240,452],[380,450],[520,448],[650,434],[770,460]], hw: 15, ice: 2, iceZones: [] },
    roads: [{ pts: [[380,48],[374,170],[386,320],[380,450],[374,580],[386,730],[380,852]], hw: 8 }].concat(S760.bothR([{ pts: [[372,170],[260,240],[170,330],[150,452],[156,560],[190,640],[250,700],[320,728],[386,730]], hw: 7 }])),
    tracks: S760.bothR([{ pts: [[156,560],[90,610],[-10,640]], hw: 4 }]),
    forest: (x, y, e) => blob(x, y, e, SPRING_WOODS),
    clearings: [], clear: [[150,10,610,180],[150,720,610,890]], trample: null,
    fields: S760.bothF([[30,500,120,600],[250,560,340,630]]),
    houses: S760.bothH([H(212,560,26,{ lit:[1,0], chim:17 }), H(255,672,26), H(130,668,30,{ kind:'r_b' }), H(300,520,30,{ kind:'h_long' }), H(60,700,28,{ chim:20 })]),
    wrecks: S760.both([[236,524]]), tanks: S760.both([[470,600,6,1],[240,380,13,6,1]]), campfires: [],
    props: S760.bothP([{ t: 'bags', x: 168, y: 424, L: 20 }, { t: 'bags', x: 350, y: 418, L: 22 }, { t: 'wire', x: 230, y: 476, L: 28 }, { t: 'crate', x: 230, y: 396 },
      { t: 'wood', x: 286, y: 516 }, { t: 'bales', x: 280, y: 548 }, { t: 'haypile', x: 70, y: 490 }, { t: 'crates', x: 184, y: 540 }, { t: 'stump', x: 150, y: 420 }, { t: 'stump2', x: 330, y: 650 },
      { t: 'tent2', x: 110, y: 760 }, { t: 'bare', x: 140, y: 400 }, { t: 'bare', x: 300, y: 600 }, { t: 'bare', x: 210, y: 700 }, { t: 'lamp2', x: 236, y: 580 }]),
    craters: S760.both([[250,560,6],[330,250,5],[110,560,6],[440,640,5]]),
    points: [PT('A','vp',380,450), PT('B','vp',205,610), PT('C','vp',555,290), PT('m1','mp',380,690,1), PT('m2','mp',380,210,2), PT('f1','fu',620,640), PT('f2','fu',140,260), PT('u1','mu',100,740), PT('u2','mu',660,160)],
    hq: { 1: [380, 872], 2: [380, 42] },
    start: { 1: [{ type: 'engineers', x: 350, y: 846 }, { type: 'riflemen', x: 300, y: 842 }, { type: 'riflemen', x: 460, y: 842 }, { type: 'mg', x: 380, y: 806 }], 2: [{ type: 'riflemen', x: 460, y: 60 }, { type: 'riflemen', x: 300, y: 60 }, { type: 'mg', x: 380, y: 94 }] },
    enemyBase: { prebuilt: [{ type: 'barracks', x: 260, y: 40 }, { type: 'depot', x: 500, y: 36 }], slots: { motor: [520, 160], helipad: [250, 166], depot: [[620, 50], [140, 48]], aa: [[440, 150], [320, 150]] } } },
  // summer fields: a village at the crossroads, wheat and tall grass that hide infantry until it fires
  Object.assign({}, BASE640, { id: 'summer', w: 640, h: 1000, seed: 6107, light: 'day', season: 'summer', sym: true,
    roads: [{ pts: [[320,92],[316,230],[326,370],[320,500],[314,630],[324,770],[320,908]], hw: 8 }, { pts: [[-10,512],[160,506],[320,500],[480,494],[650,488]], hw: 7 }],
    tracks: S640.bothR([{ pts: [[316,236],[230,256],[130,290],[-10,300]], hw: 4 }]),
    forest: (x, y, e) => Math.max(Math.min(70 + 34 * e - x, band(200, 800, y)), Math.min(x - (570 + 34 * e), band(200, 800, y)), blob(x, y, e, SUMMER_WOODS)),
    trample: [320,500,110],
    fields: S640.bothF([[50,572,170,660],[196,300,300,392],[120,740,180,800]]),
    meadows: S640.both([[130,452,34],[214,676,26],[540,200,30],[548,606,24]]),
    houses: S640.bothH([H(250,482,30,{ lit:[1,0], chim:20 }), H(392,480,28,{ chim:5 }), H(230,420,26,{ chim:17 }), H(410,410,30,{ kind:'h_long' }), H(420,300,26),
      { x: 464, y: 614, w: 36, rd: 14, hw: 9, win: [], lit: [], door: 14, barn: 1 }, H(470,455,30,{ kind:'r_b' })]),
    wrecks: S640.both([[290,662],[140,700,1]]), tanks: S640.both([[240,760,3,0,1],[500,690,11,5]]), campfires: [],
    props: S640.bothP([{ t: 'bales', x: 110, y: 668 }, { t: 'haypile', x: 186, y: 640 }, { t: 'hay', x: 90, y: 540 }, { t: 'fence', x0: 196, x1: 236, y: 452 }, { t: 'wood', x: 222, y: 474 },
      { t: 'bags', x: 296, y: 466, L: 26 }, { t: 'bags', x: 150, y: 478, L: 24 }, { t: 'crates', x: 300, y: 645 }, { t: 'barrel2', x: 352, y: 455 }, { t: 'stump', x: 515, y: 330 },
      { t: 'tent2', x: 560, y: 760 }, { t: 'lamp2', x: 300, y: 548 }, { t: 'bare', x: 268, y: 300 }, { t: 'fence3', x0: 520, x1: 560, y: 572 }]),
    craters: S640.both([[400,712,6],[240,288,6],[458,200,7],[188,380,5]]),
    points: [PT('A','vp',320,500), PT('B','vp',170,440), PT('C','vp',470,560), PT('m1','mp',250,660,1), PT('m2','mp',390,340,2), PT('f1','fu',190,780), PT('f2','fu',450,220), PT('u1','mu',470,740), PT('u2','mu',170,260)] }),
  // autumn fog: golden larches, firs and bare trees around small clearings; fog shortens everyone's sight
  Object.assign({}, BASE640, { id: 'autumn', w: 640, h: 1000, seed: 8822, light: 'day', season: 'autumn', sym: true,
    roads: [{ pts: [[320,92],[318,190],[326,330],[320,500],[314,670],[322,810],[320,908]], hw: 7 }],
    tracks: S640.bothR([{ pts: [[320,500],[240,440],[160,380]], hw: 4 }, { pts: [[326,330],[400,290],[470,250]], hw: 4 }, { pts: [[318,190],[240,198],[150,204]], hw: 4 }, { pts: [[160,380],[136,480],[120,590]], hw: 4 }]),
    forest: (x, y, e) => 28 + 18 * e,
    clearings: BASE640.clearings.concat(S640.both([[320,500,78],[160,380,58],[470,250,46],[150,204,44],[320,300,40],[120,590,40],[230,640,30],[350,606,26],[210,460,24],[528,580,24]])),
    trample: [320,500,60],
    fields: S640.bothF([[40,640,120,700]]),
    houses: S640.bothH([H(252,484,30,{ lit:[1,0], chim:20 }), H(390,470,26,{ chim:17 }), H(160,345,22,{ rd:10, hw:7, win:[3], lit:[1], door:12 }), H(528,584,30,{ kind:'r_a' })]),
    wrecks: [], tanks: S640.both([[350,606,4,2,1],[210,460,12,7]]), campfires: S640.both([[540,250]]),
    props: S640.bothP([{ t: 'logs', x: 300, y: 540 }, { t: 'tent', x: 284, y: 462 }, { t: 'bags', x: 130, y: 414, L: 22 }, { t: 'crate', x: 468, y: 812 }, { t: 'bales', x: 80, y: 630 },
      { t: 'haypile', x: 90, y: 712 }, { t: 'stump', x: 270, y: 525 }, { t: 'stump2', x: 110, y: 400 }, { t: 'bare', x: 300, y: 860 }, { t: 'wood', x: 196, y: 640 }]),
    craters: S640.both([[318,640,5],[200,420,5]]),
    points: [PT('A','vp',320,500), PT('B','vp',160,380), PT('C','vp',480,620), PT('m1','mp',320,700,1), PT('m2','mp',320,300,2), PT('f1','fu',490,796), PT('f2','fu',150,204), PT('u1','mu',170,750), PT('u2','mu',470,250)] }),
  // step 5: a winter town at the crossroads: paved streets, a square with two burnt-out tanks in opposite corners, rows of two-storey buildings; the town is the key point A
  Object.assign({}, BASE760, { id: 'town', w: 760, h: 1000, seed: 2510, light: 'day', sym: true,
    roads: S760T.bothR([{ pts: [[380,92],[378,200],[382,300],[380,372]], hw: 8 }, { pts: [[-10,506],[90,504],[170,500]], hw: 7 }])
      .concat([{ pts: [[380,360],[380,640]], hw: 8, paved: 1 }, { pts: [[160,500],[600,500]], hw: 8, paved: 1 }])
      .concat(S760T.bothR([{ pts: [[184,430],[576,430]], hw: 6, paved: 1 }, { pts: [[250,396],[250,604]], hw: 6, paved: 1 }])),
    tracks: S760T.bothR([{ pts: [[120,470],[128,380],[150,262]], hw: 4 }]),
    squares: [[334,470,426,530]],
    forest: (x, y, e) => Math.max(Math.min(46 + 30 * e - x, band(160, 840, y)), Math.min(x - (714 + 30 * e), band(160, 840, y)), blob(x, y, e, TOWN_WOODS)),
    fields: S760T.bothF([[470,250,570,320]]), trample: [380,500,170],
    houses: S760T.bothH([TB(217,418,'t_flats'), TB(284,418,'t_hall'), TB(340,418,'t_house'), TB(420,418,'t_store'), H(474,418,30,{ lit:[1,0], chim:20 }), TB(544,418,'t_ware'),
      TB(291,482,'t_long'), TB(469,482,'t_house'), H(217,482,30,{ lit:[0,1] }), H(543,482,30,{ chim:5 }),
      H(214,372,28,{ chim:17 }), H(300,368,26,{ lit:[1,0] }), H(462,372,28,{ kind:'h_long' }), H(548,366,26), H(160,560,28,{ lit:[1,0], chim:20 })]),
    wrecks: S760T.both([[300,300]]), tanks: S760T.both([[350,482,4,2,1],[120,640,11,6],[590,300,3,1]]), campfires: S760T.both([[90,600]]),
    props: S760T.bothP([{ t: 'bags', x: 336, y: 470, L: 24 }, { t: 'bags', x: 400, y: 470, L: 24 }, { t: 'lamp2', x: 330, y: 464 }, { t: 'lamp2', x: 430, y: 464 },
      { t: 'lamp2', x: 260, y: 442 }, { t: 'lamp2', x: 500, y: 442 }, { t: 'crates', x: 522, y: 446 }, { t: 'barrels', x: 566, y: 446 }, { t: 'crate', x: 200, y: 446 },
      { t: 'barrel2', x: 310, y: 446 }, { t: 'wood', x: 236, y: 388 }, { t: 'fence', x0: 186, x1: 226, y: 386 }, { t: 'fence2', x0: 500, x1: 540, y: 388 },
      { t: 'post', x: 120, y: 540 }, { t: 'bales', x: 520, y: 336 }, { t: 'stump', x: 640, y: 280 }, { t: 'bare', x: 350, y: 330 }, { t: 'bare', x: 160, y: 420 }]),
    craters: S760T.both([[200,640,6],[300,780,6],[470,200,6]]),
    points: [PT('A','tw',380,500), PT('B','vp',120,500), PT('C','vp',640,500), PT('m1','mp',380,740,1), PT('m2','mp',380,260,2), PT('f1','fu',610,760), PT('f2','fu',150,240), PT('u1','mu',150,780), PT('u2','mu',610,220)] }),
  // step 6: the strait: a winter sea between two coasts with a fishing town on an island (key point A). Infantry and vehicles cross
  // only on pontoon bridges over the two channels; landing boats and transport helicopters carry squads over the water
  { id: 'strait', w: 960, h: 1200, seed: 6633, light: 'day', sym: true, sea: true,
    river: { pts: [[-10,600],[200,588],[480,600],[760,612],[970,600]], hw: 128, ice: 2, iceZones: [] },
    islands: [[480,600,150,64]], crossings: S960.both([[430,505],[530,505]]),
    roads: S960.bothR([{ pts: [[480,92],[478,200],[482,320],[480,424]], hw: 8 }, { pts: [[90,410],[220,422],[360,428],[480,424],[620,428],[760,418],[880,404]], hw: 7 }])
      .concat([{ pts: [[360,600],[600,600]], hw: 6, paved: 1 }]),
    tracks: S960.bothR([{ pts: [[220,422],[200,330],[170,230]], hw: 4 }]),
    squares: [[452,586,508,614]],
    forest: (x, y, e) => Math.max(Math.min(50 + 30 * e - x, band(160, 1040, y)), Math.min(x - (910 + 30 * e), band(160, 1040, y)), blob(x, y, e, STRAIT_WOODS)),
    clearings: [[480,90,150],[480,1110,150]], clear: [[310,20,650,180],[310,1020,650,1180]], trample: [480,600,60],
    fields: S960.bothF([[600,240,700,310]]),
    houses: S960.bothH([TB(404,584,'t_house'), TB(556,584,'t_hall'), H(360,596,26,{ lit:[1,0], chim:17 }),
      H(150,380,28,{ chim:20 }), H(250,370,26,{ lit:[1,0] }), H(700,388,28,{ kind:'h_long' }), H(800,372,26), H(560,360,28,{ kind:'r_a' })]),
    wrecks: S960.both([[330,330]]), tanks: S960.both([[650,370,5,1,1],[120,436,3,6]]), campfires: S960.both([[860,250]]),
    props: S960.bothP([{ t: 'bags', x: 170, y: 448, L: 26 }, { t: 'bags', x: 740, y: 462, L: 26 }, { t: 'wire', x: 560, y: 452, L: 30 }, { t: 'bags', x: 456, y: 584, L: 22 },
      { t: 'lamp2', x: 448, y: 580 }, { t: 'crates', x: 600, y: 590 }, { t: 'barrels', x: 382, y: 612 }, { t: 'wood', x: 330, y: 384 }, { t: 'fence', x0: 130, x1: 170, y: 392 },
      { t: 'crate', x: 268, y: 396 }, { t: 'stump', x: 640, y: 210 }, { t: 'bare', x: 410, y: 350 }, { t: 'bare', x: 90, y: 520 }, { t: 'hay', x: 620, y: 300 }]),
    craters: S960.both([[300,460,6],[620,456,6],[480,380,6]]),
    points: [PT('A','tw',480,600), PT('B','vp',190,420), PT('C','vp',770,780), PT('m1','mp',480,900,1), PT('m2','mp',480,300,2), PT('f1','fu',790,970), PT('f2','fu',170,230),
      PT('u1','mu',170,960), PT('u2','mu',790,240), PT('u3','mu',760,420), PT('u4','mu',200,780)],
    hq: { 1: [480, 1150], 2: [480, 64] },
    start: { 1: [{ type: 'engineers', x: 460, y: 1090 }, { type: 'riflemen', x: 422, y: 1072 }, { type: 'riflemen', x: 538, y: 1072 }, { type: 'mg', x: 480, y: 1050 }],
      2: [{ type: 'riflemen', x: 538, y: 128 }, { type: 'riflemen', x: 422, y: 128 }, { type: 'mg', x: 480, y: 150 }] },
    enemyBase: { prebuilt: [{ type: 'barracks', x: 386, y: 104 }, { type: 'depot', x: 574, y: 98 }],
      slots: { motor: [600, 168], helipad: [370, 178], depot: [[636, 70], [326, 64]], aa: [[532, 200], [422, 200]], dock: [330, 448] } } }
];
/* step 8: three winter maps in another season, for the campaign «Four Seasons» and for single battles. Each keeps its ground and
   seed (the same place) and takes the season's palette, trees and rules: the town in the spring mud, the strait in summer with tall
   grass on both coasts, the river in autumn fog, open now, so a third bridge is laid at the middle key point */
const seasonal = (id, base, season, extra) => Object.assign({}, MAPS.find(m => m.id === base), { id, base, season }, extra || {});
MAPS.push(
  seasonal('town_sp', 'town', 'spring'),
  seasonal('strait_su', 'strait', 'summer', { meadows: S960.both([[360,330,30],[650,350,26],[150,340,24],[820,470,20]]) }),
  seasonal('river_au', 'river', 'autumn', { roads: MAPS.find(m => m.id === 'river').roads.concat([{ pts: [[380,372],[380,528]], hw: 6 }]) })
);

function catmull(pts, step = 1.5) {
  const P = pts.map(p => [p[0], p[1]]);
  P.unshift([2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]]);
  const n0 = P.length; P.push([2 * P[n0 - 1][0] - P[n0 - 2][0], 2 * P[n0 - 1][1] - P[n0 - 2][1]]);
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const n = Math.max(2, Math.floor(hyp(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const tt = k / n, t2 = tt * tt, t3 = t2 * tt;
      out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * tt + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(P[P.length - 2]);
  return out;
}
function rasterPoly(pts, margin, W, H, cb, step) {
  const poly = catmull(pts, step || 3);
  for (let k = 0; k < poly.length - 1; k++) {
    const a = poly[k], b = poly[k + 1];
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - margin)), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0]) + margin));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - margin)), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1]) + margin));
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let tt = ((x - a[0]) * dx + (y - a[1]) * dy) / L2; tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
      const ex = x - (a[0] + tt * dx), ey = y - (a[1] + tt * dy), d = Math.sqrt(ex * ex + ey * ey);
      cb(y * W + x, d, (dx * (y - a[1]) - dy * (x - a[0])) < 0 ? -d : d);
    }
  }
}
function halfField(W, H, fn) {
  const w2 = (W >> 1) + 2, h2 = (H >> 1) + 2, a = new Float32Array(w2 * h2), out = new Float32Array(W * H);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) a[y * w2 + x] = fn(x * 2, y * 2);
  for (let y = 0; y < H; y++) { const y0 = y >> 1, ty = (y & 1) * .5; for (let x = 0; x < W; x++) { const x0 = x >> 1, tx = (x & 1) * .5, i = y0 * w2 + x0; out[y * W + x] = a[i] * (1 - tx) * (1 - ty) + a[i + 1] * tx * (1 - ty) + a[i + w2] * (1 - tx) * ty + a[i + w2 + 1] * tx * ty; } }
  return out;
}
function fieldStats(a) { let s = 0, q = 0, n = 0; for (let i = 0; i < a.length; i += 7) { s += a[i]; q += a[i] * a[i]; n++; } const m = s / n; return [m, Math.sqrt(Math.max(1e-9, q / n - m * m))]; }

/* footprint rectangles of base buildings (anchor = centre of the front edge) */
function footOf(type, x, y) { const f = BT[type].foot; return [x - f[0], y - f[1], x + f[0], y]; }

/* a house picture for the map's season: outside winter the snow on the roof is repainted (h.roof) */
function houseFrame(h, dmg) { const n = h.fname + (dmg ? '_dmg' : ''); return h.thaw ? thawCv(n, h.roof) : atlasCv(n); }
function buildMap(def) {
  const W = def.w, H = def.h, N = W * H, sd = def.seed, R = rng32(sd), SZ = seasonOf(def), S = SZ.pal || (def.light === 'day' ? SNOW_DAY : SNOW_DUSK);
  const hgt = halfField(W, H, (x, y) => fbm(x / 56, y / 56, sd + 4, 3));
  const edge = halfField(W, H, (x, y) => fbm(x / 38, y / 38, sd + 5, 3) - .5);
  const lo = halfField(W, H, (x, y) => fbm(x / 160, y / 160, sd + 1, 2));
  const mid = halfField(W, H, (x, y) => fbm(x / 30, y / 30, sd + 2, 2));
  const hi = new Float32Array(N), st = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; hi[i] = vnoise(x / 2.5, y / 2.5, sd + 3); st[i] = vnoise((x + .3 * y) / 16, y / 3, sd + 21); }
  const RD = new Float32Array(N).fill(1e9), RSD = new Float32Array(N), RHW = new Float32Array(N), RK = new Uint8Array(N);
  const PV = new Uint8Array(N);      // step 5: paved town streets and squares
  const addRoad = (r, kind) => rasterPoly(r.pts, r.hw + 12, W, H, (i, d, s) => { const e = d - r.hw; if (e < RD[i]) { RD[i] = e; RSD[i] = s; RHW[i] = r.hw; RK[i] = kind; } if (r.paved && e < .5) PV[i] = 1; });
  (def.roads || []).forEach(r => addRoad(r, 1)); (def.tracks || []).forEach(r => addRoad(r, 2));
  for (const [x0, y0, x1, y1] of def.squares || []) for (let y = Math.max(0, y0 - 12); y < Math.min(H, y1 + 12); y++) for (let x = Math.max(0, x0 - 12); x < Math.min(W, x1 + 12); x++) {
    const i = y * W + x, dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1), e = dx || dy ? hyp(dx, dy) : -Math.min(x - x0, x1 - x, y - y0, y1 - y);
    if (e < RD[i]) { RD[i] = e; RSD[i] = 99; RHW[i] = 99; RK[i] = 1; } if (e < .5) PV[i] = 1;
  }
  for (const [x0, y0, x1, y1] of def.paved || []) for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) { const i = y * W + x; if (RK[i] === 1 && RD[i] < .5) PV[i] = 1; }
  const WD = new Float32Array(N).fill(1e9);
  if (def.river) rasterPoly(def.river.pts, def.river.hw + 14, W, H, (i, d) => { const e = d - def.river.hw; if (e < WD[i]) WD[i] = e; }, def.sea ? 12 : 3);
  // step 6: islands rise out of the water: inside the ellipse the ground is land, around it the water gets shallow
  for (const [cx, cy, rx, ry] of def.islands || []) for (let y = Math.max(0, cy - ry - 40); y < Math.min(H, cy + ry + 40); y++) for (let x = Math.max(0, cx - rx - 40); x < Math.min(W, cx + rx + 40); x++) {
    const i = y * W + x, ei = def.sym ? (2 * y > H - 1 ? (H - 1 - y) * W + (W - 1 - x) : i) : i, q = hyp((x - cx) / rx, (y - cy) / ry) - .05 * edge[ei];
    WD[i] = Math.max(WD[i], (1 - q) * Math.min(rx, ry));
  }
  const KIND = new Uint8Array(N), block = new Uint8Array(N), shadow = new Uint8Array(N), FD = new Float32Array(N), SF = new Float32Array(N);
  const iceZ = def.river && SZ.snow ? def.river.iceZones || [] : [];
  const GR = new Uint8Array(N), meadows = SZ.grass ? def.meadows || [] : [];      // summer: tall grass that hides infantry
  // maps marked sym read the noise of the southern half from the mirrored northern point, so forest edges, grass and mud match after a 180-degree turn
  const symI = def.sym ? (x, y) => (2 * y > H - 1 ? (H - 1 - y) * W + (W - 1 - x) : y * W + x) : (x, y) => y * W + x;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, e = edge[symI(x, y)];
    let v = def.forest(x, y, e);
    for (const [cx, cy, r] of def.clearings || []) v = Math.min(v, hyp(x - cx, (y - cy) * 1.1) - r - 14 * e);
    if (RK[i] === 1 || RK[i] === 2) v = Math.min(v, RD[i] - 3);
    v = Math.min(v, WD[i] - 4);
    FD[i] = clamp(v / 14, 0, 1); SF[i] = clamp((v + 3) / 12, 0, 1);
    if (meadows.length && v < -2 && RD[i] > 1 && WD[i] > 3) for (const [cx, cy, r] of meadows) if (hyp(x - cx, (y - cy) * 1.1) < r + 12 * e) { GR[i] = 1; break; }
    if (WD[i] < 0) {
      let ice = SZ.snow && mid[symI(x, y)] > def.river.ice; for (const [cx, cy, r] of iceZ) if (hyp(x - cx, y - cy) < r + 10 * e) ice = true;
      KIND[i] = (RK[i] === 1 && RD[i] < .5) ? 4 : ice ? 2 : 3;
    }
    if ((RK[i] === 1 || RK[i] === 2) && RD[i] < 2) block[i] = 1;
    if (WD[i] < 3) block[i] = 1;
  }
  const blockRect = (x0, y0, x1, y1) => { for (let y = Math.max(0, y0 | 0); y < Math.min(H, y1 | 0); y++) for (let x = Math.max(0, x0 | 0); x < Math.min(W, x1 | 0); x++) block[y * W + x] = 1; };
  const shadowRect = (x0, y0, x1, y1) => { for (let y = Math.max(0, y0 | 0); y < Math.min(H, y1 | 0); y++) for (let x = Math.max(0, x0 | 0); x < Math.min(W, x1 | 0); x++) shadow[y * W + x] = 1; };
  for (const f of def.fields || []) { blockRect(f[0], f[1], f[2], f[3]); for (let y = f[1]; y < f[3]; y++) for (let x = f[0]; x < f[2]; x++) if (KIND[y * W + x] === 0) KIND[y * W + x] = 5; }
  for (const r of def.clear || []) blockRect(r[0], r[1], r[2], r[3]);
  const points = def.points.map(p => { const o = { id: p.id, type: p.type, cx: p.cx, cy: p.cy, x0: p.cx - p.w / 2, y0: p.cy - p.h / 2, x1: p.cx + p.w / 2, y1: p.cy + p.h / 2, prog: p.own === 1 ? 1 : p.own === 2 ? -1 : 0, owner: p.own || 0 }; blockRect(o.x0 + 4, o.y0 + 4, o.x1 - 4, o.y1 - 4); return o; });
  for (const team of [1, 2]) { const [x, y] = def.hq[team]; blockRect(x - 30, y - 50, x + 30, y + 12); for (const s of def.start[team]) blockRect(s.x - 18, s.y - 14, s.x + 18, s.y + 14); }
  for (const b of def.enemyBase.prebuilt) { const f = footOf(b.type, b.x, b.y); blockRect(f[0] - 6, f[1] - 30, f[2] + 6, f[3] + 8); }
  const sl = def.enemyBase.slots; for (const [type, p] of [['motor', sl.motor], ['helipad', sl.helipad]].concat(sl.depot.map(p => ['depot', p]), sl.aa.map(p => ['aanest', p]))) { const f = footOf(type, p[0], p[1]); blockRect(f[0] - 6, f[1] - 30, f[2] + 6, f[3] + 8); }
  const statics = [], houses = [], emitters = [], lights = [], fires = [], solids = [], heavy = [], light = [];
  const addStatic = (img, x, y, by, extra) => { const o = Object.assign({ img, x: snapRS(x), y: snapRS(y), by, w: img.width / RS, h: img.height / RS }, extra || {}); statics.push(o); return o; };
  const pools = [];
  const addHouse = spec => {
    const name = houseName(spec), thaw = !SZ.snow, roof = thaw ? roofOf(name, spec.x, spec.y) : null, img = houseFrame({ fname: name, roof, thaw }, spec.ruin), meta = fmeta(name);
    const w = img.width / RS, h = img.height / RS, sx = snapRS(spec.x - w / 2), sy = snapRS(spec.y + 1 - h), rd = spec.rd, cm = Math.round(h * .3);
    const foot = [sx + 1, spec.y - rd + 1, sx + w - 1, spec.y + 1];
    const o = addStatic(img, sx, sy, spec.y, { house: true, spec, foot, cm, fname: name, roof, thaw, broken: !!spec.ruin, dmgSeed: (spec.x * 31 + spec.y) | 0 });
    houses.push(o); solids.push(foot); heavy.push(foot);
    blockRect(sx - 5, spec.y - rd - spec.hw - 6, sx + w + 5, spec.y + 7);
    for (let y = spec.y - rd + 2; y <= spec.y; y++) shadowRect(sx + w, y, sx + w + 15 + (y % 2), y + 1);
    const nLit = spec.ruin ? 0 : (spec.lit || []).filter(v => v).length, wins = (meta.lit || []).slice();
    const lit = [];
    for (let k = 0; k < nLit && wins.length; k++) { const wi = wins.splice(k % 2 ? wins.length - 1 : 0, 1)[0]; lit.push(wi); }
    for (const [lx, ly] of lit) { const wx = sx + lx / RS; pools.push([Math.round(wx), spec.y]); lights.push({ x: wx, y: sy + ly / RS + 2, r: 26, s: .75 }); }
    if (meta.chim && lit.length) emitters.push({ x: sx + meta.chim[0] / RS, y: sy + meta.chim[1] / RS - 1, w: 1, rate: 2.4, kind: 'smoke', pal: SMOKE_LIGHT, vy: [-10, -7], r: [.6, 1.6, 2.4], life: [2.8, 3.8], a0: .5 });
  };
  for (const h of def.houses || []) addHouse(h);
  // burnt-out tanks: top-down wrecks at a fixed heading [x, y, heading 0..15, kind, smoke]; like the truck they block the way and give heavy cover
  for (const [x, y, d, k, smoke] of def.tanks || []) {
    const c = wreckTankImg(k, d), s = (c.width - 4) / RS, th = (d & 15) * TAU / 16;
    const ex = Math.abs(Math.sin(th)) * 12 + Math.abs(Math.cos(th)) * 7, ey = Math.abs(Math.cos(th)) * 12 + Math.abs(Math.sin(th)) * 7;
    addStatic(c, x - s / 2, y - s / 2, y + 2, { wreck: true });
    solids.push([x - ex, y - ey, x + ex, y + ey]); heavy.push([x - ex - 1, y - ey - 1, x + ex + 1, y + ey + 1]);
    blockRect(x - ex - 4, y - ey - 6, x + ex + 4, y + ey + 4);
    if (smoke) emitters.push({ x, y: y - 2, w: 4, rate: 3, kind: 'smoke', pal: SMOKE_GREY, vy: [-12, -8], r: [.6, 1.8, 2.6], life: [4, 6], a0: .55 });
  }
  // burnt trucks [x, y, kind]: 0 grey, 1 rusty, 2 one whose flames are already in the picture (no drawn fire on top)
  for (const [x, y, k] of def.wrecks || []) {
    const tn = TRUCKS[k || 0], truck = atlasCv(tn), tm = fmeta(tn), tw = truck.width / RS, th = truck.height / RS;
    const x0 = x - tw / 2, y0 = y + 1 - th, fx = x0 + tm.fire[0] / RS, fy = y0 + tm.fire[1] / RS;
    addStatic(truck, x0, y0, y, { wreck: true }); solids.push([x - tw / 2 + 1, y - 6, x + tw / 2 - 1, y + 1]); heavy.push([x - tw / 2 + 1, y - 7, x + tw / 2 - 1, y + 1]);
    blockRect(x - tw / 2 - 3, y - 14, x + tw / 2 + 3, y + 6); shadowRect(x + tw / 2, y - 2, x + tw / 2 + 10, y + 1);
    if (!tm.baked) fires.push({ x: fx, y: fy + 3, w: 12, h: 7, seed: x * .1 });
    lights.push({ x: fx, y: fy + 6, r: 44, s: 1.1, fire: true });
    emitters.push({ x: fx, y: fy + 2, w: 5, rate: 10, kind: 'smoke', pal: SMOKE_TRUCK, vy: [-19, -14], r: [.7, 2.6, 3.6], life: [7, 9], a0: .95 });
    emitters.push({ x: fx, y: fy, w: 8, rate: 6, kind: 'spark', life: [.4, 1] });
  }
  for (const [x, y] of def.campfires || []) {
    fires.push({ x, y, w: 4, h: 4, seed: x * .3 }); lights.push({ x, y: y - 2, r: 40, s: 1, fire: true }); blockRect(x - 8, y - 8, x + 8, y + 6);
    emitters.push({ x, y: y - 3, w: 2, rate: 4, kind: 'spark', life: [.3, .8] });
    emitters.push({ x, y: y - 4, w: 2, rate: 2, kind: 'smoke', pal: SMOKE_GREY, vy: [-9, -6], r: [.6, 1.5, 2.2], life: [2, 3], a0: .5 });
  }
  const PROPS = { wood: 'p_wood', hay: 'p_hay', crate: 'p_crate', logs: 'p_logs', barrels: 'p_barrels', lamp: 'p_lamp', mast: 'p_mast', tent: 'p_tent', bales: 'p_bales', haypile: 'p_haypile' };
  for (const k of ['stump', 'stump2', 'gate', 'palisade', 'crate2', 'crates', 'barrel2', 'barrel3', 'crate3', 'post', 'post2', 'lamp2', 'tent2', 'wtower']) PROPS[k] = 'p_' + k;
  const FENCES = { fence: 't_fence', fence2: 't_fence2', fence3: 't_fence3' };
  for (const pr of def.props || []) {
    if (FENCES[pr.t]) { const c = stripCanvas(FENCES[pr.t], pr.x1 - pr.x0); addStatic(c, pr.x0, pr.y + 1 - c.height / RS, pr.y); shadowRect(pr.x0 + 2, pr.y + 1, pr.x1 + 3, pr.y + 2); light.push([pr.x0, pr.y - 3, pr.x1, pr.y + 1]); }
    else if (pr.t === 'bags') { const c = stripCanvas('t_bags', pr.L); addStatic(c, pr.x, pr.y + 1 - c.height / RS, pr.y, { bags: true }); heavy.push([pr.x, pr.y - 4, pr.x + pr.L, pr.y + 1]); blockRect(pr.x - 2, pr.y - 6, pr.x + pr.L + 2, pr.y + 3); shadowRect(pr.x + pr.L, pr.y - 1, pr.x + pr.L + 4, pr.y + 1); }
    else if (pr.t === 'wire') { const c = stripCanvas('t_wire', pr.L); addStatic(c, pr.x, pr.y + 1 - c.height / RS, pr.y); blockRect(pr.x, pr.y - 6, pr.x + pr.L, pr.y + 2); }
    else if (pr.t === 'bare') {       // a lone bare tree; in summer a young fir stands there instead
      const v = Math.floor(R() * BARE_N), th = 14 + Math.floor(R() * 5), c = SZ.grass ? gfirImg(v, th - 2) : bareImg(v, th);
      addStatic(c, pr.x - c.width / RS / 2, pr.y + 1 - c.height / RS, pr.y); shadowRect(pr.x + 1, pr.y, pr.x + 18, pr.y + 1); blockRect(pr.x - 4, pr.y - 4, pr.x + 4, pr.y + 3);
    }
    else if (PROPS[pr.t]) {
      const c = SZ.snow ? atlasCv(PROPS[pr.t]) : thawCv(PROPS[pr.t], pr.t === 'tent' ? 'canvas' : null), pm = fmeta(PROPS[pr.t]), w = c.width / RS, h = c.height / RS, x0 = pr.x - w / 2, y0 = pr.y + 1 - h;
      addStatic(c, x0, y0, pr.y, { prop: pr.t });
      blockRect(pr.x - w / 2 - 2, pr.y - Math.min(h, 8), pr.x + w / 2 + 2, pr.y + 3);
      if (pr.t === 'lamp' || pr.t === 'lamp2') { lights.push({ x: x0 + pm.top[0] / RS, y: y0 + pm.top[1] / RS + 3, r: 34, s: .9 }); shadowRect(pr.x + 1, pr.y, pr.x + h, pr.y + 1); }
      else if (pr.t === 'mast') { lights.push({ x: x0 + pm.top[0] / RS, y: y0 + pm.top[1] / RS + 1, r: 10, s: .6, blink: true, red: true }); shadowRect(pr.x + 1, pr.y, pr.x + h, pr.y + 1); }
      else { shadowRect(pr.x + w / 2 + 1, pr.y - 2, pr.x + w / 2 + 6 + (h >> 1), pr.y + 1); light.push([pr.x - w / 2, pr.y - 3, pr.x + w / 2, pr.y + 1]); }
    }
  }
  const treeCache = new Map();
  const treeImg = h => {
    if (SZ.snow) { const v = Math.floor(R() * PINE_N), k = h * 16 + v; let c = treeCache.get(k); if (!c) { c = pineImg(v, h); treeCache.set(k, c); } return c; }
    // summer: green firs; spring: firs and leafless trees; autumn: golden larches, firs and leafless trees
    const r = SZ.grass ? 1 : R(), v = Math.floor(R() * 16);
    if (SZ.mud ? r < .22 : r < .26) return bareImg(v, h);
    if (SZ.leaves && r < .66) return larchImg(v, h, v & 1);
    return gfirImg(v, h);
  };
  const spc = 7; let row = 0;
  for (let y = 1; y < H; y += spc * .72, row++) for (let x = (row % 2) * spc / 2; x < W + 3; x += spc) {
    const xi = clamp(Math.floor(x + (R() - .5) * 5.2), 0, W - 1), yi = clamp(Math.floor(y + (R() - .5) * 4), 0, H - 1), i = yi * W + xi, d = FD[i];
    const lone = d === 0 && R() < .0035;
    if (block[i] || !(R() < d * .96 || lone)) continue;
    const th = lone ? 12 + Math.floor(R() * 6) : clamp(Math.round(lerp(12, 21, d) + (R() * 5 - 2.5)), 10, 23), img = treeImg(th);
    addStatic(img, xi - img.width / RS / 2, yi + 1 - img.height / RS, yi, { tree: true });
    const cxs = xi + th * .62, rx = th * .66, ry = Math.max(1.5, th * .12);
    for (let yy = Math.max(0, Math.floor(yi - ry - 1)); yy < Math.min(H, yi + ry + 2); yy++) for (let xx = Math.max(0, Math.floor(cxs - rx - 1)); xx < Math.min(W, cxs + rx + 2); xx++)
      if (((xx - cxs) / rx) ** 2 + ((yy - yi) / ry) ** 2 < 1) shadow[yy * W + xx] = 1;
  }
  const SIDX = new Int8Array(N), img = new Uint8ClampedArray(N * 4), lit = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; lit[i] = (hgt[i + 1] - hgt[i - 1]) + .5 * (hgt[i + W] - hgt[i - W]); }
  const [lm, ls] = fieldStats(lit), [om, os] = fieldStats(lo), [sm, ss] = fieldStats(st), [hm, hs] = fieldStats(hi), [mm, ms] = fieldStats(mid);
  const pd = (v, x, y, c) => { const b = Math.floor(v), f = clamp((v - b - .5) * c + .5, 0, 1); return b + (f > bay(x, y) ? 1 : 0); };
  const tr = def.trample, RP = SZ.road || MUD, TRK = SZ.track || PLOUGH, MUDP = new Uint8Array(N);
  /* the ground outside winter: fields (wheat, wet ploughland or stubble), bare-earth tracks, tall grass, spring mud and puddles, autumn leaves */
  const offGround = (i, x, y, k, kd) => {
    if (kd === 5) {
      const row = (y + x * .3) % (SZ.grass ? 7 : 6), base = .5 * (lo[i] - om) / os + .4 * (hi[i] - hm) / hs + 1.4 * shadow[i];
      if (SZ.grass) { const t = clamp(pd(1.1 + base + (row < 1.4 ? 1.6 : 0), x, y, 2), 0, 4); return row >= 1.4 && hash2(x, y, sd + 31) < .14 ? WHEAT[Math.max(0, t - 1)] : WHEAT[t]; }
      if (SZ.mud) { if (row < 2 && mid[i] > .58 && hi[i] > .42) return row < .5 ? PUDDLE[1] : PUDDLE[0]; return PLOUGH[clamp(pd(1.3 + base + (row < 2 ? 1.4 : 0), x, y, 2), 0, 4)]; }
      const t = clamp(pd(.9 + base + (row < 1.5 ? 1.3 : 0), x, y, 2), 0, 3); return row >= 2 && (x + (y >> 1)) % 3 === 0 && hi[i] > .5 ? STUBBLE[Math.min(3, t + 1)] : STUBBLE[t];
    }
    if (RK[i] === 2 && RD[i] < 0) return TRK[clamp(k - 2, 0, 4)];
    if (GR[i]) {                      // tall grass: scattered blades, each a pale tip over a darker stem, on a darker base
      const t = clamp(k - 1, 0, 3), h0 = hash2(x, y, sd + 33), h1 = hash2(x, y + 1, sd + 33);
      return h1 < .2 ? GRASS_TALL[0] : h0 < .2 ? GRASS_TALL[Math.min(4, t + 1)] : h0 > .82 ? GRASS_TALL[Math.min(4, t + 2)] : GRASS_TALL[t + 1];
    }
    if (MUDP[i] === 2) return MUDP[i - W] !== 2 || MUDP[i - 1] !== 2 ? PUDDLE[1] : hi[i] > .66 ? PUDDLE[2] : PUDDLE[0];   // a puddle: sky on the near rim, dark water inside
    if (MUDP[i] === 1) return PLOUGH[clamp(pd(1 + .5 * (hi[i] - hm) / hs + .8 * shadow[i], x, y, 1.5), 0, 4)];
    if (SZ.leaves && hash2(x, y, sd + 41) < .015 + .22 * SF[i] + .12 * shadow[i]) return LEAVES[(hash2(x, y, sd + 42) * LEAVES.length) | 0];
    return S[k];
  };
  /* step 6: the open sea: dark deep water, lighter shallows with wave crests, a line of surf at the shore */
  const seaCol = (i, x, y) => {
    const d = -WD[i], crest = ((x * .45 + y * 1.3 + mid[i] * 24) % 9) < 1;
    if (d < 1.6) return hash2(x, y, sd + 51) < .7 ? FOAM[0] : FOAM[1];
    if (d < 4 && crest) return FOAM[1];
    if (d < 14) return crest ? WATER[2] : hi[i] > .55 ? WATER[0] : WATER[1];
    return crest && hi[i] > .4 ? WATER[1] : hi[i] > .62 ? DEEP[0] : DEEP[1];
  };
  /* a shingle beach: grey pebbles, wet and dark at the water's edge, snow lying on the upper part in winter */
  const beachCol = (i, x, y) => {
    const d = WD[i], hp = hash2(x, y, sd + 53);
    if (d < 1.5) return hp < .5 ? SHINGLE[3] : SHINGLE[2];
    if (SZ.snow && d > 3.5 && mid[i] + (d - 3.5) * .08 > .55) return S[hp < .3 ? 2 : 1];
    return SHINGLE[hp < .25 ? 0 : hp < .7 ? 1 : 2];
  };
  /* cobbles in staggered rows with a dark kerb; in winter snow lies on part of the stones */
  const cobble = (i, x, y) => {
    if (RD[i] > -1.2) return COBBLE[3];
    const row = (y / 3) | 0, off = (row & 1) * 2, mx = (x + off) % 4, my = y % 3, joint = mx === 0 || my === 0;
    if (SZ.snow && (mid[i] > .56 || (hi[i] > .78 && mid[i] > .42))) return joint ? S[2] : S[1];
    return joint ? COBBLE[hash2(x, y, sd) < .3 ? 4 : 3] : COBBLE[(hash2(((x + off) / 4) | 0, row, sd + 7) * 3) | 0];
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (SZ.mud && KIND[i] === 0 && FD[i] < .2 && !(RK[i] && RD[i] < 2)) { const j = symI(x, y), mz = .55 * (mid[j] - mm) / ms + .45 * (lo[j] - om) / os; MUDP[i] = mz > 1.55 && hi[j] > .38 ? 2 : mz > 1.05 ? 1 : 0; }
    let k = pd(.95 + .25 * (lo[i] - om) / os - .55 * (lit[i] - lm) / ls + .22 * (st[i] - sm) / ss + 1.9 * SF[i] + 1.5 * shadow[i], x, y, 2.2);
    if (RK[i] === 2 && RD[i] < 0) k += Math.abs(Math.abs(RSD[i]) - 2.5) < .9 ? 2 : 1;
    if (KIND[i] === 5 && ((y + x * .3) % 7) < 1.6 && hi[i] > .2) k += 1;
    if (RK[i] === 1 && RD[i] > 1.5 && RD[i] < 3.5) k -= 1;
    if (tr && FD[i] === 0 && mid[i] > .52 && hyp(x - tr[0], (y - tr[1]) * .8) < tr[2]) k += 1;
    k = clamp(k, 0, 6); SIDX[i] = k;
    let c = S[k];
    const kd = KIND[i];
    if (kd === 3 && def.sea) c = seaCol(i, x, y);
    else if (kd === 3) c = ((x * .5 + y * 1.5 + mid[i] * 20) % 7) < 1 ? WATER[2] : (hi[i] > .5 ? WATER[0] : WATER[1]);
    else if (kd === 2) { c = ((x * .6 + y + mid[i] * 22) % 9) < 1.2 ? ICE[1] : hi[i] > .82 ? ICE[2] : ICE[0]; if (WD[i] > -2 && WD[i] < 0) c = S[4]; }
    else if (kd === 4) c = (Math.abs(RSD[i]) > RHW[i] - 1.5) ? WOOD[4] : (y % 3 === 0 ? WOOD[3] : WOOD[1]);
    else if (PV[i]) { c = cobble(i, x, y); KIND[i] = 1; }
    else if (RK[i] === 1 && RD[i] < 2.2) {
      const pm = clamp((1.6 - RD[i]) / 4, 0, 1);
      if (RD[i] < -1.5 || (RD[i] < 1.6 && pm + (hi[i] - .5) * .7 > bay(x, y))) {
        const ruts = Math.abs(Math.abs(RSD[i]) - RHW[i] * .45) < 1.1;
        c = RP[clamp(pd(1 + .33 * (hi[i] - hm) / hs + .5 * (mid[i] - mm) / ms + (ruts ? 1.3 : 0) + shadow[i] * .8, x, y, 1.5), 0, 4)];
        if (Math.abs(RSD[i]) < RHW[i] * .18 && mid[i] + .2 > bay(x, y) * .95) c = S[3];
        KIND[i] = 1;
      } else c = S[4];
    }
    else if (!SZ.snow) c = offGround(i, x, y, k, kd);
    if (kd !== 3 && kd !== 2 && kd !== 4 && WD[i] >= 0 && WD[i] < (def.sea ? 7 : 2.5)) c = def.sea ? beachCol(i, x, y) : SZ.snow ? (WD[i] < 1.2 ? S[5] : S[0]) : WD[i] < 1.2 ? PLOUGH[3] : PLOUGH[1];
    const o = i * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255;
  }
  const paint = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 4; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
  const craterCells = [];
  for (const [cx, cy, r] of def.craters || []) {
    craterCells.push([cx - r, cy - r, cx + r, cy + r]);
    for (let y = cy - r - 9; y < cy + r + 9; y++) for (let x = cx - r - 10; x < cx + r + 10; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; if (KIND[i] === 3 || KIND[i] === 4) continue;
      const dd = hyp(x - cx, (y - cy) * 1.25) + (hi[i] - .5) * 3 + edge[i] * 6;
      if (dd < r) { paint(x, y, mid[i] > .7 ? S[4] : hi[i] > .62 ? MUD[2] : MUD[3]); KIND[i] = 1; }
      else if (dd < r + 2.5) { paint(x, y, bay(x, y) > .5 ? SMOKE[2] : S[5]); KIND[i] = 1; }
      else if (dd < r + 8 && hi[i] > .55 + (dd - r) / 16) paint(x, y, MUD[2]);
    }
  }
  if (SZ.snow) for (const [px, py] of pools) for (let y = py + 1; y < py + 6; y++) for (let x = px - 3; x < px + 4; x++) {
    if (x < 0 || y >= H || KIND[y * W + x] !== 0) continue;
    const k = .45 * (1 - (y - py - 1) / 5) * (1 - Math.abs(x - px) / 4.5);
    if (k > bay(x, y) * .4) { const o = (y * W + x) * 4; img[o] = img[o] * .6 + 255 * .4; img[o + 1] = img[o + 1] * .6 + 182 * .4; img[o + 2] = img[o + 2] * .6 + 104 * .4; }
  }
  const ground = mkCanvas(W, H), gctx = ground.getContext('2d'), gim = gctx.createImageData(W, H); gim.data.set(img); gctx.putImageData(gim, 0, 0);
  statics.sort((a, b) => a.by - b.by);
  const comp = mkCanvas(W, H), cctx = comp.getContext('2d'); cctx.drawImage(ground, 0, 0); for (const s of statics) cctx.drawImage(s.img, s.x, s.y, s.w, s.h);
  const cw = Math.ceil(W / CELL), ch = Math.ceil(H / CELL), walkI = new Uint8Array(cw * ch).fill(1), walkV = new Uint8Array(cw * ch).fill(1);
  const slowI = new Float32Array(cw * ch).fill(1), slowV = new Float32Array(cw * ch).fill(1), omni = new Uint8Array(cw * ch);
  const hide = SZ.grass ? new Uint8Array(cw * ch) : null, walkS = new Uint8Array(cw * ch), slowS = new Float32Array(cw * ch).fill(1);
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    const c = cy * cw + cx, x = Math.min(W - 1, cx * CELL + 3), y = Math.min(H - 1, cy * CELL + 3), i = y * W + x;
    if (KIND[i] === 3) { walkI[c] = 0; walkV[c] = 0; }
    if (KIND[i] === 2) walkV[c] = 0;
    if (FD[i] > .55) walkV[c] = 0;
    if (FD[i] > .3) { slowI[c] = 1.35; slowV[c] = 1.4; omni[c] = 1; }
    // spring thaw: off the roads vehicles sink into the mud, worst on the sodden fields; infantry only slows on the fields
    else if (SZ.mud && !(RK[i] === 1 && RD[i] < 0)) { slowV[c] = KIND[i] === 5 ? 1.9 : MUDP[i] ? 1.65 : 1.4; if (KIND[i] === 5) slowI[c] = 1.12; }
    if (RK[i] === 1 && RD[i] < 0) { slowI[c] = .82; slowV[c] = .78; }
    if (hide && (GR[i] || KIND[i] === 5)) hide[c] = 1;      // summer: tall grass and wheat hide infantry
    if (KIND[i] === 3 && WD[i] < -4) walkS[c] = 1;            // step 6: boats keep to open water
  }
  const markCells = (r, fn) => { for (let cy = Math.max(0, Math.floor(r[1] / CELL)); cy <= Math.min(ch - 1, Math.floor(r[3] / CELL)); cy++) for (let cx = Math.max(0, Math.floor(r[0] / CELL)); cx <= Math.min(cw - 1, Math.floor(r[2] / CELL)); cx++) fn(cy * cw + cx); };
  for (const s of solids) { markCells(s, c => { walkI[c] = 0; walkV[c] = 0; }); markCells([s[0] - 5, s[1] - 5, s[2] + 5, s[3] + 5], c => { walkV[c] = 0; }); }
  for (const c of craterCells) markCells(c, k => { omni[k] = Math.max(omni[k], 1); });
  const cmW = Math.ceil(W / 3), cmH = Math.ceil(H / 3), cmask = new Uint8Array(cmW * cmH);
  const markCover = (r, v) => { for (let y = Math.max(0, Math.floor(r[1] / 3)); y <= Math.min(cmH - 1, Math.floor(r[3] / 3)); y++) for (let x = Math.max(0, Math.floor(r[0] / 3)); x <= Math.min(cmW - 1, Math.floor(r[2] / 3)); x++) cmask[y * cmW + x] = Math.max(cmask[y * cmW + x], v); };
  for (const r of light) markCover(r, 1);
  for (const r of heavy) markCover(r, 2);
  // maps marked sym: each cell of the walk, slow, cover and grass grids takes the stricter value of itself and its 180-degree partner,
  // so rounding to cells cannot give one side an extra gap, a faster lane or more grass to hide in
  if (def.sym) {
    const pair = (n, w, h, fn) => { for (let c = 0; c < n; c++) { const d = (h - 1 - ((c / w) | 0)) * w + (w - 1 - c % w); if (d > c) fn(c, d); } };
    pair(cw * ch, cw, ch, (c, d) => {
      walkI[c] = walkI[d] = walkI[c] & walkI[d]; walkV[c] = walkV[d] = walkV[c] & walkV[d];
      slowI[c] = slowI[d] = Math.max(slowI[c], slowI[d]); slowV[c] = slowV[d] = Math.max(slowV[c], slowV[d]);
      omni[c] = omni[d] = Math.min(omni[c], omni[d]); if (hide) hide[c] = hide[d] = hide[c] & hide[d]; walkS[c] = walkS[d] = walkS[c] & walkS[d];
    });
    pair(cmW * cmH, cmW, cmH, (c, d) => { cmask[c] = cmask[d] = Math.min(cmask[c], cmask[d]); });
  }
  const mini = mkCanvas(Math.ceil(W / 5), Math.ceil(H / 5)), mctx = mini.getContext('2d'); mctx.imageSmoothingEnabled = true; mctx.drawImage(comp, 0, 0, mini.width, mini.height);
  return { def, W, H, S, ground, gctx, comp, cctx, statics, houses, emitters, lights, fires, KIND, SIDX, FD, cw, ch, walkI, walkV, walkI0: walkI.slice(), walkV0: walkV.slice(),
    slowI, slowV, omni, cmask, cmW, cmH, mini, points, season: SZ, hide, strict: !!SZ.mud, kick: SZ.kick || S[0], dust: SZ.dust || DUST,
    walkS, walkS0: walkS.slice(), slowS, ver: 0, water: KIND.some(k => k === 2 || k === 3) };
}
function repaintComp(map, r) {
  const x0 = clamp(Math.floor(r[0]) - 2, 0, map.W), y0 = clamp(Math.floor(r[1]) - 2, 0, map.H), x1 = clamp(Math.ceil(r[2]) + 2, 0, map.W), y1 = clamp(Math.ceil(r[3]) + 2, 0, map.H);
  if (x1 <= x0 || y1 <= y0) return;
  map.cctx.drawImage(map.ground, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  for (const s of map.statics) if (!s.cut && s.x < x1 && s.x + s.w > x0 && s.y < y1 && s.y + s.h > y0) map.cctx.drawImage(s.img, s.x, s.y, s.w, s.h);
}
function cutTrees(map, r) {
  let any = false;
  for (const s of map.statics) if (s.tree && !s.cut && s.x + s.w / 2 > r[0] - 4 && s.x + s.w / 2 < r[2] + 4 && s.by > r[1] - 4 && s.by < r[3] + 10) { s.cut = true; any = true; }
  if (any) repaintComp(map, [r[0] - 14, r[1] - 26, r[2] + 14, r[3] + 12]);
}

function previewMap(def) {
  const s = 5, w = Math.ceil(def.w / s), h = Math.ceil(def.h / s), c = mkCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  const RD = new Float32Array(w * h).fill(1e9), WD = new Float32Array(w * h).fill(1e9);
  const sc = pts => pts.map(p => [p[0] / s, p[1] / s]);
  for (const r of (def.roads || []).concat(def.tracks || [])) rasterPoly(sc(r.pts), 3, w, h, (i, dd) => { RD[i] = Math.min(RD[i], dd - r.hw / s); }, .8);
  if (def.river) rasterPoly(sc(def.river.pts), def.river.hw / s + 4, w, h, (i, dd) => { WD[i] = Math.min(WD[i], dd - def.river.hw / s); }, .8);
  for (const [cx, cy, rx, ry] of def.islands || []) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hyp((x * s - cx) / rx, (y * s - cy) / ry) < 1) WD[y * w + x] = 1;
  const SZ = seasonOf(def), S = SZ.pal || (def.light === 'day' ? SNOW_DAY : SNOW_DUSK), night = def.light === 'night';
  // woods of each season: snowy pines, green firs, firs among bare trees, golden larches among firs
  const TREE = SZ.snow ? [PINE[2], PINE[1]] : SZ.leaves ? [[150,110,40], [52,74,54], [182,140,52]] : SZ.mud ? [[50,72,54], [92,80,66]] : [[46,74,52], [62,92,62]];
  const FIELD = SZ.grass ? WHEAT[1] : SZ.mud ? PLOUGH[2] : SZ.leaves ? STUBBLE[1] : null;
  const inRect = (wx, wy, list) => (list || []).some(f => wx >= f[0] && wx < f[2] && wy >= f[1] && wy < f[3]);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = y * w + xx, wx = xx * s, wy = y * s, e = fbm(wx / 38, wy / 38, def.seed + 5, 2) - .5;
    let v = def.forest(wx, wy, e); for (const [cx, cy, r] of def.clearings || []) v = Math.min(v, hyp(wx - cx, (wy - cy) * 1.1) - r - 14 * e);
    let col = S[1];
    if (SZ.grass && (def.meadows || []).some(([cx, cy, r]) => hyp(wx - cx, (wy - cy) * 1.1) < r + 12 * e)) col = S[3];
    if (FIELD && inRect(wx, wy, def.fields)) col = FIELD;
    if (v > 0 && RD[i] > .8 && !(FIELD && inRect(wx, wy, def.fields))) { const q = (xx * 7 + y * 13) % 5; col = SZ.snow ? ((xx + y) % 3 ? PINE[2] : PINE[1]) : TREE[q < 3 ? 0 : q === 3 ? 1 : TREE.length - 1]; }
    if (RD[i] < .5) col = SZ.road ? SZ.road[1] : MUD[1];
    if (WD[i] < 0) col = RD[i] < .3 ? WOOD[2] : (SZ.snow && vnoise(wx / 14, wy / 14, def.seed) > .55 ? ICE[1] : WATER[0]);
    if (night) col = col.map((v2, k) => v2 * [.45, .5, .72][k]);
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  x.fillStyle = css(COBBLE[2]); for (const [x0, y0, x1, y1] of def.squares || []) x.fillRect(Math.floor(x0 / s), Math.floor(y0 / s), Math.round((x1 - x0) / s), Math.round((y1 - y0) / s));
  x.fillStyle = css(WOOD[2]);
  for (const hh of def.houses || []) x.fillRect(Math.floor((hh.x - hh.w / 2) / s), Math.floor((hh.y - hh.rd) / s), Math.max(2, Math.round(hh.w / s)), 2);
  for (const p of def.points) { x.strokeStyle = p.type === 'tw' ? '#ffd65a' : p.type === 'vp' ? '#ffffff' : '#ffb44e'; x.lineWidth = 1; x.strokeRect(Math.floor((p.cx - p.w / 2) / s) + .5, Math.floor((p.cy - p.h / 2) / s) + .5, Math.round(p.w / s), Math.round(p.h / s)); }
  x.fillStyle = 'rgb(74,134,255)'; x.fillRect(Math.floor(def.hq[1][0] / s) - 4, Math.floor(def.hq[1][1] / s) - 3, 9, 3);
  x.fillStyle = 'rgb(238,58,52)'; x.fillRect(Math.floor(def.hq[2][0] / s) - 4, Math.floor(def.hq[2][1] / s) - 3, 9, 3);
  return c;
}

/* ---------------------------------------------------------------- path finding */
/* movement modes: false = infantry, true = vehicles, 'sea' = boats */
const gridOf = (map, veh) => veh === 'sea' ? map.walkS : veh ? map.walkV : map.walkI;
const slowOf = (map, veh) => veh === 'sea' ? map.slowS : veh ? map.slowV : map.slowI;
/* step 6: connected regions of a movement grid (recounted when buildings change it): whether a point can be reached at all */
function regionsOf(map, veh) {
  const key = veh === 'sea' ? 'regS' : veh ? 'regV' : 'regI';
  if (map[key] && map[key].ver === map.ver) return map[key].lab;
  const g = gridOf(map, veh), cw = map.cw, n = cw * map.ch, lab = new Int32Array(n), st = []; let k = 0;
  for (let s0 = 0; s0 < n; s0++) {
    if (!g[s0] || lab[s0]) continue;
    lab[s0] = ++k; st.push(s0);
    while (st.length) { const c = st.pop(), x = c % cw; for (const d of [c - 1, c + 1, c - cw, c + cw]) { if (d < 0 || d >= n || (d === c - 1 && x === 0) || (d === c + 1 && x === cw - 1) || !g[d] || lab[d]) continue; lab[d] = k; st.push(d); } }
  }
  map[key] = { ver: map.ver, lab }; return lab;
}
function reachable(map, veh, x0, y0, x1, y1) {
  const lab = regionsOf(map, veh), [ax, ay] = cellOf(map, x0, y0), [bx, by] = cellOf(map, x1, y1);
  const a = nearestWalkable(map, veh, ax, ay), b = a && nearestWalkable(map, veh, bx, by, a, x1, y1);
  return !!(a && b && lab[a[1] * map.cw + a[0]] === lab[b[1] * map.cw + b[0]]);
}
function cellOf(map, x, y) { return [clamp(Math.floor(x / CELL), 0, map.cw - 1), clamp(Math.floor(y / CELL), 0, map.ch - 1)]; }
function walkable(map, veh, x, y) { if (x < 1 || y < 1 || x >= map.W - 1 || y >= map.H - 1) return false; const [cx, cy] = cellOf(map, x, y); return gridOf(map, veh)[cy * map.cw + cx] === 1; }
/* the nearest walkable cell. With 'from' (the walker's own cell) and the exact target (tx, ty) it is the walkable cell whose centre
   is nearest to the target in world units, and a tie goes to the cell closer to the walker: before, the search ran from the north
   and the cell grid split ties unevenly, so a point on a river or behind a wreck pulled both sides to one bank */
function nearestWalkable(map, veh, cx, cy, from, tx, ty) {
  const g = gridOf(map, veh);
  if (g[cy * map.cw + cx]) return [cx, cy];
  if (!from) {
    for (let r = 1; r < 16; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= map.cw || y >= map.ch) continue;
      if (g[y * map.cw + x]) return [x, y];
    }
    return null;
  }
  let best = null, bd = 1e9;
  for (let dy = -15; dy <= 15; dy++) for (let dx = -15; dx <= 15; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= map.cw || y >= map.ch || !g[y * map.cw + x]) continue;
    const d = Math.round(hyp(x * CELL + CELL / 2 - tx, y * CELL + CELL / 2 - ty)) + ((x - from[0]) ** 2 + (y - from[1]) ** 2) * 1e-7;
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}
function lineSlow(map, slow, x0, y0, x1, y1) { const n = Math.ceil(dist(x0, y0, x1, y1) / 3); let mx = 0; for (let i = 0; i <= n; i++) { const u = n ? i / n : 0, [cx, cy] = cellOf(map, lerp(x0, x1, u), lerp(y0, y1, u)), v = slow[cy * map.cw + cx]; if (v > mx) mx = v; } return mx; }
function losClear(map, veh, x0, y0, x1, y1) { const n = Math.ceil(dist(x0, y0, x1, y1) / 3); for (let i = 1; i < n; i++) { const u = i / n; if (!walkable(map, veh, lerp(x0, x1, u), lerp(y0, y1, u))) return false; } return true; }
function findPath(map, veh, sx, sy, tx, ty) {
  const cw = map.cw, ch = map.ch, g = gridOf(map, veh), slow = slowOf(map, veh);
  let s = cellOf(map, sx, sy), e = cellOf(map, tx, ty);
  s = nearestWalkable(map, veh, s[0], s[1]); if (s) e = nearestWalkable(map, veh, e[0], e[1], s, tx, ty);
  if (!s || !e) return null;
  const n = cw * ch, si = s[1] * cw + s[0], ei = e[1] * cw + e[0];
  const gs = new Float32Array(n).fill(Infinity), from = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const heap = [];
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; const tmp = heap[p]; heap[p] = heap[k]; heap[k] = tmp; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; const tmp = heap[m]; heap[m] = heap[k]; heap[k] = tmp; k = m; } } return top; };
  const hx = i => { const x = i % cw, y = (i / cw) | 0, dx = Math.abs(x - e[0]), dy = Math.abs(y - e[1]); return (Math.max(dx, dy) + .414 * Math.min(dx, dy)) * .8; };
  gs[si] = 0; push(hx(si), si);
  let found = false, iter = 0;
  while (heap.length && iter++ < n * 2) {
    const [, i] = pop(); if (closed[i]) continue; closed[i] = 1; if (i === ei) { found = true; break; }
    const x = i % cw, y = (i / cw) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      const j = ny * cw + nx; if (!g[j] || closed[j]) continue;
      if (dx && dy && (!g[y * cw + nx] || !g[ny * cw + x])) continue;
      const c = gs[i] + (dx && dy ? 1.414 : 1) * slow[j];
      if (c < gs[j]) { gs[j] = c; from[j] = i; push(c + hx(j), j); }
    }
  }
  if (!found) return null;
  const cells = []; for (let i = ei; i !== -1; i = from[i]) cells.push(i); cells.reverse();
  const pts = cells.map(i => [(i % cw) * CELL + CELL / 2, ((i / cw) | 0) * CELL + CELL / 2]);
  if (walkable(map, veh, tx, ty)) pts[pts.length - 1] = [tx, ty];
  // spring mud: a straightened stretch may not leave the road for worse ground, so it is no slower than the cells it replaces
  const strict = veh === true && map.strict, cs = strict ? cells.map(i => slow[i]) : null;
  const fits = (a, j) => { if (!strict) return true; let mx = 0; for (let q = k; q <= j; q++) if (cs[q] > mx) mx = cs[q]; return lineSlow(map, slow, a[0], a[1], pts[j][0], pts[j][1]) <= mx + .01; };
  const out = [[sx, sy]]; let k = 0;
  while (k < pts.length - 1) { let j = pts.length - 1; const a = out[out.length - 1]; while (j > k + 1 && !(losClear(map, veh, a[0], a[1], pts[j][0], pts[j][1]) && fits(a, j))) j--; out.push(pts[j]); k = j; }
  if (out.length === 1) out.push(pts[pts.length - 1]);
  return out;
}

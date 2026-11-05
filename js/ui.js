'use strict';
/* Interface: menus, top strip, command panel, tooltips, input, sound and the main loop. */
const $ = id => document.getElementById(id);
const canvas = $('view'), ctx = canvas.getContext('2d');
const store = { get(k, d) { try { const v = localStorage.getItem('wf2_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('wf2_' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } } };
const DPR = () => Math.max(1, Math.min(3, window.devicePixelRatio || 1));
const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
ICON_ASCII.rally = ["X......", "XXXXX..", "XXXXXXX", "XXXXX..", "X......", "X......", "X......"];

/* ---------------------------------------------------------------- icons and tooltips */
/* pictures from the reference atlas where there is one, one-colour glyphs for the rest */
const spriteIcon = name => hasFrame('i_' + name) ? 'i_' + name : hasFrame('i_b_' + name) ? 'i_b_' + name : null;
function drawIcon(cv, name, col, k) {
  const si = spriteIcon(name);
  if (si) {
    const f = atlasCv(si); cv.width = f.width; cv.height = f.height;
    const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(f, 0, 0);
    if (k) { cv.style.width = cv.width * k * .75 + 'px'; cv.style.height = cv.height * k * .75 + 'px'; }
    return cv;
  }
  const rows = ICON_ASCII[name] || ICON_ASCII.star; cv.width = Math.max(...rows.map(r => r.length)); cv.height = rows.length;
  const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.fillStyle = col;
  rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) if (r[i] === 'X') x.fillRect(i, y, 1, 1); });
  if (k) { cv.style.width = cv.width * k + 'px'; cv.style.height = cv.height * k + 'px'; }
  return cv;
}
const iconK = name => { if (spriteIcon(name)) return 2; const rows = ICON_ASCII[name] || ICON_ASCII.star; return Math.max(...rows.map(r => r.length)) <= 9 && rows.length <= 9 ? 3 : 2; };
function iconEl(name, col, k) { const c = document.createElement('canvas'); c.className = 'ic'; return drawIcon(c, name, col || '#dfe3ef', k || iconK(name)); }
function paintIcons() {
  document.querySelectorAll('canvas.ic[data-icon]').forEach(cv => drawIcon(cv, cv.dataset.icon, cv.dataset.col || (cv.closest('#bNV') && G && G.nv ? '#8dff9a' : '#dfe3ef'), cv.closest('.gb') ? 3 : 2));
}
function costHTML(cost) {
  const r = G && !G.demo ? G.teams[1].res : null;
  return ['mp', 'mu', 'fu'].filter(k => cost[k]).map(k => `<span class="c c-${k}${r && r[k] < cost[k] ? ' no' : ''}">${cost[k]}</span>`).join('');
}
const tipEl = $('tip'); let tipOwner = null, tipTimer = null;
function tipHTML(d) {
  let h = `<h4>${esc(d.title)}</h4>`;
  if (d.desc) h += `<p>${esc(d.desc)}</p>`;
  const meta = [];
  if (d.cost) meta.push(costHTML(d.cost));
  if (d.time) meta.push(`<span>${esc(t('lbl_time', { s: d.time }))}</span>`);
  if (d.sup) meta.push(`<span class="c c-sup">${esc(t('lbl_pop', { n: d.sup }))}</span>`);
  for (const s of d.extra || []) meta.push(`<span>${esc(s)}</span>`);
  if (meta.length) h += `<div class="meta">${meta.join('')}</div>`;
  if (d.weap) h += `<div class="wp">${esc(d.weap)}</div>`;
  if (d.req) h += `<div class="req">${esc(t('lbl_req', { x: d.req }))}</div>`;
  return h;
}
function showTip(el, d) {
  if (!d) { hideTip(); return; }
  clearTimeout(tipTimer); tipEl.innerHTML = tipHTML(d); tipEl.hidden = false; tipOwner = el;
  const r = el.getBoundingClientRect(), ar = $('app').getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  let x = r.left - ar.left + r.width / 2 - tw / 2, y = r.top - ar.top - th - 8;
  if (y < 4) y = r.bottom - ar.top + 8;
  tipEl.style.left = Math.round(clamp(x, 8, Math.max(8, ar.width - tw - 8))) + 'px'; tipEl.style.top = Math.round(y) + 'px';
}
function hideTip() { clearTimeout(tipTimer); tipEl.hidden = true; tipOwner = null; }
function bindTip(el, fn) {
  let lp = null, longShown = false;
  el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showTip(el, fn()); });
  el.addEventListener('pointerleave', () => { if (tipOwner === el) hideTip(); });
  el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { longShown = false; clearTimeout(lp); lp = setTimeout(() => { longShown = true; showTip(el, fn()); }, 420); } });
  const end = () => { clearTimeout(lp); if (longShown && tipOwner === el) { clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 2200); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('click', e => { if (longShown) { e.stopImmediatePropagation(); e.preventDefault(); longShown = false; } });
}

/* ---------------------------------------------------------------- menus */
let DIFFSEL = store.get('diff', 'normal'), LENSEL = store.get('len', 'normal'), helpBack = 'scrMain', curMapId = null;
let ARMYSEL = ARMY[store.get('army', 'inf')] ? store.get('army', 'inf') : 'inf';          // step 7: infantry, tank or airmobile
let alertAt = null;                            // the last fight our troops got into off screen
const bestKey = (id, d, l) => id + '_' + d + (l && l !== 'normal' ? '_' + l : '');
const previews = {};
function show(id) {
  for (const s of ['scrMain', 'scrMaps', 'scrHelp', 'scrPause', 'scrEnd', 'scrCamp', 'scrUps']) $(s).hidden = s !== id; $('menu').hidden = !id; if (id) hideTip();
  if (id === 'scrMain') refreshContinue(); if (id === 'scrCamp') renderCamp(); if (id === 'scrUps') renderUps();      // step 8: the campaign screens
  if (id) $('menu').scrollTop = 0;
}
function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('gameTitle').innerHTML = `${esc(t('title1'))} <i>${esc(t('title2'))}</i>`;
  document.title = `${t('title1')} ${t('title2')}`;
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === LANG ? 'true' : 'false'));
  $('mSound').textContent = SFX.on ? t('on') : t('off');
  for (const [id, k] of [['bZoomOut', 'zoomOut'], ['bZoomIn', 'zoomIn'], ['bNV', 'nv'], ['bPause', 'pause'], ['gArmy', 'army'], ['gHQ', 'hqBtn'], ['gArty', 'artillery'], ['gRecon', 'recon']]) { $(id).setAttribute('aria-label', t(k)); if (id[0] === 'b') $(id).title = t(k); }
  buildMapList(); buildHelp(); hudFull();
  if (!$('scrCamp').hidden) renderCamp(); if (!$('scrUps').hidden) renderUps();
}
function buildMapList() {
  const best = store.get('best', {}), list = $('mapList'); list.innerHTML = '';
  for (const def of MAPS) {
    const btn = document.createElement('button'); btn.className = 'mapcard'; btn.type = 'button';
    if (!previews[def.id]) previews[def.id] = previewMap(def);
    const cv = mkCanvas(previews[def.id].width, previews[def.id].height); cv.getContext('2d').drawImage(previews[def.id], 0, 0);
    const bt = best[bestKey(def.id, DIFFSEL, LENSEL)], txt = document.createElement('div');
    txt.innerHTML = `<h3>${esc(t('map_' + def.id))}</h3><div class="tags">${esc(t('map_' + def.id + '_t'))}</div><p>${esc(t('map_' + def.id + '_d'))}</p>${bt ? `<div class="best">${esc(t('best', { t: fmtTime(bt) }))}</div>` : ''}`;
    btn.append(cv, txt); btn.addEventListener('click', () => { SFX.init(); SFX.play('ui'); startMission(def.id); });
    list.append(btn);
  }
  document.querySelectorAll('[data-diff]').forEach(b => b.setAttribute('aria-pressed', b.dataset.diff === DIFFSEL ? 'true' : 'false'));
  document.querySelectorAll('[data-len]').forEach(b => b.setAttribute('aria-pressed', b.dataset.len === LENSEL ? 'true' : 'false'));
  document.querySelectorAll('[data-army]').forEach(b => b.setAttribute('aria-pressed', b.dataset.army === ARMYSEL ? 'true' : 'false'));
  $('armyDesc').textContent = t('army_' + ARMYSEL + '_d');
}
function buildHelp() {
  $('helpBody').innerHTML = ['goal', 'camp', 'econ', 'army', 'town', 'build', 'fob', 'sea', 'tech', 'cover', 'season', 'supp', 'armor', 'air', 'vet', 'keys', 'touch'].map(k => `<div><h3>${esc(t('h_' + k))}</h3><p>${esc(t('h_' + k + '_t'))}</p></div>`).join('');
  const row = (icon, col, title, desc, meta) => { const r = document.createElement('div'); r.className = 'urow'; const ic = document.createElement('div'); ic.className = 'ui'; ic.append(iconEl(icon, col, 2)); const tx = document.createElement('div'); tx.innerHTML = `<h4>${esc(title)}</h4><p>${esc(desc)}</p><div class="meta">${meta}</div>`; r.append(ic, tx); return r; };
  const u = $('helpUnits'); u.innerHTML = '';
  for (const k in UT) { const ut = UT[k], W = [...new Set(ut.w)]; u.append(row(k, '#b1cbff', t('u_' + k), t('u_' + k + '_d'), costHTML(ut.cost) + `<span>${esc(t('lbl_time', { s: ut.time }))}</span><span class="c c-sup">${esc(t('lbl_pop', { n: ut.sup }))}</span><span>${esc(W.map(w => t('w_' + w)).join(', '))}</span>` + (ut.req ? `<span>${esc(t('lbl_req', { x: t('r_' + ut.req) }))}</span>` : ''))); }
  const b = $('helpBlds'); b.innerHTML = '';
  for (const k of ['hq'].concat(BUILD_LIST)) { const bt = BT[k]; b.append(row(k, '#dfe3ef', t('b_' + k), t('b_' + k + '_d'), (bt.cost ? costHTML(bt.cost) : '') + (bt.time ? `<span>${esc(t('lbl_time', { s: bt.time }))}</span>` : '') + `<span>${esc(t('lbl_hp'))} ${bt.hp}</span>` + (bt.req ? `<span>${esc(t('lbl_req', { x: t('r_' + bt.req) }))}</span>` : ''))); }
  for (const k in RT) { const rt = RT[k]; b.append(row(k, '#c4a0ff', t('r_' + k), t('r_' + k + '_d'), costHTML(rt.cost) + `<span>${esc(t('lbl_time', { s: rt.time }))}</span><span>${esc(t('b_' + rt.at))}</span>` + (rt.army ? `<span>${esc(t('army_' + rt.army))}</span>` : ''))); }
}
function defaultZoom() { const w = canvas.clientWidth || 800; for (const z of [4, 3, 2]) if (w / z >= 240) return z; return 2; }
function startMission(id) {
  curMapId = id;
  launchBattle(() => { newGame(MAPS.find(m => m.id === id), DIFFSEL, false, { 1: ARMYSEL }); setBattleLength(LENSEL); });
}
/* starts a battle that setup() prepares (a single battle or a campaign battle); after(g) adds messages of its own */
function launchBattle(setup, after) {
  $('loading').hidden = false; hideTip();
  setTimeout(() => {
    setup(); const def = G.def; alertAt = null; G.zoom = defaultZoom();
    $('loading').hidden = true; show(null); $('hud').hidden = false; $('nvv').hidden = true;
    hudFull(); hooks.toast(t('objective'));
    const g = G; if (after) after(g);
    setTimeout(() => { if (G === g && G.teams[2].army) hooks.toast(t('m_enemyArmy', { a: t('army_' + G.teams[2].army) })); }, 1500);
    setTimeout(() => { if (G === g && !G.teams[1].stats.made && !G.blds.some(b => b.team === 1 && b.queue.length)) hooks.toast(`${t('b_barracks')} — ${t('b_barracks_d')}`); }, 8000);
    setTimeout(() => { if (G === g && G.blds.filter(b => b.team === 1).length <= 3) hooks.toast(t('h_build_t')); }, 50000);
    if (def.light === 'night') setTimeout(() => { if (G && G.def === def && !G.nv) hooks.toast(t('nv') + ' — N'); }, 3500);
    const sz = seasonOf(def); if (!sz.snow) setTimeout(() => { if (G === g) hooks.toast(t('m_' + sz.id)); }, 3500);
  }, 30);
}
function startDemo() { newGame(MAPS[0], 'normal', true); G.zoom = Math.max(2, defaultZoom() - 1); G.cam.x = 320; G.cam.y = 520; G.camCenter = true; $('hud').hidden = true; }
function quitToMenu() { const camp = !!(G && G.camp); if (G && !G.demo && !G.over) saveBattle(true); G = null; hideTip(); startDemo(); show(camp ? 'scrCamp' : 'scrMain'); }

/* ---------------------------------------------------------------- notifications */
let lastToast = { m: '', t: 0 };
hooks.toast = (msg, kind) => {
  if (!G || G.demo) return; const now = performance.now(); if (msg === lastToast.m && now - lastToast.t < 1500) return; lastToast = { m: msg, t: now };
  const el = document.createElement('div'); el.className = 'toast' + (kind ? ' ' + kind : ''); el.textContent = msg;
  const box = $('toasts'); box.prepend(el); while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => el.remove(), Math.min(7000, 2400 + msg.length * 40));
};
hooks.end = (win, reason) => {
  store.set('save', null);                       // a finished battle cannot be continued
  // step 8: a campaign battle moves the campaign on (unless that campaign was dropped meanwhile)
  let camp = null; const inCamp = !!G.camp;
  if (inCamp) { const c = campLoad(); if (c && c.id === G.camp.cid && !c.done) { camp = campApply(c, win, reason); campSave(c); } }
  const sec = G.t, best = store.get('best', {}), key = bestKey(curMapId, G.diffId, G.len), g = G;
  if (win && !inCamp && (!best[key] || sec < best[key])) { best[key] = sec; store.set('best', best); }
  SFX.play(win ? 'capture' : 'lost');
  setTimeout(() => {
    if (G !== g) return;
    $('hud').hidden = true; show('scrEnd');
    $('endMap').textContent = (inCamp ? `${t('camp')} · ${t('season_' + G.camp.season)} · ${areaName(G.camp.area)}` : `${t('map_' + curMapId)} · ${t(G.diffId)} · ${t('len_' + G.len)}`) + (G.teams[1].army ? ` · ${t('army_' + G.teams[1].army)}` : '');
    const ec = $('endCamp'); ec.hidden = !camp; ec.innerHTML = camp ? campEndLines(camp).map(([s, k]) => `<p class="${k}">${esc(s)}</p>`).join('') : '';
    $('eAgain').hidden = inCamp; $('eMaps').hidden = inCamp; $('eCamp').hidden = !inCamp;
    $('endTitle').textContent = win ? t('victory') : t('defeat'); $('endTitle').className = win ? 'win' : 'lose';
    $('endText').textContent = t(reason === 'hq' ? (win ? 'victoryHQ' : 'defeatHQ') : (win ? 'victoryText' : 'defeatText'));
    const T = G.teams[1], owned = G.map.points.filter(p => p.owner === 1).length;
    $('endStats').innerHTML = [[t('time'), fmtTime(sec)], [t('kills'), T.stats.kills], [t('losses'), T.stats.lost], [t('made'), T.stats.made], [t('points'), owned + ' / ' + G.map.points.length], [t('reserves'), Math.ceil(T.tickets) + ' : ' + Math.ceil(G.teams[2].tickets)]].map(([a, b]) => `<span>${esc(a)}</span><b>${esc(b)}</b>`).join('');
  }, 1800);
};
const minimapPings = [];
hooks.ping = (x, y, c) => minimapPings.push({ x, y, c, t: performance.now() });
/* battle alerts: our troops hit off screen leave a red mark on the minimap for a few seconds (the message and sound
   come from the game's own 'under attack' warning); Space or the "!" button jumps there */
hooks.alert = (x, y) => {
  if (!G || G.demo || G.over) return;
  if (x > G.cam.x && x < G.cam.x + VIEW.vw && y > G.cam.y && y < G.cam.y + VIEW.vh) return;
  if (alertAt && G.t - alertAt.t < 8 && dist(x, y, alertAt.x, alertAt.y) < 140) { alertAt.t = G.t; return; }
  alertAt = { x, y, t: G.t }; minimapPings.push({ x, y, c: [255, 70, 60], t: performance.now(), dur: 4000 });
};
function jumpAlert() { if (!G || G.demo || !alertAt || G.t - alertAt.t > 30) return; G.cam.x = alertAt.x - VIEW.vw / 2; G.cam.y = alertAt.y - VIEW.vh / 2; SFX.play('ui'); }
hooks.sfx = (k, x, y, v) => SFX.play(k, x, y, v);

/* ---------------------------------------------------------------- heads-up display */
let hudLast = 0;
function hudFull() {
  if (!G || G.demo) return;
  $('pips').innerHTML = G.map.points.filter(isKey).map(p => `<div class="pip${p.type === 'tw' ? ' tw' : ''}" data-p="${p.id}" title="${esc(p.type === 'tw' ? t('pt_tw') + ' ' + p.id + ' — ' + t('pt_tw_d') : t('pt_vp') + ' ' + p.id)}">${p.id}</div>`).join('');
  $('bNV').hidden = G.def.light !== 'night';
  $('gArty').querySelector('b').textContent = globalOf(1, 'artillery').cost.mu;      // step 8: the campaign's battery makes it cheaper
  const ab = abOf(1), gb = $('gAb'); gb.hidden = !ab;
  if (ab) { gb.querySelector('canvas').dataset.icon = ab; gb.querySelector('b').textContent = GLOBAL[ab].cost.mu; gb.setAttribute('aria-label', t('ab_' + ab)); }
  cardKey = ''; selKey = ''; paintIcons(); hudTick(true); layout();
}
function layout() {
  const hudOn = !$('hud').hidden;
  VIEW.hudT = hudOn ? $('top').offsetHeight : 0; VIEW.hudB = hudOn ? $('bot').offsetHeight : 0;
  $('mini').style.top = (VIEW.hudT + 8) + 'px'; $('toasts').style.top = (VIEW.hudT + 8) + 'px'; $('groups').style.bottom = (VIEW.hudB + 8) + 'px';
}
function hudTick(force) {
  if (!G || G.demo) return;
  const now = performance.now(); if (!force && now - hudLast < 200) return; hudLast = now;
  const T = G.teams[1], T2 = G.teams[2];
  for (const [r, v, i] of [['mp', 'vMp', 'iMp'], ['mu', 'vMu', 'iMu'], ['fu', 'vFu', 'iFu']]) { $(v).textContent = Math.floor(T.res[r]); $(i).textContent = '+' + Math.round(T.inc[r] * 60); }
  $('vSup').textContent = `${T.used}/${T.cap}`; $('rSup').classList.toggle('full', T.used >= T.cap);
  $('nMe').textContent = Math.ceil(T.tickets); $('nFoe').textContent = Math.ceil(T2.tickets);
  $('tMe').style.width = (100 * T.tickets / G.tmax) + '%'; $('tFoe').style.width = (100 * T2.tickets / G.tmax) + '%';
  $('clock').textContent = fmtTime(G.t);
  $('bAlert').hidden = !(alertAt && G.t - alertAt.t < 20); renderGroups();
  for (const p of G.map.points) if (isKey(p)) { const el = document.querySelector(`.pip[data-p="${p.id}"]`); if (el) el.className = 'pip' + (p.type === 'tw' ? ' tw' : '') + (p.owner ? ' o' + p.owner : ''); }
  for (const u of [...G.sel]) if (u.kind === 'bld' ? u.dead : !unitAlive(u)) G.sel.delete(u);
  if (![...G.sel].some(u => u.kind === 'squad' && u.type === 'engineers')) { G.buildMenu = false; if (G.place) G.place = null; }
  renderSel(); renderCmd(); globTick();
  $('bNV').setAttribute('aria-pressed', G.nv ? 'true' : 'false'); $('nvv').hidden = !G.nv;
  drawMinimap(); layout();
}
function statusOf(u) {
  const out = [];
  if (u.kind === 'squad') {
    out.push([t('st_men', { n: liveCount(u), m: u.ut.n }), '']);
    if (u.retreat) out.push([t('st_retreat'), 'warn']); else if (u.pinned) out.push([t('st_pinned'), 'bad']); else if (u.sup >= 40) out.push([t('st_supp'), 'warn']);
    if (u.working && u.order) out.push([t(u.order.type === 'build' ? 'st_build' : 'st_repair'), '']);
    if (u.chute) out.push([t('st_chute'), '']); else if (u.charge > G.t) out.push([t('st_charge'), 'warn']);
    if (camo(u)) out.push([t('st_camo'), '']);
    if (u.members.some(m => !m.dead && WT[m.w].setup && !m.moving && m.setup < WT[m.w].setup)) out.push([t('st_setup'), '']);
  } else if (u.kind === 'air') {
    if (u.ut.ammo) out.push([t('st_ammo', { n: u.ammo + '/' + u.ut.ammo }), u.ammo ? '' : 'bad']);
    if (u.ut.cargo) out.push([t(u.cargo ? 'st_cargo' : 'st_empty'), '']);
  } else if (u.kind === 'veh') {
    if (u.blitz > G.t) out.push([t('st_blitz'), 'warn']);
  } else if (u.kind === 'bld') {
    if (u.built < 1) out.push([t('st_cons', { p: Math.floor(u.built * 100) }), 'warn']);
    else if (u.queue.length) out.push([t('st_queue', { n: u.queue.length }), '']);
    if (u.type === 'depot' && u.built >= 1) out.push(['+20 ' + t('supply'), '']);
    if (u.built >= 1 && u.bt.fob) out.push([t('st_fob'), '']); else if (u.built >= 1 && u.bt.shop) out.push([t('st_shop'), '']);
  }
  if (u.vet && u.vet.lvl) out.push([t('st_vet', { n: u.vet.lvl }), '']);
  return out;
}
const hpFrac = u => u.kind === 'squad' ? u.members.reduce((a, m) => a + (m.dead ? 0 : m.hp), 0) / (u.ut.n * u.ut.hp) : u.hp / u.max;
function weaponsOf(u) { const list = u.kind === 'bld' ? (u.bt.w || []) : u.kind === 'squad' ? u.members.filter(m => !m.dead).map(m => m.w) : u.ut.w; return [...new Set(list)].map(w => t('w_' + w)).join(', '); }
let selKey = '', selDyn = null;
function renderSel() {
  const sel = [...G.sel], one = sel.length === 1 ? sel[0] : null;
  const key = sel.map(o => o.id).join(',') + '|' + (one && one.kind === 'bld' ? one.queue.map(q => q.type).join('.') + (one.research ? 'r' + one.research.key : '') + (one.built >= 1 ? 'b' : '') : '') + LANG;
  if (key !== selKey) { selKey = key; buildSel($('selInfo'), sel, one); }
  if (selDyn) selDyn();
}
function buildSel(box, sel, one) {
  box.innerHTML = ''; selDyn = null;
  if (!sel.length) { box.innerHTML = `<div class="seltxt"><div class="st">${esc(t('sel_none'))}</div></div>`; return; }
  const txt = document.createElement('div'); txt.className = 'seltxt';
  if (!one) {
    const counts = {}; for (const u of sel) counts[u.type] = (counts[u.type] || 0) + 1;
    txt.innerHTML = `<h3>${esc(t('sel_many', { n: sel.length }))}</h3>`;
    const mix = document.createElement('div'); mix.className = 'mix';
    for (const k in counts) { const s = document.createElement('span'); s.append(iconEl(k, '#b1cbff', 1.2), document.createTextNode('×' + counts[k])); mix.append(s); }
    txt.append(mix); box.append(txt); return;
  }
  const por = document.createElement('div'); por.className = 'portrait'; por.append(iconEl(one.type, one.kind === 'bld' ? '#dfe3ef' : '#b1cbff', one.kind === 'bld' ? 3 : iconK(one.type)));
  const name = one.kind === 'bld' ? t('b_' + one.type) : t('u_' + one.type);
  txt.innerHTML = `<h3>${esc(name)}</h3><div class="st"></div><div class="hpb${one.kind === 'bld' && one.built < 1 ? ' cons' : ''}"><i></i></div>`;
  const wp = weaponsOf(one); if (wp) { const w = document.createElement('div'); w.className = 'st'; w.textContent = wp; txt.append(w); }
  box.append(por, txt);
  const st = txt.querySelector('.st'), hp = txt.querySelector('.hpb i'); let q = null;
  if (one.kind === 'bld' && one.team === 1 && one.built >= 1 && (one.queue.length || one.research)) {
    q = document.createElement('div'); q.id = 'queue';
    one.queue.forEach((it, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn qi'; b.append(iconEl(it.type, '#ffcf8a', 1.2)); const pg = document.createElement('i'); pg.className = 'pg'; b.append(pg); bindTip(b, () => ({ title: t('u_' + it.type), desc: t('lbl_cancel') })); b.addEventListener('click', () => { cmdCancel(one, i); hideTip(); hudTick(true); }); q.append(b); });
    if (one.research) { const b = document.createElement('div'); b.className = 'btn qi res'; b.append(iconEl(one.research.key, '#c4a0ff', 2)); const pg = document.createElement('i'); pg.className = 'pg'; b.append(pg); q.append(b); }
    txt.append(q);
  }
  selDyn = () => {
    const s = statusOf(one); st.textContent = s.map(x => x[0]).join(' · '); st.className = 'st' + (s.some(x => x[1] === 'bad') ? ' bad' : s.some(x => x[1] === 'warn') ? ' warn' : '');
    hp.style.width = Math.round(100 * clamp(one.kind === 'bld' && one.built < 1 ? one.built : hpFrac(one), 0, 1)) + '%';
    if (q) { const pgs = q.querySelectorAll('.pg'); if (one.queue[0] && pgs[0]) pgs[0].style.width = Math.round(100 * one.queue[0].t / one.queue[0].total) + '%'; if (one.research) pgs[pgs.length - 1].style.width = Math.round(100 * one.research.t / one.research.total) + '%'; }
  };
}
function unitTip(k) {
  const ut = UT[k], W = [...new Set(ut.w)];
  return { title: t('u_' + k), desc: t('u_' + k + '_d'), cost: costOf(1, k), time: ut.time, sup: ut.sup, req: reqMissing(1, k),
    extra: [t('lbl_hp') + ' ' + (ut.n ? ut.n + '×' : '') + ut.hp, t('lbl_range', { r: WT[W[0]].rng * 4 })], weap: t('lbl_weap') + ': ' + W.map(w => t('w_' + w)).join(', ') };
}
const nearHQ = u => { const [x, y] = unitPos(u); return !!nearBase(1, x, y, 110); };          // the HQ or a forward base
function cardSpec() {
  if (!G || G.demo || G.over) return [];
  const T = G.teams[1], units = selUnits(), blds = [...G.sel].filter(o => o.kind === 'bld' && !o.dead && o.team === 1), S = [];
  const armBtn = (id, icon, title, desc, hot, cost, more) => ({ id, icon, title, desc, hot, cost, act: () => arm(id), state: () => Object.assign({ armed: G.armed === id, off: cost ? !!costMissing(1, cost) : false }, more ? more() : {}) });
  if (G.place) { S.push({ id: 'cancelPlace', icon: 'back', title: t('c_back'), desc: t('m_place'), hot: 'Esc', act: () => { G.place = null; } }); return S; }
  if (units.length) {
    const sq = units.filter(u => u.kind === 'squad'), eng = sq.filter(u => u.type === 'engineers'), air = units.filter(u => u.kind === 'air'), rif = sq.filter(u => u.type === 'riflemen');
    if (G.buildMenu && eng.length) {
      for (const k of BUILD_LIST.filter(k => !BT[k].water || G.map.water)) S.push({ id: 'b_' + k, icon: k, title: t('b_' + k), cost: BT[k].cost, tip: () => ({ title: t('b_' + k), desc: t('b_' + k + '_d'), cost: BT[k].cost, time: BT[k].time, req: reqMissing(1, k), extra: [t('lbl_hp') + ' ' + BT[k].hp] }), act: () => startPlace(k), state: () => ({ locked: !!reqMissing(1, k), off: !!costMissing(1, BT[k].cost), armed: G.place === k }) });
      S.push({ id: 'buildBack', icon: 'back', title: t('c_back'), hot: 'Esc', act: () => { G.buildMenu = false; } });
      return S;
    }
    S.push({ id: 'stop', icon: 'stop', title: t('c_stop'), desc: t('c_stop_d'), hot: 'X', act: cmdStop });
    if (units.some(u => u.kind !== 'air')) S.push({ id: 'retreat', icon: 'retreat', title: t('c_retreat'), desc: t('c_retreat_d'), hot: 'Q', act: cmdRetreat, state: () => ({ armed: sq.some(u => u.retreat) }) });
    if (sq.length) S.push({ id: 'reinforce', icon: 'reinforce', title: t('c_reinforce'), hot: 'E', act: cmdReinforce, tip: () => ({ title: t('c_reinforce'), desc: t('c_reinforce_d'), cost: { mp: Math.min(...sq.map(reinforceCost)) } }), state: () => ({ off: !sq.some(u => liveCount(u) < u.ut.n && nearHQ(u)) }) });
    if (rif.length) S.push(armBtn('grenade', 'grenade', t('c_grenade'), t('c_grenade_d'), 'G', { mu: 25 }, () => ({ cd: rif.some(u => G.t >= u.grenT) ? 0 : clamp(Math.min(...rif.map(u => (u.grenT - G.t) / 15)), 0, 1) })));
    if (units.some(u => u.ut.ground)) S.push(armBtn('ground', 'ground', t('c_ground'), t('c_ground_d'), 'T'));
    if (eng.length) S.push({ id: 'build', icon: 'build', title: t('c_build'), desc: t('c_build_d'), hot: 'B', act: () => { G.buildMenu = true; } });
    if (air.length) S.push({ id: 'rtb', icon: 'rtb', title: t('c_rtb'), desc: t('c_rtb_d'), act: cmdRTB });
    if (units.some(u => u.cargo && (u.kind === 'air' || u.ut.sea))) S.push(armBtn('unload', 'unload', t('c_unload'), t('c_unload_d')));
    if (air.some(u => u.type === 'heli_trans' && !u.cargo)) { const lc = { mp: costOf(1, 'riflemen').mp }; S.push({ id: 'load', icon: 'load', title: t('c_load'), desc: t('c_load_d'), cost: lc, act: cmdLoad, state: () => ({ off: !!costMissing(1, lc) }) }); }
    return S;
  }
  if (blds.length === 1) {
    const b = blds[0]; if (b.built < 1) return S;
    for (const k of UNIT_AT[b.type] || []) { const ut = UT[k], c = costOf(1, k); S.push({ id: 'u_' + k, icon: k, title: t('u_' + k), cost: c, tip: () => unitTip(k), act: () => cmdProduce(b, k), state: () => ({ locked: !!reqMissing(1, k), off: !!costMissing(1, c) || T.used + ut.sup > T.cap || b.queue.length >= 5, count: b.queue.filter(q => q.type === k).length || '' }) }); }
    for (const k of researchList(1, b.type)) { if (T.tech.has(k)) continue; const rt = RT[k]; S.push({ id: 'r_' + k, icon: k, col: '#c4a0ff', title: t('r_' + k), cost: rt.cost, tip: () => ({ title: t('r_' + k), desc: t('r_' + k + '_d'), cost: rt.cost, time: rt.time, req: reqMissing(1, k) }), act: () => cmdResearch(b, k), state: () => { const mine = b.research && b.research.key === k; return { locked: !!reqMissing(1, k), off: !mine && (!!costMissing(1, rt.cost) || !!b.research), armed: mine, prog: mine ? b.research.t / b.research.total : 0 }; } }); }
    if (UNIT_AT[b.type]) S.push(armBtn('rally', 'rally', t('c_rally_t'), t('c_rally')));
  }
  return S;
}
let cardKey = '', cardBtns = [];
function renderCmd() {
  const specs = cardSpec(), key = specs.map(s => s.id).join(',') + LANG, box = $('cmd');
  if (key !== cardKey) {
    cardKey = key; box.innerHTML = ''; cardBtns = []; if (tipOwner && box.contains(tipOwner)) hideTip();
    specs.forEach((s, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn cb'; b.setAttribute('aria-label', s.title);
      const hk = document.createElement('span'); hk.className = 'hk'; hk.textContent = s.hot || (i < 9 ? String(i + 1) : '');
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = s.title;
      const ct = document.createElement('span'); ct.className = 'ct';
      const cnt = document.createElement('span'); cnt.className = 'cnt';
      const cd = document.createElement('i'); cd.className = 'cd'; const pg = document.createElement('i'); pg.className = 'pg';
      b.append(hk, iconEl(s.icon, s.col || '#dfe3ef'), nm, ct, cnt, cd, pg);
      bindTip(b, () => s.tip ? s.tip() : { title: s.title, desc: s.desc, cost: s.cost });
      b.addEventListener('click', () => { SFX.init(); if (!G || G.over) return; s.act(); SFX.play('ui'); hudTick(true); if (tipOwner === b) showTip(b, s.tip ? s.tip() : { title: s.title, desc: s.desc, cost: s.cost }); });
      box.append(b); cardBtns.push({ el: b, s, cd, cnt, ct, pg, ck: '' });
    });
  }
  for (const c of cardBtns) {
    const st = c.s.state ? c.s.state() : {};
    c.el.classList.toggle('off', !!st.off && !st.armed); c.el.classList.toggle('locked', !!st.locked); c.el.classList.toggle('armed', !!st.armed);
    c.cd.style.height = Math.round((st.cd || 0) * 100) + '%'; c.pg.style.width = Math.round((st.prog || 0) * 100) + '%'; c.cnt.textContent = st.count || '';
    if (c.s.cost) { const h = costHTML(c.s.cost); if (h !== c.ck) { c.ck = h; c.ct.innerHTML = h; } }
  }
}
function globTick() {
  const T = G.teams[1];
  for (const [id, k] of [['gArty', 'artillery'], ['gRecon', 'recon'], ['gAb', abOf(1)]]) { if (!k) continue; const el = $(id), g = globalOf(1, k), cdk = T.cd[k] > G.t ? (T.cd[k] - G.t) / g.cd : 0; el.querySelector('.cd').style.height = Math.round(cdk * 100) + '%'; el.classList.toggle('off', cdk > 0 || !!costMissing(1, g.cost)); el.classList.toggle('armed', G.armed === k); }
}
let miniFogStamp = -1, miniFog = null;
function drawMinimap() {
  const mc = $('mini'), m = G.map, w = m.mini.width * 2, h = m.mini.height * 2;
  if (mc.width !== w || mc.height !== h) { mc.width = w; mc.height = h; }
  const x = mc.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(m.mini, 0, 0, w, h);
  const sc = w / m.W;
  if (!miniFog || miniFog.width !== G.vw || miniFog.height !== G.vh) { miniFog = mkCanvas(G.vw, G.vh); miniFogStamp = -1; }
  if (miniFogStamp !== G.visStamp) { miniFogStamp = G.visStamp; const fx = miniFog.getContext('2d'), im = fx.createImageData(G.vw, G.vh), v = G.vis[1]; for (let i = 0; i < v.length; i++) { im.data[i * 4] = 8; im.data[i * 4 + 1] = 10; im.data[i * 4 + 2] = 18; im.data[i * 4 + 3] = v[i] ? 0 : G.seen[i] ? 90 : 190; } fx.putImageData(im, 0, 0); }
  x.drawImage(miniFog, 0, 0, G.vw * 8 * sc, G.vh * 8 * sc);
  for (const p of m.points) { x.strokeStyle = p.owner === 1 ? '#4a86ff' : p.owner === 2 ? '#ee3a34' : p.type === 'tw' ? '#ffd65a' : '#c8ccda'; x.lineWidth = p.type === 'tw' ? 3 : p.type === 'vp' ? 2 : 1; x.strokeRect(Math.round(p.x0 * sc) + .5, Math.round(p.y0 * sc) + .5, Math.round((p.x1 - p.x0) * sc), Math.round((p.y1 - p.y0) * sc)); }
  for (const b of G.blds) {
    if (b.bt.small || (b.team === 2 && !b.spotted)) continue; x.fillStyle = b.team === 1 ? '#7fa8ff' : '#ff6a60';
    if (b.bt.fob) { const bx = Math.round(b.x * sc), by = Math.round(b.y * sc); x.fillRect(bx - 3, by - 3, 7, 6); x.fillStyle = '#ffffff'; x.fillRect(bx, by - 2, 1, 4); x.fillRect(bx - 1, by - 2, 3, 1); continue; }      // a forward base: a bigger mark with an aerial
    x.fillRect(Math.round(b.x * sc) - 2, Math.round(b.y * sc) - 2, 5, 4);
  }
  for (const e of G.E[1]) if (e.cls !== 'bld') { x.fillStyle = e.cls === 'air' ? '#e2ecff' : '#9cc0ff'; const s = e.cls === 'inf' ? 2 : 3; x.fillRect(Math.round(e.x * sc) - 1, Math.round(e.y * sc) - 1, s, s); }
  for (const e of G.E[2]) if (e.cls !== 'bld' && canSee(1, e)) { x.fillStyle = e.cls === 'air' ? '#ffd0c8' : '#ff5a50'; const s = e.cls === 'inf' ? 2 : 3; x.fillRect(Math.round(e.x * sc) - 1, Math.round(e.y * sc) - 1, s, s); }
  const nowt = performance.now();
  for (const p of minimapPings) { const age = nowt - p.t, dur = p.dur || 1200; if (age > dur) continue; const a = (age % 1200) / 1200, f = p.dur ? (1 - age / dur) * .5 + .5 : 1; x.strokeStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${(1 - a) * f})`; x.lineWidth = 2; x.beginPath(); x.arc(p.x * sc, p.y * sc, 3 + a * 14, 0, TAU); x.stroke(); }
  for (let k = minimapPings.length - 1; k >= 0; k--) if (nowt - minimapPings[k].t > (minimapPings[k].dur || 1200) + 100) minimapPings.splice(k, 1);
  x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.strokeRect(Math.round(G.cam.x * sc) + .5, Math.round(G.cam.y * sc) + .5, Math.round(VIEW.vw * sc), Math.round(VIEW.vh * sc));
}

/* ---------------------------------------------------------------- actions */
function arm(kind) {
  if (!G || G.over || G.demo) return; SFX.init();
  if (GLOBAL[kind]) { const T = G.teams[1], g = globalOf(1, kind); if (G.armed !== kind) { if (G.t < T.cd[kind]) { hooks.toast(t('m_notReady'), 'bad'); return; } const cm = costMissing(1, g.cost); if (cm) { hooks.toast(t(cm), 'bad'); return; } } }
  G.place = null; G.armed = G.armed === kind ? null : kind;
  if (G.armed) hooks.toast(t(kind === 'rally' ? 'c_rally' : 'm_pick'));
  hudTick(true);
}
function startPlace(type) {
  const miss = reqMissing(1, type); if (miss) { hooks.toast(t('m_req', { x: miss }), 'bad'); return; }
  if (BT[type].fob && G.blds.filter(b => b.team === 1 && b.bt.fob && !b.dead).length >= fobMax()) { hooks.toast(t('m_fobMax'), 'bad'); return; }
  const cm = costMissing(1, BT[type].cost); if (cm) { hooks.toast(t(cm), 'bad'); return; }
  G.armed = null; G.place = type; if (!G.hover) G.hover = [G.cam.x + VIEW.vw / 2, G.cam.y + VIEW.vh / 2]; hooks.toast(t('m_place'));
}
function placeAt(wx, wy, keep) {
  const type = G.place, [ax, ay] = placeAnchor(type, wx, wy);
  if (cmdPlace(type, ax, ay)) { if (!(keep || (BT[type].small && !BT[type].bridge)) || costMissing(1, BT[type].cost)) { G.place = null; G.buildMenu = false; } }
  hudTick(true);
}
function fireArmed(wx, wy) {
  const k = G.armed; let ok = false;
  if (k === 'grenade') ok = cmdGrenade(wx, wy); else if (k === 'ground') ok = cmdGround(wx, wy); else if (k === 'artillery') ok = cmdArtillery(wx, wy); else if (k === 'recon') ok = cmdRecon(wx, wy); else if (k === 'unload') ok = cmdUnload(wx, wy);
  else if (k === 'charge' || k === 'blitz' || k === 'para') ok = cmdArmyAbility(wx, wy);
  else if (k === 'rally') { for (const b of G.sel) if (b.kind === 'bld' && UNIT_AT[b.type]) b.rally = [wx, wy]; G.marker = { x: wx, y: wy, t0: G.t, kind: 'move' }; SFX.play('order'); ok = true; }
  if (ok) G.armed = null;
  hudTick(true);
}
function selectArmy() { if (!G || G.demo) return; G.sel.clear(); for (const u of G.units) if (u.team === 1 && unitAlive(u) && u.type !== 'engineers') G.sel.add(u); G.buildMenu = false; SFX.play('select'); hudTick(true); }
function selectHQ() { if (!G || G.demo) return; const hq = G.teams[1].hq; if (!hq || hq.dead) return; G.sel.clear(); G.sel.add(hq); G.cam.x = hq.x - VIEW.vw / 2; G.cam.y = hq.by - 20 - VIEW.vh / 2; SFX.play('select'); hudTick(true); }
function toggleNV() { if (!G || G.demo) return; G.nv = !G.nv; SFX.play('nv'); paintIcons(); hudTick(true); }
function togglePause() {
  if (!G || G.over || G.demo) return; G.paused = !G.paused;
  if (G.paused) { const a1 = G.teams[1].army, a2 = G.teams[2].army; $('pArmy').textContent = (a1 && a2 ? t('lbl_armies', { me: t('army_' + a1), foe: t('army_' + a2) }) : '') + (G.camp ? ` · ${t('camp')}: ${areaName(G.camp.area)}` : ''); helpBack = 'scrPause'; show('scrPause'); } else show(null);
}
function setZoom(z, px, py) { if (!G) return; const [wx, wy] = toWorld(px, py); G.zoom = z; const s = zoomScale(z, DPR()); VIEW.s = s; const dpr = DPR(); G.cam.x = wx - px * dpr / s; G.cam.y = wy - py * dpr / s; }
const zoomBy = d => G && setZoom(clamp(G.zoom + d, 1, 4), canvas.clientWidth / 2, canvas.clientHeight / 2);

/* ---------------------------------------------------------------- sound */
const GAP = { rifle: .03, smg: .03, mg: .04, chain: .035, flak: .05, boom: .05, hammer: .14, ricochet: .08, cannon: .05, sniper: .05, rocket: .05, mortar: .05, howitzer: .1, whistle: .12, grenade: .05, alert: 1.5 };
const SFX = {
  ctx: null, master: null, on: store.get('sound', true), noise: null, last: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    this.master = this.ctx.createGain(); this.master.gain.value = this.on ? .8 : 0; this.master.connect(this.ctx.destination);
    const n = this.ctx.sampleRate * 2, nb = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = nb;
    const src = this.ctx.createBufferSource(); src.buffer = nb; src.loop = true; const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = this.ctx.createGain(); g.gain.value = .045;
    const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = .09; lg.gain.value = .02; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
  },
  setOn(v) { this.on = v; store.set('sound', v); if (this.master) this.master.gain.value = v ? .8 : 0; },
  hear(x, y) { if (x == null || !G) return [1, 0]; const cx = G.cam.x + VIEW.vw / 2, cy = G.cam.y + VIEW.vh / 2, r = Math.max(VIEW.vw, VIEW.vh) * .6, d = dist(x, y, cx, cy) / r; return [clamp(1 / (1 + d * d * 1.6), 0, 1) * clamp(4 / Math.max(1, VIEW.vw / 120), .35, 1), clamp((x - cx) / (VIEW.vw / 2), -1, 1) * .7]; },
  out(g, pan) { const c = this.ctx; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.master); } else g.connect(this.master); },
  nz(t0, type, freq, q, peak, dec, pan, dur) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t0 + .004); g.gain.exponentialRampToValueAtTime(.0001, t0 + dec); s.connect(f); f.connect(g); this.out(g, pan); s.start(t0, Math.random() * 1.5); s.stop(t0 + (dur || dec + .05)); },
  tn(t0, type, f0, f1, peak, dec, pan) { const c = this.ctx, o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dec); const g = c.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t0 + .005); g.gain.exponentialRampToValueAtTime(.0001, t0 + dec); o.connect(g); this.out(g, pan); o.start(t0); o.stop(t0 + dec + .05); },
  play(kind, x, y, v = 1) {
    if (!this.ctx || !this.on || (G && G.demo && kind !== 'ui')) return;
    const c = this.ctx, t0 = c.currentTime, [g, pan] = this.hear(x, y), gap = GAP[kind] || 0;
    if (gap && t0 - (this.last[kind] || 0) < gap) return; this.last[kind] = t0;
    if (g < .03) return;
    switch (kind) {
      case 'rifle': this.nz(t0, 'bandpass', 1900, .8, .5 * g, .05, pan); this.nz(t0, 'lowpass', 800, .7, .45 * g, .16, pan); break;
      case 'smg': this.nz(t0, 'bandpass', 2300, .8, .34 * g, .035, pan); this.nz(t0, 'lowpass', 900, .7, .28 * g, .1, pan); break;
      case 'mg': this.nz(t0, 'bandpass', 1500, .9, .32 * g, .04, pan); this.nz(t0, 'lowpass', 700, .7, .25 * g, .09, pan); break;
      case 'chain': this.nz(t0, 'bandpass', 1250, 1, .3 * g, .03, pan); this.nz(t0, 'lowpass', 600, .7, .24 * g, .07, pan); break;
      case 'flak': this.nz(t0, 'lowpass', 750, .8, .5 * g, .12, pan); this.tn(t0, 'sine', 170, 60, .3 * g, .1, pan); break;
      case 'sniper': this.nz(t0, 'bandpass', 2700, .7, .6 * g, .04, pan); this.nz(t0, 'lowpass', 650, .7, .5 * g, .55, pan, .7); break;
      case 'rocket': this.nz(t0, 'bandpass', 1300, 1.2, .42 * g, .5, pan, .6); this.nz(t0, 'lowpass', 480, .7, .4 * g, .25, pan); break;
      case 'cannon': this.nz(t0, 'lowpass', 900, .8, .95 * g, .55, pan, .8); this.tn(t0, 'sine', 120, 34, .8 * g, .45, pan); this.nz(t0, 'bandpass', 2400, .7, .4 * g, .06, pan); break;
      case 'howitzer': this.nz(t0, 'lowpass', 520, .8, Math.min(1, 1.05 * g), .95, pan, 1.3); this.tn(t0, 'sine', 72, 26, .9 * g, .75, pan); break;
      case 'mortar': this.tn(t0, 'sine', 150, 60, .5 * g, .14, pan); this.nz(t0, 'lowpass', 500, .7, .35 * g, .12, pan); break;
      case 'boom': this.nz(t0, 'lowpass', 620, .8, Math.min(1, .95 * g * v), .95, pan, 1.6); this.tn(t0, 'sine', 85, 30, .85 * g, .6, pan); for (let i = 0; i < 7; i++) this.nz(t0 + .25 + Math.random() * .9, 'bandpass', 2600, 2, .07 * g, .03, pan); break;
      case 'grenade': this.nz(t0, 'lowpass', 900, .8, .75 * g, .55, pan, 1); this.tn(t0, 'sine', 110, 40, .5 * g, .35, pan); break;
      case 'whistle': this.tn(t0, 'sine', 1500, 520, .05 * g, .6, pan); break;
      case 'ricochet': this.tn(t0, 'sine', 2600, 1300, .05 * g, .16, pan); break;
      case 'hammer': this.nz(t0, 'bandpass', 3200, 3, .12 * g, .03, pan); this.tn(t0, 'square', 420, 0, .02 * g, .04, pan); break;
      case 'order': this.tn(t0, 'sine', 1050, 0, .09, .06, 0); break;
      case 'select': this.tn(t0, 'sine', 1200, 0, .08, .05, 0); this.tn(t0 + .06, 'sine', 1800, 0, .07, .06, 0); break;
      case 'ui': this.tn(t0, 'square', 880, 0, .04, .05, 0); break;
      case 'ready': this.tn(t0, 'triangle', 880, 0, .08, .16, 0); this.tn(t0 + .1, 'triangle', 1175, 0, .08, .22, 0); break;
      case 'built': [784, 988, 1175].forEach((f, i) => this.tn(t0 + i * .08, 'triangle', f, 0, .09, .3, 0)); break;
      case 'capture': [659.3, 987.8, 1318.5].forEach((f, i) => this.tn(t0 + i * .09, 'triangle', f, 0, .12, .45, 0)); break;
      case 'lost': [523.3, 392].forEach((f, i) => this.tn(t0 + i * .14, 'triangle', f, 0, .12, .4, 0)); break;
      case 'alert': [660, 520, 660].forEach((f, i) => this.tn(t0 + i * .13, 'square', f, 0, .035, .11, 0)); break;
      case 'radio': this.nz(t0, 'bandpass', 1800, 2, .1, .25, 0); this.tn(t0 + .28, 'sine', 1200, 0, .06, .08, 0); this.tn(t0 + .4, 'sine', 1200, 0, .06, .08, 0); break;
      case 'plane': this.nz(t0, 'lowpass', 320, .9, .3, 2.2, 0, 2.4); this.tn(t0, 'sawtooth', 96, 70, .03, 2.2, 0); break;
      case 'nv': this.tn(t0, 'sine', 500, 4200, .05, .65, 0); break;
      case 'bugle': [392, 523.3, 659.3, 784].forEach((f, i) => this.tn(t0 + i * .09, 'square', f, 0, .05 * g + .02, i === 3 ? .4 : .12, pan)); break;
      case 'blitz': this.nz(t0, 'lowpass', 260, .8, .3 * g + .1, 1.2, pan, 1.4); this.tn(t0, 'sawtooth', 62, 118, .05 * g + .02, 1.1, pan); break;
    }
  }
};

/* ---------------------------------------------------------------- input */
const pointers = new Map(); let drag = null, pinch = null, lpTimer = null, lastClick = { id: 0, t: 0 };
const toWorld = (px, py) => { const dpr = DPR(); return [G.cam.x + px * dpr / VIEW.s, G.cam.y + py * dpr / VIEW.s]; };
const modKey = ev => ev.shiftKey || ev.ctrlKey || ev.metaKey;
function clickAt(px, py, ev, isTouch) {
  if (!G || G.demo || G.over) return;
  const [wx, wy] = toWorld(px, py);
  if (G.place) { placeAt(wx, wy, ev.shiftKey); return; }
  if (G.armed) { fireArmed(wx, wy); return; }
  const o = ownAt(wx, wy), eng = selUnits().some(u => u.type === 'engineers');
  if (o && isTouch && eng && ((o.kind === 'bld' && (o.built < 1 || o.hp < o.max)) || (o.kind === 'veh' && o.hp < o.max))) { cmdSmart(wx, wy); hudTick(true); return; }
  if (o) {
    const now = performance.now(), dbl = lastClick.id === o.id && now - lastClick.t < 380; lastClick = { id: o.id, t: now };
    if (dbl && o.kind !== 'bld') { G.sel.clear(); for (const u of G.units) if (u.team === 1 && u.type === o.type && unitAlive(u)) { const [x, y] = unitPos(u); if (x > G.cam.x && x < G.cam.x + VIEW.vw && y > G.cam.y && y < G.cam.y + VIEW.vh) G.sel.add(u); } }
    else if (modKey(ev) && o.kind !== 'bld' && ![...G.sel].some(s => s.kind === 'bld')) { if (G.sel.has(o)) G.sel.delete(o); else G.sel.add(o); }
    else { G.sel.clear(); G.sel.add(o); }
    G.buildMenu = false; G.armed = null; SFX.play('select'); hudTick(true); return;
  }
  if (isTouch && G.sel.size) { cmdSmart(wx, wy); hudTick(true); return; }
  if (!isTouch) { G.sel.clear(); G.buildMenu = false; hudTick(true); }
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  SFX.init(); hideTip(); try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* capture is optional */ }
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, sx: e.offsetX, sy: e.offsetY, btn: e.button, type: e.pointerType, moved: false, box: false });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: dist(a.x, a.y, b.x, b.y), z: G ? G.zoom : 3 }; clearTimeout(lpTimer); return; }
  const p = pointers.get(e.pointerId);
  if (G) G.hover = toWorld(e.offsetX, e.offsetY);
  if (e.pointerType !== 'mouse') lpTimer = setTimeout(() => { if (!p.moved && G && !G.demo && !G.place && !G.armed) { p.box = true; drag = { x0: p.sx, y0: p.sy, x1: p.sx, y1: p.sy }; if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) { /* no vibration */ } } }, 420);
});
canvas.addEventListener('pointermove', e => {
  if (G && (e.pointerType === 'mouse' || pointers.has(e.pointerId))) G.hover = toWorld(e.offsetX, e.offsetY);
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.offsetX - p.x, dy = e.offsetY - p.y; p.x = e.offsetX; p.y = e.offsetY;
  if (hyp(p.x - p.sx, p.y - p.sy) > 7) { p.moved = true; clearTimeout(lpTimer); }
  if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()], d = dist(a.x, a.y, b.x, b.y); const z = clamp(Math.round(pinch.z * d / pinch.d), 1, 4); if (G && z !== G.zoom) setZoom(z, (a.x + b.x) / 2, (a.y + b.y) / 2); return; }
  if (!G || G.demo) return;
  if (p.box || (p.type === 'mouse' && p.btn === 0 && p.moved && !G.place && !G.armed)) { drag = { x0: p.sx, y0: p.sy, x1: p.x, y1: p.y }; return; }
  if ((p.type !== 'mouse' && p.moved && !(G.place && pointers.size === 1 && false)) || (p.type === 'mouse' && (p.btn === 1 || (p.btn === 2 && p.moved)))) { const dpr = DPR(); G.cam.x -= dx * dpr / VIEW.s; G.cam.y -= dy * dpr / VIEW.s; }
});
function endPointer(e) {
  const p = pointers.get(e.pointerId); pointers.delete(e.pointerId); clearTimeout(lpTimer);
  if (pointers.size < 2) pinch = null; if (!p || !G) return;
  if (drag && (p.box || (p.type === 'mouse' && p.btn === 0 && p.moved))) {
    const [ax, ay] = toWorld(Math.min(drag.x0, drag.x1), Math.min(drag.y0, drag.y1)), [bx, by] = toWorld(Math.max(drag.x0, drag.x1), Math.max(drag.y0, drag.y1));
    if (!e.shiftKey || [...G.sel].some(s => s.kind === 'bld')) G.sel.clear();
    for (const u of G.units) { if (u.team !== 1 || !unitAlive(u) || u.aboard) continue; const pts = u.kind === 'squad' ? u.members.filter(m => !m.dead) : [{ x: u.x, y: u.kind === 'air' ? u.y - u.alt : u.y }]; if (pts.some(m => m.x >= ax && m.x <= bx && m.y - 4 >= ay - 4 && m.y - 4 <= by)) G.sel.add(u); }
    if (G.sel.size) SFX.play('select'); G.buildMenu = false; drag = null; hudTick(true); return;
  }
  drag = null;
  if (p.moved || e.type === 'pointercancel') return;
  if (p.type === 'mouse' && p.btn === 2) {
    if (G.demo || G.over) return;
    if (G.place) { G.place = null; hudTick(true); return; }
    if (G.armed) { G.armed = null; hudTick(true); return; }
    const [wx, wy] = toWorld(p.x, p.y); cmdSmart(wx, wy); hudTick(true); return;
  }
  if (p.btn === 0 || p.type !== 'mouse') clickAt(p.x, p.y, e, p.type !== 'mouse');
}
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && G) G.hover = G.place ? G.hover : null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); if (!G || G.demo) return; setZoom(clamp(G.zoom + (e.deltaY < 0 ? 1 : -1), 1, 4), e.offsetX, e.offsetY); }, { passive: false });
const keys = new Set();
window.addEventListener('keydown', e => {
  if (!G || G.demo) return; const k = e.key.toLowerCase(); keys.add(k);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (G.over) return;
  if (k === 'escape') { if (G.place) G.place = null; else if (G.armed) G.armed = null; else if (G.buildMenu) G.buildMenu = false; else togglePause(); hudTick(true); return; }
  if (k === 'p') { togglePause(); return; }
  if (G.paused) return;
  const dg = /^Digit([1-9])$/.exec(e.code || '');
  if (dg && (e.ctrlKey || e.altKey)) { e.preventDefault(); assignGroup(+dg[1]); return; }
  if (dg && e.shiftKey) { e.preventDefault(); selectGroup(+dg[1]); return; }
  if (k === ' ') { jumpAlert(); return; }
  if (e.ctrlKey || e.metaKey) { if (k === 'a') { e.preventDefault(); selectArmy(); } return; }
  if (k === 'n') toggleNV();
  else if (k === 'h') selectHQ();
  else if (k === 'v') { const ab = abOf(1); if (ab) arm(ab); }
  else if (k === '+' || k === '=') zoomBy(1);
  else if (k === '-') zoomBy(-1);
  else { const hit = cardBtns.find((c, i) => c.s.hot ? c.s.hot.toLowerCase() === k : String(i + 1) === k); if (hit) hit.el.click(); }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
const miniMove = e => { if (!G || G.demo) return; const r = $('mini').getBoundingClientRect(), x = (e.clientX - r.left) / r.width * G.map.W, y = (e.clientY - r.top) / r.height * G.map.H; G.cam.x = x - VIEW.vw / 2; G.cam.y = y - VIEW.vh / 2; };
let miniDown = false;
$('mini').addEventListener('pointerdown', e => { miniDown = true; try { $('mini').setPointerCapture(e.pointerId); } catch (er) { /* optional */ } miniMove(e); });
$('mini').addEventListener('pointermove', e => { if (miniDown) miniMove(e); });
$('mini').addEventListener('pointerup', () => { miniDown = false; });
$('mini').addEventListener('pointercancel', () => { miniDown = false; });

/* ---------------------------------------------------------------- control groups
   Ctrl+1…9 keeps the selected units as a group; Shift+1…9 or the group's button picks them, twice in a row goes there;
   holding a group button puts the current selection in it (for phones) */
let groupTap = { n: 0, t: 0 };
function groupUnits(n) { const g = G && G.groups[n]; if (!g) return []; const live = g.filter(u => unitAlive(u) && !u.gone); if (live.length !== g.length) G.groups[n] = live; return live; }
function assignGroup(n) {
  if (!G || G.demo || G.over) return;
  const us = selUnits().filter(u => u.team === 1);
  if (!us.length) delete G.groups[n]; else { G.groups[n] = us; hooks.toast(t('m_group', { n, c: us.length })); }
  SFX.play('order'); renderGroups();
}
function selectGroup(n) {
  if (!G || G.demo || G.over) return; const us = groupUnits(n); if (!us.length) { renderGroups(); return; }
  const now = performance.now(), again = groupTap.n === n && now - groupTap.t < 450; groupTap = { n, t: now };
  G.sel.clear(); for (const u of us) G.sel.add(u); G.buildMenu = false; SFX.play('select');
  if (again) { let x = 0, y = 0; for (const u of us) { const [ux, uy] = unitPos(u); x += ux; y += uy; } G.cam.x = x / us.length - VIEW.vw / 2; G.cam.y = y / us.length - VIEW.vh / 2; }
  hudTick(true);
}
function hold(el, fn) {
  let tm = null, fired = false;
  el.addEventListener('pointerdown', () => { fired = false; clearTimeout(tm); tm = setTimeout(() => { fired = true; fn(); }, 550); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => clearTimeout(tm));
  el.addEventListener('click', e => { if (fired) { e.stopImmediatePropagation(); fired = false; } });
}
function renderGroups() {
  const box = $('groups'); if (!box) return;
  if (!G || G.demo) { if (box.childElementCount) { box.innerHTML = ''; box.dataset.key = ''; } return; }
  let key = '', used = 0; for (let n = 1; n <= 9; n++) { const c = groupUnits(n).length; if (c) { key += n + ':' + c + ','; used++; } }
  const canAdd = used < 9 && selUnits().some(u => u.team === 1); key += canAdd ? '+' : '';
  if (box.dataset.key === key) return; box.dataset.key = key; box.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const c = groupUnits(n).length; if (!c) continue;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn gch'; b.innerHTML = `<b>${n}</b><small>${c}</small>`;
    hold(b, () => assignGroup(n)); b.addEventListener('click', () => selectGroup(n)); bindTip(b, () => ({ title: t('groupTip', { n }) })); box.append(b);
  }
  if (canAdd) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn gch add'; b.textContent = '+'; b.addEventListener('click', () => { for (let n = 1; n <= 9; n++) if (!groupUnits(n).length) { assignGroup(n); return; } }); bindTip(b, () => ({ title: t('groupAdd') })); box.append(b); }
}
/* ---------------------------------------------------------------- saving and continuing a battle (one slot in this browser) */
function saveBattle(silent) {
  if (!G || G.demo || G.over) return false;
  let ok = false; try { store.set('save', saveState()); ok = !!store.get('save', null); } catch (e) { ok = false; }
  if (!silent) { hooks.toast(t(ok ? 'm_saved' : 'm_saveFail'), ok ? 'good' : 'bad'); SFX.play('ui'); }
  return ok;
}
function refreshContinue() { const el = $('mContinue'); if (el) el.hidden = !store.get('save', null); }
function continueBattle() {
  const d = store.get('save', null); if (!d) { refreshContinue(); return; }
  $('loading').hidden = false; hideTip();
  setTimeout(() => {
    const ok = loadState(d); $('loading').hidden = true;
    if (!ok) { store.set('save', null); refreshContinue(); startDemo(); return; }
    curMapId = d.map; alertAt = null;
    show(null); $('hud').hidden = false; $('nvv').hidden = true; hudFull(); hooks.toast(t('m_loaded'));
  }, 30);
}

/* ---------------------------------------------------------------- buttons */
$('bPause').addEventListener('click', () => { SFX.play('ui'); togglePause(); });
$('bNV').addEventListener('click', toggleNV);
$('bZoomIn').addEventListener('click', () => zoomBy(1));
$('bZoomOut').addEventListener('click', () => zoomBy(-1));
$('gArmy').addEventListener('click', selectArmy);
$('gHQ').addEventListener('click', selectHQ);
$('gArty').addEventListener('click', () => arm('artillery'));
$('gRecon').addEventListener('click', () => arm('recon'));
$('gAb').addEventListener('click', () => { const ab = abOf(1); if (ab) arm(ab); });
$('bAlert').addEventListener('click', jumpAlert);
const perMin = r => t('perMin', { n: G && !G.demo ? Math.round(G.teams[1].inc[r] * 60) : 0 });
bindTip($('rMp'), () => ({ title: t('mp'), desc: t('h_econ_t'), extra: [perMin('mp')] }));
bindTip($('rMu'), () => ({ title: t('mu'), desc: t('h_econ_t'), extra: [perMin('mu')] }));
bindTip($('rFu'), () => ({ title: t('fu'), desc: t('h_econ_t'), extra: [perMin('fu')] }));
bindTip($('rSup'), () => ({ title: t('supply'), desc: t('b_depot_d') }));
bindTip($('rMe'), () => ({ title: t('reserves'), desc: t('h_goal_t') }));
bindTip($('rFoe'), () => ({ title: t('reserves'), desc: t('h_goal_t') }));
bindTip($('gArty'), () => { const g = globalOf(1, 'artillery'); return { title: t('artillery'), desc: t('artillery_d'), cost: g.cost, extra: [t('lbl_time', { s: g.cd })] }; });
bindTip($('gRecon'), () => ({ title: t('recon'), desc: t('recon_d'), cost: GLOBAL.recon.cost, extra: [t('lbl_time', { s: GLOBAL.recon.cd })] }));
bindTip($('gAb'), () => { const ab = abOf(1); return ab ? { title: t('ab_' + ab) + ' (V)', desc: t('ab_' + ab + '_d'), cost: GLOBAL[ab].cost, extra: [t('lbl_time', { s: GLOBAL[ab].cd })] } : null; });
bindTip($('gArmy'), () => ({ title: t('army') + ' (Ctrl+A)' }));
bindTip($('gHQ'), () => ({ title: t('hqBtn') + ' (H)', desc: t('b_hq_d') }));
bindTip($('bAlert'), () => ({ title: t('alertBtn') }));
$('mPlay').addEventListener('click', () => { SFX.init(); SFX.play('ui'); show('scrMaps'); });
$('mHelp').addEventListener('click', () => { SFX.init(); helpBack = 'scrMain'; show('scrHelp'); });
$('pHelp').addEventListener('click', () => { helpBack = 'scrPause'; show('scrHelp'); });
$('mSound').addEventListener('click', () => { SFX.init(); SFX.setOn(!SFX.on); $('mSound').textContent = SFX.on ? t('on') : t('off'); SFX.play('ui'); });
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { SFX.play('ui'); show(b.closest('#scrHelp') ? helpBack : 'scrMain'); }));
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { LANG = b.dataset.lang; store.set('lang', LANG); applyI18n(); SFX.play('ui'); }));
document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { DIFFSEL = b.dataset.diff; store.set('diff', DIFFSEL); buildMapList(); SFX.play('ui'); }));
$('pResume').addEventListener('click', () => togglePause());
$('pRestart').addEventListener('click', () => { G.paused = false; const c = G.camp && campLoad(); if (c && c.id === G.camp.cid) startCampBattle(G.camp.area); else startMission(curMapId); });
$('pQuit').addEventListener('click', quitToMenu);
$('pSave').addEventListener('click', () => saveBattle(false));
$('mContinue').addEventListener('click', () => { SFX.init(); SFX.play('ui'); continueBattle(); });
document.querySelectorAll('[data-len]').forEach(b => b.addEventListener('click', () => { LENSEL = b.dataset.len; store.set('len', LENSEL); buildMapList(); SFX.play('ui'); }));
document.querySelectorAll('[data-army]').forEach(b => b.addEventListener('click', () => { ARMYSEL = b.dataset.army; store.set('army', ARMYSEL); buildMapList(); SFX.play('ui'); }));
$('eAgain').addEventListener('click', () => startMission(curMapId));
$('eMaps').addEventListener('click', () => { G = null; startDemo(); show('scrMaps'); });
campInitUI();                                  // step 8: the campaign's buttons
document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.demo && !G.over && !G.paused) togglePause(); });
window.addEventListener('resize', () => { layout(); hideTip(); });

/* ---------------------------------------------------------------- main loop */
function resize() { const dpr = DPR(), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } }
let last = performance.now(), acc = 0;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (G) {
    if (!G.paused && !G.over) { acc += dt; let n = 0; while (acc >= STEP && n++ < 5) { step(STEP); acc -= STEP; } if (acc > STEP * 5) acc = 0; }
    else if (G.over) { acc += dt; while (acc >= STEP) { G.t += STEP; updateParticles(STEP); acc -= STEP; } }
    else acc = 0;
    if (!G.demo && !G.paused) { const sp = 260 * dt / Math.max(1, G.zoom * .7); if (keys.has('w') || keys.has('arrowup')) G.cam.y -= sp; if (keys.has('s') || keys.has('arrowdown')) G.cam.y += sp; if (keys.has('a') || keys.has('arrowleft')) G.cam.x -= sp; if (keys.has('d') || keys.has('arrowright')) G.cam.x += sp; }
    if (G.demo && G.t > 600) startDemo();
    if (G.demo && !reduceMotion) { G.cam.x += Math.sin(now / 9000) * 6 * dt; G.cam.y -= 4 * dt * Math.cos(now / 13000); }
    resize(); render(ctx, canvas.width, canvas.height, DPR());
    if (drag) { const dpr = DPR(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(120,180,255,.18)'; ctx.strokeStyle = '#e2eeff'; ctx.lineWidth = 2; const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1), w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0); ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.setTransform(1, 0, 0, 1, 0, 0); }
    canvas.style.cursor = G.armed || G.place ? 'crosshair' : 'default';
    hudTick(false);
  }
  requestAnimationFrame(frame);
}
function boot(data) {
  const nav = (navigator.language || '').toLowerCase();
  LANG = (data && data.lang) || store.get('lang', null) || (nav.startsWith('ru') ? 'ru' : nav.startsWith('uz') ? 'uz' : 'en');
  if (!I18N[LANG]) LANG = 'en';
  $('loading').hidden = false;
  loadAtlas(() => {
    buildArt(); paintIcons(); applyI18n(); show('scrMain');
    setTimeout(() => { startDemo(); $('loading').hidden = true; requestAnimationFrame(frame); }, 20);
  });
}
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) try { hot.snapshot(() => ({ lang: LANG })); } catch (e) { /* hot reload unavailable */ }
if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});

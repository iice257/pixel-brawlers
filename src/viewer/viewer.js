import './anim.js';
import { buildPalette, PALETTE_GROUPS } from '../gfx/palette.js';
import { gridToCanvas, gridSize } from '../gfx/parts.js';
import * as surge from '../data/fighters/surge.js';
import * as brick from '../data/fighters/brick.js';

const FIGHTERS = { surge, brick };
// Reference crops in source-image pixels (828x512). `head` = matching fighter part.
const CROPS = {
  full: null,
  teal: { x: 195, y: 18, w: 240, h: 285 },
  blond: { x: 395, y: 0, w: 240, h: 300 },
};
const COMPARE = [
  { fighter: 'surge', part: 'head_neutral', crop: 'teal', mirror: true },
  { fighter: 'brick', part: 'head_neutral', crop: 'blond', mirror: false },
];

const $ = (id) => document.getElementById(id);
const outlineOn = () => $('outlineToggle').checked;
const flashCopy = (hex) => { try { navigator.clipboard?.writeText(hex); } catch { /* ignore */ } };

/* ---------------- reference panel ---------------- */
const refImg = new Image();
const refCanvas = $('refCanvas');
const rctx = refCanvas.getContext('2d', { willReadFrequently: true });
const src = document.createElement('canvas');
let crop = null;
let zoom = 2;
let loaded = false;

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

function drawRef() {
  if (!loaded) return;
  const c = crop ?? { x: 0, y: 0, w: src.width, h: src.height };
  refCanvas.width = c.w * zoom; refCanvas.height = c.h * zoom;
  rctx.imageSmoothingEnabled = false;
  rctx.drawImage(src, c.x, c.y, c.w, c.h, 0, 0, c.w * zoom, c.h * zoom);
}

function refPixel(ev) {
  const r = refCanvas.getBoundingClientRect();
  const c = crop ?? { x: 0, y: 0 };
  const x = Math.floor((ev.clientX - r.left) / zoom) + c.x;
  const y = Math.floor((ev.clientY - r.top) / zoom) + c.y;
  if (x < 0 || y < 0 || x >= src.width || y >= src.height) return null;
  const d = src.getContext('2d').getImageData(x, y, 1, 1).data;
  return { x, y, hex: hex(d[0], d[1], d[2]) };
}

const picks = [];
function renderPicks() {
  const el = $('picks');
  el.innerHTML = '';
  picks.forEach((p) => el.append(swatch(p.hex, `${p.x},${p.y}`)));
}
function swatch(color, label) {
  const s = document.createElement('div');
  s.className = 'sw';
  s.title = 'click to copy';
  s.innerHTML = `<i style="background:${color}"></i><span>${color}</span>${label ? `<span>${label}</span>` : ''}`;
  s.onclick = () => flashCopy(color);
  return s;
}

refCanvas.addEventListener('mousemove', (ev) => {
  const p = refPixel(ev);
  $('hover').textContent = p ? `${p.x},${p.y}  ${p.hex}` : '';
});
refCanvas.addEventListener('click', (ev) => {
  const p = refPixel(ev);
  if (!p) return;
  picks.unshift(p);
  picks.length = Math.min(picks.length, 24);
  renderPicks();
});
$('zoom').addEventListener('input', (e) => { zoom = +e.target.value; $('zoomVal').textContent = `${zoom}x`; drawRef(); });
document.querySelectorAll('[data-crop]').forEach((b) => b.addEventListener('click', () => { crop = CROPS[b.dataset.crop]; drawRef(); }));

refImg.onload = () => {
  src.width = refImg.naturalWidth; src.height = refImg.naturalHeight;
  src.getContext('2d').drawImage(refImg, 0, 0);
  loaded = true;
  crop = CROPS.teal;
  drawRef();
  renderCompare();
  window.__viewer = { src, picks, sample: (x, y) => { const d = src.getContext('2d').getImageData(x, y, 1, 1).data; return hex(d[0], d[1], d[2]); } };
};
refImg.onerror = () => { $('err').style.display = 'inline'; };
refImg.src = 'brainstorm/reference/characters-reference.png';

/* ---------------- parts / palettes / compare ---------------- */
const PIVOT_COLORS = ['#ff00ff', '#00ffcc', '#ffee00', '#ff8800'];
function drawPivots(ctx, pivots, scale) {
  const pad = outlineOn() ? 1 : 0;
  Object.values(pivots).forEach(([x, y], i) => {
    const px = (x + pad) * scale + scale / 2, py = (y + pad) * scale + scale / 2, r = Math.max(3, scale);
    ctx.strokeStyle = PIVOT_COLORS[i % PIVOT_COLORS.length]; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px - r, py); ctx.lineTo(px + r, py); ctx.moveTo(px, py - r); ctx.lineTo(px, py + r); ctx.stroke();
  });
}

function partBlock(label, rows, pal, pivot) {
  const [w, h] = gridSize(rows);
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '18px';
  wrap.innerHTML = `<h3>${label} <span style="color:var(--muted)">${w}x${h} ${pivot ? Object.entries(pivot).map(([k, v]) => `${k}:${v}`).join(' ') : ''}</span></h3>`;
  const row = document.createElement('div');
  row.className = 'row';
  for (const scale of [1, 3, 8]) {
    const box = document.createElement('div');
    box.className = 'box';
    const cv = gridToCanvas(rows, pal, { scale, outline: outlineOn() });
    if (pivot && scale === 8) drawPivots(cv.getContext('2d'), pivot, scale);
    box.append(cv);
    const cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = `${scale}x`;
    box.append(cap);
    row.append(box);
  }
  wrap.append(row);
  return wrap;
}

function renderParts() {
  const root = $('parts');
  root.innerHTML = '';
  for (const [id, f] of Object.entries(FIGHTERS)) {
    const pal = buildPalette(f.palette);
    const h = document.createElement('h3');
    h.textContent = id.toUpperCase();
    h.style.color = 'var(--gold)';
    root.append(h);
    for (const [name, rows] of Object.entries(f.parts)) root.append(partBlock(`${id}.${name}`, rows, pal, f.pivots?.[name]));
  }
}

function renderPalettes() {
  const root = $('palettes');
  root.innerHTML = '';
  for (const [id, f] of Object.entries(FIGHTERS)) {
    const pal = buildPalette(f.palette);
    const wrap = document.createElement('div');
    wrap.innerHTML = `<h3 style="color:var(--gold)">${id.toUpperCase()}</h3>`;
    for (const [label, glyphs] of PALETTE_GROUPS) {
      const grp = document.createElement('div');
      grp.className = 'grp';
      grp.innerHTML = `<b>${label}</b>`;
      for (const g of glyphs) if (pal[g]) grp.append(swatch(pal[g], g));
      wrap.append(grp);
    }
    root.append(wrap);
  }
}

function renderSheet() {
  const root = $('sheet');
  root.innerHTML = '';
  const fid = new URLSearchParams(location.search).get('fighter') || 'surge';
  const f = FIGHTERS[fid];
  const pal = buildPalette(f.palette);
  const scale = 3;
  const wrap = document.createElement('div');
  wrap.className = 'row';
  for (const [name, rows] of Object.entries(f.parts)) {
    const [w, h] = gridSize(rows);
    const box = document.createElement('div');
    box.className = 'box';
    const cv = gridToCanvas(rows, pal, { scale, outline: outlineOn() });
    const pv = f.pivots?.[name];
    if (pv) drawPivots(cv.getContext('2d'), pv, scale);
    box.append(cv, Object.assign(document.createElement('div'), { className: 'cap', textContent: `${name} ${w}x${h}` }));
    wrap.append(box);
  }
  root.append(wrap);
}

function renderCompare() {
  const root = $('compare');
  root.innerHTML = '';
  for (const item of COMPARE) {
    const f = FIGHTERS[item.fighter];
    const rows = f.parts[item.part];
    const pal = buildPalette(f.palette);
    const scale = 8;
    const mine = gridToCanvas(rows, pal, { scale, outline: outlineOn() });
    const c = CROPS[item.crop];
    const refH = mine.height;
    const refW = Math.round((c.w / c.h) * refH);
    const ref = document.createElement('canvas');
    ref.width = refW; ref.height = refH;
    const ctx = ref.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (loaded) {
      ctx.save();
      if (item.mirror) { ctx.translate(refW, 0); ctx.scale(-1, 1); }
      ctx.drawImage(src, c.x, c.y, c.w, c.h, 0, 0, refW, refH);
      ctx.restore();
    }
    const wrap = document.createElement('div');
    wrap.className = 'box';
    const inner = document.createElement('div');
    inner.className = 'row';
    inner.style.flexWrap = 'nowrap';
    const a = document.createElement('div'); a.append(mine, Object.assign(document.createElement('div'), { className: 'cap', textContent: `${item.fighter}.${item.part} 8x` }));
    const b = document.createElement('div'); b.append(ref, Object.assign(document.createElement('div'), { className: 'cap', textContent: `reference ${item.crop}${item.mirror ? ' (mirrored)' : ''}` }));
    inner.append(a, b);
    wrap.append(inner);
    root.append(wrap);
  }
}

// ?view=compare | parts | palettes shows only that section (for QA screenshots)
const only = new URLSearchParams(location.search).get('view');
if (only) document.querySelectorAll('main > section').forEach((sec) => { if (!sec.querySelector('#' + only)) sec.style.display = 'none'; });

function renderAll() { renderParts(); renderPalettes(); renderCompare(); renderSheet(); }
$('outlineToggle').addEventListener('change', renderAll);
renderParts();
renderPalettes();
renderSheet();

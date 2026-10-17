// Portrait viewer (?view=portrait&fighter=surge|brick, &grid=1, &hud=1, &view=keyart).
// Shows the 96x96 master at 1x / 2x / 4x and beside the matching reference crop at the same height.
import { buildPalette } from '../gfx/palette.js';
import { gridToCanvas } from '../gfx/parts.js';
import * as surge from '../data/fighters/surge.js';
import * as brick from '../data/fighters/brick.js';

const MODS = { surge, brick };
const qs = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
// Reference crops (source px, image is 828x512). Surge faces left in the reference, so it is mirrored to match ours.
const REF = {
  surge: { x: 45, y: 12, w: 420, h: 500, mirror: true },
  brick: { x: 385, y: 0, w: 420, h: 512, mirror: false },
};
const refImg = new Image();
refImg.src = 'brainstorm/reference/characters-reference.png';
const loaded = new Promise((res) => { refImg.onload = res; refImg.onerror = res; });

function canvasFor(id, scale, { grid = false, hud = false } = {}) {
  const p = MODS[id].portrait;
  const cv = gridToCanvas(p.rows, buildPalette(MODS[id].palette), { scale });
  const ctx = cv.getContext('2d');
  if (grid && scale >= 4) {
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i <= 96; i += 8) { ctx.beginPath(); ctx.moveTo(i * scale + .5, 0); ctx.lineTo(i * scale + .5, 96 * scale); ctx.moveTo(0, i * scale + .5); ctx.lineTo(96 * scale, i * scale + .5); ctx.stroke(); }
  }
  if (hud && p.hudCrop) { const [x, y, w, h] = p.hudCrop; ctx.strokeStyle = '#ffcf33'; ctx.lineWidth = 2; ctx.strokeRect(x * scale, y * scale, w * scale, h * scale); }
  return cv;
}
function refCanvas(id, height) {
  const r = REF[id], s = height / r.h;
  const cv = document.createElement('canvas');
  cv.width = Math.round(r.w * s); cv.height = height;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (r.mirror) { ctx.translate(cv.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(refImg, r.x, r.y, r.w, r.h, 0, 0, cv.width, cv.height);
  return cv;
}
const box = (cv, cap) => {
  const d = document.createElement('div');
  const b = document.createElement('div'); b.className = 'box'; b.append(cv);
  const c = document.createElement('div'); c.className = 'cap'; c.textContent = cap;
  d.append(b, c); return d;
};

async function render() {
  const root = $('portrait');
  if (!root) return;
  await loaded;
  const id = qs.get('fighter') === 'brick' ? 'brick' : 'surge';
  const grid = qs.get('grid') === '1', hud = qs.get('hud') === '1';
  root.replaceChildren();
  if (!MODS[id].portrait) { root.textContent = `${id}: no portrait data yet`; return; }
  const row = document.createElement('div'); row.className = 'row';
  const small = document.createElement('div');
  small.append(box(canvasFor(id, 1), `${id} 1x`), box(canvasFor(id, 2), `${id} 2x`));
  small.style.display = 'grid'; small.style.gap = '12px';
  row.append(small, box(canvasFor(id, 4, { grid, hud }), `${id} master 4x (384px tall)`), box(refCanvas(id, 384), `reference ${REF[id].mirror ? '(mirrored) ' : ''}same height`));
  const hudRow = document.createElement('div'); hudRow.style.marginTop = '10px';
  root.append(row);
  const hc = MODS[id].portrait.hudCrop;
  if (hc) {
    const f = document.createElement('canvas'); f.width = 32; f.height = 32;
    const full = canvasFor(id, 1);
    f.getContext('2d').drawImage(full, hc[0], hc[1], hc[2], hc[3], 0, 0, 32, 32);
    const hudWrap = document.createElement('div'); hudWrap.className = 'row'; hudWrap.style.marginTop = '12px';
    const f4 = document.createElement('canvas'); f4.width = 128; f4.height = 128; f4.style.imageRendering = 'pixelated';
    const c4 = f4.getContext('2d'); c4.imageSmoothingEnabled = false; c4.drawImage(f, 0, 0, 128, 128);
    hudWrap.append(box(f, 'HUD crop 1x (32x32)'), box(f4, 'HUD crop 4x'));
    root.append(hudWrap);
  }
}
render();

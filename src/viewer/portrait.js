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
  const f = qs.get('fighter');
  const ids = qs.get('both') === '1' ? ['surge', 'brick'] : [f === 'brick' ? 'brick' : 'surge'];
  const grid = qs.get('grid') === '1', hud = qs.get('hud') === '1';
  root.replaceChildren();
  for (const id of ids) {
    if (!MODS[id].portrait) { root.append(`${id}: no portrait data yet`); continue; }
    const row = document.createElement('div'); row.className = 'row'; row.style.marginBottom = '14px';
    const small = document.createElement('div');
    small.append(box(canvasFor(id, 1), `${id} 1x`), box(canvasFor(id, 2), `${id} 2x`));
    small.style.display = 'grid'; small.style.gap = '12px';
    row.append(small, box(canvasFor(id, 4, { grid, hud }), `${id} master 4x (384px tall)`), box(refCanvas(id, 384), `reference ${REF[id].mirror ? '(mirrored) ' : ''}same height`));
    const hc = MODS[id].portrait.hudCrop;
    if (hc) {
      const f1 = document.createElement('canvas'); f1.width = 32; f1.height = 32;
      f1.getContext('2d').drawImage(canvasFor(id, 1), hc[0], hc[1], hc[2], hc[3], 0, 0, 32, 32);
      const f4 = document.createElement('canvas'); f4.width = 128; f4.height = 128;
      const c4 = f4.getContext('2d'); c4.imageSmoothingEnabled = false; c4.drawImage(f1, 0, 0, 128, 128);
      const hudCol = document.createElement('div'); hudCol.style.display = 'grid'; hudCol.style.gap = '12px'; hudCol.style.alignContent = 'start';
      hudCol.append(box(f1, 'HUD crop 1x (32x32)'), box(f4, 'HUD crop 4x'));
      row.append(hudCol);
    }
    root.append(row);
  }
}
render();

/* ---------------- key art test (?view=keyart[&scale=2&glow=0]) ----------------
   Re-stages the reference's back-to-back composition: SURGE (flipped to face left, behind) and BRICK (front, overlapping
   his shoulder) at 2x on black, each with a hard-edged 4-step dithered additive glow disc behind. Composition grid 160x98. */
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
function glowDisc(img, cx, cy, R, rgb) {
  const [W, H] = [img.width, img.height];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = 1 - Math.hypot(x - cx, (y - cy) * 1.05) / R;
    if (t <= 0) continue;
    const f = t * 4, base = Math.floor(f), frac = f - base;
    const step = base + (frac > (BAYER[y & 3][x & 3] + 0.5) / 16 ? 1 : 0);   // 4 steps, ordered dither between them
    if (step <= 0) continue;
    const k = Math.min(4, step) / 4 * 0.5, i = (y * W + x) * 4;
    img.data[i] = Math.min(255, img.data[i] + rgb[0] * k); img.data[i + 1] = Math.min(255, img.data[i + 1] + rgb[1] * k); img.data[i + 2] = Math.min(255, img.data[i + 2] + rgb[2] * k); img.data[i + 3] = 255;
  }
}
async function keyart() {
  const root = $('keyart');
  if (!root) return;
  await loaded;
  const scale = +(qs.get('scale') || 2), W = 160, H = 98;
  const glow = qs.get('glow') !== '0';
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const bx = base.getContext('2d');
  bx.fillStyle = '#000'; bx.fillRect(0, 0, W, H);
  if (glow) {
    const img = bx.getImageData(0, 0, W, H);
    glowDisc(img, 46, 40, 44, [53, 224, 255]);     // cyan behind SURGE
    glowDisc(img, 116, 40, 44, [255, 207, 51]);    // gold behind BRICK
    bx.putImageData(img, 0, 0);
  }
  if (surge.portrait) {
    const c = canvasFor('surge', 1);
    bx.save(); bx.translate(5 + 96, 2); bx.scale(-1, 1); bx.drawImage(c, 0, 0); bx.restore();   // flipped: faces left as in the reference
  }
  if (brick.portrait) bx.drawImage(canvasFor('brick', 1), 69, 0);
  if (surge.portrait) {   // in the reference SURGE's big near shoulder is in FRONT of the blond's tank: redraw SURGE below the neck
    const c = canvasFor('surge', 1);
    bx.save(); bx.beginPath(); bx.rect(0, 2 + 58, W, H); bx.clip(); bx.translate(5 + 96, 2); bx.scale(-1, 1); bx.drawImage(c, 0, 0); bx.restore();
  }
  const mine = document.createElement('canvas'); mine.width = W * scale; mine.height = H * scale;
  const mx2 = mine.getContext('2d'); mx2.imageSmoothingEnabled = false; mx2.drawImage(base, 0, 0, W * scale, H * scale);
  const ref = document.createElement('canvas'); ref.width = W * scale; ref.height = Math.round(W * scale * 512 / 828);
  const rx = ref.getContext('2d'); rx.imageSmoothingEnabled = false; rx.drawImage(refImg, 0, 0, ref.width, ref.height);
  const row = document.createElement('div'); row.className = 'row';
  const z = +(qs.get('zoom') || 2);
  for (const cv of [mine, ref]) { cv.style.width = cv.width * z + 'px'; cv.style.height = cv.height * z + 'px'; }
  row.append(box(mine, `key art test (${W}x${H} composition at ${scale}x, shown ${z}x)`), box(ref, 'reference, same width'));
  root.replaceChildren(row);
}
keyart();

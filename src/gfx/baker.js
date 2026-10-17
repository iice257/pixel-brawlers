// Baker: pose -> trimmed sprite canvas. Browser-only (uses canvas).
// Per part: rotate about its joint (smoothing off), threshold alpha at 128, 1px outline (4-neighbour dilate),
// composite outline then part in z-order. Back arm/leg are tinted darker. Result is trimmed to its bounding box
// with an offset to the feet origin, plus a mirrored copy. Only alpha 0/255 pixels exist.
import { OUTLINE } from './palette.js';
import { gridToCanvas } from './parts.js';
import { resolvePose, poseKey } from './rig.js';

const CW = 220, CH = 220, OX = 110, OY = 140;      // working canvas; world origin (hips root) sits at (OX,OY)
const BACK_TINT = 0.82;
const OUT_RGB = [0x17, 0x0c, 0x1c];

const partCache = new Map();
function partCanvas(fighter, name) {
  const key = fighter.id + ':' + name;
  if (!partCache.has(key)) {
    const rows = fighter.parts[name];
    if (!rows) throw new Error(`baker: missing part ${name} on ${fighter.id}`);
    partCache.set(key, gridToCanvas(rows, fighter.palette, { scale: 1, outline: false }));
  }
  return partCache.get(key);
}

const scratch = document.createElement('canvas');
scratch.width = CW; scratch.height = CH;
const sctx = scratch.getContext('2d', { willReadFrequently: true });

// Rotation can blend neighbouring palette colours on edge pixels; snap every opaque pixel back to the palette.
const snapMemo = new Map();
function snapper(fighter) {
  if (!fighter._rgb) fighter._rgb = Object.values(fighter.palette).filter(Boolean).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const list = fighter._rgb;
  return (r, g, b) => {
    const k = (r << 16) | (g << 8) | b;
    let v = snapMemo.get(fighter.id + k);
    if (!v) {
      let best = list[0], bd = 1e9;
      for (const c of list) { const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (d < bd) { bd = d; best = c; } if (d === 0) break; }
      v = best; snapMemo.set(fighter.id + k, v);
    }
    return v;
  };
}

// Draw one op (rotated, thresholded) -> {img: ImageData with outline+part, bbox of opaque pixels}.
function bakeOp(fighter, op) {
  sctx.clearRect(0, 0, CW, CH);
  sctx.imageSmoothingEnabled = false;
  const cv = partCanvas(fighter, op.part);
  sctx.save();
  // snap the joint to a pixel centre so 0/90/180/270 degree rotations stay pixel exact
  const ax = Math.round(OX + op.at[0] - 0.5) + 0.5, ay = Math.round(OY + op.at[1] - 0.5) + 0.5;
  sctx.translate(ax, ay);
  sctx.rotate(op.theta);
  sctx.drawImage(cv, -(op.pivot[0] + 0.5), -(op.pivot[1] + 0.5));
  sctx.restore();
  const src = sctx.getImageData(0, 0, CW, CH);
  const d = src.data;
  const solid = new Uint8Array(CW * CH);
  for (let i = 0; i < CW * CH; i++) {
    if (d[i * 4 + 3] >= 128) { solid[i] = 1; d[i * 4 + 3] = 255; } else d[i * 4 + 3] = 0;
  }
  const snap = snapper(fighter);
  const out = new ImageData(CW, CH);
  const o = out.data;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x;
    if (solid[i]) {
      let [r, g, b] = snap(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      if (op.back) { r = Math.round(r * BACK_TINT); g = Math.round(g * BACK_TINT); b = Math.round(b * BACK_TINT); }
      o[i * 4] = r; o[i * 4 + 1] = g; o[i * 4 + 2] = b; o[i * 4 + 3] = 255;
    } else if ((x > 0 && solid[i - 1]) || (x < CW - 1 && solid[i + 1]) || (y > 0 && solid[i - CW]) || (y < CH - 1 && solid[i + CW])) {
      o[i * 4] = OUT_RGB[0]; o[i * 4 + 1] = OUT_RGB[1]; o[i * 4 + 2] = OUT_RGB[2]; o[i * 4 + 3] = 255;
    }
  }
  return out;
}

const cache = new Map();

export function bakePose(fighter, pose) {
  const key = poseKey(fighter.id, pose);
  if (cache.has(key)) return cache.get(key);
  const { ops, joints } = resolvePose(fighter, pose);
  const main = document.createElement('canvas');
  main.width = CW; main.height = CH;
  const mctx = main.getContext('2d', { willReadFrequently: true });
  const tmp = document.createElement('canvas');
  tmp.width = CW; tmp.height = CH;
  const tctx = tmp.getContext('2d');
  const feet = { top: 1e9, bottom: -1 };
  const footIds = new Set();
  for (const op of ops) {
    const img = bakeOp(fighter, op);
    tctx.clearRect(0, 0, CW, CH);
    tctx.putImageData(img, 0, 0);
    mctx.drawImage(tmp, 0, 0);
    if (op.part.startsWith('foot_')) {
      // lowest opaque pixel of this foot (not its outline)
      const dd = img.data;
      for (let y = CH - 1; y >= 0; y--) {
        let hit = false;
        for (let x = 0; x < CW; x++) { const i = (y * CW + x) * 4; if (dd[i + 3] && !(dd[i] === OUT_RGB[0] && dd[i + 1] === OUT_RGB[1] && dd[i + 2] === OUT_RGB[2])) { hit = true; break; } }
        if (hit) { feet.bottom = Math.max(feet.bottom, y); break; }
      }
    }
  }
  // bounding box of everything drawn
  const data = mctx.getImageData(0, 0, CW, CH);
  let x0 = CW, y0 = CH, x1 = -1, y1 = -1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (data.data[(y * CW + x) * 4 + 3]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(main, x0, y0, w, h, 0, 0, w, h);
  const mirror = document.createElement('canvas');
  mirror.width = w; mirror.height = h;
  const mc = mirror.getContext('2d');
  mc.imageSmoothingEnabled = false;
  mc.translate(w, 0); mc.scale(-1, 1); mc.drawImage(canvas, 0, 0);
  // feet origin: x = hips root column, y = the row just under the lowest foot pixel (the floor line)
  const floorRow = feet.bottom + 1;
  const originX = OX, originY = floorRow;
  const ox = originX - x0, oy = originY - y0;
  const j = {};
  for (const [k, v] of Object.entries(joints)) j[k] = [Math.round(OX + v[0] - 0.5) - x0 + 0.5, Math.round(OY + v[1] - 0.5) - y0 + 0.5];
  const baked = { canvas, mirror, ox, oy, mox: w - 1 - ox, w, h, joints: j, floorGap: y1 + 1 - floorRow, height: floorRow - y0 };
  cache.set(key, baked);
  return baked;
}

// Draw a baked pose with its feet origin at (x, floorY). Facing: +1 right, -1 mirrored.
export function drawBaked(ctx, baked, x, floorY, facing = 1) {
  const img = facing >= 0 ? baked.canvas : baked.mirror;
  const ox = facing >= 0 ? baked.ox : baked.mox;
  ctx.drawImage(img, Math.round(x - ox), Math.round(floorY - baked.oy));
}

// Debug: every alpha must be 0 or 255, and every opaque colour must come from the palette (or outline / back tint).
export function auditBaked(fighter, baked) {
  const allowed = new Set();
  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const key = (r, g, b) => (r << 16) | (g << 8) | b;
  for (const hex of Object.values(fighter.palette)) {
    if (!hex) continue;
    const [r, g, b] = hexToRgb(hex);
    allowed.add(key(r, g, b));
    allowed.add(key(Math.round(r * BACK_TINT), Math.round(g * BACK_TINT), Math.round(b * BACK_TINT)));
  }
  allowed.add(key(...OUT_RGB));
  const d = baked.canvas.getContext('2d').getImageData(0, 0, baked.w, baked.h).data;
  let aa = 0; const stray = new Set();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    if (d[i + 3] !== 255) aa++;
    if (!allowed.has(key(d[i], d[i + 1], d[i + 2]))) stray.add(key(d[i], d[i + 1], d[i + 2]));
  }
  return { aaPixels: aa, strayColours: stray.size };
}

export function clearBakeCache() { cache.clear(); partCache.clear(); }

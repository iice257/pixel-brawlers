// Pixel-grid helpers. Importing this file is DOM-free; only gridToCanvas touches `document`.
import { GLYPH_SET, OUTLINE } from './palette.js';

export function gridSize(rows) {
  return [rows[0]?.length ?? 0, rows.length];
}

// Returns an array of error strings (empty = valid).
export function validateGrid(name, rows) {
  const errors = [];
  if (!Array.isArray(rows) || rows.length === 0) return [`${name}: empty grid`];
  const w = rows[0].length;
  if (w === 0) errors.push(`${name}: zero-width rows`);
  rows.forEach((r, y) => {
    if (typeof r !== 'string') { errors.push(`${name}: row ${y} is not a string`); return; }
    if (r.length !== w) errors.push(`${name}: row ${y} has length ${r.length}, expected ${w}`);
    for (let x = 0; x < r.length; x++) {
      if (!GLYPH_SET.has(r[x])) { errors.push(`${name}: unknown glyph '${r[x]}' at x=${x} y=${y}`); break; }
    }
  });
  return errors;
}

// Renders a grid to a canvas, one pixel per glyph (times `scale`), no smoothing.
// opts.outline: add the 1px silhouette outline the baker will add in-game (preview/bake helper).
export function gridToCanvas(rows, palette, { scale = 1, outline = false } = {}) {
  const [w, h] = gridSize(rows);
  const pad = outline ? 1 : 0;
  const cw = w + pad * 2, ch = h + pad * 2;
  const cv = document.createElement('canvas');
  cv.width = cw * scale; cv.height = ch * scale;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== '.';
  for (let y = -pad; y < h + pad; y++) {
    for (let x = -pad; x < w + pad; x++) {
      let col = null;
      if (solid(x, y)) col = palette[rows[y][x]] ?? '#ff00ff';
      else if (outline && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) col = OUTLINE;
      if (col) { ctx.fillStyle = col; ctx.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale); }
    }
  }
  return cv;
}

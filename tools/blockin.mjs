// Block-in tool: polygons / lines -> palette-indexed grids (docs/ART_BIBLE.md section 1 glyphs).
// Authoring aid only. Generate a first pass, then hand-edit the emitted grid data.
// All helpers take the grid `g` (array of arrays of single-char glyphs), so any part size works.
export const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const H = (g) => g.length, W = (g) => g[0].length;
export function inPoly(x, y, poly) {
  let c = false; const px = x + 0.5, py = y + 0.5;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Fill a polygon with `ch`; `only` restricts which existing glyphs may be overwritten.
export function fill(g, poly, ch, only) {
  for (let y = 0; y < H(g); y++) for (let x = 0; x < W(g); x++)
    if (inPoly(x, y, poly) && (!only || only.includes(g[y][x]))) g[y][x] = ch;
}
export function put(g, x, y, ch, only) {
  if (x < 0 || y < 0 || x >= W(g) || y >= H(g)) return;
  if (!only || only.includes(g[y][x])) g[y][x] = ch;
}
export function line(g, x0, y0, x1, y1, ch, only) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    put(g, x0, y0, ch, only);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
export const at = (g, x, y) => (x < 0 || y < 0 || x >= W(g) || y >= H(g) ? '.' : g[y][x]);
export const show = (g) => g.map((r, y) => String(y).padStart(2) + ' ' + r.join('')).join('\n');
export const rows = (g) => g.map((r) => r.join(''));
// Rim shading on pixels of `mat`: lower/right outside edge -> dark, upper/left outside edge -> light.
export function rim(g, mat, { light, dark, useRight = true, useLeft = true }) {
  const snap = g.map((r) => r.slice());
  for (let y = 0; y < H(g); y++) for (let x = 0; x < W(g); x++) {
    if (!mat.includes(snap[y][x])) continue;
    const up = at(snap, x, y - 1) === '.', left = at(snap, x - 1, y) === '.';
    const down = at(snap, x, y + 1) === '.', right = at(snap, x + 1, y) === '.';
    if (down || (useRight && right)) g[y][x] = dark;
    else if (up || (useLeft && left)) g[y][x] = light;
  }
}
// Emit a grid as a JS array literal body (4-space indent).
export const fmt = (g) => rows(g).map((r) => `    '${r}',`).join('\n');

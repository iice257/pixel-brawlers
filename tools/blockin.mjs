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

// Bevel-shade a polygon form from upper-left light. `ramp` is the glyph ramp dark..light (e.g. '12345'),
// `base` its base index (2 -> tone 3). Edge facing up/left goes lighter, down/right darker.
// opts: only (glyphs that may be overwritten), spread (bevel width, default 3), blobs [[x,y,r],...] -> top tone.
export function form(g, poly, ramp, base, opts = {}) {
  const { only, spread = 2, blobs = [] } = opts;
  const inside = (x, y) => inPoly(x, y, poly);
  const run = (x, y, dx, dy) => { let n = 0; while (n < 14 && inside(x + dx * (n + 1), y + dy * (n + 1))) n++; return n; };
  for (let y = 0; y < H(g); y++) for (let x = 0; x < W(g); x++) {
    if (!inside(x, y) || (only && !only.includes(g[y][x]))) continue;
    const dl = Math.min(run(x, y, -1, 0), run(x, y, 0, -1), run(x, y, -1, -1));
    const dd = Math.min(run(x, y, 1, 0), run(x, y, 0, 1), run(x, y, 1, 1));
    let t = base;
    if (dd < spread && dl - dd >= 1) t = base - 1;
    else if (dl < spread && dd - dl >= 1) t = base + 1;
    g[y][x] = ramp[Math.max(0, Math.min(ramp.length - 1, t))];
  }
  // highlight blobs: at most one per form, a 2x2 (small forms) or 2x3 rectangle, only in the top-left of the form
  if (blobs.length) {
    let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
    for (const [px, py] of poly) { minx = Math.min(minx, px); miny = Math.min(miny, py); maxx = Math.max(maxx, px); maxy = Math.max(maxy, py); }
    const bw = maxx - minx, bh = maxy - miny;
    const top = ramp[ramp.length - 1];
    const pick = blobs.find(([bx, by]) => bx - minx <= bw * 0.5 && by - miny <= bh * 0.5) ?? blobs[0];
    if (bw >= 7 && bh >= 7) {
      const [bx, by] = pick, hh = bh >= 12 ? 3 : 2;
      for (let y = by; y < by + hh; y++) for (let x = bx; x < bx + 2; x++)
        if (inside(x, y) && (!only || only.includes(g[y][x]))) g[y][x] = top;
    }
  }
}
// Shift each row horizontally by round(shear * (1 - y/(h-1))): top moves, bottom stays. Returns a new wider grid.
export function shearRows(g, shear, outW) {
  const h = H(g), out = grid(outW, h), pad = shear < 0 ? -shear : 0;
  for (let y = 0; y < h; y++) {
    const s = Math.round(shear * (1 - y / (h - 1))) + pad;
    for (let x = 0; x < W(g); x++) if (g[y][x] !== '.' && x + s >= 0 && x + s < outW) out[y][x + s] = g[y][x];
  }
  return out;
}

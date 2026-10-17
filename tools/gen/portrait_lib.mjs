// Portrait helpers (96x96 masters). Everything is authored facing RIGHT; light comes from the upper RIGHT (the
// reference's left figure mirrored), so the bevel helper runs on a mirrored scratch grid and is mirrored back.
import { grid, fill, inPoly, put, line } from '../blockin.mjs';
import { form } from '../blockin.mjs';
export const N = 96;
export const mx = (x) => N - 1 - x;                       // mirror a pixel column
export const mpoly = (poly) => poly.map(([x, y]) => [N - x, y]);   // mirror polygon vertices (corner coords)
export const mk = () => grid(N, N);

// Bevel-shaded form with light from the upper right. `blobs` are [x,y] top-left corners of the highlight rect in right-facing coords.
export function formR(g, poly, ramp, base, opts = {}) {
  const tmp = grid(N, N);
  const blobs = (opts.blobs ?? []).map(([x, y]) => [N - x - 2, y]);
  form(tmp, mpoly(poly), ramp, base, { spread: opts.spread ?? 2, blobs });
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = tmp[y][mx(x)];
    if (ch === '.') continue;
    if (!opts.only || opts.only.includes(g[y][x])) g[y][x] = ch;
  }
}
// Flat fill.
export const flat = (g, poly, ch, only) => fill(g, poly, ch, only);
// 1px outline on the inside edge of a polygon (4-neighbour), drawn with `ch` (default 'O').
export function edge(g, poly, ch = 'O', { skip = null } = {}) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!inPoly(x, y, poly)) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inPoly(x + dx, y + dy, poly));
    if (nb && !(skip && skip(x, y))) g[y][x] = ch;
  }
}
// Outline only the sides of a polygon that border empty space or something behind it: same as edge, kept for readability.
// Stamp ASCII rows at (x,y); '.' keeps what is there, ' ' is skipped too.
export function stamp(g, x, y, rows) {
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.' && ch !== ' ') put(g, x + i, y + j, ch); }));
}
// Row spans: { y: [x0, x1] } inclusive, fills `ch`.
export function spans(g, table, ch, only) {
  for (const [y, [a, b]] of Object.entries(table)) for (let x = a; x <= b; x++) put(g, x, +y, ch, only);
}
export { put, line, fill, inPoly, grid };
export const out = (g) => g.map((r) => r.join(''));
export const show = (g) => g.map((r, y) => String(y).padStart(2) + ' ' + r.join('')).join('\n');

// ---- facing-left authoring (the reference orientation, light from the upper left). mirror() at the end.
export const mirror = (g) => g.map((r) => [...r].reverse());
export const OX = 4;                                       // reference-grid x offset so the figure is centred in 96
export const T = (poly) => poly.map(([x, y]) => [x + OX, y]);
export const circle = (cx, cy, rx, ry, n = 28) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * Math.PI * 2), cy + ry * Math.sin((i / n) * Math.PI * 2)]);
export const stampT = (g, x, y, rows) => stamp(g, x + OX, y, rows);
export const putT = (g, x, y, ch, only) => put(g, x + OX, y, ch, only);
export const lineT = (g, x0, y0, x1, y1, ch, only) => line(g, x0 + OX, y0, x1 + OX, y1, ch, only);
// Silhouette outline: pixels of the given glyph set that touch empty space (4-neighbour) become `ch`.
export function outlineSilhouette(g, set = '12345', ch = 'O') {
  const snap = g.map((r) => r.slice());
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!set.includes(snap[y][x])) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => y + dy >= 0 && x + dx >= 0 && y + dy < N && x + dx < N && snap[y + dy][x + dx] === '.')) g[y][x] = ch;
  }
}

// Headless pose inspector: rasterises a pose's silhouette (no outline, no baking) and prints height, reach and the
// rightmost pixel inside an optional y band. Usage: node tools/posecheck.mjs [fighter] [pattern] [x,y,w,h hitbox]
import { resolvePose } from '../src/gfx/rig.js';
import { poseLibrary } from '../src/gfx/poses.js';
import * as surge from '../src/data/fighters/surge.js';
import * as brick from '../src/data/fighters/brick.js';

const MODS = { surge, brick };
export function silhouette(fighter, pose) {
  const { ops } = resolvePose(fighter, pose);
  const cells = new Map();
  for (const op of ops) {
    const rows = fighter.parts[op.part];
    const c = Math.cos(op.theta), s = Math.sin(op.theta);
    const ax = Math.round(op.at[0] - 0.5) + 0.5, ay = Math.round(op.at[1] - 0.5) + 0.5;
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === '.') continue;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const lx = x + ox - (op.pivot[0] + 0.5), ly = y + oy - (op.pivot[1] + 0.5);
        const wx = Math.floor(ax + lx * c - ly * s), wy = Math.floor(ay + lx * s + ly * c);
        cells.set(wx + ',' + wy, op.part);
      }
    }
    op.feet = op.part.startsWith('foot_');
  }
  // floor = lowest foot pixel
  let floor = -1e9;
  for (const op of ops) if (op.feet) {
    const rows = fighter.parts[op.part], c = Math.cos(op.theta), s = Math.sin(op.theta);
    const ax = Math.round(op.at[0] - 0.5) + 0.5, ay = Math.round(op.at[1] - 0.5) + 0.5;
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) if (rows[y][x] !== '.') {
      const lx = x + 0.5 - (op.pivot[0] + 0.5), ly = y + 0.5 - (op.pivot[1] + 0.5);
      floor = Math.max(floor, Math.floor(ay + lx * s + ly * c));
    }
  }
  floor += 1;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9;
  const px = [];
  for (const k of cells.keys()) {
    const [x, y] = k.split(',').map(Number);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y);
    px.push([x, floor - y]);   // y up from the floor
  }
  return { px, height: floor - y0, minX: x0, maxX: x1 };
}
export function reachAt(sil, [bx, by, bw, bh]) {
  let m = -1e9;
  for (const [x, y] of sil.px) if (y >= by && y < by + bh) m = Math.max(m, x + 1);
  return { tip: m, far: bx + bw, diff: m - (bx + bw) };
}

if (process.argv[1].endsWith('posecheck.mjs')) {
  const id = process.argv[2] || 'surge', pat = new RegExp(process.argv[3] || '.');
  const box = process.argv[4] ? process.argv[4].split(',').map(Number) : null;
  const m = MODS[id];
  const fighter = { id, parts: m.parts, pivots: m.pivots };
  for (const [name, pose] of Object.entries(poseLibrary(id))) {
    if (!pat.test(name)) continue;
    const sil = silhouette(fighter, pose);
    let line = `${name.padEnd(14)} h=${String(sil.height).padStart(3)} x[${sil.minX},${sil.maxX}]`;
    if (box) { const r = reachAt(sil, box); line += `  tip=${r.tip} far=${r.far} d=${r.diff}`; }
    console.log(line);
  }
}

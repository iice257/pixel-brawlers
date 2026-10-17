// Validates every pixel grid in src/data/fighters/*.js. Exit code 1 on any error.
// Usage: node tools/validate-art.mjs
import { readdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateGrid, gridSize } from '../src/gfx/parts.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'fighters');
const files = (await readdir(dir)).filter((f) => f.endsWith('.js')).sort();

let failed = false;
for (const file of files) {
  const id = file.replace(/\.js$/, '');
  const mod = await import(pathToFileURL(path.join(dir, file)).href);
  for (const group of ['parts', 'portraits']) {
    for (const [name, rows] of Object.entries(mod[group] ?? {})) {
      const errs = validateGrid(`${id}.${name}`, rows);
      if (errs.length) { failed = true; errs.forEach((e) => console.error(`ERR ${e}`)); }
      else {
        const [w, h] = gridSize(rows);
        const bad = Object.entries(mod.pivots?.[name] ?? {}).filter(([, [x, y]]) => x < 0 || y < 0 || x >= w || y >= h);
        if (bad.length) { failed = true; console.error(`ERR ${id}.${name}: pivot outside grid: ${bad.map(([k]) => k).join(', ')}`); }
        else console.log(`OK  ${id}.${name} ${w}x${h}`);
      }
    }
  }
  if (mod.portrait) {
    const { rows, hudCrop } = mod.portrait;
    const errs = validateGrid(`${id}.portrait`, rows);
    const [w, h] = gridSize(rows);
    if (w !== 96 || h !== 96) errs.push(`${id}.portrait: expected 96x96, got ${w}x${h}`);
    if (!Array.isArray(hudCrop) || hudCrop[2] !== 32 || hudCrop[3] !== 32 || hudCrop[0] < 0 || hudCrop[1] < 0 || hudCrop[0] + 32 > 96 || hudCrop[1] + 32 > 96) errs.push(`${id}.portrait: hudCrop must be a 32x32 rect inside the grid`);
    if (errs.length) { failed = true; errs.forEach((e) => console.error(`ERR ${e}`)); } else console.log(`OK  ${id}.portrait 96x96 hudCrop ${hudCrop}`);
  }
}
if (!files.length) { console.error('ERR no fighter files found'); failed = true; }
process.exit(failed ? 1 : 0);

// Regenerates src/data/fighters/*.js from the block-in generators in this folder.
// NOTE: running this overwrites hand edits made to those fighter files. After a hand-edit pass,
// stop using the generator for that part (the grid in the fighter file is then the source of truth).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rows } from '../blockin.mjs';
import { surgeHead } from './surge_head.mjs';
import { brickHead } from './brick_head.mjs';
import { SURGE_BODY, SURGE_PIVOTS } from './surge_body.mjs';

const OUT = fileURLToPath(new URL('../../src/data/fighters/', import.meta.url));
const SKIN = ['#80433d', '#ee8b75', '#f6b09a', '#fecbb2', '#fdefe1'];

const defs = {
  surge: {
    note: 'SURGE "THE TIDE": teal profile homage. Authored facing RIGHT.',
    palette: {
      skin: SKIN,
      hair: ['#0c2250', '#0b4c80', '#1e92a0', '#3cbcc2'], hairHi: '#8ff0f0',
      clothA: ['#5c1420', '#a42a2a', '#e0553a', '#ff9a64'],
      clothB: ['#6e7080', '#aab0c0', '#e8ecf4', '#ffffff'],
      trim: ['#0b4a66', '#1788ac', '#35c8e0', '#b8f6ff'],
      iris: '#3b82c4', prop: ['#1d3e5d', '#5ea0c1'], fx: '#35e0ff',
    },
    parts: { head_neutral: surgeHead(), ...Object.fromEntries(Object.entries(SURGE_BODY).map(([k, fn]) => [k, fn()])) },
    pivots: { head_neutral: { neck: [16, 30] }, ...SURGE_PIVOTS },
  },
  brick: {
    note: 'BRICK "THE HEADLINER": blond tank-top homage. Authored facing RIGHT (three-quarter front).',
    palette: {
      skin: SKIN,
      hair: ['#9d7a1a', '#d9a82a', '#ffd84a', '#fff59a'], hairHi: '#fffbd0',
      clothA: ['#60605f', '#a9a9a9', '#d7d7d7', '#fefefe'],
      clothB: ['#14213f', '#23407a', '#3866b8', '#6f9be0'],
      trim: ['#2a1a14', '#6a4a20', '#c88a20', '#ffd84a'],
      iris: '#4f8fc0', prop: ['#1d3e5d', '#5ea0c1'], fx: '#ffd84a',
    },
    parts: { head_neutral: brickHead() },
    pivots: { head_neutral: { neck: [16, 30] } },
  },
};

const lit = (v) => JSON.stringify(v).replace(/"/g, "'").replace(/,/g, ', ').replace(/:/g, ': ');
const fmtPalette = (p) => '{\n' + Object.entries(p).map(([k, v]) => `  ${k}: ${lit(v)},`).join('\n') + '\n}';
const fmtParts = (parts) => Object.entries(parts).map(([name, g]) =>
  `  ${name}: [\n${rows(g).map((r) => `    '${r}',`).join('\n')}\n  ],`).join('\n');

for (const [id, d] of Object.entries(defs)) {
  const src = `// ${d.note}
// Grids use the shared glyph legend (docs/ART_BIBLE.md section 1). No outer outline: the baker adds it.
export const palette = ${fmtPalette(d.palette)};

export const parts = {
${fmtParts(d.parts)}
};

// Joint pivots per part: name -> [x,y] inside the grid (where it hangs off its parent / children attach).
export const pivots = ${lit(d.pivots)};
`;
  writeFileSync(OUT + id + '.js', src);
  console.log('wrote', id);
}

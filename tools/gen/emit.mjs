// Regenerates src/data/fighters/*.js from the block-in generators in this folder.
// NOTE: running this overwrites hand edits made to those fighter files. After a hand-edit pass,
// stop using the generator for that part (the grid in the fighter file is then the source of truth).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rows } from '../blockin.mjs';
import { surgeHead } from './surge_head.mjs';
import { brickHead } from './brick_head.mjs';
import { SURGE_BODY, SURGE_PIVOTS } from './surge_body.mjs';
import { BRICK_BODY, BRICK_PIVOTS } from './brick_body.mjs';
import { squash } from './fallen.mjs';
import { surgePortrait, surgeHudCrop } from './portrait_surge.mjs';
import { surgeHeadHit, surgeHeadKo, brickHeadHit, brickHeadKo } from './heads_react.mjs';

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
    parts: { head_neutral: surgeHead(), head_hit: surgeHeadHit(), head_ko: surgeHeadKo(), ...Object.fromEntries(Object.entries(SURGE_BODY).map(([k, fn]) => [k, fn()])) },
    pivots: { head_neutral: { neck: [16, 32] }, head_hit: { neck: [16, 32] }, head_ko: { neck: [16, 32] }, ...SURGE_PIVOTS },
    portrait: () => ({ rows: surgePortrait(), hudCrop: surgeHudCrop }),
  },
  brick: {
    note: 'BRICK "THE HEADLINER": blond tank-top homage. Authored facing RIGHT (three-quarter front).',
    palette: {
      skin: SKIN,
      hair: ['#9d7a1a', '#d9a82a', '#ffd84a', '#fff59a'], hairHi: '#fffbd0',
      clothA: ['#60605f', '#a9a9a9', '#d7d7d7', '#fefefe'],
      clothB: ['#14213f', '#23407a', '#3866b8', '#6f9be0'],
      trim: ['#1c1416', '#6a4a2a', '#9a6c38', '#ffd84a'],
      iris: '#4f8fc0', prop: ['#1d3e5d', '#5ea0c1'], fx: '#ffd84a',
    },
    parts: { head_neutral: brickHead(), head_hit: brickHeadHit(), head_ko: brickHeadKo(), ...Object.fromEntries(Object.entries(BRICK_BODY).map(([k, fn]) => [k, fn()])) },
    pivots: { head_neutral: { neck: [16, 32] }, head_hit: { neck: [16, 32] }, head_ko: { neck: [16, 32] }, ...BRICK_PIVOTS },
  },
};

const lit = (v) => JSON.stringify(v).replace(/"/g, "'").replace(/,/g, ', ').replace(/:/g, ': ');
const fmtPalette = (p) => '{\n' + Object.entries(p).map(([k, v]) => `  ${k}: ${lit(v)},`).join('\n') + '\n}';
const fmtParts = (parts) => Object.entries(parts).map(([name, g]) =>
  `  ${name}: [\n${rows(g).map((r) => `    '${r}',`).join('\n')}\n  ],`).join('\n');

const fmtPortrait = (p) => `
// 96x96 master portrait (docs/ART_BIBLE.md section 7): hand-outlined (O), black background = transparent.
// hudCrop = [x, y, w, h] of the 32x32 face crop used by the HUD.
export const portrait = {
  hudCrop: ${lit(p.hudCrop)},
  rows: [
${rows(p.rows).map((r) => `    '${r}',`).join('\n')}
  ],
};
`;

// Fallen torso + hips (see fallen.mjs): added to every fighter from its own standing parts.
for (const d of Object.values(defs)) {
  const t = squash(d.parts.torso_stand.map((r) => (Array.isArray(r) ? r.join('') : r)), d.pivots.torso_stand);
  const h = squash(d.parts.hips.map((r) => (Array.isArray(r) ? r.join('') : r)), d.pivots.hips, 2);
  d.parts.torso_fallen = t.rows.map((r) => [...r]); d.pivots.torso_fallen = t.pivots;
  d.parts.hips_fallen = h.rows.map((r) => [...r]); d.pivots.hips_fallen = h.pivots;
}

for (const [id, d] of Object.entries(defs)) {
  const src = `// ${d.note}
// Grids use the shared glyph legend (docs/ART_BIBLE.md section 1). No outer outline: the baker adds it.
export const palette = ${fmtPalette(d.palette)};

export const parts = {
${fmtParts(d.parts)}
};

// Joint pivots per part: name -> [x,y] inside the grid (where it hangs off its parent / children attach).
export const pivots = ${lit(d.pivots)};
${d.portrait ? fmtPortrait(d.portrait()) : ''}`;
  writeFileSync(OUT + id + '.js', src);
  console.log('wrote', id);
}

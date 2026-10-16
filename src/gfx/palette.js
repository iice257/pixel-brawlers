// DOM-free. Glyph legend and palette builder (docs/ART_BIBLE.md section 1).

export const OUTLINE = '#170c1c';
export const WHITE = '#ffffff';
export const MOUTH = '#3a0f1c';

// glyph -> meaning (used by the viewer legend and the validator)
export const GLYPHS = {
  '.': 'transparent',
  O: 'outline',
  1: 'skin 1 (deepest)', 2: 'skin 2', 3: 'skin 3 (base)', 4: 'skin 4', 5: 'skin 5 (highlight)',
  a: 'hair a (dark)', b: 'hair b', c: 'hair c', d: 'hair d (highlight)',
  e: 'cloth A e (dark)', f: 'cloth A f', g: 'cloth A g', h: 'cloth A h (light)',
  i: 'cloth B i (dark)', j: 'cloth B j', k: 'cloth B k', l: 'cloth B l (light)',
  m: 'trim m (dark)', n: 'trim n', o: 'trim o', p: 'trim p (light)',
  w: 'eye white', y: 'iris', x: 'mouth / deep shadow',
  r: 'prop dark', s: 'prop light', Q: 'fx glow',
};

export const GLYPH_SET = new Set(Object.keys(GLYPHS));

const RAMPS = [
  ['skin', '12345'],
  ['hair', 'abcd'],
  ['clothA', 'efgh'],
  ['clothB', 'ijkl'],
  ['trim', 'mnop'],
];

// def = { skin:[5], hair:[4], clothA:[4], clothB:[4], trim:[4], iris, prop:[dark,light], fx }
export function buildPalette(def) {
  const pal = { O: OUTLINE, w: WHITE, x: MOUTH, y: def.iris, Q: def.fx, r: def.prop?.[0], s: def.prop?.[1] };
  for (const [key, glyphs] of RAMPS) {
    const ramp = def[key] || [];
    [...glyphs].forEach((g, i) => { if (ramp[i]) pal[g] = ramp[i]; });
  }
  return pal;
}

// Groups for the viewer swatch panel.
export const PALETTE_GROUPS = [
  ['Skin', '12345'], ['Hair', 'abcd'], ['Cloth A', 'efgh'], ['Cloth B', 'ijkl'], ['Trim', 'mnop'],
  ['Misc', 'Owyxrs' + 'Q'],
];

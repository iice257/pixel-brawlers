# NEXT BUILDER TASK: 1.1 Foundation: constants, validator, viewer, and the two reference heads

You are the builder. Repo: `C:\Users\0\Documents\Projects\Github\pixel-brawlers` (GitHub Pages serves `main` root, so keep `main` working). The old v0.1 game stays untouched and playable. Read `docs/ART_BIBLE.md` (all of it, especially sections 0, 1, 3, 4) and skim `docs/BUILD_PLAN.md` "Standing rules" before starting. Look at `brainstorm/reference/characters-reference.png` (828x512) closely: that image is the source of truth.

## Goal

Create the art-pipeline foundation and the first two pieces of real pixel art: the **SURGE head** (teal spiky hair, pure side profile facing right) and the **BRICK head** (blond spiky hair, three-quarter front facing right, blue toothpick). Build a viewer page to inspect them next to the reference. Success = at a glance the heads look like the heads in the reference in style and colour.

Do NOT touch the legacy game files (`src/*.js`, `index.html`, `css/style.css`) in this task.

## Files to create

1. `src/config2.js`: `export const W=384, H=216, STAGE_W=576, FLOOR_Y=192;` plus `CELL_W=160, CELL_H=128, CELL_PIVOT=[80,120]`.
2. `src/gfx/palette.js`:
   - `GLYPHS` legend exactly as in ART_BIBLE section 1: `. O 1-5 a-d e-h i-l m-p w y x r s Q`.
   - `OUTLINE='#170c1c'`, `WHITE='#ffffff'`, `MOUTH='#3a0f1c'`.
   - `buildPalette(def)` -> `{ glyph: '#rrggbb' }` from a fighter palette definition `{ skin:[5], hair:[4], clothA:[4], clothB:[4], trim:[4], iris, prop:[dark,light], fx }`.
3. `src/gfx/parts.js`:
   - `validateGrid(name, rows)` -> array of error strings (ragged rows, unknown glyphs, empty).
   - `gridToCanvas(rows, palette, {scale=1})` -> `HTMLCanvasElement`, one pixel per glyph, transparent for `.`, nearest-neighbour, no smoothing.
   - `gridSize(rows)` -> `[w,h]`.
4. `src/data/fighters/surge.js` and `src/data/fighters/brick.js`: each exports `palette` (the definition from ART_BIBLE section 3), and `parts = { head_neutral: [...32x34 rows...] }`. Also export `pivots = { head_neutral: [x,y] }` (neck pivot: where the head attaches; bottom-centre of the neck area).
5. `tools/validate-art.mjs`: Node script (ESM) that imports every `src/data/fighters/*.js`, validates every grid in `parts` (and later `portraits`) with `validateGrid`, prints `OK <fighter>.<part> WxH` or the errors, and exits non-zero on any error. It must not import anything that needs the DOM (so keep `validateGrid` and `GLYPHS` in a DOM-free module; `gridToCanvas` can live in the same file as long as it only touches `document` when called).
6. `viewer.html` (+ inline module script or `src/viewer/viewer.js`): dark page, no build step. Panels:
   - **Reference panel**: shows `brainstorm/reference/characters-reference.png` with (a) a zoom control (1x-8x, nearest-neighbour, `image-rendering: pixelated`), (b) a draggable crop rectangle or two preset crops "teal head" and "blond head", and (c) a **pixel eyedropper**: clicking a pixel prints its hex colour in a swatch list (keep the last 24 picks; click a swatch to copy hex). The reference loads from a relative URL; if it fails to load, show a visible error.
   - **Parts panel**: for each fighter, each part rendered at 1x, 3x and 8x on black, labelled with name, size, and pivot (draw a crosshair at the pivot).
   - **Palette panel**: swatches for every glyph of each fighter palette, grouped by ramp.
   - A "Compare" row that puts the 8x head next to the matching reference crop scaled to the same head height.
   - Everything pixel-crisp (`image-rendering: pixelated`, canvases scaled with integer factors). The page must be self-contained, console clean, and work at `http://localhost:5173/viewer.html`.

## The art (the important part)

Both heads are **32 columns x 34 rows** palette-indexed grids using the glyph legend. Silhouette outline is added later by the baker, so do NOT put `O` on the outer silhouette; use `O` only for inner lines (brow, jaw under cheek, lips, ear, hair clump separations, nostril). Light from the upper-left. Skin uses the 5-tone ramp `1..5` with hard cel shading: deepest `1` only in creases/under overhangs, `2` shadow side (jaw, under cheekbone, neck), `3` base, `4` lit, `5` highlight BLOBS 2-4 px on forehead, cheekbone, nose bridge, shoulder-side of the neck. Hair uses `a..d`: `a` base-dark, `b` mid, `c` lit upper-left half of each spike, `d` 1-2 px highlight strokes on spike tips.

### SURGE head (`head_neutral`): pure profile facing RIGHT, like the left figure in the reference
- Hair: tall swept-up and back spiky mass in teal (`a..d` ramp from ART_BIBLE: `#0f2c5c #1757a0 #22a0c8 #8ff0f0`), 5 distinct spikes of different lengths, two sweeping back/down behind the ear, one short fringe spike forward over the brow. Cyan highlight strokes along the upper-left of each spike. Hair occupies about the top 14 rows plus the back of the skull.
- Face (right-facing profile): flat sloped forehead, strong brow ridge with a dark `O` brow line, deep-set eye (2-3 px `w` with 1 px `y` iris at the front), pronounced straight nose pushing out to the right (the right-most skin pixels), thin tight mouth (`x` line), square jaw with a defined chin, neck thick and running down into the trapezius at the bottom rows. Ear visible, with an `O` inner line. Cheekbone highlight blob `5`.
- Neck/trapezius at bottom 6 rows is wide (almost the full 32 columns at the last row), so the head reads as sitting on huge traps.

### BRICK head (`head_neutral`): three-quarter front, facing right-forward, like the right figure
- Hair: blond spikes (`#8a6a1a #d9a82a #ffd84a #fff59a`), a chunky flat-ish top with ~7 upward/forward spikes, a few short side spikes over the ears, yellow highlight clusters on the upper-left. Reads as a clump of "spiky straw".
- Face: wide, square, heavy brow `O` line, two blue eyes (`w` + `y`, the far eye slightly smaller because of the 3/4 turn), nose centred and shaded on the shadow side, thick jaw with 1-2 px stubble (`2` pixels), a grim closed mouth, **toothpick**: 3-4 px diagonal in `r`(dark `#2a5aa8`) and `s` (light `#7fc0ff`) sticking out of the right mouth corner pointing down-right (like the reference). Ear on the left edge. Cheek highlight blobs `5`. Neck wide and short, bottom 5 rows widening into traps and the top of a white tank neckline: put 2-3 rows of `e..h` (grey/white tank ramp) with an inner `O` neckline curve at the bottom corners.
- 3/4 turn: the far (right) half of the face is narrower; the near (left) cheek and ear take more width.

Draw both heads deliberately, row by row. Iterate: render, screenshot, compare to the reference crop, fix, repeat until it clearly reads. Typical failure modes to avoid: blobby featureless faces, uniform brightness, hair as a flat helmet, 1-tone skin, eyes too big. It is fine (expected) to spend most of the effort on these two grids.

## Acceptance criteria

- [ ] `node tools/validate-art.mjs` exits 0 and prints sizes `32x34` for both heads.
- [ ] `http://localhost:5173/viewer.html` loads with no console errors; the reference image is visible with zoom, crops, and a working eyedropper; both heads render at 1x/3x/8x with pivots and swatches.
- [ ] Visual QA (ART_BIBLE section 8, head-relevant lines): hair has 4 tones and spiky silhouette with highlight strokes; skin has 5 tones with highlight blobs; heavy brow; the toothpick is visible and blue at 1x; no anti-aliased pixels; only glyphs from the legend; palette matches the tables.
- [ ] Screenshot `media/qa/phase1-1.1-heads.png` taken from the viewer showing each head (8x) beside its reference crop. Include it in your report.
- [ ] Legacy game at `/` still works (open it, start a fight).

## How to test

```bash
node tools/validate-art.mjs
npx serve -l 5173 .        # open /viewer.html and / ; stop the server when done
```

## Commit and report

Commit message: `1.1 Add art pipeline foundation, viewer and reference-style heads`. Push to `main`. Then report to the orchestrator (through the user): files added, screenshot path, anything you changed from this brief and why, and the **actual hex values** you sampled with the eyedropper for: teal hair (4 tones), blond hair (4), skin (5 tones), tank top (4), toothpick, eye blue, outline. (Those feed Task 1.2.) Do not start Task 1.2 until the orchestrator sends it.

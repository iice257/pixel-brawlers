# Tuning log

Newest first. Record every tuning decision (palettes, sizes, timings) with the final values.

## 1.2 Palettes and heads (2026-10-16)

Final values adopted per orchestrator ratification. Source of truth: `src/data/fighters/*.js` and `tools/gen/emit.mjs`.

| Group | Dark to light |
|---|---|
| Skin (all fighters so far) | `#80433d` `#ee8b75` `#f6b09a` `#fecbb2` `#fdefe1` |
| SURGE hair a-d | `#0c2250` `#0b4c80` `#1e92a0` `#3cbcc2` |
| SURGE hair accent `z` | `#8ff0f0` (sparing 1px accents) |
| BRICK hair a-d | `#9d7a1a` `#d9a82a` `#ffd84a` `#fff59a` (bible ramp; sampled values were JPEG-washed) |
| BRICK hair accent `z` | `#fffbd0` (builder choice, near the brightest sampled pixel `#fcfbce`) |
| BRICK tank (cloth A) | `#60605f` `#a9a9a9` `#d7d7d7` `#fefefe` |
| Toothpick `r` `s` | `#1d3e5d` `#5ea0c1` |
| Iris `y` | SURGE `#3b82c4`, BRICK `#4f8fc0` |
| Outline `O` | `#170c1c` |

Deviations and additions
- New glyph `z` = hair accent (brightest, sparing 1px), mapped from `palette.hairHi`. Added to `GLYPHS` in `src/gfx/palette.js`; the validator picks it up automatically. ART_BIBLE section 1 table should list it.
- Block-in tool is `tools/blockin.mjs` (size-agnostic). Per-part generators live in `tools/gen/`; `tools/gen/emit.mjs` writes the fighter data files. Re-running emit overwrites hand edits, so once a part is hand-edited, treat the fighter file as the source of truth.
- Head refinement used 1 iteration after the first re-author (SURGE: carved back tufts, neck cord; BRICK: narrower far side, taller uneven spikes, toothpick at mouth corner).

## 1.3 SURGE body parts (2026-10-16)

Part sizes (WxH), all within the ART_BIBLE rig table +-3 px. Pivots are `pivots[part] = { joint: [x,y] }`, shown as crosshairs on the viewer parts sheet.

| Part | Size | Part | Size |
|---|---|---|---|
| torso_stand | 44x36 | thigh | 19x28 |
| torso_crouch | 46x31 | shin | 15x26 |
| torso_lean (fwd) | 47x36 | foot_flat | 24x9 |
| torso_lean_back | 47x36 | foot_toe | 24x11 |
| hips | 30x14 | foot_kick | 24x10 |
| arm_upper | 15x22 | hand_fist / hand_guard | 14x13 |
| arm_fore | 13x22 | hand_open | 14x14 |

- Boots use cloth B base index 1 (`j`), so they read grey-blue under the white wraps; trim cuff `n/m/p`.
- `form()` in `tools/blockin.mjs` does the bevel shading (light upper-left); blobs and creases are placed per part in `tools/gen/surge_body.mjs`.
- Viewer: `?view=sheet|compare|parts|palettes` isolates a section, `?fighter=brick` picks the sheet fighter (use the clean URL `/viewer?...`, serve drops the query on the `.html` redirect).

## 1.4 Rig, baker, idle (2026-10-16)

- Pivot changes to hit the 96-104 px standing height (guard stance measures 103-104 px incl. hair): torso `hips` pivot y 34 -> 31 (crouch 29 -> 26), torso `neck` pivot y 3 -> 5, head `neck` pivot y 30 -> 32, thigh knee y 24 -> 22, shin ankle y 22 -> 20. Hips pivots renamed `hipF` / `hipB`.
- Limb angles are WORLD angles (not relative to the torso); upright parts (hips, torso, head) are cumulative. Convention is documented at the top of `src/gfx/rig.js`.
- Baker: alpha threshold 128, per-part 1px outline, back arm/leg x0.82, and every opaque pixel is snapped back to the palette after rotation (blended edge colours otherwise showed up: 22 stray colours -> 0).
- Feet origin = hips root column, floor = row under the lowest foot pixel (`floorGap` 1 = the foot outline row).
- Guard stance: legF h30/k45, legB h-15/k30 (feet apart), armF s45/e120/w-30 guard hand, armB s30/e60 fist poking out in front of the chest, torso variant `lean`. Idle bob is torso dy [1,1,0,0,1,1], each held 8 ticks.

## 1.5 BRICK body parts and idle
- BRICK trim palette changed (was brown/gold set): `['#1c1416','#6a4a2a','#9a6c38','#ffd84a']` = black gloves, brown boots/belt, light brown, gold buckle.
- Same 15 body parts, sizes and pivot names as SURGE except arm_upper 16x22 (bigger bicep; shoulder [8,3], elbow [8,19]) and hand grids 15 wide; torso pivots computed from shear.
- Tank torso: white `h` with grey `g/f` folds, `O` outline at neckline and armholes. Gloves are black with brown sheen row.
- BRICK idle override in poses.js: torso lean r15, head r-15 dx1, armF s30/e105, armB s15/e45, legs wider (legB h-30). Height 104, AA 0, stray colours 0 (same as SURGE).
- Not done: SURGE thigh/shin polish (low priority).

## 1.6 Locomotion poses and anims (+ part polish)
- Polish: `form()` highlight blobs are now one 2x2/2x3 rectangle per form, top-left only (was plus/diamond blobs everywhere). Hips are drawn above the torso (DEFAULT_Z: torso, then hips) so the belt/buckle shows. hand_guard redrawn for both fighters (horizontal finger rolls, knuckle ridge on the leading side, thumb wrap). SURGE feet: white sole + dark edge, toe-cap seam, lace dots, ankle cuff. SURGE thigh/shin: vastus cuts, knee cap, calf cuts, spiral shin wrap.
- Poses (src/gfx/poses.js, library via `poseLibrary(fighterId)`): idle_0..5, walk_f_0..7, walk_b_0..7 (walk_b = walk_f cycle reversed), crouch_in_0/1, crouch_hold_0, crouch_out_0/1, jump_prep/rise/apex/fall_0-1/land, jump_f_0..3, jump_b_0..3, dash_f_0..2, dash_b_0..2. BRICK gets a loco style tweak (torso +15, head -15 dx1, front arm -15).
- Walk: legF phase i*45, h +-30, knee lifts on the forward swing, arms contrapass, torso rocks 15 at passing poses (head counter-tilts -15 to keep height). Heights 103-108 (idle 103-104).
- Crouch hold: hips r45, torso crouch r30, head r-45, legF h105 k135, legB h75 k150. Height SURGE 63, BRICK 58 (target ~62; the root dy idea does not apply because the baker floors the sprite at the lowest foot).
- Timing in src/data/anims.js (walk_f 5 ticks, walk_b 6, crouch 3 per pose, dash_f 5/5/4, dash_b 5/7/4, jump_f/b 9 ticks per pose then hold).
- Rotation: no pre-rotated variant parts yet; 15-45 degree limbs in walk/dash look acceptable at 2x (some stair-stepping on thin parts). Revisit if attacks show jaggies.
- tools/posecheck.mjs: headless silhouette inspector (height, x extent, reach in a hitbox band).

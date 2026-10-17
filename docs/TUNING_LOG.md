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

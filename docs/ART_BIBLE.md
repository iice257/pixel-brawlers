# Pixel Brawlers: Art Bible

Status: authoritative. Supersedes the "puppet rectangles" approach in `docs/DESIGN.md`.
Source of truth for look: `brainstorm/reference/characters-reference.png` (the "reference").

---

## 0. The look in one paragraph

16-bit arcade pixel art on near-black. Heroic, top-heavy bruisers: big heads, huge shoulders and arms, small waists. Chunky dark outlines, hard cel shading (no gradients, no anti-aliasing, no blur), 4-5 tones per material, and bright clustered highlight blobs on muscle and hair. Palette is limited and saturated. If a sprite looks "clean vector" or "soft", it is wrong.

The reference decoded (what to copy, literally):

| Cue | In the reference | Rule for us |
|---|---|---|
| Outline | Near-black, ~1 art-pixel, thicker (2px) where two forms overlap (arm over torso, tank-top hem, jaw under hair) | 1px outline on every part, drawn per part so overlaps get a double line (section 4) |
| Skin | 4-5 tones: deep red-brown shadow, salmon mid, peach light, near-white highlight blobs on shoulder, cheek, forehead, nose bridge | Skin ramp of 5 (section 3). Highlights are 2-4 px *blobs*, not lines |
| Shading | Hard cel, light from upper-left. Shadow side = underside of pecs, under jaw, inner arm | Same. Never dither skin. Dither only in stage backgrounds |
| Hair | Spiky clumps with 1-2px cyan/yellow highlight strokes along the spike tops, dark base | Hair is 4 tones, built from 3-5 spike triangles, highlight on the upper-left edge of each spike |
| Eyes | Tiny: 1px dark brow line, 2-3 px white, 1 px iris (blue on the blond). Grim, heavy brow | Eyes max 4x2 px. Heavy brow always |
| Mouth/prop | Blond has a blue toothpick at the corner of the mouth | Signature prop must read at 1x: 2-3 px diagonal, contrasting hue |
| Clothing | White tank, grey 2-tone shading, black outline at neckline and armhole | Cloth ramp of 4, mid-grey shadow folds are 1px diagonal strokes |
| Proportions | Head ~ 55% of shoulder width, neck almost absent, trapezius sweeps into head, delts bigger than head | Section 2 |

IMPORTANT: hex values in this document are *estimates* sampled by eye. Task 1.1 builds an eyedropper into the sprite viewer; the builder must sample the real reference pixels and update the hex tables here (keep names and ramp order) before finalising art. Where the sampled values differ, the reference wins.

---

## 1. Resolution, scale, pipeline decisions

| Item | Decision |
|---|---|
| Internal resolution | **384 x 216** (16:9; 5x = 1920x1080 exactly, 3x = 1152x648). Replaces 480x270. |
| Display | Canvas CSS-scaled to the largest *integer* scale that fits, letterboxed, `image-rendering: pixelated`. Fractional scale only if smaller than 1x. |
| Stage width | 576 px (camera 384 wide scrolls +-96) |
| Floor line (feet) | y = 192 in screen space. Foreground floor band 192-216 |
| HUD safe band | y 0-38 |
| Fighter standing height | 96-104 px including hair (3.4 heads tall). Crouch ~ 62 px |
| Hair/silhouette headroom | Tallest spike <= 108 px |
| Frame cell (authoring/bake) | 160 x 128, pivot (80, 120) = feet centre. Baked frames are **trimmed** to their bounding box with an offset (memory) |
| Facing | All art authored facing RIGHT. Left-facing = pre-baked mirrored canvas |
| Portraits | Master 96 x 96 per fighter, drawn at 1x in select, 2x (192x192) on versus/win screens. Chunky 2x pixels are intentional: they match the reference's chunky look |
| Pixel font | Press Start 2P (already loaded) for UI + a custom big "arcade title" treatment (section 9) |

### The sprite pipeline (decision and why)

Goal: closest possible match to the reference, produced by a code-only builder (no image editor), with ~120 animation frames per fighter x 6 fighters.

Rejected:
- Full hand-authored frames as text grids: ~20x the typing, error-prone at 100px tall, builder will drift and frames will not match each other.
- Procedural rectangles/capsules (current): cannot reproduce the reference. Dead.

**Chosen: "Rig + hand-pixeled parts + shared pose library + bake-time outline + hand-pixeled portraits."**

1. **Parts** are small hand-authored palette-indexed pixel grids (head, torso, hips, upper arm, forearm, hands, thigh, shin, feet), with variants (head: neutral/grit/hit/ko/shout; hand: fist/open/guard; etc.). The art quality lives here. ~25-35 grids per fighter, most under 24x30.
2. A **pose** is data: an angle per joint + part-variant names + root offset + z-order tweaks (about 15 numbers). Poses are shared across the humanoid rigs (SURGE, BRICK, JUNO, BASALT, VANTA share joint names; limb sizes differ), so ~80 base poses are written once; per-fighter poses are only for signature moves.
3. A **baker** (runs at boot, ~50 ms/fighter) assembles each pose onto an offscreen canvas: rotate each part with `imageSmoothingEnabled=false`, hard-threshold alpha at 128, run a **per-part outline pass** (4-neighbour dilate in outline colour, then draw the part over it), composite in z-order, trim, and cache normal + mirrored canvases. This is what produces the chunky overlapping outlines of the reference even when parts rotate.
4. **Portraits** are separate hand-authored 96x96 grids (the closest match to the reference, since the reference *is* portrait art). Title key art re-stages the reference's back-to-back composition from the SURGE and BRICK portraits.
5. **Smear/afterimage/impact FX** are procedural (arc trails, 2-3 frame afterimages in a darkened palette), drawn at runtime.

Why this wins: the hair, face, muscle highlights and tank-top shading (what the eye compares to the reference) are all hand-pixeled; animation is cheap because it is numbers, not pixels; a pose can be tweaked and re-previewed in seconds. The known weakness is stiff limbs when rotated by non-multiples of 90 deg. Mitigations are baked into the rules: (a) prefer 0/+-90/180 where possible, (b) author *pre-rotated variants* of the extreme shapes (extended punch arm, extended kick leg, uppercut arm, knockdown torso), (c) rotate in 15 deg steps only, (d) hit/KO/knockdown poses use hand-authored full-body overlay variants if the viewer shows ugliness, (e) every pose must pass the viewer's visual QA at 3x before moving on.

### Palette-indexed grid format

A grid is an array of equal-length strings. One character = one pixel. Shared glyph legend for ALL art (so parts are palette-swappable and fighters reuse shapes):

| Glyph | Meaning |
|---|---|
| `.` | transparent |
| `O` | outline (near-black `#170c1c`) |
| `1` `2` `3` `4` `5` | skin ramp: 1 deepest shadow ... 5 highlight |
| `a` `b` `c` `d` | hair ramp: a base-dark ... d highlight |
| `e` `f` `g` `h` | cloth A ramp (the main garment): e dark ... h light |
| `i` `j` `k` `l` | cloth B ramp (pants, secondary garment) |
| `m` `n` `o` `p` | trim/metal ramp (gold, wraps, gauntlets, belts) |
| `w` | eye white (`#ffffff`) |
| `y` | iris (per-fighter eye colour) |
| `x` | mouth interior / deep shadow (`#3a0f1c`) |
| `r` `s` | prop dark / prop light (toothpick, tape, etc.) |
| `z` | hair accent: brightest 1px sparkle on hair (SURGE `#8ff0f0`, BRICK `#fffbd0`) |
| `Q` | FX glow colour (per-fighter signature energy colour) |

Example (8x4, format only, not art):
```js
export const demo = [
  '..OOOO..',
  '.O3443O.',
  'O345543O',
  '.OOOOOO.',
];
```

Rules for grids: every row the same length (validator rejects otherwise); only glyphs from the legend; **no `O` on the outer silhouette of a part** (the baker adds the outer outline per part; write `O` only for *inner* separation lines such as the jaw, brow, finger splits, tank-top neckline, muscle cuts). This keeps rotation clean.

---

## 2. Proportions and rig

"Heroic bruiser": stylised, top-heavy.

- Height 100 px = ~3.4 heads. Head height ~29 px (incl. jaw, excl. hair spikes), head width ~26 px.
- Shoulder width (torso part) ~ 44 px = 1.7x head width. Delts are as tall as the jaw.
- Upper arm ~ 15 px thick, forearm 13 px, fist 14x13. Thigh 19 px thick, shin 15 px, foot 24x9.
- No neck to speak of: trapezius grid pixels run from the head base to the shoulder.
- Waist 26 px, hips 30 px.
- Rule: **two silhouettes must be distinguishable in solid black** (section 5 table).

Rig joints (all authored facing right, angle 0 = limb hanging straight down, positive angle = swing toward the facing direction, i.e. counter-clockwise on screen when facing right):

```
root (pelvis) -> hips -> torso -> head
                     torso -> shoulderF -> upperArmF -> foreArmF -> hand
                     torso -> shoulderB -> upperArmB -> foreArmB -> hand
        hips -> thighF -> shinF -> foot
        hips -> thighB -> shinB -> foot
```

Per-fighter `rig` data (px; builder finalises against the art but must keep standing height 96-104):

| Fighter | head WxH | torso WxH | hips | upperArm | foreArm+hand | thigh | shin | foot | build notes |
|---|---|---|---|---|---|---|---|---|---|
| SURGE | 26x30 | 44x36 | 30x14 | 15x22 | 13x22+14x13 | 19x28 | 15x26 | 24x9 | broad, slightly lean waist |
| BRICK | 26x30 | 46x36 | 30x14 | 16x22 | 14x22+15x14 | 19x28 | 15x26 | 24x9 | thickest chest of the cast besides BASALT |
| JUNO | 24x28 | 34x32 | 26x13 | 11x20 | 10x20+11x11 | 16x30 | 13x28 | 22x8 | slim, long legs, ponytail is a separate swayable part |
| BASALT | 30x32 | 56x40 | 40x16 | 20x24 | 17x24+19x17 | 24x28 | 19x26 | 28x10 | 112-116 px tall, huge; walks slow |
| VANTA | 26x32 | 46x38 | 30x14 | 15x24 | 13x24+15x14 | 18x30 | 14x28 | 24x9 | 112 px, cape/pauldron parts |

Z-order (back to front), default facing right: `armB, legB, hips, torso, head, legF, armF`. Poses may override (`z:['armB','legF',...]`) for kicks/throws.

---

## 3. Palettes (per fighter)

Every fighter: outline `O = #170c1c`, eye white `w = #ffffff`, mouth-dark `x = #3a0f1c`. Skin ramps are listed 1 (shadow) to 5 (highlight).

### Shared skin ramps

| Name | 1 | 2 | 3 | 4 | 5 | Used by |
|---|---|---|---|---|---|---|
| skin-salmon | `#8c3a3c` | `#c8624e` | `#ee9774` | `#f8c0a0` | `#fff0e0` | SURGE, BRICK (matches reference) |
| skin-tan | `#6e3028` | `#a9553b` | `#d98a5c` | `#f2b684` | `#ffe6c2` | JUNO |
| skin-brown | `#2e1410` | `#5a2a1e` | `#864a30` | `#b06a44` | `#dc9a6a` | BASALT |
| skin-ash | `#3a2f48` | `#5f5578` | `#8b84a8` | `#b8b2d0` | `#e6e2f4` | VANTA (face mostly masked) |

### SURGE (teal profile homage)

| Glyph group | a/e/i/m | b/f/j/n | c/g/k/o | d/h/l/p |
|---|---|---|---|---|
| hair a-d (teal) | `#0f2c5c` | `#1757a0` | `#22a0c8` | `#8ff0f0` |
| cloth A e-h (trunks, hot red) | `#5c1420` | `#a42a2a` | `#e0553a` | `#ff9a64` |
| cloth B i-l (hand wraps, white) | `#6e7080` | `#aab0c0` | `#e8ecf4` | `#ffffff` |
| trim m-p (cyan armband tattoo + belt) | `#0b4a66` | `#1788ac` | `#35c8e0` | `#b8f6ff` |
Iris `y = #3b82c4`. FX `Q = #35e0ff` (cyan water-energy). Boots: cloth B dark + trim.

### BRICK (blond tank-top homage)

| Glyph group | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| hair a-d (blond) | `#8a6a1a` | `#d9a82a` | `#ffd84a` | `#fff59a` |
| cloth A e-h (white tank) | `#4c5060` | `#8c91a0` | `#c9ccd6` | `#f6f7fb` |
| cloth B i-l (denim) | `#14213f` | `#23407a` | `#3866b8` | `#6f9be0` |
| trim m-p (belt buckle, boots, gold) | `#2a1a14` | `#6a4a20` | `#c88a20` | `#ffd84a` |
Iris `y = #3a7cc8`. Toothpick `r = #2a5aa8`, `s = #7fc0ff` (blue, as in the reference). FX `Q = #ffd84a`.

### JUNO

| Glyph group | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| hair a-d (red-orange) | `#5a1010` | `#b02a1c` | `#ff5a2a` | `#ffb060` |
| cloth A e-h (ivory wraps/top) | `#6b5a4a` | `#a99880` | `#e0d2b8` | `#fff6e4` |
| cloth B i-l (black-violet pants) | `#1a1228` | `#33284e` | `#54447a` | `#8b78b8` |
| trim m-p (gold) | `#7a4a10` | `#c88a20` | `#ffc840` | `#fff0a0` |
Iris `y = #2a8a4a`. FX `Q = #ff8a2a` (sun fire).

### BASALT

| Glyph group | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| hair/beard a-d (iron grey) | `#2a2a30` | `#4a4a52` | `#7a7a86` | `#b0b0be` |
| cloth A e-h (leather apron) | `#3a2210` | `#6a4022` | `#985c30` | `#c48848` |
| cloth B i-l (ash trousers) | `#2a2420` | `#4a4038` | `#6c6054` | `#948672` |
| trim m-p (iron gauntlets, steel) | `#2c3038` | `#555c68` | `#8890a0` | `#c8d0e0` |
Iris `y = #f0a020` (ember). FX `Q = #ff7a1a`. Gauntlet cracks glow `#ffc040`.

### VANTA (boss)

| Glyph group | 1st | 2nd | 3rd | 4th |
|---|---|---|---|---|
| hair (none; mask crest) a-d | `#0e0c18` | `#1c1830` | `#2e2850` | `#4a4280` |
| cloth A e-h (black-violet armour) | `#0e0c18` | `#1c1830` | `#2e2850` | `#4a4280` |
| cloth B i-l (cape/underlay) | `#2a0f3a` | `#4c1a66` | `#7a2ea0` | `#b060d8` |
| trim m-p (eclipse gold) | `#6a4a08` | `#b88a14` | `#ffcf33` | `#fff0a0` |
Iris `y = #ffe94a` (glowing, no pupil). FX `Q = #ffcf33`. Phase 2 swaps cloth ramps to a hotter variant (`#4a1a1a ... #ff6040`) and adds a gold aura outline.

---

## 4. Shading and outline rules (apply to every part)

1. Light from **upper-left** (in facing-right art). Highlights top-left of each form, shadows bottom-right and under overhangs.
2. Each form (delt, pec, bicep, forearm, thigh, calf, skull, spike) gets: base tone (3), one shadow region (2) on the lower/right edge, a deep accent (1) only in creases/under overlaps, a lighter tone (4) next to the highlight, and **one highlight blob (5)** of 2-4 px, placed on the top-left third. Max 2 blobs per large form (shoulder, chest).
3. Muscle definition = 1px inner `O` or tone-1 lines: delt/bicep seam, pec underline, ab grid (3x2 blocks), forearm tendon, knee.
4. Silhouette outline: the baker draws 1px `O` around every part. Overlap areas (arm over torso) therefore get a visible dark line. This replicates the reference's overlap lines.
5. No anti-aliased or mid-tone "blend" pixels at edges. No dithering on characters.
6. Clothing: 4-tone ramp; folds are 1px diagonal strokes of the shadow tone; hem/neckline get an inner `O`.
7. Hair: silhouette first (3-5 spikes with different lengths, one clump pointing forward, one back), then a/b base, c on the upper-left half of each spike, d on a 1-2px stroke at each tip.
8. Face (side/3-4 view, ~26x30): heavy brow `O` or tone-1 line, eye `w`+`y` 3x2 px, nose bridge highlight `5`, jaw shadow `2` under the cheekbone, mouth a 1px `x` line, chin square.
9. Damage tinting is runtime (white flash for 2 frames on hit, red-tinted `hit` head variant), never extra art.

### Animation principles

Squash-and-stretch via root offsets: crouch-before-jump (-6 px), punch lunge (+3 px forward root on active frames), recoil on hit (-4 px). Anticipation frame before every heavy. Hold the extended pose 2-3 frames (more time on the extreme, less on in-betweens). Heavy attacks: 1-2 frame "smear" overlay (arc trail in tone 5 / white) on the first active frame. 60 fps game ticks; animation keyed on move frame, not wall time.

---

## 5. Roster

Silhouette test: draw all five in solid black at 1x; each must be identifiable.

### SURGE "THE TIDE" (homage to the reference's left character)
- Role: rushdown / charge. Mid height (100), V-taper.
- Silhouette: wide shoulders, bare torso, tall swept-back spiky teal hair with a long forward spike, red trunks, white hand wraps, cyan armband.
- Hair: spiky teal, 5 spikes, 3 swept back. Head variant `neutral` is a **pure side profile facing right** (like the reference): sharp brow, long nose, set jaw, squinting eye, thin mouth.
- Outfit: bare chest, red fighting trunks with a white drawstring stripe, white wrapped hands and shins, dark boots.
- Accent colour: cyan (`Q`). Fighting style: karate/boxing hybrid, fast hands, sliding kicks.
- Personality: quiet, intense, dockside enforcer who "listens to the tide".

### BRICK "THE HEADLINER" (homage to the reference's right character)
- Role: all-round power. Tallest of the humans except boss/BASALT (102).
- Silhouette: broad blocky shoulders, flat-top-ish blond spiky hair (chunky spikes pointing up and forward), white tank top, denim, boots.
- Head variant `neutral`: **three-quarter front** facing right-forward, blue eyes, heavy brow, toothpick (`r`,`s`, 3 px diagonal) in the front mouth corner. Square jaw with stubble (1-2 `2` pixels).
- Outfit: sleeveless white tank (grey fold shading), blue jeans, brown boots, gold belt buckle, black fingerless gloves.
- Accent: gold. Style: street brawler, haymakers, shoulder charges, bar-fight dirty tricks. Personality: cocky, laid back, grins through everything.

### JUNO "THE DAWN"
- Role: speed/zoning. 92 px, long legs.
- Silhouette: ponytail whip (separate part, sways 1 frame lag), crop top, wide-cut pants flaring at the ankle, wrapped fists.
- Hair: red-orange ponytail with bright tip. Head variant 3/4 facing right, confident smirk.
- Outfit: ivory wraps and crop top, black-violet pants, gold bracers/sash.
- Accent: orange fire (`Q`). Style: acrobatic kung-fu with fire discs. Personality: playful, ruthless in the clinch.

### BASALT "THE ANVIL"
- Role: grappler/heavy. 114 px, biggest. Walk 0.8x.
- Silhouette: massive rectangle torso, tiny head sunk between shoulders, heavy gauntlets down to the knees.
- Head: bald, thick grey beard, heavy-lidded ember eyes, scar.
- Outfit: leather apron over bare torso, ash trousers, iron gauntlets with glowing cracks, forge boots.
- Accent: ember orange. Style: wrestling, quakes. Personality: gentle until provoked, speaks in few words.

### VANTA "THE FINAL BRACKET" (boss)
- Role: boss. 112 px.
- Silhouette: tall, wide spiked pauldrons, tattered cape tail (separate part), full-face eclipse mask with a gold ring crest.
- Phase 1 "Sealed": black-violet armour, gold trim, glowing yellow eyes. Phase 2 "Unbound": mask cracks and falls off in the transition cinematic (reveals ash-pale face with gold veins), armour ramp swaps hot, gold aura outline, cape becomes flame-edged.
- Accent: eclipse gold. Style: teleports, shadow bolts, grabs.

---

## 6. Animation list and frame budget

Poses are named `<anim>_<n>`. "Unique poses" is the number of distinct pose entries needed; the move timeline then holds each pose for N ticks.

### Base set (shared by the four humanoid fighters; written once as `src/gfx/poses.js`, JUNO/BASALT/VANTA reuse with the rig dimension differences)

| Animation | Unique poses | Timing / loop |
|---|---|---|
| idle | 6 | loop, 8 ticks each (48 f): breathing bob 1px, fist guard sway |
| walk forward | 8 | loop, 5 ticks each (40 f) |
| walk backward | 8 | loop, 6 ticks each |
| crouch (down 2, hold 1, up 2) | 5 | 3 ticks per transition pose |
| jump neutral (prep 1, rise 1, apex 1, fall 2, land 1) | 6 | land lag 3 f |
| jump forward / back (tuck variants) | 4 + 4 | spans airtime |
| forward dash / back dash | 3 + 3 | 12-18 f |
| light punch (LP) | 3 | frame data 4/2/6 |
| heavy punch (HP) | 5 | 8/3/14 |
| light kick (LK) | 3 | 6/3/9 |
| heavy kick (HK) | 5 | 10/4/18 |
| crouch LP / LK | 3 + 3 | |
| crouch HP (uppercut launcher) | 5 | |
| crouch HK (sweep) | 5 | |
| jump LP / HP / LK / HK | 2 each (8) | held while airborne |
| throw (grab 2, hold 1, release 2) | 5 | attacker; victim has `thrown_0..2` |
| throw victim | 3 | |
| block stand / block crouch | 2 + 2 | in/hold |
| hit high / hit low / hit body | 2 + 2 + 2 | |
| hit launched / air tumble | 4 | |
| knockdown (fall, slam, lie) | 4 | |
| getup | 4 | |
| KO (stagger, fall, slam, lie) | 5 | |
| win poses | 3 each x 2 | |
| intro pose (per fighter, unique) | 6 | |
| taunt | 3 | |
| special startup/active/recovery | 5-8 per special | per fighter |
| super flash pose + cinematic poses | 6 | per fighter |
| Final Blow pose set | 4 | per fighter |

Totals: shared base ~ 130 poses (cheap, numbers only); per-fighter unique ~ 35-40 poses. Hand-authored **part variants** per fighter: heads 6, torsos 5 (stand, lean-fwd, lean-back, crouch, hurt), hand 4, foot 3, plus pre-rotated extreme shapes (punch arm, kick leg, uppercut arm, fallen torso) = ~30 grids.

### MVP vs stretch art
- MVP: everything above for all 4 playable + boss, portraits for all, 5 stages.
- Stretch: extra win poses, unique taunts, boss phase-2 pose set, palette-swap alt costumes (free via the palette system).

---

## 7. Portraits

- Master portrait per fighter: 96 x 96 grid, bust (head, shoulders, one arm), black background (matches the reference: figure cut-out on black). Same glyphs/palettes, **outline is hand-drawn here (`O`)** because portraits are not baked.
- Derivatives: HUD icon = 32x32 face crop (rect defined in fighter data), select-screen thumbnail = master at 1x, versus/win = 2x.
- SURGE portrait: profile facing right-back-to-back stance, matching the reference's left figure. BRICK portrait: front-facing with toothpick, matching the right figure. Together they must recreate the reference when placed overlapping (SURGE behind, BRICK front) = title key art.
- JUNO/BASALT/VANTA portraits: same framing, same rendering rules, similar highlight density.
- Authoring helper (optional, Phase 1): a viewer "block-in" tool that rasterises polygon lists to a grid so the builder can rough a head out and then hand-refine; the final art is the hand-edited grid.

---

## 8. Quality bar and QA

Every art task ends with:
1. Viewer shows the asset at 1x, 3x and 8x on black, next to the reference (or a crop of it) at matched size.
2. Checklist: [ ] outline weight matches, [ ] 4-5 skin tones, hard cel, [ ] highlight blobs on shoulder/forehead/cheek, [ ] hair has highlight strokes and spiky silhouette, [ ] no anti-aliased pixels, [ ] palette within the fighter's table, [ ] solid-black silhouette reads at 1x, [ ] the face reads at 1x (brow, eye, mouth/prop).
3. Validator passes (`node tools/validate-art.mjs`).

---

## 9. Typography and UI art language

- Pixel UI font: Press Start 2P, 8px base, uppercase, drawn with a 1px dark drop outline.
- Big announcer text (ROUND, FIGHT, K.O.): custom drawn: Press Start 2P at 24-32px, vertical 3-colour gradient fill (gold `#fff0a0` -> `#ffcf33` -> `#c8601a`), 2px dark outline, 2px hard drop shadow, scale-in pop (150% -> 100% in 8 f) and hold.
- UI palette: background `#0a0714`, panel `#1a1030`, panel edge `#46327a`, accent gold `#ffcf33`, P1 `#35c8e0`, P2 `#ff5a4a`.
- Corner-bevel panels (2px light top-left, 2px dark bottom-right), no rounded corners, no gradients except in the big text and sky backdrops.

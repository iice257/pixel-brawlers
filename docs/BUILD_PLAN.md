# Pixel Brawlers: Build Plan (for the builder)

Read first, in order: `docs/ART_BIBLE.md`, `docs/GAME_DESIGN.md`, `docs/STAGES_AND_FX.md`, then this file, then `docs/NEXT_BUILDER_TASK.md` for the current task. The orchestrator (Opus) owns the docs; the builder (Sonnet) owns `src/`, `tools/`, `tests/`, `index.html`, `viewer.html`, `css/`, `README.md`.

## Standing rules

1. **One task = one builder turn = one commit** (or two if a doc tweak is needed). Commit message: `<phase>.<n> <short imperative>` e.g. `1.4 Add rig baker and idle pose`. Push to `main` after each task: **GitHub Pages serves `main` root, so `main` must always load and play** (run the checks below before pushing).
2. Original IP only. Never name or copy MK/SF characters, moves, or music.
3. Pure vanilla ES modules, no build step, no npm runtime deps. Dev deps allowed only for tests (use `node --test`, no packages). Dev server: `npx serve -l 5173 .` (stop it when done).
4. **Art rules are not optional.** Every art task finishes with the visual QA checklist from `ART_BIBLE.md` section 8, with a screenshot (in-app browser or Playwright if available) compared against `brainstorm/reference/characters-reference.png`. If the result does not look like the reference, iterate in the same task; do not move on.
5. Engine code in `src/engine/` is **pure** (no DOM, no `Math.random`, no `performance.now`) so it runs under `node --test`. Rendering lives elsewhere.
6. Keep `window.__game` and add `window.__debug` helpers (e.g. `__debug.setHP(p, n)`, `__debug.setMeter`, `__debug.screenshotState()`) so QA can set up states quickly.
7. Legacy scaffold: `src/*.js` (old files) stays reachable via `?legacy=1` until task 6.12 deletes it. New code goes in the folder layout below; do not edit legacy files except `main.js` routing.
8. After each task, report to the orchestrator via the user: what changed, screenshot paths (put them in `media/qa/`), any deviation from the spec, anything the docs should change.
9. If a spec number feels wrong in play, adjust and **record the change in `docs/TUNING_LOG.md`** (append: date, value, reason). Do not edit the other docs.
10. Avoid scope creep: stretch items only after the phase's definition of done.

## Target layout

```
index.html            game
viewer.html           sprite/portrait/stage viewer (dev tool, linked from README)
css/style.css
src/
  main.js                    boot, routing, ?legacy=1
  config.js                  W=384 H=216 STAGE_W=576 FLOOR_Y=192 ...
  core/        loop.js input.js (keyboard+gamepad+touch -> {dir,btn}) buffer.js motions.js rng.js save.js
  gfx/         draw.js palette.js parts.js rig.js baker.js poses.js fx.js text.js portraits.js
  data/
    fighters/  surge.js brick.js juno.js basalt.js vanta.js   (stats, rig, parts, poses, moves)
    stages.js  story.js  moves-template.js
  engine/      world.js fighter.js moves.js combat.js meter.js rules.js camera.js ai.js projectiles.js
  stages/      skyline.js temple.js harbor.js forge.js coliseum.js spectators.js
  ui/          hud.js title.js menu.js select.js versus.js story.js result.js pause.js options.js training.js
  audio/       engine.js synth.js seq.js songs.js sfx.js
tools/         validate-art.mjs
tests/         *.test.mjs
media/qa/      screenshots from QA
docs/TUNING_LOG.md
```

## Standard checks (run before every push)

```bash
node tools/validate-art.mjs        # once it exists (Task 1.1)
node --test tests/                 # once it exists (Task 2.2)
npx serve -l 5173 .                # then open http://localhost:5173/ and http://localhost:5173/viewer.html ; console must have 0 errors
```

---

# PHASE 1: Sprite pipeline + the two reference-style fighters (visual win first)

**Definition of done (DoD):** `viewer.html` shows SURGE and BRICK fully assembled, animated (idle, walk, crouch, jump, all normals, block, hit, KO, win), next to the reference; both clearly read as the reference characters in style (hair, skin shading, outline, tank top); portraits for both exist and compose into the back-to-back key art; validator green. The legacy game still plays unchanged.

**Visual QA checklist (applies to 1.x, repeat at 4.x for the other fighters):**
- [ ] Hair: spiky silhouette, 4 tones, highlight strokes on tips (SURGE teal/cyan, BRICK yellow)
- [ ] Skin: 5-tone hard cel, highlight *blobs* on shoulder/cheek/forehead, deep shadow under pecs/jaw
- [ ] Outline: dark, 1px, overlap lines visible where arm crosses torso
- [ ] BRICK: white tank with grey fold shading, blue toothpick visible at 1x, blue eyes
- [ ] SURGE: profile face with heavy brow, bare shoulders, teal-vs-skin contrast
- [ ] No anti-aliased/blended pixels, no gradients, palette within ART_BIBLE tables
- [ ] 1x silhouette in solid black is identifiable; heads are big, shoulders huge
- [ ] Side-by-side with the reference at matched size looks like the same game

### 1.1 Foundation: constants, tools, viewer, heads
- **Goal:** resolution to 384x216 constants (new `src/config.js` values live in a *new* file `src/config2.js` to not break legacy), glyph/palette system, grid validator, viewer page with reference comparison + eyedropper, and the first two art assets: SURGE head (profile) and BRICK head (3/4 with toothpick), 32x34 each.
- **Files:** `src/config2.js`, `src/gfx/palette.js`, `src/gfx/parts.js`, `src/gfx/draw.js` (minimal), `src/data/fighters/surge.js` & `brick.js` (palette + heads only), `tools/validate-art.mjs`, `viewer.html`.
- **Accept:** viewer shows both heads at 1x/3x/8x on black beside the reference image (with a selectable zoomed crop of each head in the reference and a **pixel eyedropper** that prints hex when you click the reference); validator rejects ragged rows/unknown glyphs; heads follow the shading rules; console clean.
- **Test:** open `/viewer.html`, screenshot; click reference pixels; run `node tools/validate-art.mjs`.

### 1.2 Calibrate palettes to the reference
- **Goal:** sample real hex values from the reference for SURGE/BRICK (hair ramps, skin ramp, tank ramp, toothpick, eye, outline) and put them in `palette.js`; record the calibrated tables in `docs/TUNING_LOG.md` (the orchestrator folds them into the bible; do not edit the bible yourself). Re-colour heads.
- **Files:** `src/data/fighters/*.js`, `docs/TUNING_LOG.md`, `viewer.html` (palette swatch panel).
- **Accept:** swatch panel shows ramps next to the sampled reference colours; heads match the reference's colour feel when viewed side by side.

### 1.3 SURGE body parts (grids)
- **Goal:** hand-pixel SURGE's torso (stand + crouch + lean variants), hips/trunks, upper arm, forearm, fist/open/guard hands, thigh, shin, foot (flat/toe/kick). Bare chest with 5-tone muscle shading and highlight blobs; armband accent; hand wraps.
- **Files:** `src/data/fighters/surge.js` (parts), `viewer.html` (parts sheet view: all parts on a grid with labels and pivots).
- **Accept:** parts sheet looks like parts of the reference's left figure; validator green; part sizes within ART_BIBLE rig table (+-3 px).

### 1.4 Rig + baker + idle pose (SURGE assembled)
- **Goal:** implement pose schema, rig assembly, the **baker** (per-part rotation with smoothing off, alpha threshold 128, per-part 1px outline, z-order compose, trim+offset, mirrored copy), and `idle_0..5`. Viewer shows SURGE idling.
- **Files:** `src/gfx/rig.js`, `src/gfx/baker.js`, `src/gfx/poses.js` (idle only), `viewer.html`.
- **Accept:** assembled SURGE, standing height 96-104 px, outline overlaps visible, no AA pixels (a debug check counts distinct alpha values: only 0/255), 1x + 4x views, animation at 60 fps loops smoothly, console clean.

### 1.5 BRICK body parts + assembly
- **Goal:** BRICK's parts (white tank torso with fold shading + stand/lean/crouch variants, jeans hips, gloved fists, boots, belt buckle) and assemble with the baker; idle pose.
- **Accept:** BRICK idle viewed with SURGE side by side reads as the reference pair; QA checklist BRICK items pass.

### 1.6 Pose library: locomotion
- **Goal:** `walk_f_0..7`, `walk_b_0..7`, `crouch_in/hold/out`, `jump_prep/rise/apex/fall/land`, `jump_f_*`, `jump_b_*`, `dash_f_*`, `dash_b_*`; shared by both fighters; per-fighter override hooks.
- **Accept:** viewer plays each animation with correct timing; walk looks like a walk (feet alternate, torso counter-rotates); no limb detaches; foot pivots stay on the floor line (viewer draws the floor line).

### 1.7 Pose library: attacks
- **Goal:** LP, HP, LK, HK, 2LP, 2LK, 2HP (uppercut), 2HK (sweep), j.LP/HP/LK/HK, throw, with anticipation/active/recovery poses as per ART_BIBLE section 6; **pre-rotated extreme variants** for punch arm, kick leg, uppercut arm as needed so extended limbs look hand-pixeled, not rotated blobs; smear overlays.
- **Accept:** viewer shows a contact sheet of every attack pose; active-frame poses reach the hitbox extents from GAME_DESIGN 3.1 (viewer overlays the hitbox rect to verify reach: the fist/foot tip must reach within 4 px of the box edge).

### 1.8 Pose library: reactions
- **Goal:** block stand/crouch, hit high/low/body, hit launched/tumble, knockdown/getup, KO, win x2, intro (SURGE and BRICK unique), taunt, thrown poses; `head: hit/ko/shout` variants authored.
- **Accept:** complete list from ART_BIBLE section 6 present for both fighters; viewer "Coverage" panel lists every required pose with a green check.

### 1.9 Viewer animation player + contact sheet + export
- **Goal:** animation timeline player (scrub, speed 0.25x-2x, loop, flip, onion-skin, floor line, hurtbox overlay placeholder), contact sheet of all poses (PNG export via canvas), and a keyboard-driven pose tuner (select a joint, +- 15 deg, copy the pose JSON to the clipboard).
- **Accept:** tuner edits a pose live and the copied JSON pastes back into `poses.js`; screenshot of the contact sheet saved to `media/qa/phase1-contact.png`.

### 1.10 Portrait: SURGE (96x96 master)
- **Goal:** hand-pixel the profile bust facing right, matching the reference's left figure: teal hair, heavy brow, muscular neck/shoulder, highlight blobs; plus HUD crop rect (32x32 face).
- **Accept:** viewer shows portrait 1x/2x next to the reference; QA checklist; face crop reads at 1x.

### 1.11 Portrait: BRICK (96x96) + title key art test
- **Goal:** front-facing bust with tank top and toothpick; then a key-art test canvas in the viewer that composes SURGE (behind) and BRICK (front, overlapping) at 2x on black with additive glows.
- **Accept:** key art test side by side with the reference looks like the same composition and style.

### 1.12 Phase 1 gate
- **Goal:** QA pass of everything above against the checklist, fix issues, update `README` screenshot placeholders (viewer link), ensure legacy game still works, push.
- **Accept:** orchestrator review (user sends screenshots `media/qa/phase1-*.png`).

---

# PHASE 2: Engine rewrite (frame data, boxes, rounds)

**DoD:** default game path (new engine) plays SURGE vs BRICK (versus, 2P keyboard + gamepad, or vs a stub dummy): all normals, throws, blocking high/low, hitstun/blockstun/pushback, knockdown/wakeup, chain + special-cancel plumbing, combo counter + scaling + juggle, best-of-3 rounds with timer and announcer, baked sprites animating from move data, hitbox debug overlay (F2), headless tests green. Old scenes (title/select/story) still reachable; story disabled in new path until Phase 6 (`?legacy=1` plays the old game fully).

### 2.1 Core loop + input
- Goal: fixed-timestep loop with accumulator, `input.js` (keyboard + gamepad) producing `{dir (1-9), buttons bitmask}` per tick per player, 90-tick ring buffer, facing-relative, SOCD, button buffer 5 ticks, simultaneous-press window 3 ticks.
- Files: `src/core/loop.js input.js buffer.js`; test page `/input-test.html` or a debug overlay showing the live numpad dir + buttons + history.
- Accept: overlay shows correct numpad direction and button history for both keyboards and a gamepad; blur clears; `node --test` test for SOCD and buffer logic.

### 2.2 Data schema, template moves, headless tests
- Goal: `moves-template.js` with the universal normals table (GAME_DESIGN 3.1) in the schema from section 9; `engine/moves.js` helpers (advantage calculator); `tests/frames.test.mjs` asserting advantage equals the doc table.
- Accept: `node --test` green; a debug page prints the frame data table from the data (HTML table at `/framedata.html`).

### 2.3 Fighter locomotion + boxes + camera
- Goal: world + fighter state machine for idle/walk/crouch/jump/dash, pushbox collision, stage clamps, facing auto-turn, camera (follow + clamp + vertical lift), placeholder stage (solid gradient + floor line), render baked sprites by state, F2 box overlay.
- Files: `engine/world.js fighter.js camera.js`, `ui/fight.js`, `main.js` routing.
- Accept: two fighters move/jump/crouch with correct feel (jump ~39 ticks, apex ~78 px; verify with a test), cannot overlap on the ground, camera follows, boxes visible.

### 2.4 Attacks, hit resolution, blocking
- Goal: attack state with startup/active/recovery from data; hitbox vs hurtbox; hit levels H/M/L/O; blocking (back + button + auto-guard); hitstun/blockstun; pushback; hitstop; chip rules; damage; hit reactions; HP bars (basic).
- Accept: tests: LP vs idle -> exact hitstun + advantage numbers; crouching dodges high; low must be crouch-blocked; with the debug overlay record hit frame numbers matching the table.

### 2.5 Throws, knockdown, wakeup, tech
- Goal: throw box + tech window, throw animations, hard/soft knockdown, quick-rise, wakeup invulnerability, lying hurtbox rules, back-throw side swap.
- Accept: throw whiff recovery, tech works when both press within 7 ticks, knockdown timings as table.

### 2.6 Rounds, timer, KO, announcer, basic HUD
- Goal: round/match state machine (GAME_DESIGN 4), timer, KO slowmo hook, draw rules, round pips, announcer text via the big text renderer, results back to menu. HUD v0 (bars, timer, pips).
- Accept: a full best-of-3 can be played and ends; time-over and draw rules testable via `__debug.setTimer`.

### 2.7 Chains, cancels, combo/juggle/scaling
- Goal: chain rules (weights), special-cancel flags (no specials yet; use a stub), combo counter UI, damage scaling, hitstun decay, juggle points with a launcher (2HP); `tests/combo.test.mjs` with scripted sequences.
- Accept: LP,2LP,HP chain works; 2HP launches and a j.-hit juggle costs points; scaling numbers match the table; counter shows hits+damage.

### 2.8 Hit FX, shake, flash, dust
- Goal: fx pool; light/heavy/block sparks, dust, screen shake, white flash, KO star burst, hitstop visuals.
- Accept: every hit type produces its FX; options for shake; no allocation spikes (frame time stays < 4 ms for logic).

### 2.9 Phase 2 gate
- QA pass; tune feel (log in TUNING_LOG); gamepad test; push; capture a 10 s GIF/video to `media/`.

---

# PHASE 3: Move lists, specials, meter

**DoD:** SURGE and BRICK have their full movelists: normals + command normals + 3 specials (L/H/EX) + super + throws; motions + charge + double-QCF recognised reliably; projectiles; meter; superflash; training-lite mode with frame data panel; tests for motions.

### 3.1 Motion detector (+tests)
- `core/motions.js`: QCF/QCB/DP/HCB/charge/DQCF per GAME_DESIGN 1.1 with leniency; `tests/motions.test.mjs` with accept/reject sequences, including facing flips.
- Accept: tests green; debug overlay shows the recognised motion name live.

### 3.2 Projectile system
- `engine/projectiles.js`: spawn/move/hit/lifetime, one-on-screen rule, trade/cancel when two projectiles meet, hitstop interaction, chip, FX trail.
- Accept: test spawn + hit + block; visible placeholder sprites (circle) with trail until art lands.

### 3.3 SURGE specials
- Wave Shot, Rising Tide, Riptide Rush (L/H) with poses, hitboxes, invuln, pushback (GAME_DESIGN 3.4); add pose entries; cancel flags from normals.
- Accept: every move works, matches S/A/R in tests, readable animation, `Q` colour FX.

### 3.4 BRICK specials
- Pick Shot, Haymaker Lariat, Gut Launcher (L/H); toothpick dart sprite.
- Accept: same as 3.3.

### 3.5 Meter, EX, super framework
- Meter gain/spend per 2.8, EX versions (armor/invuln/extra hits), super flash (world freeze, dim, speed lines, camera zoom), meter HUD.
- Accept: EX triggers with two same-family buttons and costs 100; super needs 200; superflash plays.

### 3.6 Supers (Tsunami Barrage, Main Event)
- Implement both; Main Event is a grab-style cinematic (poses + camera), Tsunami Barrage multi-hit.
- Accept: damage totals ~ spec with scaling; no softlocks; cinematic skippable never needed.

### 3.7 Command normals and unique throws
- SURGE 6HK, BRICK 6HP/4HK; unique throw animations.
- Accept: frame data in the table.

### 3.8 Training room (lite)
- `ui/training.js`: infinite HP/meter, dummy modes (stand/crouch/jump/block-all/CPU-off), reset (R), box overlay on, frame data panel (last move S/A/R/adv, dmg, combo), input history ring.
- Accept: the panel's numbers equal the data table; usable from a temporary menu entry.

### 3.9 Phase 3 gate
- Play-test pass, tuning log, push.

---

# PHASE 4: Remaining fighters (parts, poses, moves, portraits each)

**DoD:** JUNO, BASALT, VANTA fully playable (VANTA via training/debug select for now) with the same completeness as Phase 1+3 fighters, passing the visual QA checklist (adapted to their palettes). Engine hooks added: armor, command throw, charge-jump, teleport.

### 4.1 JUNO parts (+ponytail part with lag sway)
### 4.2 JUNO moves, poses, specials (Sun Disc incl. air version, Flame Spin, Phoenix Rise), super, portrait (96x96)
### 4.3 BASALT parts (big rig; apron; gauntlets)
### 4.4 BASALT moves/poses/specials (command throw, armor charge, Anvil Drop), super, portrait
### 4.5 VANTA parts + cape part + phase-2 palette/overlays
### 4.6 VANTA moves + engine hooks for teleport/armor + phases + portrait
- Each task: same acceptance pattern: viewer coverage panel all green; checklist; frame data tests added for each new move (`tests/<fighter>.test.mjs`); screenshot in `media/qa/`.
### 4.7 Roster balance pass + matchup smoke test
- Goal: headless AI-vs-AI (dumb random-button controller) 200 matches across all pairs asserting no exceptions/softlocks and win rates within 30-70% (log, tune HP/pwr).

---

# PHASE 5: Stages, camera, FX

**DoD:** 5 animated multi-layer stages complete with spectators, weather, lighting, reactive elements; final camera behaviours (zoom on KO/super, letterbox); polished FX; 60 fps on a mid laptop.

### 5.1 Draw toolkit completion + particle system + stage framework
- `gfx/draw.js` dither, ramps, text; `gfx/fx.js` pools; stage interface (STAGES_AND_FX section 1) with parallax layers + prebake; swap the placeholder stage to a minimal "training" stage.
### 5.2 Harbor (all layers, rain, ships, lightning, crane, puddles) + viewer `?stage=harbor` page
### 5.3 Skyline 88 (billboards, vehicles, searchlight, neon lighting)
### 5.4 Temple (petals, lantern, bell, koi, sunset light)
### 5.5 Forge (lava, embers, heat shimmer, furnace flicker, hammering workers)
### 5.6 Coliseum (eclipse, crowd eyes, runes, phase-2 transition hooks)
### 5.7 Spectators system + reactive hooks (cheer/gasp/silent), integrated into stages 2.2-2.4 (at least 3 stages with 8+ each)
### 5.8 Lighting & screen FX stack (tint rims, additive glows, vignette, scanline option, flash, chromatic split)
### 5.9 Camera cinematics: zoom, letterbox, KO slowmo/zoom, superflash dims
- Each stage task acceptance: the checklist in STAGES_AND_FX section 2 for that stage ("min 6 layers + floor + 2 foreground + 3 animations + 1 particle system + 1 lighting + 1 reactive"), parallax verified by scrolling the camera in `viewer.html?stage=<id>` (auto-pan demo), frame time < 6 ms for the stage draw, screenshot of the stage with two fighters saved to `media/qa/stage-<id>.png`.
### 5.10 Phase 5 gate: stage select in versus, FPS check, push.

---

# PHASE 6: Screens, story, AI, boss

**DoD:** Complete game flow: title -> menu -> select -> versus -> fight -> story ladder with dialogue and endings -> results; AI tiers 1-8; boss phases; Final Blow; pause/options/move list; legacy code deleted.

### 6.1 HUD final (portraits, lagging bar, meter pips, announcer, combo UI)
### 6.2 Title screen (key art composite, logo, blink, sun grid, sparks)
### 6.3 Main menu + options + pause + move list + how-to-play (persist options)
### 6.4 Character select (P1/P2 cursors, stat bars, idle preview, stage pick) + versus screen
### 6.5 AI core: perception/intents/tier table; scripted motions; reaction delay; `tests/ai.test.mjs` (AI vs AI completes; tiers behave: higher tier blocks more)
### 6.6 AI per-character styles + combo scripts + adaptation reads
### 6.7 Arcade ladder + story cards + dialogue bars + endings + continue flow
### 6.8 Boss: VANTA intro, phase transition cinematic, phase-2 behaviours, scripted patterns
### 6.9 Final Blow: prompt window + generic cinematic parameterised per fighter (STRETCH: unique)
### 6.10 Result/score screen + local high score (stretch)
### 6.11 Attract mode (stretch)
### 6.12 Remove legacy code (`src/scenes.js fighters.js render.js audio.js`...), update `docs/DESIGN.md` header to point at the new docs, push
### 6.13 Phase 6 gate: full playthrough with each fighter, screen recording

---

# PHASE 7: Audio

**DoD:** All SFX synthesised, all songs authored and loopable, dynamic music, mixer options, mute/volume persisted; no clipping; works after first input on all browsers.

### 7.1 Audio engine + buses + unlock + master compressor + mute/volume
### 7.2 Synth voices + SFX library (STAGES_AND_FX 9.3) + hooking into hits/moves/UI/KO/timer
### 7.3 Sequencer + MML-lite parser (`tests/mml.test.mjs` for the parser) + loop handling + pause ducking
### 7.4 Songs: title, select, versus stinger, win/lose jingles, ending
### 7.5 Stage songs: skyline, temple, harbor, forge, coliseum, coliseum2 (+training)
### 7.6 Dynamic music (final round tempo, low-HP layer), options sliders, audio QA
- Acceptance per task: audible in browser, no console errors, no sustained clicks/pops, CPU light (< 5% in devtools performance).

---

# PHASE 8: Polish, mobile, README, deploy

**DoD:** public build is a portfolio piece: touch controls, gamepad remap UI, robust scaling, README with GIFs/screenshots/controls/credits, Pages deployed and verified, a v1.0 tag.

### 8.1 Touch controls (stick + 5 buttons, portrait overlay, haptics optional)
### 8.2 Gamepad polish + (stretch) keyboard rebinding screen
### 8.3 Responsive/fullscreen/DPR scaling, CRT option, reduced-motion, perf profiling and fixes, loading screen
### 8.4 Bug-bash: playthrough with every fighter on every stage; fix list in `docs/TUNING_LOG.md`
### 8.5 README rewrite: hero GIF/screenshots in `media/`, features, controls, move lists summary, architecture diagram, "how art/sprites work", credits (original IP statement), link to `viewer.html`
### 8.7 Portrait polish pass (carry-over from Phase 1): SURGE neck/trap/face and near-arm detail, BRICK gritty salmon shading, hot hair highlights, more hair clumps, tank folds; must hold up side by side with the reference at 4x
### 8.6 Pages deployment check: confirm `https://iice257.github.io/pixel-brawlers/` serves the latest, relative URLs only, no console errors, cache-bust query for modules, `media/` sizes sane; tag `v1.0`
- Use `gh api repos/iice257/pixel-brawlers/pages` and a fresh incognito load.

---

## Visual QA checklist: full game (final gate)

- [ ] Every fighter side by side with the reference: same art language (outline, cel shading, highlight blobs, big heads)
- [ ] Every stage: >= 6 parallax layers, visible motion in <= 2 s of looking, spectators reacting, weather/lighting visible
- [ ] Hit feedback: spark, hitstop, shake, flash, sound on every hit type
- [ ] HUD readable at 1x, no overlaps with jumping fighters
- [ ] Title/select/versus look like an arcade cabinet
- [ ] 60 fps on a mid laptop; no console errors; keyboard + gamepad + touch each complete a match
- [ ] `?legacy` gone; README accurate; Pages live

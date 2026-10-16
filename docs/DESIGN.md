> **SUPERSEDED (2026-10-16):** the v0.1 scaffold design below is replaced by `ART_BIBLE.md`, `GAME_DESIGN.md`, `STAGES_AND_FX.md` and `BUILD_PLAN.md`. Kept for history until task 6.12.

# Pixel Brawlers - Design

## Intent

A short, polished, playable teaser that shows I can ship a 2D game: character select, story mode, fighting feel, original characters. It lives in its own repo, is playable in the browser, and is featured in my portfolio.

Success looks like:
- Someone opens the link and is fighting within 10 seconds.
- A full story run takes about 5 minutes.
- It feels like an arcade fighter (hit-stop, shake, readable states) without borrowing any protected IP.
- The repo reads as a real project: README, media, docs, clean code.

## Scope

In: 4 fighters + 1 boss, story mode (4 fights), versus 2P, AI, 4 stages, sfx.
Out for the demo: online play, combos/juggles, character-specific move lists beyond one special, save data.

## Legal stance

Inspired by the genre, not the franchise. Original names, palettes, silhouettes, specials, story and audio. No Mortal Kombat names, fatalities, character likenesses or music.

## Art direction

- Visual thesis: dusk-lit arcade cabinet. Hot sunset gradients, dark skylines, bright saturated fighters with one trim color each.
- Internal resolution 480x270, integer-scaled with nearest-neighbor.
- Fighters are puppet sprites built from rectangles (swap for sheets later, see roadmap).
- One accent (gold `#ffcf33`), one pixel font (Press Start 2P).

## Interaction thesis

- Hit-stop on every connect, longer on KO.
- Screen shake scaled to damage.
- Lagging damage bar so hits read clearly.

## Architecture

Fixed 60 Hz update with a rendering loop on `requestAnimationFrame`. Scenes are small classes with `update()` and `draw(ctx)`; `game.go(name, props)` swaps them. Fighters read a controller function returning `{left,right,up,block,punch,kick,special}`, so keyboard, AI (and later touch/gamepad) are interchangeable.

## Fighter model

States: `idle, walk, jump, block, attack, hit, ko, win`. Attacks have `start / active / rec` frames, a melee hitbox (reach, low/high height) or a projectile. Block works against the attacker's side with 15% chip damage.

| Fighter | Speed | Power | Jump | Special |
| --- | --- | --- | --- | --- |
| KAZE | 1.3 | 0.9 | 1.1 | Gale Rush (dash strike) |
| BRUTUS | 0.85 | 1.3 | 0.9 | Quake Fist (short, huge hit) |
| VEX | 1.05 | 1.0 | 1.0 | Toxic Bolt (fast projectile) |
| NYX | 1.0 | 1.05 | 1.2 | Void Orb (slow, heavy projectile) |
| OMEGA (boss) | 1.15 | 1.3 | 1.1 | Eclipse Beam (heavy orb) |

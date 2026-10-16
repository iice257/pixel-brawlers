# Pixel Brawlers

An original 2D pixel fighting game demo that runs in the browser. Four fighters, a story mode with a boss, local 2-player versus, procedural pixel art and synthesized sound. No build step, no dependencies, no copyrighted assets.

> Built as a quick teaser for making 2D games. Part of my portfolio.

<!-- media/cover.png and media/gameplay.gif go here once captured -->

## Play

Hosted build: _GitHub Pages link goes here once deployed._

Run it locally (any static server works):

```bash
npx serve .
```

Then open <http://localhost:3000>.

## Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | A / D | Left / Right |
| Jump | W | Up |
| Block | S | Down |
| Punch | J | Z |
| Kick (works in the air) | K | X |
| Special | L | C |

Story mode accepts either key set. `F` toggles fullscreen.

## What's in the demo

- **Story mode:** fight the three other fighters, then the boss OMEGA. Retry on defeat.
- **Versus mode:** two players, one keyboard, best of three.
- **Roster:** KAZE (speed, dash), BRUTUS (power, ground slam), VEX (projectile), NYX (slow heavy orb).
- **Fight system:** punches, kicks, air kicks, blocking with chip damage, hit-stop, screen shake, round timer.
- **AI:** difficulty scales across the story ladder.

## Project layout

```
index.html        page shell
css/              page styling
src/
  config.js       roster, boss, constants
  fighters.js     fighter state machine, hit detection, AI
  render.js       procedural stages, puppet sprites, effects, text
  scenes.js       title, select, story, fight, ending screens
  input.js        keyboard handling and key maps
  audio.js        WebAudio sfx synth
  main.js         fixed-timestep loop and scaling
docs/             design, roadmap, portfolio plan
brainstorm/       the original brief and scratch notes
assets/           source art and audio (as it is added)
media/            screenshots, gameplay capture, cover
```

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Next up: real sprite sheets, chiptune music, touch controls, more moves.

## Legal

All characters, names, art and code are original. The game is inspired by the feel of classic arcade fighters but uses none of their characters, art, names or audio.

## License

MIT. See [LICENSE](LICENSE).

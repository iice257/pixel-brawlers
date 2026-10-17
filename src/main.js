// Routing: / boots the v2 engine (src/ui/fight.js). Bare / shows the temporary menu; any QA param (p1, p2, shot, match, dummy, rounds) goes straight to the match. ?legacy=1 is the original v0.1 game, unchanged.
const canvas = document.getElementById('game');
const params = new URLSearchParams(location.search);

async function legacy() {
  const [{ W, H }, { endFrame }, { scenes }] = await Promise.all([import('./config.js'), import('./input.js'), import('./scenes.js')]);
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  const game = {
    scene: null,
    story: null,
    go(name, props) {
      this.scene = scenes[name](this, props);
    },
  };

  function fit() {
    const stage = document.getElementById('stage');
    const availW = stage.clientWidth;
    const availH = window.innerHeight - stage.getBoundingClientRect().top - 24;
    const raw = Math.min(availW / W, availH / H);
    const scale = raw >= 1 ? Math.floor(raw) : raw;
    canvas.style.width = `${Math.round(W * scale)}px`;
    canvas.style.height = `${Math.round(H * scale)}px`;
  }
  addEventListener('resize', fit);

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && !e.repeat) {
      if (document.fullscreenElement) document.exitFullscreen();
      else canvas.parentElement.requestFullscreen?.();
    }
  });
  document.addEventListener('fullscreenchange', fit);

  let last = performance.now();
  let acc = 0;
  const STEP = 1000 / 60;
  function frame(now) {
    acc = Math.min(acc + (now - last), 250);
    last = now;
    while (acc >= STEP) {
      game.scene.update();
      endFrame();
      acc -= STEP;
    }
    ctx.imageSmoothingEnabled = false;
    game.scene.draw(ctx);
    requestAnimationFrame(frame);
  }

  try { await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fallback font */ }
  fit();
  game.go('title');
  requestAnimationFrame((t) => { last = t; frame(t); });
}

async function modern() {
  const { boot } = await import('./ui/fight.js');
  try { await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fallback font */ }
  const direct = ['p1', 'p2', 'shot', 'match', 'dummy', 'rounds'].some((k) => params.has(k));
  if (direct) { boot(canvas, params); return; }
  const { runMenu } = await import('./ui/menu.js');
  boot(canvas, await runMenu(canvas));
}

if (params.get('legacy') === '1') legacy(); else modern();

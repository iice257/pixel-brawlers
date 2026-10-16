import { W, H } from './config.js';
import { endFrame } from './input.js';
import { scenes } from './scenes.js';

const canvas = document.getElementById('game');
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

async function boot() {
  try { await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fallback font */ }
  fit();
  game.go('title');
  requestAnimationFrame((t) => { last = t; frame(t); });
}
boot();
window.__game = game; // handy for debugging / automated tests

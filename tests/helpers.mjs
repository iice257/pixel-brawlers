// Scripted-input helpers for engine tests. Inputs are sparse: { tick: sample } holds each sample until the next listed tick.
import { createWorld, step } from '../src/engine/world.js';
import { BTN } from '../src/core/buffer.js';

export const N = { left: false, right: false, up: false, down: false, buttons: 0 };
export const I = (o = {}) => ({ ...N, ...o });
export const B = (...names) => names.reduce((m, n) => m | BTN[n], 0);
// Facing-relative shorthand: P1 faces right, P2 faces left, so `fwd` is right for P1 and left for P2.
export const dirs = {
  back: (p = 0) => (p === 0 ? { left: true } : { right: true }),
  fwd: (p = 0) => (p === 0 ? { right: true } : { left: true }),
  down: () => ({ down: true }),
  downBack: (p = 0) => ({ down: true, ...(p === 0 ? { left: true } : { right: true }) }),
  up: () => ({ up: true }),
};

// A world with the fighters `gap` px apart on the stage centre.
export function arena({ p1 = 'surge', p2 = 'brick', gap = 40 } = {}) {
  const w = createWorld({ p1, p2 });
  w.fighters[0].x = 288 - gap / 2; w.fighters[1].x = 288 + gap / 2;
  return w;
}

const at = (frames, t) => {
  let cur = N;
  for (const k of Object.keys(frames).map(Number).sort((a, b) => a - b)) { if (k <= t) cur = frames[k]; else break; }
  return cur;
};

// Run `n` ticks of scripted inputs (tick 0 is the first step). `each(w, t)` runs after every step (return true to stop early).
export function run(w, n, p1 = {}, p2 = {}, each = null) {
  for (let t = 0; t < n; t++) {
    step(w, [at(p1, t), at(p2, t)]);
    if (each && each(w, t) === true) break;
  }
  return w;
}

// Tick (0-based) on which `pred(w)` first becomes true, or -1.
export function firstTick(w, n, p1, p2, pred) {
  let found = -1;
  run(w, n, p1, p2, (ww, t) => { if (found < 0 && pred(ww)) { found = t; return true; } return false; });
  return found;
}
export const snap = (w) => JSON.parse(JSON.stringify(w));

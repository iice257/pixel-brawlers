// Seeded random-button controller for QA: the soak test and the ?shot=replay capture both use it.
import { BTN } from '../core/buffer.js';

// Seeded random-button controller: holds a random direction (biased toward the opponent so rounds actually end) for a few ticks and mashes random buttons, now and then LP+LK (throw).
export const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function randomPad(rnd, w, me) {
  let hold = { left: false, right: false, up: false, down: false }, left = 0;
  const all = Object.values(BTN);
  return () => {
    if (left-- <= 0) {
      left = 2 + Math.floor(rnd() * 14);
      const r = rnd();
      const toward = Math.sign(w.fighters[1 - me].x - w.fighters[me].x) >= 0 ? 'right' : 'left', away = toward === 'right' ? 'left' : 'right';
      hold = { left: false, right: false, up: rnd() < 0.08, down: rnd() < 0.15 };
      if (r < 0.5) hold[toward] = true; else if (r < 0.65) hold[away] = true;
    }
    let buttons = 0;
    if (rnd() < 0.3) buttons |= all[Math.floor(rnd() * all.length)];
    if (rnd() < 0.015) buttons |= BTN.LP | BTN.LK;
    return { ...hold, buttons };
  };
}

// HUD (browser-side, reads the pure world). v0: SF-style health bars with a lagging damage bar. 6.1 restyles it.
import { W } from '../config2.js';
import { STATS } from '../data/stats.js';

const FONT = '8px "Press Start 2P", monospace';
const BAR = { y: 12, h: 9, w: 148, gap: 18 };           // bars hang off the screen centre, depleting toward the outer edge
const COLORS = { frame: '#0a0614', back: '#3a1030', hp: '#35e06a', hpLow: '#ff5a4d', lag: '#ffd53a', text: '#e9ebff', p1: '#35e0ff', p2: '#ff9a64' };

export function createHud() {
  return { lag: [1, 1], hold: [0, 0], last: [1, 1] };
}

// Called once per sim tick (visual state only; the sim never reads it).
export function tickHud(hud, world) {
  world.fighters.forEach((f, i) => {
    const frac = f.hp / STATS[f.id].hp;
    if (frac < hud.last[i] - 1e-9) hud.hold[i] = 28;      // fresh damage: the yellow bar waits, then drains
    hud.last[i] = frac;
    if (hud.lag[i] > frac) {
      if (hud.hold[i] > 0) hud.hold[i]--; else hud.lag[i] = Math.max(frac, hud.lag[i] - 0.012);
    } else hud.lag[i] = frac;
  });
}

function bar(ctx, i, frac, lag) {
  const left = i === 0;
  const x0 = left ? W / 2 - BAR.gap - BAR.w : W / 2 + BAR.gap;
  const fill = (v, color) => {
    const w = Math.round(BAR.w * Math.max(0, Math.min(1, v)));
    ctx.fillStyle = color;
    ctx.fillRect(left ? x0 + BAR.w - w : x0, BAR.y, w, BAR.h);
  };
  ctx.fillStyle = COLORS.frame; ctx.fillRect(x0 - 2, BAR.y - 2, BAR.w + 4, BAR.h + 4);
  ctx.fillStyle = COLORS.back; ctx.fillRect(x0, BAR.y, BAR.w, BAR.h);
  fill(lag, COLORS.lag);
  fill(frac, frac <= 0.25 ? COLORS.hpLow : COLORS.hp);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';                 // gloss line
  const w = Math.round(BAR.w * Math.max(0, Math.min(1, frac)));
  ctx.fillRect(left ? x0 + BAR.w - w : x0, BAR.y + 1, w, 1);
}

export function drawHud(ctx, hud, world) {
  ctx.save();
  ctx.font = FONT; ctx.textBaseline = 'top';
  world.fighters.forEach((f, i) => {
    const S = STATS[f.id];
    bar(ctx, i, f.hp / S.hp, hud.lag[i]);
    const left = i === 0;
    ctx.textAlign = left ? 'left' : 'right';
    const x = left ? W / 2 - BAR.gap - BAR.w : W / 2 + BAR.gap + BAR.w;
    ctx.fillStyle = COLORS.frame; ctx.fillText(S.name, x + 1, BAR.y + BAR.h + 5);
    ctx.fillStyle = left ? COLORS.p1 : COLORS.p2; ctx.fillText(S.name, x, BAR.y + BAR.h + 4);
  });
  ctx.restore();
}

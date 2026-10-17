// HUD (browser-side, reads the pure world). v0: SF-style health bars with a lagging damage bar. 6.1 restyles it.
import { W, H } from '../config2.js';
import { STATS } from '../data/stats.js';

const FONT = '8px "Press Start 2P", monospace';
const BAR = { y: 12, h: 9, w: 148, gap: 18 };           // bars hang off the screen centre, depleting toward the outer edge
const BIG = '24px "Press Start 2P", monospace';
const GOLD = ['#fff0a0', '#ffcf33', '#c8601a'];   // ART_BIBLE 9: vertical 3-colour gradient
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

// Big announcer text: gradient fill, 2px dark outline, 2px hard drop shadow, scale pop 150% -> 100% in 8 ticks.
export function bigText(ctx, text, cx, cy, age, size = 24) {
  const k = 1 + 0.5 * Math.max(0, 1 - age / 8);
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(k, k);
  ctx.font = `${size}px "Press Start 2P", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'miter'; ctx.lineWidth = 4; ctx.strokeStyle = COLORS.frame;
  ctx.fillStyle = COLORS.frame; ctx.fillText(text, 2, 2); ctx.strokeText(text, 0, 0);       // hard drop shadow, then outline
  const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  g.addColorStop(0, GOLD[0]); g.addColorStop(0.5, GOLD[1]); g.addColorStop(1, GOLD[2]);
  ctx.fillStyle = g; ctx.fillText(text, 0, 0);
  ctx.restore();
}

// What the announcer says right now, or null.
export function announcement(m) {
  switch (m.phase) {
    case 'call': return m.wins[0] === m.need - 1 && m.wins[1] === m.need - 1 && m.need > 1 ? 'FINAL ROUND' : `ROUND ${m.round}`;
    case 'fight': return 'FIGHT!';
    case 'ko': return m.end?.reason === 'double' ? 'DOUBLE K.O.' : 'K.O.';
    case 'timeup': return 'TIME UP';
    case 'post': return m.end?.perfect ? 'PERFECT' : m.end?.winner < 0 ? 'DRAW' : null;
    default: return null;
  }
}

function timer(ctx, m) {
  const low = m.timer <= 10 && m.phase !== 'intro';
  ctx.font = '16px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const txt = String(m.timer).padStart(2, '0');
  ctx.fillStyle = COLORS.frame; ctx.fillText(txt, W / 2 + 1, BAR.y - 2);
  ctx.fillStyle = low && (m.tt % 60) < 30 && m.phase === 'play' ? COLORS.hpLow : COLORS.text; ctx.fillText(txt, W / 2, BAR.y - 3);
}

// Round pips sit under the inner end of each bar: filled gold when won.
function pips(ctx, m) {
  for (let i = 0; i < 2; i++) {
    for (let p = 0; p < m.need; p++) {
      const x = i === 0 ? W / 2 - BAR.gap - 6 - p * 9 : W / 2 + BAR.gap + p * 9, y = BAR.y + BAR.h + 5;
      ctx.fillStyle = COLORS.frame; ctx.fillRect(x - 1, y - 1, 8, 8);
      ctx.fillStyle = p < m.wins[i] ? GOLD[1] : '#2a1a3a'; ctx.fillRect(x, y, 6, 6);
      if (p < m.wins[i]) { ctx.fillStyle = GOLD[0]; ctx.fillRect(x, y, 6, 2); }
    }
  }
}

function result(ctx, m, world) {
  ctx.fillStyle = 'rgba(8,4,16,0.72)'; ctx.fillRect(0, 0, W, H);
  const txt = m.winner < 0 ? 'DRAW GAME' : `P${m.winner + 1} WINS`;
  bigText(ctx, txt, W / 2, H / 2 - 14, m.t, 28);
  ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (m.winner >= 0) { ctx.fillStyle = m.winner === 0 ? COLORS.p1 : COLORS.p2; ctx.fillText(STATS[world.fighters[m.winner].id].name, W / 2, H / 2 + 14); }
  if (Math.floor(m.t / 30) % 2 === 0) { ctx.fillStyle = COLORS.text; ctx.fillText('PRESS ENTER', W / 2, H / 2 + 38); }
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
  const m = world.match;
  if (m) {
    timer(ctx, m);
    pips(ctx, m);
    if (m.phase === 'over') result(ctx, m, world);
    else { const a = announcement(m); if (a) bigText(ctx, a, W / 2, H * 0.36, m.t); }
  }
  ctx.restore();
}

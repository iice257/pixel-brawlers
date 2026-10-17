// In-fight overlays: cheat sheet, training input history, pause menu, loading bar. Canvas-only; reads data, owns no state.
import { W, H } from '../config2.js';
import { cheatLine } from '../core/bindings.js';

const FONT = '8px "Press Start 2P", monospace';
const text = (ctx, str, x, y, color, align = 'left') => {
  ctx.font = FONT; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0a0614'; ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
};

// Translucent footer under the floor line: the live key map for whoever is human.
export function drawCheat(ctx, bindings, humans) {
  ctx.fillStyle = 'rgba(8,4,16,0.72)'; ctx.fillRect(0, H - 24, W, 24);
  if (humans.length === 2) {
    text(ctx, 'P1 ' + cheatLine(bindings, 'p1'), 4, H - 17, '#35e0ff');
    text(ctx, 'P2 ' + cheatLine(bindings, 'p2'), 4, H - 6, '#ff9a64');
  } else {
    text(ctx, 'YOU ' + cheatLine(bindings, 'p1'), 4, H - 17, '#35e0ff');
    text(ctx, 'OR  ' + cheatLine(bindings, 'alt'), 4, H - 6, '#9ad0ff');
  }
}

const GLYPH = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '', 6: '6', 7: '7', 8: '8', 9: '9' };
export function drawHistory(ctx, session) {
  ctx.fillStyle = 'rgba(8,4,16,0.6)'; ctx.fillRect(2, 44, 92, 12 + session.hist.length * 9);
  text(ctx, 'INPUTS', 6, 50, '#ffcf33');
  session.hist.forEach((h, i) => text(ctx, `${GLYPH[h.dir]}${h.btn ? ' ' + session.btnText(h.btn) : ''}`.trim() || '-', 6, 60 + i * 9, i ? '#9a8fc0' : '#ffffff'));
}

export function drawPause(ctx, items, sel, t) {
  ctx.fillStyle = 'rgba(8,4,16,0.78)'; ctx.fillRect(0, 0, W, H);
  text(ctx, 'PAUSED', W / 2, 52, '#ffcf33', 'center');
  items.forEach((it, i) => text(ctx, (i === sel ? '> ' : '  ') + it, W / 2 - 64, 86 + i * 18, i === sel ? '#ffffff' : '#8a80b0'));
  text(ctx, 'ESC RESUME', W / 2, H - 10, '#5a5080', 'center');
}

export function drawLoading(ctx, frac, label) {
  ctx.fillStyle = '#0e0a20'; ctx.fillRect(0, 0, W, H);
  text(ctx, 'LOADING', W / 2, H / 2 - 22, '#ffcf33', 'center');
  ctx.fillStyle = '#0a0614'; ctx.fillRect(W / 2 - 82, H / 2 - 6, 164, 14);
  ctx.fillStyle = '#2a2146'; ctx.fillRect(W / 2 - 80, H / 2 - 4, 160, 10);
  ctx.fillStyle = '#35e06a'; ctx.fillRect(W / 2 - 80, H / 2 - 4, Math.round(160 * frac), 10);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(W / 2 - 80, H / 2 - 4, Math.round(160 * frac), 2);
  text(ctx, label, W / 2, H / 2 + 24, '#9a8fc0', 'center');
}

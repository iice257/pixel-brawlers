// Temporary front end (Phase 6 replaces it): main menu, per-mode setup, Controls screen. Keyboard and gamepad. Resolves with the match config.
import { W, H } from '../config2.js';
import { createNav } from './nav.js';
import { createControls } from './controls.js';
import { load, store } from '../core/save.js';
import { normalise } from '../core/bindings.js';
import { TIER_LABELS } from '../data/ai.js';

const FONT = (n) => `${n}px "Press Start 2P", monospace`;
const FIGHTERS = ['surge', 'brick'];
const NAMES = { surge: 'SURGE', brick: 'BRICK', random: 'RANDOM' };
const COLORS = { surge: '#35e0ff', brick: '#ff9a64', random: '#ffffff' };
const MODES = [
  { id: 'cpu', label: 'VS CPU', note: 'you vs the computer, tiers 1-8' },
  { id: 'versus', label: '2 PLAYERS', note: 'two players, one keyboard or two pads' },
  { id: 'training', label: 'TRAINING', note: 'TAB swaps fighters. dummy modes, boxes, inputs' },
  { id: 'watch', label: 'WATCH', note: 'cpu vs cpu' },
  { id: 'controls', label: 'CONTROLS', note: 'keyboard diagram, rebind keys' },
  { id: 'legacy', label: 'LEGACY GAME', note: 'the original v0.1 game' },
];
export const DUMMY_MODES = ['stand', 'crouch', 'jump', 'block', 'cpu'];
const DEFAULT_SETUP = { p1: 'surge', p2: 'brick', tier: 4, tier2: 4, rounds: 3, dummy: 'stand' };

// Rows per mode: label, how to read the value, and how left/right changes it.
function rowsFor(mode, s) {
  const cycle = (key, list) => ({ get: () => (key === 'p2' || key === 'p1') && s[key] === 'random' ? 'RANDOM' : NAMES[s[key]] ?? s[key], step: (d) => { const i = list.indexOf(s[key]); s[key] = list[(i + d + list.length) % list.length]; }, color: () => COLORS[s[key]] });
  const num = (key, lo, hi, fmt) => ({ get: () => fmt(s[key]), step: (d) => { s[key] = Math.max(lo, Math.min(hi, s[key] + d)); } });
  const tier = (key) => num(key, 1, 8, (t) => `${t} ${TIER_LABELS[t]}`);
  const rounds = { get: () => `BEST OF ${s.rounds}`, step: (d) => { const l = [1, 3, 5]; s.rounds = l[(l.indexOf(s.rounds) + d + 3) % 3]; } };
  const R = (label, r) => ({ label, ...r });
  const withRandom = [...FIGHTERS, 'random'];
  switch (mode) {
    case 'cpu': return [R('YOU', cycle('p1', FIGHTERS)), R('CPU', cycle('p2', withRandom)), R('DIFFICULTY', tier('tier')), R('ROUNDS', rounds)];
    case 'versus': return [R('PLAYER 1', cycle('p1', FIGHTERS)), R('PLAYER 2', cycle('p2', FIGHTERS)), R('ROUNDS', rounds)];
    case 'training': return [R('YOU', cycle('p1', FIGHTERS)), R('DUMMY', cycle('p2', FIGHTERS)), R('DUMMY MODE', { get: () => s.dummy.toUpperCase() + (s.dummy === 'cpu' ? ` T${s.tier}` : ''), step: (d) => { const l = DUMMY_MODES; s.dummy = l[(l.indexOf(s.dummy) + d + l.length) % l.length]; } }), R('CPU TIER', tier('tier'))];
    case 'watch': return [R('CPU 1', cycle('p1', FIGHTERS)), R('TIER', tier('tier')), R('CPU 2', cycle('p2', FIGHTERS)), R('TIER', tier('tier2')), R('ROUNDS', rounds)];
    default: return [];
  }
}

// Resolves with { cfg, bindings } for the match; the legacy entry navigates away instead.
export function runMenu(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  const fit = () => {
    const stage = document.getElementById('stage');
    const raw = Math.min(stage.clientWidth / W, (window.innerHeight - stage.getBoundingClientRect().top - 24) / H);
    const scale = raw >= 1 ? Math.floor(raw) : raw;
    canvas.style.width = `${Math.round(W * scale)}px`;
    canvas.style.height = `${Math.round(H * scale)}px`;
  };
  fit();
  addEventListener('resize', fit);
  const nav = createNav();
  const bindings = normalise(load('bindings', null));
  const setup = { ...DEFAULT_SETUP, ...load('setup', {}) };
  const ui = { screen: 'main', sel: 0, mode: null, row: 0, t: 0 };
  const controls = createControls(bindings, { onChange: (b) => store('bindings', b), onExit: () => { ui.screen = 'main'; } });

  return new Promise((resolve) => {
    let raf = 0;
    const finish = (cfg) => {
      cancelAnimationFrame(raf); nav.destroy(); removeEventListener('resize', fit);
      store('setup', setup);
      resolve({ cfg, bindings });
    };
    const start = () => {
      const pick = (v) => (v === 'random' ? FIGHTERS[Math.floor(Math.random() * FIGHTERS.length)] : v);
      finish({ mode: ui.mode, p1: pick(setup.p1), p2: pick(setup.p2), tier: setup.tier, tier2: setup.tier2, rounds: setup.rounds, dummy: setup.dummy });
    };
    const handle = (ev) => {
      if (ui.screen === 'controls') { controls.nav(ev); return; }
      if (ui.screen === 'main') {
        if (ev === 'up') ui.sel = (ui.sel + MODES.length - 1) % MODES.length;
        else if (ev === 'down') ui.sel = (ui.sel + 1) % MODES.length;
        else if (ev === 'ok') {
          const m = MODES[ui.sel];
          if (m.id === 'legacy') { location.search = '?legacy=1'; return; }
          if (m.id === 'controls') { ui.screen = 'controls'; return; }
          ui.mode = m.id; ui.screen = 'setup'; ui.row = 0;
        }
        return;
      }
      const rows = rowsFor(ui.mode, setup), last = rows.length;
      if (ev === 'back') ui.screen = 'main';
      else if (ev === 'up') ui.row = (ui.row + last) % (last + 1);
      else if (ev === 'down') ui.row = (ui.row + 1) % (last + 1);
      else if (ev === 'left' || ev === 'right') { if (ui.row < last) rows[ui.row].step(ev === 'right' ? 1 : -1); }
      else if (ev === 'ok') { if (ui.row === last) start(); else rows[ui.row].step(1); }
    };

    const text = (str, x, y, size, color, align = 'center') => {
      ctx.font = FONT(size); ctx.textAlign = align; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0a0614'; ctx.fillText(str, x + 1, y + 1);
      ctx.fillStyle = color; ctx.fillText(str, x, y);
    };
    const frame = () => {
      ui.t++;
      const { events, keys } = nav.drain();
      if (ui.screen === 'controls' && controls.listening) { if (keys.length) controls.key(keys[0]); }
      else for (const ev of events) handle(ev);
      if (ui.screen === 'controls') { controls.draw(ctx, nav.padCount()); raf = requestAnimationFrame(frame); return; }

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1a1030'); g.addColorStop(1, '#3a1a50');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      text('PIXEL BRAWLERS', W / 2, 30, 16, '#ffcf33');
      text('WORK IN PROGRESS', W / 2, 48, 8, '#9a8fc0');
      if (ui.screen === 'main') {
        MODES.forEach((m, i) => text((i === ui.sel ? '> ' : '  ') + m.label, W / 2, 78 + i * 17, 9, i === ui.sel ? '#ffffff' : '#8a80b0'));
        text(MODES[ui.sel].note, W / 2, H - 22, 8, '#9a8fc0');
        text(nav.padCount() ? `GAMEPAD x${nav.padCount()} CONNECTED` : 'KEYBOARD OR GAMEPAD', W / 2, H - 10, 8, nav.padCount() ? '#6ad06a' : '#5a5080');
      } else {
        const rows = rowsFor(ui.mode, setup);
        text(MODES.find((m) => m.id === ui.mode).label, W / 2, 70, 9, '#ffffff');
        rows.forEach((r, i) => {
          const y = 92 + i * 17, on = ui.row === i;
          text((on ? '> ' : '  ') + r.label, 52, y, 8, on ? '#ffffff' : '#8a80b0', 'left');
          text((on ? '< ' : '  ') + r.get() + (on ? ' >' : ''), W - 52, y, 8, r.color ? r.color() : on ? '#ffcf33' : '#c8c0e8', 'right');
        });
        const y = 92 + rows.length * 17 + 6;
        text((ui.row === rows.length ? '> ' : '  ') + 'START', W / 2, y, 11, ui.row === rows.length ? (Math.floor(ui.t / 20) % 2 ? '#ffcf33' : '#ffffff') : '#8a80b0');
        text('UP/DOWN  LEFT/RIGHT CHANGE  ENTER  ESC BACK', W / 2, H - 10, 8, '#5a5080');
      }
      raf = requestAnimationFrame(frame);
    };
    frame();
  });
}

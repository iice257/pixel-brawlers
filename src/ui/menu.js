// Temporary Phase 2 menu (replaced by the real front end in Phase 6): mode list, then a 2-tile character select, then the match.
import { W, H } from '../config2.js';

const FONT = (n) => `${n}px "Press Start 2P", monospace`;
const MODES = [
  { label: 'VERSUS 2P', note: 'two players, one keyboard', pick: true, dummy: false },
  { label: 'VS CPU (DUMMY)', note: 'P2 stands still. real AI comes later', pick: true, dummy: true },
  { label: 'TRAINING (STUB)', note: 'no round, no timer', pick: true, dummy: true, sandbox: true },
  { label: 'LEGACY GAME', note: 'the original v0.1 game', legacy: true },
];
const FIGHTERS = ['surge', 'brick'];
const NAMES = { surge: 'SURGE', brick: 'BRICK' };
const COLORS = { surge: '#35e0ff', brick: '#ff9a64' };

// Resolves with the URLSearchParams the match should boot with (or navigates away for the legacy game).
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
  const hint = document.querySelector('.hint');
  if (hint) hint.innerHTML = '<b>Up/Down</b> choose · <b>Enter</b> confirm · <b>Esc</b> back · character select: <b>A/D</b> P1, <b>Left/Right</b> P2';

  const s = { screen: 'modes', mode: 0, p: [0, 1], t: 0 };
  return new Promise((resolve) => {
    let raf = 0;
    const done = (params) => { cancelAnimationFrame(raf); removeEventListener('keydown', onKey); removeEventListener('resize', fit); resolve(params); };
    const onKey = (e) => {
      if (e.repeat) return;
      const k = e.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(k)) e.preventDefault();
      if (s.screen === 'modes') {
        if (k === 'ArrowUp' || k === 'KeyW') s.mode = (s.mode + MODES.length - 1) % MODES.length;
        else if (k === 'ArrowDown' || k === 'KeyS') s.mode = (s.mode + 1) % MODES.length;
        else if (k === 'Enter' || k === 'KeyJ' || k === 'Space') {
          if (MODES[s.mode].legacy) { location.search = '?legacy=1'; return; }
          s.screen = 'select';
        }
      } else if (k === 'Escape') s.screen = 'modes';
      else if (k === 'KeyA' || k === 'KeyD') s.p[0] = (s.p[0] + 1) % FIGHTERS.length;
      else if (k === 'ArrowLeft' || k === 'ArrowRight') s.p[1] = (s.p[1] + 1) % FIGHTERS.length;
      else if (k === 'Enter' || k === 'KeyJ' || k === 'Space') {
        const m = MODES[s.mode];
        const q = new URLSearchParams({ p1: FIGHTERS[s.p[0]], p2: FIGHTERS[s.p[1]] });
        if (m.dummy) q.set('dummy', '1');
        if (m.sandbox) q.set('match', '0');
        done(q);
      }
    };
    addEventListener('keydown', onKey);

    const text = (str, x, y, size, color, align = 'center') => {
      ctx.font = FONT(size); ctx.textAlign = align; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0a0614'; ctx.fillText(str, x + 1, y + 1);
      ctx.fillStyle = color; ctx.fillText(str, x, y);
    };
    const draw = () => {
      s.t++;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1a1030'); g.addColorStop(1, '#3a1a50');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      text('PIXEL BRAWLERS', W / 2, 36, 16, '#ffcf33');
      text('WORK IN PROGRESS', W / 2, 56, 8, '#9a8fc0');
      if (s.screen === 'modes') {
        MODES.forEach((m, i) => {
          const y = 92 + i * 22, on = i === s.mode;
          text((on ? '> ' : '  ') + m.label, W / 2, y, 9, on ? '#ffffff' : '#8a80b0');
        });
        text(MODES[s.mode].note, W / 2, H - 18, 8, '#9a8fc0');
      } else {
        text(MODES[s.mode].label, W / 2, 78, 8, '#ffffff');
        FIGHTERS.forEach((f, i) => {
          const x = W / 2 + (i === 0 ? -1 : 1) * 86;
          const pick = FIGHTERS[s.p[i]];
          ctx.fillStyle = '#0a0614'; ctx.fillRect(x - 64, 92, 128, 90);
          ctx.fillStyle = COLORS[pick]; ctx.fillRect(x - 61, 95, 122, 84);
          ctx.fillStyle = 'rgba(10,6,20,0.55)'; ctx.fillRect(x - 61, 95, 122, 84);
          text(NAMES[pick], x, 128, 12, COLORS[pick]);
          const who = i === 0 ? 'P1' : MODES[s.mode].dummy ? 'P2 (DUMMY)' : 'P2';
          text(who, x, 164, 8, '#ffffff');
          text(i === 0 ? 'A / D' : 'LEFT / RIGHT', x, 194, 8, '#9a8fc0');
        });
        if (Math.floor(s.t / 30) % 2 === 0) text('PRESS ENTER TO FIGHT', W / 2, H - 14, 8, '#ffcf33');
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
  });
}

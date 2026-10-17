// /input-test.html: live view of what the input layer produces for both players (keyboard + gamepads).
import { createInput, KEYMAPS } from '../core/input.js';
import { createLoop } from '../core/loop.js';
import { BTN, BTN_LIST, createBuffer, pushInput, recent, pairLive, doubleTap, FWD, BACK, livePresses } from '../core/buffer.js';

const input = createInput();
const players = [0, 1].map((p) => ({ p, buf: createBuffer(), facing: 1, throwFlash: 0, dashFlash: '', dashT: 0 }));
const $ = (id) => document.getElementById(id);
const ARROW = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '·', 6: '→', 7: '↖', 8: '↑', 9: '↗' };

// ---- build DOM
for (const pl of players) {
  const root = $('p' + pl.p);
  root.innerHTML = `
    <header><h2>P${pl.p + 1}</h2><span class="pad" id="pad${pl.p}">no gamepad</span>
      <button class="face" id="face${pl.p}">facing → right</button></header>
    <div class="row">
      <div class="dir" id="dir${pl.p}">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<i data-d="${d}">${d}</i>`).join('')}</div>
      <div class="btns" id="btns${pl.p}">${BTN_LIST.map((n) => `<b data-n="${n}">${n}</b>`).join('')}</div>
      <div class="flags" id="flags${pl.p}"><span data-f="throw">THROW<br><small>LP+LK ≤3t</small></span><span data-f="dash">DASH<br><small>double tap</small></span><span data-f="buf">BUFFER<br><small>live 5t</small></span></div>
    </div>
    <canvas id="hist${pl.p}" width="480" height="64"></canvas>
    <p class="map">${mapText(pl.p)}</p>`;
  $('face' + pl.p).onclick = () => { pl.facing = -pl.facing; $('face' + pl.p).textContent = pl.facing > 0 ? 'facing → right' : 'facing ← left'; };
}
function mapText(p) {
  const m = KEYMAPS[p], keys = (pick) => Object.entries(m).filter(([, v]) => pick(v)).map(([k]) => k.replace('Key', '').replace('Arrow', '')).join(' ');
  return `move ${keys((v) => typeof v === 'string')} · buttons ${BTN_LIST.map((n) => `${n}=${Object.entries(m).find(([, v]) => v === BTN[n])[0].replace('Key', '')}`).join(' ')}`;
}

// ---- sim tick: poll, sample, push
function step() {
  input.poll();
  for (const pl of players) {
    const raw = input.read(pl.p);
    pushInput(pl.buf, raw, pl.facing);
    if (pairLive(pl.buf, BTN.LP, BTN.LK)) pl.throwFlash = 30;
    else if (pl.throwFlash > 0) pl.throwFlash--;
    if (doubleTap(pl.buf, FWD)) { pl.dashFlash = '66'; pl.dashT = 30; }
    else if (doubleTap(pl.buf, BACK)) { pl.dashFlash = '44'; pl.dashT = 30; }
    else if (pl.dashT > 0) pl.dashT--;
  }
}

// ---- render
const COLS = 30;
function drawHistory(pl) {
  const cv = $('hist' + pl.p), g = cv.getContext('2d');
  const w = cv.width / COLS, h = cv.height;
  g.clearRect(0, 0, cv.width, h);
  g.font = '11px ui-monospace, Consolas, monospace';
  g.textAlign = 'center';
  const hist = recent(pl.buf, COLS);
  hist.forEach((e, i) => {
    const x = (COLS - hist.length + i) * w;
    g.fillStyle = i % 2 ? '#14172b' : '#101324';
    g.fillRect(x, 0, w, h);
    g.fillStyle = e.dir === 5 ? '#3a4068' : '#ffcf33';
    g.fillText(ARROW[e.dir], x + w / 2, 14);
    BTN_LIST.forEach((n, k) => {
      g.fillStyle = e.btn & BTN[n] ? '#35e0ff' : '#1f2342';
      g.fillRect(x + 2, 22 + k * 8, w - 4, 6);
    });
  });
  g.fillStyle = '#8a90b8';
  g.textAlign = 'left';
  g.fillText('old', 2, h - 2);
  g.textAlign = 'right';
  g.fillText('now', cv.width - 2, h - 2);
}

function render() {
  const pads = input.pads();
  for (const pl of players) {
    const b = pl.buf;
    document.querySelectorAll(`#dir${pl.p} i`).forEach((el) => el.classList.toggle('on', +el.dataset.d === b.dir));
    document.querySelectorAll(`#btns${pl.p} b`).forEach((el) => el.classList.toggle('on', !!(b.btn & BTN[el.dataset.n])));
    const f = $('flags' + pl.p);
    f.querySelector('[data-f=throw]').classList.toggle('on', pl.throwFlash > 0);
    const dash = f.querySelector('[data-f=dash]');
    dash.classList.toggle('on', pl.dashT > 0);
    dash.firstChild.textContent = pl.dashT > 0 ? (pl.dashFlash === '66' ? 'DASH F' : 'DASH B') : 'DASH';
    f.querySelector('[data-f=buf]').classList.toggle('on', livePresses(b) !== 0);
    $('pad' + pl.p).textContent = pads[pl.p] ? pads[pl.p].id.slice(0, 38) : 'no gamepad';
    $('pad' + pl.p).classList.toggle('ok', !!pads[pl.p]);
    drawHistory(pl);
  }
  $('fps').textContent = `${loop.stats.fps} fps · tick ${players[0].buf.tick}`;
}

const loop = createLoop({ step, render });
loop.start();
window.__input = { input, players };

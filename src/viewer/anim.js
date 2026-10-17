// Viewer: plays baked idle poses on black with a floor line. Reads URL params for deterministic screenshots.
import { buildPalette } from '../gfx/palette.js';
import { bakePose, drawBaked, auditBaked } from '../gfx/baker.js';
import { idlePoses, IDLE_HOLD } from '../gfx/poses.js';
import * as surge from '../data/fighters/surge.js';
import * as brick from '../data/fighters/brick.js';

const MODS = { surge, brick };
const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const fighterOf = (id) => ({ id, parts: MODS[id].parts, pivots: MODS[id].pivots, palette: buildPalette(MODS[id].palette) });

const root = $('anim');
if (root) {
  const cv = document.createElement('canvas');
  cv.style.background = '#000';
  cv.style.border = '1px solid var(--edge)';
  root.append(cv);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  $('animFighter').value = qs.get('fighter') || 'surge';
  $('animScale').value = qs.get('scale') || '4';
  $('animPlay').checked = qs.get('paused') !== '1';
  $('animJoints').checked = qs.get('joints') === '1';
  $('animFlip').checked = qs.get('flip') === '1';
  const pair = qs.get('pair') === '1';
  let tick = 0;
  const forcedFrame = qs.has('frame') ? +qs.get('frame') : null;

  const CELLW = 128, CELLH = 120, FLOOR = 112;
  function render() {
    const scale = +$('animScale').value;
    const ids = pair ? ['surge', 'brick'] : [$('animFighter').value];
    const cols = ids.length;
    cv.width = (pair ? 200 : CELLW) * scale; cv.height = CELLH * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#46327a'; ctx.beginPath(); ctx.moveTo(0, (FLOOR + 0.5) * scale); ctx.lineTo(cv.width, (FLOOR + 0.5) * scale); ctx.stroke();
    const info = [];
    ids.forEach((id, i) => {
      const f = fighterOf(id);
      const poses = idlePoses(id);
      const frame = forcedFrame ?? Math.floor(tick / IDLE_HOLD) % poses.length;
      const b = bakePose(f, poses[frame]);
      const flip = $('animFlip').checked;
      let facing = flip ? -1 : 1;
      let x = CELLW / 2;
      if (pair) { x = i === 0 ? 62 : 138; facing = i === 0 ? 1 : -1; }
      const off = document.createElement('canvas'); off.width = cv.width / scale; off.height = cv.height / scale;
      const octx = off.getContext('2d'); octx.imageSmoothingEnabled = false;
      drawBaked(octx, b, x, FLOOR, facing);
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, cv.width, cv.height);
      if ($('animJoints').checked) {
        for (const [name, [jx, jy]] of Object.entries(b.joints)) {
          const wx = facing >= 0 ? x - b.ox + jx : x - b.mox + (b.w - jx);
          const wy = FLOOR - b.oy + jy;
          ctx.fillStyle = name.startsWith('root') ? '#ff00ff' : '#00ffcc';
          ctx.fillRect(Math.round(wx * scale - 2), Math.round(wy * scale - 2), 5, 5);
        }
      }
      const a = auditBaked(f, b);
      info.push(`${id}: height ${b.height}px, feet gap ${b.floorGap}, AA px ${a.aaPixels}, stray colours ${a.strayColours}`);
    });
    $('animInfo').textContent = info.join(' | ');
    window.__anim = { info };
  }
  let last = performance.now(), acc = 0;
  function loop(t) {
    const dt = (t - last) / 1000; last = t;
    if ($('animPlay').checked && forcedFrame === null) {
      acc += dt * 60 * +$('animSpeed').value;
      while (acc >= 1) { tick++; acc -= 1; }
    }
    render();
    requestAnimationFrame(loop);
  }
  $('animSpeed').addEventListener('input', (e) => { $('animSpeedVal').textContent = e.target.value + 'x'; });
  requestAnimationFrame(loop);
}

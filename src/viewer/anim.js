// Viewer: plays any named animation on black with a floor line, coverage panel, contact sheet and hitbox overlay.
// URL params: view=anim|contact, fighter, pair=1, scale, anim=<name>, frame=<index in anim>, paused=1, joints=1, flip=1, boxes=1.
import { buildPalette } from '../gfx/palette.js';
import { bakePose, drawBaked, auditBaked } from '../gfx/baker.js';
import { poseLibrary } from '../gfx/poses.js';
import { animsFor, animTotal, frameAt, REQUIRED } from '../data/anims.js';
import * as surge from '../data/fighters/surge.js';
import * as brick from '../data/fighters/brick.js';

const MODS = { surge, brick };
const IDS = ['surge', 'brick'];
const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const fighterOf = (id) => ({ id, parts: MODS[id].parts, pivots: MODS[id].pivots, palette: buildPalette(MODS[id].palette) });
const FIGHTERS = Object.fromEntries(IDS.map((id) => [id, fighterOf(id)]));
const LIBS = Object.fromEntries(IDS.map((id) => [id, poseLibrary(id)]));
const ANIM = Object.fromEntries(IDS.map((id) => [id, animsFor(id)]));

const stripFx = (p) => { const { fx, ...rest } = p; return rest; };
const tryBake = (id, name, keepFx = true, only = null) => {
  const pose = LIBS[id][name];
  if (!pose) return null;
  return bakePose(FIGHTERS[id], keepFx ? pose : stripFx(pose), only);
};

// Rightmost pixel of the attacking limb group(s) (outline included, smear excluded) inside the hitbox's y band, relative to the feet origin.
function reachOf(id, anim) {
  const i = anim.frames.findIndex((f) => f.phase === 'active');
  if (i < 0 || !anim.hitbox) return null;
  const b = tryBake(id, anim.frames[i].pose, false, anim.limb ?? null);
  if (!b) return null;
  const [bx, by, bw, bh] = anim.hitbox;
  const d = b.canvas.getContext('2d').getImageData(0, 0, b.w, b.h).data;
  let tip = -1e9;
  for (let y = 0; y < b.h; y++) {
    const up = b.oy - 1 - y;                       // height above the floor row
    if (up < by || up >= by + bh) continue;
    for (let x = b.w - 1; x >= 0; x--) if (d[(y * b.w + x) * 4 + 3]) { tip = Math.max(tip, x + 1 - b.ox); break; }
  }
  const far = bx + bw;
  return { tip, far, diff: tip - far, pass: Math.abs(tip - far) <= 4 };
}

// ---------------------------------------------------------------------------------------------- player
const root = $('anim');
if (root) {
  const names = Object.keys(ANIM.surge);
  $('animName').innerHTML = names.map((n) => `<option>${n}</option>`).join('');
  $('animName').value = names.includes(qs.get('anim')) ? qs.get('anim') : 'idle';
  const cv = document.createElement('canvas');
  cv.style.background = '#000';
  cv.style.border = '1px solid var(--edge)';
  root.append(cv);
  const ctx = cv.getContext('2d');

  $('animFighter').value = qs.get('fighter') || 'surge';
  $('animScale').value = qs.get('scale') || '4';
  $('animPlay').checked = qs.get('paused') !== '1';
  $('animJoints').checked = qs.get('joints') === '1';
  $('animFlip').checked = qs.get('flip') === '1';
  $('animBoxes').checked = qs.get('boxes') === '1';
  const pair = qs.get('pair') === '1';
  let tick = 0;
  const forcedFrame = qs.has('frame') ? +qs.get('frame') : null;

  const CELLW = 128, CELLH = 120, FLOOR = 112;
  function render() {
    const scale = +$('animScale').value;
    const ids = pair ? IDS : [$('animFighter').value];
    cv.width = (pair ? 200 : CELLW) * scale; cv.height = CELLH * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#46327a'; ctx.beginPath(); ctx.moveTo(0, (FLOOR + 0.5) * scale); ctx.lineTo(cv.width, (FLOOR + 0.5) * scale); ctx.stroke();
    const info = [];
    ids.forEach((id, i) => {
      const anim = ANIM[id][$('animName').value];
      const fi = forcedFrame ?? frameAt(anim, tick);
      const fr = anim.frames[Math.min(fi, anim.frames.length - 1)];
      const b = tryBake(id, fr.pose);
      if (!b) { info.push(`${id}: MISSING pose ${fr.pose}`); return; }
      const flip = $('animFlip').checked;
      let facing = flip ? -1 : 1;
      let x = CELLW / 2;
      if (pair) { x = i === 0 ? 62 : 138; facing = i === 0 ? 1 : -1; }
      const off = document.createElement('canvas'); off.width = cv.width / scale; off.height = cv.height / scale;
      const octx = off.getContext('2d'); octx.imageSmoothingEnabled = false;
      drawBaked(octx, b, x, FLOOR, facing);
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, cv.width, cv.height);
      if ($('animBoxes').checked && anim.hitbox) {
        const [bx, by, bw, bh] = anim.hitbox;
        const x0 = facing >= 0 ? x + bx : x - bx - bw;
        ctx.strokeStyle = fr.phase === 'active' ? '#ff3b6b' : '#ff3b6b66';
        ctx.strokeRect(x0 * scale + 0.5, (FLOOR - by - bh) * scale + 0.5, bw * scale, bh * scale);
      }
      if ($('animJoints').checked) {
        for (const [name, [jx, jy]] of Object.entries(b.joints)) {
          const wx = facing >= 0 ? x - b.ox + jx : x - b.mox + (b.w - jx);
          const wy = FLOOR - b.oy + jy;
          ctx.fillStyle = name.startsWith('root') ? '#ff00ff' : '#00ffcc';
          ctx.fillRect(Math.round(wx * scale - 2), Math.round(wy * scale - 2), 5, 5);
        }
      }
      const a = auditBaked(FIGHTERS[id], b);
      info.push(`${id}: ${fr.pose}${fr.phase ? ' [' + fr.phase + ']' : ''} height ${b.height}px, feet gap ${b.floorGap}, AA px ${a.aaPixels}, stray colours ${a.strayColours}`);
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
  $('animName').addEventListener('change', () => { tick = 0; });
  $('animSpeed').addEventListener('input', (e) => { $('animSpeedVal').textContent = e.target.value + 'x'; });
  requestAnimationFrame(loop);

  // ------------------------------------------------------------------------------------------ coverage panel
  const cov = $('coverage');
  if (cov) {
    let allOk = true;
    const rows = [];
    for (const name of names) {
      const cells = [];
      let rowOk = true;
      const a0 = ANIM.surge[name];
      for (const id of IDS) {
        const anim = ANIM[id][name];
        let missing = 0, aa = 0, stray = 0, hmin = 1e9, hmax = 0;
        for (const fr of anim.frames) {
          const b = tryBake(id, fr.pose);
          if (!b) { missing++; continue; }
          const au = auditBaked(FIGHTERS[id], b);
          aa += au.aaPixels; stray += au.strayColours; hmin = Math.min(hmin, b.height); hmax = Math.max(hmax, b.height);
        }
        const reach = reachOf(id, anim);
        const ok = !missing && !aa && !stray && (!reach || reach.pass);
        rowOk = rowOk && ok;
        const txt = missing ? `${missing} missing` : `h ${hmin}-${hmax}${aa || stray ? ` AA${aa} stray${stray}` : ''}${reach ? ` reach ${reach.tip}/${reach.far} ${reach.pass ? 'PASS' : 'FAIL'}` : ''}`;
        cells.push(`<td class="${ok ? 'ok' : 'bad'}">${txt}</td>`);
      }
      allOk = allOk && rowOk;
      const sar = a0.sar ? a0.sar.join('/') : '';
      rows.push(`<tr><td>${name}</td><td>${a0.frames.length}</td><td>${animTotal(a0)}</td><td>${sar}</td><td>${a0.loop ? 'loop' : ''}</td>${cells.join('')}</tr>`);
    }
    const lacking = Object.entries(REQUIRED).flatMap(([n, cnt]) => IDS.filter((id) => !ANIM[id][n] || ANIM[id][n].frames.length < cnt).map((id) => `${id}:${n}`));
    allOk = allOk && !lacking.length;
    if (lacking.length) rows.push(...lacking.map((m) => `<tr><td colspan="7" class="bad">MISSING ${m}</td></tr>`));
    cov.innerHTML = `<table><thead><tr><th>animation</th><th>frames</th><th>ticks</th><th>S/A/R</th><th></th><th>surge</th><th>brick</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
    cov.dataset.allOk = String(allOk);
    $('coverageSummary').textContent = allOk ? 'coverage: ALL GREEN' : 'coverage: has failures';
    $('coverageSummary').style.color = allOk ? '#5be37d' : '#ff6b6b';
  }
}

// ---------------------------------------------------------------------------------------------- contact sheet
const contact = $('contact');
if (contact) {
  const m = document.querySelector('main'); m.style.maxWidth = 'none'; m.style.margin = '0';
  const scale = +(qs.get('scale') || 1);
  const ids = qs.get('fighter') ? [qs.get('fighter')] : IDS;
  const only = qs.get('only');                                  // optional regex on animation names
  const CW = 160, CH = 118, FL = 110, LAB = 12, COLS = +(qs.get('cols') || 14);
  for (const id of ids) {
    const items = [];
    const seen = new Set();
    for (const [name, a] of Object.entries(ANIM[id])) {
      if (only && !new RegExp(only).test(name)) continue;
      for (const f of a.frames) if (!seen.has(f.pose)) { seen.add(f.pose); items.push(f.pose); }
    }
    const rows = Math.ceil(items.length / COLS);
    const cv = document.createElement('canvas');
    cv.width = COLS * CW * scale; cv.height = rows * (CH + LAB) * scale;
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    c.fillStyle = '#05030a'; c.fillRect(0, 0, cv.width, cv.height);
    c.font = `${Math.max(9, 5 * scale)}px monospace`;
    items.forEach((pose, i) => {
      const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * (CH + LAB);
      const off = document.createElement('canvas'); off.width = CW; off.height = CH + LAB;
      const o = off.getContext('2d'); o.imageSmoothingEnabled = false;
      o.strokeStyle = '#2a1d4a'; o.strokeRect(0.5, 0.5, CW - 1, CH + LAB - 1);
      o.beginPath(); o.moveTo(0, LAB + FL + 0.5); o.lineTo(CW, LAB + FL + 0.5); o.stroke();
      const b = tryBake(id, pose);
      if (b) { const t = document.createElement('canvas'); t.width = CW; t.height = CH + LAB; drawBaked(t.getContext('2d'), b, 62, LAB + FL, 1); o.drawImage(t, 0, 0); }
      c.drawImage(off, 0, 0, CW, CH + LAB, cx * scale, cy * scale, CW * scale, (CH + LAB) * scale);
      c.fillStyle = b ? '#b9a8f0' : '#ff6b6b';
      c.fillText(b ? pose : 'MISSING ' + pose, (cx + 3) * scale, (cy + 9) * scale);
    });
    const h = document.createElement('div'); h.className = 'cap'; h.textContent = `${id}: ${items.length} poses`;
    contact.append(h, cv);
  }
}

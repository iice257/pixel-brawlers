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

// ---------------------------------------------------------------------------------------------- boxes (GAME_DESIGN 2.2)
const BOXES = {
  stand: { push: [-12, 0, 24, 92], hurt: [[-9, 72, 20, 26], [-14, 34, 28, 40], [-12, 0, 24, 36]] },
  crouch: { push: [-12, 0, 24, 60], hurt: [[-14, 26, 28, 34], [-14, 0, 28, 28]] },
  air: { push: [-10, 16, 20, 60], hurt: [[-13, 18, 26, 66]] },
  lying: { push: null, hurt: [[-30, 0, 60, 16]] },
};
const stateOf = (name, pose) => {
  if (pose?.hips?.v === 'fallen') return 'lying';
  if (pose?.floor === 'body' || /^(jump_|j[LH][PK]$)/.test(name)) return 'air';
  if (pose?.torso?.v === 'crouch' || /^(crouch_|block_crouch|2)/.test(name)) return 'crouch';
  return 'stand';
};

// ---------------------------------------------------------------------------------------------- tuner model
const FIELDS = ['torso.r', 'hips.r', 'head.r', 'armF.s', 'armF.e', 'armF.w', 'armB.s', 'armB.e', 'armB.w', 'legF.h', 'legF.k', 'legF.fr', 'legB.h', 'legB.k', 'legB.fr'];
const JOINT_FIELD = { root: 'hips.r', neck: 'head.r', shoulderF: 'armF.s', shoulderB: 'armB.s', elbowF: 'armF.e', elbowB: 'armB.e', wristF: 'armF.w', wristB: 'armB.w',
  hipF: 'legF.h', hipB: 'legB.h', kneeF: 'legF.k', kneeB: 'legB.k', ankleF: 'legF.fr', ankleB: 'legB.fr' };
const VARIANTS = {
  Digit1: ['head', 'v', ['neutral', 'hit', 'ko']],
  Digit2: ['torso', 'v', ['stand', 'crouch', 'lean', 'lean_back', 'fallen']],
  Digit3: ['armF', 'hand', ['fist', 'open', 'guard']],
  Digit4: ['armB', 'hand', ['fist', 'open', 'guard']],
  Digit5: ['legF', 'foot', ['flat', 'toe', 'kick']],
  Digit6: ['legB', 'foot', ['flat', 'toe', 'kick']],
  Digit7: ['hips', 'v', [undefined, 'fallen']],
};
const getF = (pose, f) => { const [g, k] = f.split('.'); return pose[g]?.[k] ?? 0; };
const setF = (pose, f, v) => { const [g, k] = f.split('.'); pose[g] = { ...(pose[g] ?? {}), [k]: v }; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const poseLiteral = (name, pose) => `L.${name} = ${JSON.stringify(pose)};`;

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

  $('animFighter').value = IDS.includes(qs.get('fighter')) ? qs.get('fighter') : 'surge';
  $('animScale').value = qs.get('scale') || '4';
  $('animPlay').checked = qs.get('paused') !== '1';
  $('animJoints').checked = qs.get('joints') === '1';
  $('animFlip').checked = qs.get('flip') === '1';
  $('animBoxes').checked = qs.get('boxes') === '1';
  $('animOnion').checked = qs.get('onion') === '1';
  $('animLoop').checked = qs.has('loop') ? qs.get('loop') === '1' : !!ANIM.surge[$('animName').value].loop;
  const pair = qs.get('pair') === '1';
  let tick = qs.has('tick') ? +qs.get('tick') : 0;
  const forcedFrame = qs.has('frame') ? +qs.get('frame') : null;

  // -- tuner state
  const tuner = { pose: null, name: '', field: 'armF.s' };
  $('tunerField').innerHTML = FIELDS.map((f) => `<option>${f}</option>`).join('');
  $('tunerField').value = tuner.field;
  const fillTunerPoses = () => { $('tunerPose').innerHTML = Object.keys(LIBS[$('animFighter').value]).map((n) => `<option>${n}</option>`).join(''); };
  const updateJson = () => {
    $('tunerJson').value = tuner.pose ? poseLiteral(tuner.name, tuner.pose) : '';
    $('tunerInfo').textContent = tuner.pose ? `${tuner.name}: ${tuner.field} = ${getF(tuner.pose, tuner.field)}` : '';
  };
  const loadTunerPose = (name) => {
    const f = $('animFighter').value;
    if (!LIBS[f][name]) return;
    tuner.name = name; tuner.pose = clone(LIBS[f][name]); $('tunerPose').value = name; updateJson();
  };
  const tunerActive = () => $('tunerOn').checked && !pair && tuner.pose;
  fillTunerPoses();
  $('tunerOn').checked = qs.get('tuner') === '1' || qs.has('pose');

  const frameIdx = (a, t) => {
    if (forcedFrame !== null) return forcedFrame;
    const total = animTotal(a);
    t = $('animLoop').checked ? t % total : Math.min(t, total - 1);
    let acc = 0;
    for (let i = 0; i < a.frames.length; i++) { acc += a.frames[i].ticks; if (t < acc) return i; }
    return a.frames.length - 1;
  };
  const currentPoseName = () => {
    const a = ANIM[$('animFighter').value][$('animName').value];
    return a.frames[Math.min(frameIdx(a, tick), a.frames.length - 1)].pose;
  };
  const maxTotal = () => (pair ? IDS : [$('animFighter').value]).reduce((m, id) => Math.max(m, animTotal(ANIM[id][$('animName').value])), 1);
  const syncScrub = () => { $('animScrub').max = String(maxTotal() - 1); };

  const CELLW = 168, CELLH = 120, FLOOR = 112;
  const dots = [];   // joint dots on screen (single view), for tuner clicks
  function render() {
    const scale = +$('animScale').value;
    const ids = pair ? IDS : [$('animFighter').value];
    cv.width = (pair ? 200 : CELLW) * scale; cv.height = CELLH * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#46327a'; ctx.beginPath(); ctx.moveTo(0, (FLOOR + 0.5) * scale); ctx.lineTo(cv.width, (FLOOR + 0.5) * scale); ctx.stroke();
    const info = [];
    dots.length = 0;
    const tunerOn = tunerActive();
    ids.forEach((id, i) => {
      const anim = ANIM[id][$('animName').value];
      const fi = frameIdx(anim, tick);
      const fr = anim.frames[Math.min(fi, anim.frames.length - 1)];
      const poseObj = tunerOn ? tuner.pose : null;
      const b = poseObj ? bakePose(FIGHTERS[id], poseObj) : tryBake(id, fr.pose);
      if (!b) { info.push(`${id}: MISSING pose ${fr.pose}`); return; }
      const flip = $('animFlip').checked;
      let facing = flip ? -1 : 1;
      let x = 72;
      if (pair) { x = i === 0 ? 62 : 138; facing = i === 0 ? 1 : -1; }
      const off = document.createElement('canvas'); off.width = cv.width / scale; off.height = cv.height / scale;
      const octx = off.getContext('2d'); octx.imageSmoothingEnabled = false;
      if ($('animOnion').checked && !poseObj) {                 // previous / next pose of this animation at 30%
        octx.globalAlpha = 0.3;
        for (const j of [fi - 1, fi + 1]) {
          const nf = anim.frames[j];
          const nb = nf && tryBake(id, nf.pose);
          if (nb) drawBaked(octx, nb, x, FLOOR, facing);
        }
        octx.globalAlpha = 1;
      }
      drawBaked(octx, b, x, FLOOR, facing);
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, cv.width, cv.height);
      if ($('animBoxes').checked) {
        const box = (arr, color, fill) => {
          if (!arr) return;
          const [bx, by, bw, bh] = arr;
          const x0 = facing >= 0 ? x + bx : x - bx - bw;
          ctx.strokeStyle = color; ctx.lineWidth = 1;
          ctx.strokeRect(x0 * scale + 0.5, (FLOOR - by - bh) * scale + 0.5, bw * scale, bh * scale);
          if (fill) { ctx.fillStyle = fill; ctx.fillRect(x0 * scale + 1, (FLOOR - by - bh) * scale + 1, bw * scale - 1, bh * scale - 1); }
        };
        const st = BOXES[stateOf($('animName').value, poseObj ?? LIBS[id][fr.pose])];
        box(st.push, '#4a8bff');
        for (const h of st.hurt) box(h, '#3be07a');
        if (anim.hitbox && !poseObj) {
          const active = fr.phase === 'active';
          if (anim.prefix === 'throw') box([0, 0, anim.hitbox[0] + anim.hitbox[2], 80], active ? '#ffd23b' : '#ffd23b66');
          else box(anim.hitbox, active ? '#ff3b6b' : '#ff3b6b66', active ? '#ff3b6b33' : null);
        }
      }
      if ($('animJoints').checked || tunerOn) {
        for (const [name, [jx, jy]] of Object.entries(b.joints)) {
          const wx = facing >= 0 ? x - b.ox + jx : x - b.mox + (b.w - jx);
          const wy = FLOOR - b.oy + jy;
          const hot = tunerOn && JOINT_FIELD[name] === tuner.field;
          ctx.fillStyle = hot ? '#ffcf33' : name.startsWith('root') ? '#ff00ff' : '#00ffcc';
          ctx.fillRect(Math.round(wx * scale - 2), Math.round(wy * scale - 2), 5, 5);
          if (tunerOn) dots.push([wx * scale, wy * scale, name]);
        }
      }
      const a = auditBaked(FIGHTERS[id], b);
      info.push(`${id}: ${poseObj ? tuner.name + ' (tuner)' : fr.pose}${fr.phase && !poseObj ? ' [' + fr.phase + ']' : ''} height ${b.height}px, feet gap ${b.floorGap}, AA px ${a.aaPixels}, stray colours ${a.strayColours}`);
    });
    $('animInfo').textContent = info.join(' | ');
    $('animTick').textContent = `${Math.min(tick, maxTotal() - 1)}/${maxTotal() - 1}  f${frameIdx(ANIM[ids[0]][$('animName').value], tick)}`;
    window.__anim = { info };
  }
  let last = performance.now(), acc = 0;
  function loop(t) {
    const dt = (t - last) / 1000; last = t;
    if ($('animPlay').checked && forcedFrame === null) {
      acc += dt * 60 * +$('animSpeed').value;
      while (acc >= 1) { tick++; acc -= 1; }
      const total = maxTotal();
      if ($('animLoop').checked) tick %= total; else tick = Math.min(tick, total - 1);
    }
    if (document.activeElement !== $('animScrub')) $('animScrub').value = String(Math.min(tick, maxTotal() - 1));
    render();
    requestAnimationFrame(loop);
  }
  const onAnimChange = () => {
    tick = 0; syncScrub();
    $('animLoop').checked = !!ANIM[$('animFighter').value][$('animName').value].loop;
    if ($('tunerOn').checked) loadTunerPose(currentPoseName());
  };
  $('animName').addEventListener('change', onAnimChange);
  $('animFighter').addEventListener('change', () => { fillTunerPoses(); onAnimChange(); });
  $('animSpeed').addEventListener('input', (e) => { $('animSpeedVal').textContent = e.target.value + 'x'; });
  $('animScrub').addEventListener('input', (e) => { tick = +e.target.value; $('animPlay').checked = false; });
  syncScrub();

  // -- tuner wiring
  $('tunerOn').addEventListener('change', () => { if ($('tunerOn').checked) loadTunerPose(tuner.name || currentPoseName()); });
  $('tunerPose').addEventListener('change', () => loadTunerPose($('tunerPose').value));
  $('tunerField').addEventListener('change', () => { tuner.field = $('tunerField').value; updateJson(); });
  const nudge = (d) => { if (!tuner.pose) return; setF(tuner.pose, tuner.field, getF(tuner.pose, tuner.field) + d); updateJson(); };
  $('tunerMinus').addEventListener('click', () => nudge(-15));
  $('tunerPlus').addEventListener('click', () => nudge(15));
  $('tunerReset').addEventListener('click', () => loadTunerPose(tuner.name));
  $('tunerCopy').addEventListener('click', async () => {
    const text = $('tunerJson').value;
    try { await navigator.clipboard.writeText(text); }
    catch { $('tunerJson').select(); document.execCommand('copy'); }
    $('tunerCopy').textContent = 'copied';
    setTimeout(() => { $('tunerCopy').textContent = 'copy pose JSON'; }, 1200);
  });
  cv.addEventListener('click', (e) => {
    if (!tunerActive()) return;
    const r = cv.getBoundingClientRect(), k = cv.width / r.width;
    const mx = (e.clientX - r.left) * k, my = (e.clientY - r.top) * k;
    let best = null, bd = 1e9;
    for (const [jx, jy, name] of dots) { const d = Math.hypot(jx - mx, jy - my); if (d < bd) { bd = d; best = name; } }
    if (best && bd < 12 * +$('animScale').value) { tuner.field = JOINT_FIELD[best]; $('tunerField').value = tuner.field; updateJson(); }
  });
  document.addEventListener('keydown', (e) => {
    if (!tunerActive()) return;
    if (/^(TEXTAREA|SELECT)$/.test(e.target.tagName) || (e.target.tagName === 'INPUT' && e.target.type === 'text')) return;
    const P = tuner.pose;
    let used = true;
    if (e.key === '[') nudge(-15);
    else if (e.key === ']') nudge(15);
    else if (e.key === 'ArrowLeft') P.root = [(P.root?.[0] ?? 0) - 1, P.root?.[1] ?? 0];
    else if (e.key === 'ArrowRight') P.root = [(P.root?.[0] ?? 0) + 1, P.root?.[1] ?? 0];
    else if (e.key === 'ArrowUp') P.root = [P.root?.[0] ?? 0, (P.root?.[1] ?? 0) - 1];
    else if (e.key === 'ArrowDown') P.root = [P.root?.[0] ?? 0, (P.root?.[1] ?? 0) + 1];
    else if (e.key === 'r') loadTunerPose(tuner.name);
    else if (VARIANTS[e.code]) {
      const [g, k, list] = VARIANTS[e.code];
      const cur = list.indexOf(P[g]?.[k]);
      const next = list[(cur + (e.shiftKey ? list.length - 1 : 1) + list.length) % list.length];
      P[g] = { ...(P[g] ?? {}) };
      if (next === undefined) delete P[g][k]; else P[g][k] = next;
    } else used = false;
    if (used) { e.preventDefault(); updateJson(); }
  });
  if ($('tunerOn').checked) loadTunerPose(qs.get('pose') || currentPoseName());
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
      rows.push(`<tr><td>${name}</td><td>${a0.frames.length}</td><td>${animTotal(a0)}</td><td>${animTotal(ANIM.brick[name])}</td><td>${sar}</td><td>${a0.loop ? 'loop' : ''}</td>${cells.join('')}</tr>`);
    }
    const lacking = Object.entries(REQUIRED).flatMap(([n, cnt]) => IDS.filter((id) => !ANIM[id][n] || ANIM[id][n].frames.length < cnt).map((id) => `${id}:${n}`));
    allOk = allOk && !lacking.length;
    if (lacking.length) rows.push(...lacking.map((m) => `<tr><td colspan="8" class="bad">MISSING ${m}</td></tr>`));
    cov.innerHTML = `<table><thead><tr><th>animation</th><th>frames</th><th>ticks surge</th><th>ticks brick</th><th>S/A/R</th><th></th><th>surge</th><th>brick</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
    cov.dataset.allOk = String(allOk);
    $('coverageSummary').textContent = allOk ? 'coverage: ALL GREEN' : 'coverage: has failures';
    $('coverageSummary').style.color = allOk ? '#5be37d' : '#ff6b6b';
  }
}

// ---------------------------------------------------------------------------------------------- contact sheet
const contact = $('contact');
const sheets = [];
if (contact) {
  const m = document.querySelector('main'); m.style.maxWidth = 'none'; m.style.margin = '0';
  const scale = +(qs.get('scale') || 1);
  const ids = IDS.includes(qs.get('fighter')) ? [qs.get('fighter')] : IDS;
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
    sheets.push({ title: h.textContent, cv });
  }
  // Export: stack every sheet (with its caption) into one PNG; the data URL is also left in #sheetData for headless saves.
  const exportSheet = () => {
    const LABH = 16, W = Math.max(...sheets.map((x) => x.cv.width)), H = sheets.reduce((n, x) => n + LABH + x.cv.height, 0);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const c = out.getContext('2d'); c.fillStyle = '#05030a'; c.fillRect(0, 0, W, H);
    c.font = '12px monospace'; c.fillStyle = '#ffcf33';
    let y = 0;
    for (const x of sheets) { c.fillText(x.title, 4, y + 12); c.drawImage(x.cv, 0, y + LABH); y += LABH + x.cv.height; }
    const url = out.toDataURL('image/png');
    const ta = $('sheetData'); if (ta) { ta.value = url; ta.textContent = url; }
    if (qs.get('save') !== '0') { const a = document.createElement('a'); a.href = url; a.download = qs.get('name') || 'contact-sheet.png'; a.click(); }
    return url;
  };
  $('sheetExport')?.addEventListener('click', exportSheet);
  if (qs.get('export') === '1') exportSheet();
}

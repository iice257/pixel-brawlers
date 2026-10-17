// New-engine fight scene (reached at /?new=1). Reads the pure world and draws baked sprites at integer positions.
// Controls: P1 WASD + J K U I + L, P2 arrows + . / ; ' + , (P2 is a standing dummy with ?dummy=1; P1 then reads both layouts).
// F2 = box overlay, F3 = FPS / state panel, R = reset positions.
import { W, H, FLOOR_Y, STAGE_W } from '../config2.js';
import { createInput } from '../core/input.js';
import { createLoop } from '../core/loop.js';
import { createWorld, step } from '../engine/world.js';
import { boxesOf } from '../engine/fighter.js';
import { camPos } from '../engine/camera.js';
import { createHud, tickHud, drawHud } from './hud.js';
import { BTN } from '../core/buffer.js';
import { buildPalette } from '../gfx/palette.js';
import { bakePose, drawBaked } from '../gfx/baker.js';
import { poseLibrary } from '../gfx/poses.js';
import { animsFor, frameAt } from '../data/anims.js';
import * as surge from '../data/fighters/surge.js';
import * as brick from '../data/fighters/brick.js';

const MODS = { surge, brick };
const NEUTRAL = { left: false, right: false, up: false, down: false, buttons: 0 };
const BOX_COLORS = { push: '#4da3ff', hurt: '#41e07a', hit: '#ff4d4d', throw: '#ffd84a' };

// ---------------------------------------------------------------------------------------------- sprites
const sprites = {};
function spriteSet(id) {
  return sprites[id] ??= {
    fighter: { id, parts: MODS[id].parts, pivots: MODS[id].pivots, palette: buildPalette(MODS[id].palette) },
    lib: poseLibrary(id), anims: animsFor(id), baked: new Map(),
  };
}
function baked(id, poseName) {
  const s = spriteSet(id);
  let b = s.baked.get(poseName);
  if (!b) { b = bakePose(s.fighter, s.lib[poseName]); s.baked.set(poseName, b); }
  return b;
}
const LOCO = ['idle', 'walk_f', 'walk_b', 'crouch_in', 'crouch_hold', 'crouch_out', 'jump_prep', 'jump_rise', 'jump_apex', 'jump_fall', 'jump_land', 'jump_f', 'jump_b', 'dash_f', 'dash_b'];
// Idle is baked up front; the rest is baked in ~6 ms slices after each frame so boot is instant (anything not ready yet bakes on demand).
function prebake(ids) {
  const queue = [];
  const seen = new Set();
  const add = (id, names) => { const a = spriteSet(id).anims; for (const n of names) for (const fr of a[n].frames) if (!seen.has(id + fr.pose)) { seen.add(id + fr.pose); queue.push([id, fr.pose]); } };
  const normals = ['LP', 'HP', 'LK', 'HK', '2LP', '2HP', '2LK', '2HK', 'jLP', 'jHP', 'jLK', 'jHK', 'throw'];
  const reactions = ['block_stand_in', 'block_stand_hold', 'block_crouch_in', 'block_crouch_hold', 'hit_high', 'hit_low', 'hit_body', 'hit_air', 'thrown', 'knockdown', 'lying', 'getup', 'ko'];
  for (const names of [LOCO, normals, reactions]) for (const id of ids) add(id, names);   // priority: idle/walk/jump, normals, reactions, then the rest (intro, win...)
  for (const id of ids) add(id, Object.keys(spriteSet(id).anims));
  const stats = { total: queue.length, done: 0 };
  const slice = () => {
    const end = performance.now() + 6;
    while (queue.length && performance.now() < end) { const [id, p] = queue.shift(); baked(id, p); stats.done++; }
    if (queue.length) requestAnimationFrame(slice);
  };
  for (const id of ids) baked(id, spriteSet(id).anims.idle.frames[0].pose);
  requestAnimationFrame(slice);
  return stats;
}
const poseOf = (f) => { const a = spriteSet(f.id).anims[f.anim]; return a.frames[frameAt(a, f.at)].pose; };

// ---------------------------------------------------------------------------------------------- placeholder stage
// Dark gradient (hard bands), two parallax skylines, a floor with tile seams: enough to see the camera move.
const hash = (n) => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); return (n ^ (n >>> 16)) >>> 0; };
const SKY = ['#0b0820', '#0e0a28', '#120d30', '#170f37', '#1c123d', '#221543', '#29184a', '#301b50', '#381f55', '#40235a', '#48275d', '#4f2b5f'];
function skyline(ctx, camX, lift, parallax, baseY, minH, maxH, color, windows) {
  const seg = 28;
  const first = Math.floor((camX * parallax) / seg) - 1;
  for (let i = first; i < first + Math.ceil(W / seg) + 3; i++) {
    const h = minH + (hash(i * 31 + parallax * 1000) % (maxH - minH)), x = i * seg - Math.round(camX * parallax);
    const bw = 20 + (hash(i * 17 + 5) % 8);
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY + lift - h, bw, h);
    if (windows) {
      ctx.fillStyle = '#ffcf6a';
      for (let wy = 0; wy < h - 6; wy += 8) for (let wx = 3; wx < bw - 4; wx += 6) if (hash(i * 131 + wy * 7 + wx) % 5 === 0) ctx.fillRect(x + wx, baseY + lift - h + 4 + wy, 2, 3);
    }
  }
}
function drawStage(ctx, cam) {
  const lift = cam.lift, camX = cam.x;
  const bandH = Math.ceil((FLOOR_Y + 20) / SKY.length);
  for (let i = 0; i < SKY.length; i++) { ctx.fillStyle = SKY[i]; ctx.fillRect(0, i * bandH - 16 + lift, W, bandH + 17); }
  skyline(ctx, camX, lift, 0.25, FLOOR_Y - 34, 40, 96, '#1a1038', false);
  skyline(ctx, camX, lift, 0.5, FLOOR_Y - 8, 26, 70, '#120a2a', true);
  // floor
  const top = FLOOR_Y + lift;
  ctx.fillStyle = '#2a1a44'; ctx.fillRect(0, top, W, H - top + 20);
  ctx.fillStyle = '#4a3070'; ctx.fillRect(0, top, W, 2);
  ctx.fillStyle = '#1d1233'; ctx.fillRect(0, top + 2, W, 3);
  for (let x = -((camX % 48) + 48) % 48; x < W + 48; x += 48) {           // vertical tile seams scroll 1:1 with the world
    ctx.fillStyle = '#1d1233'; ctx.fillRect(x, top + 5, 2, H);
    ctx.fillStyle = '#34225a'; ctx.fillRect(x + 2, top + 5, 1, H);
  }
  ctx.fillStyle = '#1d1233'; ctx.fillRect(0, top + 14, W, 2);
  // stage edges: posts at the clamp limits so the walls read
  for (const wx of [0, STAGE_W]) {
    const sx = wx - Math.round(camX);
    if (sx > -12 && sx < W + 12) { ctx.fillStyle = '#ffcf33'; ctx.fillRect(sx - 1, top - 6, 2, 6); }
  }
}

// ---------------------------------------------------------------------------------------------- fighters + overlays
function drawShadow(ctx, f, sx, floorSy) {
  const w = Math.max(10, Math.round(30 - f.y / 4));
  ctx.fillStyle = '#0a0614';
  ctx.fillRect(Math.round(sx - w / 2), floorSy - 1, w, 3);
  ctx.fillRect(Math.round(sx - w / 2) + 2, floorSy - 2, w - 4, 5);
}
function drawFighter(ctx, f, cam) {
  const sx = f.x - cam.x, floorSy = FLOOR_Y + cam.lift;
  drawShadow(ctx, f, sx, floorSy);
  drawBaked(ctx, baked(f.id, poseOf(f)), sx, floorSy - Math.round(f.y), f.facing);
}
function drawBoxes(ctx, world, cam) {
  const rect = (b, color) => {
    const x = Math.round(b[0] - cam.x), y = Math.round(FLOOR_Y + cam.lift - (b[1] + b[3]));
    ctx.fillStyle = color + '33'; ctx.fillRect(x, y, b[2], b[3]);
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, b[2] - 1, b[3] - 1);
  };
  for (const f of world.fighters) {
    const bx = boxesOf(f);
    if (bx.push) rect(bx.push, BOX_COLORS.push);
    bx.hurt.forEach((b) => rect(b, BOX_COLORS.hurt));
    bx.hit.forEach((b) => rect(b, BOX_COLORS.hit));
    bx.throw.forEach((b) => rect(b, BOX_COLORS.throw));
    const x = Math.round(f.x - cam.x), y = Math.round(FLOOR_Y + cam.lift - f.y);       // feet origin marker
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x - 1, y, 3, 1);
  }
  ctx.font = '8px "Press Start 2P", monospace'; ctx.textBaseline = 'top';
  [['push', 4], ['hurt', 46], ['hit', 88], ['throw', 124]].forEach(([k, x]) => {
    ctx.fillStyle = BOX_COLORS[k]; ctx.fillRect(x, H - 12, 6, 6);
    ctx.fillStyle = '#e9ebff'; ctx.fillText(k, x + 9, H - 13);
  });
}
function drawPanel(ctx, world, stats, input) {
  ctx.fillStyle = 'rgba(8, 6, 20, 0.78)'; ctx.fillRect(2, 2, 252, 80);
  ctx.font = '8px "Press Start 2P", monospace'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffcf33';
  ctx.fillText(`${stats.fps} FPS  TICK ${world.tick}  STEPS ${stats.steps}`, 6, 6);
  world.fighters.forEach((f, i) => {
    const y = 20 + i * 28;
    ctx.fillStyle = i ? '#ff9a64' : '#35e0ff';
    ctx.fillText(`P${i + 1} ${f.id.toUpperCase()} ${f.state}${f.inv ? ' INV' : ''}`, 6, y);
    ctx.fillStyle = '#e9ebff';
    ctx.fillText(`x${f.x.toFixed(1)} y${f.y.toFixed(1)} vx${f.vx.toFixed(1)} d${f.buf.dir}`, 6, y + 10);
    ctx.fillText(`${f.anim} ${f.at}  cam ${camPos(world.camera).x}`, 6, y + 20);
  });
}

// ---------------------------------------------------------------------------------------------- boot
export function boot(canvas, params = new URLSearchParams(location.search)) {
  const ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;
  const fit = () => {
    const stage = document.getElementById('stage');
    const availW = stage.clientWidth;
    const availH = window.innerHeight - stage.getBoundingClientRect().top - 24;
    const raw = Math.min(availW / W, availH / H);
    const scale = raw >= 1 ? Math.floor(raw) : raw;
    canvas.style.width = `${Math.round(W * scale)}px`;
    canvas.style.height = `${Math.round(H * scale)}px`;
  };
  addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);
  const hint = document.querySelector('.hint');
  if (hint) hint.innerHTML = '<b>P1</b> WASD move · J K U I attack · L block &nbsp;|&nbsp; <b>P2</b> arrows · . / ; \' · , &nbsp;|&nbsp; <b>F2</b> boxes · <b>F3</b> stats · <b>R</b> restart · <b>F</b> fullscreen';
  document.title = 'Pixel Brawlers (new engine)';

  const p1 = MODS[params.get('p1')] ? params.get('p1') : 'surge';
  const p2 = MODS[params.get('p2')] ? params.get('p2') : 'brick';
  const dummy = params.get('dummy') === '1';
  // ?match=0 (or any ?shot=) runs the bare sandbox sim; otherwise a full match: ?rounds=1|3|5 (default 3)
  const rounds = [1, 3, 5].includes(+params.get('rounds')) ? +params.get('rounds') : 3;
  const sandbox = params.get('match') === '0' || (params.has('shot') && !['hud', 'ko', 'over'].includes(params.get('shot')));
  const newWorld = () => createWorld({ p1, p2, seed: 1, match: sandbox ? false : rounds });
  let world = newWorld();
  const hud = createHud();
  const input = createInput();
  let showBoxes = params.get('boxes') === '1', showPanel = params.get('panel') === '1';

  const t0 = performance.now();
  const bakeStats = prebake([p1, p2]);
  const bakeMs = Math.round(performance.now() - t0);

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'F2') showBoxes = !showBoxes;
    else if (e.code === 'F3') showPanel = !showPanel;
    else if (e.code === 'KeyR') { world = newWorld(); Object.assign(hud, createHud()); }
    else if (e.code === 'Enter' && world.match?.phase === 'over') { world = newWorld(); Object.assign(hud, createHud()); }   // temp menu: result screen -> fresh match
    else if (e.code === 'KeyF') { if (document.fullscreenElement) document.exitFullscreen(); else canvas.parentElement.requestFullscreen?.(); }
  });

  let frozen = false;
  const tickFn = () => {
    if (frozen) return;
    input.poll();
    step(world, [input.read(0, { solo: dummy }), dummy ? NEUTRAL : input.read(1)]);
    tickHud(hud, world);
  };
  const render = () => {
    ctx.imageSmoothingEnabled = false;
    const cam = camPos(world.camera);
    drawStage(ctx, cam);
    // the fighter that acted last draws in front: for now P1 behind P2 unless P1 is airborne
    const order = world.fighters[0].y > 0 || world.fighters[0].state !== 'idle' ? [1, 0] : [0, 1];
    for (const i of order) drawFighter(ctx, world.fighters[i], cam);
    drawHud(ctx, hud, world);
    if (showBoxes) drawBoxes(ctx, world, cam);
    if (showPanel) drawPanel(ctx, world, loop.stats, input);
  };
  const loop = createLoop({ step: tickFn, render });
  if (params.get('shot') === 'loco') {   // QA still: SURGE jumps forward over a crouching BRICK, then the sim freezes
    const N = NEUTRAL, dn = { ...N, down: true };
    for (let i = 0; i < 20; i++) step(world, [{ ...N, right: true }, dn]);
    for (let i = 0; i < 3; i++) step(world, [{ ...N, right: true, up: true }, dn]);
    for (let i = 0; i < 14; i++) step(world, [{ ...N, right: true }, dn]);
    frozen = true;
  }
  if (params.get('shot') === 'hit') {    // QA still: SURGE's HP connects on BRICK (hitbox on its first active tick, hitstop frozen)
    world.fighters[0].x = 268; world.fighters[1].x = 316;
    for (let i = 0; i < 40 && world.fighters[1].state !== 'hit'; i++) { step(world, [i === 0 ? { ...NEUTRAL, buttons: BTN.HP } : NEUTRAL, NEUTRAL]); tickHud(hud, world); }
    for (let i = 0; i < 40; i++) tickHud(hud, world);
    frozen = true;
  }
  if (params.get('shot') === 'throw') {  // QA still: SURGE has BRICK lifted mid-throw; the sim freezes with the throw hold on screen
    world.fighters[0].x = 268; world.fighters[1].x = 312;
    const both = { ...NEUTRAL, buttons: BTN.LP | BTN.LK };
    for (let i = 0; i < 40 && !(world.thr && world.thr.t >= 8); i++) { step(world, [i === 0 ? both : NEUTRAL, NEUTRAL]); tickHud(hud, world); }
    for (let i = 0; i < 40; i++) tickHud(hud, world);
    frozen = true;
  }
  // QA stills of the HUD: shot=hud (FIGHT! in round 2, P1 up a round), shot=ko (K.O. slow-mo), shot=over (result screen)
  const toFight = () => { for (let i = 0; i < 400 && world.match.phase !== 'fight'; i++) { step(world, [NEUTRAL, NEUTRAL]); tickHud(hud, world); } };
  if (['hud', 'ko', 'over'].includes(params.get('shot'))) {
    toFight();
    if (params.get('shot') === 'hud') {
      world.match.round = 2; world.match.wins = [1, 0]; world.match.timer = 72;
      world.fighters[1].hp = Math.round(world.fighters[1].hp * 0.62); world.fighters[0].hp = Math.round(world.fighters[0].hp * 0.88);
      for (let i = 0; i < 30; i++) tickHud(hud, world);
      hud.lag[1] = 0.8; hud.lag[0] = 0.95;
      world.match.t = 5;
    } else {
      world.fighters[0].x = 268; world.fighters[1].x = 308; world.fighters[1].hp = 4;
      if (params.get('shot') === 'over') world.match.wins = [1, 0];   // P1 takes the 2nd round -> match over
      for (let i = 0; i < 80 && world.match.phase !== 'ko'; i++) { step(world, [i === 0 ? { ...NEUTRAL, buttons: BTN.HP } : NEUTRAL, NEUTRAL]); tickHud(hud, world); }
      if (params.get('shot') === 'ko') for (let i = 0; i < 40; i++) { step(world, [NEUTRAL, NEUTRAL]); tickHud(hud, world); }
      else { for (let i = 0; i < 400 && world.match.phase !== 'over'; i++) { step(world, [NEUTRAL, NEUTRAL]); tickHud(hud, world); } world.match.t = 20; }
    }
    frozen = true;
  }
  window.__game = { get world() { return world; }, input, loop, bakeMs, bakeStats };
  window.__debug = {
    boxes(on = !showBoxes) { showBoxes = on; },
    panel(on = !showPanel) { showPanel = on; },
    place(p, x, y = 0) { world.fighters[p].x = x; world.fighters[p].y = y; },
    reset() { world = newWorld(); },
    setHP(p, n) { world.fighters[p].hp = n; },
    setTimer(n) { if (world.match) { world.match.timer = n; world.match.tt = 0; } },
    setMeter(p, n) { world.fighters[p].meter = n; },
    forceKO(p) {   // KO fighter p as if a final hit landed: HP 0 and the KO fall; the match flow picks it up on the next tick
      const f = world.fighters[p];
      f.hp = 0; f.ko = true; f.state = 'launched'; f.st = 0; f.kd = 'hard'; f.vx = -f.facing * 2.4; f.vy = 4.5; f.y = Math.max(f.y, 1);
    },
    stepN(n, a = NEUTRAL, b = NEUTRAL) { for (let i = 0; i < n; i++) step(world, [a, b]); render(); },
  };
  fit();
  render();
  loop.start();
  return window.__game;
}

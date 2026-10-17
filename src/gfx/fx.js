// Hit FX (STAGES_AND_FX 5): pooled procedural pixel effects. Browser-side and visual only: the sim never reads it.
// The engine hands over pure-data events (world.events: {type:'hit'|'ko', x, y, level, dmg, block, heavy, to, dir}); everything else
// (dust, afterimages, tints) is derived here from fighter state changes. Nothing is allocated per tick or per frame: the effect pool,
// the afterimage rings and the shake state are fixed at creation.
import { FLOOR_Y, W, H } from '../config2.js';

export const FX_OPTIONS = { shake: 'full', flash: true, particles: true };   // shake: 'off' | 'low' (50%) | 'full'; the settings UI edits this later
const POOL = 128, GHOSTS = 3;
const KINDS = { spark_light: 4, spark_heavy: 8, block: 5, ko_star: 18, ko_ring: 18, spk: 8, shard: 5, puff: 15, cloud: 18 };
const SHADES_PUFF = ['#d9d2e8', '#b8b0c8', '#8a82a0'];
const GHOST_ALPHA = [0.3, 0.5, 0.7];                       // oldest .. newest
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const DASH = new Set(['dash_f', 'dash_b']);
const WALK = new Set(['walk_f', 'walk_b']);

export function createFx() {
  const pool = Array.from({ length: POOL }, () => ({ on: false, kind: '', x: 0, y: 0, vx: 0, vy: 0, t: 0, dur: 0, dir: 1, a: 0, b: 0 }));
  const fx = {
    pool, next: 0, rng: 0x2545f491,
    shake: { amp: 0, ticks: 0, total: 0, x: 0, y: 0 },
    flash: 0, flashMax: 1,
    tint: [{ white: 0, red: 0 }, { white: 0, red: 0 }],
    prev: [{ state: 'idle', y: 0 }, { state: 'idle', y: 0 }],
    ghosts: [0, 1].map(() => Array.from({ length: GHOSTS }, () => ({ on: false, x: 0, y: 0, facing: 1, id: '', anim: '', at: 0, ttl: 0 }))),
    ghostRing: [0, 0],
    options: FX_OPTIONS,
    stats: { spawned: 0, active: 0 },
  };
  return fx;
}

const rnd = (fx) => { let s = fx.rng; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; fx.rng = s >>> 0; return fx.rng / 4294967296; };

function spawn(fx, kind, x, y, props = null) {
  if (!fx.options.particles && (kind === 'puff' || kind === 'cloud' || kind === 'spk' || kind === 'shard')) return null;
  let p = null;
  for (let i = 0; i < POOL; i++) { const c = fx.pool[(fx.next + i) % POOL]; if (!c.on) { p = c; fx.next = (fx.next + i + 1) % POOL; break; } }
  if (!p) { p = fx.pool[fx.next]; fx.next = (fx.next + 1) % POOL; }          // pool full: recycle the oldest slot
  p.on = true; p.kind = kind; p.x = x; p.y = y; p.t = 0; p.dur = KINDS[kind]; p.vx = 0; p.vy = 0; p.dir = 1; p.a = 0; p.b = 0;
  if (props) Object.assign(p, props);
  fx.stats.spawned++;
  return p;
}

function addShake(fx, amp, ticks) {
  const m = fx.options.shake === 'off' ? 0 : fx.options.shake === 'low' ? 0.5 : 1;
  const a = amp * m;
  if (a <= 0) return;
  const s = fx.shake;
  if (a >= s.amp * (s.total ? s.ticks / s.total : 0)) { s.amp = a; s.ticks = s.total = ticks; }
}

export const shakeAmp = (dmg, block) => (block ? 1 : clamp(dmg / 12, 1, 6));
export const shakeTicks = (dmg, block) => (block ? 2 : Math.max(2, Math.round(dmg / 6)));

function hitEvent(fx, e) {
  const dir = e.dir || 1;
  if (e.block) {
    spawn(fx, 'block', e.x, e.y);
    for (let i = 0; i < 3; i++) spawn(fx, 'shard', e.x, e.y + (i - 1) * 3, { vx: dir * (1.2 + rnd(fx)), vy: (rnd(fx) - 0.3) * 1.2, dir });
  } else if (e.heavy) {
    spawn(fx, 'spark_heavy', e.x, e.y);
    for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2 + rnd(fx); spawn(fx, 'spk', e.x, e.y, { vx: Math.cos(ang) * 2.4, vy: Math.sin(ang) * 2.4 }); }
  } else spawn(fx, 'spark_light', e.x, e.y);
  if (!e.block) { const t = fx.tint[e.to]; t.white = 2; t.red = 4; }                // defender: white silhouette 2 ticks, then red tint 4
  addShake(fx, shakeAmp(e.dmg, e.block), shakeTicks(e.dmg, e.block));
}

function koEvent(fx, e) {
  spawn(fx, 'ko_star', e.x, e.y);
  spawn(fx, 'ko_ring', e.x, e.y);
  if (fx.options.flash) { fx.flash = fx.flashMax = 8; }
  addShake(fx, 8, 30);
}

function dust(fx, f, n, big) {
  for (let i = 0; i < n; i++) spawn(fx, big ? 'cloud' : 'puff', f.x + (rnd(fx) - 0.5) * 22, 1 + rnd(fx) * 3, { vx: (rnd(fx) - 0.5) * 0.5, vy: 0.1 + rnd(fx) * 0.2, a: Math.floor(rnd(fx) * 3) });
}

// Call once after every sim step: spawns FX from this tick's events and from fighter state changes, advances all timers, then clears the events.
export function tickFx(fx, world) {
  for (const e of world.events) { if (e.type === 'hit') hitEvent(fx, e); else if (e.type === 'ko') koEvent(fx, e); }
  world.events.length = 0;

  world.fighters.forEach((f, i) => {
    const p = fx.prev[i];
    if (f.state !== p.state) {
      if (WALK.has(f.state) && !WALK.has(p.state)) dust(fx, f, 3, false);
      else if (DASH.has(f.state)) dust(fx, f, 4, false);
      else if (p.state === 'prejump' && f.state === 'air') dust(fx, f, 3, false);
      else if ((p.state === 'launched') && (f.state === 'lying' || f.state === 'ko')) { dust(fx, f, 3, true); dust(fx, f, 4, false); }
      else if ((p.state === 'air' || p.state === 'attack') && p.y > 0 && f.y <= 0 && f.state !== 'launched') dust(fx, f, 3, false);
    }
    p.state = f.state; p.y = f.y;
    const t = fx.tint[i];
    if (t.white > 0) t.white--; else if (t.red > 0) t.red--;
    // afterimage: while dashing, drop a ghost every 2 ticks into a 3-slot ring; ghosts live 8 ticks
    const ring = fx.ghosts[i];
    for (const g of ring) if (g.on && --g.ttl <= 0) g.on = false;
    if (DASH.has(f.state) && f.st % 2 === 0) {
      const g = ring[fx.ghostRing[i]]; fx.ghostRing[i] = (fx.ghostRing[i] + 1) % GHOSTS;
      g.on = true; g.x = f.x; g.y = f.y; g.facing = f.facing; g.id = f.id; g.anim = f.anim; g.at = f.at; g.ttl = 8;
    }
  });

  let active = 0;
  for (const p of fx.pool) {
    if (!p.on) continue;
    active++;
    p.t++;
    p.x += p.vx; p.y += p.vy;
    if (p.kind === 'spk') p.vy -= 0.12;
    if (p.kind === 'shard') p.vy -= 0.1;
    if (p.t >= p.dur) p.on = false;
  }
  fx.stats.active = active;

  const s = fx.shake;
  if (s.ticks > 0) {
    const k = (s.ticks / s.total) * s.amp;
    s.x = Math.round((rnd(fx) * 2 - 1) * k); s.y = Math.round((rnd(fx) * 2 - 1) * k);
    s.ticks--;
  } else { s.x = 0; s.y = 0; s.amp = 0; }
  if (fx.flash > 0) fx.flash--;
}

// ---------------------------------------------------------------------------------------------- drawing
const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

function ray(ctx, cx, cy, ang, r0, r1, c, th = 2) {
  const cos = Math.cos(ang), sin = Math.sin(ang);
  for (let r = r0; r <= r1; r++) px(ctx, cx + cos * r - th / 2, cy + sin * r - th / 2, th, th, c);
}
function ring(ctx, cx, cy, r, c, th = 2, steps = 28) {
  for (let i = 0; i < steps; i++) { const a = (i / steps) * Math.PI * 2; px(ctx, cx + Math.cos(a) * r - th / 2, cy + Math.sin(a) * r - th / 2, th, th, c); }
}
function disk(ctx, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y)); px(ctx, cx - hw, cy + y, hw * 2 + 1, 1, c); }
}
function hexagon(ctx, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) { const hw = Math.round(Math.abs(y) <= r / 2 ? r : r - (Math.abs(y) - r / 2) * 1.7); px(ctx, cx - hw, cy + y, hw * 2 + 1, 1, c); }
}

function drawOne(ctx, p, cam) {
  const sx = Math.round(p.x - cam.x), sy = Math.round(FLOOR_Y + cam.lift - p.y);
  const u = p.t / p.dur;
  switch (p.kind) {
    case 'spark_light': {                                    // white + yellow 5-point burst, ~11px
      const R = 2 + 3.5 * Math.min(1, (p.t + 1) / 3), fade = p.t >= p.dur - 1;
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * ((Math.PI * 2) / 5); ray(ctx, sx, sy, a, 1, Math.round(R * (fade ? 0.7 : 1)), i % 2 ? '#ffe45c' : '#ffffff'); }
      px(ctx, sx - 1, sy - 1, 3, 3, '#ffffff');
      break;
    }
    case 'spark_heavy': {                                    // 3-ring burst: white core, yellow, orange, up to 24px
      const r = 3 + u * 9;
      if (u < 0.75) ring(ctx, sx, sy, Math.round(r + 4), '#ff8a2a', 2);
      ring(ctx, sx, sy, Math.round(r + 2), '#ffd53a', 2);
      disk(ctx, sx, sy, Math.max(1, Math.round(6 * (1 - u))), '#ffffff');
      break;
    }
    case 'block': {                                          // cyan-white hexagon shield flash
      const r = 5 + Math.round(u * 3);
      ctx.globalAlpha = 1 - u * 0.6;
      hexagon(ctx, sx, sy, r, '#4fdcff'); hexagon(ctx, sx, sy, Math.max(1, r - 2), u < 0.5 ? '#e8fcff' : '#9fefff');
      ctx.globalAlpha = 1;
      break;
    }
    case 'shard': px(ctx, sx, sy, 2, 2, u < 0.6 ? '#bff4ff' : '#4fdcff'); break;
    case 'spk': px(ctx, sx, sy, 2, 2, u < 0.5 ? '#ffffff' : '#ffd53a'); break;
    case 'ko_star': {
      const R = 8 + Math.min(1, p.t / 5) * 14;
      ctx.globalAlpha = 1 - Math.max(0, u - 0.5) * 2;
      for (let i = 0; i < 8; i++) ray(ctx, sx, sy, (i / 8) * Math.PI * 2 + 0.2, 3, Math.round(i % 2 ? R * 0.7 : R), i % 2 ? '#ffd53a' : '#ffffff', 3);
      disk(ctx, sx, sy, Math.max(1, Math.round(8 * (1 - u))), '#ffffff');
      ctx.globalAlpha = 1;
      break;
    }
    case 'ko_ring': {                                        // shockwave expanding to 60px
      ctx.globalAlpha = 1 - u;
      ring(ctx, sx, sy, Math.round(6 + u * 54), '#ffffff', u < 0.5 ? 3 : 2, 48);
      ctx.globalAlpha = 1;
      break;
    }
    case 'puff': px(ctx, sx, sy, 2, 2, SHADES_PUFF[Math.min(2, Math.floor(u * 3))]); break;
    case 'cloud': {
      const g = Math.min(1, u * 2);
      ctx.globalAlpha = 1 - Math.max(0, u - 0.6) * 2.5;
      px(ctx, sx - 3 - Math.round(g * 2), sy - 4, 6 + Math.round(g * 4), 4, SHADES_PUFF[0]);
      px(ctx, sx - 2 - Math.round(g * 2), sy - 3, 4 + Math.round(g * 4), 2, '#ece8f6');
      ctx.globalAlpha = 1;
      break;
    }
    default: break;
  }
}

// Behind the fighters: afterimages. drawGhost(ctx, ghost, alpha) draws the sprite for a saved snapshot.
export function drawFxBehind(ctx, fx, cam, drawGhost) {
  for (let i = 0; i < 2; i++) {
    const ring = fx.ghosts[i], start = fx.ghostRing[i];              // the slot about to be overwritten holds the oldest ghost
    let n = 0, k = 0;
    for (let j = 0; j < GHOSTS; j++) if (ring[j].on) n++;
    for (let j = 0; j < GHOSTS; j++) { const g = ring[(start + j) % GHOSTS]; if (g.on) drawGhost(ctx, g, GHOST_ALPHA[k++ + GHOSTS - n]); }
  }
}
// In front of the fighters: sparks, dust, shockwaves.
export function drawFxFront(ctx, fx, cam) {
  for (const p of fx.pool) if (p.on) drawOne(ctx, p, cam);
}
// Screen-space overlay (KO flash).
export function drawFxOverlay(ctx, fx) {
  if (fx.flash > 0) { ctx.globalAlpha = 0.75 * (fx.flash / fx.flashMax); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
export const tintOf = (fx, i) => (fx.tint[i].white > 0 ? 'white' : fx.tint[i].red > 0 ? 'red' : null);

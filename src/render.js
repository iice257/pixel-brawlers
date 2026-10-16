import { W, H, GROUND } from './config.js';

export function text(ctx, s, x, y, { size = 8, color = '#fff', align = 'left', shadow = '#000' } = {}) {
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

const rect = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/* ---------- Stages (procedural pixel backdrops) ---------- */
export const STAGES = [
  { name: 'ROOFTOP DUSK', sky: ['#1a1038', '#3d1a5c', '#8a2a6a', '#d9486a', '#ff8a5c', '#ffc46b'], orb: { x: 340, y: 150, r: 34, c: '#ffe08a' }, far: '#2a1747', near: '#170b2b', floor: '#2b1a38', line: '#4a2c5c', seed: 3, win: '#ffd27a' },
  { name: 'DOJO NIGHT', sky: ['#050a1c', '#0b1736', '#12275a', '#1b3a7a'], orb: { x: 110, y: 60, r: 22, c: '#e8f1ff' }, far: '#0d1d44', near: '#08122c', floor: '#3a2a1f', line: '#5a4130', seed: 7, stars: true, win: '#7fb0ff' },
  { name: 'HARBOR', sky: ['#0c2a2f', '#14464b', '#1f6b6b', '#4fa39a', '#9fd8c0'], orb: { x: 380, y: 120, r: 28, c: '#fff3c0' }, far: '#15474d', near: '#0b2a30', floor: '#26343a', line: '#3d5058', seed: 11, win: '#fff3c0' },
  { name: 'VOLCANO RIM', sky: ['#1c0505', '#3a0a0a', '#6b1408', '#b3320c', '#ff7a1a'], orb: { x: 240, y: 170, r: 44, c: '#ffb347' }, far: '#3b0f0a', near: '#1d0705', floor: '#2d1410', line: '#5a2a1a', seed: 19, win: '#ff9a3a' },
];

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function skyline(ctx, rnd, color, minH, maxH, minW, maxW, win) {
  let x = -10;
  while (x < W) {
    const w = Math.floor(minW + rnd() * (maxW - minW));
    const h = Math.floor(minH + rnd() * (maxH - minH));
    rect(ctx, x, GROUND - h, w, h, color);
    if (win) {
      for (let wy = GROUND - h + 6; wy < GROUND - 8; wy += 9) {
        for (let wx = x + 3; wx < x + w - 4; wx += 7) {
          if (rnd() < 0.22) rect(ctx, wx, wy, 3, 4, win);
        }
      }
    }
    x += w + Math.floor(rnd() * 3);
  }
}

const stageCache = new Map();
export function stageCanvas(idx) {
  if (stageCache.has(idx)) return stageCache.get(idx);
  const s = STAGES[idx % STAGES.length];
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const rnd = rng(s.seed);
  const bandH = Math.ceil(GROUND / s.sky.length);
  s.sky.forEach((col, i) => rect(c, 0, i * bandH, W, bandH, col));
  if (s.stars) for (let i = 0; i < 70; i++) rect(c, Math.floor(rnd() * W), Math.floor(rnd() * 130), 1, 1, '#fff');
  // Pixel-circle orb
  for (let dy = -s.orb.r; dy <= s.orb.r; dy++) {
    const half = Math.floor(Math.sqrt(s.orb.r * s.orb.r - dy * dy));
    rect(c, s.orb.x - half, s.orb.y + dy, half * 2, 1, s.orb.c);
  }
  skyline(c, rnd, s.far, 50, 130, 16, 34, s.win);
  skyline(c, rnd, s.near, 22, 60, 20, 44, null);
  // Floor
  rect(c, 0, GROUND, W, H - GROUND, s.floor);
  rect(c, 0, GROUND, W, 2, s.line);
  for (let y = GROUND + 12; y < H; y += 14) rect(c, 0, y, W, 1, s.line);
  for (let x = -40; x < W + 40; x += 48) {
    for (let y = GROUND + 2; y < H; y += 1) {
      const k = (y - GROUND) / (H - GROUND);
      rect(c, Math.floor(x + (x - W / 2) * k * 0.9), y, 1, 1, s.line);
    }
  }
  stageCache.set(idx, cv);
  return cv;
}

/* ---------- Fighter puppet ---------- */
export function drawFighter(ctx, f, sx, sy, scale = 1) {
  const d = f.def;
  const s = f.state;
  const t = f.t;
  const suit = s === 'hit' && t < 3 ? '#ffffff' : d.suit;
  const air = f.y > 0 && s !== 'ko';

  let bob = 0, swing = 0, lean = 0, ext = 0, atkName = null, guard = 'guard';
  if (s === 'idle') bob = Math.round(Math.sin(t * 0.12));
  if (s === 'walk') { swing = Math.sin(t * 0.3) * 4; bob = Math.round(Math.abs(Math.sin(t * 0.3))); }
  if (s === 'block') guard = 'block';
  if (s === 'hit') { lean = -0.2; guard = 'flail'; }
  if (s === 'win') guard = 'win';
  if (s === 'attack') {
    const a = f.atk;
    atkName = a.name === 'special' ? 'special' : a.name;
    ext = t < a.start ? (t / a.start) * 0.5 : t < a.start + a.active ? 1 : Math.max(0, 1 - (t - a.start - a.active) / a.rec);
    if (a.type === 'dash') lean = 0.25;
    if (a.type === 'slam') lean = 0.12 * ext;
  }

  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.scale(f.facing * scale, scale);

  if (s === 'ko') {
    const prog = Math.min(1, t / 14);
    ctx.translate(-prog * 10, -7 * prog);
    ctx.rotate(-prog * Math.PI / 2);
  } else if (lean) {
    ctx.translate(0, -20); ctx.rotate(lean); ctx.translate(0, 20);
  }
  ctx.translate(0, -bob);

  const R = (x, y, w, h, c) => rect(ctx, x, y, w, h, c);

  // Back arm
  if (guard === 'block') { /* drawn with front */ }
  else if (atkName === 'special') R(-2, -37, 8 + ext * 20, 5, suit);
  else if (guard === 'flail') R(-12, -38, 8, 5, suit);
  else if (guard === 'win') R(-10, -50, 5, 14, suit);
  else { R(-2, -40, 10, 5, suit); R(8, -41, 5, 6, d.skin); }

  // Back leg
  if (air) { R(-7, -14, 5, 10, suit); R(-8, -6, 6, 4, d.shoe); }
  else { R(-7 - swing * 0.5, -20, 5, 17, suit); R(-8 - swing * 0.5, -4, 7, 4, d.shoe); }

  // Torso
  R(-8, -42, 16, 22, suit);
  R(-8, -24, 16, 3, d.trim);
  R(-1, -42, 2, 18, d.trim);

  // Head
  R(-6, -56, 12, 12, d.skin);
  R(-7, -58, 14, 5, d.hair);
  R(-7, -58, 4, 12, d.hair);
  R(-6, -52, 12, 2, d.trim);
  R(2, -50, 2, 2, '#10101a');

  // Front leg
  if (atkName === 'kick') {
    const len = 6 + ext * 26;
    R(2, -27, len, 6, suit);
    R(2 + len, -29, 6, 10, d.shoe);
  } else if (air) {
    R(2, -16, 7, 8, suit); R(7, -10, 6, 5, d.shoe);
  } else {
    R(2 + swing * 0.5, -20, 5, 17, suit); R(2 + swing * 0.5, -4, 7, 4, d.shoe);
  }

  // Front arm
  if (guard === 'block') {
    R(5, -54, 6, 16, suit); R(5, -57, 7, 6, d.skin);
    R(0, -52, 5, 14, suit);
  } else if (atkName === 'punch') {
    const len = 6 + ext * 22;
    R(4, -42, len, 5, suit); R(4 + len, -43, 6, 7, d.skin);
  } else if (atkName === 'special') {
    const len = 6 + ext * 24;
    R(4, -44, len, 5, suit); R(4 + len, -45, 7, 7, d.trim);
  } else if (guard === 'flail') {
    R(-6, -36, 10, 5, suit);
  } else if (guard === 'win') {
    R(6, -56, 5, 16, suit); R(6, -60, 6, 5, d.skin);
  } else {
    R(4, -39, 7, 5, suit); R(9, -49, 5, 12, suit); R(9, -53, 6, 5, d.skin);
  }
  ctx.restore();
}

export function drawShadow(ctx, f) {
  const k = Math.max(0.4, 1 - f.y / 120);
  const w = Math.round(30 * k);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(Math.round(f.x - w / 2), GROUND + 3, w, 3);
}

export function drawFx(ctx, world) {
  for (const e of world.fx) {
    const k = e.t;
    if (e.kind === 'hit') {
      ctx.fillStyle = k < 3 ? '#ffffff' : '#ffd24a';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = 3 + k * 2.2;
        ctx.fillRect(Math.round(e.x + Math.cos(a) * r), Math.round(e.y + Math.sin(a) * r), 3, 3);
      }
    } else {
      ctx.fillStyle = '#7fd0ff';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = 4 + k * 1.6;
        ctx.fillRect(Math.round(e.x + Math.cos(a) * r), Math.round(e.y + Math.sin(a) * r), 2, 2);
      }
    }
  }
  for (const p of world.proj) {
    const r = p.att.r;
    ctx.fillStyle = p.att.color;
    ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(Math.round(p.x - r / 2), Math.round(p.y - r / 2), r, r);
    ctx.fillStyle = p.att.color;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(Math.round(p.x - p.vx * 5 - r), Math.round(p.y - r / 2), r * 2, r);
    ctx.globalAlpha = 1;
  }
}

// World: two fighters, stage, camera. Pure and serialisable (plain objects/arrays, seeded RNG in the state).
// step(world, inputs) advances exactly one 60 Hz tick; inputs[i] = raw sample {left,right,up,down,buttons}.
import { STAGE_W, FLOOR_Y } from '../config2.js';
import { createRng } from '../core/rng.js';
import { createFighter, stepFighter, canTurn, BOXES, boxKind } from './fighter.js';
import { resolveHits, CORNER_SHARE } from './combat.js';
import { getMove } from './moves.js';
import { createCamera, updateCamera } from './camera.js';

export const MIN_X = 16, MAX_X = 560;       // fighters are clamped to [16, 560]
export const MAX_SEP = 296;                 // camera width 384 - 88
export const START_GAP = 80;                // round start: 80px apart around the stage centre

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function createWorld({ p1 = 'surge', p2 = 'brick', seed = 1 } = {}) {
  const mid = STAGE_W / 2;
  const fighters = [createFighter(p1, 0, mid - START_GAP / 2, 1), createFighter(p2, 1, mid + START_GAP / 2, -1)];
  return { tick: 0, rng: createRng(seed), stage: { w: STAGE_W, floorY: FLOOR_Y }, fighters, camera: createCamera(fighters, STAGE_W) };
}

const pushRect = (f) => {
  const pb = BOXES[boxKind(f)].push;
  if (!pb) return null;                                                    // lying fighters have no pushbox
  const x0 = f.x + pb[0];
  return { x0, x1: x0 + pb[2], y0: f.y + pb[1], y1: f.y + pb[1] + pb[3] };
};
function overlap(a, b) {
  const ra = pushRect(a), rb = pushRect(b);
  if (!ra || !rb) return 0;
  if (ra.y0 >= rb.y1 || rb.y0 >= ra.y1) return 0;
  return Math.max(0, Math.min(ra.x1, rb.x1) - Math.max(ra.x0, rb.x0));
}
// Clamp to the stage. A fighter in pushback that a wall stops hands CORNER_SHARE of the lost distance to the other fighter (GAME_DESIGN 2.1).
const clampStage = (w) => w.fighters.forEach((f, i) => {
  const c = clamp(f.x, MIN_X, MAX_X);
  if (f.x !== c && (f.state === 'hit' || f.state === 'blockstun') && f.y <= 0) w.fighters[1 - i].x -= (f.x - c) * CORNER_SHARE;
  f.x = c;
});

function pushBodies(w) {
  const [a, b] = w.fighters;
  const ox = overlap(a, b);
  if (ox <= 0) return;
  const dir = a.x < b.x ? -1 : a.x > b.x ? 1 : a.idx === 0 ? -1 : 1;     // direction `a` moves
  const grounded = a.y <= 0 && b.y <= 0;
  const m = grounded ? ox / 2 : Math.min(1, ox / 2);                       // airborne bodies only push 1 px/tick apart
  a.x += dir * m; b.x -= dir * m;
  clampStage(w);
  const r = grounded ? overlap(a, b) : 0;                                  // a wall ate part of the push: the other fighter absorbs it
  if (r > 0) {
    const atWall = (f) => f.x <= MIN_X || f.x >= MAX_X;
    if (atWall(a) && !atWall(b)) b.x -= dir * r;
    else if (atWall(b) && !atWall(a)) a.x += dir * r;
    else { a.x += (dir * r) / 2; b.x -= (dir * r) / 2; }
    clampStage(w);
  }
}

// Fighters can never be more than MAX_SEP apart: pull back whoever moved away (both split it).
function limitSeparation(w) {
  const [a, b] = w.fighters;
  const dx = b.x - a.x, ex = Math.abs(dx) - MAX_SEP;
  if (ex <= 0) return;
  const s = Math.sign(dx) || 1;
  const awayA = Math.max(0, -s * (a.x - a.px)), awayB = Math.max(0, s * (b.x - b.px));
  const tot = awayA + awayB, ka = tot < 1e-9 ? 0.5 : awayA / tot, kb = tot < 1e-9 ? 0.5 : awayB / tot;
  a.x += s * ex * ka; b.x -= s * ex * kb;
}

function faceOpponents(w) {
  const [a, b] = w.fighters;
  for (const [f, o] of [[a, b], [b, a]]) {
    if (canTurn(f) && o.x !== f.x) f.facing = o.x > f.x ? 1 : -1;
  }
}

// An attack that can still hit within reach makes holding back an automatic guard (GAME_DESIGN 2.4).
const threatened = (f, o) => {
  if (o.state !== 'attack' || Math.abs(o.x - f.x) > 90) return false;
  const m = getMove(o.id, o.move);
  return o.mt <= m.startup + m.active;
};

export function step(w, inputs) {
  w.tick++;
  const [a, b] = w.fighters;
  a.threat = threatened(a, b); b.threat = threatened(b, a);
  w.fighters.forEach((f, i) => stepFighter(f, inputs[i]));
  clampStage(w);
  pushBodies(w);
  limitSeparation(w);
  clampStage(w);
  faceOpponents(w);
  resolveHits(w);
  updateCamera(w.camera, w.fighters, w.stage.w);
  return w;
}

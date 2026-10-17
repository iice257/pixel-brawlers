// Hit detection and resolution (pure). Runs once per tick after all movement (GAME_DESIGN 2.2, 2.4, 3.5).
// Events are computed from one snapshot and then applied, so two hits on the same tick are a trade.
import { STATS } from '../data/stats.js';
import { BTN, SIMUL_WINDOW, dirX, dirY } from '../core/buffer.js';
import { activeHits, boxesOf, boxKind, canGuard, toWorld, backToNeutral, BOXES, AIR_HIT } from './fighter.js';
import { getMove } from './moves.js';
import { pairOffset } from '../data/anims.js';

export const BLOCK_STOP_PENALTY = 2;         // blocked hitstop = hit hitstop - 2
export const CORNER_SHARE = 0.4;             // attacker is pushed back by this share of a cornered defender's pushback (see world.clampStage)
// Damage scaling by combo position, hitstun decay and juggle points (GAME_DESIGN 2.7).
export const SCALE = [100, 90, 80, 70, 60, 50, 40, 40];        // % by hit number, the last entry repeats
export const SCALE_FLOOR = 30, SUPER_FLOOR = 50;
export const JUGGLE_POINTS = 3;
export const comboScale = (n, sup = false) => Math.max(sup ? SUPER_FLOOR : SCALE_FLOOR, SCALE[Math.min(n, SCALE.length) - 1]) / 100;
export const stunDecay = (n) => (n >= 7 ? 0.7 : n >= 4 ? 0.85 : 1);
const juggleCost = (h) => h.juggleCost ?? 1;

const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

// Which guard stops which level (GAME_DESIGN 2.4).
export function blocksLevel(level, stance) {
  switch (level) {
    case 'H': case 'O': return stance === 'stand';
    case 'M': return true;
    case 'L': return stance === 'crouch';
    default: return false;                   // 'U' unblockable / throws
  }
}

// Is the defender guarding against this attacker right now? Uses the screen-space stick against the attacker's current side, so a cross-up
// swaps the required direction on the same tick.
export function guardStance(d, a) {
  if (!canGuard(d)) return null;
  const abs = d.buf.abs[d.buf.abs.length - 1] ?? 5;
  const away = Math.sign(d.x - a.x) || -d.facing;
  const holdBack = dirX(abs) === away, bl = (d.buf.btn & BTN.BL) !== 0;
  if (!holdBack && !bl) return null;
  return dirY(abs) < 0 ? 'crouch' : 'stand';
}

const hittable = (d, boxBottom, h) => {
  if (d.inv || d.state === 'thrown' || d.state === 'throwing' || d.state === 'tech') return false;
  if (d.state === 'launched') return !d.thrown && !d.ko && d.cb.juggle >= (h.super ? 1 : juggleCost(h));   // juggle: needs points left
  if (d.state === 'lying' || d.state === 'ko') return boxBottom < 8;   // lying: only low hitboxes
  return true;
};

// Midpoint of the overlap of two boxes: where the hit FX appears.
const contactPoint = (a, b) => [(Math.max(a[0], b[0]) + Math.min(a[0] + a[2], b[0] + b[2])) / 2, (Math.max(a[1], b[1]) + Math.min(a[1] + a[3], b[1] + b[3])) / 2];

function findHit(a, d) {
  for (const w of activeHits(a)) {
    if (w.done || w.hit.level === 'T') continue;
    const hb = boxesOf(d).hurt.find((b) => overlap(w.box, b));
    if (hb && hittable(d, w.box[1], w.hit)) { w.pos = contactPoint(w.box, hb); return w; }
  }
  return null;
}

function react(d, w) {
  if (boxKind(d) === 'crouch' || w.hit.level === 'L') return 'hit_low';
  const cy = w.box[1] + w.box[3] / 2 - d.y;
  return cy >= 70 ? 'hit_high' : 'hit_body';
}

function apply(ev, world) {
  const tick = world.tick;
  const { a, d, w, blocked } = ev, h = w.hit;
  const away = Math.sign(d.x - a.x) || -d.facing;
  a.hitDone[w.i] = true;
  a.contact = blocked ? 'block' : 'hit';
  const stop = blocked ? Math.max(0, h.hitstop - BLOCK_STOP_PENALTY) : h.hitstop;
  a.stop = stop; d.stop = stop;
  d.inv = null;
  if (blocked) {
    d.state = 'blockstun'; d.st = 0; d.stun = h.bs; d.stance = ev.stance;
    d.kvx = away * h.pbBlock; d.vx = 0;
    world.events.push({ type: 'hit', x: w.pos[0], y: w.pos[1], level: h.level, dmg: 0, block: true, heavy: h.hitstop >= 10, by: a.idx, to: d.idx, dir: Math.sign(away), tick });
    return;
  }
  const cb = d.cb;
  if (cb.n === 0 || cb.end !== null) { cb.n = 0; cb.dmg = 0; cb.juggle = 0; cb.end = null; }   // a new combo
  const juggled = d.state === 'launched';
  cb.n++; cb.t = tick;
  if (juggled && !h.super) cb.juggle -= juggleCost(h);
  const dmg = Math.round(h.dmg * STATS[a.id].pwr * STATS[d.id].def * comboScale(cb.n, h.super));
  cb.dmg += dmg;
  d.hp = Math.max(0, d.hp - dmg);
  d.dmgTaken += dmg;
  d.ko = d.hp <= 0;
  world.events.push({ type: 'hit', x: w.pos[0], y: w.pos[1], level: h.level, dmg, block: false, heavy: h.hitstop >= 10, by: a.idx, to: d.idx, dir: Math.sign(away), tick });
  if (d.ko) world.events.push({ type: 'ko', x: d.x, y: d.y + 50, to: d.idx, tick });
  const airborne = d.y > 0;
  const launch = h.launch ?? (d.ko ? { vx: -2.4, vy: 4.5 } : airborne ? { vx: -AIR_HIT.vx, vy: AIR_HIT.vy } : null);
  if (launch) {
    d.state = 'launched'; d.st = 0;
    d.vx = away * Math.abs(launch.vx); d.vy = launch.vy; d.kvx = 0;
    d.kd = juggled && d.kd === 'hard' ? 'hard' : h.kd ?? (h.launch ? 'hard' : 'soft');
    if (d.ko) d.kd = 'hard';
    if (h.launch && !d.ko) cb.juggle = getMove(a.id, a.move).juggleStart ?? (d.kd === 'hard' ? JUGGLE_POINTS : 0);   // a launcher opens the juggle
  } else {
    d.crouchHit = boxKind(d) === 'crouch';
    d.react = react(d, w);
    d.state = 'hit'; d.st = 0; d.stun = Math.round(h.hs * stunDecay(cb.n)); d.kvx = away * h.pbHit; d.vx = 0;
  }
}

export function resolveHits(world) {
  const [f0, f1] = world.fighters, events = [];
  for (const [a, d] of [[f0, f1], [f1, f0]]) {
    if (a.state !== 'attack') continue;
    const w = findHit(a, d);
    if (!w) continue;
    const stance = guardStance(d, a);
    events.push({ a, d, w, stance, blocked: stance !== null && blocksLevel(w.hit.level, stance) });
  }
  for (const ev of events) apply(ev, world);
  resolveThrows(world);
  return events;
}

// ---------------------------------------------------------------------------------------------- throws (GAME_DESIGN 2.2, brief 2.5)
export const TECH_WINDOW = 7;               // defender presses LP+LK within this many ticks of the grab -> both pushed apart, no damage
export const THROW_RELEASE = 14;            // ticks of hold/lift before the defender is let go
export const THROW_TOTAL = 24;              // attacker is free this many ticks after the grab
const THROWABLE = new Set(['idle', 'walk_f', 'walk_b', 'crouch', 'guard', 'dash_f', 'dash_b', 'attack', 'landlag']);   // not prejump, stun, air, lying

export const throwable = (d) => d.y <= 0 && !d.inv && THROWABLE.has(d.state);
// Reach is centre to centre: the grab connects when |dx| <= throwRange (46; pushboxes touch at 24, so a visible gap of ~22px remains).
const inThrowRange = (a, d) => Math.abs(a.x - d.x) <= getMove(a.id, 'throw').throwRange && (a.x - d.x) * a.facing <= 0;

function startTech(w, ...pair) {
  w.thr = null;
  for (const f of pair) {
    const other = pair[0] === f ? pair[1] : pair[0];
    f.state = 'tech'; f.st = 0; f.move = null; f.vx = 0; f.thrown = false; f.y = 0; f.inv = null;
    f.kvx = Math.sign(f.x - other.x) || -f.facing;
  }
}

// A grab connects when the throw's active ticks overlap a throwable defender in range. Two throws on the same tick = both teched.
export function resolveThrows(w) {
  const [f0, f1] = w.fighters, tries = [];
  for (const [a, d] of [[f0, f1], [f1, f0]]) {
    if (a.state !== 'attack' || a.move !== 'throw') continue;
    const win = activeHits(a)[0];
    if (!win || win.done) continue;
    if (throwable(d) && inThrowRange(a, d)) tries.push({ a, d });
  }
  if (!tries.length || w.thr) return;
  if (tries.length === 2) { startTech(w, f0, f1); return; }
  const { a, d } = tries[0];
  a.hitDone[0] = true;
  a.state = 'throwing'; a.st = 0; a.vx = 0; a.move = 'throw';
  d.state = 'thrown'; d.st = 0; d.vx = 0; d.kvx = 0; d.inv = 'all'; d.stop = 0; d.crouchHit = false;
  w.thr = { a: a.idx, d: d.idx, t: 0, back: a.throwBack, grabBuf: d.buf.tick, hp0: d.hp };
}

const bothPressed = (d, from) => {
  const p = d.buf.press, lp = p[0], lk = p[2];
  return lp >= from && lk >= from && Math.abs(lp - lk) <= SIMUL_WINDOW;
};

// One tick of a connected throw: tech check, damage once the tech window has closed, locked positions, release.
export function stepThrow(w) {
  const t = w.thr;
  if (!t) return;
  const a = w.fighters[t.a], d = w.fighters[t.d];
  t.t++;
  const k = t.t;
  if (k <= TECH_WINDOW && bothPressed(d, t.grabBuf)) { startTech(w, a, d); return; }
  if (k === TECH_WINDOW + 1) {
    const m = getMove(a.id, 'throw');
    const dmg = Math.round(m.hits[0].dmg * STATS[a.id].pwr * STATS[d.id].def);   // fixed: no combo scaling
    d.hp = Math.max(0, d.hp - dmg); d.dmgTaken += dmg; d.ko = d.hp <= 0;
    w.events.push({ type: 'hit', x: d.x, y: d.y + 40, level: 'T', dmg, block: false, heavy: true, by: a.idx, to: d.idx, dir: a.facing, tick: w.tick });
    if (d.ko) w.events.push({ type: 'ko', x: d.x, y: d.y + 40, to: d.idx, tick: w.tick });
  }
  if (k < THROW_RELEASE) {
    const p = pairOffset(k, t.back);
    d.x = a.x + a.facing * p.x;
    d.y = p.y;
    d.facing = p.x >= 0 ? -a.facing : a.facing;
    d.anim = 'thrown'; d.at = k;
  } else if (k === THROW_RELEASE) {
    const away = t.back ? -a.facing : a.facing;
    d.state = 'launched'; d.st = 0; d.thrown = true; d.inv = null;
    d.vx = away * 2.0; d.vy = 3.5; d.y = Math.max(d.y, 1); d.kd = 'hard';
    d.x = a.x + a.facing * (t.back ? -60 : 60);
  }
  a.anim = 'throw'; a.at = Math.min(5 + k, 30);
  if (k >= THROW_TOTAL) { w.thr = null; backToNeutral(a, STATS[a.id], false); }
}

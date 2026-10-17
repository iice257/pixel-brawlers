// Hit detection and resolution (pure). Runs once per tick after all movement (GAME_DESIGN 2.2, 2.4, 3.5).
// Events are computed from one snapshot and then applied, so two hits on the same tick are a trade.
import { STATS } from '../data/stats.js';
import { BTN, SIMUL_WINDOW, dirX, dirY } from '../core/buffer.js';
import { activeHits, boxesOf, boxKind, canGuard, toWorld, backToNeutral, BOXES, AIR_HIT } from './fighter.js';
import { getMove } from './moves.js';
import { pairOffset } from '../data/anims.js';

export const BLOCK_STOP_PENALTY = 2;         // blocked hitstop = hit hitstop - 2
export const CORNER_SHARE = 0.4;             // attacker is pushed back by this share of a cornered defender's pushback (see world.clampStage)
const comboScale = () => 1;                  // damage scaling by combo position (2.7)

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

const hittable = (d, boxBottom) => {
  if (d.inv || d.state === 'thrown' || d.state === 'throwing' || d.state === 'tech') return false;
  if (d.state === 'launched') return false;                  // juggles arrive with 2.7
  if (d.state === 'lying' || d.state === 'ko') return boxBottom < 8;   // lying: only low hitboxes
  return true;
};

function findHit(a, d) {
  for (const w of activeHits(a)) {
    if (w.done || w.hit.level === 'T') continue;
    const hurts = boxesOf(d).hurt;
    if (hurts.some((hb) => overlap(w.box, hb)) && hittable(d, w.box[1])) return w;
  }
  return null;
}

function react(d, w) {
  if (boxKind(d) === 'crouch' || w.hit.level === 'L') return 'hit_low';
  const cy = w.box[1] + w.box[3] / 2 - d.y;
  return cy >= 70 ? 'hit_high' : 'hit_body';
}

function apply(ev) {
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
    return;
  }
  const dmg = Math.round(h.dmg * STATS[a.id].pwr * STATS[d.id].def * comboScale(a, d));
  d.hp = Math.max(0, d.hp - dmg);
  d.dmgTaken += dmg;
  d.ko = d.hp <= 0;
  const airborne = d.y > 0;
  const launch = h.launch ?? (d.ko ? { vx: -2.4, vy: 4.5 } : airborne ? { vx: -AIR_HIT.vx, vy: AIR_HIT.vy } : null);
  if (launch) {
    d.state = 'launched'; d.st = 0;
    d.vx = away * Math.abs(launch.vx); d.vy = launch.vy; d.kvx = 0;
    d.kd = h.kd ?? (h.launch ? 'hard' : 'soft');
    if (d.ko) d.kd = 'hard';
  } else {
    d.crouchHit = boxKind(d) === 'crouch';
    d.react = react(d, w);
    d.state = 'hit'; d.st = 0; d.stun = h.hs; d.kvx = away * h.pbHit; d.vx = 0;
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
  for (const ev of events) apply(ev);
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

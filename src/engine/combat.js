// Hit detection and resolution (pure). Runs once per tick after all movement (GAME_DESIGN 2.2, 2.4, 3.5).
// Events are computed from one snapshot and then applied, so two hits on the same tick are a trade.
import { STATS } from '../data/stats.js';
import { BTN, dirX, dirY } from '../core/buffer.js';
import { activeHits, boxesOf, boxKind, canGuard, AIR_HIT } from './fighter.js';

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
  if (d.inv) return false;
  if (d.state === 'launched') return false;                  // juggles arrive with 2.7
  if (d.state === 'lying' || d.state === 'ko') return boxBottom < 8;   // lying: only low hitboxes
  return true;
};

function findHit(a, d) {
  for (const w of activeHits(a)) {
    if (w.done) continue;
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
  return events;
}

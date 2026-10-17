// Fighter state machine (pure; plain-object state). GAME_DESIGN 2.1-2.5.
// Sim space: x right, y = height above the floor (up positive), origin at the feet centre. vx is world space (+ = right).
// Tick convention: `st` = ticks since entering the state (0 on the entry tick); `mt` = tick of the current move (1-based, 1 = first startup tick).
import { STATS } from '../data/stats.js';
import { ANIMS, animTotal } from '../data/anims.js';
import { getMove, moveTotal } from './moves.js';
import { BTN, SIMUL_WINDOW, createBuffer, pushInput, doubleTap, dirX, dirY, FWD, BACK, livePresses, take, takeThrow, pressAge } from '../core/buffer.js';

export const PREJUMP = 3;
export const JUMP_VY = 8.0;
export const JUMP_FWD = 2.6, JUMP_BACK = -2.2;
export const DASH_TICKS = { f: animTotal(ANIMS.dash_f), b: animTotal(ANIMS.dash_b) };   // 14 / 16
export const DASH_ACTIONABLE = 8;            // dash can be cancelled into jump/crouch after this many ticks
export const BACKDASH_INV = 6;               // strike invulnerable ticks 1-6
export const CROUCH_IN = 6, CROUCH_OUT = 6, LAND_ANIM = 3;
export const LANDLAG = 3;                    // whiffed air normal landing lag
export const KB_DECAY = 0.86;                // pushback decays by this per tick on the ground
export const LIE = { soft: 22, hard: 34 }, GETUP = 22, WAKE_INV = 3;
export const TECH_TICKS = 20, TECH_PUSH = 3.5;   // thrown-then-teched: both fighters slide apart 28px (8 ticks), neutral after 20
export const AIR_HIT = { vx: 2.0, vy: 3.0 }; // a jump-in that hits an airborne opponent knocks them down softly

// Local boxes (facing right, feet origin, y up): [x, y, w, h]. GAME_DESIGN 2.2.
export const BOXES = {
  stand: { push: [-12, 0, 24, 92], hurt: [[-9, 72, 20, 26], [-14, 34, 28, 40], [-12, 0, 24, 36]] },
  crouch: { push: [-12, 0, 24, 60], hurt: [[-14, 26, 28, 34], [-14, 0, 28, 28]] },
  air: { push: [-10, 16, 20, 60], hurt: [[-13, 18, 26, 66]] },
  lying: { push: null, hurt: [[-30, 0, 60, 16]] },
};
const GROUND_ACT = new Set(['idle', 'walk_f', 'walk_b', 'crouch', 'guard']);
export const isActionable = (f) => GROUND_ACT.has(f.state);
export const canGuard = (f) => f.y <= 0 && (GROUND_ACT.has(f.state) || f.state === 'blockstun');
export const canTurn = (f) => f.y <= 0 && (GROUND_ACT.has(f.state) || f.state === 'blockstun' || f.state === 'hit');

export function createFighter(id, idx, x, facing) {
  return {
    id, idx, x, y: 0, vx: 0, vy: 0, px: x, facing,
    state: 'idle', st: 0,                       // st = ticks spent in the current state
    anim: 'idle', at: 0,                        // animation name + ticks into it (renderer maps to a pose frame)
    hp: STATS[id].hp, dmgTaken: 0, meter: 0, buf: createBuffer(),
    jumpDir: 0, landT: 0, outT: 0, inv: null,
    move: null, mt: 0, hitDone: [], contact: null, airUsed: false,   // attack
    stun: 0, stop: 0, kvx: 0, stance: 'stand', react: 'hit_body', crouchHit: false,   // reactions
    kd: null, lieT: 0, wake: WAKE_INV, qr: false, ko: false, threat: false, throwBack: false, pr: 0, thrown: false,
  };
}

const setState = (f, s) => { if (f.state !== s) { f.state = s; f.st = 0; } };
const play = (f, name) => { if (f.anim !== name) { f.anim = name; f.at = 0; } else f.at++; };
const playAt = (f, name, at) => { f.anim = name; f.at = at; };

export function boxKind(f) {
  switch (f.state) {
    case 'lying': case 'ko': return 'lying';
    case 'thrown': case 'throwing': return 'stand';
    case 'air': case 'launched': return 'air';
    case 'attack': { const s = getMove(f.id, f.move).state; return s === 'air' ? 'air' : s === 'crouch' ? 'crouch' : 'stand'; }
    case 'crouch': case 'prejump': return 'crouch';
    case 'guard': case 'blockstun': return f.stance === 'crouch' ? 'crouch' : 'stand';
    case 'hit': return f.crouchHit ? 'crouch' : 'stand';
    default: return 'stand';
  }
}

// ---------------------------------------------------------------------------------------------- jump / air
function startJump(f) {
  setState(f, 'prejump');
  f.vx = 0; f.landT = 0; f.outT = 0; f.airUsed = false;
}
function takeoff(f, S) {
  const x = dirX(f.buf.dir);
  f.jumpDir = x;                                         // facing-relative: +1 forward, -1 back, 0 neutral
  f.vy = JUMP_VY * S.jump;
  f.vx = f.facing * (x > 0 ? JUMP_FWD : x < 0 ? JUMP_BACK : 0) * S.jump;
  setState(f, 'air');
}
function integrate(f, S) {                               // exact discretisation of the parabola: apex v^2/2g, airtime 2v/g
  f.y += f.vy - S.gravity / 2;
  f.vy -= S.gravity;
  if (f.y <= 0 && f.vy < 0) { f.y = 0; f.vy = 0; return true; }
  return false;
}
function airTick(f, S) {
  if (integrate(f, S)) { f.vx = 0; f.landT = LAND_ANIM; setState(f, 'idle'); }
}

// ---------------------------------------------------------------------------------------------- attacks
const ATK = BTN.LP | BTN.HP | BTN.LK | BTN.HK;
const BTN_NAME = { [BTN.LP]: 'LP', [BTN.HP]: 'HP', [BTN.LK]: 'LK', [BTN.HK]: 'HK' };
const WEIGHT = { [BTN.LP]: 1, [BTN.LK]: 1, [BTN.HP]: 2, [BTN.HK]: 3 };
const BTN_IDX = { [BTN.LP]: 0, [BTN.HP]: 1, [BTN.LK]: 2, [BTN.HK]: 3 };

// Oldest live press wins; pressed together (same tick) -> the heavier one.
function pickPress(f) {
  const live = livePresses(f.buf) & ATK;
  let best = 0, bt = 1e9;
  for (const b of [BTN.LP, BTN.HP, BTN.LK, BTN.HK]) {
    if (!(live & b)) continue;
    const t = f.buf.press[BTN_IDX[b]];
    if (t < bt || (t === bt && WEIGHT[b] > WEIGHT[best])) { best = b; bt = t; }
  }
  return best;
}
export function startAttack(f, id, pr = 0) {
  const m = getMove(f.id, id);
  f.move = id; f.mt = 1; f.hitDone = m.hits.map(() => false); f.contact = null; f.pr = pr;
  if (id === 'throw') f.throwBack = dirX(f.buf.dir) < 0;                  // hold back = back throw
  if (m.state === 'air') f.airUsed = true; else f.vx = 0;
  setState(f, 'attack');
  playAt(f, m.anim, 0);
}
function tryAttack(f, air) {
  const b = pickPress(f);
  if (!b) return false;
  const y = dirY(f.buf.dir);
  const id = (air ? 'j' : y < 0 ? '2' : '') + BTN_NAME[b];
  if (!getMove(f.id, id)) return false;
  const pr = f.buf.press[BTN_IDX[b]];
  take(f.buf, b);
  startAttack(f, id, pr);
  return true;
}
// Live hit windows of the current move: world-space boxes (for hit detection and the overlay).
export function activeHits(f) {
  if (f.state !== 'attack') return [];
  const m = getMove(f.id, f.move), out = [];
  m.hits.forEach((h, i) => { if (f.mt >= h.from && f.mt <= h.to) out.push({ i, hit: h, box: toWorld(f, h.box), done: f.hitDone[i] }); });
  return out;
}

// ---------------------------------------------------------------------------------------------- ground states
function wantsGuard(f) {
  const d = f.buf.dir, x = dirX(d);
  return (f.buf.btn & BTN.BL) !== 0 || (x < 0 && f.threat);
}
function locomote(f, S) {
  const d = f.buf.dir, x = dirX(d), y = dirY(d);
  if (y > 0) { startJump(f); return; }
  if (wantsGuard(f)) {                                   // BL held, or holding back while an attack is coming
    setState(f, 'guard'); f.stance = y < 0 ? 'crouch' : 'stand'; f.vx = 0; f.outT = 0; f.landT = 0;
    return;
  }
  if (y < 0) {                                           // 1 / 2 / 3: crouch (no movement)
    setState(f, 'crouch'); f.vx = 0; f.outT = 0; f.landT = 0;
    return;
  }
  if (f.state === 'crouch') { f.outT = CROUCH_OUT; f.landT = 0; }
  if (x > 0 && doubleTap(f.buf, FWD)) { setState(f, 'dash_f'); f.outT = 0; f.landT = 0; return; }
  if (x < 0 && doubleTap(f.buf, BACK)) { setState(f, 'dash_b'); f.outT = 0; f.landT = 0; return; }
  if (x > 0) { setState(f, 'walk_f'); f.vx = f.facing * S.walkF; f.outT = 0; f.landT = 0; }
  else if (x < 0) { setState(f, 'walk_b'); f.vx = -f.facing * S.walkB; f.outT = 0; f.landT = 0; }
  else { setState(f, 'idle'); f.vx = 0; }
}
// Everything a fighter may do on an actionable tick: buffered normal first, otherwise move.
function actionable(f, S) {
  if (dirY(f.buf.dir) <= 0 && takeThrow(f.buf)) { startAttack(f, 'throw'); return; }
  if (dirY(f.buf.dir) <= 0 && tryAttack(f, false)) return;
  locomote(f, S);
}
export function backToNeutral(f, S, crouched) {
  if (crouched) { setState(f, 'crouch'); f.st = CROUCH_IN; } else setState(f, 'idle');
  f.vx = 0; f.kvx = 0; f.thrown = false;
  actionable(f, S);
  if (f.state === 'dash_f' || f.state === 'dash_b') dashTick(f, S);
}

function dashTick(f, S) {
  const back = f.state === 'dash_b', d = back ? S.dashB : S.dashF;
  if (f.st >= DASH_ACTIONABLE) {                         // actionable window: jump or crouch out of the dash tail
    const y = dirY(f.buf.dir);
    if (y > 0) { startJump(f); return; }
    if (y < 0) { setState(f, 'crouch'); f.vx = 0; return; }
  }
  f.vx = (back ? -f.facing : f.facing) * d.v0 * Math.pow(d.decay, f.st);
  if (back && f.st < BACKDASH_INV) f.inv = 'strike';
}

// Pushback: initial speed (px/tick), decays by KB_DECAY per tick.
function knockback(f) {
  f.vx = f.kvx;
  f.kvx = Math.abs(f.kvx) < 0.05 ? 0 : f.kvx * KB_DECAY;
}

// Landing from a launch / knockdown arc: lie down (or quick-rise if two buttons / direction + button were pressed on the landing tick).
const QR_WINDOW = 3;
function quickRise(f) {
  let n = 0;
  for (let i = 0; i < 5; i++) if (pressAge(f.buf, i) < QR_WINDOW) n++;
  return n >= 2 || (n >= 1 && f.buf.dir !== 5);
}
function land(f) {
  f.vx = 0; f.thrown = false;
  if (f.ko) { setState(f, 'ko'); return; }
  f.qr = quickRise(f);
  f.lieT = f.qr ? 8 : LIE[f.kd === 'soft' ? 'soft' : 'hard'];
  f.wake = f.qr ? 6 : WAKE_INV;
  setState(f, 'lying');
}

export function stepFighter(f, raw) {
  const S = STATS[f.id];
  pushInput(f.buf, raw, f.facing);
  f.px = f.x;
  if (f.stop > 0) { f.stop--; return; }                  // hitstop: frozen (the input buffer keeps recording)
  f.inv = null;
  f.st++;                                                // st = ticks since entering the state (0 on the entry tick)

  switch (f.state) {
    case 'idle': case 'walk_f': case 'walk_b': case 'crouch': case 'guard':
      actionable(f, S);
      if (f.state === 'dash_f' || f.state === 'dash_b') dashTick(f, S);
      break;
    case 'prejump':
      if (f.st >= PREJUMP) { takeoff(f, S); airTick(f, S); if (f.state === 'air') tryAttack(f, true); }
      break;
    case 'air':
      airTick(f, S);
      if (f.state === 'air') tryAttack(f, true);
      break;
    case 'dash_f': case 'dash_b':
      if (f.st >= DASH_TICKS[f.state === 'dash_f' ? 'f' : 'b']) { setState(f, 'idle'); f.vx = 0; actionable(f, S); }
      else dashTick(f, S);
      break;
    case 'attack': {
      const m = getMove(f.id, f.move);
      f.mt++;
      // LP then LK (or the reverse) a couple of ticks apart: the jab that started becomes the throw (SIMUL_WINDOW leniency)
      if (f.mt <= SIMUL_WINDOW + 1 && (f.move === 'LP' || f.move === 'LK') && !f.contact) {
        const other = f.move === 'LP' ? BTN.LK : BTN.LP;
        if ((livePresses(f.buf) & other) && Math.abs(f.buf.press[BTN_IDX[other]] - f.pr) <= SIMUL_WINDOW) {
          take(f.buf, other); startAttack(f, 'throw'); break;
        }
      }
      if (m.state === 'air') {
        if (integrate(f, S)) {
          f.vx = 0;
          if (f.contact === 'hit' || f.contact === 'block') { f.move = null; backToNeutral(f, S, false); }
          else { f.move = null; setState(f, 'landlag'); }
        }
      } else if (f.mt > moveTotal(m)) {
        f.move = null;
        backToNeutral(f, S, m.state === 'crouch' && dirY(f.buf.dir) < 0);
      }
      break;
    }
    case 'throwing': case 'thrown': break;                // driven by combat.stepThrow
    case 'tech':
      f.vx = f.st >= 1 && f.st <= 8 ? f.kvx * TECH_PUSH : 0;
      if (f.st >= TECH_TICKS) backToNeutral(f, S, false);
      break;
    case 'landlag':
      if (f.st >= LANDLAG) backToNeutral(f, S, false);
      break;
    case 'hit': case 'blockstun':
      if (f.stun <= 0) backToNeutral(f, S, f.state === 'hit' ? f.crouchHit && dirY(f.buf.dir) < 0 : f.stance === 'crouch' && dirY(f.buf.dir) < 0);
      else { f.stun--; knockback(f); }
      break;
    case 'launched':
      if (integrate(f, S)) land(f);
      break;
    case 'lying':
      if (f.qr) f.vx = f.st >= 1 && f.st <= 7 ? -f.facing * 4 : 0;   // roll back 28px
      if (f.st >= f.lieT) { setState(f, 'getup'); f.vx = 0; f.inv = 'all'; }
      break;
    case 'getup':
      if (f.st < f.wake) f.inv = 'all';
      if (f.st >= GETUP) { f.qr = false; backToNeutral(f, S, false); }
      break;
    default: break;
  }
  f.x += f.vx;
  pickAnim(f);
}

function pickAnim(f) {
  switch (f.state) {
    case 'idle':
      if (f.outT > 0) { f.outT--; play(f, 'crouch_out'); }
      else if (f.landT > 0) { f.landT--; play(f, 'jump_land'); }
      else play(f, 'idle');
      break;
    case 'walk_f': play(f, 'walk_f'); break;
    case 'walk_b': play(f, 'walk_b'); break;
    case 'crouch': if (f.st < CROUCH_IN) playAt(f, 'crouch_in', f.st); else playAt(f, 'crouch_hold', f.st - CROUCH_IN); break;
    case 'guard': playAt(f, f.stance === 'crouch' ? 'block_crouch_in' : 'block_stand_in', f.st); if (f.st >= 3) playAt(f, f.stance === 'crouch' ? 'block_crouch_hold' : 'block_stand_hold', f.st - 3); break;
    case 'blockstun': playAt(f, f.stance === 'crouch' ? 'block_crouch_in' : 'block_stand_in', f.st); if (f.st >= 3) playAt(f, f.stance === 'crouch' ? 'block_crouch_hold' : 'block_stand_hold', f.st - 3); break;
    case 'prejump': playAt(f, 'jump_prep', f.st); break;
    case 'air':
      if (f.jumpDir > 0) playAt(f, 'jump_f', f.st);
      else if (f.jumpDir < 0) playAt(f, 'jump_b', f.st);
      else if (f.st < 8) playAt(f, 'jump_rise', f.st);
      else if (f.st < 16) playAt(f, 'jump_apex', f.st - 8);
      else playAt(f, 'jump_fall', f.st - 16);
      break;
    case 'dash_f': playAt(f, 'dash_f', f.st); break;
    case 'dash_b': playAt(f, 'dash_b', f.st); break;
    case 'attack': playAt(f, getMove(f.id, f.move).anim, f.mt - 1); break;
    case 'landlag': playAt(f, 'jump_land', f.st); break;
    case 'hit': playAt(f, f.react, f.st); break;
    case 'launched': if (f.thrown) playAt(f, 'thrown', 8 + Math.min(f.st, 15)); else playAt(f, 'hit_air', f.st); break;
    case 'tech': playAt(f, 'block_stand_hold', f.st); break;
    case 'lying': playAt(f, f.qr ? 'lying' : 'knockdown', f.st); break;
    case 'getup': playAt(f, 'getup', Math.min(f.st, 23)); break;
    case 'ko': playAt(f, 'ko', f.st); break;
    default: break;
  }
}

// World-space boxes for the debug overlay and hit detection: [x, y(bottom), w, h].
export function toWorld(f, b) {
  const x = f.facing > 0 ? f.x + b[0] : f.x - b[0] - b[2];
  return [x, f.y + b[1], b[2], b[3]];
}
export function boxesOf(f) {
  const k = BOXES[boxKind(f)];
  return {
    push: k.push ? toWorld(f, k.push) : null,
    hurt: k.hurt.map((b) => toWorld(f, b)),
    hit: activeHits(f).filter((a) => a.hit.level !== 'T').map((a) => a.box),
    throw: activeHits(f).filter((a) => a.hit.level === 'T').map((a) => a.box),
  };
}

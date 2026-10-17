// Fighter state machine, locomotion part (pure; plain-object state). GAME_DESIGN 2.1-2.3.
// Sim space: x right, y = height above the floor (up positive), origin at the feet centre. vx is world space (+ = right).
import { STATS } from '../data/stats.js';
import { ANIMS, animTotal } from '../data/anims.js';
import { createBuffer, pushInput, doubleTap, dirX, dirY, FWD, BACK } from '../core/buffer.js';

export const PREJUMP = 3;
export const JUMP_VY = 8.0;
export const JUMP_FWD = 2.6, JUMP_BACK = -2.2;
export const DASH_TICKS = { f: animTotal(ANIMS.dash_f), b: animTotal(ANIMS.dash_b) };   // 14 / 16
export const DASH_ACTIONABLE = 8;            // dash can be cancelled into jump/crouch after this many ticks
export const BACKDASH_INV = 6;               // strike invulnerable ticks 1-6
export const CROUCH_IN = 6, CROUCH_OUT = 6, LAND_ANIM = 3;

// Local boxes (facing right, feet origin, y up): [x, y, w, h]. GAME_DESIGN 2.2.
export const BOXES = {
  stand: { push: [-12, 0, 24, 92], hurt: [[-9, 72, 20, 26], [-14, 34, 28, 40], [-12, 0, 24, 36]] },
  crouch: { push: [-12, 0, 24, 60], hurt: [[-14, 26, 28, 34], [-14, 0, 28, 28]] },
  air: { push: [-10, 16, 20, 60], hurt: [[-13, 18, 26, 66]] },
  lying: { push: null, hurt: [[-30, 0, 60, 16]] },
};
const ACTIONABLE = new Set(['idle', 'walk_f', 'walk_b', 'crouch']);
export const isActionable = (f) => ACTIONABLE.has(f.state);

export function createFighter(id, idx, x, facing) {
  return {
    id, idx, x, y: 0, vx: 0, vy: 0, px: x, facing,
    state: 'idle', st: 0,                       // st = ticks spent in the current state
    anim: 'idle', at: 0,                        // animation name + ticks into it (renderer maps to a pose frame)
    hp: STATS[id].hp, buf: createBuffer(),
    jumpDir: 0, landT: 0, outT: 0, inv: null,
  };
}

const setState = (f, s) => { if (f.state !== s) { f.state = s; f.st = 0; } };
const play = (f, name) => { if (f.anim !== name) { f.anim = name; f.at = 0; } else f.at++; };
const playAt = (f, name, at) => { f.anim = name; f.at = at; };

export const boxKind = (f) => (f.state === 'air' ? 'air' : f.state === 'crouch' || f.state === 'prejump' ? 'crouch' : 'stand');

function startJump(f) {
  setState(f, 'prejump');
  f.vx = 0; f.landT = 0; f.outT = 0;
}
function takeoff(f, S) {
  const x = dirX(f.buf.dir);
  f.jumpDir = x;                                         // facing-relative: +1 forward, -1 back, 0 neutral
  f.vy = JUMP_VY * S.jump;
  f.vx = f.facing * (x > 0 ? JUMP_FWD : x < 0 ? JUMP_BACK : 0) * S.jump;
  setState(f, 'air');
}
function airTick(f, S) {
  f.y += f.vy - S.gravity / 2;                           // exact discretisation of the parabola: apex v^2/2g, airtime 2v/g
  f.vy -= S.gravity;
  if (f.y <= 0 && f.vy < 0) {
    f.y = 0; f.vy = 0; f.vx = 0; f.landT = LAND_ANIM;
    setState(f, 'idle');
  }
}

function locomote(f, S) {
  const d = f.buf.dir, x = dirX(d), y = dirY(d);
  if (y > 0) { startJump(f); return; }
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

export function stepFighter(f, raw) {
  const S = STATS[f.id];
  pushInput(f.buf, raw, f.facing);
  f.px = f.x; f.inv = null;
  f.st++;                                                // st = ticks since entering the state (0 on the entry tick)

  switch (f.state) {
    case 'idle': case 'walk_f': case 'walk_b': case 'crouch':
      locomote(f, S);
      if (f.state === 'dash_f' || f.state === 'dash_b') dashTick(f, S);
      break;
    case 'prejump':
      if (f.st >= PREJUMP) { takeoff(f, S); airTick(f, S); }
      break;
    case 'air':
      airTick(f, S);
      break;
    case 'dash_f': case 'dash_b':
      if (f.st >= DASH_TICKS[f.state === 'dash_f' ? 'f' : 'b']) { setState(f, 'idle'); f.vx = 0; locomote(f, S); }
      else dashTick(f, S);
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
    default: break;
  }
}

// World-space boxes for the debug overlay and (later) hit detection: [x, y(bottom), w, h].
export function toWorld(f, b) {
  const x = f.facing > 0 ? f.x + b[0] : f.x - b[0] - b[2];
  return [x, f.y + b[1], b[2], b[3]];
}
export function boxesOf(f) {
  const k = BOXES[boxKind(f)];
  return {
    push: k.push ? toWorld(f, k.push) : null,
    hurt: k.hurt.map((b) => toWorld(f, b)),
    hit: [], throw: [],
  };
}

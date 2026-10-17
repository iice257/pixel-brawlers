// Match / round state machine (pure, serialisable). GAME_DESIGN 4.
// Wraps the per-tick sim: it decides which inputs reach the fighters, when the timer runs, when a round ends and how it resets.
import { STAGE_W, KO_PACE, SLOW_EVERY } from '../config2.js';
import { rngNext } from '../core/rng.js';
import { createFighter } from './fighter.js';
import { createCamera } from './camera.js';

export const START_GAP = 80;                 // round start: 80px apart around the stage centre
export const ROUND_TIME = 99, TIMER_TICKS = 60;
export const PHASE_TICKS = { intro: 90, call: 72, fight: 30, timeup: 60 };
export { KO_PACE, SLOW_EVERY };               // final-hit hitstop, slow-mo, post-KO hold (config2.js); the match-deciding KO is longer

const NEUTRAL = { left: false, right: false, up: false, down: false, buttons: 0 };

// rounds: best-of 1 / 3 / 5
export function createMatch({ rounds = 3 } = {}) {
  return { phase: 'intro', t: 0, round: 1, need: Math.ceil(rounds / 2), wins: [0, 0], timer: ROUND_TIME, tt: 0, end: null, winner: null };
}

const go = (m, phase) => { m.phase = phase; m.t = 0; };
const pct = (f, stats) => f.hp / stats;

// Fresh fighters at the start positions with full HP; meter carries over.
export function resetRound(w) {
  const mid = STAGE_W / 2;
  const old = w.fighters;
  w.fighters = [createFighter(old[0].id, 0, mid - START_GAP / 2, 1), createFighter(old[1].id, 1, mid + START_GAP / 2, -1)];
  w.fighters.forEach((f, i) => { f.meter = old[i].meter ?? 0; });
  w.camera = createCamera(w.fighters, w.stage.w);
  w.thr = null;
}

const decided = (m) => (m.wins[0] >= m.need || m.wins[1] >= m.need) && m.wins[0] !== m.wins[1];
const capped = (m) => m.round >= 2 * m.need + 1;           // endless draws: stop at the round cap

function endRound(w, winner, reason) {
  const m = w.match;
  if (winner < 0) { m.wins[0]++; m.wins[1]++; } else m.wins[winner]++;
  const final = decided(m) || capped(m);
  m.end = { winner, reason, perfect: winner >= 0 && w.fighters[winner].dmgTaken === 0, final, pose: rngNext(w.rng) < 0.5 ? 'win_a' : 'win_b' };
}
const pace = (m) => KO_PACE[m.end.final ? 'final' : 'normal'];

// maxHp[i]: used for the time-over comparison (HP percentage)
function checkEnd(w, maxHp) {
  const m = w.match, [a, b] = w.fighters;
  const ka = a.hp <= 0, kb = b.hp <= 0;
  if (ka || kb) {
    endRound(w, ka && kb ? -1 : ka ? 1 : 0, ka && kb ? 'double' : 'ko');
    a.stop = b.stop = pace(m).stop;
    go(m, 'ko');
    return;
  }
  if (m.timer <= 0) {
    const pa = pct(a, maxHp[0]), pb = pct(b, maxHp[1]);
    endRound(w, Math.abs(pa - pb) < 1e-9 ? -1 : pa > pb ? 0 : 1, 'time');
    go(m, 'timeup');
  }
}

function nextRound(w) {
  const m = w.match, [wa, wb] = m.wins;
  if (decided(m) || capped(m)) { m.winner = wa === wb ? -1 : wa > wb ? 0 : 1; go(m, 'over'); return; }
  m.round++; m.timer = ROUND_TIME; m.tt = 0; m.end = null;
  resetRound(w);
  go(m, 'call');
}

// ops = { sim(w, inputs), cam(w) } from world.js; maxHp = [hp0, hp1] full-health values
export function stepMatch(w, inputs, ops, maxHp) {
  const m = w.match;
  m.t++;
  switch (m.phase) {
    case 'intro':
      ops.sim(w, [NEUTRAL, NEUTRAL]);
      w.fighters.forEach((f) => { f.anim = 'intro'; f.at = m.t - 1; });          // round-1 intro pose sequence (88 ticks)
      if (m.t >= PHASE_TICKS.intro) go(m, 'call');
      break;
    case 'call': ops.sim(w, [NEUTRAL, NEUTRAL]); if (m.t >= PHASE_TICKS.call) go(m, 'fight'); break;
    case 'fight': case 'play':
      ops.sim(w, inputs);
      m.tt++;
      if (m.tt % TIMER_TICKS === 0 && m.timer > 0) m.timer--;
      checkEnd(w, maxHp);
      if (m.phase === 'fight' && m.t >= PHASE_TICKS.fight) go(m, 'play');
      break;
    case 'ko': {
      const p = pace(m);
      if (m.t <= p.stop || (m.t - p.stop) % SLOW_EVERY === 0) ops.sim(w, [NEUTRAL, NEUTRAL]); else ops.cam(w);
      if (m.t >= p.stop + p.slow) go(m, 'post');
      break;
    }
    case 'timeup': ops.sim(w, [NEUTRAL, NEUTRAL]); if (m.t >= PHASE_TICKS.timeup) go(m, 'post'); break;
    case 'post': case 'over': {
      ops.sim(w, [NEUTRAL, NEUTRAL]);
      const win = m.end?.winner >= 0 ? w.fighters[m.end.winner] : null;          // winner plays win_a/win_b, loser stays down
      if (win && win.state === 'idle') { win.anim = m.end.pose; win.at = m.phase === 'over' ? 999 : m.t - 1; }
      if (m.phase === 'post' && m.t >= pace(m).post) nextRound(w);
      break;
    }
    default: break;
  }
}

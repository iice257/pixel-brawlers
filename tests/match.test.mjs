import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, run, I, B, N, snap } from './helpers.mjs';
import { PHASE_TICKS, KO_PACE, ROUND_TIME, START_GAP } from '../src/engine/match.js';
const KO_STOP = KO_PACE.normal.stop, KO_SLOW = KO_PACE.normal.slow;   // first KO of a best-of-3 is not match-deciding
import { createWorld, step } from '../src/engine/world.js';
import { STATS } from '../src/data/stats.js';

const LP = { 0: I({ buttons: B('LP') }), 1: N, 3: N };
// Steps until the match reaches `phase`; returns how many ticks that took.
const until = (w, phase, p1 = {}, p2 = {}, max = 2000) => { let n = 0; run(w, max, p1, p2, () => { n++; return w.match.phase === phase; }); return n; };
// A world already in the fight phase (hp tweaks go through setup).
const fighting = (o = {}) => { const w = arena({ ...o, match: true }); until(w, 'fight'); return w; };

test('match flow: intro 90, ROUND 72, FIGHT 30, then play; inputs locked until FIGHT', () => {
  const w = arena({ match: true, gap: 80 });
  const held = { 0: I({ right: true }) };
  const x0 = w.fighters[0].x;
  assert.equal(until(w, 'call', held), PHASE_TICKS.intro);
  assert.equal(w.fighters[0].x, x0, 'locked during the intro');
  assert.equal(until(w, 'fight', held), PHASE_TICKS.call);
  assert.equal(w.fighters[0].x, x0, 'locked during ROUND N');
  w.match.t = 0;
  const log = [];
  run(w, PHASE_TICKS.fight, held, {}, () => { log.push(w.match.phase); });
  assert.equal(w.match.phase, 'play');
  assert.ok(w.fighters[0].x > x0, 'unlocked at FIGHT');
});

test('timer starts at 99 and drops one every 60 ticks of play', () => {
  const w = fighting();
  assert.equal(w.match.timer, ROUND_TIME);
  run(w, 60, {}, {});
  assert.equal(w.match.timer, ROUND_TIME - 1);
  run(w, 120, {}, {});
  assert.equal(w.match.timer, ROUND_TIME - 3);
});

test('time over: higher HP percentage wins the round', () => {
  const w = fighting();
  w.fighters[1].hp = Math.round(STATS[w.fighters[1].id].hp * 0.5);
  w.match.timer = 1; w.match.tt = 0;
  run(w, 60, {}, {});
  assert.equal(w.match.phase, 'timeup');
  assert.deepEqual(w.match.wins, [1, 0]);
  assert.equal(w.match.end.reason, 'time');
  assert.equal(w.match.end.winner, 0);
});

test('time over with equal HP percentage is a draw round: both get a point', () => {
  const w = fighting();
  w.match.timer = 1; w.match.tt = 0;
  run(w, 60, {}, {});
  assert.deepEqual(w.match.wins, [1, 1]);
  assert.equal(w.match.end.winner, -1);
});

test('KO: final hit, 24 ticks of hitstop, then 24 ticks of slow-mo (40 if it decides the match); PERFECT when the winner took no damage', () => {
  const w = fighting();
  const [a, d] = w.fighters;
  d.hp = 5;
  const t0 = until(w, 'ko', LP);
  assert.ok(t0 > 0 && t0 < 40, 'the LP lands');
  assert.deepEqual(w.match.wins, [1, 0]);
  assert.equal(w.match.end.reason, 'ko');
  assert.equal(w.match.end.perfect, true);
  assert.ok(d.hp === 0 && d.ko);
  assert.equal(a.stop, KO_STOP);
  const ys = [];
  run(w, KO_STOP + KO_SLOW, {}, {}, () => { ys.push(d.y + d.x); });
  assert.equal(w.match.phase, 'post');
  const moves = ys.slice(KO_STOP).filter((v, i, arr) => i > 0 && v !== arr[i - 1]).length;
  assert.ok(moves <= KO_SLOW / 4 + 1, `slow-mo: ${moves} moves in ${KO_SLOW} ticks`);
});

test('winner who took damage is not PERFECT', () => {
  const w = fighting();
  w.fighters[0].dmgTaken = 10;
  w.fighters[1].hp = 5;
  until(w, 'ko', LP);
  assert.equal(w.match.end.perfect, false);
});

test('double KO is a draw round: both get a point', () => {
  const w = fighting({ p1: 'surge', p2: 'surge' });
  w.fighters[0].hp = 5; w.fighters[1].hp = 5;
  until(w, 'ko', { 0: I({ buttons: B('LP') }), 1: N, 3: N }, { 0: I({ buttons: B('LP') }), 1: N, 3: N });
  assert.equal(w.match.end.reason, 'double');
  assert.deepEqual(w.match.wins, [1, 1]);
  assert.equal(w.match.end.perfect, false);
});

test('between rounds: full HP, 80px apart around the centre, meter retained; then ROUND 2', () => {
  const w = fighting();
  w.fighters[0].meter = 600;
  w.fighters[1].hp = 5;
  until(w, 'ko', LP);
  until(w, 'call');
  assert.equal(w.match.round, 2);
  assert.equal(w.match.timer, ROUND_TIME);
  const [a, d] = w.fighters;
  assert.equal(a.hp, STATS[a.id].hp);
  assert.equal(d.hp, STATS[d.id].hp);
  assert.equal(a.meter, 600);
  assert.equal(d.x - a.x, START_GAP);
  assert.equal(a.x + d.x, 576);
  assert.equal(a.state, 'idle');
  assert.equal(a.dmgTaken, 0);
});

test('best of 3: two round wins end the match; one win and a draw do not', () => {
  const w = fighting();
  const win = () => { w.fighters[1].hp = 5; w.fighters[0].x = 268; w.fighters[1].x = 308; until(w, 'ko', LP); until(w, 'fight'); };
  win();                                                    // round 1 -> P1
  assert.equal(w.match.phase, 'fight');
  assert.deepEqual(w.match.wins, [1, 0]);
  w.fighters[1].hp = 5; w.fighters[0].x = 268; w.fighters[1].x = 308;
  until(w, 'ko', LP);
  assert.deepEqual(w.match.wins, [2, 0]);
  until(w, 'over');
  assert.equal(w.match.winner, 0);
  const frozen = snap(w.match);
  run(w, 200, {}, {});
  assert.deepEqual(snap(w.match), { ...frozen, t: frozen.t + 200 });
});

test('a drawn round plus a win is not enough in best of 3 (1-1 after a draw, play on)', () => {
  const w = fighting();
  w.match.timer = 1; w.match.tt = 0;
  run(w, 60, {}, {});                                       // draw -> [1,1]
  until(w, 'fight');
  assert.equal(w.match.round, 2);
  assert.deepEqual(w.match.wins, [1, 1]);
});

test('best of 1 ends after a single round', () => {
  const w = arena({ match: 1 });
  until(w, 'fight');
  w.fighters[1].hp = 5;
  until(w, 'ko', LP);
  until(w, 'over');
  assert.equal(w.match.winner, 0);
});

test('a world without a match runs the bare sim (no intro lock)', () => {
  const w = arena();
  run(w, 10, { 0: I({ right: true }) }, {});
  assert.ok(w.fighters[0].x > 268);
  assert.equal(w.match, null);
});

test('match is deterministic and serialisable mid-round', () => {
  const a = fighting();
  a.fighters[1].hp = 5;
  run(a, 10, LP, {});
  const b = JSON.parse(JSON.stringify(a));
  run(a, 300, {}, {});
  run(b, 300, {}, {});
  assert.deepEqual(snap(a), snap(b));
  assert.equal(createWorld({ match: true }).match.phase, 'intro');
  void step;
});

test('match-deciding KO uses the longer pacing; winner plays a win pose, loser stays down', () => {
  const w = arena({ match: 1 });
  until(w, 'fight');
  w.fighters[1].hp = 5;
  until(w, 'ko', LP);
  assert.equal(w.match.end.final, true);
  const t0 = w.match.t;
  const n = until(w, 'post');
  assert.equal(n, KO_PACE.final.stop + KO_PACE.final.slow - t0);
  run(w, 40, {}, {});
  assert.ok(['win_a', 'win_b'].includes(w.fighters[0].anim));
  assert.equal(w.fighters[1].state, 'ko');
});

test('round-1 intro plays the intro animation on both fighters', () => {
  const w = arena({ match: true });
  run(w, 30, {}, {});
  assert.equal(w.fighters[0].anim, 'intro');
  assert.equal(w.fighters[1].anim, 'intro');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, I, B, N } from './helpers.mjs';
import { step } from '../src/engine/world.js';
import { BTN, livePresses } from '../src/core/buffer.js';
import { getMove } from '../src/engine/moves.js';
import { comboScale, stunDecay, SCALE, JUGGLE_POINTS } from '../src/engine/combat.js';
import { CHAIN_MAX } from '../src/engine/fighter.js';
import { registerSpecial, unregisterSpecial } from '../src/engine/specials.js';
import { TEMPLATE } from '../src/data/moves-template.js';

const PRESS = { LP: { buttons: B('LP') }, '2LP': { down: true, buttons: B('LP') }, LK: { buttons: B('LK') }, '2LK': { down: true, buttons: B('LK') }, HP: { buttons: B('HP') }, '2HP': { down: true, buttons: B('HP') } };
const hold = (id) => ({ down: id.startsWith('2') });

// P1 plays `seq` as a chain: the next press goes in on the first tick after contact (hitstop over) while the current move is still the one before it.
function chain(w, seq, p2 = N, extra = 60) {
  const a = w.fighters[0], moves = [], hist = [];
  let i = 0, pend = false;
  for (let t = 0; t < 120 + extra; t++) {
    let in1 = I(hold(seq[i]));
    if (t === 0) in1 = I(PRESS[seq[0]]);
    else if (!pend && i < seq.length - 1 && a.contact && a.move === seq[i] && a.stop === 0) { i++; pend = true; in1 = I(PRESS[seq[i]]); }
    else pend = false;
    step(w, [in1, p2]);
    if (a.state === 'attack' && moves[moves.length - 1] !== a.move) moves.push(a.move);
    hist.push({ chain: a.chain.length, mt: a.mt, move: a.move });
  }
  return { moves, hist };
}

test('LP > 2LP > HP chains on hit', () => {
  const w = arena({ gap: 36 });
  const { moves } = chain(w, ['LP', '2LP', 'HP']);
  assert.deepEqual(moves.slice(0, 3), ['LP', '2LP', 'HP']);
  assert.equal(w.fighters[1].cb.n, 3);
});

test('LP > 2LP > HP chains on block too, with no damage (defender in the corner so pushback cannot break the string)', () => {
  const w = arena({ gap: 36 });
  w.fighters[0].x = 524; w.fighters[1].x = 560;
  const { moves } = chain(w, ['LP', '2LP', 'HP'], I({ right: true }));
  assert.deepEqual(moves.slice(0, 3), ['LP', '2LP', 'HP']);
  assert.equal(w.fighters[1].hp, 1000);
  assert.equal(w.fighters[1].cb.n, 0);
});

test('chain needs contact: a whiffed jab does not cancel', () => {
  const w = arena({ gap: 120 });
  const { hist } = chain(w, ['LP', '2LP'], N, 0);
  const moves = hist.filter((h) => h.move).map((h) => h.move);
  assert.equal(moves[0], 'LP');
  // the jab runs its full 11 ticks before anything else starts
  assert.equal(hist.slice(0, 11).every((h) => h.move === 'LP'), true);
  assert.equal(w.fighters[1].hp, 1000);
});

test('the same normal cannot repeat inside a chain (LP > LP is not a cancel)', () => {
  const w = arena({ gap: 36 });
  const { hist } = chain(w, ['LP', 'LP'], N, 0);
  const lp = hist.filter((h) => h.move === 'LP');
  let firstEnd = lp.findIndex((h, k) => k && h.mt < lp[k - 1].mt);
  if (firstEnd < 0) firstEnd = lp.length;
  assert.ok(lp.slice(0, firstEnd).every((h, k, arr) => !k || h.mt >= arr[k - 1].mt), 'mt only climbs until the first jab ends');
  assert.ok(firstEnd >= getMove('surge', 'LP').startup + getMove('surge', 'LP').active + getMove('surge', 'LP').recovery, 'the first jab was not cut short');
});

test('a heavier normal ends the chain: HP has no chain cancel, so nothing follows it as a cancel', () => {
  const w = arena({ gap: 36 });
  const { hist } = chain(w, ['LP', 'HP', 'LK'], N, 0);
  const hp = hist.filter((h) => h.move === 'HP');
  assert.ok(hp.length > 0);
  assert.ok(hp.every((h, k) => !k || h.mt >= hp[k - 1].mt), 'HP ran uninterrupted');
});

test('chains are at most 4 normals long', () => {
  const w = arena({ gap: 36 });
  const { moves, hist } = chain(w, ['LP', '2LP', 'LK', '2LK', 'HP']);
  assert.deepEqual(moves.slice(0, 4), ['LP', '2LP', 'LK', '2LK']);
  assert.ok(Math.max(...hist.map((h) => h.chain)) <= CHAIN_MAX);
});

test('special cancel plumbing: a flagged normal that connected cancels into a registered special, a whiff does not', () => {
  registerSpecial({
    id: 'fakeSp', fighter: 'surge', kind: 'special', match: (f) => (livePresses(f.buf) & BTN.HK) !== 0,
    move: { ...TEMPLATE.HP, id: 'fakeSp', anim: 'HP', cancels: [] },
  });
  try {
    const run = (gap) => {
      const w = arena({ gap });
      const a = w.fighters[0], moves = [];
      for (let t = 0; t < 30; t++) {
        const in1 = t === 0 ? I({ buttons: B('LP') }) : a.contact && a.mt >= 5 && t % 2 === 0 ? I({ buttons: B('HK') }) : N;
        step(w, [in1, N]);
        if (a.state === 'attack' && moves[moves.length - 1] !== a.move) moves.push(a.move);
      }
      return moves;
    };
    assert.deepEqual(run(36).slice(0, 2), ['LP', 'fakeSp']);
    assert.notEqual(run(150)[1], 'fakeSp', 'whiff: no cancel');
  } finally { unregisterSpecial('fakeSp'); }
});

// ---- combo scaling, hitstun decay, combo end
// One LP landing: put SURGE's jab on its first active tick and BRICK in hitstun, then step.
function jabHit(w) {
  const [a, d] = w.fighters, S = getMove('surge', 'LP').startup;
  a.state = 'attack'; a.move = 'LP'; a.mt = S; a.st = S; a.hitDone = [false]; a.contact = null; a.stop = 0; a.vx = 0;
  if (d.state !== 'hit') { d.state = 'hit'; d.st = 0; }
  d.stun = 30; d.stop = 0; d.x = a.x + 36;
  const hp = d.hp;
  step(w, [N, N]);
  return { dmg: hp - d.hp, stun: d.stun };
}

test('damage scaling: 100/90/80/70/60 % over a 5-hit combo, floor 30%', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 12].map((n) => Math.round(comboScale(n) * 100)), [...SCALE.slice(0, 7), 40, 40]);
  const w = arena({ gap: 36 });
  const dmg = [1, 2, 3, 4, 5].map(() => jabHit(w).dmg);
  assert.deepEqual(dmg, [30, 27, 24, 21, 18]);
  assert.equal(w.fighters[1].cb.n, 5);
  assert.equal(w.fighters[1].cb.dmg, 120);
  assert.equal(comboScale(3, true), 0.8);
  assert.equal(comboScale(7, true), 0.5, 'supers floor at 50%');
});

test('hitstun decays x0.85 from hit 4 and x0.7 from hit 7', () => {
  assert.deepEqual([1, 3, 4, 6, 7, 9].map(stunDecay), [1, 1, 0.85, 0.85, 0.7, 0.7]);
  const w = arena({ gap: 36 });
  const stuns = Array.from({ length: 7 }, () => jabHit(w).stun);
  assert.deepEqual(stuns, [11, 11, 11, 9, 9, 9, 8]);
});

test('a combo ends when the victim is actionable again, then a fresh hit starts a new combo at 100%', () => {
  const w = arena({ gap: 36 });
  jabHit(w); jabHit(w);
  assert.equal(w.fighters[1].cb.end, null);
  for (let t = 0; t < 60; t++) step(w, [N, N]);
  const d = w.fighters[1];
  assert.ok(d.cb.end !== null && d.cb.n === 2);
  assert.equal(jabHit(w).dmg, 30);
  assert.equal(d.cb.n, 1);
});

// ---- juggle
function airHit(w, id, points) {
  const [a, d] = w.fighters, S = getMove('surge', id).startup;
  a.state = 'attack'; a.move = id; a.mt = S; a.st = S; a.hitDone = [false]; a.contact = null; a.y = 40; a.vy = 0; a.vx = 0; a.stop = 0; a.airUsed = true;
  d.state = 'launched'; d.y = 40; d.vy = 1; d.vx = 0; d.x = a.x + 36; d.stop = 0; d.thrown = false; d.kd = 'hard';
  if (points != null) d.cb.juggle = points;
  const hp = d.hp, n = d.cb.n;
  step(w, [N, N]);
  return { hit: d.hp < hp, n: d.cb.n - n, points: d.cb.juggle };
}

test('2HP launches and opens a juggle with 3 points; soft-knockdown HK opens none', () => {
  const w = arena({ gap: 36 });
  for (let t = 0; t < 12; t++) step(w, [t === 0 ? I({ down: true, buttons: B('HP') }) : I({ down: true }), N]);
  assert.equal(w.fighters[1].state, 'launched');
  assert.equal(w.fighters[1].cb.juggle, JUGGLE_POINTS);
  const hk = arena({ gap: 36 });
  for (let t = 0; t < 14; t++) step(hk, [t === 0 ? I({ buttons: B('HK') }) : N, N]);
  assert.equal(hk.fighters[1].state, 'launched');
  assert.equal(hk.fighters[1].cb.juggle, 0);
});

test('juggle points: light costs 1, heavy 2, nothing hits at 0 or when the cost is more than what is left', () => {
  const w = arena({ gap: 36 });
  w.fighters[1].cb.n = 1;
  assert.deepEqual(airHit(w, 'jHP', 3), { hit: true, n: 1, points: 1 });
  assert.equal(airHit(w, 'jHP', 1).hit, false, 'heavy (2) with 1 point left');
  assert.deepEqual(airHit(w, 'jLP', 1), { hit: true, n: 1, points: 0 });
  assert.equal(airHit(w, 'jLP', 0).hit, false, 'no points: falls');
  assert.equal(w.fighters[1].cb.n, 3, 'only the hits that connected counted');
});

test('juggle hits keep a hard knockdown and re-launch the victim', () => {
  const w = arena({ gap: 36 });
  w.fighters[1].cb.n = 1;
  airHit(w, 'jLK', 3);
  assert.equal(w.fighters[1].state, 'launched');
  assert.equal(w.fighters[1].kd, 'hard');
  assert.ok(w.fighters[1].vy > 0);
});

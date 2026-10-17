import test from 'node:test';
import assert from 'node:assert/strict';
import { BTN, RING, socd, dirOf, faceDir, createBuffer, pushInput, livePresses, take, pairLive, takeThrow, takeEX,
  doubleTap, recent, FWD, BACK } from '../src/core/buffer.js';
import { createRng, rngNext } from '../src/core/rng.js';

const R = (o = {}) => ({ left: false, right: false, up: false, down: false, buttons: 0, ...o });
const run = (b, samples, facing = 1) => samples.forEach((s) => pushInput(b, s, facing));
const idle = (n) => Array.from({ length: n }, () => R());

test('SOCD: left+right is neutral, up+down is up', () => {
  assert.deepEqual(socd(true, true, false, false), { x: 0, y: 0 });
  assert.deepEqual(socd(true, true, true, false), { x: 0, y: 1 });
  assert.deepEqual(socd(false, false, true, true), { x: 0, y: 1 });
  assert.deepEqual(socd(true, false, false, true), { x: -1, y: -1 });
});

test('numpad directions and facing flip', () => {
  assert.equal(dirOf(-1, 1), 7); assert.equal(dirOf(0, 1), 8); assert.equal(dirOf(1, 1), 9);
  assert.equal(dirOf(-1, 0), 4); assert.equal(dirOf(0, 0), 5); assert.equal(dirOf(1, 0), 6);
  assert.equal(dirOf(-1, -1), 1); assert.equal(dirOf(0, -1), 2); assert.equal(dirOf(1, -1), 3);
  for (const [d, f] of [[6, 4], [4, 6], [9, 7], [7, 9], [3, 1], [1, 3], [8, 8], [5, 5], [2, 2]]) assert.equal(faceDir(d, -1), f);
  for (let d = 1; d <= 9; d++) assert.equal(faceDir(d, 1), d);
});

test('push converts to facing-relative direction', () => {
  const b = createBuffer();
  pushInput(b, R({ right: true }), 1); assert.equal(b.dir, 6);
  pushInput(b, R({ right: true }), -1); assert.equal(b.dir, 4);
  pushInput(b, R({ left: true, down: true }), -1); assert.equal(b.dir, 3);
  pushInput(b, R({ left: true, right: true, up: true, down: true }), 1); assert.equal(b.dir, 8);
});

test('ring buffer keeps exactly 90 ticks', () => {
  const b = createBuffer();
  run(b, idle(200));
  assert.equal(b.dirs.length, RING); assert.equal(b.btns.length, RING);
  pushInput(b, R({ right: true }));
  assert.equal(b.dirs.length, RING); assert.equal(b.dirs.at(-1), 6);
  assert.equal(recent(b, 30).length, 30);
});

test('button press stays live for 5 ticks, then expires', () => {
  const b = createBuffer();
  run(b, [R({ buttons: BTN.LP })]);
  assert.equal(livePresses(b), BTN.LP);
  run(b, idle(3));                                  // press age 3
  assert.equal(livePresses(b), BTN.LP);
  run(b, idle(1));                                  // age 4: last live tick
  assert.equal(livePresses(b), BTN.LP);
  run(b, idle(1));                                  // age 5: expired
  assert.equal(livePresses(b), 0);
});

test('take consumes a press once; holding does not re-press', () => {
  const b = createBuffer();
  run(b, [R({ buttons: BTN.HK }), R({ buttons: BTN.HK })]);
  assert.equal(take(b, BTN.HK), BTN.HK);
  assert.equal(take(b, BTN.HK), 0);
  run(b, [R({ buttons: BTN.HK })]);                 // still held: no new press
  assert.equal(livePresses(b), 0);
  run(b, [R(), R({ buttons: BTN.HK })]);            // release, press again
  assert.equal(livePresses(b), BTN.HK);
});

test('take only consumes the requested mask', () => {
  const b = createBuffer();
  run(b, [R({ buttons: BTN.LP | BTN.LK })]);
  assert.equal(take(b, BTN.LP), BTN.LP);
  assert.equal(livePresses(b), BTN.LK);
});

test('simultaneous window is 3 ticks (LP+LK throw)', () => {
  // LP pressed first and held, LK pressed `gap` ticks after it (gap 0 = same tick)
  const withGap = (gap) => {
    const b = createBuffer();
    if (gap === 0) return run(b, [R({ buttons: BTN.LP | BTN.LK })]) ?? b;
    run(b, [R({ buttons: BTN.LP }), ...Array.from({ length: gap - 1 }, () => R({ buttons: BTN.LP }))]);
    run(b, [R({ buttons: BTN.LP | BTN.LK })]);
    return b;
  };
  for (const gap of [0, 1, 2, 3]) assert.equal(pairLive(withGap(gap), BTN.LP, BTN.LK), true, `gap ${gap}`);
  assert.equal(pairLive(withGap(4), BTN.LP, BTN.LK), false, 'gap 4 is outside the window');
  const c = withGap(2);
  assert.equal(takeThrow(c), true);
  assert.equal(takeThrow(c), false);                 // consumed
  assert.equal(livePresses(c), 0);
});

test('EX needs two buttons of the same family', () => {
  const p = createBuffer(); run(p, [R({ buttons: BTN.LP | BTN.HP })]);
  assert.equal(takeEX(p), 'punch');
  const k = createBuffer(); run(k, [R({ buttons: BTN.LK }), R({ buttons: BTN.LK | BTN.HK })]);
  assert.equal(takeEX(k), 'kick');
  const x = createBuffer(); run(x, [R({ buttons: BTN.LP | BTN.HK })]);
  assert.equal(takeEX(x), null);
});

test('double tap forward within 12 ticks', () => {
  const tap = (gap) => {
    const b = createBuffer();
    run(b, [R({ right: true }), ...idle(gap)]);
    pushInput(b, R({ right: true }), 1);
    return doubleTap(b, FWD);
  };
  assert.equal(tap(1), true);
  assert.equal(tap(11), true);                       // edges 12 apart
  assert.equal(tap(12), false);                      // 13 apart
  // second tap only counts on its press edge, not while held
  const b = createBuffer();
  run(b, [R({ right: true }), R(), R({ right: true })]);
  assert.equal(doubleTap(b, FWD), true);
  pushInput(b, R({ right: true }), 1);
  assert.equal(doubleTap(b, FWD), false);
  // a single long hold is not a double tap
  const h = createBuffer();
  run(h, Array.from({ length: 10 }, () => R({ right: true })));
  assert.equal(doubleTap(h, FWD), false);
});

test('double tap back respects facing', () => {
  const b = createBuffer();
  run(b, [R({ right: true }), R(), R({ right: true })], -1);   // facing left: screen-right is "back"
  assert.equal(doubleTap(b, BACK), true);
  assert.equal(doubleTap(b, FWD), false);
});

test('rng is deterministic and serialisable', () => {
  const a = createRng(42), b = createRng(42);
  const xs = Array.from({ length: 5 }, () => rngNext(a)), ys = Array.from({ length: 5 }, () => rngNext(b));
  assert.deepEqual(xs, ys);
  const c = JSON.parse(JSON.stringify(a));
  assert.equal(rngNext(c), rngNext(a));
});

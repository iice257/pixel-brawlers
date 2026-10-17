import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, MIN_X, MAX_X, MAX_SEP } from '../src/engine/world.js';
import { BTN } from '../src/core/buffer.js';
import { DASH_TICKS } from '../src/engine/fighter.js';
import { camPos } from '../src/engine/camera.js';

const N = { left: false, right: false, up: false, down: false, buttons: 0 };
const I = (o = {}) => ({ ...N, ...o });
const tick = (w, a = N, b = N, n = 1) => { for (let i = 0; i < n; i++) step(w, [a, b]); return w; };
const gap = (w) => Math.abs(w.fighters[1].x - w.fighters[0].x);

test('world starts 80px apart around the stage centre, facing each other', () => {
  const w = createWorld();
  assert.equal(w.fighters[1].x - w.fighters[0].x, 80);
  assert.equal((w.fighters[0].x + w.fighters[1].x) / 2, 288);
  assert.deepEqual([w.fighters[0].facing, w.fighters[1].facing], [1, -1]);
});

test('walk speeds follow the stats table', () => {
  const w = createWorld({ p1: 'surge', p2: 'brick' });
  const x0 = w.fighters[0].x;
  tick(w, I({ right: true }), N, 10);
  assert.ok(Math.abs(w.fighters[0].x - (x0 + 21)) < 1e-9);          // SURGE 2.1 px/tick forward
  const w2 = createWorld({ p1: 'surge', p2: 'brick' });
  tick(w2, I({ left: true }), N, 10);
  assert.ok(Math.abs(w2.fighters[0].x - (248 - 17)) < 1e-9);        // back walk 1.7
  const w3 = createWorld();
  tick(w3, N, I({ right: true }), 10);                                // BRICK faces left: screen-right is walking back, 1.6
  assert.ok(Math.abs(w3.fighters[1].x - (328 + 16)) < 1e-9);
});

test('jump: ~39 airborne ticks, ~78px apex, 3 tick prejump (SURGE)', () => {
  const w = createWorld({ p1: 'surge', p2: 'brick' });
  w.fighters[1].x = 450;                                              // out of the way
  const f = w.fighters[0];
  tick(w, I({ up: true }));
  assert.equal(f.state, 'prejump');
  let pre = 1, air = 0, apex = 0;
  while (f.state === 'prejump') { tick(w); if (f.state === 'prejump') pre++; }
  assert.equal(pre, 3, 'prejump lasts 3 ticks');
  while (f.state === 'air') { air++; apex = Math.max(apex, f.y); tick(w); }
  assert.ok(air >= 38 && air <= 40, `airtime ${air}`);
  assert.ok(apex >= 77 && apex <= 79, `apex ${apex}`);
  assert.equal(f.y, 0);
  assert.equal(f.state, 'idle');
});

test('forward and back jump horizontal speeds (2.6 / -2.2)', () => {
  for (const [dir, vx] of [[{ right: true }, 2.6], [{ left: true }, -2.2], [{}, 0]]) {
    const w = createWorld();
    w.fighters[1].x = 520;
    const f = w.fighters[0];
    tick(w, I({ up: true, ...dir }), N, 4);
    assert.equal(f.state, 'air');
    assert.ok(Math.abs(f.vx - vx) < 1e-9, `vx ${f.vx} vs ${vx}`);
  }
});

test('BRICK jump multiplier 0.97 lowers the apex', () => {
  const w = createWorld({ p1: 'brick', p2: 'surge' });
  w.fighters[1].x = 450;
  const f = w.fighters[0];
  let apex = 0;
  tick(w, I({ up: true }), N, 4);
  while (f.state === 'air') { apex = Math.max(apex, f.y); tick(w); }
  assert.ok(Math.abs(apex - 78 * 0.97 * 0.97) < 1.5, `apex ${apex}`);
});

test('crouch needs a held down; release returns to idle', () => {
  const w = createWorld();
  tick(w, I({ down: true }), N, 8);
  assert.equal(w.fighters[0].state, 'crouch');
  assert.equal(w.fighters[0].anim, 'crouch_hold');
  tick(w, N, N, 1);
  assert.equal(w.fighters[0].state, 'idle');
  assert.equal(w.fighters[0].anim, 'crouch_out');
});

test('forward dash: double tap within 12 ticks, 14 ticks long', () => {
  const w = createWorld();
  const f = w.fighters[0];
  tick(w, I({ right: true })); tick(w, N); tick(w, I({ right: true }));
  assert.equal(f.state, 'dash_f');
  let n = 1;
  const x0 = f.x;
  while (f.state === 'dash_f') { tick(w); if (f.state === 'dash_f') n++; }
  assert.equal(n, DASH_TICKS.f);
  assert.ok(f.x - x0 > 25, `dash distance ${f.x - x0}`);
});

test('back dash: 16 ticks, strike invulnerable on ticks 1-6 only', () => {
  const w = createWorld();
  w.fighters[0].x = 288; w.fighters[1].x = 360;
  const f = w.fighters[0];
  tick(w, I({ left: true })); tick(w, N); tick(w, I({ left: true }));
  assert.equal(f.state, 'dash_b');
  const inv = [f.inv];
  let n = 1;
  while (f.state === 'dash_b') { tick(w); if (f.state === 'dash_b') { inv.push(f.inv); n++; } }
  assert.equal(n, DASH_TICKS.b);
  assert.deepEqual(inv.slice(0, 6), Array(6).fill('strike'));
  assert.ok(inv.slice(6).every((v) => v === null));
});

test('no dash when taps are more than 12 ticks apart', () => {
  const w = createWorld();
  tick(w, I({ right: true })); tick(w, N, N, 12); tick(w, I({ right: true }));
  assert.equal(w.fighters[0].state, 'walk_f');
});

test('grounded fighters cannot overlap (walk into each other for 300 ticks)', () => {
  const w = createWorld();
  for (let i = 0; i < 300; i++) { tick(w, I({ right: true }), I({ left: true })); assert.ok(gap(w) >= 24 - 1e-6, `tick ${i} gap ${gap(w)}`); }
  const w2 = createWorld();
  for (let i = 0; i < 300; i++) { tick(w2, I({ right: true }), N); assert.ok(gap(w2) >= 24 - 1e-6); }
});

test('pushing a fighter into the corner keeps both on stage and apart', () => {
  const w = createWorld();
  for (let i = 0; i < 400; i++) {
    tick(w, I({ right: true }), N);
    for (const f of w.fighters) assert.ok(f.x >= MIN_X - 1e-9 && f.x <= MAX_X + 1e-9);
    assert.ok(gap(w) >= 24 - 1e-6, `tick ${i}`);
  }
  assert.ok(w.fighters[1].x > 500, 'pushed into the right corner');
});

test('stage clamp [16, 560]', () => {
  const w = createWorld();
  tick(w, I({ left: true }), I({ left: true }), 400);                 // both walk into the left wall
  assert.equal(w.fighters[0].x, MIN_X);
  assert.ok(w.fighters[1].x >= MIN_X + 24 - 1e-6);
});

test('max separation 296: walking away is stopped', () => {
  const w = createWorld();
  for (let i = 0; i < 600; i++) { tick(w, I({ left: true }), I({ right: true })); assert.ok(gap(w) <= MAX_SEP + 1e-6, `tick ${i} gap ${gap(w)}`); }
  assert.ok(gap(w) > MAX_SEP - 3);
});

test('facing turns toward the opponent when grounded and actionable, not in the air', () => {
  const w = createWorld({ p1: 'surge', p2: 'brick' });
  const [a, b] = w.fighters;
  a.x = 288; b.x = 340; b.facing = -1;
  tick(w, I({ up: true }), N, 6);                                   // a jumps straight up
  assert.equal(a.state, 'air');
  a.x = 400;                                                        // teleport over b (cross-up)
  tick(w);
  assert.equal(a.facing, 1, 'no turn while airborne');
  while (a.state === 'air') tick(w);
  assert.equal(a.facing, -1, 'turns on landing');
  assert.equal(b.facing, 1);
});

test('airborne bodies push 1px/tick apart instead of overlapping', () => {
  const w = createWorld();
  const [a, b] = w.fighters;
  a.x = 300; b.x = 304; b.facing = -1;
  a.y = 40; a.vy = 0; a.state = 'air'; a.st = 12;
  const before = Math.abs(a.x - b.x);
  tick(w);
  assert.ok(Math.abs(a.x - b.x) > before, 'pushed apart');
  assert.ok(Math.abs(a.x - b.x) - before <= 2 + 1e-9, 'at most 1px each');
});

test('camera follows the midpoint with ease and clamps to the stage', () => {
  const w = createWorld();
  const cx = () => camPos(w.camera).x;
  assert.equal(cx(), 96);                                           // midpoint 288 - 192
  tick(w, I({ left: true }), I({ left: true }), 200);
  assert.ok(cx() < 96);
  assert.ok(cx() >= 0);
  tick(w, I({ right: true }), I({ right: true }), 800);
  assert.equal(cx(), 192);                                          // right stage edge: 576 - 384
  for (const f of w.fighters) assert.ok(f.x - cx() >= 0 && f.x - cx() <= 384, 'fighters stay on screen');
});

test('camera lifts up to 14px for jumpers', () => {
  const w = createWorld();
  w.fighters[1].x = 450;
  tick(w, I({ up: true }), N, 25);
  assert.ok(w.camera.lift > 5 && w.camera.lift <= 14, `lift ${w.camera.lift}`);
  tick(w, N, N, 80);
  assert.ok(w.camera.lift < 0.5);
});

test('world is serialisable and deterministic (clone steps identically)', () => {
  const script = (i) => [I({ right: i % 40 < 20, up: i % 70 === 3, down: i % 90 > 80, buttons: i % 17 === 0 ? BTN.LP : 0 }), I({ left: i % 50 < 30 })];
  const a = createWorld();
  for (let i = 0; i < 150; i++) step(a, script(i));
  const b = JSON.parse(JSON.stringify(a));
  for (let i = 150; i < 400; i++) { step(a, script(i)); step(b, script(i)); }
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

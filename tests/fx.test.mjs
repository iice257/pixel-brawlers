import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, I, B, N } from './helpers.mjs';
import { step } from '../src/engine/world.js';
import { createFx, tickFx, shakeAmp, shakeTicks, FX_OPTIONS } from '../src/gfx/fx.js';

// Step the world and the FX together, collecting every engine event the tick produced (tickFx clears them).
function drive(w, fx, n, p1, p2 = () => N) {
  const log = [];
  for (let t = 0; t < n; t++) {
    step(w, [p1(t), p2(t)]);
    for (const e of w.events) log.push({ ...e, t });
    tickFx(fx, w);
  }
  return log;
}
const press = (b, o = {}) => (t) => (t === 0 ? I({ buttons: B(b), ...o }) : I(o));

test('a light hit emits one event, with the point inside the box overlap', () => {
  const w = arena({ gap: 36 }), fx = createFx();
  const ev = drive(w, fx, 20, press('LP')).filter((e) => e.type === 'hit');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].block, false);
  assert.equal(ev[0].heavy, false);
  assert.equal(ev[0].by, 0);
  assert.equal(ev[0].to, 1);
  assert.ok(ev[0].dmg > 0);
  assert.ok(Math.abs(ev[0].x - w.fighters[1].x) < 60 && ev[0].y > 0 && ev[0].y < 120);
});

test('a heavy hit is flagged heavy; a block is flagged block with no damage', () => {
  const heavy = drive(arena({ gap: 40 }), createFx(), 30, press('HP')).filter((e) => e.type === 'hit');
  assert.equal(heavy.length, 1);
  assert.equal(heavy[0].heavy, true);
  const blk = drive(arena({ gap: 40 }), createFx(), 30, press('HP'), () => I({ right: true })).filter((e) => e.type === 'hit');
  assert.equal(blk.length, 1);
  assert.equal(blk[0].block, true);
  assert.equal(blk[0].dmg, 0);
});

test('events are cleared every sim tick, so a hit is reported exactly once', () => {
  const w = arena({ gap: 36 });
  let seen = 0;
  for (let t = 0; t < 40; t++) { step(w, [t === 0 ? I({ buttons: B('LP') }) : N, N]); seen += w.events.length; }
  assert.equal(seen, 1);
});

test('a killing blow emits a ko event after the hit', () => {
  const w = arena({ gap: 36 }), fx = createFx();
  w.fighters[1].hp = 5;
  const ev = drive(w, fx, 20, press('LP'));
  const types = ev.map((e) => e.type);
  assert.deepEqual(types.slice(0, 2), ['hit', 'ko']);
});

test('fx: each hit kind spawns its sprite with the right lifetime, and the pool never grows', () => {
  const w = arena({ gap: 36 }), fx = createFx();
  const size = fx.pool.length;
  const kinds = new Set();
  let ticks = 0;
  // light
  w.events.push({ type: 'hit', x: 100, y: 60, level: 'M', dmg: 30, block: false, heavy: false, by: 0, to: 1, dir: 1, tick: 0 });
  tickFx(fx, w);
  for (const p of fx.pool) if (p.on) kinds.add(p.kind);
  assert.deepEqual([...kinds], ['spark_light']);
  assert.equal(fx.pool.find((p) => p.on).dur, 4);
  w.events.push({ type: 'hit', x: 100, y: 60, level: 'M', dmg: 80, block: false, heavy: true, by: 0, to: 1, dir: 1, tick: 0 });
  tickFx(fx, w);
  const heavy = fx.pool.filter((p) => p.on && p.kind === 'spark_heavy');
  assert.equal(heavy.length, 1);
  assert.equal(heavy[0].dur, 8);
  assert.equal(fx.pool.filter((p) => p.on && p.kind === 'spk').length, 6);
  w.events.push({ type: 'hit', x: 100, y: 60, level: 'M', dmg: 0, block: true, heavy: false, by: 0, to: 1, dir: 1, tick: 0 });
  tickFx(fx, w);
  assert.equal(fx.pool.filter((p) => p.on && p.kind === 'block').length, 1);
  assert.equal(fx.pool.find((p) => p.on && p.kind === 'block').dur, 5);
  // everything expires
  while (ticks++ < 30) tickFx(fx, w);
  assert.equal(fx.pool.filter((p) => p.on).length, 0);
  assert.equal(fx.pool.length, size);
});

test('fx: spawning past the pool size recycles slots instead of allocating', () => {
  const w = arena(), fx = createFx();
  const size = fx.pool.length;
  for (let i = 0; i < 400; i++) w.events.push({ type: 'hit', x: 100, y: 60, level: 'M', dmg: 50, block: false, heavy: true, by: 0, to: 1, dir: 1, tick: 0 });
  tickFx(fx, w);
  assert.equal(fx.pool.length, size);
  assert.ok(fx.stats.active <= size);
});

test('defender tint: white 2 ticks, then red 4, then clean; a block tints nothing', () => {
  const w = arena(), fx = createFx();
  w.events.push({ type: 'hit', x: 100, y: 60, level: 'M', dmg: 30, block: false, heavy: false, by: 0, to: 1, dir: 1, tick: 0 });
  const seq = [];
  tickFx(fx, w);
  seq.push(`${fx.tint[1].white}/${fx.tint[1].red}`);
  for (let i = 0; i < 7; i++) { tickFx(fx, w); seq.push(`${fx.tint[1].white}/${fx.tint[1].red}`); }
  assert.deepEqual(seq, ['1/4', '0/4', '0/3', '0/2', '0/1', '0/0', '0/0', '0/0']);
  w.events.push({ type: 'hit', x: 100, y: 60, level: 'M', dmg: 0, block: true, heavy: false, by: 0, to: 1, dir: 1, tick: 0 });
  tickFx(fx, w);
  assert.equal(fx.tint[1].white + fx.tint[1].red, 0);
});

test('shake: amplitude = clamp(dmg/12, 1, 6), duration = dmg/6 ticks, options off/low/full', () => {
  assert.deepEqual([6, 12, 36, 72, 200].map((d) => shakeAmp(d, false)), [1, 1, 3, 6, 6]);
  assert.deepEqual([6, 30, 60].map((d) => shakeTicks(d, false)), [2, 5, 10]);
  const hit = (mode, dmg = 72) => {
    const w = arena(), fx = createFx();
    fx.options = { ...FX_OPTIONS, shake: mode };
    w.events.push({ type: 'hit', x: 100, y: 60, level: 'M', dmg, block: false, heavy: true, by: 0, to: 1, dir: 1, tick: 0 });
    tickFx(fx, w);
    return fx.shake;
  };
  assert.equal(hit('full').amp, 6);
  assert.equal(hit('low').amp, 3);
  assert.equal(hit('off').amp, 0);
  assert.equal(hit('full').total, 12);
});

test('ko: burst, ring and flash overlay', () => {
  const w = arena(), fx = createFx();
  w.events.push({ type: 'ko', x: 100, y: 60, to: 1, tick: 0 });
  tickFx(fx, w);
  assert.ok(fx.pool.some((p) => p.on && p.kind === 'ko_star'));
  assert.ok(fx.pool.some((p) => p.on && p.kind === 'ko_ring'));
  assert.ok(fx.flash > 0);
});

test('afterimage: a dash drops up to 3 ghosts that fade out within 8 ticks', () => {
  const w = arena({ gap: 200 }), fx = createFx();
  const log = [];
  for (let t = 0; t < 40; t++) {
    step(w, [[0, 4].includes(t) ? I({ right: true }) : N, N]);   // double-tap forward
    tickFx(fx, w);
    log.push(fx.ghosts[0].filter((g) => g.on).length);
  }
  const peak = Math.max(...log);
  assert.ok(peak >= 1 && peak <= 3, `ghosts ${peak}`);
  assert.equal(log[log.length - 1], 0, 'all ghosts faded');
});

test('sim step cost: a full tick with both fighters in a combo stays under 4 ms (mean over 2000 ticks)', () => {
  const w = arena({ gap: 36, match: true });
  const fx = createFx();
  for (let t = 0; t < 300; t++) step(w, [N, N]); // through the intro
  const t0 = process.hrtime.bigint();
  const n = 2000;
  for (let t = 0; t < n; t++) {
    step(w, [t % 20 === 0 ? I({ buttons: B('LP') }) : N, t % 30 === 0 ? I({ buttons: B('LK') }) : N]);
    tickFx(fx, w);
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n;
  assert.ok(ms < 4, `mean ${ms.toFixed(3)} ms per tick`);
});

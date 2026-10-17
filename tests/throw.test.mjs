import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, run, I, B, dirs, N, snap } from './helpers.mjs';
import { TECH_WINDOW, THROW_RELEASE, THROW_TOTAL } from '../src/engine/combat.js';
import { LIE, GETUP, WAKE_INV } from '../src/engine/fighter.js';

const THROW = { 0: I({ buttons: B('LP', 'LK') }), 1: N };
const states = (w, n, p1, p2, who = 1) => { const log = []; run(w, n, p1, p2, () => { log.push(w.fighters[who].state); }); return log; };
const grabTick = () => {
  const w = arena();
  let g = -1;
  run(w, 12, THROW, {}, (ww, t) => { if (ww.fighters[1].state === 'thrown') { g = t; return true; } return false; });
  return g;
};
const landTick = () => {
  const w = arena();
  let l = -1;
  run(w, 160, THROW, {}, (ww, t) => { if (ww.fighters[1].state === 'lying') { l = t; return true; } return false; });
  return l;
};

test('throw: LP+LK grabs, deals 100 damage, hard knockdown, lies 34, then getup 22', () => {
  const w = arena();
  const kd = [];
  const log = [];
  run(w, 160, THROW, {}, () => { log.push(w.fighters[1].state); kd.push(w.fighters[1].kd); });
  assert.ok(log.includes('thrown'));
  assert.equal(w.fighters[1].hp, 900);
  assert.ok(kd.includes('hard'));
  assert.equal(log.filter((s) => s === 'lying').length, LIE.hard);
  assert.equal(log.filter((s) => s === 'getup').length, GETUP);
});

test('throw range: connects at 46px centre distance, whiffs at 47', () => {
  const near = arena({ gap: 46 }), far = arena({ gap: 47 });
  run(near, 12, THROW, {});
  run(far, 12, THROW, {});
  assert.ok(['thrown', 'launched'].includes(near.fighters[1].state));
  assert.equal(far.fighters[1].state, 'idle');
  assert.equal(far.fighters[1].hp, 1000);
});

test('throw whiff: attacker is locked for 31 ticks (startup 5, active 2, recovery 24 total)', () => {
  const w = arena({ gap: 100 });
  const s = states(w, 40, THROW, {}, 0);
  assert.equal(s.indexOf('idle'), 31);
  assert.ok(s.slice(0, 31).every((x) => x === 'attack'));
});

test('LP then LK two ticks apart still throws, four ticks apart is a jab then a kick', () => {
  const w = arena();
  run(w, 30, { 0: I({ buttons: B('LP') }), 1: N, 2: I({ buttons: B('LK') }), 3: N }, {});
  assert.equal(w.fighters[1].hp, 900);
  const late = arena();
  run(late, 30, { 0: I({ buttons: B('LP') }), 1: N, 4: I({ buttons: B('LK') }), 5: N }, {});
  assert.notEqual(late.fighters[1].hp, 900);
});

test('a throw does not connect on a defender in hitstun or in the air', () => {
  const stun = arena();
  stun.fighters[1].state = 'hit'; stun.fighters[1].stun = 30;
  run(stun, 12, THROW, {});
  assert.equal(stun.fighters[1].hp, 1000);
  assert.equal(stun.fighters[1].state, 'hit');
  const air = arena();
  air.fighters[1].state = 'air'; air.fighters[1].y = 40; air.fighters[1].vy = 1;
  run(air, 12, THROW, {});
  assert.equal(air.fighters[1].hp, 1000);
});

test('forward throw keeps sides, back throw swaps them', () => {
  const fwd = arena(), back = arena();
  run(fwd, 80, THROW, {});
  run(back, 80, { 0: I({ buttons: B('LP', 'LK'), ...dirs.back(0) }), 1: N }, {});
  const [fa, fd] = fwd.fighters, [ba, bd] = back.fighters;
  assert.ok(fd.x > fa.x, 'forward throw: the defender stays in front');
  assert.ok(bd.x < ba.x, 'back throw: the defender lands behind the attacker');
});

test('throw tech: LP+LK inside the window -> no damage, pushed apart, neutral after 20', () => {
  const g = grabTick();
  assert.ok(g > 0);
  const w = arena();
  const log = [];
  run(w, 80, THROW, { [g + 1]: I({ buttons: B('LP', 'LK') }), [g + 2]: N }, () => log.push(w.fighters[1].state));
  assert.equal(w.fighters[1].hp, 1000);
  assert.equal(w.fighters[0].hp, 1000);
  assert.equal(log.filter((s) => s === 'tech').length, 20);
  assert.ok(w.fighters[1].x - w.fighters[0].x > 40 + 40, 'both slid apart');
});

test('tech window boundary: 7 ticks after the grab works, 8 fails', () => {
  const g = grabTick();
  for (const [late, teched] of [[TECH_WINDOW, true], [TECH_WINDOW + 1, false]]) {
    const w = arena();
    run(w, 60, THROW, { [g + late]: I({ buttons: B('LP', 'LK') }), [g + late + 1]: N });
    assert.equal(w.fighters[1].hp === 1000, teched, `press at grab+${late}`);
  }
});

test('throw timeline: defender released at THROW_RELEASE, attacker free at THROW_TOTAL', () => {
  const w = arena();
  const [a, d] = w.fighters;
  let grab = -1, release = -1, free = -1;
  run(w, 80, THROW, {}, (ww, t) => {
    if (grab < 0 && d.state === 'thrown') grab = t;
    if (grab >= 0 && release < 0 && d.state === 'launched') release = t;
    if (grab >= 0 && free < 0 && a.state === 'idle') free = t;
    return free >= 0;
  });
  assert.equal(release - grab, THROW_RELEASE);
  assert.equal(free - grab, THROW_TOTAL);
});

test('wakeup is invulnerable for 3 ticks, quick-rise wakeup for 6', () => {
  const count = (p2) => { const w = arena(); let c = 0; run(w, 160, THROW, p2, () => { const d = w.fighters[1]; if (d.state === 'getup' && d.inv === 'all') c++; }); return c; };
  assert.equal(count({}), WAKE_INV);
  const l = landTick();
  assert.equal(count({ [l]: I({ buttons: B('LP', 'HP') }), [l + 1]: N }), 6);
});

test('quick-rise: two buttons or direction+button on landing -> roll back 28px, lie 8; early or none -> full lie', () => {
  const l = landTick();
  const trial = (p2) => {
    const w = arena();
    let x0 = null, lie = 0;
    run(w, 160, THROW, p2, () => {
      const d = w.fighters[1];
      if (d.state === 'lying') { if (x0 === null) x0 = d.x; lie++; }
      return d.state === 'getup';
    });
    return { lie, dx: w.fighters[1].x - x0 };
  };
  const two = trial({ [l]: I({ buttons: B('LP', 'HP') }), [l + 1]: N });
  assert.equal(two.lie, 8);
  assert.ok(Math.abs(two.dx - 28) < 1.5, `rolled ${two.dx}`);
  assert.equal(trial({ [l]: I({ buttons: B('LK'), ...dirs.fwd(1) }), [l + 1]: N }).lie, 8);
  assert.equal(trial({ [l - 3]: I({ buttons: B('LP', 'HP') }), [l - 2]: N }).lie, LIE.hard);
  assert.equal(trial({}).lie, LIE.hard);
});

test('a lying fighter can only be hit by low hitboxes', () => {
  for (const [btn, down, hit] of [['LP', false, false], ['HP', false, false], ['LK', true, true]]) {
    const w = arena();
    const d = w.fighters[1];
    d.state = 'lying'; d.lieT = 60; d.st = 0; d.kd = 'hard';
    run(w, 30, { 0: I({ buttons: B(btn), down }) }, {});
    assert.equal(d.hp < 1000, hit, `${down ? '2' : ''}${btn} vs lying`);
  }
});

test('two simultaneous throws tech each other', () => {
  const w = arena();
  run(w, 40, THROW, { 0: I({ buttons: B('LP', 'LK') }) });
  assert.equal(w.fighters[0].hp, 1000);
  assert.equal(w.fighters[1].hp, 1000);
});

test('mid-throw world is serialisable and deterministic', () => {
  const a = arena();
  run(a, 12, THROW, {});
  const b = JSON.parse(JSON.stringify(a));
  run(a, 60, {}, {});
  run(b, 60, {}, {});
  assert.deepEqual(snap(a), snap(b));
});

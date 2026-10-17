import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, run, firstTick, snap, I, B, dirs, N } from './helpers.mjs';
import { getMove, advantage, allMoves } from '../src/engine/moves.js';
import { blocksLevel } from '../src/engine/combat.js';
import { LIE, GETUP, LANDLAG } from '../src/engine/fighter.js';

const GROUND = ['LP', 'HP', 'LK', 'HK', '2LP', '2LK', '2HP', '2HK'];
const AIR = ['jLP', 'jHP', 'jLK', 'jHK'];
const press = (name, extra = {}) => ({ 0: I({ buttons: B(name), ...extra }), 1: I(extra) });
const LOW = new Set(['2LK', '2HK']);

// Tick on which the defender (P2) enters `state`, and the first ticks on which attacker / defender leave their move / stun.
function trace(w, p1, p2, n = 160) {
  const out = { contact: -1, a: -1, d: -1 };
  run(w, n, p1, p2, (ww, t) => {
    const [a, d] = ww.fighters;
    if (out.contact < 0 && (d.state === 'hit' || d.state === 'blockstun' || d.state === 'launched')) out.contact = t;
    if (out.contact >= 0 && t > out.contact) {
      if (out.a < 0 && a.state !== 'attack') out.a = t;
      if (out.d < 0 && d.state !== 'hit' && d.state !== 'blockstun') out.d = t;
    }
    return out.a >= 0 && out.d >= 0;
  });
  return out;
}

test('LP vs idle: lands on tick startup+1, hitstop 7, hitstun 11, advantage +4', () => {
  const w = arena();
  const [a, d] = w.fighters;
  const m = getMove('surge', 'LP');
  const t = firstTick(w, 20, press('LP'), {}, (ww) => ww.fighters[1].state === 'hit');
  assert.equal(t, m.startup, 'first tick index = startup (tick startup+1 of the move)');
  assert.equal(d.stun, 11);
  assert.equal(a.stop, 7); assert.equal(d.stop, 7);
  assert.equal(d.hp, 1000 - 30);
  const w2 = arena();
  const r = trace(w2, press('LP'), {});
  assert.equal(r.d - r.a, 4);
});

test('measured advantage equals the frame data for every grounded normal, hit and block (both fighters)', () => {
  for (const fighter of ['surge', 'brick']) {
    for (const id of GROUND) {
      const m = getMove(fighter, id), adv = advantage(m);
      const crouch = id.startsWith('2');
      const p1 = { 0: I({ buttons: B(id.replace('2', '')), ...(crouch ? { down: true } : {}) }), 1: I(crouch ? { down: true } : {}) };
      // hit
      if (adv.hit != null) {
        const r = trace(arena({ p1: fighter, p2: 'brick' }), p1, {});
        assert.equal(r.contact, m.startup, `${fighter} ${id} contact`);
        assert.equal(r.d - r.a, adv.hit, `${fighter} ${id} hit advantage`);
      }
      // block (low moves need a crouching guard)
      const guard = LOW.has(id) ? dirs.downBack(1) : dirs.back(1);
      const w = arena({ p1: fighter, p2: 'brick' });
      const r = trace(w, p1, { 0: I(guard) });
      assert.equal(w.fighters[1].hp, 1000, `${fighter} ${id} blocked: no chip`);
      assert.equal(r.d - r.a, adv.block, `${fighter} ${id} block advantage`);
    }
  }
});

test('a hit connects once per defender per hit entry', () => {
  const w = arena();
  run(w, 40, press('LK'), {});
  assert.equal(w.fighters[1].hp, 1000 - 40);
});

test('high attacks whiff on a crouching defender; mid and low connect', () => {
  const crouching = { 0: I({ down: true }) };
  const hitLate = (id, extra = {}, defender = crouching) => {
    const w = arena();
    run(w, 8, {}, defender);                       // let the defender settle first
    run(w, 40, { 0: I({ buttons: B(id.replace('2', '')), ...extra }), 1: I(extra) }, defender);
    return w.fighters[1].hp < 1000;
  };
  assert.equal(hitLate('LP'), false, 'LP (high) whiffs on a crouching defender');
  assert.equal(hitLate('HP'), true, 'HP (mid) connects');
  assert.equal(hitLate('2LK', { down: true }), true, '2LK (low) connects');
  assert.equal(hitLate('LP', {}, {}), true, 'a standing defender is hit by the same LP');
});

test('guard table: high/overhead need stand block, low needs crouch block, mid either, unblockable never', () => {
  assert.equal(blocksLevel('H', 'stand'), true);  assert.equal(blocksLevel('H', 'crouch'), false);
  assert.equal(blocksLevel('O', 'stand'), true);  assert.equal(blocksLevel('O', 'crouch'), false);
  assert.equal(blocksLevel('L', 'crouch'), true); assert.equal(blocksLevel('L', 'stand'), false);
  assert.equal(blocksLevel('M', 'stand'), true);  assert.equal(blocksLevel('M', 'crouch'), true);
  assert.equal(blocksLevel('U', 'stand'), false); assert.equal(blocksLevel('U', 'crouch'), false);
});

test('a low must be crouch-blocked; a standing guard is hit by it', () => {
  const lowP1 = { 0: I({ down: true, buttons: B('LK') }), 1: I({ down: true }) };
  const stand = arena(), crouch = arena();
  run(stand, 30, lowP1, { 0: I(dirs.back(1)) });
  run(crouch, 30, lowP1, { 0: I(dirs.downBack(1)) });
  assert.ok(stand.fighters[1].hp < 1000, 'standing guard loses to a low');
  assert.equal(crouch.fighters[1].hp, 1000, 'crouching guard blocks it');
});

test('blocking: BL held blocks, holding back blocks, neither is hit; blockstun and hitstop values', () => {
  for (const [label, guard, blocked] of [['back', dirs.back(1), true], ['BL', { buttons: B('BL') }, true], ['none', {}, false]]) {
    const w = arena();
    const d = w.fighters[1], a = w.fighters[0];
    let stopA = -1;
    run(w, 30, press('HP'), { 0: I(guard) }, (ww) => { if (stopA < 0 && d.state === 'blockstun') { stopA = a.stop; return true; } return false; });
    if (blocked) { assert.equal(d.state, 'blockstun', label); assert.equal(d.stun, 12, 'HP bs'); assert.equal(stopA, 10 - 2, 'blocked hitstop is 2 less'); assert.equal(d.hp, 1000); }
    else assert.notEqual(d.hp, 1000, label);
  }
});

test('hitstop freezes both fighters, the world tick keeps counting', () => {
  const w = arena();
  const [a, d] = w.fighters;
  run(w, 20, press('LP'), {}, (ww) => ww.fighters[1].state === 'hit');
  const mt = a.mt, at = d.at, x = d.x, tick = w.tick;
  run(w, 7, {}, {});
  assert.equal(a.mt, mt); assert.equal(d.at, at); assert.equal(d.x, x);
  assert.equal(w.tick, tick + 7);
  run(w, 1, {}, {});
  assert.equal(a.mt, mt + 1, 'attacker resumes once the stop is over');
});

test('trade: both fighters hit on the same tick and both take hitstop', () => {
  const w = arena({ p2: 'surge' });                    // same startup, so both jabs land together
  const both = { 0: I({ buttons: B('LP') }), 1: N };
  run(w, 8, both, both);
  const [a, d] = w.fighters;
  assert.equal(a.hp, 970); assert.equal(d.hp, 970);
  assert.equal(a.stop + d.stop > 0, true);
  const brick = arena();                              // different startups: SURGE (3) beats BRICK (4), no trade
  run(brick, 12, both, both);
  assert.equal(brick.fighters[0].hp, 1000);
  assert.equal(brick.fighters[1].hp, 970);
});

test('pushback: defender slides away, decaying; a cornered defender pushes the attacker back', () => {
  const w = arena();
  const d = w.fighters[1], x0 = d.x;
  run(w, 4, press('LP'), {});
  assert.ok(Math.abs(d.vx) === 0);
  run(w, 30, {}, {});
  assert.ok(d.x - x0 > 12, `slid ${d.x - x0}`);
  const c = arena();
  c.fighters[0].x = 520; c.fighters[1].x = 560;
  run(c, 30, press('HP'), {});
  assert.equal(c.fighters[1].x, 560);
  assert.ok(c.fighters[0].x < 520 - 3, `attacker pushed back to ${c.fighters[0].x}`);
});

test('guard follows the screen side: a cross-up swaps the required direction on the same tick', () => {
  const w = arena();
  const [a, d] = w.fighters;
  const lateral = { 0: I(dirs.back(1)) };      // BRICK holds right = away from SURGE on his left
  run(w, 2, press('LP'), lateral);
  a.x = d.x + 40; a.facing = -1;               // SURGE appears on BRICK's other side
  run(w, 10, {}, lateral);
  assert.ok(d.hp < 1000, 'holding the old back direction no longer guards');
});

test('damage = round(dmg * pwr * def); HP clamps at 0 and the KO falls to the floor', () => {
  const w = arena({ p1: 'brick', p2: 'surge' });
  const d = w.fighters[1];
  d.hp = 10;
  run(w, 200, press('HP'), {});
  assert.equal(d.hp, 0);
  assert.equal(d.ko, true);
  assert.equal(d.state, 'ko');
  const full = arena({ p1: 'brick', p2: 'surge' });
  run(full, 12, press('HP'), {});
  assert.equal(full.fighters[1].hp, 1000 - Math.round(80 * 1.1));
});

test('HK soft knockdown: launched, lies 22, gets up over 22, then idle', () => {
  const w = arena();
  const d = w.fighters[1];
  const log = [];
  run(w, 200, press('HK'), {}, (ww) => { log.push(d.state); return log.length > 12 && d.state === 'idle'; });
  const count = (s) => log.filter((x) => x === s).length;
  assert.ok(log.includes('launched'));
  assert.equal(count('lying'), LIE.soft);
  assert.equal(count('getup'), GETUP);
});

test('2HP launches and ends in a hard knockdown (lies 34)', () => {
  const w = arena();
  const d = w.fighters[1];
  let kd = null, lie = 0;
  run(w, 220, { 0: I({ down: true, buttons: B('HP') }), 1: I({ down: true }) }, {}, () => {
    if (d.state === 'launched') kd = d.kd;
    if (d.state === 'lying') lie++;
    return d.state === 'getup';
  });
  assert.equal(kd, 'hard');
  assert.equal(lie, LIE.hard);
});

test('all four air normals connect on a standing defender', () => {
  for (const id of AIR) {
    const w = arena({ gap: 30 });
    const [a, d] = w.fighters;
    const name = id.slice(1);
    let t = -1;
    run(w, 60, { 0: I({ up: true }), 2: I({ up: true, buttons: B(name) }), 3: I({ up: true }), 4: I({ up: true }) }, {}, (ww, k) => {
      if (t < 0 && d.hp < 1000) { t = k; return true; }
      return false;
    });
    assert.ok(t > 0, `${id} never connected`);
    assert.ok(t >= 3 + getMove('surge', id).startup, `${id} contact ${t} is not before startup`);
    assert.equal(a.state, 'attack');
  }
});

test('whiffed air normal has 3 ticks of landing lag; one that connected has none', () => {
  const w = arena({ gap: 250 });
  w.fighters[1].x = 520;
  const a = w.fighters[0];
  const states = [];
  run(w, 90, { 0: I({ up: true }), 2: I({ up: true, buttons: B('LP') }), 3: I({ up: true }), 4: N }, {}, () => { states.push(a.state); return states.length > 20 && a.state === 'idle'; });
  assert.equal(states.filter((s) => s === 'landlag').length, LANDLAG);
  const w2 = arena({ gap: 30 });
  const states2 = [];
  run(w2, 90, { 0: I({ up: true }), 2: I({ up: true, buttons: B('HK') }), 3: I({ up: true }), 4: N }, {}, () => { states2.push(w2.fighters[0].state); return states2.length > 20 && w2.fighters[0].state === 'idle'; });
  assert.ok(!states2.includes('landlag'));
});

test('buffered press: a button pressed in the last 5 ticks of recovery fires on the first actionable tick', () => {
  const w = arena();
  const a = w.fighters[0], m = getMove('surge', 'LP');
  const total = m.startup + m.active + m.recovery;
  let second = -1;
  run(w, 40, { 0: I({ buttons: B('LP') }), 1: N, [total - 3]: I({ buttons: B('LP') }), [total - 2]: N }, { 0: I({ down: true }) }, (ww, t) => {
    if (t > 2 && a.state === 'attack' && a.mt === 1) { second = t; return true; }
    return false;
  });
  assert.equal(second, total, 'second LP starts on the first actionable tick (index = total)');
});

test('world with combat is serialisable and deterministic', () => {
  const script = {}, other = {};
  for (let i = 0; i < 400; i += 9) script[i] = I({ right: (i / 9) % 3 === 0, buttons: [1, 2, 4, 8, 0][(i / 9) % 5] });
  for (let i = 0; i < 400; i += 11) other[i] = I({ left: (i / 11) % 2 === 0, down: (i / 11) % 5 === 1, buttons: (i / 11) % 3 === 0 ? 4 : 0 });
  const a = arena({ gap: 60 });
  run(a, 150, script, other);
  const b = JSON.parse(JSON.stringify(a));
  const shift = (o, by) => Object.fromEntries(Object.entries(o).map(([k, v]) => [Number(k) - by, v]));
  run(a, 250, shift(script, 150), shift(other, 150));
  run(b, 250, shift(script, 150), shift(other, 150));
  assert.deepEqual(snap(a), snap(b));
});

test('every template normal has data a fighter can use', () => {
  for (const fighter of ['surge', 'brick']) assert.equal(allMoves(fighter).length, 13);
});

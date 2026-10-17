import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATE, MOVE_IDS } from '../src/data/moves-template.js';
import { getMove, allMoves, advantage, moveTotal } from '../src/engine/moves.js';
import { animsFor, animTotal } from '../src/data/anims.js';

// GAME_DESIGN 3.1: id -> [S, A, R, dmg, level, adv hit, adv block]  (null = "-")
const DOC = {
  LP: [4, 2, 6, 30, 'H', 4, 1],
  HP: [8, 3, 14, 70, 'M', 4, -4],
  LK: [6, 3, 9, 40, 'M', 4, -1],
  HK: [10, 4, 18, 90, 'M', null, -7],
  '2LP': [4, 2, 7, 25, 'M', 3, 0],
  '2LK': [5, 2, 8, 30, 'L', 3, 0],
  '2HP': [7, 4, 20, 80, 'M', null, -11],
  '2HK': [9, 3, 22, 60, 'L', null, -12],
};

test('template normals match the GAME_DESIGN 3.1 table (S/A/R, damage, level, advantage)', () => {
  for (const [id, [S, A, R, dmg, lvl, advHit, advBlock]] of Object.entries(DOC)) {
    const m = getMove('template', id);
    assert.deepEqual([m.startup, m.active, m.recovery], [S, A, R], id + ' S/A/R');
    assert.equal(m.hits[0].dmg, dmg, id + ' dmg');
    assert.equal(m.hits[0].level, lvl, id + ' level');
    const adv = advantage(m);
    assert.equal(adv.hit, advHit, id + ' adv hit');
    assert.equal(adv.block, advBlock, id + ' adv block');
  }
});

test('hitboxes, pushback and stun match the table', () => {
  const T = (id) => getMove('template', id).hits[0];
  assert.deepEqual(T('LP').box, [10, 62, 34, 14]);
  assert.deepEqual(T('HP').box, [8, 58, 42, 18]);
  assert.deepEqual(T('2HK').box, [4, 0, 62, 14]);
  assert.deepEqual([T('LP').hs, T('LP').bs, T('LP').pbHit, T('LP').pbBlock], [11, 8, 3, 5]);
  assert.deepEqual([T('HP').hs, T('HP').bs, T('HP').pbHit, T('HP').pbBlock], [20, 12, 5, 7]);
  assert.deepEqual([T('HK').pbHit, T('HK').pbBlock, T('HK').kd], [8, 10, 'soft']);
  assert.deepEqual([T('2HK').pbHit, T('2HK').pbBlock, T('2HK').kd], [6, 8, 'hard']);
  assert.ok(T('2HP').launch && getMove('template', '2HP').juggleStart === 3);
  assert.equal(getMove('template', 'throw').hits[0].dmg, 100);
  assert.equal(getMove('template', 'throw').throwRange, 46);
});

test('hit windows: first active tick is S+1, last is S+A', () => {
  for (const id of MOVE_IDS) {
    const m = getMove('template', id);
    for (const h of m.hits) { assert.equal(h.from, m.startup + 1, id); assert.equal(h.to, m.startup + m.active, id); }
  }
});

test('hitstop: light 7, heavy 10, throw 12', () => {
  assert.equal(getMove('template', 'LP').hits[0].hitstop, 7);
  assert.equal(getMove('template', 'HK').hits[0].hitstop, 10);
  assert.equal(getMove('template', 'throw').hits[0].hitstop, 12);
});

test('cancels: chain and special windows per 2.6; HK/2HK have none', () => {
  const LP = getMove('template', 'LP');
  const chain = LP.cancels.find((c) => c.into === 'chain'), special = LP.cancels.find((c) => c.into === 'special');
  assert.deepEqual([chain.from, chain.to, chain.on], [5, 11, 'both']);       // S+1 .. S+A+5
  assert.deepEqual([special.from, special.to], [5, 12]);                      // S+1 .. S+A+6
  assert.deepEqual(getMove('template', 'HP').cancels.map((c) => c.into), ['special']);
  assert.deepEqual(getMove('template', '2HP').cancels.map((c) => c.into), ['special', 'jump']);
  assert.equal(getMove('template', 'HK').cancels.length, 0);
  assert.equal(getMove('template', '2HK').cancels.length, 0);
});

test('fighter modifiers (GAME_DESIGN 3.3)', () => {
  const sar = (f, id) => { const m = getMove(f, id); return [m.startup, m.active, m.recovery]; };
  assert.deepEqual(sar('surge', 'LP'), [3, 2, 6]);
  assert.deepEqual(sar('surge', '2LP'), [4, 2, 6]);
  assert.deepEqual(sar('surge', 'HP'), [8, 3, 13]);
  assert.deepEqual(sar('surge', 'LK'), [6, 3, 9]);
  assert.deepEqual(sar('surge', 'HK'), [10, 4, 17]);
  assert.deepEqual(getMove('surge', 'LK').hits[0].box, [6, 44, 44, 14]);
  assert.deepEqual(sar('brick', 'HP'), [9, 3, 15]);
  assert.equal(getMove('brick', 'HP').hits[0].dmg, 80);
  assert.deepEqual(sar('brick', 'LP'), [4, 2, 7]);
  assert.deepEqual(sar('brick', '2HP'), [8, 4, 21]);
  assert.equal(getMove('brick', '2HP').hits[0].dmg, 90);
  // untouched moves stay at the template
  assert.deepEqual(sar('brick', 'HK'), [10, 4, 18]);
  // modifiers shift hit windows and cancel windows with the timing
  assert.equal(getMove('brick', 'HP').hits[0].from, 10);
  assert.equal(getMove('surge', 'LP').cancels[0].from, 4);
  // derived advantage follows the modified frames
  assert.equal(advantage(getMove('surge', 'LP')).hit, 4);        // recovery 6, A 2: unchanged
  assert.equal(advantage(getMove('surge', 'HP')).hit, 5);        // 20 - (2 + 13)
  assert.equal(advantage(getMove('brick', 'HP')).block, -5);     // 12 - (2 + 15)
});

test('moveTotal and the template does not mutate', () => {
  assert.equal(moveTotal(getMove('template', 'LP')), 12);
  assert.equal(moveTotal(getMove('template', 'throw')), 31);
  getMove('surge', 'LP');
  assert.equal(TEMPLATE.LP.startup, 4);
  assert.throws(() => { getMove('surge', 'LP').startup = 99; }, TypeError);
});

test('S/A/R in moves equal the anim tables (src/data/anims.js) for every fighter', () => {
  for (const f of ['surge', 'brick']) {
    const anims = animsFor(f);
    for (const m of allMoves(f)) {
      const a = anims[m.anim];
      assert.ok(a, `${f} ${m.id}: no anim ${m.anim}`);
      assert.deepEqual(a.sar, [m.startup, m.active, m.recovery], `${f} ${m.id}: anim S/A/R differs from move data`);
      assert.equal(animTotal(a), m.startup + m.active + m.recovery, `${f} ${m.id}: anim length`);
      if (m.id === 'throw') {                      // the anim box is the arm band used by the viewer reach check; only the far edge (range) must agree
        assert.equal(a.hitbox[0] + a.hitbox[2], m.throwRange, `${f} throw: anim reach differs from throwRange`);
      } else assert.deepEqual(a.hitbox, m.hits[0].box, `${f} ${m.id}: anim hitbox differs from move data`);
    }
  }
});

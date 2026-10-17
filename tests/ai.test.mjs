import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../src/engine/world.js';
import { createAi, registerAiAction, unregisterAiAction, AI_ACTIONS } from '../src/ai/ai.js';
import { BTN } from '../src/core/buffer.js';
import { TIERS } from '../src/data/ai.js';

const MAX_TICKS = 30000;
const FIGHTERS = ['surge', 'brick'];
const sane = (f) => [f.x, f.y, f.vx, f.vy, f.hp].every(Number.isFinite);
const wellFormed = (s) => typeof s.left === 'boolean' && typeof s.right === 'boolean' && typeof s.up === 'boolean' && typeof s.down === 'boolean' && Number.isInteger(s.buttons) && s.buttons >= 0 && s.buttons < 32;

// One CPU-vs-CPU match. Fighter pairing and sides rotate with `n` so every pairing is covered.
function play(ta, tb, n, check = false) {
  const ida = FIGHTERS[n % 2], idb = FIGHTERS[(n >> 1) % 2];
  const w = createWorld({ p1: ida, p2: idb, seed: n + 1, match: 3 });
  const A = createAi({ id: ida, tier: ta, seed: 2 * n + 1 }), B = createAi({ id: idb, tier: tb, seed: 2 * n + 2 });
  let t = 0;
  for (; t < MAX_TICKS && w.match.phase !== 'over'; t++) {
    const a = A.act(w, 0), b = B.act(w, 1);
    if (check) assert.ok(wellFormed(a) && wellFormed(b), `malformed input at tick ${t}`);
    step(w, [a, b]);
    if (check) for (const f of w.fighters) assert.ok(sane(f), `match ${n} tick ${t}: non-finite state`);
  }
  return { over: w.match.phase === 'over', winner: w.match.winner, ticks: t };
}
const winShare = (strong, weak, n) => {
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const swap = i % 2 === 1;                        // alternate sides
    const r = swap ? play(weak, strong, i) : play(strong, weak, i);
    if (r.winner === (swap ? 1 : 0)) wins++;
  }
  return wins / n;
};

test('soak: CPU vs CPU across tier pairs and pairings, no exceptions, no NaN, malformed inputs or endless matches', () => {
  const pairs = [[1, 1], [1, 8], [8, 1], [8, 8], [3, 5], [5, 3], [2, 7], [7, 2]];
  const per = process.env.AI_SOAK === 'full' ? 100 : 20;
  for (const [a, b] of pairs) for (let n = 0; n < per; n++) {
    const r = play(a, b, n, true);
    assert.ok(r.over, `tiers ${a} v ${b} match ${n} did not end in ${MAX_TICKS} ticks`);
  }
});

test('tier 8 beats tier 2 in at least 80% of 30 matches', () => {
  const s = winShare(8, 2, 30);
  assert.ok(s >= 0.8, `tier 8 won ${(s * 100).toFixed(0)}%`);
});

test('difficulty is monotone: each stronger tier beats the one two below it', () => {
  for (const [hi, lo] of [[3, 1], [5, 3], [7, 5]]) {
    const s = winShare(hi, lo, 60);
    assert.ok(s >= 0.6, `tier ${hi} vs ${lo}: ${(s * 100).toFixed(0)}%`);
  }
});

test('the tier table follows GAME_DESIGN 7: reaction never below 6 and every skill rises with the tier', () => {
  assert.ok(TIERS.slice(1).every((t) => t.reaction >= 6));
  for (const k of ['block', 'antiAir', 'punish', 'reversal', 'combo', 'mixup', 'read']) for (let i = 2; i <= 8; i++) assert.ok(TIERS[i][k] >= TIERS[i - 1][k], `${k} at tier ${i}`);
  for (let i = 2; i <= 8; i++) assert.ok(TIERS[i].reaction < TIERS[i - 1].reaction);
});

test('the CPU never reads the opponent input buffer', () => {
  const w = createWorld({ p1: 'surge', p2: 'brick', match: false });
  w.fighters[0].x = 250; w.fighters[1].x = 300;
  const ai = createAi({ id: 'surge', tier: 8, seed: 3 });
  w.fighters[1].buf = null;
  for (let t = 0; t < 300; t++) ai.act(w, 0);                       // would throw on any opponent buf access
  assert.ok(true);
});

test('determinism: the same seed gives the same match', () => {
  assert.deepEqual(play(5, 4, 11), play(5, 4, 11));
});

test('AI_ACTIONS registry: a registered action is chosen and its script is emitted', () => {
  assert.ok(AI_ACTIONS.size >= 8);
  registerAiAction({ id: 'test:hk', weight: () => 1e9, script: () => [{ btn: BTN.HK }, {}] });
  try {
    const w = createWorld({ p1: 'surge', p2: 'brick', match: false });
    w.fighters[0].x = 250; w.fighters[1].x = 330;
    const ai = createAi({ id: 'surge', tier: 8, seed: 1 });
    const seen = [];
    for (let t = 0; t < 4; t++) seen.push(ai.act(w, 0).buttons);
    assert.ok(seen.includes(BTN.HK), `buttons ${seen}`);
  } finally { unregisterAiAction('test:hk'); }
});

test('the CPU actually fights: a tier 8 CPU lands damage on a standing dummy within 10 seconds', () => {
  const w = createWorld({ p1: 'surge', p2: 'brick', match: false });
  const ai = createAi({ id: 'surge', tier: 8, seed: 2 });
  for (let t = 0; t < 600; t++) step(w, [ai.act(w, 0), { left: false, right: false, up: false, down: false, buttons: 0 }]);
  assert.ok(w.fighters[1].hp < 1000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step } from '../src/engine/world.js';
import { mulberry, randomPad as pad } from '../src/ui/qa_pad.js';

const PAIRS = [['surge', 'brick'], ['brick', 'surge'], ['surge', 'surge'], ['brick', 'brick']];
const MAX_TICKS = 20000;
const sane = (f) => [f.x, f.y, f.vx, f.vy, f.hp].every(Number.isFinite);

test('soak: 300 random-controller matches finish, with no exceptions or NaN', () => {
  let worst = 0;
  for (let n = 0; n < 300; n++) {
    const [p1, p2] = PAIRS[n % PAIRS.length];
    const w = createWorld({ p1, p2, seed: n + 1, match: 3 });
    const a = pad(mulberry(1000 + n), w, 0), b = pad(mulberry(5000 + n), w, 1);
    let t = 0;
    for (; t < MAX_TICKS && w.match.phase !== 'over'; t++) {
      step(w, [a(), b()]);
      for (const f of w.fighters) if (!sane(f)) assert.fail(`match ${n} (${p1} v ${p2}) tick ${t}: non-finite state ${JSON.stringify({ x: f.x, y: f.y, hp: f.hp, state: f.state })}`);
    }
    assert.equal(w.match.phase, 'over', `match ${n} (${p1} v ${p2}) did not end in ${MAX_TICKS} ticks`);
    worst = Math.max(worst, t);
  }
  console.log(`soak: longest match ${worst} ticks`);
});

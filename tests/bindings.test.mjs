import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, DEFAULTS, PRESETS, defaultBindings, normalise, applyPreset, keymapOf, conflicts, keyLabel, describe } from '../src/core/bindings.js';
import { BTN } from '../src/core/buffer.js';

test('default layout: punches on U I, kicks on J K, Space blocks, O throws; P2 on arrows + numpad', () => {
  const m1 = keymapOf(DEFAULTS.p1), m2 = keymapOf(DEFAULTS.p2);
  assert.equal(m1.KeyU, BTN.LP); assert.equal(m1.KeyI, BTN.HP); assert.equal(m1.KeyJ, BTN.LK); assert.equal(m1.KeyK, BTN.HK);
  assert.equal(m1.Space, BTN.BL); assert.equal(m1.KeyL, BTN.BL);
  assert.equal(m1.KeyO, BTN.LP | BTN.LK);
  assert.equal(m2.ArrowUp, 'up');
  assert.equal(m2.Numpad4, BTN.LP); assert.equal(m2.Numpad5, BTN.HP); assert.equal(m2.Numpad1, BTN.LK); assert.equal(m2.Numpad2, BTN.HK);
  assert.equal(m2.Numpad0, BTN.BL); assert.equal(m2.Numpad3, BTN.LP | BTN.LK);
});

test('every profile binds every action, and the defaults have no conflicts', () => {
  for (const p of ['p1', 'p2', 'alt']) for (const a of ACTIONS) assert.ok(DEFAULTS[p][a].length >= 1, `${p}.${a}`);
  assert.equal(conflicts(defaultBindings()).size, 0);
});

test('conflicts flag a key used twice in a profile, and across P1/P2 but not for ALT', () => {
  const b = defaultBindings();
  b.p1.HP = ['KeyU'];
  assert.ok(conflicts(b).has('p1:LP') && conflicts(b).has('p1:HP'));
  const c = defaultBindings();
  c.p2.LP = ['KeyU'];
  assert.ok(conflicts(c).has('p1:LP') && conflicts(c).has('p2:LP'));
  const d = defaultBindings();
  d.alt.LP = ['KeyU'];
  assert.equal(conflicts(d).size, 0);
});

test('normalise keeps valid saved keys, repairs junk, and never leaves an action unbound', () => {
  const b = normalise({ p1: { LP: ['KeyQ'], HP: [], LK: 'nope', up: [5] }, p2: null });
  assert.deepEqual(b.p1.LP, ['KeyQ']);
  assert.deepEqual(b.p1.HP, DEFAULTS.p1.HP);
  assert.deepEqual(b.p1.LK, DEFAULTS.p1.LK);
  assert.deepEqual(b.p1.up, DEFAULTS.p1.up);
  assert.deepEqual(normalise(undefined), defaultBindings());
});

test('presets are conflict-free and LEFT-HAND gives P1 the arrow cluster', () => {
  for (let i = 0; i < PRESETS.length; i++) {
    const b = applyPreset(defaultBindings(), i);
    assert.equal(conflicts(b).size, 0, PRESETS[i].name);
  }
  assert.equal(applyPreset(defaultBindings(), 1).p1.up[0], 'ArrowUp');
});

test('labels and the generated hint line follow the real bindings', () => {
  assert.equal(keyLabel('KeyU'), 'U'); assert.equal(keyLabel('Numpad4'), 'N4'); assert.equal(keyLabel('Space'), 'SPC');
  assert.match(describe(defaultBindings(), 'p1'), /WASD move \| U I punch \| J K kick \| SPC block \| O throw/);
  const b = defaultBindings(); b.p1.LP = ['KeyQ'];
  assert.match(describe(b, 'p1'), /Q I punch/);
  assert.match(describe(defaultBindings(), 'p2'), /ARROWS move/);
});

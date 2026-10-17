// Key bindings (pure data + helpers, no DOM). GAME_DESIGN 1 / OVERHAUL_PLAN R1.
// A profile maps each action to a list of key codes. P1 and P2 share one keyboard in 2-player mode; in 1-player modes the human
// reads all three profiles at once (P1, P2 and ALT), so either hand layout works.
import { BTN } from './buffer.js';

export const ACTIONS = ['up', 'down', 'left', 'right', 'LP', 'HP', 'LK', 'HK', 'BL', 'throw'];
export const ACTION_NAMES = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', LP: 'L.PUNCH', HP: 'H.PUNCH', LK: 'L.KICK', HK: 'H.KICK', BL: 'BLOCK', throw: 'THROW' };
export const PROFILES = ['p1', 'p2', 'alt'];
export const PROFILE_NAMES = { p1: 'PLAYER 1', p2: 'PLAYER 2', alt: 'ALT (1P)' };
const ARROWS = { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'] };
const WASD = { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'] };

export const DEFAULTS = Object.freeze({
  p1: { ...WASD, LP: ['KeyU'], HP: ['KeyI'], LK: ['KeyJ'], HK: ['KeyK'], BL: ['Space', 'KeyL'], throw: ['KeyO'] },
  p2: { ...ARROWS, LP: ['Numpad4', 'BracketLeft'], HP: ['Numpad5', 'BracketRight'], LK: ['Numpad1', 'Semicolon'], HK: ['Numpad2', 'Quote'], BL: ['Numpad0', 'Slash'], throw: ['Numpad3', 'Period'] },
  alt: { ...ARROWS, LP: ['KeyZ'], HP: ['KeyX'], LK: ['KeyC'], HK: ['KeyV'], BL: ['KeyB', 'ShiftLeft', 'ShiftRight'], throw: ['KeyN'] },
});

// Presets rewrite all three profiles. LEFT-HAND swaps the hands (P1 gets the arrows + numpad cluster); ARROW-ONLY puts P1 on arrows + Z X C V.
export const PRESETS = [
  { name: 'STANDARD', p1: DEFAULTS.p1, p2: DEFAULTS.p2, alt: DEFAULTS.alt },
  { name: 'LEFT-HAND', p1: DEFAULTS.p2, p2: DEFAULTS.p1, alt: DEFAULTS.alt },
  { name: 'ARROW-ONLY', p1: DEFAULTS.alt, p2: DEFAULTS.p1, alt: DEFAULTS.p2 },
];

const clone = (o) => JSON.parse(JSON.stringify(o));
export const defaultBindings = () => clone(DEFAULTS);

// Merge saved data over the defaults so a stale or partial save can never leave an action unbound.
export function normalise(saved) {
  const out = defaultBindings();
  if (!saved || typeof saved !== 'object') return out;
  for (const p of PROFILES) for (const a of ACTIONS) {
    const v = saved[p]?.[a];
    if (Array.isArray(v) && v.length && v.every((c) => typeof c === 'string')) out[p][a] = v.slice(0, 3);
  }
  return out;
}

export function applyPreset(b, i) {
  const pr = PRESETS[i];
  b.p1 = clone(pr.p1); b.p2 = clone(pr.p2); b.alt = clone(pr.alt);
  return b;
}

// code -> 'up'|'down'|'left'|'right'|button mask, for one profile.
export function keymapOf(profile) {
  const m = {};
  for (const a of ACTIONS) for (const code of profile[a] ?? []) m[code] = a === 'throw' ? BTN.LP | BTN.LK : BTN[a] ?? a;
  return m;
}

// Same key on two actions of one profile, or on P1 and P2 (they share the keyboard in versus). ALT is exempt from the cross-check.
export function conflicts(b) {
  const bad = new Set();
  const owners = new Map();
  for (const p of PROFILES) for (const a of ACTIONS) for (const code of b[p][a]) {
    const mine = [...(owners.get(code) ?? [])];
    for (const o of mine) {
      const [op, oa] = o.split(':');
      const clash = op === p ? oa !== a : (op === 'p1' && p === 'p2') || (op === 'p2' && p === 'p1');
      if (clash) { bad.add(o); bad.add(p + ':' + a); }
    }
    owners.set(code, [...mine, p + ':' + a]);
  }
  return bad;
}

const LABELS = { Space: 'SPC', ShiftLeft: 'LSHF', ShiftRight: 'RSHF', ArrowUp: 'UP', ArrowDown: 'DN', ArrowLeft: 'LT', ArrowRight: 'RT', BracketLeft: '[', BracketRight: ']',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\',Minus: '-', Equal: '=', Backquote: '`', Enter: 'ENT', Tab: 'TAB', NumpadDecimal: 'N.', Backspace: 'BKSP' };
export function keyLabel(code) {
  if (LABELS[code]) return LABELS[code];
  if (/^Key[A-Z]$/.test(code)) return code[3];
  if (/^Digit\d$/.test(code)) return code[5];
  if (/^Numpad\d$/.test(code)) return 'N' + code[6];
  return code.replace(/^(Left|Right)?(Control|Alt|Meta)/, '$2').slice(0, 4).toUpperCase();
}
export const bindLabel = (b, profile, action) => (b[profile][action] ?? []).map(keyLabel).join('/');

function moveLabel(b, p) {
  const first = ['up', 'left', 'down', 'right'].map((a) => b[p][a][0]);
  if (first.join() === 'KeyW,KeyA,KeyS,KeyD') return 'WASD';
  if (first.join() === 'ArrowUp,ArrowLeft,ArrowDown,ArrowRight') return 'ARROWS';
  return first.map(keyLabel).join('');
}
// One line describing the live bindings of a profile, for the page hint and the cheat sheet.
export function describe(b, p) {
  const k = (a) => bindLabel(b, p, a).split('/')[0];
  return `${moveLabel(b, p)} move | ${k('LP')} ${k('HP')} punch | ${k('LK')} ${k('HK')} kick | ${k('BL')} block | ${k('throw')} throw`;
}

// Short line for the in-fight cheat sheet (fits 48 characters at 8px on the 384px canvas).
export function cheatLine(b, p) {
  const k = (a) => bindLabel(b, p, a).split('/')[0];
  return `${moveLabel(b, p)} ${k('LP')} ${k('HP')} PUNCH ${k('LK')} ${k('HK')} KICK ${k('BL')} BLOCK ${k('throw')} THROW`;
}

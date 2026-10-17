// Pose library (data only, DOM-free). Schema documented in src/gfx/rig.js.
// Task 1.4: idle only. Walk and combat poses arrive in later tasks.

export const IDLE_HOLD = 8;           // ticks each idle frame is held
const BOB = [1, 1, 0, 0, 1, 1];       // torso breathing offset per idle frame (px, +down); keeps standing height <= 104

// Shared guard stance: knees bent, feet apart, front fist near the chin, back fist near the chest.
const guard = {
  root: [0, 0],
  hips: { r: 0 },
  torso: { v: 'lean', r: 0 },
  head: { r: 0 },
  armF: { s: 45, e: 120, w: -30, hand: 'guard' },
  armB: { s: 30, e: 60, w: 0, hand: 'fist' },
  legF: { h: 30, k: 45, foot: 'flat' },
  legB: { h: -15, k: 30, foot: 'flat' },
};

const OVERRIDES = {
  // fighter id -> partial pose merged over `guard`
  brick: {                                  // slouchier: hunched torso, chin forward, front shoulder dropped, loose low guard
    torso: { v: 'lean', r: 15 },
    head: { r: -15, dx: 1 },
    armF: { s: 30, e: 105, w: -30, hand: 'guard' },
    armB: { s: 15, e: 45, w: 0, hand: 'fist' },
    legF: { h: 30, k: 30, foot: 'flat' },
    legB: { h: -30, k: 30, foot: 'flat' },
  },
};

const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(a[k] ?? {}), ...v } : v;
  return out;
};

export function idlePoses(fighterId) {
  const base = merge(guard, OVERRIDES[fighterId]);
  return BOB.map((dy) => merge(base, { torso: { dy } }));
}

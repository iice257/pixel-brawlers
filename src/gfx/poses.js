// Pose library (data only, DOM-free). Schema documented in src/gfx/rig.js.
// Shared base poses (both fighters) plus small per-fighter style overrides. Names: <anim>_<n>.
// Angles are multiples of 15 (the baker quantises); prefer 0/90/180 where the shape allows (pixel-exact rotation).

export const IDLE_HOLD = 8;           // ticks each idle frame is held
const BOB = [1, 1, 0, 0, 1, 1];       // torso breathing offset per idle frame (px, +down); keeps standing height <= 104

const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(a[k] ?? {}), ...v } : v;
  return out;
};

// Shared guard stance: knees bent, feet apart, front fist near the chin, back fist near the chest.
export const guard = {
  root: [0, 0],
  hips: { r: 0 },
  torso: { v: 'lean', r: 0 },
  head: { r: 0 },
  armF: { s: 45, e: 120, w: -30, hand: 'guard' },
  armB: { s: 30, e: 60, w: 0, hand: 'fist' },
  legF: { h: 30, k: 45, foot: 'flat' },
  legB: { h: -15, k: 30, foot: 'flat' },
};

// Fighter style: partial pose merged over `guard` (idle) and a tweak applied to locomotion poses.
const OVERRIDES = {
  brick: {                                  // slouchier: hunched torso, chin forward, front shoulder dropped, loose low guard
    torso: { v: 'lean', r: 15 },
    head: { r: -15, dx: 1 },
    armF: { s: 30, e: 105, w: -30, hand: 'guard' },
    armB: { s: 15, e: 45, w: 0, hand: 'fist' },
    legF: { h: 30, k: 30, foot: 'flat' },
    legB: { h: -30, k: 30, foot: 'flat' },
  },
};
const LOCO_STYLE = {
  brick: { torso: { r: 15 }, head: { r: -15, dx: 1 }, armF: { s: -15 } },   // r/s are added to the pose's value
};

const R15 = (v) => Math.round(v / 15) * 15;
const rad = (d) => (d * Math.PI) / 180;

// ---------------------------------------------------------------------------------------------- locomotion
// Walk: 8 poses. Leg phase for legF is i*45 deg; legB is half a cycle behind. h swings +-30 about vertical, the knee
// lifts on the forward swing. Arms are contrapass (opposite arm and leg), the torso rocks 15 at the passing poses.
const WALK_H = [30, 15, 0, -15, -30, -15, 0, 15];
const WALK_K = [15, 30, 30, 15, 30, 45, 60, 45];              // 0..4 stance (planted), 4..8 swing (lifted)
const WALK_FR = [15, 0, 0, -15, -30, -15, -15, 0];          // toe/heel angle of the foot
const WALK_FOOT = ['flat', 'flat', 'flat', 'flat', 'toe', 'flat', 'flat', 'flat'];
function walkF(i) {
  const j = (i + 4) % 8, ph = rad(i * 45);
  return {
    root: [0, 0],
    hips: { r: 0 },
    torso: { v: 'lean', r: i === 2 || i === 6 ? 15 : 0, dy: i === 2 || i === 6 ? -1 : 0 },
    head: { r: i === 2 || i === 6 ? -15 : 0 },
    armF: { s: R15(45 - 15 * Math.cos(ph)), e: 120, w: -30, hand: 'guard' },
    armB: { s: R15(30 + 15 * Math.cos(ph)), e: 60, w: 0, hand: 'fist' },
    legF: { h: WALK_H[i], k: WALK_K[i], fr: WALK_FR[i], foot: WALK_FOOT[i] },
    legB: { h: WALK_H[j], k: WALK_K[j], fr: WALK_FR[j], foot: WALK_FOOT[j] },
  };
}
const walkB = (i) => merge(walkF((8 - i) % 8), { torso: { r: -15 + (((8 - i) % 8) === 2 || ((8 - i) % 8) === 6 ? 15 : 0) } });

// Crouch: deep knee fold, hunched torso, guard up. in (2 poses) / hold / out (2 poses).
const crouchHold = {
  root: [0, 0],
  hips: { r: 45 },
  torso: { v: 'crouch', r: 30 },
  head: { r: -45 },
  armF: { s: 60, e: 105, w: -30, hand: 'guard' },
  armB: { s: 30, e: 75, w: 0, hand: 'fist' },
  legF: { h: 105, k: 135, foot: 'flat' },
  legB: { h: 75, k: 150, foot: 'flat' },
};
const crouchIn0 = merge(guard, { hips: { r: 0 }, torso: { v: 'lean', r: 15 }, legF: { h: 45, k: 60 }, legB: { h: 15, k: 45 } });

// Jump
const upArms = { armF: { s: 150, e: 30, w: 0, hand: 'fist' }, armB: { s: 135, e: 30, w: 0, hand: 'fist' } };
const tuckArms = { armF: { s: 60, e: 105, w: -30, hand: 'guard' }, armB: { s: 45, e: 75, w: 0, hand: 'fist' } };
const jumpPrep = crouchIn0;
const jumpRise = merge(guard, { torso: { v: 'stand', r: 0 }, ...upArms, legF: { h: 15, k: 30 }, legB: { h: -15, k: 45 } });
const jumpApex = merge(guard, { torso: { v: 'stand', r: 0 }, ...tuckArms, legF: { h: 60, k: 105 }, legB: { h: 30, k: 105 } });
const jumpFall0 = merge(guard, { torso: { v: 'stand', r: 0 }, ...tuckArms, legF: { h: 45, k: 75 }, legB: { h: 15, k: 75 } });
const jumpFall1 = merge(guard, { torso: { v: 'stand', r: 0 }, armF: { s: 75, e: 90, w: -30, hand: 'guard' }, armB: { s: 60, e: 60, w: 0, hand: 'fist' }, legF: { h: 15, k: 15 }, legB: { h: -15, k: 15 } });
const jumpLand = merge(crouchIn0, { legF: { h: 60, k: 90 }, legB: { h: 30, k: 75 }, torso: { r: 30 } });
const jumpDir = (d) => [
  merge(guard, { torso: { v: 'stand', r: d * 15 }, ...upArms, legF: { h: d * 30, k: 45 }, legB: { h: d * -15, k: 60 } }),
  merge(guard, { torso: { v: 'stand', r: d * 15 }, ...tuckArms, legF: { h: 60 + d * 15, k: 105 }, legB: { h: 30 + d * 15, k: 105 } }),
  merge(guard, { torso: { v: 'stand', r: d * 15 }, ...tuckArms, legF: { h: 75, k: 120 }, legB: { h: 45, k: 120 } }),
  merge(guard, { torso: { v: 'stand', r: d * 15 }, ...tuckArms, legF: { h: 30 + d * 15, k: 45 }, legB: { h: d * -15, k: 45 } }),
];

// Dash
const dashF = [
  merge(guard, { hips: { r: 15 }, torso: { v: 'lean', r: 30 }, head: { r: -15 }, armF: { s: -30, e: 90, w: 0, hand: 'fist' }, armB: { s: -45, e: 60, w: 0, hand: 'fist' }, legF: { h: 45, k: 75 }, legB: { h: -45, k: 15, foot: 'toe', fr: -15 } }),
  merge(guard, { hips: { r: 15 }, torso: { v: 'lean', r: 30 }, head: { r: -15 }, armF: { s: -45, e: 90, w: 0, hand: 'fist' }, armB: { s: -60, e: 60, w: 0, hand: 'fist' }, legF: { h: 75, k: 45 }, legB: { h: -60, k: 60 } }),
  merge(guard, { hips: { r: 15 }, torso: { v: 'lean', r: 15 }, head: { r: -15 }, armF: { s: 15, e: 105, w: -30, hand: 'guard' }, armB: { s: -15, e: 75, w: 0, hand: 'fist' }, legF: { h: 45, k: 45 }, legB: { h: -30, k: 45 } }),
];
const dashB = [
  merge(guard, { torso: { v: 'lean', r: 0 }, legF: { h: 45, k: 75 }, legB: { h: 15, k: 60 } }),
  merge(guard, { torso: { v: 'lean_back', r: -15 }, armF: { s: 60, e: 105, w: -30, hand: 'guard' }, legF: { h: 45, k: 90 }, legB: { h: 15, k: 90 } }),
  merge(guard, { torso: { v: 'lean_back', r: -15 }, legF: { h: 30, k: 60 }, legB: { h: -30, k: 60 } }),
];

// ---------------------------------------------------------------------------------------------- library
function baseLib() {
  const L = {};
  BOB.forEach((dy, i) => { L['idle_' + i] = merge(guard, { torso: { dy } }); });
  for (let i = 0; i < 8; i++) { L['walk_f_' + i] = walkF(i); L['walk_b_' + i] = walkB(i); }
  L.crouch_in_0 = crouchIn0;
  L.crouch_in_1 = merge(crouchHold, { hips: { r: 30 }, torso: { r: 30 }, head: { r: -30 }, legF: { h: 75, k: 90 }, legB: { h: 45, k: 105 } });
  L.crouch_hold_0 = crouchHold;
  L.crouch_out_0 = L.crouch_in_1;
  L.crouch_out_1 = crouchIn0;
  L.jump_prep_0 = jumpPrep; L.jump_rise_0 = jumpRise; L.jump_apex_0 = jumpApex;
  L.jump_fall_0 = jumpFall0; L.jump_fall_1 = jumpFall1; L.jump_land_0 = jumpLand;
  jumpDir(1).forEach((p, i) => { L['jump_f_' + i] = p; });
  jumpDir(-1).forEach((p, i) => { L['jump_b_' + i] = p; });
  dashF.forEach((p, i) => { L['dash_f_' + i] = p; });
  dashB.forEach((p, i) => { L['dash_b_' + i] = p; });
  Object.assign(L, attackPoses());
  return L;
}

// Attack poses live in poses_attacks.js (filled by Task 1.7); kept as a hook so the library stays one namespace.
import { attackPoses } from './poses_attacks.js';

const isLoco = (n) => /^(idle|walk|dash)_/.test(n);
export function poseLibrary(fighterId) {
  const lib = baseLib();
  const style = OVERRIDES[fighterId], loco = LOCO_STYLE[fighterId];
  const out = {};
  for (const [name, pose] of Object.entries(lib)) {
    let p = pose;
    if (name.startsWith('idle_') && style) p = merge(pose, merge(style, { torso: { dy: pose.torso?.dy } }));
    else if (isLoco(name) && loco) {
      p = merge(pose, {});
      p.torso = { ...p.torso, r: (p.torso?.r ?? 0) + (loco.torso.r ?? 0) };
      p.head = { ...p.head, ...loco.head };
      p.armF = { ...p.armF, s: (p.armF?.s ?? 0) + (loco.armF.s ?? 0) };
    }
    out[name] = p;
  }
  return out;
}

export function idlePoses(fighterId) {
  const lib = poseLibrary(fighterId);
  return BOB.map((_, i) => lib['idle_' + i]);
}

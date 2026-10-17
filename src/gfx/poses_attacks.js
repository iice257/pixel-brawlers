// Attack poses (Task 1.7). Shared by both fighters; shaped to reach the GAME_DESIGN 3.1 hitboxes (viewer reach check).
// Prefer 90/180 degree limb angles (pixel-exact); odd angles only where the shape needs them.
export function attackPoses({ merge, guard, crouchHold, jumpApex }) {
  const L = {};
  const fist = (s, e, w = 0) => ({ s, e, w, hand: 'fist' });
  const open = (s, e, w = 0) => ({ s, e, w, hand: 'open' });

  // ---- LP (jab): anticipation, extended, recovery
  L.LP_0 = merge(guard, { torso: { r: -15 }, armF: fist(0, 150, -15) });
  L.LP_1 = merge(guard, { torso: { r: 15 }, armF: fist(60, 15) });
  L.LP_2 = merge(guard, { armF: fist(60, 75, -15) });

  // ---- HP (straight): wind-up, coil, extended (+smear), recover x2
  const hpLegs = { legF: { h: 45, k: 30 }, legB: { h: -30, k: 15 } };
  L.HP_0 = merge(guard, { root: [-2, 0], torso: { r: -15 }, armF: fist(-15, 150, -15) });
  L.HP_1 = merge(guard, { root: [-3, 0], hips: { r: -15 }, torso: { v: 'lean_back', r: -15 }, armF: fist(-30, 120), legF: { h: 30, k: 60 }, legB: { h: -30, k: 45 } });
  L.HP_2 = merge(guard, { root: [3, 0], hips: { r: 15 }, torso: { r: 15 }, head: { r: -15 }, armF: fist(75, 0), ...hpLegs,
    fx: [{ type: 'arc', c: 'shoulderF', r: 44, a0: 20, a1: 85 }] });
  L.HP_3 = merge(guard, { root: [3, 0], hips: { r: 15 }, torso: { r: 15 }, armF: fist(75, 30), ...hpLegs });
  L.HP_4 = merge(guard, { armF: fist(60, 75, -15) });

  // ---- LK (front kick): chamber, extended, recover
  L.LK_0 = merge(guard, { torso: { r: -15 }, armF: guard.armF, legF: { h: 60, k: 90 }, legB: { h: -15, k: 15 } });
  L.LK_1 = merge(guard, { torso: { r: -15 }, legF: { h: 90, k: 0, fr: 90, foot: 'kick' }, legB: { h: -15, k: 15 } });
  L.LK_2 = merge(guard, { legF: { h: 45, k: 75 }, legB: { h: -15, k: 15 } });

  // ---- HK (roundhouse): chamber x2, extended (+smear), recover x2
  L.HK_0 = merge(guard, { hips: { r: -15 }, torso: { r: -15 }, legF: { h: 60, k: 105 }, legB: { h: -15, k: 15 } });
  L.HK_1 = merge(guard, { hips: { r: -15 }, torso: { v: 'lean_back', r: -15 }, legF: { h: 90, k: 105 }, legB: { h: -15, k: 15 } });
  L.HK_2 = merge(guard, { root: [6, 0], hips: { r: -15 }, torso: { v: 'lean_back', r: -15 }, head: { r: 15 }, legF: { h: 90, k: 0, fr: 90, foot: 'kick' }, legB: { h: -15, k: 15 },
    fx: [{ type: 'arc', c: 'hipF', r: 52, a0: 20, a1: 100 }] });
  L.HK_3 = merge(guard, { hips: { r: -15 }, torso: { r: -15 }, legF: { h: 75, k: 60 }, legB: { h: -15, k: 15 } });
  L.HK_4 = merge(guard, { legF: { h: 45, k: 60 }, legB: { h: -15, k: 30 } });

  // ---- crouching normals (base = crouch hold)
  L['2LP_0'] = merge(crouchHold, { armF: fist(30, 135) });
  L['2LP_1'] = merge(crouchHold, { torso: { r: -15 }, armF: fist(75, 0) });
  L['2LP_2'] = merge(crouchHold, { armF: fist(60, 75, -15) });
  L['2LK_0'] = merge(crouchHold, {});
  L['2LK_1'] = merge(crouchHold, { root: [6, 0], legF: { h: 75, k: 0, fr: 60, foot: 'kick' } });
  L['2LK_2'] = merge(crouchHold, {});
  L['2HP_0'] = merge(crouchHold, { armF: fist(15, 75) });
  L['2HP_1'] = merge(crouchHold, { hips: { r: 30 }, torso: { r: 15 }, armF: fist(15, 75), legF: { h: 75, k: 90 }, legB: { h: 45, k: 105 } });
  L['2HP_2'] = merge(guard, { root: [6, 0], torso: { v: 'lean', r: 0 }, armF: fist(150, 15), legF: { h: 30, k: 30 }, legB: { h: -15, k: 15 },
    fx: [{ type: 'arc', c: 'shoulderF', r: 40, a0: 80, a1: 170 }] });
  L['2HP_3'] = merge(guard, { root: [4, 0], torso: { v: 'lean', r: 0 }, armF: fist(135, 30), legF: { h: 30, k: 30 }, legB: { h: -15, k: 15 } });
  L['2HP_4'] = merge(crouchHold, { hips: { r: 30 }, torso: { r: 15 }, legF: { h: 75, k: 90 }, legB: { h: 45, k: 105 } });
  L['2HK_0'] = merge(crouchHold, {});
  L['2HK_1'] = merge(crouchHold, { hips: { r: 30 }, torso: { v: 'lean_back', r: -15 }, head: { r: 0 }, legF: { h: 90, k: 135 }, legB: { h: 105, k: 165 } });
  L['2HK_2'] = merge(crouchHold, { root: [16, 0], hips: { r: 15 }, torso: { v: 'lean_back', r: -30 }, head: { r: 15 }, legF: { h: 90, k: 0, fr: 75, foot: 'kick' }, legB: { h: 105, k: 165 },
    fx: [{ type: 'arc', c: 'hipF', r: 52, a0: 20, a1: 85 }] });
  L['2HK_3'] = merge(crouchHold, { legF: { h: 90, k: 105 } });
  L['2HK_4'] = merge(crouchHold, {});

  // ---- jumping normals (tucked base)
  const air = merge(jumpApex, { torso: { v: 'stand', r: 0 } });
  L.jLP_0 = merge(air, { armF: fist(30, 135) });
  L.jLP_1 = merge(air, { armF: fist(75, 30) });
  L.jHP_0 = merge(air, { armF: fist(15, 150, -15) });
  L.jHP_1 = merge(air, { root: [-4, 0], torso: { r: 15 }, head: { r: -15 }, armF: fist(30, 15) });
  L.jLK_0 = merge(air, {});
  L.jLK_1 = merge(air, { torso: { r: -15 }, legF: { h: 30, k: 15, fr: 30, foot: 'kick' }, legB: { h: -15, k: 0 } });
  L.jHK_0 = merge(air, { torso: { r: -15 } });
  L.jHK_1 = merge(air, { torso: { v: 'lean_back', r: -30 }, legF: { h: 60, k: 0, fr: 60, foot: 'kick' }, legB: { h: 15, k: 75 } });

  // ---- throw: reach, grab, hold (lift), release, recover
  L.throw_0 = merge(guard, { torso: { r: 15 }, armF: open(75, 15), armB: open(60, 15) });
  L.throw_1 = merge(guard, { root: [0, 0], torso: { r: 15 }, hips: { r: 15 }, armF: open(45, 15), armB: open(30, 15), legF: { h: 45, k: 30 }, legB: { h: -30, k: 15 } });
  L.throw_2 = merge(guard, { root: [2, 0], torso: { r: 0 }, armF: open(150, 0), armB: open(135, 15) });
  L.throw_3 = merge(guard, { root: [-2, 0], torso: { r: -15 }, armF: open(60, 30), armB: open(45, 30) });
  L.throw_4 = merge(guard, {});
  return L;
}

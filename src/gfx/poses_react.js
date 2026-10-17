// Reaction, KO, win, intro and taunt poses (Task 1.8). Base set shared by both fighters; intro poses are unique per fighter.
// Lying / tumbling poses set `floor: 'body'` so the sprite origin sits under the lowest drawn pixel instead of the feet.
// Body rotation: hips.r negative leans the body back (counter-clockwise); legs counter-rotate (legs h = +lean when the
// body is rotated back by `lean`), so a body lying on its back has hips.r -90 and legs h 90.
export function reactPoses({ merge, guard, crouchHold, fighterId }) {
  const L = {};
  const fist = (s, e, w = 0) => ({ s, e, w, hand: 'fist' });
  const open = (s, e, w = 0) => ({ s, e, w, hand: 'open' });
  const hit = (r = 0, extra = {}) => ({ v: 'hit', r, ...extra });
  const ko = (r = 0) => ({ v: 'ko', r });
  const BODY = { floor: 'body' };

  // ---- blocks: forearms crossed in front of the face (stand), tucked low (crouch); in = recoil, hold = settled
  const blockArms = { armF: fist(60, 120), armB: fist(75, 105) };
  L.block_stand_in_0 = merge(guard, { root: [-2, 0], torso: { v: 'lean', r: -15 }, head: { r: -15 }, ...blockArms, legF: { h: 30, k: 45 }, legB: { h: -30, k: 30 } });
  L.block_stand_hold_0 = merge(guard, { root: [-1, 0], torso: { v: 'lean', r: 0 }, head: { r: 0 }, ...blockArms });
  const crouchBlock = { armF: fist(45, 135), armB: fist(60, 120) };
  L.block_crouch_in_0 = merge(crouchHold, { root: [-2, 0], torso: { r: 15 }, ...crouchBlock });
  L.block_crouch_hold_0 = merge(crouchHold, { root: [-1, 0], ...crouchBlock });

  // ---- hits (head snaps back, torso rocks, arms flail)
  L.hit_high_0 = merge(guard, { root: [-3, 0], torso: { v: 'lean_back', r: -15 }, head: hit(-15), armF: open(15, 75), armB: open(-30, 90), legF: { h: 30, k: 30 }, legB: { h: -30, k: 15 } });
  L.hit_high_1 = merge(guard, { root: [-4, 0], torso: { v: 'lean_back', r: -15 }, head: hit(0), armF: open(30, 60), armB: open(-15, 75), legF: { h: 30, k: 30 }, legB: { h: -30, k: 15 } });
  L.hit_body_0 = merge(guard, { root: [-3, 0], hips: { r: 15 }, torso: { v: 'lean', r: 30 }, head: hit(15), armF: fist(30, 90), armB: fist(45, 75), legF: { h: 45, k: 60 }, legB: { h: -15, k: 45 } });
  L.hit_body_1 = merge(guard, { root: [-4, 0], hips: { r: 15 }, torso: { v: 'lean', r: 15 }, head: hit(0), armF: fist(30, 75), armB: fist(45, 60), legF: { h: 45, k: 60 }, legB: { h: -15, k: 45 } });
  L.hit_low_0 = merge(guard, { root: [-3, 0], hips: { r: -15 }, torso: { v: 'lean_back', r: -15 }, head: hit(-15), armF: open(60, 30), armB: open(-45, 45), legF: { h: 45, k: 90 }, legB: { h: 0, k: 60 } });
  L.hit_low_1 = merge(guard, { root: [-4, 0], torso: { v: 'lean', r: 0 }, head: hit(0), armF: open(45, 45), armB: open(-30, 60), legF: { h: 30, k: 60 }, legB: { h: -15, k: 45 } });

  // ---- launched: rising, apex, falling (tumbling backwards)
  const tumble = (lean, extra) => merge(guard, { hips: { r: -lean }, torso: { v: 'lean_back', r: 0 }, head: hit(-15), ...extra, ...BODY });
  L.hit_air_0 = tumble(30, { root: [-4, 0], armF: open(60, 60), armB: open(-30, 60), legF: { h: 45, k: 15 }, legB: { h: 15, k: 30 } });
  L.hit_air_1 = tumble(60, { root: [-4, 0], armF: open(75, 45), armB: open(30, 45), legF: { h: 75, k: 30 }, legB: { h: 60, k: 45 } });
  L.hit_air_2 = tumble(90, { root: [-4, 0], armF: open(90, 30), armB: open(60, 30), legF: { h: 90, k: 30 }, legB: { h: 75, k: 45 } });
  L.hit_air_3 = tumble(75, { root: [-2, 0], armF: open(135, 0), armB: open(105, 15), legF: { h: 60, k: 15 }, legB: { h: 45, k: 30 } });

  // ---- knockdown: fall back, slam, bounce, settle
  const flat = (extra) => merge(guard, { hips: { r: -90, v: 'fallen' }, torso: { v: 'fallen', r: 0 }, head: hit(0), ...extra, ...BODY });
  L.knockdown_0 = tumble(45, { root: [-4, 0], armF: open(60, 60), armB: open(0, 60), legF: { h: 60, k: 30 }, legB: { h: 30, k: 30 } });
  L.knockdown_1 = flat({ root: [-6, 0], armF: open(120, 30), armB: open(90, 30), legF: { h: 75, k: 30 }, legB: { h: 60, k: 45 } });
  L.knockdown_2 = flat({ root: [-2, 0], armF: open(135, 0), armB: open(105, 15), legF: { h: 90, k: 0 }, legB: { h: 75, k: 30 } });
  L.knockdown_3 = flat({ root: [0, 0], head: hit(0), armF: open(90, 0), armB: open(105, 0), legF: { h: 90, k: 0, fr: 90 }, legB: { h: 90, k: 15, fr: 90 } });
  L.lying_0 = flat({ root: [0, 0], head: hit(0), armF: open(90, 0), armB: open(105, 0), legF: { h: 90, k: 0, fr: 90 }, legB: { h: 90, k: 15, fr: 90 } });

  // ---- getup (sit up, push up, rise to a crouch, rise to guard)
  L.getup_0 = flat({ head: hit(0), armF: open(90, 0), armB: open(105, 0), legF: { h: 90, k: 90, fr: 90 }, legB: { h: 75, k: 105, fr: 90 } });
  L.getup_1 = merge(guard, { hips: { r: -30 }, torso: { v: 'lean_back', r: -45 }, head: { r: 0 }, armF: fist(45, 15), armB: fist(0, 45), legF: { h: 90, k: 90 }, legB: { h: 60, k: 120 }, ...BODY });
  L.getup_2 = merge(crouchHold, { torso: { r: 15 }, head: { r: -30 } });
  L.getup_3 = merge(guard, { hips: { r: 0 }, torso: { v: 'lean', r: 15 }, legF: { h: 45, k: 60 }, legB: { h: 15, k: 45 } });

  // ---- KO: stagger, fall, slam, lying, last twitch
  const koFlat = (extra) => merge(guard, { hips: { r: -90, v: 'fallen' }, torso: { v: 'fallen', r: 0 }, head: ko(0), ...extra, ...BODY });
  L.ko_0 = merge(guard, { root: [-3, 0], torso: { v: 'lean_back', r: -15 }, head: ko(-15), armF: open(15, 30), armB: open(-30, 60), legF: { h: 30, k: 30 }, legB: { h: -30, k: 15 } });
  L.ko_1 = merge(guard, { root: [-6, 0], hips: { r: -45 }, torso: { v: 'lean_back', r: -15 }, head: ko(0), armF: open(75, 45), armB: open(30, 30), legF: { h: 60, k: 15 }, legB: { h: 45, k: 30 }, ...BODY });
  L.ko_2 = koFlat({ root: [-8, 0], armF: open(135, 15), armB: open(105, 15), legF: { h: 75, k: 30 }, legB: { h: 60, k: 45 } });
  L.ko_3 = koFlat({ root: [-2, 0], armF: open(120, 0), armB: open(105, 0), legF: { h: 90, k: 0, fr: 90 }, legB: { h: 90, k: 15, fr: 90 } });
  L.ko_4 = koFlat({ root: [0, 0], head: ko(-15), armF: open(105, 0), armB: open(105, 0), legF: { h: 90, k: 0, fr: 75 }, legB: { h: 90, k: 15, fr: 105 } });

  // ---- thrown (victim): lifted, flipping, landing on the back
  L.thrown_0 = merge(guard, { root: [2, 0], hips: { r: -15 }, torso: { v: 'lean_back', r: -15 }, head: hit(-15), armF: open(150, 15), armB: open(120, 30), legF: { h: 30, k: 15 }, legB: { h: 15, k: 30 }, ...BODY });
  L.thrown_1 = merge(guard, { root: [0, 0], hips: { r: -135 }, torso: { v: 'stand', r: 0 }, head: hit(0), armF: open(45, 30), armB: open(15, 30), legF: { h: 135, k: 30 }, legB: { h: 120, k: 45 }, ...BODY });
  L.thrown_2 = flat({ root: [-4, 0], armF: open(135, 15), armB: open(105, 15), legF: { h: 75, k: 45 }, legB: { h: 60, k: 60 } });

  // ---- win A: double-biceps flex; win B: fist pump
  const stance = { legF: { h: 30, k: 0 }, legB: { h: -30, k: 0 } };
  L.win_a_0 = merge(guard, { torso: { v: 'stand', r: 0 }, armF: fist(30, 60), armB: fist(-30, 60), ...stance });
  L.win_a_1 = merge(guard, { torso: { v: 'stand', r: 0 }, armF: fist(75, 90), armB: fist(-75, -90), ...stance });
  L.win_a_2 = merge(guard, { torso: { v: 'stand', r: -15 }, head: { r: -15 }, armF: fist(90, 90), armB: fist(-120, -30), ...stance });
  L.win_b_0 = merge(guard, { hips: { r: 15 }, torso: { v: 'lean', r: 15 }, armF: fist(30, 90), armB: fist(0, 60), legF: { h: 45, k: 45 }, legB: { h: -15, k: 30 } });
  L.win_b_1 = merge(guard, { torso: { v: 'stand', r: -15 }, head: { r: -15 }, armF: fist(150, 15), armB: fist(-15, 75), ...stance });
  L.win_b_2 = merge(guard, { torso: { v: 'stand', r: -15 }, head: { r: -15 }, armF: fist(165, 0), armB: fist(-15, 75), ...stance });

  // ---- taunt: open arms, beckon, beckon
  L.taunt_0 = merge(guard, { torso: { v: 'stand', r: -15 }, head: { r: -15 }, armF: open(60, 0), armB: open(-45, 0), legF: { h: 30, k: 15 }, legB: { h: -30, k: 15 } });
  L.taunt_1 = merge(guard, { torso: { v: 'lean', r: 0 }, armF: open(90, 30), armB: fist(30, 60), legF: { h: 30, k: 30 }, legB: { h: -30, k: 30 } });
  L.taunt_2 = merge(guard, { torso: { v: 'lean', r: 0 }, armF: open(90, 75), armB: fist(30, 60), legF: { h: 30, k: 30 }, legB: { h: -30, k: 30 } });

  // ---- intros (6 unique poses per fighter; the last is the fight stance)
  if (fighterId === 'brick') {
    const easy = { legF: { h: 15, k: 15 }, legB: { h: -15, k: 15 } };
    L.intro_0 = merge(guard, { torso: { v: 'stand', r: 15 }, head: { r: -15 }, armF: fist(15, 15), armB: fist(-15, 15), ...easy });                  // hands in pockets, slouch
    L.intro_1 = merge(guard, { torso: { v: 'stand', r: 15 }, head: { r: -15 }, armF: fist(120, 150), armB: fist(-15, 15), ...easy });                 // hand up to the mouth: toothpick
    L.intro_2 = merge(guard, { torso: { v: 'stand', r: 0 }, head: { r: 0 }, armF: open(75, 60), armB: fist(-15, 15), ...easy });                      // flick it away
    L.intro_3 = merge(guard, { torso: { v: 'lean', r: 15 }, head: { r: -15 }, armF: fist(60, 90), armB: fist(75, 75), legF: { h: 30, k: 30 }, legB: { h: -15, k: 30 } }); // cracks knuckles
    L.intro_4 = merge(guard, { torso: { v: 'lean', r: 15 }, armF: fist(45, 105), armB: fist(30, 60), legF: { h: 45, k: 45 }, legB: { h: -30, k: 30 } });  // steps in
    L.intro_5 = merge(guard, {});
  } else {
    const calm = { legF: { h: 15, k: 0 }, legB: { h: -15, k: 0 } };
    L.intro_0 = merge(guard, { torso: { v: 'lean', r: 0 }, armF: fist(105, 75), armB: fist(30, 60), head: { r: 15 }, ...calm });                       // guard up, cracks the neck
    L.intro_1 = merge(guard, { torso: { v: 'stand', r: 0 }, armF: fist(45, 90), armB: fist(30, 105), head: { r: 15 }, ...calm });                     // cracks neck left
    L.intro_2 = merge(guard, { torso: { v: 'stand', r: 0 }, armF: fist(120, 60), armB: fist(30, 60), head: { r: -15 }, ...calm });                    // hand to the neck
    L.intro_3 = merge(guard, { torso: { v: 'stand', r: -15 }, armF: fist(-15, 30), armB: fist(-30, 45), head: { r: -15 }, ...calm });                 // shoulders roll back
    L.intro_4 = merge(guard, { torso: { v: 'lean', r: 15 }, armF: fist(45, 105), armB: fist(30, 60), legF: { h: 45, k: 45 }, legB: { h: -30, k: 30 } });
    L.intro_5 = merge(guard, { torso: { v: 'stand', r: 0 }, armF: fist(45, 90), armB: fist(30, 105), head: { r: 0 }, ...calm });                      // arms crossed, still
  }
  return L;
}

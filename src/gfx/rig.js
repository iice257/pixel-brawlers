// DOM-free rig maths. Turns a pose into a list of part draw-ops with world positions.
//
// Conventions (docs/ART_BIBLE.md section 2), all art authored facing RIGHT:
//  - World space: x right, y down, origin = hips root (the hips part's `torso` pivot). Units = art pixels.
//  - Limbs (arm s/e/w, leg h/k) use LIMB angles in degrees: 0 = hanging straight down, positive = swing toward
//    the facing direction (counter-clockwise on screen when facing right). Limb angles are WORLD angles.
//    armX: s = shoulder (upper arm), e = elbow bend added to s (forearm = s+e), w = wrist added on top (hand).
//    legX: h = hip (thigh), k = knee bend (shin = h - k, so positive k folds the shin backward), fr = foot angle
//    in world (0 = flat, positive = toes up).
//  - Upright parts (hips.r, torso.r, head.r) are cumulative and positive = lean toward facing (clockwise).
//  - Angles are quantised to Q degrees by the baker.

export const Q = 15;
export const quant = (a = 0) => Math.round(a / Q) * Q;
export const DEFAULT_Z = ['armB', 'legB', 'hips', 'torso', 'head', 'legF', 'armF'];
export const BACK_GROUPS = new Set(['armB', 'legB']);

const rad = (d) => (d * Math.PI) / 180;
// World position of local point P (pixel coords, +0.5 = centre) of a placed op.
function toWorld(op, [px, py]) {
  const th = op.theta, c = Math.cos(th), s = Math.sin(th);
  const lx = px + 0.5 - (op.pivot[0] + 0.5), ly = py + 0.5 - (op.pivot[1] + 0.5);
  return [op.at[0] + lx * c - ly * s, op.at[1] + lx * s + ly * c];
}

// fighter = { parts, pivots }. Returns { ops: [{group, part, pivot, at, theta, back}], joints: {name:[x,y]} }
export function resolvePose(fighter, pose) {
  const P = fighter.pivots;
  const need = (part, joint) => {
    const p = P[part]?.[joint];
    if (!p) throw new Error(`rig: missing pivot ${part}.${joint}`);
    return p;
  };
  const ops = [], joints = {};
  const place = (group, part, pivotName, at, theta, extra = {}) => {
    const op = { group, part, pivotName, pivot: need(part, pivotName), at, theta, back: BACK_GROUPS.has(group), ...extra };
    ops.push(op);
    return op;
  };

  const [rdx, rdy] = pose.root ?? [0, 0];
  const hipsTheta = rad(quant(pose.hips?.r));
  const hips = place('hips', 'hips', 'torso', [rdx, rdy], hipsTheta);
  joints.root = [rdx, rdy];

  const tv = pose.torso?.v ?? 'stand';
  const torsoTheta = hipsTheta + rad(quant(pose.torso?.r));
  const tAt = toWorld(hips, need('hips', 'torso'));
  const tdy = pose.torso?.dy ?? 0, tdx = pose.torso?.dx ?? 0;
  const torso = place('torso', `torso_${tv}`, 'hips', [tAt[0] + tdx, tAt[1] + tdy], torsoTheta);

  const neck = toWorld(torso, need(`torso_${tv}`, 'neck'));
  const hv = pose.head?.v ?? 'neutral';
  const head = place('head', `head_${hv}`, 'neck', [neck[0] + (pose.head?.dx ?? 0), neck[1] + (pose.head?.dy ?? 0)], torsoTheta + rad(quant(pose.head?.r)));
  joints.neck = neck;

  for (const side of ['F', 'B']) {
    const g = 'arm' + side, a = pose['arm' + side] ?? {};
    const s = quant(a.s), e = quant(a.e), w = quant(a.w);
    const sh = toWorld(torso, need(`torso_${tv}`, 'shoulder' + side));
    joints['shoulder' + side] = sh;
    const up = place(g, 'arm_upper', 'shoulder', sh, rad(-s));
    const el = toWorld(up, need('arm_upper', 'elbow'));
    joints['elbow' + side] = el;
    const fo = place(g, 'arm_fore', 'elbow', el, rad(-(s + e)));
    const wr = toWorld(fo, need('arm_fore', 'wrist'));
    joints['wrist' + side] = wr;
    place(g, `hand_${a.hand ?? 'fist'}`, 'wrist', wr, rad(-(s + e + w)));
  }

  for (const side of ['F', 'B']) {
    const g = 'leg' + side, l = pose['leg' + side] ?? {};
    const h = quant(l.h), k = quant(l.k), fr = quant(l.fr);
    const hp = toWorld(hips, need('hips', 'hip' + side));
    joints['hip' + side] = hp;
    const th = place(g, 'thigh', 'hip', hp, rad(-h));
    const kn = toWorld(th, need('thigh', 'knee'));
    joints['knee' + side] = kn;
    const sn = place(g, 'shin', 'knee', kn, rad(-(h - k)));
    const an = toWorld(sn, need('shin', 'ankle'));
    joints['ankle' + side] = an;
    place(g, `foot_${l.foot ?? 'flat'}`, 'ankle', an, rad(-fr));
  }

  // z-order: groups back to front; within a group the chain order above is already upper -> fore -> hand.
  const z = pose.z ?? DEFAULT_Z;
  const ordered = [];
  for (const grp of z) ordered.push(...ops.filter((o) => o.group === grp));
  return { ops: ordered, joints };
}

export const poseKey = (id, pose) => id + ':' + JSON.stringify(pose);

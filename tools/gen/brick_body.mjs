// BRICK body parts: white tank torso, bare big arms, black fingerless gloves, denim, brown boots.
// Authored hanging straight down / facing right (docs/ART_BIBLE.md section 2). Same part + pivot names as SURGE.
import { grid, fill, put, line, form, shearRows, show } from '../blockin.mjs';

const SK = '12345';
const skin = (g, poly, opts) => form(g, poly, SK, 2, { only: '.3', ...opts });
const TANK = 'efgh', DENIM = 'ijkl', TRIM = 'mnop';

// ---------------------------------------------------------------- torso (46 wide)
function torsoBase(h = 36) {
  const g = grid(46, h);
  const T = h - 36;
  fill(g, [[15,2],[31,2],[38,3],[43,6],[45,12],[43,18],[40,24],[37,31 + T],[36,h],[10,h],[9,31 + T],[6,24],[3,18],[1,12],[3,6],[8,3]], '3');
  // bare skin: neck scoop, delts
  skin(g, [[16,2],[30,2],[28,5],[25,9],[23,10],[21,9],[18,5]], { blobs: [[22,4,1]] });
  skin(g, [[1,12],[3,6],[10,4],[12,10],[11,16],[5,18]], { blobs: [[5,8,1]] });
  skin(g, [[34,4],[41,4],[44,9],[45,13],[42,18],[35,16],[33,9]], { blobs: [[38,7,1]] });
  // tank top: white with grey fold shading
  const tank = [[11,3],[16,3],[18,5],[21,9],[23,10],[25,9],[28,5],[30,3],[35,3],[36,9],[38,16],[38,24],[37,31 + T],[36,h],[10,h],[9,31 + T],[8,24],[8,16],[10,9]];
  fill(g, tank, 'h');
  form(g, tank, TANK, 3, { only: 'h' });
  // folds: pec bulge underlines, side wrinkles, belly drape
  line(g, 13, 20, 22, 22, 'g', 'h'); line(g, 24, 22, 33, 20, 'g', 'h');
  line(g, 12, 15, 14, 18, 'g', 'h'); line(g, 33, 15, 35, 18, 'g', 'h');
  line(g, 10, 26, 16, 28 + T, 'g', 'h'); line(g, 36, 26, 30, 28 + T, 'f', 'gh');
  line(g, 17, 26 + T, 21, h - 2, 'g', 'h'); line(g, 27, 27 + T, 24, h - 3, 'g', 'h');
  line(g, 23, 12, 23, 20, 'g', 'h');
  put(g, 14, 24, 'f'); put(g, 31, 25, 'f'); put(g, 20, 31 + T, 'f'); put(g, 26, 32 + T, 'f');
  // deep outline at the neckline and armholes
  line(g, 16, 3, 18, 5, 'O'); line(g, 18, 5, 21, 9, 'O'); line(g, 21, 9, 23, 10, 'O'); line(g, 23, 10, 25, 9, 'O'); line(g, 25, 9, 28, 5, 'O'); line(g, 28, 5, 30, 3, 'O');
  line(g, 10, 9, 8, 16, 'O'); line(g, 8, 16, 8, 24, 'O');
  line(g, 36, 9, 38, 16, 'O'); line(g, 38, 16, 38, 24, 'O');
  return g;
}
export const torsoStand = () => torsoBase(36);
export const torsoCrouch = () => shearRows(torsoBase(31), 2, 48);
export const torsoLean = () => shearRows(torsoBase(36), 3, 49);
export const torsoLeanBack = () => shearRows(torsoBase(36), -3, 49);

// ---------------------------------------------------------------- hips (denim, belt, gold buckle)
export function hips() {
  const g = grid(30, 14);
  const P = [[2,0],[28,0],[29,4],[30,10],[29,13],[17,13],[15,9],[13,13],[1,13],[0,10],[1,4]];
  fill(g, P, 'j');
  form(g, P, DENIM, 1, { only: 'j', blobs: [[6,7,1], [23,7,1]] });
  line(g, 15, 4, 15, 9, 'i', 'jkl'); line(g, 5, 8, 8, 12, 'i', 'jkl'); line(g, 22, 8, 25, 12, 'i', 'jkl');
  line(g, 4, 5, 9, 6, 'k', 'j'); line(g, 21, 6, 26, 5, 'k', 'j');                                   // pocket stitching
  fill(g, [[2,0],[28,0],[29,3],[1,3]], 'n');                                                          // belt
  line(g, 2, 0, 27, 0, 'o', 'n'); line(g, 1, 3, 28, 3, 'm', 'n');
  fill(g, [[11,0],[19,0],[19,4],[11,4]], 'p'); line(g, 12, 1, 18, 1, 'o', 'p'); line(g, 12, 3, 18, 3, 'n', 'p'); put(g, 15, 2, 'm');   // gold buckle
  return g;
}

// ---------------------------------------------------------------- arms (bare, big)
export function armUpper() {                      // 16x22: delt + huge bicep
  const g = grid(16, 22);
  const P = [[3,0],[12,0],[15,4],[16,12],[14,19],[12,22],[4,22],[2,16],[0,8],[1,3]];
  fill(g, P, '3');
  form(g, [[3,0],[12,0],[15,4],[15,10],[11,12],[3,11],[0,8],[1,3]], SK, 2, { only: '3', blobs: [[5,3,1]] });          // delt
  form(g, [[3,12],[14,12],[14,19],[12,22],[4,22],[2,16]], SK, 2, { only: '3', blobs: [[7,15,2]] });                  // bicep peak
  line(g, 3, 11, 13, 12, '1', '2345');
  line(g, 5, 19, 12, 20, '1', '2345');                                                                                 // elbow crease
  put(g, 8, 13, '5'); put(g, 9, 14, '5');
  return g;
}
export function armFore() {                       // 14x22: bare forearm with vein/tendon
  const g = grid(14, 22);
  const P = [[2,0],[12,0],[14,6],[13,14],[12,21],[3,21],[1,14],[0,6]];
  fill(g, P, '3');
  form(g, P, SK, 2, { only: '3', blobs: [[4,5,1], [5,12,1]] });
  line(g, 5, 2, 8, 9, '2', '34'); line(g, 9, 12, 10, 18, '2', '34');
  return g;
}

// ---------------------------------------------------------------- hands (black fingerless gloves, skin fingertips)
function glove(g, h) {
  fill(g, [[0,0],[15,0],[15,h],[0,h]], 'm');
  form(g, [[0,0],[15,0],[15,h],[0,h]], TRIM, 0, { only: 'm' });
  line(g, 1, 1, 6, 1, 'n', 'm'); line(g, 1, h - 1, 13, h - 1, 'n', 'm');                              // leather sheen + knuckle pad edge
}
export function handFist() {
  const g = grid(15, 14);
  const P = [[1,0],[14,0],[15,4],[15,11],[12,14],[3,14],[0,11],[0,4]];
  fill(g, P, '3'); form(g, P, SK, 2, { only: '3' });
  glove(g, 8);
  for (const x of [4, 7, 10]) line(g, x, 9, x, 12, '1', '2345');
  line(g, 1, 13, 13, 13, '2', '345'); put(g, 2, 10, '5'); put(g, 6, 10, '4'); put(g, 9, 10, '5');
  return g;
}
export function handGuard() {
  const g = grid(15, 14);
  const P = [[1,0],[14,0],[15,4],[15,11],[12,14],[3,14],[0,11],[0,4]];
  fill(g, P, '3'); form(g, P, SK, 2, { only: '3' });
  glove(g, 7);
  line(g, 1, 10, 14, 10, '1', '2345'); fill(g, [[8,9],[14,9],[14,12],[9,12]], '2', '345'); line(g, 9, 9, 13, 9, '4', '2');
  for (const x of [4, 7, 10]) line(g, x, 8, x, 9, '1', '2345');
  put(g, 3, 8, '5'); put(g, 2, 9, '4');
  return g;
}
export function handOpen() {
  const g = grid(15, 15);
  const P = [[1,0],[14,0],[15,6],[14,10],[1,10],[0,5]];
  fill(g, P, '3'); form(g, P, SK, 2, { only: '3' });
  glove(g, 6);
  for (const [x, len] of [[1, 5], [4, 5], [7, 5], [10, 4]]) {
    fill(g, [[x, 10], [x + 3, 10], [x + 3, 10 + len], [x, 10 + len - 1]], '3'); line(g, x + 2, 10, x + 2, 9 + len, '2', '3'); put(g, x, 10, '4');
  }
  return g;
}

// ---------------------------------------------------------------- legs (jeans, brown boots)
export function thigh() {                          // 19x28
  const g = grid(19, 28);
  const P = [[2,0],[17,0],[19,8],[18,18],[16,25],[14,28],[5,28],[3,25],[1,18],[0,8]];
  fill(g, P, 'j');
  form(g, [[2,0],[17,0],[19,8],[18,16],[10,18],[1,16],[0,8]], DENIM, 1, { only: 'j', blobs: [[5,5,1], [6,10,1]] });
  form(g, [[1,16],[10,18],[18,16],[16,25],[14,28],[5,28],[3,25]], DENIM, 1, { only: 'j', blobs: [[9,21,1]] });
  line(g, 9, 3, 11, 15, 'i', 'jkl');                                                                   // seam
  line(g, 3, 18, 9, 20, 'i', 'jkl'); line(g, 10, 20, 16, 18, 'i', 'jkl'); line(g, 4, 22, 14, 22, 'i', 'jkl');  // knee wrinkles
  line(g, 4, 5, 6, 8, 'k', 'j'); line(g, 12, 7, 15, 9, 'k', 'j');
  return g;
}
export function shin() {                           // 15x26: jeans leg + boot top
  const g = grid(15, 26);
  fill(g, [[2,0],[13,0],[15,6],[14,14],[13,19],[12,26],[3,26],[2,19],[1,14],[0,6]], 'j');
  form(g, [[2,0],[13,0],[15,6],[14,14],[13,19],[2,19],[1,14],[0,6]], DENIM, 1, { only: 'j', blobs: [[5,5,1]] });
  line(g, 3, 8, 6, 14, 'i', 'jkl'); line(g, 10, 10, 12, 15, 'i', 'jkl');
  line(g, 2, 17, 13, 18, 'i', 'jkl');                                                                  // cuff over the boot
  const B = [[3,19],[12,19],[12,26],[3,26]];
  fill(g, B, 'n'); form(g, B, TRIM, 1, { only: 'n', blobs: [[5,22,1]] });
  line(g, 3, 19, 12, 19, 'm', 'no'); put(g, 7, 22, 'o'); put(g, 8, 23, 'o'); put(g, 7, 24, 'o');      // laces
  return g;
}
export function footFlat() {                       // 24x9
  const g = grid(24, 9);
  const P = [[2,0],[11,0],[14,3],[21,4],[24,6],[24,9],[0,9],[0,5]];
  fill(g, P, 'n'); form(g, P, TRIM, 1, { only: 'n', blobs: [[5,2,1], [19,5,1]] });
  line(g, 0, 8, 23, 8, 'm', 'no'); line(g, 14, 3, 20, 4, 'o', 'n'); line(g, 20, 5, 20, 7, 'm', 'no');
  return g;
}
export function footToe() {
  const g = grid(24, 11);
  const P = [[0,1],[3,0],[10,0],[14,2],[20,5],[24,9],[24,11],[17,11],[11,9],[4,8],[0,5]];
  fill(g, P, 'n'); form(g, P, TRIM, 1, { only: 'n', blobs: [[4,2,1], [17,7,1]] });
  line(g, 4, 8, 11, 9, 'm', 'no'); line(g, 11, 9, 17, 11, 'm', 'no'); line(g, 17, 11, 23, 11, 'm', 'no');
  line(g, 12, 3, 18, 6, 'o', 'n');
  return g;
}
export function footKick() {
  const g = grid(24, 10);
  const P = [[0,4],[4,1],[11,0],[19,0],[24,0],[24,3],[19,6],[10,8],[3,9],[0,8]];
  fill(g, P, 'n'); form(g, P, TRIM, 1, { only: 'n', blobs: [[9,2,1], [3,5,1]] });
  line(g, 3, 9, 10, 8, 'm', 'no'); line(g, 10, 8, 19, 6, 'm', 'no'); line(g, 13, 3, 18, 2, 'o', 'n');
  return g;
}

export const BRICK_BODY = {
  torso_stand: torsoStand, torso_crouch: torsoCrouch, torso_lean: torsoLean, torso_lean_back: torsoLeanBack,
  hips, arm_upper: armUpper, arm_fore: armFore,
  hand_fist: handFist, hand_open: handOpen, hand_guard: handGuard,
  thigh, shin, foot_flat: footFlat, foot_toe: footToe, foot_kick: footKick,
};
// x of a point after shearRows (top moves by `shear`, bottom stays; `pad` offsets negative shears)
const sx = (x, y, shear, h, pad = 0) => x + Math.round(shear * (1 - y / (h - 1))) + pad;
const torsoPivots = (shear, h, outPad, base) => ({
  hips: [sx(base.hips[0], base.hips[1], shear, h, outPad), base.hips[1]],
  neck: [sx(base.neck[0], base.neck[1], shear, h, outPad), base.neck[1]],
  shoulderF: [sx(base.shF, 8, shear, h, outPad), 8],
  shoulderB: [sx(base.shB, 8, shear, h, outPad), 8],
});
export const BRICK_PIVOTS = {
  torso_stand:     torsoPivots(0, 36, 0, { hips: [23, 31], neck: [23, 5], shF: 35, shB: 11 }),
  torso_crouch:    torsoPivots(2, 31, 0, { hips: [23, 26], neck: [23, 5], shF: 35, shB: 11 }),
  torso_lean:      torsoPivots(3, 36, 0, { hips: [23, 31], neck: [23, 5], shF: 35, shB: 11 }),
  torso_lean_back: torsoPivots(-3, 36, 3, { hips: [23, 31], neck: [23, 5], shF: 35, shB: 11 }),
  hips:            { torso: [15, 1], hipF: [22, 6], hipB: [8, 6] },
  arm_upper:       { shoulder: [8, 3], elbow: [8, 19] },
  arm_fore:        { elbow: [7, 2], wrist: [7, 19] },
  hand_fist:       { wrist: [7, 1] }, hand_open: { wrist: [7, 1] }, hand_guard: { wrist: [7, 1] },
  thigh:           { hip: [9, 3], knee: [9, 22] },
  shin:            { knee: [7, 2], ankle: [7, 20] },
  foot_flat:       { ankle: [6, 1] }, foot_toe: { ankle: [5, 1] }, foot_kick: { ankle: [5, 2] },
};

if (process.argv[1].endsWith('brick_body.mjs')) {
  console.log(show(BRICK_BODY[process.argv[2] || 'torso_stand']()));
}

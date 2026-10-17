// SURGE body parts. Every part is authored hanging straight down / facing right (docs/ART_BIBLE.md section 2).
import { grid, fill, put, line, form, shearRows, show } from '../blockin.mjs';

const SK = '12345';
const skin = (g, poly, opts) => form(g, poly, SK, 2, { only: '.3', ...opts });

// ---------------------------------------------------------------- torso
function torsoBase(h = 36) {
  const g = grid(44, h);
  const T = h - 36;                                                 // negative when compressed (crouch)
  const out = [[14,2],[30,2],[36,3],[41,6],[43,12],[41,18],[38,24],[35,30 + T],[34,h],[10,h],[9,30 + T],[6,24],[3,18],[1,12],[3,6],[8,3]];
  fill(g, out, '3');
  // trapezius ramps up to the neck
  skin(g, [[12,2],[32,2],[38,6],[40,10],[30,8],[22,6],[14,8],[4,10],[6,6]], { blobs: [[15,4,1]] });
  // near/far delts, pecs
  skin(g, [[1,12],[3,6],[10,4],[12,10],[11,16],[5,18]], { blobs: [[5,8,1]] });
  skin(g, [[32,4],[38,4],[42,9],[43,13],[40,18],[33,16],[31,9]], { blobs: [[36,7,1]] });
  skin(g, [[22,9],[34,9],[37,14],[35,20],[28,22],[22,19]], { blobs: [[27,12,1], [31,11,1]] });
  skin(g, [[8,9],[21,9],[21,19],[14,22],[8,19],[6,14]], { blobs: [[12,12,1]] });
  line(g, 21, 9, 21, 19, '1', '2345');                              // sternum
  line(g, 14, 22, 21, 20, '1', '2345'); line(g, 22, 20, 30, 23, '1', '2345'); // pec underline
  // ribs/obliques
  skin(g, [[7,23],[15,23],[15,h - 2],[10,h - 2],[8,28 + T]], {});
  skin(g, [[29,24],[37,23],[34,30 + T],[34,h - 2],[29,h - 2]], {});
  line(g, 10, 24, 14, 28 + T, '1', '2345'); line(g, 31, 25, 33, 29 + T, '1', '2345');
  // abs: 3 rows x 2 blocks
  const y0 = h === 36 ? 24 : 23;
  for (let r = 0; r < 3; r++) {
    const ya = y0 + r * 4 - (h === 36 ? 0 : r);
    skin(g, [[16,ya],[21,ya],[21,ya + 3],[16,ya + 3]], {});
    skin(g, [[23,ya],[28,ya],[28,ya + 3],[23,ya + 3]], {});
  }
  line(g, 21, y0 - 1, 21, h - 1, '1', '2345');
  for (let r = 1; r <= 3; r++) line(g, 16, y0 + r * 4 - 1 - (h === 36 ? 0 : r - 1), 28, y0 + r * 4 - 1 - (h === 36 ? 0 : r - 1), '1', '2345');
  return g;
}
export const torsoStand = () => torsoBase(36);
export const torsoCrouch = () => shearRows(torsoBase(31), 2, 46);   // hunched: shorter, shoulders forward
export const torsoLean = () => shearRows(torsoBase(36), 3, 47);
export const torsoLeanBack = () => shearRows(torsoBase(36), -3, 47);

// ---------------------------------------------------------------- hips / trunks (cloth A red, trim belt)
export function hips() {
  const g = grid(30, 14);
  const P = [[2,0],[28,0],[29,4],[30,10],[29,13],[17,13],[15,9],[13,13],[1,13],[0,10],[1,4]];
  fill(g, P, 'f');
  form(g, P, 'efgh', 1, { only: 'f', blobs: [[6,6,1], [22,6,1]] });
  line(g, 15, 3, 15, 9, 'e', 'fgh'); line(g, 5, 7, 8, 12, 'e', 'fgh'); line(g, 22, 7, 25, 12, 'e', 'fgh');   // folds
  line(g, 4, 5, 7, 5, 'h', 'fg'); line(g, 18, 5, 21, 5, 'h', 'fg');
  // belt (trim) with buckle
  fill(g, [[2,0],[28,0],[29,3],[1,3]], 'n');
  line(g, 2, 0, 27, 0, 'p', 'n'); line(g, 1, 2, 28, 2, 'm', 'n');
  fill(g, [[12,0],[18,0],[18,3],[12,3]], 'o'); line(g, 13, 1, 17, 1, 'p', 'o'); put(g, 15, 2, 'm');
  return g;
}

// ---------------------------------------------------------------- arms
export function armUpper() {                      // 15x22: delt cap, bicep, cyan armband tattoo
  const g = grid(15, 22);
  fill(g, [[3,0],[11,0],[14,4],[15,12],[13,19],[11,22],[4,22],[2,16],[0,8],[1,3]], '3');
  form(g, [[3,0],[11,0],[14,4],[14,10],[11,12],[3,11],[0,8],[1,3]], SK, 2, { only: '3', blobs: [[5,3,1]] });          // delt
  form(g, [[3,12],[13,12],[13,19],[11,22],[4,22],[2,16]], SK, 2, { only: '3', blobs: [[6,15,1]] });                  // lower bulk
  line(g, 3, 11, 12, 12, '1', '2345');                                                                                 // delt/bicep seam
  fill(g, [[1,9],[14,9],[14,13],[2,13]], 'n');
  line(g, 1, 9, 13, 9, 'p', 'n'); line(g, 2, 10, 13, 10, 'o', 'n'); line(g, 2, 12, 13, 12, 'm', 'n');
  put(g, 4, 11, 'p'); put(g, 8, 11, 'p'); put(g, 11, 11, 'p');
  return g;
}
export function armFore() {                       // 13x22: forearm + hand wrap (cloth B white)
  const g = grid(13, 22);
  const P = [[2,0],[11,0],[13,6],[12,14],[11,21],[3,21],[1,14],[0,6]];
  fill(g, P, '3');
  form(g, P, SK, 2, { only: '3', blobs: [[4,5,1]] });
  line(g, 5, 2, 7, 8, '2', '34');                                            // tendon
  const W = [[1,12],[12,12],[12,21],[3,21],[1,17]];
  fill(g, W, 'k');
  form(g, W, 'ijkl', 2, { only: 'k' });
  for (let i = 0; i < 4; i++) line(g, 1, 14 + i * 2, 12, 12 + i * 2, 'j', 'kl');       // diagonal wrap bands
  line(g, 1, 12, 12, 12, 'l', 'jk');
  return g;
}

// ---------------------------------------------------------------- hands (wrist at top, fingers down)
function wrap(g, h) {
  fill(g, [[0,0],[14,0],[14,h],[0,h]], 'k');
  form(g, [[0,0],[14,0],[14,h],[0,h]], 'ijkl', 2, { only: 'k' });
  line(g, 0, h, 13, h, 'j', 'kl');
}
export function handFist() {
  const g = grid(14, 13);
  const P = [[1,0],[13,0],[14,4],[14,10],[11,13],[3,13],[0,10],[0,4]];
  fill(g, P, '3'); form(g, P, SK, 2, { only: '3' });
  wrap(g, 5);
  for (const x of [4, 7, 10]) line(g, x, 6, x, 10, '1', '2345');                  // finger gaps
  line(g, 1, 11, 12, 11, '2', '345'); put(g, 2, 7, '5'); put(g, 3, 7, '4'); put(g, 6, 7, '5'); put(g, 9, 7, '4');
  return g;
}
export function handGuard() {                                                      // tighter fist, thumb across
  const g = grid(14, 13);
  const P = [[1,0],[13,0],[14,4],[14,10],[11,13],[3,13],[0,10],[0,4]];
  fill(g, P, '3'); form(g, P, SK, 2, { only: '3' });
  wrap(g, 4);
  line(g, 1, 8, 13, 8, '1', '2345');                                              // thumb crease
  fill(g, [[7,7],[13,7],[13,10],[8,10]], '2', '345'); line(g, 8, 7, 12, 7, '4', '2');
  for (const x of [4, 7, 10]) line(g, x, 5, x, 7, '1', '2345');
  put(g, 3, 5, '5'); put(g, 2, 6, '4');
  return g;
}
export function handOpen() {
  const g = grid(14, 14);
  const P = [[1,0],[13,0],[14,6],[13,9],[1,9],[0,5]];
  fill(g, P, '3'); form(g, P, SK, 2, { only: '3' });
  wrap(g, 4);
  for (const [x, len] of [[1, 5], [4, 5], [7, 5], [10, 4]]) {                 // four fingers
    fill(g, [[x, 9], [x + 3, 9], [x + 3, 9 + len], [x, 9 + len - 1]], '3'); line(g, x + 2, 9, x + 2, 8 + len, '2', '3'); put(g, x, 9, '4');
  }
  return g;
}

// ---------------------------------------------------------------- legs
export function thigh() {                          // 19x28
  const g = grid(19, 28);
  fill(g, [[2,0],[17,0],[19,8],[18,18],[16,25],[14,28],[5,28],[3,25],[1,18],[0,8]], '3');
  form(g, [[2,0],[17,0],[19,8],[18,16],[10,18],[1,16],[0,8]], SK, 2, { only: '3', blobs: [[5,5,1], [6,10,1]] });   // quad
  form(g, [[1,16],[10,18],[18,16],[16,25],[14,28],[5,28],[3,25]], SK, 2, { only: '3', blobs: [[9,22,1]] });         // knee/lower
  line(g, 9, 3, 11, 16, '1', '2345');                                                                                 // quad split
  line(g, 4, 25, 14, 25, '1', '2345');                                                                                // knee line
  put(g, 8, 23, '5'); put(g, 9, 23, '5');
  return g;
}
export function shin() {                           // 15x26: calf + boot (cloth B dark + trim cuff)
  const g = grid(15, 26);
  fill(g, [[2,0],[13,0],[15,6],[14,14],[12,19],[11,26],[4,26],[3,19],[1,14],[0,6]], '3');
  form(g, [[2,0],[13,0],[15,6],[14,14],[12,18],[3,18],[1,14],[0,6]], SK, 2, { only: '3', blobs: [[5,5,1], [4,10,1]] });
  line(g, 3, 6, 5, 14, '1', '2345');                                                                                   // shin ridge
  fill(g, [[3,18],[12,18],[11,26],[4,26]], 'j');
  form(g, [[3,18],[12,18],[12,26],[3,26]], 'ijkl', 1, { only: 'j', blobs: [[5,21,1]] });
  fill(g, [[2,17],[13,17],[13,20],[2,20]], 'n'); line(g, 2, 17, 12, 17, 'p', 'n'); line(g, 3, 19, 13, 19, 'm', 'n');
  return g;
}
export function footFlat() {                       // 24x9
  const g = grid(24, 9);
  const P = [[2,0],[11,0],[14,3],[21,4],[24,6],[24,9],[0,9],[0,5]];
  fill(g, P, 'j'); form(g, P, 'ijkl', 1, { only: 'j', blobs: [[5,2,1], [19,5,1]] });
  line(g, 0, 8, 23, 8, 'i', 'jkl'); line(g, 14, 3, 20, 4, 'm', 'jkl');
  line(g, 20, 5, 20, 8, 'i', 'jkl'); line(g, 3, 1, 10, 1, 'n', 'jkl');
  return g;
}
export function footToe() {                        // heel lifted, toes pointed down-right
  const g = grid(24, 11);
  const P = [[0,1],[3,0],[10,0],[14,2],[20,5],[24,9],[24,11],[17,11],[11,9],[4,8],[0,5]];
  fill(g, P, 'j'); form(g, P, 'ijkl', 1, { only: 'j', blobs: [[4,2,1], [17,7,1]] });
  line(g, 4, 8, 11, 9, 'i', 'jkl'); line(g, 11, 9, 17, 11, 'i', 'jkl'); line(g, 17, 11, 23, 11, 'i', 'jkl');
  line(g, 3, 1, 9, 1, 'n', 'jkl'); line(g, 12, 3, 18, 6, 'm', 'jkl');
  return g;
}
export function footKick() {                       // flexed, toes up, sole leading
  const g = grid(24, 10);
  const P = [[0,4],[4,1],[11,0],[19,0],[24,0],[24,3],[19,6],[10,8],[3,9],[0,8]];
  fill(g, P, 'j'); form(g, P, 'ijkl', 1, { only: 'j', blobs: [[9,2,1], [3,5,1]] });
  line(g, 3, 9, 10, 8, 'i', 'jkl'); line(g, 10, 8, 19, 6, 'i', 'jkl');
  line(g, 4, 1, 9, 1, 'n', 'jkl'); line(g, 13, 3, 18, 2, 'm', 'jkl');
  return g;
}

export const SURGE_BODY = {
  torso_stand: torsoStand, torso_crouch: torsoCrouch, torso_lean: torsoLean, torso_lean_back: torsoLeanBack,
  hips, arm_upper: armUpper, arm_fore: armFore,
  hand_fist: handFist, hand_open: handOpen, hand_guard: handGuard,
  thigh, shin, foot_flat: footFlat, foot_toe: footToe, foot_kick: footKick,
};
// Joints (x,y inside each grid): where this part hangs off its parent, and where children attach.
export const SURGE_PIVOTS = {
  torso_stand:     { hips: [22, 31], neck: [22, 5], shoulderF: [33, 8], shoulderB: [11, 8] },
  torso_crouch:    { hips: [24, 26], neck: [24, 5], shoulderF: [35, 8], shoulderB: [13, 8] },
  torso_lean:      { hips: [22, 31], neck: [25, 5], shoulderF: [36, 8], shoulderB: [14, 8] },
  torso_lean_back: { hips: [25, 31], neck: [22, 5], shoulderF: [33, 8], shoulderB: [11, 8] },
  hips:            { torso: [15, 1], hipF: [22, 6], hipB: [8, 6] },
  arm_upper:       { shoulder: [7, 3], elbow: [7, 19] },
  arm_fore:        { elbow: [6, 2], wrist: [6, 19] },
  hand_fist:       { wrist: [7, 1] }, hand_open: { wrist: [7, 1] }, hand_guard: { wrist: [7, 1] },
  thigh:           { hip: [9, 3], knee: [9, 22] },
  shin:            { knee: [7, 2], ankle: [7, 20] },
  foot_flat:       { ankle: [6, 1] }, foot_toe: { ankle: [5, 1] }, foot_kick: { ankle: [5, 2] },
};

if (process.argv[1].endsWith('surge_body.mjs')) {
  console.log(show(SURGE_BODY[process.argv[2] || 'torso_stand']()));
}

// SURGE portrait, authored in the reference's orientation (facing LEFT, light upper-left) in reference-grid coordinates
// (x 0..80 + OX), then mirrored so he faces right in-game.
import { outlineSilhouette, mk, mirror, out, T, flat, edge, circle, stampT, putT, lineT } from './portrait_lib.mjs';
import { form } from '../blockin.mjs';

const SK = '12345', HR = 'abcd';
const strokes = (g, list, ch, only) => list.forEach(([x0, y0, x1, y1]) => lineT(g, x0, y0, x1, y1, ch, only));
const dots = (g, list, ch, only) => list.forEach(([x, y]) => putT(g, x, y, ch, only));

export function surgePortrait() {
  const g = mk();

  // ---- back hair mass: overlapping rounded clumps, hangs behind the ear to the neck
  const clumps = [[50, 16, 20, 13], [62, 30, 9, 15], [70, 41, 6, 11], [36, 17, 6, 8], [33, 20, 4, 5], [42, 10, 7, 6], [50, 7, 8, 5], [58, 8, 7, 6], [65, 13, 5, 7], [60, 25, 5, 6], [37, 23, 4, 3]];
  for (const [cx, cy, rx, ry] of clumps) form(g, T(circle(cx, cy, rx, ry, 20)), HR, 1, { spread: 2 });
  flat(g, T([[30, 24], [30, 30], [36, 30], [50, 24], [52, 24], [38, 24], [33, 23]]), '.');
  // pointed tufts along the top (spiky silhouette)
  for (const [x, h] of [[36, 3], [41, 1], [47, 0], [53, 0], [59, 1], [65, 4]]) form(g, T([[x - 3, 11], [x - 1, h + 2], [x, h], [x + 1, h + 2], [x + 3, 11]]), HR, 1, { spread: 1 });
  // teal clumps and cyan strokes across the top, deep navy shadow underneath
  flat(g, T([[31, 19], [70, 19], [72, 28], [75, 36], [77, 44], [75, 54], [60, 54], [56, 24], [44, 24], [38, 24], [33, 23]]), 'a', 'bc');
  strokes(g, [[37, 12, 38, 15], [41, 13, 41, 16], [43, 11, 44, 13], [46, 10, 47, 14], [49, 9, 50, 12], [51, 12, 51, 15], [53, 8, 54, 11], [54, 12, 56, 17], [57, 12, 58, 18], [59, 8, 62, 9], [60, 10, 61, 14], [63, 9, 64, 12], [40, 7, 44, 6], [47, 5, 51, 5], [56, 5, 59, 6], [34, 14, 35, 17], [66, 11, 67, 15]], 'c', 'ab');
  strokes(g, [[52, 9, 53, 10], [55, 9, 56, 10], [58, 7, 60, 7], [55, 13, 55, 15], [45, 11, 46, 12], [49, 10, 50, 10], [38, 12, 38, 13], [42, 13, 42, 14], [62, 9, 63, 10]], 'd', 'abc');
  dots(g, [[58, 7], [53, 9], [46, 11], [55, 14]], 'z');
  // spiky tufts breaking the dome outline
  for (const [x, y] of [[38, 5], [39, 4], [40, 5], [45, 3], [46, 2], [47, 2], [48, 3], [53, 2], [54, 1], [55, 1], [56, 2], [61, 3], [62, 3], [63, 4], [67, 6], [68, 7], [31, 12], [30, 14], [31, 16]]) putT(g, x, y, 'b');
  for (const [x, y] of [[46, 2], [54, 1], [39, 4]]) putT(g, x, y, 'c');
  // dark clumps in the lower hair
  strokes(g, [[34, 18, 36, 21], [44, 19, 46, 22], [50, 20, 52, 23], [58, 22, 60, 26], [64, 26, 66, 32], [60, 34, 63, 40], [68, 34, 70, 40], [66, 42, 68, 46]], 'b', 'a');
  strokes(g, [[40, 18, 42, 20], [47, 17, 48, 19], [62, 18, 64, 21], [67, 22, 69, 26]], 'c', 'ab');

  // ---- neck, under the jaw, running into the trap
  const neck = T([[43, 46], [56, 42], [64, 46], [68, 54], [66, 62], [48, 63], [40, 57]]);
  form(g, neck, SK, 2, { spread: 3 });
  strokes(g, [[56, 43, 62, 46], [62, 47, 64, 52]], 'O');
  strokes(g, [[46, 50, 54, 58]], '1', '123');
  strokes(g, [[50, 52, 56, 58]], '3', '12');
  flat(g, T([[43, 52], [48, 50], [51, 56], [46, 58]]), '4', '23');
  stampT(g, 46, 53, ['55', '5.']);

  // ---- left arm (big, sweeping up toward the trap)
  const arm = T([[0, 96], [0, 92], [2, 86], [8, 82], [14, 76], [18, 70], [24, 64], [32, 60], [42, 54], [46, 56], [41, 64], [37, 72], [35, 82], [33, 96]]);
  form(g, arm, SK, 2, { spread: 2 });
  flat(g, T([[10, 92], [14, 84], [20, 76], [26, 70], [30, 66], [34, 74], [31, 84], [27, 96], [10, 96]]), '3', '2');
  flat(g, T([[12, 94], [16, 86], [21, 78], [27, 72], [30, 70], [31, 80], [26, 92], [24, 96], [12, 96]]), '4', '3');
  strokes(g, [[34, 62, 38, 58], [36, 66, 33, 74], [33, 76, 32, 84], [34, 70, 40, 62]], '2', '34');
  strokes(g, [[26, 80, 28, 84], [28, 84, 28, 92], [18, 86, 20, 92], [8, 88, 10, 94]], '2', '34');
  flat(g, T(circle(26, 68, 6, 2.4)), '4', '23');
  stampT(g, 22, 67, ['5555555', '.555555']);
  stampT(g, 3, 90, ['55', '55', '5.']);                      // lower-left highlight
  stampT(g, 2, 88, ['4']);
  flat(g, T([[46, 56], [44, 64], [40, 72], [38, 82], [38, 96], [34, 96], [36, 84], [38, 72], [42, 62]]), 'O');   // gap between arm and deltoid
  strokes(g, [[30, 70, 26, 78], [26, 78, 24, 86], [24, 86, 24, 96], [16, 80, 18, 88], [18, 88, 16, 96], [6, 84, 8, 90]], '2', '34');
  strokes(g, [[27, 78, 25, 86], [25, 86, 25, 94]], '1', '2');
  // cyan armband across the lower arm
  flat(g, T([[0, 84], [8, 78], [13, 79], [14, 83], [4, 90], [0, 90]]), 'n');
  strokes(g, [[1, 85, 8, 79]], 'p');
  strokes(g, [[0, 89, 5, 88], [5, 88, 13, 82]], 'm');
  edge(g, arm);

  // ---- face (left-edge / right-edge tables in reference coordinates)
  const L = { 24: 37, 25: 37, 26: 37, 27: 37, 28: 37, 29: 37, 30: 37, 31: 36, 32: 36, 33: 35, 34: 34, 35: 33, 36: 33, 37: 33, 38: 35, 39: 36, 40: 36, 41: 36, 42: 36, 43: 36, 44: 36, 45: 37, 46: 37, 47: 38, 48: 38, 49: 39, 50: 40, 51: 42, 52: 44, 53: 46 };
  const R = { 24: 46, 25: 47, 26: 48, 27: 49, 28: 51, 29: 52, 30: 54, 31: 55, 32: 55, 33: 55, 34: 55, 35: 55, 36: 55, 37: 56, 38: 58, 39: 58, 40: 58, 41: 58, 42: 58, 43: 58, 44: 57, 45: 56, 46: 55, 47: 53, 48: 52, 49: 51, 50: 50, 51: 49, 52: 48, 53: 48 };
  for (let y = 24; y <= 53; y++) for (let x = L[y]; x <= R[y]; x++) putT(g, x, y, '3');
  // zones: light mid-face, salmon on the back/lower side (jagged edges), white blobs
  for (let y = 24; y <= 53; y++) for (let x = L[y]; x <= R[y]; x++) putT(g, x, y, y >= 27 && y <= 44 && x - L[y] >= 1 ? '4' : '3');
  const zone = (poly, ch, only) => flat(g, T(poly), ch, only);
  zone([[44, 24], [53, 25], [55, 31], [50, 33], [47, 30], [45, 27]], '2', '34');                       // temple, under the hair
  zone([[49, 36], [52, 33], [56, 36], [59, 41], [59, 54], [45, 54], [47, 47], [47, 42], [49, 40]], '2', '34');   // cheek / jaw side
  zone([[46, 30], [49, 31], [49, 36], [47, 40], [45, 36]], '3', '4');                                  // soft transition
  zone([[34, 34], [37, 33], [38, 38], [36, 39], [34, 37]], '3', '4');                                  // nose
  zone([[37, 44], [43, 43], [46, 47], [44, 52], [40, 51], [38, 48]], '3', '4');                        // chin
  for (const [x, y] of [[38, 46], [39, 47], [41, 48], [43, 49], [44, 50], [40, 45], [42, 47]]) putT(g, x, y, '2');
  for (let x = 38; x <= 47; x++) putT(g, x, 26, 'O');                         // brow
  for (let x = 40; x <= 46; x++) putT(g, x, 25, 'O');
  dots(g, [[37, 27], [38, 27], [38, 28]], 'O');
  dots(g, [[34, 37], [35, 38]], '2');                                         // nostril shadow
  for (let x = 40; x <= 48; x++) putT(g, x, 27, '1', '34');                   // socket
  stampT(g, 41, 27, ['yyww']);                                              // eye
  for (let x = 41; x <= 49; x++) putT(g, x, 28, '2', '34');                    // lower lid
  stampT(g, 43, 29, ['55', '55', '55', '55', '5.']);                           // vertical forehead/cheek highlight
  stampT(g, 46, 35, ['55', '555', '555', '.55', '.55', '..5']);                                 // cheek blob
  stampT(g, 35, 33, ['5', '5']);                                               // nose bridge
  for (let x = 36; x <= 41; x++) putT(g, x, 43, 'x');                          // mouth
  for (let x = 37; x <= 41; x++) putT(g, x, 44, '2', '34');                    // lower lip shadow
  dots(g, [[37, 42], [38, 42], [39, 42]], '2', '34');                          // upper lip
  stampT(g, 36, 44, ['w']);                                                  // teeth
  lineT(g, 46, 40, 52, 46, '2', '34');                                         // cheek hollow
  lineT(g, 42, 52, 49, 48, '1', '234');                                        // under the jaw
  // ear
  for (let y = 30; y <= 38; y++) putT(g, 56 - (y < 32 ? 1 : 0), y, 'O');
  stampT(g, 52, 32, ['22', '2.', '22']);
  dots(g, [[53, 45], [53, 46], [54, 47], [50, 49], [51, 49], [52, 48]], 'O');
  // ---- front hair over the forehead
  for (let x = 37; x <= 47; x++) putT(g, x, 24, 'a');
  dots(g, [[38, 25], [39, 25], [44, 25], [45, 25], [46, 25], [40, 25], [46, 26], [47, 26]], 'a');
  dots(g, [[37, 25], [37, 26]], 'a');

  // ---- near deltoid / pec (big sphere, rim in salmon, big highlight crescent)
  const delt = T(circle(62, 78, 18.5, 20.5));
  form(g, delt, SK, 2, { spread: 3 });
  flat(g, T(circle(63, 79, 15.5, 17.5)), '3', '2');
  flat(g, T(circle(62, 77, 13, 15)), '4', '3');
  flat(g, T(circle(58, 72, 8, 8)), '4', '3');
  stampT(g, 52, 66, ['...55555..', '..5555555.', '.55555555.', '555555.555', '5555...555', '5555....55', '.555.....5', '..55......']);
  stampT(g, 46, 62, ['44', '4.']);
  strokes(g, [[44, 80, 52, 86], [46, 86, 58, 92], [52, 90, 62, 94]], '2', '34');
  strokes(g, [[46, 58, 58, 58], [46, 60, 52, 60]], '2', '34');
  edge(g, delt);

  outlineSilhouette(g);
  return mirror(g);
}
export const surgeHudCrop = [31, 21, 32, 32];
if (process.argv[1]?.endsWith('portrait_surge.mjs')) console.log(out(surgePortrait()).join('\n'));

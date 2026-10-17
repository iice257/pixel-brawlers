import { grid, fill, put, line, rim, at, show } from '../blockin.mjs';

export function brickHead() {
  const g = grid(32, 34);
  // face: narrower far (right) side for the three-quarter turn, square chin
  fill(g, [[7,10],[24,10],[25,13],[25,19],[24,23],[22,27],[19,29],[12,29],[8,27],[5,23],[4,18],[4,13]], '3');
  // thick neck + traps
  fill(g, [[10,27],[21,27],[21,30],[25,31],[31,32],[31,34],[1,34],[1,32],[6,31],[10,30]], '3');
  // near ear (left); far ear only a sliver
  fill(g, [[1,14],[4,14],[4,20],[2,20],[1,18]], '3');
  fill(g, [[25,15],[27,15],[27,18],[25,19]], '3');
  // white tank top at the bottom corners
  fill(g, [[3,31],[10,29],[13,31],[14,34],[2,34],[1,32]], 'h');
  fill(g, [[29,31],[22,29],[19,31],[18,34],[30,34],[31,32]], 'h');

  // ---- skin shading
  rim(g, '3', { light: '4', dark: '2' });
  for (let y = 32; y < 34; y++) for (let x = 0; x < 32; x++) if (g[y][x] === '2') g[y][x] = '3';
  fill(g, [[7,24],[12,27],[19,28],[23,24],[24,22],[22,27],[19,29],[12,29],[8,27]], '2', '34');   // jaw shadow under the cheek (near side)
  fill(g, [[19,15],[25,15],[25,23],[22,24],[20,21]], '2', '34');                                   // far side of face in shadow
  fill(g, [[5,13],[12,13],[12,22],[6,22]], '4', '3');                                              // near temple/cheek lit
  fill(g, [[10,29],[21,29],[21,32],[10,32]], '2', '34');                                           // under-chin neck shadow
  for (const [x,y] of [[10,11],[11,11],[12,11],[10,12],[11,12]]) put(g, x, y, '5');                // forehead blob
  for (const [x,y] of [[7,19],[8,19],[9,19],[7,20],[8,20]]) put(g, x, y, '5');                     // near cheek blob
  for (const [x,y] of [[20,17],[21,17],[20,18]]) put(g, x, y, '4');                                // far cheek
  for (const [x,y] of [[14,16],[14,17],[15,18],[14,15]]) put(g, x, y, '5');                        // nose bridge
  // brows (heavy, angry slope toward the nose)
  line(g, 5, 14, 12, 14, 'O'); put(g, 12, 15, 'O'); put(g, 13, 15, 'O');
  line(g, 17, 14, 24, 14, 'O'); put(g, 16, 15, 'O'); put(g, 17, 15, 'O');
  line(g, 6, 15, 11, 15, '1', '34'); line(g, 18, 15, 23, 15, '1', '34');
  // eyes: near 4x2, far 3x2 (white + blue iris)
  put(g, 7, 16, 'w'); put(g, 8, 16, 'w'); put(g, 9, 16, 'y'); put(g, 10, 16, 'y');
  put(g, 7, 17, '2'); put(g, 8, 17, 'w'); put(g, 9, 17, 'y'); put(g, 10, 17, 'y');
  put(g, 18, 16, 'w'); put(g, 19, 16, 'y'); put(g, 20, 16, 'y');
  put(g, 18, 17, 'w'); put(g, 19, 17, 'y'); put(g, 20, 17, '2');
  line(g, 6, 18, 11, 18, '2', '34'); line(g, 18, 18, 22, 18, '2', '34');
  // nose: a bit right of centre, shaded on the right
  put(g, 14, 20, '3'); line(g, 15, 19, 15, 21, '2', '34'); put(g, 16, 20, '2'); put(g, 16, 21, '1');
  put(g, 13, 21, 'O'); put(g, 14, 21, '1'); put(g, 15, 22, '2'); put(g, 16, 22, '2');
  line(g, 13, 22, 17, 22, '2', '34');
  // mouth: short grim line, off-centre toward the far side, tight lower lip
  line(g, 13, 24, 17, 24, 'x'); put(g, 12, 24, '1'); put(g, 18, 24, '1');
  line(g, 13, 25, 17, 25, '2', '34'); line(g, 13, 23, 16, 23, '2', '34');
  // toothpick from the right mouth corner, angled down-right, 4px long
  for (const [x,y] of [[18,24],[19,25],[20,26],[21,27]]) put(g, x, y, 'r');
  for (const [x,y] of [[18,25],[19,26],[20,27],[21,28]]) put(g, x, y, 's');
  // stubble + square chin
  for (const [x,y] of [[6,21],[7,23],[8,25],[9,27],[11,28],[13,28],[15,28],[17,28],[22,24],[23,22],[6,19]]) put(g, x, y, '2', '34');
  line(g, 12, 27, 18, 27, '4', '23');                       // chin highlight
  line(g, 11, 28, 19, 28, '3', '2');                        // flat chin base
  // ---- tank top: white base, grey folds, neckline cut
  rim(g, 'h', { light: 'h', dark: 'g' });
  line(g, 4, 33, 9, 32, 'g', 'h'); line(g, 22, 33, 27, 32, 'g', 'h');
  line(g, 5, 31, 8, 30, 'g', 'h'); line(g, 24, 31, 27, 31, 'g', 'h');
  line(g, 10, 30, 13, 33, 'O', 'ghf'); line(g, 21, 30, 18, 33, 'O', 'ghf');
  for (const [x,y] of [[2,32],[3,32],[2,33]]) put(g, x, y, '5', '34');
  // ---- hair: tall uneven spikes (two long, one forward), bangs over the forehead
  fill(g, [[3,13],[1,8],[2,4],[5,7],[7,0],[9,6],[12,3],[14,7],[17,0],[19,6],[22,3],[24,8],[31,6],[27,10],[25,13],[22,11],[20,13],[17,11],[14,13],[11,11],[8,13],[6,11],[4,13]], 'b');
  rim(g, 'b', { light: 'c', dark: 'a' });
  for (let y = 0; y < 34; y++) for (let x = 0; x < 32; x++)
    if ('bc'.includes(g[y][x]) && '12345'.includes(at(g, x, y + 1))) g[y][x] = 'a';
  // clump separations (dark)
  line(g, 5, 7, 6, 11, 'a', 'bc'); line(g, 9, 6, 10, 10, 'a', 'bc'); line(g, 13, 5, 13, 10, 'a', 'bc');
  line(g, 18, 6, 18, 10, 'a', 'bc'); line(g, 22, 5, 22, 10, 'a', 'bc'); line(g, 25, 9, 24, 11, 'a', 'bc');
  // lit strokes: upper-left of every spike (bright near white-yellow)
  for (const [a,b2,c2,d2] of [[2,6,3,8],[6,2,7,6],[7,5,8,8],[11,5,11,8],[12,5,12,7],[16,2,17,5],[18,6,19,8],[21,5,21,7],[24,9,28,7],[3,10,4,12],[8,9,8,11],[15,9,16,10]])
    line(g, a, b2, c2, d2, 'c', 'ab');
  for (const [x,y] of [[7,1],[17,1],[2,4],[12,3],[22,3],[6,3],[16,3],[26,8],[4,8],[20,7],[10,8]]) put(g, x, y, 'd', 'abc');
  for (const [x,y] of [[7,0],[17,0],[6,2],[16,2],[2,5],[12,4],[22,4],[28,7]]) put(g, x, y, 'z', 'abcd');
  return g;
}
if (process.argv[1].endsWith('brick_head.mjs')) console.log(show(brickHead()));

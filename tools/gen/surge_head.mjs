import { grid, fill, put, line, rim, at, show } from '../blockin.mjs';

export function surgeHead() {
  const g = grid(32, 34);
  // skull + face profile (chin forward, square-ish), throat, shoulder slope
  fill(g, [[19,11],[24,11],[26,12],[26,14],[27,15],[29,17],[31,19],[30,20],[28,20],[28,21],[29,22],[28,23],[28,24],[29,25],[29,27],[27,28],[25,28],[22,29],[22,31],[25,32],[30,33],[32,33],[32,34],[0,34],[0,31],[6,29],[10,26],[10,18],[11,12],[16,11]], '3');
  // hair: spiky top, forward spike, long back mass covering the ear and hanging low
  fill(g, [[0,31],[0,18],[0,11],[1,7],[3,5],[2,1],[6,4],[8,0],[11,4],[14,0],[17,5],[20,2],[22,6],[25,5],[27,8],[31,9],[27,12],[24,13],[20,13],[17,14],[15,15],[14,19],[14,24],[12,28],[8,29],[5,31]], 'b');
  // carve back-pointing tufts into the rear edge of the hair mass
  for (const [x,y] of [[0,12],[0,13],[1,13],[0,14],[0,18],[0,19],[1,19],[0,20],[0,24],[0,25],[1,25],[0,26],[1,26],[2,26],[0,28],[1,28],[0,29],[1,29],[2,29],[3,30]]) g[y][x] = '.';
  // ear (peeks from under the hair)
  fill(g, [[15,16],[18,16],[18,20],[16,21],[15,19]], '3');

  // ---- skin shading
  rim(g, '3', { light: '4', dark: '2', useRight: false });
  fill(g, [[15,19],[19,19],[25,21],[25,23],[19,22]], '2', '34');                 // under cheekbone
  fill(g, [[16,22],[26,28],[24,30],[13,26]], '2', '34');                         // shadow band under the jaw
  fill(g, [[18,12],[25,12],[25,14],[20,14]], '4', '3');                          // forehead lit
  fill(g, [[16,15],[22,15],[24,19],[17,19]], '4', '3');                          // cheek lit
  fill(g, [[2,31],[8,29],[10,34],[2,34]], '4', '3');                             // back trap lit
  for (const [x,y] of [[20,12],[21,12],[22,12],[21,13]]) put(g, x, y, '5');      // forehead blob
  for (const [x,y] of [[19,16],[20,16],[21,16],[19,17],[20,17]]) put(g, x, y, '5'); // cheekbone blob
  for (const [x,y] of [[2,32],[3,32],[4,32],[3,33]]) put(g, x, y, '5');          // trap blob
  put(g, 27, 16, '5'); put(g, 28, 17, '5'); put(g, 27, 15, '4');                  // nose bridge highlight
  for (let y = 32; y < 34; y++) for (let x = 0; x < 32; x++) if (g[y][x] === '2') g[y][x] = '3'; // no rim on the cut edge
  // jaw: 2-tone diagonal from ear to chin, throat notch
  line(g, 16, 21, 26, 27, '1', '234');
  line(g, 17, 22, 25, 28, '2', '34');
  put(g, 22, 29, '1'); put(g, 23, 29, '1'); put(g, 21, 28, '1'); put(g, 22, 30, '1');
  line(g, 17, 24, 19, 30, '2', '34');                                            // neck cord (sternocleidomastoid)
  line(g, 25, 31, 28, 32, '2', '34');                                            // collar-bone crease
  // ear detail
  put(g, 16, 17, 'O'); put(g, 17, 17, '2'); put(g, 16, 19, '2'); put(g, 17, 20, '2');
  // heavy brow ridge (2px), eye socket shadow, eye with iris at the front
  line(g, 20, 13, 26, 13, 'O');
  line(g, 21, 14, 26, 14, '1', '234');
  line(g, 21, 15, 26, 15, '2', '34');
  put(g, 22, 15, 'w'); put(g, 23, 15, 'w'); put(g, 24, 15, 'y'); put(g, 25, 15, '2');
  line(g, 22, 16, 25, 16, '2', '34');
  // nose + nostril
  put(g, 29, 19, '2'); put(g, 28, 19, '1'); put(g, 27, 18, '2'); put(g, 28, 18, '3'); put(g, 29, 20, '1', '234');
  // mouth + lips + chin
  line(g, 25, 22, 28, 22, 'x'); put(g, 24, 22, '1');
  put(g, 28, 21, '4'); put(g, 27, 21, '3'); put(g, 26, 21, '2');
  put(g, 27, 23, '2'); put(g, 26, 23, '2'); put(g, 28, 23, '2');
  put(g, 28, 24, '3'); put(g, 27, 24, '2');
  put(g, 29, 25, '4'); put(g, 29, 26, '4'); put(g, 28, 26, '5'); put(g, 28, 25, '3');
  // ---- hair shading: 4 tones in clumps, dark separations inside the mass
  rim(g, 'b', { light: 'c', dark: 'a' });
  for (let y = 0; y < 34; y++) for (let x = 0; x < 32; x++)
    if ('bc'.includes(g[y][x]) && '12345'.includes(at(g, x, y + 1))) g[y][x] = 'a';
  // clump separation lines (dark), flowing back/down
  line(g, 6, 5, 4, 11, 'a', 'bc'); line(g, 10, 4, 8, 12, 'a', 'bc'); line(g, 14, 5, 12, 11, 'a', 'bc');
  line(g, 19, 6, 17, 12, 'a', 'bc'); line(g, 23, 7, 21, 12, 'a', 'bc');
  line(g, 1, 14, 9, 20, 'a', 'bc'); line(g, 1, 19, 8, 25, 'a', 'bc'); line(g, 3, 25, 9, 28, 'a', 'bc');
  line(g, 16, 14, 11, 17, 'a', 'bc');
  // lit strokes (c) inside each clump, upper-left bias
  for (const [a,b2,c2,d2] of [[3,3,4,5],[5,7,7,9],[8,3,9,6],[10,6,11,9],[12,3,13,6],[15,7,16,10],[18,4,19,7],[21,7,22,9],[24,7,26,6],[28,9,26,10],
                              [2,13,5,15],[3,17,6,19],[4,21,7,23],[5,25,8,26],[11,19,12,21],[9,23,10,25],[7,9,8,11],[12,10,14,12],[16,9,17,11]])
    line(g, a, b2, c2, d2, 'c', 'ab');
  // brightest accents (z), sparing 1px
  for (const [x,y] of [[2,2],[8,1],[14,1],[20,3],[3,6],[10,5],[27,8],[5,14],[4,19],[13,6],[7,10]]) put(g, x, y, 'z', 'abc');
  // tip highlights (d)
  for (const [x,y] of [[2,3],[8,2],[14,2],[20,4],[26,7],[28,9],[6,5],[11,5],[17,6],[23,7]]) put(g, x, y, 'd', 'abc');
  return g;
}

if (process.argv[1].endsWith('surge_head.mjs')) console.log(show(surgeHead()));

// Reaction heads derived from the neutral heads: head_hit (pain: eyes shut, brow pinched, mouth open with gritted
// teeth) and head_ko (X eyes, slack mouth). Only the face glyphs are edited; skull, hair and neck stay identical.
import { put, line, show } from '../blockin.mjs';
import { surgeHead } from './surge_head.mjs';
import { brickHead } from './brick_head.mjs';

const clear = (g, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, ch); };

export function surgeHeadHit() {
  const g = surgeHead();
  line(g, 21, 14, 26, 14, 'O');                            // brow pinched down onto the eye
  clear(g, 22, 15, 25, 15, 'O'); clear(g, 22, 16, 25, 16, '2'); // eye squeezed shut
  put(g, 21, 15, '2');
  clear(g, 25, 21, 28, 23, 'x'); line(g, 26, 22, 28, 22, 'w'); // open mouth, teeth gritted in the middle
  put(g, 24, 22, '1'); put(g, 24, 21, '2');
  return g;
}
export function surgeHeadKo() {
  const g = surgeHead();
  line(g, 21, 14, 26, 14, '1');
  for (const [x, y] of [[22, 14], [25, 14], [23, 15], [24, 15], [22, 16], [25, 16]]) put(g, x, y, 'O');
  clear(g, 22, 15, 22, 15, '2'); clear(g, 25, 15, 25, 15, '2');
  put(g, 22, 15, '2'); put(g, 25, 15, '2');
  line(g, 25, 22, 28, 22, 'x'); line(g, 26, 23, 27, 23, 'x'); put(g, 28, 23, '2'); // slack mouth
  return g;
}
export function brickHeadHit() {
  const g = brickHead();
  clear(g, 7, 16, 10, 16, '2'); clear(g, 7, 17, 10, 17, 'O');                       // near eye shut
  clear(g, 18, 16, 20, 16, '2'); clear(g, 18, 17, 20, 17, 'O');                     // far eye shut
  line(g, 5, 14, 12, 14, 'O'); line(g, 17, 14, 24, 14, 'O'); put(g, 12, 15, 'O'); put(g, 17, 15, 'O');
  clear(g, 12, 23, 18, 25, 'x'); line(g, 13, 24, 17, 24, 'w');                      // open mouth + gritted teeth
  for (const [x, y] of [[19, 25], [20, 26], [21, 27]]) put(g, x, y, 'r');           // toothpick still dangling
  put(g, 18, 24, 'r'); put(g, 19, 24, 'r'); put(g, 20, 25, 'r');
  return g;
}
export function brickHeadKo() {
  const g = brickHead();
  clear(g, 7, 16, 10, 17, '2'); clear(g, 18, 16, 20, 17, '2');
  for (const [x, y] of [[7, 16], [10, 16], [8, 17], [9, 17], [18, 16], [20, 16], [19, 17]]) put(g, x, y, 'O');
  clear(g, 13, 24, 17, 24, '2'); line(g, 14, 24, 16, 24, 'x'); line(g, 14, 25, 16, 25, 'x'); // slack open mouth
  return g;
}
if (process.argv[1].endsWith('heads_react.mjs')) for (const f of [surgeHeadHit, surgeHeadKo, brickHeadHit, brickHeadKo]) console.log(f.name + '\n' + show(f()).split('\n').slice(10, 30).join('\n'));

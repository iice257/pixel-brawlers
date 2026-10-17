// Input processing (pure; no DOM, no clocks). All state is plain data so the world stays serialisable.
// Raw sample per tick: {left,right,up,down,buttons}. SOCD-clean, make facing-relative (6 = toward the opponent),
// keep a 90-tick ring, and hold button presses for 5 ticks until a state consumes them (GAME_DESIGN section 1).
export const BTN = Object.freeze({ LP: 1, HP: 2, LK: 4, HK: 8, BL: 16 });
export const BTN_LIST = ['LP', 'HP', 'LK', 'HK', 'BL'];
export const BTN_ALL = 31;

export const RING = 90;            // ticks of history kept per player
export const PRESS_BUFFER = 5;     // a press stays consumable for this many ticks
export const SIMUL_WINDOW = 3;     // two presses this close (or closer) count as pressed together
export const TAP_WINDOW = 12;      // double-tap: two forward/back edges at most this many ticks apart

export const FWD = Object.freeze([3, 6, 9]);
export const BACK = Object.freeze([1, 4, 7]);

// ---- direction maths. x: -1 left, 0, +1 right. y: -1 down, 0, +1 up. Numpad: 7 8 9 / 4 5 6 / 1 2 3.
export function socd(left, right, up, down) {
  return { x: (right ? 1 : 0) - (left ? 1 : 0), y: up ? 1 : down ? -1 : 0 };   // L+R = neutral, U+D = up
}
export const dirOf = (x, y) => 5 + x + 3 * y;
export const dirX = (d) => ((d - 1) % 3) - 1;
export const dirY = (d) => Math.floor((d - 1) / 3) - 1;
// Absolute (screen) direction -> facing-relative: facing -1 mirrors left/right so 6 is always "toward the opponent".
export const faceDir = (d, facing) => (facing < 0 ? dirOf(-dirX(d), dirY(d)) : d);

// ---- buffer state
export function createBuffer() {
  return { tick: 0, dirs: [], abs: [], btns: [], prev: 0, press: [-9999, -9999, -9999, -9999, -9999], live: [0, 0, 0, 0, 0], dir: 5, btn: 0 };
}

// Advance one tick with this tick's raw sample. Returns the buffer (b.dir / b.btn are the current facing-relative dir and held mask).
export function pushInput(b, raw, facing = 1) {
  b.tick++;
  const { x, y } = socd(raw.left, raw.right, raw.up, raw.down);
  const abs = dirOf(x, y), dir = faceDir(abs, facing), btn = (raw.buttons | 0) & BTN_ALL;
  const rising = btn & ~b.prev;
  for (let i = 0; i < 5; i++) if (rising & (1 << i)) { b.press[i] = b.tick; b.live[i] = 1; }
  b.prev = btn;
  b.dirs.push(dir); b.abs.push(abs); b.btns.push(btn);
  if (b.dirs.length > RING) { b.dirs.shift(); b.abs.shift(); b.btns.shift(); }
  b.dir = dir; b.btn = btn;
  return b;
}

// ---- button presses
export const pressAge = (b, i) => b.tick - b.press[i];
const isLive = (b, i) => b.live[i] === 1 && pressAge(b, i) < PRESS_BUFFER;

export function livePresses(b) {                       // mask of unconsumed presses younger than PRESS_BUFFER
  let m = 0;
  for (let i = 0; i < 5; i++) if (isLive(b, i)) m |= 1 << i;
  return m;
}
export function take(b, mask) {                        // consume (and return) the live presses in mask
  const got = livePresses(b) & mask;
  for (let i = 0; i < 5; i++) if (got & (1 << i)) b.live[i] = 0;
  return got;
}
const idx = (mask) => Math.log2(mask) | 0;
export function pairLive(b, maskA, maskB, win = SIMUL_WINDOW) {   // non-consuming: both live and pressed within `win` ticks
  const i = idx(maskA), j = idx(maskB);
  return isLive(b, i) && isLive(b, j) && Math.abs(b.press[i] - b.press[j]) <= win;
}
export function takePair(b, maskA, maskB, win = SIMUL_WINDOW) {
  if (!pairLive(b, maskA, maskB, win)) return false;
  b.live[idx(maskA)] = 0; b.live[idx(maskB)] = 0;
  return true;
}
export const THROW_PAIR = [BTN.LP, BTN.LK];
export const takeThrow = (b) => takePair(b, BTN.LP, BTN.LK);
// EX = two buttons of the same family (LP+HP or LK+HK). Returns 'punch' | 'kick' | null.
export function takeEX(b) {
  if (takePair(b, BTN.LP, BTN.HP)) return 'punch';
  if (takePair(b, BTN.LK, BTN.HK)) return 'kick';
  return null;
}

// ---- direction history
export function doubleTap(b, set = FWD, win = TAP_WINDOW) {   // true on the tick of the second tap's press edge
  const d = b.dirs, n = d.length;
  if (n < 3 || !set.includes(d[n - 1]) || set.includes(d[n - 2])) return false;
  for (let i = n - 3; i >= 0 && n - 1 - i <= win; i--) {
    if (set.includes(d[i]) && (i === 0 || !set.includes(d[i - 1]))) return true;
  }
  return false;
}
export function recent(b, n = 30) {                    // oldest -> newest
  const out = [], s = Math.max(0, b.dirs.length - n);
  for (let i = s; i < b.dirs.length; i++) out.push({ dir: b.dirs[i], abs: b.abs[i], btn: b.btns[i] });
  return out;
}

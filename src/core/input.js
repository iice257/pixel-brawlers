// Keyboard + gamepad sampling (DOM side). Produces raw per-tick samples {left,right,up,down,buttons};
// SOCD, facing and buffering happen in buffer.js. Layouts: GAME_DESIGN section 1.
import { BTN } from './buffer.js';

export const KEYMAPS = [
  { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', KeyJ: BTN.LP, KeyK: BTN.HP, KeyU: BTN.LK, KeyI: BTN.HK, KeyL: BTN.BL },
  { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right', Period: BTN.LP, Slash: BTN.HP, Semicolon: BTN.LK, Quote: BTN.HK, Comma: BTN.BL },
];
const BLOCK_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Quote', 'Period', 'Comma', 'Semicolon', 'F2', 'F3']);
const DEADZONE = 0.35;
const neutral = () => ({ left: false, right: false, up: false, down: false, buttons: 0 });

// Standard-mapping pad: D-pad 12-15 / left stick, X(2)=LP Y(3)=HP A(0)=LK B(1)=HK, LB(4)=block, RB(5)=LP+LK throw macro, Start(9)=pause.
export function padSample(gp) {
  const pr = (i) => !!gp.buttons[i]?.pressed;
  const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
  let buttons = 0;
  if (pr(2)) buttons |= BTN.LP;
  if (pr(3)) buttons |= BTN.HP;
  if (pr(0)) buttons |= BTN.LK;
  if (pr(1)) buttons |= BTN.HK;
  if (pr(4)) buttons |= BTN.BL;
  if (pr(5)) buttons |= BTN.LP | BTN.LK;
  return { left: pr(14) || ax < -DEADZONE, right: pr(15) || ax > DEADZONE, up: pr(12) || ay < -DEADZONE, down: pr(13) || ay > DEADZONE, buttons, start: pr(9) };
}

export function createInput(win = window) {
  const held = new Set();
  let pads = [];
  const onDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (BLOCK_DEFAULT.has(e.code) || KEYMAPS.some((m) => e.code in m)) e.preventDefault();
    held.add(e.code);
  };
  const onUp = (e) => { held.delete(e.code); };
  const clear = () => held.clear();
  win.addEventListener('keydown', onDown);
  win.addEventListener('keyup', onUp);
  win.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });

  const kb = (map) => {
    const s = neutral();
    for (const code of held) {
      const v = map[code];
      if (v === undefined) continue;
      if (typeof v === 'number') s.buttons |= v; else s[v] = true;
    }
    return s;
  };
  const merge = (a, b) => ({ left: a.left || b.left, right: a.right || b.right, up: a.up || b.up, down: a.down || b.down, buttons: a.buttons | b.buttons });

  return {
    held,
    // Poll gamepads once per tick (first connected pad -> P1, second -> P2).
    poll() { pads = (navigator.getGamepads?.() ?? []).filter((g) => g && g.connected); },
    pads: () => pads,
    // solo: this player also reads the other keyboard layout (1-player modes).
    read(p, { solo = false } = {}) {
      let s = kb(KEYMAPS[p]);
      if (solo) s = merge(s, kb(KEYMAPS[1 - p]));
      if (pads[p]) s = merge(s, padSample(pads[p]));
      return s;
    },
    pauseHeld: () => held.has('Escape') || held.has('KeyP') || pads.some((g) => padSample(g).start),
    clear,
  };
}

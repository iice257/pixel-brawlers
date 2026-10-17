// Keyboard + gamepad sampling (DOM side). Produces raw per-tick samples {left,right,up,down,buttons};
// SOCD, facing and buffering happen in buffer.js. Layouts live in bindings.js (remappable, saved by the Controls screen).
import { BTN } from './buffer.js';
import { PROFILES, defaultBindings, keymapOf } from './bindings.js';

const DEADZONE = 0.35;
const neutral = () => ({ left: false, right: false, up: false, down: false, buttons: 0 });
const KEEP = new Set(['F1', 'F2', 'F3', 'Tab']);   // never typed into the game; the page uses them

// Standard-mapping pad: D-pad 12-15 / left stick, X(2)=LP Y(3)=HP A(0)=LK B(1)=HK, LB(4) or RB(5) = block, LT(6) or RT(7) = throw (LP+LK), Start(9) = pause.
export function padSample(gp) {
  const pr = (i) => !!gp.buttons[i]?.pressed;
  const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
  let buttons = 0;
  if (pr(2)) buttons |= BTN.LP;
  if (pr(3)) buttons |= BTN.HP;
  if (pr(0)) buttons |= BTN.LK;
  if (pr(1)) buttons |= BTN.HK;
  if (pr(4) || pr(5)) buttons |= BTN.BL;
  if (pr(6) || pr(7)) buttons |= BTN.LP | BTN.LK;
  return { left: pr(14) || ax < -DEADZONE, right: pr(15) || ax > DEADZONE, up: pr(12) || ay < -DEADZONE, down: pr(13) || ay > DEADZONE, buttons, start: pr(9) };
}

export function createInput(win = window, bindings = defaultBindings()) {
  const held = new Set();
  let pads = [];
  let maps = {};
  const setBindings = (b) => { bindings = b; maps = Object.fromEntries(PROFILES.map((p) => [p, keymapOf(b[p])])); };
  setBindings(bindings);
  const onDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (PROFILES.some((p) => e.code in maps[p]) || KEEP.has(e.code)) e.preventDefault();
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
    setBindings,
    bindings: () => bindings,
    // Poll gamepads once per tick (first connected pad -> P1, second -> P2).
    poll() { pads = (navigator.getGamepads?.() ?? []).filter((g) => g && g.connected); },
    pads: () => pads,
    // p: 0 = P1 layout + first pad, 1 = P2 layout + second pad. solo: a 1-player mode, so the human reads every layout and every pad.
    read(p, { solo = false } = {}) {
      if (solo) {
        let s = merge(merge(kb(maps.p1), kb(maps.p2)), kb(maps.alt));
        for (const g of pads) s = merge(s, padSample(g));
        return s;
      }
      let s = kb(maps[PROFILES[p]]);
      if (pads[p]) s = merge(s, padSample(pads[p]));
      return s;
    },
    pauseHeld: () => held.has('Escape') || held.has('KeyP') || pads.some((g) => padSample(g).start),
    clear,
  };
}

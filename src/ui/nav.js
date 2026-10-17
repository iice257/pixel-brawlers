// Menu navigation: keyboard and gamepad collapse into the same few events (up/down/left/right/ok/back/tab), edge-triggered.
const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', Escape: 'back', Backspace: 'back', Tab: 'tab' };

export function createNav(win = window) {
  const queue = [];
  const raw = [];                         // raw key codes, for the Controls screen's "press a key" capture
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code in KEYS || e.code.startsWith('F')) e.preventDefault();
    if (e.repeat && !['up', 'down', 'left', 'right'].includes(KEYS[e.code])) return;
    raw.push(e.code);
    if (KEYS[e.code]) queue.push(KEYS[e.code]);
  };
  win.addEventListener('keydown', onKey);
  let padPrev = {};
  const PAD = { 12: 'up', 13: 'down', 14: 'left', 15: 'right', 0: 'ok', 9: 'ok', 1: 'back', 8: 'back' };
  const pads = () => (navigator.getGamepads?.() ?? []).filter((g) => g && g.connected);
  return {
    // Events since the last call, plus the raw key codes (consumed).
    drain() {
      for (const g of pads()) {
        const cur = {};
        for (const [i, ev] of Object.entries(PAD)) cur[ev + i] = !!g.buttons[i]?.pressed;
        const ax = g.axes[0] ?? 0, ay = g.axes[1] ?? 0;
        cur.left_ax = ax < -0.6; cur.right_ax = ax > 0.6; cur.up_ax = ay < -0.6; cur.down_ax = ay > 0.6;
        for (const k of Object.keys(cur)) if (cur[k] && !padPrev[k]) queue.push(k.replace(/_ax$|\d+$/, ''));
        padPrev = cur;
      }
      return { events: queue.splice(0), keys: raw.splice(0) };
    },
    padCount: () => pads().length,
    destroy() { win.removeEventListener('keydown', onKey); },
  };
}

// Animation timing tables (data only). {name: {loop, frames: [{pose, ticks}], ...}}.
// Poses live in src/gfx/poses.js; fighters can override timing in FIGHTER_ANIMS (frame-data tweaks from GAME_DESIGN 3.3).
const seq = (prefix, n, ticks) => Array.from({ length: n }, (_, i) => ({ pose: `${prefix}_${i}`, ticks: Array.isArray(ticks) ? ticks[i] : ticks }));

export const ANIMS = {
  idle:         { loop: true,  frames: seq('idle', 6, 8) },
  walk_f:       { loop: true,  frames: seq('walk_f', 8, 5) },
  walk_b:       { loop: true,  frames: seq('walk_b', 8, 6) },
  crouch_in:    { loop: false, frames: seq('crouch_in', 2, 3) },
  crouch_hold:  { loop: true,  frames: seq('crouch_hold', 1, 3) },
  crouch_out:   { loop: false, frames: seq('crouch_out', 2, 3) },
  jump_prep:    { loop: false, frames: seq('jump_prep', 1, 4) },
  jump_rise:    { loop: false, frames: seq('jump_rise', 1, 8) },
  jump_apex:    { loop: false, frames: seq('jump_apex', 1, 8) },
  jump_fall:    { loop: false, frames: seq('jump_fall', 2, 8), holdLast: true },
  jump_land:    { loop: false, frames: seq('jump_land', 1, 3) },
  jump_f:       { loop: false, frames: seq('jump_f', 4, 9), holdLast: true },      // spans the airtime (36+ ticks), last pose holds
  jump_b:       { loop: false, frames: seq('jump_b', 4, 9), holdLast: true },
  dash_f:       { loop: false, frames: seq('dash_f', 3, [5, 5, 4]) },              // 14 ticks
  dash_b:       { loop: false, frames: seq('dash_b', 3, [5, 7, 4]) },              // 16 ticks
};

export const FIGHTER_ANIMS = {};

export const animsFor = (id) => {
  const out = { ...ANIMS };
  for (const [name, patch] of Object.entries(FIGHTER_ANIMS[id] ?? {})) out[name] = { ...out[name], ...patch };
  return out;
};
export const animTotal = (a) => a.frames.reduce((n, f) => n + f.ticks, 0);
// Which frame index plays at tick t (loops, or holds the last frame).
export function frameAt(a, t) {
  const total = animTotal(a);
  if (a.loop) t = t % total; else t = Math.min(t, total - 1);
  let acc = 0;
  for (let i = 0; i < a.frames.length; i++) { acc += a.frames[i].ticks; if (t < acc) return i; }
  return a.frames.length - 1;
}

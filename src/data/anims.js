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

// ---- attacks. sar = startup/active/recovery ticks (GAME_DESIGN 3.1); layout = how many poses cover each phase.
// Startup poses share the startup ticks, the extended pose holds for the active ticks, recovery poses share the rest.
// hitbox = {x, y, w, h}-as-array, facing right, feet origin, y up (GAME_DESIGN 2.2); the viewer reach-checks the extended pose.
function framesFromSar(prefix, sar, layout) {
  const names = ['startup', 'active', 'recovery'];
  const frames = [];
  let n = 0;
  layout.forEach((count, p) => {
    const total = sar[p];
    for (let i = 0; i < count; i++) {
      const ticks = Math.floor(total / count) + (i < total % count ? 1 : 0);
      frames.push({ pose: `${prefix}_${n++}`, ticks, phase: names[p] });
    }
  });
  return frames;
}
const attack = (prefix, sar, layout, hitbox, extra = {}) => ({ loop: false, prefix, layout, sar, hitbox, frames: framesFromSar(prefix, sar, layout), ...extra });
// Air normals: startup pose, then the active pose holds until landing (A is the minimum hold).
const air = (prefix, sar, hitbox) => ({ loop: false, prefix, layout: [1, 1, 0], sar, hitbox, holdLast: true, frames: framesFromSar(prefix, sar, [1, 1, 0]) });

Object.assign(ANIMS, {
  LP:    attack('LP',    [4, 2, 6],  [1, 1, 1], [10, 62, 34, 14]),
  HP:    attack('HP',    [8, 3, 14], [2, 1, 2], [8, 58, 42, 18]),
  LK:    attack('LK',    [6, 3, 9],  [1, 1, 1], [6, 44, 40, 14]),
  HK:    attack('HK',    [10, 4, 18], [2, 1, 2], [6, 50, 52, 22]),
  '2LP': attack('2LP',   [4, 2, 7],  [1, 1, 1], [8, 38, 34, 12]),
  '2LK': attack('2LK',   [5, 2, 8],  [1, 1, 1], [6, 0, 46, 12]),
  '2HP': attack('2HP',   [7, 4, 20], [2, 1, 2], [6, 34, 30, 52]),
  '2HK': attack('2HK',   [9, 3, 22], [2, 1, 2], [4, 0, 62, 14]),
  jLP:   air('jLP', [5, 10, 0], [4, 20, 30, 30]),
  jHP:   air('jHP', [7, 6, 0],  [4, 14, 38, 36]),
  jLK:   air('jLK', [4, 10, 0], [2, 10, 36, 22]),
  jHK:   air('jHK', [9, 6, 0],  [2, 8, 46, 28]),
  throw: attack('throw', [5, 2, 24], [1, 1, 3], [0, 40, 59, 30]),   // reach / grab (active) / hold / release / recover; box far edge 59 = what the rig's arm length can reach (GAME_DESIGN says 34; flagged in TUNING_LOG)
});

// Which limb group(s) carry the hit: the reach check only measures those parts (hand/foot tip).
const LIMBS = { LP: ['armF'], HP: ['armF'], '2LP': ['armF'], '2HP': ['armF'], jLP: ['armF'], jHP: ['armF'],
  LK: ['legF'], HK: ['legF'], '2LK': ['legF'], '2HK': ['legF'], jLK: ['legF'], jHK: ['legF'], throw: ['armF', 'armB'] };
for (const [name, limb] of Object.entries(LIMBS)) ANIMS[name].limb = limb;

// Per-fighter frame-data tweaks (GAME_DESIGN 3.3). Only sar/hitbox change; frames are re-derived.
export const FIGHTER_ANIMS = {
  surge: { LP: { sar: [3, 2, 6] }, '2LP': { sar: [4, 2, 6] }, HP: { sar: [8, 3, 13] }, LK: { sar: [6, 3, 9], hitbox: [6, 44, 44, 14] }, HK: { sar: [10, 4, 17] } },
  brick: { HP: { sar: [9, 3, 15] }, LP: { sar: [4, 2, 7] }, '2HP': { sar: [8, 4, 21] } },
};

export const animsFor = (id) => {
  const out = { ...ANIMS };
  for (const [name, patch] of Object.entries(FIGHTER_ANIMS[id] ?? {})) {
    const base = out[name], next = { ...base, ...patch };
    if (patch.sar && base.prefix) next.frames = framesFromSar(base.prefix, patch.sar, base.layout);
    out[name] = next;
  }
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

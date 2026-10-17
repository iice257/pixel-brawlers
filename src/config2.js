// v2 engine constants (see docs/ART_BIBLE.md section 1). Legacy game keeps src/config.js.
export const W = 384;
export const H = 216;
export const STAGE_W = 576;
export const FLOOR_Y = 192;

// Round-end pacing in ticks: final-hit hitstop, slow-mo (fighters update every SLOW_EVERY-th tick), then the post-KO hold.
export const KO_PACE = { normal: { stop: 24, slow: 24, post: 60 }, final: { stop: 24, slow: 40, post: 90 } };
export const SLOW_EVERY = 4;

// Authoring / bake cell for fighter frames. Pivot = feet centre.
export const CELL_W = 160;
export const CELL_H = 128;
export const CELL_PIVOT = [80, 120];

// Fighter stats (GAME_DESIGN 3.3 table + 2.1 constants). Pure data. Fighter art files are generated, so stats live here.
// dash: v0 = initial px/tick, decay = per-tick multiplier (not in the spec; see TUNING_LOG 2.3).
export const STATS = {
  surge: { name: 'SURGE', hp: 1000, pwr: 1.0, def: 1.0, walkF: 2.1, walkB: 1.7, jump: 1.0, gravity: 0.41, dashF: { v0: 4.4, decay: 0.95 }, dashB: { v0: 3.6, decay: 0.95 }, throwRange: 42, height: 100 },
  brick: { name: 'BRICK', hp: 1000, pwr: 1.1, def: 1.0, walkF: 1.9, walkB: 1.6, jump: 0.97, gravity: 0.41, dashF: { v0: 4.4, decay: 0.95 }, dashB: { v0: 3.6, decay: 0.95 }, throwRange: 42, height: 102 },
};

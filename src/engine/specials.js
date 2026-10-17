// Special / super move plumbing (GAME_DESIGN 2.6). The real lists arrive with the character kits in 3.x; until then SPECIALS is empty.
// A special = { id, fighter?:'surge'|'brick'|undefined (any), kind:'special'|'super', match(f) -> bool (motion/button check), cost?, move: move data (see moves-template.js) }.
import { TEMPLATE } from '../data/moves-template.js';

export const SPECIALS = [];

export function registerSpecial(def) {
  TEMPLATE[def.id] = def.move;
  SPECIALS.push(def);
}
export function unregisterSpecial(id) {
  const i = SPECIALS.findIndex((s) => s.id === id);
  if (i >= 0) SPECIALS.splice(i, 1);
  delete TEMPLATE[id];
}

// First special of one of `kinds` whose input is satisfied and affordable, or null.
export function pickSpecial(f, kinds) {
  for (const s of SPECIALS) {
    if (!kinds.includes(s.kind) || (s.fighter && s.fighter !== f.id)) continue;
    if ((s.cost ?? 0) > f.meter) continue;
    if (s.match(f)) return s;
  }
  return null;
}

// Move lookup and frame-data helpers (pure). getMove(fighter, id) = template + that fighter's modifiers, hits normalised.
import { TEMPLATE, FIGHTER_MOVES, MOVE_IDS } from '../data/moves-template.js';

const cache = new Map();

function build(fighterId, id) {
  const base = TEMPLATE[id];
  if (!base) return null;
  const mod = FIGHTER_MOVES[fighterId]?.[id] ?? {};
  const { hit: hitPatch, ...fields } = mod;
  const m = { ...base, ...fields };
  m.fighter = fighterId;
  m.hits = base.hits.map((h) => ({ ...h, ...(hitPatch ?? {}) }));
  m.hits.forEach((h) => { h.from ??= m.startup + 1; h.to ??= m.startup + m.active; });
  // cancel windows follow the move's timing
  m.cancels = base.cancels.map((c) => ({ ...c, from: m.startup + 1, to: m.startup + m.active + (c.into === 'chain' ? 5 : 6) }));
  return Object.freeze(m);
}

export function getMove(fighterId, id) {
  const key = fighterId + ':' + id;
  if (!cache.has(key)) cache.set(key, build(fighterId, id));
  return cache.get(key);
}
export const moveIds = () => MOVE_IDS;
export const allMoves = (fighterId) => MOVE_IDS.map((id) => getMove(fighterId, id));

export const moveTotal = (m) => m.startup + m.active + m.recovery;       // air normals: landing lag is extra (m.landLag)

// Advantage = stun - ((A - 1) + R), contact on the first active tick (GAME_DESIGN 3). null when it does not apply
// (knockdown / launch on hit, throws, air normals whose recovery is the landing).
export function advantage(m, hitIndex = m.hits.length - 1) {
  if (m.state === 'air' || m.id === 'throw') return { hit: null, block: null };
  const h = m.hits[hitIndex];
  const cost = (m.active - 1) + m.recovery;
  return { hit: h.hs == null ? null : h.hs - cost, block: h.bs == null ? null : h.bs - cost };
}

export const fmtAdv = (v) => (v == null ? '-' : v > 0 ? '+' + v : String(v));

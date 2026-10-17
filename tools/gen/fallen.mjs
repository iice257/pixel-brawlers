// Fallen variants: torso_fallen / hips_fallen are the standing parts with every third column dropped, so that when the
// 90-degree rotation lays them on the floor the body is a believable thickness (about 28px) instead of a 44px barrel chest.
// Dropping whole columns keeps the outline and the shading bands; pivots are re-mapped to the surviving columns.
export function squash(rowsIn, pivots, from = 3, mod = 3, phase = 1) {
  const w = rowsIn[0].length;
  const drop = (x) => x >= from && x < w - from && x % mod === phase;
  const map = [];
  let kept = 0;
  for (let x = 0; x < w; x++) { map[x] = kept; if (!drop(x)) kept++; }
  const out = rowsIn.map((r) => [...r].filter((_, x) => !drop(x)).join(''));
  const piv = {};
  for (const [k, [px, py]] of Object.entries(pivots)) piv[k] = [Math.min(map[px], kept - 1), py];
  return { rows: out, pivots: piv };
}

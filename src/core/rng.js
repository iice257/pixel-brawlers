// Seeded RNG (mulberry32). State is a plain object {s} so it lives inside the serialisable world.
export const createRng = (seed = 1) => ({ s: seed >>> 0 });

export function rngNext(r) {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const rngInt = (r, n) => Math.floor(rngNext(r) * n);

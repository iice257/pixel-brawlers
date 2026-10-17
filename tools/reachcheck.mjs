// Headless reach check: for every attack anim, the rightmost body pixel of the first active pose inside the hitbox's
// y band vs the box's far edge (pass = within 4 px). Usage: node tools/reachcheck.mjs [pattern]
import { silhouette, reachAt } from './posecheck.mjs';
import { poseLibrary } from '../src/gfx/poses.js';
import { animsFor } from '../src/data/anims.js';
import * as surge from '../src/data/fighters/surge.js';
import * as brick from '../src/data/fighters/brick.js';

const MODS = { surge, brick };
const pat = new RegExp(process.argv[2] || '.');
for (const id of ['surge', 'brick']) {
  const f = { id, parts: MODS[id].parts, pivots: MODS[id].pivots }, lib = poseLibrary(id);
  for (const [name, a] of Object.entries(animsFor(id))) {
    if (!a.hitbox || !pat.test(name)) continue;
    const fr = a.frames.find((x) => x.phase === 'active');
    const { fx, ...pose } = lib[fr.pose] ?? {};
    if (!lib[fr.pose]) { console.log(id, name, 'MISSING', fr.pose); continue; }
    const r = reachAt(silhouette(f, pose), a.hitbox, a.limb);
    console.log(id.padEnd(6), name.padEnd(6), fr.pose.padEnd(8), `tip ${String(r.tip).padStart(3)} far ${String(r.far).padStart(3)} d ${String(r.diff).padStart(4)}`, Math.abs(r.diff) <= 4 ? 'ok' : 'FAIL');
  }
}

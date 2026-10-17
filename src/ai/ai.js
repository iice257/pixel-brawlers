// CPU opponent (GAME_DESIGN 7): perception -> intent -> scripted input. The output is the same raw sample a human produces
// ({left,right,up,down,buttons}), one per tick, so every move has its real startup and recovery and the CPU can whiff.
// It only ever looks at the opponent's *visible state* (position, state, move, move tick), delayed by the tier's reaction time. It never reads
// the opponent's input buffer. Neutral choices come from AI_ACTIONS, a registry: specials register their own actions there later.
import { BTN } from '../core/buffer.js';
import { getMove } from '../engine/moves.js';
import { isActionable, CHAIN_MAX } from '../engine/fighter.js';
import { STAGE_W } from '../config2.js';
import { TIERS, STYLE } from '../data/ai.js';
import { mulberry } from '../ui/qa_pad.js';

// ---------------------------------------------------------------------------------------------- script steps
// A step is {f,b,u,d,btn}: forward/back are relative to the opponent, resolved on the tick the step is emitted.
const step = (o = {}, n = 1) => Array.from({ length: n }, () => o);
const press = (id) => {
  const m = getMove('surge', id), crouch = m.state === 'crouch';
  return [{ btn: BTN[id.replace(/^[2j]/, '')], d: crouch }, {}];
};

// ---------------------------------------------------------------------------------------------- action registry
// action = { id, fighter?: id, weight(ctx) -> number >= 0, script(ctx) -> step[] }. ctx is built once per decision (see decide()).
export const AI_ACTIONS = new Map();
export const registerAiAction = (a) => AI_ACTIONS.set(a.id, a);
export const unregisterAiAction = (id) => AI_ACTIONS.delete(id);

const NORMAL_WEIGHT = { LP: 3, '2LP': 2.4, LK: 2.2, '2LK': 1.6, HP: 1.6, HK: 1.2, '2HK': 1.3, '2HP': 0.5 };
for (const id of Object.keys(NORMAL_WEIGHT)) {
  registerAiAction({
    id: 'normal:' + id,
    weight: (c) => (c.canReach(id) ? NORMAL_WEIGHT[id] * (id === '2HK' || id === '2LK' ? 0.6 + c.t.mixup : 1) * (id[0] === '2' && c.crouchPoke === 0 ? 0 : 1) * (0.5 + c.style.aggression) : 0),
    script: () => press(id),
  });
}
registerAiAction({
  id: 'throw',
  weight: (c) => (c.dist <= 42 && c.op.y <= 0 ? 0.8 + c.blockFreq * (2 + 6 * c.t.read) + (c.op.state === 'guard' || c.op.state === 'blockstun' ? 2.5 : 0) : 0),
  script: () => [{ btn: BTN.LP | BTN.LK }, {}],
});
registerAiAction({
  id: 'walk_in',
  weight: (c) => (c.dist > c.style.idealRange + 6 ? 2 + 4 * c.aggr : 0),
  script: (c) => step({ f: true }, 5 + c.rnd(10)),
});
registerAiAction({
  id: 'dash_in',
  weight: (c) => (c.dist > 120 ? 0.5 + 2.5 * c.aggr : 0),
  script: () => [{ f: true }, {}, { f: true }, ...step({ f: true }, 8)],
});
registerAiAction({
  id: 'walk_out',
  weight: (c) => (c.dist < c.style.idealRange - 14 ? 1 + 2 * (1 - c.aggr) : 0),
  script: (c) => step({ b: true }, 4 + c.rnd(8)),
});
registerAiAction({
  id: 'jump_in',
  weight: (c) => (c.dist > 72 && c.dist < 170 ? (c.style.jumpiness + 0.03) * 6 * (1 - 0.7 * c.antiAirSeen) : 0),
  script: () => step({ u: true, f: true }, 3),
});
registerAiAction({
  id: 'wait',
  weight: (c) => (c.pushy ? 0 : 0.6 + 2.2 * (1 - c.aggr) + 3 * (1 - c.t.act)),
  script: (c) => step({}, 6 + c.rnd(14)),
});
registerAiAction({
  id: 'wander',
  weight: (c) => 4 * (1 - c.t.act),
  script: (c) => step(c.rnd(2) ? { f: true } : { b: true }, 4 + c.rnd(12)),
});

// ---------------------------------------------------------------------------------------------- helpers
const reachOf = (id, mv) => { const h = mv.hits[0]; return h.box[0] + h.box[2]; };
const totalOf = (m) => m.startup + m.active + m.recovery;
const GUARDY = new Set(['guard', 'blockstun']);
const DEAD = new Set(['hit', 'launched', 'thrown', 'tech', 'lying', 'getup', 'ko', 'throwing']);
const GROUND_NORMALS = ['LP', 'LK', '2LP', '2LK', 'HP', 'HK', '2HP', '2HK'];
const snapOf = (f) => ({ x: f.x, y: f.y, vy: f.vy, state: f.state, st: f.st, id: f.id, move: f.move, mt: f.mt, facing: f.facing, hp: f.hp });

export function createAi({ id, tier = 4, seed = 1, style = null } = {}) {
  const t = TIERS[Math.max(1, Math.min(8, tier))];
  const rng = mulberry(seed * 7919 + tier);
  const ai = {
    id, tier, t, style: style ?? STYLE[id] ?? STYLE.surge, rng,
    tick: 0, ring: [], script: [], held: null,
    threatKey: '', block: null,           // current attack decision: {crouch}
    punishKey: '', airKey: '', airSeen: 0, airDone: false, chainKey: '', throwKey: '', qrDone: false, wakeT: 0,
    jumps: 0, blockFreq: 0, antiAirSeen: 0, lastOpAir: false, lastHp: [0, 0], quiet: 0, lastState: 'idle',
  };

  const rnd = (n) => Math.floor(rng() * n);
  const resolve = (s, me, op) => {
    const toward = Math.sign(op.x - me.x) || me.facing;
    const right = (s.f && toward > 0) || (s.b && toward < 0), left = (s.f && toward < 0) || (s.b && toward > 0);
    return { left: !!left, right: !!right, up: !!s.u, down: !!s.d, buttons: s.btn | 0 };
  };

  function context(me, op, vis, dist) {
    const aggr = Math.min(1, ai.style.aggression * (ai.quiet > 240 ? 1.6 : 1));
    return {
      me, op: vis, dist, t, style: ai.style, aggr, rnd, pushy: ai.quiet > 200, blockFreq: ai.blockFreq, antiAirSeen: ai.antiAirSeen,
      crouchPoke: 1,
      canReach: (mid) => { const mv = getMove(me.id, mid); return dist - 12 <= reachOf(mid, mv) && dist >= mv.hits[0].box[0] - 10; },
    };
  }

  function pickAction(c) {
    let total = 0;
    const cand = [];
    for (const a of AI_ACTIONS.values()) {
      if (a.fighter && a.fighter !== ai.id) continue;
      const w = a.weight(c);
      if (w > 0) { cand.push([a, w]); total += w; }
    }
    if (!cand.length) return null;
    let r = rng() * total;
    for (const [a, w] of cand) { r -= w; if (r <= 0) return a; }
    return cand[cand.length - 1][0];
  }

  // The best punish: the highest-damage move that is reachable and starts up before the opponent recovers.
  function punishMove(me, dist, remaining) {
    let best = null, dmg = -1;
    for (const id of GROUND_NORMALS) {
      const mv = getMove(me.id, id);
      if (mv.startup + 1 > remaining || dist - 12 > reachOf(id, mv) || dist < mv.hits[0].box[0] - 10) continue;
      if (mv.hits[0].dmg > dmg) { dmg = mv.hits[0].dmg; best = id; }
    }
    return best;
  }

  function nextChain(me, contact) {
    const cur = getMove(me.id, me.move);
    if (!cur.cancels.some((c) => c.into === 'chain') || me.chain.length >= CHAIN_MAX) return null;
    const legal = GROUND_NORMALS.filter((id) => { const m = getMove(me.id, id); return id !== me.move && !me.chain.includes(id) && m.weight >= cur.weight; });
    if (!legal.length) return null;
    // on hit: finish with damage; on block: mix high/low
    const w = (id) => {
      const m = getMove(me.id, id), heavy = m.weight >= 2;
      if (contact === 'hit') return heavy ? 3 + m.hits[0].dmg / 50 : 0.8;
      return id[0] === '2' ? 1 + ai.t.mixup * 2 : 1 + (1 - ai.t.mixup);
    };
    const tot = legal.reduce((s, id) => s + w(id), 0);
    let r = rng() * tot;
    for (const id of legal) { r -= w(id); if (r <= 0) return id; }
    return legal[0];
  }

  // One call per sim tick. `world` is read only; `idx` is the fighter this controller drives.
  ai.act = (world, idx) => {
    const me = world.fighters[idx], opp = world.fighters[1 - idx];
    ai.tick++;
    ai.ring.push(snapOf(opp));
    if (ai.ring.length > 40) ai.ring.shift();
    const vis = ai.ring[Math.max(0, ai.ring.length - 1 - t.reaction)];   // what the CPU saw `reaction` ticks ago
    const lag = Math.min(t.reaction, ai.ring.length - 1);                // how stale it is: used to extrapolate the move tick
    const dist = Math.abs(opp.x - me.x);                                 // own distance to where the opponent is (positions are visible)
    const out = (s) => resolve(s, me, opp);

    // ---- trackers (habits the CPU adapts to)
    const hp = me.hp + opp.hp;
    if (hp !== ai.lastHp[0] + ai.lastHp[1]) ai.quiet = 0; else ai.quiet++;
    ai.lastHp = [me.hp, opp.hp];
    ai.blockFreq = ai.blockFreq * 0.995 + (GUARDY.has(vis.state) ? 0.005 : 0);
    const opAir = vis.y > 6;
    if (opAir && !ai.lastOpAir) { ai.jumps++; ai.airKey = 'j' + ai.jumps; ai.airDone = false; }
    ai.lastOpAir = opAir;
    if ((me.state === 'launched' || me.state === 'hit') && ai.lastState === 'air') ai.antiAirSeen = Math.min(1, ai.antiAirSeen + 0.34);   // got anti-aired: jump less
    ai.antiAirSeen *= 0.999;
    ai.lastState = me.state;
    if (me.state === 'getup') ai.wakeT = 24;
    else if (ai.wakeT > 0) ai.wakeT--;

    // ---- states where the CPU has no choice or only reactive ones
    if (DEAD.has(me.state)) ai.script.length = 0;
    if (me.state === 'thrown') {                                              // tech: LP+LK inside the 7-tick window
      if (me.st === 0) ai.throwKey = rng() < 0.15 + 0.85 * t.read ? 'tech' : 'no';
      if (ai.throwKey === 'tech' && me.st === Math.min(6, Math.round(t.reaction * 0.6))) return out({ btn: BTN.LP | BTN.LK });
      return out({});
    }
    if (me.state === 'lying') {                                               // quick rise
      if (me.st <= 1 && !ai.qrDone) { ai.qrDone = true; if (rng() < t.reversal * 2 + 0.05 * t.act) return out({ btn: BTN.LP | BTN.HP }); }
      return out({});
    }
    ai.qrDone = me.state === 'lying' ? ai.qrDone : false;
    if (me.state === 'getup') return out(rng() < t.block ? { btn: BTN.BL } : {});
    if (DEAD.has(me.state)) return out(GUARDY.has(me.state) ? { btn: BTN.BL, d: me.stance === 'crouch' } : {});
    if (me.state === 'blockstun') return out({ btn: BTN.BL, d: me.stance === 'crouch' });
    if (me.state === 'landlag' || me.state === 'prejump' || me.state === 'dash_f' || me.state === 'dash_b') return out(ai.script.length ? ai.script.shift() : {});

    // ---- in the air: one jump-in normal per jump
    if (me.state === 'air' || (me.state === 'attack' && me.y > 0)) {
      if (me.state === 'air' && !me.airUsed && me.y > 8 && dist < 52 && me.vy <= 2 && !ai.airDone2) {
        ai.airDone2 = true;
        const id = rng() < 0.5 ? 'jHP' : 'jLK';
        return out({ btn: BTN[id.slice(1)] });
      }
      return out({});
    }
    ai.airDone2 = false;

    // ---- attacking: chain on hit/block
    if (me.state === 'attack') {
      if (me.contact && me.stop === 0) {
        const key = `${me.move}#${me.chain.length}#${me.contact}`;
        if (key !== ai.chainKey) {
          ai.chainKey = key;
          const go = me.contact === 'hit' ? rng() < t.combo : rng() < ai.style.aggression * (0.4 + 0.5 * t.act);
          const nxt = go ? nextChain(me, me.contact) : null;
          if (nxt) { const m = getMove(me.id, nxt); return out({ btn: BTN[nxt.replace(/^[2j]/, '')], d: m.state === 'crouch' }); }
        }
      }
      return out(ai.script.length ? ai.script.shift() : {});
    }
    ai.chainKey = '';

    // ---- defend: an attack the CPU has noticed (it began `reaction` ticks ago) and that can still reach it
    if (vis.state === 'attack' && vis.move) {
      const m = getMove(vis.id, vis.move), h = m.hits[0];
      const key = `${vis.move}@${ai.tick - vis.mt - lag}`;
      const mtNow = vis.mt + lag;
      const live = mtNow <= m.startup + m.active && dist <= reachOf(vis.move, m) + 18 + 14;
      if (key !== ai.threatKey) {
        ai.threatKey = key;
        ai.block = null;
        if (h.level !== 'T' && rng() < t.block) {
          let crouch = h.level === 'L' ? true : h.level === 'H' || h.level === 'O' ? false : rng() < 0.4;
          if (rng() < 0.35 * (1 - t.block)) crouch = !crouch;                       // low tiers guess the wrong stance
          ai.block = { crouch };
        }
      }
      if (live && ai.block) { ai.script.length = 0; return out({ btn: BTN.BL, d: ai.block.crouch }); }
    } else if (vis.state !== 'attack') { ai.threatKey = ''; ai.block = null; }

    // ---- anti-air: an opponent coming down at us
    if (opAir && !ai.airDone && vis.y < 95 && dist < 78) {
      ai.airDone = true;
      const p = Math.min(1, t.antiAir + t.read * Math.min(1, ai.jumps / 3) * 0.25);
      if (rng() < p) { ai.script = press('2HP').map((s) => ({ ...s })); return out(ai.script.shift()); }
    }

    // ---- punish: the opponent is recovering from a whiffed or blocked move
    if (vis.state === 'attack' && vis.move) {
      const m = getMove(vis.id, vis.move);
      const mtNow = vis.mt + lag, remaining = totalOf(m) - mtNow;
      if (mtNow > m.startup + m.active && remaining >= 4) {
        const key = `${vis.move}@${ai.tick - mtNow}`;
        if (key !== ai.punishKey) {
          ai.punishKey = key;
          const id = rng() < t.punish ? punishMove(me, dist, remaining) : null;
          if (id) { ai.script = press(id); return out(ai.script.shift()); }
        }
      }
    }

    // ---- wake-up right after getting up: reversal, block, or carry on
    if (ai.wakeT > 0 && dist < 70) {
      ai.wakeT = 0;
      if (rng() < t.reversal) { ai.script = press('LP'); return out(ai.script.shift()); }
      if (rng() < t.block) { ai.script = step({ btn: BTN.BL }, 14); return out(ai.script.shift()); }
    }

    // ---- continue whatever script is running
    if (ai.script.length) return out(ai.script.shift());

    // ---- neutral / pressure: pick an action from the registry
    const ctx = context(me, opp, vis, dist);
    const act = pickAction(ctx);
    if (!act) return out({});
    if (ai.quiet > 400 && dist > 40) ai.script = step({ u: true, f: true }, 3);       // stuck: jump toward the opponent to break the stall
    else ai.script = act.script(ctx);
    return out(ai.script.length ? ai.script.shift() : {});
  };

  return ai;
}

// Who controls what (OVERHAUL_PLAN R1). A session turns the menu config into one pair of raw inputs per tick:
//   versus   P1 layout/pad 1 vs P2 layout/pad 2          cpu       human (every layout) vs CPU on side 2
//   watch    CPU vs CPU                                  dummy     human vs a standing dummy (QA)
//   training human on side `ctrl` (Tab swaps) vs a dummy: stand / crouch / jump / block / cpu, infinite health
import { BTN, dirOf, faceDir, socd } from '../core/buffer.js';
import { createAi } from '../ai/ai.js';
import { getMove } from '../engine/moves.js';
import { STATS } from '../data/stats.js';

const NEUTRAL = { left: false, right: false, up: false, down: false, buttons: 0 };
const BTN_NAMES = [['LP', BTN.LP], ['HP', BTN.HP], ['LK', BTN.LK], ['HK', BTN.HK], ['BL', BTN.BL]];
const HIST_MAX = 9;

export function createSession(cfg, input) {
  const s = { mode: cfg.mode, ctrl: 0, ais: [null, null], hist: [], calm: [0, 0], lastHp: [0, 0] };
  const seed = () => 1 + Math.floor(Math.random() * 1e6);
  const makeAi = (i, tier) => createAi({ id: i ? cfg.p2 : cfg.p1, tier, seed: seed() });

  s.reset = () => {
    s.ais = [null, null];
    if (s.mode === 'cpu') s.ais[1] = makeAi(1, cfg.tier);
    else if (s.mode === 'watch') { s.ais[0] = makeAi(0, cfg.tier); s.ais[1] = makeAi(1, cfg.tier2); }
    else if (s.mode === 'training' && cfg.dummy === 'cpu') s.ais[1 - s.ctrl] = makeAi(1 - s.ctrl, cfg.tier);
    s.hist.length = 0;
  };
  s.swap = () => { if (s.mode === 'training') { s.ctrl = 1 - s.ctrl; s.reset(); } };
  s.humans = () => (s.mode === 'versus' ? [0, 1] : s.mode === 'watch' ? [] : s.mode === 'training' ? [s.ctrl] : [0]);
  s.label = () => ({ versus: '2 PLAYERS', cpu: `VS CPU T${cfg.tier}`, watch: 'WATCH', training: 'TRAINING', dummy: 'DUMMY' }[s.mode]);

  function dummyInput(world, i) {
    switch (cfg.dummy) {
      case 'crouch': return { ...NEUTRAL, down: true };
      case 'jump': return { ...NEUTRAL, up: true };
      case 'block': {
        const m = world.fighters[1 - i];
        const low = m.state === 'attack' && getMove(m.id, m.move).hits[0].level === 'L';
        return { ...NEUTRAL, down: low, buttons: BTN.BL };
      }
      case 'cpu': return s.ais[i].act(world, i);
      default: return NEUTRAL;
    }
  }

  function record(world, i, raw) {                     // input history of the human-controlled fighter (training overlay)
    const f = world.fighters[i];
    const { x, y } = socd(raw.left, raw.right, raw.up, raw.down);
    const dir = faceDir(dirOf(x, y), f.facing), btn = raw.buttons;
    const last = s.hist[0];
    if (last && last.dir === dir && last.btn === btn) { last.n++; return; }
    s.hist.unshift({ dir, btn, n: 1 });
    if (s.hist.length > HIST_MAX) s.hist.pop();
  }
  s.btnText = (btn) => BTN_NAMES.filter(([, m]) => btn & m).map(([n]) => n).join('+');

  s.inputs = (world) => {
    switch (s.mode) {
      case 'versus': return [input.read(0), input.read(1)];
      case 'cpu': return [input.read(0, { solo: true }), s.ais[1].act(world, 1)];
      case 'watch': return [s.ais[0].act(world, 0), s.ais[1].act(world, 1)];
      case 'dummy': return [input.read(0, { solo: true }), NEUTRAL];
      case 'training': {
        const out = [NEUTRAL, NEUTRAL], h = input.read(0, { solo: true });
        out[s.ctrl] = h; out[1 - s.ctrl] = dummyInput(world, 1 - s.ctrl);
        record(world, s.ctrl, h);
        return out;
      }
      default: return [NEUTRAL, NEUTRAL];
    }
  };

  // Training: infinite health. Refill after a calm moment; never let a combo kill.
  s.tick = (world) => {
    if (s.mode !== 'training') return;
    world.fighters.forEach((f, i) => {
      const max = STATS[f.id].hp;
      if (f.hp !== s.lastHp[i]) s.calm[i] = 0; else s.calm[i]++;
      s.lastHp[i] = f.hp;
      if (f.hp < 250 && !f.ko) f.hp = 250;
      if (f.hp < max && s.calm[i] > 40) f.hp = max;
    });
  };

  s.reset();
  return s;
}

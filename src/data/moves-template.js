// Universal normals (GAME_DESIGN 3.1) in the section 9 schema, plus per-fighter modifiers (3.3). Pure data.
// Tick convention: a move's ticks are 1-based; startup = 1..S, active = S+1..S+A, recovery = S+A+1..S+A+R.
// hits[].from/to are filled in by engine/moves.js (from = S+1, to = S+A) unless a hit spells them out.
// bs for HK/2HP/2HK is derived from the doc's block advantage (adv = bs - ((A-1)+R)); jHK bs is not in the spec (see TUNING_LOG).
//
// move = { id, anim, state:'stand'|'crouch'|'air', weight:1|2|3 (chain order LP=LK < HP < HK), startup, active, recovery, landLag?,
//          hits:[{from,to,box:[x,y,w,h],dmg,level:'H'|'M'|'L'|'O'|'T',hs,bs,pbHit,pbBlock,hitstop,kd:null|'soft'|'hard',
//                 launch:null|{vx,vy},juggleCost,meterHit,meterBlock}],
//          cancels:[{into:'chain'|'special'|'super'|'jump', from, to, on:'hit'|'block'|'both'}], juggleStart? }
const LIGHT = { hitstop: 7, juggleCost: 1, meterHit: 6, meterBlock: 3 };
const HEAVY = { hitstop: 10, juggleCost: 2, meterHit: 10, meterBlock: 5 };
const SOFT = { vx: -2.4, vy: 4.5 };      // GAME_DESIGN 3.5 soft knockdown
const LAUNCH = { vx: -2.0, vy: 7.5 };    // launch (2HP)

const hit = (base, o) => ({ ...base, kd: null, launch: null, ...o });

// Cancel windows: chain = first active tick .. recovery tick 5; special = first active tick .. recovery tick 6 (GAME_DESIGN 2.6), hit or block.
const cancelsFor = (kinds, S, A) => kinds.map((into) => ({ into, from: S + 1, to: S + A + (into === 'chain' ? 5 : 6), on: into === 'jump' ? 'hit' : 'both' }));

const ground = (id, state, weight, [S, A, R], h, kinds) => ({
  id, anim: id, state, weight, startup: S, active: A, recovery: R, hits: [h],
  cancels: cancelsFor(kinds, S, A),
});
const air = (id, weight, [S, A], h) => ({
  id, anim: id, state: 'air', weight, startup: S, active: A, recovery: 0, landLag: 3, hits: [h], cancels: [],
});

export const TEMPLATE = {
  LP:  ground('LP', 'stand', 1, [4, 2, 6],  hit(LIGHT, { box: [10, 62, 34, 14], dmg: 30, level: 'H', hs: 11, bs: 8, pbHit: 3, pbBlock: 5 }), ['chain', 'special']),
  HP:  ground('HP', 'stand', 2, [8, 3, 14], hit(HEAVY, { box: [8, 58, 42, 18], dmg: 70, level: 'M', hs: 20, bs: 12, pbHit: 5, pbBlock: 7 }), ['special']),
  LK:  ground('LK', 'stand', 1, [6, 3, 9],  hit(LIGHT, { box: [6, 44, 40, 14], dmg: 40, level: 'M', hs: 15, bs: 10, pbHit: 4, pbBlock: 6 }), ['chain', 'special']),
  HK:  ground('HK', 'stand', 3, [10, 4, 18], hit(HEAVY, { box: [6, 50, 52, 22], dmg: 90, level: 'M', hs: null, bs: 14, pbHit: 8, pbBlock: 10, kd: 'soft', launch: SOFT }), []),
  '2LP': ground('2LP', 'crouch', 1, [4, 2, 7], hit(LIGHT, { box: [8, 38, 34, 12], dmg: 25, level: 'M', hs: 11, bs: 8, pbHit: 2, pbBlock: 4 }), ['chain', 'special']),
  '2LK': ground('2LK', 'crouch', 1, [5, 2, 8], hit(LIGHT, { box: [6, 0, 46, 12], dmg: 30, level: 'L', hs: 12, bs: 9, pbHit: 2, pbBlock: 4 }), ['chain', 'special']),
  '2HP': { ...ground('2HP', 'crouch', 2, [7, 4, 20], hit(HEAVY, { box: [6, 34, 30, 52], dmg: 80, level: 'M', hs: null, bs: 12, pbHit: 0, pbBlock: 6, launch: LAUNCH }), ['special', 'jump']), juggleStart: 3 },
  '2HK': ground('2HK', 'crouch', 3, [9, 3, 22], hit(HEAVY, { box: [4, 0, 62, 14], dmg: 60, level: 'L', hs: null, bs: 12, pbHit: 6, pbBlock: 8, kd: 'hard', launch: { vx: -2.0, vy: 5.5 } }), []),
  jLP: air('jLP', 1, [5, 10], hit(LIGHT, { box: [4, 20, 30, 30], dmg: 25, level: 'H', hs: 10, bs: 8, pbHit: 2, pbBlock: 2 })),
  jHP: air('jHP', 2, [7, 6],  hit(HEAVY, { box: [4, 14, 38, 36], dmg: 60, level: 'H', hs: 16, bs: 12, pbHit: 3, pbBlock: 3 })),
  jLK: air('jLK', 1, [4, 10], hit(LIGHT, { box: [2, 10, 36, 22], dmg: 35, level: 'H', hs: 12, bs: 9, pbHit: 2, pbBlock: 2 })),
  jHK: air('jHK', 3, [9, 6],  hit(HEAVY, { box: [2, 8, 46, 28], dmg: 70, level: 'H', hs: null, bs: 14, pbHit: 4, pbBlock: 4, kd: 'soft', launch: SOFT })),
  throw: {
    id: 'throw', anim: 'throw', state: 'stand', weight: 0, startup: 5, active: 2, recovery: 24, throwRange: 42,
    hits: [{ box: [0, 0, 42, 80], dmg: 100, level: 'T', hs: null, bs: null, pbHit: 0, pbBlock: 0, hitstop: 12, kd: 'hard', launch: null, juggleCost: 0, meterHit: 10, meterBlock: 0 }],
    cancels: [],
  },
};

// Per-fighter modifiers (GAME_DESIGN 3.3). Any of startup/active/recovery, plus `hit` = fields patched onto every hit.
export const FIGHTER_MOVES = {
  surge: {
    LP: { startup: 3 }, '2LP': { recovery: 6 }, HP: { recovery: 13 }, LK: { hit: { box: [6, 44, 44, 14] } }, HK: { recovery: 17 },
  },
  brick: {
    LP: { recovery: 7 }, HP: { startup: 9, recovery: 15, hit: { dmg: 80 } }, '2HP': { startup: 8, recovery: 21, hit: { dmg: 90 } },
  },
};

export const MOVE_IDS = Object.keys(TEMPLATE);

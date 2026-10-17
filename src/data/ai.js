// CPU tuning data (GAME_DESIGN 7). Tier 1-8; the labels are the difficulty names shown in the menus.
// reaction: ticks before a change in the opponent's visible state can be acted on (never below 6, so no tier reads the same tick).
// block/antiAir/punish/reversal/combo/mixup/read: the probabilities from the doc; act: how often the CPU bothers to do something in neutral.
export const TIERS = [null,
  { reaction: 28, block: 0.15, antiAir: 0.05, punish: 0.05, reversal: 0.0,  combo: 0.1, mixup: 0.1, read: 0.0, act: 0.35 },
  { reaction: 24, block: 0.30, antiAir: 0.10, punish: 0.10, reversal: 0.02, combo: 0.2, mixup: 0.2, read: 0.0, act: 0.45 },
  { reaction: 20, block: 0.45, antiAir: 0.20, punish: 0.20, reversal: 0.05, combo: 0.3, mixup: 0.3, read: 0.1, act: 0.55 },
  { reaction: 16, block: 0.55, antiAir: 0.35, punish: 0.30, reversal: 0.10, combo: 0.45, mixup: 0.4, read: 0.2, act: 0.65 },
  { reaction: 13, block: 0.68, antiAir: 0.50, punish: 0.45, reversal: 0.15, combo: 0.6, mixup: 0.5, read: 0.3, act: 0.75 },
  { reaction: 10, block: 0.78, antiAir: 0.65, punish: 0.60, reversal: 0.22, combo: 0.75, mixup: 0.6, read: 0.5, act: 0.85 },
  { reaction: 8,  block: 0.88, antiAir: 0.80, punish: 0.75, reversal: 0.30, combo: 0.9, mixup: 0.7, read: 0.7, act: 0.95 },
  { reaction: 6,  block: 0.95, antiAir: 0.92, punish: 0.90, reversal: 0.40, combo: 1.0, mixup: 0.8, read: 0.9, act: 1.0 },
];
export const TIER_LABELS = ['', 'EASY', 'EASY', 'NORMAL', 'NORMAL', 'HARD', 'HARD', 'BRUTAL', 'BRUTAL'];
export const tierName = (t) => `${t} ${TIER_LABELS[t]}`;

// Per-fighter play style. idealRange: px (centre to centre) the CPU likes to stand at; aggression and jumpiness are 0..1.
export const STYLE = {
  surge: { idealRange: 46, aggression: 0.8, jumpiness: 0.15 },     // aggressive, close
  brick: { idealRange: 68, aggression: 0.55, jumpiness: 0.08 },    // mid-range poker
};

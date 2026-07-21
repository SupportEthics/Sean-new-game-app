// The fairy — data only. A single upgradeable helper unlocked mid-game;
// every level bought with gold adds passive DPS and gold bonuses.

export const FAIRY = {
  unlockStage: 10,
  maxLevel: 200,
  costBase: 1500,
  costGrowth: 1.55,
  /** Additive bonuses per level. */
  dpsPerLevel: 0.02,
  goldPerLevel: 0.03,
};

/** Fairy evolution, mirroring the pets (Sean's ask): two gem-bought
 * ascensions that multiply her whole blessing and upgrade her look —
 * the final form carries a little sword of her own. */
export const FAIRY_EVOLUTION = {
  gemCosts: [100, 300],
  /** Her DPS + gold bonuses are multiplied by this at each stage. */
  stageMultipliers: [1, 2, 4],
  /** Arena/panel sprite scale per stage. */
  scales: [1, 1.15, 1.3],
  stageNames: ['FOREST FAIRY', 'SYLPH QUEEN', 'BLADE SERAPH'],
} as const;

export function fairyLevelCost(nextLevel: number): number {
  return Math.floor(FAIRY.costBase * Math.pow(FAIRY.costGrowth, nextLevel - 1));
}

export function fairyStageName(stage: number): string {
  return FAIRY_EVOLUTION.stageNames[
    Math.min(stage, FAIRY_EVOLUTION.stageNames.length - 1)
  ];
}

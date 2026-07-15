// The fairy — data only. A single upgradeable helper unlocked mid-game;
// every level bought with gold adds passive DPS and gold bonuses.

export const FAIRY = {
  unlockStage: 10,
  maxLevel: 100,
  costBase: 1500,
  costGrowth: 1.55,
  /** Additive bonuses per level. */
  dpsPerLevel: 0.02,
  goldPerLevel: 0.03,
};

export function fairyLevelCost(nextLevel: number): number {
  return Math.floor(FAIRY.costBase * Math.pow(FAIRY.costGrowth, nextLevel - 1));
}

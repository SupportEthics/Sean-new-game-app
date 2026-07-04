// All balance numbers for currencies and costs live here — data only, no logic.

export const ECONOMY = {
  /** Gold cost of buying gear at a given tier: base * growth^(tier-1) */
  gearCostBase: 10,
  gearCostGrowth: 2.1,

  /** Buying is always offered at max(1, highestTierAchieved - buyTierLag) */
  buyTierLag: 3,

  /** Starting wallet */
  startingGold: 25,
  startingGems: 0,

  /** Offline earnings (used from M3, defined now so saves carry the fields) */
  offlineRateMultiplier: 0.6,
  offlineCapHours: 8,
} as const;

/** Suffixes for big-number formatting: 1.2K, 3.4M ... then aa, ab ... */
export const NUMBER_SUFFIXES = ['', 'K', 'M', 'B', 'T'] as const;

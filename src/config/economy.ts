// All balance numbers for currencies and costs live here — data only, no logic.

export const ECONOMY = {
  /** Gold cost of buying gear at a given tier: base * growth^(tier-1) */
  gearCostBase: 10,
  gearCostGrowth: 2.1,

  /** The shop sells at buyTierLevel (starts at 1); raising it costs gold:
   * upgrade to tier n costs gearCost(n) * buyTierUpgradeMultiplier. */
  buyTierUpgradeMultiplier: 8,

  /** Starting wallet */
  startingGold: 25,
  startingGems: 0,

  /** Watching a rewarded ad enables Auto Merge / Auto Buy for this long. */
  automationAdMinutes: 30,

  /** Offline earnings (used from M3, defined now so saves carry the fields) */
  offlineRateMultiplier: 0.6,
  offlineCapHours: 8,

  /** Fraction of a sword's shop price refunded when it's binned. */
  sellRefundFraction: 0.3,
} as const;

/** Rewarded-ad battle boosts (the buttons on the arena's right edge). */
export const BOOSTS = {
  /** Watching an ad turns a boost on for this long (real time). */
  adMinutes: 30,
  dmgMult: 2,
  speedMult: 2,
} as const;

/** Suffixes for big-number formatting: 1.2K, 3.4M ... then aa, ab ... */
export const NUMBER_SUFFIXES = ['', 'K', 'M', 'B', 'T'] as const;

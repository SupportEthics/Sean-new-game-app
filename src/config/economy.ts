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

/** Hero level: a lifetime-kills badge that now also pays (Sean's call) —
 * +1% DPS per 10 levels, forever, surviving rebirths. */
export const HERO_LEVEL = {
  /** Kills needed for level N: killsPerLevelBase * (N-1)^2 */
  killsPerLevelBase: 5,
  levelsPerBonus: 10,
  bonusPerStep: 0.01,
} as const;

/** Rewarded-ad battle boosts (the buttons on the arena's right edge). */
export const BOOSTS = {
  /** Watching an ad turns a boost on for this long (real time). */
  adMinutes: 30,
  dmgMult: 2,
  speedMult: 2,
} as const;

/** Treasure ad (replaces the x2 speed button, Sean's call): watching an
 * ad pays gold scaled to current income plus gems scaled to the stage,
 * on a cooldown so it's a habit, not a faucet. */
export const AD_LOOT = {
  goldHours: 0.5,
  gemsBase: 5,
  /** +1 gem per this many stages reached. */
  gemsPerStages: 20,
  cooldownMinutes: 15,
} as const;

/** Tap-to-strike (Cloe's request): tapping the arena lands an instant
 * bonus hit worth a fraction of a DPS-second, rate limited so frantic
 * tapping tops out around 3x idle damage. */
export const TAP = {
  dpsFraction: 0.35,
  minIntervalMs: 120,
} as const;

/** Suffixes for big-number formatting: 1.2K, 3.4M ... then aa, ab ... */
export const NUMBER_SUFFIXES = ['', 'K', 'M', 'B', 'T'] as const;

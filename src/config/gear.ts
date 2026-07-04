// Weapon/gear tier definitions — data only.

export const GEAR = {
  /** Merge grid dimensions */
  gridCols: 4,
  gridRows: 5,

  /** Highest merge tier available (tiers are 1-based) */
  maxTier: 40,

  /** DPS of a tier-1 weapon */
  baseDps: 2,
  /** Each tier multiplies DPS by this (merging 2 of a kind should be a real upgrade) */
  dpsGrowth: 1.9,

  /** The best items on the grid are "equipped" (see equipSlotStages). Every
   * OTHER item on the grid contributes this fraction of its own DPS as a
   * passive bonus, so keeping a full grid matters, but merging up matters
   * more. */
  passiveDpsFraction: 0.1,

  /** Equip slots unlock by reaching these stages: slot 1 from the start,
   * slot 4 at stage 30. The top-N swords auto-equip — no manual loadout. */
  equipSlotStages: [1, 5, 15, 30],
} as const;

/** How many swords the hero can wield at `highestStage`. */
export function unlockedSlots(highestStage: number): number {
  return GEAR.equipSlotStages.filter((s) => highestStage >= s).length;
}

/** Display names per tier band — used for flavor in the UI. */
export const TIER_NAMES: readonly string[] = [
  'Twig',
  'Stick',
  'Thorn',
  'Acorn Pick',
  'Copper Claw',
  'Bronze Fang',
  'Iron Quill',
  'Steel Paw',
  'Silver Spine',
  'Golden Bramble',
  'Crystal Whisker',
  'Ruby Tail',
  'Storm Needle',
  'Moon Sliver',
  'Sun Splinter',
  'Star Prickle',
  'Comet Barb',
  'Dragon Spur',
  'Mythic Quill',
  'Celestial Thorn',
];

export function tierName(tier: number): string {
  const idx = Math.min(tier - 1, TIER_NAMES.length - 1);
  const plus = tier - TIER_NAMES.length;
  return plus > 0 ? `${TIER_NAMES[idx]} +${plus}` : TIER_NAMES[idx];
}

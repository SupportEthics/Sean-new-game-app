// Weapon/gear tier definitions — data only.

export const GEAR = {
  /** Merge FIELD dimensions (the 4-cell equip row sits above it) */
  gridCols: 6,
  gridRows: 6,

  /** Cells unlocked from the start; the rest are bought with gold. */
  baseCells: 20,
  /** Cost of the Nth extra cell: base * growth^(n - baseCells - 1) */
  cellCostBase: 2500,
  cellCostGrowth: 1.75,

  /** Highest merge tier available (tiers are 1-based). Raised 40 -> 80 -> 160
   * (Sean hit stage 200 in days and the old cap walled progress near 250):
   * at 1.9x DPS/tier vs 1.27x monster HP/stage, a tier is ~2.7 stages, so
   * 160 puts the ceiling for a maxed knight around stage 450. */
  maxTier: 160,

  /** Distinct sword sprites in the gear sheet; tiers past this keep the
   * final design (no cycling back to tier-1 art). */
  weaponArtCount: 25,

  /** DPS of a tier-1 weapon */
  baseDps: 2,
  /** Each tier multiplies DPS by this (merging 2 of a kind should be a real upgrade) */
  dpsGrowth: 1.9,

  /** The best items on the grid are "equipped" (see equipSlotStages). Every
   * OTHER item on the grid contributes this fraction of its own DPS as a
   * passive bonus, so keeping a full grid matters, but merging up matters
   * more. */
  passiveDpsFraction: 0.1,

  /** Equip slots unlock by reaching these stages (Sean's tuning): slot 1
   * immediately, then stages 5 / 15 / 25. The wall sockets in the arena show
   * the locked slots and their requirements. Top-N swords auto-equip. */
  equipSlotStages: [1, 5, 15, 25],
} as const;

/** Sprite frame for a tier: unique art up to weaponArtCount, then the
 * final blade design persists for every tier above it. */
export function weaponFrame(tier: number): number {
  return Math.min(Math.max(tier, 1), GEAR.weaponArtCount) - 1;
}

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
  'Frost Fang',
  'Void Edge',
  'Soul Cleaver',
  'Doom Talon',
  'Godsteel Blade',
];

export function tierName(tier: number): string {
  const idx = Math.min(tier - 1, TIER_NAMES.length - 1);
  const plus = tier - TIER_NAMES.length;
  return plus > 0 ? `${TIER_NAMES[idx]} +${plus}` : TIER_NAMES[idx];
}

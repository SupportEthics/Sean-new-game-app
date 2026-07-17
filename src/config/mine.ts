// The Labyrinth — data only. Each depth is two halves: a torchlit mining
// cave (veins, crystals, fuel) hiding a treasure chest, and — once the
// chest is opened — an actual labyrinth: a true maze with a treasure
// hoard at its farthest dead end. Looting the hoard uncovers the ladder
// to the next, richer cave. One free descent a day (an ad buys another).

export const MINE = {
  /** Stage that opens the Labyrinth (MENU tile shows a lock before it). */
  unlockStage: 30,

  /** Cave dimensions in tiles — bigger than the screen; the camera
   * follows the knight through the dark. */
  cols: 21,
  rows: 29,

  /** Torch: starting light + what a fuel pickup adds (seconds). */
  torchSeconds: 60,
  fuelSeconds: 30,

  /** Swings to break a gold vein (crystals shatter in one). */
  veinHits: 3,

  /** Gold per vein: hours of current income, grown per floor. */
  veinGoldHours: 0.05,
  veinGoldHoursPerDepth: 0.02,

  /** Gems per crystal + the per-run gem cap (economy guard). */
  crystalGems: 2,
  crystalGemsPerDepth: 0.34,
  gemCapPerRun: 20,

  /** Per-floor spawn counts [min, max]; veins grow with depth a bit. */
  veinsPerFloor: [6, 9] as const,
  crystalsPerFloor: [2, 3] as const,
  fuelPerFloor: [2, 3] as const,

  /** Opening the cave's chest tops the torch up for the maze ahead. */
  chestFuelSeconds: 20,

  /** The hoard at the maze's heart: hours of income + gems, per depth. */
  treasureGoldHours: 0.25,
  treasureGoldHoursPerDepth: 0.1,
  treasureGems: 4,
  treasureGemsPerDepth: 1,

  /** Maze-half spawn counts [min, max] (fuel on corridors, crystals in
   * the walls between them). */
  mazeFuelPerFloor: [3, 4] as const,
  mazeCrystalsPerFloor: [1, 2] as const,

  /** Knight walk speed, ms per tile (the scene's tween pace). */
  msPerTile: 160,
  /** Ms between pickaxe swings. */
  msPerSwing: 380,
} as const;

/** Gold hours a single vein pays at `depth` (1-based). */
export function veinGoldHoursAt(depth: number): number {
  return MINE.veinGoldHours + MINE.veinGoldHoursPerDepth * (depth - 1);
}

/** Gems a single crystal pays at `depth` (1-based). */
export function crystalGemsAt(depth: number): number {
  return Math.round(MINE.crystalGems + MINE.crystalGemsPerDepth * (depth - 1));
}

/** Gold hours the maze hoard pays at `depth` (1-based). */
export function treasureGoldHoursAt(depth: number): number {
  return MINE.treasureGoldHours + MINE.treasureGoldHoursPerDepth * (depth - 1);
}

/** Gems the maze hoard pays at `depth` (1-based). */
export function treasureGemsAt(depth: number): number {
  return Math.round(MINE.treasureGems + MINE.treasureGemsPerDepth * (depth - 1));
}

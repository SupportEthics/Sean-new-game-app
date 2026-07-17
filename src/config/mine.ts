// The Labyrinth — data only. A tap-to-walk mining descent: gold veins,
// gem crystals, fuel for the torch, a ladder down on every floor. One
// free descent a day (an ad buys another); deeper floors pay more and
// light gets scarcer.

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

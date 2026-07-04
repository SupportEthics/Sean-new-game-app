// Prestige ("Rebirth") — data only. The Souls upgrade tree arrives at M3;
// Souls already bank so nothing is lost.

export const PRESTIGE = {
  /** Rebirth becomes available once the run reaches this stage. */
  minStage: 40,
  /** Every rebirth toughens monsters: +10% enemy HP per prestige, additive.
   * Souls/relics/town outpace it, but each cycle starts a little meaner. */
  enemyHpPerPrestige: 0.1,
} as const;

/** Enemy HP multiplier after `prestiges` rebirths. */
export function enemyHpScale(prestiges: number): number {
  return 1 + prestiges * PRESTIGE.enemyHpPerPrestige;
}

/** Souls earned for rebirthing at `stage` (uses the run's current stage). */
export function soulsFor(stage: number): number {
  if (stage < PRESTIGE.minStage) return 0;
  return Math.floor(Math.pow(stage - 30, 1.5));
}

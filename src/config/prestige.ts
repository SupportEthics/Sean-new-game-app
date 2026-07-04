// Prestige ("Rebirth") — data only. The acorn upgrade tree arrives at M3;
// acorns already bank so nothing is lost.

export const PRESTIGE = {
  /** Rebirth becomes available once the run reaches this stage. */
  minStage: 40,
} as const;

/** Acorns earned for rebirthing at `stage` (uses the run's current stage). */
export function acornsFor(stage: number): number {
  if (stage < PRESTIGE.minStage) return 0;
  return Math.floor(Math.pow(stage - 30, 1.5));
}

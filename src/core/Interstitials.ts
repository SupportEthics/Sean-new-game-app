import { INTERSTITIAL } from '../config/monetization';

/**
 * Decides when an interstitial ad break is due: after enough stage clears,
 * never too frequently, never during a raid, and never once remove_ads is
 * owned. Pure TS so the pacing rules are unit-testable; the scenes only
 * ask shouldShow() and report shown().
 */
export class InterstitialPolicy {
  private stagesSince = 0;
  private lastShownAt: number;

  constructor(bootTime: number = Date.now()) {
    // Fresh sessions get a short warmup instead of the full interval
    this.lastShownAt =
      bootTime - (INTERSTITIAL.minIntervalMinutes - INTERSTITIAL.warmupMinutes) * 60_000;
  }

  onStageCleared(): void {
    this.stagesSince += 1;
  }

  shouldShow(removeAds: boolean, inRaid: boolean, now: number = Date.now()): boolean {
    return (
      !removeAds &&
      !inRaid &&
      this.stagesSince >= INTERSTITIAL.minStages &&
      now - this.lastShownAt >= INTERSTITIAL.minIntervalMinutes * 60_000
    );
  }

  shown(now: number = Date.now()): void {
    this.stagesSince = 0;
    this.lastShownAt = now;
  }
}

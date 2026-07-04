// Platform leaderboards (Game Center / Google Play Games) behind an
// interface, same pattern as ads/IAP: the game calls submitHighestStage and
// showNativeBoard freely; on web (and until the store accounts exist) the
// mock swallows them.
//
// At store setup (docs/GETTING-ON-THE-STORES.md): create the leaderboards
// in App Store Connect / Play Console, put their IDs in config/native.ts,
// and bind a Capacitor plugin here (as of mid-2026
// @openforge/capacitor-game-connect pins an older Capacitor major — check
// for a Capacitor 8-compatible release or use the platform SDKs directly).

export interface LeaderboardService {
  /** True when a real platform board can be shown (signed-in native). */
  readonly isAvailable: boolean;
  /** Report a new personal best; safe to call repeatedly. */
  submitHighestStage(stage: number): Promise<void>;
  /** Open the platform's leaderboard overlay. */
  showNativeBoard(): Promise<void>;
}

/** Browser/dev and pre-account native builds: quietly does nothing. */
export class WebMockLeaderboard implements LeaderboardService {
  readonly isAvailable = false;

  async submitHighestStage(): Promise<void> {
    /* no platform board here */
  }

  async showNativeBoard(): Promise<void> {
    /* no platform board here */
  }
}

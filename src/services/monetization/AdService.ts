// Rewarded-ad abstraction. The web mock simulates a short ad so every
// placement is playable/testable in the browser; the AdMob implementation
// replaces it inside the Capacitor shells (M5). Reward-granting logic always
// stays in core/UI, never in the service.

export type AdPlacement =
  | 'raid_reset'
  | 'offline_double'
  | 'free_chest'
  | 'auto_merge'
  | 'auto_buy'
  | 'pet_egg'
  | 'boost_dmg'
  | 'boost_speed';

export interface AdResult {
  /** True when the ad played to completion and the reward should be granted. */
  rewarded: boolean;
}

export interface AdService {
  isReady(placement: AdPlacement): boolean;
  showRewarded(placement: AdPlacement): Promise<AdResult>;
  /** Full-screen ad break between stages; resolves when it closes. */
  showInterstitial(): Promise<void>;
  readonly isMock: boolean;
}

/** Browser/dev ads: always ready, "play" for a moment, always reward. */
export class WebMockAd implements AdService {
  readonly isMock = true;

  isReady(): boolean {
    return true;
  }

  async showRewarded(): Promise<AdResult> {
    await new Promise((r) => setTimeout(r, 1500)); // simulated ad playback
    return { rewarded: true };
  }

  async showInterstitial(): Promise<void> {
    await new Promise((r) => setTimeout(r, 1200)); // the UI overlays its own mock
  }
}

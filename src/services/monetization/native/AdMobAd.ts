import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { ADMOB } from '../../../config/native';
import { AdResult, AdService } from '../AdService';

/**
 * Real AdMob rewarded + interstitial ads inside the Capacitor shells.
 * Reward-granting stays in core/UI — this service only reports whether the
 * ad played to completion. Any failure (no fill, no network, dismissed
 * early) resolves as not-rewarded rather than throwing into game code.
 */
export class AdMobAd implements AdService {
  readonly isMock = false;
  private initialized = false;

  private get units(): { rewarded: string; interstitial: string } {
    return Capacitor.getPlatform() === 'ios' ? ADMOB.ios : ADMOB.android;
  }

  async init(): Promise<void> {
    try {
      // Test devices/test mode until real ad units arrive at M6
      await AdMob.initialize({ initializeForTesting: true });
      this.initialized = true;
    } catch (e) {
      console.warn('AdMob init failed; rewarded features stay hidden', e);
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  async showRewarded(): Promise<AdResult> {
    if (!this.initialized) return { rewarded: false };
    try {
      await AdMob.prepareRewardVideoAd({ adId: this.units.rewarded });
      const reward = await AdMob.showRewardVideoAd();
      // AdMob only emits a reward item when the ad was watched through
      return { rewarded: reward !== undefined && reward !== null };
    } catch (e) {
      console.warn('Rewarded ad failed', e);
      return { rewarded: false };
    }
  }

  async showInterstitial(): Promise<void> {
    if (!this.initialized) return;
    try {
      await AdMob.prepareInterstitial({ adId: this.units.interstitial });
      await AdMob.showInterstitial();
    } catch (e) {
      console.warn('Interstitial failed; skipping the break', e);
    }
  }
}

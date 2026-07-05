import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
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
      // Google UMP consent first — required for EEA/UK users. The form only
      // appears when regulation applies; everyone else passes straight through.
      try {
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
          await AdMob.showConsentForm();
        }
      } catch (e) {
        console.warn('Consent flow failed; continuing without personalized ads', e);
      }
      // App Tracking Transparency (iOS 14.5+). Apple requires asking before
      // AdMob can use the device identifier; declining just means
      // non-personalised ads, so any failure here is safe to ignore.
      if (Capacitor.getPlatform() === 'ios') {
        try {
          const { status } = await AdMob.trackingAuthorizationStatus();
          if (status === 'notDetermined') {
            await AdMob.requestTrackingAuthorization();
          }
        } catch (e) {
          console.warn('ATT prompt failed; serving non-personalised ads', e);
        }
      }
      // Test devices/test mode until real ad units arrive
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

import { Capacitor } from '@capacitor/core';
import { AdService, WebMockAd } from './AdService';
import { IapService } from './MonetizationService';
import { AdMobAd } from './native/AdMobAd';
import { RevenueCatIap } from './native/RevenueCatIap';
import { WebMockIap } from './WebMockIap';

/**
 * Picks the real AdMob/RevenueCat services inside the Capacitor shells and
 * the web mocks everywhere else, so the game is always playable — browser,
 * single-file desktop build, and native — through one interface.
 */
export function createMonetization(): { iap: IapService; ads: AdService } {
  if (Capacitor.isNativePlatform()) {
    const ads = new AdMobAd();
    const iap = new RevenueCatIap();
    void ads.init();
    void iap.init();
    return { iap, ads };
  }
  return { iap: new WebMockIap(), ads: new WebMockAd() };
}

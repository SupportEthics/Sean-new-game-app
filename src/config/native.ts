// Native store/ad identifiers — data only.
//
// AdMob: these are Google's OFFICIAL public test ad unit IDs. They always
// serve test ads and are safe to ship to internal testers. At M6 store
// readiness, replace them with the real ad units created in the AdMob
// console (and add the app IDs to AndroidManifest.xml / Info.plist).
export const ADMOB = {
  android: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
};

// RevenueCat: per-platform public SDK keys, created in the RevenueCat
// dashboard once the App Store / Play Console apps exist (M6). While these
// placeholders remain, the native IAP service stays dormant and purchases
// report a friendly "store not connected" error instead of crashing.
export const REVENUECAT = {
  androidApiKey: 'REPLACE_WITH_REVENUECAT_ANDROID_KEY',
  iosApiKey: 'REPLACE_WITH_REVENUECAT_IOS_KEY',
};

export function revenueCatKeyFor(platform: string): string | null {
  const key = platform === 'ios' ? REVENUECAT.iosApiKey : REVENUECAT.androidApiKey;
  return key.startsWith('REPLACE_WITH') ? null : key;
}

// Native store/ad identifiers — data only.
//
// AdMob iOS: Sean's REAL ad units (account ca-app-pub-1071330978490238,
// app ID in ios/App/App/Info.plist). Android still runs Google's OFFICIAL
// public test IDs until Sean creates the Android app in the AdMob console
// (its app ID then also goes into AndroidManifest.xml).
export const ADMOB = {
  android: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    rewarded: 'ca-app-pub-1071330978490238/4825862946',
    interstitial: 'ca-app-pub-1071330978490238/8544746562',
  },
};

// RevenueCat: per-platform public SDK keys from the dashboard. iOS is
// Sean's real key (project "Soulforge Knight"); Android stays a
// placeholder until the Play app exists, which keeps the Android IAP
// service dormant ("store not connected") instead of crashing.
export const REVENUECAT = {
  androidApiKey: 'REPLACE_WITH_REVENUECAT_ANDROID_KEY',
  iosApiKey: 'appl_CUzhbMvcaITCxtiuTmhpPkgqMKP',
};

// Platform leaderboard IDs, created in App Store Connect (Game Center) and
// Play Console (Play Games Services) at store setup. While these are
// placeholders the LeaderboardService stays on the web mock.
export const LEADERBOARDS = {
  highestStageIos: 'REPLACE_WITH_GAMECENTER_LEADERBOARD_ID',
  highestStageAndroid: 'REPLACE_WITH_PLAYGAMES_LEADERBOARD_ID',
};

export function revenueCatKeyFor(platform: string): string | null {
  const key = platform === 'ios' ? REVENUECAT.iosApiKey : REVENUECAT.androidApiKey;
  return key.startsWith('REPLACE_WITH') ? null : key;
}

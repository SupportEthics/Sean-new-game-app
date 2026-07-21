// Native store/ad identifiers — data only.
//
// AdMob: Sean's REAL ad units on both platforms (account
// ca-app-pub-1071330978490238; app IDs live in ios/App/App/Info.plist
// and android/.../AndroidManifest.xml respectively).
export const ADMOB = {
  android: {
    rewarded: 'ca-app-pub-1071330978490238/1104733062',
    interstitial: 'ca-app-pub-1071330978490238/2310003521',
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

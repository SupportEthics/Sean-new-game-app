# Getting Soulforge Knight onto the App Store & Google Play

A plain-English checklist of what happens next and what only YOU (Sean)
can do. The code side is done: the game is wrapped as a native iPhone and
Android app (the `ios/` and `android/` folders), with real Google ads
(AdMob) and real in-app purchases (RevenueCat) already wired in. Right
now ads run in **test mode** and purchases are **dormant** until the
accounts below exist.

## Accounts you need to create (one-time)

1. **Apple Developer Program** — $99/year — https://developer.apple.com
   Needed to put anything on the App Store (and to test on your own iPhone).
2. **Google Play Console** — $25 one time — https://play.google.com/console
   Needed for the Play Store.
3. **Google AdMob** — free — https://admob.google.com
   This is where the ad money comes from. You create the app + 2 ad units
   (rewarded, interstitial) per platform and get IDs that replace the test
   IDs in `src/config/native.ts`.
4. **RevenueCat** — free tier — https://www.revenuecat.com
   Handles purchases across both stores. You connect it to Apple/Google,
   create the products below, and paste its two API keys into
   `src/config/native.ts`.

## Products to create in the stores (exact IDs matter)

| Product ID        | Type            | Price  | What it is        |
|-------------------|-----------------|--------|-------------------|
| `starter_pack`    | non-consumable  | $0.99  | one-time bundle   |
| `remove_ads`      | non-consumable  | $4.99  | no ad breaks      |
| `piggy_crack`     | consumable      | $2.99  | open piggy bank   |
| `gems_fistful`    | consumable      | $0.99  | 80 gems           |
| `gems_pouch`      | consumable      | $4.99  | 500 gems          |
| `gems_chest`      | consumable      | $9.99  | 1,200 gems        |
| `gems_hoard`      | consumable      | $19.99 | 2,800 gems        |
| `skin_dragon` etc.| non-consumable  | $4.99  | 5 legendary skins (IDs in src/config/skins.json) |
| `sword_scythe` etc.| non-consumable | $4.99  | 3 premium sword skins (IDs in src/config/swordSkins.ts) |

## How a build is made (for whoever runs it)

```bash
npm install
npm run cap:android   # opens Android Studio -> Run / Build AAB
npm run cap:ios       # opens Xcode (Mac only) -> Run / Archive
```

The app ID is `uk.co.supportethics.soulforgeknight` — create the store
listings with exactly this ID.

## Leaderboards (when the store accounts exist)

The in-game "Hall of Legends" ranks players against seeded rival knights
today. To light up REAL global rankings:

1. App Store Connect → your app → Game Center → create a leaderboard
   ("Highest Stage", integer, higher-is-better). Copy its ID.
2. Play Console → Play Games Services → create the matching leaderboard.
3. Paste both IDs into `src/config/native.ts` (`LEADERBOARDS`).
4. Bind a Capacitor Game Center/Play Games plugin in
   `src/services/LeaderboardService.ts` (the interface and submit calls are
   already wired; check plugin compatibility with the project's Capacitor
   version — see the note at the top of that file).

## What's still to come in M6 (store readiness)

- App icon + splash screen in native sizes
- Real AdMob IDs + Google UMP consent prompt (required in the EU/UK)
- RevenueCat keys in, mock fallback verified
- Privacy policy page + store data-safety questionnaires
- Store listing text + screenshots
- Age rating questionnaires (the game has ads + IAP, no user content)

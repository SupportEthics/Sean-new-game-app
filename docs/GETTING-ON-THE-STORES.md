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
   IDs in **three places**:
   - `src/config/native.ts` — the two ad-unit IDs per platform
   - `android/app/src/main/AndroidManifest.xml` — the *app* ID in the
     `com.google.android.gms.ads.APPLICATION_ID` meta-data entry
   - `ios/App/App/Info.plist` — the *app* ID under `GADApplicationIdentifier`
   All three currently hold Google's public TEST IDs, so test ads work
   out of the box; shipping with them means no revenue.
4. **RevenueCat** — free tier — https://www.revenuecat.com
   Handles purchases across both stores. You connect it to Apple/Google,
   create the products below, and paste its two API keys into
   `src/config/native.ts`.

## Products to create in the stores (exact IDs matter)

| Product ID        | Type            | Price  | What it is        |
|-------------------|-----------------|--------|-------------------|
| `soulforge_starter_pack` | non-consumable | $0.99 | one-time bundle (renamed: `starter_pack` was taken team-wide) |
| `remove_ads`      | non-consumable  | $4.99  | no ad breaks      |
| `piggy_crack`     | consumable      | $2.99  | open piggy bank   |
| `gems_fistful`    | consumable      | $0.99  | 80 gems           |
| `gems_pouch`      | consumable      | $4.99  | 500 gems          |
| `gems_chest`      | consumable      | $9.99  | 1,200 gems        |
| `gems_hoard`      | consumable      | $19.99 | 2,800 gems        |
| `gems_vault`      | consumable      | $49.99 | 8,000 gems        |
| `gems_ransom`     | consumable      | $99.99 | 18,000 gems       |
| `coins_sack`      | consumable      | $1.99  | 2h of gold income |
| `coins_wagon`     | consumable      | $9.99  | 12h of gold income |
| `coins_treasury`  | consumable      | $49.99 | 72h of gold income |
| `coins_hoard`     | consumable      | $99.99 | 168h of gold income |
| `bundle_squire`   | consumable      | $9.99  | 700 gems + 8h gold |
| `bundle_knight`   | consumable      | $19.99 | 1,600 gems + 20h gold |
| `bundle_royal`    | consumable      | $49.99 | 4,500 gems + 60h gold |
| `bundle_dragon`   | consumable      | $99.99 | 10,000 gems + 150h gold |
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

## Store-readiness items already done in code

- App icon + splash screens generated into both native projects
- Google UMP consent prompt before ads (required in the EU/UK)
- iOS App Tracking Transparency prompt + `SKAdNetworkItems` in Info.plist
- AdMob *app* IDs present in both native shells (Google TEST IDs for now)
- Both apps locked to portrait
- A visible RESTORE PURCHASES button in the shop (Apple requires this)
- Apple privacy manifest (`ios/App/App/PrivacyInfo.xcprivacy`)
- Privacy policy text ready to host (`docs/PRIVACY-POLICY.md`)
- Store listing text ready to paste (`docs/STORE-LISTING.md`)

## What only Sean can do

- Swap the TEST AdMob IDs for real ones (three places, see above)
- Paste RevenueCat keys into `src/config/native.ts` + create the products
- Host the privacy policy on a public URL and link it in both stores
- Store listing screenshots from a real device
- Data-safety + age rating questionnaires (the game has ads + IAP, no
  user-generated content)

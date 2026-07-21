# Getting Soulforge Knight onto the App Store & Google Play

A plain-English checklist of what happens next and what only YOU (Sean)
can do. The code side is done: the game is wrapped as a native iPhone and
Android app (the `ios/` and `android/` folders), with real Google ads
(AdMob) and real in-app purchases (RevenueCat) already wired in.

**iOS is the furthest along:** the real AdMob iOS ad units and the real
RevenueCat iOS SDK key are already in `src/config/native.ts`. The only
thing stopping iOS purchases from working end-to-end is the products not
existing yet in App Store Connect (create them per the table below). iOS
ads are live-account (not test) units.

**Android is still test-mode:** it runs Google's public TEST ad units and
a placeholder RevenueCat key, so Android IAP stays dormant ("store not
connected") until you create the Android app + paste its RevenueCat key.
That's fine — it doesn't block the iOS submission at all.

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

These Product IDs must match the code EXACTLY — RevenueCat maps a purchase
back to the game by this string. A typo means the item never delivers.
This table is the single source of truth; it's generated from
`src/config/monetization.ts`, `skins.json` and `swordSkins.ts`.

### Auto-renewable subscription (1 — create FIRST, it needs a Subscription Group)

| Product ID          | Price       | What it is                                   |
|---------------------|-------------|----------------------------------------------|
| `knights_membership`| $4.99 / month | Knight's Membership — +25% gold, 2x offline, ads off, 50 gems/day stipend |

### Non-consumables (8 — bought once, restored on reinstall)

| Product ID          | Price  | What it is                                            |
|---------------------|--------|-------------------------------------------------------|
| `soulforge_starter_pack` | $0.99 | one-time starter bundle (`starter_pack` was taken team-wide) |
| `founder_pack`      | $1.99  | first-purchase offer: exclusive Founder's Aegis skin + Founder's Blade + 300 gems |
| `remove_ads`        | $4.99  | no ad breaks, ever                                    |
| `golden_knight`     | $19.99 | Golden Knight VIP — instant remove-ads + all-ads-free (ship-flag OFF until you confirm the product is live) |
| `skin_dragonlord`   | $4.99  | legendary skin                                        |
| `skin_celestial`    | $4.99  | legendary skin                                        |
| `skin_voidreaper`   | $4.99  | legendary skin                                        |
| `skin_sovereign`    | $4.99  | legendary skin                                        |
| `skin_phantomking`  | $4.99  | legendary skin                                        |
| `sword_scythe`      | $4.99  | premium sword skin                                    |
| `sword_voidkatana`  | $4.99  | premium sword skin                                    |
| `sword_dragoncleaver`| $4.99 | premium sword skin                                    |

(The Founder's Aegis skin and Founder's Blade are granted BY `founder_pack`
— do NOT create separate products for them.)

### Consumables (20 — can be re-bought)

| Product ID       | Price  | What it is         |
|------------------|--------|--------------------|
| `piggy_crack`    | $2.99  | crack the piggy bank |
| `knights_pass`   | $4.99  | Knight's Pass premium reward lane (per 30-day season) |
| `gems_fistful`   | $0.99  | 80 gems            |
| `gems_pouch`     | $4.99  | 500 gems           |
| `gems_chest`     | $9.99  | 1,200 gems         |
| `gems_hoard`     | $19.99 | 2,800 gems         |
| `gems_vault`     | $49.99 | 8,000 gems         |
| `gems_ransom`    | $99.99 | 18,000 gems        |
| `coins_sack`     | $1.99  | 2h of gold income  |
| `coins_wagon`    | $9.99  | 12h of gold income |
| `coins_treasury` | $49.99 | 72h of gold income |
| `coins_hoard`    | $99.99 | 168h of gold income |
| `bundle_squire`  | $9.99  | 700 gems + 8h gold |
| `bundle_knight`  | $19.99 | 1,600 gems + 20h gold |
| `bundle_royal`   | $49.99 | 4,500 gems + 60h gold |
| `bundle_dragon`  | $99.99 | 10,000 gems + 150h gold |

### App Store Connect — order of operations for the tricky ones

1. **`knights_membership` (subscription):** Features → Subscriptions →
   create a Subscription Group (e.g. "Knight's Memberships") → add the
   subscription with product ID `knights_membership`, duration 1 month,
   price $4.99. Add a localized display name + description, and a review
   screenshot. Apple requires the subscription's terms to appear in your
   app's metadata and your privacy policy — the shop's purple membership
   card already shows what it grants.
2. **RevenueCat entitlements:** in RevenueCat create an entitlement
   `membership` and attach `knights_membership` to it; the game already
   treats a live RevenueCat entitlement as the real authority. Create a
   second entitlement (e.g. `premium`) if you want to group the
   non-consumables, but it isn't required — the game maps each SKU by ID.
3. **`golden_knight`** is wired but shipped behind an OFF flag so it can't
   appear before its product is approved. Once the product is "Ready to
   Submit", tell me and I'll flip the flag for the build you submit.
4. Everything else is a plain consumable/non-consumable — create with the
   exact ID + price above.

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

## What only Sean can do (App Store Connect submission checklist)

Ordered — top to bottom is roughly the order to do them in:

1. **Create the App Store Connect app record** with bundle ID
   `uk.co.supportethics.soulforgeknight` (matches the Xcode project).
2. **Create all the in-app purchases + the subscription** from the table
   above (exact IDs). Fill each one's display name, description, and a
   review screenshot. Submit them for review alongside the build.
3. **Host the privacy policy** (`docs/PRIVACY-POLICY.md`) on a public URL
   and paste that URL into App Store Connect → App Privacy.
4. **Capture screenshots** from a real iPhone or the simulator at the App
   Store sizes (6.7" 1290x2796 + 6.5" 1284x2778). Suggested shots: title,
   battle with pets, merge board, shop, skins, raid. (I can generate
   placeholder store-sized screenshots from the web build if you want a
   head start — just ask.)
5. **Fill the App Privacy questionnaire** — Identifiers (advertising ID,
   AdMob) + Purchases (RevenueCat receipts); data not used to track unless
   you keep personalized ads on. The wording is in `docs/STORE-LISTING.md`.
6. **Age rating questionnaire** — mild/cartoon fantasy violence, no gore,
   no real-money gambling, no user-generated content, no chat. Contains
   ads + IAP. (Expected 9+/E10+/PEGI 7.)
7. **Build & upload:** on a Mac, `npm install && npm run build && npx cap
   sync ios && npm run cap:ios`, then Product → Archive → Distribute to
   App Store Connect. The version is already set to **1.0.6 (build 8)**.
8. **Attach the build**, set the "What's New" text (matches the in-game
   "A HERO IS BORN" popup), submit for review.

### Already done in code (nothing for you to do here)

- iOS AdMob real ad units + RevenueCat iOS key wired in `native.ts`
- App icon + splash screens in both native projects
- Google UMP consent prompt before ads (required in the EU/UK)
- iOS App Tracking Transparency prompt + `SKAdNetworkItems` in Info.plist
- Both apps locked to portrait
- Visible RESTORE PURCHASES button in the shop (Apple requires this)
- Apple privacy manifest (`ios/App/App/PrivacyInfo.xcprivacy`)
- Loot-box (egg) odds disclosure in the Pets panel (Apple 3.1.1)
- Version bumped to 1.0.6 / build 8 on both platforms

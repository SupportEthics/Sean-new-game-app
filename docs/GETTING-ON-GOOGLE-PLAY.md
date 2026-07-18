# Getting Soulforge Knight onto Google Play

The Android app is code-complete: `android/` builds the same game as iOS
(versionName 1.0.5), saves mirror to Preferences, and the service factory
uses AdMob + RevenueCat on device. What remains is accounts, IDs and the
store listing — Sean's side, with copyable steps below.

## 0. Decide the account type (affects the timeline!)

- **Organization account (recommended — Support Ethics LTD):** needs a
  D-U-N-S number for the company. Check first — many UK LTDs already
  have one: https://www.dnb.co.uk/duns-number/lookup.html. If not,
  request one free (typically days, can be longer). Org accounts have
  **no closed-testing requirement** — you can go straight to production.
- **Personal account:** instant signup, BUT Google requires new personal
  accounts to run a **closed test with at least 12 testers for 14 days**
  before production access. That adds two weeks minimum.

Either way the signup fee is a one-off **$25** at
https://play.google.com/console/signup.

## 1. Google Play Console setup

1. Create the app: All apps -> Create app -> "Soulforge Knight",
   Game, Free, declarations as prompted.
2. Store listing (reuse docs/STORE-LISTING.md):
   - Short description: `Forge swords. Slay the horde.`
   - Full description: the same text as the App Store description.
   - Screenshots: the same PNGs used for the App Store 6.5" set work
     (Play accepts 9:16-ish portrait up to 19.5:9).
   - Feature graphic (required, 1024x500): `play-feature-graphic.png`
     (Claude generated; in the project scratchpad / ask for a re-send).
   - App icon 512x512: export from `resources/icon.png` (Play Console
     will ask; it must match the in-app icon).
3. Content rating questionnaire: category Game; answer honestly
   (fantasy violence vs pixel monsters, no gambling — the egg odds are
   disclosed in-game). Expect Everyone 10+ / PEGI 7.
4. Data safety form (mirror of Apple's App Privacy):
   - Collected: App interactions (analytics), Advertising ID (AdMob),
     Purchase history (IAP). All "not shared for tracking you across
     apps" except advertising which is handled by AdMob's disclosure.
   - Privacy policy URL: the hosted privacy.html on the Netlify site.
5. In-app products (Monetize -> Products -> In-app products): create
   every SKU from src/config/monetization.ts with the SAME product IDs
   (remove_ads, starter_pack, gem packs, coin packs, bundles, skins,
   knights_pass, golden_knight, piggy_crack...). Prices to match iOS.

## 2. AdMob (Android side)

1. AdMob console -> Apps -> Add app -> Android -> link the Play listing
   once it exists (or add unlinked first).
2. Create the same ad units as iOS: rewarded x4? no — mirror
   src/config/native.ts: rewarded, interstitial (and any others listed
   for ios) and paste the ANDROID app ID + unit IDs into
   `src/config/native.ts` under the android section.
3. Replace the TEST application ID in
   `android/app/src/main/AndroidManifest.xml`
   (`com.google.android.gms.ads.APPLICATION_ID`) with the real
   `ca-app-pub-...~...` Android APP id.
4. app-ads.txt on the website already covers AdMob; no change needed
   (same publisher ID).

## 3. RevenueCat (Android side)

1. RevenueCat dashboard -> the existing project -> add a Play Store app
   (needs a service-account JSON from Play Console; RevenueCat's guide
   walks through it).
2. Attach the Play products to the existing entitlements/offerings.
3. Paste the **Google API key** into `src/config/native.ts`.

## 4. Firebase (optional but free)

Firebase console -> the existing project -> Add app -> Android
(`uk.co.supportethics.soulforgeknight`) -> download `google-services.json`
-> drop it at `android/app/google-services.json`. The build applies it
automatically; without it, analytics is silently off (build still works).

## 5. Build the signed release (Sean's Mac, ~1 evening)

```
cd ~/Sean-new-game-app
git pull origin claude/fan-app-monetization-1bugoq
npm install
npm run build
npx cap sync android
npx cap open android          # opens Android Studio (install it first)
```

In Android Studio:
1. First run: let Gradle sync finish (it downloads a lot; be patient).
2. Build -> Generate Signed App Bundle -> App Bundle -> Create new
   keystore. **BACK THE KEYSTORE FILE + PASSWORDS UP SOMEWHERE SAFE —
   losing it means you can never update the app again.**
3. Choose `release`, finish. The `.aab` lands under
   `android/app/release/`.
4. Upload the .aab in Play Console -> Production (or the closed test
   track if on a personal account) -> roll out.

## 6. Review + live

Google review is usually 1-3 days for a new app (sometimes hours,
occasionally a week). After approval, roll out to production and the
listing goes live within hours.

## Timeline summary

- Claude code prep: done (this commit).
- Sean accounts + listings (Play Console, AdMob, RevenueCat, Firebase):
  1-2 evenings.
- First signed build + upload: 1 evening (mostly Android Studio setup).
- Org account with existing D-U-N-S: **live in roughly 1-2 weeks.**
- Personal account: add the 14-day closed test -> **roughly 3-4 weeks.**

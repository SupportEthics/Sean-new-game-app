# Google Play — full setup walkthrough (Soulforge Knight)

Click-by-click, in the order that actually works. Play's console gates
some steps behind others (you can't create in-app products until a build
with billing is uploaded), so follow top to bottom.

The Android project is code-complete at **1.0.6 (versionCode 8)** — same
game as iOS. Ads run Google TEST units and purchases are dormant until
the real IDs land in `src/config/native.ts` (step 7).

---

## Step 0 — The account decision (sets your timeline)

- **Organisation account (recommended — Support Ethics LTD):**
  Requires a **D-U-N-S number** for the company. Check if you already
  have one (many UK LTDs do): https://www.dnb.co.uk/duns-number/lookup.html
  If not, request one free (usually days). Org accounts can publish
  **straight to production** → live in ~1–2 weeks total.
- **Personal account:** instant signup, but Google forces new personal
  accounts to run a **closed test with 12+ testers for 14 days** before
  production access → ~3–4 weeks total.

Fee is a one-off **$25** either way.

## Step 1 — Create the Play Console account

1. Go to https://play.google.com/console/signup
2. Sign in with the Google account you want to own the app (use a
   company Google account if you have one — ownership transfers are a
   pain later).
3. Choose **Organisation** or **Yourself** per Step 0, pay the $25, fill
   in the identity details. Org accounts go through a verification step
   (D-U-N-S lookup + possibly documents) that can take a few days —
   start this TODAY, everything else can proceed while it verifies.

## Step 2 — Create the app

1. Play Console → **All apps → Create app**
2. App name: `Soulforge Knight` · Default language: `English (United
   Kingdom)` · **App or game:** Game · **Free or paid:** Free
   (irreversible once published — Free is correct, we monetise via IAP).
3. Tick both declarations → **Create app**.

## Step 3 — The "Set up your app" checklist (Dashboard)

Play's dashboard shows a task list. Work through it:

1. **Privacy policy:** paste your hosted policy URL (the Netlify site's
   privacy page).
2. **App access:** "All functionality is available without special
   access" (no login).
3. **Ads:** YES, the app contains ads.
4. **Content rating:** fill the IARC questionnaire — category **Game**;
   violence: mild fantasy violence against pixel monsters; no gore, no
   gambling with real winnings (egg odds are disclosed in-game), no user
   content, no chat. Expect **PEGI 7 / Everyone 10+**.
5. **Target audience:** 13+ (avoids the whole Families programme);
   "not designed for children."
6. **News app:** No. · **COVID app:** No. · **Data safety** — declare:
   - **Device or other IDs** (Advertising ID — AdMob): collected, used
     for advertising, not shared beyond that.
   - **Purchase history** (RevenueCat receipts): collected, app
     functionality.
   - **App interactions** (Firebase Analytics): collected, analytics.
   - Data is encrypted in transit; users can request deletion via the
     support email.
7. **Government app:** No. · **Financial features:** none.
8. **Store listing** (paste from docs/STORE-LISTING.md):
   - Short description (80 chars): `Merge swords, hatch pets and slay
     the horde in a dark idle RPG.`
   - Full description: the App Store description text.
   - App icon: **512x512** PNG (export from `resources/icon-1024.png`,
     scaled — any image tool, or ask Claude for the file).
   - Feature graphic (**required**, 1024x500):
     `screenshots/play/play-feature-graphic.png`
   - Phone screenshots (min 2): the six `screenshots/play/*-1080x1920.jpg`
   - Regenerate assets any time:
     `npx playwright test tests/e2e/_play-assets.spec.ts` and
     `npx playwright test tests/e2e/_feature-graphic.spec.ts`
9. **Countries:** Production → Countries/regions → add all (or your
   shortlist).

## Step 4 — AdMob (Android) — do BEFORE the final build

1. https://apps.admob.com → **Apps → Add app → Android**. The Play
   listing won't be searchable until the app is live — choose "No, the
   app isn't listed" for now (you link it later via App settings).
2. Name it `Soulforge Knight (Android)`. Copy the **App ID**
   (`ca-app-pub-1071330978490238~XXXXXXXXXX`).
3. Create **2 ad units**: a **Rewarded** unit and an **Interstitial**
   unit. Copy both unit IDs.
4. **Send all three IDs to Claude** — they go into:
   - `src/config/native.ts` (the two unit IDs, android section)
   - `android/app/src/main/AndroidManifest.xml` (the app ID replaces
     Google's TEST `APPLICATION_ID`)

## Step 5 — First build + upload (unlocks the products menu)

On the Mac, one command at a time:

```
cd ~/Documents/GitHub/Sean-new-game-app
```
```
git pull
```
```
npm install
```
```
npm run build
```
```
npx cap sync android
```
```
npx cap open android
```

That opens **Android Studio** (install it first from
https://developer.android.com/studio — first launch downloads a lot).

In Android Studio:
1. Wait for the Gradle sync to finish (bottom status bar; several
   minutes the first time).
2. **Build → Generate Signed App Bundle / APK → App Bundle → Next**.
3. **Create new…** keystore:
   - Path: somewhere OUTSIDE the repo, e.g.
     `~/Documents/soulforge-keystore.jks`
   - Passwords + alias (e.g. alias `soulforge`).
   - ⚠️ **BACK UP THE .jks FILE AND BOTH PASSWORDS NOW** (password
     manager + a second location). Losing them means you can NEVER
     update the app again — Google cannot reset this.
4. Select **release** → Finish. The `.aab` lands in
   `android/app/release/app-release.aab`.
5. Play Console → **Testing → Internal testing → Create new release** →
   upload the `.aab` → accept Play App Signing → name the release
   `1.0.6 (8)` → Save/Rollout to internal testing.
   (Internal testing is instant, needs no review, and unlocks the
   Monetize menu. Add your own Gmail as a tester to install it.)

## Step 6 — Create the products (now the menu exists)

**Monetize → Products → In-app products → Create product.** Product IDs
must match the code EXACTLY — the master table is in
docs/GETTING-ON-THE-STORES.md. Same prices as iOS:

- One-time (Play has no consumable/non-consumable split; the app
  handles it): `soulforge_starter_pack` £0.99, `founder_pack` £1.99,
  `remove_ads` £4.99, `golden_knight` £19.99, `piggy_crack` £2.99,
  `knights_pass` £4.99, `gems_fistful` £0.99, `gems_pouch` £4.99,
  `gems_chest` £9.99, `gems_hoard` £19.99, `gems_vault` £49.99,
  `gems_ransom` £99.99, `coins_sack` £1.99, `coins_wagon` £9.99,
  `coins_treasury` £49.99, `coins_hoard` £99.99, `bundle_squire` £9.99,
  `bundle_knight` £19.99, `bundle_royal` £49.99, `bundle_dragon` £99.99,
  `skin_dragonlord` / `skin_celestial` / `skin_voidreaper` /
  `skin_sovereign` / `skin_phantomking` £4.99 each, `sword_scythe` /
  `sword_voidkatana` / `sword_dragoncleaver` £4.99 each.
  Each needs a name + one-line description → **Activate** it.
- **Subscription:** Monetize → Products → **Subscriptions** → Create:
  product ID `knights_membership`, then add a **base plan** with ID
  `monthly`, auto-renewing, 1 month, £4.99 → Activate.

## Step 7 — RevenueCat (Android)

1. RevenueCat dashboard → the existing **Soulforge Knight** project →
   **Apps → + New → Play Store**. Package:
   `uk.co.supportethics.soulforgeknight`.
2. It asks for a **service account JSON** — follow RevenueCat's inline
   guide (Google Cloud console → create service account → grant it
   access in Play Console → Users & permissions → download JSON →
   upload to RevenueCat). Fiddly but one-time; ~15 minutes.
3. Attach the Play products to the SAME entitlements as iOS
   (`knights_membership` → the `membership` entitlement).
4. Copy the **Google API key** (starts `goog_`) → **send to Claude**
   for `src/config/native.ts`.

## Step 8 — Firebase (Android analytics, optional but free)

Firebase console → the existing project → **Add app → Android** →
package `uk.co.supportethics.soulforgeknight` → download
`google-services.json` → put it at `android/app/google-services.json`.
Without it the build still works; analytics is just silently off.

## Step 9 — FINAL build + release

After Claude wires the AdMob + RevenueCat IDs (steps 4/7) and bumps
versionCode to 9: repeat Step 5's commands, generate the signed bundle
with the SAME keystore, upload to:

- **Org account:** Production → Create new release → rollout. Review is
  typically 1–3 days for a first release.
- **Personal account:** Closed testing first — 12+ testers, 14 days —
  then apply for production access, then promote the release.

## Quick reference — what Claude needs from you

| From | What | Goes into |
|---|---|---|
| AdMob | Android App ID (`~` format) | AndroidManifest.xml |
| AdMob | Rewarded + Interstitial unit IDs | native.ts |
| RevenueCat | Google API key (`goog_...`) | native.ts |
| (optional) Firebase | google-services.json | android/app/ |

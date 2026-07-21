# Uploading Soulforge Knight to Xcode → the App Store

A do-this-then-that guide, written for someone who hasn't shipped an iOS
app before. You do all of this on a **Mac** (Xcode is Mac-only). Budget an
afternoon the first time; it's ~20 minutes once you've done it once.

Version is already set to **1.0.6 (build 8)**. Encryption compliance and
the AdMob app ID are already answered in `Info.plist`, so those prompts
won't appear.

---

## 0. Before you start — one-time setup

- **A Mac** with the latest **Xcode** (free, from the Mac App Store). Open
  it once and let it install "additional components" if it asks.
- **Apple Developer Program** membership, active ($99/year) —
  https://developer.apple.com/account . Wait until it says "Membership:
  Active" before continuing; a fresh signup can take a few hours.
- The project cloned to the Mac, and Node installed (`node -v` should print
  a version). If not: install Node from https://nodejs.org (the LTS one).

---

## 1. Build the game and copy it into the iOS project

Open **Terminal**, `cd` into the project folder, then run these three, in
order:

```bash
npm install          # first time only, installs dependencies
npm run build        # compiles the game into dist/
npx cap sync ios     # copies dist/ into the iOS app + updates plugins
```

`npx cap sync ios` is the important one — it's what puts your latest game
code into the native shell. **Re-run these three any time you change the
game** and want a fresh build.

---

## 2. Open the project in Xcode

```bash
npm run cap:ios
```

This opens `ios/App/App.xcworkspace` in Xcode.

> ⚠️ Always open **App.xcworkspace** (white icon), never **App.xcodeproj**
> (blue icon). The workspace includes the CocoaPods dependencies; the bare
> project won't build. `npm run cap:ios` opens the right one for you.

Give Xcode a minute to finish "Indexing" (top bar) before doing anything.

---

## 3. Set your signing team (one-time)

1. In the left sidebar, click the blue **App** project at the very top.
2. Select the **App** target → **Signing & Capabilities** tab.
3. Tick **Automatically manage signing**.
4. **Team:** pick your Apple Developer team from the dropdown (your name or
   "Support Ethics"). If it's empty: Xcode → Settings → Accounts → **+** →
   sign in with your Apple ID, then come back.
5. Confirm **Bundle Identifier** reads exactly:
   `uk.co.supportethics.soulforgeknight`

If you see a red error about provisioning, it usually fixes itself once the
team is selected and Xcode registers the app ID (give it a few seconds). If
it persists, click **Try Again** / the "Fix Issue" button Xcode offers.

While you're here, confirm the version: click the **General** tab →
**Identity** shows **Version 1.0.6**, **Build 8**. (These come from the
project settings I already bumped — no need to type them.)

---

## 4. Create the app record in App Store Connect (one-time)

You need a matching listing on Apple's side before a build can attach to
it. In a browser:

1. Go to https://appstoreconnect.apple.com → **Apps** → the blue **＋** →
   **New App**.
2. Fill in:
   - **Platform:** iOS
   - **Name:** `Soulforge Knight` (must be unique across the whole store;
     if taken, try `Soulforge Knight: Idle RPG`)
   - **Primary Language:** English (UK)
   - **Bundle ID:** select `uk.co.supportethics.soulforgeknight` from the
     dropdown. If it's **not** in the list, Xcode hasn't registered it yet —
     do step 6 (Archive) once, then come back; or register it manually at
     developer.apple.com → Certificates, IDs & Profiles → Identifiers → ＋.
   - **SKU:** any private code, e.g. `SOULFORGE001` (never shown to users)
   - **User Access:** Full Access
3. Click **Create**. The listing shell now exists.

---

## 5. Point Xcode at "Any iOS Device"

In the Xcode toolbar (top, next to the ▶︎/■ buttons) there's a device
selector. Click it and choose **Any iOS Device (arm64)** at the top.

> You **cannot** archive while a Simulator is selected — the Archive menu
> item will be greyed out. It must be "Any iOS Device".

---

## 6. Archive the build

1. Menu bar → **Product** → **Archive**.
2. Xcode compiles everything (2–5 minutes). Leave it alone.
3. When it finishes, the **Organizer** window opens showing your archive,
   dated today, version 1.0.6 (8).

If Archive is greyed out, you're still on a Simulator — redo step 5.

---

## 7. Upload to App Store Connect

In the Organizer window that just opened:

1. Select your new archive → click **Distribute App** (right side).
2. Choose **App Store Connect** → **Next**.
3. Choose **Upload** → **Next**.
4. Leave the default options ticked (Upload your app's symbols, Manage
   version and build number) → **Next**.
5. **Automatically manage signing** → **Next**.
6. Review the summary → **Upload**.
7. Wait for "Upload Successful" → **Done**.

The build is now on Apple's servers. It won't be usable for ~5–30 minutes
while Apple "processes" it — you'll get an email when it's ready, or just
refresh App Store Connect.

---

## 8. While the build processes — fill in the listing

Back in App Store Connect → your app. In the left sidebar under the **1.0.6**
version, fill these (paste text from `docs/STORE-LISTING.md`):

- **Screenshots** — at least one 6.7" set (1290×2796). Drag them in. (Ask
  me and I'll generate placeholder store-sized images to get you unblocked.)
- **Promotional Text / Description / Keywords** — from `STORE-LISTING.md`.
- **Support URL** — any page you control (even a simple contact page).
- **Marketing URL** — optional.
- **What's New in This Version** — matches the in-game popup, e.g.
  "Claim 7 days of recruit gifts, grab the one-time Founder's Pack, and
  join the new Knight's Membership."

Then, separately:

- **App Privacy** (left sidebar) → answer the questionnaire: you collect
  an **advertising identifier** (AdMob) and **purchase history**
  (RevenueCat). Wording is in `STORE-LISTING.md`.
- **Age Rating** → mild/cartoon fantasy violence, no gambling, no user
  content. Expected 9+.
- **In-App Purchases** → create them per
  `docs/GETTING-ON-THE-STORES.md` (exact IDs matter). For the **first**
  submission, Apple reviews your IAPs together with the build — attach at
  least the ones you want live at launch.

---

## 9. Attach the build and submit

1. Once processing is done, scroll to the **Build** section of the 1.0.6
   page → click **＋** / **Add Build** → pick the build you uploaded (1.0.6
   (8)) → **Done**.
2. Fill **App Review Information** (contact details; a demo account isn't
   needed — the game has no login wall).
3. Click **Add for Review** → **Submit**.

That's it. Status goes **Waiting for Review** → **In Review** → typically
approved within 24–48 hours. Apple emails you at each step.

---

## 10. Strongly recommended: test via TestFlight first

Before the public release goes live, install the exact build on your own
iPhone to sanity-check it:

- App Store Connect → your app → **TestFlight** tab → your processed build
  appears there automatically.
- Add yourself as an **Internal Tester** (uses your Apple ID) → install the
  **TestFlight** app on your iPhone → the build shows up to install.
- IAPs run in **Sandbox** mode in TestFlight, so you can buy everything for
  free to confirm each product actually delivers. (Create a Sandbox tester
  under **Users and Access → Sandbox Testers** if prompted.)

---

## Common snags (and the fix)

| Symptom | Fix |
|---|---|
| Archive menu greyed out | Device selector isn't "Any iOS Device" — step 5 |
| "No account for team" / signing red | Xcode → Settings → Accounts → add Apple ID; pick Team in step 3 |
| Bundle ID missing in New App dropdown | Archive once (step 6) so Xcode registers it, or add it manually in developer.apple.com Identifiers |
| Build never appears in App Store Connect | Still processing (up to 30 min), or you got an email about a missing compliance item — check email |
| "Invalid Swift Support" / Pods errors | You opened `.xcodeproj` not `.xcworkspace` — reopen with `npm run cap:ios` |
| Uploaded but can't submit — "missing export compliance" | Already handled in Info.plist (`ITSAppUsesNonExemptEncryption = NO`); if still asked, answer **No** |

---

## When you next change the game

Repeat only steps **1, 5, 6, 7** (build+sync → Any iOS Device → Archive →
Upload). Bump the build number first — ask me and I'll increment it, or in
Xcode set **Build** to 9, 10, … (each upload needs a higher build number
than the last).

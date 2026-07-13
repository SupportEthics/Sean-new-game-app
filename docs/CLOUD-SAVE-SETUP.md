# Cloud saves + global leaderboard — Sean's setup steps

The game code for both features is done and dormant. It all switches on
when the Supabase keys land in `src/config/globalBoard.ts`. These are the
one-time steps, in order.

## 1. Create the Supabase project (5 minutes)

1. Go to **supabase.com** → sign in with GitHub
2. **New project**: name `soulforge-knight`, region **London (eu-west-2)**,
   generated database password is fine
3. When it finishes: **Project Settings → API** → copy the **Project URL**
   and the **anon public** key and send them to Claude (they're public by
   design; the SQL below is what keeps the data safe)

## 2. Run the two SQL files

In Supabase: **SQL Editor → New query**, paste the whole of
`docs/leaderboard.sql`, press **RUN**. Then the same with
`docs/cloud-save.sql`.

## 3. Enable Sign in with Apple in Supabase

1. Supabase: **Authentication → Sign In / Providers → Apple** → enable
2. In **Client IDs** enter exactly: `uk.co.supportethics.soulforgeknight`
3. Leave the secret key fields empty — they're only needed for website
   sign-in, not the native app flow. Save.

## 4. Xcode: add the capability (when building v1.1)

After pulling the update on the Mac:

1. Open the project (`npm install`, then `npx cap sync ios`, then
   `npm run cap:ios`)
2. Select the **App** target → **Signing & Capabilities** tab
3. **+ Capability** (top left) → search **Sign in with Apple** → double
   click it. Xcode registers the entitlement with your Apple account
   automatically (you may see it refresh provisioning)
4. Archive and upload as usual

## What players see

- MENU → **CLOUD** → a white **Sign in with Apple** button
- After binding: automatic backups every few minutes, plus BACK UP NOW
  and RESTORE FROM CLOUD buttons
- New phone: install, sign in with the same Apple ID, and the game offers
  to load the cloud save

## Privacy note

Add a line to the privacy policy page when this ships: signed-in players
store their game progress and Apple account identifier with our hosting
provider (Supabase) solely to provide cloud saves. The App Privacy
answers in App Store Connect gain "User ID" under data linked to the
user (purpose: App Functionality).

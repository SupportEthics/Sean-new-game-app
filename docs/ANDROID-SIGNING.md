# Android release signing — Soulforge Knight

Reference for future release builds. Created 2026-07-21 when Sean
generated the keystore on his Mac.

## The keystore

- **File:** `soulforge-keystore.jks` in Sean's **Documents** folder
  (`~/Documents/soulforge-keystore.jks` on Sean's MacBook Pro)
- **Key alias:** `soulforge`
- **Validity:** 25 years
- **Certificate:** CN=Sean Arundel, O=Support Ethics Ltd
- **Passwords (keystore + key):** NOT stored anywhere in this repo —
  they are in Sean's password manager. Never commit them.

⚠️ This file can never be recreated or reset by Google. If it (or its
passwords) are lost, the app can never be updated on Google Play again.
Keep at least TWO copies: Sean's Mac + one other location (iCloud
Drive / USB / password-manager attachment).

## How every release build is signed

Android Studio → Build → **Generate Signed App Bundle / APK…** →
Android App Bundle → select this keystore + alias → variant `release`.
Output: `android/app/release/app-release.aab` — upload that to Play
Console.

Play App Signing: on first upload Google re-signs the app with its own
key and this keystore becomes the **upload key**. If it's ever lost
AFTER that first upload, Google support can reset an upload key (unlike
a raw signing key) — but don't rely on it; keep the backups.

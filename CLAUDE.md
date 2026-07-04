# Soulforge Knight — idle merge RPG

Dark-fantasy idle RPG for iOS + Android, inspired by Idle Sword Master /
Legend of Mushroom / Capybara Go. A human armored knight auto-battles
monster waves in a top-down dungeon arena; the player buys and merges swords
to grow DPS. Will be monetized with rewarded ads + IAP (AdMob + RevenueCat
via Capacitor). Named "Soulforge Knight" (Sean-approved rename from the
"Paws & Blades" working title); localStorage keys keep the legacy
`pawsblades_` prefix so existing saves survive — do not rename them.
Art direction (Sean's choice, after several rounds): clean hand-plotted
pixel art with hard dark outlines, like the Idle Sword Master reference —
NOT soft/blobby/pastel. Sprites are ASCII pixel maps or primitive shapes
finished with finish() (pad + outline) in scripts/generate-assets.mjs;
numbers render in the generated bitmap pixel font ('pix').

The full roadmap (M0–M6) and monetization design live in the repo owner's plan;
current status: **M0–M4 done, all six tab-bar tabs live** — skins, 4-sword
loadout, 6x7 board with purchasable cells, prestige (rebirth at stage 40,
Souls banked), raids (post-prestige, 20 levels, ad cooldown reset), offline
earnings (2x-ad popup), Soul Relics tree, daily + weekly + monthly quests
(daily streak), pets (5 companions from gold/gem/free-ad eggs, dup =
level-up, top 3 fight in the arena), shop (4 gem packs, $0.99 starter pack,
$4.99 remove-ads, piggy bank cracked via IAP, free ad chest), interstitial
ad breaks (core/Interstitials.ts policy, disabled by remove_ads), 4 active
skills (Whirlwind/Gold Rush/Time Warp/Battle Fury on sim-time cooldowns),
fairy companion (stage 10, gold-levelled +DPS/+gold), first-run tutorial
(core/Tutorial.ts + UIScene overlay, localStorage-flagged, e2e suites
pre-set pawsblades_tutorial_done), 7-day login rewards (popup, cycle
pauses on missed days), floating ad-gift parcels (config/gifts.ts),
achievements (AWARDS tab in QuestsPanel, lifetime counters incl.
totalMerges), procedural chiptune music loop (AudioService.startMusic on
first gesture), x2 dmg/speed ad boosts, sword sell bin (30% refund, never
equipped), all 5 pets fight in the arena, skills on long cooldowns with
AD CAST. Playable core loop in
browser, hi-detail pixel art, 25 hero skins incl. 5 premium IAP behind a
web-mock IapService, save v15. M5 Capacitor wrap done: android/ + ios/
native projects (appId uk.co.supportethics.soulforgeknight), service
factory picks AdMobAd/RevenueCatIap on native (Google test ad units;
RevenueCat dormant until real keys land in src/config/native.ts) vs web
mocks in browsers, saves mirror to Capacitor Preferences (NativeSave.ts),
`npm run cap:android` / `cap:ios` to open native IDEs. M6 code-side done:
app icon + splashes generated into both native projects by
scripts/generate-store-assets.mjs, UMP consent before AdMob init,
docs/PRIVACY-POLICY.md + docs/STORE-LISTING.md ready to paste. Remaining
M6 items need Sean's accounts (docs/GETTING-ON-THE-STORES.md): real AdMob
IDs + RevenueCat keys into src/config/native.ts, host the privacy policy,
device screenshots, store submissions. Skin catalog lives in src/config/skins.json
(single source for game + asset generator); hero sheets are per-skin
(assets/hero-<id>.png); pet defs in src/config/pets.ts (sheets
assets/pet-<id>.png); IAP catalog in src/config/monetization.ts.

## Commands

- `npm run dev` — Vite dev server on :5173 (game is fully playable in browser)
- `npm run assets` — regenerate the pixel-art sprite sheets in public/assets
  (scripts/generate-assets.mjs; review the PNGs visually after any change)
- `npm test` — vitest unit tests (economy, merge, battle, save, balance sims)
- `npm run test:e2e` — Playwright smoke tests (starts dev server itself)
- `npm run screenshots` — captures screenshots/ at 390x844 for review
- `npm run build` — tsc + vite build to dist/

## Architecture rules

- `src/core/` is pure TypeScript with ZERO Phaser imports — everything there
  must stay unit-testable in node. The battle sim, merge logic, economy math,
  and save system live here.
- `src/config/` is data only (balance numbers, curves, names). Tune balance
  here, then run `npm test` — tests/unit/balance.test.ts simulates an optimal
  player and enforces pacing (stage 5+ by 15 min, prestige stage 40 NOT
  reachable in 2h of active play).
- Scenes subscribe to `GameState` events and call its methods; they never
  mutate state fields directly.
- `BattleScene.update()` drives the sim clock (fixed 100ms sub-steps inside
  `GameState.update`). The same code path will power offline fast-forward.
- Monetization (M4+) must go behind service interfaces with a web-mock
  implementation so the game always remains playable/testable in a browser.

## Testing hooks

Dev builds expose `window.__game` (see src/main.ts): `addGold`, `addGems`,
`setStage`, `setWave`, `timeTravel(hours)`, `save`, `reset`. Playwright tests
rely on these; keep them working.

## Environment notes

- Playwright uses the pre-installed Chromium at /opt/pw-browsers/chromium
  (see playwright.config.ts); never run `playwright install`.
- Design resolution is 390x844 portrait (Scale.FIT). E2E tests click at
  design coordinates with a 390x844 viewport so they map 1:1.

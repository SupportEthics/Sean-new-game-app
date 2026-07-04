# Paws & Blades — idle merge RPG (working title)

Cute-animal idle RPG for iOS + Android, inspired by Idle Sword Master /
Legend of Mushroom / Capybara Go. Hedgehog knight auto-battles enemy waves;
the player buys and merges gear to grow DPS. Will be monetized with rewarded
ads + IAP (AdMob + RevenueCat via Capacitor).

The full roadmap (M0–M6) and monetization design live in the repo owner's plan;
current status: **M0+M1 done** (playable core loop in browser). Next: M2 art
pipeline, M3 retention (offline earnings, pets, prestige), M4 monetization
(web mock), M5 Capacitor wrap, M6 store readiness.

## Commands

- `npm run dev` — Vite dev server on :5173 (game is fully playable in browser)
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

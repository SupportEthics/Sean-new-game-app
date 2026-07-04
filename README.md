# Paws & Blades 🦔⚔️

A dark-fantasy idle merge RPG for iOS and Android (working title). An armored
knight auto-battles dire wolves, bone warriors, and stone golems in a
top-down dungeon arena while you merge glowing blades to grow stronger — inspired by the
top-grossing idle RPGs (Idle Sword Master, Legend of Mushroom, Capybara Go),
planned to be monetized with rewarded ads and in-app purchases.

## Play it now (development)

```bash
npm install
npm run dev
```

Open http://localhost:5173 — the game is fully playable in a desktop or
mobile browser.

**How to play:** your hero fights automatically. Tap **Buy** to place gear on
the grid, drag two matching items together (or tap **Merge**) to forge a
stronger weapon. Beat the boss on wave 10 to reach the next stage. Progress
saves automatically.

## Tech

- [Phaser 3](https://phaser.io) + TypeScript + Vite
- Capacitor (planned) to ship the same code to the App Store and Google Play
- vitest unit tests including an economy balance simulator; Playwright e2e

## Status / roadmap

- [x] M0 Project scaffold
- [x] M1 Core loop: auto-battle, waves & bosses, merge grid, autosave
- [x] M2 Generated pixel-art sprite sheets, animations, biomes, SFX
- [ ] M3 Retention: offline earnings, pets, daily quests, prestige
- [ ] M4 Monetization (ads + IAP behind a web-mock layer)
- [ ] M5 Capacitor wrap (Android + iOS)
- [ ] M6 Store readiness (icons, listings, privacy, compliance)

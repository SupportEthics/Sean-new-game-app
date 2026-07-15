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
Souls banked), raids (post-prestige, 75 levels, ad cooldown reset, footer quick-start
button for the current level, list opens scrolled to it), offline
earnings (2x-ad popup), Soul Relics tree, daily + weekly + monthly quests
(daily streak), pets (5 companions from gold/gem/free-ad eggs, dup = level-up, max level 20, evolution: 2 ascensions per pet, gem-only (75/250, no level gate; purple price button), per-stage sprites pet-<id>-s1/-s2 (fiercer art, final form has a halo), x2/x4 pet bonus + bigger arena sprite, stage names in config/pets.ts EVOLUTION, save v20 petStages), shop (sub-tabs DEALS/GEMS/COINS/BUNDLES/SKINS — skins tab sells the 5 legendary heroes + 3 premium swords and links to the full wardrobe (SKINS removed from the side MENU — RAID/QUESTS row + REBIRTH); 6 gem packs, 4 coin packs
granting hours of current gold income, 4 gems+coins bundles — each line
with 49.99/99.99 whale tiers — $0.99 starter pack, $4.99 remove-ads,
piggy bank cracked via IAP, free ad chest), interstitial
ad breaks (core/Interstitials.ts policy, disabled by remove_ads), 7 active
skills (Whirlwind/Gold Rush/Time Warp/Battle Fury + late-game Storm Call/
Midas Rush/Chrono Surge, sim-time cooldowns; AUTO CAST toggle unlocks at
stage 25, save v22 autoSkills, warp-guarded in GameState.autoCastReadySkills),
fairy companion (stage 10, gold-levelled +DPS/+gold, max level 100), first-run tutorial
(core/Tutorial.ts + UIScene overlay, localStorage-flagged, e2e suites
pre-set pawsblades_tutorial_done), 7-day login rewards (popup, cycle
pauses on missed days), floating ad-gift parcels (config/gifts.ts),
achievements (AWARDS tab in QuestsPanel, lifetime counters incl.
totalMerges), procedural chiptune music loop (AudioService.startMusic on
first gesture), x2 dmg ad boost + treasure ad (LOOT button: stage-scaled gold+gems behind a preview modal, config/economy.ts AD_LOOT, 15-min cooldown, save v21; speed boosts remain via gifts), sword sell bin (30% refund, never
equipped), all 5 pets fight in the arena, skills on long cooldowns with
AD CAST, town (post-2nd-rebirth: farm/blacksmith/mine/jeweler in config/town.ts, caps 50/50/40/20, jeweler gem vault), Hall of Legends leaderboard (RANKS button, seeded rivals in config/leaderboard.ts + LIVE ONLY/ALL toggle hides rivals on the live global board, save v22 boardRealOnly; platform boards dormant in services/LeaderboardService.ts), rebirths add +10% enemy HP each (config/prestige.ts enemyHpScale), gold curve has a second knee at stage 100 (stages.ts lateGoldStage2/goldDropGrowthLate2 — deep endgame pays nearer HP growth), content
expansion (25 distinct sword sprites — tiers past 25 keep the final art via
gear.ts weaponFrame(), never cycle; maxTier 160 (raised from 80 — tier-80 wall stopped Sean near
stage 250; ceiling now ~stage 450, tests/unit/endgame.test.ts guards it);
12 monster species; 8 themed locations
in config/locations.ts, one per 10-stage set — Dungeon/Forest/Castle/Crypt/
Frozen Keep/Ember Forge/Dragons Lair/Void Citadel — each with arena tints +
its own monster pool + entrance banner), raids progressively harder
(config/raids.ts raidClearKills: kill quota grows per level on top of
4x/level HP), sword skins (SkinsPanel KNIGHT/SWORDS tabs: wear any tier
art once that tier is reached lifetime — bestTier survives rebirth — or
3 premium IAP weapons scythe/katana/cleaver in config/swordSkins.ts,
gear.png frames 25-27; skins PAY: owning commons/epics +DPS, rares +gold, legendaries both — worn tier art +0.5% DPS/tier and premium swords +15% DPS +15% gold while worn), raid ladder resets on rebirth
(raidBest keeps lifetime progress for awards), hero level pays +1% DPS per 10 levels (config/economy.ts HERO_LEVEL, level math in core/EconomyMath, +N% DMG shown under LV), raid kills capped at 3x the quota with early end (config/raids.ts raidKillCap), drag-safe grid (UIScene
defers rebuilds while a sword is dragged; autoMergeOnce(excludeIndex)
skips the dragged cell), two-line BUY button, equip row = dedicated 4 gold boxes above a 6x6 merge field (board = 4+36 cells, save v19 repack; MergeLogic EQUIP_CELLS + locked-set params; GameState.syncLoadout keeps slots stocked with the best swords, slot 0 strongest; moving one off snaps back; locked slots show ST 5/15/25 and reject items). Playable core loop in
browser, hi-detail pixel art, 25 hero skins incl. 5 premium IAP behind a
web-mock IapService, save v18. M5 Capacitor wrap done: android/ + ios/
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

2026-07-15 content wave (save v29, all behind existing surfaces per
Sean's no-clutter rule — MENU is a 3-column grid: RAID/QUESTS/REBIRTH,
CLOUD/TOWN/DUNGEON, CODEX): weekend events (config/events.ts, Fri-Sun
UTC rotation, arena-top banner only while live; GameState.clock is
injectable and frozen to a Wednesday under vitest); Daily Dungeon
(config/dungeon.ts, rides the generalized RaidState — duration/
clearKills/killCap/goldPerKill fields + dungeon flag — daily modifier,
free retries, once-a-day reward; the arena boss is a huge animated dragon head, one colourway per modifier — assets/dragon-<color>.png, jaw-snap frame on kills); Codex collection book
(config/codex.ts, beasts derive from location pools + bestTier blades +
hatched pets, one-time gem bounties, CodexPanel); Forge enchantments
(config/enchants.ts, gem-bought permanent Sharpness/Greed/Soulbind,
SoulsPanel became THE FORGE OF POWER with RELICS/ENCHANTS tabs); pet
expeditions (config/expeditions.ts, the weakest hatched pet leaves the
arena AND its DPS for 1/4/12h, strip at the PETS panel foot); locations
9+10 THE ABYSS/CELESTIAL REALM (cycle is now 100 stages); weekly
seasons + crowns on the live board (globalBoard.ts seasonNumber,
CROWNED_RANKS); rival duels (config/duels.ts + EconomyMath
duelWinChance, DUEL buttons on live rows, 3/day); Knight's Pass
(config/pass.ts, 30-day seasons, XP via trackQuest, free+premium lanes,
knights_pass consumable IAP, PASS tab in QuestsPanel); shop daily deal
(config/dailyDeal.ts, rotating currency trades, top of DEALS); update
nudge (services/UpdateCheck.ts reads version.json on the Netlify site,
banner links to the App Store when the native build is behind — bump
version.json AFTER each release goes live).

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

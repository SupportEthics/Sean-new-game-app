import { test } from '@playwright/test';

/** Captures review screenshots into screenshots/ (gitignored). */

interface GameHooks {
  addGold(n: number): void;
  setWave(stage: number, wave: number): void;
  gs: { grid: (number | null)[]; highestTier: number };
}

declare global {
  interface Window {
    __uiReady?: boolean;
    __game: GameHooks;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500); // tap through the welcome screen
  await page.waitForFunction(() => window.__uiReady === true);
});

test('welcome screen', async ({ page }) => {
  // beforeEach already tapped through; reload to capture the title itself
  await page.reload();
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'screenshots/00-title.png' });
});

test('early game', async ({ page }) => {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'screenshots/01-early-game.png' });
});

test('mid game with populated grid', async ({ page }) => {
  await page.evaluate(() => {
    (window.__game as unknown as { setStage(s: number): void }).setStage(31); // all 4 sword slots
    window.__game.addGold(1e6);
    // Hand-place a mid-game grid; the UI rebuilds on the next grid event
    const tiers = [8, 8, 7, 6, 5, 5, 4, 3, 3, 2, 1, 1];
    tiers.forEach((t, i) => (window.__game.gs.grid[i] = t));
    window.__game.gs.highestTier = 9;
  });
  // Buy through the UI so grid:changed fires and everything renders
  await page.mouse.click(247, 761);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'screenshots/02-mid-game.png' });
});

test('boss fight', async ({ page }) => {
  await page.evaluate(() => window.__game.setWave(5, 10));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/03-boss.png' });
});

test('skins panel', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openSkins(): void }).openSkins(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __skinsOpen?: boolean }).__skinsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/05-skins.png' });
});

test('raids panel after prestige', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { prestigeCount: number };
      openRaids(): void;
    };
    g.gs.prestigeCount = 1;
    (g.gs as unknown as { raidReadyAt: number }).raidReadyAt = Date.now() + 8 * 60_000;
    g.openRaids();
  });
  await page.waitForFunction(
    () => (window as unknown as { __raidsOpen?: boolean }).__raidsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/07-raids.png' });
});

test('pets panel with hatched squad', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { pets: Record<string, number>; gold: number; gems: number };
      hatch(kind: string, roll?: number): unknown;
      openPets(): void;
    };
    g.gs.gold = 50_000;
    g.gs.gems = 60;
    g.gs.pets = { pup: 4, emberbat: 2, drake: 1 };
    g.openPets();
  });
  await page.waitForFunction(
    () => (window as unknown as { __petsOpen?: boolean }).__petsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/08-pets.png' });
});

test('pets fighting beside the hero', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: {
        pets: Record<string, number>;
        emit?: unknown;
        hatchEgg(kind: string, roll?: number): unknown;
        gold: number;
      };
    };
    // Hatch through the API so pets:changed fires and the arena renders them
    g.gs.gold = 1e9;
    g.gs.hatchEgg('gold', 0); // pup
    g.gs.hatchEgg('gold', 0.75); // emberbat
    g.gs.hatchEgg('gold', 0.99); // drake
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/09-arena-pets.png' });
});

test('twilight biome at stage 12', async ({ page }) => {
  await page.evaluate(() => window.__game.setWave(12, 3));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/04-biome.png' });
});

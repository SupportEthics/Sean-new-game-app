import { test } from '@playwright/test';

/** Captures review screenshots into screenshots/ (gitignored). */

interface GameHooks {
  addGold(n: number): void;
  setWave(stage: number, wave: number): void;
  gs: { grid: (number | null)[]; highestTier: number };
}

declare global {
  interface Window {
    __game: GameHooks;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__game !== undefined);
});

test('early game', async ({ page }) => {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'screenshots/01-early-game.png' });
});

test('mid game with populated grid', async ({ page }) => {
  await page.evaluate(() => {
    window.__game.addGold(1e6);
    // Hand-place a mid-game grid; the UI rebuilds on the next grid event
    const tiers = [8, 8, 7, 6, 5, 5, 4, 3, 3, 2, 1, 1];
    tiers.forEach((t, i) => (window.__game.gs.grid[i] = t));
    window.__game.gs.highestTier = 9;
  });
  // Buy through the UI so grid:changed fires and everything renders
  await page.mouse.click(390 / 2 - 92, 424 + 40);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'screenshots/02-mid-game.png' });
});

test('boss fight', async ({ page }) => {
  await page.evaluate(() => window.__game.setWave(5, 10));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/03-boss.png' });
});

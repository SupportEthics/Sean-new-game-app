import { expect, test } from '@playwright/test';

// Design-resolution coordinates map 1:1 to the 390x844 viewport (Scale.FIT).
const BUY_BUTTON = { x: 289, y: 761 }; // "Buy sword" card
const MERGE_BUTTON = { x: 62, y: 761 }; // "Auto Merge" toggle (merges once on enable)

declare global {
  interface Window {
    __uiReady?: boolean;
    __game: {
      gs: {
        gold: number;
        grid: (number | null)[];
        highestTier: number;
        battle: { stage: number };
        heroDps: number;
      };
      addGold: (n: number) => void;
      save: () => void;
      timeTravel: (h: number) => void;
    };
  }
}

// Playwright gives each test a fresh browser context, so saves are isolated.

test('boots without page errors and exposes the game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => window.__uiReady === true);
  // Let a few seconds of battle run
  await page.waitForTimeout(3000);

  expect(errors).toEqual([]);
  const gold = await page.evaluate(() => window.__game.gs.gold);
  expect(gold).toBeGreaterThan(0); // enemies died and paid out
});

test('buy button places gear on the grid and DPS rises', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__uiReady === true);

  const dpsBefore = await page.evaluate(() => window.__game.gs.heroDps);
  await page.evaluate(() => window.__game.addGold(1000));
  await page.mouse.click(BUY_BUTTON.x, BUY_BUTTON.y);

  await page.waitForFunction(
    () => window.__game.gs.grid.some((c) => c !== null),
  );
  const dpsAfter = await page.evaluate(() => window.__game.gs.heroDps);
  expect(dpsAfter).toBeGreaterThan(dpsBefore);
});

test('merge button combines two same-tier items', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__uiReady === true);

  await page.evaluate(() => window.__game.addGold(1000));
  await page.mouse.click(BUY_BUTTON.x, BUY_BUTTON.y);
  await page.mouse.click(BUY_BUTTON.x, BUY_BUTTON.y);
  await page.waitForFunction(
    () => window.__game.gs.grid.filter((c) => c !== null).length === 2,
  );

  await page.mouse.click(MERGE_BUTTON.x, MERGE_BUTTON.y);
  await page.waitForFunction(() => window.__game.gs.highestTier >= 2);

  const items = await page.evaluate(
    () => window.__game.gs.grid.filter((c) => c !== null),
  );
  expect(items).toEqual([2]);
});

test('progress survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__uiReady === true);

  await page.evaluate(() => {
    window.__game.addGold(123456);
    window.__game.save();
  });

  await page.reload();
  await page.waitForFunction(() => window.__uiReady === true);
  const gold = await page.evaluate(() => window.__game.gs.gold);
  expect(gold).toBeGreaterThanOrEqual(123456);
});

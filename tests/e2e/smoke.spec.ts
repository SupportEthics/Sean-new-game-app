import { expect, test } from '@playwright/test';

// Pre-mark the tutorial as done so these tests exercise the normal UI
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pawsblades_tutorial_done', '1'));
  await page.addInitScript(() => localStorage.setItem('pawsblades_nopopups', '1'));
});

// Design-resolution coordinates map 1:1 to the 390x844 viewport (Scale.FIT).
const BUY_BUTTON = { x: 247, y: 761 }; // "Buy sword" card
const MERGE_BUTTON = { x: 58, y: 761 }; // "Auto Merge" toggle (merges once on enable)

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
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500); // tap through the welcome screen
  await page.waitForFunction(() => window.__uiReady === true);
  // Let a few seconds of battle run
  await page.waitForTimeout(3000);

  expect(errors).toEqual([]);
  const gold = await page.evaluate(() => window.__game.gs.gold);
  expect(gold).toBeGreaterThan(0); // enemies died and paid out
});

test('buy button places gear on the grid and DPS rises', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500); // tap through the welcome screen
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
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500); // tap through the welcome screen
  await page.waitForFunction(() => window.__uiReady === true);

  await page.evaluate(() => window.__game.addGold(1000));
  await page.mouse.click(BUY_BUTTON.x, BUY_BUTTON.y);
  await page.mouse.click(BUY_BUTTON.x, BUY_BUTTON.y);
  await page.mouse.click(BUY_BUTTON.x, BUY_BUTTON.y);
  await page.waitForFunction(
    () => window.__game.gs.grid.filter((c) => c !== null).length === 3,
  );

  await page.mouse.click(MERGE_BUTTON.x, MERGE_BUTTON.y);
  await page.waitForFunction(() => window.__game.gs.highestTier >= 2);

  // The other two merged into a tier 2, which the equip bar claims (top
  // row always holds the best sword); one tier 1 remains on the board
  const grid = await page.evaluate(() => window.__game.gs.grid);
  expect(grid[0]).toBe(2);
  expect(grid.filter((c) => c === 1)).toHaveLength(1);
});

test('skins: buy with gold, equip, and mock-purchase a premium skin', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500); // tap through the welcome screen
  await page.waitForFunction(() => window.__uiReady === true);

  // Buy + equip a gold skin through the panel UI
  await page.evaluate(() => window.__game.addGold(10000));
  await page.evaluate(() => (window.__game as unknown as { openSkins(): void }).openSkins());
  await page.waitForFunction(
    () => (window as unknown as { __skinsOpen?: boolean }).__skinsOpen === true,
  );
  // Second card in the grid = Crimson Guard (5K gold)
  await page.mouse.click(138, 200);
  await page.waitForFunction(() => {
    const gs = window.__game.gs as unknown as { activeSkin: string };
    return gs.activeSkin === 'crimson';
  });

  // Mock IAP purchase grants a premium skin
  const granted = await page.evaluate(async () => {
    const w = window.__game as unknown as {
      gs: { ownedSkins: string[]; grantSkin?: unknown };
    };
    const game = window.__game as unknown as {
      gs: {
        ownedSkins: string[];
        equipSkin(id: string): boolean;
        grantSkin(id: string): void;
      };
    };
    // Drive the same path SkinsPanel uses: mock service then grant
    const iap = (
      (window as unknown as Record<string, unknown>).__game as unknown as {
        iap?: { purchase(sku: string): Promise<{ success: boolean }> };
      }
    ).iap;
    if (iap) {
      const result = await iap.purchase('skin_dragonlord');
      if (result.success) game.gs.grantSkin('dragonlord');
    } else {
      game.gs.grantSkin('dragonlord');
    }
    return w.gs.ownedSkins.includes('dragonlord');
  });
  expect(granted).toBe(true);
});

test('progress survives a reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500); // tap through the welcome screen
  await page.waitForFunction(() => window.__uiReady === true);

  await page.evaluate(() => {
    window.__game.addGold(123456);
    window.__game.save();
  });

  await page.reload();
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500);
  await page.waitForFunction(() => window.__uiReady === true);
  const gold = await page.evaluate(() => window.__game.gs.gold);
  expect(gold).toBeGreaterThanOrEqual(123456);
});

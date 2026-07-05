import { expect, test } from '@playwright/test';

/**
 * Touch-oriented regressions (Sean's phone bug report): tab panels must open
 * from taps, panels must close from the X zone or a tap outside, and the
 * skins grid must scroll from a drag that starts on a card.
 */

test.use({ hasTouch: true });

declare global {
  interface Window {
    __uiReady?: boolean;
    __titleReady?: boolean;
    __skillsOpen?: boolean;
    __petsOpen?: boolean;
    __skinsOpen?: boolean;
  }
}

test.beforeEach(async ({ page }) => {
  // Pre-mark the tutorial as done so suites test the normal UI
  await page.addInitScript(() => localStorage.setItem('pawsblades_tutorial_done', '1'));
  await page.goto('/');
  await page.waitForFunction(() => window.__titleReady === true);
  await page.touchscreen.tap(195, 500);
  await page.waitForFunction(() => window.__uiReady === true);
});

test('side MENU expands and opens the quests panel', async ({ page }) => {
  await page.touchscreen.tap(30, 144); // MENU toggle (TOWN sits below it)
  await page.waitForTimeout(300);
  await page.touchscreen.tap(88, 260); // QUESTS inside the fanned-out row
  await page.waitForFunction(
    () => (window as unknown as { __questsOpen?: boolean }).__questsOpen === true,
  );
});

test('skins wardrobe opens from the shop SKINS tab', async ({ page }) => {
  await page.touchscreen.tap(357, 812); // SHOP tab
  await page.waitForFunction(
    () => (window as unknown as { __shopOpen?: boolean }).__shopOpen === true,
  );
  await page.waitForTimeout(300);
  await page.touchscreen.tap(335, 165); // SKINS sub-tab
  await page.waitForTimeout(400);
  // Scroll to the bottom where the wardrobe row lives
  await page.mouse.move(195, 600);
  await page.mouse.down();
  for (let y = 600; y >= 260; y -= 40) {
    await page.mouse.move(195, y);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.touchscreen.tap(326, 704); // OPEN on the wardrobe row
  await page.waitForFunction(
    () => (window as unknown as { __skinsOpen?: boolean }).__skinsOpen === true,
  );
});

test('SKILLS and PET tabs open from touch taps', async ({ page }) => {
  await page.touchscreen.tap(97, 812);
  await page.waitForFunction(() => window.__skillsOpen === true);

  // Close via the enlarged X hit zone, then open the pet den
  await page.touchscreen.tap(356, 172);
  await page.waitForFunction(() => window.__skillsOpen === false);
  await page.touchscreen.tap(162, 812);
  await page.waitForFunction(() => window.__petsOpen === true);
});

test('a slow press on a tab keeps the panel open after release', async ({ page }) => {
  // Real fingers press for hundreds of ms: the panel opens on the down event,
  // and the later release lands on the new backdrop — which must NOT treat it
  // as a tap-outside-close.
  await page.mouse.move(97, 812);
  await page.mouse.down();
  await page.waitForFunction(() => window.__skillsOpen === true);
  await page.waitForTimeout(600); // held finger, panel fully created
  await page.mouse.up();
  await page.waitForTimeout(400);
  await expect(page.evaluate(() => window.__skillsOpen)).resolves.toBe(true);

  // A fresh tap on the backdrop still closes it
  await page.touchscreen.tap(195, 80);
  await page.waitForFunction(() => window.__skillsOpen === false);
});

test('tapping outside a panel closes it', async ({ page }) => {
  await page.touchscreen.tap(97, 812);
  await page.waitForFunction(() => window.__skillsOpen === true);
  await page.touchscreen.tap(195, 80); // above the panel, on the backdrop
  await page.waitForFunction(() => window.__skillsOpen === false);
});

test('awards list keeps its scroll while quest progress ticks in', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openQuests(): void }).openQuests(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __questsOpen?: boolean }).__questsOpen === true,
  );
  await page.waitForTimeout(400);
  await page.mouse.click(327, 212); // AWARDS tab
  await page.waitForTimeout(300);

  // Drag the list up
  await page.mouse.move(195, 500);
  await page.mouse.down();
  for (let y = 500; y >= 300; y -= 25) {
    await page.mouse.move(195, y);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();

  const readScroll = () =>
    page.evaluate(() => {
      const game = (window.__game as unknown as { game: Phaser.Game }).game;
      return (game.scene.getScene('Quests') as unknown as { scrollY: number }).scrollY;
    });
  const scrolled = await readScroll();
  expect(scrolled).toBeGreaterThan(50);

  // Battle progress fires quests:changed and rebuilds the rows — the
  // player's scroll position must survive it
  await page.evaluate(() => {
    (window.__game as unknown as { gs: { trackQuest(id: string, n: number): void } }).gs.trackQuest(
      'kills',
      7,
    );
  });
  await page.waitForTimeout(300);
  await expect(readScroll()).resolves.toBeCloseTo(scrolled, 0);
});

test('skins grid scrolls from a drag that starts on a card', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openSkins(): void }).openSkins(),
  );
  await page.waitForFunction(() => window.__skinsOpen === true);
  await page.waitForTimeout(400);

  // Drag upward starting ON a skin card (this used to do nothing)
  await page.mouse.move(138, 400);
  await page.mouse.down();
  for (let y = 400; y >= 240; y -= 20) {
    await page.mouse.move(138, y);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();

  const scrollY = await page.evaluate(() => {
    const game = (window.__game as unknown as { game: Phaser.Game }).game;
    return (game.scene.getScene('Skins') as unknown as { scrollY: number }).scrollY;
  });
  expect(scrollY).toBeGreaterThan(50);

  // And the panel still closes afterwards (skins X sits at PANEL_Y 96)
  await page.touchscreen.tap(356, 116);
  await page.waitForFunction(() => window.__skinsOpen === false);
});

test('dragging a sword survives auto-merge firing mid-drag', async ({ page }) => {
  // Seed a board with mergeable pairs plus the sword we'll drag, then buy
  // through the UI so the grid renders
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { gold: number; grid: (number | null)[] };
      addGold(n: number): void;
    };
    g.addGold(1e9);
    g.gs.grid[0] = 9; // equipped, stays on the bar
    g.gs.grid[6] = 5; // the sword under the finger (not equipped)
    g.gs.grid[2] = 2;
    g.gs.grid[3] = 2; // fodder pairs for auto-merge to chew on
    g.gs.grid[4] = 3;
    g.gs.grid[5] = 3;
  });
  await page.mouse.click(247, 761); // BUY fires grid:changed -> render
  await page.waitForTimeout(300);

  // Switch auto-merge on (the 900ms ticker is already running)
  await page.evaluate(() => {
    const game = (window.__game as unknown as { game: Phaser.Game }).game;
    (game.scene.getScene('UI') as unknown as { autoMergeUntil: number }).autoMergeUntil =
      Date.now() + 60_000;
  });

  const cells = await page.evaluate(() => {
    const game = (window.__game as unknown as { game: Phaser.Game }).game;
    const ui = game.scene.getScene('UI') as unknown as {
      cellCenters: { x: number; y: number }[];
    };
    return { from: ui.cellCenters[6], to: ui.cellCenters[17] };
  });

  // Slow drag lasting ~2.7s: at least two auto-merge beats land mid-drag
  await page.mouse.move(cells.from.x, cells.from.y);
  await page.mouse.down();
  for (let i = 1; i <= 9; i++) {
    const x = cells.from.x + ((cells.to.x - cells.from.x) * i) / 9;
    const y = cells.from.y + ((cells.to.y - cells.from.y) * i) / 9;
    await page.mouse.move(x, y);
    await page.waitForTimeout(300);
  }

  // The card must still be alive and under the pointer, not snapped home
  const midDrag = await page.evaluate(() => {
    const game = (window.__game as unknown as { game: Phaser.Game }).game;
    const ui = game.scene.getScene('UI') as unknown as {
      draggingItem: { x: number; y: number; active: boolean } | null;
    };
    return ui.draggingItem
      ? { active: ui.draggingItem.active, x: ui.draggingItem.x, y: ui.draggingItem.y }
      : null;
  });
  expect(midDrag).not.toBeNull();
  expect(midDrag!.active).toBe(true);
  expect(Math.abs(midDrag!.x - cells.to.x)).toBeLessThan(8);

  await page.mouse.up();
  await page.waitForTimeout(300);

  // The drop landed: the tier-5 sword now lives in the target cell
  const landed = await page.evaluate(() => {
    const gs = (window.__game as unknown as { gs: { grid: (number | null)[] } }).gs;
    return { from: gs.grid[6], to: gs.grid[17] };
  });
  expect(landed.to).toBe(5);
  expect(landed.from).toBeNull();
});

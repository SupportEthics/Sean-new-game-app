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

test('side MENU expands and opens the skins panel', async ({ page }) => {
  await page.touchscreen.tap(30, 170); // MENU toggle
  await page.waitForTimeout(300);
  await page.touchscreen.tap(30, 228); // SKINS inside the fanned-out menu
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

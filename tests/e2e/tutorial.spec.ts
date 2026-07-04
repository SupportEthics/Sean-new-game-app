import { expect, test } from '@playwright/test';

/** Fresh saves get the guided intro: buy -> merge -> equip note -> done. */

declare global {
  interface Window {
    __titleReady?: boolean;
    __uiReady?: boolean;
    __tutorialStep?: string;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__titleReady === true);
  await page.mouse.click(195, 500);
  await page.waitForFunction(() => window.__uiReady === true);
});

test('tutorial walks a new player through buy and merge', async ({ page }) => {
  await expect(page.evaluate(() => window.__tutorialStep)).resolves.toBe('buy');
  await page.screenshot({ path: 'screenshots/18-tutorial.png' });

  await page.mouse.click(247, 761); // BUY
  await expect(page.evaluate(() => window.__tutorialStep)).resolves.toBe('merge');

  await page.mouse.click(247, 761); // BUY the second sword
  // Drag card 0 onto card 1 (cell centers from the 6x7 grid layout)
  await page.mouse.move(42, 424);
  await page.mouse.down();
  await page.mouse.move(104, 424, { steps: 8 });
  await page.mouse.up();
  await expect(page.evaluate(() => window.__tutorialStep)).resolves.toBe('equip');

  await page.mouse.click(346, 366); // GOT IT
  await expect(page.evaluate(() => window.__tutorialStep)).resolves.toBe('done');

  // Completion persists across a reload
  await page.reload();
  await page.waitForFunction(() => window.__titleReady === true);
  await page.mouse.click(195, 500);
  await page.waitForFunction(() => window.__uiReady === true);
  await expect(page.evaluate(() => window.__tutorialStep)).resolves.toBe('done');
});

test('tutorial can be skipped', async ({ page }) => {
  await expect(page.evaluate(() => window.__tutorialStep)).resolves.toBe('buy');
  await page.mouse.click(346, 366); // SKIP in the banner
  await expect(page.evaluate(() => window.__tutorialStep)).resolves.toBe('done');
});

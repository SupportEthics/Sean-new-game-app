import { test } from '@playwright/test';

/**
 * Captures App Store Connect IAP "review screenshots" into
 * screenshots/iap/. Retina (2x) so they clear Apple's 640x920 minimum.
 * Run: npx playwright test tests/e2e/iap-shots.spec.ts
 */

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 4 });

async function boot(page: import('@playwright/test').Page, suppressPopups = true): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('pawsblades_tutorial_done', '1'));
  if (suppressPopups) {
    await page.addInitScript(() => localStorage.setItem('pawsblades_nopopups', '1'));
  }
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500); // tap through the welcome screen
  await page.waitForFunction(() => (window as unknown as { __uiReady?: boolean }).__uiReady === true);
}

test("knights_membership card", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as unknown as { __game: { openShop(): void } }).__game.openShop());
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'screenshots/iap/knights_membership.png' });
});

test("knights_pass tab", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as unknown as { __game: { openQuests(): void } }).__game.openQuests());
  await page.waitForTimeout(600);
  await page.mouse.click(336, 212); // PASS tab (5th of 5)
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'screenshots/iap/knights_pass.png' });
});

test("founder_pack offer", async ({ page }) => {
  await boot(page, false); // founder popup is blocked while popups are suppressed
  await page.evaluate(() => {
    (window as unknown as { __game: { openFounder(): void } }).__game.openFounder();
  });
  await page.waitForFunction(
    () => (window as unknown as { __founderOpen?: boolean }).__founderOpen === true,
    { timeout: 8000 },
  );
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'screenshots/iap/founder_pack.png' });
});

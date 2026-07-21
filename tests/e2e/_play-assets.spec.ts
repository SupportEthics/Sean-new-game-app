import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Google Play listing assets. Captures six gallery scenes at 4x, then
 * letterboxes each onto a 1080x1920 (9:16) dark canvas — Play's accepted
 * phone-screenshot ratio (the raw 9:19.5 capture is too tall to upload
 * as-is). Raw frames also land in screenshots/play/raw/ for the feature
 * graphic composition.
 */

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 4 });

const RAW = path.resolve('screenshots/play/raw');
const OUT = path.resolve('screenshots/play');

async function boot(page: import('@playwright/test').Page, skipTitle = true): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('pawsblades_tutorial_done', '1'));
  await page.addInitScript(() => localStorage.setItem('pawsblades_nopopups', '1'));
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  if (!skipTitle) return;
  await page.mouse.click(195, 500);
  await page.waitForFunction(
    () => (window as unknown as { __uiReady?: boolean }).__uiReady === true,
  );
}

test.beforeAll(() => {
  fs.mkdirSync(RAW, { recursive: true });
});

test('capture: title', async ({ page }) => {
  await boot(page, false);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${RAW}/01-title.png` });
});

test('capture: battle with pets', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: Record<string, unknown> }).__game as {
      setStage(s: number): void;
      addGold(n: number): void;
      gs: { grid: (number | null)[]; highestTier: number; hatchEgg(k: string, r?: number): unknown; gold: number };
    };
    g.setStage(31);
    g.addGold(1e9);
    g.gs.hatchEgg('gold', 0);
    g.gs.hatchEgg('gold', 0.75);
    g.gs.hatchEgg('gold', 0.99);
    const tiers = [9, 9, 8, 7, 6, 6, 5, 4, 4, 3, 2, 2];
    tiers.forEach((t, i) => (g.gs.grid[i] = t));
    g.gs.highestTier = 10;
  });
  await page.mouse.click(247, 761); // buy so grid:changed fires
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${RAW}/02-battle.png` });
});

test('capture: shop', async ({ page }) => {
  await boot(page);
  await page.evaluate(() =>
    (window as unknown as { __game: { openShop(): void } }).__game.openShop(),
  );
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${RAW}/03-shop.png` });
});

test('capture: skins', async ({ page }) => {
  await boot(page);
  await page.evaluate(() =>
    (window as unknown as { __game: { openSkins(): void } }).__game.openSkins(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __skinsOpen?: boolean }).__skinsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${RAW}/04-skins.png` });
});

test('capture: town', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (
      window as unknown as {
        __game: { gs: { townBuildings: Record<string, number> }; openTown(): void };
      }
    ).__game;
    g.gs.townBuildings = { farm: 14, blacksmith: 11, mine: 9, jeweler: 6, keep: 12 };
    g.openTown();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${RAW}/05-town.png` });
});

test('capture: pets', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const g = (window as unknown as { __game: Record<string, unknown> }).__game as {
      gs: { pets: Record<string, number>; petStages: Record<string, number>; gems: number };
      openPets(): void;
    };
    g.gs.pets = { pup: 10, emberbat: 6, drake: 3 };
    g.gs.petStages = { pup: 2, emberbat: 1 };
    g.gs.gems = 500;
    g.openPets();
  });
  await page.waitForFunction(
    () => (window as unknown as { __petsOpen?: boolean }).__petsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${RAW}/06-pets.png` });
});

test('letterbox all to 1080x1920', async ({ page }) => {
  const names = fs.readdirSync(RAW).filter((f) => f.endsWith('.png'));
  for (const name of names) {
    const src = fs.readFileSync(path.join(RAW, name)).toString('base64');
    const out = await page.evaluate(
      async ({ dataUrl }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const w = 1080;
        const h = 1920;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#14101c';
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const s = Math.min(w / img.width, h / img.height);
        const dw = img.width * s;
        const dh = img.height * s;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        return canvas.toDataURL('image/jpeg', 0.92);
      },
      { dataUrl: `data:image/png;base64,${src}` },
    );
    fs.writeFileSync(
      path.join(OUT, name.replace('.png', '-1080x1920.jpg')),
      Buffer.from(out.replace(/^data:image\/jpeg;base64,/, ''), 'base64'),
    );
  }
});

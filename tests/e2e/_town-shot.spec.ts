import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Captures the walkable Town for the App Store listing gallery and writes
 * it at EXACTLY 1284x2778 (6.5" spec — same aspect as the 390x844 design,
 * so the stretch is distortion-free). Two shots: the town gate/lane, and
 * scrolled up to the Knight's Keep castle.
 */

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 4 });

const OUT = { w: 1284, h: 2778 };

test('town listing screenshots', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pawsblades_tutorial_done', '1'));
  await page.addInitScript(() => localStorage.setItem('pawsblades_nopopups', '1'));
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500);
  await page.waitForFunction(
    () => (window as unknown as { __uiReady?: boolean }).__uiReady === true,
  );

  // A lived-in town: levelled buildings (keep 10+ shows the grander castle)
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
  await page.screenshot({ path: 'screenshots/iap/town-raw-gate.png' });

  // Drag upward to walk the camera to the castle at the top of the lane
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(195, 300);
    await page.mouse.down();
    await page.mouse.move(195, 700, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/iap/town-raw-castle.png' });

  // Resize both to the exact 6.5" store spec as flattened JPEGs
  const dir = path.resolve('screenshots/iap');
  const outDir = path.join(dir, 'store');
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of ['town-raw-gate', 'town-raw-castle']) {
    const src = fs.readFileSync(path.join(dir, `${name}.png`)).toString('base64');
    const out = await page.evaluate(
      async ({ dataUrl, w, h }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#14101c';
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.92);
      },
      { dataUrl: `data:image/png;base64,${src}`, w: OUT.w, h: OUT.h },
    );
    fs.writeFileSync(
      path.join(outDir, `${name.replace('raw-', '')}-1284x2778.jpg`),
      Buffer.from(out.replace(/^data:image\/jpeg;base64,/, ''), 'base64'),
    );
  }
});

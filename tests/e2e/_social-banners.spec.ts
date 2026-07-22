import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Social profile banners composed from the 4x title capture
 * (screenshots/play/raw/01-title.png): X/Twitter header 1500x500 and
 * YouTube channel art 2560x1440 (content kept inside the 1546x423 safe
 * area). Output: screenshots/social/.
 */

test('compose social banners', async ({ page }) => {
  const raw = fs
    .readFileSync(path.resolve('screenshots/play/raw/01-title.png'))
    .toString('base64');
  const outDir = path.resolve('screenshots/social');
  fs.mkdirSync(outDir, { recursive: true });

  const results = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    function makeCanvas(w: number, h: number) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      // brick backdrop stretched to fill
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 2350, 1560, 600, 0, 0, w, h);
      ctx.imageSmoothingEnabled = false; // pixel layers stay crisp
      return { c, ctx };
    }

    // X / Twitter header 1500x500
    const x = makeCanvas(1500, 500);
    x.ctx.drawImage(img, 200, 575, 1200, 480, 70, 80, 780, 312); // logo
    x.ctx.drawImage(img, 520, 1875, 505, 55, 250, 412, 420, 46); // tagline
    x.ctx.drawImage(img, 640, 1115, 310, 545, 1150, 60, 216, 380); // knight

    // YouTube channel art 2560x1440 — safe area is centered 1546x423
    const y = makeCanvas(2560, 1440);
    // safe area spans x 507..2053, y 508..931
    y.ctx.drawImage(img, 200, 575, 1200, 480, 620, 540, 850, 340); // logo
    y.ctx.drawImage(img, 520, 1875, 505, 55, 800, 890, 380, 41); // tagline
    y.ctx.drawImage(img, 640, 1115, 310, 545, 1590, 530, 216, 380); // knight

    return {
      x: x.c.toDataURL('image/png'),
      y: y.c.toDataURL('image/png'),
    };
  }, `data:image/png;base64,${raw}`);

  const strip = (s: string) => s.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(outDir, 'x-header-1500x500.png'), Buffer.from(strip(results.x), 'base64'));
  fs.writeFileSync(path.join(outDir, 'youtube-banner-2560x1440.png'), Buffer.from(strip(results.y), 'base64'));
});

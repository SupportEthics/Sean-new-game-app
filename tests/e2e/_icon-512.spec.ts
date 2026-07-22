import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/** Play Console wants a 512x512 icon; downscale resources/icon-1024.png. */
test('export 512x512 Play icon', async ({ page }) => {
  const src = fs.readFileSync(path.resolve('resources/icon-1024.png')).toString('base64');
  const out = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, 512, 512);
    return canvas.toDataURL('image/png');
  }, `data:image/png;base64,${src}`);
  fs.writeFileSync(
    path.resolve('screenshots/play/play-icon-512.png'),
    Buffer.from(out.replace(/^data:image\/png;base64,/, ''), 'base64'),
  );
});

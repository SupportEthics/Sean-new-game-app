import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Composes the Google Play feature graphic (required, exactly 1024x500)
 * from the 4x title-screen capture: brick backdrop + logo + tagline on
 * the left, the hero knight on the right. Output:
 * screenshots/play/play-feature-graphic.png
 */

test('compose 1024x500 feature graphic', async ({ page }) => {
  const raw = fs
    .readFileSync(path.resolve('screenshots/play/raw/01-title.png'))
    .toString('base64');
  const out = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    // Brick backdrop: clean patch below the knight, stretched to cover
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 2400, 1560, 500, 0, 0, 1024, 500);
    // Pixel art layers keep hard edges
    ctx.imageSmoothingEnabled = false;
    // Logo (incl. torches): source x200 y575 w1200 h480 -> 660x264 at left
    ctx.drawImage(img, 200, 575, 1200, 480, 44, 80, 660, 264);
    // Tagline "A DARK IDLE RPG": source x520 y1875 w505 h55 -> under logo
    ctx.drawImage(img, 520, 1875, 505, 55, 200, 392, 353, 38);
    // Knight: source x640 y1115 w310 h545 -> right side
    ctx.drawImage(img, 640, 1115, 310, 545, 772, 65, 210, 369);
    return canvas.toDataURL('image/png');
  }, `data:image/png;base64,${raw}`);
  fs.writeFileSync(
    path.resolve('screenshots/play/play-feature-graphic.png'),
    Buffer.from(out.replace(/^data:image\/png;base64,/, ''), 'base64'),
  );
});

import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Resizes the raw IAP captures in screenshots/iap/ to EXACTLY 1290x2796 —
 * the App Store 6.7" screenshot spec that App Store Connect's "App Review
 * Screenshot" field accepts. Uses the browser's own canvas (no native
 * image libs installed). Output: screenshots/iap/store/<name>.png
 */

const NAMES = ['knights_membership', 'founder_pack', 'knights_pass'];
const TARGET = { w: 1290, h: 2796 };

test('resize IAP shots to 1290x2796', async ({ page }) => {
  const dir = path.resolve('screenshots/iap');
  const outDir = path.join(dir, 'store');
  fs.mkdirSync(outDir, { recursive: true });

  for (const name of NAMES) {
    const src = fs.readFileSync(path.join(dir, `${name}.png`)).toString('base64');
    const dataUrl = `data:image/png;base64,${src}`;
    const out = await page.evaluate(
      async ({ dataUrl, w, h }) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL('image/png');
      },
      { dataUrl, w: TARGET.w, h: TARGET.h },
    );
    const b64 = out.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(b64, 'base64'));
  }
});

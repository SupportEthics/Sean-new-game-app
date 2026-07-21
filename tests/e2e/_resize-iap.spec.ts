import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Converts the raw IAP captures in screenshots/iap/ into flattened JPEGs
 * (no alpha channel — App Store Connect upload fields can silently reject
 * PNGs with transparency) at the two sizes the IAP "App Review Screenshot"
 * field accepts:
 *   - 1290x2796 (6.7" iPhone screenshot spec)
 *   - 640x920  (the classic IAP review-screenshot spec; letterboxed on a
 *     dark background because its aspect differs from the phone's)
 * Output: screenshots/iap/store/<name>-<size>.jpg
 */

const NAMES = ['knights_membership', 'founder_pack', 'knights_pass'];
const SIZES = [
  { w: 1290, h: 2796, fit: 'stretch' as const },
  { w: 640, h: 920, fit: 'contain' as const },
];

test('flattened JPEGs at accepted IAP sizes', async ({ page }) => {
  const dir = path.resolve('screenshots/iap');
  const outDir = path.join(dir, 'store');
  fs.mkdirSync(outDir, { recursive: true });

  for (const name of NAMES) {
    const src = fs.readFileSync(path.join(dir, `${name}.png`)).toString('base64');
    const dataUrl = `data:image/png;base64,${src}`;
    for (const size of SIZES) {
      const out = await page.evaluate(
        async ({ dataUrl, w, h, fit }) => {
          const img = new Image();
          img.src = dataUrl;
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#14101c'; // flatten: dark backdrop, no alpha
          ctx.fillRect(0, 0, w, h);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          if (fit === 'contain') {
            const s = Math.min(w / img.width, h / img.height);
            const dw = img.width * s;
            const dh = img.height * s;
            ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
          } else {
            ctx.drawImage(img, 0, 0, w, h);
          }
          return canvas.toDataURL('image/jpeg', 0.92);
        },
        { dataUrl, w: size.w, h: size.h, fit: size.fit },
      );
      const b64 = out.replace(/^data:image\/jpeg;base64,/, '');
      fs.writeFileSync(
        path.join(outDir, `${name}-${size.w}x${size.h}.jpg`),
        Buffer.from(b64, 'base64'),
      );
    }
  }
});

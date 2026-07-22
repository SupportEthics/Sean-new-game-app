import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Blank 1080x1920 background cards for the builder account's text beats
 * (TikTok TTS only reads in-editor text, so the cards ship empty).
 * Three variants on the account's teal/orange palette.
 */

test('compose blank text cards', async ({ page }) => {
  const results = await page.evaluate(() => {
    const W = 1080;
    const H = 1920;

    function base() {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b2530');
      g.addColorStop(1, '#123642');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      return { c, ctx };
    }

    function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = '#ffe8c9') {
      ctx.fillStyle = color;
      ctx.fillRect(x - s / 2, y - s * 1.5, s, s * 3);
      ctx.fillRect(x - s * 1.5, y - s / 2, s * 3, s);
    }

    function laptop(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number) {
      const GRID = [
        'SSSSSSSSSSSS',
        'SssssssssssS',
        'Sssss##ssssS',
        'Ssss#ss#sssS',
        'Ssssss#ssssS',
        'Sssss#sssssS',
        'SssssssssssS',
        'Sssss#sssssS',
        'SSSSSSSSSSSS',
      ];
      const COLORS: Record<string, string> = { S: '#22303f', s: '#0d3b45', '#': '#ff9f43' };
      const w = GRID[0].length * cell;
      const x0 = cx - w / 2;
      const y0 = cy;
      ctx.fillStyle = '#061820';
      ctx.fillRect(x0 - 6, y0 - 6, w + 12, GRID.length * cell + 12);
      for (let y = 0; y < GRID.length; y++)
        for (let x = 0; x < GRID[y].length; x++) {
          ctx.fillStyle = COLORS[GRID[y][x]];
          ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
        }
      // base bar
      ctx.fillStyle = '#061820';
      ctx.fillRect(x0 - cell - 6, y0 + GRID.length * cell - 2, w + cell * 2 + 12, cell + 10);
      ctx.fillStyle = '#31465c';
      ctx.fillRect(x0 - cell, y0 + GRID.length * cell, w + cell * 2, cell);
    }

    const out: Record<string, string> = {};

    // 1: plain gradient (nothing else — maximum text room)
    {
      const { c } = base();
      out['card-plain'] = c.toDataURL('image/png');
    }

    // 2: sparkles only (corners, away from centre text zone)
    {
      const { c, ctx } = base();
      sparkle(ctx, 140, 260, 16);
      sparkle(ctx, 950, 180, 10);
      sparkle(ctx, 120, 1700, 10);
      sparkle(ctx, 940, 1640, 16);
      sparkle(ctx, 540, 120, 8);
      out['card-sparkles'] = c.toDataURL('image/png');
    }

    // 3: small laptop mark at the bottom (brand card / end card)
    {
      const { c, ctx } = base();
      sparkle(ctx, 160, 300, 12);
      sparkle(ctx, 930, 240, 10);
      laptop(ctx, W / 2, 1560, 18);
      out['card-laptop'] = c.toDataURL('image/png');
    }

    return out;
  });

  const dir = path.resolve('screenshots/social/text-cards');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, dataUrl] of Object.entries(results)) {
    fs.writeFileSync(
      path.join(dir, `${name}-1080x1920.png`),
      Buffer.from((dataUrl as string).replace(/^data:image\/png;base64,/, ''), 'base64'),
    );
  }
});

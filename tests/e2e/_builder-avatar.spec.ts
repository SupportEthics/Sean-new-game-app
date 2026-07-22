import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Avatar for the faceless "not a developer" builder account. Drawn from
 * scratch (NO Soulforge Knight assets or palette): a chunky pixel laptop
 * with a glowing "?" on screen, deep-teal backdrop, orange accents.
 * 1024x1024 -> screenshots/social/builder-avatar-1024.png
 */

test('compose builder avatar', async ({ page }) => {
  const out = await page.evaluate(() => {
    const GRID = [
      '....................',
      '.o..................',
      'ooo............o....',
      '.o..SSSSSSSSSSSS....',
      '....Ssss####sssS....',
      '....Sss##ss##ssS....',
      '....Sssssss##ssS....',
      '....Ssssss##sssS....',
      '....Sssss##ssssS....',
      '....Sssss##ssssS....',
      '....SssssssssssS....',
      '....Sssss##ssssS....',
      '....SssssssssssS....',
      '....SSSSSSSSSSSS....',
      '..BBBBBBBBBBBBBBBB..',
      '..BkBkBkBkBkBkBkBB..',
      '...BBBBBBBBBBBBBB...',
      '....................',
      '..............o.....',
      '.....o..............',
    ];
    const COLORS: Record<string, string> = {
      S: '#22303f', // laptop frame, dark slate
      s: '#0d3b45', // screen glow, deep teal
      '#': '#ff9f43', // orange question mark
      B: '#31465c', // base/keyboard deck
      k: '#22303f', // key dots
      o: '#ffe8c9', // cream sparkles
    };
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext('2d')!;
    // backdrop: deep teal with a subtle vertical lift
    const g = ctx.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, '#0b2530');
    g.addColorStop(1, '#123642');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
    const cell = 1024 / 20;
    // dark outline pass: fatten every non-bg cell
    for (let y = 0; y < GRID.length; y++)
      for (let x = 0; x < GRID[y].length; x++) {
        const ch = GRID[y][x];
        if (ch !== '.' && ch !== 'o') {
          ctx.fillStyle = '#061820';
          ctx.fillRect(x * cell - 6, y * cell - 6, cell + 12, cell + 12);
        }
      }
    // color pass
    for (let y = 0; y < GRID.length; y++)
      for (let x = 0; x < GRID[y].length; x++) {
        const ch = GRID[y][x];
        if (ch === '.') continue;
        ctx.fillStyle = COLORS[ch];
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    return c.toDataURL('image/png');
  });
  fs.mkdirSync(path.resolve('screenshots/social'), { recursive: true });
  fs.writeFileSync(
    path.resolve('screenshots/social/builder-avatar-1024.png'),
    Buffer.from(out.replace(/^data:image\/png;base64,/, ''), 'base64'),
  );
});

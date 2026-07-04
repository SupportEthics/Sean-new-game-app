// Generates the native app icon + splash screens for the Capacitor shells,
// hand-plotted in the same pixel style as the game (no external tools —
// sharp/@capacitor/assets can't run in every environment, pngjs can).
//
//   node scripts/generate-store-assets.mjs
//
// Outputs straight into android/app/src/main/res and ios/App/App/Assets.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PNG } from 'pngjs';
import { Pix } from './pixel.mjs';

const BG_DARK = '#241a2e';
const BG_EDGE = '#1a1322';

// ---------- Icon art (48x48 logical) ----------

/** Opaque backdrop: dark vignette + gold frame. */
function iconBg() {
  const p = new Pix(48, 48);
  p.rect(0, 0, 48, 48, BG_EDGE);
  p.ellipse(24, 24, 26, 26, BG_DARK);
  p.ellipse(24, 22, 18, 18, '#2f2138');
  // Gold frame, chunky enough to survive tiny sizes
  p.rect(1, 1, 46, 2, '#c99a2e');
  p.rect(1, 45, 46, 2, '#c99a2e');
  p.rect(1, 1, 2, 46, '#c99a2e');
  p.rect(45, 1, 2, 46, '#c99a2e');
  p.rect(1, 1, 46, 1, '#ffd166');
  p.rect(1, 1, 1, 46, '#ffd166');
  return p;
}

/** Transparent foreground: gold sword behind a great helm with red plume. */
function iconFg() {
  const p = new Pix(48, 48);

  // Diagonal sword, bottom-left to top-right
  for (const [dx, dy, c] of [
    [0, 0, '#ffd166'],
    [1, 0, '#c99a2e'],
    [0, 1, '#8a6a1e'],
  ]) {
    p.line(9 + dx, 40 + dy, 38 + dx, 11 + dy, c);
  }
  p.tri(38, 8, 41, 11, 36, 13, '#ffe8a0'); // tip
  p.line(13, 33, 19, 39, '#6b4423'); // crossguard
  p.rect(10, 40, 3, 3, '#5c3a1c'); // grip stub
  p.set(40, 9, '#ffffff'); // glint

  // Plume
  p.domeEllipse(24, 9, 10, 4, ['#e0705c', '#c2482e', '#8a2e1c']);
  p.rect(14, 9, 20, 2, '#8a2e1c');

  // Helm dome + skirt
  p.domeEllipse(24, 20, 11, 10, ['#e8ecf2', '#aab4c0', '#6f7378']);
  p.cylRect(13, 20, 22, 15, ['#c9ced4', '#9aa0a6', '#6f7378']);

  // Gold band where dome meets skirt
  p.rect(13, 18, 22, 2, '#c99a2e');
  p.rect(13, 18, 22, 1, '#ffd166');

  // T-visor
  p.rect(15, 23, 18, 3, '#14101c');
  p.rect(22, 23, 4, 10, '#14101c');
  p.rect(15, 26, 2, 1, '#3a3f47'); // slit shading
  p.rect(31, 26, 2, 1, '#3a3f47');

  // Breather rivets
  for (const x of [17, 29]) {
    p.set(x, 29, '#565b63');
    p.set(x, 31, '#565b63');
  }
  // Bottom rim
  p.rect(13, 34, 22, 1, '#4a4f57');

  p.outline('#14101c');
  return p;
}

/** Composite fg over bg (both 48x48) into one opaque icon. */
function iconComposite() {
  const p = iconBg();
  p.stamp(iconFg(), 0, 0);
  return p;
}

// ---------- Scaling + writing ----------

/** Nearest-neighbour scale of a Pix onto an arbitrary pixel size. */
function scaleTo(pix, w, h, opaqueBg = null) {
  const png = new PNG({ width: w, height: h });
  const bg = opaqueBg ? colorOf(opaqueBg) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(pix.w - 1, Math.floor((x * pix.w) / w));
      const sy = Math.min(pix.h - 1, Math.floor((y * pix.h) / h));
      const src = pix.get(sx, sy);
      const di = (y * w + x) * 4;
      if (src && src[3] > 0) {
        png.data[di] = src[0];
        png.data[di + 1] = src[1];
        png.data[di + 2] = src[2];
        png.data[di + 3] = 255;
      } else if (bg) {
        png.data[di] = bg[0];
        png.data[di + 1] = bg[1];
        png.data[di + 2] = bg[2];
        png.data[di + 3] = 255;
      }
    }
  }
  return png;
}

function colorOf(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function write(path, png) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
  console.log(`wrote ${path} (${png.width}x${png.height})`);
}

/** Splash: dark field with the icon art floating slightly above centre. */
function splash(w, h) {
  const png = new PNG({ width: w, height: h });
  const [r, g, b] = colorOf('#2a1c10');
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = r;
    png.data[i + 1] = g;
    png.data[i + 2] = b;
    png.data[i + 3] = 255;
  }
  const art = iconComposite();
  // Keep art inside the smallest crop any device makes of this splash
  const size = Math.floor(Math.min(w, h) / 4 / 48) * 48 || 48;
  const scale = size / 48;
  const ox = Math.floor((w - size) / 2);
  const oy = Math.floor((h - size) / 2) - Math.floor(h * 0.02);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = art.get(Math.floor(x / scale), Math.floor(y / scale));
      if (!src || src[3] === 0) continue;
      const di = ((oy + y) * w + (ox + x)) * 4;
      png.data[di] = src[0];
      png.data[di + 1] = src[1];
      png.data[di + 2] = src[2];
      png.data[di + 3] = 255;
    }
  }
  return png;
}

// ---------- Outputs ----------

const composite = iconComposite();
const fg = iconFg();

// Reference + review copies
write('resources/icon-1024.png', scaleTo(composite, 1024, 1024, BG_EDGE));

// iOS single universal icon (must be opaque)
write(
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  scaleTo(composite, 1024, 1024, BG_EDGE),
);

// Android legacy + round launchers
const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [dpi, size] of Object.entries(LAUNCHER)) {
  const png = scaleTo(composite, size, size, BG_EDGE);
  write(`android/app/src/main/res/mipmap-${dpi}/ic_launcher.png`, png);
  write(`android/app/src/main/res/mipmap-${dpi}/ic_launcher_round.png`, scaleTo(composite, size, size, BG_EDGE));
}

// Android adaptive foreground: art shrunk into the 66/108 safe zone,
// transparent surround (the background layer is @color/ic_launcher_background)
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const fgCanvas = new Pix(80, 80);
fgCanvas.stamp(fg, 16, 16);
for (const [dpi, size] of Object.entries(FOREGROUND)) {
  write(
    `android/app/src/main/res/mipmap-${dpi}/ic_launcher_foreground.png`,
    scaleTo(fgCanvas, size, size),
  );
}

// Android splash screens (same dimensions the Capacitor template ships)
const SPLASH_LAND = { mdpi: [480, 320], hdpi: [800, 480], xhdpi: [1280, 720], xxhdpi: [1600, 960], xxxhdpi: [1920, 1280] };
write('android/app/src/main/res/drawable/splash.png', splash(480, 320));
for (const [dpi, [w, h]] of Object.entries(SPLASH_LAND)) {
  write(`android/app/src/main/res/drawable-land-${dpi}/splash.png`, splash(w, h));
  write(`android/app/src/main/res/drawable-port-${dpi}/splash.png`, splash(h, w));
}

// iOS splash (one square image, three references in Contents.json)
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  write(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, splash(2732, 2732));
}

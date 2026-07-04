// Tiny pixel-canvas helper for authoring chunky pixel art in code.
// Draw on a small logical grid, then export scaled up with hard pixels.

import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Parse '#rrggbb' (or '#rrggbbaa') into [r,g,b,a]. */
export function rgba(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255,
  ];
}

/** Multiply the RGB channels of a hex color by `f` (0..1 darkens, >1 lightens). */
export function shade(hex, f) {
  const [r, g, b, a] = rgba(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (
    '#' +
    [c(r), c(g), c(b)].map((v) => v.toString(16).padStart(2, '0')).join('') +
    (a !== 255 ? a.toString(16).padStart(2, '0') : '')
  );
}

export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4);
  }

  set(x, y, hex) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = rgba(hex);
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  isOpaque(x, y) {
    return this.get(x, y)[3] > 0;
  }

  rect(x, y, w, h, hex) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, hex);
  }

  /** Filled ellipse centered at (cx, cy) with radii rx, ry. */
  ellipse(cx, cy, rx, ry, hex) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.05) this.set(x, y, hex);
      }
    }
  }

  circle(cx, cy, r, hex) {
    this.ellipse(cx, cy, r, r, hex);
  }

  /** Filled triangle. */
  tri(x1, y1, x2, y2, x3, y3, hex) {
    const minX = Math.floor(Math.min(x1, x2, x3));
    const maxX = Math.ceil(Math.max(x1, x2, x3));
    const minY = Math.floor(Math.min(y1, y2, y3));
    const maxY = Math.ceil(Math.max(y1, y2, y3));
    const edge = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const p = x + 0.5;
        const q = y + 0.5;
        const e1 = edge(x1, y1, x2, y2, p, q);
        const e2 = edge(x2, y2, x3, y3, p, q);
        const e3 = edge(x3, y3, x1, y1, p, q);
        if ((e1 >= 0 && e2 >= 0 && e3 >= 0) || (e1 <= 0 && e2 <= 0 && e3 <= 0))
          this.set(x, y, hex);
      }
    }
  }

  line(x1, y1, x2, y2, hex) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= steps; i++) {
      this.set(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps, hex);
    }
  }

  /** Darken every opaque pixel that borders a transparent one — soft outline. */
  edgeShade(factor = 0.55) {
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.isOpaque(x, y)) continue;
        if (
          !this.isOpaque(x - 1, y) ||
          !this.isOpaque(x + 1, y) ||
          !this.isOpaque(x, y - 1) ||
          !this.isOpaque(x, y + 1)
        )
          marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) {
      const [r, g, b, a] = this.get(x, y);
      const i = (y * this.w + x) * 4;
      this.data[i] = Math.round(r * factor);
      this.data[i + 1] = Math.round(g * factor);
      this.data[i + 2] = Math.round(b * factor);
      this.data[i + 3] = a;
    }
  }

  /** Set every transparent pixel that touches an opaque one — a glow halo. */
  halo(hex) {
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.isOpaque(x, y)) continue;
        if (
          this.isOpaque(x - 1, y) ||
          this.isOpaque(x + 1, y) ||
          this.isOpaque(x, y - 1) ||
          this.isOpaque(x, y + 1)
        )
          marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) this.set(x, y, hex);
  }

  /** Stamp another Pix onto this one at (ox, oy). */
  stamp(src, ox, oy) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const [r, g, b, a] = src.get(x, y);
        if (a === 0) continue;
        const i = ((y + oy) * this.w + (x + ox)) * 4;
        if (x + ox < 0 || x + ox >= this.w || y + oy < 0 || y + oy >= this.h) continue;
        this.data[i] = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
        this.data[i + 3] = a;
      }
    }
  }
}

/** Join frames horizontally into one sheet and write a PNG scaled by `scale`. */
export function writeSheet(path, frames, scale) {
  const fw = frames[0].w;
  const fh = frames[0].h;
  const png = new PNG({ width: fw * frames.length * scale, height: fh * scale });

  frames.forEach((frame, f) => {
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const [r, g, b, a] = frame.get(x, y);
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = (f * fw + x) * scale + sx;
            const py = y * scale + sy;
            const i = (py * png.width + px) * 4;
            png.data[i] = r;
            png.data[i + 1] = g;
            png.data[i + 2] = b;
            png.data[i + 3] = a;
          }
        }
      }
    }
  });

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
  console.log(`wrote ${path} (${png.width}x${png.height}, ${frames.length} frames)`);
}

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

  /**
   * Cylinder-shaded rect (light from the left): columns blend through the
   * ramp [highlight, base, shadow].
   */
  cylRect(x, y, w, h, ramp) {
    const [hi, base, dark] = ramp;
    for (let xx = 0; xx < w; xx++) {
      const t = w === 1 ? 0.5 : xx / (w - 1);
      const c = t < 0.28 ? hi : t < 0.72 ? base : dark;
      this.rect(x + xx, y, 1, h, c);
    }
  }

  /**
   * Dome-shaded ellipse (light from top-left): base fill, highlight lobe
   * upper-left, shadow crescent lower-right.
   */
  domeEllipse(cx, cy, rx, ry, ramp) {
    const [hi, base, dark] = ramp;
    this.ellipse(cx, cy, rx, ry, base);
    this.ellipse(cx + rx * 0.25, cy + ry * 0.3, rx * 0.8, ry * 0.72, dark);
    this.ellipse(cx - rx * 0.05, cy - ry * 0.05, rx * 0.78, ry * 0.72, base);
    this.ellipse(cx - rx * 0.3, cy - ry * 0.38, rx * 0.42, ry * 0.34, hi);
  }

  /** Sprinkle deterministic single-pixel texture over a rect region. */
  noise(x, y, w, h, hex, everyN = 7, seed = 0) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (((xx * 31 + yy * 17 + seed) % everyN) === 0 && this.isOpaque(xx, yy)) {
          this.set(xx, yy, hex);
        }
      }
    }
  }

  /**
   * Hard 1px outline: set every transparent pixel that touches an opaque one
   * (including diagonals) to `hex`. Author sprites with a 1px transparent
   * margin so the outline has room to grow.
   */
  outline(hex = '#14101c') {
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.isOpaque(x, y)) continue;
        let touch = false;
        for (let dy = -1; dy <= 1 && !touch; dy++) {
          for (let dx = -1; dx <= 1 && !touch; dx++) {
            if ((dx || dy) && this.isOpaque(x + dx, y + dy)) touch = true;
          }
        }
        if (touch) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) this.set(x, y, hex);
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

/** Return a copy of `src` with `n` pixels of transparent margin on every side. */
export function pad(src, n) {
  const p = new Pix(src.w + n * 2, src.h + n * 2);
  p.stamp(src, n, n);
  return p;
}

/**
 * Parse an ASCII pixel map into a Pix. Each character indexes `palette`;
 * '.' and ' ' are transparent. Rows may have trailing transparency omitted.
 */
export function fromMap(rows, palette) {
  const w = Math.max(...rows.map((r) => r.length));
  const p = new Pix(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const hex = palette[ch];
      if (!hex) throw new Error(`fromMap: no palette entry for '${ch}' at ${x},${y}`);
      p.set(x, y, hex);
    }
  });
  return p;
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

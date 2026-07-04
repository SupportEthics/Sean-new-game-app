// Hi-detail knight renderer (48x64 logical), parameterized per skin.
// art = {
//   armor: [hi, base, dark],   3-tone plate ramp
//   trim:  [hi, dark],         gold/metal accents
//   cape:  [base, dark] | null,
//   plume: 'plume' | 'mohawk' | 'crown' | 'hood' | 'none',
//   plumeColor: [base, dark],
//   visor: hex,                slit color (glow colors for spooky skins)
//   aura:  hex-with-alpha | null,
// }

import { pad, Pix } from './pixel.mjs';

export function knight(frame, art) {
  const p = new Pix(48, 64);
  const bob = frame === 1 ? 1 : 0; // idle breath
  const lean = frame === 2 ? 2 : 0; // attack lunge
  const oy = bob; // upper-body offset
  const ox = lean;

  const [aHi, aBase, aDark] = art.armor;
  const [tHi, tDark] = art.trim;
  const armor = [aHi, aBase, aDark];

  // ---- Cape (behind everything) ----
  if (art.cape) {
    const [cBase, cDark] = art.cape;
    // Flowing from shoulders down-left, wavy hem
    for (let y = 0; y < 30; y++) {
      const yy = 25 + oy + y;
      const sway = Math.round(Math.sin(y / 6 + frame) * 1.5);
      const left = 9 + Math.round(y * 0.12) + sway;
      const right = 20 + ox - Math.round(y * 0.14) + sway;
      if (right > left) p.rect(left, yy, right - left, 1, cBase);
      // fold shadows
      if (y % 5 === 2) p.rect(left + 1, yy, 2, 1, cDark);
      if (y % 7 === 3) p.rect(right - 3, yy, 2, 1, cDark);
    }
    // Hem notches
    for (let x = 10; x <= 18; x += 4) p.set(x, 54 + oy, cDark);
  }

  // ---- Legs (planted; no bob) ----
  p.cylRect(19, 46, 5, 12, armor);
  p.cylRect(28, 46, 5, 12, armor);
  // Knee plates
  p.rect(19, 50, 5, 1, aDark);
  p.rect(28, 50, 5, 1, aDark);
  p.set(21, 49, aHi);
  p.set(30, 49, aHi);

  // ---- Boots ----
  p.cylRect(18, 58, 7, 5, [aDark, aDark, '#1f2430']);
  p.cylRect(27, 58, 8, 5, [aDark, aDark, '#1f2430']);
  p.rect(24, 61, 2, 2, aDark); // right toe forward
  p.rect(33, 61, 2, 2, aDark);
  p.rect(18, 58, 7, 1, aBase);
  p.rect(27, 58, 8, 1, aBase);

  // ---- Faulds (armored skirt) ----
  p.cylRect(17 + ox, 41 + oy, 18, 5, armor);
  p.rect(17 + ox, 43 + oy, 18, 1, aDark); // plate seam
  p.rect(17 + ox, 45 + oy, 18, 1, aDark);

  // ---- Torso cuirass ----
  p.cylRect(17 + ox, 24 + oy, 18, 17, armor);
  // Waist taper: carve one column each side near the waist
  for (let y = 36; y <= 40; y++) {
    p.set(17 + ox, y + oy, '#00000000');
    p.set(34 + ox, y + oy, '#00000000');
  }
  // Center ridge + chest seam
  p.rect(26 + ox, 24 + oy, 1, 17, aDark);
  p.rect(18 + ox, 31 + oy, 16, 1, aDark);
  // Rivets
  p.set(19 + ox, 26 + oy, tHi);
  p.set(32 + ox, 26 + oy, tHi);
  p.set(19 + ox, 33 + oy, tHi);
  p.set(32 + ox, 33 + oy, tHi);
  // Emblem
  p.rect(24 + ox, 27 + oy, 5, 3, tDark);
  p.rect(25 + ox, 28 + oy, 3, 1, tHi);

  // ---- Belt ----
  p.rect(17 + ox, 40 + oy, 18, 2, tDark);
  p.rect(24 + ox, 40 + oy, 3, 2, tHi); // buckle

  // ---- Arms (at sides) ----
  p.cylRect(13 + ox, 26 + oy, 4, 11, armor);
  p.cylRect(35 + ox, 26 + oy, 4, 11, armor);
  // Gauntlets
  p.cylRect(13 + ox, 37 + oy, 4, 4, [aBase, aDark, aDark]);
  p.cylRect(35 + ox, 37 + oy, 4, 4, [aBase, aDark, aDark]);
  // Elbow seams
  p.rect(13 + ox, 32 + oy, 4, 1, aDark);
  p.rect(35 + ox, 32 + oy, 4, 1, aDark);

  // ---- Pauldrons ----
  p.domeEllipse(15 + ox, 25 + oy, 5, 4, armor);
  p.domeEllipse(37 + ox, 25 + oy, 5, 4, armor);
  p.set(15 + ox, 23 + oy, tHi);
  p.set(37 + ox, 23 + oy, tHi);

  // ---- Gorget ----
  p.rect(21 + ox, 21 + oy, 10, 3, aDark);
  p.rect(21 + ox, 21 + oy, 10, 1, aBase);

  // ---- Head ----
  const hx = 26 + ox;
  const hy = 13 + oy;
  if (art.plume === 'hood') {
    // Cloth hood with shadowed face + glowing eyes
    const [cBase, cDark] = art.plumeColor;
    p.domeEllipse(hx, hy + 1, 9, 9, [cBase, cBase, cDark]);
    p.ellipse(hx + 2, hy + 2, 6, 6, '#14101c'); // face shadow
    p.rect(hx - 1, hy + 1, 3, 2 - (frame === 2 ? 1 : 0), art.visor);
    p.rect(hx + 5, hy + 1, 3, 2 - (frame === 2 ? 1 : 0), art.visor);
    p.rect(hx - 7, hy + 6, 16, 2, cDark); // hood rim
  } else {
    // Steel helm
    p.domeEllipse(hx, hy, 9, 9, armor);
    p.rect(hx - 9, hy + 5, 18, 4, aBase); // jaw plate
    p.rect(hx - 9, hy + 8, 18, 1, aDark);
    // Visor slit (squints on attack)
    const slitH = frame === 2 ? 1 : 2;
    p.rect(hx - 5, hy + 1, 13, slitH, art.visor);
    p.rect(hx - 7, hy + 1, 2, slitH, aDark); // slit end caps
    // Brow ridge + crest line
    p.rect(hx - 8, hy - 1, 17, 1, aHi);
    p.rect(hx, hy - 8, 1, 6, aDark);
    // Breathing holes
    p.set(hx + 5, hy + 6, aDark);
    p.set(hx + 7, hy + 6, aDark);
  }

  // ---- Headgear ----
  const [pBase, pDark] = art.plumeColor;
  if (art.plume === 'plume') {
    // Curling plume sweeping back-left
    const arc = [
      [hx - 1, hy - 11], [hx - 3, hy - 12], [hx - 5, hy - 12], [hx - 7, hy - 11],
      [hx - 9, hy - 9], [hx - 10, hy - 7], [hx - 11, hy - 5],
    ];
    arc.forEach(([x, y], i) => {
      p.circle(x, y + bob, i < 4 ? 2 : 1.5, i % 2 ? pDark : pBase);
    });
    p.rect(hx - 1, hy - 10, 2, 3, pDark); // socket
  } else if (art.plume === 'mohawk') {
    for (let i = -6; i <= 6; i += 2) {
      const h = 5 - Math.abs(i) / 3;
      p.rect(hx + i, hy - 9 - h + bob, 2, h + 2, i % 4 === 0 ? pBase : pDark);
    }
  } else if (art.plume === 'crown') {
    p.rect(hx - 7, hy - 11 + bob, 15, 3, tDark);
    p.rect(hx - 7, hy - 11 + bob, 15, 1, tHi);
    for (const dx of [-6, -1, 4]) {
      p.tri(hx + dx, hy - 11 + bob, hx + dx + 3, hy - 11 + bob, hx + dx + 1.5, hy - 15 + bob, tDark);
      p.set(hx + dx + 1, hy - 14 + bob, tHi);
    }
    p.set(hx, hy - 10 + bob, pBase); // center gem
  }

  const out = pad(p, 2);
  out.outline();
  if (art.aura) {
    out.halo(art.aura);
    out.halo(art.aura.slice(0, 7) + '30'); // soft second ring
  }
  return out;
}

// Generates all game sprite sheets as chunky pixel art.
// Run: npm run assets  → writes committed PNGs into public/assets/.
// Each sheet is frames joined horizontally; scale 4 = one logical pixel is 4x4.

import { Pix, shade } from './pixel.mjs';
import { writeSheet } from './pixel.mjs';

const OUT = 'public/assets';
const SCALE = 4;

// ---------- Hero: hedgehog knight (20x20, frames: idle0, idle1, attack) ----------

function hero(frame) {
  const p = new Pix(20, 20);
  const bounce = frame === 1 ? 1 : 0; // idle1 squashes down a pixel
  const lean = frame === 2 ? 1 : 0; // attack leans forward

  const SPIKE = '#7a4a26';
  const SPIKE_HI = '#94603a';
  const BODY = '#f6d7a8';
  const BELLY = '#fbe8c8';

  // Spike ball (back half)
  const cx = 9 + lean;
  const cy = 11 + bounce;
  p.circle(cx, cy, 6.5, SPIKE);
  // Spikes: triangles pointing out on the back/top arc
  for (let a = 95; a <= 305; a += 30) {
    const rad = (a * Math.PI) / 180;
    const tx = cx + Math.cos(rad) * 9;
    const ty = cy + Math.sin(rad) * 9;
    const lrad = ((a - 12) * Math.PI) / 180;
    const rrad = ((a + 12) * Math.PI) / 180;
    p.tri(
      tx,
      ty,
      cx + Math.cos(lrad) * 5,
      cy + Math.sin(lrad) * 5,
      cx + Math.cos(rrad) * 5,
      cy + Math.sin(rrad) * 5,
      SPIKE,
    );
  }
  // A couple of lighter spike highlights
  p.set(cx - 6, cy - 5, SPIKE_HI);
  p.set(cx - 2, cy - 8, SPIKE_HI);
  p.set(cx - 8, cy, SPIKE_HI);

  // Face/body (front)
  const fx = 12 + lean;
  const fy = 12 + bounce;
  p.ellipse(fx, fy, 5.5, 5.5 - bounce * 0.5, BODY);
  p.ellipse(fx + 1, fy + 2, 3.5, 2.5, BELLY);

  // Feet
  p.rect(9 + lean, 18, 3, 2, shade(BODY, 0.75));
  p.rect(14 + lean, 18, 3, 2, shade(BODY, 0.75));

  // Ears
  p.tri(fx - 3, fy - 5, fx - 1, fy - 7 + bounce, fx, fy - 4, shade(BODY, 0.85));

  // Blush
  p.set(fx - 3, fy + 2, '#f4a4a4');
  p.set(fx + 4, fy + 2, '#f4a4a4');

  // Eyes: big dark dots + white specular pixel (the cuteness formula)
  const squint = frame === 2 ? 1 : 0;
  p.rect(fx - 2, fy - 1 + squint, 2, 2 - squint, '#2e2348');
  p.rect(fx + 2, fy - 1 + squint, 2, 2 - squint, '#2e2348');
  if (!squint) {
    p.set(fx - 2, fy - 1, '#ffffff');
    p.set(fx + 2, fy - 1, '#ffffff');
  }

  // Nose
  p.set(fx + 5, fy + 1, '#e86a92');
  p.set(fx + 4, fy + 1, '#e86a92');

  p.edgeShade(0.6);
  return p;
}

// ---------- Enemies (16x16, 2 frames each) ----------

function slime(frame) {
  const p = new Pix(16, 16);
  const C = '#7ed957';
  const squish = frame === 1;
  p.ellipse(8, squish ? 11 : 10, squish ? 7 : 6, squish ? 4 : 5, C);
  p.rect(2, 12, 12, 3, C); // flat wide bottom
  p.ellipse(5, squish ? 9 : 8, 1.5, 1.5, shade(C, 1.3)); // glossy highlight
  face(p, 8, 11, squish);
  p.edgeShade(0.6);
  return p;
}

function carrot(frame) {
  const p = new Pix(16, 16);
  const C = '#ff9950';
  const sway = frame === 1 ? 1 : 0;
  // Leaves
  p.tri(6, 1 + sway, 8, 5, 4, 4, '#5cbf5c');
  p.tri(10 - sway, 1, 8, 5, 12, 4, '#4cae4c');
  // Body: cone pointing down
  p.tri(3, 5, 13, 5, 8, 15, C);
  p.rect(4, 5, 8, 2, shade(C, 1.1));
  face(p, 8, 9, false);
  p.edgeShade(0.6);
  return p;
}

function mushroom(frame) {
  const p = new Pix(16, 16);
  const CAP = '#e86a92';
  const tilt = frame === 1 ? 1 : 0;
  // Stem
  p.rect(5, 8, 6, 6, '#fbe8c8');
  // Cap
  p.ellipse(8, 6 - tilt, 7, 4, CAP);
  p.set(5, 4 - tilt, '#ffffff');
  p.set(10, 5 - tilt, '#ffffff');
  p.set(7, 3 - tilt, '#ffffff');
  face(p, 8, 11, false);
  p.edgeShade(0.6);
  return p;
}

function bat(frame) {
  const p = new Pix(16, 16);
  const C = '#9b7ede';
  const BODY = '#ab8eee';
  const up = frame === 0;
  // Wings: big clean triangles anchored to the body sides
  if (up) {
    p.tri(0, 3, 5, 7, 4, 12, C);
    p.tri(15, 3, 10, 7, 11, 12, C);
  } else {
    p.tri(0, 13, 5, 8, 4, 12, C);
    p.tri(15, 13, 10, 8, 11, 12, C);
  }
  // Ears
  p.tri(5, 2, 7, 6, 4, 6, BODY);
  p.tri(10, 2, 8, 6, 11, 6, BODY);
  // Body
  p.circle(8, 9, 4.5, BODY);
  face(p, 8, 9, false);
  // Fangs
  p.set(7, 12, '#ffffff');
  p.set(9, 12, '#ffffff');
  p.edgeShade(0.6);
  return p;
}

function crab(frame) {
  const p = new Pix(16, 16);
  const C = '#ff6b6b';
  const raise = frame === 1 ? 1 : 0;
  // Claws
  p.circle(2, 8 - raise, 2, C);
  p.circle(14, 8 - raise, 2, C);
  p.set(2, 6 - raise, '#00000000');
  p.set(14, 6 - raise, '#00000000'); // claw notches
  // Legs
  p.line(4, 13, 2, 15, shade(C, 0.8));
  p.line(12, 13, 14, 15, shade(C, 0.8));
  // Eye stalks
  p.line(6, 7, 6, 5, shade(C, 0.85));
  p.line(10, 7, 10, 5, shade(C, 0.85));
  p.set(6, 4, '#2e2348');
  p.set(10, 4, '#2e2348');
  // Body
  p.ellipse(8, 11, 5.5, 3.5, C);
  p.ellipse(8, 10, 3, 1.5, shade(C, 1.15));
  // Mouth
  p.set(7, 12, '#2e2348');
  p.set(8, 12, '#2e2348');
  p.edgeShade(0.6);
  return p;
}

function ghost(frame) {
  const p = new Pix(16, 16);
  const C = '#cfe9f5';
  const off = frame === 1 ? 1 : 0;
  p.ellipse(8, 8 - off, 5, 6, C);
  p.rect(3, 8 - off, 11, 4, C);
  // Wavy bottom: alternating teeth
  for (let x = 3; x <= 13; x += 2) {
    const drop = (x / 2 + frame) % 2 === 0 ? 2 : 0;
    p.rect(x, 12 - off, 2, 1 + drop, C);
  }
  face(p, 8, 8 - off, false);
  // Little "boo" mouth
  p.set(8, 10 - off, '#2e2348');
  p.edgeShade(0.65);
  return p;
}

/** Shared grumpy-cute face: two dark eyes with sparkle + frown. */
function face(p, cx, cy, squint) {
  p.rect(cx - 3, cy - 1, 2, squint ? 1 : 2, '#2e2348');
  p.rect(cx + 2, cy - 1, 2, squint ? 1 : 2, '#2e2348');
  if (!squint) {
    p.set(cx - 3, cy - 1, '#ffffff');
    p.set(cx + 2, cy - 1, '#ffffff');
  }
  p.set(cx - 1, cy + 2, '#2e2348');
  p.set(cx, cy + 2, '#2e2348');
}

// ---------- Weapons (14x14, 12 designs, vertical sword reads best in cells) ----------

const WEAPONS = [
  { blade: '#9a6b3f', len: 5, w: 2, guard: '#7a4a26', name: 'twig' },
  { blade: '#b0885c', len: 6, w: 3, guard: '#7a4a26', name: 'stick' },
  { blade: '#8fbf6f', len: 6, w: 3, guard: '#5e8f4e', gem: '#e86a92', name: 'thorn' },
  { blade: '#cd7f32', len: 7, w: 3, guard: '#8f5a24', name: 'copper' },
  { blade: '#9aa0a6', len: 7, w: 3, guard: '#6f7378', name: 'iron' },
  { blade: '#c9ced4', len: 8, w: 3, guard: '#8a8f96', name: 'steel' },
  { blade: '#e8f0f8', len: 8, w: 3, guard: '#aab4c0', gem: '#6be3ff', name: 'silver' },
  { blade: '#ffd166', len: 8, w: 4, guard: '#c99a2e', gem: '#ff5e5e', name: 'golden' },
  { blade: '#8ee8ff', len: 9, w: 3, guard: '#4fb4d0', gem: '#ffffff', name: 'crystal' },
  { blade: '#ff6b6b', len: 9, w: 4, guard: '#b33951', gem: '#ffd166', name: 'ruby' },
  { blade: '#b39dff', len: 9, w: 3, guard: '#6b4fd0', gem: '#fff36b', name: 'storm' },
  { blade: '#ffb347', len: 9, w: 4, guard: '#e86a2e', gem: '#ffffff', name: 'solar' },
];

function weapon(spec) {
  const p = new Pix(14, 14);
  const half = Math.floor(spec.w / 2);
  const left = 7 - half;
  const tipY = 13 - (spec.len + 5); // sword sits on the bottom edge
  const bladeTop = tipY + 2;

  // Tip
  p.tri(left - 0.5, bladeTop + 0.5, left + spec.w - 0.5, bladeTop + 0.5, left + spec.w / 2 - 0.5, tipY - 0.5, spec.blade);
  // Blade
  p.rect(left, bladeTop, spec.w, spec.len, spec.blade);
  // Shine down the left edge
  for (let y = bladeTop; y < bladeTop + spec.len; y++) p.set(left, y, shade(spec.blade, 1.3));

  // Guard (2px tall, rounded ends)
  const gy = bladeTop + spec.len;
  p.rect(left - 2, gy, spec.w + 4, 2, spec.guard);
  p.set(left - 2, gy + 1, '#00000000');
  p.set(left + spec.w + 1, gy + 1, '#00000000');
  // Gem centered on the guard
  if (spec.gem) {
    p.set(7 - (spec.w % 2 === 0 ? 1 : 0), gy, spec.gem);
    p.set(7, gy, spec.gem);
  }
  // Grip + pommel
  p.rect(6, gy + 2, 2, 2, '#6b4423');
  p.rect(6, gy + 4, 2, 1, spec.guard);

  p.edgeShade(0.65);
  return p;
}

// ---------- Ground decorations (10x10: bush, flower, rock) ----------

function bush() {
  const p = new Pix(10, 10);
  p.ellipse(5, 6, 4, 3, '#5cbf5c');
  p.ellipse(3, 5, 2, 2, '#6fd06f');
  p.set(4, 6, '#e86a92');
  p.set(7, 5, '#e86a92');
  p.edgeShade(0.65);
  return p;
}

function flower() {
  const p = new Pix(10, 10);
  p.line(5, 5, 5, 9, '#5e8f4e');
  p.circle(5, 3, 2, '#ffd1e8');
  p.set(5, 3, '#ffd166');
  p.edgeShade(0.75);
  return p;
}

function rock() {
  const p = new Pix(10, 10);
  p.ellipse(5, 7, 3.5, 2.5, '#b8b2c8');
  p.set(4, 6, '#d0cbe0');
  p.edgeShade(0.6);
  return p;
}

// ---------- Write everything ----------

writeSheet(`${OUT}/hero.png`, [hero(0), hero(1), hero(2)], SCALE);
writeSheet(`${OUT}/enemy-slime.png`, [slime(0), slime(1)], SCALE);
writeSheet(`${OUT}/enemy-carrot.png`, [carrot(0), carrot(1)], SCALE);
writeSheet(`${OUT}/enemy-mushroom.png`, [mushroom(0), mushroom(1)], SCALE);
writeSheet(`${OUT}/enemy-bat.png`, [bat(0), bat(1)], SCALE);
writeSheet(`${OUT}/enemy-crab.png`, [crab(0), crab(1)], SCALE);
writeSheet(`${OUT}/enemy-ghost.png`, [ghost(0), ghost(1)], SCALE);
writeSheet(`${OUT}/gear.png`, WEAPONS.map(weapon), SCALE);
writeSheet(`${OUT}/deco.png`, [bush(), flower(), rock()], SCALE);

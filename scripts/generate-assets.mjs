// Generates all game sprite sheets as hi-detail pixel art (small pixels,
// dense shading). Run: npm run assets → writes committed PNGs into
// public/assets/. Characters render at native 1x (SCALE 1) so the battlefield
// reads "zoomed out"; tiles/UI icons render at 2x.

import { readFileSync } from 'node:fs';
import { fromMap, pad, Pix, shade } from './pixel.mjs';
import { writeSheet } from './pixel.mjs';
import { knight } from './knight.mjs';

const OUT = 'public/assets';
const SKINS = JSON.parse(readFileSync('src/config/skins.json', 'utf8')).skins;

/** Pad + hard outline: the standard finishing pass for every sprite. */
function finish(p, margin = 2) {
  const q = pad(p, margin);
  q.outline();
  return q;
}

// ---------- Monsters (44x44 logical, 2 frames each) ----------

function wolf(frame) {
  const p = new Pix(44, 44);
  const FUR = ['#8a92a2', '#6a707e', '#484c58'];
  const DK = '#484c58';
  const lift = frame === 1 ? 1 : 0;

  // Tail
  p.tri(2, 18, 9, 22, 6, 28, DK);
  p.tri(2, 18, 6, 20, 8, 25, '#6a707e');
  // Body
  p.domeEllipse(21, 26, 12, 7, FUR);
  // Haunch
  p.domeEllipse(13, 27, 6, 6, ['#6a707e', '#5a5f6c', '#484c58']);
  // Legs: 4, alternating gait
  p.cylRect(10, 32 + lift, 3, 9 - lift, FUR);
  p.cylRect(16, 32 - lift + 1, 3, 9 + lift - 1, FUR);
  p.cylRect(27, 32 - lift + 1, 3, 9 + lift - 1, FUR);
  p.cylRect(32, 32 + lift, 3, 9 - lift, FUR);
  // Paws
  for (const x of [10, 16, 27, 32]) p.rect(x, 40, 4, 2, '#32363e');
  // Neck + head, lunging forward
  p.domeEllipse(32, 16, 6, 5, FUR);
  // Muzzle with open jaw
  p.rect(37, 14, 6, 3, '#6a707e');
  p.rect(37, 14, 6, 1, '#8a92a2');
  p.tri(37, 18, 43, 18, 38, 21, DK); // lower jaw
  p.set(38, 17, '#ffffff');
  p.set(41, 17, '#ffffff'); // fangs
  p.set(39, 19, '#ffffff');
  p.set(42, 16, '#b03a2e'); // tongue hint
  // Ears pinned back
  p.tri(27, 8, 31, 13, 26, 13, DK);
  p.tri(31, 7, 34, 12, 29, 12, '#6a707e');
  // Eye + brow
  p.rect(32, 13, 2, 1, '#ff4a4a');
  p.rect(31, 12, 3, 1, '#32363e');
  // Fur texture + spine ridge
  p.noise(12, 21, 20, 10, '#5a5f6c', 6);
  for (let x = 14; x <= 28; x += 3) p.set(x, 19, DK);
  return finish(p);
}

function skeleton(frame) {
  const p = new Pix(44, 44);
  const BONE = ['#f4f0e4', '#d8d4c8', '#a8a498'];
  const B = '#d8d4c8';
  const DK = '#a8a498';
  const bob = frame === 1 ? 1 : 0;

  // Rusted sword raised in right hand
  p.cylRect(35, 2 + bob, 2, 14, ['#b8925c', '#96743e', '#6b4423']);
  p.tri(35, 2 + bob, 37, 2 + bob, 36, 0 + bob, '#96743e');
  p.rect(33, 15 + bob, 6, 2, '#6f7378');
  // Skull
  p.domeEllipse(21, 8 + bob, 6, 5.5, BONE);
  p.rect(17, 13 + bob, 9, 3, B); // jaw
  // Eye sockets + glow
  p.rect(17, 6 + bob, 3, 3, '#14101c');
  p.rect(23, 6 + bob, 3, 3, '#14101c');
  p.set(18, 7 + bob, '#6be3ff');
  p.set(24, 7 + bob, '#6be3ff');
  // Nose + teeth
  p.rect(21, 10 + bob, 1, 2, DK);
  for (let x = 17; x <= 25; x += 2) p.set(x, 15 + bob, DK);
  // Spine with vertebrae
  for (let y = 16; y <= 28; y += 2) {
    p.rect(20, y + bob, 3, 1, B);
    p.rect(21, y + 1 + bob, 1, 1, DK);
  }
  // Ribs: three arcs each side
  for (const [ry, len] of [[18, 6], [21, 7], [24, 6]]) {
    p.line(21, ry + bob, 21 - len, ry + 2 + bob, B);
    p.line(22, ry + bob, 22 + len, ry + 2 + bob, B);
    p.set(21 - len, ry + 3 + bob, DK);
    p.set(22 + len, ry + 3 + bob, DK);
  }
  // Arms: right up to sword, left down to shield
  p.line(23, 17 + bob, 30, 14 + bob, B);
  p.line(30, 14 + bob, 35, 16 + bob, DK);
  p.line(20, 17 + bob, 13, 21 + bob, B);
  // Round wooden shield on left arm
  p.domeEllipse(10, 24 + bob, 5, 6, ['#a87844', '#8a5f33', '#6b4423']);
  p.circle(10, 24 + bob, 1.5, '#6f7378'); // boss
  p.set(10, 20 + bob, '#5c3a1c');
  p.set(10, 28 + bob, '#5c3a1c');
  // Pelvis
  p.rect(18, 29 + bob, 7, 2, B);
  p.set(20, 30 + bob, '#14101c');
  p.set(23, 30 + bob, '#14101c');
  // Legs: femur + shin with knee joints
  p.line(19, 31 + bob, 17, 36, B);
  p.line(17, 36, 17, 42, DK);
  p.line(24, 31 + bob, 26, 36, B);
  p.line(26, 36, 26, 42, DK);
  p.circle(17, 36, 1, B);
  p.circle(26, 36, 1, B);
  // Feet
  p.rect(15, 42, 4, 1, B);
  p.rect(25, 42, 4, 1, B);
  return finish(p);
}

function spider(frame) {
  const p = new Pix(44, 44);
  const C = ['#544a62', '#3a3244', '#262030'];
  const DK = '#262030';

  // Legs: 4 each side, two segments (up to knee, down to ground)
  for (let i = 0; i < 4; i++) {
    const liftL = (i + frame) % 2;
    const liftR = (i + frame + 1) % 2;
    const kneeY = 8 + i * 4;
    p.line(17, 20, 8 - i, kneeY - liftL * 2, DK);
    p.line(8 - i, kneeY - liftL * 2, 4 - i, kneeY + 12 - liftL, '#3a3244');
    p.line(27, 20, 36 + i, kneeY - liftR * 2, DK);
    p.line(36 + i, kneeY - liftR * 2, 40 + i, kneeY + 12 - liftR, '#3a3244');
  }
  // Abdomen with red hourglass
  p.domeEllipse(22, 29, 11, 9, C);
  p.tri(20, 25, 24, 25, 22, 30, '#e8382e');
  p.tri(20, 34, 24, 34, 22, 30, '#b02a20');
  p.noise(14, 23, 16, 12, '#262030', 5);
  // Cephalothorax
  p.domeEllipse(22, 15, 6.5, 5, ['#6a5e7c', '#544a62', '#3a3244']);
  // Eye cluster: 2 rows
  p.rect(18, 12, 2, 2, '#ff4a4a');
  p.rect(24, 12, 2, 2, '#ff4a4a');
  p.set(21, 13, '#ff6b6b');
  p.set(23, 13, '#ff6b6b');
  p.set(19, 15, '#b02a20');
  p.set(25, 15, '#b02a20');
  // Fangs
  p.tri(19, 19, 21, 19, 20, 22, '#f4f0e4');
  p.tri(23, 19, 25, 19, 24, 22, '#f4f0e4');
  return finish(p);
}

function golem(frame) {
  const p = new Pix(44, 44);
  const ROCK = ['#9a92a8', '#7a7284', '#565060'];
  const DK = '#565060';
  const bob = frame === 1 ? 1 : 0;

  // Shoulders + torso: a mountain of rock
  p.domeEllipse(22, 20 + bob, 14, 11, ROCK);
  p.domeEllipse(7, 17 + bob, 5.5, 6.5, ROCK);
  p.domeEllipse(37, 17 + bob, 5.5, 6.5, ROCK);
  // Arms down to massive fists
  p.cylRect(3, 20 + bob, 6, 12, ROCK);
  p.cylRect(35, 20 + bob, 6, 12, ROCK);
  p.domeEllipse(6, 34, 4.5, 4, ['#7a7284', '#665e72', '#565060']);
  p.domeEllipse(38, 34, 4.5, 4, ['#7a7284', '#665e72', '#565060']);
  // Knuckles
  for (const x of [4, 6, 8]) p.set(x, 32, '#9a92a8');
  for (const x of [36, 38, 40]) p.set(x, 32, '#9a92a8');
  // Head: low brow block
  p.cylRect(17, 5 + bob, 10, 8, ROCK);
  p.rect(16, 5 + bob, 12, 2, '#9a92a8'); // brow
  // Furnace eyes
  p.rect(19, 8 + bob, 2, 2, '#ffb347');
  p.rect(24, 8 + bob, 2, 2, '#ffb347');
  p.set(19, 8 + bob, '#ffe86b');
  p.set(24, 8 + bob, '#ffe86b');
  // Cracks with inner glow
  p.line(14, 16 + bob, 18, 24 + bob, DK);
  p.line(18, 24 + bob, 16, 28 + bob, DK);
  p.set(17, 23 + bob, '#ffb347');
  p.line(29, 14 + bob, 27, 22 + bob, DK);
  p.set(28, 19 + bob, '#ffb347');
  // Moss
  p.noise(10, 12, 24, 16, '#5a7a4a', 9);
  // Legs: stubby pillars
  p.cylRect(14, 30 + bob, 6, 11 - bob, ROCK);
  p.cylRect(24, 30 + bob, 6, 11 - bob, ROCK);
  p.rect(12, 41, 9, 2, DK);
  p.rect(23, 41, 9, 2, DK);
  return finish(p);
}

function imp(frame) {
  const p = new Pix(44, 44);
  const RED = ['#e0705c', '#c2482e', '#8a2e1c'];
  const DK = '#8a2e1c';
  const up = frame === 0;

  // Bat wings with finger ribs
  const wy = up ? 6 : 16;
  p.tri(2, wy, 13, 18, 11, 26, '#8a2e1c');
  p.tri(42, wy, 31, 18, 33, 26, '#8a2e1c');
  p.line(2, wy, 11, 24, '#5c1f12');
  p.line(42, wy, 33, 24, '#5c1f12');
  p.line(4, wy + 4, 12, 22, '#5c1f12');
  p.line(40, wy + 4, 32, 22, '#5c1f12');
  // Tail with spade
  p.line(28, 32, 36, 38, DK);
  p.line(36, 38, 39, 36, DK);
  p.tri(38, 34, 42, 36, 38, 39, '#c2482e');
  // Legs with hooves
  p.cylRect(17, 32, 4, 8, RED);
  p.cylRect(24, 32, 4, 8, RED);
  p.rect(16, 40, 5, 2, '#3a2a1e');
  p.rect(23, 40, 5, 2, '#3a2a1e');
  // Body
  p.domeEllipse(22, 26, 8, 8, RED);
  p.ellipse(22, 28, 4.5, 5, '#e0907c'); // belly
  // Arms; right hand holds a fireball
  p.line(15, 22, 10, 28, DK);
  p.line(29, 22, 34, 26, DK);
  p.circle(35, 25, 2.5, '#ff9a3c');
  p.circle(35, 24, 1.2, '#ffe86b');
  p.set(35, 22, '#ff9a3c');
  // Head
  p.domeEllipse(22, 12, 6.5, 6, RED);
  // Horns: curved white
  p.line(17, 7, 15, 3, '#f4f0e4');
  p.line(15, 3, 16, 1, '#d8d4c8');
  p.line(27, 7, 29, 3, '#f4f0e4');
  p.line(29, 3, 28, 1, '#d8d4c8');
  // Pointed ears
  p.tri(15, 11, 17, 13, 13, 14, '#c2482e');
  p.tri(29, 11, 27, 13, 31, 14, '#c2482e');
  // Eyes: yellow slits + wicked grin
  p.rect(18, 11, 3, 1, '#ffe86b');
  p.rect(24, 11, 3, 1, '#ffe86b');
  p.set(19, 10, '#14101c');
  p.set(25, 10, '#14101c');
  p.rect(18, 15, 9, 1, '#14101c');
  p.set(19, 16, '#ffffff');
  p.set(25, 16, '#ffffff');
  return finish(p);
}

function wraith(frame) {
  const p = new Pix(44, 44);
  const CLOAK = ['#5c5474', '#46425c', '#2c2a3c'];
  const DK = '#2c2a3c';
  const off = frame === 1 ? 1 : 0;

  // Scythe: shaft + curved blade
  p.line(31, 4 - off, 37, 36, '#4a3826');
  p.line(32, 4 - off, 38, 36, '#3a2a1e');
  p.line(31, 4 - off, 22, 2 - off, '#c9ced4');
  p.line(22, 2 - off, 16, 4 - off, '#9aa0a6');
  p.line(31, 5 - off, 24, 3 - off, '#6f7378');
  // Hooded head
  p.domeEllipse(19, 10 - off, 7.5, 7, CLOAK);
  p.ellipse(20, 11 - off, 5, 5, '#14101c'); // face void
  p.rect(17, 10 - off, 2, 2, '#6be3ff');
  p.rect(22, 10 - off, 2, 2, '#6be3ff');
  p.set(17, 10 - off, '#c4f4ff');
  // Cloak: flowing, widening, tattered
  for (let y = 0; y < 22; y++) {
    const yy = 16 - off + y;
    const sway = Math.round(Math.sin(y / 5 + frame * 1.5) * 1.5);
    const half = 6 + Math.round(y * 0.45);
    p.rect(19 - half + sway, yy, half * 2, 1, y % 6 === 4 ? DK : '#46425c');
  }
  // Tattered hem
  for (let x = 6; x <= 32; x += 4) {
    const drop = (x / 4 + frame) % 2 === 0 ? 4 : 1;
    p.rect(x, 37 - off, 3, drop, '#46425c');
  }
  // Cloak highlight edge
  p.line(13, 16 - off, 9, 34 - off, '#6a6284');
  // Skeletal hands gripping the shaft
  p.rect(29, 14 - off, 3, 2, '#d8d4c8');
  p.rect(33, 24 - off, 3, 2, '#d8d4c8');
  return finish(p);
}

// ---------- Weapons (24x28 logical, 12 designs; high tiers glow) ----------

const WEAPONS = [
  { blade: '#9a6b3f', len: 10, w: 3, guard: '#6b4423', name: 'twig' },
  { blade: '#b0885c', len: 11, w: 4, guard: '#6b4423', name: 'stick' },
  { blade: '#7a9a5c', len: 11, w: 4, guard: '#4e6b3a', gem: '#c2482e', name: 'thorn' },
  { blade: '#cd7f32', len: 12, w: 4, guard: '#8f5a24', name: 'copper' },
  { blade: '#9aa0a6', len: 13, w: 4, guard: '#6f7378', name: 'iron' },
  { blade: '#c9ced4', len: 14, w: 4, guard: '#8a8f96', name: 'steel' },
  { blade: '#e8f0f8', len: 14, w: 4, guard: '#aab4c0', gem: '#6be3ff', name: 'silver' },
  { blade: '#ffd166', len: 15, w: 5, guard: '#c99a2e', gem: '#ff5e5e', glow: '#ffd16688', name: 'golden' },
  { blade: '#8ee8ff', len: 16, w: 4, guard: '#4fb4d0', gem: '#ffffff', glow: '#8ee8ff88', name: 'crystal' },
  { blade: '#ff6b6b', len: 16, w: 5, guard: '#b33951', gem: '#ffd166', glow: '#ff6b6b88', name: 'ruby' },
  { blade: '#b39dff', len: 17, w: 4, guard: '#6b4fd0', gem: '#fff36b', glow: '#b39dff90', name: 'storm' },
  { blade: '#ffb347', len: 17, w: 5, guard: '#e86a2e', gem: '#ffffff', glow: '#ffb34790', name: 'solar' },
];

function weapon(spec) {
  const p = new Pix(24, 28);
  const half = Math.floor(spec.w / 2);
  const left = 12 - half;
  const gy = 21; // guard baseline
  const bladeTop = gy - spec.len;
  const tipY = bladeTop - 3;

  // Tip
  p.tri(left - 0.5, bladeTop + 0.5, left + spec.w - 0.5, bladeTop + 0.5, left + spec.w / 2 - 0.5, tipY - 0.5, spec.blade);
  p.set(left, bladeTop - 1, shade(spec.blade, 1.3));
  // Blade with edge shine + fuller groove
  p.cylRect(left, bladeTop, spec.w, spec.len, [shade(spec.blade, 1.3), spec.blade, shade(spec.blade, 0.72)]);
  if (spec.w >= 4) {
    for (let y = bladeTop + 2; y < gy - 2; y++) {
      if (y % 2 === 0) p.set(12, y, shade(spec.blade, 0.85));
    }
  }
  // Winged guard
  p.rect(left - 3, gy, spec.w + 6, 2, spec.guard);
  p.rect(left - 3, gy - 1, 2, 1, spec.guard);
  p.rect(left + spec.w + 1, gy - 1, 2, 1, spec.guard);
  p.rect(left - 3, gy, spec.w + 6, 1, shade(spec.guard, 1.25));
  if (spec.gem) {
    p.rect(11, gy, 2, 2, spec.gem);
    p.set(11, gy, '#ffffff');
  }
  // Wrapped grip
  for (let y = 0; y < 4; y++) {
    p.rect(11, gy + 2 + y, 2, 1, y % 2 ? '#3a2a1e' : '#5c3a1c');
  }
  // Pommel
  p.rect(10, gy + 6, 4, 2, spec.guard);
  p.set(11, gy + 6, shade(spec.guard, 1.25));

  const out = pad(p, 2);
  out.outline();
  if (spec.glow) out.halo(spec.glow);
  return out;
}

// ---------- Tiles (32x32 logical; floor/wall grayscale for biome tint) ----------

function floorTile(variant) {
  const p = new Pix(32, 32);
  p.rect(0, 0, 32, 32, variant === 2 ? '#b0b0b0' : '#c2c2c2');
  // Bevel
  p.rect(0, 0, 32, 1, '#dadada');
  p.rect(0, 0, 1, 32, '#d0d0d0');
  p.rect(0, 31, 32, 1, '#888888');
  p.rect(31, 0, 1, 32, '#909090');
  p.rect(1, 1, 30, 1, '#cecece');
  // Wear
  p.noise(2, 2, 28, 28, '#a8a8a8', 11, variant * 3);
  p.noise(2, 2, 28, 28, '#cccccc', 13, variant * 7 + 1);
  if (variant === 1) {
    // Crack
    p.line(8, 4, 15, 14, '#8a8a8a');
    p.line(15, 14, 12, 24, '#8a8a8a');
    p.line(15, 14, 21, 18, '#9a9a9a');
    p.set(16, 15, '#a2a2a2');
  }
  return p;
}

function wallTile() {
  const p = new Pix(32, 32);
  p.rect(0, 0, 32, 32, '#787878'); // mortar
  const brick = (x, y, w) => {
    p.rect(x, y, w, 6, '#949494');
    p.rect(x, y, w, 1, '#aaaaaa');
    p.rect(x, y + 5, w, 1, '#7e7e7e');
    p.noise(x, y + 1, w, 4, '#8a8a8a', 7, x + y);
  };
  brick(0, 1, 14);
  brick(16, 1, 16);
  brick(0, 9, 6);
  brick(8, 9, 15);
  brick(25, 9, 7);
  brick(0, 17, 14);
  brick(16, 17, 16);
  brick(0, 25, 6);
  brick(8, 25, 15);
  brick(25, 25, 7);
  return p;
}

function fenceTile() {
  const p = new Pix(32, 32);
  for (const x of [3, 19] ) {
    p.tri(x, 8, x + 8, 8, x + 4, 2, '#9a6a3a');
    p.cylRect(x, 8, 8, 24, ['#b8834a', '#9a6a3a', '#7c5228']);
    p.noise(x, 8, 8, 24, '#8a5f33', 9, x);
  }
  p.rect(0, 14, 32, 4, '#7c5228');
  p.rect(0, 14, 32, 1, '#9a6a3a');
  p.rect(0, 24, 32, 3, '#7c5228');
  p.rect(0, 24, 32, 1, '#9a6a3a');
  return p;
}

// ---------- Props (24x24) + torch ----------

function deadTree() {
  const p = new Pix(24, 24);
  const T = '#4a3626';
  p.cylRect(10, 10, 3, 14, ['#5c4430', T, '#32251a']);
  p.line(11, 12, 18, 5, T);
  p.line(18, 5, 21, 4, '#32251a');
  p.line(10, 14, 4, 8, T);
  p.line(4, 8, 2, 7, '#32251a');
  p.line(11, 10, 12, 3, T);
  return finish(p);
}

function skullProp() {
  const p = new Pix(24, 24);
  p.domeEllipse(11, 12, 6, 5, ['#f4f0e4', '#d8d4c8', '#a8a498']);
  p.rect(8, 16, 7, 3, '#d8d4c8');
  p.rect(8, 12, 2, 2, '#14101c');
  p.rect(13, 12, 2, 2, '#14101c');
  p.set(11, 15, '#a8a498');
  for (let x = 8; x <= 14; x += 2) p.set(x, 18, '#a8a498');
  p.line(15, 8, 17, 10, '#a8a498'); // crack
  return finish(p);
}

function rockProp() {
  const p = new Pix(24, 24);
  p.domeEllipse(12, 15, 8, 6, ['#8a8296', '#6a6474', '#4a4454']);
  p.line(8, 12, 11, 16, '#4a4454');
  p.noise(5, 10, 14, 10, '#7a7284', 7);
  return finish(p);
}

function stuckSword() {
  const p = new Pix(24, 24);
  p.line(8, 4, 15, 17, '#9aa0a6');
  p.line(9, 4, 16, 17, '#c9ced4');
  p.line(10, 4, 17, 17, '#6f7378');
  p.line(5, 3, 11, 1, '#6f7378'); // guard
  p.rect(5, 1, 2, 2, '#3a2a1e'); // grip
  return finish(p);
}

function boneProp() {
  const p = new Pix(24, 24);
  p.line(6, 16, 17, 9, '#d8d4c8');
  p.line(6, 17, 17, 10, '#f4f0e4');
  p.circle(5, 16.5, 2, '#d8d4c8');
  p.circle(18, 9.5, 2, '#d8d4c8');
  p.set(4, 15, '#f4f0e4');
  p.set(17, 8, '#f4f0e4');
  return finish(p);
}

function bushProp() {
  const p = new Pix(24, 24);
  p.domeEllipse(12, 15, 9, 6, ['#6a9a4e', '#4f7a38', '#365426']);
  p.domeEllipse(7, 12, 4, 3.5, ['#7aae5c', '#5c8a42', '#4f7a38']);
  p.noise(4, 10, 16, 10, '#42682e', 6);
  p.set(9, 15, '#e86a92');
  p.set(15, 13, '#e86a92');
  return finish(p);
}

function crateProp() {
  const p = new Pix(24, 24);
  p.cylRect(3, 5, 18, 16, ['#a87844', '#8a5f33', '#6b4423']);
  p.rect(3, 5, 18, 2, '#b8834a');
  p.rect(3, 19, 18, 2, '#5c3a1c');
  p.line(4, 6, 19, 19, '#5c3a1c');
  p.line(19, 6, 4, 19, '#5c3a1c');
  p.rect(3, 11, 18, 1, '#75512c');
  p.noise(4, 6, 16, 13, '#96693a', 8);
  return finish(p);
}

function torch(frame) {
  const p = new Pix(16, 30);
  const sway = frame === 1 ? 1 : 0;
  // Flame: outer / mid / core
  p.ellipse(8 + sway, 6, 4, 5.5, '#ff9a3c');
  p.ellipse(8 + sway, 7, 2.5, 3.5, '#ffe86b');
  p.ellipse(8 - sway * 0.5, 8, 1, 1.5, '#fff8d0');
  p.set(8 - sway, 1, '#ff9a3c');
  p.set(9 + sway, 2, '#e8763c');
  // Sconce
  p.rect(5, 12, 7, 3, '#6f7378');
  p.rect(5, 12, 7, 1, '#9aa0a6');
  // Handle
  p.cylRect(7, 15, 3, 13, ['#8a5f33', '#6b4423', '#4a2f18']);
  return finish(p);
}

// ---------- Tab icons (12x12 maps, unchanged designs) ----------

const ICON_PALETTE = {
  G: '#ffd166',
  g: '#c99a2e',
  S: '#c9ced4',
  s: '#8a8f96',
  B: '#a87844',
  b: '#6b4423',
  P: '#e8d9b0',
  R: '#e84a4a',
};

const ICONS = {
  sword: [
    '.........S..',
    '........SS..',
    '.......SS...',
    '......SS....',
    '.....SS.....',
    '.gg.SS......',
    '..gSSg......',
    '..bSgg......',
    '.bb..g......',
    '.b..........',
    '............',
    '............',
  ],
  scroll: [
    '............',
    '..PPPPPPP...',
    '.P.......P..',
    '..PPPPPPP...',
    '..P.....P...',
    '..P.ss..P...',
    '..P.....P...',
    '..P..ss.P...',
    '..P.....P...',
    '..PPPPPPP...',
    '.P.......P..',
    '..PPPPPPP...',
  ],
  paw: [
    '............',
    '...P...P....',
    '..PP...PP...',
    '.P..P.P..P..',
    '.PP.....PP..',
    '............',
    '...PPPP.....',
    '..PPPPPP....',
    '..PPPPPP....',
    '..PPPPPP....',
    '...PPPP.....',
    '............',
  ],
  star: [
    '.....G......',
    '.....GG.....',
    '....GGG.....',
    '.GGGGGGGGG..',
    '..GGGGGGG...',
    '...GGGGG....',
    '...GGGGG....',
    '..GG...GG...',
    '.G.......G..',
    '............',
    '............',
    '............',
  ],
  urn: [
    '............',
    '...gGGg.....',
    '....GG......',
    '...GGGG.....',
    '..GGGGGG....',
    '..GgGGgG....',
    '..GGGGGG....',
    '..GGGGGG....',
    '...GGGG.....',
    '....GG......',
    '...gGGg.....',
    '............',
  ],
  cart: [
    '............',
    '.b..........',
    '.bb.........',
    '..bBBBBBB...',
    '..BBBBBBB...',
    '..BBBBBBB...',
    '..bBBBBBb...',
    '...bbbbb....',
    '...s...s....',
    '..sss.sss...',
    '...s...s....',
    '............',
  ],
};

function icon(name) {
  const p = fromMap(ICONS[name], ICON_PALETTE);
  p.outline();
  return p;
}

// ---------- Pixel bitmap font (5x7 glyphs in 6x8 cells, white for tinting) ----------

export const FONT_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ .,:/+-%!';

const GLYPHS = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '####.', '#...#', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '..##.', '..#..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
};

function glyph(ch) {
  const rows = GLYPHS[ch] ?? GLYPHS[' '];
  const p = new Pix(6, 8);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') p.set(x, y, '#ffffff');
    }
  });
  return p;
}

// ---------- Write everything ----------

// Hero: one sheet per skin (idle0, idle1, attack) at native resolution
for (const skin of SKINS) {
  writeSheet(
    `${OUT}/hero-${skin.id}.png`,
    [knight(0, skin.art), knight(1, skin.art), knight(2, skin.art)],
    1,
  );
}

writeSheet(`${OUT}/enemy-wolf.png`, [wolf(0), wolf(1)], 1);
writeSheet(`${OUT}/enemy-skeleton.png`, [skeleton(0), skeleton(1)], 1);
writeSheet(`${OUT}/enemy-spider.png`, [spider(0), spider(1)], 1);
writeSheet(`${OUT}/enemy-golem.png`, [golem(0), golem(1)], 1);
writeSheet(`${OUT}/enemy-imp.png`, [imp(0), imp(1)], 1);
writeSheet(`${OUT}/enemy-wraith.png`, [wraith(0), wraith(1)], 1);
writeSheet(`${OUT}/gear.png`, WEAPONS.map(weapon), 2);
writeSheet(
  `${OUT}/deco.png`,
  [deadTree(), skullProp(), rockProp(), stuckSword(), boneProp(), bushProp(), crateProp()],
  1,
);
writeSheet(`${OUT}/torch.png`, [torch(0), torch(1)], 1);
writeSheet(`${OUT}/tiles.png`, [floorTile(0), floorTile(1), floorTile(2), wallTile(), fenceTile()], 2);
writeSheet(
  `${OUT}/icons.png`,
  ['sword', 'scroll', 'paw', 'star', 'urn', 'cart'].map(icon),
  2,
);
writeSheet(`${OUT}/pixfont.png`, [...FONT_CHARS].map(glyph), 2);

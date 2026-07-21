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

function serpent(frame) {
  const p = new Pix(44, 44);
  const SCALE = ['#7ac46a', '#54a048', '#367030'];
  const DK = '#367030';
  const sway = frame === 1 ? 2 : 0;

  // Coiled body: three stacked loops, widest at the base
  p.domeEllipse(22, 36, 14, 6, SCALE);
  p.domeEllipse(21, 29, 11, 5, SCALE);
  p.domeEllipse(22, 23, 8, 4, ['#8ad47a', '#54a048', '#367030']);
  // Coil shadows separating the loops
  p.line(9, 33, 35, 33, DK);
  p.line(11, 27, 32, 27, DK);
  // Tail tip poking out of the base coil
  p.line(35, 38, 41, 35, '#54a048');
  p.tri(40, 33, 43, 35, 40, 37, '#7ac46a');
  // Raised neck curving up out of the coils
  p.cylRect(24 + sway, 8, 4, 16, SCALE);
  // Head striking forward
  p.domeEllipse(27 + sway, 7, 6, 4.5, SCALE);
  p.rect(31 + sway, 5, 6, 3, '#54a048'); // snout
  p.rect(31 + sway, 5, 6, 1, '#7ac46a');
  // Open jaw + fangs
  p.tri(31 + sway, 9, 37 + sway, 9, 32 + sway, 12, DK);
  p.set(32 + sway, 9, '#f4f0e4');
  p.set(35 + sway, 9, '#f4f0e4');
  // Forked tongue
  p.line(37 + sway, 7, 41 + sway, 6, '#e8382e');
  p.set(42 + sway, 5, '#e8382e');
  p.set(42 + sway, 7, '#e8382e');
  // Eye slit
  p.rect(27 + sway, 5, 2, 1, '#ffe86b');
  p.set(28 + sway, 5, '#14101c');
  // Belly-scale bands on the neck
  for (let y = 10; y <= 22; y += 3) p.rect(25 + sway, y, 2, 1, '#a8d89a');
  // Scale specks over the coils
  p.noise(10, 20, 24, 18, '#2c5a26', 8);
  return finish(p);
}

function ogre(frame) {
  const p = new Pix(44, 44);
  const SKIN = ['#a8b06a', '#88904e', '#606838'];
  const DK = '#606838';
  const bob = frame === 1 ? 1 : 0;

  // Spiked wooden club raised over the right shoulder
  p.cylRect(35, 2 + bob, 3, 16, ['#a87844', '#8a5f33', '#6b4423']);
  p.domeEllipse(37, 4 + bob, 4, 5, ['#8a5f33', '#6b4423', '#4a3826']);
  for (const [sx, sy] of [[34, 2], [40, 3], [39, 8]]) p.set(sx, sy + bob, '#c9ced4');
  // Hulking body, belly first
  p.domeEllipse(20, 24 + bob, 12, 10, SKIN);
  p.ellipse(20, 27 + bob, 7, 6, '#c0c88a'); // belly
  p.set(20, 27 + bob, DK); // navel
  // Ragged loincloth
  p.rect(14, 31 + bob, 13, 3, '#6b4423');
  for (let x = 14; x <= 25; x += 3) p.rect(x, 34 + bob, 2, 2, '#5c3a1c');
  // Arms: right up to the club, left hanging with big knuckles
  p.cylRect(30, 14 + bob, 5, 9, SKIN);
  p.cylRect(6, 20 + bob, 5, 12, SKIN);
  p.domeEllipse(8, 33 + bob, 4, 3.5, ['#88904e', '#78803e', '#606838']);
  // Head: low, jutting jaw
  p.domeEllipse(19, 9 + bob, 7, 6, SKIN);
  p.rect(13, 12 + bob, 12, 3, '#88904e'); // jaw
  // Underbite tusks
  p.set(14, 11 + bob, '#f4f0e4');
  p.set(23, 11 + bob, '#f4f0e4');
  p.set(14, 10 + bob, '#f4f0e4');
  // Piggy eyes + heavy brow
  p.rect(15, 7 + bob, 2, 1, '#ffb347');
  p.rect(21, 7 + bob, 2, 1, '#ffb347');
  p.rect(14, 6 + bob, 10, 1, DK);
  // Topknot + ear
  p.rect(18, 2 + bob, 3, 2, '#4a3826');
  p.tri(11, 8 + bob, 13, 10 + bob, 10, 12 + bob, '#88904e');
  // Warts
  p.noise(12, 18, 16, 12, '#78803e', 6);
  // Stumpy legs
  p.cylRect(13, 33 + bob, 5, 9 - bob, SKIN);
  p.cylRect(23, 33 + bob, 5, 9 - bob, SKIN);
  p.rect(11, 41, 8, 2, DK);
  p.rect(22, 41, 8, 2, DK);
  return finish(p);
}

function cultist(frame) {
  const p = new Pix(44, 44);
  const ROBE = ['#8a4ab0', '#6a3488', '#482260'];
  const DK = '#482260';
  const off = frame === 1 ? 1 : 0;

  // Crooked staff topped with a void orb
  p.line(33, 8 - off, 36, 40, '#4a3826');
  p.line(34, 8 - off, 37, 40, '#3a2a1e');
  p.circle(33, 6 - off, 3, '#2c2a3c');
  p.circle(33, 6 - off, 1.5, '#b06af0');
  p.set(33, 5 - off, '#e8c4ff');
  // Hooded head bowed over the ritual
  p.domeEllipse(20, 9 - off, 7, 6.5, ROBE);
  p.ellipse(20, 11 - off, 4.5, 4, '#14101c'); // shadowed face
  p.rect(17, 10 - off, 2, 1, '#b06af0');
  p.rect(22, 10 - off, 2, 1, '#b06af0');
  // Hood peak
  p.tri(18, 3 - off, 23, 3 - off, 20, 0 - off, '#6a3488');
  // Robe: flowing to the ground
  for (let y = 0; y < 24; y++) {
    const yy = 15 - off + y;
    const half = 5 + Math.round(y * 0.35);
    p.rect(20 - half, yy, half * 2, 1, y % 7 === 5 ? DK : '#6a3488');
  }
  // Robe centre stripe + rope belt
  p.rect(19, 16 - off, 3, 22, DK);
  p.rect(13, 24 - off, 15, 1, '#c99a2e');
  p.set(21, 25 - off, '#c99a2e');
  // Highlight edge
  p.line(13, 16 - off, 10, 36 - off, '#a86ac8');
  // Sleeve arms: right grips the staff, left raised with a curved dagger
  p.line(25, 18 - off, 32, 16 - off, '#6a3488');
  p.rect(31, 15 - off, 3, 3, '#e0c8a8'); // hand
  p.line(15, 18 - off, 8, 14 - off, '#6a3488');
  p.rect(6, 12 - off, 3, 3, '#e0c8a8');
  p.line(7, 11 - off, 4, 5 - off, '#c9ced4');
  p.set(4, 4 - off, '#ffffff');
  // Hem shadow
  p.rect(9, 38, 23, 2, DK);
  return finish(p);
}

function ghoul(frame) {
  const p = new Pix(44, 44);
  const FLESH = ['#a8c088', '#88a068', '#5c7444'];
  const DK = '#5c7444';
  const lurch = frame === 1 ? 2 : 0;

  // Hunched spine arcing over the head
  p.domeEllipse(20, 20, 10, 9, FLESH);
  for (let x = 13; x <= 27; x += 3) p.set(x, 12, DK); // knobbly spine
  // Ribs showing through torn flesh
  for (const ry of [18, 21, 24]) {
    p.line(14, ry, 20, ry + 1, DK);
    p.set(13, ry, '#d8d4c8');
  }
  // Gut wound
  p.rect(22, 23, 4, 3, '#6a2430');
  p.set(23, 24, '#8a3440');
  // Head hanging low and forward
  p.domeEllipse(30 + lurch, 12, 5.5, 5, FLESH);
  p.rect(33 + lurch, 14, 6, 2, '#88a068'); // jaw
  // Dead eyes + gaping mouth
  p.rect(29 + lurch, 10, 2, 2, '#ffe86b');
  p.set(29 + lurch, 10, '#14101c');
  p.tri(33 + lurch, 16, 39 + lurch, 16, 34 + lurch, 19, '#14101c');
  p.set(34 + lurch, 16, '#f4f0e4');
  p.set(37 + lurch, 16, '#f4f0e4');
  // Straggly hair
  for (let i = 0; i < 4; i++) p.line(27 + i * 2 + lurch, 7, 25 + i * 2 + lurch, 3, DK);
  // Long clawed arms dragging the ground
  p.line(25, 22, 33 + lurch, 32, '#88a068');
  p.line(33 + lurch, 32, 34 + lurch, 40, DK);
  for (let i = 0; i < 3; i++) p.line(33 + i + lurch, 40, 32 + i * 2 + lurch, 43, '#d8d4c8');
  p.line(15, 24, 10 - lurch, 34, '#88a068');
  p.line(10 - lurch, 34, 9 - lurch, 40, DK);
  for (let i = 0; i < 3; i++) p.line(8 + i - lurch, 40, 6 + i * 2 - lurch, 43, '#d8d4c8');
  // Crouched legs
  p.cylRect(15, 28, 4, 8, FLESH);
  p.cylRect(22, 29, 4, 7, FLESH);
  p.rect(14, 36, 5, 2, DK);
  p.rect(21, 36, 5, 2, DK);
  // Rot blotches
  p.noise(12, 15, 16, 10, '#4a6038', 7);
  return finish(p);
}

function gargoyle(frame) {
  const p = new Pix(44, 44);
  const STONE = ['#b0aebc', '#8a8896', '#5e5c6a'];
  const DK = '#5e5c6a';
  const up = frame === 0;

  // Stone bat wings, jagged edges
  const wy = up ? 4 : 12;
  p.tri(2, wy, 14, 16, 12, 26, '#8a8896');
  p.tri(42, wy, 30, 16, 32, 26, '#8a8896');
  p.line(2, wy, 12, 24, DK);
  p.line(42, wy, 32, 24, DK);
  p.line(5, wy + 3, 13, 20, DK);
  p.line(39, wy + 3, 31, 20, DK);
  // Perched body, crouching on a plinth
  p.domeEllipse(22, 24, 9, 8, STONE);
  // Plinth base
  p.rect(13, 38, 18, 4, '#6e6c7a');
  p.rect(12, 40, 20, 2, DK);
  // Crouched legs gripping the plinth edge
  p.cylRect(14, 30, 4, 8, STONE);
  p.cylRect(26, 30, 4, 8, STONE);
  for (const x of [13, 16, 26, 29]) p.tri(x, 38, x + 2, 38, x + 1, 41, '#b0aebc'); // talons
  // Arms braced on knees
  p.line(15, 22, 12, 30, DK);
  p.line(29, 22, 32, 30, DK);
  // Horned head with muzzle
  p.domeEllipse(22, 11, 6, 5.5, STONE);
  p.rect(18, 13, 9, 3, '#8a8896'); // muzzle
  p.set(19, 13, '#f4f0e4');
  p.set(24, 13, '#f4f0e4'); // fangs
  // Curled ram horns
  p.line(16, 8, 13, 5, '#6e6c7a');
  p.line(13, 5, 14, 2, '#8a8896');
  p.line(28, 8, 31, 5, '#6e6c7a');
  p.line(31, 5, 30, 2, '#8a8896');
  // Glowing amber eyes
  p.rect(19, 9, 2, 2, '#ffb347');
  p.rect(24, 9, 2, 2, '#ffb347');
  p.set(19, 9, '#ffe86b');
  p.set(24, 9, '#ffe86b');
  // Weathering cracks
  p.line(18, 20, 21, 27, DK);
  p.line(27, 18, 25, 24, DK);
  p.noise(14, 18, 16, 12, '#78768a', 6);
  return finish(p);
}

function lich(frame) {
  const p = new Pix(44, 44);
  const ROBE = ['#5a7a9c', '#3e5a78', '#283e56'];
  const DK = '#283e56';
  const off = frame === 1 ? 1 : 0;

  // Ice staff with a frozen shard
  p.line(9, 6 - off, 7, 38, '#4a3826');
  p.line(10, 6 - off, 8, 38, '#3a2a1e');
  p.tri(7, 5 - off, 12, 5 - off, 9, 0 - off, '#bce8f8');
  p.tri(7, 5 - off, 12, 5 - off, 10, 9 - off, '#8ac4e0');
  p.set(9, 3 - off, '#ffffff');
  // Skull head under a frost crown
  p.domeEllipse(23, 9 - off, 6, 5.5, ['#f4f0e4', '#d8d4c8', '#a8a498']);
  p.rect(19, 13 - off, 9, 3, '#d8d4c8'); // jaw
  for (let x = 19; x <= 27; x += 2) p.set(x, 15 - off, '#a8a498');
  // Frozen eye sockets
  p.rect(19, 7 - off, 3, 3, '#14101c');
  p.rect(25, 7 - off, 3, 3, '#14101c');
  p.set(20, 8 - off, '#8ae8ff');
  p.set(26, 8 - off, '#8ae8ff');
  // Ice crown spikes
  for (const [cx, ch] of [[18, 3], [21, 5], [24, 4], [27, 5], [30, 3]]) {
    p.line(cx, 4 - off, cx, 4 - ch - off, '#bce8f8');
  }
  // Robe flowing to a drifting hem (no feet: he floats)
  for (let y = 0; y < 22; y++) {
    const yy = 16 - off + y;
    const sway = Math.round(Math.sin(y / 4 + frame * 1.5) * 1.5);
    const half = 5 + Math.round(y * 0.4);
    p.rect(23 - half + sway, yy, half * 2, 1, y % 6 === 4 ? DK : '#3e5a78');
  }
  // Frost trim + highlight edge
  p.rect(21, 17 - off, 5, 1, '#bce8f8');
  p.line(17, 16 - off, 13, 34 - off, '#7a9cbc');
  // Tattered floating hem
  for (let x = 12; x <= 34; x += 4) {
    const drop = (x / 4 + frame) % 2 === 0 ? 3 : 1;
    p.rect(x, 37 - off, 3, drop, '#3e5a78');
  }
  // Bone hands: right grips the staff, left conjures a frost orb
  p.rect(10, 16 - off, 3, 2, '#d8d4c8');
  p.rect(31, 20 - off, 3, 2, '#d8d4c8');
  p.circle(35, 18 - off, 2.5, '#8ac4e0');
  p.circle(35, 17 - off, 1.2, '#e8f8ff');
  p.set(38, 15 - off, '#bce8f8');
  p.set(33, 21 - off, '#bce8f8');
  return finish(p);
}

// ---------- Pets (28x28 logical, 2 frames each) ----------

function petPup(frame, stage = 0) {
  const p = new Pix(28, 28);
  const FUR = stage === 2
    ? ['#6a707e', '#4a4e5a', '#30343e'] // the alpha wears night-dark fur
    : ['#8a92a2', '#6a707e', '#484c58'];
  const DK = stage === 2 ? '#30343e' : '#484c58';
  const hop = frame === 1 ? 1 : 0;
  p.tri(2, 12 - hop, 7, 15 - hop, 5, 19 - hop, DK); // tail
  p.domeEllipse(13, 17 - hop, 7, 5, FUR); // body
  p.cylRect(8, 21 - hop, 2, 6 + hop, FUR);
  p.cylRect(16, 21 - hop, 2, 6 + hop, FUR);
  p.domeEllipse(20, 10 - hop, 5, 4.5, FUR); // head
  p.tri(17, 4 - hop, 19, 8 - hop, 16, 8 - hop, DK); // ears
  p.tri(21, 3 - hop, 23, 7 - hop, 19, 7 - hop, FUR[1]);
  p.rect(24, 9 - hop, 3, 2, DK); // muzzle
  p.set(25, 11 - hop, '#14101c'); // nose
  if (stage === 0) {
    p.set(21, 8 - hop, '#ffb347'); // puppy eye
  } else {
    // Snarling: red eye, bared fangs, hackles up along the spine
    p.set(21, 8 - hop, '#ff4a4a');
    p.set(20, 7 - hop, '#8a1e1e'); // lowered brow
    p.set(24, 11 - hop, '#ffffff');
    p.set(26, 11 - hop, '#ffffff'); // fangs
    for (let i = 0; i < (stage === 2 ? 4 : 2); i++) {
      const x = 9 + i * 3;
      p.tri(x, 13 - hop, x + 2, 13 - hop, x + 1, 9 - hop, DK); // hackles
    }
  }
  if (stage === 2) {
    p.line(11, 16 - hop, 14, 19 - hop, '#8a1e1e'); // battle scar
    for (const x of [8, 16]) p.set(x, 27, '#ffffff'); // claws
  }
  const q = finish(p);
  if (stage === 2) q.halo('#ff4a4a45'); // alpha menace
  return q;
}

function petEmberbat(frame, stage = 0) {
  const p = new Pix(28, 28);
  const C = stage === 2 ? '#e05a2e' : '#c2482e';
  const DKW = stage === 2 ? '#6a1808' : '#8a2e1c';
  const up = frame === 0;
  const wy = up ? 5 : 12;
  p.tri(1, wy, 9, 13, 8, 18, DKW);
  p.tri(27, wy, 19, 13, 20, 18, DKW);
  p.line(1, wy, 8, 16, '#5c1f12');
  p.line(27, wy, 20, 16, '#5c1f12');
  if (stage >= 1) {
    // Burning wingtips
    p.set(1, wy, '#ff9a3c');
    p.set(27, wy, '#ff9a3c');
    p.set(2, wy + 1, '#ffe86b');
    p.set(26, wy + 1, '#ffe86b');
  }
  p.domeEllipse(14, 13, 5, 5, ['#e0705c', C, DKW]);
  p.tri(11, 6, 13, 10, 10, 10, C);
  p.tri(17, 6, 15, 10, 18, 10, C);
  if (stage === 2) {
    // Curved demon horns above the ears
    p.line(10, 5, 8, 2, '#f4f0e4');
    p.line(18, 5, 20, 2, '#f4f0e4');
  }
  const eye = stage === 2 ? '#ffffff' : stage === 1 ? '#ff9a3c' : '#ffe86b';
  p.rect(11, 12, 2, 1, eye);
  p.rect(16, 12, 2, 1, eye);
  p.set(13, 15, '#ffffff');
  p.set(15, 15, '#ffffff');
  if (stage >= 1) {
    p.set(12, 16, '#ffffff'); // longer fangs
    p.set(16, 16, '#ffffff');
  }
  const q = finish(p);
  if (stage === 2) q.halo('#ff6a2e50'); // wreathed in fire
  return q;
}

function petWisp(frame, stage = 0) {
  const p = new Pix(28, 28);
  const C = stage === 2 ? '#b4f0ff' : '#8ee8ff';
  const off = frame === 1 ? 1 : 0;
  p.domeEllipse(14, 12 - off, 6, 7, ['#d4f6ff', C, '#4fb4d0']);
  for (let x = 9; x <= 19; x += 3) {
    const drop = (x / 3 + frame) % 2 === 0 ? 4 : 2;
    p.rect(x, 17 - off, 2, drop + (stage === 2 ? 2 : 0), C);
  }
  p.set(14, 3 - off, C); // flame tip
  p.set(13, 4 - off, '#d4f6ff');
  if (stage === 2) {
    // A crown of grave-fire
    for (const x of [9, 14, 19]) {
      p.set(x, 2 - off, C);
      p.set(x, 1 - off, '#ffffff');
    }
  }
  // Eyes harden with each stage: hollow -> burning -> blazing under a scowl
  p.rect(11, 11 - off, 2, 2, '#14101c');
  p.rect(16, 11 - off, 2, 2, '#14101c');
  if (stage >= 1) {
    p.set(11, 11 - off, '#ffffff');
    p.set(17, 11 - off, '#ffffff');
    p.line(10, 9 - off, 12, 10 - off, '#14101c'); // angry brows
    p.line(18, 9 - off, 16, 10 - off, '#14101c');
  }
  if (stage >= 1) {
    p.tri(12, 14 - off, 16, 14 - off, 14, 16 - off, '#14101c'); // open howl
  }
  const q = finish(p);
  if (stage === 2) q.halo('#8ee8ff55');
  return q;
}

function petPebble(frame, stage = 0) {
  const p = new Pix(28, 28);
  const ROCK = stage === 2
    ? ['#7a7284', '#5c5666', '#3e3a48'] // scorched mountain stone
    : ['#9a92a8', '#7a7284', '#565060'];
  const DK = stage === 2 ? '#3e3a48' : '#565060';
  const bob = frame === 1 ? 1 : 0;
  p.domeEllipse(14, 15 + bob, 8, 7, ROCK);
  p.rect(8, 22 + bob, 4, 4 - bob, DK);
  p.rect(16, 22 + bob, 4, 4 - bob, DK);
  if (stage >= 1) {
    // Jagged rock spikes shoulder the crown
    p.tri(8, 11 + bob, 11, 10 + bob, 9, 6 + bob, ROCK[1]);
    p.tri(17, 10 + bob, 20, 11 + bob, 19, 6 + bob, ROCK[1]);
    if (stage === 2) p.tri(12, 9 + bob, 16, 9 + bob, 14, 4 + bob, ROCK[0]);
  }
  const eye = stage === 2 ? '#ff4a4a' : stage === 1 ? '#ff9a3c' : '#ffb347';
  p.rect(10, 12 + bob, 2, 2, eye);
  p.rect(16, 12 + bob, 2, 2, eye);
  p.line(9, 18 + bob, 12, 19 + bob, DK);
  if (stage >= 1) {
    // Molten veins glow through the cracks
    p.line(9, 16 + bob, 13, 20 + bob, '#ff9a3c');
    if (stage === 2) {
      p.line(16, 17 + bob, 19, 20 + bob, '#ff6a2e');
      p.set(14, 21 + bob, '#ffe86b');
    }
  } else {
    p.noise(8, 10, 12, 10, '#5a7a4a', 8);
  }
  const q = finish(p);
  if (stage === 2) q.halo('#ff9a3c40');
  return q;
}

function petDrake(frame, stage = 0) {
  const p = new Pix(28, 28);
  const C = stage === 2
    ? ['#6aa876', '#3a7a4a', '#1e4a2c'] // deep dragon green
    : ['#8ab894', '#4e8a5e', '#2e5c3c'];
  const DK = stage === 2 ? '#1e4a2c' : '#2e5c3c';
  const flap = frame === 0 ? 0 : 2;
  p.tri(2, 20, 8, 18, 7, 23, DK); // tail
  const wingSpread = stage >= 1 ? 2 : 0; // grown wings
  p.tri(9 - wingSpread, 8 - flap - wingSpread, 15, 14, 8, 15, DK); // wing
  p.domeEllipse(15, 17, 7, 5.5, C); // body
  if (stage >= 1) {
    // Spines march down the back
    for (let i = 0; i < (stage === 2 ? 4 : 2); i++) {
      const x = 10 + i * 3;
      p.tri(x, 13, x + 2, 13, x + 1, 10, DK);
    }
  }
  p.cylRect(11, 22, 2, 4, C);
  p.cylRect(18, 22, 2, 4, C);
  p.domeEllipse(21, 9, 4.5, 4, C); // head
  p.rect(25, 9, 2, 2, DK); // snout
  p.set(22, 7, stage === 2 ? '#ff4a4a' : stage === 1 ? '#ff9a3c' : '#ffe86b'); // eye
  p.tri(19, 4, 21, 8, 17, 8, DK); // horn
  if (stage >= 1) p.tri(22, 3, 24, 7, 20, 7, DK); // second horn
  if (stage === 2) {
    // Breathing fire, not puffing it
    p.line(27, 10, 25, 11, '#ff6a2e');
    p.set(27, 9, '#ffe86b');
    p.set(26, 12, '#ff9a3c');
    p.set(27, 13, '#ff9a3c');
  } else {
    p.set(26, 12, '#ff9a3c'); // flame puff
  }
  const q = finish(p);
  if (stage === 2) q.halo('#ff9a3c4a');
  return q;
}

// ---------- Fairy (24x24 logical, glowing helper sprite) ----------

function fairy(frame, stage = 0) {
  // Evolution palettes: forest green -> sylph teal -> golden seraph
  const PAL = [
    { glow: '#b8f06b', wing: '#e8ffd0', vein: '#8cc850', dress: ['#eaffd8', '#b8f06b', '#5c9a3a'], halo: '#b8f06b88' },
    { glow: '#6be3ff', wing: '#dcf6ff', vein: '#4fb4d0', dress: ['#e8faff', '#6be3ff', '#2a7a9a'], halo: '#6be3ff90' },
    { glow: '#ffd166', wing: '#fff2c8', vein: '#e8b84e', dress: ['#fff8e0', '#ffd166', '#a87e1e'], halo: '#ffd16698' },
  ][stage];
  const p = new Pix(24, 24);
  const up = frame === 0;
  const wy = up ? 3 : 8;
  // Gossamer wings, flapping — evolved fairies spread wider
  const spread = stage > 0 ? 1 : 0;
  p.tri(3 - spread, wy, 9, 11, 8, 16, PAL.wing);
  p.tri(21 + spread, wy, 15, 11, 16, 16, PAL.wing);
  p.line(3 - spread, wy, 8, 14, PAL.vein);
  p.line(21 + spread, wy, 16, 14, PAL.vein);
  if (stage === 2) {
    // Seraph: a second wing pair
    p.tri(5, wy + 6, 10, 13, 9, 17, PAL.wing);
    p.tri(19, wy + 6, 14, 13, 15, 17, PAL.wing);
  }
  // Glowing dress
  p.domeEllipse(12, 14, 4, 5.5, PAL.dress);
  // Head + hair
  p.domeEllipse(12, 6, 3, 3, ['#ffe2c8', '#eab88c', '#b08858']);
  p.rect(10, 2, 4, 2, '#8a5a2e');
  if (stage >= 1) {
    // Tiara
    p.rect(10, 2, 4, 1, PAL.glow);
    p.set(12, 1, PAL.glow);
  }
  p.set(11, 6, '#14101c'); // eyes
  p.set(14, 6, '#14101c');
  if (stage === 2) {
    // The Blade Seraph carries her own little sword, point up
    p.line(21, 16, 21, 8, '#ffffff');
    p.set(21, 7, '#e8f0f8');
    p.rect(20, 16, 3, 1, '#c99a2e'); // guard
    p.set(21, 18, '#8a5a2e'); // grip
  }
  // Sparkle trail
  p.set(6, 19 + (up ? 0 : 1), PAL.glow);
  p.set(18, 20 - (up ? 0 : 1), PAL.glow);
  p.set(12, 22, PAL.dress[0]);
  const out = finish(p);
  out.halo(PAL.halo);
  return out;
}

// ---------- Daily Dungeon dragon head (100x76 logical, Sean-approved v3) ----
// One palette per daily modifier; frame 1 snaps the jaw open (hit react).

const DRAGON_PALETTES = {
  emerald: { hi: '#a8e07c', mid: '#5c9a3a', lo: '#35682a', dk: '#1c3a14', belly: '#d8e4a4', eye: '#ffd166', horn: '#e8dcc0', horn2: '#c9b890', tongue: '#b03a2e' },
  crimson: { hi: '#ff8a6b', mid: '#b03a2e', lo: '#7a1c18', dk: '#400a08', belly: '#e8c49a', eye: '#ffe86b', horn: '#3a3244', horn2: '#5c5470', tongue: '#5c1210' },
  azure: { hi: '#8ee8ff', mid: '#2884a8', lo: '#1c4a6a', dk: '#0c2438', belly: '#d0ecf8', eye: '#ff5e5e', horn: '#e8f0f8', horn2: '#aab4c0', tongue: '#b03a5e' },
  gold: { hi: '#ffe8a0', mid: '#c99a2e', lo: '#8a5a1e', dk: '#4a2c0c', belly: '#fff2c8', eye: '#4ec3e8', horn: '#f3ecd8', horn2: '#d8c8a0', tongue: '#b03a2e' },
};

function dungeonDragon(frame, pal) {
  const p = new Pix(100, 76);
  const { hi: HI, mid: MID, lo: LO, dk: DK } = pal;
  const jaw = frame === 1 ? 5 : 0; // frame 1: jaw snaps open
  // Neck sweeping in from the right, spikes riding its back edge
  p.ellipse(88, 50, 22, 24, MID);
  p.ellipse(93, 48, 17, 18, LO);
  for (let i = 0, sy = 28; sy < 70; sy += 9, i++) p.tri(92, sy, 99, sy - 4, 99, sy + 6, LO);
  // Skull dome
  p.ellipse(56, 34, 26, 20, MID);
  p.ellipse(60, 28, 22, 14, HI);
  // Snout wedge with ridge bumps
  p.tri(8, 34, 38, 20, 40, 44, MID);
  p.rect(8, 30, 34, 12, MID);
  p.ellipse(12, 36, 6, 6, MID);
  p.rect(8, 27, 32, 4, HI);
  for (const bx of [16, 24, 32]) p.tri(bx, 27, bx + 5, 27, bx + 2, 23, MID);
  // Lower jaw (drops on frame 1)
  p.tri(10, 50 + jaw, 44, 44 + jaw, 46, 58 + jaw, LO);
  p.rect(12, 48 + jaw, 32, 6, LO);
  p.tri(9, 53 + jaw, 15, 50 + jaw, 14, 58 + jaw, LO);
  // Mouth cavity + tongue
  p.tri(12, 42, 42, 42, 42, 48 + jaw, DK);
  p.rect(12, 41, 30, 5 + jaw, DK);
  p.rect(20, 45 + jaw, 16, 2, pal.tongue);
  // Teeth, varied
  for (let i = 0, tx = 13; tx < 42; tx += 5, i++) {
    const th = i % 2 === 0 ? 6 : 4;
    p.tri(tx, 41, tx + 4, 41, tx + 2, 41 + th, '#f3ecd8');
    p.tri(tx + 2, 48 + jaw, tx + 6, 48 + jaw, tx + 4, 44 + jaw, '#ded2b4');
  }
  // Nostril + smoke wisps (bigger puff mid-roar)
  p.ellipse(14, 31, 2, 2, DK);
  p.set(13, 30, '#3a3244');
  for (const [sx, sy] of [[11, 25], [9, 22], [10, 19], [7, 16]]) p.set(sx, sy, '#9a94a8');
  p.set(8, 17, '#c4bece');
  p.set(11, 24, '#c4bece');
  if (frame === 1) { p.set(6, 14, '#c4bece'); p.set(9, 13, '#9a94a8'); }
  // Brow plates + slit-pupil eye
  p.tri(46, 20, 74, 13, 66, 27, LO);
  p.tri(48, 21, 66, 17, 60, 25, MID);
  p.ellipse(58, 27, 5, 4, DK);
  p.ellipse(58, 27, 3.4, 2.6, pal.eye);
  p.line(58, 25, 58, 29, DK);
  p.set(56, 25, '#ffffff');
  // Horns with ridge lines
  p.tri(66, 12, 96, 2, 78, 22, pal.horn);
  p.tri(72, 20, 99, 12, 84, 28, pal.horn2);
  p.line(72, 14, 90, 5, pal.horn2);
  p.line(78, 22, 94, 13, pal.horn);
  // Crest spikes
  for (let i = 0, sx = 44; sx < 64; sx += 7, i++) p.tri(sx, 17 - i, sx + 6, 15 - i, sx + 3, 9 - i, MID);
  // Ear fin with membrane ribs
  p.tri(74, 30, 94, 26, 84, 46, MID);
  p.line(78, 32, 90, 29, LO);
  p.line(79, 36, 91, 33, LO);
  p.line(80, 40, 90, 38, LO);
  // Cheek plate
  p.ellipse(64, 44, 9, 7, MID);
  p.ellipse(63, 43, 6, 4, HI);
  // Scale texture: staggered darker dots
  for (let y = 26; y < 62; y += 4) {
    for (let x = 46 + ((y / 4) % 2 === 0 ? 0 : 2); x < 96; x += 5) {
      const cur = p.get(x, y);
      if (cur === MID) p.set(x, y, LO);
      else if (cur === LO) p.set(x, y, DK);
    }
  }
  for (const [sx, sy] of [[52, 24], [60, 22], [68, 26], [56, 32], [66, 34]]) p.set(sx, sy, '#ffffff');
  // Throat: crescent plates hugging the jaw curve
  for (const [cx, cy, rx] of [[52, 50, 14], [58, 55, 16], [64, 60, 17], [70, 65, 17]]) {
    for (let y = cy + 1; y <= cy + 7; y++) {
      for (let x = cx - rx; x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / 7) ** 2 <= 1) {
          p.set(x, y + jaw / 2, y >= cy + 5 ? '#fffef0' : pal.belly);
        }
      }
    }
  }
  return finish(p);
}

// ---------- Gift (20x20 logical, drifting rewarded-ad parcel) ----------

function gift(frame) {
  const p = new Pix(20, 20);
  const bob = frame === 1 ? 1 : 0;
  // Parcel body with shaded sides
  p.cylRect(3, 7 + bob, 14, 10, ['#d0685c', '#b03a2e', '#7a2418']);
  // Lid
  p.rect(2, 5 + bob, 16, 3, '#c2482e');
  p.rect(2, 5 + bob, 16, 1, '#e0705c');
  // Gold ribbon, vertical + bow
  p.rect(9, 4 + bob, 3, 13, '#ffd166');
  p.rect(9, 4 + bob, 1, 13, '#ffe8a0');
  p.tri(6, 2 + bob, 10, 5 + bob, 6, 6 + bob, '#c99a2e');
  p.tri(14, 2 + bob, 10, 5 + bob, 14, 6 + bob, '#c99a2e');
  p.set(10, 4 + bob, '#ffe8a0'); // knot glint
  const out = finish(p);
  out.halo('#ffd16666');
  return out;
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
  // Tiers 13-25: the late-game arsenal (Sean: no more recycling past 12)
  { blade: '#bce8f8', len: 18, w: 4, guard: '#6aa8c4', gem: '#ffffff', glow: '#bce8f890', name: 'frost' },
  { blade: '#8ad84e', len: 18, w: 5, guard: '#4e8a2e', gem: '#2c5c14', glow: '#8ad84e90', name: 'venom' },
  { blade: '#d84e5c', len: 19, w: 5, guard: '#7a1c24', gem: '#14060a', glow: '#d84e5c90', name: 'blood' },
  { blade: '#3c3450', len: 19, w: 5, guard: '#9d7aff', gem: '#c8b4ff', glow: '#9d7aff90', name: 'void' },
  { blade: '#e8e8ff', len: 20, w: 4, guard: '#8a8ac0', gem: '#4ec3e8', glow: '#c8c8ff90', name: 'moon' },
  { blade: '#e8dcc0', len: 20, w: 6, guard: '#c99a2e', gem: '#c2482e', glow: '#e8dcc090', name: 'dragonbone' },
  { blade: '#5ce8c4', len: 21, w: 5, guard: '#2a8a70', gem: '#e8fff8', glow: '#5ce8c490', name: 'soul' },
  { blade: '#ff7a2e', len: 21, w: 6, guard: '#8a2408', gem: '#ffe86b', glow: '#ff7a2e95', name: 'infernal' },
  { blade: '#4e8ae8', len: 22, w: 5, guard: '#1c3c8a', gem: '#bce8f8', glow: '#4e8ae890', name: 'tide' },
  { blade: '#fff2c8', len: 22, w: 6, guard: '#e8b84e', gem: '#ff9adc', glow: '#fff2c895', name: 'celestial' },
  { blade: '#6a2438', len: 23, w: 6, guard: '#2c0a14', gem: '#ff3c5c', glow: '#a8244890', name: 'doom' },
  { blade: '#a8ffd8', len: 23, w: 5, guard: '#5cb48a', gem: '#ffb4e8', glow: '#a8ffd895', name: 'aurora' },
  { blade: '#ffffff', len: 24, w: 6, guard: '#ffd166', gem: '#4ec3e8', glow: '#ffffff98', name: 'godsteel' },
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

// Premium IAP weapons (gear frames 25-27): shapes the spec-driven sword
// renderer can't make — a scythe, a katana, a dragon cleaver.

function scythe() {
  const p = new Pix(24, 28);
  // Dark wooden snath, leaning slightly
  p.line(15, 4, 12, 26, '#5c3a1c');
  p.line(16, 4, 13, 26, '#3a2a1e');
  // Grip wraps
  p.rect(13, 20, 3, 1, '#8a5a2e');
  p.rect(14, 14, 3, 1, '#8a5a2e');
  // Crescent blade sweeping left from the collar
  p.tri(16, 4, 1, 7, 13, 11, '#e8ecf4');
  p.tri(1, 7, 8, 10, 13, 11, '#c9ced4');
  p.line(2, 8, 14, 5, '#ffffff'); // honed edge shine
  p.set(1, 8, '#9aa0a6');
  p.set(2, 9, '#9aa0a6');
  // Collar binding blade to shaft + soul gem
  p.rect(14, 3, 4, 3, '#6f7378');
  p.set(15, 4, '#8aff8a');
  const out = pad(p, 2);
  out.outline();
  out.halo('#8aff8a90');
  return out;
}

function voidKatana() {
  const p = new Pix(24, 28);
  // Slim curved blade: layered diagonal strokes, pink edge on void steel
  p.line(18, 1, 11, 17, '#2a1a3e');
  p.line(17, 1, 10, 17, '#5c3a8a');
  p.line(16, 1, 9, 17, '#e86aff');
  p.set(17, 0, '#ffffff'); // tip gleam
  p.set(15, 4, '#ffffff');
  // Round tsuba guard
  p.circle(10, 19, 2.5, '#c99a2e');
  p.set(10, 19, '#8a5a2e');
  // Wrapped grip with diamond studs
  p.line(11, 21, 13, 26, '#2a2a3a');
  p.line(12, 21, 14, 26, '#3a3a4e');
  p.set(12, 22, '#e86aff');
  p.set(13, 24, '#e86aff');
  const out = pad(p, 2);
  out.outline();
  out.halo('#e86aff90');
  return out;
}

function dragonCleaver() {
  const p = new Pix(24, 28);
  // Massive bone blade, wedge with a slanted tip
  p.cylRect(7, 4, 8, 13, ['#f4ecd8', '#e8dcc0', '#c0b090']);
  p.tri(7, 4, 15, 4, 11, 0, '#e8dcc0');
  p.line(7, 4, 7, 16, '#fff6e0'); // cutting edge
  // Dragon-teeth serrations jutting off the spine
  for (let i = 0; i < 4; i++) {
    p.tri(15, 4 + i * 3, 20, 6 + i * 3, 15, 8 + i * 3, '#e8dcc0');
    p.line(15, 8 + i * 3, 19, 6 + i * 3, '#8a7a58');
  }
  // Ember veins in the bone
  p.set(11, 7, '#ff9a3c');
  p.set(13, 10, '#ff9a3c');
  p.set(10, 13, '#ff6a2e');
  // Scaled guard, wrapped grip, fanged pommel
  p.rect(7, 17, 10, 2, '#8a2e1c');
  p.rect(7, 17, 10, 1, '#c2482e');
  p.rect(11, 17, 2, 2, '#ff4a4a'); // dragon-eye gem
  for (let y = 0; y < 5; y++) p.rect(11, 19 + y, 2, 1, y % 2 ? '#3a2a1e' : '#5c3a1c');
  p.rect(10, 24, 4, 2, '#8a2e1c');
  const out = pad(p, 2);
  out.outline();
  out.halo('#ff9a3c90');
  return out;
}

// Founder's Blade — the Founder's Pack exclusive. A regal broadsword: a
// bright amethyst blade down the centre, gold crossguard with winged quillons
// and a crowned pommel gem. Reads as "the first champion's" weapon.
function founderSword() {
  const p = new Pix(24, 28);
  // Straight-edged blade body (parallel sides), violet steel with a sheen
  p.cylRect(10, 4, 4, 13, ['#e6d2ff', '#b98cff', '#6a45c0']); // rows 4..16
  // A long, fine point tapering off the top — just the tip narrows, so the
  // blade keeps its broadsword shape but no longer reads squared off.
  p.tri(10, 4, 12, 4, 12, -4, '#8a5cd0'); // left half of the point (shadow)
  p.tri(12, 4, 14, 4, 12, -4, '#c9a6ff'); // right half of the point (lit)
  p.rect(11, 4, 1, 12, '#f4ecff'); // fuller shine down the blade
  p.line(12, 4, 12, -3, '#f4ecff'); // shine carried into the tip
  p.set(12, -3, '#ffffff'); // tip gleam
  p.set(12, 9, '#ffffff');
  // Gold winged crossguard sweeping up at the tips
  p.rect(6, 17, 12, 2, '#ffd166');
  p.rect(6, 17, 12, 1, '#ffe8a0');
  p.tri(6, 18, 3, 15, 7, 18, '#ffd166');
  p.tri(18, 18, 21, 15, 17, 18, '#ffd166');
  p.set(4, 16, '#ffe8a0');
  p.set(19, 16, '#ffe8a0');
  // Wrapped grip
  for (let y = 0; y < 5; y++) p.rect(11, 19 + y, 2, 1, y % 2 ? '#4a2e8a' : '#6a45c0');
  // Crowned pommel with a bright gem
  p.domeEllipse(12, 25, 2.5, 2, ['#ffe8a0', '#ffd166', '#c9961e']);
  p.set(12, 25, '#b98cff');
  const out = pad(p, 2);
  out.outline();
  out.halo('#b98cff98');
  return out;
}

// ---------- Tier 26-75 arsenal (Sean: triple the weapon art) ----------
// Ten material bands of five weapons each, alternating two class sets so
// maces, spears, axes, lances, greatswords, flails, tridents, halberds,
// glaives and warhammers all appear. Same 24x28 canvas + pad/outline/halo
// finish as the tier blades, so they sit seamlessly in gear.png.

const ARSENAL_BANDS = [
  { name: 'obsidian', metal: '#3a3440', edge: '#6a5e78', gem: '#ff7a3c', glow: null },
  { name: 'moonsteel', metal: '#cfd8ea', edge: '#f4f8ff', gem: '#8ab4ff', glow: '#cfd8ea80' },
  { name: 'emberforge', metal: '#c2482e', edge: '#ff9a3c', gem: '#ffd166', glow: '#ff9a3c88' },
  { name: 'verdant', metal: '#4e8a3c', edge: '#8ee87a', gem: '#ffd166', glow: '#8ee87a88' },
  { name: 'stormforged', metal: '#6b4fd0', edge: '#b39dff', gem: '#fff36b', glow: '#b39dff90' },
  { name: 'frostbound', metal: '#7ac8e8', edge: '#d8f4ff', gem: '#ffffff', glow: '#a8e8ff90' },
  { name: 'bloodforged', metal: '#8a1c2e', edge: '#ff3c5c', gem: '#ffb4b4', glow: '#ff3c5c90' },
  { name: 'voidtouched', metal: '#4a3468', edge: '#e86aff', gem: '#8aff8a', glow: '#e86aff90' },
  { name: 'dragonbone', metal: '#e8dcc0', edge: '#fff6e0', gem: '#ff4a4a', glow: '#ff9a3c90' },
  { name: 'astral', metal: '#fff2c8', edge: '#ffffff', gem: '#4ec3e8', glow: '#ffffff98' },
];

/** Vertical wooden haft with light/shadow edges, x is the left column. */
function haft(p, x, top, bottom) {
  p.rect(x, top, 1, bottom - top, '#6b4423');
  p.rect(x + 1, top, 1, bottom - top, '#3a2a1e');
}

function gripWrap(p, x, y, h) {
  for (let i = 0; i < h; i++) p.rect(x, y + i, 2, 1, i % 2 ? '#3a2a1e' : '#5c3a1c');
}

function armMace(b) {
  const p = new Pix(24, 28);
  haft(p, 11, 11, 23);
  gripWrap(p, 11, 23, 4);
  p.rect(10, 26, 4, 1, b.metal);
  // Heavy flanged ball
  p.domeEllipse(12, 6, 4.5, 4.5, [b.edge, b.metal, shade(b.metal, 0.65)]);
  // Spikes at the compass points
  p.tri(12, -1, 10, 3, 14, 3, b.edge);
  p.tri(5, 6, 8, 4, 8, 8, b.edge);
  p.tri(19, 6, 16, 4, 16, 8, b.edge);
  p.set(12, 6, b.gem);
  p.set(11, 5, '#ffffff');
  return finishArm(p, b);
}

function armSpear(b) {
  const p = new Pix(24, 28);
  haft(p, 11, 9, 26);
  gripWrap(p, 11, 18, 3);
  // Leaf-shaped head
  p.tri(11.5, 0, 8.5, 6, 14.5, 6, b.metal);
  p.tri(8.5, 6, 14.5, 6, 11.5, 10, b.metal);
  p.line(11, 1, 11, 8, b.edge);
  p.set(11, 0, '#ffffff');
  // Binding collar + gem
  p.rect(10, 9, 4, 2, shade(b.metal, 0.7));
  p.set(11, 9, b.gem);
  return finishArm(p, b);
}

function armAxe(b) {
  const p = new Pix(24, 28);
  haft(p, 11, 3, 24);
  gripWrap(p, 11, 21, 4);
  // Twin crescent blades
  p.tri(10, 4, 3, 3, 4, 12, b.metal);
  p.tri(10, 4, 4, 12, 10, 11, shade(b.metal, 0.8));
  p.tri(13, 4, 20, 3, 19, 12, b.metal);
  p.tri(13, 4, 19, 12, 13, 11, shade(b.metal, 0.8));
  p.line(3, 4, 4, 11, b.edge);
  p.line(20, 4, 19, 11, b.edge);
  // Crown spike + eye gem
  p.tri(12, 0, 10, 3, 14, 3, b.edge);
  p.rect(11, 6, 2, 2, b.gem);
  p.set(11, 6, '#ffffff');
  return finishArm(p, b);
}

function armLance(b) {
  const p = new Pix(24, 28);
  // Jousting cone from broad base to needle tip
  p.tri(12, 0, 8, 16, 16, 16, b.metal);
  p.line(12, 0, 9, 15, b.edge);
  p.set(12, 0, '#ffffff');
  // Spiral fluting
  p.set(11, 5, shade(b.metal, 0.7));
  p.set(13, 8, shade(b.metal, 0.7));
  p.set(10, 11, shade(b.metal, 0.7));
  p.set(14, 14, shade(b.metal, 0.7));
  // Guard bell + gem
  p.domeEllipse(12, 17, 5, 2.5, [b.edge, b.metal, shade(b.metal, 0.65)]);
  p.set(12, 16, b.gem);
  gripWrap(p, 11, 20, 5);
  p.rect(10, 25, 4, 2, b.metal);
  return finishArm(p, b);
}

function armGreatsword(b) {
  // The band finale rides the proven sword renderer, supersized.
  // len 18 keeps the tip on canvas (24 would run off the top edge).
  return weapon({ blade: b.metal, len: 18, w: 7, guard: shade(b.metal, 0.6), gem: b.gem, glow: b.glow ?? undefined, name: `${b.name}-greatblade` });
}

function armFlail(b) {
  const p = new Pix(24, 28);
  haft(p, 8, 16, 26);
  gripWrap(p, 8, 22, 4);
  // Chain climbing to the ball
  p.set(10, 15, '#8a8f96');
  p.set(12, 13, '#6f7378');
  p.set(13, 11, '#8a8f96');
  // Spiked ball high right
  p.domeEllipse(16, 7, 3.5, 3.5, [b.edge, b.metal, shade(b.metal, 0.65)]);
  p.tri(16, 1, 14.5, 4, 17.5, 4, b.edge);
  p.tri(11, 7, 13, 5.5, 13, 8.5, b.edge);
  p.tri(21, 7, 19, 5.5, 19, 8.5, b.edge);
  p.set(16, 7, b.gem);
  return finishArm(p, b);
}

function armTrident(b) {
  const p = new Pix(24, 28);
  haft(p, 11, 10, 26);
  gripWrap(p, 11, 19, 3);
  // Crossbar
  p.rect(7, 9, 10, 2, b.metal);
  p.rect(7, 9, 10, 1, b.edge);
  // Three prongs
  p.rect(7, 3, 2, 6, b.metal);
  p.tri(8, 0, 7, 3, 9, 3, b.edge);
  p.rect(15, 3, 2, 6, b.metal);
  p.tri(16, 0, 15, 3, 17, 3, b.edge);
  p.rect(11, 1, 2, 8, b.metal);
  p.tri(12, -2, 11, 1, 13, 1, b.edge);
  p.set(11, 10, b.gem);
  return finishArm(p, b);
}

function armHalberd(b) {
  const p = new Pix(24, 28);
  haft(p, 11, 2, 26);
  gripWrap(p, 11, 20, 4);
  // Top spike
  p.tri(12, -1, 10, 3, 14, 3, b.edge);
  // Axe face on the right
  p.tri(13, 4, 20, 5, 19, 13, b.metal);
  p.tri(13, 4, 19, 13, 13, 12, shade(b.metal, 0.8));
  p.line(20, 5, 19, 12, b.edge);
  // Back hook
  p.tri(10, 6, 5, 8, 10, 10, b.metal);
  p.set(11, 7, b.gem);
  return finishArm(p, b);
}

function armGlaive(b) {
  const p = new Pix(24, 28);
  haft(p, 10, 12, 26);
  gripWrap(p, 10, 20, 3);
  // Sweeping single-edged blade
  p.tri(11, 12, 9, 2, 17, 5, b.metal);
  p.tri(9, 2, 17, 5, 15, 11, shade(b.metal, 0.85));
  p.line(9, 2, 16, 11, b.edge);
  p.set(9, 1, '#ffffff');
  // Collar + gem
  p.rect(9, 11, 4, 2, shade(b.metal, 0.7));
  p.set(10, 11, b.gem);
  return finishArm(p, b);
}

function armWarhammer(b) {
  const p = new Pix(24, 28);
  haft(p, 11, 8, 24);
  gripWrap(p, 11, 21, 4);
  // Massive bevelled head
  p.cylRect(5, 2, 14, 6, [b.edge, b.metal, shade(b.metal, 0.65)]);
  p.rect(5, 2, 14, 1, b.edge);
  // Striking faces
  p.rect(4, 3, 1, 4, b.edge);
  p.rect(19, 3, 1, 4, b.edge);
  // Crown spike + gem
  p.tri(12, -1, 10, 2, 14, 2, b.edge);
  p.rect(11, 4, 2, 2, b.gem);
  p.set(11, 4, '#ffffff');
  return finishArm(p, b);
}

function finishArm(p, b) {
  const out = pad(p, 2);
  out.outline();
  if (b.glow) out.halo(b.glow);
  return out;
}

// Even bands get set A, odd bands set B; the final astral weapon is the
// Eternity Blade — the last thing anyone ever merges deserves to be a sword.
const ARSENAL_SET_A = [armMace, armSpear, armAxe, armLance, armGreatsword];
const ARSENAL_SET_B = [armFlail, armTrident, armHalberd, armGlaive, armWarhammer];
const ARSENAL = ARSENAL_BANDS.flatMap((band, i) => {
  const set = i % 2 === 0 ? ARSENAL_SET_A : ARSENAL_SET_B;
  return set.map((draw) => () => draw(band));
});
ARSENAL[ARSENAL.length - 1] = () =>
  weapon({ blade: '#ffffff', len: 18, w: 7, guard: '#ffd166', gem: '#ff9adc', glow: '#ffffff98', name: 'eternity' });

// ---------- The Labyrinth mine props (22x22 + pad -> 26x26 frames) ----------
// Frames: 0 gold vein, 1 gem crystal, 2 fuel torch, 3 ladder, 4 rubble,
// 5 pickaxe, 6 treasure chest, 7 treasure hoard. Drawn on transparent
// tiles; the scene lays them over its own cave floor and dims them with
// the torchlight falloff.

function mineVein() {
  const p = new Pix(22, 22);
  // rock knuckle the gold is set in
  p.domeEllipse(11, 12, 9, 8, ['#6a5e78', '#584a66', '#40364e']);
  for (const [x, y, r] of [[7, 9, 3], [13, 7, 2], [14, 13, 3], [8, 15, 2], [11, 11, 2]]) {
    p.ellipse(x, y, r, r, '#ffd166');
  }
  p.set(6, 8, '#fff5c8');
  p.set(14, 12, '#fff5c8');
  p.set(12, 6, '#fff5c8');
  const out = pad(p, 2);
  out.outline();
  return out;
}

function mineCrystal() {
  const p = new Pix(22, 22);
  p.tri(11, 2, 16, 11, 11, 20, '#6ee3ff');
  p.tri(11, 2, 6, 11, 11, 20, '#4ec3e8');
  p.line(11, 3, 11, 19, '#dcfaff');
  // small side shard
  p.tri(17, 10, 20, 14, 16, 16, '#4ec3e8');
  p.set(11, 4, '#ffffff');
  const out = pad(p, 2);
  out.outline();
  out.halo('#6ee3ff70');
  return out;
}

function mineFuel() {
  const p = new Pix(22, 22);
  p.cylRect(10, 8, 3, 12, ['#8a5a2e', '#5c3a1c', '#3a2a1e']);
  p.rect(9, 12, 5, 1, '#8a5a2e');
  p.ellipse(11, 6, 4, 4, '#ff9a3c');
  p.ellipse(11, 6, 2, 2, '#ffe696');
  p.set(11, 2, '#ffe696');
  const out = pad(p, 2);
  out.outline();
  out.halo('#ff9a3c80');
  return out;
}

function mineLadder() {
  const p = new Pix(22, 22);
  // dark hole beneath
  p.ellipse(11, 12, 9, 8, '#14101c');
  p.cylRect(5, 2, 2, 18, ['#d8b27a', '#bc9e64', '#8a744a']);
  p.cylRect(15, 2, 2, 18, ['#d8b27a', '#bc9e64', '#8a744a']);
  for (const y of [4, 9, 14]) p.rect(6, y, 10, 2, '#bc9e64');
  const out = pad(p, 2);
  out.outline();
  return out;
}

function mineRubble() {
  const p = new Pix(22, 22);
  for (const [x, y, r] of [[7, 15, 2], [12, 16, 2], [16, 14, 1], [10, 13, 1], [14, 17, 1]]) {
    p.ellipse(x, y, r + 1, r, '#584a66');
    p.set(x - 1, y - 1, '#6a5e78');
  }
  const out = pad(p, 2);
  out.outline();
  return out;
}

function mineChest() {
  const p = new Pix(22, 22);
  // banded wooden body with a domed lid
  p.domeEllipse(11, 9, 8, 5, ['#a8703a', '#8a5a2e', '#5c3a1c']);
  p.cylRect(3, 9, 16, 9, ['#8a5a2e', '#6e4322', '#4a2e18']);
  // gold trim: lid seam, feet band, centre strap
  p.rect(3, 11, 16, 1, '#ffd166');
  p.rect(3, 16, 16, 1, '#c9961e');
  p.rect(10, 4, 2, 14, '#c9961e');
  // hasp + keyhole
  p.rect(9, 11, 4, 4, '#ffd166');
  p.set(10, 13, '#4a2e18');
  p.set(11, 13, '#4a2e18');
  // lamplight glint on the lid
  p.set(6, 6, '#ffe696');
  p.set(7, 6, '#ffe696');
  const out = pad(p, 2);
  out.outline();
  out.halo('#ffd16660');
  return out;
}

function mineTreasure() {
  const p = new Pix(22, 22);
  // heaped gold
  p.domeEllipse(11, 15, 9, 5, ['#ffe696', '#ffd166', '#c9961e']);
  p.domeEllipse(7, 12, 4, 3, ['#ffe696', '#ffd166', '#c9961e']);
  p.domeEllipse(15, 12, 4, 3, ['#ffe696', '#ffd166', '#c9961e']);
  // a crown's spikes poking from the pile
  p.tri(11, 4, 9, 8, 13, 8, '#ffd166');
  p.set(11, 5, '#ffe696');
  // gems tumbled down the sides
  p.rect(4, 15, 2, 2, '#6ee3ff');
  p.rect(16, 14, 2, 2, '#ff9adc');
  p.rect(12, 17, 2, 2, '#7ef29a');
  // sparkles
  p.set(6, 10, '#ffffff');
  p.set(15, 9, '#ffffff');
  p.set(11, 12, '#ffffff');
  const out = pad(p, 2);
  out.outline();
  out.halo('#ffd16680');
  return out;
}

function minePickaxe() {
  const p = new Pix(22, 22);
  // haft, diagonal
  p.line(6, 18, 14, 6, '#8a5a2e');
  p.line(7, 18, 15, 6, '#5c3a1c');
  // curved steel head
  p.line(9, 4, 19, 9, '#c9ced4');
  p.line(9, 5, 19, 10, '#8a8f96');
  p.set(8, 5, '#e8ecf4');
  p.set(19, 8, '#e8ecf4');
  const out = pad(p, 2);
  out.outline();
  return out;
}

// ---------- The Town (walkable): buildings as real structures ----------
// Each structure is its own PNG so the scene can place them freely. All
// finished with the house outline; glows get halos. The smithy and the
// soulforge statue ship two frames for a light flicker.

function townCastle(stage = 0) {
  // The Keep grows with its level: 0 modest keep, 1 grand (taller towers,
  // more banners, gold finials), 2 majestic (gold-capped spire, corner
  // turrets, glowing halo). All stages share one canvas so the sheet's
  // frames line up.
  const p = new Pix(150, 122);
  const Y = 20; // stage-0 content starts lower; taller stages reach up
  const stone = ['#a8a2b8', '#8a8598', '#6e6a80'];
  const stoneDark = ['#8a8598', '#6e6a80', '#565266'];
  const roof = stage === 2 ? '#5a4a80' : '#4c3a66';
  const roofHi = stage === 2 ? '#7a68a2' : '#6a5a7e';
  const finial = stage >= 1 ? '#ffd166' : '#8a8598';
  const towerLift = stage * 5; // towers climb with grandeur
  const spireLift = stage * 6;

  // central tall tower (behind the keep)
  p.cylRect(60, Y - spireLift + 10, 30, 52 + spireLift, stoneDark);
  p.tri(55, Y - spireLift + 12, 95, Y - spireLift + 12, 75, Y - spireLift - 6, roof);
  p.tri(60, Y - spireLift + 6, 90, Y - spireLift + 6, 75, Y - spireLift - 4, roofHi);
  if (stage === 2) {
    // gold cap on the spire
    p.tri(63, Y - spireLift + 4, 87, Y - spireLift + 4, 75, Y - spireLift - 5, '#ffd166');
    p.set(75, Y - spireLift - 6, '#ffe696');
  }
  p.rect(74, Y - spireLift - 6, 2, 6, '#b03a2e'); // flag pole + banner
  p.rect(76, Y - spireLift - 6, 8, 4, '#b03a2e');

  // side towers
  for (const tx of [8, 116]) {
    const ty = Y + 26 - towerLift;
    p.cylRect(tx, ty, 26, 62 + towerLift, stone);
    p.tri(tx - 4, ty + 2, tx + 30, ty + 2, tx + 13, ty - 18, roof);
    p.tri(tx + 1, ty - 4, tx + 25, ty - 4, tx + 13, ty - 16, roofHi);
    p.set(tx + 13, ty - 19, finial);
    if (stage >= 1) p.set(tx + 13, ty - 20, '#ffe696');
    // arrow slits
    p.rect(tx + 8, ty + 14, 3, 8, '#14101c');
    p.rect(tx + 15, ty + 28, 3, 8, '#14101c');
    // hanging banner (a second one on grander keeps)
    p.rect(tx + 9, ty + 4, 8, 14, '#b03a2e');
    p.tri(tx + 9, ty + 18, tx + 17, ty + 18, tx + 13, ty + 22, '#b03a2e');
    p.set(tx + 12, ty + 9, '#ffd166');
    p.set(tx + 13, ty + 9, '#ffd166');
    if (stage >= 1) {
      p.rect(tx + 1, ty + 26, 6, 10, '#b03a2e');
      p.tri(tx + 1, ty + 36, tx + 7, ty + 36, tx + 4, ty + 39, '#b03a2e');
    }
  }

  // corner turrets on the majestic keep
  if (stage === 2) {
    for (const tx of [34, 104]) {
      p.cylRect(tx, Y + 24, 12, 24, stoneDark);
      p.tri(tx - 2, Y + 25, tx + 14, Y + 25, tx + 6, Y + 12, roof);
      p.set(tx + 6, Y + 11, '#ffd166');
    }
  }

  // keep body
  p.cylRect(30, Y + 46, 90, 44, stone);
  // battlements (gold-trimmed at the top stage)
  for (let x = 30; x < 120; x += 10) {
    p.rect(x, Y + 40, 6, 8, stone[1]);
    if (stage === 2) p.rect(x, Y + 40, 6, 2, '#c9961e');
  }
  p.rect(30, Y + 46, 90, 2, stone[0]);
  // lit arched windows (more of them as the keep grows)
  const windows = stage >= 1 ? [42, 60, 92, 108, 51, 99] : [42, 60, 92, 108];
  for (const wx of windows) {
    p.rect(wx, Y + 56, 6, 9, '#ffd166');
    p.set(wx + 1, Y + 55, '#ffd166');
    p.set(wx + 4, Y + 55, '#ffd166');
    p.set(wx + 2, Y + 54, '#ffe696');
    p.set(wx + 3, Y + 54, '#ffe696');
  }
  // grand gate + raised portcullis
  p.rect(66, Y + 66, 18, 24, '#14101c');
  p.ellipse(75, Y + 68, 9, 6, '#14101c');
  p.rect(64, Y + 64, 22, 2, '#5c3a1c');
  for (let x = 68; x <= 82; x += 4) p.rect(x, Y + 66, 1, 8, '#8a744a');
  p.rect(66, Y + 74, 18, 1, '#8a744a');
  // stone texture
  p.noise(30, Y + 46, 90, 42, '#9a94ac', 9, 1);
  p.noise(8, Y + 4, 26, 78, '#b4aec6', 8, 2);
  p.noise(116, Y + 4, 26, 78, '#7a768c', 8, 3);
  const out = pad(p, 2);
  out.outline();
  if (stage === 2) out.halo('#ffd16630');
  return out;
}

function townBarn() {
  const p = new Pix(76, 62);
  // walls
  p.cylRect(4, 24, 68, 36, ['#b07c4a', '#9a6a3e', '#7a5230']);
  // gambrel roof: two banded slopes
  p.tri(0, 26, 38, 26, 38, 0, '#b03a2e');
  p.tri(76, 26, 38, 26, 38, 0, '#b03a2e');
  p.rect(6, 18, 64, 4, '#d05a42');
  p.rect(14, 10, 48, 4, '#d05a42');
  p.rect(2, 24, 72, 2, '#7a2418');
  // hayloft window + hay
  p.rect(32, 8, 12, 10, '#5c3a1c');
  p.rect(34, 10, 8, 7, '#ffd166');
  p.set(36, 9, '#ffe696');
  // big X door
  p.rect(28, 38, 20, 22, '#7a5230');
  p.rect(29, 39, 18, 20, '#5c3a1c');
  p.line(29, 39, 46, 58, '#bc9e64');
  p.line(46, 39, 29, 58, '#bc9e64');
  p.rect(28, 38, 20, 2, '#bc9e64');
  // lit windows
  for (const wx of [10, 58]) {
    p.rect(wx, 32, 9, 8, '#5c3a1c');
    p.rect(wx + 1, 33, 7, 6, '#ffd166');
  }
  p.noise(4, 26, 68, 32, '#8a5e36', 9, 4);
  const out = pad(p, 2);
  out.outline();
  return out;
}

function townSmith(hot) {
  const p = new Pix(72, 60);
  // stone walls
  p.cylRect(4, 22, 64, 36, ['#8a8598', '#6e6a80', '#565266']);
  p.noise(4, 24, 64, 32, '#9a94ac', 6, 5);
  p.noise(4, 24, 64, 32, '#5a5668', 7, 6);
  // slate roof
  p.tri(0, 24, 72, 24, 36, 2, '#564a68');
  p.tri(10, 20, 62, 20, 36, 6, '#6a5a7e');
  // chimney + ember smoke
  p.cylRect(50, 2, 10, 18, ['#8a8598', '#6e6a80', '#565266']);
  p.rect(48, 0, 14, 3, '#565266');
  // open forge mouth with heat gradient
  p.rect(24, 34, 24, 24, '#14101c');
  p.ellipse(36, 36, 12, 7, '#14101c');
  p.rect(26, hot ? 42 : 46, 20, 16, '#ff7a28');
  p.rect(28, hot ? 46 : 50, 16, 12, '#ffb246');
  p.rect(32, hot ? 50 : 53, 8, 8, '#ffe696');
  // anvil on a stump, out front
  p.cylRect(8, 50, 10, 8, ['#8a5a2e', '#5c3a1c', '#4a2e18']);
  p.rect(6, 46, 14, 5, '#6e6a80');
  p.rect(4, 44, 18, 3, '#8a8598');
  p.set(5, 44, '#a8a2b8');
  // weapon rack by the door
  p.rect(56, 40, 2, 18, '#5c3a1c');
  p.rect(62, 40, 2, 18, '#5c3a1c');
  p.rect(54, 42, 12, 2, '#8a5a2e');
  p.line(57, 44, 57, 56, '#c9ced4');
  p.line(63, 44, 63, 56, '#c9ced4');
  const out = pad(p, 2);
  out.outline();
  if (hot) out.halo('#ff9a3c50');
  return out;
}

function townMine() {
  const p = new Pix(72, 54);
  // rocky hill
  p.domeEllipse(34, 26, 32, 24, ['#a8a2b8', '#8a8598', '#6e6a80']);
  p.noise(4, 6, 62, 40, '#9a94ac', 6, 7);
  p.noise(4, 6, 62, 40, '#5a5668', 8, 8);
  // timber portal
  p.rect(22, 22, 24, 28, '#14101c');
  p.cylRect(18, 20, 5, 30, ['#bc9e64', '#8a5a2e', '#5c3a1c']);
  p.cylRect(45, 20, 5, 30, ['#bc9e64', '#8a5a2e', '#5c3a1c']);
  p.rect(16, 16, 36, 5, '#8a5a2e');
  p.rect(16, 16, 36, 2, '#bc9e64');
  // lantern in the dark
  p.set(33, 32, '#ffd166');
  p.set(34, 32, '#ffe696');
  p.set(33, 33, '#ff9a3c');
  // rails out of the mouth
  p.rect(26, 50, 2, 4, '#8a8f96');
  p.rect(40, 50, 2, 4, '#8a8f96');
  p.rect(24, 52, 20, 1, '#5c3a1c');
  // ore cart
  p.cylRect(52, 40, 18, 10, ['#8a5a2e', '#5c3a1c', '#4a2e18']);
  for (const [ox, oy] of [[56, 38], [61, 36], [65, 38]]) {
    p.ellipse(ox, oy, 3, 2, '#ffd166');
    p.set(ox - 1, oy - 1, '#ffe696');
  }
  p.ellipse(56, 51, 3, 3, '#2a2434');
  p.ellipse(66, 51, 3, 3, '#2a2434');
  const out = pad(p, 2);
  out.outline();
  return out;
}

function townJeweler() {
  const p = new Pix(68, 60);
  // violet walls
  p.cylRect(4, 20, 60, 38, ['#a082c0', '#8a6aa8', '#6e5289']);
  // roof
  p.tri(0, 22, 68, 22, 34, 2, '#4c3a66');
  p.tri(8, 18, 60, 18, 34, 6, '#6a5a7e');
  p.set(34, 4, '#ffd166'); // finial
  // striped awning over the window
  for (let i = 0; i < 8; i++) {
    p.rect(6 + i * 6, 26, 6, 7, i % 2 === 0 ? '#e6d4ff' : '#8a6aa8');
  }
  p.rect(6, 26, 48, 1, '#4c3a66');
  // display window with gems on velvet
  p.rect(8, 36, 26, 16, '#2a2040');
  p.rect(9, 37, 24, 14, '#3a2c54');
  for (const [gx, gy, c] of [[14, 44, '#6ee3ff'], [21, 42, '#ff9adc'], [28, 45, '#7ef29a']]) {
    p.tri(gx, gy - 4, gx + 3, gy, gx, gy + 4, c);
    p.tri(gx, gy - 4, gx - 3, gy, gx, gy + 4, shade(c, 0.75));
    p.set(gx, gy - 2, '#ffffff');
  }
  // door with lamp
  p.rect(44, 38, 14, 20, '#4a3560');
  p.rect(45, 39, 12, 18, '#3a2c54');
  p.set(54, 48, '#ffd166');
  // hanging gem shop sign
  p.rect(58, 14, 1, 8, '#bc9e64');
  p.tri(58, 22, 63, 27, 58, 32, '#6ee3ff');
  p.tri(58, 22, 53, 27, 58, 32, '#4ec3e8');
  p.set(57, 25, '#dcfaff');
  const out = pad(p, 2);
  out.outline();
  return out;
}

function townTree() {
  const p = new Pix(30, 40);
  p.cylRect(13, 24, 4, 14, ['#8a5a2e', '#5c3a1c', '#4a2e18']);
  p.domeEllipse(15, 14, 13, 13, ['#5a9a52', '#3a7a3e', '#2a5a30']);
  p.set(9, 8, '#78b468');
  p.set(10, 8, '#78b468');
  p.set(20, 12, '#78b468');
  const out = pad(p, 2);
  out.outline();
  return out;
}

function townLamp() {
  const p = new Pix(16, 32);
  p.cylRect(7, 8, 2, 22, ['#6e6a80', '#565266', '#40364e']);
  p.rect(4, 28, 8, 2, '#40364e');
  p.rect(4, 0, 8, 8, '#2a2434');
  p.rect(5, 1, 6, 6, '#ffd166');
  p.set(7, 2, '#ffe696');
  p.set(8, 2, '#ffe696');
  const out = pad(p, 2);
  out.outline();
  out.halo('#ffd16650');
  return out;
}

function townStatue(f) {
  const p = new Pix(34, 46);
  // plinth
  p.cylRect(4, 36, 26, 8, ['#a8a2b8', '#8a8598', '#6e6a80']);
  p.rect(2, 34, 30, 3, '#a8a2b8');
  // anvil
  p.cylRect(10, 26, 14, 9, ['#6e6a80', '#565266', '#40364e']);
  p.rect(7, 22, 20, 5, '#8a8598');
  p.rect(7, 22, 20, 2, '#a8a2b8');
  // soul flame, bobbing between frames
  const fy = f === 0 ? 10 : 8;
  p.ellipse(17, fy, 5, 7, '#a882f0');
  p.ellipse(17, fy + 1, 3, 4, '#d6beff');
  p.set(17, fy - 5, '#a882f0');
  const out = pad(p, 2);
  out.outline();
  out.halo('#a882f060');
  return out;
}

// ---------- Extra town dressing for the single-screen village ----------

function townWindmill() {
  const p = new Pix(46, 62);
  // round stone tower
  p.cylRect(12, 26, 22, 32, ['#cdb890', '#a88f64', '#7a6544']);
  p.noise(12, 28, 22, 28, '#8a7452', 7, 41);
  // conical timber cap
  p.tri(7, 28, 39, 28, 23, 12, '#6a4a2e');
  p.tri(11, 26, 35, 26, 23, 14, '#8a5a2e');
  // door + lit windows
  p.rect(19, 46, 8, 12, '#5c3a1c');
  p.rect(20, 47, 6, 10, '#3a2412');
  p.rect(15, 34, 5, 5, '#ffd166');
  p.rect(26, 34, 5, 5, '#ffd166');
  // sail hub + four cloth blades
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    p.line(23, 22, 23 + dx * 17, 22 + dy * 17, '#efe6d0');
    p.line(23 + dx, 22, 23 + dx * 16, 22 + dy * 15, '#c7bca0');
    p.line(23 + dx * 4, 22 + dy * 4, 23 + dx * 4 + dy * 4, 22 + dy * 4 - dx * 4, '#8a744a');
  }
  p.set(23, 22, '#3a2412');
  const out = pad(p, 2);
  out.outline();
  return out;
}

function townWell() {
  const p = new Pix(30, 36);
  // stone ring + water
  p.domeEllipse(15, 26, 13, 7, ['#b8b2c6', '#8a8598', '#6e6a80']);
  p.ellipse(15, 24, 10, 4, '#20304a');
  p.ellipse(15, 24, 8, 3, '#3a6a8a');
  p.noise(3, 22, 24, 10, '#9a94ac', 6, 42);
  // posts + little roof
  p.rect(4, 5, 2, 18, '#5c3a1c');
  p.rect(24, 5, 2, 18, '#5c3a1c');
  p.tri(1, 9, 29, 9, 15, 1, '#b03a2e');
  p.rect(2, 8, 26, 2, '#7a2418');
  p.line(15, 10, 15, 17, '#8a744a');
  p.rect(13, 17, 4, 4, '#8a5a2e'); // bucket
  const out = pad(p, 2);
  out.outline();
  return out;
}

function townFountain() {
  const p = new Pix(52, 48);
  // octagonal stone basin
  p.domeEllipse(26, 38, 24, 9, ['#b8b2c6', '#8a8598', '#6e6a80']);
  p.rect(4, 34, 44, 5, '#8a8598');
  p.ellipse(26, 34, 19, 5, '#2a5070'); // water
  p.ellipse(26, 34, 15, 4, '#4c92c4');
  p.set(20, 33, '#bfe6ff');
  p.set(31, 34, '#bfe6ff');
  // central pillar
  p.cylRect(22, 18, 8, 16, ['#b8b2c6', '#8a8598', '#6e6a80']);
  // floating purple soul crystal
  p.tri(26, 2, 19, 16, 26, 22, '#b47cf0');
  p.tri(26, 2, 33, 16, 26, 22, '#7a3ec0');
  p.line(26, 4, 26, 20, '#e2ccff');
  p.set(26, 7, '#ffffff');
  const out = pad(p, 2);
  out.outline();
  out.halo('#a066e055');
  return out;
}

function townBanner() {
  const p = new Pix(16, 44);
  p.rect(7, 2, 2, 40, '#3a2a1e'); // pole
  p.set(8, 1, '#ffd166'); // finial
  p.rect(9, 5, 6, 18, '#b03a2e'); // hanging banner
  p.tri(9, 23, 15, 23, 12, 27, '#b03a2e');
  p.rect(9, 5, 6, 2, '#7a2418');
  // gold lion-rampant hint
  p.set(11, 10, '#ffd166');
  p.set(12, 11, '#ffd166');
  p.set(11, 13, '#ffd166');
  p.set(12, 15, '#ffd166');
  const out = pad(p, 2);
  out.outline();
  return out;
}

function townBush() {
  const p = new Pix(20, 15);
  p.domeEllipse(10, 9, 9, 6, ['#5a9a52', '#3a7a3e', '#2a5a30']);
  p.set(5, 6, '#78b468');
  p.set(14, 7, '#78b468');
  p.set(8, 8, '#ff6a9a');
  p.set(12, 10, '#ffd166');
  const out = pad(p, 2);
  out.outline();
  return out;
}

// Draw helpers that paint straight onto the scene canvas ------------------

function grassBase(s) {
  s.rect(0, 0, s.w, s.h, '#4e7f3c');
  s.noise(0, 0, s.w, s.h, '#3f6a30', 3, 51);
  s.noise(0, 0, s.w, s.h, '#5c9048', 4, 52);
  s.noise(0, 0, s.w, s.h, '#6fa456', 7, 53);
}

function cobblePath(s, x, y, w, h) {
  s.rect(x, y, w, h, '#b6a06e');
  s.rect(x, y, w, 1, '#c9b684');
  s.noise(x, y, w, h, '#9a835a', 5, 54);
  s.noise(x, y, w, h, '#8a744a', 8, 55);
  // faint cobble seams
  for (let gy = y + 4; gy < y + h; gy += 6) s.rect(x, gy, w, 1, '#8a744a');
  for (let gx = x + 5; gx < x + w; gx += 7) s.rect(gx, y, 1, h, '#8a744a');
}

function fenceH(s, x, y, w) {
  s.rect(x, y + 2, w, 2, '#7a5230');
  s.rect(x, y + 7, w, 2, '#5c3a1c');
  for (let px = x; px <= x + w; px += 13) {
    s.rect(px, y, 3, 12, '#6b4423');
    s.rect(px, y, 1, 12, '#8a6a3a');
  }
}

function fenceV(s, x, y, h) {
  for (let py = y; py <= y + h; py += 13) {
    s.rect(x, py, 12, 3, '#6b4423');
    s.rect(x, py, 12, 1, '#8a6a3a');
  }
  s.rect(x + 2, y, 2, h, '#7a5230');
  s.rect(x + 7, y, 2, h, '#5c3a1c');
}

function wheatField(s, x, y, w, h) {
  s.rect(x, y, w, h, '#6a4a24');
  s.noise(x, y, w, h, '#553a1c', 5, 56);
  for (let wx = x + 2; wx < x + w - 1; wx += 4) {
    for (let wy = y + 3; wy < y + h; wy += 3) {
      s.rect(wx, wy, 1, 4, '#d9b24a');
      s.set(wx, wy - 1, '#f0d070');
    }
  }
}

function vegRows(s, x, y, w, h) {
  s.rect(x, y, w, h, '#5a3e20');
  for (let ry = y + 2; ry < y + h; ry += 4) {
    for (let rx = x + 1; rx < x + w; rx += 3) {
      s.set(rx, ry, '#4e9a3e');
      s.set(rx, ry - 1, '#6fbf54');
    }
  }
}

function flowers(s, x, y, n, seed) {
  const cols = ['#ff6a9a', '#ffd166', '#6ec8ff', '#ffffff', '#e86aff'];
  let r = seed >>> 0;
  const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff), r);
  for (let i = 0; i < n; i++) {
    const fx = x + (rnd() % 26);
    const fy = y + (rnd() % 14);
    const c = cols[rnd() % cols.length];
    s.set(fx, fy, c);
    s.set(fx, fy - 1, c);
    s.set(fx - 1, fy, shade(c, 0.7));
    s.set(fx, fy + 1, '#2a5a30');
  }
}

// Compose the whole single-screen village (390x844) for the mockup / scene.
function composeTownScene() {
  const s = new Pix(390, 844);
  grassBase(s);

  // Cobblestone cross-paths: a spine down the middle + two rungs
  cobblePath(s, 178, 150, 34, 650);
  cobblePath(s, 24, 356, 342, 28);
  cobblePath(s, 24, 636, 342, 28);

  // Framing trees around the edges
  for (const [x, y] of [[0, 150], [356, 150], [0, 470], [356, 470], [2, 700], [356, 700], [40, 130], [316, 132]]) {
    s.stamp(townTree(), x, y);
  }

  // THE KNIGHTS KEEP — top centre
  s.stamp(townCastle(2), 116, 120);
  s.stamp(townBanner(), 96, 210);
  s.stamp(townBanner(), 280, 210);

  // FARM (top-left, fenced): barn + windmill + well + fields + farmer
  fenceH(s, 16, 292, 158);
  fenceH(s, 16, 388, 158);
  fenceV(s, 16, 292, 100);
  fenceV(s, 162, 292, 100);
  vegRows(s, 22, 356, 40, 28);
  wheatField(s, 96, 352, 64, 34);
  s.stamp(townBarn(), 20, 300);
  s.stamp(townWindmill(), 104, 300);
  s.stamp(townWell(), 70, 348);

  // BLACKSMITH (top-right, fenced)
  fenceH(s, 216, 292, 158);
  fenceH(s, 216, 388, 158);
  fenceV(s, 216, 292, 100);
  fenceV(s, 362, 292, 100);
  s.stamp(townBanner(), 224, 300);
  s.stamp(townSmith(true), 286, 300);

  // THE SOULFORGE — centre fountain, flanked by lamps
  s.stamp(townLamp(), 150, 452);
  s.stamp(townLamp(), 222, 452);
  s.stamp(townFountain(), 168, 456);
  // the player knight, waiting by the fountain
  s.stamp(knight(0, SKINS[0].art), 172, 384);

  // MINE (bottom-left, rocky)
  s.stamp(townMine(), 16, 600);
  s.stamp(townBanner(), 150, 690);

  // JEWELER (bottom-right, fenced)
  fenceH(s, 216, 588, 158);
  fenceH(s, 216, 696, 158);
  fenceV(s, 216, 588, 112);
  fenceV(s, 362, 588, 112);
  s.stamp(townJeweler(), 296, 600);
  s.stamp(townBanner(), 224, 604);

  // Lamp posts down the spine + bushes/flowers softening the grass
  s.stamp(townLamp(), 150, 640);
  s.stamp(townLamp(), 222, 640);
  for (const [x, y] of [[70, 500], [300, 500], [50, 780], [300, 782], [176, 806]]) s.stamp(townBush(), x, y);
  for (const [x, y, seed] of [[60, 480, 7], [300, 470, 11], [130, 560, 13], [250, 560, 17], [40, 760, 19], [320, 760, 23]]) {
    flowers(s, x, y, 10, seed);
  }

  return s;
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
writeSheet(`${OUT}/enemy-serpent.png`, [serpent(0), serpent(1)], 1);
writeSheet(`${OUT}/enemy-ogre.png`, [ogre(0), ogre(1)], 1);
writeSheet(`${OUT}/enemy-cultist.png`, [cultist(0), cultist(1)], 1);
writeSheet(`${OUT}/enemy-ghoul.png`, [ghoul(0), ghoul(1)], 1);
writeSheet(`${OUT}/enemy-gargoyle.png`, [gargoyle(0), gargoyle(1)], 1);
writeSheet(`${OUT}/enemy-lich.png`, [lich(0), lich(1)], 1);
for (const [id, fn] of [
  ['pup', petPup],
  ['emberbat', petEmberbat],
  ['wisp', petWisp],
  ['pebble', petPebble],
  ['drake', petDrake],
]) {
  writeSheet(`${OUT}/pet-${id}.png`, [fn(0, 0), fn(1, 0)], 1);
  writeSheet(`${OUT}/pet-${id}-s1.png`, [fn(0, 1), fn(1, 1)], 1);
  writeSheet(`${OUT}/pet-${id}-s2.png`, [fn(0, 2), fn(1, 2)], 1);
}
writeSheet(`${OUT}/fairy.png`, [fairy(0), fairy(1)], 1);
writeSheet(`${OUT}/fairy-s1.png`, [fairy(0, 1), fairy(1, 1)], 1);
writeSheet(`${OUT}/fairy-s2.png`, [fairy(0, 2), fairy(1, 2)], 1);
for (const [name, pal] of Object.entries(DRAGON_PALETTES)) {
  writeSheet(`${OUT}/dragon-${name}.png`, [dungeonDragon(0, pal), dungeonDragon(1, pal)], 1);
}
writeSheet(`${OUT}/gift.png`, [gift(0), gift(1)], 1);
writeSheet(`${OUT}/mine.png`, [mineVein(), mineCrystal(), mineFuel(), mineLadder(), mineRubble(), minePickaxe(), mineChest(), mineTreasure()], 1);
writeSheet(`${OUT}/town-castle.png`, [townCastle(0), townCastle(1), townCastle(2)], 1);
writeSheet(`${OUT}/town-barn.png`, [townBarn()], 1);
writeSheet(`${OUT}/town-smith.png`, [townSmith(false), townSmith(true)], 1);
writeSheet(`${OUT}/town-mine.png`, [townMine()], 1);
writeSheet(`${OUT}/town-jeweler.png`, [townJeweler()], 1);
writeSheet(`${OUT}/town-tree.png`, [townTree()], 1);
writeSheet(`${OUT}/town-lamp.png`, [townLamp()], 1);
writeSheet(`${OUT}/town-statue.png`, [townStatue(0), townStatue(1)], 1);
// Single-screen village mockup (390x844) — the reference-style full-screen town
writeSheet(`${OUT}/town-mockup.png`, [composeTownScene()], 1);
// 25 tier blades + 50 arsenal weapons (tiers 26-75) + the premium IAP
// weapons: frames 75-77 (scythe/katana/cleaver) then 78 the Founder's Blade
// — swordSkins.ts derives all of them from weaponArtCount.
writeSheet(`${OUT}/gear.png`, [...WEAPONS.map(weapon), ...ARSENAL.map((f) => f()), scythe(), voidKatana(), dragonCleaver(), founderSword()], 2);
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

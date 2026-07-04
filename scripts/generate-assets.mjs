// Generates all game sprite sheets as chunky pixel art.
// Run: npm run assets  → writes committed PNGs into public/assets/.
// Art direction: EPIC ARMORED BEAST — an armored hedgehog knight with glowing
// blades battling fierce monsters through dark fantasy biomes.

import { Pix, shade } from './pixel.mjs';
import { writeSheet } from './pixel.mjs';

const OUT = 'public/assets';
const SCALE = 4;

// ---------- Hero: armored hedgehog knight (24x24, frames: idle0, idle1, attack) ----------

function hero(frame) {
  const p = new Pix(24, 24);
  const bounce = frame === 1 ? 1 : 0;
  const lean = frame === 2 ? 1 : 0;

  const SPIKE = '#4a3626';
  const SPIKE_TIP = '#8a94a8'; // iron-tipped spikes
  const STEEL = '#6a7488';
  const STEEL_HI = '#8a94a8';
  const STEEL_DK = '#4a5262';
  const GOLD = '#c9a227';
  const FUR = '#caa87a';

  const cx = 10 + lean;
  const cy = 13 + bounce;

  // Spiked back — dense fierce mane with iron-tipped spikes
  p.circle(cx - 1, cy - 1, 7, SPIKE);
  for (let a = 95; a <= 310; a += 21) {
    const rad = (a * Math.PI) / 180;
    const tx = cx - 1 + Math.cos(rad) * 10.5;
    const ty = cy - 1 + Math.sin(rad) * 10.5;
    const l = ((a - 14) * Math.PI) / 180;
    const r = ((a + 14) * Math.PI) / 180;
    p.tri(
      tx,
      ty,
      cx - 1 + Math.cos(l) * 6,
      cy - 1 + Math.sin(l) * 6,
      cx - 1 + Math.cos(r) * 6,
      cy - 1 + Math.sin(r) * 6,
      SPIKE,
    );
    // Iron tip
    p.set(tx, ty, SPIKE_TIP);
  }

  // Body / face
  const fx = 14 + lean;
  const fy = 14 + bounce;
  p.ellipse(fx, fy, 6, 6 - bounce * 0.5, FUR);

  // Chest plate
  p.rect(fx - 4, fy + 1, 9, 5, STEEL);
  p.rect(fx - 4, fy + 1, 9, 1, STEEL_HI);
  p.rect(fx - 4, fy + 5, 9, 1, STEEL_DK);
  p.set(fx, fy + 3, GOLD); // emblem

  // Helmet: steel cap with cheek guards + nose bar
  p.ellipse(fx, fy - 4, 6, 3, STEEL);
  p.rect(fx - 6, fy - 4, 12, 2, STEEL);
  p.rect(fx - 6, fy - 3, 2, 4, STEEL_DK); // left cheek guard
  p.rect(fx + 5, fy - 3, 2, 4, STEEL_DK); // right cheek guard
  p.rect(fx - 6, fy - 5, 12, 1, STEEL_HI);
  p.set(fx, fy - 6, GOLD); // crest stud
  p.set(fx + 1, fy - 6, GOLD);

  // Fierce eyes: angled brows over glowing amber eyes
  const squint = frame === 2 ? 1 : 0;
  p.set(fx - 3, fy - 2, '#1c1626');
  p.set(fx - 2, fy - 1, '#1c1626'); // left brow slant
  p.set(fx + 3, fy - 2, '#1c1626');
  p.set(fx + 2, fy - 1, '#1c1626'); // right brow slant
  p.rect(fx - 3, fy - 1 + squint, 2, 2 - squint, '#ffb347');
  p.rect(fx + 2, fy - 1 + squint, 2, 2 - squint, '#ffb347');
  p.set(fx - 3, fy - 1 + squint, '#fff3c4');
  p.set(fx + 2, fy - 1 + squint, '#fff3c4');

  // Snout
  p.set(fx + 5, fy + 0, '#3a2a1e');
  p.set(fx + 6, fy + 0, '#3a2a1e');

  // Steel boots
  p.rect(fx - 5, 21, 4, 3, STEEL_DK);
  p.rect(fx + 1, 21, 4, 3, STEEL_DK);
  p.rect(fx - 5, 21, 4, 1, STEEL);
  p.rect(fx + 1, 21, 4, 1, STEEL);

  p.edgeShade(0.55);
  return p;
}

// ---------- Enemies (20x20, 2 frames each) ----------

/** Fierce eyes: 2px glowing eyes with angled dark brows. */
function fierceEyes(p, cx, cy, color = '#ff4a4a') {
  p.set(cx - 3, cy - 1, '#14101c');
  p.set(cx + 3, cy - 1, '#14101c');
  p.rect(cx - 3, cy, 2, 1, color);
  p.rect(cx + 2, cy, 2, 1, color);
}

function wolf(frame) {
  const p = new Pix(20, 20);
  const C = '#6a707e';
  const DK = shade(C, 0.75);
  const crouch = frame === 1 ? 1 : 0;

  // Tail
  p.tri(1, 8 + crouch, 5, 10 + crouch, 4, 13 + crouch, DK);
  // Body: lunging forward
  p.ellipse(9, 13 + crouch, 6, 4, C);
  // Haunch
  p.ellipse(6, 13 + crouch, 3.5, 3.5, DK);
  // Head: forward, snarling
  p.ellipse(15, 9 + crouch, 4, 3.5, C);
  // Ears back
  p.tri(12, 5 + crouch, 14, 8 + crouch, 11, 8 + crouch, DK);
  p.tri(15, 4 + crouch, 17, 7 + crouch, 14, 7 + crouch, C);
  // Muzzle + fangs
  p.rect(17, 9 + crouch, 3, 2, DK);
  p.set(17, 11 + crouch, '#ffffff');
  p.set(19, 11 + crouch, '#ffffff');
  // Eye
  p.set(15, 8 + crouch, '#ff4a4a');
  p.set(14, 7 + crouch, '#14101c');
  // Legs
  p.rect(5, 16 + crouch, 2, 3 - crouch, DK);
  p.rect(12, 16 + crouch, 2, 3 - crouch, C);
  p.rect(15, 15 + crouch, 2, 4 - crouch, C);
  // Fur ridge
  p.set(8, 9 + crouch, DK);
  p.set(10, 8 + crouch, DK);
  p.edgeShade(0.55);
  return p;
}

function skeleton(frame) {
  const p = new Pix(20, 20);
  const BONE = '#e8e4d8';
  const DK = '#b8b2a0';
  const bob = frame === 1 ? 1 : 0;

  // Skull
  p.ellipse(10, 5 + bob, 4, 3.5, BONE);
  p.rect(8, 8 + bob, 5, 2, BONE); // jaw
  // Eye sockets: glowing
  p.rect(8, 4 + bob, 2, 2, '#14101c');
  p.rect(12, 4 + bob, 2, 2, '#14101c');
  p.set(8, 5 + bob, '#6be3ff');
  p.set(12, 5 + bob, '#6be3ff');
  // Nose + teeth
  p.set(10, 7 + bob, DK);
  p.set(8, 9 + bob, DK);
  p.set(10, 9 + bob, DK);
  p.set(12, 9 + bob, DK);
  // Ribcage
  p.rect(9, 11 + bob, 3, 1, BONE);
  p.rect(8, 12 + bob, 5, 1, BONE);
  p.rect(9, 13 + bob, 3, 1, BONE);
  p.rect(8, 14 + bob, 5, 1, BONE);
  // Spine
  p.rect(10, 10 + bob, 1, 6, DK);
  // Arms: one raised with a bone club
  p.line(8, 11 + bob, 4, 9 - bob, DK);
  p.line(13, 11 + bob, 16, 13 + bob, DK);
  p.rect(2, 5 - bob, 2, 5, BONE); // club
  p.set(2, 4 - bob, DK);
  // Pelvis + legs
  p.rect(9, 16 + bob, 3, 1, BONE);
  p.line(9, 17 + bob, 8, 19, DK);
  p.line(12, 17 + bob, 13, 19, DK);
  p.edgeShade(0.6);
  return p;
}

function spider(frame) {
  const p = new Pix(20, 20);
  const C = '#3a3244';
  const DK = shade(C, 0.7);
  const step = frame === 1 ? 1 : 0;

  // Legs: 4 each side, thicker, alternating with frame
  for (let i = 0; i < 4; i++) {
    const y = 8 + i * 3;
    const lift = (i + frame) % 2;
    p.line(8, 12, 1, y - lift, DK);
    p.line(8, 13, 1, y + 1 - lift, DK);
    p.line(12, 12, 19, y - lift, DK);
    p.line(12, 13, 19, y + 1 - lift, DK);
  }
  // Big abdomen with red hourglass marking
  p.ellipse(10, 13, 6, 4.5, C);
  p.ellipse(10, 12, 3, 1.5, shade(C, 1.2));
  p.tri(9, 12, 11, 12, 10, 14, '#ff4a4a');
  p.tri(9, 16, 11, 16, 10, 14, '#ff4a4a');
  // Head
  p.ellipse(10, 7 - step, 3.5, 3, shade(C, 1.25));
  // Eyes: row of glowing red
  p.set(8, 6 - step, '#ff4a4a');
  p.set(10, 6 - step, '#ff6b6b');
  p.set(12, 6 - step, '#ff4a4a');
  p.set(9, 7 - step, '#ff6b6b');
  p.set(11, 7 - step, '#ff6b6b');
  // Fangs
  p.set(9, 9 - step, '#e8e4d8');
  p.set(11, 9 - step, '#e8e4d8');
  p.edgeShade(0.55);
  return p;
}

function golem(frame) {
  const p = new Pix(20, 20);
  const ROCK = '#7a7284';
  const DK = shade(ROCK, 0.75);
  const MOSS = '#5a7a4a';
  const bob = frame === 1 ? 1 : 0;

  // Massive shoulders/torso
  p.ellipse(10, 11 + bob, 8, 6, ROCK);
  p.rect(2, 11 + bob, 16, 5, ROCK);
  // Cracks
  p.line(6, 9 + bob, 8, 13 + bob, DK);
  p.line(13, 8 + bob, 12, 12 + bob, DK);
  // Moss patches
  p.set(4, 9 + bob, MOSS);
  p.set(5, 9 + bob, MOSS);
  p.set(15, 13 + bob, MOSS);
  // Small head sunk in shoulders
  p.rect(7, 4 + bob, 6, 4, shade(ROCK, 1.1));
  // Glowing furnace eyes
  p.rect(8, 5 + bob, 1, 2, '#ffb347');
  p.rect(11, 5 + bob, 1, 2, '#ffb347');
  // Fists: huge, resting on the ground
  p.ellipse(2, 16, 2.5, 3, DK);
  p.ellipse(18, 16, 2.5, 3, DK);
  // Legs
  p.rect(6, 16 + bob, 3, 4 - bob, DK);
  p.rect(11, 16 + bob, 3, 4 - bob, DK);
  p.edgeShade(0.55);
  return p;
}

function imp(frame) {
  const p = new Pix(20, 20);
  const C = '#c2482e';
  const DK = shade(C, 0.75);
  const up = frame === 0;

  // Bat wings
  if (up) {
    p.tri(1, 4, 6, 9, 5, 13, DK);
    p.tri(19, 4, 14, 9, 15, 13, DK);
  } else {
    p.tri(1, 14, 6, 9, 5, 13, DK);
    p.tri(19, 14, 14, 9, 15, 13, DK);
  }
  // Horns
  p.tri(6, 2, 8, 6, 6, 6, '#e8e4d8');
  p.tri(14, 2, 12, 6, 14, 6, '#e8e4d8');
  // Head + body
  p.circle(10, 8, 4, C);
  p.ellipse(10, 14, 3.5, 3.5, C);
  // Tail with spade tip
  p.line(13, 16, 17, 18, DK);
  p.tri(17, 17, 19, 18, 17, 19.5, DK);
  // Glowing yellow eyes + wicked grin
  fierceEyes(p, 10, 7, '#ffe86b');
  p.rect(8, 10, 5, 1, '#14101c');
  p.set(8, 9, '#ffffff');
  p.set(12, 9, '#ffffff');
  // Legs
  p.rect(8, 17, 2, 2, DK);
  p.rect(11, 17, 2, 2, DK);
  p.edgeShade(0.55);
  return p;
}

function wraith(frame) {
  const p = new Pix(20, 20);
  const C = '#4a4460';
  const DK = shade(C, 0.7);
  const off = frame === 1 ? 1 : 0;

  // Hooded head
  p.ellipse(10, 6 - off, 5, 4.5, C);
  p.ellipse(10, 5 - off, 4, 3, DK); // hood shadow
  // Glowing eyes inside the hood
  p.rect(7, 6 - off, 2, 1, '#6be3ff');
  p.rect(11, 6 - off, 2, 1, '#6be3ff');
  p.set(7, 6 - off, '#c4f4ff');
  // Cloak body flaring out
  p.tri(5, 9 - off, 15, 9 - off, 17, 16 - off, C);
  p.tri(15, 9 - off, 5, 9 - off, 3, 16 - off, C);
  p.rect(5, 9 - off, 11, 5, C);
  // Tattered floating bottom
  for (let x = 3; x <= 16; x += 3) {
    const drop = (x / 3 + frame) % 2 === 0 ? 3 : 1;
    p.rect(x, 14 - off, 2, drop, C);
  }
  // Skeletal hand reaching
  p.line(15, 11 - off, 18, 9 - off, '#b8b2a0');
  p.set(18, 8 - off, '#b8b2a0');
  p.edgeShade(0.55);
  return p;
}

// ---------- Weapons (16x16, 12 designs; high tiers get a glow aura) ----------

const WEAPONS = [
  { blade: '#9a6b3f', len: 6, w: 2, guard: '#6b4423', name: 'twig' },
  { blade: '#b0885c', len: 7, w: 3, guard: '#6b4423', name: 'stick' },
  { blade: '#7a9a5c', len: 7, w: 3, guard: '#4e6b3a', gem: '#c2482e', name: 'thorn' },
  { blade: '#cd7f32', len: 8, w: 3, guard: '#8f5a24', name: 'copper' },
  { blade: '#9aa0a6', len: 8, w: 3, guard: '#6f7378', name: 'iron' },
  { blade: '#c9ced4', len: 9, w: 3, guard: '#8a8f96', name: 'steel' },
  { blade: '#e8f0f8', len: 9, w: 3, guard: '#aab4c0', gem: '#6be3ff', name: 'silver' },
  { blade: '#ffd166', len: 9, w: 3, guard: '#c99a2e', gem: '#ff5e5e', glow: '#ffd16688', name: 'golden' },
  { blade: '#8ee8ff', len: 10, w: 3, guard: '#4fb4d0', gem: '#ffffff', glow: '#8ee8ff88', name: 'crystal' },
  { blade: '#ff6b6b', len: 10, w: 3, guard: '#b33951', gem: '#ffd166', glow: '#ff6b6b88', name: 'ruby' },
  { blade: '#b39dff', len: 11, w: 3, guard: '#6b4fd0', gem: '#fff36b', glow: '#b39dff90', name: 'storm' },
  { blade: '#ffb347', len: 11, w: 3, guard: '#e86a2e', gem: '#ffffff', glow: '#ffb34790', name: 'solar' },
];

function weapon(spec) {
  const p = new Pix(16, 16);
  const half = Math.floor(spec.w / 2);
  const left = 8 - half;
  const tipY = 15 - (spec.len + 5);
  const bladeTop = tipY + 2;

  // Tip (2px tall so the point stays visible)
  p.tri(left - 0.5, bladeTop + 0.5, left + spec.w - 0.5, bladeTop + 0.5, left + spec.w / 2 - 0.5, tipY - 0.5, spec.blade);
  // Blade
  p.rect(left, bladeTop, spec.w, spec.len, spec.blade);
  // Shine + fuller line
  for (let y = bladeTop; y < bladeTop + spec.len; y++) p.set(left, y, shade(spec.blade, 1.3));
  if (spec.w >= 3) {
    for (let y = bladeTop + 1; y < bladeTop + spec.len - 1; y += 2) p.set(left + half, y, shade(spec.blade, 0.8));
  }

  // Guard (2px, winged)
  const gy = bladeTop + spec.len;
  p.rect(left - 2, gy, spec.w + 4, 2, spec.guard);
  p.set(left - 2, gy - 1, spec.guard);
  p.set(left + spec.w + 1, gy - 1, spec.guard);
  if (spec.gem) {
    p.set(8 - (spec.w % 2 === 0 ? 1 : 0), gy, spec.gem);
    p.set(8, gy, spec.gem);
  }
  // Grip + pommel
  p.rect(7, gy + 2, 2, 2, '#3a2a1e');
  p.rect(7, gy + 4, 2, 1, spec.guard);

  p.edgeShade(0.65);
  // Glow halo hugs the silhouette instead of boxing it in
  if (spec.glow) p.halo(spec.glow);
  return p;
}

// ---------- Ground decorations (12x12: dead tree, skull, rock) ----------

function deadTree() {
  const p = new Pix(12, 12);
  const T = '#4a3626';
  p.rect(5, 5, 2, 7, T);
  p.line(6, 6, 9, 3, T);
  p.line(5, 7, 2, 4, T);
  p.line(6, 5, 6, 2, T);
  p.set(9, 2, shade(T, 0.8));
  p.set(1, 3, shade(T, 0.8));
  p.edgeShade(0.7);
  return p;
}

function skullDeco() {
  const p = new Pix(12, 12);
  p.ellipse(6, 7, 3, 2.5, '#d8d4c8');
  p.rect(5, 9, 3, 1, '#d8d4c8');
  p.set(5, 7, '#14101c');
  p.set(8, 7, '#14101c');
  p.set(6, 9, '#a8a498');
  p.edgeShade(0.65);
  return p;
}

function rock() {
  const p = new Pix(12, 12);
  p.ellipse(6, 8, 4, 3, '#5a5464');
  p.set(5, 6, '#7a7284');
  p.set(7, 7, '#4a4454');
  p.edgeShade(0.6);
  return p;
}

function stuckSword() {
  // A fallen blade planted in the dirt at an angle
  const p = new Pix(12, 12);
  p.line(4, 3, 8, 9, '#9aa0a6');
  p.line(5, 3, 9, 9, '#c9ced4');
  p.line(3, 2, 6, 2, '#6f7378'); // guard
  p.set(3, 1, '#3a2a1e'); // grip
  p.edgeShade(0.7);
  return p;
}

function bone() {
  const p = new Pix(12, 12);
  p.line(3, 8, 8, 5, '#d8d4c8');
  p.circle(2.5, 8.5, 1.2, '#d8d4c8');
  p.circle(8.5, 4.5, 1.2, '#d8d4c8');
  p.edgeShade(0.75);
  return p;
}

function bush() {
  const p = new Pix(12, 12);
  p.ellipse(6, 7, 5, 3.5, '#4f7a38');
  p.ellipse(4, 6, 2.5, 2, '#5c8a42');
  p.set(8, 6, '#5c8a42');
  p.edgeShade(0.6);
  return p;
}

// ---------- Write everything ----------

writeSheet(`${OUT}/hero.png`, [hero(0), hero(1), hero(2)], SCALE);
writeSheet(`${OUT}/enemy-wolf.png`, [wolf(0), wolf(1)], SCALE);
writeSheet(`${OUT}/enemy-skeleton.png`, [skeleton(0), skeleton(1)], SCALE);
writeSheet(`${OUT}/enemy-spider.png`, [spider(0), spider(1)], SCALE);
writeSheet(`${OUT}/enemy-golem.png`, [golem(0), golem(1)], SCALE);
writeSheet(`${OUT}/enemy-imp.png`, [imp(0), imp(1)], SCALE);
writeSheet(`${OUT}/enemy-wraith.png`, [wraith(0), wraith(1)], SCALE);
writeSheet(`${OUT}/gear.png`, WEAPONS.map(weapon), SCALE);
writeSheet(
  `${OUT}/deco.png`,
  [deadTree(), skullDeco(), rock(), stuckSword(), bone(), bush()],
  SCALE,
);

// Generates all game sprite sheets as chunky pixel art.
// Run: npm run assets  → writes committed PNGs into public/assets/.
// Art direction: EPIC ARMORED BEAST — an armored hedgehog knight with glowing
// blades battling fierce monsters through dark fantasy biomes.

import { fromMap, pad, Pix, shade } from './pixel.mjs';
import { writeSheet } from './pixel.mjs';

const OUT = 'public/assets';
const SCALE = 4;

/** Pad + hard outline: the standard finishing pass for every sprite. */
function finish(p) {
  const q = pad(p, 1);
  q.outline();
  return q;
}

// ---------- Hero: human knight, hand-plotted (frames: idle0, idle1, attack) ----------

const KNIGHT_PALETTE = {
  H: '#cdd6e0', // steel highlight
  S: '#96a2b4', // steel base
  D: '#5f6b7c', // steel shadow
  K: '#14101c', // visor slit
  G: '#d4a017', // gold trim
  g: '#a87c12', // gold shadow
  C: '#a83232', // cape
  c: '#7c2424', // cape shadow
  B: '#4a3826', // boots
  R: '#c94040', // plume
  r: '#8a2828', // plume shadow
};

// 20 cols x 26 rows, facing right, 1px margin kept clear for the outline
const KNIGHT_BASE = [
  '......RRR...........',
  '.....RRRr...........',
  '....RRr.............',
  '.....HHHHHHH........',
  '....HHSSSSSSH.......',
  '....HSSSSSSSS.......',
  '....SSSSSSSSS.......',
  '....SKKKKKKKS.......',
  '....SSSSSSSSS.......',
  '.....DSSSSSD........',
  '.....GGGGGGG........',
  '...CHHSSSSSHH.......',
  '..CCHSSGGSSSHH......',
  '..CCDSSGgSSSDD......',
  '..CcDSSSSSSSDD......',
  '..CcDSSSSSSSDD......',
  '..Cc.DSSSSSD........',
  '..cc.GgGgGgG........',
  '..c..DSSSSSD........',
  '.....DSSSSSD........',
  '.....DSS.SSD........',
  '.....DS...SD........',
  '.....DS...SD........',
  '....BBB...BBB.......',
  '....BBB...BBB.......',
  '....................',
];

function knight(frame) {
  let rows = KNIGHT_BASE;
  if (frame === 1) {
    // Bob down one pixel; legs stay planted (rows below the belt unchanged)
    rows = ['....................', ...KNIGHT_BASE.slice(0, 18), ...KNIGHT_BASE.slice(19)];
    rows = rows.slice(0, 26);
  } else if (frame === 2) {
    // Attack: upper body leans toward the enemy
    rows = KNIGHT_BASE.map((row, y) => (y <= 17 ? `.${row.slice(0, -1)}` : row));
  }
  return finish(fromMap(rows, KNIGHT_PALETTE));
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
  return finish(p);
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
  return finish(p);
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
  return finish(p);
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
  return finish(p);
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
  return finish(p);
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
  return finish(p);
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
  // 18x20 canvas: room for the longest blade plus outline and glow
  const p = new Pix(18, 20);
  const half = Math.floor(spec.w / 2);
  const left = 9 - half;
  const gy = 14; // guard row — fixed so every sword sits on the same baseline
  const bladeTop = gy - spec.len;
  const tipY = bladeTop - 2;

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
  p.rect(left - 2, gy, spec.w + 4, 2, spec.guard);
  p.set(left - 2, gy - 1, spec.guard);
  p.set(left + spec.w + 1, gy - 1, spec.guard);
  if (spec.gem) {
    p.set(9 - (spec.w % 2 === 0 ? 1 : 0), gy, spec.gem);
    p.set(9, gy, spec.gem);
  }
  // Grip + pommel
  p.rect(8, gy + 2, 2, 2, '#3a2a1e');
  p.rect(8, gy + 4, 2, 1, spec.guard);

  p.outline();
  // Glow halo hugs the outline
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
  return finish(p);
}

function skullDeco() {
  const p = new Pix(12, 12);
  p.ellipse(6, 7, 3, 2.5, '#d8d4c8');
  p.rect(5, 9, 3, 1, '#d8d4c8');
  p.set(5, 7, '#14101c');
  p.set(8, 7, '#14101c');
  p.set(6, 9, '#a8a498');
  return finish(p);
}

function rock() {
  const p = new Pix(12, 12);
  p.ellipse(6, 8, 4, 3, '#5a5464');
  p.set(5, 6, '#7a7284');
  p.set(7, 7, '#4a4454');
  return finish(p);
}

function stuckSword() {
  // A fallen blade planted in the dirt at an angle
  const p = new Pix(12, 12);
  p.line(4, 3, 8, 9, '#9aa0a6');
  p.line(5, 3, 9, 9, '#c9ced4');
  p.line(3, 2, 6, 2, '#6f7378'); // guard
  p.set(3, 1, '#3a2a1e'); // grip
  return finish(p);
}

function bone() {
  const p = new Pix(12, 12);
  p.line(3, 8, 8, 5, '#d8d4c8');
  p.circle(2.5, 8.5, 1.2, '#d8d4c8');
  p.circle(8.5, 4.5, 1.2, '#d8d4c8');
  return finish(p);
}

function bush() {
  const p = new Pix(12, 12);
  p.ellipse(6, 7, 5, 3.5, '#4f7a38');
  p.ellipse(4, 6, 2.5, 2, '#5c8a42');
  p.set(8, 6, '#5c8a42');
  return finish(p);
}

function crate() {
  const p = new Pix(12, 12);
  const W = '#8a5f33';
  const L = '#a87844';
  const D = '#6b4423';
  p.rect(1, 2, 10, 9, W);
  p.rect(1, 2, 10, 1, L);
  p.rect(1, 2, 1, 9, L);
  p.rect(1, 10, 10, 1, D);
  p.rect(10, 2, 1, 9, D);
  p.line(2, 3, 9, 9, D); // X brace
  p.line(9, 3, 2, 9, D);
  return finish(p);
}

// ---------- Torch (8x16, 2-frame flame) ----------

function torch(frame) {
  const p = new Pix(10, 18);
  const sway = frame === 1 ? 1 : 0;
  // Flame
  p.ellipse(5 + sway, 4, 2.5, 3.5, '#ff9a3c');
  p.ellipse(5 + sway, 5, 1.5, 2, '#ffe86b');
  p.set(5 - sway, 1, '#ff9a3c');
  // Bracket + handle
  p.rect(3, 8, 5, 2, '#5f6b7c');
  p.rect(4, 10, 3, 7, '#6b4423');
  p.rect(4, 10, 1, 7, '#8a5f33');
  return finish(p);
}

// ---------- Floor / wall / fence tiles (16x16; floor+wall grayscale for biome tint) ----------

function floorTile(variant) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, variant === 2 ? '#b2b2b2' : '#c2c2c2'); // slab
  p.rect(0, 0, 16, 1, '#d6d6d6'); // top light
  p.rect(0, 0, 1, 16, '#cecece');
  p.rect(0, 15, 16, 1, '#8e8e8e'); // grout
  p.rect(15, 0, 1, 16, '#969696');
  // Wear speckles (deterministic per variant)
  for (let i = 0; i < 5; i++) {
    const x = (i * 5 + variant * 3 + 2) % 14;
    const y = (i * 7 + variant * 5 + 3) % 13;
    p.set(x + 1, y + 1, '#aaaaaa');
  }
  if (variant === 1) {
    // Cracked slab
    p.line(4, 2, 8, 8, '#8e8e8e');
    p.line(8, 8, 6, 13, '#8e8e8e');
    p.set(9, 9, '#a2a2a2');
  }
  return p;
}

function wallTile() {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, '#7e7e7e'); // mortar
  // Two brick rows, offset
  for (const [bx, by, bw] of [
    [0, 1, 7], [8, 1, 8], [0, 6, 3], [4, 6, 8], [13, 6, 3], [0, 11, 7], [8, 11, 8],
  ]) {
    p.rect(bx, by, bw, 4, '#909090');
    p.rect(bx, by, bw, 1, '#a4a4a4');
    p.rect(bx, by + 3, bw, 1, '#7a7a7a');
  }
  return p;
}

function fenceTile() {
  const p = new Pix(16, 16);
  for (const x of [1, 9]) {
    p.tri(x, 4, x + 4, 4, x + 2, 1, '#9a6a3a');
    p.rect(x, 4, 4, 12, '#9a6a3a');
    p.rect(x, 4, 1, 12, '#b8834a');
    p.rect(x + 3, 4, 1, 12, '#7c5228');
  }
  p.rect(0, 8, 16, 3, '#7c5228');
  p.rect(0, 8, 16, 1, '#9a6a3a');
  return p;
}

// ---------- Tab icons (12x12) ----------

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

writeSheet(`${OUT}/hero.png`, [knight(0), knight(1), knight(2)], SCALE);
writeSheet(`${OUT}/enemy-wolf.png`, [wolf(0), wolf(1)], SCALE);
writeSheet(`${OUT}/enemy-skeleton.png`, [skeleton(0), skeleton(1)], SCALE);
writeSheet(`${OUT}/enemy-spider.png`, [spider(0), spider(1)], SCALE);
writeSheet(`${OUT}/enemy-golem.png`, [golem(0), golem(1)], SCALE);
writeSheet(`${OUT}/enemy-imp.png`, [imp(0), imp(1)], SCALE);
writeSheet(`${OUT}/enemy-wraith.png`, [wraith(0), wraith(1)], SCALE);
writeSheet(`${OUT}/gear.png`, WEAPONS.map(weapon), SCALE);
writeSheet(
  `${OUT}/deco.png`,
  [deadTree(), skullDeco(), rock(), stuckSword(), bone(), bush(), crate()],
  SCALE,
);
writeSheet(`${OUT}/torch.png`, [torch(0), torch(1)], SCALE);
writeSheet(`${OUT}/tiles.png`, [floorTile(0), floorTile(1), floorTile(2), wallTile(), fenceTile()], SCALE);
writeSheet(
  `${OUT}/icons.png`,
  ['sword', 'scroll', 'paw', 'star', 'urn', 'cart'].map(icon),
  SCALE,
);
writeSheet(`${OUT}/pixfont.png`, [...FONT_CHARS].map(glyph), 2);

// Shared look & feel constants for all scenes.

export const THEME = {
  // Layout (design resolution 390x844, portrait)
  width: 390,
  height: 844,
  battleHeight: 424,

  // Palette — dark fantasy
  skyTop: 0x2f3b4a,
  skyBottom: 0x4a5d52,
  ground: 0x3f5240,
  groundDark: 0x2e3d30,

  /** Battle backdrop palettes; the world shifts every 5 stages. */
  biomes: [
    // Dark Forest
    { skyTop: 0x2f3b4a, skyBottom: 0x51665a, ground: 0x3f5240, groundDark: 0x2e3d30 },
    // Ember Wastes
    { skyTop: 0x38222c, skyBottom: 0x7a4030, ground: 0x54382c, groundDark: 0x3e2a22 },
    // Frozen Pass
    { skyTop: 0x36455e, skyBottom: 0x8a9cb8, ground: 0x93a8bc, groundDark: 0x74889e },
    // Cursed Swamp
    { skyTop: 0x27301f, skyBottom: 0x4a5a40, ground: 0x38472f, groundDark: 0x293522 },
    // Shadow Keep
    { skyTop: 0x1a1424, skyBottom: 0x3a2c4a, ground: 0x362e42, groundDark: 0x272132 },
  ],
  panelBg: 0x1e1730,
  panelCell: 0x322947,
  panelCellBorder: 0x4a3d68,

  gold: 0xffd166,
  gem: 0x6be3ff,
  hpBar: 0xff6b6b,
  hpBarBg: 0x3a2d55,
  bossTimer: 0xffa94d,

  buttonBg: 0xc2571f,
  buttonBgDisabled: 0x54496b,
  buttonText: '#ffffff',

  textLight: '#ffffff',
  textDark: '#2e2348',
  textGold: '#ffd166',

  fontFamily: '"Trebuchet MS", "Comic Sans MS", sans-serif',

  /** Tint colors cycling by gear tier */
  tierColors: [
    0xb0885c, 0x9aa0a6, 0xcd7f32, 0xd9d9d9, 0xffd166, 0x7ed957, 0x6be3ff,
    0x9b7ede, 0xff6b9d, 0xff5e5e, 0x50e3c2, 0xf5a623,
  ],
} as const;

export function tierColor(tier: number): number {
  return THEME.tierColors[(tier - 1) % THEME.tierColors.length];
}

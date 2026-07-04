// Shared look & feel constants for all scenes.

export const THEME = {
  // Layout (design resolution 390x844, portrait)
  width: 390,
  height: 844,
  battleHeight: 424,

  // Palette — warm pastel fantasy
  skyTop: 0xa8d8ea,
  skyBottom: 0xdff3e4,
  ground: 0x8fc98f,
  groundDark: 0x6faf6f,

  /** Battle backdrop palettes; the world shifts every 5 stages. */
  biomes: [
    // Meadow
    { skyTop: 0xa8d8ea, skyBottom: 0xdff3e4, ground: 0x8fc98f, groundDark: 0x6faf6f },
    // Sunset
    { skyTop: 0xffb88c, skyBottom: 0xffe3c4, ground: 0xc9a96f, groundDark: 0xa98a54 },
    // Twilight
    { skyTop: 0x6f7ac8, skyBottom: 0xc4a8e0, ground: 0x7f96b8, groundDark: 0x60789c },
    // Snowfield
    { skyTop: 0xbfe3f0, skyBottom: 0xf2fbff, ground: 0xe8f2f8, groundDark: 0xc4d8e4 },
    // Night
    { skyTop: 0x2b2d5c, skyBottom: 0x5c5490, ground: 0x4a6a5c, groundDark: 0x36503f },
  ],
  panelBg: 0x2e2348,
  panelCell: 0x453764,
  panelCellBorder: 0x5d4d85,

  gold: 0xffd166,
  gem: 0x6be3ff,
  hpBar: 0xff6b6b,
  hpBarBg: 0x3a2d55,
  bossTimer: 0xffa94d,

  buttonBg: 0xff8f5e,
  buttonBgDisabled: 0x6f6284,
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

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

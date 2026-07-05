// Shared look & feel constants for all scenes.

export const THEME = {
  // Layout (design resolution 390x844, portrait)
  width: 390,
  height: 844,
  layout: {
    headerH: 52, // currency strip
    hudH: 44, // Lv/EXP + stage row
    arenaTop: 96,
    arenaBottom: 396,
    panelTop: 396, // sword card grid
    togglesTop: 742, // auto merge / auto buy / buy sword row
    tabBarTop: 780,
  },

  // Arena palettes live in src/config/locations.ts (one per 10-stage set).

  // Parchment & wood UI (Idle Sword Master register)
  panelBg: 0xd9c491,      // parchment panel
  panelBgDark: 0x4a3520,  // wood-brown strip
  cardBg: 0xefe0b8,       // sword card face
  cardBorder: 0x8a5a2e,   // wood border
  headerBg: 0x3e2c1a,     // ornate top banner
  headerTrim: 0x8a5a2e,

  gold: 0xffd166,
  gem: 0x4ec3e8,
  hpBar: 0xe84a4a,
  hpBarBg: 0x4a3520,
  bossTimer: 0xffa94d,
  expBar: 0x4ec3e8,
  fence: 0x9a6a3a,
  fenceDark: 0x7c5228,

  buttonBg: 0x58a83c,      // green action buttons
  buttonBgAlt: 0xc9762e,   // orange secondary
  buttonBgDisabled: 0x9a8d6e,
  buttonText: '#ffffff',

  textLight: '#fff6e0',
  textDark: '#4a3520',
  textGold: '#ffd166',
  textDmg: '#b03a2e',

  fontFamily: '"Trebuchet MS", Verdana, sans-serif',

  /** Card border/rarity colors cycling by gear tier (12 designs) */
  tierColors: [
    0x9a8d6e, 0x9a8d6e, 0x6fae4e, 0xcd7f32, 0x9aa0a6, 0x9aa0a6,
    0x4ec3e8, 0xffd166, 0x4ec3e8, 0xe84a4a, 0x9b7ede, 0xffa94d,
  ],
} as const;

export function tierColor(tier: number): number {
  return THEME.tierColors[(tier - 1) % THEME.tierColors.length];
}

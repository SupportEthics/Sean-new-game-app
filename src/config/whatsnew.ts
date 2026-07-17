// The What's New popup — data only. Bump `key` and rewrite `lines` for
// each release worth shouting about; returning players see it once, and
// brand-new players never do (nothing is "new" to them). The key is
// stamped into prefs the moment it's shown or skipped.

export const WHATS_NEW = {
  key: 'whatsnew_1_0_3',
  title: 'THE DRAGON UPDATE',
  subtitle: 'NEW SINCE YOUR LAST VISIT:',
  lines: [
    'THE LABYRINTH: MINE THE DEPTHS',
    'DAILY DUNGEON: SLAY THE DRAGON',
    'DUEL RIVALS ON THE LEADERBOARD',
    'THE CODEX + FORGE ENCHANTMENTS',
    'PET EXPEDITIONS + FAIRY EVOLUTION',
    '50 NEW WEAPONS + NEW LANDS',
    'WEEKEND EVENTS + THE KNIGHTS PASS',
  ],
  button: 'TO BATTLE!',
} as const;

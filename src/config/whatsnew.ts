// The What's New popup — data only. Bump `key` and rewrite `lines` for
// each release worth shouting about; returning players see it once, and
// brand-new players never do (nothing is "new" to them). The key is
// stamped into prefs the moment it's shown or skipped.

export const WHATS_NEW = {
  key: 'whatsnew_1_0_5',
  title: 'THE KINGDOM UPDATE',
  subtitle: 'NEW SINCE YOUR LAST VISIT:',
  lines: [
    'TAP THE ARENA TO STRIKE FASTER',
    'WALK YOUR TOWN - UPGRADE THE KEEP',
    'THE ENDGAME IS 3X BIGGER',
    'SWORDS NOW CLIMB TO TIER 500',
    'HIGHER TOWN, PET + FORGE CAPS',
    'YOUR PHONE RUMBLES ON BIG HITS',
  ],
  button: 'TO BATTLE!',
} as const;

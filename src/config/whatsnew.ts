// The What's New popup — data only. Bump `key` and rewrite `lines` for
// each release worth shouting about; returning players see it once, and
// brand-new players never do (nothing is "new" to them). The key is
// stamped into prefs the moment it's shown or skipped.

export const WHATS_NEW = {
  key: 'whatsnew_1_0_6',
  title: 'A HERO IS BORN',
  subtitle: 'NEW SINCE YOUR LAST VISIT:',
  lines: [
    'CLAIM 7 DAYS OF RECRUIT GIFTS',
    "GRAB THE ONE-TIME FOUNDER'S PACK",
    "NEW: KNIGHT'S MEMBERSHIP - 50 GEMS/DAY",
    'FREE GEMS FOR WATCHING AN AD',
    'A FATTER DAY-7 LOGIN JACKPOT',
  ],
  button: 'TO BATTLE!',
} as const;

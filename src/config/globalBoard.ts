// Global leaderboard — configuration and pure helpers. The backing store
// is a Supabase project (free tier) owned by Sean; the anon key is safe to
// embed (Supabase's design) because the database only exposes a read-only
// board and a rate-limited submit_score function (docs/leaderboard.sql).

export const GLOBAL_BOARD = {
  /** Supabase project URL, e.g. https://abcdefgh.supabase.co — empty
   * string keeps the global board dormant (local rivals only). */
  url: '',
  /** The project's anon/public API key. */
  anonKey: '',
} as const;

export function globalBoardConfigured(): boolean {
  return GLOBAL_BOARD.url.length > 0 && GLOBAL_BOARD.anonKey.length > 0;
}

/** One row as it comes back from the server. */
export interface GlobalRow {
  device_id: string;
  name: string;
  stage: number;
  prestiges: number;
  skin: string;
}

// ---- Call signs -----------------------------------------------------------
// Players never type a name: they roll a call sign from curated parts, so
// the board can't contain anything rude and App Review sees no free-text
// user content. 24 x 24 x 90 = ~51k combinations.

const CALL_ADJ = [
  'GRIM', 'IRON', 'ASH', 'SILENT', 'CRIMSON', 'PALE', 'SWIFT', 'STONE',
  'EMBER', 'FROST', 'GOLDEN', 'SHADOW', 'BOLD', 'WILD', 'BLEAK', 'STORM',
  'NOBLE', 'SAVAGE', 'HOLLOW', 'BRIGHT', 'DUSK', 'FERAL', 'LONE', 'VOID',
] as const;

const CALL_NOUN = [
  'WOLF', 'RAVEN', 'KNIGHT', 'BLADE', 'HOUND', 'FALCON', 'OATH', 'BANNER',
  'SHIELD', 'THORN', 'CROW', 'LANCE', 'WARDEN', 'REAPER', 'HAMMER', 'GHOST',
  'SERPENT', 'LION', 'SPARK', 'HELM', 'ARROW', 'FLAME', 'RIDER', 'SAINT',
] as const;

/** Roll a call sign like "GRIM WOLF 47". Pass rng for deterministic tests. */
export function rollCallSign(rng: () => number = Math.random): string {
  const adj = CALL_ADJ[Math.floor(rng() * CALL_ADJ.length)];
  const noun = CALL_NOUN[Math.floor(rng() * CALL_NOUN.length)];
  const num = 10 + Math.floor(rng() * 90);
  return `${adj} ${noun} ${num}`;
}

/** Server-side check mirrored client-side: uppercase words + digits only. */
export function isValidCallSign(name: string): boolean {
  return /^[A-Z0-9 ]{3,20}$/.test(name);
}

// ---- Board assembly -------------------------------------------------------

import { BoardRow, RIVALS } from './leaderboard';

/** Build the Hall of Legends from real global rows plus the seeded rivals
 * (which keep the board lively while the player base grows). The local
 * player is always shown from local state — their server row (matched by
 * device id) is dropped so they never appear twice. */
export function buildGlobalBoard(
  real: GlobalRow[],
  playerDeviceId: string,
  playerName: string | null,
  playerStage: number,
  playerPrestiges: number,
  playerSkin: string,
  maxRows = 60,
): BoardRow[] {
  const entries: Omit<BoardRow, 'rank'>[] = [];
  for (const r of real) {
    if (r.device_id === playerDeviceId) continue;
    entries.push({
      name: r.name,
      stage: r.stage,
      prestiges: r.prestiges,
      skin: r.skin,
      isPlayer: false,
    });
  }
  for (const r of RIVALS) entries.push({ ...r, isPlayer: false });
  entries.push({
    name: playerName ?? 'YOU',
    stage: playerStage,
    prestiges: playerPrestiges,
    skin: playerSkin,
    isPlayer: true,
  });
  entries.sort((a, b) => b.stage - a.stage || (a.isPlayer ? 1 : -1));
  // Keep the top slice but never cut the player's own row out
  const top = entries.slice(0, maxRows);
  if (!top.some((e) => e.isPlayer)) {
    const me = entries.find((e) => e.isPlayer);
    if (me) top.push(me);
  }
  return top.map((r, i) => ({ ...r, rank: i + 1 }));
}

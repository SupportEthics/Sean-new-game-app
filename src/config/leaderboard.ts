// Hall of Legends — data only. A local score-chase board: the player is
// ranked among a fixed cast of rival knights whose bests are spread across
// the whole progression curve, so there's always a next name to overtake.
// These rivals are seeded characters, not live players; the real
// Game Center / Play Games boards plug in at store setup (see
// services/LeaderboardService.ts).

export interface RivalDef {
  name: string;
  stage: number;
  prestiges: number;
  /** Skin id used as the portrait (any entry in skins.json). */
  skin: string;
}

export const RIVALS: RivalDef[] = [
  { name: 'SER ALDRIC', stage: 2, prestiges: 0, skin: 'squire' },
  { name: 'PAGE ORIN', stage: 4, prestiges: 0, skin: 'squire' },
  { name: 'WREN THE LOST', stage: 7, prestiges: 0, skin: 'forest' },
  { name: 'GILDA IRONFOOT', stage: 10, prestiges: 0, skin: 'bronze' },
  { name: 'BARNEY TWOSWORDS', stage: 14, prestiges: 0, skin: 'forest' },
  { name: 'DAME KESTREL', stage: 18, prestiges: 0, skin: 'crimson' },
  { name: 'ODO THE PATIENT', stage: 23, prestiges: 0, skin: 'bronze' },
  { name: 'SILENT MAUD', stage: 28, prestiges: 0, skin: 'shadow' },
  { name: 'CAPTAIN HALLOW', stage: 34, prestiges: 0, skin: 'crimson' },
  { name: 'ROOK OF EMBERS', stage: 41, prestiges: 1, skin: 'ember' },
  { name: 'LADY VESPER', stage: 48, prestiges: 1, skin: 'shadow' },
  { name: 'THANE BRACKEN', stage: 56, prestiges: 1, skin: 'ember' },
  { name: 'THE PALE COUNT', stage: 65, prestiges: 2, skin: 'obsidian' },
  { name: 'SISTER RUIN', stage: 75, prestiges: 2, skin: 'obsidian' },
  { name: 'GRAND MARSHAL KO', stage: 86, prestiges: 3, skin: 'gilded' },
  { name: 'EZRA SOULBOUND', stage: 98, prestiges: 3, skin: 'champion' },
  { name: 'WARDEN OF TEETH', stage: 112, prestiges: 4, skin: 'gilded' },
  { name: 'MOTHER GLASS', stage: 128, prestiges: 5, skin: 'champion' },
  { name: 'KNIGHT ETERNAL', stage: 150, prestiges: 6, skin: 'dragonlord' },
  { name: 'HARROW THE VOID', stage: 180, prestiges: 8, skin: 'voidreaper' },
  { name: 'SAINT CINDER', stage: 220, prestiges: 10, skin: 'dragonlord' },
  { name: 'THE FIRST FORGED', stage: 300, prestiges: 15, skin: 'voidreaper' },
];

export interface BoardRow {
  rank: number;
  name: string;
  stage: number;
  prestiges: number;
  skin: string;
  isPlayer: boolean;
}

/** The full board with the player slotted in by highest stage (ties lose
 * to rivals so there's always something left to beat). */
export function buildBoard(
  playerStage: number,
  playerPrestiges: number,
  playerSkin: string,
): BoardRow[] {
  const rows = RIVALS.map((r) => ({ ...r, isPlayer: false }));
  rows.push({
    name: 'YOU',
    stage: playerStage,
    prestiges: playerPrestiges,
    skin: playerSkin,
    isPlayer: true,
  });
  rows.sort((a, b) => b.stage - a.stage || (a.isPlayer ? 1 : -1));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

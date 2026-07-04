import { GEAR } from '../config/gear';

/**
 * A cell holds a gear tier (1-based) or null when empty. Index = row * cols
 * + col. The array always spans the full board; only the first `unlocked`
 * cells are usable — the locked tail stays null.
 */
export type Grid = (number | null)[];

export const TOTAL_CELLS = GEAR.gridCols * GEAR.gridRows;

export function emptyGrid(): Grid {
  return new Array<number | null>(TOTAL_CELLS).fill(null);
}

export function firstEmptyIndex(grid: Grid, unlocked: number = TOTAL_CELLS): number {
  const limit = Math.min(unlocked, grid.length);
  for (let i = 0; i < limit; i++) {
    if (grid[i] === null) return i;
  }
  return -1;
}

export function isFull(grid: Grid, unlocked: number = TOTAL_CELLS): boolean {
  return firstEmptyIndex(grid, unlocked) === -1;
}

/** Place a new item of `tier` in the first empty unlocked cell, or -1 if full. */
export function spawn(grid: Grid, tier: number, unlocked: number = TOTAL_CELLS): number {
  const idx = firstEmptyIndex(grid, unlocked);
  if (idx !== -1) grid[idx] = tier;
  return idx;
}

export function canMerge(
  grid: Grid,
  a: number,
  b: number,
  unlocked: number = TOTAL_CELLS,
): boolean {
  return (
    a !== b &&
    a < unlocked &&
    b < unlocked &&
    grid[a] !== null &&
    grid[a] === grid[b] &&
    (grid[a] as number) < GEAR.maxTier
  );
}

/**
 * Merge item at `from` onto item at `to` (both same tier): `to` becomes tier+1,
 * `from` empties. Returns the new tier, or null if the merge is invalid.
 */
export function merge(
  grid: Grid,
  from: number,
  to: number,
  unlocked: number = TOTAL_CELLS,
): number | null {
  if (!canMerge(grid, from, to, unlocked)) return null;
  const newTier = (grid[to] as number) + 1;
  grid[to] = newTier;
  grid[from] = null;
  return newTier;
}

/** Move an item to an empty unlocked cell, or swap with the occupant. */
export function move(
  grid: Grid,
  from: number,
  to: number,
  unlocked: number = TOTAL_CELLS,
): boolean {
  if (from === to || from >= unlocked || to >= unlocked || grid[from] === null) return false;
  const tmp = grid[to];
  grid[to] = grid[from];
  grid[from] = tmp;
  return true;
}

/** Tiers of every item currently on the grid. */
export function gridTiers(grid: Grid): number[] {
  return grid.filter((c): c is number => c !== null);
}

/**
 * One best available merge (highest tier pair first), for auto-merge.
 * Indices in `exclude` (the equipped loadout) are never auto-merged —
 * changing the hero's weapons is the player's call.
 */
export function findBestMerge(
  grid: Grid,
  exclude?: ReadonlySet<number>,
): { from: number; to: number } | null {
  const byTier = new Map<number, number[]>();
  grid.forEach((tier, idx) => {
    if (tier === null || tier >= GEAR.maxTier || exclude?.has(idx)) return;
    const list = byTier.get(tier) ?? [];
    list.push(idx);
    byTier.set(tier, list);
  });
  const tiers = [...byTier.keys()].sort((a, b) => b - a);
  for (const tier of tiers) {
    const idxs = byTier.get(tier)!;
    if (idxs.length >= 2) return { from: idxs[1], to: idxs[0] };
  }
  return null;
}

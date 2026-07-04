import { GEAR } from '../config/gear';

/** A cell holds a gear tier (1-based) or null when empty. Index = row * cols + col. */
export type Grid = (number | null)[];

export function emptyGrid(): Grid {
  return new Array<number | null>(GEAR.gridCols * GEAR.gridRows).fill(null);
}

export function firstEmptyIndex(grid: Grid): number {
  return grid.findIndex((c) => c === null);
}

export function isFull(grid: Grid): boolean {
  return firstEmptyIndex(grid) === -1;
}

/** Place a new item of `tier` in the first empty cell. Returns the index or -1 if full. */
export function spawn(grid: Grid, tier: number): number {
  const idx = firstEmptyIndex(grid);
  if (idx !== -1) grid[idx] = tier;
  return idx;
}

export function canMerge(grid: Grid, a: number, b: number): boolean {
  return (
    a !== b &&
    grid[a] !== null &&
    grid[a] === grid[b] &&
    (grid[a] as number) < GEAR.maxTier
  );
}

/**
 * Merge item at `from` onto item at `to` (both same tier): `to` becomes tier+1,
 * `from` empties. Returns the new tier, or null if the merge is invalid.
 */
export function merge(grid: Grid, from: number, to: number): number | null {
  if (!canMerge(grid, from, to)) return null;
  const newTier = (grid[to] as number) + 1;
  grid[to] = newTier;
  grid[from] = null;
  return newTier;
}

/** Move an item to an empty cell, or swap with the occupant. */
export function move(grid: Grid, from: number, to: number): boolean {
  if (from === to || grid[from] === null) return false;
  const tmp = grid[to];
  grid[to] = grid[from];
  grid[from] = tmp;
  return true;
}

/** Tiers of every item currently on the grid. */
export function gridTiers(grid: Grid): number[] {
  return grid.filter((c): c is number => c !== null);
}

/** One best available merge (highest tier pair first), for the auto-merge button. */
export function findBestMerge(grid: Grid): { from: number; to: number } | null {
  const byTier = new Map<number, number[]>();
  grid.forEach((tier, idx) => {
    if (tier === null || tier >= GEAR.maxTier) return;
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

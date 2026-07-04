import { describe, expect, it } from 'vitest';
import { GEAR } from '../../src/config/gear';
import {
  canMerge,
  emptyGrid,
  findBestMerge,
  isFull,
  merge,
  spawn,
} from '../../src/core/MergeLogic';

describe('spawn', () => {
  it('fills the first empty cell', () => {
    const grid = emptyGrid();
    expect(spawn(grid, 1)).toBe(0);
    expect(spawn(grid, 2)).toBe(1);
    expect(grid[0]).toBe(1);
    expect(grid[1]).toBe(2);
  });

  it('returns -1 when the grid is full', () => {
    const grid = emptyGrid();
    grid.fill(1);
    expect(isFull(grid)).toBe(true);
    expect(spawn(grid, 1)).toBe(-1);
  });
});

describe('merge', () => {
  it('merges two same-tier items into tier+1', () => {
    const grid = emptyGrid();
    grid[0] = 3;
    grid[5] = 3;
    expect(merge(grid, 0, 5)).toBe(4);
    expect(grid[0]).toBeNull();
    expect(grid[5]).toBe(4);
  });

  it('rejects different tiers, empty cells, and self-merges', () => {
    const grid = emptyGrid();
    grid[0] = 2;
    grid[1] = 3;
    expect(merge(grid, 0, 1)).toBeNull();
    expect(merge(grid, 0, 2)).toBeNull();
    expect(merge(grid, 0, 0)).toBeNull();
    expect(grid[0]).toBe(2);
  });

  it('rejects merging at max tier', () => {
    const grid = emptyGrid();
    grid[0] = GEAR.maxTier;
    grid[1] = GEAR.maxTier;
    expect(canMerge(grid, 0, 1)).toBe(false);
    expect(merge(grid, 0, 1)).toBeNull();
  });
});

describe('findBestMerge', () => {
  it('prefers the highest-tier pair', () => {
    const grid = emptyGrid();
    grid[0] = 1;
    grid[1] = 1;
    grid[2] = 4;
    grid[3] = 4;
    const pair = findBestMerge(grid)!;
    expect(grid[pair.from]).toBe(4);
    expect(grid[pair.to]).toBe(4);
  });

  it('returns null when nothing can merge', () => {
    const grid = emptyGrid();
    grid[0] = 1;
    grid[1] = 2;
    expect(findBestMerge(grid)).toBeNull();
  });
});

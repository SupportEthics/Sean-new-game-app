import { describe, expect, it } from 'vitest';
import { GEAR } from '../../src/config/gear';
import { cellCost } from '../../src/core/EconomyMath';
import { GameState } from '../../src/core/GameState';
import { TOTAL_CELLS } from '../../src/core/MergeLogic';

describe('grid cell purchases', () => {
  it('board is 6x7 with 20 unlocked at the start', () => {
    expect(TOTAL_CELLS).toBe(42);
    const gs = new GameState();
    expect(gs.unlockedCells).toBe(GEAR.baseCells);
    expect(gs.grid).toHaveLength(42);
  });

  it('spawn never uses locked cells', () => {
    const gs = new GameState();
    gs.addGold(1e12);
    let bought = 0;
    while (gs.buyGear()) bought++;
    expect(bought).toBe(GEAR.baseCells); // stops at the boundary
    expect(gs.grid.slice(GEAR.baseCells).every((c) => c === null)).toBe(true);
  });

  it('cell prices escalate', () => {
    expect(cellCost(21)).toBe(GEAR.cellCostBase);
    expect(cellCost(22)).toBeGreaterThan(cellCost(21));
    expect(Number.isFinite(cellCost(42))).toBe(true);
  });

  it('buyCell spends gold and expands capacity', () => {
    const gs = new GameState();
    expect(gs.buyCell()).toBe(false); // can't afford
    gs.addGold(cellCost(21));
    expect(gs.buyCell()).toBe(true);
    expect(gs.unlockedCells).toBe(21);
    expect(gs.gold).toBeLessThan(cellCost(21)); // spent (starting 25 remains)
  });

  it('capacity caps at the full board', () => {
    const gs = new GameState();
    gs.addGold(Number.MAX_SAFE_INTEGER / 2);
    while (gs.buyCell()) {
      /* buy them all */
    }
    expect(gs.unlockedCells).toBe(TOTAL_CELLS);
    expect(gs.cellCost).toBeNull();
    expect(gs.canBuyCell).toBe(false);
  });

  it('merge and move reject locked-cell targets', () => {
    const gs = new GameState();
    gs.grid[0] = 3;
    gs.grid[1] = 3;
    expect(gs.moveAt(0, GEAR.baseCells + 2)).toBe(false);
    expect(gs.mergeAt(0, 1)).toBe(4); // normal merges still work
  });

  it('unlockedCells survives serialize round-trip', () => {
    const gs = new GameState();
    gs.addGold(1e9);
    gs.buyCell();
    gs.buyCell();
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.unlockedCells).toBe(22);
  });
});

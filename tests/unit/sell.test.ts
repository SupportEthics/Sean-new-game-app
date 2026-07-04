import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../../src/config/economy';
import { gearCost, sellValue } from '../../src/core/EconomyMath';
import { GameState } from '../../src/core/GameState';

describe('sword bin', () => {
  it('refunds a fixed slice of the shop price, never less than 1', () => {
    expect(sellValue(1)).toBe(Math.max(1, Math.floor(gearCost(1) * ECONOMY.sellRefundFraction)));
    expect(sellValue(10)).toBe(Math.floor(gearCost(10) * ECONOMY.sellRefundFraction));
    expect(sellValue(10)).toBeGreaterThan(sellValue(5));
    expect(sellValue(1)).toBeGreaterThanOrEqual(1);
  });

  it('selling empties the cell and pays gold', () => {
    const gs = new GameState();
    gs.grid[0] = 8; // equipped (top tier)
    gs.grid[5] = 3;
    const goldBefore = gs.gold;
    const gold = gs.sellAt(5);
    expect(gold).toBe(sellValue(3));
    expect(gs.gold).toBe(goldBefore + sellValue(3));
    expect(gs.grid[5]).toBeNull();
  });

  it('never sells an equipped sword or an empty cell', () => {
    const gs = new GameState();
    gs.grid[0] = 8; // the only sword -> equipped
    expect(gs.equippedIndices).toContain(0);
    expect(gs.sellAt(0)).toBeNull();
    expect(gs.grid[0]).toBe(8);
    expect(gs.sellAt(1)).toBeNull(); // empty
  });

  it('selling is always worse than the sword cost (no buy-sell exploit)', () => {
    for (let tier = 1; tier <= 20; tier++) {
      expect(sellValue(tier)).toBeLessThan(gearCost(tier));
    }
  });
});

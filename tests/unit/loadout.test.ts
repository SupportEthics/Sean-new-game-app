import { describe, expect, it } from 'vitest';
import { GEAR, unlockedSlots } from '../../src/config/gear';
import { gearDps, heroDps } from '../../src/core/EconomyMath';
import { GameState } from '../../src/core/GameState';

describe('unlockedSlots', () => {
  it('follows the stage milestones 1/5/15/30', () => {
    expect(unlockedSlots(1)).toBe(1);
    expect(unlockedSlots(4)).toBe(1);
    expect(unlockedSlots(5)).toBe(2);
    expect(unlockedSlots(14)).toBe(2);
    expect(unlockedSlots(15)).toBe(3);
    expect(unlockedSlots(30)).toBe(4);
    expect(unlockedSlots(999)).toBe(4);
  });
});

describe('heroDps with multiple slots', () => {
  it('sums the top-N swords in full', () => {
    const four = [5, 5, 5, 5];
    expect(heroDps(four, 4)).toBeCloseTo(4 * gearDps(5));
    expect(heroDps(four, 2)).toBeCloseTo(
      2 * gearDps(5) + 2 * gearDps(5) * GEAR.passiveDpsFraction,
    );
  });

  it('equips the best swords, not the first ones', () => {
    expect(heroDps([1, 9, 2, 8], 2)).toBeCloseTo(
      gearDps(9) + gearDps(8) + (gearDps(1) + gearDps(2)) * GEAR.passiveDpsFraction,
    );
  });

  it('more slots never means less DPS', () => {
    const tiers = [7, 6, 5, 4, 3, 2, 1];
    for (let s = 1; s < 4; s++) {
      expect(heroDps(tiers, s + 1)).toBeGreaterThanOrEqual(heroDps(tiers, s));
    }
  });

  it('handles fewer swords than slots', () => {
    expect(heroDps([3], 4)).toBeCloseTo(gearDps(3));
    expect(heroDps([], 4)).toBe(1);
  });
});

describe('GameState loadout', () => {
  it('starts with one slot and gains them by stage', () => {
    const gs = new GameState();
    expect(gs.equipSlots).toBe(1);
    gs.highestStage = 5;
    expect(gs.equipSlots).toBe(2);
    gs.highestStage = 30;
    expect(gs.equipSlots).toBe(4);
  });

  it('equippedIndices picks top tiers, ties broken by grid order', () => {
    const gs = new GameState();
    gs.highestStage = 30; // all 4 slots
    gs.grid[3] = 5;
    gs.grid[7] = 9;
    gs.grid[1] = 5;
    gs.grid[10] = 2;
    gs.grid[12] = 1;
    expect(gs.equippedIndices).toEqual([7, 1, 3, 10]);
  });

  it('equipped count never exceeds unlocked slots', () => {
    const gs = new GameState();
    for (let i = 0; i < 8; i++) gs.grid[i] = i + 1;
    expect(gs.equippedIndices).toHaveLength(1);
    gs.highestStage = 15;
    expect(gs.equippedIndices).toHaveLength(3);
  });
});

import { describe, expect, it } from 'vitest';
import { GEAR, unlockedSlots } from '../../src/config/gear';
import { gearDps, heroDps } from '../../src/core/EconomyMath';
import { GameState } from '../../src/core/GameState';

describe('unlockedSlots', () => {
  it('follows the stage milestones 1/5/15/25', () => {
    expect(unlockedSlots(1)).toBe(1);
    expect(unlockedSlots(4)).toBe(1);
    expect(unlockedSlots(5)).toBe(2);
    expect(unlockedSlots(14)).toBe(2);
    expect(unlockedSlots(15)).toBe(3);
    expect(unlockedSlots(24)).toBe(3);
    expect(unlockedSlots(25)).toBe(4);
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

describe('auto-merge respects the loadout', () => {
  it('never auto-merges equipped swords', () => {
    const gs = new GameState(); // stage 1 = one equip slot
    gs.grid[0] = 3; // equipped (best)
    gs.grid[4] = 3; // would pair with it
    expect(gs.autoMergeOnce()).toBeNull(); // pair involves the equipped sword
    gs.grid[5] = 3; // now two unequipped threes exist
    expect(gs.autoMergeOnce()).toBe(4);
    expect(gs.grid[0]).toBe(4); // the equip bar claims the new best sword
  });

  it('never auto-merges a sword the player is dragging', () => {
    const gs = new GameState();
    gs.grid[0] = 9; // equipped
    gs.grid[5] = 2;
    gs.grid[6] = 2; // the only pair on the board
    expect(gs.autoMergeOnce(6)).toBeNull(); // index 6 is mid-drag: hands off
    expect(gs.grid[6]).toBe(2);
    expect(gs.autoMergeOnce()).toBe(3); // released: merges as normal
  });

  it('manual merges of equipped swords still work', () => {
    const gs = new GameState();
    gs.grid[0] = 3;
    gs.grid[4] = 3;
    expect(gs.mergeAt(4, 0)).toBe(4); // player's drag decision
  });
});

describe('shop tier upgrades', () => {
  it('always sells tier 1 until upgraded', () => {
    const gs = new GameState();
    gs.highestTier = 12; // forging high tiers no longer raises the shop
    expect(gs.buyTier).toBe(1);
  });

  it('upgrading costs gold and raises the offer', () => {
    const gs = new GameState();
    expect(gs.upgradeBuyTier()).toBe(false); // can't afford
    gs.addGold(1e6);
    const before = gs.gold;
    expect(gs.upgradeBuyTier()).toBe(true);
    expect(gs.buyTier).toBe(2);
    expect(gs.gold).toBeLessThan(before);
  });

  it('prestige resets the shop tier', () => {
    const gs = new GameState();
    gs.addGold(1e6);
    gs.upgradeBuyTier();
    gs.battle.stage = 40;
    gs.highestStage = 40;
    gs.prestige();
    expect(gs.buyTier).toBe(1);
  });

  it('shop tier survives serialize round-trip', () => {
    const gs = new GameState();
    gs.addGold(1e6);
    gs.upgradeBuyTier();
    expect(GameState.deserialize(gs.serialize()).buyTier).toBe(2);
  });
});

describe('GameState loadout', () => {
  it('starts with one slot and gains them by stage', () => {
    const gs = new GameState();
    expect(gs.equipSlots).toBe(1);
    gs.highestStage = 5;
    expect(gs.equipSlots).toBe(2);
    gs.highestStage = 25;
    expect(gs.equipSlots).toBe(4);
  });

  it('the equip bar (top row) auto-stocks the best swords, strongest first', () => {
    const gs = new GameState();
    gs.highestStage = 25; // all 4 slots
    gs.grid[9] = 5;
    gs.grid[7] = 9;
    gs.grid[13] = 5;
    gs.grid[10] = 2;
    gs.grid[12] = 1;
    gs.moveAt(12, 14); // any board action re-asserts the bar
    expect(gs.grid.slice(0, 4)).toEqual([9, 5, 5, 2]);
    expect(gs.equippedIndices).toEqual([0, 1, 2, 3]);
  });

  it('equipped count never exceeds unlocked slots', () => {
    const gs = new GameState();
    for (let i = 0; i < 8; i++) gs.grid[i] = i + 1;
    expect(gs.equippedIndices).toHaveLength(1);
    gs.highestStage = 15;
    expect(gs.equippedIndices).toHaveLength(3);
  });

  it('dragging an equipped sword off the bar snaps it straight back', () => {
    const gs = new GameState(); // one slot: cell 0
    gs.grid[0] = 8;
    gs.grid[5] = 2;
    expect(gs.moveAt(0, 9)).toBe(true); // the move itself is legal...
    expect(gs.grid[0]).toBe(8); // ...but the bar reclaims the best sword
    expect(gs.grid[9]).toBeNull();
  });

  it('selling a mid sword promotes the next best into the bar', () => {
    const gs = new GameState();
    gs.grid[0] = 6;
    gs.grid[8] = 4;
    gs.grid[9] = 3;
    expect(gs.sellAt(0)).toBeNull(); // bar swords can't be binned
    expect(gs.sellAt(8)).not.toBeNull();
    expect(gs.grid[0]).toBe(6); // unchanged: 6 still the best
    gs.grid[0] = 1;
    gs.sellAt(9); // sync runs: the 3 was just sold; the 1 is now cell 0's...
    expect(gs.grid[0]).toBe(1); // nothing better left on the board
  });
});

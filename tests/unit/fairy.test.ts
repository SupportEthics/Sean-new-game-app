import { describe, expect, it } from 'vitest';
import { FAIRY, fairyLevelCost } from '../../src/config/fairy';
import { GameState } from '../../src/core/GameState';

describe('fairy', () => {
  it('is locked before the unlock stage', () => {
    const gs = new GameState();
    gs.gold = 1e12;
    expect(gs.fairyUnlocked).toBe(false);
    expect(gs.upgradeFairy()).toBe(false);
    gs.highestStage = FAIRY.unlockStage;
    expect(gs.fairyUnlocked).toBe(true);
    expect(gs.upgradeFairy()).toBe(true);
  });

  it('levels cost escalating gold up to the cap', () => {
    const gs = new GameState();
    gs.highestStage = FAIRY.unlockStage;
    expect(fairyLevelCost(2)).toBeGreaterThan(fairyLevelCost(1));
    gs.gold = 5000;
    expect(gs.fairyUpgradeCost).toBe(fairyLevelCost(1));
    expect(gs.upgradeFairy()).toBe(true);
    expect(gs.gold).toBe(5000 - fairyLevelCost(1));
    gs.fairyLevel = FAIRY.maxLevel;
    expect(gs.fairyUpgradeCost).toBeNull();
    expect(gs.upgradeFairy()).toBe(false);
  });

  it('boosts both DPS and gold', () => {
    const gs = new GameState();
    gs.grid[0] = 5;
    const baseDps = gs.heroDps;
    gs.fairyLevel = 10;
    expect(gs.fairyDpsMultiplier).toBeCloseTo(1 + 10 * FAIRY.dpsPerLevel);
    expect(gs.heroDps).toBeCloseTo(baseDps * (1 + 10 * FAIRY.dpsPerLevel));
    expect(gs.goldMultiplier).toBeCloseTo(1 + 10 * FAIRY.goldPerLevel);
  });

  it('survives serialize round-trip and prestige', () => {
    const gs = new GameState();
    gs.fairyLevel = 7;
    expect(GameState.deserialize(gs.serialize()).fairyLevel).toBe(7);
    gs.battle.stage = 40;
    gs.prestige();
    expect(gs.fairyLevel).toBe(7); // permanent account progress
  });
});

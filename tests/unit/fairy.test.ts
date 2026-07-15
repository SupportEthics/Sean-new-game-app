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

describe('fairy evolution', () => {
  function recruited(): GameState {
    const gs = new GameState();
    gs.highestStage = 20;
    gs.gold = 1e9;
    gs.upgradeFairy(); // recruit at level 1
    return gs;
  }

  it('needs a recruited fairy, then gems per ascension', () => {
    const gs = new GameState();
    gs.highestStage = 20;
    expect(gs.fairyEvolveStatus().reason).toBe('unrecruited');
    const r = recruited();
    expect(r.fairyEvolveStatus().reason).toBe('gems');
    r.gems = 1000;
    expect(r.fairyEvolveStatus().reason).toBe('ready');
    expect(r.evolveFairy()).toBe(true);
    expect(r.fairyStage).toBe(1);
    expect(r.evolveFairy()).toBe(true);
    expect(r.fairyStage).toBe(2);
    expect(r.fairyEvolveStatus().reason).toBe('maxed');
    expect(r.evolveFairy()).toBe(false);
  });

  it('each stage multiplies her whole blessing', () => {
    const gs = recruited();
    gs.gems = 1000;
    const dps0 = gs.fairyDpsMultiplier - 1;
    const gold0 = gs.fairyGoldMultiplier - 1;
    gs.evolveFairy();
    expect(gs.fairyDpsMultiplier - 1).toBeCloseTo(dps0 * 2, 6);
    gs.evolveFairy();
    expect(gs.fairyDpsMultiplier - 1).toBeCloseTo(dps0 * 4, 6);
    expect(gs.fairyGoldMultiplier - 1).toBeCloseTo(gold0 * 4, 6);
  });

  it('the stage survives a save round-trip', () => {
    const gs = recruited();
    gs.gems = 1000;
    gs.evolveFairy();
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    expect(revived.fairyStage).toBe(1);
  });
});

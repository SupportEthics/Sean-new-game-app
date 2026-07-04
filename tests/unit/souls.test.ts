import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../../src/config/economy';
import { SOUL_UPGRADES, soulUpgradeCost } from '../../src/config/soulsTree';
import { computeOffline } from '../../src/core/OfflineEarnings';
import { GameState } from '../../src/core/GameState';

describe('soul relics', () => {
  it('costs escalate and respect max level', () => {
    const might = SOUL_UPGRADES[0];
    expect(soulUpgradeCost(might, 1)).toBeGreaterThan(soulUpgradeCost(might, 0));
    const gs = new GameState();
    gs.souls = 1e9;
    for (let i = 0; i < might.maxLevel; i++) expect(gs.buySoulUpgrade('might')).toBe(true);
    expect(gs.buySoulUpgrade('might')).toBe(false); // maxed
    expect(gs.soulUpgradePrice('might')).toBeNull();
  });

  it('cannot buy without souls', () => {
    const gs = new GameState();
    expect(gs.buySoulUpgrade('might')).toBe(false);
  });

  it('might multiplies DPS', () => {
    const gs = new GameState();
    gs.grid[0] = 5;
    const base = gs.heroDps;
    gs.souls = 100;
    gs.buySoulUpgrade('might');
    expect(gs.heroDps).toBeCloseTo(base * 1.1);
  });

  it('fortune multiplies battle gold', () => {
    const gs = new GameState();
    gs.soulUpgrades.fortune = 10; // +100%
    expect(gs.goldMultiplier).toBeCloseTo(2);
  });

  it('endurance extends the offline cap', () => {
    const gs = new GameState();
    gs.grid[0] = 6;
    gs.soulUpgrades.endurance = 4;
    expect(gs.offlineCapHours).toBe(ECONOMY.offlineCapHours + 4);
    const week = computeOffline(gs, 7 * 24 * 3600);
    expect(week.seconds).toBe((ECONOMY.offlineCapHours + 4) * 3600);
  });

  it('relic levels survive serialize round-trip', () => {
    const gs = new GameState();
    gs.souls = 100;
    gs.buySoulUpgrade('fortune');
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.soulLevel('fortune')).toBe(1);
    expect(revived.souls).toBe(gs.souls);
  });
});

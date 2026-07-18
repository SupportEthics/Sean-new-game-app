import { describe, expect, it } from 'vitest';
import { BUILDINGS, buildingById, buildingCost, TOWN } from '../../src/config/town';
import { computeOffline } from '../../src/core/OfflineEarnings';
import { GameState } from '../../src/core/GameState';

const NOW = Date.parse('2026-07-04T12:00:00Z');
const DAY = 86_400_000;

function townState(): GameState {
  const gs = new GameState();
  gs.prestigeCount = TOWN.unlockPrestiges;
  gs.gold = 1e24; // enough to max every building at the doubled caps
  return gs;
}

describe('town', () => {
  it('is locked until the second rebirth', () => {
    const gs = new GameState();
    gs.gold = 1e12;
    expect(gs.townUnlocked).toBe(false);
    expect(gs.buyBuilding('farm')).toBe(false);
    gs.prestigeCount = 2;
    expect(gs.townUnlocked).toBe(true);
    expect(gs.buyBuilding('farm')).toBe(true);
  });

  it('building costs escalate and respect the level cap', () => {
    const gs = townState();
    const farm = buildingById('farm')!;
    expect(buildingCost(farm, 1)).toBeGreaterThan(buildingCost(farm, 0));
    for (let i = 0; i < farm.maxLevel; i++) expect(gs.buyBuilding('farm')).toBe(true);
    expect(gs.buyBuilding('farm')).toBe(false); // maxed
    expect(gs.buildingUpgradeCost('farm')).toBeNull();
  });

  it('the keep boosts gold AND damage together', () => {
    const gs = townState();
    gs.grid[0] = 5;
    const dps = gs.heroDps;
    const goldMult = gs.goldMultiplier;
    gs.townBuildings = { keep: 20 };
    expect(gs.goldMultiplier).toBeCloseTo(goldMult * 1.2); // 20 x 1%
    expect(gs.heroDps).toBeCloseTo(dps * 1.2);
    // it stacks multiplicatively with the farm and blacksmith
    gs.townBuildings = { keep: 20, farm: 10, blacksmith: 10 };
    expect(gs.goldMultiplier).toBeCloseTo(goldMult * 1.2 * 1.3);
    expect(gs.heroDps).toBeCloseTo(dps * 1.2 * 1.2);
  });

  it('farm boosts gold, blacksmith boosts DPS, mine boosts offline', () => {
    const gs = townState();
    gs.grid[0] = 5;
    const dps = gs.heroDps;
    const goldMult = gs.goldMultiplier;
    gs.townBuildings = { farm: 10, blacksmith: 10, mine: 10 };
    expect(gs.goldMultiplier).toBeCloseTo(goldMult * 1.3); // 10 x 3%
    expect(gs.heroDps).toBeCloseTo(dps * 1.2); // 10 x 2%
    const plain = townState();
    plain.grid[0] = 5;
    const withMine = computeOffline(gs, 3600).gold;
    const without = computeOffline(plain, 3600).gold;
    expect(withMine).toBeGreaterThan(without);
  });

  it('the jeweler vault accrues daily, caps, and collects once', () => {
    const gs = townState();
    gs.townBuildings = { jeweler: 3 };
    gs.jewelerCollectedAt = NOW;
    expect(gs.jewelerVault(NOW)).toBe(0);
    expect(gs.jewelerVault(NOW + DAY)).toBe(3);
    expect(gs.jewelerVault(NOW + 10 * DAY)).toBe(3 * TOWN.jewelerCapDays); // capped
    expect(gs.collectJeweler(NOW + 2 * DAY)).toBe(6);
    expect(gs.gems).toBe(6);
    expect(gs.jewelerVault(NOW + 2 * DAY)).toBe(0); // vault emptied
  });

  it('buying the first jeweler level starts its clock', () => {
    const gs = townState();
    const before = Date.now();
    gs.buyBuilding('jeweler');
    expect(gs.jewelerCollectedAt).toBeGreaterThanOrEqual(before);
    expect(gs.jewelerVault()).toBe(0); // nothing instantly
  });

  it('town survives serialize round-trip and prestige', () => {
    const gs = townState();
    gs.buyBuilding('farm');
    gs.buyBuilding('jeweler');
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.buildingLevel('farm')).toBe(1);
    expect(revived.jewelerCollectedAt).toBe(gs.jewelerCollectedAt);
    gs.battle.stage = 40;
    gs.prestige();
    expect(gs.buildingLevel('farm')).toBe(1); // permanent account progress
  });

  it('every building id is unique', () => {
    const ids = BUILDINGS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

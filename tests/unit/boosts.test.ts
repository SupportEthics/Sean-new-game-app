import { describe, expect, it } from 'vitest';
import { BOOSTS } from '../../src/config/economy';
import { GameState } from '../../src/core/GameState';

const NOW = Date.parse('2026-07-04T12:00:00Z');

describe('rewarded-ad boosts', () => {
  it('x2 damage doubles DPS while the window is open', () => {
    const gs = new GameState();
    gs.grid[0] = 5;
    const base = gs.heroDps;
    gs.activateDmgBoost();
    expect(gs.dmgBoostActive()).toBe(true);
    expect(gs.heroDps).toBeCloseTo(base * BOOSTS.dmgMult);
  });

  it('boost windows expire', () => {
    const gs = new GameState();
    gs.activateDmgBoost(NOW);
    gs.activateSpeedBoost(NOW);
    const after = NOW + BOOSTS.adMinutes * 60_000 + 1;
    expect(gs.dmgBoostActive(after)).toBe(false);
    expect(gs.speedBoostActive(after)).toBe(false);
    expect(gs.dmgBoostActive(after - 2)).toBe(true);
  });

  it('x2 speed makes battle time pass twice as fast', () => {
    const plain = new GameState();
    const boosted = new GameState();
    plain.grid[0] = 10;
    boosted.grid[0] = 10;
    boosted.activateSpeedBoost(); // Date.now()-based, active during update
    plain.update(10);
    boosted.update(10);
    expect(boosted.totalKills).toBeGreaterThan(plain.totalKills);
    // Boosted 10s should roughly match plain 20s
    const plain20 = new GameState();
    plain20.grid[0] = 10;
    plain20.update(20);
    expect(boosted.totalKills).toBe(plain20.totalKills);
  });

  it('boost windows survive a serialize round-trip', () => {
    const gs = new GameState();
    gs.activateDmgBoost(NOW);
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.dmgBoostUntil).toBe(NOW + BOOSTS.adMinutes * 60_000);
  });
});

describe('quest badge count', () => {
  it('counts finished-but-unclaimed quests across all sheets', () => {
    const gs = new GameState();
    expect(gs.claimableQuests).toBe(0);
    gs.trackQuest('raids', 1, NOW); // daily raids target = 1 -> claimable
    expect(gs.claimableQuests).toBe(1);
    gs.trackQuest('raids', 4, NOW); // weekly target 5 now met too
    expect(gs.claimableQuests).toBe(2);
    gs.claimQuest('raids', NOW);
    expect(gs.claimableQuests).toBe(1);
  });
});

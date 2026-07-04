import { describe, expect, it } from 'vitest';
import { ECONOMY } from '../../src/config/economy';
import { newBattleState } from '../../src/core/BattleSim';
import {
  computeOffline,
  estimateGoldPerSecond,
  formatDuration,
} from '../../src/core/OfflineEarnings';
import { GameState } from '../../src/core/GameState';

function playerAt(stage: number, tier: number): GameState {
  const gs = new GameState();
  gs.battle = newBattleState(stage);
  gs.highestStage = stage;
  gs.grid[0] = tier;
  return gs;
}

describe('estimateGoldPerSecond', () => {
  it('is positive and grows with power', () => {
    const weak = playerAt(3, 3);
    const strong = playerAt(3, 8);
    expect(estimateGoldPerSecond(weak)).toBeGreaterThan(0);
    expect(estimateGoldPerSecond(strong)).toBeGreaterThan(estimateGoldPerSecond(weak));
  });

  it('caps the kill rate so overkill DPS cannot explode it', () => {
    const god = playerAt(1, 40);
    const rate = estimateGoldPerSecond(god);
    expect(rate).toBeLessThanOrEqual(5 * 2.001); // 5 kills/s * stage-1 bounty
  });
});

describe('computeOffline', () => {
  it('ignores short absences', () => {
    expect(computeOffline(playerAt(5, 6), 30).gold).toBe(0);
  });

  it('pays the reduced rate for the time away', () => {
    const gs = playerAt(5, 6);
    const hour = computeOffline(gs, 3600);
    expect(hour.gold).toBeGreaterThan(0);
    expect(hour.gold).toBeLessThanOrEqual(
      Math.ceil(estimateGoldPerSecond(gs) * 3600 * ECONOMY.offlineRateMultiplier),
    );
  });

  it('caps at the configured hours', () => {
    const gs = playerAt(5, 6);
    const atCap = computeOffline(gs, ECONOMY.offlineCapHours * 3600);
    const week = computeOffline(gs, 7 * 24 * 3600);
    expect(week.gold).toBe(atCap.gold);
    expect(week.seconds).toBe(ECONOMY.offlineCapHours * 3600);
  });

  it('never pays for negative time (clock rollback)', () => {
    expect(computeOffline(playerAt(5, 6), -500).gold).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(8100)).toBe('2H 15M');
    expect(formatDuration(540)).toBe('9M');
  });
});

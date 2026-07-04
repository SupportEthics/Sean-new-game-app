import { describe, expect, it } from 'vitest';
import { LOGIN_REWARDS } from '../../src/config/loginRewards';
import { GameState } from '../../src/core/GameState';

const DAY1 = Date.parse('2026-07-04T10:00:00Z');
const DAY2 = Date.parse('2026-07-05T10:00:00Z');
const DAY5 = Date.parse('2026-07-08T10:00:00Z');

describe('daily login rewards', () => {
  it('claims once per UTC day', () => {
    const gs = new GameState();
    expect(gs.loginRewardReady(DAY1)).toBe(true);
    expect(gs.claimLoginReward(DAY1)).not.toBeNull();
    expect(gs.loginRewardReady(DAY1)).toBe(false);
    expect(gs.claimLoginReward(DAY1)).toBeNull();
    expect(gs.loginRewardReady(DAY2)).toBe(true);
  });

  it('advances the 7-day cycle and wraps around', () => {
    const gs = new GameState();
    for (let i = 0; i < LOGIN_REWARDS.length; i++) {
      expect(gs.todaysLoginReward.day).toBe(i + 1);
      gs.claimLoginReward(DAY1 + i * 24 * 3600 * 1000);
    }
    expect(gs.loginStreakDay).toBe(0); // wrapped
    expect(gs.todaysLoginReward.day).toBe(1);
  });

  it('missing days pauses the cycle instead of resetting it', () => {
    const gs = new GameState();
    gs.claimLoginReward(DAY1);
    gs.claimLoginReward(DAY2);
    expect(gs.loginStreakDay).toBe(2);
    gs.claimLoginReward(DAY5); // skipped two days
    expect(gs.loginStreakDay).toBe(3); // still just the next chip
  });

  it('rewards actually pay out', () => {
    const gs = new GameState();
    gs.grid[0] = 5; // some income so gold rewards are non-trivial
    const gold = gs.gold;
    gs.claimLoginReward(DAY1); // day 1: gold
    expect(gs.gold).toBeGreaterThan(gold);
    gs.claimLoginReward(DAY2); // day 2: gems
    expect(gs.gems).toBe(LOGIN_REWARDS[1].gems);
  });

  it('day 7 hatches a free pet', () => {
    const gs = new GameState();
    gs.loginStreakDay = 6;
    expect(Object.keys(gs.pets)).toHaveLength(0);
    gs.claimLoginReward(DAY1);
    // Either a new pet or (if somehow maxed) consolation gems — here a pet
    expect(Object.keys(gs.pets)).toHaveLength(1);
  });

  it('login state survives a serialize round-trip', () => {
    const gs = new GameState();
    gs.claimLoginReward(DAY1);
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.loginStreakDay).toBe(1);
    expect(revived.loginRewardReady(DAY1)).toBe(false);
    expect(revived.loginRewardReady(DAY2)).toBe(true);
  });
});

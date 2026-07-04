import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, achievementById } from '../../src/config/achievements';
import { GameState } from '../../src/core/GameState';

describe('achievements', () => {
  it('progress reads the right lifetime counters', () => {
    const gs = new GameState();
    gs.totalKills = 1500;
    gs.totalMerges = 150;
    gs.highestStage = 30;
    gs.pets = { pup: 1, wisp: 2 };
    expect(gs.achievementProgress(achievementById('kills1')!)).toBe(1500);
    expect(gs.achievementProgress(achievementById('merges1')!)).toBe(150);
    expect(gs.achievementProgress(achievementById('stage1')!)).toBe(30);
    expect(gs.achievementProgress(achievementById('pets1')!)).toBe(2);
  });

  it('claims pay gems exactly once', () => {
    const gs = new GameState();
    gs.totalKills = 1000;
    expect(gs.canClaimAchievement('kills1')).toBe(true);
    expect(gs.claimAchievement('kills1')).toBe(true);
    expect(gs.gems).toBe(achievementById('kills1')!.gems);
    expect(gs.claimAchievement('kills1')).toBe(false);
    expect(gs.gems).toBe(achievementById('kills1')!.gems);
  });

  it('unfinished goals cannot be claimed', () => {
    const gs = new GameState();
    expect(gs.claimAchievement('kills1')).toBe(false);
    expect(gs.claimAchievement('nonsense')).toBe(false);
  });

  it('merges feed the lifetime counter', () => {
    const gs = new GameState();
    gs.grid[0] = 1;
    gs.grid[1] = 1;
    gs.mergeAt(0, 1);
    expect(gs.totalMerges).toBe(1);
  });

  it('claimable achievements count toward the badge', () => {
    const gs = new GameState();
    expect(gs.claimableQuests).toBe(0);
    gs.totalKills = 1000;
    expect(gs.claimableQuests).toBe(1); // kills1 ready
    gs.claimAchievement('kills1');
    expect(gs.claimableQuests).toBe(0);
  });

  it('claims survive a serialize round-trip', () => {
    const gs = new GameState();
    gs.totalKills = 1000;
    gs.totalMerges = 100;
    gs.claimAchievement('kills1');
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.achievementsClaimed).toEqual(['kills1']);
    expect(revived.totalMerges).toBe(100);
    expect(revived.canClaimAchievement('kills1')).toBe(false);
    expect(revived.canClaimAchievement('merges1')).toBe(true);
  });

  it('every achievement id is unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

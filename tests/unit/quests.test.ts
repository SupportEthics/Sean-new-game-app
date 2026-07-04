import { describe, expect, it } from 'vitest';
import {
  DAILY_QUESTS,
  questBy,
  questById,
  STREAK_BONUS_PER_DAY,
  utcDay,
  utcMonth,
  utcWeek,
} from '../../src/config/quests';
import { GameState } from '../../src/core/GameState';

const DAY1 = Date.parse('2026-07-04T10:00:00Z');
const DAY2 = Date.parse('2026-07-05T10:00:00Z');
const DAY4 = Date.parse('2026-07-07T10:00:00Z');

function completeAll(gs: GameState, now: number): number {
  let gems = 0;
  for (const q of DAILY_QUESTS) {
    gs.trackQuest(q.id, q.target, now);
    expect(gs.claimQuest(q.id, now)).toBe(true);
    gems += q.gems;
  }
  return gems;
}

describe('daily quests', () => {
  it('tracks progress up to the target', () => {
    const gs = new GameState();
    gs.trackQuest('kills', 150, DAY1);
    gs.trackQuest('kills', 150, DAY1);
    expect(gs.questProgress('kills')).toBe(questById('kills').target);
  });

  it('claiming pays gems once', () => {
    const gs = new GameState();
    gs.trackQuest('merges', 15, DAY1);
    expect(gs.claimQuest('merges', DAY1)).toBe(true);
    expect(gs.gems).toBe(questById('merges').gems);
    expect(gs.claimQuest('merges', DAY1)).toBe(false);
  });

  it('cannot claim unfinished quests', () => {
    const gs = new GameState();
    gs.trackQuest('raids', 0, DAY1);
    expect(gs.claimQuest('raids', DAY1)).toBe(false);
  });

  it('resets at the UTC day boundary', () => {
    const gs = new GameState();
    gs.trackQuest('kills', 200, DAY1);
    gs.trackQuest('kills', 1, DAY2); // rolls over first
    expect(gs.daily.day).toBe(utcDay(DAY2));
    expect(gs.questProgress('kills')).toBe(1);
    expect(gs.daily.claimed).toEqual([]);
  });

  it('full clear grows the streak on consecutive days and pays the bonus', () => {
    const gs = new GameState();
    const base = completeAll(gs, DAY1);
    expect(gs.daily.streak).toBe(1);
    expect(gs.gems).toBe(base + STREAK_BONUS_PER_DAY);

    completeAll(gs, DAY2);
    expect(gs.daily.streak).toBe(2);

    completeAll(gs, DAY4); // skipped a day -> streak restarts
    expect(gs.daily.streak).toBe(1);
  });

  it('battle kills, merges and stage clears feed quests automatically', () => {
    const gs = new GameState();
    gs.rollDaily(DAY1);
    gs.grid[0] = 1;
    gs.grid[1] = 1;
    gs.grid[2] = 1;
    gs.autoMergeOnce();
    expect(gs.questProgress('merges')).toBe(1);
    gs.grid.fill(null);
    gs.grid[0] = 12;
    gs.update(30); // plenty of kills + stages at tier-12 dps
    expect(gs.questProgress('kills')).toBeGreaterThan(0);
    expect(gs.questProgress('stages')).toBeGreaterThan(0);
  });

  it('daily state survives serialize round-trip', () => {
    const gs = new GameState();
    gs.trackQuest('kills', 42, DAY1);
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.questProgress('kills')).toBe(42);
    expect(revived.daily.day).toBe(utcDay(DAY1));
  });
});

describe('weekly and monthly quests', () => {
  it('one action counts toward all three sheets', () => {
    const gs = new GameState();
    gs.trackQuest('kills', 250, DAY1);
    expect(gs.questProgress('kills', 'daily')).toBe(questById('kills').target);
    expect(gs.questProgress('kills', 'weekly')).toBe(250);
    expect(gs.questProgress('kills', 'monthly')).toBe(250);
  });

  it('weekly sheets survive a day rollover but reset on Monday', () => {
    const gs = new GameState();
    // 2026-07-04 is a Saturday; the week key is Monday 2026-06-29
    expect(utcWeek(DAY1)).toBe('2026-06-29');
    gs.trackQuest('kills', 500, DAY1);
    gs.trackQuest('kills', 500, DAY2); // Sunday: same week
    expect(gs.questProgress('kills', 'weekly')).toBe(1000);
    expect(gs.questProgress('kills', 'daily')).toBe(200); // daily reset, re-capped
    const MONDAY = Date.parse('2026-07-06T08:00:00Z');
    gs.trackQuest('kills', 1, MONDAY);
    expect(gs.questProgress('kills', 'weekly')).toBe(1);
    expect(gs.weekly.key).toBe('2026-07-06');
  });

  it('monthly sheets reset on the 1st', () => {
    const gs = new GameState();
    expect(utcMonth(DAY1)).toBe('2026-07');
    gs.trackQuest('merges', 50, DAY1);
    gs.trackQuest('merges', 50, DAY4); // still July
    expect(gs.questProgress('merges', 'monthly')).toBe(100);
    const AUGUST = Date.parse('2026-08-01T00:30:00Z');
    gs.trackQuest('merges', 2, AUGUST);
    expect(gs.questProgress('merges', 'monthly')).toBe(2);
  });

  it('weekly claims pay their own gems, independent of daily claims', () => {
    const gs = new GameState();
    const weekly = questBy('weekly', 'raids');
    gs.trackQuest('raids', weekly.target, DAY1);
    expect(gs.claimQuest('raids', DAY1)).toBe(true); // daily
    expect(gs.claimQuest('raids', DAY1, 'weekly')).toBe(true);
    expect(gs.claimQuest('raids', DAY1, 'weekly')).toBe(false); // once
    expect(gs.gems).toBe(questById('raids').gems + weekly.gems);
  });

  it('period sheets survive serialize round-trip', () => {
    const gs = new GameState();
    gs.trackQuest('stages', 12, DAY1);
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.questProgress('stages', 'weekly')).toBe(12);
    expect(revived.questProgress('stages', 'monthly')).toBe(12);
    expect(revived.weekly.key).toBe(utcWeek(DAY1));
    expect(revived.monthly.key).toBe(utcMonth(DAY1));
  });
});

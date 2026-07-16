import { describe, expect, it } from 'vitest';
import {
  DUNGEON,
  DUNGEON_MODIFIERS,
  dungeonDuration,
  dungeonGems,
  dungeonModifier,
  dungeonQuota,
} from '../../src/config/dungeon';
import { GameState } from '../../src/core/GameState';

const DAY = 86_400_000;

function readyState(): GameState {
  const gs = new GameState();
  gs.highestStage = 30;
  gs.battle.stage = 30;
  gs.grid[0] = 30; // DPS far above the stage-30 frontier: clears easily
  return gs;
}

describe('dungeon schedule', () => {
  it('rotates the modifier daily and covers all of them', () => {
    const base = Date.UTC(2026, 0, 7);
    const seen = new Set<string>();
    for (let i = 0; i < DUNGEON_MODIFIERS.length; i++) {
      seen.add(dungeonModifier(base + i * DAY).id);
    }
    expect(seen.size).toBe(DUNGEON_MODIFIERS.length);
    // Stable within a day
    expect(dungeonModifier(base).id).toBe(dungeonModifier(base + DAY - 1).id);
  });

  it('quota, duration and gems derive sensibly', () => {
    for (const mod of DUNGEON_MODIFIERS) {
      expect(dungeonQuota(mod)).toBeGreaterThanOrEqual(5);
      expect(dungeonDuration(mod)).toBeGreaterThan(0);
    }
    expect(dungeonGems(100)).toBe(DUNGEON.gemsBase + 10);
  });
});

describe('dungeon runs', () => {
  it('is locked below the unlock stage', () => {
    const gs = new GameState();
    expect(gs.dungeonUnlocked).toBe(false);
    expect(gs.startDungeon()).toBe(false);
  });

  it('clearing pays gems + gold once, then locks until tomorrow', () => {
    const gs = readyState();
    const gems = gs.gems;
    const gold = gs.gold;
    expect(gs.startDungeon()).toBe(true);
    expect(gs.raid?.dungeon).toBeDefined();
    for (let i = 0; i < 400 && gs.raid; i++) gs.update(0.1);
    expect(gs.raid).toBeNull();
    expect(gs.dungeonClearedToday()).toBe(true);
    expect(gs.gems).toBeGreaterThan(gems);
    expect(gs.gold).toBeGreaterThan(gold);
    // No second helping today
    expect(gs.canStartDungeon()).toBe(false);
    // Tomorrow it's back
    expect(gs.canStartDungeon(gs.clock() + DAY)).toBe(true);
  });

  it('failing pays nothing and leaves the day open for retries', () => {
    const gs = readyState();
    gs.grid[0] = 1; // hopeless DPS
    const gems = gs.gems;
    expect(gs.startDungeon()).toBe(true);
    for (let i = 0; i < 700 && gs.raid; i++) gs.update(0.1);
    expect(gs.raid).toBeNull();
    expect(gs.gems).toBe(gems);
    expect(gs.dungeonClearedToday()).toBe(false);
    expect(gs.canStartDungeon()).toBe(true); // free retry
  });

  it('entering the dungeon ticks the daily quest', () => {
    const gs = readyState();
    expect(gs.questProgress('dungeons')).toBe(0);
    gs.startDungeon();
    expect(gs.questProgress('dungeons')).toBe(1);
  });

  it('never overlaps a raid', () => {
    const gs = readyState();
    gs.prestigeCount = 1;
    gs.startRaid(1, 0);
    expect(gs.canStartDungeon()).toBe(false);
  });

  it('the cleared day survives a save round-trip', () => {
    const gs = readyState();
    gs.startDungeon();
    for (let i = 0; i < 400 && gs.raid; i++) gs.update(0.1);
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    expect(revived.dungeonClearedToday()).toBe(true);
  });
});

describe('dungeon after a rebirth (Sean bug)', () => {
  it('tunes to the CURRENT run, so a fresh-run knight still lands kills and gold', () => {
    const gs = new GameState();
    gs.highestStage = 190; // lifetime legend...
    gs.battle.stage = 8; // ...freshly reborn
    gs.prestigeCount = 4;
    gs.grid[0] = 8; // stage-8-appropriate sword
    const gold = gs.gold;
    expect(gs.startDungeon()).toBe(true);
    for (let i = 0; i < 700 && gs.raid; i++) gs.update(0.1);
    // Kills landed and paid out — the old highestStage tuning paid zero
    expect(gs.gold).toBeGreaterThan(gold);
  });
});

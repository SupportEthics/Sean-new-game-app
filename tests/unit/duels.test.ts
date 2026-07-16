import { describe, expect, it } from 'vitest';
import { DUELS } from '../../src/config/duels';
import { duelWinChance, rivalDps } from '../../src/core/EconomyMath';
import { GameState } from '../../src/core/GameState';

describe('duel math', () => {
  it('a fair fight is 50/50; punching up is hard but possible', () => {
    const equal = duelWinChance(rivalDps(50), 50);
    expect(equal).toBeCloseTo(0.5, 5);
    const up = duelWinChance(rivalDps(40), 60);
    expect(up).toBeGreaterThan(0);
    expect(up).toBeLessThan(0.2);
    const down = duelWinChance(rivalDps(60), 40);
    expect(down).toBeGreaterThan(0.8);
  });

  it('the crown is a long shot, not easy pickings (Sean bug)', () => {
    // A knight geared for stage 100 challenging the stage-150 leader:
    // 50 stages of 1.27x HP growth should make this a ~1% upset roll
    const vsCrown = duelWinChance(rivalDps(100), 150);
    expect(vsCrown).toBeLessThanOrEqual(0.01);
    expect(vsCrown).toBeGreaterThan(0); // never a literal zero
    // And a rival's power tracks their stage: +10 stages ~ 11x DPS
    expect(rivalDps(60) / rivalDps(50)).toBeCloseTo(Math.pow(1.27, 10), 1);
  });
});

describe('duels in GameState', () => {
  it('wins pay a purse, losses pay nothing', () => {
    const gs = new GameState();
    gs.grid[0] = 10;
    const gold = gs.gold;
    const win = gs.duel(1, undefined, 0)!; // roll 0 always wins
    expect(win.won).toBe(true);
    expect(gs.gold).toBe(gold + win.gold);
    const after = gs.gold;
    const loss = gs.duel(999, undefined, 0.999999)!; // roll ~1 always loses
    expect(loss.won).toBe(false);
    expect(gs.gold).toBe(after);
  });

  it('fighting a duel ticks the daily quest', () => {
    const gs = new GameState();
    expect(gs.questProgress('duels')).toBe(0);
    gs.duel(10);
    expect(gs.questProgress('duels')).toBe(1);
  });

  it('never duels while a raid or dungeon owns the arena', () => {
    const gs = new GameState();
    gs.prestigeCount = 1;
    gs.startRaid(1, 0);
    expect(gs.duel(10)).toBeNull();
  });

  it('the daily allowance runs out and resets tomorrow', () => {
    const gs = new GameState();
    expect(gs.duelsLeft()).toBe(DUELS.perDay);
    for (let i = 0; i < DUELS.perDay; i++) expect(gs.duel(10)).not.toBeNull();
    expect(gs.duelsLeft()).toBe(0);
    expect(gs.duel(10)).toBeNull();
    const tomorrow = gs.clock() + 86_400_000;
    expect(gs.duelsLeft(tomorrow)).toBe(DUELS.perDay);
    expect(gs.duel(10, tomorrow)).not.toBeNull();
  });

  it('the allowance survives a save round-trip', () => {
    const gs = new GameState();
    gs.duel(10);
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    expect(revived.duelsLeft()).toBe(DUELS.perDay - 1);
  });
});

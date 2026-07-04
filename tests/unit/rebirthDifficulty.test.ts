import { describe, expect, it } from 'vitest';
import { enemyHpScale, PRESTIGE } from '../../src/config/prestige';
import { newBattleState } from '../../src/core/BattleSim';
import { GameState } from '../../src/core/GameState';

describe('rebirth difficulty', () => {
  it('monsters gain HP with every prestige', () => {
    expect(enemyHpScale(0)).toBe(1);
    expect(enemyHpScale(1)).toBeCloseTo(1 + PRESTIGE.enemyHpPerPrestige);
    expect(enemyHpScale(3)).toBeCloseTo(1 + 3 * PRESTIGE.enemyHpPerPrestige);
    const base = newBattleState(1, 1, 1).currentEnemyMaxHp;
    const scaled = newBattleState(1, 1, enemyHpScale(2)).currentEnemyMaxHp;
    expect(scaled).toBeCloseTo(base * 1.2);
  });

  it('a fresh cycle after prestige starts with tougher monsters', () => {
    const gs = new GameState();
    const baseHp = gs.battle.currentEnemyMaxHp;
    gs.battle.stage = 40;
    expect(gs.prestige()).toBe(true);
    expect(gs.enemyHpMultiplier).toBeCloseTo(1 + PRESTIGE.enemyHpPerPrestige);
    expect(gs.battle.currentEnemyMaxHp).toBeCloseTo(
      baseHp * (1 + PRESTIGE.enemyHpPerPrestige),
    );
  });

  it('tougher monsters mean fewer kills in the same time', () => {
    const fresh = new GameState();
    const veteran = new GameState();
    veteran.prestigeCount = 5;
    veteran.battle = newBattleState(1, 1, veteran.enemyHpMultiplier);
    fresh.grid[0] = 6;
    veteran.grid[0] = 6;
    fresh.update(30);
    veteran.update(30);
    expect(veteran.totalKills).toBeLessThan(fresh.totalKills);
  });

  it('the scale persists through wave transitions', () => {
    const gs = new GameState();
    gs.prestigeCount = 2;
    gs.battle = newBattleState(1, 1, gs.enemyHpMultiplier);
    gs.grid[0] = 10;
    gs.update(5); // clears waves; every respawned enemy keeps the scale
    const expected = newBattleState(gs.battle.stage, gs.battle.wave, 1.2).currentEnemyMaxHp;
    expect(gs.battle.currentEnemyMaxHp).toBeCloseTo(expected);
  });

  it('offline income estimate respects the tougher monsters', () => {
    const fresh = new GameState();
    const veteran = new GameState();
    veteran.prestigeCount = 5;
    fresh.grid[0] = 6;
    veteran.grid[0] = 6;
    expect(veteran.goldPerSecondEstimate).toBeLessThan(fresh.goldPerSecondEstimate);
  });
});

import { describe, expect, it } from 'vitest';
import { TAP } from '../../src/config/economy';
import { GameState } from '../../src/core/GameState';

describe('tap-to-strike', () => {
  it('each tap lands a bonus hit worth the configured DPS fraction', () => {
    const gs = new GameState();
    const hpBefore = gs.battle.currentEnemyHp;
    const result = gs.tapStrike(1000);
    expect(result).not.toBeNull();
    expect(result!.damageDealt).toBeCloseTo(gs.heroDps * TAP.dpsFraction, 5);
    expect(gs.battle.currentEnemyHp).toBeLessThan(hpBefore);
  });

  it('is rate limited, then ready again after the interval', () => {
    const gs = new GameState();
    expect(gs.tapStrike(1000)).not.toBeNull();
    expect(gs.tapStrike(1000 + TAP.minIntervalMs - 1)).toBeNull();
    expect(gs.tapStrike(1000 + TAP.minIntervalMs)).not.toBeNull();
  });

  it('kills and gold flow through the normal battle channels', () => {
    const gs = new GameState();
    gs.battle.currentEnemyHp = 0.01; // one tap finishes it
    const goldBefore = gs.gold;
    const kills = gs.totalKills;
    const result = gs.tapStrike(1000)!;
    expect(result.kills).toBeGreaterThanOrEqual(1);
    expect(gs.gold).toBeGreaterThan(goldBefore);
    expect(gs.totalKills).toBeGreaterThan(kills);
  });

  it('barely touches the boss clock', () => {
    const gs = new GameState();
    gs.battle.wave = 5; // boss wave
    gs.battle.currentEnemyHp = Number.MAX_VALUE / 4; // unkillable for the test
    const clockBefore = gs.battle.bossTimeLeft;
    gs.tapStrike(1000);
    expect(clockBefore - gs.battle.bossTimeLeft).toBeLessThanOrEqual(0.001 + 1e-9);
  });

  it('does nothing during a raid', () => {
    const gs = new GameState();
    gs.raid = { level: 1 } as unknown as typeof gs.raid;
    expect(gs.tapStrike(1000)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { STAGES } from '../../src/config/stages';
import { newBattleState, tick } from '../../src/core/BattleSim';

describe('BattleSim.tick', () => {
  it('kills an enemy and pays gold when damage exceeds HP', () => {
    const state = newBattleState(1);
    const result = tick(state, state.currentEnemyMaxHp * 10, 1);
    expect(result.kills).toBeGreaterThanOrEqual(1);
    expect(result.goldEarned).toBeGreaterThan(0);
  });

  it('advances waves and then stages', () => {
    const state = newBattleState(1);
    // Massive DPS clears everything quickly
    let stageCleared = false;
    for (let i = 0; i < 500 && !stageCleared; i++) {
      const r = tick(state, 1e6, 0.1);
      if (r.stageCleared) stageCleared = true;
    }
    expect(stageCleared).toBe(true);
    expect(state.stage).toBe(2);
    expect(state.wave).toBe(1);
  });

  it('boss failure retreats to wave 1 of the same stage without punishment', () => {
    const state = newBattleState(1, STAGES.wavesPerStage);
    // DPS far too low to kill the boss before the timer
    let failed = false;
    for (let i = 0; i < 1000 && !failed; i++) {
      const r = tick(state, 0.001, 0.1);
      if (r.bossFailed) failed = true;
    }
    expect(failed).toBe(true);
    expect(state.stage).toBe(1);
    expect(state.wave).toBe(1);
  });

  it('deals no negative HP and is deterministic', () => {
    const a = newBattleState(3);
    const b = newBattleState(3);
    for (let i = 0; i < 100; i++) {
      tick(a, 12.5, 0.1);
      tick(b, 12.5, 0.1);
      expect(a.currentEnemyHp).toBeGreaterThanOrEqual(0);
    }
    expect(a).toEqual(b);
  });
});

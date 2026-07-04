import { describe, expect, it } from 'vitest';
import { GameState } from '../../src/core/GameState';

/**
 * Scripted "optimal player": every sim-second they buy gear whenever
 * affordable and auto-merge whenever possible. This is the balance harness —
 * tune src/config/* until these expectations feel right.
 */
function simulate(minutes: number): GameState {
  const gs = new GameState();
  const seconds = minutes * 60;
  for (let s = 0; s < seconds; s++) {
    // Player actions ~once per second
    while (gs.canBuy) gs.buyGear();
    while (gs.autoMergeOnce() !== null) {
      /* merge until dry */
    }
    gs.update(1);
  }
  return gs;
}

describe('balance simulation (optimal player)', () => {
  it('reaches stage 5+ within 15 active minutes (fast early game)', () => {
    const gs = simulate(15);
    expect(gs.battle.stage).toBeGreaterThanOrEqual(5);
  });

  it('does NOT reach the prestige stage (40) within 2 active hours', () => {
    const gs = simulate(120);
    expect(gs.battle.stage).toBeLessThan(40);
  });

  it('keeps progressing between 30 and 120 minutes (no hard wall)', () => {
    const early = simulate(30);
    const late = simulate(120);
    expect(late.battle.stage).toBeGreaterThan(early.battle.stage);
  });

  it('gold and DPS stay finite over a long session', () => {
    const gs = simulate(120);
    expect(Number.isFinite(gs.gold)).toBe(true);
    expect(Number.isFinite(gs.heroDps)).toBe(true);
  });
});

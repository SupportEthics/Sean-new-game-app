import { describe, expect, it } from 'vitest';
import {
  buyTierFor,
  enemyHp,
  formatNumber,
  gearCost,
  gearDps,
  goldDrop,
  heroDps,
} from '../../src/core/EconomyMath';
import { STAGES } from '../../src/config/stages';

describe('gearCost', () => {
  it('grows monotonically with tier', () => {
    for (let t = 1; t < 30; t++) {
      expect(gearCost(t + 1)).toBeGreaterThan(gearCost(t));
    }
  });

  it('stays finite over the full tier range', () => {
    expect(Number.isFinite(gearCost(40))).toBe(true);
  });
});

describe('buyTierFor', () => {
  it('never offers below tier 1', () => {
    expect(buyTierFor(1)).toBe(1);
    expect(buyTierFor(3)).toBe(1);
  });

  it('lags the highest achieved tier', () => {
    expect(buyTierFor(10)).toBe(7);
  });
});

describe('heroDps', () => {
  it('gives bare-paws DPS with an empty grid', () => {
    expect(heroDps([])).toBe(1);
  });

  it('counts the best item fully and others partially', () => {
    const solo = heroDps([5]);
    const withExtras = heroDps([5, 5, 5]);
    expect(withExtras).toBeGreaterThan(solo);
    expect(withExtras).toBeLessThan(3 * solo);
  });

  it('a merge beats keeping two of a kind', () => {
    expect(heroDps([6])).toBeGreaterThan(heroDps([5, 5]));
    expect(gearDps(6)).toBeGreaterThan(2 * gearDps(5) * 0.6);
  });
});

describe('enemy scaling', () => {
  it('enemy HP grows with stage and wave', () => {
    expect(enemyHp(2, 1)).toBeGreaterThan(enemyHp(1, 1));
    expect(enemyHp(1, 5)).toBeGreaterThan(enemyHp(1, 1));
  });

  it('boss wave has the boss multiplier', () => {
    const normal = enemyHp(3, STAGES.wavesPerStage - 1);
    const boss = enemyHp(3, STAGES.wavesPerStage);
    expect(boss).toBeGreaterThan(normal * 4);
  });

  it('gold drops scale with stage and boss pays extra', () => {
    expect(goldDrop(5, 1)).toBeGreaterThan(goldDrop(1, 1));
    expect(goldDrop(1, STAGES.wavesPerStage)).toBeGreaterThan(goldDrop(1, 1) * 5);
  });
});

describe('formatNumber', () => {
  it('formats plain numbers below 1000', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats K/M/B/T', () => {
    expect(formatNumber(1234)).toBe('1.23K');
    expect(formatNumber(5_678_900)).toBe('5.68M');
    expect(formatNumber(1e9)).toBe('1.00B');
    expect(formatNumber(1e12)).toBe('1.00T');
  });

  it('rolls over to aa-style suffixes beyond T', () => {
    expect(formatNumber(1e15)).toBe('1.00aa');
    expect(formatNumber(1e18)).toBe('1.00ab');
  });

  it('handles negatives and infinity', () => {
    expect(formatNumber(-1234)).toBe('-1.23K');
    expect(formatNumber(Infinity)).toBe('∞');
  });
});

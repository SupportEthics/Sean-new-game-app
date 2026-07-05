import { describe, expect, it } from 'vitest';
import { GameState } from '../../src/core/GameState';
import {
  buyTierUpgradeCost,
  enemyHp,
  formatNumber,
  gearCost,
  gearDps,
  goldDrop,
  heroLevel,
  killsForLevel,
  levelDpsMultiplier,
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

describe('buyTierUpgradeCost', () => {
  it('costs a multiple of the sword price and escalates', () => {
    expect(buyTierUpgradeCost(2)).toBeGreaterThan(gearCost(2));
    expect(buyTierUpgradeCost(5)).toBeGreaterThan(buyTierUpgradeCost(2));
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

describe('hero level (lifetime kills)', () => {
  it('follows the square-root curve', () => {
    expect(heroLevel(0)).toBe(1);
    expect(heroLevel(5)).toBe(2);
    expect(heroLevel(killsForLevel(141))).toBe(141);
  });

  it('pays +1% DPS per 10 levels', () => {
    expect(levelDpsMultiplier(1)).toBe(1);
    expect(levelDpsMultiplier(10)).toBe(1);
    expect(levelDpsMultiplier(11)).toBeCloseTo(1.01);
    expect(levelDpsMultiplier(141)).toBeCloseTo(1.14);
  });

  it('feeds the hero DPS and survives rebirth', () => {
    const gs = new GameState();
    gs.grid[0] = 5;
    const base = gs.heroDps;
    gs.totalKills = killsForLevel(21); // +2%
    expect(gs.heroDps / base).toBeCloseTo(1.02);
    // totalKills is lifetime: prestige doesn't reset it, so nor does the bonus
  });
});

describe('late-game gold curve (Sean: stage 143 must stay achievable)', () => {
  it('is unchanged through the tuned early game', () => {
    for (const stage of [1, 10, 25, 40]) {
      expect(goldDrop(stage, 1)).toBeCloseTo(2 * Math.pow(1.15, stage - 1));
    }
  });

  it('steepens past stage 40 with no jump at the seam', () => {
    const ratio41 = goldDrop(41, 1) / goldDrop(40, 1);
    expect(ratio41).toBeCloseTo(1.22); // late growth kicks in smoothly
    // At stage 143 the new curve pays hundreds of times the old one
    const old143 = 2 * Math.pow(1.15, 142);
    expect(goldDrop(143, 1) / old143).toBeGreaterThan(100);
  });

  it('difficulty still outruns income: gold per HP keeps falling', () => {
    const ratio = (s: number) => goldDrop(s, 1) / enemyHp(s, 1);
    expect(ratio(100)).toBeLessThan(ratio(60)); // harder the further you go
    expect(ratio(60)).toBeLessThan(ratio(41));
  });
});

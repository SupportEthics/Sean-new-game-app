import { ECONOMY, NUMBER_SUFFIXES } from '../config/economy';
import { GEAR } from '../config/gear';
import { STAGES } from '../config/stages';

/** Gold cost to buy a piece of gear at `tier`. */
export function gearCost(tier: number): number {
  return Math.round(ECONOMY.gearCostBase * Math.pow(ECONOMY.gearCostGrowth, tier - 1));
}

/** The tier the buy button offers, given the highest tier the player has made. */
export function buyTierFor(highestTier: number): number {
  return Math.max(1, highestTier - ECONOMY.buyTierLag);
}

/** DPS of a single gear item at `tier`. */
export function gearDps(tier: number): number {
  return GEAR.baseDps * Math.pow(GEAR.dpsGrowth, tier - 1);
}

/** Hero DPS: best item full DPS + a passive fraction from every other item. */
export function heroDps(tiers: number[]): number {
  if (tiers.length === 0) return 1; // bare paws
  const dpsList = tiers.map(gearDps).sort((a, b) => b - a);
  const [best, ...rest] = dpsList;
  return best + rest.reduce((sum, d) => sum + d * GEAR.passiveDpsFraction, 0);
}

export function enemyHp(stage: number, wave: number): number {
  const base = STAGES.enemyHpBase * Math.pow(STAGES.enemyHpGrowth, stage - 1);
  const hp = base * (1 + STAGES.waveHpStep * (wave - 1));
  return wave === STAGES.wavesPerStage ? hp * STAGES.bossHpMultiplier : hp;
}

export function goldDrop(stage: number, wave: number): number {
  const base = STAGES.goldDropBase * Math.pow(STAGES.goldDropGrowth, stage - 1);
  return wave === STAGES.wavesPerStage ? base * STAGES.bossGoldMultiplier : base;
}

/** 1234 -> "1.23K", 5678900 -> "5.68M"; falls back to exponent pairs (aa, ab…) past T. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return `-${formatNumber(-n)}`;
  if (n < 1000) return n < 100 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();

  const magnitude = Math.floor(Math.log10(n) / 3);
  const scaled = n / Math.pow(1000, magnitude);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;

  if (magnitude < NUMBER_SUFFIXES.length) {
    return `${scaled.toFixed(digits)}${NUMBER_SUFFIXES[magnitude]}`;
  }
  // aa, ab, ac ... for magnitudes beyond the named suffixes
  const extra = magnitude - NUMBER_SUFFIXES.length;
  const first = String.fromCharCode(97 + Math.floor(extra / 26));
  const second = String.fromCharCode(97 + (extra % 26));
  return `${scaled.toFixed(digits)}${first}${second}`;
}

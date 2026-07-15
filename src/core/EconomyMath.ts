import { ECONOMY, HERO_LEVEL, NUMBER_SUFFIXES } from '../config/economy';
import { GEAR } from '../config/gear';
import { STAGES } from '../config/stages';

/** Gold cost to buy a piece of gear at `tier`. */
export function gearCost(tier: number): number {
  return Math.round(ECONOMY.gearCostBase * Math.pow(ECONOMY.gearCostGrowth, tier - 1));
}

/** Gold refunded when a sword is dropped in the bin: a slice of its price. */
export function sellValue(tier: number): number {
  return Math.max(1, Math.floor(gearCost(tier) * ECONOMY.sellRefundFraction));
}

/** Gold cost to raise the shop's buy tier to `nextTier`. */
export function buyTierUpgradeCost(nextTier: number): number {
  return Math.round(gearCost(nextTier) * ECONOMY.buyTierUpgradeMultiplier);
}

/** Gold cost of unlocking grid cell number `n` (1-based; n > baseCells). */
export function cellCost(n: number): number {
  return Math.round(
    GEAR.cellCostBase * Math.pow(GEAR.cellCostGrowth, n - GEAR.baseCells - 1),
  );
}

/** DPS of a single gear item at `tier`. */
export function gearDps(tier: number): number {
  return GEAR.baseDps * Math.pow(GEAR.dpsGrowth, tier - 1);
}

/**
 * Hero DPS: the top `slots` items count in full (the equipped loadout);
 * every other item on the grid adds a passive fraction of its own DPS.
 */
export function heroDps(tiers: number[], slots = 1): number {
  if (tiers.length === 0) return 1; // bare hands
  const dpsList = tiers.map(gearDps).sort((a, b) => b - a);
  const equipped = dpsList.slice(0, Math.max(1, slots));
  const rest = dpsList.slice(Math.max(1, slots));
  return (
    equipped.reduce((sum, d) => sum + d, 0) +
    rest.reduce((sum, d) => sum + d * GEAR.passiveDpsFraction, 0)
  );
}

export function enemyHp(stage: number, wave: number): number {
  const base = STAGES.enemyHpBase * Math.pow(STAGES.enemyHpGrowth, stage - 1);
  const hp = base * (1 + STAGES.waveHpStep * (wave - 1));
  return wave === STAGES.wavesPerStage ? hp * STAGES.bossHpMultiplier : hp;
}

export function goldDrop(stage: number, wave: number): number {
  // Early game exactly as tuned; past the first prestige wall the payout
  // curve steepens so late stages stay worth fighting, and steepens once
  // more past lateGoldStage2 so the deep endgame stays achievable
  const early = Math.min(stage, STAGES.lateGoldStage);
  const late = Math.max(0, Math.min(stage, STAGES.lateGoldStage2) - STAGES.lateGoldStage);
  const late2 = Math.max(0, stage - STAGES.lateGoldStage2);
  const base =
    STAGES.goldDropBase *
    Math.pow(STAGES.goldDropGrowth, early - 1) *
    Math.pow(STAGES.goldDropGrowthLate, late) *
    Math.pow(STAGES.goldDropGrowthLate2, late2);
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

// ---- Rival duels ----

/** A board rival's estimated DPS: what it takes to fight at their stage. */
export function rivalDps(stage: number): number {
  return enemyHp(Math.max(1, stage), 5);
}

/** Win probability by DPS ratio — 50/50 against an equal, hard but never
 * hopeless punching up (Bradley-Terry). */
export function duelWinChance(myDps: number, theirStage: number): number {
  const theirs = rivalDps(theirStage);
  return myDps / (myDps + theirs);
}

// ---- Hero level (lifetime kills badge that also pays a DPS bonus) ----

export function heroLevel(totalKills: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalKills) / HERO_LEVEL.killsPerLevelBase)) + 1;
}

/** Lifetime kills needed to reach this level. */
export function killsForLevel(level: number): number {
  return HERO_LEVEL.killsPerLevelBase * (level - 1) * (level - 1);
}

/** +1% DPS per 10 levels: LV 141 fights 14% harder, forever. */
export function levelDpsMultiplier(level: number): number {
  return 1 + Math.floor((level - 1) / HERO_LEVEL.levelsPerBonus) * HERO_LEVEL.bonusPerStep;
}

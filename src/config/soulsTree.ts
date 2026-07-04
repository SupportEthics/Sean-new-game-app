// Soul Relics: permanent upgrades bought with Souls (prestige currency).
// Data only — effects are applied in GameState/OfflineEarnings/raids.

export interface SoulUpgradeDef {
  id: 'might' | 'fortune' | 'endurance' | 'raider';
  name: string;
  desc: string;
  maxLevel: number;
  costBase: number;
  costGrowth: number;
  /** Effect magnitude per level (interpreted per-upgrade). */
  perLevel: number;
}

export const SOUL_UPGRADES: SoulUpgradeDef[] = [
  {
    id: 'might',
    name: 'Relic of Might',
    desc: '+10% DAMAGE / LV',
    maxLevel: 20,
    costBase: 3,
    costGrowth: 1.6,
    perLevel: 0.1,
  },
  {
    id: 'fortune',
    name: 'Relic of Fortune',
    desc: '+10% GOLD / LV',
    maxLevel: 20,
    costBase: 3,
    costGrowth: 1.6,
    perLevel: 0.1,
  },
  {
    id: 'endurance',
    name: 'Relic of Endurance',
    desc: '+1H OFFLINE CAP / LV',
    maxLevel: 12,
    costBase: 5,
    costGrowth: 1.8,
    perLevel: 1,
  },
  {
    id: 'raider',
    name: 'Relic of the Raider',
    desc: '+1 RAID GEM / LV',
    maxLevel: 10,
    costBase: 8,
    costGrowth: 2,
    perLevel: 1,
  },
];

export function soulUpgradeCost(def: SoulUpgradeDef, currentLevel: number): number {
  return Math.round(def.costBase * Math.pow(def.costGrowth, currentLevel));
}

export function soulUpgradeById(id: string): SoulUpgradeDef | undefined {
  return SOUL_UPGRADES.find((u) => u.id === id);
}

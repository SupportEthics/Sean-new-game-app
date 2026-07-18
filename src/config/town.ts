// The Town — data only. Unlocked after the second rebirth: buy and upgrade
// buildings for permanent income and a daily gem trickle.

export interface BuildingDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  costBase: number;
  costGrowth: number;
  /** Additive bonus per level, meaning depends on the building. */
  perLevel: number;
}

export const TOWN = {
  unlockPrestiges: 2,
  /** The jeweler's vault stops accruing past this many days uncollected. */
  jewelerCapDays: 3,
};

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'farm',
    name: 'FARM',
    desc: 'BATTLE GOLD',
    maxLevel: 100,
    costBase: 20_000,
    costGrowth: 1.5,
    perLevel: 0.03, // +3% battle gold
  },
  {
    id: 'blacksmith',
    name: 'BLACKSMITH',
    desc: 'HERO DAMAGE',
    maxLevel: 100,
    costBase: 30_000,
    costGrowth: 1.5,
    perLevel: 0.02, // +2% DPS
  },
  {
    id: 'mine',
    name: 'MINE',
    desc: 'OFFLINE GOLD',
    maxLevel: 80,
    costBase: 25_000,
    costGrowth: 1.55,
    perLevel: 0.05, // +5% offline earnings
  },
  {
    id: 'jeweler',
    name: 'JEWELER',
    desc: 'GEMS PER DAY',
    maxLevel: 40,
    costBase: 60_000,
    costGrowth: 1.8,
    perLevel: 1, // +1 gem/day, collected in town
  },
  {
    id: 'keep',
    name: 'THE KNIGHTS KEEP',
    desc: 'GOLD AND DAMAGE',
    maxLevel: 50,
    costBase: 250_000,
    costGrowth: 1.6,
    perLevel: 0.01, // +1% battle gold AND hero DPS — the premium sink
  },
];

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

export function buildingCost(def: BuildingDef, level: number): number {
  return Math.round(def.costBase * Math.pow(def.costGrowth, level));
}

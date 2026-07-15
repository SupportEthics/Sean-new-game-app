// Forge enchantments — data only. Permanent power bought with GEMS (the
// Soul Relics' gem-flavoured sibling): each line levels up, survives
// rebirth, and gives late-game players a real sink. Lives in the RELICS
// panel under the ENCHANTS tab.

export interface EnchantDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  /** Additive bonus per level (fraction). */
  perLevel: number;
  costBase: number;
  costGrowth: number;
}

export const ENCHANTS: EnchantDef[] = [
  {
    id: 'sharpness',
    name: 'SHARPNESS',
    desc: '+4% HERO DPS PER LEVEL',
    maxLevel: 25,
    perLevel: 0.04,
    costBase: 12,
    costGrowth: 1.15,
  },
  {
    id: 'greed',
    name: 'GREED',
    desc: '+4% BATTLE GOLD PER LEVEL',
    maxLevel: 25,
    perLevel: 0.04,
    costBase: 12,
    costGrowth: 1.15,
  },
  {
    id: 'soulbind',
    name: 'SOULBIND',
    desc: '+2% SOULS FROM REBIRTH PER LEVEL',
    maxLevel: 25,
    perLevel: 0.02,
    costBase: 15,
    costGrowth: 1.15,
  },
];

export function enchantById(id: string): EnchantDef | undefined {
  return ENCHANTS.find((e) => e.id === id);
}

/** Gem price of the NEXT level when `level` is already owned. */
export function enchantCost(def: EnchantDef, level: number): number {
  return Math.round(def.costBase * Math.pow(def.costGrowth, level));
}

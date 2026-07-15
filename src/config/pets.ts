// Pets — data only. Battle companions hatched from eggs; each level of each
// pet adds a permanent DPS bonus. Duplicates level the pet up.

export type PetRarity = 'common' | 'rare' | 'epic';

export interface PetDef {
  id: string;
  name: string;
  desc: string;
  rarity: PetRarity;
  /** DPS bonus fraction added per pet level (0.05 = +5%/level). */
  dpsPerLevel: number;
  /** Relative hatch weight within its egg pool. */
  weight: number;
  /** Names per evolution stage (0 = hatchling form, matches `name`). */
  stageNames: [string, string, string];
}

export const PETS: PetDef[] = [
  { id: 'pup', name: 'DIRE PUP', desc: 'LOYAL DUNGEON HOUND', rarity: 'common', dpsPerLevel: 0.05, weight: 40,
    stageNames: ['DIRE PUP', 'DIRE WOLF', 'DIRE WOLF ALPHA'] },
  { id: 'pebble', name: 'PEBBLE GOLEM', desc: 'A BOULDER WITH OPINIONS', rarity: 'common', dpsPerLevel: 0.05, weight: 30,
    stageNames: ['PEBBLE GOLEM', 'BOULDER GOLEM', 'MOUNTAIN GOLEM'] },
  { id: 'emberbat', name: 'EMBER BAT', desc: 'SPARKS WITH EVERY FLAP', rarity: 'rare', dpsPerLevel: 0.08, weight: 15,
    stageNames: ['EMBER BAT', 'CINDER BAT', 'INFERNO BAT'] },
  { id: 'wisp', name: 'GRAVE WISP', desc: 'A HELPFUL HAUNTING', rarity: 'rare', dpsPerLevel: 0.08, weight: 10,
    stageNames: ['GRAVE WISP', 'GRAVE SPIRIT', 'GRAVE ARCHON'] },
  { id: 'drake', name: 'MOSS DRAKE', desc: 'ONE DAY A DRAGON', rarity: 'epic', dpsPerLevel: 0.12, weight: 5,
    stageNames: ['MOSS DRAKE', 'MOSS WYVERN', 'MOSS DRAGON'] },
];

export const PET_MAX_LEVEL = 20;

/** Evolution: two ascensions per pet, initiated purely with gems (Sean's
 * call — no level requirement). Each multiplies the pet's whole DPS
 * contribution and it grows visibly bigger in the arena. */
export const EVOLUTION = {
  /** Gem price of each ascension. */
  gemCosts: [75, 250],
  /** The pet's DPS contribution is multiplied by this at each stage. */
  stageMultipliers: [1, 2, 4],
  /** Arena sprite scale per stage. */
  scales: [1, 1.2, 1.45],
} as const;

export function stageName(def: PetDef, stage: number): string {
  return def.stageNames[Math.min(stage, def.stageNames.length - 1)];
}
/** Consolation gems when an egg hatches a pet already at max level. */
export const PET_DUP_GEMS = 3;
/** How many pets fight beside the hero in the arena (the full roster). */
export const ACTIVE_PET_SLOTS = 5;

export const EGGS = {
  /** Gold egg price escalates with every gold egg bought (account-lifetime). */
  goldBase: 4000,
  goldGrowth: 1.35,
  /** Gem egg: flat price, rolls only rare+epic pets. */
  gemCost: 30,
};

export function goldEggCost(eggsBought: number): number {
  return Math.floor(EGGS.goldBase * Math.pow(EGGS.goldGrowth, eggsBought));
}

export function petById(id: string): PetDef | undefined {
  return PETS.find((p) => p.id === id);
}

/** Pets a given egg kind can hatch. Gem eggs skip commons. */
export function eggPool(kind: 'gold' | 'gem' | 'free'): PetDef[] {
  return kind === 'gem' ? PETS.filter((p) => p.rarity !== 'common') : PETS;
}

export interface EggOdd {
  petId: string;
  name: string;
  /** Exact drop chance in percent (0-100), derived from pool weights. */
  pct: number;
}

/** Drop odds per egg kind — Apple 3.1.1 loot-box disclosure. Derived
 * straight from the eggPool weights so it can never drift from rollPet. */
export function eggOdds(kind: 'gold' | 'gem' | 'free'): EggOdd[] {
  const pool = eggPool(kind);
  const total = pool.reduce((sum, p) => sum + p.weight, 0);
  return pool.map((p) => ({ petId: p.id, name: p.name, pct: (p.weight / total) * 100 }));
}

/** Whole percents where exact, one decimal otherwise (e.g. 40% / 33.3%). */
export function formatOddsPct(pct: number): string {
  const whole = Math.round(pct);
  return Math.abs(pct - whole) < 0.05 ? `${whole}%` : `${pct.toFixed(1)}%`;
}

/** Map a uniform roll in [0,1) onto the pool via hatch weights. */
export function rollPet(roll: number, pool: PetDef[]): PetDef {
  const total = pool.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.min(Math.max(roll, 0), 0.999999) * total;
  for (const pet of pool) {
    r -= pet.weight;
    if (r < 0) return pet;
  }
  return pool[pool.length - 1];
}

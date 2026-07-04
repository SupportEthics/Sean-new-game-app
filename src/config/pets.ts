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
}

export const PETS: PetDef[] = [
  { id: 'pup', name: 'DIRE PUP', desc: 'LOYAL DUNGEON HOUND', rarity: 'common', dpsPerLevel: 0.05, weight: 40 },
  { id: 'pebble', name: 'PEBBLE GOLEM', desc: 'A BOULDER WITH OPINIONS', rarity: 'common', dpsPerLevel: 0.05, weight: 30 },
  { id: 'emberbat', name: 'EMBER BAT', desc: 'SPARKS WITH EVERY FLAP', rarity: 'rare', dpsPerLevel: 0.08, weight: 15 },
  { id: 'wisp', name: 'GRAVE WISP', desc: 'A HELPFUL HAUNTING', rarity: 'rare', dpsPerLevel: 0.08, weight: 10 },
  { id: 'drake', name: 'MOSS DRAKE', desc: 'ONE DAY A DRAGON', rarity: 'epic', dpsPerLevel: 0.12, weight: 5 },
];

export const PET_MAX_LEVEL = 10;
/** Consolation gems when an egg hatches a pet already at max level. */
export const PET_DUP_GEMS = 3;
/** How many pets fight beside the hero in the arena. */
export const ACTIVE_PET_SLOTS = 3;

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

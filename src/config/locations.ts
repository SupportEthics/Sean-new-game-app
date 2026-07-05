// Themed locations — data only. Every 10-stage set moves the fight to a new
// place (Sean's request: castle, dungeon, forest, dragon's lair...). Each
// location tints the arena and fields its own monster pool.

import { ENEMY_SPECIES, type EnemySpeciesKey } from './stages';

export interface GameLocation {
  name: string;
  /** Arena floor tint */
  floor: number;
  /** Back wall tint */
  wall: number;
  /** Monsters that spawn here (waves rotate through the pool) */
  species: readonly EnemySpeciesKey[];
}

/** One location per 10-stage set, cycling after the last. */
export const LOCATIONS: readonly GameLocation[] = [
  { name: 'THE DUNGEON', floor: 0xc98a4b, wall: 0xb2763c, species: ['skeleton', 'spider', 'ghoul'] },
  { name: 'DARK FOREST', floor: 0x86a04e, wall: 0x6d8440, species: ['wolf', 'serpent', 'spider'] },
  { name: 'THE CASTLE', floor: 0xa8a4b4, wall: 0x908ca0, species: ['gargoyle', 'skeleton', 'ogre'] },
  { name: 'HAUNTED CRYPT', floor: 0x8a7a4e, wall: 0x76683e, species: ['wraith', 'ghoul', 'skeleton'] },
  { name: 'FROZEN KEEP', floor: 0xb8c4d4, wall: 0xa2b0c4, species: ['lich', 'wolf', 'gargoyle'] },
  { name: 'EMBER FORGE', floor: 0xa85c38, wall: 0x92492c, species: ['imp', 'golem', 'ogre'] },
  { name: 'DRAGONS LAIR', floor: 0xc09a3c, wall: 0xa8842e, species: ['serpent', 'imp', 'golem'] },
  { name: 'VOID CITADEL', floor: 0x6e5c72, wall: 0x5c4c60, species: ['cultist', 'wraith', 'lich'] },
] as const;

/** Stages per location = one full stage set. */
export const STAGES_PER_LOCATION = 10;

export function locationIndex(stage: number): number {
  return Math.floor((stage - 1) / STAGES_PER_LOCATION) % LOCATIONS.length;
}

export function locationForStage(stage: number): GameLocation {
  return LOCATIONS[locationIndex(stage)];
}

/** True on the first stage of a set — the moment we've arrived somewhere new. */
export function isLocationEntrance(stage: number): boolean {
  return stage % STAGES_PER_LOCATION === 1;
}

/** The monster fighting on this stage+wave, drawn from the location's pool. */
export function speciesForWave(
  stage: number,
  wave: number,
): (typeof ENEMY_SPECIES)[number] {
  const loc = locationForStage(stage);
  const key = loc.species[(stage + wave) % loc.species.length];
  return ENEMY_SPECIES.find((s) => s.key === key) ?? ENEMY_SPECIES[0];
}

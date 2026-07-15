// The Codex — data + pure helpers. A collection book across three shelves:
// BEASTS (monster species met on the climb), BLADES (sword art reached,
// lifetime) and PETS (companions hatched). Every entry pays a one-time gem
// bounty when claimed. Beast discovery derives from highestStage + the
// location pools, so no new battle tracking is needed.

import { LOCATIONS, STAGES_PER_LOCATION } from './locations';
import { ENEMY_SPECIES } from './stages';
import { GEAR, TIER_NAMES, tierName } from './gear';
import { PETS } from './pets';

export const CODEX_GEMS = {
  beast: 5,
  blade: 3,
  pet: 10,
} as const;

export type CodexKind = keyof typeof CODEX_GEMS;

export interface CodexEntry {
  id: string;
  kind: CodexKind;
  name: string;
  /** What unlocks it, shown while locked. */
  hint: string;
  gems: number;
  /** Sprite lookup for the row portrait. */
  spriteKey: string;
  spriteFrame?: number;
  unlocked: boolean;
}

/** First stage where a species walks out of a location pool. */
export function beastFirstStage(speciesKey: string): number | null {
  for (let i = 0; i < LOCATIONS.length; i++) {
    if (LOCATIONS[i].species.includes(speciesKey as never)) {
      return i * STAGES_PER_LOCATION + 1;
    }
  }
  return null;
}

/** Every codex entry with its live unlocked state. */
export function codexEntries(
  highestStage: number,
  bestTier: number,
  pets: Record<string, number>,
): CodexEntry[] {
  const entries: CodexEntry[] = [];

  for (const s of ENEMY_SPECIES) {
    const first = beastFirstStage(s.key);
    if (first === null) continue; // not fielded by any location
    entries.push({
      id: `beast-${s.key}`,
      kind: 'beast',
      name: s.name.toUpperCase(),
      hint: `REACH STAGE ${first}`,
      gems: CODEX_GEMS.beast,
      spriteKey: `enemy-${s.key}`,
      unlocked: highestStage >= first,
    });
  }

  for (let tier = 1; tier <= Math.min(GEAR.weaponArtCount, TIER_NAMES.length); tier++) {
    entries.push({
      id: `blade-${tier}`,
      kind: 'blade',
      name: tierName(tier).toUpperCase(),
      hint: `FORGE A TIER ${tier} SWORD`,
      gems: CODEX_GEMS.blade,
      spriteKey: 'gear',
      spriteFrame: tier - 1,
      unlocked: bestTier >= tier,
    });
  }

  for (const p of PETS) {
    entries.push({
      id: `pet-${p.id}`,
      kind: 'pet',
      name: p.name,
      hint: 'HATCH FROM ANY EGG',
      gems: CODEX_GEMS.pet,
      spriteKey: `pet-${p.id}`,
      unlocked: (pets[p.id] ?? 0) > 0,
    });
  }

  return entries;
}

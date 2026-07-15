// The Daily Dungeon — data only. One special challenge per UTC day with a
// rotating modifier: a raid-style kill quota tuned to the player's own
// frontier stage, paying a fat one-time reward on the first clear of the
// day. Attempts are free and unlimited until cleared (kind beats stingy);
// the reward pays out once per day.

export interface DungeonModifier {
  id: string;
  name: string;
  desc: string;
  /** Monster HP relative to a frontier mid-wave enemy. */
  hpMult: number;
  /** Kill quota relative to baseQuota. */
  quotaMult: number;
  /** Timer relative to durationSeconds. */
  timeMult: number;
  /** Gold per kill relative to a frontier drop. */
  goldMult: number;
  /** The dragon head's colourway for the day (sprite dragon-<id>.png). */
  dragon: 'emerald' | 'crimson' | 'azure' | 'gold';
}

export const DUNGEON = {
  unlockStage: 15,
  baseQuota: 15,
  durationSeconds: 30,
  /** First clear of the day: gems + hours of current gold income. */
  gemsBase: 15,
  /** +1 gem per this many highest-stages reached. */
  gemsPerStages: 10,
  goldHours: 2,
} as const;

export const DUNGEON_MODIFIERS: DungeonModifier[] = [
  {
    id: 'horde',
    dragon: 'emerald',
    name: 'HORDE DAY',
    desc: 'FRAIL MONSTERS - TWICE AS MANY',
    hpMult: 0.4,
    quotaMult: 2,
    timeMult: 1,
    goldMult: 1,
  },
  {
    id: 'titan',
    dragon: 'crimson',
    name: 'TITAN DAY',
    desc: 'GIANTS WITH TRIPLE HEALTH',
    hpMult: 3,
    quotaMult: 0.5,
    timeMult: 1,
    goldMult: 2,
  },
  {
    id: 'blitz',
    dragon: 'azure',
    name: 'BLITZ DAY',
    desc: 'HALF THE TIME ON THE CLOCK',
    hpMult: 1,
    quotaMult: 1,
    timeMult: 0.5,
    goldMult: 1,
  },
  {
    id: 'plunder',
    dragon: 'gold',
    name: 'PLUNDER DAY',
    desc: 'MONSTERS DROP X3 GOLD',
    hpMult: 1,
    quotaMult: 1,
    timeMult: 1,
    goldMult: 3,
  },
];

const DAY_MS = 86_400_000;

/** Today's modifier — same for every player worldwide, rotating daily. */
export function dungeonModifier(nowMs: number): DungeonModifier {
  const day = Math.floor(nowMs / DAY_MS);
  return DUNGEON_MODIFIERS[day % DUNGEON_MODIFIERS.length];
}

export function dungeonQuota(mod: DungeonModifier): number {
  return Math.max(5, Math.round(DUNGEON.baseQuota * mod.quotaMult));
}

export function dungeonDuration(mod: DungeonModifier): number {
  return Math.round(DUNGEON.durationSeconds * mod.timeMult);
}

export function dungeonGems(highestStage: number): number {
  return DUNGEON.gemsBase + Math.floor(highestStage / DUNGEON.gemsPerStages);
}

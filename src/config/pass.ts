// The Knight's Pass — data + pure helpers. A 30-day reward track: every
// player climbs the FREE lane with pass XP earned by playing; the PREMIUM
// lane is unlocked per season with a one-off purchase (a consumable, so
// each new season is a fresh buy — the proven battle-pass model). Seasons
// roll deterministically from a fixed epoch; no server needed.

export interface PassReward {
  gems?: number;
  goldHours?: number;
  goldEgg?: boolean;
}

export const PASS = {
  /** Premium lane on sale (1.0.4+): the knights_pass product exists in
   * App Store Connect and ships with the app version that sells it.
   * Set false to pull the buy button + locked lane from the UI. */
  premiumEnabled: true,

  seasonDays: 30,
  xpPerLevel: 100,
  maxLevel: 30,
  /** Season counting starts here (launch week Monday). */
  epoch: Date.UTC(2026, 6, 13),
  /** XP per tracked action. */
  xp: {
    stages: 5,
    raids: 25,
    merges: 1,
    ads: 15,
    dungeons: 25,
    duels: 15,
  } as Record<string, number>,
} as const;

const DAY_MS = 86_400_000;

/** 1-based season number. */
export function passSeason(nowMs: number): number {
  return Math.max(1, Math.floor((nowMs - PASS.epoch) / (PASS.seasonDays * DAY_MS)) + 1);
}

/** Days left before this season ends (1..30 on the last day -> 1). */
export function passDaysLeft(nowMs: number): number {
  const elapsed = Math.max(0, nowMs - PASS.epoch);
  const intoSeason = elapsed % (PASS.seasonDays * DAY_MS);
  return Math.max(1, Math.ceil((PASS.seasonDays * DAY_MS - intoSeason) / DAY_MS));
}

export function passLevel(xp: number): number {
  return Math.min(PASS.maxLevel, Math.floor(xp / PASS.xpPerLevel));
}

/** Free lane: steady gems, a gold purse every 5th level, an egg at the top. */
export function freeRewardFor(level: number): PassReward {
  if (level === PASS.maxLevel) return { goldEgg: true, gems: 20 };
  if (level % 5 === 0) return { goldHours: 1 };
  return { gems: 3 };
}

/** Premium lane: fat gems throughout, eggs at 10/20, a hoard at the top. */
export function premiumRewardFor(level: number): PassReward {
  if (level === PASS.maxLevel) return { gems: 100, goldEgg: true };
  if (level % 10 === 0) return { goldEgg: true, gems: 10 };
  return { gems: 10 };
}

export function describeReward(r: PassReward): string {
  const bits: string[] = [];
  if (r.gems) bits.push(`${r.gems} GEMS`);
  if (r.goldHours) bits.push(`${r.goldHours}H GOLD`);
  if (r.goldEgg) bits.push('GOLD EGG');
  return bits.join(' + ');
}

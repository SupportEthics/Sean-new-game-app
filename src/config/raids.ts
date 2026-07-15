// Raids — data only. Unlocked after the first prestige. Each raid is a short
// arena assault: gold pays out per kill live, gems are awarded at the end,
// both scaling with the raid level. Clearing the kill quota unlocks the next
// level; higher levels need real account power (monster HP grows 4x/level).

export const RAIDS = {
  maxLevel: 75,
  /** Raid duration in sim-seconds. */
  durationSeconds: 25,
  /** Cooldown between raids, in minutes (rewarded-ad reset arrives at M4). */
  cooldownMinutes: 10,
  /** Kills required within the duration to clear level 1; every level after
   * asks for more (Sean: raids must get progressively harder), on top of the
   * 4x/level monster HP. */
  clearKillsBase: 10,
  clearKillsPerLevel: 2,
  /** Kills stop counting at quota * this — overkill DPS can't farm a
   * low level forever; the raid ends early once the cap is reached. */
  killCapMultiplier: 3,

  monsterHpBase: 200,
  monsterHpGrowth: 4,
  goldPerKillBase: 50,
  goldPerKillGrowth: 4,
  /** Gems: floor(kills / gemKillDivisor) + level, capped per raid. */
  gemKillDivisor: 5,
  gemCapPerLevel: 3, // cap = level * this + 5
} as const;

export function raidClearKills(level: number): number {
  return RAIDS.clearKillsBase + RAIDS.clearKillsPerLevel * (level - 1);
}

export function raidKillCap(level: number): number {
  return raidClearKills(level) * RAIDS.killCapMultiplier;
}

export function raidMonsterHp(level: number): number {
  return RAIDS.monsterHpBase * Math.pow(RAIDS.monsterHpGrowth, level - 1);
}

export function raidGoldPerKill(level: number): number {
  return RAIDS.goldPerKillBase * Math.pow(RAIDS.goldPerKillGrowth, level - 1);
}

export function raidGems(level: number, kills: number): number {
  const cap = level * RAIDS.gemCapPerLevel + 5;
  return Math.min(Math.floor(kills / RAIDS.gemKillDivisor) + level, cap);
}

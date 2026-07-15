// Active hero skills — data only. Timed buffs on LONG cooldowns (a
// rewarded ad casts a skill early), cast from the
// SKILLS tab. Timers run on sim time (they tick with battle, pause with it,
// and fast-forward with offline warp), so everything stays unit-testable.

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  unlockStage: number;
  /** Buff length in sim seconds; 0 = instant effect. */
  durationSeconds: number;
  cooldownSeconds: number;
  /** DPS multiplier while active. */
  dpsMult?: number;
  /** Gold multiplier while active. */
  goldMult?: number;
  /** Instantly simulate this many seconds of battle (Time Warp). */
  warpSeconds?: number;
}

export const SKILLS: SkillDef[] = [
  {
    id: 'whirlwind',
    name: 'WHIRLWIND',
    desc: 'X3 DPS FOR 12S',
    unlockStage: 3,
    durationSeconds: 12,
    cooldownSeconds: 300,
    dpsMult: 3,
  },
  {
    id: 'goldrush',
    name: 'GOLD RUSH',
    desc: 'X3 GOLD FOR 15S',
    unlockStage: 8,
    durationSeconds: 15,
    cooldownSeconds: 420,
    goldMult: 3,
  },
  {
    id: 'warp',
    name: 'TIME WARP',
    desc: 'BATTLE 30S INSTANTLY',
    unlockStage: 14,
    durationSeconds: 0,
    cooldownSeconds: 600,
    warpSeconds: 30,
  },
  {
    id: 'fury',
    name: 'BATTLE FURY',
    desc: 'X2 DPS AND X2 GOLD FOR 20S',
    unlockStage: 20,
    durationSeconds: 20,
    cooldownSeconds: 720,
    dpsMult: 2,
    goldMult: 2,
  },
  {
    id: 'stormcall',
    name: 'STORM CALL',
    desc: 'X5 DPS FOR 10S',
    unlockStage: 35,
    durationSeconds: 10,
    cooldownSeconds: 900,
    dpsMult: 5,
  },
  {
    id: 'midas',
    name: 'MIDAS RUSH',
    desc: 'X5 GOLD FOR 12S',
    unlockStage: 50,
    durationSeconds: 12,
    cooldownSeconds: 900,
    goldMult: 5,
  },
  {
    id: 'chrono',
    name: 'CHRONO SURGE',
    desc: 'BATTLE 90S INSTANTLY',
    unlockStage: 70,
    durationSeconds: 0,
    cooldownSeconds: 1200,
    warpSeconds: 90,
  },
];

/** AUTO CAST unlocks here: skills fire themselves as they come off
 * cooldown once the player flips the toggle in the SKILLS tab. */
export const AUTO_SKILLS_UNLOCK_STAGE = 25;

export function skillDefById(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id);
}

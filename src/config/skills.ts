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
];

export function skillDefById(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id);
}

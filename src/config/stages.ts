// Stage / wave / enemy scaling — data only.

export const STAGES = {
  wavesPerStage: 10,

  /** Enemy HP: base * hpGrowth^(stage-1) * (1 + waveHpStep * (wave-1)) */
  enemyHpBase: 10,
  enemyHpGrowth: 1.27,
  waveHpStep: 0.06,

  /** Boss = last wave of a stage */
  bossHpMultiplier: 8,
  bossGoldMultiplier: 10,
  /** Seconds the hero has to kill the boss before auto-retreating */
  bossTimeLimit: 30,

  /** Gold per normal kill: base * goldGrowth^(stage-1) */
  goldDropBase: 2,
  goldDropGrowth: 1.15,

  /** Enemies alive per wave (visual + pacing) */
  enemiesPerWave: 3,

  /** Hero attacks per second (DPS is spread across hits) */
  heroAttacksPerSecond: 2,
} as const;

/** Monster species rotate by stage for variety. */
export const ENEMY_SPECIES = [
  { key: 'wolf', name: 'Dire Wolf', color: 0x6a707e },
  { key: 'skeleton', name: 'Bone Warrior', color: 0xe8e4d8 },
  { key: 'spider', name: 'Venom Spider', color: 0x3a3244 },
  { key: 'golem', name: 'Stone Golem', color: 0x7a7284 },
  { key: 'imp', name: 'Flame Imp', color: 0xc2482e },
  { key: 'wraith', name: 'Grave Wraith', color: 0x4a4460 },
] as const;

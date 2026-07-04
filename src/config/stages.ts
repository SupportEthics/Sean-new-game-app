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

/** Cute enemy species rotate by stage for variety. */
export const ENEMY_SPECIES = [
  { key: 'slime', name: 'Grumpy Slime', color: 0x7ed957 },
  { key: 'carrot', name: 'Cranky Carrot', color: 0xff9950 },
  { key: 'mushroom', name: 'Moody Mushroom', color: 0xe86a92 },
  { key: 'bat', name: 'Bashful Bat', color: 0x9b7ede },
  { key: 'crab', name: 'Crabby Crab', color: 0xff6b6b },
  { key: 'ghost', name: 'Giggly Ghost', color: 0x9fd8ef },
] as const;

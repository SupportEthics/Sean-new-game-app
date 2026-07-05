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

  /** Gold per normal kill: base * goldGrowth^(stage-1). Past lateGoldStage
   * the growth steepens (Sean: high stages must stay achievable) — still
   * below enemyHpGrowth 1.27, so climbing keeps getting harder, just not
   * hopelessly so. */
  goldDropBase: 2,
  goldDropGrowth: 1.15,
  lateGoldStage: 40,
  goldDropGrowthLate: 1.22,

  /** Enemies alive per wave (visual + pacing) */
  enemiesPerWave: 3,

  /** Hero attacks per second (DPS is spread across hits) */
  heroAttacksPerSecond: 2,
} as const;

/** Monster roster; each location fields its own pool (see locations.ts). */
export const ENEMY_SPECIES = [
  { key: 'wolf', name: 'Dire Wolf', color: 0x6a707e },
  { key: 'skeleton', name: 'Bone Warrior', color: 0xe8e4d8 },
  { key: 'spider', name: 'Venom Spider', color: 0x3a3244 },
  { key: 'golem', name: 'Stone Golem', color: 0x7a7284 },
  { key: 'imp', name: 'Flame Imp', color: 0xc2482e },
  { key: 'wraith', name: 'Grave Wraith', color: 0x4a4460 },
  { key: 'serpent', name: 'Fang Serpent', color: 0x54a048 },
  { key: 'ogre', name: 'Gnarl Ogre', color: 0x88904e },
  { key: 'cultist', name: 'Void Cultist', color: 0x6a3488 },
  { key: 'ghoul', name: 'Rot Ghoul', color: 0x88a068 },
  { key: 'gargoyle', name: 'Stone Gargoyle', color: 0x8a8896 },
  { key: 'lich', name: 'Frost Lich', color: 0x3e5a78 },
] as const;

export type EnemySpeciesKey = (typeof ENEMY_SPECIES)[number]['key'];

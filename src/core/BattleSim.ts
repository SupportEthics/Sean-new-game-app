import { STAGES } from '../config/stages';
import { enemyHp, goldDrop } from './EconomyMath';

export interface BattleState {
  stage: number;
  wave: number; // 1..wavesPerStage; wave === wavesPerStage is the boss
  enemiesLeftInWave: number;
  currentEnemyHp: number;
  currentEnemyMaxHp: number;
  bossTimeLeft: number; // seconds, only meaningful during a boss wave
}

export interface TickResult {
  goldEarned: number;
  kills: number;
  damageDealt: number;
  waveCleared: boolean;
  stageCleared: boolean;
  bossFailed: boolean;
}

export function isBossWave(state: BattleState): boolean {
  return state.wave === STAGES.wavesPerStage;
}

function enemiesInWave(wave: number): number {
  return wave === STAGES.wavesPerStage ? 1 : STAGES.enemiesPerWave;
}

/** `hpScale` toughens every monster (rebirth difficulty; 1 = base game). */
export function newBattleState(stage: number, wave = 1, hpScale = 1): BattleState {
  const hp = enemyHp(stage, wave) * hpScale;
  return {
    stage,
    wave,
    enemiesLeftInWave: enemiesInWave(wave),
    currentEnemyHp: hp,
    currentEnemyMaxHp: hp,
    bossTimeLeft: STAGES.bossTimeLimit,
  };
}

/**
 * Advance the battle by `dt` seconds at `dps` hero damage.
 * Mutates `state`; returns what happened for the UI/economy to react to.
 * Deterministic — the same code path powers live play, offline fast-forward and tests.
 */
export function tick(state: BattleState, dps: number, dt: number, hpScale = 1): TickResult {
  const result: TickResult = {
    goldEarned: 0,
    kills: 0,
    damageDealt: 0,
    waveCleared: false,
    stageCleared: false,
    bossFailed: false,
  };

  let budget = dps * dt; // damage available this tick

  if (isBossWave(state)) {
    state.bossTimeLeft -= dt;
  }

  while (budget > 0) {
    const dealt = Math.min(budget, state.currentEnemyHp);
    state.currentEnemyHp -= dealt;
    result.damageDealt += dealt;
    budget -= dealt;

    if (state.currentEnemyHp > 0) break;

    // Enemy killed
    result.kills += 1;
    result.goldEarned += goldDrop(state.stage, state.wave);
    state.enemiesLeftInWave -= 1;

    if (state.enemiesLeftInWave > 0) {
      state.currentEnemyMaxHp = enemyHp(state.stage, state.wave) * hpScale;
      state.currentEnemyHp = state.currentEnemyMaxHp;
      continue;
    }

    // Wave cleared
    result.waveCleared = true;
    if (isBossWave(state)) {
      result.stageCleared = true;
      Object.assign(state, newBattleState(state.stage + 1, 1, hpScale));
    } else {
      const next = state.wave + 1;
      Object.assign(state, newBattleState(state.stage, next, hpScale));
    }
    return result; // one wave transition per tick keeps events readable
  }

  // Boss timer ran out → retreat to wave 1 of the same stage (no punishment)
  if (isBossWave(state) && state.bossTimeLeft <= 0 && state.currentEnemyHp > 0) {
    result.bossFailed = true;
    Object.assign(state, newBattleState(state.stage, 1, hpScale));
  }

  return result;
}

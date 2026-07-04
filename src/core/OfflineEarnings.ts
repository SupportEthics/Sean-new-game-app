import { ECONOMY } from '../config/economy';
import { enemyHp, goldDrop } from './EconomyMath';
import { GameState } from './GameState';

export interface OfflineResult {
  /** Seconds credited (after the cap). */
  seconds: number;
  gold: number;
}

/**
 * Estimated active gold income at the player's current position: how fast
 * they kill a mid-wave enemy at their stage, times its bounty. Deterministic
 * so it's unit-testable and can't be gamed by save-editing timestamps alone.
 */
export function estimateGoldPerSecond(gs: GameState): number {
  const b = gs.battle;
  const wave = Math.min(b.wave, 9); // never price the boss in
  const hp = enemyHp(b.stage, wave);
  const killsPerSecond = Math.min(gs.heroDps / hp, 5); // cap absurd overkill
  return killsPerSecond * goldDrop(b.stage, wave);
}

/** Gold earned while away: reduced rate, capped hours, short gaps ignored. */
export function computeOffline(gs: GameState, awaySeconds: number): OfflineResult {
  const seconds = Math.min(Math.max(awaySeconds, 0), gs.offlineCapHours * 3600);
  if (seconds < 60) return { seconds, gold: 0 };
  const gold = Math.floor(
    estimateGoldPerSecond(gs) * seconds * ECONOMY.offlineRateMultiplier,
  );
  return { seconds, gold };
}

/** "2H 14M" style label for the popup. */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}H ${m}M`;
  return `${m}M`;
}

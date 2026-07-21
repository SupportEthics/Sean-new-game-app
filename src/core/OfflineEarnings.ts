import { ECONOMY } from '../config/economy';
import { GameState } from './GameState';

export interface OfflineResult {
  /** Seconds credited (after the cap). */
  seconds: number;
  gold: number;
}

/** Estimated active gold income — see GameState.goldPerSecondEstimate. */
export function estimateGoldPerSecond(gs: GameState): number {
  return gs.goldPerSecondEstimate;
}

/** Gold earned while away: reduced rate, capped hours, short gaps ignored. */
export function computeOffline(gs: GameState, awaySeconds: number): OfflineResult {
  const seconds = Math.min(Math.max(awaySeconds, 0), gs.offlineCapHours * 3600);
  if (seconds < 60) return { seconds, gold: 0 };
  const gold = Math.floor(
    estimateGoldPerSecond(gs) *
      seconds *
      ECONOMY.offlineRateMultiplier *
      gs.townOfflineMultiplier *
      gs.memberOfflineMultiplier,
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

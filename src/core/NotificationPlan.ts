// What local notifications should be waiting when the player puts the
// phone down — pure logic, no Capacitor, so it stays unit-testable. The
// native service (services/Notifications.ts) turns this plan into real
// scheduled notifications on app pause and cancels them all on resume.
import { petById } from '../config/pets';
import { GameState } from './GameState';

export interface PlannedNotification {
  /** Stable id per slot so rescheduling replaces rather than stacks. */
  id: number;
  title: string;
  body: string;
  /** Epoch ms to fire at. */
  at: number;
}

/** Local hour the daily dragon nudge fires at. */
export const DRAGON_NUDGE_HOUR = 10;

/** Hours of quiet before the offline-gold nudge. */
export const OFFLINE_NUDGE_HOURS = 23;

const HOUR = 3_600_000;

/** The next local DRAGON_NUDGE_HOUR o'clock strictly after `now`. */
export function nextDragonNudge(now: number): number {
  const d = new Date(now);
  d.setHours(DRAGON_NUDGE_HOUR, 0, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function planNotifications(gs: GameState, now: number): PlannedNotification[] {
  const plan: PlannedNotification[] = [];

  // 1. The travelling pet comes home (the sharpest "come back" hook)
  if (gs.expedition && gs.expedition.endsAt > now) {
    const pet = petById(gs.expedition.petId);
    plan.push({
      id: 1,
      title: 'Your pet is back!',
      body: `${pet?.name ?? 'Your companion'} has returned with loot — come collect it.`,
      at: gs.expedition.endsAt + 60_000,
    });
  }

  // 2. A fresh dragon each morning, once the dungeon is unlocked
  if (gs.dungeonUnlocked) {
    plan.push({
      id: 2,
      title: 'A new dragon has risen',
      body: "Today's hoard of gems and gold awaits in the Daily Dungeon.",
      at: nextDragonNudge(now),
    });
  }

  // 3. Offline gold piles up — one nudge, just under a day out
  plan.push({
    id: 3,
    title: 'Your knight kept fighting',
    body: 'A pile of offline gold is waiting to be collected.',
    at: now + OFFLINE_NUDGE_HOURS * HOUR,
  });

  return plan;
}

// What local notifications should be waiting when the player puts the
// phone down — pure logic, no Capacitor, so it stays unit-testable. The
// native service (services/Notifications.ts) turns this plan into real
// scheduled notifications on app pause and cancels them all on resume.
//
// The copy is deliberately specific and greedy: a vague "come back and
// play" converts far worse than naming the exact reward that's waiting
// and framing it as something the player is about to LOSE. Four slots give
// a multi-touch cadence — the chest fills, the morning dragon rises, the
// pet comes home, then a final streak nudge before a full day has passed.
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

/** Hours of quiet before the final "your streak is waiting" nudge. */
export const COMEBACK_NUDGE_HOURS = 23;

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
      title: `${pet?.name ?? 'Your companion'} is home! 🐾`,
      body: `They've returned from the expedition loaded with loot — tap in and grab it.`,
      at: gs.expedition.endsAt + 60_000,
    });
  }

  // 2. A fresh dragon each morning, once the dungeon is unlocked
  if (gs.dungeonUnlocked) {
    plan.push({
      id: 2,
      title: 'A new dragon has risen 🐉',
      body: "Today's Daily Dungeon hoard of gems and gold won't wait — clear it before it resets.",
      at: nextDragonNudge(now),
    });
  }

  // 3. Offline gold stops piling up the instant it hits the cap — fire
  //    exactly then, framed as a full chest they're leaving on the table.
  plan.push({
    id: 3,
    title: '⚔️ Your offline chest is FULL',
    body: `${gs.offlineCapHours} hours of gold have piled up and your knight has stopped earning. Come collect — and watch an ad to DOUBLE it.`,
    at: now + gs.offlineCapHours * HOUR,
  });

  // 4. One last streak nudge just under a day out, so a missed login
  //    doesn't quietly break the calendar they've been building.
  plan.push({
    id: 4,
    title: "Don't break your streak! 🔥",
    body: 'Your daily reward is ready and your login streak is on the line. Two taps to keep it alive.',
    at: now + COMEBACK_NUDGE_HOURS * HOUR,
  });

  return plan;
}

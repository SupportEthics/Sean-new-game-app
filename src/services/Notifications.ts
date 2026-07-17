// Local notifications, native only. The pattern: cancel everything on
// launch/resume (the player is here, no need to nag), schedule the plan
// from core/NotificationPlan on pause. Permission is requested once, at a
// moment the player is invested (dungeon unlocked), never on first boot.
// Every path is fail-soft: notifications must never break the game.
import { Capacitor } from '@capacitor/core';
import type { LocalNotificationsPlugin } from '@capacitor/local-notifications';
import { GameState } from '../core/GameState';
import { planNotifications } from '../core/NotificationPlan';

const ALL_IDS = [1, 2, 3];
const ASKED_KEY = 'pawsblades_notif_asked';

let ln: LocalNotificationsPlugin | null = null;

async function plugin(): Promise<LocalNotificationsPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    ln ??= (await import('@capacitor/local-notifications')).LocalNotifications;
    return ln;
  } catch {
    return null;
  }
}

/** Ask once, and only once the player has reached the Daily Dungeon. */
export async function maybeRequestNotificationPermission(gs: GameState): Promise<void> {
  const ln = await plugin();
  if (!ln || !gs.dungeonUnlocked) return;
  try {
    if (localStorage.getItem(ASKED_KEY)) return;
    const status = await ln.checkPermissions();
    if (status.display === 'prompt') {
      localStorage.setItem(ASKED_KEY, '1');
      await ln.requestPermissions();
    }
  } catch {
    /* fail-soft */
  }
}

/** The player is back: clear anything pending so we never ping mid-game. */
export async function cancelAllNotifications(): Promise<void> {
  const ln = await plugin();
  if (!ln) return;
  try {
    await ln.cancel({ notifications: ALL_IDS.map((id) => ({ id })) });
  } catch {
    /* fail-soft */
  }
}

/** The player left: line up the plan (permission permitting). */
export async function scheduleNotifications(gs: GameState): Promise<void> {
  const ln = await plugin();
  if (!ln) return;
  try {
    const status = await ln.checkPermissions();
    if (status.display !== 'granted') return;
    await ln.cancel({ notifications: ALL_IDS.map((id) => ({ id })) });
    const plan = planNotifications(gs, Date.now());
    if (plan.length === 0) return;
    await ln.schedule({
      notifications: plan.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { at: new Date(n.at) },
      })),
    });
  } catch {
    /* fail-soft */
  }
}

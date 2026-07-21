// Firebase Analytics, native only. On the web (and if the native module
// ever fails) every call is a silent no-op, so the game never depends on
// it. Sessions/retention/DAU are collected automatically by the SDK; the
// custom events below exist to answer one question each about how far
// players actually get.
import { Capacitor } from '@capacitor/core';
import { GameState } from '../core/GameState';

type FirebaseAnalyticsModule = {
  FirebaseAnalytics: {
    logEvent(opts: { name: string; params?: Record<string, unknown> }): Promise<void>;
  };
};

let mod: FirebaseAnalyticsModule | null = null;

async function logEvent(name: string, params?: Record<string, unknown>): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    mod ??= (await import('@capacitor-firebase/analytics')) as FirebaseAnalyticsModule;
    await mod.FirebaseAnalytics.logEvent({ name, params });
  } catch {
    /* analytics must never break the game */
  }
}

/** Wire the handful of gameplay milestones worth counting. */
export function attachAnalytics(gs: GameState): void {
  if (!Capacitor.isNativePlatform()) return;
  // Revenue — the event that powers LTV, ROAS and Google Ads value-based
  // bidding. Fires for every completed IAP (fulfillProduct emits it).
  gs.on('purchase', (p) =>
    void logEvent('purchase', { sku: p.sku, value: p.usd, currency: 'USD' }),
  );
  // A lightweight session marker with the launch count + membership status,
  // so retention cohorts can be split by paying/subscribed players.
  void logEvent('play_session', {
    session: gs.sessionCount,
    member: gs.membershipActive() ? 1 : 0,
  });
  gs.on('prestige:done', (count) => void logEvent('rebirth', { count }));
  gs.on('raid:started', (level) =>
    void logEvent(gs.raid?.dungeon ? 'dungeon_start' : 'raid_start', { level }),
  );
  gs.on('duel:done', (won) => void logEvent('duel', { won: won ? 1 : 0 }));
  gs.on('stage:changed', (stage) => {
    // Log powers-of-progress, not every stage (events are rate-limited)
    if (stage === 10 || stage === 25 || stage === 50 || stage % 100 === 0) {
      void logEvent('stage_reached', { stage });
    }
  });
}

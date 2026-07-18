// Haptic feedback — native only, a silent no-op in browsers. The plugin
// is imported dynamically so web bundles never touch it, mirroring the
// Analytics service. Feedback is deliberately sparse: little taps for
// little moments, a real thump only for the proud ones.
import { Capacitor } from '@capacitor/core';
import type { ImpactStyle } from '@capacitor/haptics';
import type { GameState } from '../core/GameState';

type HapticsPlugin = typeof import('@capacitor/haptics').Haptics;

let plugin: HapticsPlugin | null = null;
let lastTapBuzz = 0;

async function load(): Promise<HapticsPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (!plugin) {
    try {
      plugin = (await import('@capacitor/haptics')).Haptics;
    } catch {
      return null;
    }
  }
  return plugin;
}

/** Light tick — arena tap strikes. Rate limited so frantic tapping buzzes
 * pleasantly instead of rattling the phone. */
export function buzzTap(): void {
  const now = Date.now();
  if (now - lastTapBuzz < 90) return;
  lastTapBuzz = now;
  void load().then((h) => h?.impact({ style: 'LIGHT' as ImpactStyle }));
}

/** Medium knock — merges and stage clears. */
export function buzzMedium(): void {
  void load().then((h) => h?.impact({ style: 'MEDIUM' as ImpactStyle }));
}

/** Heavy thump — the proud moments: rebirth, raid and dungeon victories. */
export function buzzHeavy(): void {
  void load().then((h) => h?.impact({ style: 'HEAVY' as ImpactStyle }));
}

/** Hook the game's milestones up once at boot. */
export function attachHaptics(gs: GameState): void {
  if (!Capacitor.isNativePlatform()) return;
  gs.on('gear:merged', () => buzzMedium());
  gs.on('stage:changed', () => buzzMedium());
  gs.on('prestige:done', () => buzzHeavy());
  gs.on('raid:ended', (r: { cleared: boolean }) => {
    if (r.cleared) buzzHeavy();
  });
}

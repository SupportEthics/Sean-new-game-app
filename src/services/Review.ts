// The App Store rating prompt, asked exactly once, at a happy moment:
// right after slaying the daily dragon, or after a second rebirth. Native
// only; iOS itself also rate-limits requestReview, so worst case the
// prompt silently doesn't show. Fail-soft everywhere.
import { Capacitor } from '@capacitor/core';
import { GameState } from '../core/GameState';

const ASKED_KEY = 'pawsblades_review_asked';

async function requestReview(): Promise<void> {
  try {
    if (localStorage.getItem(ASKED_KEY)) return;
    localStorage.setItem(ASKED_KEY, '1');
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  } catch {
    /* fail-soft */
  }
}

export function attachReviewPrompt(gs: GameState): void {
  if (!Capacitor.isNativePlatform()) return;
  gs.on('raid:ended', (r) => {
    // A slain dragon is the game's proudest moment — ask 2.5s later,
    // after the DRAGON SLAIN banner has had its glory
    if (r.dungeon && r.cleared) setTimeout(() => void requestReview(), 2500);
  });
  gs.on('prestige:done', (count) => {
    if (count >= 2) setTimeout(() => void requestReview(), 2500);
  });
}

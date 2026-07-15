// Golden Knight wrapper around whichever AdService the platform provides.
// For owners, every rewarded-ad gate opens instantly (the caller grants
// the reward as if an ad just completed) and interstitials never show —
// call sites stay untouched, this is the single place that knows about
// the VIP purchase.
import { GameState } from '../../core/GameState';
import { AdPlacement, AdResult, AdService } from './AdService';

export class GoldenAdService implements AdService {
  readonly isMock: boolean;

  constructor(
    private inner: AdService,
    private owns: () => boolean,
  ) {
    this.isMock = inner.isMock;
  }

  isReady(placement: AdPlacement): boolean {
    return this.owns() || this.inner.isReady(placement);
  }

  showRewarded(placement: AdPlacement): Promise<AdResult> {
    if (this.owns()) return Promise.resolve({ rewarded: true });
    return this.inner.showRewarded(placement);
  }

  showInterstitial(): Promise<void> {
    if (this.owns()) return Promise.resolve();
    return this.inner.showInterstitial();
  }
}

export function wrapWithGoldenKnight(ads: AdService, gs: GameState): AdService {
  return new GoldenAdService(ads, () => gs.goldenKnight);
}

import { describe, expect, it } from 'vitest';
import { GOLDEN_KNIGHT } from '../../src/config/monetization';
import { GameState } from '../../src/core/GameState';
import { AdResult, AdService } from '../../src/services/monetization/AdService';
import { wrapWithGoldenKnight } from '../../src/services/monetization/GoldenAdService';

/** Counts calls so tests can prove the real ad never played. */
class SpyAd implements AdService {
  readonly isMock = true;
  rewardedShown = 0;
  interstitialsShown = 0;
  isReady(): boolean {
    return false; // "no fill" — golden knights must not care
  }
  async showRewarded(): Promise<AdResult> {
    this.rewardedShown++;
    return { rewarded: true };
  }
  async showInterstitial(): Promise<void> {
    this.interstitialsShown++;
  }
}

describe('the Golden Knight purchase', () => {
  it('is off sale until the store product exists', () => {
    expect(GOLDEN_KNIGHT.onSale).toBe(false);
  });

  it('grants once, includes remove-ads, and refuses a double buy', () => {
    const gs = new GameState();
    expect(gs.fulfillProduct(GOLDEN_KNIGHT.sku)).toBe(true);
    expect(gs.goldenKnight).toBe(true);
    expect(gs.removeAds).toBe(true);
    expect(gs.fulfillProduct(GOLDEN_KNIGHT.sku)).toBe(false);
  });

  it('comes back via store restore and survives a save round-trip', () => {
    const gs = new GameState();
    expect(gs.applyRestoredSkus([GOLDEN_KNIGHT.sku])).toBe(1);
    expect(gs.goldenKnight).toBe(true);
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    expect(revived.goldenKnight).toBe(true);
    expect(revived.removeAds).toBe(true);
  });
});

describe('the golden ad wrapper', () => {
  it('non-owners get the real ads', async () => {
    const gs = new GameState();
    const spy = new SpyAd();
    const ads = wrapWithGoldenKnight(spy, gs);
    expect(ads.isReady('raid_reset')).toBe(false);
    await ads.showRewarded('raid_reset');
    await ads.showInterstitial();
    expect(spy.rewardedShown).toBe(1);
    expect(spy.interstitialsShown).toBe(1);
  });

  it('owners get instant rewards and no ads, even with no fill', async () => {
    const gs = new GameState();
    gs.fulfillProduct(GOLDEN_KNIGHT.sku);
    const spy = new SpyAd();
    const ads = wrapWithGoldenKnight(spy, gs);
    expect(ads.isReady('raid_reset')).toBe(true);
    const result = await ads.showRewarded('loot');
    expect(result.rewarded).toBe(true);
    await ads.showInterstitial();
    expect(spy.rewardedShown).toBe(0);
    expect(spy.interstitialsShown).toBe(0);
  });

  it('buying mid-session flips the wrapper live (no restart needed)', async () => {
    const gs = new GameState();
    const spy = new SpyAd();
    const ads = wrapWithGoldenKnight(spy, gs);
    await ads.showRewarded('pet_egg');
    expect(spy.rewardedShown).toBe(1);
    gs.fulfillProduct(GOLDEN_KNIGHT.sku);
    await ads.showRewarded('pet_egg');
    expect(spy.rewardedShown).toBe(1); // still one: the second was instant
  });
});

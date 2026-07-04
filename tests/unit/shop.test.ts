import { describe, expect, it } from 'vitest';
import {
  FREE_CHEST,
  GEM_PACKS,
  INTERSTITIAL,
  PIGGY,
  REMOVE_ADS,
  STARTER_PACK,
  productBySku,
} from '../../src/config/monetization';
import { GameState } from '../../src/core/GameState';
import { InterstitialPolicy } from '../../src/core/Interstitials';

const NOW = Date.parse('2026-07-04T12:00:00Z');

describe('IAP fulfillment', () => {
  it('every shop product is registered in the catalog', () => {
    for (const sku of [
      ...GEM_PACKS.map((p) => p.sku),
      STARTER_PACK.sku,
      REMOVE_ADS.sku,
      PIGGY.product.sku,
    ]) {
      expect(productBySku(sku), sku).toBeDefined();
    }
  });

  it('gem packs credit their gems every time', () => {
    const gs = new GameState();
    const pack = GEM_PACKS[1];
    expect(gs.fulfillProduct(pack.sku)).toBe(true);
    expect(gs.fulfillProduct(pack.sku)).toBe(true); // consumable: repeatable
    expect(gs.gems).toBe(pack.gems * 2);
  });

  it('starter pack grants once: gems plus a gold boost', () => {
    const gs = new GameState();
    gs.grid[0] = 5;
    const goldBefore = gs.gold;
    expect(gs.fulfillProduct(STARTER_PACK.sku)).toBe(true);
    expect(gs.gems).toBe(STARTER_PACK.gems);
    expect(gs.gold).toBeGreaterThan(goldBefore);
    expect(gs.starterPackOwned).toBe(true);
    expect(gs.fulfillProduct(STARTER_PACK.sku)).toBe(false); // one time only
    expect(gs.gems).toBe(STARTER_PACK.gems);
  });

  it('remove_ads flips the flag once', () => {
    const gs = new GameState();
    expect(gs.removeAds).toBe(false);
    expect(gs.fulfillProduct(REMOVE_ADS.sku)).toBe(true);
    expect(gs.removeAds).toBe(true);
    expect(gs.fulfillProduct(REMOVE_ADS.sku)).toBe(false);
  });

  it('unknown SKUs fulfill nothing', () => {
    const gs = new GameState();
    expect(gs.fulfillProduct('nonsense')).toBe(false);
  });
});

describe('piggy bank', () => {
  it('fills on stage clears and caps', () => {
    const gs = new GameState();
    gs.piggyGems = PIGGY.cap - 1;
    gs.grid[0] = 30; // huge dps so stages clear fast
    const start = gs.battle.stage;
    while (gs.battle.stage < start + 3) gs.update(1);
    expect(gs.piggyGems).toBe(PIGGY.cap);
  });

  it('cannot be cracked until the minimum, then cashes out and resets', () => {
    const gs = new GameState();
    gs.piggyGems = PIGGY.minToCrack - 1;
    expect(gs.canCrackPiggy).toBe(false);
    expect(gs.fulfillProduct(PIGGY.product.sku)).toBe(false);
    gs.piggyGems = 120;
    expect(gs.fulfillProduct(PIGGY.product.sku)).toBe(true);
    expect(gs.gems).toBe(120);
    expect(gs.piggyGems).toBe(0);
  });
});

describe('free chest', () => {
  it('pays gems then goes on cooldown', () => {
    const gs = new GameState();
    expect(gs.openFreeChest(NOW)).toBe(FREE_CHEST.gems);
    expect(gs.gems).toBe(FREE_CHEST.gems);
    expect(gs.freeChestReady(NOW)).toBe(false);
    expect(gs.openFreeChest(NOW + 1000)).toBeNull();
    const later = NOW + FREE_CHEST.cooldownHours * 3_600_000;
    expect(gs.freeChestReady(later)).toBe(true);
    expect(gs.openFreeChest(later)).toBe(FREE_CHEST.gems);
  });
});

describe('interstitial policy', () => {
  const MIN_MS = INTERSTITIAL.minIntervalMinutes * 60_000;

  function primed(now: number): InterstitialPolicy {
    const p = new InterstitialPolicy(now - MIN_MS);
    for (let i = 0; i < INTERSTITIAL.minStages; i++) p.onStageCleared();
    return p;
  }

  it('shows only after enough stages AND enough time', () => {
    const p = new InterstitialPolicy(NOW);
    for (let i = 0; i < INTERSTITIAL.minStages; i++) {
      expect(p.shouldShow(false, false, NOW + i)).toBe(false);
      p.onStageCleared();
    }
    // Stage count satisfied but boot warmup not yet elapsed
    expect(p.shouldShow(false, false, NOW)).toBe(false);
    const afterWarmup = NOW + INTERSTITIAL.warmupMinutes * 60_000;
    expect(p.shouldShow(false, false, afterWarmup)).toBe(true);
  });

  it('shown() resets both gates', () => {
    const p = primed(NOW);
    expect(p.shouldShow(false, false, NOW)).toBe(true);
    p.shown(NOW);
    expect(p.shouldShow(false, false, NOW)).toBe(false);
    for (let i = 0; i < INTERSTITIAL.minStages; i++) p.onStageCleared();
    expect(p.shouldShow(false, false, NOW + 1)).toBe(false); // interval not elapsed
    expect(p.shouldShow(false, false, NOW + MIN_MS)).toBe(true);
  });

  it('never shows with remove_ads or during a raid', () => {
    const p = primed(NOW);
    expect(p.shouldShow(true, false, NOW)).toBe(false);
    expect(p.shouldShow(false, true, NOW)).toBe(false);
    expect(p.shouldShow(false, false, NOW)).toBe(true);
  });
});

describe('persistence', () => {
  it('shop state survives a serialize round-trip', () => {
    const gs = new GameState();
    gs.fulfillProduct(REMOVE_ADS.sku);
    gs.fulfillProduct(STARTER_PACK.sku);
    gs.piggyGems = 77;
    gs.openFreeChest(NOW);
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.removeAds).toBe(true);
    expect(revived.starterPackOwned).toBe(true);
    expect(revived.piggyGems).toBe(77);
    expect(revived.freeChestReady(NOW)).toBe(false);
    expect(revived.gems).toBe(gs.gems);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { FOUNDER_PACK, SKIN_PRODUCTS } from '../../src/config/monetization';
import { SWORD_PRODUCTS, PREMIUM_SWORDS } from '../../src/config/swordSkins';
import { GameState } from '../../src/core/GameState';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 0, 7, 12);

describe('the Founder\'s Pack first-purchase offer', () => {
  let gs: GameState;
  beforeEach(() => {
    gs = new GameState();
  });

  it('is hidden on the first session, offered from the second', () => {
    gs.sessionCount = 1;
    expect(gs.founderOfferAvailable(NOW)).toBe(false);
    gs.sessionCount = 2;
    expect(gs.founderOfferAvailable(NOW)).toBe(true);
  });

  it('stays open for 48h once the window is started, then closes', () => {
    gs.sessionCount = 2;
    gs.startFounderOfferWindow(NOW);
    expect(gs.founderPackExpiresAt).toBe(NOW + FOUNDER_PACK.windowHours * HOUR);
    expect(gs.founderOfferAvailable(NOW + 47 * HOUR)).toBe(true);
    expect(gs.founderOfferAvailable(NOW + 49 * HOUR)).toBe(false); // expired
  });

  it('starting the window is idempotent (the countdown never resets)', () => {
    gs.sessionCount = 2;
    gs.startFounderOfferWindow(NOW);
    const first = gs.founderPackExpiresAt;
    gs.startFounderOfferWindow(NOW + 10 * HOUR); // a later launch must not extend it
    expect(gs.founderPackExpiresAt).toBe(first);
  });

  it('buying grants the exclusive skin, blade and gems exactly once', () => {
    gs.sessionCount = 2;
    const gemsBefore = gs.gems;
    expect(gs.fulfillProduct(FOUNDER_PACK.sku)).toBe(true);
    expect(gs.founderPackOwned).toBe(true);
    expect(gs.ownedSkins).toContain(FOUNDER_PACK.skinId);
    expect(gs.ownedPremiumSwords).toContain(FOUNDER_PACK.swordId);
    expect(gs.gems).toBe(gemsBefore + FOUNDER_PACK.gems);
    // Owned -> no longer offered, and a second fulfil is rejected
    expect(gs.founderOfferAvailable(NOW)).toBe(false);
    expect(gs.fulfillProduct(FOUNDER_PACK.sku)).toBe(false);
  });

  it('restores the exclusives (but not the consumable gems) on a new device', () => {
    const gemsBefore = gs.gems;
    expect(gs.applyRestoredSkus([FOUNDER_PACK.sku])).toBe(1);
    expect(gs.founderPackOwned).toBe(true);
    expect(gs.ownedSkins).toContain(FOUNDER_PACK.skinId);
    expect(gs.ownedPremiumSwords).toContain(FOUNDER_PACK.swordId);
    expect(gs.gems).toBe(gemsBefore); // gems are consumable, not restored
  });

  it('keeps the exclusives out of the shop so they never cannibalise it', () => {
    // The skin is a "special" unlock, never an iap product
    expect(SKIN_PRODUCTS.some((p) => p.sku.includes('founder'))).toBe(false);
    // The blade exists as a premium sword but is flagged founderOnly and so
    // is excluded from the individually-sold sword product list
    expect(PREMIUM_SWORDS.some((s) => s.id === FOUNDER_PACK.swordId)).toBe(true);
    expect(SWORD_PRODUCTS.some((p) => p.sku === 'sword_founderblade')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { GEAR, weaponFrame } from '../../src/config/gear';
import { ALL_PRODUCTS } from '../../src/config/monetization';
import {
  PREMIUM_SWORDS,
  premiumSkinKey,
  swordSkinFrame,
  tierSkinKey,
} from '../../src/config/swordSkins';
import { GameState } from '../../src/core/GameState';
import { SaveManager } from '../../src/core/SaveManager';

class MemStorage {
  private data: Record<string, string> = {};
  get(key: string): string | null {
    return this.data[key] ?? null;
  }
  set(key: string, value: string): void {
    this.data[key] = value;
  }
}

describe('sword skins', () => {
  it('auto shows each tier its own art', () => {
    expect(swordSkinFrame('auto', 7)).toBe(weaponFrame(7));
    expect(swordSkinFrame('auto', 30)).toBe(GEAR.weaponArtCount - 1);
  });

  it('tier skins map to their frame; premium skins to theirs', () => {
    expect(swordSkinFrame(tierSkinKey(3), 20)).toBe(2);
    for (const s of PREMIUM_SWORDS) {
      expect(swordSkinFrame(premiumSkinKey(s.id), 1)).toBe(s.frame);
    }
  });

  it('bad keys fall back to tier art', () => {
    expect(swordSkinFrame('tier-999', 5)).toBe(weaponFrame(5));
    expect(swordSkinFrame('premium-nope', 5)).toBe(weaponFrame(5));
  });

  it('tier art unlocks at the lifetime best tier, surviving rebirth resets', () => {
    const gs = new GameState();
    gs.bestTier = 9;
    expect(gs.setSwordSkin(tierSkinKey(9))).toBe(true);
    expect(gs.setSwordSkin(tierSkinKey(10))).toBe(false);
    expect(gs.swordSkin).toBe(tierSkinKey(9));
    gs.highestTier = 1; // what a rebirth does
    expect(gs.canUseSwordSkin(tierSkinKey(9))).toBe(true);
  });

  it('premium weapons need the purchase; granting unlocks equipping', () => {
    const gs = new GameState();
    const key = premiumSkinKey('scythe');
    expect(gs.setSwordSkin(key)).toBe(false);
    gs.grantPremiumSword('scythe');
    expect(gs.setSwordSkin(key)).toBe(true);
    gs.grantPremiumSword('scythe'); // duplicate grant is a no-op
    expect(gs.ownedPremiumSwords).toEqual(['scythe']);
  });

  it('all three premium swords are purchasable products', () => {
    for (const s of PREMIUM_SWORDS) {
      const product = ALL_PRODUCTS.find((p) => p.sku === s.sku);
      expect(product?.kind).toBe('nonconsumable');
      expect(product?.priceUsd).toBe(4.99);
    }
  });

  it('sword skin and owned weapons survive a save/load round trip', () => {
    const store = new MemStorage();
    const sm = new SaveManager(store);
    const gs = new GameState();
    gs.bestTier = 14;
    gs.grantPremiumSword('voidkatana');
    gs.setSwordSkin(premiumSkinKey('voidkatana'));
    sm.save(gs);

    const loaded = new SaveManager(store).load();
    expect(loaded).not.toBeNull();
    expect(loaded!.state.swordSkin).toBe(premiumSkinKey('voidkatana'));
    expect(loaded!.state.ownedPremiumSwords).toEqual(['voidkatana']);
    expect(loaded!.state.bestTier).toBe(14);
  });
});

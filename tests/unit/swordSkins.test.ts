import { describe, expect, it } from 'vitest';
import { GEAR, weaponFrame } from '../../src/config/gear';
import { ALL_PRODUCTS } from '../../src/config/monetization';
import {
  PREMIUM_SWORDS,
  premiumSkinKey,
  swordSkinFrame,
  tierSkinKey,
} from '../../src/config/swordSkins';
import { SKINS } from '../../src/config/skins';
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
    expect(swordSkinFrame('auto', 30)).toBe(weaponFrame(30)); // own arsenal art now
    expect(swordSkinFrame('auto', 100)).toBe(GEAR.weaponArtCount - 1);
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

describe('skin benefits (Sean: skins must pay)', () => {
  it('rare skins pay gold, legendaries pay BOTH damage and gold', () => {
    for (const skin of SKINS) {
      if (skin.rarity === 'rare') {
        expect(skin.goldBonus).toBeGreaterThan(0);
      }
      if (skin.rarity === 'legendary') {
        expect(skin.dpsBonus).toBeGreaterThan(0); // paid = multiple benefits
        expect(skin.goldBonus).toBeGreaterThan(0);
      }
    }
  });

  it('owning gold-bonus skins raises the gold multiplier', () => {
    const gs = new GameState();
    const before = gs.goldMultiplier;
    gs.grantSkin('silver'); // rare: +3% gold
    expect(gs.goldMultiplier / before).toBeCloseTo(1.03);
  });

  it('worn tier art pays DPS by its tier', () => {
    const gs = new GameState();
    gs.grid[0] = 10;
    gs.bestTier = 20;
    const auto = gs.heroDps; // auto: art of the strongest blade (tier 10 -> +5%)
    expect(gs.swordSkinDpsMultiplier).toBeCloseTo(1.05);
    gs.setSwordSkin('tier-20');
    expect(gs.swordSkinDpsMultiplier).toBeCloseTo(1.1);
    expect(gs.heroDps).toBeGreaterThan(auto); // prettier art = harder hits
  });

  it('premium weapons pay both damage and gold while worn', () => {
    const gs = new GameState();
    gs.grid[0] = 5;
    const goldBefore = gs.goldMultiplier;
    gs.grantPremiumSword('scythe');
    gs.setSwordSkin('premium-scythe');
    expect(gs.swordSkinDpsMultiplier).toBeCloseTo(1.15);
    expect(gs.goldMultiplier / goldBefore).toBeCloseTo(1.15);
  });
});

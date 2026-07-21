import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../../src/core/GameState';
import { PREMIUM_SWORDS } from '../../src/config/swordSkins';
import { FOUNDER_PACK } from '../../src/config/monetization';
import { normalizeCode } from '../../src/config/promoCodes';

describe('promo codes', () => {
  let gs: GameState;
  beforeEach(() => {
    gs = new GameState();
  });

  it('normalises dashes, spaces and case', () => {
    expect(normalizeCode('sean-vip-9k2x7m')).toBe('SEANVIP9K2X7M');
    expect(normalizeCode('  SEAN VIP 9K2X7M ')).toBe('SEANVIP9K2X7M');
  });

  it('unlocks every paid entitlement with the owner master key', () => {
    const res = gs.redeemCode('sean-vip-9k2x7m');
    expect(res.ok).toBe(true);
    expect(gs.goldenKnight).toBe(true);
    expect(gs.removeAds).toBe(true);
    expect(gs.starterPackOwned).toBe(true);
    expect(gs.founderPackOwned).toBe(true);
    expect(gs.membershipActive()).toBe(true);
    expect(gs.adsDisabled).toBe(true);
    // all premium swords owned
    for (const w of PREMIUM_SWORDS) {
      expect(gs.ownedPremiumSwords).toContain(w.id);
    }
    // the Founder's exclusive skin + blade are granted
    expect(gs.ownedSkins).toContain(FOUNDER_PACK.skinId);
    expect(gs.ownedPremiumSwords).toContain(FOUNDER_PACK.swordId);
    expect(gs.gems).toBeGreaterThanOrEqual(10_000_000);
    expect(gs.souls).toBeGreaterThanOrEqual(10_000_000);
  });

  it('grants the currency top-up code', () => {
    const res = gs.redeemCode('SEAN-GEM-7Q4WPX');
    expect(res.ok).toBe(true);
    expect(gs.gems).toBeGreaterThanOrEqual(10_000_000);
    expect(gs.souls).toBeGreaterThanOrEqual(10_000_000);
    // one-time, independently of the master code
    expect(gs.redeemCode('SEAN-GEM-7Q4WPX').ok).toBe(false);
    expect(gs.redeemCode('SEAN-VIP-9K2X7M').ok).toBe(true);
  });

  it('is one-time per save', () => {
    expect(gs.redeemCode('SEAN-VIP-9K2X7M').ok).toBe(true);
    const again = gs.redeemCode('SEAN-VIP-9K2X7M');
    expect(again.ok).toBe(false);
    expect(again.message).toBe('ALREADY REDEEMED');
  });

  it('rejects unknown and empty codes', () => {
    expect(gs.redeemCode('NOPE').ok).toBe(false);
    expect(gs.redeemCode('NOPE').message).toBe('INVALID CODE');
    expect(gs.redeemCode('   ').ok).toBe(false);
    expect(gs.redeemCode('   ').message).toBe('ENTER A CODE');
  });

  it('survives a serialize/deserialize round-trip', () => {
    gs.redeemCode('SEAN-VIP-9K2X7M');
    const restored = GameState.deserialize(gs.serialize());
    expect(restored.redeemedCodes).toContain('SEANVIP9K2X7M');
    // and can't be redeemed twice across a reload
    expect(restored.redeemCode('SEAN-VIP-9K2X7M').ok).toBe(false);
  });
});

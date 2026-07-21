import { beforeEach, describe, expect, it } from 'vitest';
import { FREE_GEMS_AD, MEMBERSHIP } from '../../src/config/monetization';
import { GameState } from '../../src/core/GameState';
import { computeOffline } from '../../src/core/OfflineEarnings';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 0, 7, 12);

describe("Knight's Membership", () => {
  let gs: GameState;
  beforeEach(() => {
    gs = new GameState();
    gs.clock = () => NOW;
  });

  it('starts inactive and activates for a month on purchase', () => {
    expect(gs.membershipActive()).toBe(false);
    expect(gs.fulfillProduct(MEMBERSHIP.sku)).toBe(true);
    expect(gs.membershipActive()).toBe(true);
    expect(gs.membershipUntil).toBe(NOW + MEMBERSHIP.durationDays * DAY);
  });

  it('grants its perks only while active', () => {
    expect(gs.memberGoldMultiplier).toBe(1);
    expect(gs.memberOfflineMultiplier).toBe(1);
    expect(gs.adsDisabled).toBe(false);
    gs.fulfillProduct(MEMBERSHIP.sku);
    expect(gs.memberGoldMultiplier).toBeCloseTo(1 + MEMBERSHIP.goldBonus);
    expect(gs.memberOfflineMultiplier).toBe(MEMBERSHIP.offlineMultiplier);
    expect(gs.adsDisabled).toBe(true);
    // ...and lapse once the window closes
    gs.clock = () => NOW + 40 * DAY;
    expect(gs.membershipActive()).toBe(false);
    expect(gs.memberGoldMultiplier).toBe(1);
    expect(gs.adsDisabled).toBe(false);
  });

  it('doubles offline earnings for members', () => {
    gs.battle.stage = 8;
    gs.grid[0] = 6;
    const plain = computeOffline(gs, 3600).gold;
    gs.fulfillProduct(MEMBERSHIP.sku);
    const member = computeOffline(gs, 3600).gold;
    expect(plain).toBeGreaterThan(0);
    // member ≈ 2x plain (allow ±1 for the final floor)
    expect(Math.abs(member - plain * MEMBERSHIP.offlineMultiplier)).toBeLessThanOrEqual(1);
  });

  it('pays a daily gem stipend, once per day', () => {
    gs.fulfillProduct(MEMBERSHIP.sku);
    const before = gs.gems;
    expect(gs.membershipStipendReady()).toBe(true);
    expect(gs.claimMembershipStipend()).toBe(MEMBERSHIP.dailyGems);
    expect(gs.gems).toBe(before + MEMBERSHIP.dailyGems);
    expect(gs.membershipStipendReady()).toBe(false);
    expect(gs.claimMembershipStipend()).toBe(0);
    // next day it's ready again
    gs.clock = () => NOW + DAY;
    expect(gs.membershipStipendReady()).toBe(true);
  });

  it('emits a revenue event on purchase (for LTV/ROAS analytics)', () => {
    let logged: { sku: string; usd: number } | null = null;
    gs.on('purchase', (p) => (logged = p));
    gs.fulfillProduct(MEMBERSHIP.sku);
    expect(logged).toEqual({ sku: MEMBERSHIP.sku, usd: MEMBERSHIP.priceUsd });
  });

  it('survives a save round-trip', () => {
    gs.fulfillProduct(MEMBERSHIP.sku);
    gs.claimMembershipStipend();
    const clone = GameState.deserialize(gs.serialize());
    clone.clock = () => NOW;
    expect(clone.membershipActive()).toBe(true);
    expect(clone.membershipStipendReady()).toBe(false);
  });
});

describe('rewarded gem-ad faucet', () => {
  it('grants gems a limited number of times per day, resetting daily', () => {
    const gs = new GameState();
    gs.clock = () => NOW;
    expect(gs.gemAdsLeft()).toBe(FREE_GEMS_AD.perDay);
    const before = gs.gems;
    expect(gs.grantGemAd()).toBe(FREE_GEMS_AD.gems);
    expect(gs.gems).toBe(before + FREE_GEMS_AD.gems);
    expect(gs.gemAdsLeft()).toBe(FREE_GEMS_AD.perDay - 1);
    // burn the rest
    for (let i = 1; i < FREE_GEMS_AD.perDay; i++) gs.grantGemAd();
    expect(gs.gemAdsLeft()).toBe(0);
    expect(gs.grantGemAd()).toBe(0);
    // a new day refills the allowance
    gs.clock = () => NOW + DAY;
    expect(gs.gemAdsLeft()).toBe(FREE_GEMS_AD.perDay);
  });
});

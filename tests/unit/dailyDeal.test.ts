import { describe, expect, it } from 'vitest';
import { DAILY_DEALS, dailyDeal } from '../../src/config/dailyDeal';
import { GameState } from '../../src/core/GameState';

const DAY = 86_400_000;

/** A clock landing on the given deal kind. */
function clockFor(kind: string): number {
  const base = Date.UTC(2026, 0, 7);
  for (let i = 0; i < DAILY_DEALS.length; i++) {
    if (dailyDeal(base + i * DAY).kind === kind) return base + i * DAY;
  }
  throw new Error(`no day for ${kind}`);
}

describe('daily deal rotation', () => {
  it('rotates through every deal, stable within a day', () => {
    const base = Date.UTC(2026, 0, 7);
    const seen = new Set<string>();
    for (let i = 0; i < DAILY_DEALS.length; i++) seen.add(dailyDeal(base + i * DAY).kind);
    expect(seen.size).toBe(DAILY_DEALS.length);
    expect(dailyDeal(base).kind).toBe(dailyDeal(base + DAY - 1).kind);
  });
});

describe('claiming deals', () => {
  it('gems deal trades gold for gems, once per day', () => {
    const gs = new GameState();
    gs.clock = () => clockFor('gems');
    gs.gold = 1e9;
    const gems = gs.gems;
    expect(gs.claimDailyDeal()).toBe(true);
    expect(gs.gems).toBeGreaterThan(gems);
    expect(gs.claimDailyDeal()).toBe(false); // one a day
    // Next day it's back (a different deal, still claimable)
    expect(gs.dealClaimedToday(gs.clock() + DAY)).toBe(false);
  });

  it('gold deal trades gems for gold', () => {
    const gs = new GameState();
    gs.clock = () => clockFor('gold');
    gs.gems = 100;
    const gold = gs.gold;
    expect(gs.claimDailyDeal()).toBe(true);
    expect(gs.gold).toBeGreaterThan(gold);
    expect(gs.gems).toBeLessThan(100);
  });

  it('egg deal hatches at half price', () => {
    const gs = new GameState();
    gs.clock = () => clockFor('egg');
    gs.gold = 1e9;
    expect(gs.claimDailyDeal(undefined, 0)).toBe(true);
    expect(Object.keys(gs.pets).length).toBeGreaterThan(0);
  });

  it('refuses when the price cannot be paid', () => {
    const gs = new GameState();
    gs.clock = () => clockFor('gold');
    gs.gems = 0;
    expect(gs.claimDailyDeal()).toBe(false);
    expect(gs.dealClaimedToday()).toBe(false); // not burned
  });

  it('the claim day survives a save round-trip', () => {
    const gs = new GameState();
    gs.clock = () => clockFor('gems');
    gs.gold = 1e9;
    gs.claimDailyDeal();
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    revived.clock = gs.clock;
    expect(revived.dealClaimedToday()).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { GIFTS, rollGift } from '../../src/config/gifts';
import { GameState } from '../../src/core/GameState';

const NOW = Date.parse('2026-07-04T12:00:00Z');

describe('gift rolls', () => {
  it('maps rolls onto the prize table deterministically', () => {
    expect(rollGift(0).kind).toBe(GIFTS.table[0].kind);
    expect(rollGift(0.999999).kind).toBe(GIFTS.table[GIFTS.table.length - 1].kind);
    expect(rollGift(0.5).kind).toBe(rollGift(0.5).kind);
  });
});

describe('gift grants', () => {
  it('gold gifts scale with income', () => {
    const gs = new GameState();
    gs.grid[0] = 6;
    const before = gs.gold;
    gs.grantGift({ kind: 'gold', weight: 1, minutes: 10 });
    expect(gs.gold).toBeGreaterThan(before);
  });

  it('gem gifts pay gems', () => {
    const gs = new GameState();
    gs.grantGift({ kind: 'gems', weight: 1, gems: 5 });
    expect(gs.gems).toBe(5);
  });

  it('boost gifts open short boost windows', () => {
    const gs = new GameState();
    gs.grantGift({ kind: 'dmg_boost', weight: 1, minutes: 10 }, NOW);
    expect(gs.dmgBoostActive(NOW + 9 * 60_000)).toBe(true);
    expect(gs.dmgBoostActive(NOW + 11 * 60_000)).toBe(false);
    gs.grantGift({ kind: 'speed_boost', weight: 1, minutes: 10 }, NOW);
    expect(gs.speedBoostActive(NOW + 1)).toBe(true);
  });

  it('a gift boost never shortens a longer running boost', () => {
    const gs = new GameState();
    gs.activateDmgBoost(NOW, 30);
    gs.grantGift({ kind: 'dmg_boost', weight: 1, minutes: 10 }, NOW);
    expect(gs.dmgBoostActive(NOW + 29 * 60_000)).toBe(true);
  });
});

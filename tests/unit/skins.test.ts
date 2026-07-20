import { describe, expect, it } from 'vitest';
import { SKINS, skinById } from '../../src/config/skins';
import { SKIN_PRODUCTS } from '../../src/config/monetization';
import { GameState } from '../../src/core/GameState';

describe('skin catalog', () => {
  it('has 26 skins with unique ids (incl. the Founder\'s Pack exclusive)', () => {
    expect(SKINS).toHaveLength(26);
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(26);
  });

  it('has exactly 5 real-money skins at $4.99 (the founder skin is bundle-only)', () => {
    const iap = SKINS.filter((s) => s.unlock.type === 'iap');
    expect(iap).toHaveLength(5);
    iap.forEach((s) => {
      expect(s.rarity).toBe('legendary');
      expect((s.unlock as { priceUsd: number }).priceUsd).toBe(4.99);
    });
    expect(SKIN_PRODUCTS).toHaveLength(5);
    // The founder skin is a "special" unlock — obtainable only via the pack
    const founder = SKINS.find((s) => s.id === 'founder');
    expect(founder?.unlock.type).toBe('special');
  });

  it('every skin sheet id resolves', () => {
    SKINS.forEach((s) => expect(skinById(s.id)).toBe(s));
  });
});

describe('skin unlock rules', () => {
  it('starts owning and wearing the squire', () => {
    const gs = new GameState();
    expect(gs.ownedSkins).toEqual(['squire']);
    expect(gs.activeSkin).toBe('squire');
    expect(gs.skinDpsMultiplier).toBe(1);
  });

  it('gold skins spend gold and unlock', () => {
    const gs = new GameState();
    expect(gs.unlockSkin('crimson')).toBe(false); // can't afford
    gs.addGold(5000);
    expect(gs.unlockSkin('crimson')).toBe(true);
    expect(gs.gold).toBeLessThan(5000 + 25); // starting gold remains
    expect(gs.ownedSkins).toContain('crimson');
    expect(gs.unlockSkin('crimson')).toBe(false); // already owned
  });

  it('gem skins spend gems', () => {
    const gs = new GameState();
    gs.addGems(100);
    expect(gs.unlockSkin('silver')).toBe(true);
    expect(gs.gems).toBe(0);
  });

  it('stage skins unlock only after reaching the stage', () => {
    const gs = new GameState();
    expect(gs.unlockSkin('champion')).toBe(false);
    gs.highestStage = 10;
    expect(gs.unlockSkin('champion')).toBe(true);
  });

  it('IAP skins never unlock via unlockSkin, only via grantSkin', () => {
    const gs = new GameState();
    gs.addGold(1e12);
    gs.addGems(1e6);
    expect(gs.unlockSkin('dragonlord')).toBe(false);
    gs.grantSkin('dragonlord');
    expect(gs.ownedSkins).toContain('dragonlord');
    gs.grantSkin('dragonlord'); // idempotent
    expect(gs.ownedSkins.filter((s) => s === 'dragonlord')).toHaveLength(1);
  });

  it('equip requires ownership', () => {
    const gs = new GameState();
    expect(gs.equipSkin('crimson')).toBe(false);
    gs.addGold(5000);
    gs.unlockSkin('crimson');
    expect(gs.equipSkin('crimson')).toBe(true);
    expect(gs.activeSkin).toBe('crimson');
  });

  it('owned skins raise DPS permanently', () => {
    const gs = new GameState();
    const base = gs.heroDps;
    gs.addGold(5000);
    gs.unlockSkin('crimson'); // +2%
    expect(gs.heroDps).toBeCloseTo(base * 1.02);
    gs.grantSkin('dragonlord'); // +5%
    expect(gs.heroDps).toBeCloseTo(base * 1.07);
    // Equipping does not change the bonus — owning does
    gs.equipSkin('crimson');
    expect(gs.heroDps).toBeCloseTo(base * 1.07);
  });

  it('skins survive serialize/deserialize', () => {
    const gs = new GameState();
    gs.addGold(5000);
    gs.unlockSkin('crimson');
    gs.equipSkin('crimson');
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.ownedSkins).toEqual(gs.ownedSkins);
    expect(revived.activeSkin).toBe('crimson');
  });
});

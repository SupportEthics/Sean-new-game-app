import { describe, expect, it } from 'vitest';
import { ENCHANTS, enchantById, enchantCost } from '../../src/config/enchants';
import { GameState } from '../../src/core/GameState';

describe('enchant pricing', () => {
  it('escalates per level and caps at maxLevel', () => {
    const def = enchantById('sharpness')!;
    expect(enchantCost(def, 1)).toBeGreaterThan(enchantCost(def, 0));
    const gs = new GameState();
    gs.gems = 1_000_000;
    for (let i = 0; i < def.maxLevel; i++) expect(gs.buyEnchant('sharpness')).toBe(true);
    expect(gs.buyEnchant('sharpness')).toBe(false); // maxed
    expect(gs.enchantPrice('sharpness')).toBeNull();
  });

  it('refuses without the gems', () => {
    const gs = new GameState();
    gs.gems = 0;
    expect(gs.buyEnchant('greed')).toBe(false);
    expect(gs.enchantLevel('greed')).toBe(0);
  });
});

describe('enchant effects', () => {
  it('sharpness raises DPS, greed raises gold, soulbind raises souls', () => {
    const gs = new GameState();
    gs.gems = 100_000;
    gs.grid[0] = 5;
    gs.battle.stage = 45;
    gs.highestStage = 45;
    const dps = gs.heroDps;
    const gold = gs.goldMultiplier;
    const souls = gs.prestigeReward;
    gs.buyEnchant('sharpness');
    gs.buyEnchant('greed');
    for (let i = 0; i < 25; i++) gs.buyEnchant('soulbind'); // +50%
    expect(gs.heroDps).toBeCloseTo(dps * 1.04, 5);
    expect(gs.goldMultiplier).toBeCloseTo(gold * 1.04, 5);
    expect(gs.prestigeReward).toBe(Math.round(souls * 1.5));
  });

  it('levels survive save round-trip AND rebirth', () => {
    const gs = new GameState();
    gs.gems = 1000;
    gs.buyEnchant('sharpness');
    gs.battle.stage = 45;
    gs.highestStage = 45;
    gs.prestige();
    expect(gs.enchantLevel('sharpness')).toBe(1);
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    expect(revived.enchantLevel('sharpness')).toBe(1);
  });

  it('every enchant id is unique and priced', () => {
    const ids = new Set(ENCHANTS.map((e) => e.id));
    expect(ids.size).toBe(ENCHANTS.length);
    for (const e of ENCHANTS) expect(enchantCost(e, 0)).toBeGreaterThan(0);
  });
});

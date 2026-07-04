import { describe, expect, it } from 'vitest';
import {
  ACTIVE_PET_SLOTS,
  EGGS,
  eggPool,
  goldEggCost,
  PET_DUP_GEMS,
  PET_MAX_LEVEL,
  PETS,
  rollPet,
} from '../../src/config/pets';
import { GameState } from '../../src/core/GameState';

const DAY1 = Date.parse('2026-07-04T12:00:00Z');
const DAY2 = Date.parse('2026-07-05T12:00:00Z');

describe('egg rolls', () => {
  it('maps rolls onto pets by weight, deterministically', () => {
    expect(rollPet(0, PETS).id).toBe(PETS[0].id);
    expect(rollPet(0.999999, PETS).id).toBe(PETS[PETS.length - 1].id);
    // Same roll, same pet — determinism is what the tests and anti-cheat rely on
    expect(rollPet(0.5, PETS).id).toBe(rollPet(0.5, PETS).id);
    // Out-of-range rolls clamp instead of crashing
    expect(rollPet(-1, PETS).id).toBe(PETS[0].id);
    expect(rollPet(2, PETS).id).toBe(PETS[PETS.length - 1].id);
  });

  it('gem eggs never hatch commons', () => {
    for (const pet of eggPool('gem')) expect(pet.rarity).not.toBe('common');
    expect(eggPool('gold')).toHaveLength(PETS.length);
    expect(eggPool('free')).toHaveLength(PETS.length);
  });
});

describe('hatching', () => {
  it('gold eggs spend gold and the price escalates', () => {
    const gs = new GameState();
    gs.gold = goldEggCost(0) + goldEggCost(1);
    expect(gs.hatchEgg('gold', 0)).not.toBeNull();
    expect(gs.goldEggsBought).toBe(1);
    expect(gs.goldEggCost).toBe(goldEggCost(1));
    expect(gs.goldEggCost).toBeGreaterThan(goldEggCost(0));
    expect(gs.hatchEgg('gold', 0)).not.toBeNull();
    expect(gs.gold).toBe(0);
    expect(gs.hatchEgg('gold', 0)).toBeNull(); // broke
  });

  it('gem eggs spend gems at a flat price', () => {
    const gs = new GameState();
    gs.gems = EGGS.gemCost * 2;
    const first = gs.hatchEgg('gem', 0)!;
    expect(first.pet.rarity).not.toBe('common');
    expect(gs.gems).toBe(EGGS.gemCost);
    gs.hatchEgg('gem', 0);
    expect(gs.hatchEgg('gem', 0)).toBeNull();
  });

  it('free egg is one per UTC day', () => {
    const gs = new GameState();
    expect(gs.hatchEgg('free', 0, DAY1)).not.toBeNull();
    expect(gs.hatchEgg('free', 0, DAY1)).toBeNull(); // same day
    expect(gs.freeEggAvailable(DAY2)).toBe(true);
    expect(gs.hatchEgg('free', 0, DAY2)).not.toBeNull();
    expect(gs.gold).toBeGreaterThan(0); // free eggs never charged anything
  });

  it('duplicates level the pet up to the cap, then pay consolation gems', () => {
    const gs = new GameState();
    gs.gold = Number.MAX_SAFE_INTEGER;
    const id = PETS[0].id;
    for (let i = 0; i < PET_MAX_LEVEL; i++) {
      const r = gs.hatchEgg('gold', 0)!;
      expect(r.pet.id).toBe(id);
      expect(r.level).toBe(i + 1);
      expect(r.wasMaxed).toBe(false);
    }
    const gemsBefore = gs.gems;
    const dup = gs.hatchEgg('gold', 0)!;
    expect(dup.wasMaxed).toBe(true);
    expect(gs.petLevel(id)).toBe(PET_MAX_LEVEL);
    expect(gs.gems).toBe(gemsBefore + PET_DUP_GEMS);
  });
});

describe('pet bonuses', () => {
  it('pet levels multiply hero DPS', () => {
    const gs = new GameState();
    gs.grid[0] = 5;
    const base = gs.heroDps;
    gs.pets[PETS[0].id] = 2; // 2 x 5% = +10%
    expect(gs.petDpsMultiplier).toBeCloseTo(1 + 2 * PETS[0].dpsPerLevel);
    expect(gs.heroDps).toBeCloseTo(base * (1 + 2 * PETS[0].dpsPerLevel));
  });

  it('every hatched pet fights in the arena, highest level first', () => {
    const gs = new GameState();
    expect(gs.activePets).toEqual([]);
    gs.pets = { pup: 1, emberbat: 3, wisp: 2, pebble: 5, drake: 4 };
    expect(gs.activePets).toEqual(['pebble', 'drake', 'emberbat', 'wisp', 'pup']);
    expect(gs.activePets).toHaveLength(ACTIVE_PET_SLOTS);
    // Partial rosters show only what's hatched
    gs.pets = { wisp: 2 };
    expect(gs.activePets).toEqual(['wisp']);
  });

  it('pets survive a serialize round-trip', () => {
    const gs = new GameState();
    gs.gold = 1e9;
    gs.hatchEgg('gold', 0.9);
    gs.hatchEgg('free', 0.2, DAY1);
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.pets).toEqual(gs.pets);
    expect(revived.goldEggsBought).toBe(1);
    expect(revived.lastFreeEggDay).toBe('2026-07-04');
    expect(revived.freeEggAvailable(DAY1)).toBe(false);
  });

  it('pets survive prestige (permanent account progress)', () => {
    const gs = new GameState();
    gs.pets = { drake: 3 };
    gs.battle.stage = 40;
    expect(gs.prestige()).toBe(true);
    expect(gs.petLevel('drake')).toBe(3);
  });
});

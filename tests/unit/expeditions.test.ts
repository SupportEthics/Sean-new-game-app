import { describe, expect, it } from 'vitest';
import { EXPEDITIONS, expeditionById } from '../../src/config/expeditions';
import { GameState } from '../../src/core/GameState';

const HOUR = 3_600_000;

function withPets(): GameState {
  const gs = new GameState();
  gs.pets = { pup: 5, drake: 2 };
  return gs;
}

describe('expeditions', () => {
  it('needs a hatched pet and only one trip at a time', () => {
    const gs = new GameState();
    expect(gs.startExpedition('scout', 0)).toBe(false); // no pets
    const gs2 = withPets();
    expect(gs2.startExpedition('scout', 0)).toBe(true);
    expect(gs2.startExpedition('hunt', 0)).toBe(false); // one at a time
  });

  it('sends the reserve (weakest) pet, which stops fighting and paying DPS', () => {
    const gs = withPets();
    // pup: 5 * 0.05 = 0.25; drake: 2 * 0.12 = 0.24 -> drake is the reserve
    expect(gs.reservePetId).toBe('drake');
    const dpsBefore = gs.petDpsMultiplier;
    gs.startExpedition('scout', 0);
    expect(gs.expedition?.petId).toBe('drake');
    expect(gs.activePets).not.toContain('drake');
    expect(gs.petDpsMultiplier).toBeLessThan(dpsBefore);
  });

  it('collects only after the clock runs out, then the pet rejoins', () => {
    const gs = withPets();
    const def = expeditionById('hunt')!;
    gs.startExpedition('hunt', 0);
    expect(gs.expeditionReady(def.hours * HOUR - 1)).toBe(false);
    expect(gs.collectExpedition(def.hours * HOUR - 1)).toBeNull();
    const gems = gs.gems;
    const gold = gs.gold;
    const loot = gs.collectExpedition(def.hours * HOUR + 1);
    expect(loot).not.toBeNull();
    expect(gs.gems).toBe(gems + def.gems);
    expect(gs.gold).toBeGreaterThan(gold);
    expect(gs.expedition).toBeNull();
    expect(gs.activePets).toContain('drake');
  });

  it('survives a save round-trip mid-trip', () => {
    const gs = withPets();
    gs.startExpedition('quest', 1000);
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    expect(revived.expedition?.defId).toBe('quest');
    expect(revived.activePets).not.toContain('drake');
  });

  it('every expedition id is unique', () => {
    expect(new Set(EXPEDITIONS.map((e) => e.id)).size).toBe(EXPEDITIONS.length);
  });
});

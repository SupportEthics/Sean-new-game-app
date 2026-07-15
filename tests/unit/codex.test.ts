import { describe, expect, it } from 'vitest';
import { beastFirstStage, codexEntries } from '../../src/config/codex';
import { ENEMY_SPECIES } from '../../src/config/stages';
import { GameState } from '../../src/core/GameState';

describe('codex entries', () => {
  it('every fielded species has a first stage and an entry', () => {
    const entries = codexEntries(1, 1, {});
    const beasts = entries.filter((e) => e.kind === 'beast');
    for (const b of beasts) {
      const key = b.id.replace('beast-', '');
      expect(beastFirstStage(key)).not.toBeNull();
    }
    // All 12 species live in some location pool
    expect(beasts.length).toBe(ENEMY_SPECIES.length);
  });

  it('unlocks follow stage, lifetime tier and hatched pets', () => {
    const entries = codexEntries(15, 6, { pup: 2 });
    const byId = new Map(entries.map((e) => [e.id, e]));
    expect(byId.get('beast-skeleton')!.unlocked).toBe(true); // stage 1 pool
    expect(byId.get('beast-cultist')!.unlocked).toBe(false); // void citadel (71+)
    expect(byId.get('blade-6')!.unlocked).toBe(true);
    expect(byId.get('blade-7')!.unlocked).toBe(false);
    expect(byId.get('pet-pup')!.unlocked).toBe(true);
    expect(byId.get('pet-drake')!.unlocked).toBe(false);
  });
});

describe('codex claims', () => {
  it('pays each bounty exactly once, only when unlocked', () => {
    const gs = new GameState();
    gs.highestStage = 12;
    const gems = gs.gems;
    expect(gs.claimCodex('beast-skeleton')).toBe(true);
    expect(gs.gems).toBe(gems + 5);
    expect(gs.claimCodex('beast-skeleton')).toBe(false); // already claimed
    expect(gs.claimCodex('beast-cultist')).toBe(false); // locked
    expect(gs.claimCodex('nonsense')).toBe(false);
  });

  it('claimable count drives the badge', () => {
    const gs = new GameState();
    gs.highestStage = 1;
    gs.bestTier = 1;
    const before = gs.codexClaimable;
    expect(before).toBeGreaterThan(0); // stage-1 beasts + tier-1 blade
    gs.claimCodex('blade-1');
    expect(gs.codexClaimable).toBe(before - 1);
  });

  it('claims survive a save round-trip and rebirth', () => {
    const gs = new GameState();
    gs.highestStage = 12;
    gs.claimCodex('beast-spider');
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    expect(revived.claimCodex('beast-spider')).toBe(false);
    revived.battle.stage = 41;
    revived.highestStage = 41;
    revived.prestige();
    expect(revived.codexClaimed).toContain('beast-spider');
  });
});

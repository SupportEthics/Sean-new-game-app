import { describe, expect, it } from 'vitest';
import { GameState } from '../../src/core/GameState';
import { Tutorial } from '../../src/core/Tutorial';

describe('first-run tutorial', () => {
  it('walks buy -> merge -> equip -> done from real game events', () => {
    const gs = new GameState();
    const t = new Tutorial(gs, false);
    expect(t.currentStep).toBe('buy');

    gs.buyGear();
    expect(t.currentStep).toBe('merge');

    gs.buyGear();
    gs.mergeAt(4, 0);
    expect(t.currentStep).toBe('equip');

    t.acknowledgeEquip();
    expect(t.currentStep).toBe('done');
    expect(t.active).toBe(false);
  });

  it('skip ends it immediately and notifies listeners', () => {
    const gs = new GameState();
    const t = new Tutorial(gs, false);
    const seen: string[] = [];
    t.onChange((s) => seen.push(s));
    t.skip();
    expect(t.currentStep).toBe('done');
    expect(seen).toEqual(['done']);
    // Later events don't resurrect it
    gs.buyGear();
    expect(t.currentStep).toBe('done');
  });

  it('never starts for finished or veteran players', () => {
    const gs = new GameState();
    expect(new Tutorial(gs, true).active).toBe(false);
    const vet = new GameState();
    vet.totalKills = 500;
    expect(new Tutorial(vet, false).active).toBe(false);
  });

  it('a merge during the buy step fast-forwards past it', () => {
    const gs = new GameState();
    gs.grid[4] = 1;
    gs.grid[5] = 1;
    const t = new Tutorial(gs, false);
    gs.mergeAt(5, 4);
    expect(t.currentStep).toBe('equip');
  });
});

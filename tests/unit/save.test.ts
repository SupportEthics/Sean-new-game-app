import { describe, expect, it } from 'vitest';
import { GameState } from '../../src/core/GameState';
import { CURRENT_SAVE_VERSION, SaveManager, StorageAdapter } from '../../src/core/SaveManager';

class MemoryStorage implements StorageAdapter {
  private map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('SaveManager', () => {
  it('round-trips a game state', () => {
    const storage = new MemoryStorage();
    const mgr = new SaveManager(storage);

    const gs = new GameState();
    gs.addGold(1234);
    gs.buyGear();
    gs.highestStage = 7;
    mgr.save(gs);

    const loaded = mgr.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.state.serialize()).toEqual(gs.serialize());
  });

  it('returns null when no save exists', () => {
    const mgr = new SaveManager(new MemoryStorage());
    expect(mgr.load()).toBeNull();
  });

  it('survives corrupt saves by starting fresh', () => {
    const storage = new MemoryStorage();
    storage.set('pawsblades_save_v1', '{not json');
    const mgr = new SaveManager(storage);
    expect(mgr.load()).toBeNull();
  });

  it('computes away time and guards against clock rollback', () => {
    const storage = new MemoryStorage();
    let now = 1_000_000;
    const mgr = new SaveManager(storage, () => now);

    mgr.save(new GameState());
    now += 3_600_000; // one hour later
    expect(mgr.load()!.awaySeconds).toBeCloseTo(3600);

    now -= 7_200_000; // clock rolled back
    expect(mgr.load()!.awaySeconds).toBe(0);
  });

  it('saves at the current version', () => {
    const storage = new MemoryStorage();
    const mgr = new SaveManager(storage);
    mgr.save(new GameState());
    const raw = JSON.parse(storage.get('pawsblades_save_v1')!);
    expect(raw.version).toBe(CURRENT_SAVE_VERSION);
  });
});

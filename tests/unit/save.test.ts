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

  it('migrates a v1 save (pre-skins) to the current version', () => {
    const storage = new MemoryStorage();
    // Captured v1 shape: no ownedSkins/activeSkin fields
    const v1 = {
      version: 1,
      lastSeenUtc: Date.now(),
      state: {
        gold: 999,
        gems: 5,
        grid: new Array(20).fill(null),
        highestTier: 3,
        highestStage: 7,
        battle: {
          stage: 7,
          wave: 2,
          enemiesLeftInWave: 3,
          currentEnemyHp: 10,
          currentEnemyMaxHp: 10,
          bossTimeLeft: 30,
        },
        totalKills: 500,
        totalGoldEarned: 12345,
      },
    };
    storage.set('pawsblades_save_v1', JSON.stringify(v1));

    const loaded = new SaveManager(storage).load();
    expect(loaded).not.toBeNull();
    expect(loaded!.state.ownedSkins).toEqual(['squire']);
    expect(loaded!.state.activeSkin).toBe('squire');
    expect(loaded!.state.gold).toBe(999); // untouched fields survive
    expect(loaded!.state.highestStage).toBe(7);
    // v2 -> v3: board grew to 42 with the original 20 cells unlocked
    expect(loaded!.state.grid).toHaveLength(42);
    expect(loaded!.state.unlockedCells).toBe(20);
    // v5 -> v6: shop tier grandfathered from highestTier - 3
    expect(loaded!.state.buyTierLevel).toBe(1);
    // v3 -> v4 -> v5: prestige + raids, currency renamed to souls
    expect(loaded!.state.prestigeCount).toBe(0);
    expect(loaded!.state.souls).toBe(0);
    expect(loaded!.state.raidHighest).toBe(0);
    expect(loaded!.state.raidReadyAt).toBe(0);
    // v8 -> v9: pets arrive empty with the free egg still available
    expect(loaded!.state.pets).toEqual({});
    expect(loaded!.state.goldEggsBought).toBe(0);
    expect(loaded!.state.freeEggAvailable()).toBe(true);
    // v9 -> v10: shop — ads on, no starter pack, empty piggy, chest ready
    expect(loaded!.state.removeAds).toBe(false);
    expect(loaded!.state.starterPackOwned).toBe(false);
    expect(loaded!.state.piggyGems).toBe(0);
    expect(loaded!.state.freeChestReady()).toBe(true);
    // v10 -> v11 -> v12: skills idle, fairy unrecruited
    expect(loaded!.state.skillTimers).toEqual({});
    expect(loaded!.state.fairyLevel).toBe(0);
    // v12 -> v13: weekly/monthly sheets exist and roll on first use
    expect(loaded!.state.questProgress('kills', 'weekly')).toBe(0);
    expect(loaded!.state.questProgress('kills', 'monthly')).toBe(0);
    // v13 -> v14: ad boosts start inactive
    expect(loaded!.state.dmgBoostActive()).toBe(false);
    expect(loaded!.state.speedBoostActive()).toBe(false);
  });
});

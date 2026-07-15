import { GameState, SerializedState } from './GameState';

export interface SaveFile {
  version: number;
  lastSeenUtc: number;
  state: SerializedState;
}

/**
 * Ordered migrations: index i upgrades a save from version i+1 to i+2.
 * Never remove entries — old installs may skip many app updates.
 */
const MIGRATIONS: ((save: SaveFile) => SaveFile)[] = [
  // v1 -> v2: skins arrive; everyone owns and wears the default
  (save) => {
    save.state.ownedSkins = ['squire'];
    save.state.activeSkin = 'squire';
    return save;
  },
  // v2 -> v3: the merge board grows to 6x7; original 20 cells stay unlocked
  (save) => {
    const grid = save.state.grid ?? [];
    while (grid.length < 42) grid.push(null);
    save.state.grid = grid;
    save.state.unlockedCells = 20;
    return save;
  },
  // v3 -> v4: prestige + raids (the currency was still called 'acorns' then)
  (save) => {
    save.state.prestigeCount = 0;
    (save.state as unknown as { acorns: number }).acorns = 0;
    save.state.raidHighest = 0;
    save.state.raidReadyAt = 0;
    return save;
  },
  // v4 -> v5: prestige currency renamed acorns -> souls (theme alignment)
  (save) => {
    const legacy = save.state as unknown as { acorns?: number; souls?: number };
    save.state.souls = legacy.acorns ?? 0;
    delete legacy.acorns;
    return save;
  },
  // v5 -> v6: the shop tier becomes a paid upgrade; grandfather the old
  // implicit tier (highestTier - 3) so nobody's shop regresses
  (save) => {
    save.state.buyTierLevel = Math.max(1, (save.state.highestTier ?? 1) - 3);
    return save;
  },
  // v6 -> v7: Soul Relics
  (save) => {
    save.state.soulUpgrades = {};
    return save;
  },
  // v7 -> v8: daily quests
  (save) => {
    save.state.daily = {
      day: '1970-01-01',
      progress: {},
      claimed: [],
      streak: 0,
      lastAllDoneDay: '',
    };
    return save;
  },
  // v8 -> v9: pets + eggs
  (save) => {
    save.state.pets = {};
    save.state.goldEggsBought = 0;
    save.state.lastFreeEggDay = '';
    return save;
  },
  // v9 -> v10: the shop — remove-ads, starter pack, piggy bank, free chest
  (save) => {
    save.state.removeAds = false;
    save.state.starterPackOwned = false;
    save.state.piggyGems = 0;
    save.state.freeChestReadyAt = 0;
    return save;
  },
  // v10 -> v11: active skills
  (save) => {
    save.state.skillTimers = {};
    return save;
  },
  // v11 -> v12: the fairy
  (save) => {
    save.state.fairyLevel = 0;
    return save;
  },
  // v12 -> v13: weekly + monthly quest sheets
  (save) => {
    save.state.weekly = { key: '', progress: {}, claimed: [] };
    save.state.monthly = { key: '', progress: {}, claimed: [] };
    return save;
  },
  // v13 -> v14: rewarded-ad battle boosts
  (save) => {
    save.state.dmgBoostUntil = 0;
    save.state.speedBoostUntil = 0;
    return save;
  },
  // v14 -> v15: login calendar + achievements (with lifetime merge counter)
  (save) => {
    save.state.loginStreakDay = 0;
    save.state.lastLoginClaimDay = '';
    save.state.totalMerges = 0;
    save.state.achievementsClaimed = [];
    return save;
  },
  // v15 -> v16: the town
  (save) => {
    save.state.townBuildings = {};
    save.state.jewelerCollectedAt = 0;
    return save;
  },
  // v16 -> v17: sword skins (cosmetic blade art + premium IAP weapons)
  (save) => {
    save.state.swordSkin = 'auto';
    save.state.ownedPremiumSwords = [];
    save.state.bestTier = save.state.highestTier ?? 1;
    return save;
  },
  // v17 -> v18: raid ladder resets on rebirth; lifetime best kept for awards
  (save) => {
    save.state.raidBest = save.state.raidHighest ?? 0;
    return save;
  },
  // v18 -> v19: dedicated 4-cell equip row + 6x6 merge field (40 cells,
  // was 6x7=42). Repack the swords; loading arranges the equip bar.
  (save) => {
    const old = (save.state.grid ?? []) as (number | null)[];
    const items = old.filter((t): t is number => t !== null);
    const grid: (number | null)[] = new Array(40).fill(null);
    items.slice(0, 40).forEach((t, i) => {
      grid[i] = t;
    });
    save.state.grid = grid;
    save.state.unlockedCells = Math.min((save.state.unlockedCells as number) ?? 20, 40);
    return save;
  },
  // v19 -> v20: pet evolution stages
  (save) => {
    save.state.petStages = {};
    return save;
  },
  // v20 -> v21: the treasure ad cooldown
  (save) => {
    save.state.adLootReadyAt = 0;
    return save;
  },
  // v21 -> v22: auto-cast skills toggle + real-players-only leaderboard view
  (save) => {
    save.state.autoSkills = false;
    save.state.boardRealOnly = false;
    return save;
  },
  // v22 -> v23: the Daily Dungeon
  (save) => {
    save.state.dungeonClearedDay = '';
    return save;
  },
  // v23 -> v24: the Codex collection book
  (save) => {
    save.state.codexClaimed = [];
    return save;
  },
  // v24 -> v25: forge enchantments
  (save) => {
    save.state.enchants = {};
    return save;
  },
  // v25 -> v26: pet expeditions
  (save) => {
    save.state.expedition = null;
    return save;
  },
  // v26 -> v27: rival duels
  (save) => {
    save.state.duelDay = '';
    save.state.duelsUsed = 0;
    return save;
  },
  // v27 -> v28: the Knight's Pass
  (save) => {
    save.state.passSeasonNum = 0;
    save.state.passXp = 0;
    save.state.passClaimedFree = [];
    save.state.passClaimedPremium = [];
    save.state.passPremiumSeason = 0;
    return save;
  },
  // v28 -> v29: the shop's daily deal
  (save) => {
    save.state.dealClaimedDay = '';
    return save;
  },
  // v29 -> v30: fairy evolution
  (save) => {
    save.state.fairyStage = 0;
    return save;
  },
];

export const CURRENT_SAVE_VERSION = MIGRATIONS.length + 1;

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Browser localStorage; a Capacitor Preferences adapter replaces this on native. */
export class LocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private browsing / quota — the game keeps running unsaved */
    }
  }
}

export const SAVE_KEY = 'pawsblades_save_v1';

export class SaveManager {
  constructor(
    private storage: StorageAdapter,
    private now: () => number = () => Date.now(),
  ) {}

  save(state: GameState): void {
    const file: SaveFile = {
      version: CURRENT_SAVE_VERSION,
      lastSeenUtc: this.now(),
      state: state.serialize(),
    };
    this.storage.set(SAVE_KEY, JSON.stringify(file));
  }

  /** Returns the loaded state plus how long the player was away (clamped ≥ 0). */
  load(): { state: GameState; awaySeconds: number } | null {
    const raw = this.storage.get(SAVE_KEY);
    if (!raw) return null;
    try {
      let file = JSON.parse(raw) as SaveFile;
      if (typeof file.version !== 'number' || !file.state) return null;
      file = migrate(file);
      // Guard against device clock rolled backwards
      const awaySeconds = Math.max(0, (this.now() - file.lastSeenUtc) / 1000);
      return { state: GameState.deserialize(file.state), awaySeconds };
    } catch {
      return null; // corrupt save: start fresh rather than crash-looping
    }
  }
}

export function migrate(file: SaveFile): SaveFile {
  let current = file;
  for (let v = file.version; v < CURRENT_SAVE_VERSION; v++) {
    current = MIGRATIONS[v - 1](current);
    current.version = v + 1;
  }
  return current;
}

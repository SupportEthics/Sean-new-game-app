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

const SAVE_KEY = 'pawsblades_save_v1';

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

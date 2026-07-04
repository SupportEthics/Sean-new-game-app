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
  // v1 -> v2 example (none yet)
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

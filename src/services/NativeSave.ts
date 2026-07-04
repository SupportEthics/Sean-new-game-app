import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { LocalStorageAdapter, StorageAdapter } from '../core/SaveManager';

const SAVE_KEY = 'pawsblades_save_v1';

/**
 * iOS can evict WebView localStorage under disk pressure; Capacitor
 * Preferences is durable. Saves write through to both, and boot restores
 * localStorage from Preferences when the WebView copy is missing.
 */
export async function hydrateSaveFromPreferences(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { value } = await Preferences.get({ key: SAVE_KEY });
    if (value && !localStorage.getItem(SAVE_KEY)) {
      localStorage.setItem(SAVE_KEY, value);
    }
  } catch (e) {
    console.warn('Preferences hydrate failed; using WebView storage', e);
  }
}

/** localStorage for sync reads, mirrored to Preferences on native writes. */
export class MirroredStorage implements StorageAdapter {
  private local = new LocalStorageAdapter();

  get(key: string): string | null {
    return this.local.get(key);
  }

  set(key: string, value: string): void {
    this.local.set(key, value);
    if (Capacitor.isNativePlatform()) {
      void Preferences.set({ key, value }).catch(() => {
        /* WebView copy still saved */
      });
    }
  }
}

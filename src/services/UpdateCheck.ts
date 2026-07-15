// Update nudge: the website hosts version.json declaring the newest iOS
// build; native apps compare it against their own bundle version on
// launch and show a tap-to-update banner when they're behind. Bump
// version.json on the site AFTER each release goes live on the store.
// Web builds and offline launches skip silently.

import { Capacitor } from '@capacitor/core';

export const VERSION_URL = 'https://soulforge-knight.netlify.app/version.json';
export const APP_STORE_URL = 'https://apps.apple.com/app/id6788027174';

export interface UpdateInfo {
  latest: string;
  storeUrl: string;
}

/** Dotted-version compare: is `latest` strictly newer than `current`? */
export function versionNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map((n) => parseInt(n, 10) || 0);
  const b = current.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/** Null = up to date, not native, or offline (always fail soft). */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(VERSION_URL, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { ios?: string };
    if (!data.ios || !versionNewer(data.ios, info.version)) return null;
    return { latest: data.ios, storeUrl: APP_STORE_URL };
  } catch {
    return null;
  }
}

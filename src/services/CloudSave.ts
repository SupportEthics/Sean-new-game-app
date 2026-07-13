// Cloud saves bound to the player's Apple account (Google joins when the
// Android build ships). Sign in with Apple happens natively via the
// capacitor plugin; the resulting identity token becomes a Supabase Auth
// session, and the save blob lives in the cloud_saves table under row
// level security (docs/cloud-save.sql). Web builds get a quiet mock, and
// everything stays dormant until config/globalBoard has real keys.

import { Capacitor } from '@capacitor/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GLOBAL_BOARD, globalBoardConfigured } from '../config/globalBoard';

export interface CloudSnapshot {
  save: unknown;
  stage: number;
  updatedAt: string;
}

export interface CloudSaveService {
  /** True when sign-in can actually be offered (configured native build). */
  readonly isAvailable: boolean;
  isSignedIn(): Promise<boolean>;
  /** Short label for the signed-in account (masked email or 'APPLE ID'). */
  userLabel(): Promise<string | null>;
  signIn(): Promise<boolean>;
  signOut(): Promise<void>;
  /** Push the serialized save up; true on success. */
  backup(save: unknown, stage: number): Promise<boolean>;
  /** The account's cloud snapshot, or null when none/offline. */
  fetchCloud(): Promise<CloudSnapshot | null>;
}

/** Decide what to do with a cloud snapshot found at sign-in. Pure logic,
 * unit-tested: never silently clobber the better save in either
 * direction. */
export function cloudRestoreAdvice(
  localStage: number,
  cloud: CloudSnapshot | null,
): 'nothing-there' | 'offer-restore' | 'push-local' {
  if (!cloud) return 'nothing-there';
  if (cloud.stage > localStage) return 'offer-restore';
  return 'push-local';
}

/** Browser/dev builds: cloud saves are a native-only feature. */
export class WebMockCloudSave implements CloudSaveService {
  readonly isAvailable = false;

  async isSignedIn(): Promise<boolean> {
    return false;
  }
  async userLabel(): Promise<string | null> {
    return null;
  }
  async signIn(): Promise<boolean> {
    return false;
  }
  async signOut(): Promise<void> {
    /* nothing to sign out of */
  }
  async backup(): Promise<boolean> {
    return false;
  }
  async fetchCloud(): Promise<CloudSnapshot | null> {
    return null;
  }
}

/** iOS: Sign in with Apple -> Supabase session -> cloud_saves row. */
export class AppleCloudSave implements CloudSaveService {
  private client: SupabaseClient | null = null;

  get isAvailable(): boolean {
    return globalBoardConfigured() && Capacitor.getPlatform() === 'ios';
  }

  private supabase(): SupabaseClient {
    if (!this.client) {
      this.client = createClient(GLOBAL_BOARD.url, GLOBAL_BOARD.anonKey, {
        auth: {
          // WKWebView localStorage persists well enough for a session
          // cache; a lost session just means signing in again.
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
    }
    return this.client;
  }

  async isSignedIn(): Promise<boolean> {
    if (!this.isAvailable) return false;
    const { data } = await this.supabase().auth.getSession();
    return data.session !== null;
  }

  async userLabel(): Promise<string | null> {
    if (!this.isAvailable) return null;
    const { data } = await this.supabase().auth.getUser();
    const email = data.user?.email;
    if (!email) return data.user ? 'APPLE ID' : null;
    // Mask for on-screen display: AB•••@ICLOUD.COM
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2).toUpperCase()}***@${(domain ?? '').toUpperCase()}`;
  }

  async signIn(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      const nonce = crypto.randomUUID();
      const result = await SignInWithApple.authorize({
        clientId: 'uk.co.supportethics.soulforgeknight',
        redirectURI: '', // unused in the native flow
        scopes: 'email',
        nonce,
      });
      const token = result.response.identityToken;
      if (!token) return false;
      const { error } = await this.supabase().auth.signInWithIdToken({
        provider: 'apple',
        token,
        nonce,
      });
      return !error;
    } catch {
      return false; // user cancelled or provider misconfigured
    }
  }

  async signOut(): Promise<void> {
    if (!this.isAvailable) return;
    await this.supabase().auth.signOut();
  }

  async backup(save: unknown, stage: number): Promise<boolean> {
    if (!(await this.isSignedIn())) return false;
    try {
      const { data } = await this.supabase().auth.getUser();
      const uid = data.user?.id;
      if (!uid) return false;
      const { error } = await this.supabase()
        .from('cloud_saves')
        .upsert({
          user_id: uid,
          save,
          stage: Math.max(1, Math.min(9999, Math.floor(stage))),
          updated_at: new Date().toISOString(),
        });
      return !error;
    } catch {
      return false;
    }
  }

  async fetchCloud(): Promise<CloudSnapshot | null> {
    if (!(await this.isSignedIn())) return null;
    try {
      const { data, error } = await this.supabase()
        .from('cloud_saves')
        .select('save,stage,updated_at')
        .maybeSingle();
      if (error || !data) return null;
      return { save: data.save, stage: data.stage, updatedAt: data.updated_at };
    } catch {
      return null;
    }
  }
}

/** Platform pick, mirroring the ads/IAP service factories. */
export function makeCloudSave(): CloudSaveService {
  return Capacitor.getPlatform() === 'ios' ? new AppleCloudSave() : new WebMockCloudSave();
}

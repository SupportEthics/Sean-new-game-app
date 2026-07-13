// Global leaderboard client — plain fetch against the Supabase REST API,
// no SDK. Reads the top rows and submits the player's best through the
// rate-limited submit_score function (docs/leaderboard.sql). Every call
// fails soft: offline or misconfigured, the Hall of Legends just shows
// the local rivals.

import { Capacitor } from '@capacitor/core';
import { GLOBAL_BOARD, GlobalRow, globalBoardConfigured, isValidCallSign } from '../config/globalBoard';

const TIMEOUT_MS = 6000;

function headers(): Record<string, string> {
  return {
    apikey: GLOBAL_BOARD.anonKey,
    Authorization: `Bearer ${GLOBAL_BOARD.anonKey}`,
    'Content-Type': 'application/json',
  };
}

async function withTimeout(input: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class GlobalBoard {
  get isConfigured(): boolean {
    return globalBoardConfigured();
  }

  /** Top rows by stage, best first. Null on any failure. */
  async fetchTop(limit = 50): Promise<GlobalRow[] | null> {
    if (!this.isConfigured) return null;
    try {
      const res = await withTimeout(
        `${GLOBAL_BOARD.url}/rest/v1/leaderboard` +
          `?select=device_id,name,stage,prestiges,skin&order=stage.desc,updated_at.asc&limit=${limit}`,
        { headers: headers() },
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as GlobalRow[];
      return rows.filter(
        (r) =>
          typeof r.name === 'string' &&
          Number.isFinite(r.stage) &&
          isValidCallSign(r.name),
      );
    } catch {
      return null;
    }
  }

  /** Report the player's best. Fire-and-forget; the server keeps the max
   * and rate limits rewrites. */
  async submit(
    deviceId: string,
    name: string,
    stage: number,
    prestiges: number,
    skin: string,
  ): Promise<boolean> {
    if (!this.isConfigured || !isValidCallSign(name)) return false;
    try {
      const res = await withTimeout(`${GLOBAL_BOARD.url}/rest/v1/rpc/submit_score`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          p_device: deviceId,
          p_name: name,
          p_stage: Math.max(1, Math.min(999, Math.floor(stage))),
          p_prestiges: Math.max(0, Math.min(99, Math.floor(prestiges))),
          p_skin: skin.slice(0, 20),
          p_platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const globalBoard = new GlobalBoard();

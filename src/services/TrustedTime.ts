// Trusted time — anti clock-cheat. Idle games that read the device clock
// can be cheated by winding the phone forward (fake offline earnings, free
// daily resets). We instead trust the server's clock: a tiny Supabase RPC
// (docs/server-time.sql) returns real UTC, we lock an offset to it, and a
// persisted "floor" makes the clock monotonic so winding backwards does
// nothing either. Falls back silently to device time when offline, so the
// game always runs; protection simply activates once online (which is
// effectively always, since ads and the leaderboard need the network).
import { GLOBAL_BOARD, globalBoardConfigured } from '../config/globalBoard';

const OFFSET_KEY = 'pawsblades_time_offset';
const FLOOR_KEY = 'pawsblades_time_floor';

let offsetMs = readNum(OFFSET_KEY);
let floorMs = readNum(FLOOR_KEY);
let synced = false;

function readNum(key: string): number {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

function writeNum(key: string, v: number): void {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* storage unavailable */
  }
}

/** Pure clamp: device clock + server offset, never below the highest
 * server-confirmed time we've seen. Exported for tests. */
export function computeTrusted(deviceNow: number, offset: number, floor: number): number {
  return Math.max(deviceNow + offset, floor);
}

/** Best estimate of true UTC now. Winding the clock BACKWARD is fully
 * neutralised (clamped to the floor); winding FORWARD is corrected on the
 * next online launch when the offset re-locks to the server. */
export function trustedNow(): number {
  return computeTrusted(Date.now(), offsetMs, floorMs);
}

export function timeSynced(): boolean {
  return synced;
}

/** Lock our offset to the server's clock via the server_now RPC. Silent
 * no-op offline: we keep the last-known offset and floor. Short timeout so
 * a slow/absent network never stalls the boot for long. */
export async function syncTime(timeoutMs = 2500): Promise<void> {
  if (!globalBoardConfigured()) return;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${GLOBAL_BOARD.url}/rest/v1/rpc/server_now`, {
      method: 'POST',
      headers: {
        apikey: GLOBAL_BOARD.anonKey,
        Authorization: `Bearer ${GLOBAL_BOARD.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: ctrl.signal,
    });
    if (!res.ok) return;
    const serverMs = Number(await res.json());
    if (!Number.isFinite(serverMs) || serverMs <= 0) return;
    offsetMs = serverMs - Date.now();
    synced = true;
    writeNum(OFFSET_KEY, offsetMs);
    // Advance the anti-rollback floor to server-confirmed time ONLY — never
    // from device-derived time, so an offline forward-jump can't poison it.
    if (serverMs > floorMs) {
      floorMs = serverMs;
      writeNum(FLOOR_KEY, floorMs);
    }
  } catch {
    /* offline, blocked, or RPC not yet deployed: keep device time */
  } finally {
    clearTimeout(timer);
  }
}

// Weekend events — data only. One event runs every weekend (Friday 00:00
// UTC through Sunday 23:59 UTC), rotating deterministically week by week,
// so every player worldwide sees the same event with zero server support.
// GameState reads the active event through its injectable clock, which
// keeps the battle sim unit-testable on any day of the week.

export interface EventDef {
  id: string;
  name: string;
  desc: string;
  /** Banner tint in the arena strip. */
  color: number;
  /** Battle gold multiplier while the event runs. */
  goldMult?: number;
  /** Hero DPS multiplier while the event runs. */
  dpsMult?: number;
  /** Souls-from-rebirth multiplier while the event runs. */
  soulsMult?: number;
  /** Raid gold-per-kill multiplier while the event runs. */
  raidGoldMult?: number;
}

export const EVENTS: EventDef[] = [
  {
    id: 'souls',
    name: 'SOUL HARVEST',
    desc: 'X2 SOULS FROM REBIRTH',
    color: 0x7a3ea8,
    soulsMult: 2,
  },
  {
    id: 'gold',
    name: 'GOLD RUSH WEEKEND',
    desc: 'X1.5 GOLD FROM BATTLE',
    color: 0xc9961e,
    goldMult: 1.5,
  },
  {
    id: 'raid',
    name: 'RAID FRENZY',
    desc: 'X2 GOLD FROM RAIDS',
    color: 0xb03a2e,
    raidGoldMult: 2,
  },
  {
    id: 'storm',
    name: 'STORM OF BLADES',
    desc: '+25% HERO DPS',
    color: 0x2884a8,
    dpsMult: 1.25,
  },
];

const DAY_MS = 86_400_000;

/** True on Friday, Saturday and Sunday (UTC). */
export function eventActiveAt(nowMs: number): boolean {
  const day = new Date(nowMs).getUTCDay(); // 0=Sun ... 5=Fri, 6=Sat
  return day === 5 || day === 6 || day === 0;
}

/** The weekend's event, or null on weekdays. The rotation is anchored to
 * the Friday that started the current weekend, so the event never changes
 * mid-weekend. */
export function activeEvent(nowMs: number): EventDef | null {
  if (!eventActiveAt(nowMs)) return null;
  const d = new Date(nowMs);
  const day = d.getUTCDay();
  const backDays = day === 5 ? 0 : day === 6 ? 1 : 2;
  const friday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - backDays);
  const week = Math.floor(friday / (7 * DAY_MS));
  return EVENTS[week % EVENTS.length];
}

// Quests — data only. Daily quests reset at UTC midnight (completing every
// daily grows a streak); weekly quests reset Monday UTC; monthly quests
// reset on the 1st. Bigger periods, bigger targets, bigger gem payouts.

export type QuestMetric = 'kills' | 'merges' | 'stages' | 'raids' | 'ads';
export type QuestPeriod = 'daily' | 'weekly' | 'monthly';

export interface QuestDef {
  id: QuestMetric;
  name: string;
  target: number;
  gems: number;
}

export const DAILY_QUESTS: QuestDef[] = [
  { id: 'kills', name: 'SLAY 200 MONSTERS', target: 200, gems: 10 },
  { id: 'merges', name: 'MERGE 15 SWORDS', target: 15, gems: 10 },
  { id: 'stages', name: 'CLEAR 3 STAGES', target: 3, gems: 15 },
  { id: 'raids', name: 'FIGHT A RAID', target: 1, gems: 15 },
  { id: 'ads', name: 'WATCH 2 ADS', target: 2, gems: 20 },
];

export const WEEKLY_QUESTS: QuestDef[] = [
  { id: 'kills', name: 'SLAY 2000 MONSTERS', target: 2000, gems: 40 },
  { id: 'merges', name: 'MERGE 120 SWORDS', target: 120, gems: 40 },
  { id: 'stages', name: 'CLEAR 20 STAGES', target: 20, gems: 50 },
  { id: 'raids', name: 'FIGHT 5 RAIDS', target: 5, gems: 50 },
  { id: 'ads', name: 'WATCH 10 ADS', target: 10, gems: 70 },
];

export const MONTHLY_QUESTS: QuestDef[] = [
  { id: 'kills', name: 'SLAY 10000 MONSTERS', target: 10000, gems: 150 },
  { id: 'merges', name: 'MERGE 600 SWORDS', target: 600, gems: 150 },
  { id: 'stages', name: 'CLEAR 80 STAGES', target: 80, gems: 200 },
  { id: 'raids', name: 'FIGHT 20 RAIDS', target: 20, gems: 200 },
  { id: 'ads', name: 'WATCH 40 ADS', target: 40, gems: 250 },
];

export const QUESTS: Record<QuestPeriod, QuestDef[]> = {
  daily: DAILY_QUESTS,
  weekly: WEEKLY_QUESTS,
  monthly: MONTHLY_QUESTS,
};

/** Bonus gems for finishing all dailies: 5 per streak day, capped. */
export const STREAK_BONUS_PER_DAY = 5;
export const STREAK_BONUS_CAP = 25;

export function questBy(period: QuestPeriod, id: QuestMetric): QuestDef {
  return QUESTS[period].find((q) => q.id === id)!;
}

/** Daily lookup (kept for callers predating weekly/monthly quests). */
export function questById(id: QuestMetric): QuestDef {
  return questBy('daily', id);
}

/** UTC calendar day, e.g. "2026-07-04". */
export function utcDay(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** The Monday starting this UTC week, e.g. "2026-06-29". */
export function utcWeek(epochMs: number): string {
  const d = new Date(epochMs);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return utcDay(epochMs - daysSinceMonday * 24 * 3600 * 1000);
}

/** UTC calendar month, e.g. "2026-07". */
export function utcMonth(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 7);
}

/** The reset key a quest sheet belongs to, per period. */
export function periodKey(period: QuestPeriod, epochMs: number): string {
  if (period === 'daily') return utcDay(epochMs);
  if (period === 'weekly') return utcWeek(epochMs);
  return utcMonth(epochMs);
}

export function isNextDay(prev: string, next: string): boolean {
  return next === utcDay(Date.parse(`${prev}T00:00:00Z`) + 24 * 3600 * 1000);
}

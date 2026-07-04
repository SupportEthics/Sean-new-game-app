// Daily quests — data only. Reset at UTC midnight; completing every quest
// grows a streak that pays a bonus.

export type QuestMetric = 'kills' | 'merges' | 'stages' | 'raids' | 'ads';

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

/** Bonus gems for finishing all quests: 5 per streak day, capped. */
export const STREAK_BONUS_PER_DAY = 5;
export const STREAK_BONUS_CAP = 25;

export function questById(id: QuestMetric): QuestDef {
  return DAILY_QUESTS.find((q) => q.id === id)!;
}

/** UTC calendar day, e.g. "2026-07-04". */
export function utcDay(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

export function isNextDay(prev: string, next: string): boolean {
  return next === utcDay(Date.parse(`${prev}T00:00:00Z`) + 24 * 3600 * 1000);
}

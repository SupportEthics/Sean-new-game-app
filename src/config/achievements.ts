// Achievements — data only. Lifetime goals paying gems, read from counters
// GameState already keeps (plus totalMerges, added alongside this file).

export type AchievementMetric =
  | 'kills'
  | 'merges'
  | 'stage'
  | 'tier'
  | 'skins'
  | 'pets'
  | 'fairy'
  | 'prestiges'
  | 'raids'
  | 'gold';

export interface AchievementDef {
  id: string;
  name: string;
  metric: AchievementMetric;
  target: number;
  gems: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'kills1', name: 'SLAY 1,000 MONSTERS', metric: 'kills', target: 1000, gems: 10 },
  { id: 'kills2', name: 'SLAY 25,000 MONSTERS', metric: 'kills', target: 25000, gems: 40 },
  { id: 'merges1', name: 'MERGE 100 SWORDS', metric: 'merges', target: 100, gems: 10 },
  { id: 'merges2', name: 'MERGE 2,000 SWORDS', metric: 'merges', target: 2000, gems: 40 },
  { id: 'stage1', name: 'REACH STAGE 25', metric: 'stage', target: 25, gems: 15 },
  { id: 'stage2', name: 'REACH STAGE 60', metric: 'stage', target: 60, gems: 50 },
  { id: 'tier1', name: 'FORGE A TIER 15 SWORD', metric: 'tier', target: 15, gems: 20 },
  { id: 'skins1', name: 'OWN 8 SKINS', metric: 'skins', target: 8, gems: 25 },
  { id: 'pets1', name: 'HATCH ALL 5 PETS', metric: 'pets', target: 5, gems: 30 },
  { id: 'fairy1', name: 'FAIRY LEVEL 15', metric: 'fairy', target: 15, gems: 25 },
  { id: 'prestige1', name: 'REBIRTH FOR THE FIRST TIME', metric: 'prestiges', target: 1, gems: 40 },
  { id: 'raids1', name: 'CLEAR RAID LEVEL 5', metric: 'raids', target: 5, gems: 30 },
  { id: 'gold1', name: 'EARN 1M GOLD LIFETIME', metric: 'gold', target: 1_000_000, gems: 30 },
];

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

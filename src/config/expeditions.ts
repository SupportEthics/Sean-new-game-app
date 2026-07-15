// Pet expeditions — data only. Send one companion away on a real-time
// trip: it stops fighting beside the hero while it's gone (a real
// trade-off), and comes home carrying gems + hours of gold income.

export interface ExpeditionDef {
  id: string;
  name: string;
  hours: number;
  gems: number;
  /** Gold reward: hours of current income. */
  goldHours: number;
}

export const EXPEDITIONS: ExpeditionDef[] = [
  { id: 'scout', name: 'SCOUTING TRIP', hours: 1, gems: 3, goldHours: 0.5 },
  { id: 'hunt', name: 'TREASURE HUNT', hours: 4, gems: 10, goldHours: 1.5 },
  { id: 'quest', name: 'GRAND QUEST', hours: 12, gems: 30, goldHours: 4 },
];

export function expeditionById(id: string): ExpeditionDef | undefined {
  return EXPEDITIONS.find((e) => e.id === id);
}

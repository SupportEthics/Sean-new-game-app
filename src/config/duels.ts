// Rival duels — data only. Tap a name on the Hall of Legends and pit your
// DPS against theirs in an instant simulated showdown. Win chance follows
// the DPS ratio (Bradley-Terry style), so punching up is possible but
// hard. Winners take a purse of gold; everyone gets three duels a day.

export const DUELS = {
  perDay: 3,
  /** Winner's purse: hours of the winner's own gold income. */
  goldHours: 0.5,
} as const;

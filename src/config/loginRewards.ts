// Daily login rewards — data only. A 7-day cycle that repeats forever;
// missing a day pauses the cycle rather than resetting it (friendlier).
// Gold rewards scale with the player's current income so they always feel
// worth collecting (same trick as the starter pack).

export interface LoginReward {
  day: number; // 1..7, display only
  /** Minutes of current gold income granted. */
  goldMinutes?: number;
  gems?: number;
  /** A free gold egg hatch (day 7 finale). */
  goldEgg?: boolean;
}

export const LOGIN_REWARDS: LoginReward[] = [
  { day: 1, goldMinutes: 15 },
  { day: 2, gems: 10 },
  { day: 3, goldMinutes: 30 },
  { day: 4, gems: 20 },
  { day: 5, goldMinutes: 60 },
  { day: 6, gems: 30 },
  // Day 7 is a jackpot on purpose — a fat gem drop, two hours of gold AND a
  // free egg hatch. Missing it should sting, so the streak stays sticky.
  { day: 7, gems: 75, goldMinutes: 120, goldEgg: true },
];

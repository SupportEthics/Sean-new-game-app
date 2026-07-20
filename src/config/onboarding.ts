// New-recruit welcome ramp — data only. A one-time 7-day gift track that
// runs ALONGSIDE the daily login calendar, aimed squarely at first-week
// retention: the window where a brand-new player either forms the daily
// habit or churns. Each day escalates, and it's deliberately more generous
// than the login cycle — the goal is to make the first week feel like a
// gift every single day so opening the app becomes routine.
//
// One claim per UTC day; missing a day just pauses the ramp (it never
// resets), so a returning player picks up exactly where they left off.
// Gold rewards scale with current income (same trick as the login cycle)
// so they stay meaningful whatever stage the recruit has reached.

export interface OnboardingReward {
  day: number; // 1..7, display only
  /** Minutes of current gold income granted. */
  goldMinutes?: number;
  gems?: number;
}

export const ONBOARDING_REWARDS: OnboardingReward[] = [
  { day: 1, gems: 30 }, // gems on day one: teach the premium currency early
  { day: 2, goldMinutes: 30 },
  { day: 3, gems: 40 },
  { day: 4, goldMinutes: 60 },
  { day: 5, gems: 60 },
  { day: 6, goldMinutes: 120 },
  { day: 7, gems: 150 }, // week-one finale — a genuinely exciting drop
];

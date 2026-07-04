// Floating gift event — data only. A parcel drifts across the arena every
// few minutes; tapping it plays a rewarded ad for a random prize.

export type GiftKind = 'gold' | 'gems' | 'dmg_boost' | 'speed_boost';

export interface GiftDef {
  kind: GiftKind;
  weight: number;
  /** Minutes of current income (gold) / boost length (boosts). */
  minutes?: number;
  gems?: number;
}

export const GIFTS = {
  /** Time between parcels, uniform random within [min, max]. */
  intervalMinutes: { min: 3, max: 6 },
  /** How long a parcel drifts before disappearing. */
  lifetimeSeconds: 14,
  table: [
    { kind: 'gold', weight: 40, minutes: 10 },
    { kind: 'gems', weight: 25, gems: 5 },
    { kind: 'dmg_boost', weight: 20, minutes: 10 },
    { kind: 'speed_boost', weight: 15, minutes: 10 },
  ] as GiftDef[],
};

/** Map a uniform roll in [0,1) onto the prize table. */
export function rollGift(roll: number): GiftDef {
  const total = GIFTS.table.reduce((sum, g) => sum + g.weight, 0);
  let r = Math.min(Math.max(roll, 0), 0.999999) * total;
  for (const g of GIFTS.table) {
    r -= g.weight;
    if (r < 0) return g;
  }
  return GIFTS.table[GIFTS.table.length - 1];
}

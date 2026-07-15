// The daily deal — data only. One in-game-currency bargain per UTC day,
// rotating deterministically, claimable once. Real-money prices can't be
// discounted on the stores, so the deal trades the game's own currencies
// at a friendly rate — a reason to open the shop every day.

export type DealKind = 'gems' | 'gold' | 'egg';

export interface DailyDeal {
  kind: DealKind;
  title: string;
  desc: string;
  /** gems deal: gold cost in hours of income -> gems granted. */
  goldHoursCost?: number;
  gems?: number;
  /** gold deal: gem cost -> gold granted in hours of income. */
  gemCost?: number;
  goldHours?: number;
  /** egg deal: a gold egg at this fraction of the current price. */
  eggPriceFraction?: number;
}

export const DAILY_DEALS: DailyDeal[] = [
  {
    kind: 'gems',
    title: 'GEM EXCHANGE',
    desc: 'TRADE 2H OF GOLD FOR 25 GEMS',
    goldHoursCost: 2,
    gems: 25,
  },
  {
    kind: 'gold',
    title: 'GOLD FLASH SALE',
    desc: '4H OF GOLD INCOME FOR 20 GEMS',
    gemCost: 20,
    goldHours: 4,
  },
  {
    kind: 'egg',
    title: 'HALF-PRICE EGG',
    desc: 'A GOLD EGG AT 50% OFF',
    eggPriceFraction: 0.5,
  },
];

const DAY_MS = 86_400_000;

/** Today's deal — same for everyone, rotating daily. */
export function dailyDeal(nowMs: number): DailyDeal {
  const day = Math.floor(nowMs / DAY_MS);
  return DAILY_DEALS[day % DAILY_DEALS.length];
}

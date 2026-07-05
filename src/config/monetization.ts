// IAP catalog — data only. Product IDs must match what gets created in
// App Store Connect / Play Console (and RevenueCat) at the store-readiness
// milestone. The web mock reads prices from here.
import { SKINS } from './skins';
import { SWORD_PRODUCTS } from './swordSkins';

export interface IapProduct {
  sku: string;
  priceUsd: number;
  title: string;
  /** Consumables can be bought repeatedly (gem packs, piggy cracks). */
  kind: 'consumable' | 'nonconsumable';
}

/** Premium skins: the five legendary looks, sold for real money. */
export const SKIN_PRODUCTS: IapProduct[] = SKINS.filter(
  (s) => s.unlock.type === 'iap',
).map((s) => ({
  sku: (s.unlock as { sku: string }).sku,
  priceUsd: (s.unlock as { priceUsd: number }).priceUsd,
  title: s.name,
  kind: 'nonconsumable' as const,
}));

/** Repeatable gem bundles — the core IAP revenue line. */
export interface GemPack extends IapProduct {
  gems: number;
  /** Marketing tag shown on the card, e.g. "BEST VALUE". */
  tag?: string;
}

export const GEM_PACKS: GemPack[] = [
  { sku: 'gems_fistful', priceUsd: 0.99, title: 'FISTFUL OF GEMS', gems: 80, kind: 'consumable' },
  { sku: 'gems_pouch', priceUsd: 4.99, title: 'POUCH OF GEMS', gems: 500, tag: 'POPULAR', kind: 'consumable' },
  { sku: 'gems_chest', priceUsd: 9.99, title: 'CHEST OF GEMS', gems: 1200, kind: 'consumable' },
  { sku: 'gems_hoard', priceUsd: 19.99, title: 'HOARD OF GEMS', gems: 2800, tag: 'BEST VALUE', kind: 'consumable' },
];

/** One-time starter bundle: gems + a jump-start of gold. */
export const STARTER_PACK: IapProduct & { gems: number; goldMinutes: number } = {
  sku: 'starter_pack',
  priceUsd: 0.99,
  title: 'STARTER PACK',
  gems: 120,
  /** Gold grant = this many minutes of the player's current income. */
  goldMinutes: 30,
  kind: 'nonconsumable',
};

/** Removes interstitial ad breaks. Rewarded (opt-in) ads stay. */
export const REMOVE_ADS: IapProduct = {
  sku: 'remove_ads',
  priceUsd: 4.99,
  title: 'REMOVE ADS',
  kind: 'nonconsumable',
};

/** Piggy bank: gems drip in as bosses fall; crack it open for real money. */
export const PIGGY = {
  product: {
    sku: 'piggy_crack',
    priceUsd: 2.99,
    title: 'CRACK THE PIGGY',
    kind: 'consumable',
  } as IapProduct,
  gemsPerStage: 2,
  cap: 500,
  /** The piggy can't be cracked until it holds at least this many gems. */
  minToCrack: 30,
};

/** Free chest: rewarded ad -> small gem drop, on a cooldown. */
export const FREE_CHEST = {
  gems: 5,
  cooldownHours: 6,
};

/** Interstitial ad breaks (disabled by the remove_ads purchase). */
export const INTERSTITIAL = {
  /** Show at most one per this many stage clears... */
  minStages: 3,
  /** ...and never more often than this. */
  minIntervalMinutes: 3,
  /** Grace period after boot before the first break. */
  warmupMinutes: 2,
};

/** All products, for lookup by the IAP service. */
export const ALL_PRODUCTS: IapProduct[] = [
  ...SKIN_PRODUCTS,
  ...SWORD_PRODUCTS,
  ...GEM_PACKS,
  STARTER_PACK,
  REMOVE_ADS,
  PIGGY.product,
];

export function productBySku(sku: string): IapProduct | undefined {
  return ALL_PRODUCTS.find((p) => p.sku === sku);
}

export function gemPackBySku(sku: string): GemPack | undefined {
  return GEM_PACKS.find((p) => p.sku === sku);
}

// IAP catalog — data only. Product IDs must match what gets created in
// App Store Connect / Play Console (and RevenueCat) at the store-readiness
// milestone. The web mock reads prices from here.
import { SKINS } from './skins';
import { SWORD_PRODUCTS } from './swordSkins';

export interface IapProduct {
  sku: string;
  priceUsd: number;
  title: string;
  /** Consumables repeat (gem packs); subscriptions auto-renew (membership). */
  kind: 'consumable' | 'nonconsumable' | 'subscription';
}

/** Knight's Membership — the monthly subscription (recurring revenue + a
 * daily reason to log in). On native, RevenueCat's entitlement is the source
 * of truth; the web mock and this config grant a 30-day window per purchase
 * so the perks are fully testable for free in the browser. */
export const MEMBERSHIP: IapProduct & {
  durationDays: number;
  dailyGems: number;
  offlineMultiplier: number;
  goldBonus: number;
} = {
  sku: 'knights_membership',
  priceUsd: 4.99,
  title: "KNIGHT'S MEMBERSHIP",
  kind: 'subscription',
  durationDays: 30,
  dailyGems: 50, // claimed once per day while subscribed
  offlineMultiplier: 2, // 2x offline earnings
  goldBonus: 0.25, // +25% gold, always on
};

/** Rewarded-ad gem faucet: watch an ad for gems, a few times a day. Monetises
 * the majority who never pay (ad revenue) and seeds them into the gem economy. */
export const FREE_GEMS_AD = {
  gems: 15,
  perDay: 5,
};

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
  { sku: 'gems_hoard', priceUsd: 19.99, title: 'HOARD OF GEMS', gems: 2800, kind: 'consumable' },
  { sku: 'gems_vault', priceUsd: 49.99, title: 'VAULT OF GEMS', gems: 8000, kind: 'consumable' },
  { sku: 'gems_ransom', priceUsd: 99.99, title: 'DRAGONS RANSOM', gems: 18000, tag: 'BEST VALUE', kind: 'consumable' },
];

/** Gold (coin) packs: the grant scales with the player's CURRENT income —
 * each pack is worth this many hours of gold-per-second, so a pack is
 * always meaningful whatever stage the buyer has reached. */
export interface GoldPack extends IapProduct {
  goldHours: number;
  tag?: string;
}

export const GOLD_PACKS: GoldPack[] = [
  { sku: 'coins_sack', priceUsd: 1.99, title: 'SACK OF COINS', goldHours: 2, kind: 'consumable' },
  { sku: 'coins_wagon', priceUsd: 9.99, title: 'WAGON OF COINS', goldHours: 12, tag: 'POPULAR', kind: 'consumable' },
  { sku: 'coins_treasury', priceUsd: 49.99, title: 'ROYAL TREASURY', goldHours: 72, kind: 'consumable' },
  { sku: 'coins_hoard', priceUsd: 99.99, title: 'DRAGONS HOARD', goldHours: 168, tag: 'BEST VALUE', kind: 'consumable' },
];

/** Bundles: gems + gold together, ~20% better than buying separately. */
export interface Bundle extends IapProduct {
  gems: number;
  goldHours: number;
  tag?: string;
}

export const BUNDLES: Bundle[] = [
  { sku: 'bundle_squire', priceUsd: 9.99, title: 'SQUIRES BUNDLE', gems: 700, goldHours: 8, kind: 'consumable' },
  { sku: 'bundle_knight', priceUsd: 19.99, title: 'KNIGHTS BUNDLE', gems: 1600, goldHours: 20, kind: 'consumable' },
  { sku: 'bundle_royal', priceUsd: 49.99, title: 'ROYAL BUNDLE', gems: 4500, goldHours: 60, tag: 'POPULAR', kind: 'consumable' },
  { sku: 'bundle_dragon', priceUsd: 99.99, title: 'DRAGON EMPEROR', gems: 10000, goldHours: 150, tag: 'BEST VALUE', kind: 'consumable' },
];

/** One-time starter bundle: gems + a jump-start of gold. */
export const STARTER_PACK: IapProduct & { gems: number; goldMinutes: number } = {
  sku: 'soulforge_starter_pack',
  priceUsd: 0.99,
  title: 'STARTER PACK',
  gems: 120,
  /** Gold grant = this many minutes of the player's current income. */
  goldMinutes: 30,
  kind: 'nonconsumable',
};

/** Founder's Pack: the one-time first-purchase offer shown to a player on
 * their 2nd-3rd session and only for a 48h window. Guaranteed contents (no
 * randomness — a sure-thing steal converts the first dollar best), and the
 * skin + blade are EXCLUSIVE to this pack, so it can't cannibalise the
 * premium catalogue. Non-consumable: the exclusives persist across restores. */
export const FOUNDER_PACK: IapProduct & {
  gems: number;
  skinId: string;
  swordId: string;
  /** How long the offer stays open once first shown, in hours. */
  windowHours: number;
} = {
  sku: 'founder_pack',
  priceUsd: 1.99,
  title: "FOUNDER'S PACK",
  kind: 'nonconsumable',
  gems: 300,
  skinId: 'founder',
  swordId: 'founderblade',
  windowHours: 48,
};

/** Removes interstitial ad breaks. Rewarded (opt-in) ads stay. */
export const REMOVE_ADS: IapProduct = {
  sku: 'remove_ads',
  priceUsd: 4.99,
  title: 'REMOVE ADS',
  kind: 'nonconsumable',
};

/** Golden Knight VIP: interstitials gone AND every rewarded-ad gate pays
 * out instantly, forever — raid resets, treasure, 2x offline, ad-cast
 * skills, gifts, eggs, the lot. On sale from 1.0.4 (the golden_knight
 * product exists in App Store Connect); set onSale false to pull the
 * shop card. Owners keep the perks either way. */
export const GOLDEN_KNIGHT: IapProduct & { onSale: boolean } = {
  sku: 'golden_knight',
  priceUsd: 19.99,
  title: 'GOLDEN KNIGHT',
  kind: 'nonconsumable',
  onSale: true,
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

/** The Knight's Pass premium lane — one purchase per 30-day season
 * (consumable, so next season is a fresh buy). */
export const BATTLE_PASS: IapProduct = {
  sku: 'knights_pass',
  priceUsd: 4.99,
  title: 'THE KNIGHTS PASS',
  kind: 'consumable',
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
  ...GOLD_PACKS,
  ...BUNDLES,
  STARTER_PACK,
  FOUNDER_PACK,
  MEMBERSHIP,
  REMOVE_ADS,
  GOLDEN_KNIGHT,
  PIGGY.product,
  BATTLE_PASS,
];

export function productBySku(sku: string): IapProduct | undefined {
  return ALL_PRODUCTS.find((p) => p.sku === sku);
}

export function gemPackBySku(sku: string): GemPack | undefined {
  return GEM_PACKS.find((p) => p.sku === sku);
}

export function goldPackBySku(sku: string): GoldPack | undefined {
  return GOLD_PACKS.find((p) => p.sku === sku);
}

export function bundleBySku(sku: string): Bundle | undefined {
  return BUNDLES.find((p) => p.sku === sku);
}

// IAP catalog — data only. Product IDs must match what gets created in
// App Store Connect / Play Console (and RevenueCat) at the store-readiness
// milestone. The web mock reads prices from here.
import { SKINS } from './skins';

export interface IapProduct {
  sku: string;
  priceUsd: number;
  title: string;
}

/** Premium skins: the five legendary looks, sold for real money. */
export const SKIN_PRODUCTS: IapProduct[] = SKINS.filter(
  (s) => s.unlock.type === 'iap',
).map((s) => ({
  sku: (s.unlock as { sku: string }).sku,
  priceUsd: (s.unlock as { priceUsd: number }).priceUsd,
  title: s.name,
}));

/** All products, for lookup by the IAP service. (Gem packs etc. arrive at M4.) */
export const ALL_PRODUCTS: IapProduct[] = [...SKIN_PRODUCTS];

export function productBySku(sku: string): IapProduct | undefined {
  return ALL_PRODUCTS.find((p) => p.sku === sku);
}

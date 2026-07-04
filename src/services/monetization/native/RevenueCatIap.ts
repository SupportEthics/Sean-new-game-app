import { Capacitor } from '@capacitor/core';
import { PRODUCT_CATEGORY, Purchases } from '@revenuecat/purchases-capacitor';
import { ALL_PRODUCTS, productBySku } from '../../../config/monetization';
import { revenueCatKeyFor } from '../../../config/native';
import { IapService, PurchaseResult } from '../MonetizationService';

/**
 * Real purchases via RevenueCat inside the Capacitor shells. Fulfillment
 * stays in core (GameState.fulfillProduct / grantSkin) — this service only
 * talks to the store. Until the RevenueCat API keys are configured (M6),
 * it stays dormant and purchases fail with a friendly message, so internal
 * test builds never crash.
 */
export class RevenueCatIap implements IapService {
  readonly isMock = false;
  private configured = false;
  /** Localized price strings cached at init so getPriceLabel stays sync. */
  private prices = new Map<string, string>();

  async init(): Promise<void> {
    const apiKey = revenueCatKeyFor(Capacitor.getPlatform());
    if (!apiKey) {
      console.warn('RevenueCat keys not set; store purchases disabled in this build');
      return;
    }
    try {
      await Purchases.configure({ apiKey });
      const { products } = await Purchases.getProducts({
        productIdentifiers: ALL_PRODUCTS.map((p) => p.sku),
        type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      });
      products.forEach((p) => this.prices.set(p.identifier, p.priceString));
      this.configured = true;
    } catch (e) {
      console.warn('RevenueCat init failed', e);
    }
  }

  getPriceLabel(sku: string): string {
    const cached = this.prices.get(sku);
    if (cached) return cached;
    const product = productBySku(sku);
    return product ? `$${product.priceUsd.toFixed(2)}` : '?';
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    if (!this.configured) {
      return { success: false, error: 'Store not connected in this build' };
    }
    try {
      const { products } = await Purchases.getProducts({
        productIdentifiers: [sku],
        type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      });
      if (products.length === 0) return { success: false, error: 'Product not found' };
      await Purchases.purchaseStoreProduct({ product: products[0] });
      return { success: true };
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (err.userCancelled) return { success: false }; // silent: their choice
      return { success: false, error: err.message ?? 'Purchase failed' };
    }
  }

  async restore(): Promise<string[]> {
    if (!this.configured) return [];
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      return [...customerInfo.allPurchasedProductIdentifiers];
    } catch {
      return [];
    }
  }
}

import { productBySku } from '../../config/monetization';
import { IapService, PurchaseResult } from './MonetizationService';

const STORAGE_KEY = 'pawsblades_mock_purchases';

/**
 * Browser/dev implementation: purchases always succeed after a short delay
 * and persist to localStorage so "restore purchases" can be exercised.
 * Replaced by the RevenueCat implementation inside the native shells.
 */
export class WebMockIap implements IapService {
  readonly isMock = true;

  getPriceLabel(sku: string): string {
    const product = productBySku(sku);
    return product ? `$${product.priceUsd.toFixed(2)}` : '?';
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    const product = productBySku(sku);
    if (!product) return { success: false, error: 'Unknown product' };
    await new Promise((r) => setTimeout(r, 400)); // simulated store roundtrip
    // Consumables can be bought again and again; only non-consumables are
    // remembered for the restore flow.
    if (product.kind === 'nonconsumable') {
      const owned = await this.restore();
      if (!owned.includes(sku)) {
        owned.push(sku);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(owned));
        } catch {
          /* storage unavailable */
        }
      }
    }
    return { success: true };
  }

  async restore(): Promise<string[]> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  }
}

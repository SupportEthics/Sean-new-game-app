// Ads/IAP live behind interfaces so the game stays fully playable and
// testable in a plain browser. Native implementations (RevenueCat/AdMob)
// arrive at the Capacitor milestone; grant logic always stays in core.

export interface PurchaseResult {
  success: boolean;
  /** Set when success=false and worth telling the user about. */
  error?: string;
}

export interface IapService {
  /** Localized display price, e.g. "$4.99". */
  getPriceLabel(sku: string): string;
  purchase(sku: string): Promise<PurchaseResult>;
  /** Previously purchased non-consumable SKUs (App Store restore flow). */
  restore(): Promise<string[]>;
  readonly isMock: boolean;
}

// Promo / redeem codes — data only. Codes are matched after normalising
// (uppercased, non-alphanumerics stripped) so dashes and spaces are optional
// when typing. Each code is one-time per save (tracked in GameState).
//
// `unlockAll` is the owner/tester master key: it grants every paid
// entitlement + all premium cosmetics + a decade of membership, so Sean can
// experience the whole game for free without touching the App Store.

export interface PromoReward {
  /** Owner unlock: all paid services + all premium skins/swords. */
  unlockAll?: boolean;
  gems?: number;
  /** Prestige currency for the Soul Relics tree. */
  souls?: number;
  /** Hours of the player's current gold income. */
  goldHours?: number;
  /** Days of Knight's Membership granted. */
  membershipDays?: number;
}

/** Keys are the NORMALISED code (A-Z0-9 only). Give players the pretty
 * dashed version; redeemCode() strips the dashes before matching. */
export const PROMO_CODES: Record<string, PromoReward> = {
  // Sean's personal master code — pretty form: SEAN-VIP-9K2X7M
  SEANVIP9K2X7M: { unlockAll: true },
  // Sean's currency top-up (redeemable once on saves that already used
  // the master code before it paid 10M) — pretty form: SEAN-GEM-7Q4WPX
  SEANGEM7Q4WPX: { gems: 10_000_000, souls: 10_000_000 },
};

/** Strip everything but letters/digits and uppercase, so "sean-vip-9k2x7m"
 * and "SEAN VIP 9K2X7M" both match the stored key. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Sword skins — data only. The hero's orbiting blades can wear any of the
// 25 built-in designs (unlocked by reaching that merge tier), or one of the
// premium real-money weapons (Sean's request: a scythe + 2 more cool ones).
// 'auto' means the classic behaviour: each blade shows its own tier's art.

import { GEAR, TIER_NAMES, weaponFrame } from './gear';
import type { IapProduct } from './monetization'; // type-only: avoids a runtime import cycle

export interface PremiumSword {
  id: string;
  name: string;
  desc: string;
  sku: string;
  priceUsd: number;
  /** Frame in the gear sheet (drawn after the 25 tier blades). */
  frame: number;
  /** Blade glow tint in the arena. */
  aura: number;
}

export const PREMIUM_SWORDS: readonly PremiumSword[] = [
  {
    id: 'scythe',
    name: 'Reaper Scythe',
    desc: 'HARVEST YOUR FOES',
    sku: 'sword_scythe',
    priceUsd: 4.99,
    frame: GEAR.weaponArtCount,
    aura: 0x8aff8a,
  },
  {
    id: 'voidkatana',
    name: 'Void Katana',
    desc: 'A CUT THROUGH REALITY',
    sku: 'sword_voidkatana',
    priceUsd: 4.99,
    frame: GEAR.weaponArtCount + 1,
    aura: 0xe86aff,
  },
  {
    id: 'dragoncleaver',
    name: 'Dragonfang Cleaver',
    desc: 'TORN FROM A DRAGONS JAW',
    sku: 'sword_dragoncleaver',
    priceUsd: 4.99,
    frame: GEAR.weaponArtCount + 2,
    aura: 0xff9a3c,
  },
] as const;

export const SWORD_PRODUCTS: IapProduct[] = PREMIUM_SWORDS.map((s) => ({
  sku: s.sku,
  priceUsd: s.priceUsd,
  title: s.name,
  kind: 'nonconsumable' as const,
}));

export function premiumSwordById(id: string): PremiumSword | undefined {
  return PREMIUM_SWORDS.find((s) => s.id === id);
}

export function premiumSwordBySku(sku: string): PremiumSword | undefined {
  return PREMIUM_SWORDS.find((s) => s.sku === sku);
}

/** Skin keys: 'auto', 'tier-<n>' (1..weaponArtCount) or 'premium-<id>'. */
export function tierSkinKey(tier: number): string {
  return `tier-${tier}`;
}

export function premiumSkinKey(id: string): string {
  return `premium-${id}`;
}

export function swordSkinName(key: string): string {
  if (key.startsWith('tier-')) return TIER_NAMES[Number(key.slice(5)) - 1] ?? key;
  if (key.startsWith('premium-')) return premiumSwordById(key.slice(8))?.name ?? key;
  return 'Tier Art';
}

/** The gear-sheet frame a blade should wear under this skin. */
export function swordSkinFrame(key: string, tier: number): number {
  if (key.startsWith('tier-')) {
    const n = Number(key.slice(5));
    if (Number.isInteger(n) && n >= 1 && n <= GEAR.weaponArtCount) return n - 1;
  }
  if (key.startsWith('premium-')) {
    const sword = premiumSwordById(key.slice(8));
    if (sword) return sword.frame;
  }
  return weaponFrame(tier); // 'auto' (and any bad key)
}

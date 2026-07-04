// Typed access to the skin catalog. The JSON is the single source of truth,
// shared with scripts/generate-assets.mjs which renders one sheet per skin.
import skinsJson from './skins.json';

export type SkinRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type SkinUnlock =
  | { type: 'free' }
  | { type: 'gold'; amount: number }
  | { type: 'gems'; amount: number }
  | { type: 'stage'; stage: number }
  | { type: 'iap'; sku: string; priceUsd: number };

export interface SkinArt {
  armor: [string, string, string];
  trim: [string, string];
  cape: [string, string] | null;
  plume: 'plume' | 'mohawk' | 'crown' | 'hood' | 'none';
  plumeColor: [string, string];
  visor: string;
  aura: string | null;
}

export interface SkinDef {
  id: string;
  name: string;
  rarity: SkinRarity;
  unlock: SkinUnlock;
  dpsBonus: number;
  art: SkinArt;
}

export const SKINS: SkinDef[] = skinsJson.skins as SkinDef[];

export const DEFAULT_SKIN = 'squire';

export function skinById(id: string): SkinDef | undefined {
  return SKINS.find((s) => s.id === id);
}

export const RARITY_COLORS: Record<SkinRarity, number> = {
  common: 0x9a8d6e,
  rare: 0x4ec3e8,
  epic: 0x9b7ede,
  legendary: 0xffd166,
};

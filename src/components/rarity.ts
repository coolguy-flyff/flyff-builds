import type { Rarity } from '@/data';

const RARITY_CLASS: Record<Rarity, string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  veryrare: 'text-rarity-unique',
  unique: 'text-rarity-unique',
  ultimate: 'text-rarity-ultimate',
};

/** Tailwind text colour class for an item rarity (plan D1). */
export function rarityClassName(rarity: Rarity): string {
  return RARITY_CLASS[rarity];
}

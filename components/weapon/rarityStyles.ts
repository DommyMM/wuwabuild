import { WeaponRarity } from '@/lib/weapon';

export interface RarityAccentStyle {
  border: string;
  bg: string;
  text: string;
}

// Shared rarity accents for weapon surfaces and values.
export const RARITY_ACCENTS: Record<WeaponRarity, RarityAccentStyle> = {
  '5-star': { border: 'border-amber-400', bg: 'bg-amber-400/20', text: 'text-amber-300' },
  '4-star': { border: 'border-purple-400', bg: 'bg-purple-400/20', text: 'text-purple-300' },
  '3-star': { border: 'border-blue-400', bg: 'bg-blue-400/20', text: 'text-blue-300' },
  '2-star': { border: 'border-green-400', bg: 'bg-green-400/20', text: 'text-green-300' },
  '1-star': { border: 'border-gray-400', bg: 'bg-gray-400/20', text: 'text-gray-300' },
};

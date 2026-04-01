import { WeaponRarity } from '@/lib/weapon';

interface RarityAccentStyle {
  border: string;
  bg: string;
  text: string;
}

// Shared rarity accents for weapon surfaces and values.
export const RARITY_ACCENTS: Record<WeaponRarity, RarityAccentStyle> = {
  '5-star': { border: 'border-rarity-5/38', bg: 'bg-rarity-5/8', text: 'text-rarity-5/90' },
  '4-star': { border: 'border-rarity-4/38', bg: 'bg-rarity-4/8', text: 'text-rarity-4/90' },
  '3-star': { border: 'border-blue-300/30', bg: 'bg-blue-300/6', text: 'text-blue-200/85' },
  '2-star': { border: 'border-green-300/28', bg: 'bg-green-300/6', text: 'text-green-200/85' },
  '1-star': { border: 'border-gray-300/28', bg: 'bg-gray-300/6', text: 'text-gray-200/85' },
};

import { StatName } from '@/lib/constants/statMappings';

/**
 * Maps set names to their 2-piece bonus stat
 */
export const SET_TO_STAT: Record<string, StatName> = {
  'Sierra Gale': 'Aero DMG',
  'Moonlit Clouds': 'Energy Regen',
  'Void Thunder': 'Electro DMG',
  'Celestial Light': 'Spectro DMG',
  'Freezing Frost': 'Glacio DMG',
  'Lingering Tunes': 'ATK%',
  'Molten Rift': 'Fusion DMG',
  'Sun-sinking Eclipse': 'Havoc DMG',
  'Rejuvenating Glow': 'Healing Bonus',
  'Midnight Veil': 'Havoc DMG',
  'Empyrean Anthem': 'Energy Regen',
  'Tidebreaking Courage': 'Energy Regen',
  'Frosty Resolve': 'Resonance Skill DMG Bonus',
  'Eternal Radiance': 'Spectro DMG',
  'Gusts of Welkin': 'Aero DMG',
  'Windward Pilgrimage': 'Aero DMG',
  'Flaming Clawprint': 'Fusion DMG',
  'Pact of Neonlight Leap': 'Spectro DMG',
  'Halo of Starry Radiance': 'Healing Bonus',
  'Rite of Gilded Revelation': 'Spectro DMG',
  'Trailblazing Star': 'Fusion DMG',
  'Chromatic Foam': 'Fusion DMG',
  'Sound of True Name': 'Aero DMG'
} as const;

/**
 * Default set bonus value (10% for most stats)
 */
export const DEFAULT_SET_BONUS_VALUE = 10;

/**
 * Special set bonus values that differ from the default
 */
export const SPECIAL_SET_BONUS_VALUES: Record<string, number> = {
  'Frosty Resolve': 12 // Frosty Resolve gives 12% Resonance Skill DMG Bonus instead of 10%
};

/**
 * Get the stat bonus for a set at a given piece count
 */
export const getSetBonus = (setName: string, pieceCount: number): { stat: StatName; value: number } | null => {
  const stat = SET_TO_STAT[setName];
  if (!stat) return null;

  // Only 2-piece bonuses are tracked for stat calculation
  if (pieceCount < 2) return null;

  const value = SPECIAL_SET_BONUS_VALUES[setName] ?? DEFAULT_SET_BONUS_VALUE;
  return { stat, value };
};


import { ElementType } from '@/types/echo';
import { StatName } from '@/types/stats';

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
 * Maps element types to their set names
 */
export const ELEMENT_TO_SET: Record<ElementType, string> = {
  'Aero': 'Sierra Gale',
  'ER': 'Moonlit Clouds',
  'Electro': 'Void Thunder',
  'Spectro': 'Celestial Light',
  'Glacio': 'Freezing Frost',
  'Attack': 'Lingering Tunes',
  'Fusion': 'Molten Rift',
  'Havoc': 'Havoc Eclipse',
  'Healing': 'Rejuvenating Glow',
  'Empyrean': 'Empyrean Anthem',
  'Frosty': 'Frosty Resolve',
  'Midnight': 'Midnight Veil',
  'Radiance': 'Eternal Radiance',
  'Tidebreaking': 'Tidebreaking Courage',
  'Gust': 'Gusts of Welkin',
  'Windward': 'Windward Pilgrimage',
  'Flaming': 'Flaming Clawprint',
  'Dream': 'Dream of the Lost',
  'Crown': 'Crown of Valor',
  'Law': 'Law of Harmony',
  'Flamewing': 'Flamewing\'s Shadow',
  'Thread': 'Thread of Severed Fate',
  'Pact': 'Pact of Neonlight Leap',
  'Halo': 'Halo of Starry Radiance',
  'Rite': 'Rite of Gilded Revelation',
  'Trailblazing': 'Trailblazing Star',
  'Chromatic': 'Chromatic Foam',
  'Sound': 'Sound of True Name'
};

/**
 * Sets that only support 3-piece bonuses (exceptions to the default 2/5 piece)
 */
export const THREE_PIECE_SETS: readonly ElementType[] = [
  'Dream',
  'Crown',
  'Law',
  'Flamewing',
  'Thread'
] as const;

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
 * Get the piece counts available for a given element type
 */
export const getSetPieceCounts = (element: ElementType): number[] => {
  return THREE_PIECE_SETS.includes(element) ? [3] : [2, 5];
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

/**
 * Check if an element type uses 3-piece sets only
 */
export const isThreePieceSet = (element: ElementType): boolean => {
  return THREE_PIECE_SETS.includes(element);
};

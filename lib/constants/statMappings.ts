export type BaseStatName = 'HP' | 'ATK' | 'DEF';

export type StatName =
  | BaseStatName
  | `${BaseStatName}%`
  | 'Crit Rate' | 'Crit DMG'
  | 'Energy Regen'
  | 'Basic Attack' | 'Basic Attack DMG Bonus'
  | 'Heavy Attack' | 'Heavy Attack DMG Bonus'
  | 'Skill' | 'Resonance Skill DMG Bonus'
  | 'Liberation' | 'Resonance Liberation DMG Bonus'
  | 'Aero DMG' | 'Glacio DMG' | 'Fusion DMG'
  | 'Electro DMG' | 'Havoc DMG' | 'Spectro DMG'
  | 'Healing Bonus';

// Get percent variant of a base stat
export const getPercentVariant = (stat: BaseStatName): StatName =>
  `${stat}%` as StatName;

// Check if a stat is a percent stat
export const isPercentStat = (stat: string): boolean => {
  return !(['HP', 'ATK', 'DEF'] as const).includes(stat as BaseStatName);
};

export const BASE_STATS = ['HP', 'ATK', 'DEF'] as const;
export type BaseStatName = typeof BASE_STATS[number];

export type BasePercentStatName = `${BaseStatName}%`;
export const BASE_PERCENT_STATS = BASE_STATS.map((stat) => `${stat}%`) as readonly BasePercentStatName[];

export const ELEMENTAL_DMG_STATS = [
  'Aero DMG',
  'Glacio DMG',
  'Fusion DMG',
  'Electro DMG',
  'Havoc DMG',
  'Spectro DMG',
] as const;
export type ElementalDmgStatName = typeof ELEMENTAL_DMG_STATS[number];

export type StatName =
  | BaseStatName
  | BasePercentStatName
  | 'Crit Rate' | 'Crit DMG'
  | 'Energy Regen'
  | 'Basic Attack' | 'Basic Attack DMG Bonus'
  | 'Heavy Attack' | 'Heavy Attack DMG Bonus'
  | 'Skill' | 'Resonance Skill DMG Bonus'
  | 'Liberation' | 'Resonance Liberation DMG Bonus'
  | ElementalDmgStatName
  | 'Healing Bonus';

// Get percent variant of a base stat
export const getPercentVariant = (stat: BaseStatName): StatName =>
  `${stat}%` as StatName;

// Check if a stat is a percent stat
export const isPercentStat = (stat: string): boolean => {
  return !BASE_STATS.includes(stat as BaseStatName);
};

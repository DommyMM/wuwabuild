export const BASE_STATS = ['HP', 'ATK', 'DEF'] as const;
export type BaseStatName = typeof BASE_STATS[number];

export type BasePercentStatName = `${BaseStatName}%`;

export type ElementalDmgStatName =
  | 'Aero DMG'
  | 'Glacio DMG'
  | 'Fusion DMG'
  | 'Electro DMG'
  | 'Havoc DMG'
  | 'Spectro DMG';

export type StatName =
  | BaseStatName
  | BasePercentStatName
  | 'Crit Rate' | 'Crit DMG'
  | 'Energy Regen'
  | 'Basic Attack DMG Bonus'
  | 'Heavy Attack DMG Bonus'
  | 'Resonance Skill DMG Bonus'
  | 'Resonance Liberation DMG Bonus'
  | ElementalDmgStatName
  | 'Healing Bonus';

/** Stats the calculation engine computes display values for */
export const CALCULABLE_STATS = [
  'HP', 'ATK', 'DEF',
  'Crit Rate', 'Crit DMG', 'Energy Regen',
  'Aero DMG', 'Glacio DMG', 'Fusion DMG', 'Electro DMG', 'Havoc DMG', 'Spectro DMG',
  'Basic Attack DMG Bonus', 'Heavy Attack DMG Bonus',
  'Resonance Skill DMG Bonus', 'Resonance Liberation DMG Bonus',
  'Healing Bonus',
] as const satisfies readonly StatName[];

export const getPercentVariant = (stat: BaseStatName): StatName =>
  `${stat}%` as StatName;

export const isPercentStat = (stat: string): boolean => {
  return !BASE_STATS.includes(stat as BaseStatName);
};

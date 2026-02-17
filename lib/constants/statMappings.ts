import { StatName, BaseStatName } from '@/types/stats';

/**
 * Order of stats for display purposes
 */
export const STAT_ORDER = [
  'Crit Rate',
  'Crit DMG',
  'ATK%',
  'ATK',
  'HP%',
  'HP',
  'DEF%',
  'DEF',
  'Energy Regen',
  'Aero DMG',
  'Glacio DMG',
  'Fusion DMG',
  'Electro DMG',
  'Havoc DMG',
  'Spectro DMG',
  'Basic Attack DMG Bonus',
  'Heavy Attack DMG Bonus',
  'Resonance Skill DMG Bonus',
  'Resonance Liberation DMG Bonus',
  'Healing Bonus'
] as const;

/**
 * Abbreviated stat names for compression and display
 */
export const STAT_ABBREV: Record<string, string> = {
  'HP': 'HP',
  'HP%': 'HP%',
  'ATK': 'ATK',
  'ATK%': 'ATK%',
  'DEF': 'DEF',
  'DEF%': 'DEF%',
  'Crit Rate': 'Crit Rate',
  'Crit DMG': 'Crit DMG',
  'Energy Regen': 'Energy Regen',
  'Aero DMG': 'Aero DMG',
  'Glacio DMG': 'Glacio DMG',
  'Fusion DMG': 'Fusion DMG',
  'Electro DMG': 'Electro DMG',
  'Havoc DMG': 'Havoc DMG',
  'Spectro DMG': 'Spectro DMG',
  'Basic Attack DMG Bonus': 'Basic ATK DMG',
  'Heavy Attack DMG Bonus': 'Heavy ATK DMG',
  'Resonance Skill DMG Bonus': 'Skill DMG',
  'Resonance Liberation DMG Bonus': 'Liberation DMG',
  'Healing Bonus': 'Healing Bonus'
};

/**
 * Stat name compression map for storage
 */
export const STAT_MAP = {
  "HP": "H",
  "HP%": "H%",
  "ATK": "A",
  "ATK%": "A%",
  "DEF": "D",
  "DEF%": "D%",
  "Crit Rate": "CR",
  "Crit DMG": "CD",
  "Aero DMG": "AD",
  "Glacio DMG": "GD",
  "Fusion DMG": "FD",
  "Electro DMG": "ED",
  "Havoc DMG": "HD",
  "Spectro DMG": "SD",
  "Basic Attack DMG Bonus": "BA",
  "Heavy Attack DMG Bonus": "HA",
  "Resonance Liberation DMG Bonus": "RL",
  "Resonance Skill DMG Bonus": "RS",
  "Energy Regen": "ER",
  "Healing Bonus": "HB"
} as const;

/**
 * Reverse stat map for decompression
 */
export const REVERSE_STAT_MAP = Object.entries(STAT_MAP).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {} as Record<string, string>
);

/**
 * CDN file names for stat icons
 */
export const STAT_CDN_NAMES: Record<string, string> = {
  'HP': 'greenlife',
  'ATK': 'redattack',
  'DEF': 'greendefense',
  'ER': 'greenenergy',
  'Crit Rate': 'redbaoji',
  'Crit DMG': 'redcrit',
  'Basic': 'redphysics',
  'Heavy': 'redfoco',
  'Skill': 'redspeed',
  'Liberation': 'redskill',
  'Aero': 'redwind',
  'Glacio': 'redice',
  'Fusion': 'redhot',
  'Electro': 'redmine',
  'Havoc': 'reddark',
  'Spectro': 'redlight',
  'Healing': 'greencure'
};

/**
 * Map short stat names to icon names
 */
export const getStatIconName = (statName: string | null): string => {
  if (!statName) return 'ATK';

  const statMap: Record<string, string> = {
    'HP': 'HP',
    'HP%': 'HP',
    'ATK': 'ATK',
    'ATK%': 'ATK',
    'DEF': 'DEF',
    'DEF%': 'DEF',
    'Crit Rate': 'Crit Rate',
    'Crit DMG': 'Crit DMG',
    'Energy Regen': 'ER',
    'Basic Attack': 'Basic',
    'Basic Attack DMG Bonus': 'Basic',
    'Heavy Attack': 'Heavy',
    'Heavy Attack DMG Bonus': 'Heavy',
    'Skill': 'Skill',
    'Resonance Skill DMG Bonus': 'Skill',
    'Liberation': 'Liberation',
    'Resonance Liberation DMG Bonus': 'Liberation',
    'Aero DMG': 'Aero',
    'Glacio DMG': 'Glacio',
    'Fusion DMG': 'Fusion',
    'Electro DMG': 'Electro',
    'Havoc DMG': 'Havoc',
    'Spectro DMG': 'Spectro',
    'Healing Bonus': 'Healing'
  };
  return statMap[statName] || 'ATK';
};

/**
 * Get display name for short stat names
 */
export const getDisplayName = (stat: StatName): StatName => {
  switch (stat) {
    case 'Basic Attack': return 'Basic Attack DMG Bonus';
    case 'Heavy Attack': return 'Heavy Attack DMG Bonus';
    case 'Skill': return 'Resonance Skill DMG Bonus';
    case 'Liberation': return 'Resonance Liberation DMG Bonus';
    default: return stat;
  }
};

/**
 * Get percent variant of a base stat
 */
export const getPercentVariant = (stat: BaseStatName): StatName =>
  `${stat}%` as StatName;

/**
 * Check if a stat is a percent stat
 */
export const isPercentStat = (stat: string): boolean => {
  return stat.endsWith('%') || [
    'Crit Rate',
    'Crit DMG',
    'Energy Regen',
    'Aero DMG',
    'Glacio DMG',
    'Fusion DMG',
    'Electro DMG',
    'Havoc DMG',
    'Spectro DMG',
    'Basic Attack DMG Bonus',
    'Heavy Attack DMG Bonus',
    'Resonance Skill DMG Bonus',
    'Resonance Liberation DMG Bonus',
    'Healing Bonus'
  ].includes(stat);
};

/**
 * Check if a stat is a base stat (HP, ATK, DEF)
 */
export const isBaseStat = (stat: string): stat is BaseStatName => {
  return ['HP', 'ATK', 'DEF'].includes(stat);
};

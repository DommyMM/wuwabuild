// ─── Types (moved from types/stats.ts) ───────────────────────────────────────

export interface StatValue {
  type: string | null;
  value: number | null;
}

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

export interface StatsState {
  mainStat: StatValue;
  subStats: StatValue[];
}

export interface MainStatData {
  [key: string]: {
    mainStats: {
      [statName: string]: [number, number];
    };
  };
}

export interface SubstatData {
  [statName: string]: number[];
}

export interface SubstatsListProps {
  substatsData: SubstatData | null;
  stats: StatValue[];
  panelId: string;
  isStatAvailable: (panelId: string, stat: string, currentStat?: string | null) => boolean;
  onChange: (index: number, type: string | null, value: number | null) => void;
}

export interface PanelSelections {
  [panelId: string]: Set<string>;
}

// ─── Constants & helpers ──────────────────────────────────────────────────────

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

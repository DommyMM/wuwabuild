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

export const getPercentVariant = (stat: BaseStatName): StatName => 
  `${stat}%` as StatName;

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
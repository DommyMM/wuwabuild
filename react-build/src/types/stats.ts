export interface StatValue {
  type: string | null;
  value: number | null;
}

export type StatName = 
  | 'HP' | 'HP%' 
  | 'ATK' | 'ATK%' 
  | 'DEF' | 'DEF%'
  | 'Crit Rate' | 'Crit Damage' | 'Crit DMG'
  | 'Basic Attack' | 'Heavy Attack' | 'Skill'
  | 'Liberation' | 'Energy Regen'
  | 'Aero DMG' | 'Glacio DMG' | 'Fusion DMG'
  | 'Electro DMG' | 'Havoc DMG' | 'Spectro DMG'
  | 'Healing Bonus';

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
    'Crit Damage': 'Crit DMG',
    'Crit DMG': 'Crit DMG',
    'Basic Attack': 'Basic',
    'Heavy Attack': 'Heavy',
    'Skill': 'Skill',
    'Liberation': 'Liberation',
    'Energy Regen': 'ER',
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
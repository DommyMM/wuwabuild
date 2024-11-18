export interface StatValue {
  type: string | null;
  value: number | null;
}

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
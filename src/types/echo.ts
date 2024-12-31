export interface Echo {
  name: string;
  cost: number;
  elements: ElementType[];
}

export type EchoPanel = {
  index: number;
  echo: Echo | null;
};

export interface EchoPanelState {
  echo: Echo | null;
  level: number;
  selectedElement: ElementType | null;
  stats: {
    mainStat: { type: string | null; value: number | null };
    subStats: Array<{ type: string | null; value: number | null }>;
  };
}

export interface SetInfo {
  element: ElementType;
  count: number;
}

export interface SetRowProps {
  element: ElementType;
  count: number;
}

export interface SetSectionProps {
  sets: SetInfo[];
}

export const ELEMENT_SETS = {
  'Aero': 'Sierra Gale',
  'ER': 'Moonlit Clouds',
  'Electro': 'Void Thunder',
  'Spectro': 'Celestial Light',
  'Glacio': 'Freezing Frost',
  'Attack': 'Lingering Tunes', 
  'Fusion': 'Molten Rift',
  'Havoc': 'Sun-sinking Eclipse',
  'Healing': 'Rejuvenating Glow'
} as const;

export const COST_SECTIONS = [4, 3, 1] as const;
export type CostSection = typeof COST_SECTIONS[number];
export type ElementType = 'Aero' | 'ER' | 'Electro' | 'Spectro' | 'Glacio' | 'Attack' | 'Fusion' | 'Havoc' | 'Healing';
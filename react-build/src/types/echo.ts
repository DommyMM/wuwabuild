type ElementType = 'Aero' | 'ER' | 'Electro' | 'Spectro' | 'Glacio' | 'Attack' | 'Fusion' | 'Havoc' | 'Healing';

export interface Echo {
  name: string;
  cost: number;
  elements: ElementType[];
}

export type EchoPanel = {
  index: number;
  echo: Echo | null;
};

export const COST_SECTIONS = [4, 3, 1] as const;
export type CostSection = typeof COST_SECTIONS[number];
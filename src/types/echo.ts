import { StatName } from './stats';

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
  phantom: boolean;
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
  'Havoc': 'Havoc Eclipse',
  'Healing': 'Rejuvenating Glow',
  'Empyrean': 'Empyrean Anthem',
  'Frosty': 'Frosty Resolve',
  'Midnight': 'Midnight Veil',
  'Radiance': 'Eternal Radiance',
  'Tidebreaking': 'Tidebreaking Courage'
} as const;

export const COST_SECTIONS = [4, 3, 1] as const;
export type CostSection = typeof COST_SECTIONS[number];
export type ElementType = 'Aero' | 'ER' | 'Electro' | 'Spectro' | 'Glacio' | 
'Attack' | 'Fusion' | 'Havoc' | 'Healing' | 'Empyrean' | 
'Frosty' | 'Midnight' | 'Radiance' | 'Tidebreaking';

interface EchoBonus {
  stat: StatName;
  value: number;
}

export const ECHO_BONUSES: Readonly<Record<string, ReadonlyArray<EchoBonus>>> = {
  'Lorelei': [
    { stat: 'Havoc DMG', value: 12 },
    { stat: 'Resonance Liberation DMG Bonus', value: 12 }
  ],
  'Sentry Construct': [
    { stat: 'Glacio DMG', value: 12 },
    { stat: 'Resonance Skill DMG Bonus', value: 12 }
  ],
  'Dragon of Dirge': [
    { stat: 'Fusion DMG', value: 12 },
    { stat: 'Basic Attack DMG Bonus', value: 12 }
  ],
'Nightmare Feilian Beringal': [
    { stat: 'Aero DMG', value: 12 },
    { stat: 'Heavy Attack DMG Bonus', value: 12 }
  ],
  'Nightmare Impermanence Heron': [
    { stat: 'Havoc DMG', value: 12 },
    { stat: 'Heavy Attack DMG Bonus', value: 12 }
  ],
  'Nightmare Thundering Mephis': [
    { stat: 'Electro DMG', value: 12 },
    { stat: 'Resonance Liberation DMG Bonus', value: 12 }
  ],
  'Nightmare Tempest Mephis': [
    { stat: 'Electro DMG', value: 12 },
    { stat: 'Resonance Skill DMG Bonus', value: 12 }
  ],
  'Nightmare Crownless': [
    { stat: 'Havoc DMG', value: 12 },
    { stat: 'Basic Attack DMG Bonus', value: 12 }
  ],
  'Nightmare Inferno Rider': [
    { stat: 'Fusion DMG', value: 12 },
    { stat: 'Resonance Skill DMG Bonus', value: 12 }
  ]
} as const;

export const PHANTOM_ECHOES = [
  'Clang Bang',
  'Diggy Duggy',
  'Dreamless',
  'Feilian Beringal',
  'Gulpuff',
  'Hoartoise',
  'Impermanence Heron',
  'Inferno Rider',
  'Lightcrusher',
  'Lumiscale Construct',
  'Mourning Aix',
  'Questless Knight',
  'Rocksteady Guardian',
  'Sentry Construct',
  'Thundering Mephis',
  'Vitreum Dancer'
] as readonly string[];
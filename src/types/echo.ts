import { StatName } from './stats';

export interface Echo {
  name: string;
  id: string;
  cost: number;
  elements: ElementType[];
}

export type EchoPanel = {
  index: number;
  id: string | null;
};

export interface EchoPanelState {
  id: string | null;
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
  'Tidebreaking': 'Tidebreaking Courage',
  'Gust': 'Gusts of Welkin',
  'Windward': 'Windward Pilgrimage',
  'Flaming': 'Flaming Clawprint',
  'Dream': 'Dream of the Lost',
  'Crown': 'Crown of Valor',
  'Law': 'Law of Harmony',
  'Flamewing': 'Flamewing\'s Shadow',
  'Thread': 'Thread of Severed Fate',
  'Pact': 'Pact of Neonlight Leap',
  'Halo': 'Halo of Starry Radiance',
  'Rite': 'Rite of Gilded Revelation',
  'Trailblazing': 'Trailblazing Star',
  'Chromatic': 'Chromatic Foam',
  'Sound': 'Sound of True Name'
} as const;

export const COST_SECTIONS = [4, 3, 1] as const;
export type CostSection = typeof COST_SECTIONS[number];
export type ElementType = 'Aero' | 'ER' | 'Electro' | 'Spectro' | 'Glacio' |
  'Attack' | 'Fusion' | 'Havoc' | 'Healing' | 'Empyrean' | 'Frosty' | 'Midnight' |
  'Radiance' | 'Tidebreaking' | 'Gust' | 'Windward' | 'Flaming' | 'Dream' | 'Crown' | 'Law' | 'Flamewing' |
  'Thread' | 'Pact' | 'Halo' | 'Rite' | 'Trailblazing' | 'Chromatic' | 'Sound';

// Configuration for echo sets that only support 3-piece (exceptions to the default 2,5)
export const THREE_PIECE_SETS: readonly ElementType[] = ['Dream', 'Crown', 'Law', 'Flamewing', 'Thread'] as const;

// Helper function to get piece counts for an element
export const getEchoPieceCounts = (element: ElementType): number[] => {
  return THREE_PIECE_SETS.includes(element) ? [3] : [2, 5];
};

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
  ],
  'Nightmare Lampylumen Myriad': [
    { stat: 'Glacio DMG', value: 12 }
  ],
  ['Capitaneus']: [
    { stat: 'Spectro DMG', value: 12 },
    { stat: 'Heavy Attack DMG Bonus', value: 12 }
  ],
  ['Fleurdelys']: [
    { stat: 'Aero DMG', value: 10 }
  ],
  ['Kerasaur']: [
    { stat: 'Aero DMG', value: 12 },
    { stat: 'Resonance Liberation DMG Bonus', value: 12 }
  ],
  ['Nightmare Kelpie']: [
    { stat: 'Glacio DMG', value: 12 },
    { stat: 'Aero DMG', value: 12 }
  ],
  ['Lioness of Glory']: [
    { stat: 'Fusion DMG', value: 12 },
    { stat: 'Resonance Liberation DMG Bonus', value: 12 }
  ],
  ['Fenrico']: [
    { stat: 'Aero DMG', value: 12 },
    { stat: 'Heavy Attack DMG Bonus', value: 12 }
  ],
  'Nightmare Hecate': [
    { stat: 'Havoc DMG', value: 12 }
  ],
  'Corrosaurus': [
    { stat: 'Fusion DMG', value: 12 }
  ],
  'The False Sovereign': [
    { stat: 'Electro DMG', value: 12 },
    { stat: 'Heavy Attack DMG Bonus', value: 12 }
  ],
  'Lady of the Sea': [
    { stat: 'Aero DMG', value: 12 },
    { stat: 'Resonance Liberation DMG Bonus', value: 12 }
  ],
  'Threnodian - Leviathan': [
    { stat: 'Havoc DMG', value: 12 },
    { stat: 'Resonance Liberation DMG Bonus', value: 12 }
  ],
  'Twin Nova Nebulous Cannon': [
    { stat: 'Spectro DMG', value: 12 },
    { stat: 'Basic Attack DMG Bonus', value: 12 }
  ],
  'Twin Nova Collapsar Blade': [
    { stat: 'Electro DMG', value: 12 },
    { stat: 'Basic Attack DMG Bonus', value: 12 }
  ],
  'Reactor Husk': [
    { stat: 'Energy Regen', value: 10 }
  ],
  'Nameless Explorer': [
    { stat: 'Aero DMG', value: 12 }
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
  'Vitreum Dancer',
  'Lorelei',
  'Capitaneus',
  'Nimbus Wraith',
  'Crownless',
  'Nightmare Crownless',
  'Chest Mimic',
  'Fae Ignis',
  'Cuddle Wuddle',
  'Nightmare Inferno Rider',
  'Nightmare Mourning Aix',
  'Fallacy of No Return',
  'Kerasaur',
  'The False Sovereign',
  'Twin Nebulous Cannon',
  'Twin Nova Collapsar Blade',
  'Zip Zap',
  'Iceglint Dancer',
  'Sigillum'
] as readonly string[];
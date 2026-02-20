import { I18nString } from './character';
import { StatName } from './constants/statMappings';

export interface CDNFetter {
  id: number;
  name: I18nString;
  icon: string;
  color: string;
  pieceCount: number;
  fetterId: number;
  addProp: Array<{ id: number; value: number; isRatio: boolean }>;
  buffIds: number[];
  effectDescription: I18nString;
  fetterIcon: string;
  effectDefineDescription: I18nString;
}

export interface CDNEcho {
  id: number;
  name: I18nString;
  cost: number;
  fetter: number[];
  element: number[];
  icon: string;
  phantomIcon?: string;
  bonuses?: Array<{ stat: string; value: number }>;
  skill: {
    description: string;
    params: Array<{ ArrayString: string[] }>;
  };
}

export interface Echo {
  // Legacy fields (used by EchoSelector, EchoPanel, StatsContext, BuildCard, etc.)
  name: string;
  id: string;
  cost: number;
  elements: ElementType[];

  // CDN-native fields
  nameI18n?: I18nString;
  cdnId?: number;
  iconUrl: string;
  phantomIconUrl?: string;
  bonuses?: Array<{ stat: StatName; value: number }>;
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

// Helper function to get piece counts for an element, derived from CDN fetter data
export const getEchoPieceCounts = (element: ElementType, fettersByElement: Partial<Record<ElementType, CDNFetter>>): number[] => {
  return fettersByElement[element]?.pieceCount === 3 ? [3] : [2, 5];
};

const CDN_BASE = 'https://files.wuthery.com';

/** Fetter ID → ElementType mapping (from Phantom repo analysis) */
export const FETTER_MAP: Record<number, ElementType> = {
  1: 'Glacio',
  2: 'Fusion',
  3: 'Electro',
  4: 'Aero',
  5: 'Spectro',
  6: 'Havoc',
  7: 'Healing',
  8: 'ER',
  9: 'Attack',
  10: 'Frosty',
  11: 'Radiance',
  12: 'Midnight',
  13: 'Empyrean',
  14: 'Tidebreaking',
  // 15: (gap — no fetter 15 exists)
  16: 'Gust',
  17: 'Windward',
  18: 'Flaming',
  19: 'Dream',
  20: 'Crown',
  21: 'Law',
  22: 'Flamewing',
  23: 'Thread',
  24: 'Pact',
  25: 'Halo',
  26: 'Rite',
  27: 'Trailblazing',
  28: 'Chromatic',
  29: 'Sound',
};

/** Prepend CDN base to a raw /d/ icon path */
const toCdnUrl = (rawPath: string): string => `${CDN_BASE}${rawPath}`;

export const adaptCDNEcho = (cdn: CDNEcho): Echo => ({
  // Legacy fields
  name: cdn.name.en,
  id: String(cdn.id),
  cost: cdn.cost,
  elements: cdn.fetter
    .map(id => FETTER_MAP[id])
    .filter((el): el is ElementType => el !== undefined),

  // CDN-native fields
  nameI18n: cdn.name,
  cdnId: cdn.id,
  iconUrl: toCdnUrl(cdn.icon),
  phantomIconUrl: cdn.phantomIcon ? toCdnUrl(cdn.phantomIcon) : undefined,
  bonuses: cdn.bonuses as Array<{ stat: StatName; value: number }> | undefined,
});

export const validateCDNEcho = (echo: CDNEcho): boolean => {
  return (
    typeof echo.id === 'number' &&
    typeof echo.name?.en === 'string' &&
    typeof echo.cost === 'number' &&
    Array.isArray(echo.fetter)
  );
};

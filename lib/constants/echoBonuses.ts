import { StatName } from '@/types/stats';

interface EchoBonus {
  stat: StatName;
  value: number;
}

/**
 * Echo-specific stat bonuses that apply when an echo is equipped in the first slot.
 * These are special bonuses from specific echo types (usually boss echoes).
 */
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
  'Capitaneus': [
    { stat: 'Spectro DMG', value: 12 },
    { stat: 'Heavy Attack DMG Bonus', value: 12 }
  ],
  'Fleurdelys': [
    { stat: 'Aero DMG', value: 10 }
  ],
  'Kerasaur': [
    { stat: 'Aero DMG', value: 12 },
    { stat: 'Resonance Liberation DMG Bonus', value: 12 }
  ],
  'Nightmare Kelpie': [
    { stat: 'Glacio DMG', value: 12 },
    { stat: 'Aero DMG', value: 12 }
  ],
  'Lioness of Glory': [
    { stat: 'Fusion DMG', value: 12 },
    { stat: 'Resonance Liberation DMG Bonus', value: 12 }
  ],
  'Fenrico': [
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

/**
 * List of echoes that have phantom variants
 */
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

/**
 * Get echo bonus for a specific echo name
 */
export const getEchoBonus = (echoName: string): ReadonlyArray<EchoBonus> | null => {
  return ECHO_BONUSES[echoName] ?? null;
};

/**
 * Check if an echo has a phantom variant
 */
export const hasPhantomVariant = (echoName: string): boolean => {
  return PHANTOM_ECHOES.includes(echoName);
};

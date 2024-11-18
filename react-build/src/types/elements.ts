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

export type ElementType = keyof typeof ELEMENT_SETS;
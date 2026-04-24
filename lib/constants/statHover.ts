const STAT_HOVER_KEYS = [
  'HP',
  'ATK',
  'DEF',
  'Crit Rate',
  'Crit DMG',
  'Energy Regen',
  'Aero DMG',
  'Glacio DMG',
  'Fusion DMG',
  'Electro DMG',
  'Havoc DMG',
  'Spectro DMG',
  'Basic Attack DMG Bonus',
  'Heavy Attack DMG Bonus',
  'Resonance Skill DMG Bonus',
  'Resonance Liberation DMG Bonus',
  'Healing Bonus',
] as const;

export type StatHoverKey = typeof STAT_HOVER_KEYS[number];

const normalizeToken = (value: string): string =>
  value
    .replace(/[＋+]/g, '')
    .replace(/[．.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const STAT_HOVER_ALIAS_MAP: Record<string, StatHoverKey> = {
  hp: 'HP',
  'hp%': 'HP',
  'hp up': 'HP',
  lifemax: 'HP',
  'life max': 'HP',

  atk: 'ATK',
  'atk%': 'ATK',
  'atk up': 'ATK',
  attack: 'ATK',
  'attack%': 'ATK',

  def: 'DEF',
  'def%': 'DEF',
  'def up': 'DEF',
  defense: 'DEF',
  'defense%': 'DEF',

  crit: 'Crit Rate',
  critrate: 'Crit Rate',
  'crit rate': 'Crit Rate',
  'crit rate up': 'Crit Rate',
  'critical rate': 'Crit Rate',

  critdmg: 'Crit DMG',
  critdamage: 'Crit DMG',
  'crit dmg': 'Crit DMG',
  'crit dmg up': 'Crit DMG',
  'crit damage': 'Crit DMG',
  'critical damage': 'Crit DMG',

  er: 'Energy Regen',
  energyregen: 'Energy Regen',
  'energy regen': 'Energy Regen',
  'energy regeneration': 'Energy Regen',
  energyefficiency: 'Energy Regen',
  'energy efficiency': 'Energy Regen',
  energyrecover: 'Energy Regen',
  'energy recover': 'Energy Regen',

  'aero dmg': 'Aero DMG',
  'aero dmg bonus': 'Aero DMG',
  'glacio dmg': 'Glacio DMG',
  'glacio dmg bonus': 'Glacio DMG',
  'fusion dmg': 'Fusion DMG',
  'fusion dmg bonus': 'Fusion DMG',
  'electro dmg': 'Electro DMG',
  'electro dmg bonus': 'Electro DMG',
  'havoc dmg': 'Havoc DMG',
  'havoc dmg bonus': 'Havoc DMG',
  'spectro dmg': 'Spectro DMG',
  'spectro dmg bonus': 'Spectro DMG',

  'basic attack': 'Basic Attack DMG Bonus',
  'basic attack dmg': 'Basic Attack DMG Bonus',
  'basic attack dmg bonus': 'Basic Attack DMG Bonus',
  'heavy attack': 'Heavy Attack DMG Bonus',
  'heavy attack dmg': 'Heavy Attack DMG Bonus',
  'heavy attack dmg bonus': 'Heavy Attack DMG Bonus',
  skill: 'Resonance Skill DMG Bonus',
  'resonance skill': 'Resonance Skill DMG Bonus',
  'resonance skill dmg bonus': 'Resonance Skill DMG Bonus',
  liberation: 'Resonance Liberation DMG Bonus',
  'resonance liberation': 'Resonance Liberation DMG Bonus',
  'resonance liberation dmg bonus': 'Resonance Liberation DMG Bonus',

  healing: 'Healing Bonus',
  'healing bonus': 'Healing Bonus',
  'healing bonus up': 'Healing Bonus',
};

export const normalizeStatHoverKey = (value: string | null | undefined): StatHoverKey | null => {
  if (!value) return null;
  const normalized = normalizeToken(value);
  return STAT_HOVER_ALIAS_MAP[normalized] ?? null;
};

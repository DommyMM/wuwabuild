const MAIN_STAT_LABEL_BY_URL_KEY: Record<string, string> = {
  crit_rate: 'Crit Rate',
  crit_dmg: 'Crit DMG',
  atk_pct: 'ATK%',
  hp_pct: 'HP%',
  def_pct: 'DEF%',
  energy_regen: 'Energy Regen',
  aero_dmg: 'Aero DMG',
  glacio_dmg: 'Glacio DMG',
  fusion_dmg: 'Fusion DMG',
  electro_dmg: 'Electro DMG',
  havoc_dmg: 'Havoc DMG',
  spectro_dmg: 'Spectro DMG',
  healing_bonus: 'Healing Bonus',
};

const MAIN_STAT_URL_KEY_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(MAIN_STAT_LABEL_BY_URL_KEY).map(([urlKey, label]) => [label, urlKey]),
);

const MAIN_STAT_URL_KEY_ALIASES: Record<string, string> = {
  CR: 'crit_rate',
  CD: 'crit_dmg',
  'A%': 'atk_pct',
  'H%': 'hp_pct',
  'D%': 'def_pct',
  ER: 'energy_regen',
  AD: 'aero_dmg',
  GD: 'glacio_dmg',
  FD: 'fusion_dmg',
  ED: 'electro_dmg',
  HD: 'havoc_dmg',
  SD: 'spectro_dmg',
  HB: 'healing_bonus',
};

export function toMainStatUrlKey(value: string): string {
  return MAIN_STAT_URL_KEY_BY_LABEL[value] ?? MAIN_STAT_URL_KEY_ALIASES[value] ?? value;
}

export function toMainStatLabel(value: string): string {
  const urlKey = toMainStatUrlKey(value);
  return MAIN_STAT_LABEL_BY_URL_KEY[urlKey] ?? value;
}

export function toMainStatApiValue(value: string): string {
  return toMainStatLabel(value);
}


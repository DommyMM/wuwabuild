import { LBSortKey, LBSortDirection } from '@/lib/lb';

export const ITEMS_PER_PAGE = 12;
export const IDENTITY_DEBOUNCE_MS = 350;
export const DEFAULT_PAGE = 1;
export const DEFAULT_SORT: LBSortKey = 'finalCV';
export const DEFAULT_DIRECTION: LBSortDirection = 'desc';

export const REGION_OPTIONS = [
  { label: 'America', value: '5' },
  { label: 'Europe', value: '6' },
  { label: 'Asia', value: '7' },
  { label: 'SEA', value: '9' },
  { label: 'HMT', value: '1' },
] as const;

export const MAIN_STAT_OPTIONS = [
  { code: 'CR', label: 'Crit Rate' },
  { code: 'CD', label: 'Crit DMG' },
  { code: 'A%', label: 'ATK%' },
  { code: 'H%', label: 'HP%' },
  { code: 'D%', label: 'DEF%' },
  { code: 'ER', label: 'Energy Regen' },
  { code: 'AD', label: 'Aero DMG' },
  { code: 'GD', label: 'Glacio DMG' },
  { code: 'FD', label: 'Fusion DMG' },
  { code: 'ED', label: 'Electro DMG' },
  { code: 'HD', label: 'Havoc DMG' },
  { code: 'SD', label: 'Spectro DMG' },
  { code: 'HB', label: 'Healing Bonus' },
] as const;

export const SORT_OPTIONS: Array<{ key: LBSortKey; label: string }> = [
  { key: 'finalCV', label: 'Crit Value' },
  { key: 'timestamp', label: 'Date' },
  { key: 'CR', label: 'Crit Rate' },
  { key: 'CD', label: 'Crit DMG' },
  { key: 'A', label: 'ATK' },
  { key: 'H', label: 'HP' },
  { key: 'D', label: 'DEF' },
  { key: 'ER', label: 'Energy Regen' },
  { key: 'BA', label: 'Basic Attack DMG Bonus' },
  { key: 'HA', label: 'Heavy Attack DMG Bonus' },
  { key: 'RS', label: 'Resonance Skill DMG Bonus' },
  { key: 'RL', label: 'Resonance Liberation DMG Bonus' },
  { key: 'AD', label: 'Aero DMG' },
  { key: 'GD', label: 'Glacio DMG' },
  { key: 'FD', label: 'Fusion DMG' },
  { key: 'ED', label: 'Electro DMG' },
  { key: 'HD', label: 'Havoc DMG' },
  { key: 'SD', label: 'Spectro DMG' },
];

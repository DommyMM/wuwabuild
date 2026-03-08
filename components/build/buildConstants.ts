import { LBSortKey, LBSortDirection } from '@/lib/lb';

export const ITEMS_PER_PAGE = 12;
export const MAX_ITEMS_PER_PAGE = 100;
export const MIN_ITEMS_PER_PAGE = 1;

export function clampItemsPerPage(value: number): number {
  if (!Number.isFinite(value)) return ITEMS_PER_PAGE;
  const parsed = Math.trunc(value);
  return Math.min(MAX_ITEMS_PER_PAGE, Math.max(MIN_ITEMS_PER_PAGE, parsed));
}

export const IDENTITY_DEBOUNCE_MS = 350;
export const DEFAULT_PAGE = 1;
export const DEFAULT_SORT: LBSortKey = 'finalCV';
export const DEFAULT_DIRECTION: LBSortDirection = 'desc';

export const REGION_OPTIONS = [
  { label: 'NA', value: '5' },
  { label: 'Europe', value: '6' },
  { label: 'Asia', value: '7' },
  { label: 'SEA', value: '9' },
  { label: 'CN', value: '1' },
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
  { key: 'HB', label: 'Healing Bonus' },
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

// Regions

export type RegionBadge = {
  label: string;
  className: string;
};

export const REGION_BADGES: Record<string, RegionBadge> = {
  '1': { label: 'CN', className: 'bg-red-500/85 text-white' },
  '5': { label: 'NA', className: 'bg-amber-400/90 text-black' },
  '6': { label: 'EU', className: 'bg-indigo-400/90 text-black' },
  '7': { label: 'Asia', className: 'bg-lime-300/90 text-black' },
  '9': { label: 'SEA', className: 'bg-cyan-300/90 text-black' },
};

// Stat Columns

export type CVSortKey = 'finalCV' | 'CR' | 'CD';

export const CV_OPTIONS: ReadonlyArray<{ key: CVSortKey; label: string }> = [
  { key: 'finalCV', label: 'Crit Value' },
  { key: 'CR', label: 'Crit Rate' },
  { key: 'CD', label: 'Crit DMG' },
];

export const STAT_OPTION_KEYS = [ 'A', 'H', 'D', 'ER', 'HB', 'AD', 'GD', 'FD', 'ED', 'HD', 'SD', 'BA', 'HA', 'RS', 'RL' ] as const;

export const DEFAULT_STAT_COLUMNS = ['A', 'ER', 'D', 'AD'] as const;
export const BASE_STAT_FALLBACK_ORDER = ['A', 'H', 'D', 'ER'] as const;
export const ELEMENT_STAT_KEYS = ['AD', 'GD', 'FD', 'ED', 'HD', 'SD'] as const;
export const OFFENSIVE_BONUS_KEYS = ['BA', 'HA', 'RS', 'RL'] as const;

export const PERCENT_STAT_KEYS: ReadonlySet<LBSortKey> = new Set<LBSortKey>([ 'CR', 'CD', 'A%', 'H%', 'D%', 'ER', 'HB', 'AD', 'GD', 'FD', 'ED', 'HD', 'SD', 'BA', 'HA', 'RS', 'RL' ]);

// Table Layout

export const TABLE_GRID = 'grid-cols-[48px_160px_160px_72px_72px_88px_minmax(0,1fr)]';
export const SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,minmax(0,1fr))]';
export const TABLE_ROW_HEIGHT_CLASS = 'min-h-[53px]';
export const PAGE_SKIP = 10;

export const PAGINATION_BUTTON_CLASS = 'inline-flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded border border-border bg-background p-0 transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40';
export const PAGE_INDICATOR_CLASS = 'inline-flex h-7.5 w-7.5 items-center justify-center rounded border border-border bg-background text-xs text-text-primary';

export const ACTIVE_SORT_COLUMN_CLASS = 'bg-black/28';
export const ACTIVE_HEADER_TOP_BORDER_CLASS = 'border-accent/85';

// Index = sequence level 0–6
export const SEQUENCE_BADGE_STYLES = [
  'pr-2 border-border bg-background text-text-primary/75',
  'pr-3 border-cyan-400/45 bg-cyan-500/15 text-cyan-200',
  'pr-4 border-blue-400/45 bg-blue-500/15 text-blue-200',
  'pr-5 border-violet-400/45 bg-violet-500/15 text-violet-200',
  'pr-6 border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-200',
  'pr-7 border-amber-400/55 bg-amber-500/20 text-amber-200',
  'pr-8 border-spectro/60 bg-spectro/20 text-spectro',
] as const;

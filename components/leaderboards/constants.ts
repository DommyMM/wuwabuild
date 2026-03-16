import { LBSortDirection, LBSortKey, LBStatSortKey } from '@/lib/lb';

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
  { label: 'CN', value: '1' },
  { label: 'NA', value: '5' },
  { label: 'EU', value: '6' },
  { label: 'Asia', value: '7' },
  { label: 'SEA', value: '9' }
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
  { key: 'crit_rate', label: 'Crit Rate' },
  { key: 'crit_dmg', label: 'Crit DMG' },
  { key: 'atk', label: 'ATK' },
  { key: 'hp', label: 'HP' },
  { key: 'def', label: 'DEF' },
  { key: 'energy_regen', label: 'Energy Regen' },
  { key: 'healing_bonus', label: 'Healing Bonus' },
  { key: 'basic_attack_dmg', label: 'Basic Attack DMG Bonus' },
  { key: 'heavy_attack_dmg', label: 'Heavy Attack DMG Bonus' },
  { key: 'resonance_skill_dmg', label: 'Resonance Skill DMG Bonus' },
  { key: 'resonance_liberation_dmg', label: 'Resonance Liberation DMG Bonus' },
  { key: 'aero_dmg', label: 'Aero DMG' },
  { key: 'glacio_dmg', label: 'Glacio DMG' },
  { key: 'fusion_dmg', label: 'Fusion DMG' },
  { key: 'electro_dmg', label: 'Electro DMG' },
  { key: 'havoc_dmg', label: 'Havoc DMG' },
  { key: 'spectro_dmg', label: 'Spectro DMG' },
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

export type CVSortKey = 'finalCV' | 'crit_rate' | 'crit_dmg';

export const CV_OPTIONS: ReadonlyArray<{ key: CVSortKey; label: string }> = [
  { key: 'finalCV', label: 'Crit Value' },
  { key: 'crit_rate', label: 'Crit Rate' },
  { key: 'crit_dmg', label: 'Crit DMG' },
];

export const STAT_OPTION_KEYS: readonly LBStatSortKey[] = [
  'atk',
  'hp',
  'def',
  'energy_regen',
  'healing_bonus',
  'aero_dmg',
  'glacio_dmg',
  'fusion_dmg',
  'electro_dmg',
  'havoc_dmg',
  'spectro_dmg',
  'basic_attack_dmg',
  'heavy_attack_dmg',
  'resonance_skill_dmg',
  'resonance_liberation_dmg',
];

export const DEFAULT_STAT_COLUMNS: readonly LBStatSortKey[] = ['atk', 'energy_regen', 'def', 'aero_dmg'];
export const BASE_STAT_FALLBACK_ORDER: readonly LBStatSortKey[] = ['atk', 'hp', 'def', 'energy_regen'];
export const ELEMENT_STAT_KEYS: readonly LBStatSortKey[] = ['aero_dmg', 'glacio_dmg', 'fusion_dmg', 'electro_dmg', 'havoc_dmg', 'spectro_dmg'];
export const OFFENSIVE_BONUS_KEYS: readonly LBStatSortKey[] = ['basic_attack_dmg', 'heavy_attack_dmg', 'resonance_skill_dmg', 'resonance_liberation_dmg'];

export const PERCENT_STAT_KEYS: ReadonlySet<LBSortKey> = new Set<LBSortKey>([
  'crit_rate',
  'crit_dmg',
  'energy_regen',
  'healing_bonus',
  'aero_dmg',
  'glacio_dmg',
  'fusion_dmg',
  'electro_dmg',
  'havoc_dmg',
  'spectro_dmg',
  'basic_attack_dmg',
  'heavy_attack_dmg',
  'resonance_skill_dmg',
  'resonance_liberation_dmg',
]);

// Table Layout

export const TABLE_GRID = 'grid-cols-[48px_160px_160px_72px_72px_88px_minmax(0,1fr)]';
export const SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,minmax(120px,1fr))]';
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

// # | Owner | Character | Sets | [CV+Stats+Damage]
export const LB_TABLE_GRID = 'grid-cols-[48px_178px_178px_88px_minmax(0,1fr)]';
export const LB_SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,121px)_minmax(140px,1fr)]';
export const DEFAULT_LB_SORT = 'damage';
export const DEFAULT_LB_TRACK = 's0';

// Sequence badge border/bg/text colors. Index = sequence level 0-6.
export const LB_SEQ_BADGE_COLORS = [
  '', // S0 - no badge shown
  'border-cyan-400/45 bg-cyan-500/15 text-cyan-200',
  'border-blue-400/45 bg-blue-500/15 text-blue-200',
  'border-violet-400/45 bg-violet-500/15 text-violet-200',
  'border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-200',
  'border-amber-400/55 bg-amber-500/20 text-amber-200',
  'border-spectro/60 bg-spectro/20 text-spectro',
] as const;

/** Parse sequence level from a track key, e.g. "s2_solo" -> 2, "s0" -> 0. */
export function parseLBSeqLevel(trackKey: string): number {
  const m = trackKey.match(/^s(\d+)/);
  return m ? Math.min(6, parseInt(m[1], 10)) : 0;
}

/** Strip the leading "S{n} " prefix from a track label when sequence is shown separately. */
export function stripLBSeqPrefix(label: string): string {
  return label.replace(/^S\d+\s+/, '');
}

/** Generate a short description for a leaderboard track. */
export function getLBTrackExcerpt(trackKey: string, teamCount: number): string {
  const isSolo = trackKey.includes('solo') || teamCount === 0;
  if (isSolo) return 'Solo benchmark - no external team buffs applied.';
  return `Full team benchmark with ${teamCount} support resonator${teamCount !== 1 ? 's' : ''}.`;
}

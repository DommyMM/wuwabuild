import { getLBSortLabel, isLBPercentStatSortKey, LB_STAT_ENTRIES, LBSortDirection, LBSortKey, LBStatSortKey } from '@/lib/lb';

const LB_STAT_LABEL_BY_CODE = new Map(LB_STAT_ENTRIES.map((entry) => [entry.code, entry.label]));

export const ITEMS_PER_PAGE = 12;
export const MAX_ITEMS_PER_PAGE = 100;
const MIN_ITEMS_PER_PAGE = 1;

export function clampItemsPerPage(value: number): number {
  if (!Number.isFinite(value)) return ITEMS_PER_PAGE;
  const parsed = Math.trunc(value);
  return Math.min(MAX_ITEMS_PER_PAGE, Math.max(MIN_ITEMS_PER_PAGE, parsed));
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_SORT: LBSortKey = 'finalCV';
export const DEFAULT_DIRECTION: LBSortDirection = 'desc';

// Board scoring lens (character leaderboard). 'adjusted' = canonical ER-scaled
// Score (default, surfaced). 'raw' = pure rotation damage, ER shown but not
// scored. Raw is a view mode over the same board, not a separate board.
export type ScoringMode = 'adjusted' | 'raw';
export const DEFAULT_SCORING: ScoringMode = 'adjusted';

export const REGION_OPTIONS = [
  { label: 'CN', value: '1' },
  { label: 'NA', value: '5' },
  { label: 'EU', value: '6' },
  { label: 'Asia', value: '7' },
  { label: 'SEA', value: '9' }
] as const;

// Curated main-stat filter order; labels come from the registry (by code).
export const MAIN_STAT_OPTIONS = (['CR', 'CD', 'A%', 'H%', 'D%', 'ER', 'AD', 'GD', 'FD', 'ED', 'HD', 'SD', 'HB'] as const)
  .map((code) => ({ code, label: LB_STAT_LABEL_BY_CODE.get(code) ?? code }));

// Curated sort-menu order; labels come from the single source (getLBSortLabel).
export const SORT_OPTIONS: Array<{ key: LBSortKey; label: string }> = ([
  'finalCV',
  'timestamp',
  'crit_rate',
  'crit_dmg',
  'atk',
  'hp',
  'def',
  'energy_regen',
  'healing_bonus',
  'basic_attack_dmg',
  'heavy_attack_dmg',
  'resonance_skill_dmg',
  'resonance_liberation_dmg',
  'aero_dmg',
  'glacio_dmg',
  'fusion_dmg',
  'electro_dmg',
  'havoc_dmg',
  'spectro_dmg',
] as LBSortKey[]).map((key) => ({ key, label: getLBSortLabel(key) }));

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

export const PERCENT_STAT_KEYS: ReadonlySet<LBSortKey> = new Set(
  LB_STAT_ENTRIES.filter((entry) => isLBPercentStatSortKey(entry.sortKey)).map((entry) => entry.sortKey),
);

// Structured build filters (Card Sequence + Stat Thresholds) --------------------

export const MAX_SEQUENCE = 6;

export type SequencePreset = {
  /** Stable id used for radio selection; not serialized (min/max are). */
  key: string;
  label: string;
  min: number | null;
  max: number | null;
};

// Curated "Card Sequence" presets. A single constraint is active at a time; the
// chip label is derived from min/max (see sequenceChipLabel), not stored here.
export const SEQUENCE_PRESETS: readonly SequencePreset[] = [
  { key: 's0', label: 'S0 only', min: 0, max: 0 },
  { key: 's1plus', label: 'S1+', min: 1, max: null },
  { key: 's2plus', label: 'S2+', min: 2, max: null },
  { key: 'lte1', label: '≤ S1', min: null, max: 1 },
  { key: 's6', label: 'S6 only', min: 6, max: 6 },
];

/** Match an active seqMin/seqMax pair back to a preset key, for radio highlighting. */
export function matchSequencePreset(min: number | null, max: number | null): string | null {
  return SEQUENCE_PRESETS.find((preset) => preset.min === min && preset.max === max)?.key ?? null;
}

/** Chip text for the active card-sequence constraint, or null when unset. */
export function sequenceChipLabel(min: number | null, max: number | null): string | null {
  const hasMin = typeof min === 'number';
  const hasMax = typeof max === 'number';
  if (!hasMin && !hasMax) return null;
  if (hasMin && hasMax) {
    return min === max ? `Card Sequence = S${min}` : `Card Sequence S${min}–S${max}`;
  }
  if (hasMin) return `Card Sequence ≥ S${min}`;
  return `Card Sequence ≤ S${max}`;
}

// Stat-threshold builder options: every stored/board stat that can carry a
// numeric floor/ceiling, ordered crit → base → bonuses → element.
export const STAT_FILTER_OPTION_KEYS: readonly LBStatSortKey[] = [
  'crit_rate', 'crit_dmg',
  'atk', 'atk_pct', 'hp', 'hp_pct', 'def', 'def_pct',
  'energy_regen', 'healing_bonus',
  'basic_attack_dmg', 'heavy_attack_dmg', 'resonance_skill_dmg', 'resonance_liberation_dmg',
  'aero_dmg', 'glacio_dmg', 'fusion_dmg', 'electro_dmg', 'havoc_dmg', 'spectro_dmg',
];

// Table Layout

export const TABLE_GRID = 'grid-cols-[48px_160px_140px_72px_72px_108px_minmax(0,1fr)]';
export const SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,minmax(120px,1fr))]';
export const TABLE_ROW_HEIGHT_CLASS = 'min-h-[53px]';
export const PAGE_SKIP = 10;

export const PAGINATION_BUTTON_CLASS = 'inline-flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded border border-border bg-background p-0 transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40';
export const PAGE_INDICATOR_CLASS = 'inline-flex h-7.5 w-7.5 items-center justify-center rounded border border-border bg-background text-xs text-text-primary';

export const ACTIVE_SORT_COLUMN_CLASS = 'bg-black/28';

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
export const LB_TABLE_GRID = 'grid-cols-[48px_178px_154px_112px_minmax(0,1fr)]';
export const LB_SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,121px)_minmax(140px,1fr)]';
export const DEFAULT_LB_SORT = 'damage';
export const DEFAULT_LB_TRACK = 's0';

// Expanded build substat summary row (leaderboard + profile).
export const LB_SUMMARY_ROW = 'mx-auto flex w-max max-w-none flex-nowrap items-center justify-center gap-2';

export const LB_SUMMARY_PILL = 'inline-flex items-center gap-1 rounded-full border bg-black/45 px-2.5 py-1 text-sm font-semibold text-white/92 transition-all duration-200 cursor-pointer hover:border-amber-200/65';

export const LB_SUMMARY_VAL = 'text-base';

export const LB_SUMMARY_ICON = 'h-4 w-4 object-contain';

export const LB_SUMMARY_ICON_EMPTY = 'h-4 w-4 rounded bg-white/18';

export const LB_SUMMARY_RV = 'inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-sm font-semibold text-white/92 transition-all duration-200 select-none';

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

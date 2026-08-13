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

const MAX_SEQUENCE = 6;
export const SEQUENCE_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;

// Selected-state color per sequence level (S0 neutral → S6 spectro), mirroring the
// table badge ramp in LB_SEQ_BADGE_COLORS.
export const SEQUENCE_TOGGLE_COLORS: readonly string[] = [
  'border-slate-400/50 bg-slate-500/20 text-slate-100',
  'border-cyan-400/50 bg-cyan-500/20 text-cyan-100',
  'border-blue-400/50 bg-blue-500/20 text-blue-100',
  'border-violet-400/50 bg-violet-500/20 text-violet-100',
  'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100',
  'border-amber-400/55 bg-amber-500/25 text-amber-100',
  'border-spectro/60 bg-spectro/25 text-spectro',
];

/** Sorted, de-duped, in-range (0–MAX_SEQUENCE) copy of a selected-levels list. */
export function normalizeSequences(levels: Iterable<number>): number[] {
  return [...new Set(levels)]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= MAX_SEQUENCE)
    .sort((a, b) => a - b);
}

/**
 * Compact chip text for the selected card-sequence set, or null when empty.
 */
export function sequenceChipSummary(levels: number[]): string | null {
  const sorted = normalizeSequences(levels);
  if (sorted.length === 0) return null;
  return `Seq: ${sorted.map((n) => `S${n}`).join(', ')}`;
}

// Table Layout

export const TABLE_GRID = 'grid-cols-[48px_160px_140px_72px_72px_108px_minmax(0,1fr)]';
export const SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,minmax(120px,1fr))]';
export const TABLE_ROW_HEIGHT_CLASS = 'min-h-[53px]';
export const PAGE_SKIP = 10;

// 40px targets below md (touch minimum), the tighter 30px square on desktop.
export const PAGINATION_BUTTON_CLASS = 'inline-flex h-10 w-10 md:h-7.5 md:w-7.5 cursor-pointer items-center justify-center rounded border border-border bg-background p-0 transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40';
export const PAGE_INDICATOR_CLASS = 'inline-flex h-10 w-10 md:h-7.5 md:w-7.5 items-center justify-center rounded border border-border bg-background text-xs text-text-primary';

export const ACTIVE_SORT_COLUMN_CLASS = 'bg-black/28';

// Status pair for score modifiers — teal (not green) so the bonus/penalty
// split stays distinguishable under red-green colorblindness. Shared by
// BuildMoveBreakdown and BuildOptimalityPanel.
export const STATUS_POSITIVE_COLOR = '#5cc7c2';
export const STATUS_NEGATIVE_COLOR = '#f87171';

// "No signal" tone: a zero delta, an inapplicable cell, a negligible gain.
export const STATUS_NEUTRAL_COLOR = 'rgba(224,224,224,0.6)';

/**
 * Magnitude ramp for "better is bigger" figures (upgrade gain, rank improvement).
 *
 * Saturation carries the signal and lightness stays near-flat: the low end is a
 * near-neutral gray-green that reads as "negligible" next to plain white
 * numbers, and the top holds the hue and saturation these figures have always
 * used (129, 73%), a shade deeper so it stays vivid on the dark surface.
 * Ramping lightness alone (the previous 61%→75% on that fixed 73% saturation)
 * was imperceptible — a 250x spread in gain rendered as effectively one color.
 *
 * Green, not the teal of STATUS_POSITIVE_COLOR. That teal exists so a bonus and
 * a penalty stay apart under red-green colorblindness; it is for signed pairs.
 * These figures are unsigned (gain is filtered to > 0, and an added roll cannot
 * push a rank down), so there is no pair to disambiguate, green carries the
 * plain "gain" convention, and teal would collide with the Glacio element tint.
 *
 * @param ratio value as a fraction of the strongest value in the same group.
 */
export function statusRampColor(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  return `hsl(129 ${Math.round(10 + (clamped * 63))}% ${Math.round(64 - (clamped * 5))}%)`;
}

// Shared measure for every section of an expanded leaderboard build row: echo
// panels, summary pills, move breakdown, upgrade table, standings, benchmark.
// One constraint on the shell means the sections share a left edge down the
// column instead of each carrying its own max-width.
export const LB_EXPANDED_SHELL = 'mx-auto w-full max-w-330 px-12';

// Opaque stand-in for the expanded-row surface, used by the frozen rail in the
// substat upgrade table so scrolling columns tuck cleanly underneath. Sits
// between --color-background (#121212) and --color-background-secondary
// (#1E1E1E), which is what the row's translucent stack resolves to.
export const LB_EXPANDED_OPAQUE_SURFACE = 'bg-[#191919]';
// Same colour as a gradient origin, for the scroll-edge fade over a wide table.
// Kept as a separate literal because Tailwind scans for whole class names.
export const LB_EXPANDED_OPAQUE_SURFACE_FROM = 'from-[#191919]';

// # | Owner | Character | Sets | [CV+Stats+Damage]
export const LB_TABLE_GRID = 'grid-cols-[48px_178px_154px_112px_minmax(0,1fr)]';
export const LB_SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,121px)_minmax(140px,1fr)]';
export const DEFAULT_LB_SORT = 'damage';
export const DEFAULT_LB_TRACK = 's0';

// Expanded build substat summary row (leaderboard + profile) that wraps rather than overflow
export const LB_SUMMARY_ROW = 'mx-auto flex w-full flex-wrap items-center justify-center gap-2';

const LB_SUMMARY_PILL_BASE = 'inline-flex items-center gap-1 rounded-full border bg-black/45 px-2.5 py-1 text-sm font-semibold text-white/92 transition-[border-color,opacity] duration-200';

export const LB_SUMMARY_PILL = `${LB_SUMMARY_PILL_BASE} cursor-pointer hover:border-amber-200/65`;

// Non-interactive twin, for the reference benchmark's Echo blueprint: its
// substats are fixed by the tier, so there is nothing to select and a pointer
// cursor would promise a filter that does not exist.
export const LB_SUMMARY_PILL_STATIC = LB_SUMMARY_PILL_BASE;

export const LB_SUMMARY_VAL = 'text-base';

export const LB_SUMMARY_ICON = 'h-4 w-4 object-contain';

export const LB_SUMMARY_ICON_EMPTY = 'h-4 w-4 rounded bg-white/18';

export const LB_SUMMARY_RV = 'inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-sm font-semibold text-white/92 transition-[border-color,opacity] duration-200 select-none';

// Sequence badge border/bg/text colors. Index = sequence level 0-6.
// This is the single source for the S1-S6 color ramp; SEQUENCE_BADGE_STYLES
// derives from it (do not fork another copy).
export const LB_SEQ_BADGE_COLORS = [
  '', // S0 - no badge shown
  'border-cyan-400/45 bg-cyan-500/15 text-cyan-200',
  'border-blue-400/45 bg-blue-500/15 text-blue-200',
  'border-violet-400/45 bg-violet-500/15 text-violet-200',
  'border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-200',
  'border-amber-400/55 bg-amber-500/20 text-amber-200',
  'border-spectro/60 bg-spectro/20 text-spectro',
] as const;

// Table sequence pill: same ramp, plus a per-level right-padding step so the
// pill widens with the level, and a neutral S0 (the table always shows a pill).
// The pr-* literals must stay spelled out for the Tailwind scanner.
const SEQUENCE_BADGE_PR = ['pr-2', 'pr-3', 'pr-4', 'pr-5', 'pr-6', 'pr-7', 'pr-8'] as const;
export const SEQUENCE_BADGE_STYLES = SEQUENCE_BADGE_PR.map((pr, level) =>
  `${pr} ${LB_SEQ_BADGE_COLORS[level] || 'border-border bg-background text-text-primary/75'}`,
) as readonly string[];

// Min width of the sortable stat group. Header, skeleton and row must agree or
// the column labels drift from the cells at the widths where min-width binds.
export const TABLE_STAT_GROUP_MIN = 'min-w-163'; // 652px = SORTABLE_GROUP_GRID minimum
export const LB_STAT_GROUP_MIN = 'min-w-199'; // 796px = LB_SORTABLE_GROUP_GRID minimum

/** Parse the sequence token from a track key, e.g. "s2_solo" or "nuke_s6". */
export function parseLBSeqLevel(trackKey: string): number {
  const m = trackKey.match(/(?:^|_)s(\d+)(?:_|$)/i);
  return m ? Math.min(6, parseInt(m[1], 10)) : 0;
}

/** Strip the leading "S{n} " prefix from a track label when sequence is shown separately. */
export function stripLBSeqPrefix(label: string): string {
  return label.replace(/^S\d+\s+/, '');
}

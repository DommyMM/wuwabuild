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

/**
 * Which number a character board ranks on, a lens over the same board rather than a separate board
 *
 * - `adjusted` is the canonical ER-scaled Score
 * - `raw` is rotation damage before ER scaling, with ER shown but not scored
 */
export type ScoringMode = 'adjusted' | 'raw';
export const DEFAULT_SCORING: ScoringMode = 'adjusted';

export const REGION_OPTIONS = [
  { label: 'CN', value: '1' },
  { label: 'NA', value: '5' },
  { label: 'EU', value: '6' },
  { label: 'Asia', value: '7' },
  { label: 'SEA', value: '9' }
] as const;

/** Curated filter order, labels looked up by code so the registry stays the one source */
export const MAIN_STAT_OPTIONS = (['CR', 'CD', 'A%', 'H%', 'D%', 'ER', 'AD', 'GD', 'FD', 'ED', 'HD', 'SD', 'HB'] as const)
  .map((code) => ({ code, label: LB_STAT_LABEL_BY_CODE.get(code) ?? code }));

/** Curated menu order, labels from `getLBSortLabel` so the registry stays the one source */
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

const MAX_SEQUENCE = 6;
export const SEQUENCE_LEVELS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Selected-state colour per sequence level, S0 neutral up to S6 spectro, mirroring the table ramp in LB_SEQ_BADGE_COLORS */
export const SEQUENCE_TOGGLE_COLORS: readonly string[] = [
  'border-slate-400/50 bg-slate-500/20 text-slate-100',
  'border-cyan-400/50 bg-cyan-500/20 text-cyan-100',
  'border-blue-400/50 bg-blue-500/20 text-blue-100',
  'border-violet-400/50 bg-violet-500/20 text-violet-100',
  'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100',
  'border-amber-400/55 bg-amber-500/25 text-amber-100',
  'border-spectro/60 bg-spectro/25 text-spectro',
];

/** Sorted, de-duped copy of a selected-levels list, dropping anything outside 0 to MAX_SEQUENCE */
export function normalizeSequences(levels: Iterable<number>): number[] {
  return [...new Set(levels)]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= MAX_SEQUENCE)
    .sort((a, b) => a - b);
}

/** Compact chip text for the selected card-sequence set, null when nothing is selected */
export function sequenceChipSummary(levels: number[]): string | null {
  const sorted = normalizeSequences(levels);
  if (sorted.length === 0) return null;
  return `Seq: ${sorted.map((n) => `S${n}`).join(', ')}`;
}

export const TABLE_GRID = 'grid-cols-[48px_160px_140px_72px_72px_108px_minmax(0,1fr)]';
export const SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,minmax(120px,1fr))]';
export const TABLE_ROW_HEIGHT_CLASS = 'min-h-[53px]';
export const PAGE_SKIP = 10;

/** 40px touch target below md, the tighter 30px square on desktop */
export const PAGINATION_BUTTON_CLASS = 'inline-flex h-10 w-10 md:h-7.5 md:w-7.5 cursor-pointer items-center justify-center rounded border border-border bg-background p-0 transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40';
export const PAGE_INDICATOR_CLASS = 'inline-flex h-10 w-10 md:h-7.5 md:w-7.5 items-center justify-center rounded border border-border bg-background text-xs text-text-primary';

export const ACTIVE_SORT_COLUMN_CLASS = 'bg-black/28';

/** Signed pair for score modifiers, teal rather than green so bonus and penalty stay apart under red-green colorblindness */
export const STATUS_POSITIVE_COLOR = '#5cc7c2';
export const STATUS_NEGATIVE_COLOR = '#f87171';

/** "No signal" tone: a zero delta, an inapplicable cell, a negligible gain */
export const STATUS_NEUTRAL_COLOR = 'rgba(224,224,224,0.6)';

/**
 * Magnitude ramp for unsigned "better is bigger" figures like upgrade gain and rank improvement
 *
 * - Saturation carries the signal while lightness stays near-flat, because a lightness-only ramp renders a 250x spread as one colour
 * - Low end is a near-neutral gray-green that reads as negligible beside plain white numbers
 * - Green rather than the teal of STATUS_POSITIVE_COLOR, which is reserved for signed pairs and would collide with the Glacio tint
 *
 * @param ratio value as a fraction of the strongest value in the same group
 */
export function statusRampColor(ratio: number): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  return `hsl(129 ${Math.round(10 + (clamped * 63))}% ${Math.round(64 - (clamped * 5))}%)`;
}

/**
 * One measure every section of an expanded build row carries, so they share a left edge down the column
 *
 * - Below md the 1320px cap comes off and the gutter drops to px-4, or the echo panels sit a quarter-screen in
 */
export const LB_EXPANDED_SHELL = 'mx-auto w-full px-4 md:max-w-330 md:px-12';

/**
 * Opaque stand-in for the expanded-row surface, for the frozen rail the upgrade table's columns scroll under
 *
 * - Sits between --color-background and --color-background-secondary, which is what the row's translucent stack resolves to
 */
export const LB_EXPANDED_OPAQUE_SURFACE = 'bg-[#191919]';
/** Same colour as a gradient origin for the scroll-edge fade, spelled out separately because Tailwind scans whole class names */
export const LB_EXPANDED_OPAQUE_SURFACE_FROM = 'from-[#191919]';

/**
 * Track widths for "# | Owner | Character | Sets | [CV+Stats+Damage]", all fixed, so the table has a hard 1352px footprint
 *
 * - 48+178+154+112 tracks, 4x16 gap and 796 from LB_STAT_GROUP_MIN, inside a 1366px container: 14px of headroom
 * - Row padding, a wider track or an extra gap puts a horizontal scrollbar under the table at 1080p
 * - Header, skeleton and rows all carry this grid with no horizontal padding of their own
 */
export const LB_TABLE_GRID = 'grid-cols-[64px_160px_154px_112px_minmax(0,1fr)]';
export const LB_SORTABLE_GROUP_GRID = 'grid-cols-[172px_repeat(4,121px)_minmax(140px,1fr)]';
export const DEFAULT_LB_SORT = 'damage';
export const DEFAULT_LB_TRACK = 's0';

export type SummaryDensity = 'normal' | 'compact';
export type SummaryHost = 'expansion' | 'card';

/**
 * Pill count at which a host tightens, since the row is centred and nowrap so a little overspill is better than a wrap
 *
 * - Measured on the Ropa Sans metrics the row inherits: a stat pill is 75-95px and the RV pill about 120px
 * - The expansion holds 12 in its 1,224px content box and lets 13 spill into the 48px padding, so only 14 tightens
 * - The card never tightens because 14 pills, every substat type plus RV, is 1,411px at worst inside its 1,440px frame
 */
const SUMMARY_COMPACT_AT: Record<SummaryHost, number> = {
  expansion: 14,
  card: Number.POSITIVE_INFINITY,
};

export const getSummaryDensity = (pillCount: number, host: SummaryHost): SummaryDensity => (
  pillCount >= SUMMARY_COMPACT_AT[host] ? 'compact' : 'normal'
);

const SUMMARY_ROW_BASE = 'mx-auto flex w-full flex-nowrap items-center justify-center';
const SUMMARY_PILL_BASE = 'inline-flex shrink-0 items-center gap-1 rounded-full border bg-black/45 py-1 text-sm font-semibold text-white/92 transition-[border-color,opacity] duration-200';
const SUMMARY_RV_BASE = 'inline-flex shrink-0 items-center gap-1 rounded-full bg-black/45 py-1 text-sm font-semibold text-white/92 transition-[border-color,opacity] duration-200 select-none';

const SUMMARY_DENSITY_CLASSES: Record<SummaryDensity, { gap: string; pad: string }> = {
  normal: { gap: 'gap-2', pad: 'px-2.5' },
  compact: { gap: 'gap-1.5', pad: 'px-2' },
};

export interface SummaryRowClasses {
  row: string;
  pill: string;
  /** Non-interactive twin for the benchmark blueprint, whose tier fixes its substats, so a pointer would promise a filter that is not there */
  pillStatic: string;
  rv: string;
  val: string;
}

/** `pillCount` includes the RV pill where the host renders one */
export const getSummaryRowClasses = (pillCount: number, host: SummaryHost): SummaryRowClasses => {
  const d = SUMMARY_DENSITY_CLASSES[getSummaryDensity(pillCount, host)];
  const pillStatic = `${SUMMARY_PILL_BASE} ${d.pad}`;
  return {
    row: `${SUMMARY_ROW_BASE} ${d.gap}`,
    pill: `${pillStatic} cursor-pointer hover:border-amber-200/65`,
    pillStatic,
    rv: `${SUMMARY_RV_BASE} ${d.pad}`,
    val: 'text-base',
  };
};

/** Normal-density row, for skeletons that render a fixed handful of pills */
export const LB_SUMMARY_ROW = getSummaryRowClasses(0, 'expansion').row;

/** Section eyebrow inside an expanded row, where the inherited Plus Jakarta makes the weight real */
export const LB_SECTION_HEADING = 'text-2xs font-semibold uppercase tracking-[0.18em] text-text-primary/55';

export const LB_SUMMARY_ICON = 'h-4 w-4 object-contain';

export const LB_SUMMARY_ICON_EMPTY = 'h-4 w-4 rounded bg-white/18';

/** Badge border, background and text per sequence level, indexed 0-6, and the one source SEQUENCE_BADGE_STYLES derives from */
export const LB_SEQ_BADGE_COLORS = [
  '', // S0 shows no badge
  'border-cyan-400/45 bg-cyan-500/15 text-cyan-200',
  'border-blue-400/45 bg-blue-500/15 text-blue-200',
  'border-violet-400/45 bg-violet-500/15 text-violet-200',
  'border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-200',
  'border-amber-400/55 bg-amber-500/20 text-amber-200',
  'border-spectro/60 bg-spectro/20 text-spectro',
] as const;

/**
 * Table sequence pill: the same ramp, widened a step per level, with a neutral S0 because the table always shows a pill
 *
 * - The pr-* literals stay spelled out for the Tailwind scanner
 */
const SEQUENCE_BADGE_PR = ['pr-2', 'pr-3', 'pr-4', 'pr-5', 'pr-6', 'pr-7', 'pr-8'] as const;
export const SEQUENCE_BADGE_STYLES = SEQUENCE_BADGE_PR.map((pr, level) =>
  `${pr} ${LB_SEQ_BADGE_COLORS[level] || 'border-border bg-background text-text-primary/75'}`,
) as readonly string[];

/** Min width of the sortable stat group, which header, skeleton and row must agree on or the labels drift from the cells */
export const TABLE_STAT_GROUP_MIN = 'min-w-163'; // 652px = SORTABLE_GROUP_GRID minimum
export const LB_STAT_GROUP_MIN = 'min-w-199'; // 796px = LB_SORTABLE_GROUP_GRID minimum

/** Sequence level from a track key like "s2_solo" or "nuke_s6", 0 when the key carries no token */
export function parseLBSeqLevel(trackKey: string): number {
  const m = trackKey.match(/(?:^|_)s(\d+)(?:_|$)/i);
  return m ? Math.min(6, parseInt(m[1], 10)) : 0;
}

/** Strip the leading "S{n} " from a track label where the sequence is shown separately */
export function stripLBSeqPrefix(label: string): string {
  return label.replace(/^S\d+\s+/, '');
}

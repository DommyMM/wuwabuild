'use client';

import React, { useId, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateSelectedStatsRV, DEFAULT_PREFERRED_STATS, getAvailablePreferredSubstats } from '@/lib/calculations/rollValues';
import { Character, Element } from '@/lib/character';
import { LBBuildDetailEntry, LBBoardOptimality, LBOptimalityReference } from '@/lib/lb';
import { formatFlatStat, formatPercentStat, normalizeSubstatKey } from './formatters';
import { getSummaryRowClasses, LB_SUMMARY_ICON, LB_SUMMARY_ICON_EMPTY, PERCENT_STAT_KEYS, RegionBadge, SORT_OPTIONS, STATUS_NEGATIVE_COLOR, STATUS_POSITIVE_COLOR } from './constants';
import { resolveCharacterBaseScaling } from './statColumns';
import { BuildExpandedEchoPanels } from './BuildExpandedEchoPanels';
import { buildSubstatSummary } from './substatSummary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverCard, HoverCardDescription } from '@/components/ui/HoverCard';

const POSITIVE_COLOR = STATUS_POSITIVE_COLOR;
const NEGATIVE_COLOR = STATUS_NEGATIVE_COLOR;

// Scores print in full: the tiers sit within a few percent of each other and of
// the build, and a compact 12.35M hides exactly the digits being compared.
const SCORE_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// Modifier deltas are read one at a time; padding them adds noise.
const DELTA_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

function fmtScore(value: number): string {
  return SCORE_FORMATTER.format(value);
}

function fmtDelta(value: number): string {
  return DELTA_FORMATTER.format(value);
}

// Backend layout keys are echo cost strings ("43311"). Hyphenate so they read
// as a cost split rather than an opaque id; anything else passes through.
function formatLayoutLabel(layout: string): string {
  return /^\d+$/.test(layout) ? layout.split('').join('-') : layout;
}

const SECTION_HEADING = 'text-2xs font-semibold uppercase tracking-[0.18em] text-text-primary/55';

type OptimalityTier = 'ceiling' | 'standardized' | 'low_roll';

// Tiers are differentiated by label and order, not by hue. Selection is the
// only accent, matching the Min/Mid/Max precedent in BuildSubstatUpgrades where
// the active tier alone carries the gold accent.
//
// Three colour channels, deliberately non-overlapping:
//   gold  = the tier you selected (card chrome and its tick on the track)
//   white = this build (the track fill and its score)
//   teal  = this build clears that reference (the card's ratio)
// Every tier is a searched-optimal build; they differ in roll quality and in how
// many substat lines do anything. Keys are the stored tier names. Standard (16
// useful lines at median rolls) lands on the live population median; Optimal
// (all 25 at median rolls) is a top ~0.3% build, so never call it "Median".
const TIER_META: Record<OptimalityTier, { label: string; rollLabel: string }> = {
  ceiling: { label: 'Ceiling', rollLabel: '25 useful lines, max rolls' },
  standardized: { label: 'Optimal', rollLabel: '25 useful lines, median rolls' },
  low_roll: { label: 'Standard', rollLabel: '16 useful lines, median rolls' },
};

const TIER_ORDER: OptimalityTier[] = ['low_roll', 'standardized', 'ceiling'];
const TICK_RING = '0 0 0 2px #1a1a1a';

interface TierRowProps {
  ref_: LBOptimalityReference;
  /** This build's score as a fraction of this tier's; undefined without a build score. */
  ratio?: number;
  isActive: boolean;
  onClick: () => void;
}

const EMPTY_REFERENCE: LBOptimalityReference = {
  tier: '',
  damage: 0,
  layout: '',
  setPattern: [],
  mainStats: [],
  substats: [],
  echoIds: [],
  topLevelStats: {},
  echoPanels: [],
  scoreModifiers: [],
};

// Beating a reference is worth marking; falling short of one is not a failure, so the low side is neutral
function ratioTextColor(ratio: number | undefined): string {
  if (ratio === undefined) return 'rgba(224,224,224,0.7)';
  return ratio >= 1 ? POSITIVE_COLOR : 'rgba(224,224,224,0.7)';
}

interface BenchmarkTrackProps {
  currentDamage: number;
  marks: Array<{ tier: OptimalityTier; damage: number }>;
  selectedTier: OptimalityTier;
}

/**
 * One scale for the whole benchmark: the track runs 0 → ceiling, the fill is
 * this build, and each reference tier is a tick on the same ruler.
 *
 * This replaces three per-card meters that each used their own tier as the
 * denominator and clamped at 100%. Any build that cleared the two lower tiers
 * therefore rendered two identical full bars, so the graphic said less the
 * better the build got, and no two of the three bar lengths were comparable.
 * The ratios live on the tier cards as text, one per tier beside the score it
 * divides by; text has none of the clamping problem the meters had.
 */
function BenchmarkTrack({ currentDamage, marks, selectedTier }: BenchmarkTrackProps) {
  // A build can in principle land past the ceiling (rounding, or an off-model
  // loadout); extend the ruler rather than clamp, so that stays visible.
  const trackMax = Math.max(currentDamage, ...marks.map((m) => m.damage));
  if (!(trackMax > 0)) return null;
  const pct = (value: number) => (value / trackMax) * 100;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-2xs font-semibold uppercase tracking-[0.16em] text-text-primary/55">This build</span>
        <span className="text-lg font-semibold tabular-nums text-white/88">{fmtScore(currentDamage)}</span>
      </div>
      <div className="relative mt-2 h-3.5 rounded bg-white/8">
        <div
          className="lb-bar-grow absolute inset-y-0 left-0 rounded bg-linear-to-b from-white/80 to-white/52"
          style={{ width: `${pct(currentDamage)}%` }}
        />
        {marks.map((mark) => {
          const isSelected = mark.tier === selectedTier;
          return (
            <span
              key={mark.tier}
              // Every tick overhangs the track so all three read as fixed marks
              // over the fill and over the empty track alike; the dark ring
              // separates them from the fill. Selection adds length and gold.
              className={`absolute w-0.5 -translate-x-1/2 rounded-full transition-colors duration-150 ${isSelected ? '-top-1.5 -bottom-1.5' : '-top-0.5 -bottom-0.5'}`}
              style={{
                left: `${pct(mark.damage)}%`,
                backgroundColor: isSelected ? 'var(--color-accent)' : 'rgba(224,224,224,0.85)',
                boxShadow: TICK_RING,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function TierRow({ ref_, ratio, isActive, onClick }: TierRowProps) {
  const tier = (ref_.tier in TIER_META ? ref_.tier : 'standardized') as OptimalityTier;
  const meta = TIER_META[tier];

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`min-w-0 cursor-pointer rounded-lg border p-2.5 text-left transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        isActive
          ? 'border-accent/70 bg-accent/9'
          : 'border-border/45 bg-black/15 hover:border-accent/40 hover:bg-background-secondary/40'
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className={`whitespace-nowrap text-2xs font-semibold uppercase tracking-[0.16em] ${isActive ? 'text-accent-hover' : 'text-text-primary/60'}`}>
          {meta.label}
        </span>
        <span className={`whitespace-nowrap text-base font-semibold tabular-nums ${isActive ? 'text-accent-hover' : 'text-text-primary/75'}`}>
          {fmtScore(ref_.damage)}
        </span>
      </span>
      <span className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-3xs text-text-primary/55">{meta.rollLabel}</span>
        {ratio !== undefined && (
          <span
            className="shrink-0 text-2xs font-semibold tabular-nums"
            style={{ color: ratioTextColor(ratio) }}
            aria-label={`This build is ${(ratio * 100).toFixed(1)}% of ${meta.label}`}
          >
            {(ratio * 100).toFixed(1)}%
          </span>
        )}
      </span>
    </button>
  );
}

interface BuildOptimalityPanelProps {
  data: LBBoardOptimality | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  baseDamage?: number;
  buildDetail: LBBuildDetailEntry;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
}

export const BuildOptimalityPanel: React.FC<BuildOptimalityPanelProps> = ({
  data,
  loading,
  error,
  onRetry,
  baseDamage,
  buildDetail,
  character,
  characterName,
  regionBadge,
}) => {
  const { t } = useLanguage();
  const { fetters, getEcho, getSubstatValues, statIcons, statTranslations } = useGameData();
  const panelId = useId();
  // Standard leads so the headline ratio reads against a typical build.
  const [selectedTier, setSelectedTier] = useState<OptimalityTier>('low_roll');

  const selectedRef = useMemo<LBOptimalityReference>(() => {
    if (!data) return EMPTY_REFERENCE;
    if (selectedTier === 'ceiling') return data.ceiling;
    if (selectedTier === 'low_roll') return data.lowRoll;
    return data.standardized;
  }, [data, selectedTier]);

  const selectedSetIds = useMemo(
    () => selectedRef.setPattern.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isFinite(value)),
    [selectedRef.setPattern],
  );
  const selectedSetEntries = useMemo(() => (
    selectedSetIds.map((setId) => ({
      id: setId,
      fetter: fetters.find((entry) => entry.id === setId) ?? null,
    }))
  ), [fetters, selectedSetIds]);

  const topLevelStats = useMemo(() => {
    const stats = selectedRef.topLevelStats;

    // Scaling stat drives which flat stat is worth showing: ATK/DEF are noise on
    // an HP scaler like Cartethyia, so only the character's own scaling flat is
    // kept (the other two flats are never in the order list below, so they drop).
    const scaling = resolveCharacterBaseScaling(character);
    const scalingKey = scaling === 'HP' ? 'hp' : scaling === 'DEF' ? 'def' : 'atk';
    const elementKey = character?.element && character.element !== Element.Rover
      ? `${character.element.toLowerCase()}_dmg`
      : null;

    // Same priority the build-row stat columns use (statColumns.ts), adapted for a
    // full sheet: crits lead (the row folds them into CV), then scaling stat,
    // element, offensive move-type bonuses, ER, healing. Off-element DMG and the
    // non-scaling flats are intentionally absent.
    const order: string[] = [
      'crit_rate', 'crit_dmg',
      scalingKey,
      ...(elementKey ? [elementKey] : []),
      'basic_attack_dmg', 'heavy_attack_dmg', 'resonance_skill_dmg', 'resonance_liberation_dmg',
      'energy_regen', 'healing_bonus',
    ];

    const seen = new Set<string>();
    return order.flatMap((key) => {
      if (seen.has(key)) return [];
      seen.add(key);
      const value = stats[key];
      if (!(value > 0)) return [];
      const option = SORT_OPTIONS.find((o) => o.key === key);
      if (!option) return [];
      const icon = statIcons?.[option.label] ?? statIcons?.[option.label.replace('%', '')] ?? '';
      return [{ key, label: option.label, value, icon, kind: (PERCENT_STAT_KEYS as ReadonlySet<string>).has(key) ? 'percent' as const : 'flat' as const }];
    });
  }, [character, selectedRef.topLevelStats, statIcons]);

  // The reference's substat list names only the useful stats. Standard fills its
  // unused lines with stats the character ignores; those stay out of this set,
  // so the echo cards render them dimmed and the tally leaves them out.
  const highlightedSubstats = useMemo(
    () => new Set(selectedRef.substats.flatMap((value) => {
      const key = value ? normalizeSubstatKey(value) : null;
      return key ? [key] : [];
    })),
    [selectedRef.substats],
  );
  // Same tally, same order, same pills as the build's own row above, so the two
  // can be read chip against chip.
  const blueprintSubstats = useMemo(
    () => buildSubstatSummary(selectedRef.echoPanels, statIcons, statTranslations)
      .filter((summary) => highlightedSubstats.size === 0 || highlightedSubstats.has(summary.type)),
    [highlightedSubstats, selectedRef.echoPanels, statIcons, statTranslations],
  );
  // Roll Value counts the same substats the build's own row selects by default
  // (the character's preferred stats), so the two RV pills compare directly. It
  // does not restate the tier: RV is lines x roll quality, which is exactly what
  // separates Standard (16 lines) from Optimal (25) and Optimal from Ceiling.
  const rvSelection = useMemo(
    () => getAvailablePreferredSubstats(selectedRef.echoPanels, character?.preferredStats ?? DEFAULT_PREFERRED_STATS),
    [character?.preferredStats, selectedRef.echoPanels],
  );
  const blueprintRV = useMemo(() => {
    const selected = new Map<string, { total: number; count: number }>();
    let rolls = 0;
    for (const entry of blueprintSubstats) {
      if (!rvSelection.has(entry.type)) continue;
      selected.set(entry.type, { total: entry.total, count: entry.count });
      rolls += entry.count;
    }
    return { rolls, value: rolls * calculateSelectedStatsRV(selected, getSubstatValues) };
  }, [blueprintSubstats, getSubstatValues, rvSelection]);
  // Stat pills plus the RV pill. The bench renders under both hosts without
  // knowing which; the expansion ladder is the narrower one and is safe in the
  // card's frame too.
  const blueprintClasses = getSummaryRowClasses(blueprintSubstats.length + 1, 'expansion');
  const syntheticDetail = useMemo<LBBuildDetailEntry>(() => ({
    ...buildDetail,
    id: `${buildDetail.id}-optimality-${selectedTier}`,
    buildState: {
      ...buildDetail.buildState,
      characterId: data?.characterId ?? buildDetail.buildState.characterId,
      weaponId: data?.weaponId ?? buildDetail.buildState.weaponId,
      characterLevel: data?.characterLevel ?? buildDetail.buildState.characterLevel,
      weaponLevel: data?.weaponLevel ?? buildDetail.buildState.weaponLevel,
      forte: data?.forte ?? buildDetail.buildState.forte,
      echoPanels: selectedRef.echoPanels,
    },
  }), [buildDetail, data, selectedTier, selectedRef.echoPanels]);

  if (loading) {
    return (
      // Mirrors the real layout (track, tier selector, summary, stat sheet) so
      // the panel does not jump when the data lands.
      <div className="animate-pulse overflow-hidden rounded-lg border border-border/45 bg-background-secondary/20">
        <div className="border-b border-border/45 px-3 py-3 sm:px-4">
          <div className="h-3 w-40 rounded bg-white/8" />
          <div className="mt-3 flex items-baseline justify-between">
            <div className="h-2.5 w-20 rounded bg-white/8" />
            <div className="h-4 w-24 rounded bg-white/10" />
          </div>
          <div className="mt-2 h-3.5 rounded bg-white/8" />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg border border-border/45 bg-black/15" />
            ))}
          </div>
        </div>
        <div className="space-y-4 px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="h-3 w-72 max-w-[60%] rounded bg-white/8" />
            <div className="h-8 w-40 rounded-md bg-white/8" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 flex-auto rounded-md border border-border/45 bg-black/15" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner onRetry={onRetry}>{error}</ErrorBanner>
    );
  }

  if (!data) return null;

  const currentDamage = (baseDamage && baseDamage > 0) ? baseDamage : data.currentDamage;
  const hasCurrent = currentDamage !== undefined && currentDamage > 0;

  const vsCeiling = hasCurrent && data.ceilingDamage > 0
    ? currentDamage / data.ceilingDamage
    : data.currentVsCeiling;
  const vsStd = hasCurrent && data.standardizedDamage > 0
    ? currentDamage / data.standardizedDamage
    : data.currentVsStandardized;
  const vsLowRoll = hasCurrent && data.lowRoll.damage > 0
    ? currentDamage / data.lowRoll.damage
    : undefined;

  const ratioByTier: Record<OptimalityTier, number | undefined> = {
    low_roll: vsLowRoll,
    standardized: vsStd,
    ceiling: vsCeiling,
  };
  const refByTier: Record<OptimalityTier, LBOptimalityReference> = {
    low_roll: data.lowRoll,
    standardized: data.standardized,
    ceiling: data.ceiling,
  };
  const marks = TIER_ORDER
    .map((tier) => ({ tier, damage: refByTier[tier].damage }))
    .filter((mark) => mark.damage > 0);
  const energyRegen = selectedRef.topLevelStats.energy_regen ?? 0;
  const meetsErTarget = data.erTarget <= 0 || energyRegen >= data.erTarget;
  const layoutLabel = formatLayoutLabel(selectedRef.layout);

  return (
    <div className="overflow-hidden rounded-lg border border-border/45 bg-background-secondary/20">
      <div className="border-b border-border/45 px-3 py-3 sm:px-4">
        <h3 className={SECTION_HEADING}>Reference Benchmark</h3>
        <p className="mt-1 max-w-3xl text-2xs leading-relaxed text-text-primary/55">
          Best loadout found for each tier. Select one to see its stats and Echo layout.
        </p>

        {hasCurrent && (
          <BenchmarkTrack
            currentDamage={currentDamage}
            marks={marks}
            selectedTier={selectedTier}
          />
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TIER_ORDER.map((tier) => (
            <TierRow
              key={tier}
              ref_={refByTier[tier]}
              ratio={ratioByTier[tier]}
              isActive={selectedTier === tier}
              onClick={() => setSelectedTier(tier)}
            />
          ))}
        </div>
      </div>

      {/* Keyed on the tier so switching crossfades the summary, stat sheet and
          Echo blueprint together. Blur bridges the two states: without it the
          old and new stat sheets read as two objects overlapping rather than
          one sheet changing. */}
      <div key={selectedTier} className="lb-tier-swap space-y-4 px-3 py-3 sm:px-4">
        {/* One line, not a card: the selected card already names the tier and
            its score, so what is left is the loadout's shape and what adjusted
            its score. The score is always the full scored rotation, so the line
            lists only what varies: the ER target the tier reaches (red below it,
            where ER scaling costs score; green at or above, where surplus costs
            nothing) and any team-facing score modifiers (Danjin's Moonlit/Heron,
            healers, Cantarella). Set chips sit at the far end. */}
        <section aria-labelledby={`${panelId}-summary`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h4 id={`${panelId}-summary`} className="sr-only">{TIER_META[selectedTier].label} loadout</h4>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {layoutLabel && (
              <span className={SECTION_HEADING}>{layoutLabel} layout</span>
            )}
            {data.erTarget > 0 && (
              <span className="flex items-center gap-1.5">
                {layoutLabel && <span aria-hidden="true" className="pr-1.5 text-text-primary/25">·</span>}
                <span className="text-text-primary/55">Energy target</span>
                <span className="font-semibold tabular-nums" style={{ color: meetsErTarget ? POSITIVE_COLOR : NEGATIVE_COLOR }}>
                  {formatPercentStat(energyRegen)} / {formatPercentStat(data.erTarget)}
                </span>
              </span>
            )}
            {selectedRef.scoreModifiers.map((modifier) => (
              <span key={modifier.key || modifier.name} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="pr-1.5 text-text-primary/25">·</span>
                <span className="text-text-primary/55">{modifier.name}</span>
                <span className="shrink-0 font-semibold tabular-nums" style={{ color: modifier.delta >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR }}>
                  {modifier.delta >= 0 ? '+' : '−'}{fmtDelta(Math.abs(modifier.delta))}
                </span>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pr-1">
            {selectedSetEntries.map(({ id, fetter }) => (
              <div key={id} className="flex items-center gap-2 rounded-md border border-border/45 bg-background-secondary/40 px-2 py-1.5">
                {fetter?.icon ? (
                  <img src={fetter.icon} alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" loading="lazy" />
                ) : (
                  <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded bg-white/8" />
                )}
                <span className="whitespace-nowrap text-xs font-semibold text-text-primary/75">
                  {fetter ? t(fetter.name) : `Set ${id}`}
                </span>
              </div>
            ))}
            {selectedSetEntries.length === 0 && (
              <span className="text-xs text-text-primary/55">No active set bonus</span>
            )}
          </div>
        </section>

        <section aria-labelledby={`${panelId}-stats`}>
          <h4 id={`${panelId}-stats`} className={SECTION_HEADING}>Final Build Stats</h4>
          {/* flex-auto lets each badge start at its own content width and then grow
              to share the row: short stats (Crit Rate, ATK) stay compact while a long
              one (Resonance Liberation DMG Bonus) keeps its label on one line via
              whitespace-nowrap, instead of every badge being forced to a single width
              and wrapping the long label. At realistic stat counts the whole sheet
              fits one row (~1264px inner); it wraps only when it genuinely can't. */}
          <dl className="mt-2 flex flex-wrap gap-1.5">
            {topLevelStats.map((entry) => (
              <div
                key={`${selectedTier}-tls-${entry.key}`}
                className="flex flex-auto flex-col rounded-md border border-border/45 bg-black/15 px-2.5 py-2"
              >
                {/* Value + icon lead so the number line is the aligned anchor across a
                    row; the label rides below as a single-line caption. */}
                <dd className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-white/85">
                  {entry.icon && <img src={entry.icon} alt="" width={16} height={16} className="h-4 w-4 shrink-0 object-contain opacity-80" loading="lazy" />}
                  {entry.kind === 'percent' ? formatPercentStat(entry.value) : formatFlatStat(entry.value)}
                </dd>
                <dt className="mt-1 whitespace-nowrap text-3xs uppercase tracking-widest text-text-primary/55">
                  {entry.label}
                </dt>
              </div>
            ))}
            {topLevelStats.length === 0 && (
              <div className="w-full rounded-md border border-border/45 bg-black/15 px-3 py-2 text-xs text-text-primary/55">
                <dt className="sr-only">Status</dt>
                <dd>Final stats are unavailable for this reference.</dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby={`${panelId}-echoes`} className="pt-1">
          {/* Visually hidden. Each echo card's set icon is absolutely positioned
              above its own top edge, so the first card's icon sat on top of this
              heading. The row is unmistakable without it: it renders the same
              echo cards as the build row, under a stat sheet that already names
              the tier. The label stays for the section's accessible name. */}
          <h4 id={`${panelId}-echoes`} className="sr-only">Echo Blueprint</h4>
          <div className="w-full space-y-4 font-ropa tracking-wide">
            {/* Identical to the build's own row, because the two are read slot
                against slot. The per-echo substats stay: the tally below is an
                aggregate, and an aggregate does not tell you what one echo has
                to look like when you go farming for it. */}
            <BuildExpandedEchoPanels
              detail={syntheticDetail}
              character={character}
              characterName={characterName}
              regionBadge={regionBadge}
              statIcons={statIcons}
              getEcho={getEcho}
              translateText={(i18n, fallback) => t(i18n ?? { en: fallback })}
              activeSelectedSubstats={highlightedSubstats}
              hasSelectedSubstats={highlightedSubstats.size > 0}
              showHeader={false}
            />

            {/* Pills outside the Roll Value selection dim exactly as in the
                build's own row, so the two rows read chip against chip. */}
            {blueprintSubstats.length > 0 && (
              <div className={blueprintClasses.row}>
                {blueprintSubstats.map((summary) => (
                  <span
                    key={`blueprint-${selectedTier}-${summary.type}`}
                    className={`${blueprintClasses.pillStatic} ${
                      rvSelection.has(summary.type) ? 'border-amber-300/75' : 'border-amber-300/45 opacity-40'
                    }`}
                    title={summary.type}
                  >
                    <span className="text-amber-300">x{summary.count}</span>
                    {summary.icon ? (
                      <img src={summary.icon} alt="" className={LB_SUMMARY_ICON} />
                    ) : (
                      <span className={LB_SUMMARY_ICON_EMPTY} />
                    )}
                    <span className={blueprintClasses.val}>
                      {summary.isPercent ? formatPercentStat(summary.total) : formatFlatStat(summary.total)}
                    </span>
                  </span>
                ))}

                {blueprintRV.rolls > 0 && (
                  <HoverCard
                    placement="top"
                    width="md"
                    title="Roll Value"
                    subtitle={`${blueprintRV.rolls} roll${blueprintRV.rolls === 1 ? '' : 's'} counted`}
                    body={(
                      <HoverCardDescription>
                        Counted on the same substats as your build&apos;s row, so the two compare
                        directly. Each roll is scored against the highest value that stat can
                        roll, and the figure sums every counted roll. Ceiling rolls every line at
                        its maximum; Optimal and Standard roll at the median.
                      </HoverCardDescription>
                    )}
                  >
                    <div className={`${blueprintClasses.rv} border border-amber-300/75`}>
                      <span className="text-amber-300">x{blueprintRV.rolls}</span>
                      <span>•</span>
                      <span className="text-amber-300">RV</span>
                      <span className={blueprintClasses.val}>{blueprintRV.value.toFixed(1)}%</span>
                    </div>
                  </HoverCard>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

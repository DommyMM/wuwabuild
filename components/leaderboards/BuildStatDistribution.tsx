'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { useGameData } from '@/contexts/GameDataContext';
import { LanguageCode, useLanguage } from '@/contexts/LanguageContext';
import { getLBStatCode, getLBStatLabel, interpolatePercentile, LBBoardDistribution, LBBuildDetailEntry, LBDistributionAxis, LBDistributionCohort, LBStatSortKey } from '@/lib/lb';
import { LB_EXPANDED_OPAQUE_SURFACE, STATUS_NEUTRAL_COLOR } from './constants';
import { formatStatByKey } from './formatters';

const YOU_STROKE = 'var(--color-accent-hover)';
const YOU_FILL = 'color-mix(in srgb, var(--color-accent) 24%, transparent)';
const BAND_FILL = 'color-mix(in srgb, var(--color-text-primary) 7%, transparent)';
const CHROME_STROKE = 'color-mix(in srgb, var(--color-text-primary) 14%, transparent)';
const RIM_STROKE = 'color-mix(in srgb, var(--color-text-primary) 22%, transparent)';
const MEDIAN_STROKE = 'color-mix(in srgb, var(--color-text-primary) 34%, transparent)';
// The selected spoke brightens but stays a neutral, because accent inside the plot area means "this build"
const ACTIVE_SPOKE_STROKE = 'color-mix(in srgb, var(--color-text-primary) 45%, transparent)';

// Movement on screen wants ease-in-out while something entering wants ease-out
const EASE_MOVE = 'cubic-bezier(0.77,0,0.175,1)';
const EASE_ENTER = 'cubic-bezier(0.23,1,0.32,1)';

// Wider than tall because the 3 and 9 o'clock labels extend horizontally from the rim and the 12/6 ones do not
const VIEW_W = 420;
const VIEW_H = 310;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const RADIUS = 115;
const LABEL_RADIUS = RADIUS + 26;
const RINGS = [0.25, 0.5, 0.75, 1];

const ELEMENT_KEYS: LBStatSortKey[] = ['aero_dmg', 'glacio_dmg', 'fusion_dmg', 'electro_dmg', 'havoc_dmg', 'spectro_dmg'];
const MOVE_KEYS: LBStatSortKey[] = ['basic_attack_dmg', 'heavy_attack_dmg', 'resonance_skill_dmg', 'resonance_liberation_dmg'];
/**
 * Sibling sets a rim label strips its shared wrapper against, matched in order
 *
 * Catch-all lends sibling-less Healing the bonus affixes, and goes last since specific families strip tighter
 */
const AXIS_FAMILIES: LBStatSortKey[][] = [ELEMENT_KEYS, MOVE_KEYS, [...ELEMENT_KEYS, ...MOVE_KEYS, 'healing_bonus']];

// Glyph budgets, not pixel budgets: CJK glyphs are full-width, so the same rim arc holds fewer
const RIM_BUDGET_LATIN = 8;
const RIM_BUDGET_CJK = 5;
const SEPARATOR = /[\s :·・\-—]/u;

const glyphCount = (value: string): number => [...value].length;
const hasCJK = (value: string): boolean => /[぀-ヿ㐀-鿿가-힯]/u.test(value);
const isLatinScript = (value: string): boolean => /^[\p{Script=Latin}\p{Nd}\s'’.\-:]+$/u.test(value);
const rimBudget = (value: string): number => (hasCJK(value) ? RIM_BUDGET_CJK : RIM_BUDGET_LATIN);

/** Longest prefix and suffix every name in a family shares, snapped back to a separator outside CJK */
function sharedAffixes(names: string[]): { prefix: string; suffix: string } {
  if (names.length < 2) return { prefix: '', suffix: '' };
  const first = names[0];

  let head = 0;
  while (head < first.length && names.every((name) => name[head] === first[head])) head += 1;
  let tail = 0;
  while (
    tail < first.length - head
    && names.every((name) => name[name.length - 1 - tail] === first[first.length - 1 - tail])
  ) tail += 1;

  let prefix = first.slice(0, head);
  let suffix = first.slice(first.length - tail);
  // Raw common affix stops mid-word, so snap back to a separator, but CJK has none and keeps the raw affix
  // German move names share "SCH-Bonus de", and trimming that leaves "s Standardangriffs"
  if (!hasCJK(first)) {
    const lastBreak = [...prefix].reduce((at, char, i) => (SEPARATOR.test(char) ? i : at), -1);
    prefix = lastBreak < 0 ? '' : prefix.slice(0, lastBreak + 1);
    const firstBreak = [...suffix].findIndex((char) => SEPARATOR.test(char));
    suffix = firstBreak < 0 ? '' : suffix.slice(firstBreak);
  }
  return { prefix, suffix };
}

function stripFamilyAffixes(full: string, family: string[]): string {
  const { prefix, suffix } = sharedAffixes(family);
  let out = full;
  if (prefix && out.startsWith(prefix)) out = out.slice(prefix.length);
  if (suffix && out.endsWith(suffix)) out = out.slice(0, out.length - suffix.length);
  out = out.replace(/^[\s:·・\-—]+|[\s:·・\-—]+$/gu, '');
  return out || full;
}

/** Initials of the significant words, null outside Latin script */
function initialism(stem: string): string | null {
  // Initialism in Cyrillic or Thai is not a convention anyone reads, so those take the stat code
  if (!isLatinScript(stem)) return null;
  // Short lowercase words are particles, so "Liberación de resonancia" gives LR in its own word order
  const words = stem
    .split(/[\s ]+/u)
    .filter((word) => word && !(glyphCount(word) <= 3 && word === word.toLowerCase()));
  if (words.length < 2) return null;
  return words.map((word) => [...word][0].toUpperCase()).join('');
}

/** The three stats `getLBStatCode` renders too terse to stand on a spoke, since a lone "A" is not ATK to anybody */
const FLAT_CODE_LABELS: Partial<Record<LBStatSortKey, string>> = { atk: 'ATK', hp: 'HP', def: 'DEF' };

function axisCode(key: LBStatSortKey): string {
  return FLAT_CODE_LABELS[key] ?? getLBStatCode(key);
}

/**
 * Rim label within the glyph budget, derived from the localized name
 *
 * Tries the full name, then the name without its family's shared wrapper, then initials, else the stat code
 */
function axisShortLabel(
  key: LBStatSortKey,
  language: LanguageCode,
  statTranslations: Record<string, Record<string, string>> | null,
): string {
  const full = axisFullLabel(key, language, statTranslations);
  if (glyphCount(full) <= rimBudget(full)) return full;

  // Family members share one wrapper, so what the names share is boilerplate and what differs is the label
  // Covers " DMG Bonus", "Bonus : Dégâts " and "伤害加成" without knowing which shape a language uses
  const family = AXIS_FAMILIES.find((keys) => keys.includes(key));
  const siblings = family
    ? family.map((sibling) => axisFullLabel(sibling, language, statTranslations)).filter(Boolean)
    : [];
  const stem = siblings.length > 1 ? stripFamilyAffixes(full, siblings) : full;
  if (stem !== full && glyphCount(stem) <= rimBudget(stem)) {
    // Spanish yields "curación" here, and a lowercase label beside ATQ reads as a typo
    return stem.charAt(0).toUpperCase() + stem.slice(1);
  }

  const initials = initialism(stem);
  if (initials && glyphCount(initials) <= rimBudget(initials)) return initials;

  return axisCode(key);
}

/** Unabbreviated name for the tooltip, in the reader's language */
function axisFullLabel(
  key: LBStatSortKey,
  language: LanguageCode,
  statTranslations: Record<string, Record<string, string>> | null,
): string {
  // `getLBStatLabel` is the join key because `Stats.json`, and so `statTranslations` and `statIcons`, is keyed by it
  const canonical = getLBStatLabel(key);
  // Truthiness rather than `??` because some languages ship a blank string for a stat
  return statTranslations?.[canonical]?.[language] || canonical;
}

/**
 * Cohort selector labels, phrased in parallel so the control reads as one series of narrowing fields
 *
 * The backend publishes `top1` only on boards large enough to clear its sample floor
 */
const COHORT_LABELS: Record<string, string> = {
  all: 'All builds',
  top10: 'Top 10%',
  top1: 'Top 1%',
};

/** How the comparison row names its cohort. "All builds median" reads worse. */
function medianLabel(cohortKey: string, cohortLabel: string): string {
  return cohortKey === 'all' ? 'board median' : `${cohortLabel} median`;
}

function formatStat(key: LBStatSortKey, value: number): string {
  if (!Number.isFinite(value)) return '—';
  return formatStatByKey(key, value);
}

/** Standing in the cohort selector's own words, "top 10%" above the median or "bottom 15%" below it */
function formatStanding(fraction: number): string {
  const pct = Math.round(fraction * 100);
  // Both directions are true at every value, so pick the shorter half and nothing has to be inverted to read it
  if (pct >= 50) return `top ${100 - pct}%`;
  return `bottom ${pct}%`;
}

/** Stat value at one rung of the ladder, NaN when the board did not publish that rung */
function quantileAt(axis: LBDistributionAxis, ladder: number[], target: number): number {
  const index = ladder.findIndex((q) => Math.abs(q - target) < 1e-9);
  return index >= 0 ? axis.quantiles[index] : Number.NaN;
}

interface AxisView {
  key: LBStatSortKey;
  label: string;
  fullLabel: string;
  /** The build's own value, not the cohort's */
  value: number;
  /** 0-1 position on the cohort's ladder, null when degenerate */
  percentile: number | null;
  p50: number;
  /** Ladder has no spread (Healing Bonus is 0 for every build on a DPS board), so a percentile would be invented */
  degenerate: boolean;
}

/** Radius fraction for a vertex */
function radiusFraction(view: AxisView): number {
  // Degenerate axis sits on the median ring, not the centre, since zero variance means this build is the median
  if (view.degenerate || view.percentile === null) return 0.5;
  return view.percentile;
}

function pointOn(angle: number, radius: number): [number, number] {
  return [CX + (Math.cos(angle) * radius), CY + (Math.sin(angle) * radius)];
}

/** Angles start at 12 o'clock and run clockwise */
function axisAngle(index: number, count: number): number {
  return (-Math.PI / 2) + ((index / count) * Math.PI * 2);
}

function ringVertices(fraction: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const [x, y] = pointOn(axisAngle(i, count), fraction * RADIUS);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
}

/** Grid ring as a polygon, so it shares geometry with the data and a vertex reads against the segment beside it */
function ringPoints(fraction: number, count: number): string {
  return ringVertices(fraction, count).join(' ');
}

/** Middle-half band as a real annulus: outer ring, inner ring, even-odd hole */
function bandPath(count: number): string {
  const outer = ringVertices(0.75, count);
  const inner = ringVertices(0.25, count);
  return `M ${outer.join(' L ')} Z M ${inner.join(' L ')} Z`;
}

/** One vertex per axis, at its own percentile radius */
function seriesPoints(views: AxisView[]): string {
  return views
    .map((view, i) => {
      const [x, y] = pointOn(axisAngle(i, views.length), radiusFraction(view) * RADIUS);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/** Invisible wedge covering one axis's angular slice, so the whole chart is hoverable */
function wedgePath(index: number, count: number): string {
  const half = Math.PI / count;
  const mid = axisAngle(index, count);
  const [x1, y1] = pointOn(mid - half, RADIUS + 20);
  const [x2, y2] = pointOn(mid + half, RADIUS + 20);
  return `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS + 20} ${RADIUS + 20} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/** One-line status where the section's content would be */
const SectionNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  // Sized to its text, because a full-width bordered card frames an absence as content
  <p className="mx-auto w-fit max-w-full px-4 py-1.5 text-center text-xs text-text-primary/45">
    {children}
  </p>
);

const LegendRow: React.FC<{ swatch: React.ReactNode; children: React.ReactNode }> = ({ swatch, children }) => (
  <div className="flex items-center gap-2">
    <span className="flex h-2 w-3 shrink-0 items-center justify-center">{swatch}</span>
    <span>{children}</span>
  </div>
);

interface BuildStatDistributionProps {
  data: LBBoardDistribution | null;
  buildDetail: LBBuildDetailEntry;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const BuildStatDistribution: React.FC<BuildStatDistributionProps> = ({
  data,
  buildDetail,
  loading,
  error,
  onRetry,
}) => {
  const { statIcons, statTranslations } = useGameData();
  const { language } = useLanguage();
  const [cohortKey, setCohortKey] = useState('all');
  // Index and open flag are one state because the tooltip stays mounted through its fade-out and keeps showing its index
  const [axisState, setAxisState] = useState<{ index: number; open: boolean } | null>(null);

  const openAxis = useCallback((index: number) => setAxisState({ index, open: true }), []);
  const closeAxis = useCallback(() => setAxisState((prev) => (prev ? { ...prev, open: false } : null)), []);

  const cohort: LBDistributionCohort | null = useMemo(() => {
    if (!data || data.cohorts.length === 0) return null;
    return data.cohorts.find((entry) => entry.key === cohortKey) ?? data.cohorts[0];
  }, [cohortKey, data]);

  const views = useMemo<AxisView[]>(() => {
    if (!data || !cohort) return [];
    const ladder = data.quantileLadder;

    // API order is the winding order: the backend emits axes by their role on this board, not alphabetically
    // Crit pair, the flat the board scales on, its element, the bonus it scales with, ER, then the flats it ignores
    // Re-sorting here by stat key breaks the lobe, and the API order is already deterministic per board
    return cohort.axes.map((axis) => {
      const value = buildDetail.stats[getLBStatCode(axis.key)] ?? 0;
      const floor = axis.quantiles[0] ?? 0;
      const ceiling = axis.quantiles[axis.quantiles.length - 1] ?? 0;
      const degenerate = !(ceiling - floor > 0);
      return {
        key: axis.key,
        label: axisShortLabel(axis.key, language, statTranslations),
        fullLabel: axisFullLabel(axis.key, language, statTranslations),
        value,
        percentile: degenerate ? null : interpolatePercentile(value, ladder, axis.quantiles),
        p50: quantileAt(axis, ladder, 0.5),
        degenerate,
      };
    });
  }, [buildDetail.stats, cohort, data, language, statTranslations]);

  const count = views.length;

  const stepAxis = useCallback((delta: number) => {
    if (count === 0) return;
    setAxisState((prev) => {
      // Stepping after a blur resumes where the reader left off rather than snapping to the top of the chart
      if (!prev) return { index: delta > 0 ? 0 : count - 1, open: true };
      return { index: (prev.index + delta + count) % count, open: true };
    });
  }, [count]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        stepAxis(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        stepAxis(-1);
        break;
      case 'Home':
        event.preventDefault();
        openAxis(0);
        break;
      case 'End':
        event.preventDefault();
        openAxis(count - 1);
        break;
      case 'Escape':
        closeAxis();
        break;
      default:
        break;
    }
  }, [closeAxis, count, openAxis, stepAxis]);

  if (loading) {
    return <SectionNote>Loading comparison...</SectionNote>;
  }
  if (error) {
    return <ErrorBanner onRetry={onRetry}>{error}</ErrorBanner>;
  }
  // Two different absences, so conflating them would misreport a brand-new board as an unpopular one
  // Null payload is a 404, because the axes come off the board's optimality reference and an unevaluated board has none
  // Empty cohort list is a board that exists but sits under the backend's publish floor
  if (!data) {
    return <SectionNote>No reference build for this board yet, so there is nothing to compare against.</SectionNote>;
  }
  if (!cohort || count === 0) {
    return <SectionNote>Not enough builds on this board to compare against yet.</SectionNote>;
  }

  const cohortLabel = COHORT_LABELS[cohort.key] ?? cohort.key;
  const comparisonLabel = medianLabel(cohort.key, cohortLabel);
  const sampleSize = cohort.sampleSize.toLocaleString();

  // `activeAxis` drives the highlight and the announcement, going null the moment the reader leaves
  // `shownAxis` drives the tooltip and outlives that by one exit animation
  const isOpen = axisState?.open ?? false;
  const activeAxis = isOpen ? axisState?.index ?? null : null;
  const active = activeAxis === null ? null : views[activeAxis] ?? null;
  const activePlaced = active !== null && !active.degenerate && active.percentile !== null;

  const shownAxis = axisState?.index ?? null;
  const shown = shownAxis === null ? null : views[shownAxis] ?? null;
  const shownPlaced = shown !== null && !shown.degenerate && shown.percentile !== null;
  const shownPoint = shownAxis === null || shown === null
    ? null
    : pointOn(axisAngle(shownAxis, count), radiusFraction(shown) * RADIUS);
  const shownIcon = shown && statIcons ? statIcons[getLBStatLabel(shown.key)] : undefined;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {data.cohorts.length > 1 && (
          <div className="inline-flex items-center rounded-md border border-border/45 bg-background-secondary/40 p-0.5">
            {data.cohorts.map((entry) => {
              const isActive = entry.key === cohort.key;
              return (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setCohortKey(entry.key)}
                  className={`rounded px-2.5 py-1 text-2xs font-semibold tracking-wide transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                    isActive
                      ? 'bg-accent/16 text-accent-hover'
                      : 'text-text-primary/55 hover:text-text-primary'
                  }`}
                >
                  {COHORT_LABELS[entry.key] ?? entry.key}
                </button>
              );
            })}
          </div>
        )}

        {/* Only the two marks, the band and the radial scale, since everything else on the chart names itself */}
        <HoverTooltip
          placement="top"
          triggerClassName="inline-flex"
          content={
            <div className="space-y-1.5 text-left text-2xs text-text-primary/72">
              <LegendRow swatch={<span className="h-1.5 w-1.5 rounded-full" style={{ background: YOU_STROKE }} />}>
                This build
              </LegendRow>
              <LegendRow swatch={<span className="w-3 border-t border-dashed" style={{ borderColor: MEDIAN_STROKE }} />}>
                {comparisonLabel.charAt(0).toUpperCase() + comparisonLabel.slice(1)}
              </LegendRow>
              <LegendRow swatch={<span className="h-2 w-3 rounded-xs border" style={{ background: BAND_FILL, borderColor: CHROME_STROKE }} />}>
                Middle half of the {sampleSize} compared
              </LegendRow>
              {/* Standing, not quality: further out is only better on the offensive axes, since HP and DEF past the
                  board are rolls spent wrong and ER past its rotation target is capped out of Score */}
              <p className="pt-0.5 text-text-primary/45">Further out = higher than more of the board.</p>
            </div>
          }
        >
          <span
            tabIndex={0}
            role="button"
            aria-label="Chart legend"
            className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-text-primary/45 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </HoverTooltip>
      </div>

      {/* One focus stop for the whole chart, stepped with the arrow keys, since a wedge has nothing to activate */}
      <div
        tabIndex={0}
        role="group"
        aria-label={`Stat comparison against ${cohortLabel.toLowerCase()}, ${sampleSize} builds. Use the arrow keys to read each stat.`}
        onKeyDown={handleKeyDown}
        onBlur={closeAxis}
        className="relative mx-auto w-full max-w-105 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full"
          aria-hidden
          onMouseLeave={closeAxis}
        >
          {/* Middle half is an even-odd annulus, not a disc with a surface-coloured disc over it, so it survives
              either background */}
          <path d={bandPath(count)} fill={BAND_FILL} fillRule="evenodd" />
          {RINGS.map((ring) => (
            <polygon
              key={ring}
              points={ringPoints(ring, count)}
              fill="none"
              stroke={ring === 1 ? RIM_STROKE : CHROME_STROKE}
              strokeWidth={1}
              strokeLinejoin="round"
            />
          ))}
          {views.map((view, i) => {
            const [x, y] = pointOn(axisAngle(i, count), RADIUS);
            return (
              <line
                key={view.key}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke={i === activeAxis ? ACTIVE_SPOKE_STROKE : CHROME_STROKE}
                strokeWidth={1}
              />
            );
          })}
          <polygon
            points={ringPoints(0.5, count)}
            fill="none"
            stroke={MEDIAN_STROKE}
            strokeWidth={1}
            strokeDasharray="3 3"
            strokeLinejoin="round"
          />

          {/* After the whole field, so the series stroke sits over the rings and the median dashes */}
          <polygon
            points={seriesPoints(views)}
            fill={YOU_FILL}
            stroke={YOU_STROKE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {views.map((view, i) => {
            const [x, y] = pointOn(axisAngle(i, count), radiusFraction(view) * RADIUS);
            const isActive = i === activeAxis;
            // r is not transitionable, so hover growth rides a transform on a fixed-radius circle
            return (
              <circle
                key={view.key}
                cx={x}
                cy={y}
                r={4}
                fill={view.degenerate ? STATUS_NEUTRAL_COLOR : YOU_STROKE}
                stroke="var(--color-background-secondary)"
                strokeWidth={isActive ? 2 : 0}
                className="origin-center transform-fill transition-transform duration-150 ease-out motion-reduce:transition-none"
                style={{ transform: isActive ? 'scale(1.5)' : 'scale(1)' }}
              />
            );
          })}

          {views.map((view, i) => {
            const [lx, ly] = pointOn(axisAngle(i, count), LABEL_RADIUS);
            const anchor = Math.abs(lx - CX) < 4 ? 'middle' : lx > CX ? 'start' : 'end';
            const isActive = i === activeAxis;
            return (
              <text
                key={view.key}
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="pointer-events-none text-[12px] font-medium transition-[fill,opacity] duration-150"
                fill={view.degenerate ? STATUS_NEUTRAL_COLOR : isActive ? YOU_STROKE : 'var(--color-text-primary)'}
                opacity={view.degenerate ? 0.5 : isActive ? 1 : 0.8}
              >
                {view.label}
              </text>
            );
          })}

          {/* Hit targets last so the whole wedge is live, not just the vertex dot */}
          {views.map((view, i) => (
            <path
              key={view.key}
              d={wedgePath(i, count)}
              fill="transparent"
              aria-hidden
              onMouseEnter={() => openAxis(i)}
              onPointerDown={() => openAxis(i)}
              className="cursor-pointer outline-none"
            />
          ))}
        </svg>

        {/* One mounted tooltip that slides between spokes, keyed to nothing, because remounting per axis teleports it.
            The mover is a full-size overlay so a percentage translate resolves against the chart's own box, which
            keeps the move on `transform` and works at any width without measuring. */}
        {shown && shownPoint && (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 transition-transform duration-200 motion-reduce:transition-none`}
            style={{
              transform: `translate(${(Math.min(Math.max(shownPoint[0], 76), VIEW_W - 76) / VIEW_W) * 100}%, ${(shownPoint[1] / VIEW_H) * 100}%)`,
              transitionTimingFunction: EASE_MOVE,
            }}
          >
            <div
              className={`absolute top-0 left-0 -translate-x-1/2 rounded-md border border-border px-2.5 py-1.5 text-2xs shadow-lg transition-[opacity,scale] motion-reduce:transition-none ${LB_EXPANDED_OPAQUE_SURFACE} ${
                shownPoint[1] < CY ? 'translate-y-2.5 origin-top' : 'translate-y-[calc(-100%-10px)] origin-bottom'
              } ${
                // Exit is quicker than entry because the reader is already looking somewhere else
                isOpen ? 'scale-100 opacity-100 duration-150' : 'scale-95 opacity-0 duration-100'
              }`}
              style={{ transitionTimingFunction: EASE_ENTER }}
            >
              <p className="mb-1 flex items-center gap-1.5 font-semibold whitespace-nowrap text-text-primary">
                {shownIcon && <img src={shownIcon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
                {shown.fullLabel}
              </p>
              {shownPlaced ? (
                <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-0.5 whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: YOU_STROKE }} />
                  <span className="text-right font-semibold tabular-nums text-accent-hover">
                    {formatStat(shown.key, shown.value)}
                  </span>
                  <span className="text-text-primary/55">{formatStanding(shown.percentile as number)}</span>

                  <span className="w-1.5 border-t border-dashed" style={{ borderColor: MEDIAN_STROKE }} />
                  <span className="text-right tabular-nums text-text-primary/70">
                    {formatStat(shown.key, shown.p50)}
                  </span>
                  <span className="text-text-primary/40">{comparisonLabel}</span>
                </div>
              ) : (
                <p className="whitespace-nowrap text-text-primary/55">
                  {formatStat(shown.key, shown.value)} · no spread on this board
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Always mounted, because a live region has to be in the tree before it can announce, and the tooltip is
          aria-hidden and lags the live axis by one exit animation anyway */}
      <p aria-live="polite" className="sr-only">
        {active
          ? activePlaced
            ? `${active.fullLabel}: ${formatStat(active.key, active.value)}, ${formatStanding(active.percentile as number)} of ${cohortLabel.toLowerCase()}. ${comparisonLabel} ${formatStat(active.key, active.p50)}.`
            : `${active.fullLabel}: ${formatStat(active.key, active.value)}. Every build in ${cohortLabel.toLowerCase()} has the same value, so there is no spread to place this one in.`
          : ''}
      </p>
    </section>
  );
};

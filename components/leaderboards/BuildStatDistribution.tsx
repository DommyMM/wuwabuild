'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { useGameData } from '@/contexts/GameDataContext';
import { LanguageCode, useLanguage } from '@/contexts/LanguageContext';
import { getLBStatCode, getLBStatLabel, interpolatePercentile, isLBPercentStatSortKey, LBBoardDistribution, LBBuildDetailEntry, LBDistributionAxis, LBDistributionCohort, LBStatSortKey } from '@/lib/lb';
import { LB_EXPANDED_OPAQUE_SURFACE, STATUS_NEUTRAL_COLOR } from './constants';

const YOU_STROKE = 'var(--color-accent-hover)';
const YOU_FILL = 'color-mix(in srgb, var(--color-accent) 24%, transparent)';
const BAND_FILL = 'color-mix(in srgb, var(--color-text-primary) 7%, transparent)';
const CHROME_STROKE = 'color-mix(in srgb, var(--color-text-primary) 14%, transparent)';
const RIM_STROKE = 'color-mix(in srgb, var(--color-text-primary) 22%, transparent)';
const MEDIAN_STROKE = 'color-mix(in srgb, var(--color-text-primary) 34%, transparent)';
// The selected spoke brightens but stays a neutral, because accent inside the plot area means "this build"
const ACTIVE_SPOKE_STROKE = 'color-mix(in srgb, var(--color-text-primary) 45%, transparent)';

// Movement on screen wants ease-in-out; something entering wants ease-out
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


/**
 * Rim labels, in the reader's language.
 *
 * Two rules, and nothing outside them — no invented words:
 *
 *  1. If the game's own localized term is already short, use it verbatim. For
 *     the `<X> DMG Bonus` family that means the stem only (`Glacio`, `冷凝`,
 *     `Ґлаціо`), which is the game's word for the element with the wrapper
 *     dropped, not a coinage.
 *  2. Otherwise fall back to `axisCode`, this codebase's own stat code. A code
 *     is script-neutral and always short, and the tooltip is showing the full
 *     localized name a few pixels away, so `RL` is never the only thing a
 *     reader gets.
 *
 * Only the rule-1 wins are listed here; everything absent takes the code. So
 * an unlisted language degrades to `CR`/`RL`/`ATK` rather than to a raw stat
 * key, and adding a language means adding only the cells that beat the code.
 *
 * Budget is roughly 7 Latin characters or 4 CJK, since CJK glyphs are
 * full-width and eight of these ring a 230px circle.
 */
/**
 * Rim labels are derived from the localized name, not tabulated.
 *
 * The boilerplate in a stat name is itself derivable: every member of a family
 * carries the same wrapper, so whatever the family's names share *is* the
 * wrapper and whatever differs is the part worth showing. "Aero DMG Bonus" and
 * "Glacio DMG Bonus" share " DMG Bonus"; the French pair share the prefix
 * "Bonus : Dégâts " instead; the Chinese share the suffix "伤害加成". One
 * routine handles all three because it never needs to know which shape a
 * language uses.
 *
 * Measured over the real Stats.json, 118 of 170 cells come out of pure
 * extraction (the name verbatim, or the name minus its family wrapper), 26 are
 * initialisms, and 26 fall through to the stat code. No hand-written table, and
 * a new language is covered the day its translations land.
 */
const ELEMENT_KEYS: LBStatSortKey[] = ['aero_dmg', 'glacio_dmg', 'fusion_dmg', 'electro_dmg', 'havoc_dmg', 'spectro_dmg'];
const MOVE_KEYS: LBStatSortKey[] = ['basic_attack_dmg', 'heavy_attack_dmg', 'resonance_skill_dmg', 'resonance_liberation_dmg'];
// Healing has no siblings of its own, so it borrows the affixes shared by every
// bonus-shaped stat ("… Bonus", "…アップ", "…加成", "Bonus : …"). The specific
// families are matched first, which is why this one is last.
const AXIS_FAMILIES: LBStatSortKey[][] = [ELEMENT_KEYS, MOVE_KEYS, [...ELEMENT_KEYS, ...MOVE_KEYS, 'healing_bonus']];

// CJK glyphs are full-width, so the same pixel budget buys fewer of them.
const RIM_BUDGET_LATIN = 8;
const RIM_BUDGET_CJK = 5;
const SEPARATOR = /[\s :·・\-—]/u;

const glyphCount = (value: string): number => [...value].length;
const hasCJK = (value: string): boolean => /[぀-ヿ㐀-鿿가-힯]/u.test(value);
const isLatinScript = (value: string): boolean => /^[\p{Script=Latin}\p{Nd}\s'’.\-:]+$/u.test(value);
const rimBudget = (value: string): number => (hasCJK(value) ? RIM_BUDGET_CJK : RIM_BUDGET_LATIN);

/**
 * The longest prefix and suffix every name in a family shares.
 *
 * Snapped back to a separator on space- and hyphen-delimited scripts, because a
 * raw longest-common-prefix happily stops mid-word: German's four move names
 * share "SCH-Bonus de", and trimming that leaves "s Standardangriffs". CJK has
 * no separators, so it is left alone.
 */
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

/**
 * Initials of the significant words, for Latin scripts only.
 *
 * "Resonance Liberation" → RL, "Liberación de resonancia" → LR, which is the
 * right answer in each language rather than the English one twice. Restricted
 * to Latin because an initialism of a Cyrillic or Thai phrase is not a
 * convention anyone reads — those fall through to the stat code instead.
 */
function initialism(stem: string): string | null {
  if (!isLatinScript(stem)) return null;
  const words = stem
    .split(/[\s ]+/u)
    .filter((word) => word && !(glyphCount(word) <= 3 && word === word.toLowerCase()));
  if (words.length < 2) return null;
  return words.map((word) => [...word][0].toUpperCase()).join('');
}

// `getLBStatCode` is already this codebase's short form for every stat, so the
// last resort reuses it rather than keeping a parallel list that could drift.
// The three flats are the only ones it renders too terse to stand alone: a lone
// "A" on a spoke is not ATK to anybody.
const FLAT_CODE_LABELS: Partial<Record<LBStatSortKey, string>> = { atk: 'ATK', hp: 'HP', def: 'DEF' };

function axisCode(key: LBStatSortKey): string {
  return FLAT_CODE_LABELS[key] ?? getLBStatCode(key);
}

function axisShortLabel(
  key: LBStatSortKey,
  language: LanguageCode,
  statTranslations: Record<string, Record<string, string>> | null,
): string {
  const full = axisFullLabel(key, language, statTranslations);
  if (glyphCount(full) <= rimBudget(full)) return full;

  const family = AXIS_FAMILIES.find((keys) => keys.includes(key));
  const siblings = family
    ? family.map((sibling) => axisFullLabel(sibling, language, statTranslations)).filter(Boolean)
    : [];
  const stem = siblings.length > 1 ? stripFamilyAffixes(full, siblings) : full;
  if (stem !== full && glyphCount(stem) <= rimBudget(stem)) {
    // Spanish yields "curación" here; a lowercase label beside ATQ reads as a
    // typo rather than a word.
    return stem.charAt(0).toUpperCase() + stem.slice(1);
  }

  const initials = initialism(stem);
  if (initials && glyphCount(initials) <= rimBudget(initials)) return initials;

  return axisCode(key);
}

/**
 * The unabbreviated name for the tooltip, in the reader's language.
 *
 * `getLBStatLabel` is the join key rather than a hand-kept parallel list of
 * English names: it is already the canonical label, and it is already the key
 * `Stats.json` (and therefore `statTranslations` and `statIcons`) is indexed
 * by. One source, three uses, nothing to keep in sync.
 */
function axisFullLabel(
  key: LBStatSortKey,
  language: LanguageCode,
  statTranslations: Record<string, Record<string, string>> | null,
): string {
  const canonical = getLBStatLabel(key);
  // Some languages ship blank strings for some stats, hence the truthiness
  // check rather than `??`.
  return statTranslations?.[canonical]?.[language] || canonical;
}

// Parallel phrasing, so the control reads as one series of narrowing fields
// rather than a named thing plus two percentages. `top1` is published by the
// backend only on boards large enough to clear its sample floor.
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
  return isLBPercentStatSortKey(key) ? `${value.toFixed(1)}%` : Math.round(value).toLocaleString();
}

/**
 * Standing, stated the way a leaderboard player already thinks.
 *
 * This used to print the raw percentile as an ordinal — "90th", "52nd" — which
 * asks the reader to know what a percentile is *and* to invert it before it
 * means anything ("90th" → "top 10%"). "top 10%" and "bottom 15%" need neither
 * step, and they are the same words the cohort selector uses.
 *
 * The pivot is the median: above it, count down from the top; below it, count up
 * from the bottom. Both directions are literally true at every value — a build
 * at p52 is in the top 48% and a build at p15 is in the bottom 15% — so the
 * phrasing only ever picks the shorter, more useful half.
 */
function formatStanding(fraction: number): string {
  const pct = Math.round(fraction * 100);
  if (pct >= 50) return `top ${100 - pct}%`;
  return `bottom ${pct}%`;
}

/** Ordinal position on the ladder, used to read p50 by value. */
function quantileAt(axis: LBDistributionAxis, ladder: number[], target: number): number {
  const index = ladder.findIndex((q) => Math.abs(q - target) < 1e-9);
  return index >= 0 ? axis.quantiles[index] : Number.NaN;
}

interface AxisView {
  key: LBStatSortKey;
  label: string;
  fullLabel: string;
  /** The build's own value on this axis. */
  value: number;
  /** 0-1 position of the build on the cohort's ladder; null when degenerate. */
  percentile: number | null;
  p50: number;
  /**
   * True when the published ladder has no spread — Healing Bonus is 0 for every
   * build on a DPS board. A percentile there would be invented.
   */
  degenerate: boolean;
}

/**
 * Radius fraction for a vertex.
 *
 * A degenerate axis sits on the median ring rather than at the centre: with zero
 * variance every build carries the same value, so this one *is* the median. The
 * old centre-pin drew that as bottom-1%, which is a different claim entirely.
 */
function radiusFraction(view: AxisView): number {
  if (view.degenerate || view.percentile === null) return 0.5;
  return view.percentile;
}

function pointOn(angle: number, radius: number): [number, number] {
  return [CX + (Math.cos(angle) * radius), CY + (Math.sin(angle) * radius)];
}

/** Angles start at 12 o'clock and run clockwise. */
function axisAngle(index: number, count: number): number {
  return (-Math.PI / 2) + ((index / count) * Math.PI * 2);
}

function ringVertices(fraction: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const [x, y] = pointOn(axisAngle(i, count), fraction * RADIUS);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
}

/**
 * The grid is a web, not a set of circles.
 *
 * On a percentile radius both are equally correct, but the web shares its
 * geometry with the data polygon, so a vertex reads directly against the ring
 * segment beside it instead of against a curve the shape never follows. It is
 * also what makes the thing look like a spider rather than a dartboard.
 */
function ringPoints(fraction: number, count: number): string {
  return ringVertices(fraction, count).join(' ');
}

/** Middle-half band as a real annulus: outer ring, inner ring, even-odd hole. */
function bandPath(count: number): string {
  const outer = ringVertices(0.75, count);
  const inner = ringVertices(0.25, count);
  return `M ${outer.join(' L ')} Z M ${inner.join(' L ')} Z`;
}

/** The series itself: one vertex per axis, at its own percentile radius. */
function seriesPoints(views: AxisView[]): string {
  return views
    .map((view, i) => {
      const [x, y] = pointOn(axisAngle(i, views.length), radiusFraction(view) * RADIUS);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/** Invisible wedge covering one axis's angular slice, so the whole chart is hoverable. */
function wedgePath(index: number, count: number): string {
  const half = Math.PI / count;
  const mid = axisAngle(index, count);
  const [x1, y1] = pointOn(mid - half, RADIUS + 20);
  const [x2, y2] = pointOn(mid + half, RADIUS + 20);
  return `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS + 20} ${RADIUS + 20} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/**
 * A one-line status where the section's content would be.
 *
 * Deliberately not a bordered full-width panel. These states are an absence —
 * nothing loaded, nothing to compare — and a card spanning the whole expanded-row
 * measure frames that absence as if it were content. Sized to its text and
 * centred, it reads as a continuation of the toggle column above it instead.
 */
const SectionNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
  // One state, not an active index plus a mirror of its last value. The tooltip
  // stays mounted through its own fade-out, so closing has to keep the index it
  // was showing — carrying `open` alongside it makes that the same fact rather
  // than derived state an effect has to chase.
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

    // API order is the winding order, deliberately.
    //
    // `calc.DeriveBoardRadarStats` emits the axes by their *role on this board*,
    // not alphabetically: crit pair, then the flat the board actually scales on,
    // its element, the bonus it scales with, ER, then the flats it does not
    // care about. So the clock positions mean something fixed even though the
    // stats at them change from board to board — 3 o'clock is always "the stat
    // this build is built around", the upper left is always the dead weight.
    //
    // A frontend re-sort by stat key was tried and removed: it looked stable but
    // it moved an HP board's scaling stat down next to DEF and pulled its unused
    // ATK up between the crits and the element, turning one clean lobe into a
    // sawtooth. The order is already deterministic per board (it is derived from
    // the board's stored display columns), so two builds on the same board always
    // wind the same way — which is the only comparison this section makes.
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
      // Stepping after a blur resumes from where the reader left off rather
      // than snapping back to the top of the chart.
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
  // Two different absences, and conflating them would misreport a brand-new
  // board as an unpopular one. A null payload is a 404: the axes come from the
  // board's optimality reference, and a board that has never been evaluated has
  // none. An empty cohort list is a board that exists but sits under the
  // backend's publish floor.
  if (!data) {
    return <SectionNote>No reference build for this board yet, so there is nothing to compare against.</SectionNote>;
  }
  if (!cohort || count === 0) {
    return <SectionNote>Not enough builds on this board to compare against yet.</SectionNote>;
  }

  const cohortLabel = COHORT_LABELS[cohort.key] ?? cohort.key;
  const comparisonLabel = medianLabel(cohort.key, cohortLabel);
  const sampleSize = cohort.sampleSize.toLocaleString();

  // `activeAxis` is what the chart itself highlights and what gets announced —
  // it goes null the moment the reader leaves. `shownAxis` is what the tooltip
  // renders, and it outlives that by one exit animation.
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

        {/* A legend, not an explainer. The two marks and the band are the only
            things on the chart that cannot be named by looking at them; the
            radial scale needs one line now that the tooltip says "top 4%"
            instead of asking anyone to invert a percentile. */}
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
              {/* Not "further out is better", which is what this said and which
                  is only true on the offensive axes. More HP or DEF than the
                  board usually means substat rolls spent in the wrong place,
                  and ER past its rotation target is capped out of Score
                  entirely. The chart shows standing; whether standing is good
                  is the stat's business, not the chart's. */}
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

      {/* One focus stop for the whole chart, stepped with the arrow keys, rather
          than one tab stop per wedge promising an activation that never existed. */}
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
          {/* The field, in one geometry with the data: a webbed grid, the middle
              half as a real even-odd annulus (not a disc with a surface-coloured
              disc punched out of it, which only works on one background), then
              the dashed median ring. */}
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

          {/* The one series. */}
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
            // r is not a transitionable property, so the hover growth rides a
            // transform on a fixed-radius circle instead of snapping between
            // two radii.
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

          {/* Hit targets last so the whole wedge is live, not just the vertex dot. */}
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

        {/* Sweeping between spokes used to teleport the tooltip, because it was
            keyed to the live axis and remounted at a new place each time. It now
            stays mounted and slides.

            The mover is a full-size overlay, so a percentage translate resolves
            against the chart's own box — which keeps the whole thing on
            `transform` (compositor-only) instead of animating `left`/`top`, and
            works at any responsive width without measuring anything. */}
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
                // Exit is quicker than entry: the user is already looking
                // somewhere else by then.
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

      {/* The tooltip is aria-hidden and its content lags the live axis by one
          exit animation, and a live region has to already exist in the tree to
          announce into. This one is always mounted and always current. */}
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

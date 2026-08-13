'use client';

import React, { useMemo, useState } from 'react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverCard } from '@/components/ui/HoverCard';
import {
  getLBStatCode,
  interpolatePercentile,
  isLBPercentStatSortKey,
  LBBoardDistribution,
  LBBuildDetailEntry,
  LBDistributionAxis,
  LBDistributionCohort,
  LBStatSortKey,
} from '@/lib/lb';
import { STATUS_NEUTRAL_COLOR } from './constants';

/**
 * Where a build's stats sit against the rest of its board.
 *
 * Two readings of the same eight axes, because they answer different questions
 * and neither substitutes for the other:
 *
 *  - The chart answers "what shape is this build" at a glance — lopsided toward
 *    crit, flat across the board, starved on ER.
 *  - The rows answer "what exactly am I on this stat, and where does that put
 *    me" with real numbers. They are always visible, not a mobile fallback: a
 *    polygon cannot be read to a value, and the exact figures are what a player
 *    actually acts on.
 *
 * Presentation-only. The caller owns fetching, so a compact variant can reuse
 * this against a build card later.
 */

// One accent series, everything else recessive chrome.
//
// The plan originally drew the cohort as a second polygon in gray. Measured
// against the palette checks, brand accent (#a69662) and a neutral gray sit at
// ΔE 7.4 for *normal* vision — under the 15 floor, so full-colour readers would
// struggle to tell the two polygons apart, and no amount of dashing fixes a
// hue-separation failure. So the cohort is not a second series at all: it is the
// backdrop the one accent polygon is read against, which is also the honest
// encoding for "one value against a distribution".
const YOU_STROKE = 'var(--color-accent-hover)';
const YOU_FILL = 'color-mix(in srgb, var(--color-accent) 22%, transparent)';
const BAND_FILL = 'color-mix(in srgb, var(--color-text-primary) 7%, transparent)';
const CHROME_STROKE = 'color-mix(in srgb, var(--color-text-primary) 16%, transparent)';
const MEDIAN_STROKE = 'color-mix(in srgb, var(--color-text-primary) 34%, transparent)';

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 96;
// Room for the outermost labels; the viewBox is wider than the plot.
const LABEL_RADIUS = RADIUS + 22;

const AXIS_LABELS: Partial<Record<LBStatSortKey, string>> = {
  crit_rate: 'Crit Rate',
  crit_dmg: 'Crit DMG',
  atk: 'ATK',
  hp: 'HP',
  def: 'DEF',
  energy_regen: 'ER',
  healing_bonus: 'Heal',
  aero_dmg: 'Aero',
  glacio_dmg: 'Glacio',
  fusion_dmg: 'Fusion',
  electro_dmg: 'Electro',
  havoc_dmg: 'Havoc',
  spectro_dmg: 'Spectro',
  basic_attack_dmg: 'Basic',
  heavy_attack_dmg: 'Heavy',
  resonance_skill_dmg: 'Skill',
  resonance_liberation_dmg: 'Lib',
};

const COHORT_LABELS: Record<string, string> = {
  all: 'Whole board',
  top10: 'Top 10%',
};

function axisLabel(key: LBStatSortKey): string {
  return AXIS_LABELS[key] ?? key;
}

function formatStat(key: LBStatSortKey, value: number): string {
  if (!Number.isFinite(value)) return '—';
  return isLBPercentStatSortKey(key) ? `${value.toFixed(1)}%` : Math.round(value).toLocaleString();
}

function formatPercentile(fraction: number): string {
  const pct = fraction * 100;
  if (pct >= 99) return 'top 1%';
  if (pct <= 1) return 'bottom 1%';
  return `${Math.round(pct)}th pct`;
}

/** Ordinal position on the ladder, used to read p25 / p50 / p75 by value. */
function quantileAt(axis: LBDistributionAxis, ladder: number[], target: number): number {
  const index = ladder.findIndex((q) => Math.abs(q - target) < 1e-9);
  return index >= 0 ? axis.quantiles[index] : Number.NaN;
}

interface AxisView {
  key: LBStatSortKey;
  label: string;
  /** The build's own value on this axis. */
  value: number;
  /** 0-1 position of the build on the cohort's ladder; null when degenerate. */
  percentile: number | null;
  p25: number;
  p50: number;
  p75: number;
  /**
   * True when the published ladder has no spread — Healing Bonus is 0 for every
   * build on a DPS board. A percentile there would be invented, so the spoke is
   * greyed and the vertex pinned rather than drawn at a fictional 50th.
   */
  degenerate: boolean;
}

/** Radius fraction for a value, measured on the percentile ladder. */
function radiusFraction(view: AxisView): number {
  if (view.degenerate) return 0;
  return view.percentile ?? 0;
}

function pointOn(angle: number, radius: number): [number, number] {
  return [CENTER + (Math.cos(angle) * radius), CENTER + (Math.sin(angle) * radius)];
}

/** Angles start at 12 o'clock and run clockwise. */
function axisAngle(index: number, count: number): number {
  return (-Math.PI / 2) + ((index / count) * Math.PI * 2);
}

function polygonPoints(views: AxisView[], radiusOf: (view: AxisView) => number): string {
  return views
    .map((view, i) => {
      const [x, y] = pointOn(axisAngle(i, views.length), radiusOf(view) * RADIUS);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/** Invisible wedge covering one axis's angular slice, so the whole chart is hoverable. */
function wedgePath(index: number, count: number): string {
  const half = Math.PI / count;
  const mid = axisAngle(index, count);
  const [x1, y1] = pointOn(mid - half, RADIUS + 16);
  const [x2, y2] = pointOn(mid + half, RADIUS + 16);
  return `M ${CENTER} ${CENTER} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS + 16} ${RADIUS + 16} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

interface AxisTooltipProps {
  view: AxisView;
  cohortLabel: string;
  sampleSize: number;
  children: React.ReactNode;
}

const AxisTooltip: React.FC<AxisTooltipProps> = ({ view, cohortLabel, sampleSize, children }) => (
  <HoverCard
    title={view.label}
    subtitle={`${cohortLabel} · ${sampleSize.toLocaleString()} builds`}
    width="sm"
    placement="top"
    body={(
      <dl className="space-y-1 text-2xs">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-text-primary/55">This build</dt>
          <dd className="font-semibold text-text-primary">{formatStat(view.key, view.value)}</dd>
        </div>
        {view.degenerate ? (
          <p className="pt-1 text-text-primary/55">No spread on this board.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-primary/55">Percentile</dt>
              <dd className="font-semibold text-text-primary">
                {view.percentile === null ? '—' : formatPercentile(view.percentile)}
              </dd>
            </div>
            {/* Mean and median are labelled separately on purpose: crit
                distributions are skewed enough that "average" alone misleads. */}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-primary/55">Board median</dt>
              <dd className="text-text-primary/80">{formatStat(view.key, view.p50)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-text-primary/55">Middle half</dt>
              <dd className="text-text-primary/80">
                {formatStat(view.key, view.p25)} – {formatStat(view.key, view.p75)}
              </dd>
            </div>
          </>
        )}
      </dl>
    )}
  >
    {children}
  </HoverCard>
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
  const [cohortKey, setCohortKey] = useState('all');

  const cohort: LBDistributionCohort | null = useMemo(() => {
    if (!data || data.cohorts.length === 0) return null;
    return data.cohorts.find((entry) => entry.key === cohortKey) ?? data.cohorts[0];
  }, [cohortKey, data]);

  const views = useMemo<AxisView[]>(() => {
    if (!data || !cohort) return [];
    const ladder = data.quantileLadder;

    return cohort.axes.map((axis) => {
      const value = buildDetail.stats[getLBStatCode(axis.key)] ?? 0;
      const floor = axis.quantiles[0] ?? 0;
      const ceiling = axis.quantiles[axis.quantiles.length - 1] ?? 0;
      const degenerate = !(ceiling - floor > 0);
      return {
        key: axis.key,
        label: axisLabel(axis.key),
        value,
        percentile: degenerate ? null : interpolatePercentile(value, ladder, axis.quantiles),
        p25: quantileAt(axis, ladder, 0.25),
        p50: quantileAt(axis, ladder, 0.5),
        p75: quantileAt(axis, ladder, 0.75),
        degenerate,
      };
    });
  }, [buildDetail.stats, cohort, data]);

  if (loading) {
    return (
      <div className="rounded border border-border bg-background-secondary/70 p-3 text-center text-xs text-text-primary/55">
        Loading distribution...
      </div>
    );
  }
  if (error) {
    return <ErrorBanner onRetry={onRetry}>{error}</ErrorBanner>;
  }
  // A board under the publish floor returns no cohorts. Saying so beats drawing
  // a shape from a dozen builds.
  if (!data || !cohort || views.length === 0) {
    return (
      <div className="rounded border border-border bg-background-secondary/70 p-3 text-center text-xs text-text-primary/55">
        Not enough builds on this board to compare against yet.
      </div>
    );
  }

  const cohortLabel = COHORT_LABELS[cohort.key] ?? cohort.key;
  const count = views.length;

  return (
    <section className="space-y-3">
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
        <span className="text-2xs text-text-primary/45">
          vs {cohort.sampleSize.toLocaleString()} builds
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center md:gap-6">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-64 w-64 shrink-0"
          role="img"
          aria-label={`Stat distribution against ${cohortLabel.toLowerCase()}. Exact values are in the table beside this chart.`}
        >
          {/* Recessive chrome: rings at the quarter marks, then one spoke per axis. */}
          {[0.25, 0.5, 0.75, 1].map((ring) => (
            <circle
              key={ring}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS * ring}
              fill="none"
              stroke={CHROME_STROKE}
              strokeWidth={1}
            />
          ))}
          {views.map((view, i) => {
            const [x, y] = pointOn(axisAngle(i, count), RADIUS);
            return (
              <line
                key={view.key}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke={CHROME_STROKE}
                strokeWidth={1}
              />
            );
          })}

          {/* The middle half of the field, and its median. Backdrop, not a series:
              on a percentile radius these are the same ring on every axis, so
              they read as the frame the build is measured in. */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS * 0.75} fill={BAND_FILL} />
          <circle cx={CENTER} cy={CENTER} r={RADIUS * 0.25} fill="var(--color-background-secondary)" />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS * 0.5}
            fill="none"
            stroke={MEDIAN_STROKE}
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* The one series. */}
          <polygon
            points={polygonPoints(views, radiusFraction)}
            fill={YOU_FILL}
            stroke={YOU_STROKE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {views.map((view, i) => {
            const [x, y] = pointOn(axisAngle(i, count), radiusFraction(view) * RADIUS);
            return (
              <circle
                key={view.key}
                cx={x}
                cy={y}
                r={view.degenerate ? 2.5 : 4}
                fill={view.degenerate ? STATUS_NEUTRAL_COLOR : YOU_STROKE}
              />
            );
          })}

          {/* Labels, then invisible wedges on top so the whole chart is hoverable
              rather than only the vertex dots. Each is focusable, because a
              polygon is otherwise unreachable by keyboard. */}
          {views.map((view, i) => {
            const angle = axisAngle(i, count);
            const [lx, ly] = pointOn(angle, LABEL_RADIUS);
            const anchor = Math.abs(lx - CENTER) < 4 ? 'middle' : lx > CENTER ? 'start' : 'end';
            return (
              <text
                key={view.key}
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="fill-current text-[9px] font-medium"
                style={{ color: view.degenerate ? STATUS_NEUTRAL_COLOR : 'var(--color-text-primary)', opacity: view.degenerate ? 0.45 : 0.7 }}
              >
                {view.label}
              </text>
            );
          })}
          {views.map((view, i) => (
            <AxisTooltip key={view.key} view={view} cohortLabel={cohortLabel} sampleSize={cohort.sampleSize}>
              <path
                d={wedgePath(i, count)}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${view.label}: ${formatStat(view.key, view.value)}${
                  view.degenerate || view.percentile === null ? ', no spread on this board' : `, ${formatPercentile(view.percentile)}`
                }`}
                className="cursor-pointer outline-none focus-visible:fill-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
              />
            </AxisTooltip>
          ))}
        </svg>

        {/* The numbers. A chart shows shape; this is what a player acts on, so it
            is never hidden behind a breakpoint. */}
        <table className="w-full max-w-sm text-2xs">
          <caption className="sr-only">
            Each stat on this build against {cohortLabel.toLowerCase()}
          </caption>
          <thead>
            <tr className="text-text-primary/45">
              <th scope="col" className="py-1 pr-2 text-left font-medium">Stat</th>
              <th scope="col" className="py-1 pr-2 text-right font-medium">This build</th>
              <th scope="col" className="py-1 pr-2 text-right font-medium">Median</th>
              <th scope="col" className="py-1 text-right font-medium">Percentile</th>
            </tr>
          </thead>
          <tbody>
            {views.map((view) => (
              <tr key={view.key} className="border-t border-border/35">
                <th scope="row" className="py-1 pr-2 text-left font-medium text-text-primary/70">
                  {view.label}
                </th>
                <td className="py-1 pr-2 text-right font-semibold text-text-primary">
                  {formatStat(view.key, view.value)}
                </td>
                <td className="py-1 pr-2 text-right text-text-primary/55">
                  {view.degenerate ? '—' : formatStat(view.key, view.p50)}
                </td>
                <td className="py-1 text-right text-text-primary/70">
                  {view.degenerate || view.percentile === null
                    ? <span className="text-text-primary/40">no spread</span>
                    : formatPercentile(view.percentile)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-2xs text-text-primary/40">
        Rings are percentiles of this board, not raw values: the centre is the 1st
        percentile and the rim the 99th, so every stat is comparable. The dashed
        ring is the median.
      </p>
    </section>
  );
};

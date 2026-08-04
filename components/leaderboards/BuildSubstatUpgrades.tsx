'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { LB_EXPANDED_OPAQUE_SURFACE, LB_EXPANDED_OPAQUE_SURFACE_FROM, STATUS_NEGATIVE_COLOR, STATUS_NEUTRAL_COLOR, statusRampColor } from './constants';
import { formatDamage } from './formatters';

export interface BuildUpgradeColumn {
  key: string;
  label: string;
  icon: string;
  rollValue: number;
  gain: number;
  result: number;
  percentGain: number;
  isPercent: boolean;
  projectedRank: number;
  rankDelta: number;
}

interface TierOption {
  key: string;
  label: string;
}

interface BuildSubstatUpgradesProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  hasUpgradeData: boolean;
  hasBaseDamage: boolean;
  baseDamage?: number;
  globalRank?: number;
  showRankDelta: boolean;
  tierOptions: readonly TierOption[];
  selectedTier: string;
  onSelectTier: (tier: string) => void;
  orderedUpgradeColumns: BuildUpgradeColumn[];
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value);
  return `${value < 0 ? '−' : '+'}${magnitude.toFixed(magnitude >= 10 ? 1 : 2)}%`;
}

function formatUpgradeValue(value: number, isPercent: boolean): string {
  if (isPercent) return `${Number(value).toFixed(1)}%`;
  return Math.round(value).toLocaleString();
}

function formatSignedUpgradeValue(value: number, isPercent: boolean): string {
  const formatted = formatUpgradeValue(value, isPercent);
  return value > 0 ? `+${formatted}` : formatted;
}

// Both columns rank the same way — bigger is better — so they share one ramp,
// scaled against the strongest value in their own row. A rank that got worse is
// the one signed case and takes the shared negative tone.
function getRankDeltaColor(rankDelta: number, maxDelta: number): string {
  if (!Number.isFinite(rankDelta) || rankDelta === 0) return STATUS_NEUTRAL_COLOR;
  if (rankDelta < 0) return STATUS_NEGATIVE_COLOR;
  return statusRampColor(maxDelta > 0 ? rankDelta / maxDelta : 0);
}

function getGainColor(percentGain: number, maxPercentGain: number): string {
  if (!Number.isFinite(percentGain) || percentGain <= 0) return STATUS_NEUTRAL_COLOR;
  return statusRampColor(maxPercentGain > 0 ? percentGain / maxPercentGain : 0);
}

// Frozen "rail" of the first two columns (row labels + Original baseline).
// Opaque so the scrolling upgrade columns tuck cleanly underneath.
const PINNED = `sticky z-20 ${LB_EXPANDED_OPAQUE_SURFACE}`;
const ROW_DIVIDER = 'border-t border-border/45';

export const BuildSubstatUpgrades: React.FC<BuildSubstatUpgradesProps> = ({
  isLoading,
  error,
  onRetry,
  hasUpgradeData,
  hasBaseDamage,
  baseDamage,
  globalRank,
  showRankDelta,
  tierOptions,
  selectedTier,
  onSelectTier,
  orderedUpgradeColumns,
}) => {
  const strongestPercentGain = orderedUpgradeColumns.reduce(
    (max, column) => Math.max(max, column.percentGain),
    0,
  );
  const maxRankDelta = orderedUpgradeColumns.reduce(
    (max, column) => Math.max(max, column.rankDelta),
    0,
  );

  // Measure the label column's rendered width so the second pinned column
  // (Original) sticks flush against it regardless of label length / i18n.
  const labelColRef = useRef<HTMLTableCellElement | null>(null);
  const [labelColWidth, setLabelColWidth] = useState(120);

  useLayoutEffect(() => {
    const el = labelColRef.current;
    if (!el) return;
    const measure = () => setLabelColWidth(el.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [orderedUpgradeColumns.length, hasUpgradeData, hasBaseDamage]);

  const originalStyle: React.CSSProperties = { left: labelColWidth };

  // The table is wider than the row on any build with a full spread of upgrade
  // columns, so it cuts a value mid-glyph at the right edge with only a hairline
  // scrollbar to explain it. Fade that edge while there is more to reach. The
  // left edge needs no equivalent: the pinned rail is already opaque.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft;
      setCanScrollRight(remaining > 1);
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [orderedUpgradeColumns.length, hasUpgradeData, hasBaseDamage]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex items-center rounded-md border border-border/45 bg-background-secondary/40 p-0.5">
          {tierOptions.map((option) => {
            const isActive = option.key === selectedTier;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelectTier(option.key)}
                className={`rounded px-2.5 py-1 text-2xs font-semibold tracking-wide transition-[color,background-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                  isActive
                    ? 'bg-accent/16 text-accent-hover'
                    : 'text-text-primary/55 hover:text-text-primary'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <HoverTooltip
          placement="top"
          triggerClassName="inline-flex"
          content={
            <div className="max-w-xs space-y-1.5 text-left">
              <p className="text-sm font-semibold text-text-primary">Substat upgrades</p>
              <p className="text-xs leading-relaxed text-text-primary/72">
                Projects the Score and rank this build would reach if you added one more
                substat roll.
              </p>
              <p className="text-xs leading-relaxed text-text-primary/72">
                <span className="font-semibold text-text-primary/88">Min / Mid / Max</span> sets the
                quality of the simulated roll.
              </p>
            </div>
          }
        >
          <span
            tabIndex={0}
            role="button"
            aria-label="About substat upgrades"
            className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-text-primary/45 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </HoverTooltip>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={`upgrade-skeleton-${index}`} className="grid grid-cols-[minmax(0,1.25fr)_0.8fr_0.8fr_0.8fr] gap-3 animate-pulse border-b border-border/45 py-2.5 last:border-b-0">
              <div className="h-4 rounded bg-white/10" />
              <div className="h-4 rounded bg-white/8" />
              <div className="h-4 rounded bg-white/8" />
              <div className="h-4 rounded bg-white/8" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <ErrorBanner onRetry={onRetry}>{error}</ErrorBanner>
      )}

      {!isLoading && !error && !hasUpgradeData && (
        <div className="py-1 text-sm text-text-primary/60">
          No substat upgrade data available for this board.
        </div>
      )}

      {!isLoading && !error && hasUpgradeData && !hasBaseDamage && (
        <div className="py-1 text-sm text-text-primary/60">
          Missing current board context for projected result rendering.
        </div>
      )}

      {!isLoading && !error && hasUpgradeData && hasBaseDamage && orderedUpgradeColumns.length > 0 && (
        <div className="relative min-w-0 w-full">
          {canScrollRight && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 right-0 z-30 w-10 bg-linear-to-l ${LB_EXPANDED_OPAQUE_SURFACE_FROM} to-transparent`}
            />
          )}
          <div ref={scrollerRef} className="overflow-x-auto pb-1">
            <div className="w-max min-w-full">
              <table className="mx-auto border-separate border-spacing-0 text-sm tabular-nums">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-[0.18em] text-text-primary/55">
                    <th ref={labelColRef} className={`${PINNED} left-0 min-w-30 border-b border-r border-border/55 py-2 pr-4 pl-3 text-left`}>Substat</th>
                    <th className={`${PINNED} min-w-30 border-b border-r border-border/60 py-2 px-3 text-center text-accent`} style={originalStyle}>Original</th>
                    {orderedUpgradeColumns.map((column) => (
                      <th key={`upgrade-column-${column.key}`} className="min-w-30 border-b border-border/55 py-2 px-3 text-center">
                        <div className="flex items-end justify-center gap-1">
                          {column.icon ? (
                            <img src={column.icon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
                          ) : (
                            <span className="h-3.5 w-3.5 shrink-0 rounded bg-white/12" />
                          )}
                          <span className="leading-none">{column.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <th className={`${PINNED} left-0 border-r border-border/55 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82`}>Projected result</th>
                    <td className={`${PINNED} border-r border-border/60 px-3 py-2.5 text-center font-semibold text-white/92`} style={originalStyle}>
                      {formatDamage(baseDamage ?? 0)}
                    </td>
                    {orderedUpgradeColumns.map((column) => (
                      <td key={`upgrade-result-${column.key}`} className="px-3 py-2.5 text-center">
                        <div className="font-semibold text-white/92">{formatDamage(column.result)}</div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <th className={`${PINNED} ${ROW_DIVIDER} left-0 border-r border-border/55 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82`}>Gain over base</th>
                    <td className={`${PINNED} ${ROW_DIVIDER} border-r border-border/60 px-3 py-2.5 text-center text-text-primary/35`} style={originalStyle}>—</td>
                    {orderedUpgradeColumns.map((column) => (
                      <td key={`upgrade-gain-${column.key}`} className={`${ROW_DIVIDER} px-3 py-2.5 text-center font-semibold`} style={{ color: getGainColor(column.percentGain, strongestPercentGain) }}>
                        {column.gain < 0 ? '−' : '+'}{formatDamage(Math.abs(column.gain))}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <th className={`${PINNED} ${ROW_DIVIDER} left-0 border-r border-border/55 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82`}>% gain over base</th>
                    <td className={`${PINNED} ${ROW_DIVIDER} border-r border-border/60 px-3 py-2.5 text-center text-text-primary/35`} style={originalStyle}>—</td>
                    {orderedUpgradeColumns.map((column) => (
                      <td key={`upgrade-percent-${column.key}`} className={`${ROW_DIVIDER} px-3 py-2.5 text-center font-semibold`} style={{ color: getGainColor(column.percentGain, strongestPercentGain) }}>
                        {formatSignedPercent(column.percentGain)}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <th className={`${PINNED} ${ROW_DIVIDER} left-0 border-r border-border/55 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82`}>Projected rank</th>
                    <td className={`${PINNED} ${ROW_DIVIDER} border-r border-border/60 px-3 py-2.5 text-center font-semibold text-white/72`} style={originalStyle}>
                      {(globalRank ?? 0) > 0 ? `${globalRank!.toLocaleString()}` : '—'}
                    </td>
                    {orderedUpgradeColumns.map((column) => {
                      const color = getRankDeltaColor(column.rankDelta, maxRankDelta);
                      return (
                        <td key={`upgrade-rank-${column.key}`} className={`${ROW_DIVIDER} px-3 py-2.5 text-center font-semibold`} style={{ color }}>
                          {column.projectedRank > 0 ? (
                            <>
                              <span>{column.projectedRank.toLocaleString()}</span>
                              {showRankDelta && column.rankDelta !== 0 && (
                                <span className="ml-1 text-xs opacity-70">
                                  ({column.rankDelta > 0 ? '+' : ''}{column.rankDelta.toLocaleString()})
                                </span>
                              )}
                            </>
                          ) : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <th className={`${PINNED} ${ROW_DIVIDER} left-0 border-r border-border/55 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82`}>Added roll</th>
                    <td className={`${PINNED} ${ROW_DIVIDER} border-r border-border/60 px-3 py-2.5 text-center text-text-primary/35`} style={originalStyle}>—</td>
                    {orderedUpgradeColumns.map((column) => (
                      <td key={`upgrade-roll-${column.key}`} className={`${ROW_DIVIDER} px-3 py-2.5 text-center text-text-primary/78`}>
                        {formatSignedUpgradeValue(column.rollValue, column.isPercent)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

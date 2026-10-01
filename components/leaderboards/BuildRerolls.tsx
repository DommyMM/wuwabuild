'use client';

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';
import { LBBuildDetailEntry, LBRerolls, LBSubstatLadder } from '@/lib/lb';
import { getEchoPaths } from '@/lib/paths';
import { RollTier, buildRerollModel, formatGain, formatOdds } from '@/lib/rerolls';
import { formatStatRoll } from '@/components/echo/StatTierBars';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { LB_EXPANDED_OPAQUE_SURFACE, LB_EXPANDED_OPAQUE_SURFACE_FROM, STATUS_NEUTRAL_COLOR, statusRampColor } from './constants';
import { formatDamage } from './formatters';

interface BuildRerollsProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  data: LBRerolls | null;
  buildDetail: LBBuildDetailEntry;
}

const TIER_OPTIONS: ReadonlyArray<{ key: RollTier; label: string }> = [
  { key: 'min', label: 'Min' },
  { key: 'mid', label: 'Mid' },
  { key: 'max', label: 'Max' },
];

/** Frozen label rail, opaque so the scrolling columns tuck underneath */
const LABEL = `sticky left-0 z-20 ${LB_EXPANDED_OPAQUE_SURFACE} border-r border-border/55 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82`;
const ROW_DIVIDER = 'border-t border-border/45';
const CELL = 'min-w-28 px-3 py-2.5 text-center';
/** First column of an echo's group, so a group reads as one echo without a heavier frame */
const GROUP_START = 'border-l border-border/45';

/**
 * What the build's weakest substat lines could become with a transducer, one column per result
 *
 * Columns group by the line they replace, and only results that gain are drawn
 */
export const BuildRerolls: React.FC<BuildRerollsProps> = ({ isLoading, error, onRetry, data, buildDetail }) => {
  const { getEcho, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();
  const [tier, setTier] = useState<RollTier>('min');

  const model = useMemo(() => (data ? buildRerollModel(data) : null), [data]);
  const columnCount = model?.groups.reduce((sum, group) => sum + group.columns.length, 0) ?? 0;

  const statLabel = useCallback((ladder: LBSubstatLadder): string => (
    getEchoSubstatShortLabel(statTranslations?.[ladder.name] ? t(statTranslations[ladder.name]) : ladder.name)
  ), [statTranslations, t]);
  const statIcon = (ladder: LBSubstatLadder): string => statIcons?.[ladder.name] ?? statIcons?.[ladder.name.replace('%', '')] ?? '';
  const rollLabel = (ladder: LBSubstatLadder, value: number): string => formatStatRoll(value, isPercentStat(ladder.name));

  // Both tints read bigger-is-better, each scaled to the strongest value in its own row at the chosen roll
  const columns = model?.groups.flatMap((group) => group.columns) ?? [];
  const maxGain = columns.reduce((max, column) => Math.max(max, column.results[tier].gain), 0);
  const currentRank = model?.currentRank ?? 0;
  const rankDelta = (rank: number): number => (rank > 0 && currentRank > 0 ? currentRank - rank : 0);
  const maxRankDelta = columns.reduce((max, column) => Math.max(max, rankDelta(column.results[tier].rank)), 0);

  // A wide build runs past the row and cuts a value mid-glyph, so the right edge fades while there is more to reach
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [columnCount]);

  return (
    <section className="space-y-3" aria-label="Substat upgrades">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex items-center rounded-md border border-border/45 bg-background-secondary/40 p-0.5">
          {TIER_OPTIONS.map((option) => {
            const isActive = option.key === tier;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setTier(option.key)}
                className={`cursor-pointer rounded px-2.5 py-1 text-2xs font-semibold tracking-wide transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                  isActive ? 'bg-accent/16 text-accent-hover' : 'text-text-primary/55 hover:text-text-primary'
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
          content={(
            <div className="max-w-xs space-y-1.5 text-left">
              <p className="text-sm font-semibold text-text-primary">Substat upgrades</p>
              <p className="text-xs leading-relaxed text-text-primary/70">
                What one substat line could become with a transducer, and the Score and rank the build would reach.
                Lines with little or nothing to gain are left out.
              </p>
              <p className="text-xs leading-relaxed text-text-primary/70">
                <span className="font-semibold text-text-primary/85">Min / Mid / Max</span> sets the roll: the
                lowest that gains, a typical one, or the highest.
              </p>
              <p className="text-xs leading-relaxed text-text-primary/70">
                <span className="font-semibold text-text-primary/85">Chance</span> is the odds one reroll of that
                line lands the stat at that roll or better, with the echo&apos;s other four lines locked.
              </p>
            </div>
          )}
        >
          <span
            tabIndex={0}
            role="button"
            aria-label="About substat upgrades"
            className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-text-primary/55 transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </HoverTooltip>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={`reroll-skeleton-${index}`} className="grid animate-pulse grid-cols-[minmax(0,1.25fr)_0.8fr_0.8fr_0.8fr] gap-3 border-b border-border/45 py-2.5 last:border-b-0">
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

      {!isLoading && !error && !model && (
        <div className="py-1 text-sm text-text-primary/60">
          No substat upgrade data available for this board.
        </div>
      )}

      {!isLoading && !error && model && model.groups.length === 0 && (
        <div className="py-1 text-center text-sm text-text-primary/60">
          No substat line on this build would score higher as another stat or roll.
        </div>
      )}

      {!isLoading && !error && model && model.groups.length > 0 && (
        <div className="relative w-full min-w-0">
          {canScrollRight && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 right-0 z-30 w-10 bg-linear-to-l ${LB_EXPANDED_OPAQUE_SURFACE_FROM} to-transparent`}
            />
          )}
          <div ref={scrollerRef} className="overflow-x-auto pb-1">
            <div className="w-max min-w-full">
              <table className="mx-auto border-separate border-spacing-0 text-sm tabular-nums">
                <tbody>
                  <tr>
                    <th scope="row" className={`${LABEL} border-b border-border/55`}>Echo</th>
                    {model.groups.map((group, groupIndex) => {
                      const panel = buildDetail.buildState.echoPanels[group.echo];
                      const echo = panel?.id ? getEcho(panel.id) : null;
                      const name = echo ? t(echo.nameI18n ?? { en: echo.name }) : `Echo ${group.echo + 1}`;
                      return (
                        <th
                          key={group.key}
                          scope="colgroup"
                          colSpan={group.columns.length}
                          className={`max-w-0 border-b border-border/55 px-3 py-2 font-semibold text-text-primary ${groupIndex > 0 ? GROUP_START : ''}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {echo && (
                              <img src={getEchoPaths(echo, panel?.phantom)} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
                            )}
                            <span className="min-w-0 truncate">{name}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>

                  <tr>
                    <th scope="row" className={LABEL}>Replaces</th>
                    {model.groups.map((group, groupIndex) => (
                      <td
                        key={group.key}
                        colSpan={group.columns.length}
                        className={`px-3 py-2.5 text-center text-text-primary/78 ${groupIndex > 0 ? GROUP_START : ''}`}
                      >
                        {group.ladder ? `${statLabel(group.ladder)} ${rollLabel(group.ladder, group.value)}` : 'Empty line'}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <th scope="row" className={`${LABEL} ${ROW_DIVIDER}`}>New stat</th>
                    {model.groups.map((group, groupIndex) => group.columns.map((column, columnIndex) => {
                      const icon = statIcon(column.ladder);
                      return (
                        <td key={column.key} className={`${CELL} ${ROW_DIVIDER} text-white/92 ${groupIndex > 0 && columnIndex === 0 ? GROUP_START : ''}`}>
                          <div className="flex items-center justify-center gap-1.5">
                            {icon ? (
                              <img src={icon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
                            ) : (
                              <span className="h-3.5 w-3.5 shrink-0 rounded bg-white/12" />
                            )}
                            <span className="font-semibold">{statLabel(column.ladder)}</span>
                          </div>
                        </td>
                      );
                    }))}
                  </tr>

                  <tr>
                    <th scope="row" className={`${LABEL} ${ROW_DIVIDER}`}>New roll</th>
                    {model.groups.map((group, groupIndex) => group.columns.map((column, columnIndex) => (
                      <td key={column.key} className={`${CELL} ${ROW_DIVIDER} text-text-primary/78 ${groupIndex > 0 && columnIndex === 0 ? GROUP_START : ''}`}>
                        {rollLabel(column.ladder, column.results[tier].value)}
                      </td>
                    )))}
                  </tr>

                  <tr>
                    <th scope="row" className={`${LABEL} ${ROW_DIVIDER}`}>Projected result</th>
                    {model.groups.map((group, groupIndex) => group.columns.map((column, columnIndex) => (
                      <td key={column.key} className={`${CELL} ${ROW_DIVIDER} font-semibold text-white/92 ${groupIndex > 0 && columnIndex === 0 ? GROUP_START : ''}`}>
                        {formatDamage(column.results[tier].score)}
                      </td>
                    )))}
                  </tr>

                  <tr>
                    <th scope="row" className={`${LABEL} ${ROW_DIVIDER}`}>% gain over base</th>
                    {model.groups.map((group, groupIndex) => group.columns.map((column, columnIndex) => {
                      const gain = column.results[tier].gain;
                      return (
                        <td
                          key={column.key}
                          className={`${CELL} ${ROW_DIVIDER} font-semibold ${groupIndex > 0 && columnIndex === 0 ? GROUP_START : ''}`}
                          style={{ color: statusRampColor(maxGain > 0 ? gain / maxGain : 0) }}
                        >
                          {formatGain(gain)}
                        </td>
                      );
                    }))}
                  </tr>

                  <tr>
                    <th scope="row" className={`${LABEL} ${ROW_DIVIDER}`}>Projected rank</th>
                    {model.groups.map((group, groupIndex) => group.columns.map((column, columnIndex) => {
                      const rank = column.results[tier].rank;
                      const delta = rankDelta(rank);
                      return (
                        <td
                          key={column.key}
                          className={`${CELL} ${ROW_DIVIDER} font-semibold ${groupIndex > 0 && columnIndex === 0 ? GROUP_START : ''}`}
                          style={{ color: delta > 0 ? statusRampColor(maxRankDelta > 0 ? delta / maxRankDelta : 0) : STATUS_NEUTRAL_COLOR }}
                        >
                          {rank > 0 ? (
                            <>
                              <span>{rank.toLocaleString()}</span>
                              {delta > 0 && <span className="ml-1 text-xs opacity-70">(+{delta.toLocaleString()})</span>}
                            </>
                          ) : '—'}
                        </td>
                      );
                    }))}
                  </tr>

                  <tr>
                    <th scope="row" className={`${LABEL} ${ROW_DIVIDER}`}>Chance</th>
                    {model.groups.map((group, groupIndex) => group.columns.map((column, columnIndex) => (
                      <td key={column.key} className={`${CELL} ${ROW_DIVIDER} text-text-primary/78 ${groupIndex > 0 && columnIndex === 0 ? GROUP_START : ''}`}>
                        {formatOdds(column.results[tier].chance)}
                      </td>
                    )))}
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

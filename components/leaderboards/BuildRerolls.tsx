'use client';

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { getSubstatTierInfo } from '@/lib/calculations/substatTiers';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';
import { LBBuildDetailEntry, LBRerolls, LBSubstatLadder } from '@/lib/lb';
import { getEchoPaths } from '@/lib/paths';
import { RerollTarget, RerollWay, buildRerollModel, formatChance, formatGain, formatGainRange } from '@/lib/rerolls';
import { formatStatRoll } from '@/components/echo/StatTierBars';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverCard } from '@/components/ui/HoverCard';
import { LB_EXPANDED_OPAQUE_SURFACE, statusRampColor } from './constants';
import { formatDamage } from './formatters';

interface BuildRerollsProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  data: LBRerolls | null;
  buildDetail: LBBuildDetailEntry;
}

const FIGURE = 'font-gowun tabular-nums';
const FRAME = 'overflow-hidden rounded-xl border border-border/55 bg-black/25';
const HEAD = 'px-2.5 py-2 text-xs font-normal whitespace-nowrap text-text-primary/55';
const HEAD_GROUND = 'bg-black/30';
/** Scroll edge fades out while more columns sit past it, so the cut reads as more to reach */
const FADE_RIGHT = 'mask-[linear-gradient(to_left,transparent,black_40px)]';
/**
 * Opaque copies of the frame's ground, so columns scrolled sideways pass under the pinned echo column
 *
 * Applied only while the table scrolls, since the opaque stand-in is close to the row's surface but not exact
 */
const PINNED = `sticky left-0 z-10 ${LB_EXPANDED_OPAQUE_SURFACE} bg-[linear-gradient(rgb(0_0_0/0.25),rgb(0_0_0/0.25))] group-hover/band:bg-[linear-gradient(rgb(255_255_255/0.03),rgb(255_255_255/0.03)),linear-gradient(rgb(0_0_0/0.25),rgb(0_0_0/0.25))]`;
const PINNED_HEAD = `sticky left-0 z-10 ${LB_EXPANDED_OPAQUE_SURFACE} bg-[linear-gradient(rgb(0_0_0/0.3),rgb(0_0_0/0.3)),linear-gradient(rgb(0_0_0/0.25),rgb(0_0_0/0.25))]`;
/** Shadow on the pinned column's edge once columns have scrolled under it */
const PINNED_EDGE = 'shadow-[8px_0_8px_-8px_rgb(0_0_0/0.7)]';
/** Fixed row height, so a band keeps one rhythm whether its line has one target or three */
const ROW = 'h-12';
const CELL = 'px-2.5 py-0 whitespace-nowrap';
/** Holds a spanning cell's content to its first row, a pixel short of it because the cell also carries the divider */
const FIRST_ROW = 'flex h-[47px] items-center';
const ECHO_DIVIDER = 'border-t border-border/55';
const WAY_DIVIDER = 'border-t border-border/35';
/** A stat's name and roll in one face on one baseline, told apart by colour, because a second face beside the name sat off its baseline */
const STAT_TEXT = 'inline-flex items-baseline gap-2 tabular-nums';
/** Roll, its chance, the chance of it or higher, Score gain with its share, and rank in the per-roll hover */
const STEP_GRID = 'grid grid-cols-[3.5rem_1fr_1fr_1.5fr_4.5rem_2rem] items-center gap-2 px-2';

/**
 * What a transducer reroll could turn the build's weak substat lines into, one band per echo
 *
 * A band lists the echo's lines worth rolling, each beside the stats it can land, most gain per transducer first
 */
export const BuildRerolls: React.FC<BuildRerollsProps> = ({ isLoading, error, onRetry, data, buildDetail }) => {
  const { getEcho, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();

  const model = useMemo(() => (data ? buildRerollModel(data) : null), [data]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ scrolls: false, atStart: true, atEnd: true });

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const next = {
        scrolls: el.scrollWidth - el.clientWidth > 1,
        atStart: el.scrollLeft <= 1,
        atEnd: el.scrollWidth - el.clientWidth - el.scrollLeft <= 1,
      };
      setScroll((prev) => (
        prev.scrolls === next.scrolls && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next
      ));
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [model]);
  // Ways arrive best first, so an echo takes the place of its best way
  const bands = useMemo(() => {
    const byEcho = new Map<number, RerollWay[]>();
    model?.ways.forEach((way) => byEcho.set(way.echo, [...(byEcho.get(way.echo) ?? []), way]));
    return [...byEcho.entries()];
  }, [model]);

  const statFullLabel = useCallback((ladder: LBSubstatLadder): string => (
    statTranslations?.[ladder.name] ? t(statTranslations[ladder.name]) : ladder.name
  ), [statTranslations, t]);
  const statLabel = useCallback((ladder: LBSubstatLadder): string => (
    getEchoSubstatShortLabel(statFullLabel(ladder))
  ), [statFullLabel]);
  const echoName = (echoIndex: number): string => {
    const panel = buildDetail.buildState.echoPanels[echoIndex];
    const echo = panel?.id ? getEcho(panel.id) : null;
    return echo ? t(echo.nameI18n ?? { en: echo.name }) : `Echo ${echoIndex + 1}`;
  };
  const statIcon = (ladder: LBSubstatLadder): React.ReactNode => {
    const icon = statIcons?.[ladder.name] ?? statIcons?.[ladder.name.replace('%', '')];
    return icon
      ? <img src={icon} alt="" className="h-4 w-4 shrink-0 object-contain" />
      : <span className="h-4 w-4 shrink-0 rounded bg-white/12" />;
  };
  const rollLabel = (ladder: LBSubstatLadder, value: number): string => formatStatRoll(value, isPercentStat(ladder.name));
  /** "6.8–12.4%" from a roll to the ladder's top, so the rolls read as the span the gain beside them covers */
  const rollRange = (ladder: LBSubstatLadder, from: number): string => {
    const top = ladder.values[ladder.values.length - 1];
    const high = rollLabel(ladder, top);
    return from === top ? high : `${rollLabel(ladder, from).replace(/%$/, '')}–${high}`;
  };

  // Gain tint scales to the strongest target on the build
  const targets = model?.ways.flatMap((way) => way.targets) ?? [];
  const maxGain = targets.reduce((max, target) => Math.max(max, target.maxGain), 0);
  const currentRank = model?.currentRank ?? 0;
  const score = model?.score ?? 0;
  /** "+62,099–124,198" for a span of gain shares as Score, one figure when both ends print alike */
  const scoreRange = (min: number, max: number): string => {
    const low = formatDamage(min * score);
    const high = formatDamage(max * score);
    return low === high ? `+${high}` : `+${low}–${high}`;
  };
  const rankDelta = (rank: number): number => (rank > 0 && currentRank > 0 ? currentRank - rank : 0);

  const echoRail = (echoIndex: number): React.ReactNode => {
    const panel = buildDetail.buildState.echoPanels[echoIndex];
    const echo = panel?.id ? getEcho(panel.id) : null;
    return (
      <div className={`${FIRST_ROW} gap-3`}>
        {echo && <img src={getEchoPaths(echo, panel?.phantom)} alt="" className="h-8 w-8 shrink-0 object-contain" />}
        {/* One line between 144 and 360px, cut with an ellipsis where the table lacks room for all of it
            The hidden wrapping copy sizes the column, and the shown copy has no width of its own so it never forces one */}
        <span className="max-w-90 min-w-36 font-semibold text-text-primary" title={echoName(echoIndex)}>
          <span aria-hidden className="invisible block h-0 overflow-hidden whitespace-normal">{echoName(echoIndex)}</span>
          <span className="block truncate contain-[inline-size]">{echoName(echoIndex)}</span>
        </span>
      </div>
    );
  };

  const lineCell = (way: RerollWay): React.ReactNode => {
    const [only] = way.lines;
    if (way.lines.length === 1) {
      return (
        <div className={`${FIRST_ROW} gap-2`}>
          {only.ladder ? (
            <>
              {statIcon(only.ladder)}
              <span className={STAT_TEXT}>
                <span className="text-text-primary/78">{statLabel(only.ladder)}</span>
                <span className="text-text-primary/60">{rollLabel(only.ladder, only.value)}</span>
              </span>
            </>
          ) : (
            <span className="text-text-primary/78">Empty line</span>
          )}
        </div>
      );
    }
    // Lines redrawn together read as the tile does, icon and roll, because three names would push the figures off the table
    return (
      <div className={`${FIRST_ROW} gap-2`}>
        {way.lines.map((line, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span aria-hidden className="text-text-primary/45">+</span>}
            {line.ladder && (
              <span className="inline-flex items-center gap-1.5" title={statLabel(line.ladder)}>
                {statIcon(line.ladder)}
                <span className="sr-only">{statLabel(line.ladder)}</span>
                <span className="tabular-nums text-text-primary/78">{rollLabel(line.ladder, line.value)}</span>
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  /** "Locks the other 4 lines at 3 transducers a roll, about 9 rolls (27) on average", stating this way's own lock */
  const rollCost = (way: RerollWay, target: RerollTarget): React.ReactNode => {
    // A max-level echo holds five lines, and a way redraws its own and locks the rest
    const locked = 5 - way.lines.length;
    const rolls = Math.max(1, Math.round(1 / target.chance));
    return (
      <>
        Locks {locked === 1 ? 'the other line' : `the other ${locked} lines`} at{' '}
        <span className="text-white/95">{way.cost}</span> transducer{way.cost === 1 ? '' : 's'} a roll, about{' '}
        <span className="text-white/95">{rolls}</span> roll{rolls === 1 ? '' : 's'}{' '}
        (<span className="text-white/95">{Math.round(way.cost / target.chance).toLocaleString()}</span>) on average
      </>
    );
  };
  /** "Replacing DEF% 10.9% on Ironhoof", so a card opened from the rank cell still says which line it rolls */
  const replacing = (way: RerollWay): string => {
    const lines = way.lines
      .map((line) => (line.ladder ? `${statLabel(line.ladder)} ${rollLabel(line.ladder, line.value)}` : 'an empty line'))
      .join(' + ');
    return `Replacing ${lines} on ${echoName(way.echo)}`;
  };

  /** Every roll the stat can land on beside its tile tier swatch, with its own share of the chance */
  const stepTable = (way: RerollWay, target: RerollTarget): React.ReactNode => (
    <div className="space-y-2">
      <p>{rollCost(way, target)}</p>
      <div className="space-y-1">
        <div className={`${STEP_GRID} text-2xs text-white/62`}>
          <span>Roll</span>
          <span className="text-right">Chance</span>
          <span className="text-right">Or higher</span>
          <span className="col-span-2 text-right">Score gain</span>
          <span className="text-right">Rank</span>
        </div>
        {target.steps.map((step) => {
          const gains = step.gain > 0;
          return (
            <div
              key={step.value}
              className={`${STEP_GRID} ${FIGURE} rounded-md py-1 ${gains ? 'bg-white/6 text-white/95' : 'text-white/55'}`}
            >
              {/* Tier colour on a swatch rather than the figure, since the low tiers' browns read as muddy text */}
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-2.5 w-1 shrink-0 rounded-xs"
                  style={{ backgroundColor: getSubstatTierInfo(step.value, target.ladder.values)?.color ?? 'transparent' }}
                />
                {rollLabel(target.ladder, step.value)}
              </span>
              <span className="text-right">{formatChance(step.chance)}</span>
              <span className="text-right">{formatChance(step.orHigher)}</span>
              <span className="text-right" style={gains ? { color: statusRampColor(maxGain > 0 ? step.gain / maxGain : 0) } : undefined}>
                {gains ? `+${formatDamage(step.gain * score)}` : 'none'}
              </span>
              <span className="text-right text-white/62">{gains ? formatGain(step.gain) : ''}</span>
              <span
                className={`text-right ${step.rank > 0 ? '' : 'text-white/55'}`}
                style={step.rank > 0 ? { color: statusRampColor(1) } : undefined}
              >
                {step.rank > 0 ? step.rank.toLocaleString() : currentRank > 0 ? currentRank.toLocaleString() : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  /** The per-roll card, opened from a target's roll span and from a rank only the higher rolls reach */
  const rollCard = (way: RerollWay, target: RerollTarget, trigger: React.ReactNode): React.ReactNode => (
    <HoverCard
      placement="top"
      width="lg"
      triggerClassName="inline-flex"
      title={(
        <span className="inline-flex items-center gap-2">
          {statIcon(target.ladder)}
          {statFullLabel(target.ladder)}
        </span>
      )}
      subtitle={replacing(way)}
      body={stepTable(way, target)}
    >
      {trigger}
    </HoverCard>
  );

  const targetCells = (way: RerollWay, target: RerollTarget, divider: string): React.ReactNode => {
    const improves = rankDelta(target.rank) > 0;
    return (
      <>
        <td className={`${CELL} ${divider}`}>
          <div className="flex items-center gap-2">
            <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-primary/45" />
            {rollCard(way, target, (
              <span
                tabIndex={0}
                className="inline-flex cursor-help items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                {statIcon(target.ladder)}
                <span className={STAT_TEXT}>
                  <span className="text-text-primary">{statLabel(target.ladder)}</span>
                  {/* Dotted underline is the site's mark for a term with more behind it */}
                  <span className="text-text-primary/60 underline decoration-text-primary/45 decoration-dotted underline-offset-4">
                    {rollRange(target.ladder, target.minValue)}
                  </span>
                </span>
              </span>
            ))}
          </div>
        </td>
        <td
          className={`${CELL} ${divider} ${FIGURE} text-right text-base`}
          style={{ color: statusRampColor(maxGain > 0 ? target.maxGain / maxGain : 0) }}
        >
          {scoreRange(target.minGain, target.maxGain)}
        </td>
        {/* Same ramp a step back, so the share reads as the same gain on another scale */}
        <td
          className={`${CELL} ${divider} ${FIGURE} text-right text-base opacity-78`}
          style={{ color: statusRampColor(maxGain > 0 ? target.maxGain / maxGain : 0) }}
        >
          {formatGainRange(target.minGain, target.maxGain)}
        </td>
        <td
          className={`${CELL} ${divider} ${FIGURE} text-right text-base text-text-primary/55`}
          style={improves ? { color: statusRampColor(1) } : undefined}
        >
          {/* A rank only the higher rolls reach carries the dotted underline, and the card says from which roll */}
          {improves && target.rankValue !== target.minValue ? rollCard(way, target, (
            <span
              tabIndex={0}
              className="cursor-help rounded-sm underline decoration-current/45 decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {target.rank.toLocaleString()}
            </span>
          )) : improves ? target.rank.toLocaleString() : currentRank > 0 ? currentRank.toLocaleString() : ''}
        </td>
      </>
    );
  };

  return (
    <section className="space-y-3 pt-2" aria-label="Substat upgrades">
      {isLoading && (
        <div className={`${FRAME} animate-pulse divide-y divide-border/45`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`reroll-skeleton-${index}`} className={`${ROW} flex items-center gap-4 px-2.5`}>
              <div className="h-8 w-8 shrink-0 bg-white/10" />
              <div className="h-4 w-40 rounded bg-white/10" />
              <div className="h-4 flex-1 rounded bg-white/8" />
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

      {!isLoading && !error && model && bands.length === 0 && (
        <div className="py-1 text-center text-sm text-text-primary/60">
          No substat line on this build would score higher as another stat or roll.
        </div>
      )}

      {!isLoading && !error && model && bands.length > 0 && (
        <div className={FRAME}>
          <div ref={scrollerRef} className={`overflow-x-auto ${scroll.atEnd ? '' : FADE_RIGHT}`}>
            <table className="w-full border-separate border-spacing-0 text-sm">
              {/* The line column holds to its content, so every arrow sits right after its line
                  The echo name takes spare width first because it alone can wrap, and any left over spreads across the rest */}
              <colgroup>
                <col />
                <col className="w-px" />
                <col />
                <col />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className={`${HEAD} text-left ${scroll.scrolls ? PINNED_HEAD : HEAD_GROUND} ${scroll.atStart ? '' : PINNED_EDGE}`}
                  >
                    Echo
                  </th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-left`}>Line now</th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-left`}>Could become</th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-right`}>Score gain</th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-right`}>% gain</th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-right`}>Rank</th>
                </tr>
              </thead>
              {bands.map(([echoIndex, ways]) => (
                <tbody
                  key={echoIndex}
                  data-reroll-echo={echoIndex}
                  className="group/band transition-colors duration-150 hover:bg-white/3"
                >
                  {ways.map((way, wayIndex) => way.targets.map((target, targetIndex) => {
                    const divider = targetIndex > 0 ? '' : wayIndex === 0 ? ECHO_DIVIDER : WAY_DIVIDER;
                    return (
                      <tr key={target.key} className={ROW}>
                        {wayIndex === 0 && targetIndex === 0 && (
                          <th
                            scope="rowgroup"
                            rowSpan={ways.reduce((sum, entry) => sum + entry.targets.length, 0)}
                            className={`${CELL} ${ECHO_DIVIDER} text-left align-top font-normal ${scroll.scrolls ? PINNED : ''} ${scroll.atStart ? '' : PINNED_EDGE}`}
                          >
                            {echoRail(echoIndex)}
                          </th>
                        )}
                        {targetIndex === 0 && (
                          <td rowSpan={way.targets.length} className={`${CELL} ${divider} align-top`}>
                            {lineCell(way)}
                          </td>
                        )}
                        {targetCells(way, target, divider)}
                      </tr>
                    );
                  }))}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

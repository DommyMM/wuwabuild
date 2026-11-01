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
import {
  RerollBand,
  RerollTarget,
  RerollWay,
  TRANSDUCER_LIMIT,
  buildRerollModel,
  formatChance,
  formatGain,
  formatGainRange,
  formatTransducers,
} from '@/lib/rerolls';
import { formatStatRoll } from '@/components/echo/StatTierBars';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverCard } from '@/components/ui/HoverCard';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
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
/** Fixed row height, so a band keeps one rhythm whether it has one target or three */
const ROW = 'h-12';
const CELL = 'px-2.5 py-0 whitespace-nowrap';
/** Holds a spanning cell's content to its first row, a pixel short of it because the cell also carries the divider */
const FIRST_ROW = 'flex h-[47px] items-center';
const ECHO_DIVIDER = 'border-t border-border/55';
/** A stat's name and roll in one face on one baseline, told apart by colour, because a second face beside the name sat off its baseline */
const STAT_TEXT = 'inline-flex items-baseline gap-2 tabular-nums';
const TRIGGER = 'cursor-help rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';
/** Dotted underline is the site's mark for a term with more behind it */
const MORE = 'underline decoration-text-primary/45 decoration-dotted underline-offset-4';
/** Roll, its own chance, transducers until it or higher lands, Score gain with its share, and rank in the per-roll hover */
const STEP_GRID = 'grid grid-cols-[3.5rem_1fr_1fr_1.5fr_4rem_2.5rem] items-center gap-2 px-2';
/** The echo's other lock choices in the reroll hover: the lines, the cost of a roll, and mean gain per transducer */
const ALT_GRID = 'grid grid-cols-[1fr_auto_4.5rem] items-center gap-3 px-2';

/**
 * Which echoes are worth a transducer reroll, which lines to redraw on each, and which stats to keep
 *
 * A band is one echo's best way to roll, cheapest gain first, listing every stat worth confirming when it lands
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
  /** "8.6%+" for the lowest roll worth keeping, the top roll alone printing bare */
  const keepFrom = (ladder: LBSubstatLadder, value: number): string => (
    value === ladder.values[ladder.values.length - 1] ? rollLabel(ladder, value) : `${rollLabel(ladder, value)}+`
  );

  // Gain tint scales to the strongest target on the build
  const maxGain = model?.bands.flatMap((band) => band.targets).reduce((max, target) => Math.max(max, target.maxGain), 0) ?? 0;
  const currentRank = model?.currentRank ?? 0;
  const score = model?.score ?? 0;

  /** "DEF% 13.8% + ATK 40", the lines a way redraws as words */
  const linesText = (way: RerollWay): string => way.lines
    .map((line) => (line.ladder ? `${statLabel(line.ladder)} ${rollLabel(line.ladder, line.value)}` : 'the empty line'))
    .join(' + ');
  /** "Lock the other 3 lines", in the game's words */
  const lockText = (way: RerollWay): string => {
    if (way.cost === 0) return 'Tune the empty line';
    // A max-level echo holds five lines, and a way redraws its own and locks the rest
    const locked = 5 - way.lines.length;
    return `Lock ${locked === 1 ? 'the other line' : `the other ${locked} lines`}`;
  };
  const perRoll = (way: RerollWay): React.ReactNode => (
    <><span className="text-white/95">{way.cost}</span> transducer{way.cost === 1 ? '' : 's'} a roll</>
  );
  const tuningNote = "Tuning fills the empty line. It spends no transducers and can't be cancelled, so whatever lands stays.";

  const echoRail = (band: RerollBand): React.ReactNode => {
    const panel = buildDetail.buildState.echoPanels[band.way.echo];
    const echo = panel?.id ? getEcho(panel.id) : null;
    const name = echoName(band.way.echo);
    return (
      <div className={`${FIRST_ROW} gap-3`}>
        {echo && <img src={getEchoPaths(echo, panel?.phantom)} alt="" className="h-8 w-8 shrink-0 object-contain" />}
        {/* One line between 144 and 360px, cut with an ellipsis where the table lacks room for all of it
            The hidden wrapping copy sizes the column, and the shown copy has no width of its own so it never forces one */}
        <span className="max-w-90 min-w-36" title={name}>
          <span aria-hidden className="invisible block h-0 overflow-hidden font-semibold whitespace-normal">{name}</span>
          <span className="block truncate font-semibold text-text-primary contain-[inline-size]">{name}</span>
          {/* The figure the bands are ordered by, so the order explains itself */}
          <span className="block text-xs text-text-primary/55 tabular-nums">
            {band.way.cost === 0 ? 'Tune the empty line first' : `Avg. ${formatGain(band.way.expected)} per transducer`}
          </span>
        </span>
      </div>
    );
  };

  /** Why this lock: its cost and mean gain, beside the echo's other ways to roll it */
  const rerollCard = (band: RerollBand, trigger: React.ReactNode): React.ReactNode => (
    <HoverCard
      placement="top"
      width="lg"
      triggerClassName="inline-flex"
      title={lockText(band.way)}
      subtitle={echoName(band.way.echo)}
      body={band.way.cost === 0 ? <p>{tuningNote}</p> : (
        <div className="space-y-2">
          <p>
            Rerolls {linesText(band.way)} at {perRoll(band.way)}, averaging{' '}
            <span className="text-white/95">{formatGain(band.way.expected)}</span> of Score per transducer
          </p>
          {band.alternatives.length > 0 && (
            <div className="space-y-1">
              <div className={`${ALT_GRID} text-2xs text-white/62`}>
                <span>Other locks</span>
                <span className="text-right">Each roll</span>
                <span className="text-right">Per transducer</span>
              </div>
              {band.alternatives.map((way) => (
                <div key={way.key} className={`${ALT_GRID} rounded-md py-1 text-white/78`}>
                  <span className="whitespace-normal">{linesText(way)}</span>
                  <span className={`${FIGURE} text-right`}>{way.cost}</span>
                  <span className={`${FIGURE} text-right`}>{formatGain(way.expected)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    >
      {trigger}
    </HoverCard>
  );

  const rerollCell = (band: RerollBand): React.ReactNode => {
    const { way } = band;
    const [only] = way.lines;
    // Lines redrawn together read as the tile does, icon and roll, because three names would push the figures off the table
    const content = way.lines.length === 1 ? (
      only.ladder ? (
        <>
          {statIcon(only.ladder)}
          <span className={STAT_TEXT}>
            <span className="text-text-primary/78">{statLabel(only.ladder)}</span>
            <span className={`text-text-primary/60 ${MORE}`}>{rollLabel(only.ladder, only.value)}</span>
          </span>
        </>
      ) : (
        <span className={`text-text-primary/78 ${MORE}`}>Empty line</span>
      )
    ) : way.lines.map((line, index) => (
      <React.Fragment key={index}>
        {index > 0 && <span aria-hidden className="text-text-primary/45">+</span>}
        {line.ladder && (
          <span className="inline-flex items-center gap-1.5" title={statLabel(line.ladder)}>
            {statIcon(line.ladder)}
            <span className="sr-only">{statLabel(line.ladder)}</span>
            <span className={`tabular-nums text-text-primary/78 ${MORE}`}>{rollLabel(line.ladder, line.value)}</span>
          </span>
        )}
      </React.Fragment>
    ));
    return (
      <div className={FIRST_ROW}>
        {rerollCard(band, <span tabIndex={0} className={`inline-flex items-center gap-2 ${TRIGGER}`}>{content}</span>)}
      </div>
    );
  };

  /** Every roll the stat can land on beside its tile tier swatch, with its own chance and what it takes to land */
  const stepTable = (way: RerollWay, target: RerollTarget): React.ReactNode => (
    <div className="space-y-2">
      <p>{way.cost === 0 ? tuningNote : <>{lockText(way)}, {perRoll(way)}.</>}</p>
      {/* Each gain is the stat landing alone, since what else lands beside it only adds */}
      {way.lines.length > 1 && (
        <p className="text-white/62">
          Gains count the other rerolled line{way.lines.length > 2 ? 's' : ''} landing nothing useful
        </p>
      )}
      <div className="space-y-1">
        <div className={`${STEP_GRID} text-2xs text-white/62`}>
          <span>Roll</span>
          <span className="text-right">Chance</span>
          <span className="text-right">{way.cost === 0 ? '' : 'Avg.'}</span>
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
              {/* Past the limit the average still prints, quietly, so a long shot's price stays visible */}
              <span className={`text-right ${step.transducers > TRANSDUCER_LIMIT ? 'text-white/55' : ''}`}>
                {step.transducers > 0 ? formatTransducers(step.transducers) : ''}
              </span>
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

  /** The per-roll card, opened from a target's Keep roll */
  const keepCard = (way: RerollWay, target: RerollTarget, trigger: React.ReactNode): React.ReactNode => (
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
      subtitle={way.cost === 0
        ? `Tuning the empty line on ${echoName(way.echo)}`
        : `Rerolling ${linesText(way)} on ${echoName(way.echo)}`}
      body={stepTable(way, target)}
    >
      {trigger}
    </HoverCard>
  );

  /** "#10–#6" from the lowest roll worth keeping to the top roll, one rank when both land alike */
  const rankRange = (target: RerollTarget): string => {
    const low = target.minRank || currentRank;
    const high = target.maxRank || currentRank;
    if (high <= 0) return '';
    return low === high ? `#${high.toLocaleString()}` : `#${low.toLocaleString()}–#${high.toLocaleString()}`;
  };

  const targetCells = (way: RerollWay, target: RerollTarget, targetIndex: number): React.ReactNode => {
    // Only a band's first row carries the divider, so a band reads as one unit
    const cell = `${CELL} ${targetIndex === 0 ? ECHO_DIVIDER : ''}`;
    return (
      <>
        <td className={cell}>
          <div className="flex items-center gap-2">
            {/* Later targets land from the same roll, so "or" takes the arrow's slot and the stats stay aligned */}
            {targetIndex === 0 ? (
              <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-text-primary/45" />
            ) : (
              <span className="inline-flex w-3.5 shrink-0 justify-center text-xs text-text-primary/55">or</span>
            )}
            {keepCard(way, target, (
              <span tabIndex={0} className={`inline-flex items-center gap-2 ${TRIGGER}`}>
                {statIcon(target.ladder)}
                <span className={STAT_TEXT}>
                  <span className="text-text-primary">{statLabel(target.ladder)}</span>
                  <span className={`text-text-primary/60 ${MORE}`}>{keepFrom(target.ladder, target.minValue)}</span>
                </span>
              </span>
            ))}
          </div>
        </td>
        <td
          className={`${cell} ${FIGURE} text-right text-base`}
          style={{ color: statusRampColor(maxGain > 0 ? target.maxGain / maxGain : 0) }}
        >
          {formatGainRange(target.minGain, target.maxGain)}
        </td>
        <td
          className={`${cell} ${FIGURE} text-right text-base ${target.maxRank > 0 ? '' : 'text-text-primary/55'}`}
          style={target.maxRank > 0 ? { color: statusRampColor(1) } : undefined}
        >
          {rankRange(target)}
        </td>
        <td className={`${cell} text-right`}>
          {way.cost === 0
            ? <span className="text-text-primary/55">Tune</span>
            : <span className={`${FIGURE} text-base text-text-primary`}>{formatTransducers(target.transducers)}</span>}
        </td>
      </>
    );
  };

  const headTooltip = (label: string, explanation: string): React.ReactNode => (
    <HoverTooltip
      placement="top"
      triggerClassName="inline-flex"
      content={<p className="max-w-56 text-left text-xs text-text-primary/72">{explanation}</p>}
    >
      <span className={`cursor-help ${MORE}`}>{label}</span>
    </HoverTooltip>
  );

  const bands = model?.bands ?? [];

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
          No upgrade on this build averages under {TRANSDUCER_LIMIT} transducers.
        </div>
      )}

      {!isLoading && !error && model && bands.length > 0 && (
        <div className={FRAME}>
          <div ref={scrollerRef} className={`overflow-x-auto ${scroll.atEnd ? '' : FADE_RIGHT}`}>
            <table className="w-full border-separate border-spacing-0 text-sm">
              {/* The reroll column holds to its content, so every arrow sits right after its lines
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
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-left`}>Reroll</th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-left`}>
                    {headTooltip('Keep', 'Confirm when one of these lands, whatever the other new lines are')}
                  </th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-right`}>% gain</th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-right`}>Rank</th>
                  <th scope="col" className={`${HEAD} ${HEAD_GROUND} text-right`}>
                    {headTooltip('Avg. transducers', 'Transducers needed until a roll lands this stat stat or better')}
                  </th>
                </tr>
              </thead>
              {bands.map((band) => (
                <tbody
                  key={band.way.key}
                  data-reroll-echo={band.way.echo}
                  className="group/band transition-colors duration-150 hover:bg-white/3"
                >
                  {band.targets.map((target, targetIndex) => (
                    <tr key={target.key} className={ROW}>
                      {targetIndex === 0 && (
                        <>
                          <th
                            scope="rowgroup"
                            rowSpan={band.targets.length}
                            className={`${CELL} ${ECHO_DIVIDER} text-left align-top font-normal ${scroll.scrolls ? PINNED : ''} ${scroll.atStart ? '' : PINNED_EDGE}`}
                          >
                            {echoRail(band)}
                          </th>
                          <td rowSpan={band.targets.length} className={`${CELL} ${ECHO_DIVIDER} align-top`}>
                            {rerollCell(band)}
                          </td>
                        </>
                      )}
                      {targetCells(band.way, target, targetIndex)}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

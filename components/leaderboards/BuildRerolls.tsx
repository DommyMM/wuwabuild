'use client';

import React, { useCallback, useMemo } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPercentStat } from '@/lib/constants/statMappings';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';
import { LBBuildDetailEntry, LBRerolls, LBSubstatLadder } from '@/lib/lb';
import { getEchoPaths } from '@/lib/paths';
import { RerollReason, RerollTarget, RerollWay, buildRerollModel, formatChance, formatGainRange } from '@/lib/rerolls';
import { formatStatRoll } from '@/components/echo/StatTierBars';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { statusRampColor } from './constants';

interface BuildRerollsProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  data: LBRerolls | null;
  buildDetail: LBBuildDetailEntry;
}

const FIGURE = 'font-gowun tabular-nums';
/** Same tracks as the echo tiles above, so each column sits under its echo */
const ECHO_GRID = 'grid min-w-0 grid-cols-5 gap-4';
/** Quieter than the tiles' glass frame, so a panel reads as belonging to the tile above it */
const PANEL = 'overflow-hidden rounded-xl border bg-black/25';
const REASON_LABEL: Record<Exclude<RerollReason, null>, string> = { unused: 'unused', 'low-roll': 'low roll' };

/**
 * What a transducer reroll could turn the build's weak substat lines into, one column under each echo tile
 *
 * A column lists that echo's lines worth rolling, each with the stats it can land
 */
export const BuildRerolls: React.FC<BuildRerollsProps> = ({ isLoading, error, onRetry, data, buildDetail }) => {
  const { getEcho, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();

  const model = useMemo(() => (data ? buildRerollModel(data) : null), [data]);

  const statLabel = useCallback((ladder: LBSubstatLadder): string => (
    getEchoSubstatShortLabel(statTranslations?.[ladder.name] ? t(statTranslations[ladder.name]) : ladder.name)
  ), [statTranslations, t]);
  const statIcon = (ladder: LBSubstatLadder): React.ReactNode => {
    const icon = statIcons?.[ladder.name] ?? statIcons?.[ladder.name.replace('%', '')];
    return icon
      ? <img src={icon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
      : <span className="h-3.5 w-3.5 shrink-0 rounded bg-white/12" />;
  };
  const rollLabel = (ladder: LBSubstatLadder, value: number): string => formatStatRoll(value, isPercentStat(ladder.name));
  /** "50+" for a roll and up, bare for the ladder's top roll */
  const rollFloor = (ladder: LBSubstatLadder, value: number): string => (
    `${rollLabel(ladder, value)}${value === ladder.values[ladder.values.length - 1] ? '' : '+'}`
  );

  // Both tints scale to the strongest target on the build
  const targets = model?.ways.flatMap((way) => way.targets) ?? [];
  const maxGain = targets.reduce((max, target) => Math.max(max, target.maxGain), 0);
  const currentRank = model?.currentRank ?? 0;
  const rankDelta = (rank: number): number => (rank > 0 && currentRank > 0 ? currentRank - rank : 0);
  const maxRankDelta = targets.reduce((max, target) => Math.max(max, rankDelta(target.rank)), 0);
  const bestWay = model?.ways[0]?.key;

  const targetRows = (way: RerollWay, target: RerollTarget): React.ReactNode => (
    <li key={target.key} className="space-y-1 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <ArrowRight aria-hidden className="h-3 w-3 shrink-0 text-text-primary/45" />
        {statIcon(target.ladder)}
        <span className="min-w-0 truncate text-white/92">{statLabel(target.ladder)}</span>
        {target.hasFloor && (
          <span className={`${FIGURE} shrink-0 text-text-primary/78`}>{rollFloor(target.ladder, target.minValue)}</span>
        )}
        <span
          className={`${FIGURE} ml-auto shrink-0 pl-1 text-[15px] leading-none`}
          style={{ color: statusRampColor(maxGain > 0 ? target.maxGain / maxGain : 0) }}
        >
          {formatGainRange(target.minGain, target.maxGain)}
        </span>
      </div>
      <div className={`${FIGURE} flex items-baseline gap-2 pl-[18px] text-xs text-text-primary/60`}>
        <span>{formatChance(target.chance)}, about {Math.round(way.cost / target.chance).toLocaleString()}</span>
        {target.rank > 0 && (
          <span
            className="ml-auto shrink-0"
            style={{ color: statusRampColor(maxRankDelta > 0 ? rankDelta(target.rank) / maxRankDelta : 0) }}
          >
            rank {target.rank.toLocaleString()}
            {target.rankValue !== target.minValue && ` at ${rollFloor(target.ladder, target.rankValue)}`}
          </span>
        )}
      </div>
    </li>
  );

  const wayBlock = (way: RerollWay): React.ReactNode => {
    const isBest = way.key === bestWay;
    const panel = buildDetail.buildState.echoPanels[way.echo];
    const echo = panel?.id ? getEcho(panel.id) : null;
    return (
      <div key={way.key} className={`${PANEL} ${isBest ? 'border-accent/60' : 'border-border/55'}`}>
        {/* Every head is three lines, so the targets start level across columns */}
        <div className="space-y-1.5 border-b border-border/45 bg-black/30 px-3 py-2.5">
          <div className="flex items-center gap-2">
            {echo && <img src={getEchoPaths(echo, panel?.phantom)} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />}
            <span className="min-w-0 truncate font-semibold text-text-primary">
              {echo ? t(echo.nameI18n ?? { en: echo.name }) : `Echo ${way.echo + 1}`}
            </span>
            {isBest && <span className="ml-auto shrink-0 text-xs text-accent-hover">best value</span>}
          </div>
          <div className="flex items-center gap-2">
            {way.lines.map((line, lineIndex) => (line.ladder ? (
              <React.Fragment key={lineIndex}>
                {/* Same chip as the tile's substat row, so the line reads as the one above */}
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-black/75 px-1.5 py-0.5">
                  {statIcon(line.ladder)}
                  <span className={`${FIGURE} text-text-primary/78`}>{rollLabel(line.ladder, line.value)}</span>
                </span>
                <span className="min-w-0 truncate text-text-primary/78">{statLabel(line.ladder)}</span>
              </React.Fragment>
            ) : (
              <span key={lineIndex} className="text-text-primary/78">Empty line</span>
            )))}
          </div>
          <div className="truncate text-xs text-text-primary/55">
            {way.reason && `${REASON_LABEL[way.reason]}, `}
            <span className={FIGURE}>{way.cost}</span> transducers a roll
          </div>
        </div>
        <ul className="divide-y divide-border/45">{way.targets.map((target) => targetRows(way, target))}</ul>
      </div>
    );
  };

  const infoNote = (
    <HoverTooltip
      placement="top"
      triggerClassName="inline-flex"
      content={(
        <div className="max-w-xs space-y-1.5 text-left">
          <p className="text-sm font-semibold text-text-primary">Substat upgrades</p>
          <p className="text-xs leading-relaxed text-text-primary/70">
            Under each echo, the lines worth a transducer reroll and the stats each could land. Lines and stats
            that would not raise the Score are left out.
          </p>
          <p className="text-xs leading-relaxed text-text-primary/70">
            The green figure is the Score gained, from the lowest roll that gains to the highest. Below it is the
            chance one roll lands that stat, then the transducers it takes on average.
          </p>
          <p className="text-xs leading-relaxed text-text-primary/70">
            <span className="font-semibold text-text-primary/85">Best value</span> marks the line that gains the
            most per transducer.
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
  );

  return (
    <section className="space-y-3 pt-2" aria-label="Substat upgrades">
      {isLoading && (
        <div className={`${ECHO_GRID} animate-pulse`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`reroll-skeleton-${index}`} className={`${PANEL} space-y-2 border-border/55 p-3`}>
              <div className="h-4 rounded bg-white/10" />
              <div className="h-4 w-2/3 rounded bg-white/8" />
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

      {!isLoading && !error && model && model.ways.length === 0 && (
        <div className="py-1 text-center text-sm text-text-primary/60">
          No substat line on this build would score higher as another stat or roll.
        </div>
      )}

      {!isLoading && !error && model && model.ways.length > 0 && (
        <>
          <div className={`${ECHO_GRID} text-sm`}>
            {buildDetail.buildState.echoPanels.map((_, echoIndex) => {
              const ways = model.ways.filter((way) => way.echo === echoIndex);
              return (
                <div key={echoIndex} className="min-w-0 space-y-3">
                  {ways.length > 0 ? ways.map(wayBlock) : (
                    <div className={`${PANEL} border-dashed border-border/55 px-3 py-6 text-center text-text-primary/55`}>
                      Nothing to gain
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-text-primary/55">
            Score gained, then the chance a roll and the transducers it takes on average
            {infoNote}
          </div>
        </>
      )}
    </section>
  );
};

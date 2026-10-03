'use client';

import React, { useCallback, useMemo } from 'react';
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
import { statusRampColor } from './constants';
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
const HEAD = 'bg-black/30 px-4 py-2 text-xs font-normal whitespace-nowrap text-text-primary/55';
/** Fixed row height, so a band keeps one rhythm whether its line has one target or three */
const ROW = 'h-11';
const CELL = 'px-4 py-0 whitespace-nowrap';
/** Holds a spanning cell's content to its first row, a pixel short of it because the cell also carries the divider */
const FIRST_ROW = 'flex h-[43px] items-center';
const ECHO_DIVIDER = 'border-t border-border/55';
const WAY_DIVIDER = 'border-t border-border/35';
/** A stat's name and roll in one face on one baseline, told apart by colour, because a second face beside the name sat off its baseline */
const STAT_TEXT = 'inline-flex items-baseline gap-2 tabular-nums';
/** Roll, its chance, the chance of it or higher, gain and rank in the per-roll hover */
const STEP_GRID = 'grid grid-cols-[4rem_1fr_1fr_1fr_2rem] items-center gap-2 px-2';

/**
 * What a transducer reroll could turn the build's weak substat lines into, one band per echo
 *
 * A band lists the echo's lines worth rolling, each beside the stats it can land, most gain per transducer first
 */
export const BuildRerolls: React.FC<BuildRerollsProps> = ({ isLoading, error, onRetry, data, buildDetail }) => {
  const { getEcho, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();

  const model = useMemo(() => (data ? buildRerollModel(data) : null), [data]);
  // Ways arrive best first, so an echo takes the place of its best way
  const bands = useMemo(() => {
    const byEcho = new Map<number, RerollWay[]>();
    model?.ways.forEach((way) => byEcho.set(way.echo, [...(byEcho.get(way.echo) ?? []), way]));
    return [...byEcho.entries()];
  }, [model]);

  const statLabel = useCallback((ladder: LBSubstatLadder): string => (
    getEchoSubstatShortLabel(statTranslations?.[ladder.name] ? t(statTranslations[ladder.name]) : ladder.name)
  ), [statTranslations, t]);
  const statIcon = (ladder: LBSubstatLadder): React.ReactNode => {
    const icon = statIcons?.[ladder.name] ?? statIcons?.[ladder.name.replace('%', '')];
    return icon
      ? <img src={icon} alt="" className="h-4 w-4 shrink-0 object-contain" />
      : <span className="h-4 w-4 shrink-0 rounded bg-white/12" />;
  };
  const rollLabel = (ladder: LBSubstatLadder, value: number): string => formatStatRoll(value, isPercentStat(ladder.name));
  /** "50+" for a roll and up, bare for the ladder's top roll */
  const rollFloor = (ladder: LBSubstatLadder, value: number): string => (
    `${rollLabel(ladder, value)}${value === ladder.values[ladder.values.length - 1] ? '' : '+'}`
  );
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
  /** "+85,544–170,573" for a span of gain shares as Score, one figure when both ends print alike */
  const scoreRange = (min: number, max: number): string => {
    const base = model?.score ?? 0;
    const low = formatDamage(min * base);
    const high = formatDamage(max * base);
    return low === high ? `+${high}` : `+${low}–${high}`;
  };
  const rankDelta = (rank: number): number => (rank > 0 && currentRank > 0 ? currentRank - rank : 0);

  const echoRail = (echoIndex: number): React.ReactNode => {
    const panel = buildDetail.buildState.echoPanels[echoIndex];
    const echo = panel?.id ? getEcho(panel.id) : null;
    return (
      <div className={`${FIRST_ROW} gap-3`}>
        {echo && <img src={getEchoPaths(echo, panel?.phantom)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />}
        <span className="font-semibold text-text-primary">
          {echo ? t(echo.nameI18n ?? { en: echo.name }) : `Echo ${echoIndex + 1}`}
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

  /** Every roll the stat can land on, tinted like the tile's roll bar, with its own share of the chance */
  const stepTable = (target: RerollTarget): React.ReactNode => (
    <div className="space-y-1">
      <div className={`${STEP_GRID} text-2xs text-white/62`}>
        <span>Roll</span>
        <span className="text-right">Chance</span>
        <span className="text-right">Or higher</span>
        <span className="text-right">Score gain</span>
        <span className="text-right">Rank</span>
      </div>
      {target.steps.map((step) => {
        const gains = step.gain > 0;
        return (
          <div
            key={step.value}
            className={`${STEP_GRID} ${FIGURE} rounded-md py-1 ${gains ? 'bg-white/6 text-white/95' : 'text-white/55'}`}
          >
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
              {gains ? formatGain(step.gain) : 'none'}
            </span>
            <span className="text-right" style={step.rank > 0 ? { color: statusRampColor(1) } : undefined}>
              {step.rank > 0 ? step.rank.toLocaleString() : currentRank > 0 ? currentRank.toLocaleString() : ''}
            </span>
          </div>
        );
      })}
    </div>
  );

  const targetCells = (way: RerollWay, target: RerollTarget, divider: string): React.ReactNode => {
    const improves = rankDelta(target.rank) > 0;
    return (
      <>
        <td className={`${CELL} ${divider}`}>
          <div className="flex items-center gap-2">
            <ArrowRight aria-hidden className="mr-1.5 h-3.5 w-3.5 shrink-0 text-text-primary/45" />
            <HoverCard
              placement="top"
              width="md"
              triggerClassName="inline-flex"
              title={statLabel(target.ladder)}
              subtitle="Every roll it can land on"
              body={stepTable(target)}
            >
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
            </HoverCard>
          </div>
        </td>
        <td
          className={`${CELL} ${divider} ${FIGURE} text-right text-base`}
          style={{ color: statusRampColor(maxGain > 0 ? target.maxGain / maxGain : 0) }}
        >
          {scoreRange(target.minGain, target.maxGain)}
        </td>
        <td
          className={`${CELL} ${divider} ${FIGURE} text-right text-base`}
          style={{ color: statusRampColor(maxGain > 0 ? target.maxGain / maxGain : 0) }}
        >
          {formatGainRange(target.minGain, target.maxGain)}
        </td>
        <td
          className={`${CELL} ${divider} ${FIGURE} text-right text-base text-text-primary/55`}
          style={improves ? { color: statusRampColor(1) } : undefined}
        >
          {improves ? target.rank.toLocaleString() : currentRank > 0 ? currentRank.toLocaleString() : ''}
          {improves && target.rankValue !== target.minValue && (
            <span className="ml-1.5 text-xs text-text-primary/55">at {rollFloor(target.ladder, target.rankValue)}</span>
          )}
        </td>
        <td className={`${CELL} ${divider} ${FIGURE} text-right text-base text-text-primary/78`}>
          {Math.round(way.cost / target.chance).toLocaleString()}
        </td>
      </>
    );
  };

  return (
    <section className="space-y-3 pt-2" aria-label="Substat upgrades">
      {isLoading && (
        <div className={`${FRAME} animate-pulse divide-y divide-border/45`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`reroll-skeleton-${index}`} className={`${ROW} flex items-center gap-4 px-4`}>
              <div className="h-9 w-9 shrink-0 rounded-lg bg-white/10" />
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
          <table className="w-full border-separate border-spacing-0 text-sm">
            {/* The target column takes the slack, so every arrow sits right after its line */}
            <colgroup>
              <col className="w-52" />
              <col className="w-px" />
              <col />
              <col className="w-44" />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className={`${HEAD} text-left`}>Echo</th>
                <th scope="col" className={`${HEAD} text-left`}>Line now</th>
                <th scope="col" className={`${HEAD} text-left`}>Could become</th>
                <th scope="col" className={`${HEAD} text-right`}>Score gain</th>
                <th scope="col" className={`${HEAD} text-right`}>% gain</th>
                <th scope="col" className={`${HEAD} text-right`}>Rank</th>
                <th scope="col" className={`${HEAD} text-right`}>Avg. transducers</th>
              </tr>
            </thead>
            {bands.map(([echoIndex, ways]) => (
              <tbody key={echoIndex} data-reroll-echo={echoIndex} className="transition-colors duration-150 hover:bg-white/3">
                {ways.map((way, wayIndex) => way.targets.map((target, targetIndex) => {
                  const divider = targetIndex > 0 ? '' : wayIndex === 0 ? ECHO_DIVIDER : WAY_DIVIDER;
                  return (
                    <tr key={target.key} className={ROW}>
                      {wayIndex === 0 && targetIndex === 0 && (
                        <th
                          scope="rowgroup"
                          rowSpan={ways.reduce((sum, entry) => sum + entry.targets.length, 0)}
                          className={`${CELL} ${ECHO_DIVIDER} text-left align-top font-normal`}
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
      )}
    </section>
  );
};

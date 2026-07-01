'use client';

import React, { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Crown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { getBuildCVRatingColor } from '@/lib/calculations/rollValues';
import { getLBStatCode, LBBuildDetailEntry, LBBuildEchoSummary, LBBuildRowEntry, LBLeaderboardEntry, LBLeaderboardSortKey, LBSortKey } from '@/lib/lb';
import { ACTIVE_SORT_COLUMN_CLASS, TABLE_ROW_HEIGHT_CLASS } from '../constants';
import { formatReignHoldLabel, formatReignSinceDate, formatStatByKey, getSortLabel, resolveRegionBadge } from '../formatters';
import { resolveCharacterBaseScaling, resolveBuildRowStatKeys } from '../statColumns';
import { StatSortKey } from '../types';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { LB_TABLE_GRID, LB_SORTABLE_GROUP_GRID } from '../constants';
import { OwnerProfileLink } from '../OwnerProfileLink';

const loadBuildExpanded = () => import('../BuildExpanded').then((module) => module.BuildExpanded);

const BuildExpanded = dynamic(loadBuildExpanded, {
  ssr: false,
  loading: () => (
    <div className="border-t border-border/50 bg-black/15 px-12 py-4 text-center text-xs text-text-primary/55">
      Loading build details...
    </div>
  ),
});

interface LeaderboardRowProps {
  entry: LBLeaderboardEntry;
  isGhost?: boolean;
  activeWeaponId: string;
  activeTrackKey: string;
  erMin?: number;
  /** Board-level stat columns from the backend; overrides the per-row heuristic when present. */
  boardStatColumns?: StatSortKey[] | null;
  sort: LBLeaderboardSortKey;
  isCvColumnActive: boolean;
  isStatSortActive: boolean;
  isDamageSort: boolean;
  isExpanded: boolean;
  detail: LBBuildDetailEntry | undefined;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  onToggleExpand: (id: string) => void;
  onRetryDetail: (id: string) => void;
  rowRef?: React.Ref<HTMLDivElement>;
}

const LeaderboardRowComponent: React.FC<LeaderboardRowProps> = ({
  entry,
  isGhost = false,
  activeWeaponId,
  activeTrackKey,
  boardStatColumns,
  erMin = 0,
  sort,
  isCvColumnActive,
  isStatSortActive,
  isDamageSort,
  isExpanded,
  detail,
  isDetailLoading,
  detailError,
  onToggleExpand,
  onRetryDetail,
  rowRef,
}) => {
  const { fetters, getCharacter, getEcho, statIcons } = useGameData();
  const { t } = useLanguage();
  const [hasEverExpanded, setHasEverExpanded] = useState(isExpanded);

  const character = useMemo(
    () => getCharacter(entry.character.id),
    [entry.character.id, getCharacter],
  );
  const regionBadge = useMemo(
    () => resolveRegionBadge(entry.owner.uid),
    [entry.owner.uid],
  );
  const rowStatColumns = useMemo(() => {
    if (boardStatColumns && boardStatColumns.length === 4) return boardStatColumns;
    const rowBaseScaling = resolveCharacterBaseScaling(character);
    return resolveBuildRowStatKeys(
      rowBaseScaling,
      character?.element,
      character?.Bonus1,
      sort as LBSortKey,
      entry.stats,
      character?.preferredStats,
    );
  }, [boardStatColumns, character, entry.stats, sort]);

  const finalCvColor = useMemo(() => getBuildCVRatingColor(entry.finalCV, entry.echoSummary.mainStats), [entry.echoSummary.mainStats, entry.finalCV]);
  const isHighestCV = finalCvColor.toLowerCase() === '#ff00ff';

  const echoSetCounts = entry.echoSummary.sets;

  const computedActiveSets = useMemo(() => (
    Object.entries(echoSetCounts)
      .map(([setId, count]) => {
        const fetter = fetters.find((f) => String(f.id) === setId);
        const threshold = fetter?.pieceCount ?? 2;
        return {
          setId,
          count,
          active: count >= threshold,
          icon: fetter?.icon ?? '',
          name: fetter ? t(fetter.name) : `Set ${setId}`,
        };
      })
      .filter((s) => s.active)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  ), [echoSetCounts, fetters, t]);

  // Rank display
  const rank = entry.globalRank;
  const showReignHold = rank === 1 && !isGhost && erMin === 0 && Boolean(entry.reignSince);
  const reignHoldLabel = showReignHold && entry.reignSince
    ? formatReignHoldLabel(entry.reignSince)
    : null;
  const reignTitle = showReignHold && entry.reignSince
    ? `Rank 1 since ${formatReignSinceDate(entry.reignSince)}.`
    : undefined;
  const reignAriaLabel = reignHoldLabel === 'New'
    ? `Rank 1, new holder. ${reignTitle}`
    : `Rank 1, reigning ${reignHoldLabel}. ${reignTitle}`;

  const rankColor =
    rank === 2
        ? 'text-slate-300 font-bold'
        : rank === 3
          ? 'text-amber-600 font-bold'
          : 'text-text-primary/75';

  const rowEntry = useMemo<LBBuildRowEntry>(() => {
    const echoSummaryForExpanded: LBBuildEchoSummary = { sets: echoSetCounts, mainStats: entry.echoSummary.mainStats };
    return {
      id: entry.id,
      owner: entry.owner,
      character: { id: entry.character.id },
      weapon: entry.weapon,
      sequence: entry.sequence,
      stats: entry.stats,
      echoSummary: echoSummaryForExpanded,
      cv: entry.finalCV,
      timestamp: entry.timestamp,
    };
  }, [echoSetCounts, entry.character.id, entry.echoSummary.mainStats, entry.finalCV, entry.id, entry.owner, entry.sequence, entry.stats, entry.timestamp, entry.weapon]);

  const characterName = useMemo(() => (
    character
      ? formatCharacterDisplayName(character, {
          baseName: t(character.nameI18n ?? { en: character.name }),
          roverElement: detail?.buildState.roverElement,
        })
      : `Character ${entry.character.id}`
  ), [character, detail?.buildState.roverElement, entry.character.id, t]);

  const translateText = useCallback(
    (i18n: Record<string, string> | undefined, fallback: string) => t(i18n ?? { en: fallback }),
    [t],
  );
  const shouldRenderExpanded = hasEverExpanded || isExpanded;
  const handleToggleExpand = useCallback(() => {
    setHasEverExpanded(true);
    onToggleExpand(entry.id);
  }, [entry.id, onToggleExpand]);
  const preloadExpanded = useCallback(() => {
    void loadBuildExpanded();
  }, []);

  return (
    <div ref={rowRef}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className={`relative grid ${LB_TABLE_GRID} ${TABLE_ROW_HEIGHT_CLASS} cursor-pointer items-center gap-4.5 overflow-hidden text-sm transition-colors ${
          isGhost
            ? 'border-l-2 border-l-accent/60 bg-accent/6 hover:bg-accent/12'
            : 'odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/10'
        } focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/75`}
        onFocus={preloadExpanded}
        onClick={handleToggleExpand}
        onPointerDown={preloadExpanded}
        onPointerEnter={preloadExpanded}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          handleToggleExpand();
        }}
      >
        {/* Rank */}
        <div className={`relative flex h-full items-center justify-center py-1 text-center ${rankColor}`}>
          {showReignHold && reignHoldLabel && reignTitle ? (
            <span
              className="inline-flex translate-x-1 items-center justify-center gap-0.5 rounded border border-amber-300/50 bg-amber-400/14 px-1 py-1 text-xs leading-none text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.16)]"
              title={reignTitle}
              aria-label={reignAriaLabel}
            >
              <Crown className="h-3 w-3 shrink-0 text-amber-300" aria-hidden="true" strokeWidth={3} />
              <span className="truncate" suppressHydrationWarning>{reignHoldLabel}</span>
            </span>
          ) : (
            <span>{rank > 0 ? rank : '—'}</span>
          )}
        </div>

        {/* Owner */}
        <div className="min-w-0 py-2">
          <OwnerProfileLink
            uid={entry.owner.uid}
            username={entry.owner.username}
            regionBadge={regionBadge}
          />
        </div>

        {/* Character */}
        <div className="flex items-center gap-1.5 py-2">
          {character?.head ? (
            <img src={character.head} alt={characterName} className="h-9 w-9 object-cover" loading="lazy" />
          ) : (
            <div className="h-9 w-9 bg-border" />
          )}
          <span className="text-lg font-semibold text-text-primary">{characterName}</span>
        </div>

        {/* Echo sets */}
        <div className="flex items-center gap-2 py-2">
          {computedActiveSets.length === 0 ? (
            <span className="text-xs text-text-primary/50">No set</span>
          ) : (
            computedActiveSets.map((setEntry) => (
              <div key={setEntry.setId} className="flex items-end gap-0.5">
                {setEntry.icon ? (
                  <img src={setEntry.icon} alt="" title={setEntry.name} className="h-7 w-7" loading="lazy" />
                ) : (
                  <div className="h-8 w-8" />
                )}
                <span className="text-xs -mb-1 -ml-px font-semibold leading-none text-primary">
                  {setEntry.count}
                </span>
              </div>
            ))
          )}
        </div>

        {/* CV + Stats + Damage */}
        <div className={`grid ${LB_SORTABLE_GROUP_GRID} min-w-[796px] self-stretch gap-0`}>
          <div className={`self-stretch ${isCvColumnActive ? ACTIVE_SORT_COLUMN_CLASS : ''}`}>
            <div className="flex h-full items-center justify-between px-2.5 text-lg">
              <span className="text-text-primary">
                {Number(entry.stats.CR ?? 0).toFixed(1)} : {Number(entry.stats.CD ?? 0).toFixed(1)}
              </span>
              <span
                className={`tracking-wide ${isHighestCV ? 'cv-glow' : ''}`}
                style={isHighestCV ? undefined : { color: finalCvColor }}
              >
                {entry.finalCV.toFixed(1)} CV
              </span>
            </div>
          </div>

          {rowStatColumns.map((columnKey, statIndex) => {
            const label = getSortLabel(columnKey);
            const value = entry.stats[getLBStatCode(columnKey)] ?? 0;
            const icon = statIcons?.[label] ?? '';
            const iconFilter = ELEMENT_ICON_FILTERS[label];
            const shouldDimRowStat = isStatSortActive && statIndex > 0;
            return (
              <div
                key={`${entry.id}-${columnKey}-${statIndex}`}
                className={`self-stretch ${
                  isStatSortActive ? ACTIVE_SORT_COLUMN_CLASS : sort === columnKey ? ACTIVE_SORT_COLUMN_CLASS : ''
                }`}
              >
                <div className={`flex h-full items-center gap-2 py-2 px-4 text-lg text-text-primary ${shouldDimRowStat ? 'opacity-50' : ''}`}>
                  {icon ? (
                    <img
                      src={icon}
                      alt=""
                      className="w-5 h-5 shrink-0 object-contain"
                      style={iconFilter ? { filter: iconFilter } : undefined}
                      loading="lazy"
                    />
                  ) : (
                    <span className="inline-block h-5 w-5 shrink-0 rounded bg-border" />
                  )}
                  <span>{formatStatByKey(columnKey, value)}</span>
                </div>
              </div>
            );
          })}

          {/* Damage inside group, no gap */}
          <div className={`flex h-full items-center justify-end pr-4 text-lg font-semibold ${isDamageSort ? ACTIVE_SORT_COLUMN_CLASS : ''}`}>
            {entry.damage > 0 ? (
              <span className="text-accent">{Math.round(entry.damage).toLocaleString()}</span>
            ) : (
              <span className="text-text-primary/30">—</span>
            )}
          </div>
        </div>
      </div>

      {shouldRenderExpanded && (
        <BuildExpanded
          key={entry.id}
          entry={rowEntry}
          detail={detail}
          isExpanded={isExpanded}
          isDetailLoading={isDetailLoading}
          detailError={detailError ?? null}
          character={character}
          characterName={characterName}
          regionBadge={regionBadge}
          statIcons={statIcons}
          getEcho={getEcho}
          translateText={translateText}
          onRetryDetail={onRetryDetail}
          activeBoardWeaponId={activeWeaponId}
          activeTrackKey={activeTrackKey}
          activeBoardDamage={entry.damage}
          erMin={erMin}
          globalRank={entry.globalRank}
          surface="leaderboard_character"
          animateInitialExpand
        />
      )}
    </div>
  );
};

LeaderboardRowComponent.displayName = 'LeaderboardRow';

export const LeaderboardRow = React.memo(LeaderboardRowComponent);

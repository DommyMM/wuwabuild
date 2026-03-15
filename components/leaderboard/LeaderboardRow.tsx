'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { getCVRatingColor } from '@/lib/calculations/rollValues';
import { getLBStatCode, LBBuildDetailEntry, LBBuildEchoSummary, LBBuildRowEntry, LBLeaderboardEntry, LBLeaderboardSortKey, LBSortKey } from '@/lib/lb';
import { ACTIVE_SORT_COLUMN_CLASS, TABLE_ROW_HEIGHT_CLASS } from '@/components/build/buildConstants';
import { formatStatByKey, getSortLabel, resolveRegionBadge } from '@/components/build/buildFormatters';
import { resolveCharacterBaseScaling, resolveBuildRowStatKeys } from '@/components/build/buildStatColumns';
import { BuildExpanded } from '@/components/build/BuildExpanded';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { LB_TABLE_GRID, LB_SORTABLE_GROUP_GRID } from './leaderboardConstants';

interface LeaderboardRowProps {
  entry: LBLeaderboardEntry;
  activeWeaponId: string;
  activeTrackKey: string;
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
}

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  entry,
  activeWeaponId,
  activeTrackKey,
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
}) => {
  const { fetters, getCharacter, getEcho, statIcons } = useGameData();
  const { t } = useLanguage();

  const character = getCharacter(entry.character.id);
  const regionBadge = resolveRegionBadge(entry.owner.uid);
  const rowBaseScaling = resolveCharacterBaseScaling(character);
  const rowStatColumns = resolveBuildRowStatKeys(
    rowBaseScaling,
    character?.element,
    character?.Bonus1,
    sort as LBSortKey,
    entry.stats,
    character?.preferredStats,
  );

  const finalCvColor = getCVRatingColor(entry.finalCV);
  const isHighestCV = finalCvColor.toLowerCase() === '#ff00ff';

  const echoSetCounts = entry.echoSummary.sets;

  const computedActiveSets = Object.entries(echoSetCounts)
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
    .slice(0, 2);

  // Rank display
  const rank = entry.globalRank;
  const rankColor =
    rank === 1
      ? 'text-yellow-400 font-bold'
      : rank === 2
        ? 'text-slate-300 font-bold'
        : rank === 3
          ? 'text-amber-600 font-bold'
          : 'text-text-primary/75';

  // Build minimal LBBuildRowEntry for BuildExpanded
  const echoSummaryForExpanded: LBBuildEchoSummary = { sets: echoSetCounts, mainStats: [] };
  const rowEntry: LBBuildRowEntry = {
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

  const characterName = character
    ? formatCharacterDisplayName(character, {
        baseName: t(character.nameI18n ?? { en: character.name }),
        roverElement: detail?.buildState.roverElement,
      })
    : `Character ${entry.character.id}`;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className={`grid ${LB_TABLE_GRID} ${TABLE_ROW_HEIGHT_CLASS} cursor-pointer items-center gap-4.5 text-sm transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/75`}
        onClick={() => onToggleExpand(entry.id)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onToggleExpand(entry.id);
        }}
      >
        {/* Rank */}
        <div className={`py-2 text-center ${rankColor}`}>{rank > 0 ? rank : '—'}</div>

        {/* Owner */}
        <div className="py-2">
          <div className="flex items-center gap-2">
            {regionBadge && (
              <span className={`rounded px-2 py-1 text-xs font-semibold tracking-wide ${regionBadge.className}`}>
                {regionBadge.label}
              </span>
            )}
            <span className="text-lg text-text-primary">{entry.owner.username || 'Anonymous'}</span>
          </div>
        </div>

        {/* Character */}
        <div className="flex items-center gap-2 py-2">
          {character?.head ? (
            <img src={character.head} alt={characterName} className="h-9 w-9 object-cover" />
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
                  <img src={setEntry.icon} alt="" title={setEntry.name} className="h-7 w-7" />
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
        translateText={(i18n, fallback) => t(i18n ?? { en: fallback })}
        onRetryDetail={onRetryDetail}
        activeBoardWeaponId={activeWeaponId}
        activeTrackKey={activeTrackKey}
        activeBoardDamage={entry.damage}
        globalRank={entry.globalRank}
      />
    </div>
  );
};

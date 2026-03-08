'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCVRatingColor } from '@/lib/calculations/rollValues';
import {
  LBBuildDetailEntry,
  LBBuildEchoSummary,
  LBBuildRowEntry,
  LBLeaderboardEntry,
  LBStatCode,
  LBSortKey,
} from '@/lib/lb';
import { ElementType } from '@/lib/echo';
import { getWeaponPaths } from '@/lib/paths';
import {
  ACTIVE_SORT_COLUMN_CLASS,
  SEQUENCE_BADGE_STYLES,
  SORTABLE_GROUP_GRID,
  TABLE_ROW_HEIGHT_CLASS,
} from '@/components/build/buildConstants';
import { getSortLabel, resolveRegionBadge } from '@/components/build/buildFormatters';
import { resolveCharacterBaseScaling, resolveBuildRowStatKeys } from '@/components/build/buildStatColumns';
import { BuildExpanded } from '@/components/build/BuildExpanded';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { LB_TABLE_GRID } from './leaderboardConstants';

interface LeaderboardRowProps {
  entry: LBLeaderboardEntry;
  sort: string;
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
  const { fetters, fettersByElement, getCharacter, getEcho, getWeapon, statIcons } = useGameData();
  const { t } = useLanguage();

  const character = getCharacter(entry.character.id);
  const weapon = getWeapon(entry.weapon.id);
  const regionBadge = resolveRegionBadge(entry.owner.uid);
  const rowBaseScaling = resolveCharacterBaseScaling(character);
  const rowStatColumns = resolveBuildRowStatKeys(
    rowBaseScaling,
    character?.element,
    sort as LBSortKey,
    {} as Record<LBStatCode, number>,
  );

  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : 'Unknown Weapon';
  const sequenceLevel = Math.max(0, Math.min(6, Math.trunc(Number(entry.sequence) || 0)));
  const finalCvColor = getCVRatingColor(entry.finalCV);
  const isHighestCV = finalCvColor.toLowerCase() === '#ff00ff';

  // Compute echo set counts from buildState panels using selectedElement → fettersByElement
  const echoSetCounts: Record<string, number> = {};
  for (const panel of entry.buildState.echoPanels) {
    if (!panel.selectedElement) continue;
    const fetter = fettersByElement[panel.selectedElement as ElementType];
    if (!fetter) continue;
    const key = String(fetter.id);
    echoSetCounts[key] = (echoSetCounts[key] ?? 0) + 1;
  }

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
  const rank = isDamageSort ? entry.globalRank : entry.filteredRank;
  const rankColor =
    rank === 1
      ? 'text-yellow-400 font-bold'
      : rank === 2
        ? 'text-slate-300 font-bold'
        : rank === 3
          ? 'text-amber-600 font-bold'
          : 'text-text-primary/75';

  // Build a minimal LBBuildRowEntry for BuildExpanded compatibility
  const echoSummaryForExpanded: LBBuildEchoSummary = { sets: echoSetCounts, mainStats: [] };
  const rowEntry: LBBuildRowEntry = {
    id: entry.id,
    owner: entry.owner,
    character: { id: entry.character.id },
    weapon: entry.weapon,
    sequence: entry.sequence,
    stats: {} as Record<LBStatCode, number>,
    echoSummary: echoSummaryForExpanded,
    cv: entry.finalCV,
    timestamp: entry.timestamp,
  };

  // Use the already-known buildState if detail hasn't loaded yet
  const detailEntry: LBBuildDetailEntry = detail ?? {
    ...rowEntry,
    buildState: entry.buildState,
  };

  const characterName = character
    ? (character.name ?? `Character ${entry.character.id}`)
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

        {/* Weapon */}
        <div className="flex items-end py-2 text-text-primary/75">
          {weapon ? (
            <img src={getWeaponPaths(weapon)} alt={weaponName} className="h-9 w-9" />
          ) : (
            <div className="h-9 w-9" />
          )}
          <span className="-ml-1.5 rounded border border-black/55 bg-black/85 px-1 py-0 text-xs leading-tight text-white">
            R{entry.weapon.rank}
          </span>
        </div>

        {/* Sequence */}
        <div className="flex items-center py-2 text-text-primary/75">
          <span
            className={`inline-flex h-6 items-center justify-start rounded border pl-2 text-left text-xs font-semibold leading-none tracking-wide ${SEQUENCE_BADGE_STYLES[sequenceLevel]}`}
          >
            S{sequenceLevel}
          </span>
        </div>

        {/* Echo sets */}
        <div className="flex items-center gap-2 py-2">
          {computedActiveSets.length === 0 ? (
            <span className="text-xs text-text-primary/50">No set</span>
          ) : (
            computedActiveSets.map((setEntry) => (
              <div key={setEntry.setId} className="flex items-end gap-0.5">
                {setEntry.icon ? (
                  <img src={setEntry.icon} alt="" className="h-7 w-7" />
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

        {/* Damage */}
        <div
          className={`flex h-full items-center px-3 text-lg font-semibold ${isDamageSort ? ACTIVE_SORT_COLUMN_CLASS : ''}`}
        >
          {entry.damage > 0 ? (
            <span className="text-accent">{Math.round(entry.damage).toLocaleString()}</span>
          ) : (
            <span className="text-text-primary/40">—</span>
          )}
        </div>

        {/* CV + Stats */}
        <div className={`grid ${SORTABLE_GROUP_GRID} min-w-0 self-stretch gap-0`}>
          <div className={`self-stretch ${isCvColumnActive ? ACTIVE_SORT_COLUMN_CLASS : ''}`}>
            <div className="flex h-full items-center justify-between px-2.5 text-lg">
              <span className="text-text-primary">
                {Number(entry.cv ?? 0).toFixed(1)} : {Number(entry.finalCV ?? 0).toFixed(1)}
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
                <div
                  className={`flex h-full items-center gap-2 py-2 px-4 text-lg text-text-primary/50 ${shouldDimRowStat ? 'opacity-50' : ''}`}
                >
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
                  <span>—</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BuildExpanded
        key={entry.id}
        entry={rowEntry}
        detail={detailEntry}
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
      />
    </div>
  );
};

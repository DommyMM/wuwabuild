'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { getCVRatingColor } from '@/lib/calculations/rollValues';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { getLBStatCode, LBBuildDetailEntry, LBBuildRowEntry, LBSortKey } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { ACTIVE_SORT_COLUMN_CLASS, SEQUENCE_BADGE_STYLES, SORTABLE_GROUP_GRID, TABLE_GRID, TABLE_ROW_HEIGHT_CLASS } from '../constants';
import { formatStatByKey, getSortLabel, resolveRegionBadge } from '../formatters';
import { resolveCharacterBaseScaling, resolveBuildRowStatKeys } from '../statColumns';
import { BuildExpanded } from '../BuildExpanded';

interface GlobalBoardRowProps {
  entry: LBBuildRowEntry;
  rank: number;
  isExpanded: boolean;
  detail: LBBuildDetailEntry | undefined;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  sort: LBSortKey;
  isCvColumnActive: boolean;
  isStatSortActive: boolean;
  onToggleExpand: (buildId: string) => void;
  onRetryDetail: (buildId: string) => void;
}

export const GlobalBoardRow: React.FC<GlobalBoardRowProps> = ({
  entry,
  rank,
  isExpanded,
  detail,
  isDetailLoading,
  detailError,
  sort,
  isCvColumnActive,
  isStatSortActive,
  onToggleExpand,
  onRetryDetail,
}) => {
  const { fetters, getCharacter, getEcho, getWeapon, statIcons } = useGameData();
  const { t } = useLanguage();

  const character = getCharacter(entry.character.id);
  const weapon = getWeapon(entry.weapon.id);
  const regionBadge = resolveRegionBadge(entry.owner.uid);
  const rowBaseScaling = resolveCharacterBaseScaling(character);
  const rowStatColumns = resolveBuildRowStatKeys(
    rowBaseScaling,
    character?.element,
    character?.Bonus1,
    sort,
    entry.stats,
    character?.preferredStats,
  );

  const characterName = character
    ? formatCharacterDisplayName(character, {
        baseName: t(character.nameI18n ?? { en: character.name }),
        roverElement: detail?.buildState.roverElement,
      })
    : entry.character.id || 'Unknown Character';
  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : 'Unknown Weapon';
  const sequenceLevel = Math.max(0, Math.min(6, Math.trunc(Number(entry.sequence) || 0)));
  const finalCvColor = getCVRatingColor(entry.cv);
  const isHighestCV = finalCvColor.toLowerCase() === '#ff00ff';

  const activeSets = Object.entries(entry.echoSummary.sets)
    .map(([setId, count]) => {
      const fetter = fetters.find((f) => String(f.id) === setId);
      const threshold = fetter?.pieceCount ?? 2;
      return { setId, count, active: count >= threshold, icon: fetter?.icon ?? '', name: fetter ? t(fetter.name) : `Set ${setId}` };
    })
    .filter((s) => s.active)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className={`grid ${TABLE_GRID} ${TABLE_ROW_HEIGHT_CLASS} cursor-pointer items-center gap-4.5 text-sm transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/75`}
        onClick={() => onToggleExpand(entry.id)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onToggleExpand(entry.id);
        }}
      >
        <div className="py-2 text-center text-text-primary/75">{rank}</div>

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

        <div className="flex items-center gap-2 py-2">
          {character?.head ? (
            <img src={character.head} alt={characterName} className="h-9 w-9 object-cover" />
          ) : (
            <div className="h-9 w-9 bg-border" />
          )}
          <span className="text-lg font-semibold text-text-primary">{characterName}</span>
        </div>

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

        <div className="flex items-center py-2 text-text-primary/75">
          <span
            className={`inline-flex h-6 items-center justify-start rounded border pl-2 text-left text-xs font-semibold leading-none tracking-wide ${SEQUENCE_BADGE_STYLES[sequenceLevel]}`}
          >
            S{sequenceLevel}
          </span>
        </div>

        <div className="flex items-center gap-2 py-2">
          {activeSets.length === 0 ? (
            <span className="text-xs text-text-primary/50">No set</span>
          ) : (
            activeSets.map((setEntry) => (
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

        <div className={`grid ${SORTABLE_GROUP_GRID} min-w-[652px] self-stretch gap-0`}>
          <div className={`self-stretch ${isCvColumnActive ? ACTIVE_SORT_COLUMN_CLASS : ''}`}>
            <div className="flex h-full items-center justify-between px-2.5 text-lg">
              <span className="text-text-primary">
                {Number(entry.stats.CR ?? 0).toFixed(1)} : {Number(entry.stats.CD ?? 0).toFixed(1)}
              </span>
              <span className={`tracking-wide ${isHighestCV ? 'cv-glow' : ''}`} style={isHighestCV ? undefined : { color: finalCvColor }}>
                {entry.cv.toFixed(1)} CV
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
        </div>
      </div>

      <BuildExpanded
        key={entry.id}
        entry={entry}
        detail={detail}
        isExpanded={isExpanded}
        isDetailLoading={isDetailLoading}
        detailError={detailError}
        character={character}
        characterName={characterName}
        regionBadge={regionBadge}
        statIcons={statIcons}
        getEcho={getEcho}
        translateText={(i18n, fallback) => t(i18n ?? { en: fallback })}
        onRetryDetail={onRetryDetail}
        surface="builds"
      />
    </div>
  );
};

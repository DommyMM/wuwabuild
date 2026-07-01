'use client';

import React, { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { getBuildCVRatingColor } from '@/lib/calculations/rollValues';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { getLBStatCode, LBBuildDetailEntry, LBBuildRowEntry, LBSortKey } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { ACTIVE_SORT_COLUMN_CLASS, SEQUENCE_BADGE_STYLES, SORTABLE_GROUP_GRID, TABLE_GRID, TABLE_ROW_HEIGHT_CLASS, RegionBadge } from '../constants';
import { formatStatByKey, getSortLabel, resolveRegionBadge } from '../formatters';
import { resolveCharacterBaseScaling, resolveBuildRowStatKeys } from '../statColumns';
import { Echo } from '@/lib/echo';
import { Character } from '@/lib/character';
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

export interface GlobalBoardRowExpandedProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry | undefined;
  isExpanded: boolean;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
  statIcons: Record<string, string> | null;
  getEcho: (id: string | null) => Echo | null;
  translateText: (i18n: Record<string, string> | undefined, fallback: string) => string;
  onRetryDetail: (buildId: string) => void;
}

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
  renderExpanded?: (props: GlobalBoardRowExpandedProps) => React.ReactNode;
  tableGrid?: string;
  showOwner?: boolean;
}

const GlobalBoardRowComponent: React.FC<GlobalBoardRowProps> = ({
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
  renderExpanded,
  tableGrid = TABLE_GRID,
  showOwner = true,
}) => {
  const { fetters, getCharacter, getEcho, getWeapon, statIcons } = useGameData();
  const { t } = useLanguage();
  const [hasEverExpanded, setHasEverExpanded] = useState(isExpanded);

  const character = useMemo(
    () => getCharacter(entry.character.id),
    [entry.character.id, getCharacter],
  );
  const weapon = useMemo(
    () => getWeapon(entry.weapon.id),
    [entry.weapon.id, getWeapon],
  );
  const regionBadge = useMemo(
    () => resolveRegionBadge(entry.owner.uid),
    [entry.owner.uid],
  );
  const rowStatColumns = useMemo(() => {
    const rowBaseScaling = resolveCharacterBaseScaling(character);
    return resolveBuildRowStatKeys(
      rowBaseScaling,
      character?.element,
      character?.Bonus1,
      sort,
      entry.stats,
      character?.preferredStats,
    );
  }, [character, entry.stats, sort]);

  const characterName = useMemo(() => (
    character
      ? formatCharacterDisplayName(character, {
          baseName: t(character.nameI18n ?? { en: character.name }),
          roverElement: detail?.buildState.roverElement,
        })
      : entry.character.id || 'Unknown Character'
  ), [character, detail?.buildState.roverElement, entry.character.id, t]);
  const weaponName = useMemo(
    () => (weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : 'Unknown Weapon'),
    [t, weapon],
  );
  const sequenceLevel = useMemo(
    () => Math.max(0, Math.min(6, Math.trunc(Number(entry.sequence) || 0))),
    [entry.sequence],
  );
  const finalCvColor = useMemo(() => getBuildCVRatingColor(entry.cv, entry.echoSummary.mainStats), [entry.cv, entry.echoSummary.mainStats]);
  const isHighestCV = finalCvColor.toLowerCase() === '#ff00ff';

  const activeSets = useMemo(() => (
    Object.entries(entry.echoSummary.sets)
      .map(([setId, count]) => {
        const fetter = fetters.find((f) => String(f.id) === setId);
        const threshold = fetter?.pieceCount ?? 2;
        return { setId, count, active: count >= threshold, icon: fetter?.icon ?? '', name: fetter ? t(fetter.name) : `Set ${setId}` };
      })
      .filter((s) => s.active)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  ), [entry.echoSummary.sets, fetters, t]);

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
    if (!renderExpanded) void loadBuildExpanded();
  }, [renderExpanded]);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className={`grid ${tableGrid} ${TABLE_ROW_HEIGHT_CLASS} cursor-pointer items-center gap-4.5 text-sm transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/75`}
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
        <div className="py-2 text-center text-text-primary/75">{rank}</div>

        {showOwner && (
          <div className="min-w-0 py-2">
            <OwnerProfileLink
              uid={entry.owner.uid}
              username={entry.owner.username}
              regionBadge={regionBadge}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 py-2">
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

      {renderExpanded ? renderExpanded({
        entry,
        detail,
        isExpanded,
        isDetailLoading,
        detailError,
        character,
        characterName,
        regionBadge,
        statIcons,
        getEcho,
        translateText,
        onRetryDetail,
      }) : (
        shouldRenderExpanded && (
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
            translateText={translateText}
            onRetryDetail={onRetryDetail}
            surface="builds"
            animateInitialExpand
          />
        )
      )}
    </div>
  );
};

GlobalBoardRowComponent.displayName = 'GlobalBoardRow';

export const GlobalBoardRow = React.memo(GlobalBoardRowComponent);

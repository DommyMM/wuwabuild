'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { LBBuildDetailEntry, LBLeaderboardEntry, LBLeaderboardSortKey, LBSortDirection } from '@/lib/lb';
import { ACTIVE_SORT_COLUMN_CLASS, CV_OPTIONS, CVSortKey, DEFAULT_STAT_COLUMNS, STAT_OPTION_KEYS, TABLE_ROW_HEIGHT_CLASS } from '../constants';
import { getSortLabel } from '../formatters';
import { BuildPagination } from '../BuildPagination';
import { SortHeaderMenu, SortMenuOption } from '../SortHeaderMenu';
import { StatSortKey } from '../types';
import { LB_TABLE_GRID, LB_SORTABLE_GROUP_GRID } from '../constants';
import { LeaderboardRow } from './LeaderboardRow';

const DAMAGE_SORT_KEY: LBLeaderboardSortKey = 'damage';

interface LeaderboardResultsPanelProps {
  entries: LBLeaderboardEntry[];
  deepLinkBuildId: string;
  activeWeaponId: string;
  activeTrackKey: string;
  metricLabel: string;
  expandedIds: Set<string>;
  detailById: Record<string, LBBuildDetailEntry>;
  detailLoadingById: Record<string, boolean>;
  detailErrorById: Record<string, string | null>;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  rankStart: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  sort: LBLeaderboardSortKey;
  direction: LBSortDirection;
  onSortChange: (sort: LBLeaderboardSortKey) => void;
  onToggleDirection: () => void;
  onPageChange: (page: number) => void;
  onToggleExpand: (id: string) => void;
  onRetryDetail: (id: string) => void;
}

export const LeaderboardResultsPanel: React.FC<LeaderboardResultsPanelProps> = ({
  entries,
  deepLinkBuildId,
  activeWeaponId,
  activeTrackKey,
  metricLabel,
  expandedIds,
  detailById,
  detailLoadingById,
  detailErrorById,
  total,
  page,
  pageCount,
  pageSize,
  rankStart,
  isLoading,
  isRefreshing,
  error,
  sort,
  direction,
  onSortChange,
  onToggleDirection,
  onPageChange,
  onToggleExpand,
  onRetryDetail,
}) => {
  const { statIcons } = useGameData();
  const [statColumns, setStatColumns] = useState<StatSortKey[]>([...DEFAULT_STAT_COLUMNS]);

  const isDamageSort = sort === DAMAGE_SORT_KEY;
  const cvSort: CVSortKey = (sort === 'finalCV' || sort === 'crit_rate' || sort === 'crit_dmg') ? sort : 'finalCV';
  const isCvColumnActive = sort === 'finalCV' || sort === 'crit_rate' || sort === 'crit_dmg';
  const isStatSortActive = STAT_OPTION_KEYS.includes(sort as StatSortKey);

  const statOptions = useMemo<SortMenuOption[]>(() => (
    STAT_OPTION_KEYS.map((key) => {
      const label = getSortLabel(key);
      return { key, label, icon: statIcons?.[label] ?? '', iconFilter: ELEMENT_ICON_FILTERS[label] };
    })
  ), [statIcons]);

  const cvOptions = useMemo<SortMenuOption[]>(() => (
    CV_OPTIONS.map((option) => ({ key: option.key, label: option.label, icon: statIcons?.[option.label] ?? '' }))
  ), [statIcons]);

  const displayStatColumns = useMemo<StatSortKey[]>(() => {
    if (!isStatSortActive) return statColumns;
    const sortKey = sort as StatSortKey;
    return [sortKey, ...statColumns.filter((key) => key !== sortKey)].slice(0, 4);
  }, [sort, statColumns, isStatSortActive]);

  const activeCvOption = cvOptions.find((entry) => entry.key === cvSort) ?? cvOptions[0];
  const activePinnedStatKey = (isStatSortActive ? sort : displayStatColumns[0]) as StatSortKey;
  const activePinnedStatOption = statOptions.find((entry) => entry.key === activePinnedStatKey);

  const hasRows = entries.length > 0;
  const showInitialSkeleton = isLoading && !hasRows;
  const showRefreshingOverlay = isRefreshing && hasRows;
  const firstShown = total === 0 ? 0 : Math.min(total, rankStart);
  const lastShown = total === 0 ? 0 : Math.min(total, rankStart + Math.max(entries.length - 1, 0));
  const statusText = showInitialSkeleton
    ? ''
    : isRefreshing
      ? 'Updating...'
      : `${firstShown}-${lastShown} of ${total.toLocaleString()}`;

  const handleSortRequest = (nextSort: LBLeaderboardSortKey) => {
    if (sort === nextSort) { onToggleDirection(); return; }
    onSortChange(nextSort);
  };

  return (
    <section>
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-sm text-red-300">
          Failed to load leaderboard: {error}
        </div>
      )}

      <div className="relative">
        <div className="scrollbar-thin overflow-x-auto overflow-y-hidden pb-1 [--scrollbar-height:2px] [--scrollbar-width:6px]">
          <div className="w-max min-w-full">
            <div className="overflow-hidden rounded-lg border border-border bg-background/70">
              {/* Table header: Rank | Owner | Character | Sets | [CV+Stats+Metric] */}
              <div className={`grid ${LB_TABLE_GRID} items-center gap-4.5 rounded-t-lg border-b border-border bg-background-secondary/95 text-lg text-text-primary`}>
                <div className="py-2 text-center text-text-primary/70">#</div>
                <div className="py-2">Owner</div>
                <div className="py-2">Name</div>
                <div className="py-2">Sets</div>
                {/* CV + Stats + Metric group */}
                <div className={`grid ${LB_SORTABLE_GROUP_GRID} min-w-200 self-stretch gap-0`}>
                  <div className="self-stretch">
                    <SortHeaderMenu
                      menuId="lb-sort-cv"
                      label={CV_OPTIONS.find((entry) => entry.key === cvSort)?.label ?? 'Crit Value'}
                      active={isCvColumnActive}
                      direction={direction}
                      options={cvOptions}
                      selectedKey={cvSort}
                      onHeaderSort={() => handleSortRequest(cvSort)}
                      onSelectOption={(key) => handleSortRequest(key as LBLeaderboardSortKey)}
                      icon={activeCvOption?.icon}
                      showHeaderPlaceholderIcon={false}
                      showActive
                    />
                  </div>

                  {isStatSortActive ? (
                    <div className="col-span-4 self-stretch flex items-stretch">
                      <SortHeaderMenu
                        menuId="lb-sort-stat-merged"
                        label={getSortLabel(activePinnedStatKey)}
                        active
                        direction={direction}
                        options={statOptions}
                        selectedKey={sort as Parameters<typeof SortHeaderMenu>[0]['selectedKey']}
                        onHeaderSort={() => handleSortRequest(activePinnedStatKey)}
                        onSelectOption={(nextSort) => {
                          if (!STAT_OPTION_KEYS.includes(nextSort as StatSortKey)) return;
                          setStatColumns((prev) => {
                            const base = [nextSort as StatSortKey, ...displayStatColumns.filter((key) => key !== nextSort)];
                            const normalized = [...base, ...prev].filter((key, idx, arr) => arr.indexOf(key) === idx);
                            return normalized.slice(0, 4) as StatSortKey[];
                          });
                          handleSortRequest(nextSort as LBLeaderboardSortKey);
                        }}
                        icon={activePinnedStatOption?.icon}
                        iconFilter={activePinnedStatOption?.iconFilter}
                        fillWidth
                        naturalMenuWidth
                        showActive
                      />
                    </div>
                  ) : (
                    displayStatColumns.map((columnKey, index) => {
                      const option = statOptions.find((entry) => entry.key === columnKey);
                      return (
                        <div
                          key={`lb-header-${columnKey}-${index}`}
                          className={`self-stretch ${sort === columnKey ? ACTIVE_SORT_COLUMN_CLASS : ''}`}
                        >
                          <SortHeaderMenu
                            menuId={`lb-sort-stat-${index}`}
                            label={getSortLabel(columnKey)}
                            active={sort === columnKey}
                            direction={direction}
                            options={statOptions}
                            selectedKey={sort as Parameters<typeof SortHeaderMenu>[0]['selectedKey']}
                            alignMenuRight={index === displayStatColumns.length - 1}
                            onHeaderSort={() => handleSortRequest(columnKey)}
                            onSelectOption={(nextSort) => {
                              if (!STAT_OPTION_KEYS.includes(nextSort as StatSortKey)) return;
                              setStatColumns((prev) => {
                                const base = [...displayStatColumns];
                                base[index] = nextSort as StatSortKey;
                                const normalized = [...base, ...prev].filter((key, idx, arr) => arr.indexOf(key) === idx);
                                return normalized.slice(0, 4) as StatSortKey[];
                              });
                              handleSortRequest(nextSort as LBLeaderboardSortKey);
                            }}
                            icon={option?.icon}
                            iconFilter={option?.iconFilter}
                            showPlaceholderLine
                            showActive
                          />
                        </div>
                      );
                    })
                  )}

                  {/* Metric inside group, no gap */}
                  <div className="self-stretch">
                    <div className={`flex h-full overflow-hidden rounded-tr-lg ${isDamageSort ? 'border-t-2 border-accent/85' : 'border-t-2 border-transparent'}`}>
                      <button
                        type="button"
                        onClick={() => handleSortRequest(DAMAGE_SORT_KEY)}
                        className={`flex h-full w-full items-center justify-between gap-2 py-2 px-4 text-lg transition-colors ${
                          isDamageSort
                            ? 'border-accent/85 bg-black/35 text-accent'
                            : 'text-text-primary/85 hover:bg-background/60 hover:text-text-primary'
                        }`}
                      >
                        <span>{metricLabel}</span>
                        {isDamageSort ? (
                          <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
                              direction === 'asc' ? 'rotate-180' : ''
                            }`}
                          />
                        ) : null}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rows area */}
              <div className="relative overflow-hidden rounded-b-lg">
                {showInitialSkeleton && (
                  <div className="divide-y divide-border/60">
                    {Array.from({ length: pageSize }).map((_, index) => (
                      <div
                        key={index}
                        className={`grid ${LB_TABLE_GRID} ${TABLE_ROW_HEIGHT_CLASS} items-center gap-4.5 px-2 odd:bg-background/30 even:bg-background-secondary/20`}
                      >
                        <div className="mx-auto h-3 w-6 animate-pulse rounded bg-background-secondary/80" />
                        <div className="h-3.5 w-28 animate-pulse rounded bg-background-secondary/80" />
                        <div className="h-3.5 w-30 animate-pulse rounded bg-background-secondary/80" />
                        <div className="h-5 w-16 animate-pulse rounded bg-background-secondary/80" />
                        <div className={`grid ${LB_SORTABLE_GROUP_GRID} min-w-200 gap-0`}>
                          <div className="h-3.5 w-24 self-center animate-pulse rounded bg-background-secondary/80" />
                          <div className="h-3.5 w-16 self-center animate-pulse rounded bg-background-secondary/80" />
                          <div className="h-3.5 w-16 self-center animate-pulse rounded bg-background-secondary/80" />
                          <div className="h-3.5 w-16 self-center animate-pulse rounded bg-background-secondary/80" />
                          <div className="h-3.5 w-16 self-center animate-pulse rounded bg-background-secondary/80" />
                          <div className="ml-auto mr-4 h-3.5 w-20 animate-pulse rounded bg-background-secondary/80" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!showInitialSkeleton && !error && entries.length === 0 && (
                  <div className="p-6 text-center text-sm text-text-primary/65">
                    No entries match the current filters.
                  </div>
                )}

                {!error && entries.length > 0 && (
                  <div className="relative divide-y divide-border/60">
                    {entries.map((entry) => (
                      <LeaderboardRow
                        key={entry.id}
                        entry={entry}
                        isGhost={entry.globalRank === 0 && entry.id === deepLinkBuildId}
                        activeWeaponId={activeWeaponId}
                        activeTrackKey={activeTrackKey}
                        sort={sort}
                        isCvColumnActive={isCvColumnActive}
                        isStatSortActive={isStatSortActive}
                        isDamageSort={isDamageSort}
                        isExpanded={expandedIds.has(entry.id)}
                        detail={detailById[entry.id]}
                        isDetailLoading={detailLoadingById[entry.id] ?? false}
                        detailError={detailErrorById[entry.id]}
                        onToggleExpand={onToggleExpand}
                        onRetryDetail={onRetryDetail}
                      />
                    ))}
                    {showRefreshingOverlay && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[1.5px]">
                        <div className="flex items-center gap-3 rounded-md border border-accent/35 bg-background/80 px-4 py-2 text-sm text-text-primary">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
                          Updating...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BuildPagination page={page} pageCount={pageCount} statusText={statusText} onPageChange={onPageChange} />
    </section>
  );
};

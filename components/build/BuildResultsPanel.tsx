'use client';

import React, { useMemo, useState } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { LBBuildDetailEntry, LBBuildRowEntry, LBSortDirection, LBSortKey } from '@/lib/lb';
import { ACTIVE_HEADER_TOP_BORDER_CLASS, ACTIVE_SORT_COLUMN_CLASS, CV_OPTIONS, CVSortKey, DEFAULT_STAT_COLUMNS, SORTABLE_GROUP_GRID, STAT_OPTION_KEYS, TABLE_GRID, TABLE_ROW_HEIGHT_CLASS } from './buildConstants';
import { getSortLabel } from './buildFormatters';
import { BuildPagination } from './BuildPagination';
import { BuildRow } from './BuildRow';
import { SortHeaderMenu, SortMenuOption } from './SortHeaderMenu';
import { StatSortKey } from './types';

interface BuildResultsPanelProps {
  builds: LBBuildRowEntry[];
  expandedBuildIds: Set<string>;
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
  sort: LBSortKey;
  direction: LBSortDirection;
  onSortChange: (sort: LBSortKey) => void;
  onToggleDirection: () => void;
  onPageChange: (page: number) => void;
  onToggleExpand: (buildId: string) => void;
  onRetryDetail: (buildId: string) => void;
}

export const BuildResultsPanel: React.FC<BuildResultsPanelProps> = ({
  builds,
  expandedBuildIds,
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

  const cvSort: CVSortKey = (sort === 'finalCV' || sort === 'CR' || sort === 'CD') ? sort : 'finalCV';
  const isCvColumnActive = sort === 'finalCV' || sort === 'CR' || sort === 'CD';
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

  const hasBuildRows = builds.length > 0;
  const showInitialSkeleton = isLoading && !hasBuildRows;
  const showRefreshingOverlay = isRefreshing && hasBuildRows;
  const firstShown = total === 0 ? 0 : Math.min(total, rankStart);
  const lastShown = total === 0 ? 0 : Math.min(total, rankStart + Math.max(builds.length - 1, 0));
  const statusText = showInitialSkeleton
    ? 'Loading builds...'
    : isRefreshing ? 'Updating...' : `${firstShown}-${lastShown} of ${total.toLocaleString()}`;

  const handleSortRequest = (nextSort: LBSortKey) => {
    if (sort === nextSort) { onToggleDirection(); return; }
    onSortChange(nextSort);
  };

  return (
    <section>
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-sm text-red-300">
          Failed to load leaderboard data: {error}
        </div>
      )}

      <div className="relative overflow-x-auto overflow-y-visible pb-1 md:overflow-x-visible">
        <div className="overflow-visible rounded-lg border border-border bg-background/70">
          {/* Table header */}
          <div className={`grid ${TABLE_GRID} items-center gap-4.5 border-b border-border bg-background-secondary/95 text-lg text-text-primary`}>
            <div className="py-2 text-center text-text-primary/70">#</div>
            <div className="py-2">Owner</div>
            <div className="py-2">Name</div>
            <div className="py-2" aria-hidden="true" />
            <div className="py-2" aria-hidden="true" />
            <div className="py-2">Sets</div>
            <div className={`grid ${SORTABLE_GROUP_GRID} min-w-0 self-stretch gap-0`}>
              <div className={`self-stretch border-t-2 ${isCvColumnActive ? ACTIVE_HEADER_TOP_BORDER_CLASS : 'border-transparent'}`}>
                <SortHeaderMenu
                  menuId="sort-cv"
                  label={CV_OPTIONS.find((entry) => entry.key === cvSort)?.label ?? 'Crit Value'}
                  active={isCvColumnActive}
                  direction={direction}
                  options={cvOptions}
                  selectedKey={sort}
                  onHeaderSort={() => handleSortRequest(cvSort)}
                  onSelectOption={handleSortRequest}
                  icon={activeCvOption?.icon}
                  showHeaderPlaceholderIcon={false}
                />
              </div>
              {isStatSortActive ? (
                <div className="col-span-4 self-stretch flex items-stretch">
                  <SortHeaderMenu
                    menuId="sort-stat-merged"
                    label={getSortLabel(activePinnedStatKey)}
                    active
                    direction={direction}
                    options={statOptions}
                    selectedKey={sort}
                    onHeaderSort={() => handleSortRequest(activePinnedStatKey)}
                    onSelectOption={(nextSort) => {
                      if (!STAT_OPTION_KEYS.includes(nextSort as StatSortKey)) return;
                      setStatColumns((prev) => {
                        const base = [nextSort as StatSortKey, ...displayStatColumns.filter((key) => key !== nextSort)];
                        const normalized = [...base, ...prev].filter((key, idx, arr) => arr.indexOf(key) === idx);
                        return normalized.slice(0, 4) as StatSortKey[];
                      });
                      handleSortRequest(nextSort);
                    }}
                    icon={activePinnedStatOption?.icon}
                    iconFilter={activePinnedStatOption?.iconFilter}
                    fillWidth
                    naturalMenuWidth
                    textSizeClass="text-lg"
                    iconSizeClass="h-5 w-5"
                  />
                </div>
              ) : (
                displayStatColumns.map((columnKey, index) => {
                  const option = statOptions.find((entry) => entry.key === columnKey);
                  return (
                    <div
                      key={`header-${columnKey}-${index}`}
                      className={`self-stretch ${sort === columnKey ? ACTIVE_SORT_COLUMN_CLASS : ''}`}
                    >
                      <SortHeaderMenu
                        menuId={`sort-stat-${index}`}
                        label={getSortLabel(columnKey)}
                        active={sort === columnKey}
                        direction={direction}
                        options={statOptions}
                        selectedKey={sort}
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
                          handleSortRequest(nextSort);
                        }}
                        icon={option?.icon}
                        iconFilter={option?.iconFilter}
                        showPlaceholderLine={isCvColumnActive}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Rows area — overlay is scoped here so the header stays visible */}
          <div className="relative">
            {/* Skeleton rows */}
            {showInitialSkeleton && (
              <div className="divide-y divide-border/60">
                {Array.from({ length: pageSize }).map((_, index) => (
                  <div
                    key={index}
                    className={`grid ${TABLE_GRID} ${TABLE_ROW_HEIGHT_CLASS} items-center gap-4.5 px-2 odd:bg-background/30 even:bg-background-secondary/20`}
                  >
                    <div className="mx-auto h-3 w-6 animate-pulse rounded bg-background-secondary/80" />
                    <div className="h-3.5 w-28 animate-pulse rounded bg-background-secondary/80" />
                    <div className="h-3.5 w-30 animate-pulse rounded bg-background-secondary/80" />
                    <div className="h-8 w-8 animate-pulse rounded bg-background-secondary/80" />
                    <div className="h-5 w-9 animate-pulse rounded bg-background-secondary/80" />
                    <div className="h-5 w-16 animate-pulse rounded bg-background-secondary/80" />
                    <div className={`grid ${SORTABLE_GROUP_GRID} gap-0`}>
                      <div className="h-3.5 w-24 self-center animate-pulse rounded bg-background-secondary/80" />
                      <div className="h-3.5 w-16 self-center animate-pulse rounded bg-background-secondary/80" />
                      <div className="h-3.5 w-16 self-center animate-pulse rounded bg-background-secondary/80" />
                      <div className="h-3.5 w-16 self-center animate-pulse rounded bg-background-secondary/80" />
                      <div className="h-3.5 w-16 self-center animate-pulse rounded bg-background-secondary/80" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showInitialSkeleton && !error && builds.length === 0 && (
              <div className="p-6 text-center text-sm text-text-primary/65">
                No builds match the current filters.
              </div>
            )}

            {!error && builds.length > 0 && (
              <div className="relative divide-y divide-border/60">
                {builds.map((entry, index) => (
                  <BuildRow
                    key={entry.id}
                    entry={entry}
                    rank={rankStart + index}
                    isExpanded={expandedBuildIds.has(entry.id)}
                    detail={detailById[entry.id]}
                    isDetailLoading={detailLoadingById[entry.id] ?? false}
                    detailError={detailErrorById[entry.id]}
                    sort={sort}
                    isCvColumnActive={isCvColumnActive}
                    isStatSortActive={isStatSortActive}
                    onToggleExpand={onToggleExpand}
                    onRetryDetail={onRetryDetail}
                  />
                ))}
                {showRefreshingOverlay && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-[1.5px]">
                    <div className="flex items-center gap-3 rounded-md border border-accent/35 bg-background/80 px-4 py-2 text-sm text-text-primary">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
                      Updating builds...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BuildPagination page={page} pageCount={pageCount} statusText={statusText} onPageChange={onPageChange} />
    </section>
  );
};

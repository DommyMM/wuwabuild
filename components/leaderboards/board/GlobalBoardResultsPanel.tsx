'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { LBBuildDetailEntry, LBBuildRowEntry, LBSortDirection, LBSortKey } from '@/lib/lb';
import { ACTIVE_SORT_COLUMN_CLASS, CV_OPTIONS, CVSortKey, DEFAULT_STAT_COLUMNS, SORTABLE_GROUP_GRID, STAT_OPTION_KEYS, TABLE_GRID, TABLE_ROW_HEIGHT_CLASS } from '../constants';
import { getSortLabel } from '../formatters';
import { ChevronDown } from 'lucide-react';
import { BuildPagination } from '../BuildPagination';
import { GlobalBoardRow, GlobalBoardRowExpandedProps } from './GlobalBoardRow';
import { SortHeaderMenu, SortMenuOption } from '../SortHeaderMenu';
import { StatSortKey } from '../types';

interface GlobalBoardResultsPanelProps {
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
  renderExpanded?: (props: GlobalBoardRowExpandedProps) => React.ReactNode;
  tableGrid?: string;
  showOwner?: boolean;
  showTableGate?: boolean;
}

interface BuildTableGateOverlayProps {
  characters: ReturnType<typeof useGameData>['characters'];
  fetters: ReturnType<typeof useGameData>['fetters'];
  weaponList: ReturnType<typeof useGameData>['weaponList'];
}

const BuildTableGateOverlay: React.FC<BuildTableGateOverlayProps> = ({
  characters,
  fetters,
  weaponList,
}) => {
  const changliIcon = characters.find((entry) => entry.id === '1205')?.head ?? '';
  const aemeathIcon = characters.find((entry) => entry.id === '1210')?.head ?? '';
  const shorekeeperIcon = characters.find((entry) => entry.id === '1505')?.head ?? '';
  const zaniIcon = characters.find((entry) => entry.id === '1507')?.head ?? '';
  const trailblazingStarIcon = fetters.find((entry) => entry.id === 27)?.icon ?? '';
  const blazingJusticeIcon = weaponList.find((entry) => entry.id === '21040036')?.iconUrl ?? '';

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1 text-left text-sm text-text-primary/88 md:text-base">
        <div className="flex min-w-0 flex-wrap items-end gap-1 [&>span]:self-end">
          <span>Find the</span>
          <img src={changliIcon} alt="" className="h-6 w-6 shrink-0 object-contain" />
          <span>with the highest Crit Value</span>
        </div>
      </div>
      <div className="flex items-end gap-1 text-left text-sm text-text-primary/88 md:text-base">
        <div className="flex min-w-0 flex-wrap items-end gap-1 [&>span]:self-end">
          <span>Find the</span>
          <img src={aemeathIcon} alt="" className="h-6 w-6 shrink-0 object-contain" />
          <span>on</span>
          <img src={trailblazingStarIcon} alt="" className="h-6 w-6 shrink-0 object-contain" />
          <span>with the highest Crit Damage</span>
        </div>
      </div>
      <div className="flex items-end gap-1 text-left text-sm text-text-primary/88 md:text-base">
        <div className="flex min-w-0 flex-wrap items-end gap-1 [&>span]:self-end">
          <span>See how many</span>
          <img src={zaniIcon} alt="" className="h-6 w-6 shrink-0 object-contain" />
          <span>are bricked because they don&apos;t have</span>
          <img src={blazingJusticeIcon} alt="" className="h-6 w-6 shrink-0 object-contain opacity-90" />
        </div>
      </div>
      <div className="flex items-end gap-1 text-left text-sm text-text-primary/88 md:text-base">
        <div className="flex min-w-0 flex-wrap items-end gap-1 [&>span]:self-end">
          <span>Find the</span>
          <img src={shorekeeperIcon} alt="" className="h-6 w-6 shrink-0 object-contain" />
          <span>with the highest ATK idk lol</span>
        </div>
      </div>
    </div>
  );
};

export const GlobalBoardResultsPanel: React.FC<GlobalBoardResultsPanelProps> = ({
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
  renderExpanded,
  tableGrid = TABLE_GRID,
  showOwner = true,
  showTableGate = true,
}) => {
  const { characters, fetters, statIcons, weaponList } = useGameData();
  const [statColumns, setStatColumns] = useState<StatSortKey[]>([...DEFAULT_STAT_COLUMNS]);
  const [isTableGateDismissed, setIsTableGateDismissed] = useState(() => {
    if (!showTableGate) return false;
    try {
      const stored = localStorage.getItem('builds_gate_dismissed');
      const today = new Date().toISOString().slice(0, 10);
      return stored === today;
    } catch {
      return false;
    }
  });

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

  const hasBuildRows = builds.length > 0;
  const showInitialSkeleton = isLoading && !hasBuildRows;
  const showRefreshingOverlay = isRefreshing && hasBuildRows;
  const firstShown = total === 0 ? 0 : Math.min(total, rankStart);
  const lastShown = total === 0 ? 0 : Math.min(total, rankStart + Math.max(builds.length - 1, 0));
  const statusText = showInitialSkeleton
    ? 'Loading builds...'
    : isRefreshing ? 'Updating...' : `${firstShown}-${lastShown} of ${total.toLocaleString()}`;
  const showBuildTableGate = showTableGate && !error && !isTableGateDismissed;

  const handleSortRequest = (nextSort: LBSortKey) => {
    if (sort === nextSort) { onToggleDirection(); return; }
    onSortChange(nextSort);
  };

  const dismissTableGate = () => {
    setIsTableGateDismissed(true);
    try {
      localStorage.setItem('builds_gate_dismissed', new Date().toISOString().slice(0, 10));
    } catch {}
  };

  return (
    <section className="relative">
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-sm text-red-300">
          Failed to load leaderboard data: {error}
        </div>
      )}

      <div className="relative">
        <div className="scrollbar-thin overflow-x-auto overflow-y-hidden pb-1 [--scrollbar-height:2px] [--scrollbar-width:6px]">
          <div className="w-max min-w-full">
            <div className="overflow-visible rounded-lg border border-border bg-background/70">
              {/* Table header */}
              <div className={`grid ${tableGrid} items-center gap-4.5 border-b border-border bg-background-secondary/95 text-lg text-text-primary rounded-t-lg`}>
                <div className="py-2 text-center text-text-primary/70">#</div>
                {showOwner && <div className="py-2">Owner</div>}
                <div className="py-2">Name</div>
                <div className="py-2" aria-hidden="true" />
                <div className="py-2">
                  <button
                    type="button"
                    onClick={() => handleSortRequest('sequence')}
                    className={`flex items-center gap-1 text-left transition-colors hover:text-text-primary ${sort === 'sequence' ? 'text-text-primary' : 'text-text-primary/70'}`}
                  >
                    Sequences
                    {sort === 'sequence' && (
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${direction === 'asc' ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                </div>
                <div className="py-2">Sets</div>
                <div className={`grid ${SORTABLE_GROUP_GRID} min-w-[652px] self-stretch gap-0`}>
                  <div className="self-stretch">
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
                      showActive
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
                        showActive
                        triggerWrapperClassName="rounded-tr-lg"
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
                            showPlaceholderLine
                            showActive
                            triggerWrapperClassName={index === displayStatColumns.length - 1 ? 'rounded-tr-lg' : ''}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              {/* Rows with overlay */}
              <div className="relative overflow-hidden rounded-b-lg">
                <div className={showBuildTableGate ? 'select-none blur-[5px] saturate-[0.82]' : ''}>
                  {/* Skeleton rows */}
                  {showInitialSkeleton && (
                    <div className="divide-y divide-border/60">
                      {Array.from({ length: pageSize }).map((_, index) => (
                        <div
                          key={index}
                          className={`grid ${tableGrid} ${TABLE_ROW_HEIGHT_CLASS} cursor-pointer items-center gap-4.5 text-sm transition-colors odd:bg-background/30 even:bg-background-secondary/20`}
                        >
                          <div className="py-2 text-center">
                            <div className="mx-auto h-3 w-6 animate-pulse rounded bg-background-secondary/80" />
                          </div>
                          {showOwner && (
                            <div className="py-2">
                              <div className="h-3.5 w-28 animate-pulse rounded bg-background-secondary/80" />
                            </div>
                          )}
                          <div className="py-2">
                            <div className="h-3.5 w-30 animate-pulse rounded bg-background-secondary/80" />
                          </div>
                          <div className="flex items-end py-2">
                            <div className="h-9 w-9 animate-pulse rounded bg-background-secondary/80" />
                          </div>
                          <div className="flex items-center py-2">
                            <div className="h-5 w-9 animate-pulse rounded bg-background-secondary/80" />
                          </div>
                          <div className="flex items-center py-2">
                            <div className="h-5 w-16 animate-pulse rounded bg-background-secondary/80" />
                          </div>
                          <div className={`grid ${SORTABLE_GROUP_GRID} min-w-[652px] self-stretch gap-0`}>
                            <div className="flex h-full items-center px-2.5">
                              <div className="h-3.5 w-24 animate-pulse rounded bg-background-secondary/80" />
                            </div>
                            <div className="flex h-full items-center px-4">
                              <div className="h-3.5 w-16 animate-pulse rounded bg-background-secondary/80" />
                            </div>
                            <div className="flex h-full items-center px-4">
                              <div className="h-3.5 w-16 animate-pulse rounded bg-background-secondary/80" />
                            </div>
                            <div className="flex h-full items-center px-4">
                              <div className="h-3.5 w-16 animate-pulse rounded bg-background-secondary/80" />
                            </div>
                            <div className="flex h-full items-center px-4">
                              <div className="h-3.5 w-16 animate-pulse rounded bg-background-secondary/80" />
                            </div>
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
                        <GlobalBoardRow
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
                          renderExpanded={renderExpanded}
                          tableGrid={tableGrid}
                          showOwner={showOwner}
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

                {showBuildTableGate && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={dismissTableGate}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      dismissTableGate();
                    }}
                    className="group absolute inset-0 z-30 flex cursor-pointer items-center justify-center bg-background/15 px-4 text-left transition-colors duration-200 hover:bg-background/22 focus-visible:outline-none focus-visible:bg-background/22"
                  >
                    <div className="max-w-3xl space-y-4 rounded-xl border border-border/70 bg-background/72 p-5 text-center shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xs transition-[border-color,background-color,box-shadow,transform] duration-200 group-hover:border-accent/40 group-hover:bg-background/80 group-hover:shadow-[0_22px_56px_rgba(0,0,0,0.34)] group-hover:-translate-y-0.5 group-focus-visible:border-accent/40 group-focus-visible:bg-background/80 group-focus-visible:shadow-[0_22px_56px_rgba(0,0,0,0.34)] group-focus-visible:-translate-y-0.5">
                      <p className="text-sm tracking-wide text-text-primary md:text-lg">
                        Builds do not show leaderboards or rankings, those are{' '}
                        <Link
                          href="/leaderboards"
                          onClick={(event) => event.stopPropagation()}
                          className="pointer-events-auto text-accent underline decoration-accent/65 underline-offset-3 transition-colors hover:text-accent-hover"
                        >
                          here
                        </Link>
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/55 md:text-sm">
                          Example use cases
                        </p>
                        <BuildTableGateOverlay
                          characters={characters}
                          fetters={fetters}
                          weaponList={weaponList}
                        />
                      </div>
                      <p className="text-xs text-text-primary/55 md:text-sm">
                        Click anywhere around this message to reveal the builds table.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <BuildPagination page={page} pageCount={pageCount} statusText={statusText} onPageChange={onPageChange} />
      </div>
    </section>
  );
};

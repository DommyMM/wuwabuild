'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLBStatLabel, getLBStatSortKeyForLabel, isLBEchoSubstatSortKey, LBEcho, LB_ECHO_SUBSTAT_SORT_KEYS, LBEchoSortKey, LBSortDirection, LBSortKey, LBStatSortKey, listProfileEchoes } from '@/lib/lb';
import { getEchoPaths } from '@/lib/paths';
import { calculateEchoRV, getEchoCVTierStyle, getEchoRVTierStyle } from '@/lib/calculations/rollValues';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { isPercentStat } from '@/lib/constants/statMappings';
import { BuildPagination } from '@/components/leaderboards/BuildPagination';
import { SortHeaderMenu, SortMenuOption } from '@/components/leaderboards/SortHeaderMenu';
import { ACTIVE_SORT_COLUMN_CLASS, TABLE_ROW_HEIGHT_CLASS } from '@/components/leaderboards/constants';
import { EchoInventoryDetail } from './EchoInventoryDetail';

const PAGE_SIZE = 20;
const ECHO_COSTS = [4, 3, 1] as const;

// # | Name (echo art + set badge + name) | Main Stat | [CV + 5 flexed substats]
const ECHO_TABLE_GRID = 'grid-cols-[48px_384px_96px_minmax(0,1fr)]';
const ECHO_STAT_GROUP_GRID = 'grid-cols-[128px_repeat(5,minmax(0,1fr))]';
const ECHO_STAT_GROUP_MIN_W = 'min-w-[640px]';

const SUBSTAT_COLUMN_KEYS = LB_ECHO_SUBSTAT_SORT_KEYS;

function keyLabel(key: LBStatSortKey): string {
  return getLBStatLabel(key);
}

function keyIcon(icons: Record<string, string> | null, key: LBStatSortKey): string {
  return statIconFor(icons, getLBStatLabel(key));
}

function statSortKey(stat: string | null | undefined): LBEchoSortKey | null {
  return getLBStatSortKeyForLabel(stat);
}

function statIconFor(icons: Record<string, string> | null, stat: string): string {
  return icons?.[stat] ?? icons?.[stat.replace('%', '')] ?? '';
}

function formatStatValue(stat: string | null | undefined, value: number | null | undefined): string {
  if (stat == null || value == null) return '';
  return isPercentStat(stat) ? `${Number(value).toFixed(1)}%` : String(Math.round(Number(value)));
}

// Nightmare or Reminiscence stuff get shorter to fit
function echoNameSizeClass(name: string): string {
  if (name.length > 34) return 'text-sm';
  if (name.length > 27) return 'text-base';
  return 'text-lg';
}

interface ProfileEchoesProps {
  uid: string;
  /** Surface a build in the profile's builds table above (expand + scroll). */
  onOpenBuild: (buildId: string, characterId: string) => void;
}

export const ProfileEchoes: React.FC<ProfileEchoesProps> = ({ uid, onOpenBuild }) => {
  const { getEcho, getMainStatsByCost, getSubstatValues, fetters, statIcons } = useGameData();
  const { t } = useLanguage();

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<LBEchoSortKey>('cv');
  const [direction, setDirection] = useState<LBSortDirection>('desc');
  const [costs, setCosts] = useState<number[]>([]);
  const [setIds, setSetIds] = useState<string[]>([]);
  const [mainStatTypes, setMainStatTypes] = useState<string[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const [echoes, setEchoes] = useState<LBEcho[]>([]);
  const [total, setTotal] = useState(0);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loading is derived from whether the in-flight query matches the last settled one, so the effect never calls setState synchronously
  const queryKey = useMemo(
    () => JSON.stringify({ uid, page, sort, direction, costs, setIds, mainStatTypes }),
    [uid, page, sort, direction, costs, setIds, mainStatTypes],
  );

  // Set options (deduped by id) and a lookup for rendering an echo's own set.
  const setOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon: string }>();
    for (const fetter of fetters) {
      const id = String(fetter.id);
      if (!map.has(id)) {
        map.set(id, { id, name: t(fetter.name), icon: fetter.icon ?? '' });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fetters, t]);
  const setById = useMemo(() => new Map(setOptions.map((s) => [s.id, s])), [setOptions]);

  const mainStatOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const cost of [4, 3, 1]) {
      for (const key of Object.keys(getMainStatsByCost(cost))) seen.add(key);
    }
    return Array.from(seen);
  }, [getMainStatsByCost]);

  // SortHeaderMenu is typed for the builds board, echo sort keys are superset string union
  const substatOptions = useMemo<SortMenuOption[]>(
    () => SUBSTAT_COLUMN_KEYS.map((key) => ({ key: key as unknown as LBSortKey, label: keyLabel(key), icon: keyIcon(statIcons, key) })),
    [statIcons],
  );

  const isCvActive = sort === 'cv';
  const isRvActive = sort === 'rv';
  const isCvGroupActive = isCvActive || isRvActive;
  // Sorting by RV promotes it to the emphasized (large, tier-colored) metric in
  // both the header and each row; otherwise CV leads and RV is the muted line.
  const rvFocus = isRvActive;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    listProfileEchoes(uid, { page, pageSize: PAGE_SIZE, sort, direction, costs, setIds, mainStatTypes }, controller.signal)
      .then((response) => {
        if (!active) return;
        setEchoes(response.echoes);
        setTotal(response.total);
        setError(null);
        const pageCount = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
        if (page > pageCount) setPage(pageCount);
      })
      .catch((err) => {
        if (!active || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load echoes.');
      })
      .finally(() => {
        if (active) setSettledKey(queryKey);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [uid, page, sort, direction, costs, setIds, mainStatTypes, queryKey]);

  const loading = settledKey !== queryKey;
  const isInitialLoading = loading && echoes.length === 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rankStart = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const statusText = isInitialLoading
    ? 'Loading echoes...'
    : total > 0
      ? `${rankStart}-${rankStart + echoes.length - 1} of ${total.toLocaleString()}`
      : '0 echoes';
  const hasFilters = costs.length > 0 || setIds.length > 0 || mainStatTypes.length > 0;
  const isSubstatSortActive = isLBEchoSubstatSortKey(sort);

  const handleSort = (key: LBEchoSortKey) => {
    setPage(1);
    if (sort === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSort(key);
  };

  // Pick a substat to sort by from a hover menu. While active, the selected
  // stat pins to the first substat cell and the rest stay in positional order.
  const selectSubstatSort = (key: LBEchoSortKey) => {
    handleSort(key);
  };
  const sortByCV = () => handleSort('cv');
  const sortByRV = () => handleSort('rv');

  const addCost = (cost: number) => { setPage(1); setCosts((prev) => (prev.includes(cost) ? prev : [...prev, cost])); };
  const removeCost = (cost: number) => { setPage(1); setCosts((prev) => prev.filter((c) => c !== cost)); };
  const addSet = (id: string) => { setPage(1); setSetIds((prev) => (prev.includes(id) ? prev : [...prev, id])); };
  const removeSet = (id: string) => { setPage(1); setSetIds((prev) => prev.filter((x) => x !== id)); };
  const addMain = (type: string) => { setPage(1); setMainStatTypes((prev) => (prev.includes(type) ? prev : [...prev, type])); };
  const removeMain = (type: string) => { setPage(1); setMainStatTypes((prev) => prev.filter((x) => x !== type)); };
  const backspaceRemove = () => {
    if (mainStatTypes.length > 0) { removeMain(mainStatTypes[mainStatTypes.length - 1]); return; }
    if (setIds.length > 0) { removeSet(setIds[setIds.length - 1]); return; }
    if (costs.length > 0) { removeCost(costs[costs.length - 1]); }
  };
  const clearFilters = () => { setPage(1); setCosts([]); setSetIds([]); setMainStatTypes([]); };

  return (
    <section className="relative mt-8 overflow-visible rounded-xl border border-border bg-background-secondary">
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(166,150,98,0.10),transparent_55%)]" />
      <div className="relative rounded-[inherit] px-4 py-4">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold uppercase tracking-wide text-accent">Echoes</span>
            {!isInitialLoading && (
              <span className="text-xs tabular-nums text-text-primary/45">{total.toLocaleString()}</span>
            )}
          </div>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clear All
          </button>
        </div>

        {/* Filter combobox */}
        <EchoFilterBar
          costs={costs}
          setIds={setIds}
          mainStatTypes={mainStatTypes}
          setOptions={setOptions}
          setById={setById}
          mainStatOptions={mainStatOptions}
          statIcons={statIcons}
          onAddCost={addCost}
          onRemoveCost={removeCost}
          onAddSet={addSet}
          onRemoveSet={removeSet}
          onAddMain={addMain}
          onRemoveMain={removeMain}
          onBackspaceRemove={backspaceRemove}
        />

        {/* Table */}
        <div className="scrollbar-thin mt-3 overflow-x-auto overflow-y-hidden pb-1 [--scrollbar-height:2px] [--scrollbar-width:6px]">
          <div className="w-max min-w-full">
            <div className="overflow-visible rounded-lg border border-border bg-background/70">
              {/* Header */}
              <div className={`grid ${ECHO_TABLE_GRID} items-center gap-4.5 rounded-t-lg border-b border-border bg-background-secondary/95 text-lg text-text-primary`}>
                <div className="py-2 text-center text-text-primary/70">#</div>
                <div className="py-2 pl-3">Name</div>
                <div className="py-2">Main Stat</div>
                <div className={`grid ${ECHO_STAT_GROUP_GRID} ${ECHO_STAT_GROUP_MIN_W} self-stretch gap-0`}>
                  <div className={`flex self-stretch border-t-2 transition-colors ${isCvGroupActive ? 'border-accent/85 bg-black/35' : 'border-transparent'}`}>
                    <div className="flex h-full w-full flex-col items-stretch justify-center gap-0.5 px-4 py-1.5">
                      <button
                        type="button"
                        onClick={sortByCV}
                        title="Sort by Crit Value"
                        className={`group flex items-center justify-between gap-2 leading-tight transition-[color,font-size] duration-200 ${
                          rvFocus ? 'text-xs' : 'text-lg'
                        } ${
                          isCvActive
                            ? 'text-accent'
                            : rvFocus
                              ? 'text-text-primary/45 hover:text-text-primary/75'
                              : 'text-text-primary/85 hover:text-text-primary'
                        }`}
                      >
                        <span>Crit Value</span>
                        <ChevronDown
                          className={`${rvFocus ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0 transition-all duration-200 ${
                            isCvActive
                              ? `opacity-100 ${direction === 'asc' ? 'rotate-180' : ''}`
                              : 'opacity-0 group-hover:opacity-45'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={sortByRV}
                        title="Sort by Roll Value"
                        className={`group flex items-center justify-between gap-2 leading-tight transition-[color,font-size] duration-200 ${
                          rvFocus ? 'text-lg' : 'text-xs'
                        } ${
                          isRvActive ? 'text-accent' : 'text-text-primary/45 hover:text-text-primary/75'
                        }`}
                      >
                        <span>Roll Value</span>
                        <ChevronDown
                          className={`${rvFocus ? 'h-3.5 w-3.5' : 'h-3 w-3'} shrink-0 transition-all duration-200 ${
                            isRvActive
                              ? `opacity-100 ${direction === 'asc' ? 'rotate-180' : ''}`
                              : 'opacity-0 group-hover:opacity-45'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  {/* Substat sort headers: placeholder lines until a stat is picked,
                      then the selected stat pins across the substat header area. */}
                  {isSubstatSortActive ? (
                    <div className="col-span-5 self-stretch flex items-stretch">
                      <SortHeaderMenu
                        menuId="echo-sort-sub-pinned"
                        label={keyLabel(sort as LBStatSortKey)}
                        active
                        direction={direction}
                        options={substatOptions}
                        selectedKey={sort as unknown as LBSortKey}
                        onHeaderSort={() => handleSort(sort)}
                        onSelectOption={(key) => selectSubstatSort(key as unknown as LBEchoSortKey)}
                        icon={keyIcon(statIcons, sort as LBStatSortKey)}
                        showActive
                        naturalMenuWidth
                        textSizeClass="text-lg"
                        iconSizeClass="h-5 w-5"
                        triggerWrapperClassName="rounded-tr-lg"
                      />
                    </div>
                  ) : (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={`echo-head-sub-${i}`} className="self-stretch">
                        <SortHeaderMenu
                          menuId={`echo-sort-sub-${i}`}
                          label=""
                          active={false}
                          direction={direction}
                          options={substatOptions}
                          selectedKey={sort as unknown as LBSortKey}
                          alignMenuRight={i === 4}
                          onHeaderSort={() => undefined}
                          onSelectOption={(key) => selectSubstatSort(key as unknown as LBEchoSortKey)}
                          icon=""
                          showPlaceholderLine
                          showActive
                          naturalMenuWidth
                          triggerWrapperClassName={i === 4 ? 'rounded-tr-lg' : ''}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="relative overflow-hidden rounded-b-lg">
                {isInitialLoading ? (
                  <div className="divide-y divide-border/60">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className={`grid ${ECHO_TABLE_GRID} ${TABLE_ROW_HEIGHT_CLASS} items-center gap-4.5 odd:bg-background/30 even:bg-background-secondary/20`}>
                        <div className="mx-auto h-3 w-5 animate-pulse rounded bg-background-secondary/80" />
                        <div className="flex items-center gap-2 py-2 pl-3">
                          <div className="h-9 w-9 animate-pulse rounded bg-background-secondary/80" />
                          <div className="h-3.5 w-28 animate-pulse rounded bg-background-secondary/80" />
                        </div>
                        <div className="h-3.5 w-14 animate-pulse rounded bg-background-secondary/80" />
                        <div className={`grid ${ECHO_STAT_GROUP_GRID} ${ECHO_STAT_GROUP_MIN_W} self-stretch gap-0`}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <div key={j} className="flex h-full items-center px-3">
                              <div className="h-3.5 w-14 animate-pulse rounded bg-background-secondary/80" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="px-3 py-10 text-center text-sm text-red-300">{error}</div>
                ) : echoes.length === 0 ? (
                  <div className="px-3 py-10 text-center text-sm text-text-primary/55">
                    {hasFilters ? 'No echoes match the current filters.' : 'No echoes recorded for this account yet.'}
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {echoes.map((echo, index) => {
                      const echoMeta = getEcho(echo.echoId);
                      const echoName = echoMeta ? t(echoMeta.nameI18n ?? { en: echoMeta.name }) : echo.echoId;
                      const cvStyle = echo.cv > 0 ? getEchoCVTierStyle(echo.cv) : null;
                      const set = setById.get(echo.activeSetId);
                      const mainIcon = echo.mainStatType ? statIconFor(statIcons, echo.mainStatType) : '';
                      const subs = (echo.panel?.stats.subStats ?? []).filter((s) => s.type && s.value != null);
                      const rv = echo.rv > 0 ? echo.rv : calculateEchoRV(subs, getSubstatValues);
                      const rvStyle = rv > 0 ? getEchoRVTierStyle(rv) : null;
                      const displaySubs = isSubstatSortActive
                        ? [
                            {
                              key: `pinned-${sort}`,
                              type: getLBStatLabel(sort as LBStatSortKey),
                              value: echo.substats[sort] ?? null,
                            },
                            ...subs
                              .filter((sub) => statSortKey(sub.type) !== sort)
                              .map((sub, slot) => ({
                                key: `slot-${slot}-${sub.type}`,
                                type: sub.type,
                                value: sub.value,
                              }))
                              .slice(0, 4),
                          ]
                        : subs.slice(0, 5).map((sub, slot) => ({
                            key: `slot-${slot}-${sub.type}`,
                            type: sub.type,
                            value: sub.value,
                          }));

                      const isExpanded = expandedKey === echo.echoKey;
                      const toggleExpand = () => setExpandedKey((k) => (k === echo.echoKey ? null : echo.echoKey));
                      return (
                        <div key={echo.echoKey}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={toggleExpand}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(); } }}
                          className={`grid ${ECHO_TABLE_GRID} ${TABLE_ROW_HEIGHT_CLASS} cursor-pointer items-center gap-4.5 transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/10 ${isExpanded ? 'bg-accent/12' : ''}`}
                        >
                          <div className="py-2 text-center text-text-primary/75">{rankStart + index}</div>

                          {/* Name: echo art with set badge + name */}
                          <div className="flex min-w-0 items-center gap-2 py-1.5 pl-3">
                            <div className="relative h-9 w-9 shrink-0">
                              <div className="h-9 w-9 overflow-hidden rounded bg-background/60">
                                {echoMeta && (
                                  <img
                                    src={getEchoPaths(echoMeta, echo.panel?.phantom ?? false)}
                                    alt={echoName}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </div>
                              {set?.icon && (
                                <img
                                  src={set.icon}
                                  alt={set.name}
                                  title={set.name}
                                  className="absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full bg-black/75 object-contain p-px ring-1 ring-black/55"
                                />
                              )}
                            </div>
                            <span className={`truncate leading-none text-text-primary ${echoNameSizeClass(echoName)}`} title={echoName}>{echoName}</span>
                          </div>

                          {/* Main stat: bigger, with element-tinted icon like the build rows */}
                          <div className="flex min-w-0 items-center gap-1.5 py-2">
                            {mainIcon ? (
                              <img
                                src={mainIcon}
                                alt=""
                                className="h-5 w-5 shrink-0 object-contain"
                                style={ELEMENT_ICON_FILTERS[echo.mainStatType] ? { filter: ELEMENT_ICON_FILTERS[echo.mainStatType] } : undefined}
                              />
                            ) : (
                              <span className="h-5 w-5 shrink-0 rounded bg-white/10" />
                            )}
                            <span className="truncate text-lg text-text-primary/90">
                              {formatStatValue(echo.mainStatType, echo.mainStatValue)}
                            </span>
                          </div>

                          {/* CV + 5 positional substat columns */}
                          <div className={`grid ${ECHO_STAT_GROUP_GRID} ${ECHO_STAT_GROUP_MIN_W} self-stretch gap-0`}>
                            <div className={`self-stretch ${isCvGroupActive ? ACTIVE_SORT_COLUMN_CLASS : ''}`}>
                              <div className="flex h-full flex-col items-start justify-center px-4">
                                <span
                                  className={`leading-tight tabular-nums transition-[color,font-size] duration-200 ${
                                    rvFocus
                                      ? 'text-xs text-text-primary/45'
                                      : `text-lg ${cvStyle?.isMax ? 'cv-glow' : ''}`
                                  }`}
                                  style={!rvFocus && cvStyle && !cvStyle.isMax ? { color: cvStyle.color } : undefined}
                                  title="Crit Value: 2×Crit Rate + Crit DMG from this echo's substats"
                                >
                                  {echo.cv.toFixed(1)} CV
                                </span>
                                <span
                                  className={`leading-tight tabular-nums transition-[color,font-size] duration-200 ${
                                    rvFocus
                                      ? `text-lg ${rvStyle?.isMax ? 'cv-glow' : ''}`
                                      : 'text-xs text-text-primary/45'
                                  }`}
                                  style={rvFocus && rvStyle && !rvStyle.isMax ? { color: rvStyle.color } : undefined}
                                  title="Roll Value: full-sheet average of each substat vs its max roll; missing lines count as zero"
                                >
                                  {rv.toFixed(0)}% RV
                                </span>
                              </div>
                            </div>

                            {Array.from({ length: 5 }).map((_, slot) => {
                              const sub = displaySubs[slot];
                              if (!sub?.type || sub.value == null) {
                                return (
                                  <div
                                    key={`${echo.echoKey}-sub-${slot}`}
                                    className={`self-stretch ${isSubstatSortActive ? ACTIVE_SORT_COLUMN_CLASS : ''}`}
                                  >
                                    <div className={`flex h-full items-center px-4 py-2 text-lg ${isSubstatSortActive && slot > 0 ? 'opacity-50' : ''}`}>
                                      <span className="text-text-primary/20">—</span>
                                    </div>
                                  </div>
                                );
                              }
                              const type = sub.type;
                              const icon = statIconFor(statIcons, type);
                              return (
                                <div
                                  key={`${echo.echoKey}-${sub.key}-${slot}`}
                                  className={`self-stretch ${isSubstatSortActive ? ACTIVE_SORT_COLUMN_CLASS : ''}`}
                                >
                                  <div className={`flex h-full items-center gap-2 px-4 py-2 text-lg ${isSubstatSortActive && slot > 0 ? 'opacity-50' : ''}`}>
                                    {icon ? (
                                      <img src={icon} alt="" className="h-5 w-5 shrink-0 object-contain" />
                                    ) : (
                                      <span className="h-5 w-5 shrink-0 rounded bg-white/10" />
                                    )}
                                    <span className="tabular-nums text-text-primary/90">
                                      {formatStatValue(type, sub.value)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <EchoInventoryDetail echo={echo} uid={uid} isExpanded={isExpanded} onOpenBuild={onOpenBuild} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isInitialLoading && !error && total > PAGE_SIZE && (
          <BuildPagination page={page} pageCount={pageCount} statusText={statusText} onPageChange={setPage} />
        )}
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Search-driven filter combobox (mirrors the builds BuildFiltersPanel UX):
// type to search, pick from sectioned headings (Cost / Echo Sets / Main Stats),
// selected items become removable chips.

type EchoFilterItem =
  | { key: string; type: 'cost'; section: 'Cost'; value: number; label: string }
  | { key: string; type: 'set'; section: 'Echo Sets'; value: string; label: string; icon: string }
  | { key: string; type: 'main'; section: 'Main Stats'; value: string; label: string; icon: string };

interface EchoFilterBarProps {
  costs: number[];
  setIds: string[];
  mainStatTypes: string[];
  setOptions: Array<{ id: string; name: string; icon: string }>;
  setById: Map<string, { id: string; name: string; icon: string }>;
  mainStatOptions: string[];
  statIcons: Record<string, string> | null;
  onAddCost: (cost: number) => void;
  onRemoveCost: (cost: number) => void;
  onAddSet: (id: string) => void;
  onRemoveSet: (id: string) => void;
  onAddMain: (type: string) => void;
  onRemoveMain: (type: string) => void;
  onBackspaceRemove: () => void;
}

const EchoFilterBar: React.FC<EchoFilterBarProps> = ({
  costs,
  setIds,
  mainStatTypes,
  setOptions,
  setById,
  mainStatOptions,
  statIcons,
  onAddCost,
  onRemoveCost,
  onAddSet,
  onRemoveSet,
  onAddMain,
  onRemoveMain,
  onBackspaceRemove,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalized = query.trim().toLowerCase();

  const visibleItems = useMemo<EchoFilterItem[]>(() => {
    const items: EchoFilterItem[] = [];
    for (const cost of ECHO_COSTS) {
      if (costs.includes(cost)) continue;
      const label = `Cost ${cost}`;
      if (normalized && !label.toLowerCase().includes(normalized) && String(cost) !== normalized) continue;
      items.push({ key: `cost-${cost}`, type: 'cost', section: 'Cost', value: cost, label });
    }
    for (const option of setOptions) {
      if (setIds.includes(option.id)) continue;
      if (normalized && !option.name.toLowerCase().includes(normalized)) continue;
      items.push({ key: `set-${option.id}`, type: 'set', section: 'Echo Sets', value: option.id, label: option.name, icon: option.icon });
    }
    for (const main of mainStatOptions) {
      if (mainStatTypes.includes(main)) continue;
      if (normalized && !main.toLowerCase().includes(normalized)) continue;
      items.push({ key: `main-${main}`, type: 'main', section: 'Main Stats', value: main, label: main, icon: statIconFor(statIcons, main) });
    }
    return items;
  }, [normalized, costs, setIds, mainStatTypes, setOptions, mainStatOptions, statIcons]);

  const activeIdx = (!open || visibleItems.length === 0)
    ? -1
    : (activeIndex < 0 || activeIndex >= visibleItems.length ? 0 : activeIndex);

  const selectItem = (item: EchoFilterItem) => {
    if (item.type === 'cost') onAddCost(item.value);
    else if (item.type === 'set') onAddSet(item.value);
    else onAddMain(item.value);
    setQuery('');
  };

  return (
    <div className="relative z-20">
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-2 py-2">
        {costs.map((cost) => (
          <FilterChip key={`c-${cost}`} label={`Cost ${cost}`} onRemove={() => onRemoveCost(cost)} />
        ))}
        {setIds.map((id) => {
          const set = setById.get(id);
          return <FilterChip key={`s-${id}`} label={set?.name ?? `Set ${id}`} icon={set?.icon} onRemove={() => onRemoveSet(id)} />;
        })}
        {mainStatTypes.map((main) => (
          <FilterChip key={`m-${main}`} label={main} icon={statIconFor(statIcons, main)} onRemove={() => onRemoveMain(main)} />
        ))}

        <div className="relative min-w-55 flex-1">
          <Search className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-text-primary/45" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
            onFocus={() => { setOpen(true); setActiveIndex((prev) => (prev >= 0 ? prev : 0)); }}
            onClick={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !query) { onBackspaceRemove(); return; }
              if (event.key === 'ArrowDown' && visibleItems.length > 0) {
                event.preventDefault(); setOpen(true);
                setActiveIndex((activeIdx + 1 + visibleItems.length) % visibleItems.length);
              }
              if (event.key === 'ArrowUp' && visibleItems.length > 0) {
                event.preventDefault(); setOpen(true);
                setActiveIndex((activeIdx - 1 + visibleItems.length) % visibleItems.length);
              }
              if (event.key === 'Enter' && visibleItems.length > 0) {
                event.preventDefault();
                selectItem(visibleItems[activeIdx >= 0 ? activeIdx : 0]);
                setActiveIndex(0);
              }
              if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
            }}
            placeholder="Search filters (cost, set, main stat)"
            className="w-full bg-transparent py-1 pl-7 pr-2 text-sm text-text-primary placeholder:text-text-primary/45 focus:outline-none"
          />
        </div>
      </div>

      {open && visibleItems.length > 0 && (
        <div className="scrollbar-thin absolute left-0 right-0 z-30 mt-1 max-h-132 overflow-y-auto rounded-lg border border-border bg-background shadow-xl">
          {visibleItems.map((item, index) => {
            const previous = index > 0 ? visibleItems[index - 1] : null;
            const showSection = index === 0 || previous?.section !== item.section;
            const isActiveRow = index === activeIdx;
            return (
              <React.Fragment key={item.key}>
                {showSection && (
                  <div className="border-b border-border/60 bg-background-secondary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
                    {item.section}
                  </div>
                )}
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectItem(item)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left text-sm transition-colors last:border-b-0 ${
                    isActiveRow ? 'bg-cyan-500/18 text-cyan-100' : 'text-text-primary hover:bg-amber-400/16 hover:text-amber-100'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {item.type === 'cost' ? (
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-border text-[11px] font-semibold tabular-nums">{item.value}</span>
                    ) : item.icon ? (
                      <img src={item.icon} alt="" className="h-5 w-5 shrink-0 object-contain" />
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded bg-border" />
                    )}
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${isActiveRow ? 'bg-cyan-500/20 text-cyan-100' : 'bg-border text-text-primary/70'}`}>
                    {item.type === 'main' ? 'stat' : item.type}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FilterChip: React.FC<{ label: string; icon?: string; onRemove: () => void }> = ({ label, icon, onRemove }) => (
  <span className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">
    {icon ? <img src={icon} alt="" className="h-3.5 w-3.5 object-contain" /> : null}
    {label}
    <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="text-accent/70 hover:text-accent">
      <X className="h-3.5 w-3.5" />
    </button>
  </span>
);

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBuildById, LBBuildDetailEntry, LBBuildRowEntry, LBEchoMainFilter, LBEchoSetFilter, LBSortDirection, LBSortKey, listBuilds } from '@/lib/lb';
import { toMainStatLabel } from '@/lib/mainStatFilters';
import { clampItemsPerPage, DEFAULT_PAGE, MAX_ITEMS_PER_PAGE } from '@/components/leaderboards/constants';
import { getSortLabel, resolveRegionBadge } from '@/components/leaderboards/formatters';
import { parseInitialQuery, serializeQuery } from '@/components/leaderboards/board/globalBoardQuery';
import { readCachedBuildList, writeCachedBuildList } from '@/components/leaderboards/board/globalBoardCache';
import { BuildFiltersPanel } from '@/components/leaderboards/BuildFiltersPanel';
import { GlobalBoardResultsPanel } from '@/components/leaderboards/board/GlobalBoardResultsPanel';
import { GlobalBoardRowExpandedProps } from '@/components/leaderboards/board/GlobalBoardRow';
import { QuerySnapshot, SelectedMainEntry, SelectedSetEntry, SetOption } from '@/components/leaderboards/types';
import { ProfileBuildExpanded } from './ProfileBuildExpanded';

// Profile table: no Owner column. Name gets the freed space (wider).
// # | Name | Weapon | Seq | Sets | [CV + 4 stats]
const PROFILE_TABLE_GRID = 'grid-cols-[48px_220px_76px_76px_88px_minmax(0,1fr)]';

function buildListSignature(builds: LBBuildRowEntry[], total: number): string {
  return `${total}:${builds.map((b) => `${b.id}:${b.cv}:${b.timestamp}:${b.weapon.id}`).join(',')}`;
}

interface ProfilePageClientProps {
  uid: string;
}

export const ProfilePageClient: React.FC<ProfilePageClientProps> = ({ uid }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { characters, weaponList, fetters } = useGameData();
  const { t } = useLanguage();

  const buildListSigRef = useRef(buildListSignature([], 0));

  const initialQuery = useMemo(
    () => parseInitialQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [page, setPage] = useState<number>(() => initialQuery.page);
  const [pageSize, setPageSize] = useState<number>(() => clampItemsPerPage(initialQuery.pageSize));
  const [sort, setSort] = useState<LBSortKey>(() => initialQuery.sort);
  const [direction, setDirection] = useState<LBSortDirection>(() => initialQuery.direction);
  const [characterIds, setCharacterIds] = useState<string[]>(() => initialQuery.characterIds);
  const [weaponIds, setWeaponIds] = useState<string[]>(() => initialQuery.weaponIds);
  const [regionPrefixes, setRegionPrefixes] = useState<string[]>(() => initialQuery.regionPrefixes);
  const [echoSets, setEchoSets] = useState<LBEchoSetFilter[]>(() => initialQuery.echoSets);
  const [echoMains, setEchoMains] = useState<LBEchoMainFilter[]>(() => initialQuery.echoMains);
  const [filterQuery, setFilterQuery] = useState('');

  const [builds, setBuilds] = useState<LBBuildRowEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<{ queryKey: string; message: string } | null>(null);
  const [expandedBuildIds, setExpandedBuildIds] = useState<Set<string>>(new Set());
  const [detailById, setDetailById] = useState<Record<string, LBBuildDetailEntry>>({});
  const [detailLoadingById, setDetailLoadingById] = useState<Record<string, boolean>>({});
  const [detailErrorById, setDetailErrorById] = useState<Record<string, string | null>>({});
  const detailControllersRef = useRef<Record<string, AbortController>>({});

  const selectedCharacters = useMemo(() => (
    characterIds.reduce<typeof characters>((acc, id) => {
      const char = characters.find((c) => c.id === id);
      if (char) acc.push(char);
      return acc;
    }, [])
  ), [characterIds, characters]);

  const selectedWeapons = useMemo(() => (
    weaponIds.reduce<typeof weaponList>((acc, id) => {
      const w = weaponList.find((entry) => entry.id === id);
      if (w) acc.push(w);
      return acc;
    }, [])
  ), [weaponIds, weaponList]);

  const setOptions = useMemo<SetOption[]>(() => (
    fetters
      .map((entry) => ({
        id: entry.id,
        name: t(entry.name),
        pieceCount: entry.pieceCount,
        icon: entry.icon ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  ), [fetters, t]);

  const selectedSetEntries = useMemo<SelectedSetEntry[]>(() => (
    echoSets.map((entry) => {
      const setOption = setOptions.find((s) => s.id === entry.setId);
      return { ...entry, name: setOption?.name ?? `Set ${entry.setId}`, icon: setOption?.icon ?? '' };
    })
  ), [echoSets, setOptions]);

  const selectedMainEntries = useMemo<SelectedMainEntry[]>(() => (
    echoMains.map((entry) => ({ ...entry, label: toMainStatLabel(entry.statType) }))
  ), [echoMains]);

  const hasActiveFilters = (
    characterIds.length > 0 ||
    weaponIds.length > 0 ||
    regionPrefixes.length > 0 ||
    echoSets.length > 0 ||
    echoMains.length > 0
  );

  const querySnapshot = useMemo<QuerySnapshot>(() => ({
    page,
    pageSize,
    sort,
    direction,
    characterIds,
    weaponIds,
    regionPrefixes,
    username: '',
    uid,
    echoSets,
    echoMains,
  }), [characterIds, direction, echoMains, echoSets, page, pageSize, regionPrefixes, sort, uid, weaponIds]);

  const currentQueryKey = useMemo(() => serializeQuery(querySnapshot), [querySnapshot]);
  const isPendingQuery = settledQueryKey !== currentQueryKey;
  const isLoading = isPendingQuery && builds.length === 0;
  const isRefreshing = isPendingQuery && builds.length > 0;
  const error = fetchError?.queryKey === currentQueryKey ? fetchError.message : null;

  const abortAllDetailRequests = useCallback(() => {
    Object.values(detailControllersRef.current).forEach((ctrl) => ctrl.abort());
    detailControllersRef.current = {};
  }, []);

  // Sync URL without uid param in query (uid lives in path)
  useEffect(() => {
    const withoutUid = serializeQuery({ ...querySnapshot, uid: '' });
    const current = searchParams.toString();
    if (current !== withoutUid) {
      router.replace(withoutUid ? `/profile/${uid}?${withoutUid}` : `/profile/${uid}`, { scroll: false });
    }
  }, [querySnapshot, router, searchParams, uid]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const cacheKey = currentQueryKey;
    const cachedResponse = readCachedBuildList(cacheKey);

    queueMicrotask(() => {
      if (!active) return;
      abortAllDetailRequests();
      setDetailLoadingById({});
      setDetailErrorById({});
      if (cachedResponse) {
        buildListSigRef.current = buildListSignature(cachedResponse.builds, cachedResponse.total);
        setBuilds(cachedResponse.builds);
        setTotal(cachedResponse.total);
      }
    });

    listBuilds({
      page: querySnapshot.page,
      pageSize: querySnapshot.pageSize,
      sort: querySnapshot.sort,
      direction: querySnapshot.direction,
      characterIds: querySnapshot.characterIds,
      weaponIds: querySnapshot.weaponIds,
      regionPrefixes: querySnapshot.regionPrefixes,
      uid,
      echoSets: querySnapshot.echoSets,
      echoMains: querySnapshot.echoMains,
    }, controller.signal)
      .then((response) => {
        if (!active) return;
        const nextPageCount = Math.max(1, Math.ceil(response.total / querySnapshot.pageSize));
        if (querySnapshot.page > nextPageCount) setPage(nextPageCount);
        const nextSig = buildListSignature(response.builds, response.total);
        if (nextSig !== buildListSigRef.current) {
          buildListSigRef.current = nextSig;
          setBuilds(response.builds);
          setTotal(response.total);
        }
        writeCachedBuildList(cacheKey, response);
      })
      .catch((err) => {
        if (!active || controller.signal.aborted) return;
        setFetchError({
          queryKey: currentQueryKey,
          message: err instanceof Error ? err.message : 'Failed to load builds.',
        });
      })
      .finally(() => {
        if (!active) return;
        setSettledQueryKey(currentQueryKey);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [abortAllDetailRequests, currentQueryKey, querySnapshot, uid]);

  const loadBuildDetail = useCallback((buildId: string, force = false) => {
    const id = buildId.trim();
    if (!id) return;
    if (!force && (detailById[id] || detailLoadingById[id])) return;

    detailControllersRef.current[id]?.abort();
    const controller = new AbortController();
    detailControllersRef.current[id] = controller;

    setDetailLoadingById((prev) => ({ ...prev, [id]: true }));
    setDetailErrorById((prev) => ({ ...prev, [id]: null }));

    void getBuildById(id, controller.signal)
      .then((detail) => { setDetailById((prev) => ({ ...prev, [id]: detail })); })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setDetailErrorById((prev) => ({
          ...prev,
          [id]: err instanceof Error ? err.message : 'Failed to load build details.',
        }));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setDetailLoadingById((prev) => ({ ...prev, [id]: false }));
        delete detailControllersRef.current[id];
      });
  }, [detailById, detailLoadingById]);

  const handleToggleExpand = useCallback((buildId: string) => {
    const id = buildId.trim();
    if (!id) return;
    setExpandedBuildIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (!detailById[id] && !detailLoadingById[id]) loadBuildDetail(id);
  }, [detailById, detailLoadingById, loadBuildDetail]);

  const handleRetryDetail = useCallback((buildId: string) => {
    loadBuildDetail(buildId, true);
  }, [loadBuildDetail]);

  useEffect(() => (() => { abortAllDetailRequests(); }), [abortAllDetailRequests]);

  const normalizedPageCount = Math.max(1, Math.ceil(total / pageSize));
  const rankStart = (() => {
    if (total <= 0) return 1;
    if (page === normalizedPageCount) return Math.max(1, total - builds.length + 1);
    return (page - 1) * pageSize + 1;
  })();

  // Profile header info derived from first loaded build
  const profileUsername = builds[0]?.owner.username || uid;
  const regionBadge = builds[0] ? resolveRegionBadge(builds[0].owner.uid) : null;

  // Custom renderExpanded for profile — renders LeaderboardCard inside
  const renderExpanded = useCallback((props: GlobalBoardRowExpandedProps) => (
    <ProfileBuildExpanded
      key={props.entry.id}
      entry={props.entry}
      detail={props.detail}
      isExpanded={props.isExpanded}
      isDetailLoading={props.isDetailLoading}
      detailError={props.detailError}
      character={props.character}
      characterName={props.characterName}
      regionBadge={props.regionBadge}
      statIcons={props.statIcons}
      getEcho={props.getEcho}
      translateText={props.translateText}
      onRetryDetail={props.onRetryDetail}
    />
  ), []);

  return (
    <main className="scrollbar-thin bg-background [--scrollbar-height:2px] [--scrollbar-width:6px]">
      <div className="mx-auto w-full max-w-360 space-y-4 p-3 px-0 md:p-5">

        {/* ── Profile Header ── */}
        <section className="relative overflow-hidden rounded-xl border border-border bg-background-secondary px-6 py-5">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(166,150,98,0.10),transparent_55%)]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-2xl font-bold text-text-primary/50 select-none">
              {profileUsername.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {regionBadge && (
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${regionBadge.className}`}>
                    {regionBadge.label}
                  </span>
                )}
                <h1 className="text-2xl font-bold tracking-wide text-text-primary">{profileUsername}</h1>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-sm text-text-primary/55">
                <span>UID {uid}</span>
                {total > 0 && (
                  <span className="rounded-md border border-border bg-background/60 px-2 py-0.5 text-xs">
                    {total.toLocaleString()} build{total !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Builds Table ── */}
        <section className="relative overflow-visible rounded-xl border border-border bg-background-secondary px-4 py-2">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.08),transparent_58%)]" />
          <div className="relative">
            <div className="mt-2 space-y-3 pt-2">
              <div className="relative z-40">
                <BuildFiltersPanel
                  sort={sort}
                  direction={direction}
                  pageSize={pageSize}
                  maxPageSize={MAX_ITEMS_PER_PAGE}
                  activeSortLabel={getSortLabel(sort)}
                  showSortControls={false}
                  hasActiveFilters={hasActiveFilters}
                  filterQuery={filterQuery}
                  characters={characters}
                  weaponList={weaponList}
                  selectedCharacters={selectedCharacters}
                  selectedWeapons={selectedWeapons}
                  regionPrefixes={regionPrefixes}
                  selectedSetEntries={selectedSetEntries}
                  selectedMainEntries={selectedMainEntries}
                  // UID and username locked — not shown
                  username=""
                  uid=""
                  setOptions={setOptions}
                  onFilterQueryChange={setFilterQuery}
                  onSortChange={(nextSort) => { setSort(nextSort); setPage(1); }}
                  onToggleDirection={() => { setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')); setPage(1); }}
                  onAddCharacter={(id) => { setCharacterIds((prev) => prev.includes(id) ? prev : [...prev, id]); setPage(1); }}
                  onAddWeapon={(id) => { setWeaponIds((prev) => prev.includes(id) ? prev : [...prev, id]); setPage(1); }}
                  onAddRegion={(r) => { setRegionPrefixes((prev) => prev.includes(r) ? prev : [...prev, r]); setPage(1); }}
                  onAddSet={(setId, count) => {
                    setEchoSets((prev) => prev.some((e) => e.setId === setId && e.count === count) ? prev : [...prev, { setId, count }]);
                    setPage(1);
                  }}
                  onAddMain={(cost, statType) => {
                    setEchoMains((prev) => prev.some((e) => e.cost === cost && e.statType === statType) ? prev : [...prev, { cost, statType }]);
                    setPage(1);
                  }}
                  onSetUsername={() => {}}
                  onSetUid={() => {}}
                  onRemoveCharacter={(id) => { setCharacterIds((prev) => prev.filter((c) => c !== id)); setPage(1); }}
                  onRemoveWeapon={(id) => { setWeaponIds((prev) => prev.filter((w) => w !== id)); setPage(1); }}
                  onRemoveRegion={(r) => { setRegionPrefixes((prev) => prev.filter((p) => p !== r)); setPage(1); }}
                  onRemoveSetEntry={(i) => { setEchoSets((prev) => prev.filter((_, idx) => idx !== i)); setPage(1); }}
                  onRemoveMainEntry={(i) => { setEchoMains((prev) => prev.filter((_, idx) => idx !== i)); setPage(1); }}
                  onClearUsername={() => {}}
                  onClearUid={() => {}}
                  onBackspaceRemove={() => {
                    if (echoMains.length > 0) { setEchoMains((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (echoSets.length > 0) { setEchoSets((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (weaponIds.length > 0) { setWeaponIds((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (characterIds.length > 0) { setCharacterIds((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (regionPrefixes.length > 0) { setRegionPrefixes((prev) => prev.slice(0, -1)); setPage(1); }
                  }}
                  onClearAllFilters={() => {
                    setCharacterIds([]); setWeaponIds([]); setRegionPrefixes([]);
                    setEchoSets([]); setEchoMains([]); setFilterQuery(''); setPage(DEFAULT_PAGE);
                  }}
                  onPageSizeChange={(value) => { setPageSize(clampItemsPerPage(value)); setPage(1); }}
                />
              </div>

              <div className="relative z-10">
                <GlobalBoardResultsPanel
                  builds={builds}
                  expandedBuildIds={expandedBuildIds}
                  detailById={detailById}
                  detailLoadingById={detailLoadingById}
                  detailErrorById={detailErrorById}
                  total={total}
                  page={page}
                  pageCount={normalizedPageCount}
                  pageSize={pageSize}
                  rankStart={rankStart}
                  isLoading={isLoading}
                  isRefreshing={isRefreshing}
                  error={error}
                  sort={sort}
                  direction={direction}
                  onSortChange={(nextSort) => { setSort(nextSort); setPage(1); }}
                  onToggleDirection={() => { setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')); setPage(1); }}
                  onPageChange={setPage}
                  onToggleExpand={handleToggleExpand}
                  onRetryDetail={handleRetryDetail}
                  renderExpanded={renderExpanded}
                  tableGrid={PROFILE_TABLE_GRID}
                  showOwner={false}
                  showTableGate={false}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

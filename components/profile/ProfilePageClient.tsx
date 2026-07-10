'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { Star } from 'lucide-react';
import { getPinnedProfilesSnapshot, getProfilesServerSnapshot, recordProfileVisit, subscribeProfileHistory, togglePinnedProfile } from '@/lib/profileHistory';
import { ProfileSwitcher } from './ProfileSwitcher';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBuildById, LBBuildRowEntry, LBEchoMainFilter, LBEchoSetFilter, LBProfileStandingEntry, LBSortDirection, LBSortKey, LBStatThreshold, listProfileBuilds } from '@/lib/lb';
import { toMainStatLabel } from '@/lib/mainStatFilters';
import { clampItemsPerPage, DEFAULT_PAGE, MAX_ITEMS_PER_PAGE, normalizeSequences } from '@/components/leaderboards/constants';
import { getSortLabel, resolveRegionBadge } from '@/components/leaderboards/formatters';
import { parseInitialQuery, serializeQuery } from '@/components/leaderboards/board/globalBoardQuery';
import { readCachedBuildList, writeCachedBuildList } from '@/components/leaderboards/board/globalBoardCache';
import { BuildFiltersPanel } from '@/components/leaderboards/BuildFiltersPanel';
import { GlobalBoardResultsPanel } from '@/components/leaderboards/board/GlobalBoardResultsPanel';
import { GlobalBoardRowExpandedProps } from '@/components/leaderboards/board/GlobalBoardRow';
import { useBuildDetails } from '@/components/leaderboards/useBuildDetails';
import { useExpandedRows } from '@/components/leaderboards/useExpandedRows';
import { scrollToElementBelowNav } from '@/components/leaderboards/scrollToElementBelowNav';
import { QuerySnapshot, SelectedMainEntry, SelectedSetEntry, SetOption } from '@/components/leaderboards/types';
import { ProfileBuildExpanded } from './ProfileBuildExpanded';
import { ProfileShowcase } from './ProfileShowcase';
import { ProfileEchoes } from './ProfileEchoes';

// Profile table: no Owner column. Name gets the freed space (wider).
// # | Name | Weapon | Seq | Sets | [CV + 4 stats]
const PROFILE_TABLE_GRID = 'grid-cols-[48px_220px_72px_80px_88px_minmax(0,1fr)]';
const PROFILE_RESULTS_COLLAPSED_MAX_WIDTH_CLASS = 'max-w-360';
const PROFILE_RESULTS_EXPANDED_MAX_WIDTH_CLASS = 'max-w-[1620px]';

function buildListSignature(builds: LBBuildRowEntry[], total: number): string {
  return `${total}:${builds.map((b) => `${b.id}:${b.cv}:${b.timestamp}:${b.weapon.id}`).join(',')}`;
}

interface ProfilePageClientProps {
  uid: string;
  profileSummary?: {
    username: string;
    uid: string;
    buildCount: number;
  } | null;
}

export const ProfilePageClient: React.FC<ProfilePageClientProps> = ({ uid, profileSummary }) => {
  const searchParams = useSearchParams();
  const { characters, weaponList, fetters, getCharacter } = useGameData();
  const { t } = useLanguage();

  const buildListSigRef = useRef(buildListSignature([], 0));

  const initialQuery = useMemo(
    () => parseInitialQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const linkedBuildId = searchParams.get('buildId')?.trim() ?? '';

  const [page, setPage] = useState<number>(() => initialQuery.page);
  const [pageSize, setPageSize] = useState<number>(() => clampItemsPerPage(initialQuery.pageSize));
  const [sort, setSort] = useState<LBSortKey>(() => initialQuery.sort);
  const [direction, setDirection] = useState<LBSortDirection>(() => initialQuery.direction);
  const [characterIds, setCharacterIds] = useState<string[]>(() => initialQuery.characterIds);
  const [weaponIds, setWeaponIds] = useState<string[]>(() => initialQuery.weaponIds);
  const [regionPrefixes, setRegionPrefixes] = useState<string[]>(() => initialQuery.regionPrefixes);
  const [echoSets, setEchoSets] = useState<LBEchoSetFilter[]>(() => initialQuery.echoSets);
  const [echoMains, setEchoMains] = useState<LBEchoMainFilter[]>(() => initialQuery.echoMains);
  const [sequences, setSequences] = useState<number[]>(() => initialQuery.sequences);
  const [statFilters, setStatFilters] = useState<LBStatThreshold[]>(() => initialQuery.statFilters);
  const [filterQuery, setFilterQuery] = useState('');

  const [builds, setBuilds] = useState<LBBuildRowEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<{ queryKey: string; message: string } | null>(null);
  const { expandedIds: expandedBuildIds, toggleExpandedId, hasExpandedRows } = useExpandedRows();
  const {
    detailById,
    detailLoadingById,
    detailErrorById,
    loadBuildDetail,
    retryBuildDetail,
    resetBuildDetailRequestState,
  } = useBuildDetails();
  const [featuredStanding, setFeaturedStanding] = useState<LBProfileStandingEntry | null>(null);

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
    echoMains.length > 0 ||
    sequences.length > 0 ||
    statFilters.length > 0
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
    sequences,
    statFilters,
  }), [characterIds, direction, echoMains, echoSets, page, pageSize, regionPrefixes, sequences, sort, statFilters, uid, weaponIds]);

  const currentQueryKey = useMemo(() => serializeQuery(querySnapshot), [querySnapshot]);
  const isPendingQuery = settledQueryKey !== currentQueryKey;
  const isLoading = isPendingQuery && builds.length === 0;
  const isRefreshing = isPendingQuery && builds.length > 0;
  const error = fetchError?.queryKey === currentQueryKey ? fetchError.message : null;

  // Sync URL without uid param in query (uid lives in path)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(serializeQuery({ ...querySnapshot, uid: '' }));
    if (linkedBuildId) params.set('buildId', linkedBuildId);
    const withoutUid = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, '');
    if (currentSearch === withoutUid) return;
    window.history.replaceState(null, '', withoutUid ? `/profile/${uid}?${withoutUid}` : `/profile/${uid}`);
  }, [linkedBuildId, querySnapshot, uid]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const cacheKey = currentQueryKey;
    const cachedResponse = readCachedBuildList(cacheKey);

    queueMicrotask(() => {
      if (!active) return;
      resetBuildDetailRequestState();
      if (cachedResponse) {
        buildListSigRef.current = buildListSignature(cachedResponse.builds, cachedResponse.total);
        setBuilds(cachedResponse.builds);
        setTotal(cachedResponse.total);
      }
    });

    listProfileBuilds(uid, {
      page: querySnapshot.page,
      pageSize: querySnapshot.pageSize,
      sort: querySnapshot.sort,
      direction: querySnapshot.direction,
      characterIds: querySnapshot.characterIds,
      weaponIds: querySnapshot.weaponIds,
      regionPrefixes: querySnapshot.regionPrefixes,
      echoSets: querySnapshot.echoSets,
      echoMains: querySnapshot.echoMains,
      sequences: querySnapshot.sequences,
      statFilters: querySnapshot.statFilters,
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
  }, [currentQueryKey, querySnapshot, resetBuildDetailRequestState, uid]);

  const handleToggleExpand = useCallback((buildId: string) => {
    const id = buildId.trim();
    if (!id) return;
    toggleExpandedId(id, loadBuildDetail);
  }, [loadBuildDetail, toggleExpandedId]);

  const handleRetryDetail = useCallback((buildId: string) => {
    retryBuildDetail(buildId);
  }, [retryBuildDetail]);

  // Deep link from the echo inventory's "Equipped by" strip: surface the build
  // in this page's own table instead of leaving the profile.
  const pendingOpenBuildRef = useRef<string | null>(null);
  const openedLinkedBuildRef = useRef('');

  const scrollToBuildRow = useCallback((buildId: string) => {
    const scroll = () => {
      const row = document.querySelector<HTMLElement>(`[data-build-id="${buildId}"]`);
      if (row) scrollToElementBelowNav(row);
    };
    // Two frames + the expansion's animation window, so the row has its final position.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(scroll, 240);
      });
    });
  }, []);

  useEffect(() => {
    if (!linkedBuildId || !settledQueryKey || openedLinkedBuildRef.current === linkedBuildId) return;
    const controller = new AbortController();
    let active = true;

    void getBuildById(linkedBuildId, controller.signal)
      .then((linkedBuild) => {
        if (!active || linkedBuild.owner.uid !== uid) return;
        openedLinkedBuildRef.current = linkedBuild.id;
        setBuilds((current) => current.some((build) => build.id === linkedBuild.id)
          ? current
          : [linkedBuild, ...current]);
        if (!expandedBuildIds.has(linkedBuild.id)) handleToggleExpand(linkedBuild.id);
        scrollToBuildRow(linkedBuild.id);
      })
      .catch(() => { /* The normal profile remains usable if the deep link is stale. */ });

    return () => {
      active = false;
      controller.abort();
    };
  }, [expandedBuildIds, handleToggleExpand, linkedBuildId, scrollToBuildRow, settledQueryKey, uid]);

  const handleOpenBuild = useCallback((buildId: string, characterId: string) => {
    if (builds.some((b) => b.id === buildId)) {
      if (!expandedBuildIds.has(buildId)) handleToggleExpand(buildId);
      scrollToBuildRow(buildId);
      return;
    }
    // Not on the current page: narrow the table to that character so the build
    // lands on page 1, then expand it once the refreshed list contains it.
    pendingOpenBuildRef.current = buildId;
    setCharacterIds([characterId]);
    setWeaponIds([]);
    setRegionPrefixes([]);
    setEchoSets([]);
    setEchoMains([]);
    setSequences([]);
    setStatFilters([]);
    setPage(1);
  }, [builds, expandedBuildIds, handleToggleExpand, scrollToBuildRow]);

  useEffect(() => {
    const id = pendingOpenBuildRef.current;
    if (!id || !builds.some((b) => b.id === id)) return;
    pendingOpenBuildRef.current = null;
    if (!expandedBuildIds.has(id)) handleToggleExpand(id);
    scrollToBuildRow(id);
  }, [builds, expandedBuildIds, handleToggleExpand, scrollToBuildRow]);

  const normalizedPageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasExpandedBuild = hasExpandedRows;
  const rankStart = (() => {
    if (total <= 0) return 1;
    if (page === normalizedPageCount) return Math.max(1, total - builds.length + 1);
    return (page - 1) * pageSize + 1;
  })();

  // Profile header info comes from the canonical profile row; builds are only a fallback.
  const profileUsername = profileSummary?.username || builds[0]?.owner.username || uid;
  const profileBuildCount = profileSummary?.buildCount ?? total;
  const regionBadge = resolveRegionBadge(profileSummary?.uid || uid);
  const featuredCharacter = useMemo(
    () => getCharacter(featuredStanding?.characterId ?? builds[0]?.character.id ?? null),
    [builds, featuredStanding, getCharacter],
  );
  const featuredCharacterName = featuredCharacter
    ? t(featuredCharacter.nameI18n ?? { en: featuredCharacter.name })
    : null;

  // Record real profile visits so search recents and /profiles can offer them
  // back for quick re-access. Best-effort localStorage write, no state.
  const hasRealProfile = Boolean(profileSummary?.username) || builds.length > 0;
  const featuredHead = featuredCharacter?.head ?? featuredCharacter?.iconRound ?? null;
  useEffect(() => {
    if (!hasRealProfile || !uid) return;
    recordProfileVisit({ uid, username: profileUsername, head: featuredHead });
  }, [featuredHead, hasRealProfile, profileUsername, uid]);

  // Device-local pins (unverified bookmarks, never sent anywhere), read via
  // external store so toggling re-renders without hydration drift.
  const pinnedProfiles = useSyncExternalStore(subscribeProfileHistory, getPinnedProfilesSnapshot, getProfilesServerSnapshot);
  const isPinned = pinnedProfiles.some((entry) => entry.uid === uid);

  // Custom renderExpanded for profile, renders ProfileCard inside
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
      <div
        className={`mx-auto w-full p-3 px-0 transition-[max-width] duration-300 ease-out md:p-5 ${
          hasExpandedBuild ? PROFILE_RESULTS_EXPANDED_MAX_WIDTH_CLASS : PROFILE_RESULTS_COLLAPSED_MAX_WIDTH_CLASS
        }`}
      >
        <ProfileSwitcher currentUid={uid} />
        <section className="relative overflow-visible rounded-b-xl rounded-t-lg border border-border bg-background-secondary">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(166,150,98,0.10),transparent_55%)]" />
          <div className="relative overflow-hidden rounded-[inherit]">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex flex-wrap items-center gap-5">
                <div className="group relative flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background ring-1 ring-inset ring-white/5 select-none">
                  {featuredCharacter?.head || featuredCharacter?.iconRound ? (
                    <>
                      <img
                        src={featuredCharacter.head ?? featuredCharacter.iconRound}
                        alt={featuredCharacterName ?? ''}
                        className="h-full w-full object-cover object-top opacity-90 saturate-110"
                      />
                      <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/45 via-transparent to-white/5" />
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-text-primary/40">
                      {profileUsername.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="truncate text-3xl font-bold tracking-wide text-text-primary">{profileUsername}</h1>
                    {regionBadge && (
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase ${regionBadge.className}`}>
                        {regionBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-text-primary/45 uppercase">
                    <span>UID</span>
                    <span className="font-mono tabular-nums font-normal tracking-normal text-text-primary/55 normal-case">{uid}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => togglePinnedProfile({ uid, username: profileUsername, head: featuredHead })}
                    title={isPinned ? 'Unpin profile (saved on this device only)' : 'Pin profile (saved on this device only)'}
                    aria-label={isPinned ? 'Unpin profile' : 'Pin profile'}
                    aria-pressed={isPinned}
                    className={`grid h-10 w-10 cursor-pointer place-items-center rounded-lg border transition-colors ${
                      isPinned
                        ? 'border-accent/45 bg-accent/10 text-accent hover:border-accent/70 hover:bg-accent/15'
                        : 'border-border bg-background/45 text-text-primary/55 hover:border-accent/40 hover:text-accent'
                    }`}
                  >
                    <Star size={15} className={isPinned ? 'fill-current' : ''} aria-hidden />
                  </button>
                  {profileBuildCount > 0 && (
                    <div className="flex flex-col items-end rounded-lg border border-border bg-background/55 px-4 py-2 ring-1 ring-inset ring-white/5">
                      <span className="text-2xl leading-none font-bold tabular-nums text-text-primary">
                        {profileBuildCount.toLocaleString()}
                      </span>
                      <span className="mt-1 text-[11px] tracking-wider text-text-primary/45 uppercase">
                        build{profileBuildCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <ProfileShowcase uid={uid} onFeaturedEntry={setFeaturedStanding} />

            <div className="px-4 py-3">
              <div className="space-y-3">
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
                  sequences={sequences}
                  statFilters={statFilters}
                  // UID and username locked, not shown
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
                  onSetSequences={(levels) => {
                    setSequences(normalizeSequences(levels));
                    setPage(1);
                  }}
                  onToggleSequence={(level) => {
                    setSequences((prev) => (
                      prev.includes(level)
                        ? prev.filter((entry) => entry !== level)
                        : normalizeSequences([...prev, level])
                    ));
                    setPage(1);
                  }}
                  onClearSequence={() => { setSequences([]); setPage(1); }}
                  onAddStatFilter={(filter) => {
                    setStatFilters((prev) => {
                      const existing = prev.findIndex((e) => e.stat === filter.stat && e.op === filter.op);
                      if (existing >= 0) { const next = [...prev]; next[existing] = filter; return next; }
                      return [...prev, filter];
                    });
                    setPage(1);
                  }}
                  onRemoveStatFilter={(i) => { setStatFilters((prev) => prev.filter((_, idx) => idx !== i)); setPage(1); }}
                  onClearUsername={() => {}}
                  onClearUid={() => {}}
                  onBackspaceRemove={() => {
                    if (statFilters.length > 0) { setStatFilters((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (sequences.length > 0) { setSequences([]); setPage(1); return; }
                    if (echoMains.length > 0) { setEchoMains((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (echoSets.length > 0) { setEchoSets((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (weaponIds.length > 0) { setWeaponIds((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (characterIds.length > 0) { setCharacterIds((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (regionPrefixes.length > 0) { setRegionPrefixes((prev) => prev.slice(0, -1)); setPage(1); }
                  }}
                  onClearAllFilters={() => {
                    setCharacterIds([]); setWeaponIds([]); setRegionPrefixes([]);
                    setEchoSets([]); setEchoMains([]);
                    setSequences([]); setStatFilters([]);
                    setFilterQuery(''); setPage(DEFAULT_PAGE);
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
          </div>
        </section>

        <ProfileEchoes uid={uid} onOpenBuild={handleOpenBuild} />
      </div>
    </main>
  );
};

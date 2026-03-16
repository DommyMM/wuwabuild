'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { getBuildById, LBBuildDetailEntry, LBEchoMainFilter, LBEchoSetFilter, LBLeaderboardEntry, LBLeaderboardResponse, LBLeaderboardSortKey, LBSortDirection, LBTeamMemberConfig, LBTrack, listLeaderboard } from '@/lib/lb';
import { toMainStatLabel } from '@/lib/mainStatFilters';
import { clampItemsPerPage, MAX_ITEMS_PER_PAGE } from '../constants';
import { BuildFiltersPanel } from '../BuildFiltersPanel';
import { SelectedMainEntry, SelectedSetEntry, SetOption } from '../types';
import { DEFAULT_LB_TRACK } from '../constants';
import { buildLeaderboardHref, leaderboardSnapshotToApiQuery, parseInitialLeaderboardQuery, resolveLeaderboardQuerySnapshot, serializeLeaderboardQuery } from './leaderboardCharacterQuery';
import { LeaderboardCharacterHeader } from './LeaderboardCharacterHeader';
import { LeaderboardTabs } from './LeaderboardTabs';
import { LeaderboardResultsPanel } from './LeaderboardResultsPanel';

function leaderboardSignature(entries: LBLeaderboardEntry[], total: number): string {
  return `${total}:${entries.map((e) => `${e.id}:${e.damage}:${e.globalRank}:${e.timestamp}:${e.finalCV}`).join(',')}`;
}

interface LeaderboardCharacterClientProps {
  characterId: string;
  initialData?: LBLeaderboardResponse | null;
}

export const LeaderboardCharacterClient: React.FC<LeaderboardCharacterClientProps> = ({ characterId, initialData }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { characters, fetters } = useGameData();
  const { t } = useLanguage();
  const searchParamsString = searchParams.toString();
  const initialSnapshot = parseInitialLeaderboardQuery(new URLSearchParams(searchParamsString), {
    weaponIds: initialData?.weaponIds,
    tracks: initialData?.tracks,
    defaultWeaponId: initialData?.activeWeaponId || initialData?.weaponIds?.[0] || '',
    defaultTrack: initialData?.activeTrack || initialData?.tracks?.[0]?.key || DEFAULT_LB_TRACK,
  });
  const initialWeaponIndex = (() => {
    if (initialSnapshot.weaponId && initialData?.weaponIds?.length) {
      const idx = initialData.weaponIds.indexOf(initialSnapshot.weaponId);
      if (idx >= 0) return idx;
    }
    if (initialData?.activeWeaponId) {
      const activeIndex = initialData.weaponIds.indexOf(initialData.activeWeaponId);
      if (activeIndex >= 0) return activeIndex;
    }
    return 0;
  })();

  // Config metadata (weapon tabs, track tabs) is safe to seed from initialData regardless of query.
  const [configWeaponIds, setConfigWeaponIds] = useState<string[]>(() => initialData?.weaponIds ?? []);
  const [configTracks, setConfigTracks] = useState<LBTrack[]>(() => initialData?.tracks ?? []);
  const [configTeamCharacterIds, setConfigTeamCharacterIds] = useState<string[]>(() => initialData?.teamCharacterIds ?? []);
  const [configTeamMembers, setConfigTeamMembers] = useState<LBTeamMemberConfig[]>(() => initialData?.teamMembers ?? []);

  // State initialized from URL
  const [page, setPage] = useState(() => initialSnapshot.page);
  const [pageSize, setPageSize] = useState(() => initialSnapshot.pageSize);
  const [sort, setSort] = useState<LBLeaderboardSortKey>(() => initialSnapshot.sort);
  const [direction, setDirection] = useState<LBSortDirection>(() => initialSnapshot.direction);
  const [weaponIndex, setWeaponIndex] = useState(() => initialWeaponIndex);
  const [track, setTrack] = useState(() => initialSnapshot.track);
  const [uid, setUid] = useState(() => initialSnapshot.uid);
  const [username, setUsername] = useState(() => initialSnapshot.username);
  const [deepLinkBuildId] = useState(() => initialSnapshot.buildId);
  const [regionPrefixes, setRegionPrefixes] = useState<string[]>(() => initialSnapshot.regionPrefixes);
  const [echoSets, setEchoSets] = useState<LBEchoSetFilter[]>(() => initialSnapshot.echoSets);
  const [echoMains, setEchoMains] = useState<LBEchoMainFilter[]>(() => initialSnapshot.echoMains);
  const [filterQuery, setFilterQuery] = useState('');

  const leaderboardSigRef = useRef(leaderboardSignature(initialData?.builds ?? [], initialData?.total ?? 0));
  const [entries, setEntries] = useState<LBLeaderboardEntry[]>(() => initialData?.builds ?? []);
  const [total, setTotal] = useState(() => initialData?.total ?? 0);
  const [autoExpandBuildId, setAutoExpandBuildId] = useState<string | null>(null);
  const didDeepLinkRef = useRef(false);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(() => {
    if (!initialData) return null;
    return JSON.stringify({
      characterId,
      ...leaderboardSnapshotToApiQuery(initialSnapshot),
    });
  });
  const [fetchError, setFetchError] = useState<{ queryKey: string; message: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailById, setDetailById] = useState<Record<string, LBBuildDetailEntry>>({});
  const [detailLoadingById, setDetailLoadingById] = useState<Record<string, boolean>>({});
  const [detailErrorById, setDetailErrorById] = useState<Record<string, string | null>>({});
  const detailControllersRef = useRef<Record<string, AbortController>>({});
  const defaultWeaponId = configWeaponIds[0] ?? initialData?.weaponIds?.[0] ?? initialData?.activeWeaponId ?? '';
  const defaultTrackKey = configTracks[0]?.key ?? initialData?.tracks?.[0]?.key ?? initialData?.activeTrack ?? DEFAULT_LB_TRACK;

  // Selected weapon derived from active tab
  const weaponId = useMemo(
    () => configWeaponIds[weaponIndex] ?? initialSnapshot.weaponId ?? '',
    [configWeaponIds, initialSnapshot.weaponId, weaponIndex],
  );
  const currentQuerySnapshot = useMemo(() => resolveLeaderboardQuerySnapshot({
    page,
    pageSize,
    sort,
    direction,
    weaponId,
    track,
    uid,
    username,
    regionPrefixes,
    echoSets,
    echoMains,
    buildId: deepLinkBuildId,
  }, {
    defaultWeaponId,
    defaultTrack: defaultTrackKey,
  }), [defaultTrackKey, defaultWeaponId, deepLinkBuildId, direction, echoMains, echoSets, page, pageSize, regionPrefixes, sort, track, uid, username, weaponId]);
  const leaderboardQuery = useMemo(
    () => leaderboardSnapshotToApiQuery(currentQuerySnapshot),
    [currentQuerySnapshot],
  );

  // URL sync
  useEffect(() => {
    const next = serializeLeaderboardQuery(currentQuerySnapshot, {
      defaultWeaponId,
      defaultTrack: defaultTrackKey,
    });
    if (searchParamsString !== next) {
      router.replace(buildLeaderboardHref(characterId, currentQuerySnapshot, {
        defaultWeaponId,
        defaultTrack: defaultTrackKey,
      }), { scroll: false });
    }
  }, [characterId, currentQuerySnapshot, defaultTrackKey, defaultWeaponId, router, searchParamsString]);

  // Query key for effect dependency
  const queryKey = useMemo(() => JSON.stringify({
    characterId,
    ...leaderboardQuery,
  }), [characterId, leaderboardQuery]);
  const isPendingQuery = settledQueryKey !== queryKey;
  const isLoading = isPendingQuery && entries.length === 0;
  const isRefreshing = isPendingQuery && entries.length > 0;
  const error = fetchError?.queryKey === queryKey ? fetchError.message : null;

  // Fetch leaderboard data
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    listLeaderboard(
      characterId,
      leaderboardQuery,
      controller.signal,
    )
      .then((response) => {
        if (!active) return;
        const nextPageCount = Math.max(1, Math.ceil(response.total / pageSize));
        if (page > nextPageCount) setPage(nextPageCount);
        // Diff check: skip setState if data hasn't changed (avoids re-render on silent revalidation).
        const nextSig = leaderboardSignature(response.builds, response.total);
        if (nextSig !== leaderboardSigRef.current) {
          leaderboardSigRef.current = nextSig;
          setEntries(response.builds);
          setTotal(response.total);
        }
        if (response.weaponIds.length > 0) setConfigWeaponIds(response.weaponIds);
        setConfigTracks(response.tracks);
        setConfigTeamCharacterIds(response.teamCharacterIds);
        setConfigTeamMembers(response.teamMembers);

        if (response.activeWeaponId) {
          const activeIndex = response.weaponIds.indexOf(response.activeWeaponId);
          if (activeIndex >= 0) setWeaponIndex(activeIndex);
        }
        if (response.activeTrack && !response.tracks.some((entry) => entry.key === track)) {
          setTrack(response.activeTrack);
        }

        // buildId deep-link: auto-expand the target build when it appears in entries.
        if (!didDeepLinkRef.current && deepLinkBuildId) {
          const target = response.builds.find((b) => b.id === deepLinkBuildId);
          if (target) {
            didDeepLinkRef.current = true;
            setAutoExpandBuildId(target.id);
          }
        }
      })
      .catch((fetchError) => {
        if (!active || controller.signal.aborted) return;
        setFetchError({
          queryKey,
          message: fetchError instanceof Error ? fetchError.message : 'Failed to load leaderboard.',
        });
      })
      .finally(() => {
        if (!active) return;
        setSettledQueryKey(queryKey);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [characterId, deepLinkBuildId, leaderboardQuery, page, pageSize, queryKey, track]);

  // Expand / detail
  const loadBuildDetail = useCallback((buildId: string, force = false) => {
    const normalizedBuildId = buildId.trim();
    if (!normalizedBuildId) return;
    if (!force && (detailById[normalizedBuildId] || detailLoadingById[normalizedBuildId])) {
      return;
    }

    detailControllersRef.current[normalizedBuildId]?.abort();
    const controller = new AbortController();
    detailControllersRef.current[normalizedBuildId] = controller;

    setDetailLoadingById((prev) => ({ ...prev, [normalizedBuildId]: true }));
    setDetailErrorById((prev) => ({ ...prev, [normalizedBuildId]: null }));

    void getBuildById(normalizedBuildId, controller.signal)
      .then((detail) => {
        setDetailById((prev) => ({ ...prev, [normalizedBuildId]: detail }));
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        setDetailErrorById((prev) => ({
          ...prev,
          [normalizedBuildId]: fetchError instanceof Error ? fetchError.message : 'Failed to load build details.',
        }));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setDetailLoadingById((prev) => ({ ...prev, [normalizedBuildId]: false }));
        delete detailControllersRef.current[normalizedBuildId];
      });
  }, [detailById, detailLoadingById]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
    if (!detailById[id] && !detailLoadingById[id]) {
      loadBuildDetail(id);
    }
  }, [detailById, detailLoadingById, loadBuildDetail]);

  const handleRetryDetail = useCallback((id: string) => {
    loadBuildDetail(id, true);
  }, [loadBuildDetail]);

  useEffect(() => (() => {
    Object.values(detailControllersRef.current).forEach((controller) => controller.abort());
    detailControllersRef.current = {};
  }), []);

  // Auto-expand after UID deep-link navigation: wait until the target build appears in entries.
  useEffect(() => {
    if (!autoExpandBuildId) return;
    if (!entries.some((e) => e.id === autoExpandBuildId)) return;
    if (expandedIds.has(autoExpandBuildId)) { void Promise.resolve().then(() => setAutoExpandBuildId(null)); return; }
    const id = autoExpandBuildId;
    void Promise.resolve().then(() => {
      handleToggleExpand(id);
      setAutoExpandBuildId(null);
      setTimeout(() => {
        const el = document.querySelector(`[data-build-id="${id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    });
  }, [autoExpandBuildId, entries, expandedIds, handleToggleExpand]);

  // Filter helpers
  const addRegion = useCallback((value: string) => {
    setRegionPrefixes((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setPage(1);
  }, []);

  const addSetFilter = useCallback((setId: number, count: number) => {
    setEchoSets((prev) => {
      if (prev.some((e) => e.setId === setId && e.count === count)) return prev;
      return [...prev, { setId, count }];
    });
    setPage(1);
  }, []);

  const addMainFilter = useCallback((cost: number, statType: string) => {
    setEchoMains((prev) => {
      if (prev.some((e) => e.cost === cost && e.statType === statType)) return prev;
      return [...prev, { cost, statType }];
    });
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setRegionPrefixes([]);
    setUid('');
    setUsername('');
    setEchoSets([]);
    setEchoMains([]);
    setFilterQuery('');
    setPage(1);
  }, []);

  // Computed
  const character = characters.find((c) => c.id === characterId) ?? null;
  const characterName = character
    ? formatCharacterDisplayName(character, {
        baseName: t(character.nameI18n ?? { en: character.name }),
        roverElement: undefined,
      })
    : `Character ${characterId}`;

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
    echoMains.map((entry) => {
      const label = toMainStatLabel(entry.statType);
      return { ...entry, label };
    })
  ), [echoMains]);

  const hasActiveFilters = (
    regionPrefixes.length > 0 ||
    uid.trim().length > 0 ||
    username.trim().length > 0 ||
    echoSets.length > 0 ||
    echoMains.length > 0
  );

  const normalizedPageCount = Math.max(1, Math.ceil(total / pageSize));
  const rankStart = (() => {
    if (total <= 0) return 1;
    if (page === normalizedPageCount) return Math.max(1, total - entries.length + 1);
    return (page - 1) * pageSize + 1;
  })();

  return (
    <main className="scrollbar-thin bg-background [--scrollbar-height:2px] [--scrollbar-width:6px]">
      <div className="mx-auto w-full max-w-360 space-y-4 p-3 md:p-5">
        <section className="relative overflow-visible rounded-xl border border-border bg-background-secondary px-4 py-2">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_58%)]" />
          <div className="relative">
            <LeaderboardCharacterHeader
              characterName={characterName}
              characterHead={character?.head}
              characterElement={character?.element ?? undefined}
              teamCharacterIds={configTeamCharacterIds}
              teamMembers={configTeamMembers}
              activeWeaponId={weaponId}
              activeTrackKey={track}
              activeTrackLabel={configTracks.find((t) => t.key === track)?.label}
              activeTrackNote={configTracks.find((t) => t.key === track)?.note}
            />
            <div className="mt-4 space-y-3 border-t border-border/65 pt-4">
              <LeaderboardTabs
                weaponIds={configWeaponIds}
                weaponIndex={weaponIndex}
                onSelectWeapon={(idx) => { setWeaponIndex(idx); setPage(1); }}
                tracks={configTracks}
                activeTrack={track}
                onSelectTrack={(trackKey) => { setTrack(trackKey); setPage(1); }}
              />
              <div className="relative z-40">
                <BuildFiltersPanel
                  sort={sort === 'damage' ? 'finalCV' : (sort as Parameters<typeof BuildFiltersPanel>[0]['sort'])}
                  direction={direction}
                  pageSize={pageSize}
                  maxPageSize={MAX_ITEMS_PER_PAGE}
                  activeSortLabel="Damage"
                  showSortControls={false}
                  hasActiveFilters={hasActiveFilters}
                  filterQuery={filterQuery}
                  characters={[]}
                  weaponList={[]}
                  selectedCharacters={[]}
                  selectedWeapons={[]}
                  regionPrefixes={regionPrefixes}
                  selectedSetEntries={selectedSetEntries}
                  selectedMainEntries={selectedMainEntries}
                  username={username}
                  uid={uid}
                  setOptions={setOptions}
                  onFilterQueryChange={setFilterQuery}
                  onSortChange={() => {}}
                  onToggleDirection={() => { setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')); setPage(1); }}
                  onAddCharacter={() => {}}
                  onAddWeapon={() => {}}
                  onAddRegion={addRegion}
                  onAddSet={addSetFilter}
                  onAddMain={addMainFilter}
                  onSetUsername={(value) => { setUsername(value.trim()); setPage(1); }}
                  onSetUid={(value) => { setUid(value.trim()); setPage(1); }}
                  onRemoveCharacter={() => {}}
                  onRemoveWeapon={() => {}}
                  onRemoveRegion={(value) => { setRegionPrefixes((prev) => prev.filter((r) => r !== value)); setPage(1); }}
                  onRemoveSetEntry={(index) => { setEchoSets((prev) => prev.filter((_, i) => i !== index)); setPage(1); }}
                  onRemoveMainEntry={(index) => { setEchoMains((prev) => prev.filter((_, i) => i !== index)); setPage(1); }}
                  onClearUsername={() => { setUsername(''); setPage(1); }}
                  onClearUid={() => { setUid(''); setPage(1); }}
                  onBackspaceRemove={() => {
                    if (uid) { setUid(''); setPage(1); return; }
                    if (username) { setUsername(''); setPage(1); return; }
                    if (echoMains.length > 0) { setEchoMains((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (echoSets.length > 0) { setEchoSets((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (regionPrefixes.length > 0) { setRegionPrefixes((prev) => prev.slice(0, -1)); setPage(1); }
                  }}
                  onClearAllFilters={clearAllFilters}
                  onPageSizeChange={(value) => { setPageSize(clampItemsPerPage(value)); setPage(1); }}
                />
              </div>
              <LeaderboardResultsPanel
                entries={entries}
                activeWeaponId={weaponId}
                activeTrackKey={track}
                expandedIds={expandedIds}
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
              />
            </div>
          </div>
        </section>

      </div>
    </main>
  );
};

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { LBBuildDetailEntry, LBEchoMainFilter, LBEchoSetFilter, LBLeaderboardEntry, LBLeaderboardResponse, LBLeaderboardSortKey, LBSortDirection, listLeaderboard, normalizeLBLeaderboardSortKey, toLBApiSortKey } from '@/lib/lb';
import { clampItemsPerPage, ITEMS_PER_PAGE, MAIN_STAT_OPTIONS, MAX_ITEMS_PER_PAGE } from '@/components/build/buildConstants';
import { BuildFiltersPanel } from '@/components/build/BuildFiltersPanel';
import { SelectedMainEntry, SelectedSetEntry, SetOption } from '@/components/build/types';
import { DEFAULT_LB_SEQUENCE, DEFAULT_LB_SORT } from './leaderboardConstants';
import { parseEchoMainCSV, parseEchoSetCSV, parsePositiveInt } from './leaderboardQuery';
import { LeaderboardHeader } from './LeaderboardHeader';
import { LeaderboardTabs } from './LeaderboardTabs';
import { LeaderboardResultsPanel } from './LeaderboardResultsPanel';

function leaderboardSignature(entries: LBLeaderboardEntry[], total: number): string {
  return `${total}:${entries.map((e) => `${e.id}:${e.damage}:${e.globalRank}:${e.timestamp}`).join(',')}`;
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
  const leaderboardSigRef = useRef(leaderboardSignature(initialData?.builds ?? [], initialData?.total ?? 0));

  const [configWeaponIds, setConfigWeaponIds] = useState<string[]>(() => initialData?.weaponIds ?? []);
  const [configSequences, setConfigSequences] = useState<string[]>(() => initialData?.sequences.length ? initialData.sequences : ['s0']);

  // State initialized from URL
  const [page, setPage] = useState(() => parsePositiveInt(searchParams.get('page'), 1));
  const [pageSize, setPageSize] = useState(() => clampItemsPerPage(parsePositiveInt(searchParams.get('size') ?? searchParams.get('pageSize'), ITEMS_PER_PAGE)));
  const [sort, setSort] = useState<LBLeaderboardSortKey>(() => normalizeLBLeaderboardSortKey(searchParams.get('sort'), DEFAULT_LB_SORT));
  const [direction, setDirection] = useState<LBSortDirection>(() => {
    const d = searchParams.get('direction');
    return d === 'asc' ? 'asc' : 'desc';
  });
  const [weaponIndex, setWeaponIndex] = useState(() => {
    const idx = Number.parseInt(searchParams.get('weaponIndex') ?? '0', 10);
    return Number.isFinite(idx) && idx >= 0 ? idx : 0;
  });
  const [sequence, setSequence] = useState(() => searchParams.get('sequence') ?? DEFAULT_LB_SEQUENCE);
  const [uid, setUid] = useState(() => searchParams.get('uid') ?? '');
  const [username, setUsername] = useState(() => searchParams.get('username') ?? '');
  const [regionPrefixes, setRegionPrefixes] = useState<string[]>(() => {
    const raw = searchParams.get('regions');
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  });
  const [echoSets, setEchoSets] = useState<LBEchoSetFilter[]>(() => parseEchoSetCSV(searchParams.get('sets')));
  const [echoMains, setEchoMains] = useState<LBEchoMainFilter[]>(() => parseEchoMainCSV(searchParams.get('mains')));
  const [filterQuery, setFilterQuery] = useState('');

  // Data state
  const [entries, setEntries] = useState<LBLeaderboardEntry[]>(() => initialData?.builds ?? []);
  const [total, setTotal] = useState(() => initialData?.total ?? 0);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(() => {
    if (!initialData) return null;
    // Pre-settle on the default query so the skeleton is never shown on first load.
    // Must match the JSON.stringify of { characterId, ...leaderboardQuery } computed by the useMemo below.
    if (searchParams.toString() !== '') return null;
    const firstWeaponId = initialData.weaponIds[0];
    const weaponIds = firstWeaponId ? [firstWeaponId] : [];
    return JSON.stringify({
      characterId,
      page: 1,
      pageSize: ITEMS_PER_PAGE,
      sort: DEFAULT_LB_SORT,
      direction: 'desc',
      weaponIndex: 0,
      sequence: DEFAULT_LB_SEQUENCE,
      weaponIds,
    });
  });
  const [fetchError, setFetchError] = useState<{ queryKey: string; message: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailById] = useState<Record<string, LBBuildDetailEntry>>({});
  const [detailLoadingById] = useState<Record<string, boolean>>({});
  const [detailErrorById, setDetailErrorById] = useState<Record<string, string | null>>({});

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== ITEMS_PER_PAGE) params.set('size', String(pageSize));
    if (sort !== DEFAULT_LB_SORT) params.set('sort', toLBApiSortKey(sort));
    if (direction !== 'desc') params.set('direction', direction);
    if (weaponIndex !== 0) params.set('weaponIndex', String(weaponIndex));
    if (sequence !== DEFAULT_LB_SEQUENCE) params.set('sequence', sequence);
    if (uid) params.set('uid', uid);
    if (username) params.set('username', username);
    if (regionPrefixes.length) params.set('regions', regionPrefixes.join(','));
    if (echoSets.length) params.set('sets', echoSets.map((e) => `${e.count}~${e.setId}`).join('.'));
    if (echoMains.length) params.set('mains', echoMains.map((e) => `${e.cost}~${e.statType}`).join('.'));

    const next = params.toString();
    const current = searchParams.toString();
    if (current !== next) {
      router.replace(next ? `/leaderboards/${characterId}?${next}` : `/leaderboards/${characterId}`, { scroll: false });
    }
  }, [characterId, direction, echoMains, echoSets, page, pageSize, regionPrefixes, router, searchParams, sequence, sort, uid, username, weaponIndex]);

  // Weapon IDs derived from selected tab
  const weaponIds = useMemo<string[]>(() => {
    const weaponId = configWeaponIds[weaponIndex];
    return weaponId ? [weaponId] : [];
  }, [configWeaponIds, weaponIndex]);

  const leaderboardQuery = useMemo(() => ({
    page,
    pageSize,
    sort,
    direction,
    weaponIndex,
    sequence,
    weaponIds,
    uid: uid || undefined,
    username: username || undefined,
    regionPrefixes: regionPrefixes.length ? regionPrefixes : undefined,
    echoSets: echoSets.length ? echoSets : undefined,
    echoMains: echoMains.length ? echoMains : undefined,
  }), [direction, echoMains, echoSets, page, pageSize, regionPrefixes, sequence, sort, uid, username, weaponIds, weaponIndex]);

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
        if (response.sequences.length > 0) setConfigSequences(response.sequences);
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
  }, [characterId, leaderboardQuery, page, pageSize, queryKey]);

  // Expand / detail
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const handleRetryDetail = useCallback((id: string) => {
    setDetailErrorById((prev) => ({ ...prev, [id]: null }));
  }, []);

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
      const label = MAIN_STAT_OPTIONS.find((opt) => opt.code === entry.statType)?.label ?? entry.statType;
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
            <LeaderboardHeader
              characterName={characterName}
              characterHead={character?.head}
              characterElementIcon={character?.elementIcon}
              characterElement={character?.element ?? undefined}
              total={total}
              teamCharacterIds={undefined}
            />
            <div className="mt-4 space-y-3 border-t border-border/65 pt-4">
              <LeaderboardTabs
                weaponIds={configWeaponIds}
                weaponIndex={weaponIndex}
                onSelectWeapon={(idx) => { setWeaponIndex(idx); setPage(1); }}
                sequences={configSequences}
                activeSequence={sequence}
                onSelectSequence={(seq) => { setSequence(seq); setPage(1); }}
              />
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
              <LeaderboardResultsPanel
                entries={entries}
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

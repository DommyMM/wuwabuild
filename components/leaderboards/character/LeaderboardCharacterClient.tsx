'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { LBEchoMainFilter, LBEchoSetFilter, LBLeaderboardEntry, LBLeaderboardResponse, LBLeaderboardSortKey, LBSortDirection, LBStatSortKey, LBStatThreshold, LBTeamBuffs, LBTeamMemberConfig, LBTrack, listLeaderboard } from '@/lib/lb';
import { toMainStatLabel } from '@/lib/mainStatFilters';
import { clampItemsPerPage, DEFAULT_SCORING, MAX_ITEMS_PER_PAGE, normalizeSequences, ScoringMode } from '../constants';
import { BuildFiltersPanel } from '../BuildFiltersPanel';
import { SelectedMainEntry, SelectedSetEntry, SetOption } from '../types';
import { DEFAULT_LB_TRACK } from '../constants';
import { buildLeaderboardHref, leaderboardSnapshotToApiQuery, parseInitialLeaderboardQuery, resolveLeaderboardQuerySnapshot, serializeLeaderboardQuery } from './leaderboardCharacterQuery';
import { LeaderboardCharacterHeader } from './LeaderboardCharacterHeader';
import { LeaderboardTabs } from './LeaderboardTabs';
import { LeaderboardResultsPanel } from './LeaderboardResultsPanel';
import { scrollToElementBelowNav } from '../scrollToElementBelowNav';
import { useBuildDetails } from '../useBuildDetails';
import { useExpandedRows } from '../useExpandedRows';
import { createRowsSignature } from '../queryHelpers';
import posthog from 'posthog-js';

function mergeGhostBuild(entries: LBLeaderboardEntry[], ghostBuild: LBLeaderboardEntry | null | undefined): LBLeaderboardEntry[] {
  if (!ghostBuild || entries.some((entry) => entry.id === ghostBuild.id)) {
    return entries;
  }

  const insertIdx = entries.findIndex((entry) => entry.damage < ghostBuild.damage);
  if (insertIdx === -1) {
    return [...entries, ghostBuild];
  }
  return [...entries.slice(0, insertIdx), ghostBuild, ...entries.slice(insertIdx)];
}

function sameDisplayStats(a: readonly LBStatSortKey[], b: readonly LBStatSortKey[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

interface LeaderboardCharacterClientProps {
  characterId: string;
  initialData?: LBLeaderboardResponse | null;
}

/**
 * A `?buildId=` deep link: a transient one-shot "reveal this build" command, NOT persistent view state.
 * Once resolved we remember the build client-side for the session so we can re-pin it (as a ghost row)
 * whenever the user returns to the exact view it belongs to without resending buildId to the API
 */
interface DeepLink {
  id: string;
  /** The build's data, kept so it can be re-pinned on return without re-querying. */
  entry: LBLeaderboardEntry | null;
  /** Serialized view (weapon/track/filters/page) the build belongs to; null until resolved/anchored. */
  homeSig: string | null;
  /** True when it arrived via client navigation and still needs one buildId fetch to resolve its page. */
  needsResolve: boolean;
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
  const [configTeamBuffs, setConfigTeamBuffs] = useState<LBTeamBuffs>(() => initialData?.teamBuffs ?? { total: {}, bySupport: [] });
  const lastTrackedFilterSignatureRef = useRef<string | null>(null);

  const initialPage = initialData?.page ?? initialSnapshot.page;
  const initialPageSize = initialData?.pageSize ?? initialSnapshot.pageSize;
  const initialEntries = mergeGhostBuild(initialData?.builds ?? [], initialData?.ghostBuild);
  const initialQuerySnapshot = {
    ...initialSnapshot,
    page: initialPage,
    pageSize: initialPageSize,
  };

  // State initialized from URL, with backend page overrides applied for buildId ghost resolution.
  const [page, setPage] = useState(() => initialPage);
  const [pageSize, setPageSize] = useState(() => initialPageSize);
  const [sort, setSort] = useState<LBLeaderboardSortKey>(() => initialSnapshot.sort);
  const [direction, setDirection] = useState<LBSortDirection>(() => initialSnapshot.direction);
  const [weaponIndex, setWeaponIndex] = useState(() => initialWeaponIndex);
  const [track, setTrack] = useState(() => initialSnapshot.track);
  const [uid, setUid] = useState(() => initialSnapshot.uid);
  const [username, setUsername] = useState(() => initialSnapshot.username);
  const [regionPrefixes, setRegionPrefixes] = useState<string[]>(() => initialSnapshot.regionPrefixes);
  const [echoSets, setEchoSets] = useState<LBEchoSetFilter[]>(() => initialSnapshot.echoSets);
  const [echoMains, setEchoMains] = useState<LBEchoMainFilter[]>(() => initialSnapshot.echoMains);
  const [sequences, setSequences] = useState<number[]>(() => initialSnapshot.sequences);
  const [statFilters, setStatFilters] = useState<LBStatThreshold[]>(() => initialSnapshot.statFilters);
  const [filterQuery, setFilterQuery] = useState('');
  // Scoring lens (client-side view mode over the same board): 'adjusted' = canonical
  // ER-scaled Score, 'raw' = pure damage. Raw re-sorts the visible page client-side;
  // cross-page raw ranking is a backend sort=raw follow-up.
  const [scoring, setScoring] = useState<ScoringMode>(() => initialSnapshot.scoring ?? DEFAULT_SCORING);

  const leaderboardSigRef = useRef(createRowsSignature(initialEntries, initialData?.total ?? 0));
  const [entries, setEntries] = useState<LBLeaderboardEntry[]>(() => initialEntries);
  const entriesRef = useRef<LBLeaderboardEntry[]>(initialEntries);
  const [total, setTotal] = useState(() => initialData?.total ?? 0);
  // Board-level stat columns from the backend (same four for every row on this board). Empty array → rows fall back to the per-row heuristic.
  const [boardDisplayStats, setBoardDisplayStats] = useState<LBStatSortKey[]>(() => initialData?.displayStats ?? []);

  // See DeepLink doc above. SSR already resolved the page/build via the buildId query, so an initial load
  // starts 'resolved'; a load with no initialData (rare) resolves client-side.
  const [deepLink, setDeepLink] = useState<DeepLink | null>(() => {
    const id = initialSnapshot.buildId;
    if (!id) return null;
    const entry = initialEntries.find((e) => e.id === id) ?? initialData?.ghostBuild ?? null;
    return { id, entry, homeSig: null, needsResolve: !initialData };
  });
  // Auto-expand a deep-linked build exactly once per reveal.
  const expandedDeepLinkRef = useRef<string | null>(null);
  // Used to suppress the URL sync effect for one cycle when a standings click updates weapon/track state.
  const suppressUrlSyncRef = useRef(false);
  const [settledQueryKey, setSettledQueryKey] = useState<string | null>(() => {
    if (!initialData) return null;
    // buildId is never part of the query key (it's resolved out-of-band), so seed it without one.
    return JSON.stringify({
      characterId,
      ...leaderboardSnapshotToApiQuery({ ...initialQuerySnapshot, buildId: '' }),
    });
  });
  const [fetchError, setFetchError] = useState<{ queryKey: string; message: string } | null>(null);
  const { expandedIds, toggleExpandedId } = useExpandedRows();
  const autoExpandRowRef = useRef<HTMLDivElement | null>(null);
  const {
    detailById,
    detailLoadingById,
    detailErrorById,
    loadBuildDetail,
    retryBuildDetail,
  } = useBuildDetails();

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const defaultWeaponId = configWeaponIds[0] ?? initialData?.weaponIds?.[0] ?? initialData?.activeWeaponId ?? '';
  const defaultTrackKey = configTracks[0]?.key ?? initialData?.tracks?.[0]?.key ?? initialData?.activeTrack ?? DEFAULT_LB_TRACK;

  // Selected weapon derived from active tab
  const weaponId = useMemo(
    () => configWeaponIds[weaponIndex] ?? initialSnapshot.weaponId ?? '',
    [configWeaponIds, initialSnapshot.weaponId, weaponIndex],
  );
  const activeTrackConfig = useMemo(
    () => configTracks.find((entry) => entry.key === track),
    [configTracks, track],
  );
  // Active track's ER target: scores are damage × min(1, ER/target); 0 = no requirement.
  const erTarget = activeTrackConfig?.erTarget ?? 0;
  // The query snapshot is buildId-free: buildId is a transient command, not part of the view state.
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
    sequences,
    statFilters,
    scoring,
  }, {
    defaultWeaponId,
    defaultTrack: defaultTrackKey,
  }), [defaultTrackKey, defaultWeaponId, direction, echoMains, echoSets, page, pageSize, regionPrefixes, scoring, sequences, sort, statFilters, track, uid, username, weaponId]);
  const leaderboardQuery = useMemo(
    () => leaderboardSnapshotToApiQuery(currentQuerySnapshot),
    [currentQuerySnapshot],
  );

  // Serialized "view" (everything except the deep-link buildId): used to anchor the reveal and to re-pin
  // it whenever the user returns to that exact view.
  const viewSig = useMemo(
    () => serializeLeaderboardQuery(currentQuerySnapshot, { defaultWeaponId, defaultTrack: defaultTrackKey }),
    [currentQuerySnapshot, defaultTrackKey, defaultWeaponId],
  );
  // On the deep link's home view while it's still settling (homeSig === null) or once anchored to this view.
  const onDeepLinkHome = !!deepLink && (deepLink.homeSig === null || deepLink.homeSig === viewSig);
  // Sent to the API only to resolve a freshly-arrived deep link's page — never otherwise, so it can't force the page.
  const resolveBuildId = deepLink?.needsResolve ? deepLink.id : undefined;
  // In the URL + highlighted only while on the reveal's home view.
  const revealBuildId = deepLink && onDeepLinkHome ? deepLink.id : undefined;
  // Re-pin the remembered build as a ghost row when the user is back on its home view (client-side, no re-query).
  const displayEntries = useMemo(
    () => (onDeepLinkHome && deepLink?.entry ? mergeGhostBuild(entries, deepLink.entry) : entries),
    [deepLink, entries, onDeepLinkHome],
  );

  // Capture a deep link that arrives via client navigation (a standings click on the same route).
  // MUST be registered before the URL sync effect (effects run in order) so suppressing it prevents the
  // URL sync from immediately reverting the buildId / weapon / track the click navigated to.
  useEffect(() => {
    const urlBuildId = initialSnapshot.buildId;
    if (!urlBuildId || deepLink?.id === urlBuildId) return;
    // A fresh build to reveal: start a resolving fetch and adopt the weapon/track from the URL.
    const urlWeaponId = initialSnapshot.weaponId;
    const urlTrack = initialSnapshot.track;
    const stateWeaponId = configWeaponIds[weaponIndex] ?? '';
    const syncWeaponTrack = urlWeaponId !== stateWeaponId || urlTrack !== track;
    // Suppress one URL-sync cycle (set synchronously) for ANY fresh deep-link capture, not only ones that
    // also change weapon/track. The URL already carries the new buildId, so there is nothing for the sync
    // effect to contribute this commit — and if it runs it does so with the *previous* deepLink id
    // (revealBuildId) and replaces the URL back to it. That stale write then ping-pongs against this
    // capture, most visibly when the old and new builds share a weapon+track board (same-board dupes),
    // where the weapon/track guard below would otherwise leave the sync effect un-suppressed.
    suppressUrlSyncRef.current = true;
    const idx = urlWeaponId ? configWeaponIds.indexOf(urlWeaponId) : -1;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDeepLink({ id: urlBuildId, entry: null, homeSig: null, needsResolve: true });
      if (syncWeaponTrack) {
        if (idx >= 0) setWeaponIndex(idx);
        if (urlTrack && urlTrack !== track) setTrack(urlTrack);
      }
    });
    return () => { cancelled = true; };
  }, [configWeaponIds, deepLink?.id, initialSnapshot.buildId, initialSnapshot.track, initialSnapshot.weaponId, track, weaponIndex]);

  // Anchor the deep link to its home view once it has resolved (page settled), so it can be re-pinned on return.
  useEffect(() => {
    if (!deepLink || deepLink.needsResolve || deepLink.homeSig !== null) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDeepLink((prev) => (prev && !prev.needsResolve && prev.homeSig === null ? { ...prev, homeSig: viewSig } : prev));
    });
    return () => { cancelled = true; };
  }, [deepLink, viewSig]);

  // URL sync — buildId is written only while on the reveal's home view (revealBuildId), so navigating away
  // drops it and returning re-adds it.
  useEffect(() => {
    if (suppressUrlSyncRef.current) {
      suppressUrlSyncRef.current = false;
      return;
    }
    const urlSnapshot = { ...currentQuerySnapshot, buildId: revealBuildId ?? '' };
    const next = serializeLeaderboardQuery(urlSnapshot, {
      defaultWeaponId,
      defaultTrack: defaultTrackKey,
    });
    if (searchParamsString !== next) {
      router.replace(buildLeaderboardHref(characterId, urlSnapshot, {
        defaultWeaponId,
        defaultTrack: defaultTrackKey,
      }), { scroll: false });
    }
  }, [characterId, currentQuerySnapshot, defaultTrackKey, defaultWeaponId, revealBuildId, router, searchParamsString]);

  // Query key for effect dependency
  const queryKey = useMemo(() => JSON.stringify({
    characterId,
    ...leaderboardQuery,
  }), [characterId, leaderboardQuery]);
  const isPendingQuery = settledQueryKey !== queryKey;
  const isLoading = isPendingQuery && entries.length === 0;
  const isRefreshing = isPendingQuery && entries.length > 0;
  const error = fetchError?.queryKey === queryKey ? fetchError.message : null;
  const filterSignature = useMemo(() => JSON.stringify({
    characterId,
    weaponId,
    track,
    uid: uid.trim(),
    username: username.trim(),
    regionPrefixes,
    echoSets,
    echoMains,
    sequences,
    statFilters,
    scoring,
    sort,
    direction,
    pageSize,
  }), [characterId, weaponId, track, uid, username, regionPrefixes, echoSets, echoMains, sequences, statFilters, scoring, sort, direction, pageSize]);

  useEffect(() => {
    if (!settledQueryKey) return;
    if (settledQueryKey !== queryKey) return;
    if (lastTrackedFilterSignatureRef.current === filterSignature) return;
    lastTrackedFilterSignatureRef.current = filterSignature;
    posthog.capture('discovery_filter_apply', {
      surface: 'leaderboard_character',
      character_id: characterId,
      weapon_id: weaponId || null,
      track_key: track || null,
      region_count: regionPrefixes.length,
      has_uid_search: uid.trim().length > 0,
      has_username_search: username.trim().length > 0,
      echo_set_count: echoSets.length,
      echo_main_count: echoMains.length,
      seq_count: sequences.length,
      stat_filter_count: statFilters.length,
      scoring,
      sort,
      direction,
      page_size: pageSize,
    });
  }, [characterId, direction, echoMains.length, echoSets.length, filterSignature, pageSize, queryKey, regionPrefixes.length, scoring, sequences.length, settledQueryKey, sort, statFilters.length, track, uid, username, weaponId]);

  // Fetch leaderboard data. Runs when the view changes (queryKey) or a fresh deep link needs resolving.
  useEffect(() => {
    const shouldResolveDeepLink = Boolean(resolveBuildId) && fetchError?.queryKey !== queryKey;
    const needFetch = settledQueryKey !== queryKey || shouldResolveDeepLink;
    if (!needFetch) return;

    const controller = new AbortController();
    let active = true;

    // buildId is injected into the request only to resolve a fresh deep link's page — it is never part of queryKey.
    const requestQuery = resolveBuildId ? { ...leaderboardQuery, buildId: resolveBuildId } : leaderboardQuery;

    listLeaderboard(
      characterId,
      requestQuery,
      controller.signal,
    )
      .then((response) => {
        if (!active) return;
        setFetchError(null);

        // If page was overridden by backend for ghost resolution, sync it.
        if (response.page !== page) setPage(response.page);

        const nextPageCount = Math.max(1, Math.ceil(response.total / pageSize));
        if (page > nextPageCount) setPage(nextPageCount);

        // Insert ghost build at the correct position by damage if present.
        // Skip if the build already appears in the regular results (e.g. deep-linked to its own page).
        const mergedBuilds = mergeGhostBuild(response.builds, response.ghostBuild);

        const nextSig = createRowsSignature(mergedBuilds, response.total);
        if (nextSig !== leaderboardSigRef.current) {
          leaderboardSigRef.current = nextSig;
          setEntries(mergedBuilds);
          setTotal(response.total);
        }
        if (response.weaponIds.length > 0) setConfigWeaponIds(response.weaponIds);
        setConfigTracks(response.tracks);
        setConfigTeamCharacterIds(response.teamCharacterIds);
        setConfigTeamMembers(response.teamMembers);
        setConfigTeamBuffs(response.teamBuffs);
        setBoardDisplayStats((prev) => (
          sameDisplayStats(prev, response.displayStats) ? prev : response.displayStats
        ));

        if (response.activeWeaponId) {
          const activeIndex = response.weaponIds.indexOf(response.activeWeaponId);
          if (activeIndex >= 0) setWeaponIndex(activeIndex);
        }
        if (response.activeTrack && !response.tracks.some((entry) => entry.key === track)) {
          setTrack(response.activeTrack);
        }

        // Resolving fetch for a fresh deep link: remember the build, then stop sending its buildId.
        if (resolveBuildId) {
          const resolved = response.ghostBuild ?? mergedBuilds.find((b) => b.id === resolveBuildId) ?? null;
          setDeepLink((prev) => (prev && prev.id === resolveBuildId
            ? { ...prev, entry: resolved ?? prev.entry, needsResolve: false }
            : prev));
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
  }, [characterId, fetchError?.queryKey, leaderboardQuery, page, pageSize, queryKey, resolveBuildId, settledQueryKey, track]);

  const retryCurrentQuery = useCallback(() => {
    setFetchError(null);
    setSettledQueryKey(null);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    toggleExpandedId(id, (expandedId) => {
        const entry = entriesRef.current.find((row) => row.id === id);
        posthog.capture('discovery_result_expand', {
          surface: 'leaderboard_character',
          character_id: entry?.character.id ?? characterId,
          track_key: track,
        });
      loadBuildDetail(expandedId);
    });
  }, [characterId, loadBuildDetail, toggleExpandedId, track]);

  const handleRetryDetail = useCallback((id: string) => {
    retryBuildDetail(id);
  }, [retryBuildDetail]);

  // Auto-expand + scroll to a deep-linked build, exactly once per reveal, when it first appears in the rows.
  useEffect(() => {
    const id = deepLink?.id;
    if (!id || expandedDeepLinkRef.current === id) return;
    if (!displayEntries.some((e) => e.id === id)) return;
    expandedDeepLinkRef.current = id;
    void Promise.resolve().then(() => {
      if (!expandedIds.has(id)) handleToggleExpand(id);
      const scroll = () => {
        const row = autoExpandRowRef.current;
        if (row) scrollToElementBelowNav(row);
      };
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.setTimeout(scroll, 220);
        });
      });
    });
  }, [deepLink?.id, displayEntries, expandedIds, handleToggleExpand]);

  // Filter helpers
  const addRegion = useCallback((value: string) => {
    setRegionPrefixes((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setPage(1);
  }, [setPage, setRegionPrefixes]);

  const addSetFilter = useCallback((setId: number, count: number) => {
    setEchoSets((prev) => {
      if (prev.some((e) => e.setId === setId && e.count === count)) return prev;
      return [...prev, { setId, count }];
    });
    setPage(1);
  }, [setEchoSets, setPage]);

  const addMainFilter = useCallback((cost: number, statType: string) => {
    setEchoMains((prev) => {
      if (prev.some((e) => e.cost === cost && e.statType === statType)) return prev;
      return [...prev, { cost, statType }];
    });
    setPage(1);
  }, [setEchoMains, setPage]);

  const toggleSequence = useCallback((level: number) => {
    setSequences((prev) => (
      prev.includes(level)
        ? prev.filter((entry) => entry !== level)
        : normalizeSequences([...prev, level])
    ));
    setPage(1);
  }, [setPage, setSequences]);

  const setSequenceLevels = useCallback((levels: number[]) => {
    setSequences(normalizeSequences(levels));
    setPage(1);
  }, [setPage, setSequences]);

  const clearSequence = useCallback(() => {
    setSequences([]);
    setPage(1);
  }, [setPage, setSequences]);

  const addStatFilter = useCallback((filter: LBStatThreshold) => {
    setStatFilters((prev) => {
      const existing = prev.findIndex((entry) => entry.stat === filter.stat && entry.op === filter.op);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = filter;
        return next;
      }
      return [...prev, filter];
    });
    setPage(1);
  }, [setStatFilters, setPage]);

  const removeStatFilter = useCallback((index: number) => {
    setStatFilters((prev) => prev.filter((_, i) => i !== index));
    setPage(1);
  }, [setStatFilters, setPage]);

  const clearAllFilters = useCallback(() => {
    setRegionPrefixes([]);
    setUid('');
    setUsername('');
    setEchoSets([]);
    setEchoMains([]);
    setSequences([]);
    setStatFilters([]);
    setFilterQuery('');
    setPage(1);
  }, [setEchoMains, setEchoSets, setFilterQuery, setPage, setRegionPrefixes, setSequences, setStatFilters, setUid, setUsername]);

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
    echoMains.length > 0 ||
    sequences.length > 0 ||
    statFilters.length > 0
  );

  const normalizedPageCount = Math.max(1, Math.ceil(total / pageSize));
  const activeMetricLabel = scoring === 'raw' ? 'Damage' : 'Score';
  const rankStart = (() => {
    if (total <= 0) return 1;
    if (page === normalizedPageCount) return Math.max(1, total - displayEntries.length + 1);
    return (page - 1) * pageSize + 1;
  })();

  return (
    <main className="scrollbar-thin bg-background [--scrollbar-height:2px] [--scrollbar-width:6px]">
      <div className="mx-auto w-full max-w-360 space-y-4 p-3 md:p-5">
        <section className="relative overflow-visible rounded-xl border border-border bg-background-secondary px-4 py-2">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_58%)]" />
          <div className="relative">
            <LeaderboardCharacterHeader
              characterId={characterId}
              characterName={characterName}
              characterHead={character?.head}
              characterElement={character?.element ?? undefined}
              teamCharacterIds={configTeamCharacterIds}
              teamMembers={configTeamMembers}
              teamBuffs={configTeamBuffs}
              activeWeaponId={weaponId}
              activeTrackKey={track}
              activeTrackLabel={activeTrackConfig?.label}
              activeTrackNote={activeTrackConfig?.note}
            />
            <div className="mt-4 space-y-3 border-t border-border/65 pt-4">
              <LeaderboardTabs
                weaponIds={configWeaponIds}
                weaponIndex={weaponIndex}
                onSelectWeapon={(idx) => {
                  const nextWeaponId = configWeaponIds[idx] ?? null;
                  posthog.capture('leaderboard_tab_change', {
                    character_id: characterId,
                    weapon_id: nextWeaponId,
                    track_key: track,
                    tab_kind: 'weapon',
                  });
                  setWeaponIndex(idx);
                  setPage(1);
                }}
                tracks={configTracks}
                activeTrack={track}
                onSelectTrack={(trackKey) => {
                  posthog.capture('leaderboard_tab_change', {
                    character_id: characterId,
                    weapon_id: weaponId || null,
                    track_key: trackKey,
                    tab_kind: 'track',
                  });
                  setTrack(trackKey);
                  setPage(1);
                }}
                scoring={scoring}
                onSelectScoring={(mode) => {
                  posthog.capture('leaderboard_tab_change', {
                    character_id: characterId,
                    weapon_id: weaponId || null,
                    track_key: track,
                    tab_kind: 'scoring',
                    scoring: mode,
                  });
                  setScoring(mode);
                  setPage(1);
                }}
              />
              <div className="relative z-40">
                <BuildFiltersPanel
                  sort={sort === 'damage' ? 'finalCV' : (sort as Parameters<typeof BuildFiltersPanel>[0]['sort'])}
                  direction={direction}
                  pageSize={pageSize}
                  maxPageSize={MAX_ITEMS_PER_PAGE}
                  activeSortLabel={activeMetricLabel}
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
                  sequences={sequences}
                  statFilters={statFilters}
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
                  onSetSequences={setSequenceLevels}
                  onToggleSequence={toggleSequence}
                  onClearSequence={clearSequence}
                  onAddStatFilter={addStatFilter}
                  onRemoveStatFilter={removeStatFilter}
                  onClearUsername={() => { setUsername(''); setPage(1); }}
                  onClearUid={() => { setUid(''); setPage(1); }}
                  onBackspaceRemove={() => {
                    if (uid) { setUid(''); setPage(1); return; }
                    if (username) { setUsername(''); setPage(1); return; }
                    if (statFilters.length > 0) { setStatFilters((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (sequences.length > 0) { setSequences([]); setPage(1); return; }
                    if (echoMains.length > 0) { setEchoMains((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (echoSets.length > 0) { setEchoSets((prev) => prev.slice(0, -1)); setPage(1); return; }
                    if (regionPrefixes.length > 0) { setRegionPrefixes((prev) => prev.slice(0, -1)); setPage(1); }
                  }}
                  onClearAllFilters={clearAllFilters}
                  onPageSizeChange={(value) => { setPageSize(clampItemsPerPage(value)); setPage(1); }}
                />
              </div>
              <LeaderboardResultsPanel
                entries={displayEntries}
                displayStats={boardDisplayStats}
                deepLinkBuildId={revealBuildId ?? ''}
                activeWeaponId={weaponId}
                activeTrackKey={track}
                erTarget={erTarget}
                scoring={scoring}
                metricLabel={activeMetricLabel}
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
                onRetry={retryCurrentQuery}
                sort={sort}
                direction={direction}
                onSortChange={(nextSort) => { setSort(nextSort); setPage(1); }}
                onToggleDirection={() => { setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')); setPage(1); }}
                onPageChange={setPage}
                autoExpandRowRef={autoExpandRowRef}
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

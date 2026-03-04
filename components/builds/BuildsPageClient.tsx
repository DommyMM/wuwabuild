'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LBBuildEntry,
  LBEchoMainFilter,
  LBEchoSetFilter,
  LBSortDirection,
  LBSortKey,
  listBuilds,
} from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import {
  DEFAULT_PAGE,
  IDENTITY_DEBOUNCE_MS,
  ITEMS_PER_PAGE,
  MAIN_STAT_OPTIONS,
} from './buildsConstants';
import { getSortLabel } from './buildsFormatters';
import { parseInitialQuery, serializeQuery } from './buildsQuery';
import { BuildsFiltersPanel } from './BuildsFiltersPanel';
import { BuildsHeader } from './BuildsHeader';
import { BuildsResultsPanel } from './BuildsResultsPanel';
import {
  FilterSuggestion,
  QuerySnapshot,
  SelectedMainEntry,
  SelectedSetEntry,
  SetOption,
} from './types';

export const BuildsPageClient: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { characters, weaponList, fetters, loading: gameDataLoading } = useGameData();
  const { t } = useLanguage();

  const initialQuery = useMemo(
    () => parseInitialQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [page, setPage] = useState<number>(() => initialQuery.page);
  const [sort, setSort] = useState<LBSortKey>(() => initialQuery.sort);
  const [direction, setDirection] = useState<LBSortDirection>(() => initialQuery.direction);
  const [characterIds, setCharacterIds] = useState<string[]>(() => initialQuery.characterIds);
  const [weaponIds, setWeaponIds] = useState<string[]>(() => initialQuery.weaponIds);
  const [regionPrefixes, setRegionPrefixes] = useState<string[]>(() => initialQuery.regionPrefixes);
  const [username, setUsername] = useState<string>(() => initialQuery.username.trim());
  const [uid, setUid] = useState<string>(() => initialQuery.uid.trim());
  const [usernameInput, setUsernameInput] = useState<string>(() => initialQuery.username);
  const [uidInput, setUidInput] = useState<string>(() => initialQuery.uid);
  const [echoSets, setEchoSets] = useState<LBEchoSetFilter[]>(() => initialQuery.echoSets);
  const [echoMains, setEchoMains] = useState<LBEchoMainFilter[]>(() => initialQuery.echoMains);

  const [entityQuery, setEntityQuery] = useState('');
  const [pendingSetId, setPendingSetId] = useState<number | null>(null);
  const [pendingSetCount, setPendingSetCount] = useState(2);
  const [pendingMainCost, setPendingMainCost] = useState(4);
  const [pendingMainStat, setPendingMainStat] = useState<string>('CR');

  const [builds, setBuilds] = useState<LBBuildEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedBuildIds, setExpandedBuildIds] = useState<Set<string>>(new Set());

  const selectedCharacters = useMemo(() => (
    characterIds.reduce<typeof characters>((acc, id) => {
      const character = characters.find((entry) => entry.id === id);
      if (character) acc.push(character);
      return acc;
    }, [])
  ), [characterIds, characters]);

  const selectedWeapons = useMemo(() => (
    weaponIds.reduce<typeof weaponList>((acc, id) => {
      const weapon = weaponList.find((entry) => entry.id === id);
      if (weapon) acc.push(weapon);
      return acc;
    }, [])
  ), [weaponIds, weaponList]);

  const filterSuggestions = useMemo<FilterSuggestion[]>(() => {
    const query = entityQuery.trim().toLowerCase();
    if (!query) return [];

    const characterSuggestions = characters
      .filter((character) => !characterIds.includes(character.id))
      .map((character) => ({
        type: 'character' as const,
        id: character.id,
        name: t(character.nameI18n ?? { en: character.name }),
        icon: character.head ?? '',
      }))
      .filter((entry) => entry.name.toLowerCase().includes(query));

    const weaponSuggestions = weaponList
      .filter((weapon) => !weaponIds.includes(weapon.id))
      .map((weapon) => ({
        type: 'weapon' as const,
        id: weapon.id,
        name: t(weapon.nameI18n ?? { en: weapon.name }),
        icon: getWeaponPaths(weapon),
      }))
      .filter((entry) => entry.name.toLowerCase().includes(query));

    const byPrefixAndName = (a: FilterSuggestion, b: FilterSuggestion) => {
      const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    };

    return [
      ...characterSuggestions.sort(byPrefixAndName).slice(0, 6),
      ...weaponSuggestions.sort(byPrefixAndName).slice(0, 6),
    ];
  }, [characterIds, characters, entityQuery, t, weaponIds, weaponList]);

  const setOptions = useMemo<SetOption[]>(() => (
    fetters
      .map((entry) => ({
        id: entry.id,
        name: t(entry.name),
        pieceCount: entry.pieceCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  ), [fetters, t]);

  const effectivePendingSetId = pendingSetId ?? setOptions[0]?.id ?? null;

  const pendingSetPieceCounts = useMemo<number[]>(() => {
    if (effectivePendingSetId === null) return [2, 5];
    const setOption = setOptions.find((entry) => entry.id === effectivePendingSetId);
    if (!setOption) return [2, 5];
    return setOption.pieceCount === 3 ? [3] : [2, 5];
  }, [effectivePendingSetId, setOptions]);

  const effectivePendingSetCount = pendingSetPieceCounts.includes(pendingSetCount)
    ? pendingSetCount
    : (pendingSetPieceCounts[0] ?? 2);

  const selectedSetEntries = useMemo<SelectedSetEntry[]>(() => (
    echoSets.map((entry) => {
      const setOption = setOptions.find((setItem) => setItem.id === entry.setId);
      return {
        ...entry,
        name: setOption?.name ?? `Set ${entry.setId}`,
      };
    })
  ), [echoSets, setOptions]);

  const selectedMainEntries = useMemo<SelectedMainEntry[]>(() => (
    echoMains.map((entry) => {
      const statLabel = MAIN_STAT_OPTIONS.find((opt) => opt.code === entry.statType)?.label ?? entry.statType;
      return {
        ...entry,
        label: statLabel,
      };
    })
  ), [echoMains]);

  const hasActiveFilters = (
    characterIds.length > 0 ||
    weaponIds.length > 0 ||
    regionPrefixes.length > 0 ||
    username.trim().length > 0 ||
    uid.trim().length > 0 ||
    echoSets.length > 0 ||
    echoMains.length > 0
  );

  useEffect(() => {
    const nextUsername = usernameInput.trim();
    if (nextUsername === username) return;
    const timeout = setTimeout(() => {
      setUsername(nextUsername);
      setPage(DEFAULT_PAGE);
    }, IDENTITY_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [usernameInput, username]);

  useEffect(() => {
    const nextUid = uidInput.trim();
    if (nextUid === uid) return;
    const timeout = setTimeout(() => {
      setUid(nextUid);
      setPage(DEFAULT_PAGE);
    }, IDENTITY_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [uidInput, uid]);

  const querySnapshot = useMemo<QuerySnapshot>(() => ({
    page,
    sort,
    direction,
    characterIds,
    weaponIds,
    regionPrefixes,
    username,
    uid,
    echoSets,
    echoMains,
  }), [characterIds, direction, echoMains, echoSets, page, regionPrefixes, sort, uid, username, weaponIds]);

  useEffect(() => {
    const current = searchParams.toString();
    const next = serializeQuery(querySnapshot);
    if (current !== next) {
      router.replace(next ? `/builds?${next}` : '/builds', { scroll: false });
    }
  }, [querySnapshot, router, searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setIsLoading(true);
      setIsRefreshing(true);
      setError(null);
    });

    listBuilds({
      page: querySnapshot.page,
      pageSize: ITEMS_PER_PAGE,
      sort: querySnapshot.sort,
      direction: querySnapshot.direction,
      characterIds: querySnapshot.characterIds,
      weaponIds: querySnapshot.weaponIds,
      regionPrefixes: querySnapshot.regionPrefixes,
      username: querySnapshot.username || undefined,
      uid: querySnapshot.uid || undefined,
      echoSets: querySnapshot.echoSets,
      echoMains: querySnapshot.echoMains,
    }, controller.signal)
      .then((response) => {
        if (!active) return;
        const nextPageCount = Math.max(1, Math.ceil(response.total / ITEMS_PER_PAGE));
        if (querySnapshot.page > nextPageCount) {
          setPage(nextPageCount);
        }
        setBuilds(response.builds);
        setTotal(response.total);
        setExpandedBuildIds(new Set());
      })
      .catch((fetchError) => {
        if (!active || controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load builds.');
        setBuilds([]);
        setTotal(0);
      })
      .finally(() => {
        if (!active) return;
        setIsRefreshing(false);
        setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [querySnapshot]);

  const pageCount = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const handleAddSuggestion = useCallback((entry: FilterSuggestion) => {
    if (entry.type === 'character') {
      setCharacterIds((prev) => (prev.includes(entry.id) ? prev : [...prev, entry.id]));
    } else {
      setWeaponIds((prev) => (prev.includes(entry.id) ? prev : [...prev, entry.id]));
    }
    setEntityQuery('');
    setPage(1);
  }, []);

  const toggleRegion = useCallback((regionPrefix: string) => {
    setRegionPrefixes((prev) => (
      prev.includes(regionPrefix)
        ? prev.filter((entry) => entry !== regionPrefix)
        : [...prev, regionPrefix]
    ));
    setPage(1);
  }, []);

  const handleAddSetFilter = useCallback(() => {
    if (effectivePendingSetId === null) return;
    setEchoSets((prev) => {
      if (prev.some((entry) => entry.setId === effectivePendingSetId && entry.count === effectivePendingSetCount)) {
        return prev;
      }
      return [...prev, { count: effectivePendingSetCount, setId: effectivePendingSetId }];
    });
    setPage(1);
  }, [effectivePendingSetCount, effectivePendingSetId]);

  const handleAddMainFilter = useCallback(() => {
    const next: LBEchoMainFilter = { cost: pendingMainCost, statType: pendingMainStat };
    setEchoMains((prev) => {
      if (prev.some((entry) => entry.cost === next.cost && entry.statType === next.statType)) {
        return prev;
      }
      return [...prev, next];
    });
    setPage(1);
  }, [pendingMainCost, pendingMainStat]);

  const clearAllFilters = useCallback(() => {
    setCharacterIds([]);
    setWeaponIds([]);
    setRegionPrefixes([]);
    setUsername('');
    setUid('');
    setUsernameInput('');
    setUidInput('');
    setEchoSets([]);
    setEchoMains([]);
    setEntityQuery('');
    setPage(DEFAULT_PAGE);
  }, []);

  const rankStart = (page - 1) * ITEMS_PER_PAGE + 1;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1280px] space-y-4 p-3 md:p-5">
        <BuildsHeader />

        <BuildsFiltersPanel
          entityQuery={entityQuery}
          filterSuggestions={filterSuggestions}
          selectedCharacters={selectedCharacters}
          selectedWeapons={selectedWeapons}
          sort={sort}
          direction={direction}
          usernameInput={usernameInput}
          uidInput={uidInput}
          regionPrefixes={regionPrefixes}
          setOptions={setOptions}
          effectivePendingSetId={effectivePendingSetId}
          effectivePendingSetCount={effectivePendingSetCount}
          pendingSetPieceCounts={pendingSetPieceCounts}
          selectedSetEntries={selectedSetEntries}
          pendingMainCost={pendingMainCost}
          pendingMainStat={pendingMainStat}
          selectedMainEntries={selectedMainEntries}
          hasActiveFilters={hasActiveFilters}
          activeSortLabel={getSortLabel(sort)}
          onEntityQueryChange={setEntityQuery}
          onAddSuggestion={handleAddSuggestion}
          onRemoveCharacter={(id) => {
            setCharacterIds((prev) => prev.filter((entry) => entry !== id));
            setPage(1);
          }}
          onRemoveWeapon={(id) => {
            setWeaponIds((prev) => prev.filter((entry) => entry !== id));
            setPage(1);
          }}
          onSortChange={(nextSort) => {
            setSort(nextSort);
            setPage(1);
          }}
          onToggleDirection={() => {
            setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            setPage(1);
          }}
          onUsernameInputChange={setUsernameInput}
          onUidInputChange={setUidInput}
          onToggleRegion={toggleRegion}
          onPendingSetIdChange={setPendingSetId}
          onPendingSetCountChange={setPendingSetCount}
          onAddSetFilter={handleAddSetFilter}
          onRemoveSetEntry={(index) => {
            setEchoSets((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
            setPage(1);
          }}
          onPendingMainCostChange={setPendingMainCost}
          onPendingMainStatChange={setPendingMainStat}
          onAddMainFilter={handleAddMainFilter}
          onRemoveMainEntry={(index) => {
            setEchoMains((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
            setPage(1);
          }}
          onClearAllFilters={clearAllFilters}
        />

        <BuildsResultsPanel
          builds={builds}
          total={total}
          page={page}
          pageCount={pageCount}
          rankStart={rankStart}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          expandedBuildIds={expandedBuildIds}
          onToggleExpanded={(buildId) => {
            setExpandedBuildIds((prev) => {
              const next = new Set(prev);
              if (next.has(buildId)) next.delete(buildId);
              else next.add(buildId);
              return next;
            });
          }}
          onPageChange={setPage}
        />

        {gameDataLoading && (
          <div className="rounded-lg border border-border bg-background p-3 text-sm text-text-primary/70">
            Loading character/weapon metadata...
          </div>
        )}
      </div>
    </main>
  );
};

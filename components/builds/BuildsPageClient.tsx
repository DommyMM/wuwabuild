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
import {
  DEFAULT_PAGE,
  ITEMS_PER_PAGE,
  MAIN_STAT_OPTIONS,
} from './buildsConstants';
import { getSortLabel } from './buildsFormatters';
import { parseInitialQuery, serializeQuery } from './buildsQuery';
import { BuildsFiltersPanel } from './BuildsFiltersPanel';
import { BuildsHeader } from './BuildsHeader';
import { BuildsResultsPanel } from './BuildsResultsPanel';
import {
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
  const [echoSets, setEchoSets] = useState<LBEchoSetFilter[]>(() => initialQuery.echoSets);
  const [echoMains, setEchoMains] = useState<LBEchoMainFilter[]>(() => initialQuery.echoMains);
  const [filterQuery, setFilterQuery] = useState('');

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
      const setOption = setOptions.find((setItem) => setItem.id === entry.setId);
      return {
        ...entry,
        name: setOption?.name ?? `Set ${entry.setId}`,
        icon: setOption?.icon ?? '',
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

  const addCharacter = useCallback((characterId: string) => {
    setCharacterIds((prev) => (prev.includes(characterId) ? prev : [...prev, characterId]));
    setPage(1);
  }, []);

  const addWeapon = useCallback((weaponId: string) => {
    setWeaponIds((prev) => (prev.includes(weaponId) ? prev : [...prev, weaponId]));
    setPage(1);
  }, []);

  const addRegion = useCallback((regionPrefix: string) => {
    setRegionPrefixes((prev) => (prev.includes(regionPrefix) ? prev : [...prev, regionPrefix]));
    setPage(1);
  }, []);

  const addSetFilter = useCallback((setId: number, count: number) => {
    setEchoSets((prev) => {
      if (prev.some((entry) => entry.setId === setId && entry.count === count)) {
        return prev;
      }
      return [...prev, { setId, count }];
    });
    setPage(1);
  }, []);

  const addMainFilter = useCallback((cost: number, statType: string) => {
    setEchoMains((prev) => {
      if (prev.some((entry) => entry.cost === cost && entry.statType === statType)) {
        return prev;
      }
      return [...prev, { cost, statType }];
    });
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setCharacterIds([]);
    setWeaponIds([]);
    setRegionPrefixes([]);
    setUsername('');
    setUid('');
    setEchoSets([]);
    setEchoMains([]);
    setFilterQuery('');
    setPage(DEFAULT_PAGE);
}, []);

  const rankStart = (page - 1) * ITEMS_PER_PAGE + 1;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1280px] space-y-4 p-3 md:p-5">
        <BuildsHeader />

        <BuildsFiltersPanel
          sort={sort}
          direction={direction}
          activeSortLabel={getSortLabel(sort)}
          hasActiveFilters={hasActiveFilters}
          filterQuery={filterQuery}
          characters={characters}
          weaponList={weaponList}
          selectedCharacters={selectedCharacters}
          selectedWeapons={selectedWeapons}
          regionPrefixes={regionPrefixes}
          selectedSetEntries={selectedSetEntries}
          selectedMainEntries={selectedMainEntries}
          username={username}
          uid={uid}
          setOptions={setOptions}
          onFilterQueryChange={setFilterQuery}
          onSortChange={(nextSort) => {
            setSort(nextSort);
            setPage(1);
          }}
          onToggleDirection={() => {
            setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            setPage(1);
          }}
          onAddCharacter={addCharacter}
          onAddWeapon={addWeapon}
          onAddRegion={addRegion}
          onAddSet={addSetFilter}
          onAddMain={addMainFilter}
          onSetUsername={(value) => {
            setUsername(value.trim());
            setPage(1);
          }}
          onSetUid={(value) => {
            setUid(value.trim());
            setPage(1);
          }}
          onRemoveCharacter={(id) => {
            setCharacterIds((prev) => prev.filter((entry) => entry !== id));
            setPage(1);
          }}
          onRemoveWeapon={(id) => {
            setWeaponIds((prev) => prev.filter((entry) => entry !== id));
            setPage(1);
          }}
          onRemoveRegion={(value) => {
            setRegionPrefixes((prev) => prev.filter((entry) => entry !== value));
            setPage(1);
          }}
          onRemoveSetEntry={(index) => {
            setEchoSets((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
            setPage(1);
          }}
          onRemoveMainEntry={(index) => {
            setEchoMains((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
            setPage(1);
          }}
          onClearUsername={() => {
            setUsername('');
            setPage(1);
          }}
          onClearUid={() => {
            setUid('');
            setPage(1);
          }}
          onBackspaceRemove={() => {
            if (uid) {
              setUid('');
              setPage(1);
              return;
            }
            if (username) {
              setUsername('');
              setPage(1);
              return;
            }
            if (echoMains.length > 0) {
              setEchoMains((prev) => prev.slice(0, -1));
              setPage(1);
              return;
            }
            if (echoSets.length > 0) {
              setEchoSets((prev) => prev.slice(0, -1));
              setPage(1);
              return;
            }
            if (weaponIds.length > 0) {
              setWeaponIds((prev) => prev.slice(0, -1));
              setPage(1);
              return;
            }
            if (characterIds.length > 0) {
              setCharacterIds((prev) => prev.slice(0, -1));
              setPage(1);
              return;
            }
            if (regionPrefixes.length > 0) {
              setRegionPrefixes((prev) => prev.slice(0, -1));
              setPage(1);
            }
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

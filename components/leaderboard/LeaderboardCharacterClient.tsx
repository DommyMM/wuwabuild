'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import {
  LBBuildDetailEntry,
  LBEchoMainFilter,
  LBEchoSetFilter,
  LBLeaderboardEntry,
  LBSortDirection,
  listLeaderboard,
} from '@/lib/lb';
import { clampItemsPerPage, ITEMS_PER_PAGE, MAIN_STAT_OPTIONS, MAX_ITEMS_PER_PAGE } from '@/components/build/buildConstants';
import { BuildFiltersPanel } from '@/components/build/BuildFiltersPanel';
import { SelectedMainEntry, SelectedSetEntry, SetOption } from '@/components/build/types';
import { DEFAULT_LB_SEQUENCE, DEFAULT_LB_SORT } from './leaderboardConstants';
import { LeaderboardResultsPanel } from './LeaderboardResultsPanel';

interface LeaderboardCharacterClientProps {
  characterId: string;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseEchoSetCSV(value: string | null): LBEchoSetFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const [countRaw, idRaw] = entry.split('~');
      const count = Number.parseInt(countRaw ?? '', 10);
      const setId = Number.parseInt(idRaw ?? '', 10);
      if (!Number.isFinite(count) || !Number.isFinite(setId)) return null;
      return { count, setId };
    })
    .filter((entry): entry is LBEchoSetFilter => entry !== null);
}

const MAIN_STAT_LABEL_BY_CODE = new Map<string, string>(MAIN_STAT_OPTIONS.map((entry) => [entry.code, entry.label]));

function parseEchoMainCSV(value: string | null): LBEchoMainFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const [costRaw, statType] = entry.split('~');
      const cost = Number.parseInt(costRaw ?? '', 10);
      if (!Number.isFinite(cost) || !statType) return null;
      return { cost, statType: MAIN_STAT_LABEL_BY_CODE.get(statType) ?? statType };
    })
    .filter((entry): entry is LBEchoMainFilter => entry !== null);
}

export const LeaderboardCharacterClient: React.FC<LeaderboardCharacterClientProps> = ({ characterId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { characters, fetters, loading: gameDataLoading } = useGameData();
  const { t } = useLanguage();

  const [configWeaponIds, setConfigWeaponIds] = useState<string[]>([]);
  const [configSequences, setConfigSequences] = useState<string[]>(['s0']);

  // --- State (initialized from URL) ---
  const [page, setPage] = useState(() => parsePositiveInt(searchParams.get('page'), 1));
  const [pageSize, setPageSize] = useState(() => clampItemsPerPage(parsePositiveInt(searchParams.get('size') ?? searchParams.get('pageSize'), ITEMS_PER_PAGE)));
  const [sort, setSort] = useState(() => searchParams.get('sort') ?? DEFAULT_LB_SORT);
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

  // --- Data state ---
  const [entries, setEntries] = useState<LBLeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailById, setDetailById] = useState<Record<string, LBBuildDetailEntry>>({});
  const [detailLoadingById, setDetailLoadingById] = useState<Record<string, boolean>>({});
  const [detailErrorById, setDetailErrorById] = useState<Record<string, string | null>>({});

  // --- URL sync ---
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== ITEMS_PER_PAGE) params.set('size', String(pageSize));
    if (sort !== DEFAULT_LB_SORT) params.set('sort', sort);
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

  // --- Weapon IDs derived from selected tab ---
  const weaponIds = useMemo<string[]>(() => {
    const weaponId = configWeaponIds[weaponIndex];
    return weaponId ? [weaponId] : [];
  }, [configWeaponIds, weaponIndex]);

  // --- Query key for effect dependency ---
  const queryKey = useMemo(() => JSON.stringify({
    characterId, page, pageSize, sort, direction, weaponIndex, sequence, uid, username, regionPrefixes, echoSets, echoMains,
  }), [characterId, direction, echoMains, echoSets, page, pageSize, regionPrefixes, sequence, sort, uid, username, weaponIndex]);

  // --- Fetch leaderboard data ---
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setIsRefreshing(entries.length > 0);
    setError(null);

    listLeaderboard(
      characterId,
      {
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
      },
      controller.signal,
    )
      .then((response) => {
        if (!active) return;
        const nextPageCount = Math.max(1, Math.ceil(response.total / pageSize));
        if (page > nextPageCount) setPage(nextPageCount);
        setEntries(response.builds);
        setTotal(response.total);
        if (response.weaponIds.length > 0) setConfigWeaponIds(response.weaponIds);
        if (response.sequences.length > 0) setConfigSequences(response.sequences);
      })
      .catch((fetchError) => {
        if (!active || controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load leaderboard.');
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
        setIsRefreshing(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  // --- Expand / detail ---
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleRetryDetail = useCallback((id: string) => {
    // Leaderboard entries carry buildState directly — no separate detail fetch needed.
    // Clear any error so the expanded view re-renders cleanly.
    setDetailErrorById((prev) => ({ ...prev, [id]: null }));
  }, []);

  // --- Filter helpers ---
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

  // --- Computed ---
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
    <div className="scrollbar-thin min-h-screen bg-background [--scrollbar-height:2px] [--scrollbar-width:6px]">
      <div className="mx-auto w-full max-w-360 space-y-4 p-3 md:p-5">
        {/* Character header */}
        <section className="relative overflow-hidden rounded-xl border border-border bg-background-secondary px-4 py-3">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_58%)]" />
          <div className="relative flex items-center gap-4">
            {character?.head && (
              <img src={character.head} alt={characterName} className="h-14 w-14 rounded-full object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link href="/leaderboards" className="text-xs text-text-primary/50 hover:text-accent transition-colors">
                  Leaderboards
                </Link>
                <span className="text-text-primary/30">/</span>
                <span className="text-xs text-text-primary/70">{characterName}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <h1 className="text-2xl font-bold text-text-primary">{characterName}</h1>
                {character?.elementIcon && (
                  <img src={character.elementIcon} alt={character.element ?? ''} className="h-6 w-6 object-contain" />
                )}
              </div>
              <div className="text-xs text-text-primary/50 mt-0.5">
                {total > 0 ? `${total.toLocaleString()} ranked builds` : 'No ranked builds yet'}
              </div>
            </div>
          </div>
        </section>

        {/* Tabs + Filters */}
        <section className="relative overflow-hidden rounded-xl border border-border bg-background-secondary px-4 py-3">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_58%)]" />
          <div className="relative space-y-3">
            {/* Weapon tabs */}
            <WeaponTabs
              characterId={characterId}
              weaponIds={configWeaponIds}
              weaponIndex={weaponIndex}
              onSelect={(idx) => {
                setWeaponIndex(idx);
                setPage(1);
              }}
            />

            {/* Sequence tabs */}
            {configSequences.length > 1 && (
              <SequenceTabs
                sequences={configSequences}
                activeSequence={sequence}
                onSelect={(seq) => {
                  setSequence(seq);
                  setPage(1);
                }}
              />
            )}

            {/* Filters */}
            <div className="border-t border-border/65 pt-3">
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
                onToggleDirection={() => {
                  setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  setPage(1);
                }}
                onAddCharacter={() => {}}
                onAddWeapon={() => {}}
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
                onRemoveCharacter={() => {}}
                onRemoveWeapon={() => {}}
                onRemoveRegion={(value) => {
                  setRegionPrefixes((prev) => prev.filter((r) => r !== value));
                  setPage(1);
                }}
                onRemoveSetEntry={(index) => {
                  setEchoSets((prev) => prev.filter((_, i) => i !== index));
                  setPage(1);
                }}
                onRemoveMainEntry={(index) => {
                  setEchoMains((prev) => prev.filter((_, i) => i !== index));
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
                  if (uid) { setUid(''); setPage(1); return; }
                  if (username) { setUsername(''); setPage(1); return; }
                  if (echoMains.length > 0) { setEchoMains((prev) => prev.slice(0, -1)); setPage(1); return; }
                  if (echoSets.length > 0) { setEchoSets((prev) => prev.slice(0, -1)); setPage(1); return; }
                  if (regionPrefixes.length > 0) { setRegionPrefixes((prev) => prev.slice(0, -1)); setPage(1); }
                }}
                onClearAllFilters={clearAllFilters}
                onPageSizeChange={(value) => {
                  setPageSize(clampItemsPerPage(value));
                  setPage(1);
                }}
              />
            </div>
          </div>
        </section>

        {/* Results */}
        <section>
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
            onSortChange={(nextSort) => {
              setSort(nextSort);
              setPage(1);
            }}
            onToggleDirection={() => {
              setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              setPage(1);
            }}
            onPageChange={setPage}
            onToggleExpand={handleToggleExpand}
            onRetryDetail={handleRetryDetail}
          />
        </section>

        {gameDataLoading && (
          <div className="rounded-lg border border-border bg-background p-3 text-sm text-text-primary/70">
            Loading character/weapon metadata...
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Weapon tabs sub-component ────────────────────────────────────────────────

interface WeaponTabsProps {
  characterId: string;
  weaponIds: string[];
  weaponIndex: number;
  onSelect: (index: number) => void;
}

const WeaponTabs: React.FC<WeaponTabsProps> = ({ weaponIds, weaponIndex, onSelect }) => {
  const { getWeapon } = useGameData();
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap gap-1.5">
      {weaponIds.map((weaponId, index) => {
        const weapon = getWeapon(weaponId);
        const label = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;
        const isActive = index === weaponIndex;
        return (
          <button
            key={weaponId}
            type="button"
            onClick={() => onSelect(index)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all cursor-pointer ${
              isActive
                ? 'border-accent/70 bg-accent/15 text-accent'
                : 'border-border bg-background text-text-primary/70 hover:border-accent/40 hover:text-text-primary'
            }`}
          >
            {weapon?.iconUrl?.trim() && (
              <img src={weapon.iconUrl} alt="" className="h-5 w-5 object-contain" />
            )}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Sequence tabs sub-component ──────────────────────────────────────────────

interface SequenceTabsProps {
  sequences: string[];
  activeSequence: string;
  onSelect: (seq: string) => void;
}

const SequenceTabs: React.FC<SequenceTabsProps> = ({ sequences, activeSequence, onSelect }) => (
  <div className="flex gap-1.5">
    {sequences.map((seq) => {
      const isActive = seq === activeSequence;
      return (
        <button
          key={seq}
          type="button"
          onClick={() => onSelect(seq)}
          className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all cursor-pointer uppercase tracking-wide ${
            isActive
              ? 'border-accent/70 bg-accent/15 text-accent'
              : 'border-border bg-background text-text-primary/60 hover:border-accent/40 hover:text-text-primary'
          }`}
        >
          {seq}
        </button>
      );
    })}
  </div>
);

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LBBuildEntry,
  LBEchoMainFilter,
  LBEchoSetFilter,
  LBSortDirection,
  LBSortKey,
  LB_STAT_ENTRIES,
  listBuilds,
} from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { ElementType } from '@/lib/echo';

const ITEMS_PER_PAGE = 10;

const REGION_OPTIONS = [
  { label: 'America', value: '5' },
  { label: 'Europe', value: '6' },
  { label: 'Asia', value: '7' },
  { label: 'SEA', value: '9' },
  { label: 'HMT', value: '1' },
] as const;

const MAIN_STAT_OPTIONS = [
  { code: 'CR', label: 'Crit Rate' },
  { code: 'CD', label: 'Crit DMG' },
  { code: 'A%', label: 'ATK%' },
  { code: 'H%', label: 'HP%' },
  { code: 'D%', label: 'DEF%' },
  { code: 'ER', label: 'Energy Regen' },
  { code: 'AD', label: 'Aero DMG' },
  { code: 'GD', label: 'Glacio DMG' },
  { code: 'FD', label: 'Fusion DMG' },
  { code: 'ED', label: 'Electro DMG' },
  { code: 'HD', label: 'Havoc DMG' },
  { code: 'SD', label: 'Spectro DMG' },
  { code: 'HB', label: 'Healing Bonus' },
] as const;

const SORT_OPTIONS: Array<{ key: LBSortKey; label: string }> = [
  { key: 'finalCV', label: 'Crit Value' },
  { key: 'timestamp', label: 'Date' },
  { key: 'CR', label: 'Crit Rate' },
  { key: 'CD', label: 'Crit DMG' },
  { key: 'A', label: 'ATK' },
  { key: 'H', label: 'HP' },
  { key: 'D', label: 'DEF' },
  { key: 'ER', label: 'Energy Regen' },
  { key: 'BA', label: 'Basic Attack DMG Bonus' },
  { key: 'HA', label: 'Heavy Attack DMG Bonus' },
  { key: 'RS', label: 'Resonance Skill DMG Bonus' },
  { key: 'RL', label: 'Resonance Liberation DMG Bonus' },
  { key: 'AD', label: 'Aero DMG' },
  { key: 'GD', label: 'Glacio DMG' },
  { key: 'FD', label: 'Fusion DMG' },
  { key: 'ED', label: 'Electro DMG' },
  { key: 'HD', label: 'Havoc DMG' },
  { key: 'SD', label: 'Spectro DMG' },
];

type FilterSuggestion = {
  type: 'character' | 'weapon';
  id: string;
  name: string;
  icon: string;
};

type QuerySnapshot = {
  page: number;
  sort: LBSortKey;
  direction: LBSortDirection;
  characterIds: string[];
  weaponIds: string[];
  regionPrefixes: string[];
  username: string;
  uid: string;
  echoSets: LBEchoSetFilter[];
  echoMains: LBEchoMainFilter[];
};

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCSV(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
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

function parseEchoMainCSV(value: string | null): LBEchoMainFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const [costRaw, statType] = entry.split('~');
      const cost = Number.parseInt(costRaw ?? '', 10);
      if (!Number.isFinite(cost) || !statType) return null;
      return { cost, statType };
    })
    .filter((entry): entry is LBEchoMainFilter => entry !== null);
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFlatStat(value: number): string {
  return Number(value).toFixed(0);
}

function formatPercentStat(value: number): string {
  return `${Number(value).toFixed(1).replace(/\.0$/, '')}%`;
}

function getElementDMGLabel(code: string): string {
  const stat = LB_STAT_ENTRIES.find((entry) => entry.code === code);
  return stat?.label ?? code;
}

function getSortLabel(key: LBSortKey): string {
  return SORT_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

function parseInitialQuery(searchParams: URLSearchParams): QuerySnapshot {
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const sort = (searchParams.get('sort') ?? 'finalCV') as LBSortKey;
  const direction = (searchParams.get('direction') ?? 'desc') as LBSortDirection;

  return {
    page,
    sort,
    direction: direction === 'asc' ? 'asc' : 'desc',
    characterIds: parseCSV(searchParams.get('characters')),
    weaponIds: parseCSV(searchParams.get('weapons')),
    regionPrefixes: parseCSV(searchParams.get('regions')),
    username: searchParams.get('username') ?? '',
    uid: searchParams.get('uid') ?? '',
    echoSets: parseEchoSetCSV(searchParams.get('sets')),
    echoMains: parseEchoMainCSV(searchParams.get('mains')),
  };
}

function serializeQuery(snapshot: QuerySnapshot): string {
  const params = new URLSearchParams();
  params.set('page', String(snapshot.page));
  params.set('sort', snapshot.sort);
  params.set('direction', snapshot.direction);
  if (snapshot.characterIds.length) params.set('characters', snapshot.characterIds.join(','));
  if (snapshot.weaponIds.length) params.set('weapons', snapshot.weaponIds.join(','));
  if (snapshot.regionPrefixes.length) params.set('regions', snapshot.regionPrefixes.join(','));
  if (snapshot.username) params.set('username', snapshot.username);
  if (snapshot.uid) params.set('uid', snapshot.uid);
  if (snapshot.echoSets.length) {
    params.set('sets', snapshot.echoSets.map((entry) => `${entry.count}~${entry.setId}`).join('.'));
  }
  if (snapshot.echoMains.length) {
    params.set('mains', snapshot.echoMains.map((entry) => `${entry.cost}~${entry.statType}`).join('.'));
  }
  return params.toString();
}

const BuildsEntryCard: React.FC<{
  entry: LBBuildEntry;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}> = ({ entry, rank, expanded, onToggle }) => {
  const { getCharacter, getWeapon, getEcho, getFetterByElement } = useGameData();
  const { t } = useLanguage();

  const character = getCharacter(entry.state.characterId);
  const weapon = getWeapon(entry.state.weaponId);
  const characterName = character
    ? t(character.nameI18n ?? { en: character.name })
    : entry.state.characterId || 'Unknown Character';
  const weaponName = weapon
    ? t(weapon.nameI18n ?? { en: weapon.name })
    : entry.state.weaponId || 'Unknown Weapon';

  const setSummaries = useMemo(() => {
    const counts = new Map<ElementType, number>();
    for (const panel of entry.state.echoPanels) {
      if (!panel.id) continue;
      const echo = getEcho(panel.id);
      const element = panel.selectedElement ?? echo?.elements?.[0];
      if (!element) continue;
      counts.set(element, (counts.get(element) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([element, count]) => {
        const fetter = getFetterByElement(element);
        const threshold = fetter?.pieceCount ?? 2;
        return {
          element,
          count,
          threshold,
          icon: fetter?.icon ?? '',
          label: fetter ? t(fetter.name) : element,
          active: count >= threshold,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [entry.state.echoPanels, getEcho, getFetterByElement, t]);

  const critRate = entry.stats.CR;
  const critDmg = entry.stats.CD;
  const elementStats: Array<{ code: string; value: number }> = [
    { code: 'AD', value: entry.stats.AD },
    { code: 'GD', value: entry.stats.GD },
    { code: 'FD', value: entry.stats.FD },
    { code: 'ED', value: entry.stats.ED },
    { code: 'HD', value: entry.stats.HD },
    { code: 'SD', value: entry.stats.SD },
  ];
  const highestElement = elementStats.reduce(
    (best, curr) => (curr.value > best.value ? curr : best),
    { code: 'AD', value: 0 },
  );
  const moveBonusStats: Array<{ code: string; value: number }> = [
    { code: 'BA', value: entry.stats.BA },
    { code: 'HA', value: entry.stats.HA },
    { code: 'RS', value: entry.stats.RS },
    { code: 'RL', value: entry.stats.RL },
  ];
  const highestMoveBonus = moveBonusStats.reduce(
    (best, curr) => (curr.value > best.value ? curr : best),
    { code: 'BA', value: 0 },
  );

  return (
    <div className="rounded-lg border border-border bg-background-secondary p-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="grid grid-cols-[auto_1fr] items-start gap-3 sm:grid-cols-[auto_1fr_auto]">
          <div className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-text-primary">
            #{rank}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text-primary">
              {characterName}
            </div>
            <div className="mt-0.5 text-xs text-text-primary/70">
              {weaponName} · S{entry.state.sequence} · R{entry.state.weaponRank}
            </div>
            <div className="mt-0.5 text-xs text-text-primary/55">
              {entry.state.watermark.username || 'Anonymous'} · UID {entry.state.watermark.uid || '—'}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 sm:mt-0">
            <span className="rounded-md bg-accent/15 px-2 py-1 text-xs font-semibold text-accent">
              {entry.cv.toFixed(1)} CV
            </span>
            <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary/75">
              {formatTimestamp(entry.timestamp)}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-text-primary/60 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-primary sm:grid-cols-5">
          <div className="rounded border border-border bg-background px-2 py-1">
            CR/CD: {formatPercentStat(critRate)} / {formatPercentStat(critDmg)}
          </div>
          <div className="rounded border border-border bg-background px-2 py-1">
            ATK: {formatFlatStat(entry.stats.A)}
          </div>
          <div className="rounded border border-border bg-background px-2 py-1">
            HP: {formatFlatStat(entry.stats.H)}
          </div>
          <div className="rounded border border-border bg-background px-2 py-1">
            ER: {formatPercentStat(entry.stats.ER)}
          </div>
          <div className="rounded border border-border bg-background px-2 py-1">
            {getElementDMGLabel(highestElement.code)}: {formatPercentStat(highestElement.value)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {setSummaries.filter((summary) => summary.active).map((summary) => (
            <span
              key={summary.element}
              className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent"
            >
              {summary.icon && (
                <img src={summary.icon} alt="" className="h-3.5 w-3.5 object-contain" />
              )}
              {summary.label} {summary.count}pc
            </span>
          ))}
          {setSummaries.filter((summary) => summary.active).length === 0 && (
            <span className="text-xs text-text-primary/50">No active set bonus</span>
          )}
          <span className="ml-auto text-xs text-text-primary/55">
            Top move bonus: {getElementDMGLabel(highestMoveBonus.code)} {formatPercentStat(highestMoveBonus.value)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded border border-border bg-background-secondary p-2">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-text-primary/55">Character</div>
              <div className="flex items-center gap-2">
                {character?.head ? (
                  <img src={character.head} alt={characterName} className="h-11 w-11 rounded object-cover" />
                ) : (
                  <div className="h-11 w-11 rounded bg-border" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text-primary">{characterName}</div>
                  <div className="text-xs text-text-primary/70">Lv.{entry.state.characterLevel}</div>
                </div>
              </div>
            </div>
            <div className="rounded border border-border bg-background-secondary p-2">
              <div className="mb-2 text-[11px] uppercase tracking-wide text-text-primary/55">Weapon</div>
              <div className="flex items-center gap-2">
                {weapon ? (
                  <img src={getWeaponPaths(weapon)} alt={weaponName} className="h-11 w-11 object-contain" />
                ) : (
                  <div className="h-11 w-11 rounded bg-border" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text-primary">{weaponName}</div>
                  <div className="text-xs text-text-primary/70">Lv.{entry.state.weaponLevel} · R{entry.state.weaponRank}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded border border-border bg-background-secondary p-2">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-text-primary/55">Echoes</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
              {entry.state.echoPanels.map((panel, index) => {
                const echo = panel.id ? getEcho(panel.id) : null;
                const echoName = echo ? t(echo.nameI18n ?? { en: echo.name }) : 'Empty Slot';
                const selectedSet = panel.selectedElement ?? echo?.elements?.[0];
                const setIcon = selectedSet ? getFetterByElement(selectedSet)?.icon ?? '' : '';
                return (
                  <div key={`${panel.id ?? 'empty'}-${index}`} className="rounded border border-border bg-background p-2 text-xs">
                    {echo ? (
                      <>
                        <div className="mb-1 flex items-center gap-2">
                          <img src={getEchoPaths(echo, panel.phantom)} alt={echoName} className="h-7 w-7 rounded object-contain" />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-text-primary">{echoName}</div>
                            <div className="text-[10px] text-text-primary/60">Lv.{panel.level}</div>
                          </div>
                        </div>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          {setIcon ? <img src={setIcon} alt="" className="h-3.5 w-3.5 object-contain" /> : <span />}
                          {panel.stats.mainStat.type && (
                            <span className="truncate text-accent">
                              {panel.stats.mainStat.type} {panel.stats.mainStat.value}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {panel.stats.subStats
                            .filter((sub) => sub.type && sub.value !== null)
                            .map((sub, subIndex) => (
                              <div key={subIndex} className="flex justify-between gap-1 text-[10px] text-text-primary/70">
                                <span className="truncate">{sub.type}</span>
                                <span>{sub.value}</span>
                              </div>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex min-h-20 items-center justify-center text-text-primary/40">Empty Slot</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [username, setUsername] = useState<string>(() => initialQuery.username);
  const [uid, setUid] = useState<string>(() => initialQuery.uid);
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

  const setOptions = useMemo(() => (
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

  const selectedSetEntries = useMemo(() => (
    echoSets.map((entry) => {
      const setOption = setOptions.find((setItem) => setItem.id === entry.setId);
      return {
        ...entry,
        name: setOption?.name ?? `Set ${entry.setId}`,
      };
    })
  ), [echoSets, setOptions]);

  const selectedMainEntries = useMemo(() => (
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
    username: username.trim(),
    uid: uid.trim(),
    echoSets,
    echoMains,
  }), [characterIds, direction, echoMains, echoSets, page, regionPrefixes, sort, uid, username, weaponIds]);

  useEffect(() => {
    const current = searchParams.toString();
    const next = serializeQuery(querySnapshot);
    if (current !== next) {
      router.replace(`/builds?${next}`, { scroll: false });
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
    setEchoSets([]);
    setEchoMains([]);
    setEntityQuery('');
    setPage(1);
  }, []);

  const rankStart = (page - 1) * ITEMS_PER_PAGE + 1;

  return (
    <main className="mx-auto w-full max-w-[1440px] p-3 md:p-4">
      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-background-secondary p-4">
          <h1 className="text-xl font-semibold text-text-primary md:text-2xl">Global Builds</h1>
          <p className="mt-1 text-sm text-text-primary/70">
            Browse uploaded builds from the leaderboard service. Filters map directly to backend query params for
            `/build`, and entries are normalized to rewrite SavedState before rendering.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-accent/35 bg-accent/10 px-2 py-1 text-xs text-text-primary/80">
            <AlertTriangle className="h-3.5 w-3.5 text-accent" />
            Results are point-in-time and depend on the active LB backend dataset.
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background-secondary p-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-primary/55">
                Character / Weapon
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-primary/45" />
                <input
                  value={entityQuery}
                  onChange={(event) => setEntityQuery(event.target.value)}
                  placeholder="Filter by character or weapon name"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-primary/40 focus:border-accent/60 focus:outline-none"
                />
                {entityQuery.trim().length > 0 && filterSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-background p-1 shadow-lg">
                    {filterSuggestions.map((entry) => (
                      <button
                        key={`${entry.type}-${entry.id}`}
                        type="button"
                        onClick={() => handleAddSuggestion(entry)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-primary hover:bg-background-secondary"
                      >
                        {entry.icon ? (
                          <img src={entry.icon} alt="" className="h-5 w-5 rounded object-contain" />
                        ) : (
                          <div className="h-5 w-5 rounded bg-border" />
                        )}
                        <span className="truncate">{entry.name}</span>
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-text-primary/45">{entry.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(selectedCharacters.length > 0 || selectedWeapons.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedCharacters.map((entry) => (
                    <span
                      key={`char-${entry.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-text-primary"
                    >
                      {entry.head ? <img src={entry.head} alt="" className="h-4 w-4 rounded-full object-cover" /> : null}
                      <span>{t(entry.nameI18n ?? { en: entry.name })}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCharacterIds((prev) => prev.filter((id) => id !== entry.id));
                          setPage(1);
                        }}
                        className="text-text-primary/60 hover:text-text-primary"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {selectedWeapons.map((entry) => (
                    <span
                      key={`weapon-${entry.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"
                    >
                      <img src={getWeaponPaths(entry)} alt="" className="h-4 w-4 object-contain" />
                      <span>{t(entry.nameI18n ?? { en: entry.name })}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setWeaponIds((prev) => prev.filter((id) => id !== entry.id));
                          setPage(1);
                        }}
                        className="text-text-primary/60 hover:text-text-primary"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-primary/55">
                Sort / Identity
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as LBSortKey);
                    setPage(1);
                  }}
                  className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                    setPage(1);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary transition-colors hover:border-accent/60"
                >
                  {direction === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
                  {direction.toUpperCase()}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Username"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-primary/40 focus:border-accent/60 focus:outline-none"
                />
                <input
                  value={uid}
                  onChange={(event) => {
                    setUid(event.target.value);
                    setPage(1);
                  }}
                  placeholder="UID"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-primary/40 focus:border-accent/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-primary/55">Region</div>
              <div className="flex flex-wrap gap-2">
                {REGION_OPTIONS.map((entry) => {
                  const checked = regionPrefixes.includes(entry.value);
                  return (
                    <label
                      key={entry.value}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors ${
                        checked
                          ? 'border-accent/55 bg-accent/15 text-text-primary'
                          : 'border-border bg-background-secondary text-text-primary/75 hover:border-accent/45'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRegion(entry.value)}
                        className="accent-[rgb(var(--color-accent))]"
                      />
                      {entry.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-primary/55">
                Echo Set Filters
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_7rem_auto]">
                <select
                  value={effectivePendingSetId === null ? '' : String(effectivePendingSetId)}
                  onChange={(event) => setPendingSetId(event.target.value ? Number(event.target.value) : null)}
                  className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
                >
                  {setOptions.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
                </select>
                <select
                  value={effectivePendingSetCount}
                  onChange={(event) => setPendingSetCount(Number(event.target.value))}
                  className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
                >
                  {pendingSetPieceCounts.map((count) => (
                    <option key={count} value={count}>{count}pc</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSetFilter}
                  className="rounded-lg border border-accent/45 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                >
                  Add
                </button>
              </div>
              {selectedSetEntries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedSetEntries.map((entry, index) => (
                    <span
                      key={`${entry.count}-${entry.setId}-${index}`}
                      className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
                    >
                      {entry.name} {entry.count}pc
                      <button
                        type="button"
                        onClick={() => {
                          setEchoSets((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
                          setPage(1);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-primary/55">
                Echo Main Stat Filters
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_1fr_auto]">
                <select
                  value={pendingMainCost}
                  onChange={(event) => setPendingMainCost(Number(event.target.value))}
                  className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
                >
                  <option value={4}>4 Cost</option>
                  <option value={3}>3 Cost</option>
                  <option value={1}>1 Cost</option>
                </select>
                <select
                  value={pendingMainStat}
                  onChange={(event) => setPendingMainStat(event.target.value)}
                  className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
                >
                  {MAIN_STAT_OPTIONS.map((entry) => (
                    <option key={entry.code} value={entry.code}>{entry.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMainFilter}
                  className="rounded-lg border border-accent/45 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                >
                  Add
                </button>
              </div>
              {selectedMainEntries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedMainEntries.map((entry, index) => (
                    <span
                      key={`${entry.cost}-${entry.statType}-${index}`}
                      className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
                    >
                      {entry.cost}c {entry.label}
                      <button
                        type="button"
                        onClick={() => {
                          setEchoMains((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
                          setPage(1);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-text-primary/60">
              Active sort: <span className="font-medium text-text-primary">{getSortLabel(sort)}</span> ({direction})
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Clear All Filters
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background-secondary p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-text-primary">
              {isLoading ? 'Loading builds...' : `${total.toLocaleString()} build${total === 1 ? '' : 's'} found`}
            </div>
            <div className="text-xs text-text-primary/60">
              Page {page} / {pageCount} {isRefreshing ? '· refreshing…' : ''}
            </div>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-accent/45 bg-accent/10 p-3 text-sm text-text-primary">
              Failed to load leaderboard data: {error}
            </div>
          )}

          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-lg border border-border bg-background" />
              ))}
            </div>
          )}

          {!isLoading && !error && builds.length === 0 && (
            <div className="rounded-lg border border-border bg-background p-6 text-center text-sm text-text-primary/65">
              No builds match the current filters.
            </div>
          )}

          {!isLoading && !error && builds.length > 0 && (
            <div className="space-y-2">
              {builds.map((entry, index) => {
                const rank = rankStart + index;
                const expanded = expandedBuildIds.has(entry.id);
                return (
                  <BuildsEntryCard
                    key={entry.id}
                    entry={entry}
                    rank={rank}
                    expanded={expanded}
                    onToggle={() => {
                      setExpandedBuildIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(entry.id)) next.delete(entry.id);
                        else next.add(entry.id);
                        return next;
                      });
                    }}
                  />
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-text-primary/60">
              Showing {Math.min(total, rankStart)}-{Math.min(total, rankStart + Math.max(builds.length - 1, 0))} of {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="rounded border border-border bg-background p-1.5 text-text-primary transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronFirst className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded border border-border bg-background p-1.5 text-text-primary transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="mx-1 rounded border border-border bg-background px-2 py-1 text-xs text-text-primary">
                {page}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                disabled={page >= pageCount}
                className="rounded border border-border bg-background p-1.5 text-text-primary transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(pageCount)}
                disabled={page >= pageCount}
                className="rounded border border-border bg-background p-1.5 text-text-primary transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLast className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {gameDataLoading && (
          <div className="rounded-lg border border-border bg-background p-3 text-sm text-text-primary/70">
            Loading character/weapon metadata...
          </div>
        )}
      </div>
    </main>
  );
};

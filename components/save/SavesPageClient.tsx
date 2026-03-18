'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDownAZ, ArrowUpAZ, ChevronDown, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Download, Search, Upload, X } from 'lucide-react';
import { SavedBuild } from '@/lib/build';
import { clearAllBuilds, deleteBuild, exportAllBuilds, importBuild, loadBuilds, mergeBuilds, renameBuild, saveDraftBuild } from '@/lib/storage';
import { calculateCV } from '@/lib/calculations/rollValues';
import { BuildList } from './BuildList';
import { useToast } from '@/contexts/ToastContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWeaponPaths } from '@/lib/paths';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { buildLegacyIdMaps, clearLegacySavesFromStorage, convertLegacyBuilds, getLegacySavesSummaryFromStorage, readLegacySavesPayload } from '@/lib/legacyMigration';
import legacyEchoes from '@/lib/data/legacyEchoes.json';
import legacyWeapons from '@/lib/data/legacyWeapons.json';
import posthog from 'posthog-js';

type SortBy = 'date' | 'name' | 'cv';
type SortDirection = 'asc' | 'desc';
type FilterSuggestion = {
  type: 'character' | 'weapon';
  id: string;
  name: string;
  icon: string;
};

export const SavesPageClient: React.FC = () => {
  const router = useRouter();
  const { success, error: notifyError, warning } = useToast();
  const { characters, echoes, weaponList } = useGameData();
  const { t } = useLanguage();
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [legacySummary, setLegacySummary] = useState({
    found: false,
    buildCount: 0,
    parseError: false,
  });
  const [isLegacyMigrating, setIsLegacyMigrating] = useState(false);
  const [showLegacyDeleteConfirm, setShowLegacyDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityQuery, setEntityQuery] = useState('');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedWeaponIds, setSelectedWeaponIds] = useState<string[]>([]);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSorting, setIsSorting] = useState(false);
  const [deleteAllArmed, setDeleteAllArmed] = useState(false);
  const [pendingLoadBuild, setPendingLoadBuild] = useState<SavedBuild | null>(null);
  const [pendingDeleteBuild, setPendingDeleteBuild] = useState<SavedBuild | null>(null);
  const itemsPerPage = 10;
  const [hostname, setHostname] = useState<string | null>(null);
  const isLegacyDomain = hostname === 'wuwabuilds.moe' || hostname === 'www.wuwabuilds.moe';

  const refreshBuilds = useCallback(() => {
    const data = loadBuilds();
    setBuilds(data.builds);
  }, []);

  const refreshLegacySummary = useCallback(() => {
    setLegacySummary(getLegacySavesSummaryFromStorage());
  }, []);

  const legacyIdMaps = useMemo(
    () => buildLegacyIdMaps(characters, weaponList, echoes, legacyEchoes, legacyWeapons),
    [characters, echoes, weaponList],
  );

  const buildCVs = useMemo(() => (
    new Map(builds.map((build) => [build.id, calculateCV(build.state.echoPanels)]))
  ), [builds]);

  const selectedCharacters = useMemo(() => (
    selectedCharacterIds.reduce<typeof characters>((acc, id) => {
      const character = characters.find((entry) => entry.id === id);
      if (character) acc.push(character);
      return acc;
    }, [])
  ), [characters, selectedCharacterIds]);

  const selectedWeapons = useMemo(() => (
    selectedWeaponIds.reduce<typeof weaponList>((acc, id) => {
      const weapon = weaponList.find((entry) => entry.id === id);
      if (weapon) acc.push(weapon);
      return acc;
    }, [])
  ), [selectedWeaponIds, weaponList]);

  const filterSuggestions = useMemo<FilterSuggestion[]>(() => {
    const query = entityQuery.trim().toLowerCase();
    if (!query) return [];

    const characterSuggestions = characters
      .filter((character) => !selectedCharacterIds.includes(character.id))
      .map((character) => ({
        type: 'character' as const,
        id: character.id,
        name: t(character.nameI18n ?? { en: character.name }),
        icon: character.head ?? '',
      }))
      .filter((entry) => entry.name.toLowerCase().includes(query));

    const weaponSuggestions = weaponList
      .filter((weapon) => !selectedWeaponIds.includes(weapon.id))
      .map((weapon) => ({
        type: 'weapon' as const,
        id: weapon.id,
        name: t(weapon.nameI18n ?? { en: weapon.name }),
        icon: getWeaponPaths(weapon),
      }))
      .filter((entry) => entry.name.toLowerCase().includes(query));

    const sortByPrefixMatch = (a: FilterSuggestion, b: FilterSuggestion) => {
      const aStarts = a.name.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(query) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    };

    return [
      ...characterSuggestions.sort(sortByPrefixMatch).slice(0, 6),
      ...weaponSuggestions.sort(sortByPrefixMatch).slice(0, 6),
    ];
  }, [characters, entityQuery, selectedCharacterIds, selectedWeaponIds, t, weaponList]);

  const filteredAndSortedBuilds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = builds.filter((build) => {
      const matchesName = !query || build.name.toLowerCase().includes(query);
      const matchesCharacter = selectedCharacterIds.length === 0 ||
        (build.state.characterId ? selectedCharacterIds.includes(build.state.characterId) : false);
      const matchesWeapon = selectedWeaponIds.length === 0 ||
        (build.state.weaponId ? selectedWeaponIds.includes(build.state.weaponId) : false);
      return matchesName && matchesCharacter && matchesWeapon;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'cv') {
        comparison = (buildCVs.get(a.id) ?? 0) - (buildCVs.get(b.id) ?? 0);
      } else {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [buildCVs, builds, searchQuery, selectedCharacterIds, selectedWeaponIds, sortBy, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredAndSortedBuilds.length / itemsPerPage));
  const paginatedBuilds = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedBuilds.slice(start, start + itemsPerPage);
  }, [currentPage, filteredAndSortedBuilds]);

  const handleExportAll = useCallback(() => {
    try {
      exportAllBuilds();
      posthog.capture('saves_export_all', { build_count: builds.length });
      success('Exported all builds.');
    } catch {
      notifyError('Failed to export all builds.');
    }
  }, [builds.length, notifyError, success]);

  const confirmLoadBuild = useCallback((build: SavedBuild) => {
    try {
      posthog.capture('saves_load', {
        build_id: build.id,
        character_id: build.state.characterId ?? null,
        weapon_id: build.state.weaponId ?? null,
      });
      saveDraftBuild(build.state);
      router.push('/edit');
    } catch {
      notifyError('Failed to load build.');
    }
  }, [notifyError, router]);

  const handleLoadBuild = useCallback((build: SavedBuild) => {
    setPendingLoadBuild(build);
  }, []);

  const isV2StateShape = useCallback((state: unknown): boolean => {
    if (!state || typeof state !== 'object') return false;
    const record = state as Record<string, unknown>;
    return (
      'characterId' in record &&
      'characterLevel' in record &&
      'weaponId' in record &&
      'weaponLevel' in record &&
      'weaponRank' in record &&
      Array.isArray(record.echoPanels)
    );
  }, []);

  const isV2ImportPayload = useCallback((payload: unknown): boolean => {
    if (!payload || typeof payload !== 'object') return false;
    const record = payload as Record<string, unknown>;
    if (record.build && typeof record.build === 'object') {
      return isV2StateShape((record.build as Record<string, unknown>).state);
    }
    if (Array.isArray(record.builds)) {
      return record.builds.every((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        return isV2StateShape((entry as Record<string, unknown>).state);
      });
    }
    return false;
  }, [isV2StateShape]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);

      if (isV2ImportPayload(parsed)) {
        const imported = await importBuild(file);
        refreshBuilds();
        posthog.capture('saves_import', { count: imported.length, format: 'json' });
        success(`Imported ${imported.length} build(s).`);
        return;
      }

      const converted = convertLegacyBuilds(parsed, legacyIdMaps);
      if (converted.builds.length === 0) {
        throw new Error('No valid builds found in file.');
      }

      const merged = mergeBuilds(converted.builds);
      refreshBuilds();
      posthog.capture('saves_import', { count: merged.length, format: 'json', skipped: converted.skippedCount });
      success(`Migrated and imported ${merged.length} legacy build(s).`);
      if (converted.skippedCount > 0) {
        warning(`Skipped ${converted.skippedCount} invalid legacy build(s).`);
      }
    } catch (error) {
      posthog.captureException(error);
      notifyError(error instanceof Error ? error.message : 'Failed to import file.');
    } finally {
      event.target.value = '';
    }
  }, [isV2ImportPayload, legacyIdMaps, notifyError, refreshBuilds, success, warning]);

  const handleDeleteAll = useCallback(() => {
    if (!deleteAllArmed) {
      setDeleteAllArmed(true);
      warning('Click Delete All again to confirm.');
      return;
    }

    clearAllBuilds();
    setBuilds([]);
    setDeleteAllArmed(false);
    success('Deleted all saved builds.');
  }, [deleteAllArmed, success, warning]);

  const handleRenameBuild = useCallback((build: SavedBuild, nextName: string) => {
    try {
      const renamed = renameBuild(build.id, nextName);
      if (!renamed) {
        notifyError('Build not found.');
        return;
      }
      refreshBuilds();
      success(`Renamed to "${renamed.name}".`);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to rename build.');
    }
  }, [notifyError, refreshBuilds, success]);

  const confirmDeleteBuild = useCallback((build: SavedBuild) => {
    try {
      const deleted = deleteBuild(build.id);
      if (!deleted) {
        notifyError('Build not found.');
        return;
      }
      if (expandedBuildId === build.id) {
        setExpandedBuildId(null);
      }
      posthog.capture('saves_delete', {
        build_id: build.id,
        character_id: build.state.characterId ?? null,
        weapon_id: build.state.weaponId ?? null,
      });
      refreshBuilds();
      success(`Deleted "${build.name}".`);
    } catch {
      notifyError('Failed to delete build.');
    }
  }, [expandedBuildId, notifyError, refreshBuilds, success]);

  const handleDeleteBuild = useCallback((build: SavedBuild) => {
    setPendingDeleteBuild(build);
  }, []);

  const handleMigrateLegacy = useCallback(() => {
    if (isLegacyMigrating) return;

    setIsLegacyMigrating(true);
    try {
      const payload = readLegacySavesPayload();
      if (!payload) {
        warning('No legacy saves found.');
        refreshLegacySummary();
        return;
      }

      const converted = convertLegacyBuilds(payload, legacyIdMaps);
      if (converted.builds.length === 0) {
        warning('No valid legacy builds to migrate.');
        refreshLegacySummary();
        return;
      }

      const merged = mergeBuilds(converted.builds);
      clearLegacySavesFromStorage();
      refreshBuilds();
      refreshLegacySummary();
      posthog.capture('legacy_migration_complete', {
        migrated_count: merged.length,
        skipped_count: converted.skippedCount,
      });

      success(`Migrated ${merged.length} legacy build(s).`);
      if (converted.skippedCount > 0) {
        warning(`Skipped ${converted.skippedCount} invalid legacy build(s).`);
      }
    } catch (error) {
      posthog.captureException(error);
      notifyError(error instanceof Error ? error.message : 'Failed to migrate legacy saves.');
    } finally {
      setIsLegacyMigrating(false);
    }
  }, [isLegacyMigrating, legacyIdMaps, notifyError, refreshBuilds, refreshLegacySummary, success, warning]);

  const confirmDeleteLegacy = useCallback(() => {
    clearLegacySavesFromStorage();
    setShowLegacyDeleteConfirm(false);
    refreshLegacySummary();
    success('Deleted legacy saves.');
  }, [refreshLegacySummary, success]);

  useEffect(() => {
    refreshBuilds();
    refreshLegacySummary();
    setIsLoaded(true);
  }, [refreshBuilds, refreshLegacySummary]);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  useEffect(() => {
    if (!deleteAllArmed) return;
    const timer = window.setTimeout(() => setDeleteAllArmed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [deleteAllArmed]);

  useEffect(() => {
    setIsSorting(true);
    const timer = window.setTimeout(() => setIsSorting(false), 160);
    return () => window.clearTimeout(timer);
  }, [sortBy, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCharacterIds, selectedWeaponIds]);

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const addFilterSuggestion = useCallback((item: FilterSuggestion) => {
    if (item.type === 'character') {
      setSelectedCharacterIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    } else {
      setSelectedWeaponIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    }
    setEntityQuery('');
  }, []);

  const removeCharacterFilter = useCallback((id: string) => {
    setSelectedCharacterIds((prev) => prev.filter((charId) => charId !== id));
  }, []);

  const removeWeaponFilter = useCallback((id: string) => {
    setSelectedWeaponIds((prev) => prev.filter((weaponId) => weaponId !== id));
  }, []);

  const handleFilterInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !entityQuery) {
      if (selectedWeaponIds.length > 0) {
        setSelectedWeaponIds((prev) => prev.slice(0, -1));
        return;
      }
      if (selectedCharacterIds.length > 0) {
        setSelectedCharacterIds((prev) => prev.slice(0, -1));
      }
      return;
    }
    if (e.key === 'Enter' && filterSuggestions.length > 0) {
      e.preventDefault();
      addFilterSuggestion(filterSuggestions[0]);
    }
  }, [addFilterSuggestion, entityQuery, filterSuggestions, selectedCharacterIds.length, selectedWeaponIds.length]);

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedCharacterIds.length > 0 || selectedWeaponIds.length > 0;

  return (
    <main className="bg-background">
      <div className="mx-auto max-w-5xl p-6 md:px-0">
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-background-secondary p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/50"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search build name..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-primary/40 focus:border-accent/60 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
                >
                  <option value="date">Sort: Date</option>
                  <option value="name">Sort: Name</option>
                  <option value="cv">Sort: CV</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-primary/70"
                />
              </div>

              <button
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary transition-colors hover:border-text-primary/40"
                title="Toggle sort direction"
              >
                <span className="flex items-center gap-1.5">
                  {sortDirection === 'asc' ? <ArrowUpAZ size={16} /> : <ArrowDownAZ size={16} />}
                  {sortDirection.toUpperCase()}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary transition-colors hover:border-text-primary/40">
                <span className="flex items-center gap-1.5">
                  <Upload size={16} />
                  Import
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleExportAll}
                disabled={!isLoaded || builds.length === 0}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary transition-colors hover:border-text-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-1.5">
                  <Download size={16} />
                  Export All
                </span>
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={!isLoaded || builds.length === 0}
                className={deleteAllArmed
                  ? 'rounded-lg border border-red-500 bg-red-500/25 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/35 disabled:cursor-not-allowed disabled:opacity-50'
                  : 'rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50'}
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={16} />
                  {deleteAllArmed ? 'Confirm Delete All' : 'Delete All'}
                </span>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-2 py-2">
              {selectedCharacters.map((character) => (
                <span
                  key={`char-${character.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-text-primary"
                >
                  {character.head && (
                    <img src={character.head} alt={character.name} className="h-4 w-4 rounded object-cover" />
                  )}
                  <span>{t(character.nameI18n ?? { en: character.name })}</span>
                  <button
                    onClick={() => removeCharacterFilter(character.id)}
                    className="rounded p-0.5 text-text-primary/70 transition-colors hover:bg-background-secondary hover:text-text-primary"
                    aria-label={`Remove ${character.name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              {selectedWeapons.map((weapon) => (
                <span
                  key={`weapon-${weapon.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"
                >
                  <img src={getWeaponPaths(weapon)} alt={weapon.name} className="h-4 w-4 object-contain" />
                  <span>{t(weapon.nameI18n ?? { en: weapon.name })}</span>
                  <button
                    onClick={() => removeWeaponFilter(weapon.id)}
                    className="rounded p-0.5 text-text-primary/70 transition-colors hover:bg-background hover:text-text-primary"
                    aria-label={`Remove ${weapon.name}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={entityQuery}
                onChange={(e) => setEntityQuery(e.target.value)}
                onFocus={() => setIsFilterDropdownOpen(true)}
                onBlur={() => window.setTimeout(() => setIsFilterDropdownOpen(false), 120)}
                onKeyDown={handleFilterInputKeyDown}
                placeholder={selectedCharacters.length || selectedWeapons.length
                  ? 'Add another character or weapon filter...'
                  : 'Filter by character or weapon...'}
                className="min-w-55 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-primary/45 outline-none"
              />
            </div>

            {isFilterDropdownOpen && filterSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-background shadow-xl">
                {filterSuggestions.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addFilterSuggestion(item)}
                    className="flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left text-sm text-text-primary transition-colors last:border-b-0 hover:bg-background-secondary"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <img src={item.icon} alt={item.name} className="h-5 w-5 shrink-0 rounded object-cover" />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="rounded bg-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-primary/70">
                      {item.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {hostname === null ? null : isLegacyDomain ? (
          <div className="mb-4 rounded-lg border border-accent/45 bg-accent/10 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-accent">We&apos;ve moved to wuwa.build!</p>
                <p className="mt-1 text-xs text-text-primary/75">
                  Export your builds below, then import them at{' '}
                  <a
                    href="https://wuwa.build/saves"
                    className="underline hover:text-text-primary"
                  >
                    wuwa.build/saves
                  </a>
                  .
                </p>
              </div>
              <a
                href="https://wuwa.build/saves"
                className="shrink-0 rounded-lg bg-accent px-3 py-2 text-center text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
              >
                Go to wuwa.build
              </a>
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-accent/45 bg-accent/10 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-accent">Moving from www.wuwabuilds.moe?</p>
                <p className="mt-1 text-xs text-text-primary/75">
                  Saved builds are stored locally on that domain. Visit{' '}
                  <a
                    href="https://www.wuwabuilds.moe/saves"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-text-primary"
                  >
                    www.wuwabuilds.moe/saves
                  </a>{' '}
                  to export them, then import here.
                </p>
              </div>
              <a
                href="https://www.wuwabuilds.moe/saves"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-accent px-3 py-2 text-center text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
              >
                Go to Old Site
              </a>
            </div>
          </div>
        )}
        {legacySummary.parseError && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-red-300">Legacy saves found but unreadable</p>
                <p className="mt-1 text-xs text-red-200/85">
                  Found old save data in <code className="rounded bg-background px-1 py-0.5">saved_builds</code>, but JSON parsing failed.
                  You can safely delete the legacy key.
                </p>
              </div>
              <button
                onClick={() => setShowLegacyDeleteConfirm(true)}
                className="shrink-0 rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/25"
              >
                Delete Legacy Key
              </button>
            </div>
          </div>
        )}

        {!legacySummary.parseError && legacySummary.found && legacySummary.buildCount > 0 && (
          <div className="mb-4 rounded-lg border border-accent/45 bg-accent/10 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-accent">Legacy saves detected</p>
                <p className="mt-1 text-xs text-text-primary/75">
                  Found {legacySummary.buildCount} build(s) in the previous storage key{' '}
                  <code className="rounded bg-background px-1 py-0.5">saved_builds</code>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMigrateLegacy}
                  disabled={isLegacyMigrating}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLegacyMigrating ? 'Migrating...' : 'Migrate All'}
                </button>
                <button
                  onClick={() => setShowLegacyDeleteConfirm(true)}
                  disabled={isLegacyMigrating}
                  className="rounded-lg border border-red-500/50 bg-red-500/12 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete Legacy
                </button>
              </div>
            </div>
          </div>
        )}

        {!isLoaded || isSorting ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="h-4 w-1/3 animate-pulse rounded bg-border" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-border" />
                <div className="mt-3 flex gap-2">
                  <div className="h-5 w-20 animate-pulse rounded bg-border" />
                  <div className="h-5 w-16 animate-pulse rounded bg-border" />
                  <div className="h-5 w-24 animate-pulse rounded bg-border" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <BuildList
              builds={paginatedBuilds}
              onSelect={(build) => setExpandedBuildId((prev) => (prev === build.id ? null : build.id))}
              onLoad={handleLoadBuild}
              onDelete={handleDeleteBuild}
              onRename={handleRenameBuild}
              selectedBuildId={expandedBuildId}
              emptyMessage={hasActiveFilters ? 'No builds match your filters.' : 'No saved builds yet.'}
            />
            {filteredAndSortedBuilds.length > 0 && pageCount > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-border bg-background p-2 text-text-primary transition-colors hover:border-text-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="First page"
                >
                  <ChevronFirst size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-border bg-background p-2 text-text-primary transition-colors hover:border-text-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-20 text-center text-sm text-text-primary/80">
                  Page {currentPage} / {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
                  disabled={currentPage === pageCount}
                  className="rounded-lg border border-border bg-background p-2 text-text-primary transition-colors hover:border-text-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(pageCount)}
                  disabled={currentPage === pageCount}
                  className="rounded-lg border border-border bg-background p-2 text-text-primary transition-colors hover:border-text-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Last page"
                >
                  <ChevronLast size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingLoadBuild)}
        onClose={() => setPendingLoadBuild(null)}
        title="Load saved build?"
        description={
          <>
            Load{' '}
            <span className="font-medium text-text-primary">
              {pendingLoadBuild?.name ?? 'this build'}
            </span>{' '}
            and replace your current draft?
          </>
        }
        confirmLabel="Load Build"
        confirmTone="accent"
        onConfirm={() => {
          if (!pendingLoadBuild) return;
          confirmLoadBuild(pendingLoadBuild);
          setPendingLoadBuild(null);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteBuild)}
        onClose={() => setPendingDeleteBuild(null)}
        title="Delete saved build?"
        description={
          <>
            This will permanently delete{' '}
            <span className="font-medium text-text-primary">
              {pendingDeleteBuild?.name ?? 'this build'}
            </span>
            .
          </>
        }
        confirmLabel="Delete Build"
        confirmTone="destructive"
        onConfirm={() => {
          if (!pendingDeleteBuild) return;
          confirmDeleteBuild(pendingDeleteBuild);
          setPendingDeleteBuild(null);
        }}
      />

      <ConfirmDialog
        isOpen={showLegacyDeleteConfirm}
        onClose={() => setShowLegacyDeleteConfirm(false)}
        title="Delete legacy saves?"
        description={
          <>
            This removes old data in{' '}
            <span className="font-medium text-text-primary">saved_builds</span>. It does not touch builds already in the new storage.
          </>
        }
        confirmLabel="Delete Legacy"
        confirmTone="destructive"
        onConfirm={confirmDeleteLegacy}
      />
    </main>
  );
};

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDownAZ, ArrowUpAZ, ChevronDown, Download, Search, Upload } from 'lucide-react';
import { SavedBuild } from '@/lib/build';
import { DRAFT_BUILD_STORAGE_KEY, clearAllBuilds, exportAllBuilds, importBuild, loadBuilds, renameBuild } from '@/lib/storage';
import { calculateCV } from '@/lib/calculations/cv';
import { BuildList } from './BuildList';
import { useBuild } from '@/contexts/BuildContext';

type SortBy = 'date' | 'name' | 'cv';
type SortDirection = 'asc' | 'desc';

export const SavesPageClient: React.FC = () => {
  const router = useRouter();
  const { loadState } = useBuild();
  const [builds, setBuilds] = useState<SavedBuild[]>(() => loadBuilds().builds);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isSorting, setIsSorting] = useState(false);
  const [deleteAllArmed, setDeleteAllArmed] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshBuilds = useCallback(() => {
    const data = loadBuilds();
    setBuilds(data.builds);
  }, []);

  const buildCVs = useMemo(() => (
    new Map(builds.map((build) => [build.id, calculateCV(build.state.echoPanels)]))
  ), [builds]);

  const filteredAndSortedBuilds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = !query
      ? builds
      : builds.filter((build) =>
          build.name.toLowerCase().includes(query) ||
          (build.state.characterId ?? '').toLowerCase().includes(query) ||
          (build.state.weaponId ?? '').toLowerCase().includes(query)
        );

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
  }, [buildCVs, builds, searchQuery, sortBy, sortDirection]);

  const handleExportAll = useCallback(() => {
    try {
      exportAllBuilds();
      setStatus({ type: 'success', text: 'Exported all builds.' });
    } catch {
      setStatus({ type: 'error', text: 'Failed to export all builds.' });
    }
  }, []);

  const handleLoadBuild = useCallback((build: SavedBuild) => {
    if (!window.confirm(`Load "${build.name}" and replace your current draft?`)) return;

    try {
      loadState(build.state);
      window.localStorage.setItem(DRAFT_BUILD_STORAGE_KEY, JSON.stringify(build.state));
      router.push('/edit');
    } catch {
      setStatus({ type: 'error', text: 'Failed to load build.' });
    }
  }, [loadState, router]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importBuild(file);
      refreshBuilds();
      setStatus({ type: 'success', text: `Imported ${imported.length} build(s).` });
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Failed to import file.' });
    } finally {
      event.target.value = '';
    }
  }, [refreshBuilds]);

  const handleDeleteAll = useCallback(() => {
    if (!deleteAllArmed) {
      setDeleteAllArmed(true);
      setStatus({ type: 'error', text: 'Warning: click Delete All again to confirm.' });
      return;
    }

    clearAllBuilds();
    setBuilds([]);
    setDeleteAllArmed(false);
    setStatus({ type: 'success', text: 'Deleted all saved builds.' });
  }, [deleteAllArmed]);

  const handleRenameBuild = useCallback((build: SavedBuild, nextName: string) => {
    try {
      const renamed = renameBuild(build.id, nextName);
      if (!renamed) {
        setStatus({ type: 'error', text: 'Build not found.' });
        return;
      }
      refreshBuilds();
      setStatus({ type: 'success', text: `Renamed to "${renamed.name}".` });
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to rename build.'
      });
    }
  }, [refreshBuilds]);

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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl p-6 md:px-16">
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-background-secondary p-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/50"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, character, or weapon..."
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
              disabled={builds.length === 0}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary transition-colors hover:border-text-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5">
                <Download size={16} />
                Export All
              </span>
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={builds.length === 0}
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

        {status && (
          <div className={status.type === 'success'
            ? 'mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400'
            : 'mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400'}
          >
            {status.text}
          </div>
        )}

        {isSorting ? (
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
          <BuildList
            builds={filteredAndSortedBuilds}
            onSelect={(build) => setExpandedBuildId((prev) => (prev === build.id ? null : build.id))}
            onLoad={handleLoadBuild}
            onRename={handleRenameBuild}
            selectedBuildId={expandedBuildId}
            emptyMessage={searchQuery ? 'No builds match your search.' : 'No saved builds yet.'}
          />
        )}
      </div>
    </main>
  );
};

export default SavesPageClient;

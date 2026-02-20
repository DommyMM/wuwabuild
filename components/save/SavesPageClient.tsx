'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Download, Search } from 'lucide-react';
import { SavedBuild } from '@/lib/build';
import { DRAFT_BUILD_STORAGE_KEY, deleteBuild, exportAllBuilds, exportBuild, loadBuilds } from '@/lib/storage';
import { calculateCV } from '@/lib/calculations/cv';
import { BuildList } from './BuildList';

type SortBy = 'date' | 'name' | 'cv';
type SortDirection = 'asc' | 'desc';

export const SavesPageClient: React.FC = () => {
  const router = useRouter();
  const [builds, setBuilds] = useState<SavedBuild[]>(() => loadBuilds().builds);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshBuilds = useCallback(() => {
    const data = loadBuilds();
    setBuilds(data.builds);
  }, []);

  const selectedBuild = useMemo(
    () => builds.find((build) => build.id === selectedBuildId) ?? null,
    [builds, selectedBuildId]
  );

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

  const handleDelete = useCallback((build: SavedBuild) => {
    if (!window.confirm(`Delete "${build.name}"? This cannot be undone.`)) return;

    const removed = deleteBuild(build.id);
    if (!removed) {
      setStatus({ type: 'error', text: 'Failed to delete build.' });
      return;
    }

    if (selectedBuildId === build.id) {
      setSelectedBuildId(null);
    }
    refreshBuilds();
    setStatus({ type: 'success', text: `Deleted "${build.name}".` });
  }, [refreshBuilds, selectedBuildId]);

  const handleExport = useCallback((build: SavedBuild) => {
    try {
      exportBuild(build);
      setStatus({ type: 'success', text: `Exported "${build.name}".` });
    } catch {
      setStatus({ type: 'error', text: 'Failed to export build.' });
    }
  }, []);

  const handleExportAll = useCallback(() => {
    try {
      exportAllBuilds();
      setStatus({ type: 'success', text: 'Exported all builds.' });
    } catch {
      setStatus({ type: 'error', text: 'Failed to export all builds.' });
    }
  }, []);

  const handleLoadSelected = useCallback(() => {
    if (!selectedBuild) return;
    if (!window.confirm(`Load "${selectedBuild.name}" and replace your current draft?`)) return;

    try {
      window.localStorage.setItem(DRAFT_BUILD_STORAGE_KEY, JSON.stringify(selectedBuild.state));
      router.push('/edit');
    } catch {
      setStatus({ type: 'error', text: 'Failed to load selected build.' });
    }
  }, [router, selectedBuild]);

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
              onClick={handleLoadSelected}
              disabled={!selectedBuild}
              className="rounded-lg border border-accent bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Load Selected
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

        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <BuildList
            builds={filteredAndSortedBuilds}
            onSelect={(build) => setSelectedBuildId(build.id)}
            onDelete={handleDelete}
            onExport={handleExport}
            selectedBuildId={selectedBuildId}
            emptyMessage={searchQuery ? 'No builds match your search.' : 'No saved builds yet.'}
          />
        </div>
      </div>
    </main>
  );
};

export default SavesPageClient;

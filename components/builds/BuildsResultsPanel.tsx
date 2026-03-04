'use client';

import React from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { LBBuildEntry } from '@/lib/lb';
import { BuildsEntryCard } from './BuildsEntryCard';

interface BuildsResultsPanelProps {
  builds: LBBuildEntry[];
  total: number;
  page: number;
  pageCount: number;
  rankStart: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  expandedBuildIds: Set<string>;
  onToggleExpanded: (buildId: string) => void;
  onPageChange: (page: number) => void;
}

export const BuildsResultsPanel: React.FC<BuildsResultsPanelProps> = ({
  builds,
  total,
  page,
  pageCount,
  rankStart,
  isLoading,
  isRefreshing,
  error,
  expandedBuildIds,
  onToggleExpanded,
  onPageChange,
}) => {
  const firstShown = total === 0 ? 0 : Math.min(total, rankStart);
  const lastShown = total === 0 ? 0 : Math.min(total, rankStart + Math.max(builds.length - 1, 0));

  return (
    <section className="rounded-xl border border-border bg-background-secondary p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-text-primary">
          {isLoading ? 'Loading builds...' : `${total.toLocaleString()} build${total === 1 ? '' : 's'} found`}
        </div>
        <div className="text-xs text-text-primary/60">
          Page {page} / {pageCount} {isRefreshing ? '· refreshing...' : ''}
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
                onToggle={() => onToggleExpanded(entry.id)}
              />
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-text-primary/60">
          Showing {firstShown}-{lastShown} of {total.toLocaleString()}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="rounded border border-border bg-background p-1.5 text-text-primary transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronFirst className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
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
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            disabled={page >= pageCount}
            className="rounded border border-border bg-background p-1.5 text-text-primary transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(pageCount)}
            disabled={page >= pageCount}
            className="rounded border border-border bg-background p-1.5 text-text-primary transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLast className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

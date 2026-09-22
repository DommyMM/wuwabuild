'use client';

import React, { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { GlobalBoardResultsPanel } from '@/components/leaderboards/board/GlobalBoardResultsPanel';
import { parseInitialQuery } from '@/components/leaderboards/board/globalBoardQuery';
import { TABLE_ROW_HEIGHT_CLASS } from '@/components/leaderboards/constants';
import { ProfileFeaturedBuild } from './ProfileFeaturedBuild';
import {
  PROFILE_RESULTS_COLLAPSED_MAX_WIDTH_CLASS,
  PROFILE_RESULTS_EXPANDED_MAX_WIDTH_CLASS,
  PROFILE_TABLE_GRID,
} from './ProfilePageClient';
import { ProfileShowcaseSkeleton } from './ProfileShowcase';
import { ProfileSwitcher } from './ProfileSwitcher';

const noop = () => {};
const EMPTY_IDS = new Set<string>();

// Echo table draws the same eight rows its own first load does
const ECHO_SKELETON_ROWS = 8;

/**
 * Profile page at its first-paint footprint, shown by the route's loading state during a client navigation
 *
 * - Without it the page slot is empty while the profile RSC payload loads, so the footer jumps up and back down
 * - Reuses the shelf, table and featured region in their own loading states, so their heights cannot drift from the page
 * - Reads the same URL state as the page: page size for the row count, `?buildId=` for the open card and the wider column
 */
export const ProfilePageSkeleton: React.FC = () => {
  const params = useParams<{ uid: string }>();
  const searchParams = useSearchParams();
  const uid = params?.uid ?? '';
  const query = useMemo(() => parseInitialQuery(new URLSearchParams(searchParams.toString())), [searchParams]);
  const buildId = searchParams.get('buildId')?.trim() ?? '';

  return (
    <main className="bg-background">
      <div
        className={`mx-auto w-full p-3 px-0 md:p-5 ${
          buildId ? PROFILE_RESULTS_EXPANDED_MAX_WIDTH_CLASS : PROFILE_RESULTS_COLLAPSED_MAX_WIDTH_CLASS
        }`}
      >
        <ProfileSwitcher currentUid={uid} />
        <section className="relative overflow-visible rounded-b-xl rounded-t-lg border border-border bg-background-secondary" aria-busy>
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(166,150,98,0.10),transparent_55%)]" />
          <div className="relative overflow-hidden rounded-[inherit]">
            <div className="border-b border-border/70 px-6 py-5">
              <div className="flex flex-wrap items-center gap-5">
                <div className="h-18 w-18 shrink-0 animate-pulse rounded-xl border border-border bg-background" />
                <div className="min-w-0 flex-1">
                  {/* h1 line and the facts row at their rendered heights */}
                  <div className="h-9 w-56 max-w-full animate-pulse rounded bg-background/70" />
                  <div className="mt-1.5 h-4 w-72 max-w-full animate-pulse rounded bg-background/50" />
                </div>
                <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-background/45" />
              </div>
            </div>

            <ProfileShowcaseSkeleton />

            {buildId && (
              <ProfileFeaturedBuild
                uid={uid}
                selection={{ buildId, standingKey: null, characterId: null, topPercent: null }}
                detail={undefined}
                isDetailLoading
                detailError={undefined}
                isLayoutSettled={false}
                onRetryDetail={noop}
                onClose={noop}
              />
            )}

            <div className="px-4 py-3">
              <div className="space-y-3">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold uppercase tracking-wide text-accent">Filters</div>
                    <div className="h-7.5 w-30 rounded-lg border border-border bg-background" />
                  </div>
                  <div className="min-h-11 rounded-lg border border-border bg-background/60" />
                </section>

                <GlobalBoardResultsPanel
                  builds={[]}
                  expandedBuildIds={EMPTY_IDS}
                  detailById={{}}
                  detailLoadingById={{}}
                  detailErrorById={{}}
                  total={0}
                  page={query.page}
                  pageCount={1}
                  pageSize={query.pageSize}
                  rankStart={1}
                  isLoading
                  isRefreshing={false}
                  error={null}
                  onRetry={noop}
                  sort={query.sort}
                  direction={query.direction}
                  onSortChange={noop}
                  onToggleDirection={noop}
                  onPageChange={noop}
                  onToggleExpand={noop}
                  onRetryDetail={noop}
                  tableGrid={PROFILE_TABLE_GRID}
                  showOwner={false}
                  showTableGate={false}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-8 overflow-visible rounded-xl border border-border bg-background-secondary" aria-busy>
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(166,150,98,0.10),transparent_55%)]" />
          <div className="relative rounded-[inherit] px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-accent">Echoes</span>
              <div className="h-7.5 w-16 rounded-lg border border-border bg-background" />
            </div>
            <div className="min-h-11 rounded-lg border border-border bg-background/60" />
            <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background/70">
              <div className="h-11 border-b border-border bg-background-secondary/95" />
              <div className="divide-y divide-border/60">
                {Array.from({ length: ECHO_SKELETON_ROWS }).map((_, i) => (
                  <div key={i} className={`${TABLE_ROW_HEIGHT_CLASS} odd:bg-background/30 even:bg-background-secondary/20`} />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

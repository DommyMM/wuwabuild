'use client';

import React from 'react';
import { LBMoveEntry } from '@/lib/lb';
import { formatPercentStat } from './buildFormatters';

function formatDamage(value: number): string {
  return Math.round(value).toLocaleString();
}

interface BuildMoveBreakdownProps {
  weaponName: string;
  trackLabel: string;
  isLoading: boolean;
  error: string | null;
  moves: LBMoveEntry[];
}

export const BuildMoveBreakdown: React.FC<BuildMoveBreakdownProps> = ({
  weaponName,
  trackLabel,
  isLoading,
  error,
  moves,
}) => {
  return (
    <section className="space-y-3">
      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/45">
        {weaponName} • {trackLabel}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`move-skeleton-${index}`} className="animate-pulse border-b border-border/45 py-2.5 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div className="h-4 w-40 rounded bg-white/10" />
                <div className="h-4 w-20 rounded bg-white/8" />
              </div>
              <div className="mt-2 h-3 w-2/3 rounded bg-white/6" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && moves.length === 0 && (
        <div className="py-1 text-sm text-text-primary/60">
          No move breakdown available for this board.
        </div>
      )}

      {!isLoading && !error && moves.length > 0 && (
        <div className="divide-y divide-border/45 border-y border-border/45">
          {moves.map((move, moveIndex) => (
            <article key={`${move.name}-${moveIndex}`} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary">
                    {move.name || `Move ${moveIndex + 1}`}
                  </div>
                  <div className="mt-0.5 text-xs text-text-primary/48">
                    {move.hits.length > 0 ? `${move.hits.length} hit${move.hits.length === 1 ? '' : 's'}` : 'Total damage'}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-accent">{formatDamage(move.damage)}</div>
                </div>
              </div>

              {move.hits.length > 0 && (
                <div className="mt-2 space-y-1.5 border-l border-border/45 pl-3">
                  {move.hits.map((hit, hitIndex) => (
                    <div
                      key={`${move.name}-${hit.name}-${hitIndex}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 text-sm"
                    >
                      <div className="min-w-0 truncate text-text-primary/82">{hit.name}</div>
                      <div className="text-text-primary/55">{formatPercentStat(hit.percentage)}</div>
                      <div className="text-right font-medium text-white/88">{formatDamage(hit.damage)}</div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

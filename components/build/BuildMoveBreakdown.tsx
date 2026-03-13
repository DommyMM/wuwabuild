'use client';

import React, { useMemo, useState } from 'react';
import { LBMoveEntry } from '@/lib/lb';
import { formatPercentStat } from './buildFormatters';

const CHART_COLORS = [
  '#a69662',
  '#ff8a65',
  '#5cc7c2',
  '#7aa2f7',
  '#c792ea',
  '#f6bd60',
  '#8bd3dd',
  '#90be6d',
];

type ProcessedHit = {
  name: string;
  damage: number;
  percentage: number;
};

type ProcessedMove = {
  name: string;
  damage: number;
  percentage: number;
  hits: ProcessedHit[];
};

type RingSegment = {
  key: string;
  value: number;
  color: string;
  opacity: number;
  moveIndex: number;
  hitKey?: string;
};

function formatDamage(value: number): string {
  return Math.round(value).toLocaleString();
}

function toStrokeSegments(segments: RingSegment[], radius: number) {
  const circumference = 2 * Math.PI * radius;
  const gap = Math.min(6, circumference * 0.008);
  let consumed = 0;

  return segments.map((segment) => {
    const rawLength = circumference * segment.value;
    const visibleLength = Math.max(0, rawLength - gap);
    const strokeDasharray = `${visibleLength} ${circumference - visibleLength}`;
    const strokeDashoffset = -consumed;
    consumed += rawLength;
    return {
      ...segment,
      strokeDasharray,
      strokeDashoffset,
    };
  });
}

function processMoves(moves: LBMoveEntry[]): ProcessedMove[] {
  const grouped = new Map<string, { damage: number; hits: Map<string, number> }>();

  for (const move of moves) {
    const key = move.name?.trim() || 'Unnamed Move';
    const existing = grouped.get(key) ?? { damage: 0, hits: new Map<string, number>() };
    existing.damage += move.damage;

    for (const hit of move.hits ?? []) {
      const hitKey = hit.name?.trim() || 'Hit';
      existing.hits.set(hitKey, (existing.hits.get(hitKey) ?? 0) + hit.damage);
    }

    grouped.set(key, existing);
  }

  const totalDamage = Array.from(grouped.values()).reduce((sum, move) => sum + move.damage, 0);
  if (totalDamage <= 0) return [];

  return Array.from(grouped.entries())
    .map(([name, move]) => {
      const totalHitDamage = Array.from(move.hits.values()).reduce((sum, value) => sum + value, 0);
      const hits = Array.from(move.hits.entries())
        .map(([hitName, damage]) => ({
          name: hitName,
          damage,
          percentage: totalHitDamage > 0 ? (damage / totalDamage) * 100 : 0,
        }))
        .sort((a, b) => b.damage - a.damage);

      return {
        name,
        damage: move.damage,
        percentage: (move.damage / totalDamage) * 100,
        hits,
      };
    })
    .sort((a, b) => b.damage - a.damage);
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
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null);
  const [activeHitKey, setActiveHitKey] = useState<string | null>(null);

  const processedMoves = useMemo(() => processMoves(moves), [moves]);
  const totalDamage = useMemo(
    () => processedMoves.reduce((sum, move) => sum + move.damage, 0),
    [processedMoves],
  );
  const activeMove = activeMoveIndex !== null ? processedMoves[activeMoveIndex] ?? null : null;
  const activeHit = useMemo(() => {
    if (!activeHitKey) return null;
    const [moveIndexRaw, ...hitNameParts] = activeHitKey.split(':');
    const moveIndex = Number(moveIndexRaw);
    if (!Number.isFinite(moveIndex)) return null;
    const hitName = hitNameParts.join(':');
    return processedMoves[moveIndex]?.hits.find((hit) => hit.name === hitName) ?? null;
  }, [activeHitKey, processedMoves]);
  const centerLabel = activeHit?.name ?? activeMove?.name ?? 'Total Damage';
  const centerDamage = activeHit?.damage ?? activeMove?.damage ?? totalDamage;
  const centerPercentage = activeHit?.percentage ?? activeMove?.percentage ?? 100;
  const centerMeta = activeHit
    ? activeMove?.name ?? null
    : activeMove
      ? `${activeMove.hits.length} hit${activeMove.hits.length === 1 ? '' : 's'}`
      : `${processedMoves.length} move${processedMoves.length === 1 ? '' : 's'}`;

  const innerSegments = useMemo(
    () =>
      toStrokeSegments(
        processedMoves.map((move, moveIndex) => ({
          key: `move-${move.name}-${moveIndex}`,
          value: move.percentage / 100,
          color: CHART_COLORS[moveIndex % CHART_COLORS.length],
          opacity: activeMoveIndex === null || activeMoveIndex === moveIndex ? 1 : 0.42,
          moveIndex,
        })),
        58,
      ),
    [activeMoveIndex, processedMoves],
  );

  const outerSegments = useMemo(
    () =>
      toStrokeSegments(
        processedMoves.flatMap((move, moveIndex) => {
          const color = CHART_COLORS[moveIndex % CHART_COLORS.length];
          if (move.hits.length === 0) {
            return [{
              key: `solo-${move.name}-${moveIndex}`,
              value: move.percentage / 100,
              color,
              opacity: activeMoveIndex === null || activeMoveIndex === moveIndex ? 0.65 : 0.28,
              moveIndex,
            }];
          }

          return move.hits.map((hit, hitIndex) => ({
            key: `hit-${move.name}-${hit.name}-${hitIndex}`,
            value: hit.damage / totalDamage,
            color,
            opacity:
              activeHitKey === null
                ? (activeMoveIndex === null || activeMoveIndex === moveIndex ? 0.72 : 0.28)
                : activeHitKey === `${moveIndex}:${hit.name}`
                  ? 1
                  : 0.22,
            moveIndex,
            hitKey: `${moveIndex}:${hit.name}`,
          }));
        }),
        84,
      ),
    [activeHitKey, activeMoveIndex, processedMoves, totalDamage],
  );

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

      {!isLoading && !error && processedMoves.length === 0 && (
        <div className="py-1 text-sm text-text-primary/60">
          No move breakdown available for this board.
        </div>
      )}

      {!isLoading && !error && processedMoves.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <div className="flex items-center justify-center lg:sticky lg:top-3">
            <div className="relative h-[240px] w-[240px]">
              <svg viewBox="0 0 220 220" className="h-full w-full">
                <circle cx="110" cy="110" r="84" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
                {outerSegments.map((segment) => (
                  <circle
                    key={segment.key}
                    cx="110"
                    cy="110"
                    r="84"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="18"
                    strokeDasharray={segment.strokeDasharray}
                    strokeDashoffset={segment.strokeDashoffset}
                    strokeLinecap="butt"
                    transform="rotate(-90 110 110)"
                    opacity={segment.opacity}
                    className="transition-opacity duration-150"
                    onMouseEnter={() => {
                      setActiveMoveIndex(segment.moveIndex);
                      setActiveHitKey(segment.hitKey ?? null);
                    }}
                    onMouseLeave={() => {
                      setActiveMoveIndex(null);
                      setActiveHitKey(null);
                    }}
                  />
                ))}

                <circle cx="110" cy="110" r="58" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="28" />
                {innerSegments.map((segment) => (
                  <circle
                    key={segment.key}
                    cx="110"
                    cy="110"
                    r="58"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="28"
                    strokeDasharray={segment.strokeDasharray}
                    strokeDashoffset={segment.strokeDashoffset}
                    strokeLinecap="butt"
                    transform="rotate(-90 110 110)"
                    opacity={segment.opacity}
                    className="transition-opacity duration-150"
                    onMouseEnter={() => {
                      setActiveMoveIndex(segment.moveIndex);
                      setActiveHitKey(null);
                    }}
                    onMouseLeave={() => {
                      setActiveMoveIndex(null);
                    }}
                  />
                ))}
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="max-w-[124px] text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/45">
                  {centerLabel}
                </div>
                <div className="mt-1 text-2xl font-semibold text-white/92">
                  {formatDamage(centerDamage)}
                </div>
                <div className="mt-1 text-xs font-medium text-accent">
                  {formatPercentStat(centerPercentage)}
                </div>
                <div className="mt-2 text-[11px] text-text-primary/50">
                  {centerMeta}
                </div>
                <div className="mt-1 text-[11px] text-text-primary/42">
                  Inner ring: moves · Outer ring: hits
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {processedMoves.map((move, moveIndex) => {
              const isActive = activeMoveIndex === null || activeMoveIndex === moveIndex;
              const color = CHART_COLORS[moveIndex % CHART_COLORS.length];

              return (
                <article
                  key={`${move.name}-${moveIndex}`}
                  className={`rounded-lg border px-3 py-2.5 transition-colors ${
                    isActive
                      ? 'border-accent/25 bg-background-secondary/42'
                      : 'border-border/55 bg-background-secondary/20 opacity-55'
                  }`}
                  onMouseEnter={() => setActiveMoveIndex(moveIndex)}
                  onMouseLeave={() => {
                    setActiveMoveIndex(null);
                    setActiveHitKey(null);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-text-primary">{move.name}</div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-accent">{formatDamage(move.damage)}</div>
                          <div className="text-xs text-text-primary/52">{move.percentage.toFixed(1)}%</div>
                        </div>
                      </div>

                      {move.hits.length > 0 && (
                        <div className="mt-2 space-y-1.5 border-l border-border/45 pl-3">
                          {move.hits.map((hit, hitIndex) => {
                            const hitIsActive = activeHitKey === null || activeHitKey === `${moveIndex}:${hit.name}`;
                            return (
                              <div
                                key={`${move.name}-${hit.name}-${hitIndex}`}
                                className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 rounded px-1.5 py-1 text-sm transition-colors ${
                                  hitIsActive ? 'bg-black/10' : 'opacity-45'
                                }`}
                                onMouseEnter={() => {
                                  setActiveMoveIndex(moveIndex);
                                  setActiveHitKey(`${moveIndex}:${hit.name}`);
                                }}
                                onMouseLeave={() => {
                                  setActiveHitKey(null);
                                  setActiveMoveIndex(moveIndex);
                                }}
                              >
                                <div className="min-w-0 truncate text-text-primary/78">{hit.name}</div>
                                <div className="text-text-primary/50">{formatPercentStat(hit.percentage)}</div>
                                <div className="text-right font-medium text-white/84">{formatDamage(hit.damage)}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

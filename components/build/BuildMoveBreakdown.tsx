'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
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

type PieSegment = {
  key: string;
  moveIndex: number;
  color: string;
  opacity: number;
  path: string;
  tooltipAnchorX: number;
  tooltipAnchorY: number;
  hitSegments: HitSegment[];
};

type HitSegment = {
  key: string;
  title: string;
  damage: number;
  percentage: number;
  path: string;
  tooltipAnchorX: number;
  tooltipAnchorY: number;
};

type TooltipState = {
  title: string;
  damage: number;
  percentage: number;
  anchorX: number;
  anchorY: number;
  left: number;
  top: number;
};

const TOOLTIP_OFFSET = 18;
const TOOLTIP_PADDING = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveTooltipPosition(
  anchorX: number,
  anchorY: number,
  boundsWidth: number,
  boundsHeight: number,
  tooltipWidth: number,
  tooltipHeight: number,
) {
  const minLeft = TOOLTIP_PADDING;
  const minTop = TOOLTIP_PADDING;
  const maxLeft = Math.max(minLeft, boundsWidth - tooltipWidth - TOOLTIP_PADDING);
  const maxTop = Math.max(minTop, boundsHeight - tooltipHeight - TOOLTIP_PADDING);

  const rightLeft = anchorX + TOOLTIP_OFFSET;
  const leftLeft = anchorX - TOOLTIP_OFFSET - tooltipWidth;
  const bottomTop = anchorY + TOOLTIP_OFFSET;
  const topTop = anchorY - TOOLTIP_OFFSET - tooltipHeight;

  const fitsRight = rightLeft <= maxLeft;
  const fitsLeft = leftLeft >= minLeft;
  const fitsBottom = bottomTop <= maxTop;
  const fitsTop = topTop >= minTop;

  const clampedRightLeft = clamp(rightLeft, minLeft, maxLeft);
  const clampedLeftLeft = clamp(leftLeft, minLeft, maxLeft);
  const clampedBottomTop = clamp(bottomTop, minTop, maxTop);
  const clampedTopTop = clamp(topTop, minTop, maxTop);

  const rightOverflow = Math.abs(clampedRightLeft - rightLeft);
  const leftOverflow = Math.abs(clampedLeftLeft - leftLeft);
  const bottomOverflow = Math.abs(clampedBottomTop - bottomTop);
  const topOverflow = Math.abs(clampedTopTop - topTop);

  return {
    left: fitsRight
      ? rightLeft
      : fitsLeft
        ? leftLeft
        : rightOverflow <= leftOverflow
          ? clampedRightLeft
          : clampedLeftLeft,
    top: fitsBottom
      ? bottomTop
      : fitsTop
        ? topTop
        : bottomOverflow <= topOverflow
          ? clampedBottomTop
          : clampedTopTop,
  };
}

function formatDamage(value: number): string {
  return Math.round(value).toLocaleString();
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + (radius * Math.cos(radians)),
    y: cy + (radius * Math.sin(radians)),
  };
}

function getSliceTooltipAnchor(startAngle: number, endAngle: number, radius = 92) {
  const midAngle = startAngle + ((endAngle - startAngle) / 2);
  return polarToCartesian(150, 150, radius, midAngle);
}

function describePieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const safeEndAngle = endAngle - 0.35;
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, safeEndAngle);
  const largeArcFlag = safeEndAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
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
      const hits = Array.from(move.hits.entries())
        .map(([hitName, damage]) => ({
          name: hitName,
          damage,
          percentage: (damage / totalDamage) * 100,
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

function buildPieSegments(moves: ProcessedMove[], activeMoveIndex: number | null): PieSegment[] {
  let angle = 0;

  return moves.map((move, moveIndex) => {
    const segmentAngle = (move.percentage / 100) * 360;
    const startAngle = angle;
    const endAngle = angle + segmentAngle;
    angle = endAngle;
    const tooltipAnchor = getSliceTooltipAnchor(startAngle, endAngle);
    let hitAngle = startAngle;
    const hitSegments = move.hits.map((hit, hitIndex) => {
      const nextHitAngle = hitAngle + ((hit.damage / move.damage) * segmentAngle);
      const hitTooltipAnchor = getSliceTooltipAnchor(hitAngle, nextHitAngle, 76);
      const hitSegment: HitSegment = {
        key: `${moveIndex}:${hit.name}`,
        title: hit.name,
        damage: hit.damage,
        percentage: hit.percentage,
        path: describePieSlice(150, 150, 126, hitAngle, nextHitAngle),
        tooltipAnchorX: hitTooltipAnchor.x,
        tooltipAnchorY: hitTooltipAnchor.y,
      };
      hitAngle = nextHitAngle;
      return {
        ...hitSegment,
        key: hitIndex === 0 ? hitSegment.key : `${hitSegment.key}:${hitIndex}`,
      };
    });

    return {
      key: `move-${move.name}-${moveIndex}`,
      moveIndex,
      color: CHART_COLORS[moveIndex % CHART_COLORS.length],
      opacity: activeMoveIndex === null || activeMoveIndex === moveIndex ? 1 : 0.34,
      path: describePieSlice(150, 150, 126, startAngle, endAngle),
      tooltipAnchorX: tooltipAnchor.x,
      tooltipAnchorY: tooltipAnchor.y,
      hitSegments,
    };
  });
}

interface BuildMoveBreakdownProps {
  isLoading: boolean;
  error: string | null;
  moves: LBMoveEntry[];
}

export const BuildMoveBreakdown: React.FC<BuildMoveBreakdownProps> = ({
  isLoading,
  error,
  moves,
}) => {
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null);
  const [activeHitKey, setActiveHitKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const processedMoves = useMemo(() => processMoves(moves), [moves]);
  const totalDamage = useMemo(
    () => processedMoves.reduce((sum, move) => sum + move.damage, 0),
    [processedMoves],
  );
  const totalHits = useMemo(
    () => processedMoves.reduce((sum, move) => sum + move.hits.length, 0),
    [processedMoves],
  );
  const pieSegments = useMemo(
    () => buildPieSegments(processedMoves, activeMoveIndex),
    [activeMoveIndex, processedMoves],
  );
  const activeHitSegment = useMemo(() => {
    if (activeMoveIndex === null || activeHitKey === null) return null;
    const segment = pieSegments[activeMoveIndex];
    if (!segment) return null;
    return segment.hitSegments.find((hitSegment) => hitSegment.key === activeHitKey) ?? null;
  }, [activeHitKey, activeMoveIndex, pieSegments]);

  function setTooltipFromAnchor(
    anchorX: number,
    anchorY: number,
    nextTooltip: Omit<TooltipState, 'anchorX' | 'anchorY' | 'left' | 'top'>,
  ) {
    const bounds = chartRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const tooltipWidth = tooltipRef.current?.getBoundingClientRect().width ?? 0;
    const tooltipHeight = tooltipRef.current?.getBoundingClientRect().height ?? 0;
    const position = resolveTooltipPosition(
      anchorX,
      anchorY,
      bounds.width,
      bounds.height,
      tooltipWidth,
      tooltipHeight,
    );

    setTooltip({
      ...nextTooltip,
      anchorX,
      anchorY,
      left: position.left,
      top: position.top,
    });
  }

  function setTooltipFromEvent(
    event: React.MouseEvent<SVGPathElement>,
    nextTooltip: Omit<TooltipState, 'anchorX' | 'anchorY' | 'left' | 'top'>,
  ) {
    const bounds = chartRef.current?.getBoundingClientRect()
      ?? event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;

    const anchorX = event.clientX - bounds.left;
    const anchorY = event.clientY - bounds.top;
    setTooltipFromAnchor(anchorX, anchorY, nextTooltip);
  }

  useLayoutEffect(() => {
    if (!tooltip || !chartRef.current || !tooltipRef.current) return;

    const bounds = chartRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const nextPosition = resolveTooltipPosition(
      tooltip.anchorX,
      tooltip.anchorY,
      bounds.width,
      bounds.height,
      tooltipRect.width,
      tooltipRect.height,
    );

    if (nextPosition.left === tooltip.left && nextPosition.top === tooltip.top) return;

    setTooltip((current) => (
      current
        ? {
            ...current,
            left: nextPosition.left,
            top: nextPosition.top,
          }
        : current
    ));
  }, [tooltip]);

  return (
    <section className="space-y-3">
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
        <div className="grid gap-6 lg:grid-cols-[minmax(340px,36%)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-3 lg:sticky lg:top-3">
            <div ref={chartRef} className="relative mx-auto aspect-square w-full max-w-[420px]">
              <svg viewBox="0 0 300 300" className="h-full w-full">
                <circle cx="150" cy="150" r="126" fill="rgba(255,255,255,0.035)" />
                {pieSegments.map((segment) => {
                  const move = processedMoves[segment.moveIndex];
                  return (
                    <path
                      key={segment.key}
                      d={segment.path}
                      fill={segment.color}
                      opacity={segment.opacity}
                      stroke="rgba(19,18,18,0.65)"
                      strokeWidth="1.2"
                      className="cursor-pointer transition-opacity duration-150"
                      onMouseEnter={(event) => {
                        setActiveMoveIndex(segment.moveIndex);
                        setActiveHitKey(null);
                        if (move) {
                          setTooltipFromEvent(event, {
                            title: move.name,
                            damage: move.damage,
                            percentage: move.percentage,
                          });
                        }
                      }}
                      onMouseMove={(event) => {
                        if (move) {
                          setTooltipFromEvent(event, {
                            title: move.name,
                            damage: move.damage,
                            percentage: move.percentage,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        setActiveMoveIndex(null);
                        setTooltip(null);
                      }}
                    />
                  );
                })}
                {activeHitSegment && (
                  <path
                    d={activeHitSegment.path}
                    fill={pieSegments[activeMoveIndex ?? 0]?.color ?? '#ffffff'}
                    opacity={0.98}
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="1.35"
                    className="drop-shadow-[0_0_12px_rgba(0,0,0,0.28)]"
                  />
                )}
              </svg>

              {tooltip && (
                <div
                  ref={tooltipRef}
                  className="pointer-events-none absolute z-10 w-max min-w-36 rounded-md border border-accent/70 bg-[#131313]/95 px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.38)]"
                  style={{ left: tooltip.left, top: tooltip.top }}
                >
                  <div className="whitespace-nowrap text-sm font-semibold text-white/96">{tooltip.title}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-base font-semibold text-accent">{formatDamage(tooltip.damage)}</span>
                    <span className="text-xs text-text-primary/74">[{formatPercentStat(tooltip.percentage)}]</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mx-auto max-w-[420px] rounded-lg border border-border/45 bg-background-secondary/24 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/42">
                Total Damage
              </div>
              <div className="mt-1 text-xl font-semibold text-white/92">{formatDamage(totalDamage)}</div>
              <div className="mt-1 text-xs text-text-primary/48">
                {processedMoves.length} moves • {totalHits} hits
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {processedMoves.map((move, moveIndex) => {
              const isMoveActive = activeMoveIndex === null || activeMoveIndex === moveIndex;
              const color = CHART_COLORS[moveIndex % CHART_COLORS.length];
              const segment = pieSegments[moveIndex];

              return (
                <article
                  key={`${move.name}-${moveIndex}`}
                  className={`rounded-lg border px-3 py-2.5 transition-colors ${
                    isMoveActive
                      ? 'border-accent/25 bg-background-secondary/42'
                      : 'border-border/55 bg-background-secondary/20 opacity-55'
                  }`}
                  onMouseEnter={() => {
                    setActiveMoveIndex(moveIndex);
                    setActiveHitKey(null);
                    if (segment) {
                      setTooltipFromAnchor(segment.tooltipAnchorX, segment.tooltipAnchorY, {
                        title: move.name,
                        damage: move.damage,
                        percentage: move.percentage,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setActiveMoveIndex(null);
                    setActiveHitKey(null);
                    setTooltip(null);
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
                        <div className="mt-2">
                          {move.hits.map((hit, hitIndex) => {
                            const hitSegment = segment?.hitSegments[hitIndex];
                            const hitKey = hitSegment?.key ?? `${moveIndex}:${hit.name}`;
                            const isHitActive = activeHitKey === null || activeHitKey === hitKey;

                            return (
                              <div
                                key={`${move.name}-${hit.name}-${hitIndex}`}
                                className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 rounded px-4 py-1.5 text-sm transition-colors cursor-pointer ${
                                  isHitActive ? 'bg-black/10' : 'opacity-45'
                                }`}
                                onMouseEnter={() => {
                                  setActiveMoveIndex(moveIndex);
                                  setActiveHitKey(hitKey);
                                  if (hitSegment) {
                                    setTooltipFromAnchor(hitSegment.tooltipAnchorX, hitSegment.tooltipAnchorY, {
                                      title: hitSegment.title,
                                      damage: hitSegment.damage,
                                      percentage: hitSegment.percentage,
                                    });
                                  }
                                }}
                                onMouseLeave={() => {
                                  setActiveHitKey(null);
                                  setActiveMoveIndex(moveIndex);
                                  if (segment) {
                                    setTooltipFromAnchor(segment.tooltipAnchorX, segment.tooltipAnchorY, {
                                      title: move.name,
                                      damage: move.damage,
                                      percentage: move.percentage,
                                    });
                                  }
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

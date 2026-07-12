'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LBMoveEntry } from '@/lib/lb';
import { ELEMENT_COLOR } from '@/lib/elementVisuals';
import { formatPercentStat } from './formatters';

function formatMoveTypeLabel(moveType: string): string {
  return moveType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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

// Adjustment ring + score-equation dots: teal (not green) for bonuses so the
// bonus/penalty pair stays distinguishable under red-green colorblindness.
const RING_BONUS_COLOR = '#5cc7c2';
const RING_PENALTY_COLOR = '#f87171';

const RING_RADIUS = 138;
const RING_STROKE = 5;
// Keeps a sub-percent adjustment from collapsing to an invisible hairline.
const MIN_RING_ANGLE = 1.5;

type ProcessedHit = {
  name: string;
  damage: number;
  percentage: number;
};

type ProcessedMove = {
  name: string;
  damage: number;
  percentage: number;
  elemType?: string;
  moveTypes?: string[];
  hits: ProcessedHit[];
};

// Global score adjustments: ER scaling (negative), set/echo/sub-DPS bonuses
// (positive). They scale or extend the whole rotation rather than being a part
// of it, and a penalty cannot be drawn as a slice of a positive sum, so they are
// never pie slices. They render as the score equation and as the adjustment ring
// wrapped around the pie.
type ProcessedModifier = {
  name: string;
  damage: number;
  percentage: number;
};

type ProcessedBreakdown = {
  moves: ProcessedMove[];
  modifiers: ProcessedModifier[];
  rawDamage: number;
  totalScore: number;
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

// One arc of the adjustment ring. Bonuses sweep clockwise from 12 o'clock,
// penalties sweep counter-clockwise, so the ring reads as "what the rotation
// gained or lost on the way to the final score".
type RingSegment = {
  key: string;
  name: string;
  damage: number;
  percentage: number;
  color: string;
  path: string;
  tooltipAnchorX: number;
  tooltipAnchorY: number;
};

type TooltipState = {
  title: string;
  damage: number;
  percentage: number;
  elemType?: string;
  moveTypes?: string[];
  // Modifier tooltips carry a sign and take their color from the ring.
  signed?: boolean;
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

function formatModifierDamage(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString();
  return rounded < 0 ? `−${abs}` : `+${abs}`;
}

// Share of move damage, signed. The ER factor (×0.94) rides in the label instead.
function formatModifierPercent(value: number): string {
  const abs = formatPercentStat(Math.abs(value));
  return value < 0 ? `−${abs}` : `+${abs}`;
}

// "ER Scaling (108% / 115% = ×0.94)" → "ER Scaling ×0.94" for the score card.
function compactModifierLabel(name: string): string {
  const base = name.split(' (')[0]?.trim() || name;
  const factor = name.match(/×[\d.]+/)?.[0];
  return factor ? `${base} ${factor}` : base;
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

// Stroked arc (no center point, unlike a pie wedge). Handles either direction:
// endAngle below startAngle sweeps counter-clockwise.
function describeRingArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweepFlag = endAngle >= startAngle ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
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

function processMoves(moves: LBMoveEntry[]): ProcessedBreakdown {
  const grouped = new Map<string, {
    damage: number;
    hits: Map<string, number>;
    elemType?: string;
    moveTypes?: string[];
    modifier: boolean;
  }>();

  for (const move of moves) {
    const key = move.name?.trim() || 'Unnamed Move';
    const existing = grouped.get(key) ?? { damage: 0, hits: new Map<string, number>(), modifier: false };
    existing.damage += move.damage;
    if (move.elemType) existing.elemType = move.elemType;
    if (move.moveTypes) existing.moveTypes = move.moveTypes;
    if (move.modifier) existing.modifier = true;

    for (const hit of move.hits ?? []) {
      const hitKey = hit.name?.trim() || 'Hit';
      existing.hits.set(hitKey, (existing.hits.get(hitKey) ?? 0) + hit.damage);
    }

    grouped.set(key, existing);
  }

  // The backend Modifier flag is the single source of truth for what is a global
  // score adjustment (ER scaling, ScoreAdjust bonuses, healer set/echo bonuses)
  // versus a real rotation move.
  const entries = Array.from(grouped.entries());
  const isModifier = (entry: { modifier: boolean }) => entry.modifier;
  const rawDamage = entries.reduce((sum, [, move]) => (isModifier(move) ? sum : sum + move.damage), 0);
  if (rawDamage <= 0) return { moves: [], modifiers: [], rawDamage: 0, totalScore: 0 };

  const processedMoves = entries
    .filter(([, move]) => !isModifier(move))
    .map(([name, move]) => {
      const hits = Array.from(move.hits.entries())
        .map(([hitName, damage]) => ({
          name: hitName,
          damage,
          percentage: (damage / rawDamage) * 100,
        }))
        .sort((a, b) => b.damage - a.damage);

      return {
        name,
        damage: move.damage,
        percentage: (move.damage / rawDamage) * 100,
        elemType: move.elemType,
        moveTypes: move.moveTypes,
        hits,
      };
    })
    .sort((a, b) => b.damage - a.damage);

  const modifiers = entries
    .filter(([, move]) => isModifier(move))
    .map(([name, move]) => ({
      name,
      damage: move.damage,
      percentage: (move.damage / rawDamage) * 100,
    }))
    .sort((a, b) => b.damage - a.damage);

  const totalScore = entries.reduce((sum, [, move]) => sum + move.damage, 0);

  return { moves: processedMoves, modifiers, rawDamage, totalScore };
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

function buildRingSegments(modifiers: ProcessedModifier[]): RingSegment[] {
  let bonusAngle = 0;
  let penaltyAngle = 0;

  return modifiers.map((modifier, index) => {
    const isBonus = modifier.damage > 0;
    const span = Math.min(
      Math.max((Math.abs(modifier.percentage) / 100) * 360, MIN_RING_ANGLE),
      359,
    );
    // Both directions start at 12 o'clock so the split reads instantly.
    const startAngle = isBonus ? bonusAngle : -penaltyAngle;
    const endAngle = isBonus ? startAngle + span : startAngle - span;
    if (isBonus) bonusAngle += span;
    else penaltyAngle += span;

    const anchor = polarToCartesian(150, 150, RING_RADIUS, (startAngle + endAngle) / 2);

    return {
      key: `modifier-${modifier.name}-${index}`,
      name: modifier.name,
      damage: modifier.damage,
      percentage: modifier.percentage,
      color: isBonus ? RING_BONUS_COLOR : RING_PENALTY_COLOR,
      path: describeRingArc(150, 150, RING_RADIUS, startAngle, endAngle),
      tooltipAnchorX: anchor.x,
      tooltipAnchorY: anchor.y,
    };
  });
}

interface BuildMoveBreakdownProps {
  isLoading: boolean;
  error: string | null;
  moves: LBMoveEntry[];
  onRetry: () => void;
}

export const BuildMoveBreakdown: React.FC<BuildMoveBreakdownProps> = ({
  isLoading,
  error,
  moves,
  onRetry,
}) => {
  const [activeMoveIndex, setActiveMoveIndex] = useState<number | null>(null);
  const [activeHitKey, setActiveHitKey] = useState<string | null>(null);
  const [activeModifierKey, setActiveModifierKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const breakdown = useMemo(() => processMoves(moves), [moves]);
  const processedMoves = breakdown.moves;
  const totalHits = useMemo(
    () => processedMoves.reduce((sum, move) => sum + move.hits.length, 0),
    [processedMoves],
  );
  const pieSegments = useMemo(
    () => buildPieSegments(processedMoves, activeMoveIndex),
    [activeMoveIndex, processedMoves],
  );
  const ringSegments = useMemo(
    () => buildRingSegments(breakdown.modifiers),
    [breakdown.modifiers],
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
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="rounded border border-red-300/50 px-2 py-1 text-xs font-semibold text-red-100 transition-colors hover:bg-red-300/10">
            Retry
          </button>
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
                {/* Pie recedes while a ring arc is hovered, so the arc reads first. */}
                <g
                  opacity={activeModifierKey === null ? 1 : 0.42}
                  className="transition-opacity duration-150"
                >
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
                          setActiveModifierKey(null);
                          if (move) {
                            setTooltipFromEvent(event, {
                              title: move.name,
                              damage: move.damage,
                              percentage: move.percentage,
                              elemType: move.elemType,
                              moveTypes: move.moveTypes,
                            });
                          }
                        }}
                        onMouseMove={(event) => {
                          if (move) {
                            setTooltipFromEvent(event, {
                              title: move.name,
                              damage: move.damage,
                              percentage: move.percentage,
                              elemType: move.elemType,
                              moveTypes: move.moveTypes,
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
                </g>

                {ringSegments.length > 0 && (
                  <g>
                    {/* Solid track = raw move damage. The colored arcs overwrite it, so a
                        small penalty reads as a bite out of a whole rather than a stray
                        tick floating on nothing. */}
                    <circle
                      cx="150"
                      cy="150"
                      r={RING_RADIUS}
                      fill="none"
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={RING_STROKE}
                    />
                    {ringSegments.map((segment) => {
                      const isActive = activeModifierKey === null || activeModifierKey === segment.key;
                      const enterTooltip = {
                        title: segment.name,
                        damage: segment.damage,
                        percentage: segment.percentage,
                        signed: true,
                      };

                      return (
                        <g key={segment.key}>
                          <path
                            d={segment.path}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={RING_STROKE}
                            // Butt caps: round caps overshoot the 12 o'clock baseline and a
                            // penalty would bleed into a bonus starting from the same origin.
                            strokeLinecap="butt"
                            opacity={isActive ? 1 : 0.28}
                            className="transition-opacity duration-150"
                          />
                          {/* Widened invisible stroke so a 5px arc is actually hoverable. */}
                          <path
                            d={segment.path}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={16}
                            strokeLinecap="butt"
                            className="cursor-pointer"
                            style={{ pointerEvents: 'stroke' }}
                            onMouseEnter={(event) => {
                              setActiveModifierKey(segment.key);
                              setActiveMoveIndex(null);
                              setActiveHitKey(null);
                              setTooltipFromEvent(event, enterTooltip);
                            }}
                            onMouseMove={(event) => setTooltipFromEvent(event, enterTooltip)}
                            onMouseLeave={() => {
                              setActiveModifierKey(null);
                              setTooltip(null);
                            }}
                          />
                        </g>
                      );
                    })}
                    {/* Baseline at 12 o'clock, drawn last so it reads over the arcs. Declares
                        the origin: penalties run left of it, bonuses run right. */}
                    <line
                      x1="150"
                      y1={150 - RING_RADIUS - RING_STROKE}
                      x2="150"
                      y2={150 - RING_RADIUS + RING_STROKE}
                      stroke="rgba(255,255,255,0.55)"
                      strokeWidth="1.2"
                    />
                  </g>
                )}
              </svg>

              {tooltip && (
                <div
                  ref={tooltipRef}
                  className="pointer-events-none absolute z-10 w-max min-w-36 rounded-md border border-accent/70 bg-[#131313]/95 px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.38)]"
                  style={{ left: tooltip.left, top: tooltip.top }}
                >
                  <div className="whitespace-nowrap text-sm font-semibold text-white/96">{tooltip.title}</div>
                  {(tooltip.elemType || tooltip.moveTypes?.[0]) && (
                    <div className="mt-1 flex items-center gap-1">
                      {tooltip.elemType && ELEMENT_COLOR[tooltip.elemType] && (
                        <span
                          className="rounded border px-1.5 py-px text-[10px] leading-4"
                          style={{
                            color: ELEMENT_COLOR[tooltip.elemType],
                            borderColor: `${ELEMENT_COLOR[tooltip.elemType]}40`,
                            backgroundColor: `${ELEMENT_COLOR[tooltip.elemType]}12`,
                          }}
                        >
                          {tooltip.elemType}
                        </span>
                      )}
                      {tooltip.moveTypes?.[0] && formatMoveTypeLabel(tooltip.moveTypes[0]) && (
                        <span className="rounded border border-white/10 bg-white/5 px-1.5 py-px text-[10px] leading-4 text-text-primary/48">
                          {formatMoveTypeLabel(tooltip.moveTypes[0])}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className={`text-base font-semibold ${
                        tooltip.signed
                          ? tooltip.damage > 0
                            ? 'text-teal-300'
                            : 'text-red-300'
                          : 'text-accent'
                      }`}
                    >
                      {tooltip.signed ? formatModifierDamage(tooltip.damage) : formatDamage(tooltip.damage)}
                    </span>
                    <span className="text-xs text-text-primary/74">
                      [{tooltip.signed
                        ? formatModifierPercent(tooltip.percentage)
                        : formatPercentStat(tooltip.percentage)}]
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mx-auto max-w-[420px] rounded-lg border border-border/45 bg-background-secondary/24 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/42">
                Total Score
              </div>
              {breakdown.modifiers.length > 0 && (
                <div className="mt-2 space-y-1.5 border-b border-border/50 pb-2.5 text-[13px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-text-primary/62">Move Damage</span>
                    <span className="font-medium tabular-nums text-white/80">{formatDamage(breakdown.rawDamage)}</span>
                  </div>
                  {breakdown.modifiers.map((modifier, modifierIndex) => {
                    const isBonus = modifier.damage > 0;
                    // The dot is the legend key for this modifier's ring arc.
                    const segment = ringSegments[modifierIndex];
                    const isActive = activeModifierKey === null || activeModifierKey === segment?.key;

                    return (
                      <div
                        key={`equation-${modifier.name}`}
                        className={`-mx-1.5 flex cursor-pointer items-baseline justify-between gap-3 rounded px-1.5 py-0.5 transition-colors ${
                          isActive ? 'hover:bg-white/5' : 'opacity-45'
                        }`}
                        onMouseEnter={() => {
                          if (!segment) return;
                          setActiveModifierKey(segment.key);
                          setActiveMoveIndex(null);
                          setActiveHitKey(null);
                          setTooltipFromAnchor(segment.tooltipAnchorX, segment.tooltipAnchorY, {
                            title: segment.name,
                            damage: segment.damage,
                            percentage: segment.percentage,
                            signed: true,
                          });
                        }}
                        onMouseLeave={() => {
                          setActiveModifierKey(null);
                          setTooltip(null);
                        }}
                      >
                        <span
                          className={`flex min-w-0 items-center gap-1.5 ${isBonus ? 'text-teal-200/85' : 'text-red-200/85'}`}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: isBonus ? RING_BONUS_COLOR : RING_PENALTY_COLOR }}
                          />
                          <span className="truncate">{compactModifierLabel(modifier.name)}</span>
                        </span>
                        <span className="flex shrink-0 items-baseline gap-2">
                          <span className="tabular-nums text-text-primary/42">
                            {formatModifierPercent(modifier.percentage)}
                          </span>
                          <span className={`font-medium tabular-nums ${isBonus ? 'text-teal-300' : 'text-red-300'}`}>
                            {formatModifierDamage(modifier.damage)}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-1.5 text-2xl font-semibold tabular-nums text-white/92">{formatDamage(breakdown.totalScore)}</div>
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
                    setActiveModifierKey(null);
                    if (segment) {
                      setTooltipFromAnchor(segment.tooltipAnchorX, segment.tooltipAnchorY, {
                        title: move.name,
                        damage: move.damage,
                        percentage: move.percentage,
                        elemType: move.elemType,
                        moveTypes: move.moveTypes,
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
                        <div className="shrink-0 text-sm font-semibold text-accent">{formatDamage(move.damage)}</div>
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          {move.elemType && ELEMENT_COLOR[move.elemType] && (
                            <span
                              className="rounded border px-1.5 py-px text-[10px] leading-4"
                              style={{
                                color: ELEMENT_COLOR[move.elemType],
                                borderColor: `${ELEMENT_COLOR[move.elemType]}40`,
                                backgroundColor: `${ELEMENT_COLOR[move.elemType]}12`,
                              }}
                            >
                              {move.elemType}
                            </span>
                          )}
                          {move.moveTypes?.[0] && (
                            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-px text-[10px] leading-4 text-text-primary/48">
                              {formatMoveTypeLabel(move.moveTypes[0])}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-primary/52">{move.percentage.toFixed(1)}%</div>
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
                                      elemType: move.elemType,
                                      moveTypes: move.moveTypes,
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

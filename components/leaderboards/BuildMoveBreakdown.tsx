'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LBMoveEntry } from '@/lib/lb';
import { processMoves, typeMeta, TypeTotal } from '@/lib/moveBreakdown';
import { ELEMENT_COLOR } from '@/lib/elementVisuals';
import { STATUS_NEGATIVE_COLOR, STATUS_POSITIVE_COLOR } from './constants';
import { formatDamage } from './formatters';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

const BONUS_COLOR = STATUS_POSITIVE_COLOR;
const PENALTY_COLOR = STATUS_NEGATIVE_COLOR;
const HEAL_COLOR = '#67d4a7';

const LANE_TRACK = 'absolute inset-0 rounded-xs bg-white/4';

function formatModifierDamage(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString();
  return rounded < 0 ? `−${abs}` : `+${abs}`;
}

function formatSignedPercent(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(1)}%`;
}

function formatBaseMV(value: number): string {
  return `${value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`;
}

function formatHealFormula(flatHeal: number, baseMV: number, scaleStat: string): string {
  const terms: string[] = [];
  if (flatHeal > 0) {
    terms.push(flatHeal.toLocaleString(undefined, { maximumFractionDigits: 2 }));
  }
  if (baseMV > 0) {
    terms.push(`${formatBaseMV(baseMV)} ${scaleStat || 'ATK'}`);
  }
  return terms.join(' + ');
}

// "ER Scaling (108% / 115% = ×0.94)" → "ER Scaling ×0.94" for the equation chip.
function compactModifierLabel(name: string): string {
  const base = name.split(' (')[0]?.trim() || name;
  const factor = name.match(/×[\d.]+/)?.[0];
  return factor ? `${base} ${factor}` : base;
}

type TooltipState = {
  /** Viewport x of the anchoring segment's centre. */
  x: number;
  /** Viewport y of the anchoring segment's top edge. */
  y: number;
  title: string;
  detail: string;
};

const TOOLTIP_EDGE_MARGIN = 96;

type SortMode = 'damage' | 'rotation';

interface BuildMoveBreakdownProps {
  isLoading: boolean;
  error: string | null;
  moves: LBMoveEntry[];
  isHealing?: boolean;
  /**
   * The board's own score for this build. The local sum of per-move floats
   * lands an integer or two away from the backend total after rounding, which
   * showed up as the row and this panel disagreeing about the same figure.
   * Ignored unless it agrees with the local sum, so a stale or mismatched
   * board can never be presented as this rotation's total.
   */
  scoreOverride?: number;
  onRetry: () => void;
}

export const BuildMoveBreakdown: React.FC<BuildMoveBreakdownProps> = ({
  isLoading,
  error,
  moves,
  isHealing = false,
  scoreOverride,
  onRetry,
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('damage');
  // Legend/profile hover: transient dim of non-matching rows, segments, chips.
  const [typeFocus, setTypeFocus] = useState<string | null>(null);
  // Legend click: sticky version of the same focus, so keyboard/touch users can
  // reach the highlight and it survives pointer-leave. Hover previews over it.
  const [pinnedType, setPinnedType] = useState<string | null>(null);
  // Row hover: dims non-matching profile segments only. Stored as a joined
  // string, not an array, so re-entering the same row is a no-op set instead of
  // a fresh identity that re-renders every row in the table.
  const [rowFocusKey, setRowFocusKey] = useState<string | null>(null);
  const [expandedMoves, setExpandedMoves] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const activeType = typeFocus ?? pinnedType;

  const breakdown = useMemo(() => processMoves(moves), [moves]);
  // Healing is scored as one backend window, but its source hits are the
  // player-facing peers. Flatten them into ordinary numbered rows so healing
  // and damage breakdowns share the same table semantics.
  const displayMoves = useMemo(() => {
    if (!isHealing) return breakdown.moves;
    return breakdown.moves.flatMap((move) => {
      if (move.hits.length === 0) return [move];
      return move.hits.map((source) => ({
        ...move,
        key: source.key,
        name: `${source.name}${source.count > 1 ? ` ×${source.count}` : ''}`,
        damage: source.damage,
        percentage: source.percentage,
        baseMV: source.baseMV,
        flatHeal: source.flatHeal,
        rotationIndex: (move.rotationIndex * 1000) + source.rotationIndex,
        hits: [],
        typeSegments: [{ type: source.displayType, damage: source.damage }],
      }));
    });
  }, [breakdown.moves, isHealing]);
  const sortedMoves = useMemo(() => {
    if (sortMode === 'rotation') {
      return [...displayMoves].sort((a, b) => a.rotationIndex - b.rotationIndex);
    }
    return [...displayMoves].sort((a, b) => b.damage - a.damage);
  }, [displayMoves, sortMode]);
  const localScore = breakdown.totalScore;
  const agreesWithBoard = scoreOverride !== undefined
    && scoreOverride > 0
    && Math.abs(scoreOverride - localScore) <= Math.max(1, localScore * 0.001);
  const totalScore = agreesWithBoard ? scoreOverride : localScore;
  const bonusTotal = breakdown.modifiers.reduce((sum, m) => (m.damage > 0 ? sum + m.damage : sum), 0);
  const penaltyTotal = breakdown.modifiers.reduce((sum, m) => (m.damage < 0 ? sum - m.damage : sum), 0);

  // Waterfall geometry: everything is a fraction of the widest quantity so the
  // track never overflows. The deltas chain off the running total — penalty
  // bites the raw tail, and the bonus starts where the penalty left off, not
  // back at the raw end — so the score marker lands exactly on the bonus tip.
  const waterfallTop = Math.max(breakdown.rawDamage, totalScore);
  const rawPct = waterfallTop > 0 ? (breakdown.rawDamage / waterfallTop) * 100 : 0;
  const penaltyPct = waterfallTop > 0 ? Math.max((penaltyTotal / waterfallTop) * 100, penaltyTotal > 0 ? 0.9 : 0) : 0;
  const bonusPct = waterfallTop > 0 ? (bonusTotal / waterfallTop) * 100 : 0;
  const scorePct = waterfallTop > 0 ? (totalScore / waterfallTop) * 100 : 0;
  const displayedSourceCount = displayMoves.length;
  const sourceCountLabel = `${displayedSourceCount} ${isHealing ? 'healing source' : 'move'}${displayedSourceCount === 1 ? '' : 's'}`;

  // Anchored to the segment, not the cursor: a segment can be 1000px wide, so a
  // tooltip parked at the entry point drifts far from the pointer, and following
  // the pointer meant a setState (and a re-render of every row) per mousemove.
  const showSegmentTooltip = (element: HTMLElement, total: TypeTotal) => {
    const rect = element.getBoundingClientRect();
    setTooltip({
      x: rect.left + (rect.width / 2),
      y: rect.top,
      title: typeMeta(total.type).label,
      detail: `${formatDamage(total.damage)}  [${total.percentage.toFixed(1)}%]`,
    });
  };

  const toggleExpanded = (moveKey: string) => {
    setExpandedMoves((prev) => {
      const next = new Set(prev);
      if (next.has(moveKey)) next.delete(moveKey);
      else next.add(moveKey);
      return next;
    });
  };

  return (
    <section className="w-full space-y-3">
      {isLoading && (
        // Mirrors the real layout (summary card, profile bar, legend, rows) so
        // the panel does not jump when the data lands.
        <div className="animate-pulse space-y-3">
          <div className="rounded-lg border border-border/45 bg-background-secondary/24 px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="h-3 w-24 rounded bg-white/8" />
              <div className="h-6 w-32 rounded bg-white/10" />
            </div>
            <div className="mt-4 border-t border-border/45 pt-3.5">
              <div className="h-3 w-28 rounded bg-white/8" />
              <div className="mt-2.5 h-3 w-full rounded bg-white/8" />
              <div className="mt-2.5 flex gap-1.5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`legend-skeleton-${index}`} className="h-6 w-28 rounded-md bg-white/6" />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`move-skeleton-${index}`} className="h-10 rounded-lg border border-border/45 bg-background-secondary/20" />
            ))}
          </div>
        </div>
      )}

      {!isLoading && error && (
        <ErrorBanner onRetry={onRetry}>{error}</ErrorBanner>
      )}

      {!isLoading && !error && breakdown.moves.length === 0 && (
        <div className="py-1 text-sm text-text-primary/60">
          No {isHealing ? 'healing' : 'move'} breakdown available for this board.
        </div>
      )}

      {!isLoading && !error && breakdown.moves.length > 0 && (
        <>
          {/* Score equation + waterfall + optional damage profile */}
          <div className="rounded-lg border border-border/45 bg-background-secondary/24 px-4 py-3.5">
            {/* Without modifiers the raw total IS the score; the equation row
                would just restate one number, so the header carries it inline. */}
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-text-primary/55">
                Total Score
              </h3>
              {breakdown.modifiers.length === 0 && (
                <div className="flex items-baseline gap-2.5">
                  {/* Proportional figures: tabular gives every digit a zero's width, which reads loose at display size. */}
                  <span className="text-2xl font-bold text-accent-hover">{formatDamage(totalScore)}</span>
                  <span className="text-2xs text-text-primary/58">{sourceCountLabel}</span>
                </div>
              )}
            </div>

            {breakdown.modifiers.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-text-primary/58">{isHealing ? 'Raw healing' : 'Move damage'}</span>
                  <span className="text-xl font-semibold tabular-nums text-white/85">{formatDamage(breakdown.rawDamage)}</span>
                </div>

                {breakdown.modifiers.map((modifier) => {
                  const isBonus = modifier.damage > 0;
                  return (
                    <div
                      key={modifier.key}
                      className="flex flex-col gap-0.5 rounded-md border border-border/45 bg-background-secondary/40 px-3 py-1.5"
                      title={modifier.name}
                    >
                      <span className="flex items-center gap-1.5 text-2xs font-semibold text-text-primary/62">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: isBonus ? BONUS_COLOR : PENALTY_COLOR }}
                        />
                        {compactModifierLabel(modifier.name)}
                      </span>
                      <span className="flex items-baseline gap-2 text-sm font-semibold tabular-nums" style={{ color: isBonus ? BONUS_COLOR : PENALTY_COLOR }}>
                        {formatModifierDamage(modifier.damage)}
                        <span className="text-2xs font-medium text-text-primary/58">{formatSignedPercent(modifier.percentage)}</span>
                      </span>
                    </div>
                  );
                })}

                <div className="ml-auto flex flex-col gap-0.5 text-right max-sm:ml-0 max-sm:w-full max-sm:text-left">
                  <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-text-primary/58">Score</span>
                  <span className="text-2xl font-bold text-accent-hover">{formatDamage(totalScore)}</span>
                  <span className="text-2xs text-text-primary/58">{sourceCountLabel}</span>
                </div>
              </div>
            )}

            {breakdown.modifiers.length > 0 && (
              <div className="mt-3" aria-hidden="true">
                <div className="relative h-3.5 rounded bg-white/5">
                  <div
                    className="absolute inset-y-0 left-0 rounded-l bg-linear-to-b from-accent/55 to-accent/35"
                    style={{ width: `${rawPct}%`, borderRadius: bonusPct > 0 ? '4px 0 0 4px' : '4px' }}
                  />
                  {penaltyTotal > 0 && (
                    <div
                      className="absolute inset-y-0"
                      style={{
                        left: `${rawPct - penaltyPct}%`,
                        width: `${penaltyPct}%`,
                        background: `repeating-linear-gradient(135deg, ${PENALTY_COLOR}c0 0 3px, ${PENALTY_COLOR}40 3px 6px)`,
                        borderRadius: bonusPct > 0 ? '0' : '0 4px 4px 0',
                      }}
                    />
                  )}
                  {bonusTotal > 0 && (
                    <div
                      className="absolute inset-y-0 rounded-r"
                      style={{
                        left: `calc(${rawPct - penaltyPct}% + 2px)`,
                        width: `calc(${bonusPct}% - 2px)`,
                        background: `linear-gradient(180deg, ${BONUS_COLOR}e6, ${BONUS_COLOR}a6)`,
                      }}
                    />
                  )}
                  <div
                    className="absolute -bottom-1 -top-1 w-0.5 rounded-full bg-white/85"
                    style={{ left: `${scorePct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-2xs text-text-primary/55">
                  <span><span className="font-semibold text-text-primary/70">{isHealing ? 'Raw healing' : 'Move damage'}</span> {formatDamage(breakdown.rawDamage)}</span>
                  <span><span className="font-semibold text-text-primary/70">Score</span> {formatDamage(totalScore)}</span>
                </div>
              </div>
            )}

            {/* A heal window has no meaningful damage-type profile. */}
            {!isHealing && (
              <div className="mt-4 border-t border-border/45 pt-3.5">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-text-primary/55">Damage profile</h3>
                  <span className="ml-auto text-2xs text-text-primary/58">by move type</span>
                </div>
                {/* Thin, and no text inside. In-segment labels were gated on a
                    data threshold (>= 14%) rather than a measurement, so the
                    same label that fit on desktop was cropped by the segment's
                    own overflow at narrow widths, and a fixed black ink failed
                    contrast on five of the fourteen fills. The chips below are
                    the legend and carry every label, share and figure. */}
                <div className="mt-2.5 flex h-3 gap-0.5 overflow-hidden rounded-sm">
                  {breakdown.typeTotals.map((total) => {
                    const meta = typeMeta(total.type);
                    const dimmed =
                      (activeType !== null && activeType !== total.type)
                      || (pinnedType === null && rowFocusKey !== null && !rowFocusKey.split('|').includes(total.type));
                    return (
                      <div
                        key={`profile-${total.type}`}
                        className={`relative min-w-0.75 cursor-pointer transition-opacity duration-150 ${dimmed ? 'opacity-30' : ''}`}
                        style={{ width: `${total.percentage}%`, backgroundColor: meta.color }}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== 'mouse') return;
                          setTypeFocus(total.type);
                          showSegmentTooltip(event.currentTarget, total);
                        }}
                        onPointerLeave={() => {
                          setTypeFocus(null);
                          setTooltip(null);
                        }}
                      />
                    );
                  })}
                </div>
                {/* Chips pin the highlight on click (keyboard/touch reach it too);
                    hover still previews. */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {breakdown.typeTotals.map((total) => {
                    const meta = typeMeta(total.type);
                    const isPinned = pinnedType === total.type;
                    const dimmed = activeType !== null && activeType !== total.type;
                    return (
                      <button
                        key={`legend-${total.type}`}
                        type="button"
                        aria-pressed={isPinned}
                        className={`flex items-baseline gap-1.5 rounded-md border bg-background-secondary/40 px-2.5 py-1 transition-[opacity,border-color] duration-150 hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${isPinned ? 'border-accent/70' : 'border-border/45'} ${dimmed ? 'opacity-45' : ''}`}
                        onClick={() => setPinnedType((prev) => (prev === total.type ? null : total.type))}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== 'mouse') return;
                          setTypeFocus(total.type);
                        }}
                        onPointerLeave={() => setTypeFocus(null)}
                        onFocus={() => setTypeFocus(total.type)}
                        onBlur={() => setTypeFocus(null)}
                      >
                        <span className="h-2 w-2 self-center rounded-xs" style={{ backgroundColor: meta.color }} />
                        <span className="text-xs font-semibold text-text-primary/62">{meta.label}</span>
                        <span className="text-xs font-bold tabular-nums text-white/82">{total.percentage.toFixed(1)}%</span>
                        <span className="text-2xs tabular-nums text-text-primary/58">{formatDamage(total.damage)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Move rows */}
          <div>
            <div className="flex items-center gap-3 px-1 pb-2.5">
              <h3 className="text-2xs font-semibold uppercase tracking-[0.18em] text-text-primary/55">{isHealing ? 'Healing sources' : 'Moves'}</h3>
              {breakdown.dominantElement && ELEMENT_COLOR[breakdown.dominantElement] && (
                <span
                  className="rounded border px-1.5 py-px text-3xs leading-4"
                  style={{
                    color: ELEMENT_COLOR[breakdown.dominantElement],
                    borderColor: `${ELEMENT_COLOR[breakdown.dominantElement]}40`,
                    backgroundColor: `${ELEMENT_COLOR[breakdown.dominantElement]}12`,
                  }}
                >
                  {breakdown.dominantElement}
                </span>
              )}
              <div className="ml-auto flex gap-1 rounded-md border border-border/45 bg-background-secondary/40 p-0.5">
                {([['damage', isHealing ? 'By healing' : 'By damage'], ['rotation', 'Rotation order']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={sortMode === mode}
                    onClick={() => setSortMode(mode)}
                    className={`rounded px-2.5 py-1 text-2xs font-semibold transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      sortMode === mode
                        ? 'bg-accent/16 text-accent-hover'
                        : 'text-text-primary/55 hover:text-text-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Column labels for the two right-hand numbers, so share vs damage
                doesn't need inference. Mirrors the row grid below. The leading
                column changes meaning with the sort, so it says which. */}
            <div className="grid grid-cols-[26px_minmax(0,1fr)_minmax(120px,420px)_52px_92px_24px] items-center gap-3 px-2.5 pb-1.5 text-3xs font-semibold uppercase text-text-primary/55 max-lg:grid-cols-[26px_minmax(0,1fr)_52px_92px_24px]">
              <span className="text-center">{sortMode === 'damage' ? 'Rank' : '#'}</span>
              <span className="tracking-[0.08em]" />
              <span className="max-lg:hidden tracking-[0.08em]">Share of score</span>
              <span className="text-right tracking-[0.08em]">Share</span>
              <span className="text-right tracking-[0.08em]">{isHealing ? 'Healing' : 'Damage'}</span>
              <span />
            </div>

            {/* Keyed on the sort so switching remounts the list: the rows fade
                back in staggered, which reads as "same rows, reordered" instead
                of an instant jump. Expansion state lives above this. */}
            <div className="space-y-1.5" key={sortMode}>
              {sortedMoves.map((move, index) => {
                const segmentTypes = move.typeSegments.map((segment) => segment.type);
                const dimmed = activeType !== null && !segmentTypes.includes(activeType);
                const hasHits = move.hits.length > 0;
                const canToggle = hasHits;
                const isExpanded = expandedMoves.has(move.key);
                const showElementChip = Boolean(
                  move.elemType && move.elemType !== breakdown.dominantElement && ELEMENT_COLOR[move.elemType],
                );
                const stagger = Math.min(index, 8);

                return (
                  <article
                    key={move.key}
                    className={`lb-row-in rounded-lg border border-border/45 bg-background-secondary/20 transition-[opacity,border-color,background-color] duration-150 hover:border-accent/40 hover:bg-background-secondary/40 ${dimmed ? 'opacity-45' : ''}`}
                    style={{ animationDelay: `${stagger * 20}ms` }}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== 'mouse') return;
                      setRowFocusKey(segmentTypes.join('|'));
                    }}
                    onPointerLeave={() => setRowFocusKey(null)}
                  >
                    {/* Whole row toggles nested damage hits. Healing sources are
                        flattened into peer rows before rendering. */}
                    {/* Row click is a convenience; the chevron button below is the
                        accessible toggle (keyboard + aria-expanded). */}
                    <div
                      className={`grid grid-cols-[26px_minmax(0,1fr)_minmax(120px,420px)_52px_92px_24px] items-center gap-3 px-2.5 py-2 max-lg:grid-cols-[26px_minmax(0,1fr)_52px_92px_24px] ${canToggle ? 'cursor-pointer transition-colors duration-100 active:bg-white/6' : ''}`}
                      onClick={canToggle ? () => toggleExpanded(move.key) : undefined}
                    >
                      {/* Sequential in both sort modes; the raw rotation index skips
                          slots (folded repeats, modifiers) and reads as missing rows. */}
                      <span className="text-center text-2xs font-semibold tabular-nums text-text-primary/58">
                        {index + 1}
                      </span>

                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="truncate text-sm font-semibold text-text-primary">
                          {move.name}
                        </span>
                        {/* Type/element chips hug the name (stable identity, same
                            position whether or not the row carries an MV). */}
                        <span className="flex shrink-0 gap-1">
                          {showElementChip && move.elemType && (
                            <span
                              className="rounded border px-1.5 py-px text-3xs leading-4"
                              style={{
                                color: ELEMENT_COLOR[move.elemType],
                                borderColor: `${ELEMENT_COLOR[move.elemType]}40`,
                                backgroundColor: `${ELEMENT_COLOR[move.elemType]}12`,
                              }}
                            >
                              {move.elemType}
                            </span>
                          )}
                          {move.moveTypes.map((moveType) => (
                            <span
                              key={`${move.key}-chip-${moveType}`}
                              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-px text-3xs leading-4 text-text-primary/58 max-sm:hidden"
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: typeMeta(moveType).color }} />
                              {typeMeta(moveType).label}
                            </span>
                          ))}
                        </span>
                        {/* MV trails as metadata after the identity chips. Simple rows
                            only — fold rows carry per-hit MVs in the expansion, and the
                            parent's own-cast MV there would mislead. */}
                        {!hasHits && isHealing && (move.flatHeal > 0 || move.baseMV > 0) && (
                          <span className="shrink-0 text-3xs tabular-nums text-text-primary/58 max-sm:hidden">
                            {formatHealFormula(move.flatHeal, move.baseMV, move.scaleStat)}
                          </span>
                        )}
                        {!hasHits && !isHealing && move.baseMV > 0 && (
                          <span className="shrink-0 text-3xs tabular-nums text-text-primary/58">
                            {formatBaseMV(move.baseMV)} MV{move.scaleStat && move.scaleStat !== 'ATK' ? ` · ${move.scaleStat}` : ''}
                          </span>
                        )}
                      </div>

                      {/* The track is the whole score; the fill is this move's
                          share of it, the same figure the Share column prints. */}
                      <div className="relative h-2.5 max-lg:hidden">
                        <div className={LANE_TRACK} />
                        <div
                          className="lb-bar-grow absolute inset-y-0 left-0 flex gap-0.5"
                          style={{ width: `${move.percentage}%`, animationDelay: `${stagger * 24}ms` }}
                        >
                          {move.typeSegments.map((segment) => (
                            <div
                              key={`${move.key}-segment-${segment.type}`}
                              className="min-w-0.75 rounded-xs"
                              style={{
                                flexGrow: segment.damage,
                                backgroundColor: isHealing ? HEAL_COLOR : typeMeta(segment.type).color,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <span className="text-right text-xs tabular-nums text-text-primary/58">{move.percentage.toFixed(1)}%</span>
                      <span className="text-right text-sm font-semibold tabular-nums text-accent">{formatDamage(move.damage)}</span>

                      {canToggle ? (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`Toggle ${move.name} hits`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpanded(move.key);
                          }}
                          /* -m-2 keeps the 30px hit target from widening the 24px column. */
                          className="-m-2 flex items-center justify-center rounded p-2 text-text-primary/50 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-accent' : ''}`} />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>

                    {/* 0fr → 1fr so the reveal animates. The chevron already
                        rotated on toggle; leaving the content it reveals to pop
                        in was the one place the panel stopped feeling attached
                        to its own control. */}
                    {hasHits && (
                      <div
                        aria-hidden={!isExpanded}
                        className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                      >
                        <div className="overflow-hidden">
                          {/* Same grid + global scale as the parent row so hit bars share
                              one lane and one meaning (share of score); hierarchy reads
                              via the empty number column, indented dot, and dim bg. */}
                          <div className="border-t border-border/45 bg-black/15 py-1">
                            {move.hits.map((hit) => (
                              <div
                                key={hit.key}
                                className="grid grid-cols-[26px_minmax(0,1fr)_minmax(120px,420px)_52px_92px_24px] items-center gap-3 px-2.5 py-1 text-[13px] max-lg:grid-cols-[26px_minmax(0,1fr)_52px_92px_24px]"
                              >
                                <span />
                                <span className="flex min-w-0 items-center gap-2 pl-3 text-text-primary/72">
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: typeMeta(hit.displayType).color }} />
                                  <span className="truncate">{hit.name}{hit.count > 1 ? ` ×${hit.count}` : ''}</span>
                                  {hit.baseMV > 0 && (
                                    <span className="shrink-0 text-3xs tabular-nums text-text-primary/58">{formatBaseMV(hit.baseMV)} MV</span>
                                  )}
                                </span>
                                <div className="max-lg:hidden">
                                  <div
                                    className="h-1.5 min-w-0.75 rounded-xs opacity-80"
                                    style={{
                                      width: `${hit.percentage}%`,
                                      backgroundColor: typeMeta(hit.displayType).color,
                                    }}
                                  />
                                </div>
                                <span className="text-right text-2xs tabular-nums text-text-primary/55">{hit.percentage.toFixed(1)}%</span>
                                <span className="text-right font-medium tabular-nums text-white/80">{formatDamage(hit.damage)}</span>
                                <span />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          {tooltip && (
            <div
              className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-accent/70 bg-[#131313]/95 px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.38)]"
              style={{
                left: typeof window !== 'undefined'
                  ? Math.min(Math.max(tooltip.x, TOOLTIP_EDGE_MARGIN), window.innerWidth - TOOLTIP_EDGE_MARGIN)
                  : tooltip.x,
                top: tooltip.y - 8,
              }}
            >
              <div className="whitespace-nowrap text-sm font-semibold text-white/95">{tooltip.title}</div>
              <div className="mt-0.5 whitespace-pre text-xs tabular-nums text-text-primary/72">{tooltip.detail}</div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

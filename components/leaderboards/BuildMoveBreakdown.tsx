'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LBMoveEntry } from '@/lib/lb';
import { ELEMENT_COLOR } from '@/lib/elementVisuals';

// Fixed move-type identity: every board colors a type the same way, so the
// mapping is learnable across builds. Steps validated (CVD + contrast) against
// the dark surface; the four most co-occurring types hold the four hues that
// pass all-pairs colorblind checks. Red is reserved for penalties and never a
// type color; echo is a deliberate neutral (external summon, not kit).
const MOVE_TYPE_META: Record<string, { label: string; color: string }> = {
  basic_attack: { label: 'Basic Attack', color: '#c98500' },
  heavy_attack: { label: 'Heavy Attack', color: '#008300' },
  resonance_skill: { label: 'Resonance Skill', color: '#3987e5' },
  resonance_liberation: { label: 'Liberation', color: '#d55181' },
  intro: { label: 'Intro', color: '#199e70' },
  outro: { label: 'Outro', color: '#d95926' },
  echo: { label: 'Echo', color: '#7f93a8' },
  coordinated_attack: { label: 'Coordinated', color: '#9085e9' },
};
const FALLBACK_TYPE_COLOR = '#7f93a8';

// Status pair for score modifiers — teal (not green) so the bonus/penalty
// split stays distinguishable under red-green colorblindness.
const BONUS_COLOR = '#5cc7c2';
const PENALTY_COLOR = '#f87171';

function typeMeta(moveType: string): { label: string; color: string } {
  const known = MOVE_TYPE_META[moveType];
  if (known) return known;
  const label = moveType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return { label, color: FALLBACK_TYPE_COLOR };
}

type ProcessedHit = {
  name: string;
  damage: number;
  percentage: number;
  displayType: string;
};

type TypeSegment = {
  type: string;
  damage: number;
};

type ProcessedMove = {
  name: string;
  damage: number;
  percentage: number;
  elemType?: string;
  moveTypes: string[];
  rotationIndex: number;
  hits: ProcessedHit[];
  // Damage split by move type. Derived from typed hits when the backend sends
  // them (per-type sub-hit fold); otherwise a single primary-type segment.
  typeSegments: TypeSegment[];
};

// Global score adjustments (ER scaling, set/echo/sub-DPS bonuses). They scale
// or extend the whole rotation rather than being a part of it — rendered as
// the score equation and the waterfall, never as rotation rows.
type ProcessedModifier = {
  name: string;
  damage: number;
  percentage: number;
};

type TypeTotal = {
  type: string;
  damage: number;
  percentage: number;
};

type ProcessedBreakdown = {
  moves: ProcessedMove[];
  modifiers: ProcessedModifier[];
  typeTotals: TypeTotal[];
  dominantElement: string | null;
  rawDamage: number;
  totalScore: number;
};

function formatDamage(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatModifierDamage(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString();
  return rounded < 0 ? `−${abs}` : `+${abs}`;
}

function formatSignedPercent(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(1)}%`;
}

// "ER Scaling (108% / 115% = ×0.94)" → "ER Scaling ×0.94" for the equation chip.
function compactModifierLabel(name: string): string {
  const base = name.split(' (')[0]?.trim() || name;
  const factor = name.match(/×[\d.]+/)?.[0];
  return factor ? `${base} ${factor}` : base;
}

// The type a hit renders as. A dual-typed hit (Cantarella's Phantom Sting
// coordinated stage is [basic_attack, coordinated_attack]) shows its more
// specific type — the one that differs from the move's primary.
function hitDisplayType(hitTypes: string[] | undefined, primary: string): string {
  if (!hitTypes || hitTypes.length === 0) return primary;
  return hitTypes.find((t) => t !== primary) ?? hitTypes[0];
}

function processMoves(moves: LBMoveEntry[]): ProcessedBreakdown {
  const grouped = new Map<string, {
    damage: number;
    hits: Map<string, { name: string; damage: number; types?: string[] }>;
    elemType?: string;
    moveTypes?: string[];
    modifier: boolean;
    rotationIndex: number;
  }>();

  moves.forEach((move, index) => {
    const key = move.name?.trim() || 'Unnamed Move';
    const existing = grouped.get(key) ?? {
      damage: 0,
      hits: new Map<string, { name: string; damage: number; types?: string[] }>(),
      modifier: false,
      // API row order is rotation order; a repeated cast keeps its first slot.
      rotationIndex: index,
    };
    existing.damage += move.damage;
    if (move.elemType) existing.elemType = move.elemType;
    if (move.moveTypes) existing.moveTypes = move.moveTypes;
    if (move.modifier) existing.modifier = true;

    for (const hit of move.hits ?? []) {
      // Zero-damage hits are trigger bookkeeping (e.g. a 0-MV echo cast folded
      // for rotation accounting), not damage — never rows or type segments.
      if (!(hit.damage > 0)) continue;
      const hitName = hit.name?.trim() || 'Hit';
      // Key by name AND typing so two same-named casts with different types
      // (possible under the per-type sub-hit fold) don't merge into one
      // mis-attributed entry.
      const hitKey = `${hitName}|${hit.moveTypes?.join(',') ?? ''}`;
      const existingHit = existing.hits.get(hitKey) ?? { name: hitName, damage: 0 };
      existingHit.damage += hit.damage;
      if (hit.moveTypes) existingHit.types = hit.moveTypes;
      existing.hits.set(hitKey, existingHit);
    }

    grouped.set(key, existing);
  });

  // The backend Modifier flag is the single source of truth for what is a
  // global score adjustment versus a real rotation move.
  const entries = Array.from(grouped.entries());
  const rawDamage = entries.reduce((sum, [, move]) => (move.modifier ? sum : sum + move.damage), 0);
  if (rawDamage <= 0) {
    return { moves: [], modifiers: [], typeTotals: [], dominantElement: null, rawDamage: 0, totalScore: 0 };
  }

  const processedMoves = entries
    .filter(([, move]) => !move.modifier)
    .map(([name, move]) => {
      const primary = move.moveTypes?.[0] ?? 'unknown';
      // A hit that repeats the row's own name at the row's own type carries no
      // information (a DisplayGroup fold of extra casts of the same move, e.g.
      // Phrolova's Fate/Finality ×3 or Hiyuki's repeated Glacio Bite lanes).
      // Suppress it — its damage flows into the remainder, which is that type
      // anyway — so those rows render as they did before the typed-hit fold.
      const hits: ProcessedHit[] = Array.from(move.hits.values())
        .map((hit) => ({
          name: hit.name,
          damage: hit.damage,
          percentage: (hit.damage / rawDamage) * 100,
          displayType: hitDisplayType(hit.types, primary),
        }))
        .filter((hit) => !(hit.name === name && hit.displayType === primary))
        .sort((a, b) => b.damage - a.damage);

      // Type split from typed hits only — untyped hits (older cached responses)
      // can't vary from the primary, so the move stays a single segment.
      const hasTypedHits = hits.length > 0
        && Array.from(move.hits.values()).some((hit) => hit.types && hit.types.length > 0);
      let typeSegments: TypeSegment[];
      if (hasTypedHits) {
        const byType = new Map<string, number>();
        let hitsSum = 0;
        for (const hit of hits) {
          byType.set(hit.displayType, (byType.get(hit.displayType) ?? 0) + hit.damage);
          hitsSum += hit.damage;
        }
        // Hits may not cover the whole move; the remainder stays primary-typed
        // so segment sums keep matching move damage (and the profile keeps
        // matching raw damage).
        const remainder = move.damage - hitsSum;
        if (remainder > 0.5) byType.set(primary, (byType.get(primary) ?? 0) + remainder);
        typeSegments = Array.from(byType.entries())
          .map(([type, damage]) => ({ type, damage }))
          .sort((a, b) => b.damage - a.damage);
      } else {
        typeSegments = [{ type: primary, damage: move.damage }];
      }

      return {
        name,
        damage: move.damage,
        percentage: (move.damage / rawDamage) * 100,
        elemType: move.elemType,
        moveTypes: move.moveTypes ?? [],
        rotationIndex: move.rotationIndex,
        hits,
        typeSegments,
      };
    })
    .sort((a, b) => b.damage - a.damage);

  const modifiers = entries
    .filter(([, move]) => move.modifier)
    .map(([name, move]) => ({
      name,
      damage: move.damage,
      percentage: (move.damage / rawDamage) * 100,
    }))
    .sort((a, b) => b.damage - a.damage);

  const typeAggregate = new Map<string, number>();
  for (const move of processedMoves) {
    for (const segment of move.typeSegments) {
      typeAggregate.set(segment.type, (typeAggregate.get(segment.type) ?? 0) + segment.damage);
    }
  }
  const typeTotals = Array.from(typeAggregate.entries())
    .map(([type, damage]) => ({ type, damage, percentage: (damage / rawDamage) * 100 }))
    .sort((a, b) => b.damage - a.damage);

  const elementDamage = new Map<string, number>();
  for (const move of processedMoves) {
    if (!move.elemType) continue;
    elementDamage.set(move.elemType, (elementDamage.get(move.elemType) ?? 0) + move.damage);
  }
  const dominantElement = Array.from(elementDamage.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const totalScore = entries.reduce((sum, [, move]) => sum + move.damage, 0);

  return { moves: processedMoves, modifiers, typeTotals, dominantElement, rawDamage, totalScore };
}

type TooltipState = {
  x: number;
  y: number;
  title: string;
  detail: string;
};

type SortMode = 'damage' | 'rotation';

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
  const [sortMode, setSortMode] = useState<SortMode>('damage');
  // Legend/profile hover: dims non-matching rows, segments, and chips.
  const [typeFocus, setTypeFocus] = useState<string | null>(null);
  // Row hover: dims non-matching profile segments only.
  const [rowFocusTypes, setRowFocusTypes] = useState<string[] | null>(null);
  const [expandedMoves, setExpandedMoves] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const breakdown = useMemo(() => processMoves(moves), [moves]);
  const sortedMoves = useMemo(() => {
    if (sortMode === 'rotation') {
      return [...breakdown.moves].sort((a, b) => a.rotationIndex - b.rotationIndex);
    }
    return breakdown.moves;
  }, [breakdown.moves, sortMode]);
  const maxMoveDamage = breakdown.moves[0]?.damage ?? 0;
  const totalHits = useMemo(
    () => breakdown.moves.reduce((sum, move) => sum + move.hits.length, 0),
    [breakdown.moves],
  );
  const bonusTotal = breakdown.modifiers.reduce((sum, m) => (m.damage > 0 ? sum + m.damage : sum), 0);
  const penaltyTotal = breakdown.modifiers.reduce((sum, m) => (m.damage < 0 ? sum - m.damage : sum), 0);

  // Waterfall geometry: everything is a fraction of the widest quantity so the
  // track never overflows. Penalty bites the raw tail; bonus extends past it.
  const waterfallTop = Math.max(breakdown.rawDamage + bonusTotal, breakdown.rawDamage);
  const rawPct = waterfallTop > 0 ? (breakdown.rawDamage / waterfallTop) * 100 : 0;
  const penaltyPct = waterfallTop > 0 ? Math.max((penaltyTotal / waterfallTop) * 100, penaltyTotal > 0 ? 0.9 : 0) : 0;
  const bonusPct = waterfallTop > 0 ? (bonusTotal / waterfallTop) * 100 : 0;
  const scorePct = waterfallTop > 0 ? (breakdown.totalScore / waterfallTop) * 100 : 0;

  const showSegmentTooltip = (event: React.MouseEvent, total: TypeTotal) => {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      title: typeMeta(total.type).label,
      detail: `${formatDamage(total.damage)}  [${total.percentage.toFixed(1)}%]`,
    });
  };

  const toggleExpanded = (moveName: string) => {
    setExpandedMoves((prev) => {
      const next = new Set(prev);
      if (next.has(moveName)) next.delete(moveName);
      else next.add(moveName);
      return next;
    });
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-3">
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

      {!isLoading && !error && breakdown.moves.length === 0 && (
        <div className="py-1 text-sm text-text-primary/60">
          No move breakdown available for this board.
        </div>
      )}

      {!isLoading && !error && breakdown.moves.length > 0 && (
        <>
          {/* Score equation + waterfall + damage profile */}
          <div className="rounded-lg border border-border/45 bg-background-secondary/24 px-4 py-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/42">
              Total Score
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Without modifiers the raw total IS the score; showing both would
                  read as a duplicated number. */}
              {breakdown.modifiers.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-primary/40">Move damage</span>
                  <span className="text-xl font-semibold tabular-nums text-white/85">{formatDamage(breakdown.rawDamage)}</span>
                </div>
              )}

              {breakdown.modifiers.map((modifier) => {
                const isBonus = modifier.damage > 0;
                return (
                  <div
                    key={`modifier-${modifier.name}`}
                    className="flex flex-col gap-0.5 rounded-md border border-border/45 bg-background-secondary/40 px-3 py-1.5"
                    title={modifier.name}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-text-primary/62">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: isBonus ? BONUS_COLOR : PENALTY_COLOR }}
                      />
                      {compactModifierLabel(modifier.name)}
                    </span>
                    <span className="flex items-baseline gap-2 text-sm font-semibold tabular-nums" style={{ color: isBonus ? BONUS_COLOR : PENALTY_COLOR }}>
                      {formatModifierDamage(modifier.damage)}
                      <span className="text-[11px] font-medium text-text-primary/40">{formatSignedPercent(modifier.percentage)}</span>
                    </span>
                  </div>
                );
              })}

              <div className="ml-auto flex flex-col gap-0.5 text-right max-sm:ml-0 max-sm:w-full max-sm:text-left">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-primary/40">Score</span>
                <span className="text-2xl font-bold tabular-nums text-accent-hover">{formatDamage(breakdown.totalScore)}</span>
                <span className="text-[11px] text-text-primary/42">{breakdown.moves.length} moves · {totalHits} hits</span>
              </div>
            </div>

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
                        left: `calc(${rawPct}% + 2px)`,
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
                <div className="mt-1.5 flex justify-between text-[10.5px] text-text-primary/42">
                  <span><span className="font-semibold text-text-primary/58">Move damage</span> {formatDamage(breakdown.rawDamage)}</span>
                  <span><span className="font-semibold text-text-primary/58">Score</span> {formatDamage(breakdown.totalScore)}</span>
                </div>
              </div>
            )}

            {/* Damage profile by move type */}
            <div className="mt-4 border-t border-border/45 pt-3.5">
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/42">Damage profile</span>
                <span className="ml-auto text-[11px] text-text-primary/38">by move type</span>
              </div>
              <div className="mt-2.5 flex h-6 gap-0.5 overflow-hidden rounded-[5px]">
                {breakdown.typeTotals.map((total) => {
                  const meta = typeMeta(total.type);
                  const dimmed =
                    (typeFocus !== null && typeFocus !== total.type)
                    || (rowFocusTypes !== null && !rowFocusTypes.includes(total.type));
                  return (
                    <div
                      key={`profile-${total.type}`}
                      className={`relative min-w-[3px] cursor-pointer transition-opacity duration-150 ${dimmed ? 'opacity-30' : ''}`}
                      style={{ width: `${total.percentage}%`, backgroundColor: meta.color }}
                      onMouseEnter={(event) => {
                        setTypeFocus(total.type);
                        showSegmentTooltip(event, total);
                      }}
                      onMouseMove={(event) => showSegmentTooltip(event, total)}
                      onMouseLeave={() => {
                        setTypeFocus(null);
                        setTooltip(null);
                      }}
                    >
                      {total.percentage >= 14 && (
                        <span className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-nowrap pl-2 text-[11px] font-bold text-black/75">
                          {meta.label} · {total.percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {breakdown.typeTotals.map((total) => {
                  const meta = typeMeta(total.type);
                  const dimmed = typeFocus !== null && typeFocus !== total.type;
                  return (
                    <button
                      key={`legend-${total.type}`}
                      type="button"
                      className={`flex items-baseline gap-1.5 rounded-md border border-border/45 bg-background-secondary/40 px-2.5 py-1 transition-all duration-150 hover:border-accent/50 ${dimmed ? 'opacity-35' : ''}`}
                      onMouseEnter={() => setTypeFocus(total.type)}
                      onMouseLeave={() => setTypeFocus(null)}
                      onFocus={() => setTypeFocus(total.type)}
                      onBlur={() => setTypeFocus(null)}
                    >
                      <span className="h-2 w-2 self-center rounded-[3px]" style={{ backgroundColor: meta.color }} />
                      <span className="text-xs font-semibold text-text-primary/62">{meta.label}</span>
                      <span className="text-xs font-bold tabular-nums text-white/82">{total.percentage.toFixed(1)}%</span>
                      <span className="text-[10.5px] tabular-nums text-text-primary/40">{formatDamage(total.damage)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Move rows */}
          <div>
            <div className="flex items-center gap-3 px-1 pb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/42">Moves</span>
              {breakdown.dominantElement && ELEMENT_COLOR[breakdown.dominantElement] && (
                <span
                  className="rounded border px-1.5 py-px text-[10px] leading-4"
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
                {([['damage', 'By damage'], ['rotation', 'Rotation order']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={sortMode === mode}
                    onClick={() => setSortMode(mode)}
                    className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
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

            <div className="space-y-1.5">
              {sortedMoves.map((move, index) => {
                const segmentTypes = move.typeSegments.map((segment) => segment.type);
                const dimmed = typeFocus !== null && !segmentTypes.includes(typeFocus);
                const isExpanded = expandedMoves.has(move.name);
                const hasHits = move.hits.length > 0;
                const maxHitDamage = hasHits ? Math.max(...move.hits.map((hit) => hit.damage)) : 0;
                const spineColors = move.typeSegments.slice(0, 2).map((segment) => typeMeta(segment.type).color);
                const showElementChip = Boolean(
                  move.elemType && move.elemType !== breakdown.dominantElement && ELEMENT_COLOR[move.elemType],
                );

                return (
                  <article
                    key={move.name}
                    className={`rounded-lg border border-border/45 bg-background-secondary/20 transition-all duration-150 hover:border-accent/40 hover:bg-background-secondary/40 ${dimmed ? 'opacity-30' : ''}`}
                    onMouseEnter={() => setRowFocusTypes(segmentTypes)}
                    onMouseLeave={() => setRowFocusTypes(null)}
                  >
                    <div className="grid grid-cols-[26px_minmax(0,1fr)_minmax(120px,300px)_52px_92px_24px] items-center gap-3 px-2.5 py-2 max-lg:grid-cols-[26px_minmax(0,1fr)_52px_92px_24px]">
                      <span className="text-center text-[11px] font-semibold tabular-nums text-text-primary/40">
                        {sortMode === 'rotation' ? move.rotationIndex + 1 : index + 1}
                      </span>

                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-5 w-[3px] shrink-0 rounded-full"
                          style={
                            spineColors.length > 1
                              ? { background: `linear-gradient(180deg, ${spineColors[0]} 0 55%, ${spineColors[1]} 55% 100%)` }
                              : { backgroundColor: spineColors[0] ?? FALLBACK_TYPE_COLOR }
                          }
                        />
                        <span className="truncate text-sm font-semibold text-text-primary">{move.name}</span>
                        <span className="flex shrink-0 gap-1">
                          {showElementChip && move.elemType && (
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
                          {move.moveTypes.map((moveType) => (
                            <span
                              key={`${move.name}-chip-${moveType}`}
                              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-px text-[10px] leading-4 text-text-primary/50 max-sm:hidden"
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: typeMeta(moveType).color }} />
                              {typeMeta(moveType).label}
                            </span>
                          ))}
                        </span>
                      </div>

                      <div className="flex h-2.5 gap-0.5 max-lg:hidden" style={{ width: `${maxMoveDamage > 0 ? (move.damage / maxMoveDamage) * 100 : 0}%` }}>
                        {move.typeSegments.map((segment) => (
                          <div
                            key={`${move.name}-segment-${segment.type}`}
                            className="lb-bar-grow min-w-[3px] rounded-[3px]"
                            style={{
                              flexGrow: segment.damage,
                              backgroundColor: typeMeta(segment.type).color,
                              animationDelay: `${Math.min(index, 12) * 40}ms`,
                            }}
                          />
                        ))}
                      </div>

                      <span className="text-right text-xs tabular-nums text-text-primary/52">{move.percentage.toFixed(1)}%</span>
                      <span className="text-right text-sm font-semibold tabular-nums text-accent">{formatDamage(move.damage)}</span>

                      {hasHits ? (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`Toggle ${move.name} hits`}
                          onClick={() => toggleExpanded(move.name)}
                          className="flex items-center justify-center text-text-primary/40 transition-colors hover:text-text-primary"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180 text-accent' : ''}`} />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>

                    {hasHits && isExpanded && (
                      <div className="border-t border-border/45 bg-black/15 py-1.5 pl-11 pr-2.5">
                        {move.hits.map((hit) => (
                          <div
                            key={`${move.name}-hit-${hit.name}-${hit.displayType}`}
                            className="grid grid-cols-[minmax(0,1fr)_minmax(100px,240px)_52px_92px_24px] items-center gap-3 py-1 text-[13px] max-lg:grid-cols-[minmax(0,1fr)_52px_92px_24px]"
                          >
                            <span className="flex min-w-0 items-center gap-2 text-text-primary/72">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: typeMeta(hit.displayType).color }} />
                              <span className="truncate">{hit.name}</span>
                            </span>
                            <div className="max-lg:hidden">
                              <div
                                className="h-1.5 min-w-[3px] rounded-[3px] opacity-75"
                                style={{
                                  width: `${maxHitDamage > 0 ? (hit.damage / maxHitDamage) * 100 : 0}%`,
                                  backgroundColor: typeMeta(hit.displayType).color,
                                }}
                              />
                            </div>
                            <span className="text-right text-[11px] tabular-nums text-text-primary/42">{hit.percentage.toFixed(1)}%</span>
                            <span className="text-right font-medium tabular-nums text-white/80">{formatDamage(hit.damage)}</span>
                            <span />
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          {tooltip && (
            <div
              className="pointer-events-none fixed z-50 rounded-md border border-accent/70 bg-[#131313]/95 px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.38)]"
              style={{
                left: Math.min(tooltip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 190),
                top: tooltip.y + 14,
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

'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LBMoveEntry } from '@/lib/lb';
import { ELEMENT_COLOR } from '@/lib/elementVisuals';

// Fixed move-type identity: every board colors a type the same way, so the
// mapping is learnable across builds. Steps validated (CVD + contrast) against
// the dark surface; the most co-occurring types hold the hues that pass
// all-pairs colorblind checks. Red is reserved for penalties and never a type
// color; echo is a deliberate neutral (external summon, not kit).
//
// The reactive/status-damage family (forte_circuit, frazzle, erosion,
// tune_rupture, glacio_bite, fusion_burst) is a deliberate second tier: 14
// categorical hues is past where all-pairs CVD stays airtight, so these fill
// the open arcs of the wheel and are tuned to differ from echo-slate and from
// the types they most plausibly co-occur with. They rarely appear together, so
// near-neighbours within the tier are acceptable; the textual label always
// disambiguates. Retune hexes freely.
const MOVE_TYPE_META: Record<string, { label: string; color: string }> = {
  basic_attack: { label: 'Basic Attack', color: '#c98500' },
  heavy_attack: { label: 'Heavy Attack', color: '#008300' },
  resonance_skill: { label: 'Resonance Skill', color: '#3987e5' },
  resonance_liberation: { label: 'Liberation', color: '#d55181' },
  intro: { label: 'Intro', color: '#199e70' },
  outro: { label: 'Outro', color: '#d95926' },
  echo: { label: 'Echo', color: '#7f93a8' },
  coordinated_attack: { label: 'Coordinated', color: '#9085e9' },
  forte_circuit: { label: 'Forte Circuit', color: '#a7bf46' },
  glacio_bite: { label: 'Glacio Bite', color: '#59b9d4' },
  frazzle: { label: 'Frazzle', color: '#c364c4' },
  erosion: { label: 'Erosion', color: '#a06ee0' },
  tune_rupture: { label: 'Tune Rupture', color: '#d3c23c' },
  fusion_burst: { label: 'Fusion Burst', color: '#e08b4a' },
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
  key: string;
  name: string;
  damage: number;
  percentage: number;
  displayType: string;
  baseMV: number;
};

type TypeSegment = {
  type: string;
  damage: number;
};

type ProcessedMove = {
  key: string;
  name: string;
  damage: number;
  percentage: number;
  elemType: string;
  moveTypes: string[];
  baseMV: number;
  scaleStat: string;
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
  key: string;
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

function formatBaseMV(value: number): string {
  return `${value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`;
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
function hitDisplayType(hitTypes: string[], primary: string): string {
  if (hitTypes.length === 0) return primary;
  return hitTypes.find((t) => t !== primary) ?? hitTypes[0];
}

function processMoves(moves: LBMoveEntry[]): ProcessedBreakdown {
  const grouped = new Map<string, {
    name: string;
    damage: number;
    hits: Map<string, { key: string; name: string; damage: number; types: string[]; baseMV: number }>;
    elemType: string;
    moveTypes: string[];
    baseMV: number;
    scaleStat: string;
    modifier: boolean;
    rotationIndex: number;
  }>();

  moves.forEach((move, index) => {
    const key = move.key;
    const existing = grouped.get(key) ?? {
      name: move.name,
      damage: 0,
      hits: new Map<string, { key: string; name: string; damage: number; types: string[]; baseMV: number }>(),
      elemType: move.elemType,
      moveTypes: move.moveTypes,
      baseMV: move.baseMV,
      scaleStat: move.scaleStat,
      modifier: false,
      // API row order is rotation order; a repeated cast keeps its first slot.
      rotationIndex: index,
    };
    existing.damage += move.damage;
    if (move.modifier) existing.modifier = true;

    for (const hit of move.hits) {
      // Zero-damage hits are trigger bookkeeping (e.g. a 0-MV echo cast folded
      // for rotation accounting), not damage — never rows or type segments.
      if (!(hit.damage > 0)) continue;
      const existingHit = existing.hits.get(hit.key) ?? {
        key: hit.key,
        name: hit.name,
        damage: 0,
        types: hit.moveTypes,
        baseMV: hit.baseMV,
      };
      existingHit.damage += hit.damage;
      existing.hits.set(hit.key, existingHit);
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
    .map(([key, move]) => {
      const primary = move.moveTypes[0] ?? 'unknown';
      // A hit that repeats the row's own name at the row's own type carries no
      // information (a DisplayGroup fold of extra casts of the same move, e.g.
      // Phrolova's Fate/Finality ×3 or Hiyuki's repeated Glacio Bite lanes).
      // Suppress it — its damage flows into the remainder, which is that type
      // anyway — so those rows render as they did before the typed-hit fold.
      const hits: ProcessedHit[] = Array.from(move.hits.values())
        .map((hit) => ({
          key: hit.key,
          name: hit.name,
          damage: hit.damage,
          percentage: (hit.damage / rawDamage) * 100,
          displayType: hitDisplayType(hit.types, primary),
          baseMV: hit.baseMV,
        }))
        .filter((hit) => !(hit.name === move.name && hit.displayType === primary))
        .sort((a, b) => b.damage - a.damage);

      const hasTypedHits = hits.length > 0
        && Array.from(move.hits.values()).some((hit) => hit.types.length > 0);
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
        key,
        name: move.name,
        damage: move.damage,
        percentage: (move.damage / rawDamage) * 100,
        elemType: move.elemType,
        moveTypes: move.moveTypes,
        baseMV: move.baseMV,
        scaleStat: move.scaleStat,
        rotationIndex: move.rotationIndex,
        hits,
        typeSegments,
      };
    })
    .sort((a, b) => b.damage - a.damage);

  const modifiers = entries
    .filter(([, move]) => move.modifier)
    .map(([key, move]) => ({
      key,
      name: move.name,
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
  // Legend/profile hover: transient dim of non-matching rows, segments, chips.
  const [typeFocus, setTypeFocus] = useState<string | null>(null);
  // Legend click: sticky version of the same focus, so keyboard/touch users can
  // reach the highlight and it survives pointer-leave. Hover previews over it.
  const [pinnedType, setPinnedType] = useState<string | null>(null);
  // Row hover: dims non-matching profile segments only.
  const [rowFocusTypes, setRowFocusTypes] = useState<string[] | null>(null);
  const [expandedMoves, setExpandedMoves] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const activeType = typeFocus ?? pinnedType;

  const breakdown = useMemo(() => processMoves(moves), [moves]);
  const sortedMoves = useMemo(() => {
    if (sortMode === 'rotation') {
      return [...breakdown.moves].sort((a, b) => a.rotationIndex - b.rotationIndex);
    }
    return breakdown.moves;
  }, [breakdown.moves, sortMode]);
  const maxMoveDamage = breakdown.moves[0]?.damage ?? 0;
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

  const toggleExpanded = (moveKey: string) => {
    setExpandedMoves((prev) => {
      const next = new Set(prev);
      if (next.has(moveKey)) next.delete(moveKey);
      else next.add(moveKey);
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
          <button type="button" onClick={onRetry} className="rounded border border-red-300/50 px-2 py-1 text-xs font-semibold text-red-100 transition-colors hover:bg-red-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60">
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
            {/* Without modifiers the raw total IS the score; the equation row
                would just restate one number, so the header carries it inline. */}
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/55">
                Total Score
              </h3>
              {breakdown.modifiers.length === 0 && (
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl font-bold tabular-nums text-accent-hover">{formatDamage(breakdown.totalScore)}</span>
                  <span className="text-[11px] text-text-primary/50">{breakdown.moves.length} moves</span>
                </div>
              )}
            </div>

            {breakdown.modifiers.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-primary/45">Move damage</span>
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
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-text-primary/62">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: isBonus ? BONUS_COLOR : PENALTY_COLOR }}
                        />
                        {compactModifierLabel(modifier.name)}
                      </span>
                      <span className="flex items-baseline gap-2 text-sm font-semibold tabular-nums" style={{ color: isBonus ? BONUS_COLOR : PENALTY_COLOR }}>
                        {formatModifierDamage(modifier.damage)}
                        <span className="text-[11px] font-medium text-text-primary/45">{formatSignedPercent(modifier.percentage)}</span>
                      </span>
                    </div>
                  );
                })}

                <div className="ml-auto flex flex-col gap-0.5 text-right max-sm:ml-0 max-sm:w-full max-sm:text-left">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-primary/45">Score</span>
                  <span className="text-2xl font-bold tabular-nums text-accent-hover">{formatDamage(breakdown.totalScore)}</span>
                  <span className="text-[11px] text-text-primary/50">{breakdown.moves.length} moves</span>
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
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/55">Damage profile</h3>
                <span className="ml-auto text-[11px] text-text-primary/52">by move type</span>
              </div>
              <div className="mt-2.5 flex h-6 gap-0.5 overflow-hidden rounded-[5px]">
                {breakdown.typeTotals.map((total) => {
                  const meta = typeMeta(total.type);
                  const dimmed =
                    (activeType !== null && activeType !== total.type)
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
                      className={`flex items-baseline gap-1.5 rounded-md border bg-background-secondary/40 px-2.5 py-1 transition-[opacity,border-color] duration-150 hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${isPinned ? 'border-accent/70' : 'border-border/45'} ${dimmed ? 'opacity-35' : ''}`}
                      onClick={() => setPinnedType((prev) => (prev === total.type ? null : total.type))}
                      onMouseEnter={() => setTypeFocus(total.type)}
                      onMouseLeave={() => setTypeFocus(null)}
                      onFocus={() => setTypeFocus(total.type)}
                      onBlur={() => setTypeFocus(null)}
                    >
                      <span className="h-2 w-2 self-center rounded-[3px]" style={{ backgroundColor: meta.color }} />
                      <span className="text-xs font-semibold text-text-primary/62">{meta.label}</span>
                      <span className="text-xs font-bold tabular-nums text-white/82">{total.percentage.toFixed(1)}%</span>
                      <span className="text-[10.5px] tabular-nums text-text-primary/45">{formatDamage(total.damage)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Move rows */}
          <div>
            <div className="flex items-center gap-3 px-1 pb-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/55">Moves</h3>
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
                    className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
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
                doesn't need inference. Mirrors the row grid below. */}
            <div className="grid grid-cols-[26px_minmax(0,1fr)_minmax(120px,300px)_52px_92px_24px] items-center gap-3 px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-primary/42 max-lg:grid-cols-[26px_minmax(0,1fr)_52px_92px_24px]">
              <span />
              <span />
              <span className="max-lg:hidden" />
              <span className="text-right">Share</span>
              <span className="text-right">Damage</span>
              <span />
            </div>

            <div className="space-y-1.5">
              {sortedMoves.map((move, index) => {
                const segmentTypes = move.typeSegments.map((segment) => segment.type);
                const dimmed = activeType !== null && !segmentTypes.includes(activeType);
                const isExpanded = expandedMoves.has(move.key);
                const hasHits = move.hits.length > 0;
                const showElementChip = Boolean(
                  move.elemType && move.elemType !== breakdown.dominantElement && ELEMENT_COLOR[move.elemType],
                );

                return (
                  <article
                    key={move.key}
                    className={`rounded-lg border border-border/45 bg-background-secondary/20 transition-[opacity,border-color,background-color] duration-150 hover:border-accent/40 hover:bg-background-secondary/40 ${dimmed ? 'opacity-30' : ''}`}
                    onMouseEnter={() => setRowFocusTypes(segmentTypes)}
                    onMouseLeave={() => setRowFocusTypes(null)}
                  >
                    {/* Whole row toggles the hits; the caret is the a11y/keyboard
                        affordance and stops propagation to avoid double-toggling. */}
                    <div
                      className={`grid grid-cols-[26px_minmax(0,1fr)_minmax(120px,300px)_52px_92px_24px] items-center gap-3 px-2.5 py-2 max-lg:grid-cols-[26px_minmax(0,1fr)_52px_92px_24px] ${hasHits ? 'cursor-pointer' : ''}`}
                      onClick={hasHits ? () => toggleExpanded(move.key) : undefined}
                    >
                      {/* Sequential in both sort modes; the raw rotation index skips
                          slots (folded repeats, modifiers) and reads as missing rows. */}
                      <span className="text-center text-[11px] font-semibold tabular-nums text-text-primary/52">
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
                              key={`${move.key}-chip-${moveType}`}
                              className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-px text-[10px] leading-4 text-text-primary/50 max-sm:hidden"
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: typeMeta(moveType).color }} />
                              {typeMeta(moveType).label}
                            </span>
                          ))}
                        </span>
                        {/* MV trails as metadata after the identity chips. Simple rows
                            only — fold rows carry per-hit MVs in the expansion, and the
                            parent's own-cast MV there would mislead. */}
                        {!hasHits && move.baseMV > 0 && (
                          <span className="shrink-0 text-[10px] tabular-nums text-text-primary/45">
                            {formatBaseMV(move.baseMV)} MV{move.scaleStat && move.scaleStat !== 'ATK' ? ` · ${move.scaleStat}` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex h-2.5 gap-0.5 max-lg:hidden" style={{ width: `${maxMoveDamage > 0 ? (move.damage / maxMoveDamage) * 100 : 0}%` }}>
                        {move.typeSegments.map((segment) => (
                          <div
                            key={`${move.key}-segment-${segment.type}`}
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
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpanded(move.key);
                          }}
                          className="flex items-center justify-center rounded text-text-primary/40 transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180 text-accent' : ''}`} />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>

                    {hasHits && isExpanded && (
                      <div className="border-t border-border/45 bg-black/15 py-1">
                        {/* Same grid + global scale as the parent row so hit bars share
                            one lane and one meaning (fraction of the top move); hierarchy
                            reads via the empty number column, indented dot, and dim bg.
                            Bars stay comparable to parents instead of drifting into a
                            separate, locally-scaled lane. */}
                        {move.hits.map((hit) => (
                          <div
                            key={hit.key}
                            className="grid grid-cols-[26px_minmax(0,1fr)_minmax(120px,300px)_52px_92px_24px] items-center gap-3 px-2.5 py-1 text-[13px] max-lg:grid-cols-[26px_minmax(0,1fr)_52px_92px_24px]"
                          >
                            <span />
                            <span className="flex min-w-0 items-center gap-2 pl-3 text-text-primary/72">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: typeMeta(hit.displayType).color }} />
                              <span className="truncate">{hit.name}</span>
                              {hit.baseMV > 0 && (
                                <span className="shrink-0 text-[10px] tabular-nums text-text-primary/45">{formatBaseMV(hit.baseMV)} MV</span>
                              )}
                            </span>
                            <div className="max-lg:hidden">
                              <div
                                className="h-1.5 min-w-[3px] rounded-[3px] opacity-80"
                                style={{
                                  width: `${maxMoveDamage > 0 ? (hit.damage / maxMoveDamage) * 100 : 0}%`,
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

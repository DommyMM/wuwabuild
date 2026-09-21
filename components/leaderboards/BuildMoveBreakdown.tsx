'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LBMoveEntry } from '@/lib/lb';
import { processMoves, typeMeta, ProcessedModifier, ProcessedMove } from '@/lib/moveBreakdown';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { HoverCardTable } from '@/components/ui/HoverCard';
import { STATUS_NEGATIVE_COLOR, STATUS_POSITIVE_COLOR } from './constants';
import { formatDamage } from './formatters';
import { AbilityTable, CastList, EYEBROW, HealSource, HealSourceTable } from './moveBreakdown/AbilityTable';
import { ProfileBar } from './moveBreakdown/ProfileBar';
import { RotationStrip } from './moveBreakdown/RotationStrip';
import { EMPTY_ROTATION, HEAL_COLOR, Highlight, LABEL_MIN_COLUMN, RotationSlot, buildRibbon, buildRotation, castRangeLabel, describeRow, dominantScaleStat, foldedKeys, formatShare, formatSigned, layoutColumns, mergeSmallSlots, rowDomId } from './moveBreakdown/model';
import { scrollElementIntoViewBelowNav } from './scrollToElementBelowNav';

type TooltipState = {
  x: number;
  y: number;
  /** Below for ribbon segments so the readout never covers the strip, above for discs */
  placement: 'above' | 'below';
  /** The slot's type colour, used as the hover card's corner tint */
  tint: string;
  title: string;
  subtitle: string;
  rows: Array<{ key: string; label: string; value: string }>;
};

type View = 'abilities' | 'rotation';

const TOOLTIP_EDGE_MARGIN = 130;
/** Covers the longest play sequence: strip stagger capped at 320ms, then the ribbon and ten staggered table bars together */
const PLAY_MS = 1000;
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';
const HATCH = `repeating-linear-gradient(135deg, ${STATUS_NEGATIVE_COLOR} 0 2px, transparent 2px 5px)`;
const FIGURE = 'font-gowun tabular-nums';
/** DMG Bonus stat whose icon a kit type wears, same as the build row's pills so a share and its stat read as one */
const TYPE_STAT: Record<string, string> = {
  basic_attack: 'Basic Attack DMG Bonus',
  heavy_attack: 'Heavy Attack DMG Bonus',
  resonance_skill: 'Resonance Skill DMG Bonus',
  resonance_liberation: 'Resonance Liberation DMG Bonus',
};
const TYPE_TAB: Record<string, string> = {
  intro: 'intro',
  outro: 'outro',
  forte_circuit: 'circuit',
  tune_break: 'tune-break',
};
/** Type tint sits on the frame, not the glyph or text, since the game's icons are drawn to sit black or white */
const CHIP_REST = 'border-[color-mix(in_srgb,var(--type)_45%,transparent)] bg-[color-mix(in_srgb,var(--type)_10%,transparent)] hover:border-[color-mix(in_srgb,var(--type)_80%,transparent)]';
const CHIP_PINNED = 'border-[color-mix(in_srgb,var(--type)_95%,transparent)] bg-[color-mix(in_srgb,var(--type)_20%,transparent)]';
/** HoverTooltip's shell, borrowed by a readout that keeps its own state */
const HOVER_SHELL = 'hover-card-panel relative isolate overflow-hidden rounded-xl border border-white/10 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]';

function formatPercentFigure(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

type EquationToken =
  | { kind: 'op'; text: string }
  | { kind: 'term'; label: string; value: string; score?: boolean };

/** Renders "Damage × factor (Energy Regen er% of target%) = Score" */
const ScoreEquation: React.FC<{ rawLabel: string; raw: number; modifiers: ProcessedModifier[]; score: number }> = ({
  rawLabel,
  raw,
  modifiers,
  score,
}) => {
  let tokens: EquationToken[] = [{ kind: 'term', label: rawLabel, value: formatDamage(raw) }];
  let hasAdditive = false;
  for (const modifier of modifiers) {
    const info = modifier.info;
    if (info?.kind === 'energy-regen' && info.factor > 0) {
      // Modifiers apply in order to the running score, so a factor after an additive bonus brackets all before it
      if (hasAdditive) tokens = [{ kind: 'op', text: '(' }, ...tokens, { kind: 'op', text: ')' }];
      tokens.push(
        { kind: 'op', text: '×' },
        { kind: 'term', label: `Energy Regen ${formatPercentFigure(info.er)}% of ${formatPercentFigure(info.erTarget)}%`, value: info.factor.toFixed(3) },
      );
      continue;
    }
    hasAdditive = true;
    tokens.push(
      { kind: 'op', text: modifier.damage < 0 ? '−' : '+' },
      { kind: 'term', label: modifier.name, value: formatDamage(Math.abs(modifier.damage)) },
    );
  }
  tokens.push({ kind: 'op', text: '=' }, { kind: 'term', label: 'Score', value: formatDamage(score), score: true });

  return (
    <div className="flex flex-wrap items-end justify-end gap-x-5 gap-y-2.5">
      {tokens.map((token, index) => (token.kind === 'op' ? (
        <span key={index} className="pb-px font-gowun text-base text-text-primary/55">{token.text}</span>
      ) : (
        <div key={index} className="flex flex-col gap-0.75">
          <span className={EYEBROW}>{token.label}</span>
          <span className={token.score
            ? 'font-gowun text-[30px] leading-[0.9] text-accent-hover'
            : 'font-gowun text-base leading-none text-text-primary'}
          >
            {token.value}
          </span>
        </div>
      )))}
    </div>
  );
};

interface BuildMoveBreakdownProps {
  isLoading: boolean;
  error: string | null;
  moves: LBMoveEntry[];
  isHealing?: boolean;
  /**
   * The board's own score for this build, preferred so the row and this panel print the same figure
   *
   * Ignored unless it agrees with the local sum, so a stale board is never shown as this rotation's total
   */
  scoreOverride?: number;
  /** Per-tab skill icons, keyed as `Characters.json` skillIcons is */
  skillIcons?: Record<string, string>;
  /** Element icon, drawn for status damage that has no kit button */
  elementIcon?: string;
  /** Stat icons keyed by `Stats.json` name, for the types that have a DMG Bonus stat */
  statIcons?: Record<string, string> | null;
  onRetry: () => void;
}

export const BuildMoveBreakdown: React.FC<BuildMoveBreakdownProps> = ({
  isLoading,
  error,
  moves,
  isHealing = false,
  scoreOverride,
  skillIcons,
  elementIcon,
  statIcons,
  onRetry,
}) => {
  // Row keys under the pointer or focus, joined into one string so re-entering the same target is a no-op update
  // A merged strip slot covers several rows, hence keys rather than a key
  const [hoverKeys, setHoverKeys] = useState<string | null>(null);
  // Legend hover previews a type while a click pins it, which is also how keyboard and touch reach it
  const [typeFocus, setTypeFocus] = useState<string | null>(null);
  const [pinnedType, setPinnedType] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [foldOpen, setFoldOpen] = useState(false);
  // The row a strip click asked for, read back once the table has rendered it open
  const pendingReveal = useRef<string | null>(null);
  const [view, setView] = useState<View>('abilities');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [playing, setPlaying] = useState(true);
  const [stripNode, setStripNode] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  const breakdown = useMemo(() => processMoves(moves), [moves]);
  const hasData = !isLoading && !error && breakdown.moves.length > 0;
  const rawDamage = breakdown.rawDamage;
  const localScore = breakdown.totalScore;
  // Tolerance because the per-move float sum lands an integer or two off the backend total after rounding
  const agreesWithBoard = scoreOverride !== undefined
    && scoreOverride > 0
    && Math.abs(scoreOverride - localScore) <= Math.max(1, localScore * 0.001);
  const totalScore = agreesWithBoard ? scoreOverride : localScore;
  const modifiers = breakdown.modifiers;

  useEffect(() => {
    if (!stripNode) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(stripNode);
    return () => observer.disconnect();
  }, [stripNode]);

  // The rotation plays once on first data, then the animation classes come off so a resize never replays it
  useEffect(() => {
    if (!hasData) return;
    const timer = setTimeout(() => setPlaying(false), PLAY_MS);
    return () => clearTimeout(timer);
  }, [hasData]);

  const movesByKey = useMemo(() => new Map<string, ProcessedMove>(breakdown.moves.map((move) => [move.key, move])), [breakdown.moves]);
  const rotation = useMemo(() => (isHealing ? EMPTY_ROTATION : buildRotation(breakdown.moves)), [breakdown.moves, isHealing]);
  // A zero-damage entry, like an echo cast that only sets up a trigger, is a real press so it stays in the
  // rotation, but it is not an ability row
  const abilityMoves = useMemo(() => breakdown.moves.filter((move) => move.damage > 0), [breakdown.moves]);
  const mainScaleStat = useMemo(() => dominantScaleStat(abilityMoves), [abilityMoves]);
  const foldKeys = useMemo(() => foldedKeys(abilityMoves, rawDamage), [abilityMoves, rawDamage]);

  // Healing is scored as one window, but its source hits are what a player recognises, so they become the rows
  const healSources = useMemo<HealSource[]>(() => {
    if (!isHealing) return [];
    return breakdown.moves
      .flatMap((move) => (move.hits.length === 0
        ? [{ key: move.key, name: move.name, damage: move.damage, count: 1, baseMV: move.baseMV, flatHeal: move.flatHeal, scaleStat: move.scaleStat, skillTab: move.skillTab }]
        : move.hits.map((hit) => ({ key: hit.key, name: hit.name, damage: hit.damage, count: hit.count, baseMV: hit.baseMV, flatHeal: hit.flatHeal, scaleStat: move.scaleStat, skillTab: hit.skillTab }))))
      .sort((a, b) => b.damage - a.damage);
  }, [breakdown.moves, isHealing]);

  const stripSlots = useMemo<RotationSlot[]>(() => {
    const { columnWidth } = layoutColumns(width, rotation.buttonSlots.length, rotation.statusSlots.length);
    return width > 0 && columnWidth < LABEL_MIN_COLUMN
      ? mergeSmallSlots(rotation.buttonSlots, rawDamage)
      : rotation.buttonSlots;
  }, [rawDamage, rotation, width]);

  const bonuses = useMemo(
    () => modifiers.filter((modifier) => modifier.damage > 0).map((modifier) => ({ key: modifier.key, color: STATUS_POSITIVE_COLOR, damage: modifier.damage })),
    [modifiers],
  );
  const bonusTotal = bonuses.reduce((sum, bonus) => sum + bonus.damage, 0);
  const lostDamage = modifiers.reduce((sum, modifier) => (modifier.damage < 0 ? sum - modifier.damage : sum), 0);
  const hasEnergyRegen = modifiers.some((modifier) => modifier.info?.kind === 'energy-regen');
  const hasStrip = !isHealing && rotation.buttonSlots.length + rotation.statusSlots.length > 0;
  const ribbon = useMemo(() => buildRibbon(stripSlots, rotation.statusSlots, bonuses), [bonuses, rotation.statusSlots, stripSlots]);
  const healSegments = useMemo(
    () => healSources.map((source) => ({ key: source.key, color: HEAL_COLOR, damage: source.damage })),
    [healSources],
  );

  const activeType = typeFocus ?? pinnedType;
  const typeRowKeys = useMemo(() => {
    if (!activeType) return null;
    return new Set(breakdown.moves
      .filter((move) => move.moveTypes.includes(activeType) || move.typeSegments.some((segment) => segment.type === activeType))
      .map((move) => move.key));
  }, [activeType, breakdown.moves]);
  const highlight = useMemo<Highlight>(() => {
    const hovered = hoverKeys ? hoverKeys.split('\n') : null;
    return {
      hovered: (keys) => Boolean(hovered && keys.some((key) => hovered.includes(key))),
      typeActive: Boolean(typeRowKeys),
      typeOn: (keys) => Boolean(typeRowKeys && keys.some((key) => typeRowKeys.has(key))),
    };
  }, [hoverKeys, typeRowKeys]);

  const setHover = useCallback((keys: string[] | null) => {
    setHoverKeys(keys && keys.length > 0 ? keys.join('\n') : null);
  }, []);

  // A character's status damage is its own element, so a status type takes the element icon
  // Read off the payload rather than hard-coded
  const statusTypes = useMemo(
    () => new Set(breakdown.moves.filter((move) => move.skillTab === 'status').flatMap((move) => move.moveTypes)),
    [breakdown.moves],
  );
  const typeIcon = useCallback((type: string): string | undefined => {
    const stat = TYPE_STAT[type];
    if (stat) return statIcons?.[stat];
    const tab = TYPE_TAB[type];
    if (tab) return skillIcons?.[tab];
    // Echo and coordinated damage have no glyph, so they keep the swatch
    return statusTypes.has(type) ? elementIcon : undefined;
  }, [elementIcon, skillIcons, statIcons, statusTypes]);

  const slotLabel = useCallback((slot: RotationSlot): string => {
    const figures = `${formatDamage(slot.damage)} damage, ${formatShare(slot.damage, rawDamage)} share`;
    if (slot.kind === 'merged') {
      return `Moves ${slot.firstCast}-${slot.firstCast + slot.count - 1}: ${slot.names.join(', ')}, ${figures}`;
    }
    const move = movesByKey.get(slot.rowKeys[0]);
    const name = move?.name ?? slot.label;
    const sub = move ? describeRow(move).text : '';
    if (slot.kind === 'status') return `${name}, ${sub}, ${figures}`;
    const position = slot.count > 1 ? `Moves ${slot.firstCast}-${slot.firstCast + slot.count - 1}` : `Move ${slot.firstCast}`;
    return `${position}: ${name}${slot.count > 1 ? ` ×${slot.count}` : ''}, ${sub}, ${figures}`;
  }, [movesByKey, rawDamage]);

  const showReadout = useCallback((slot: RotationSlot, anchor: HTMLElement, placement: 'above' | 'below' = 'above') => {
    setHover(slot.rowKeys);
    const rect = anchor.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + (rect.width / 2), TOOLTIP_EDGE_MARGIN), window.innerWidth - TOOLTIP_EDGE_MARGIN);
    const move = movesByKey.get(slot.rowKeys[0]);
    let title = slot.label;
    let subtitle = '';
    if (slot.kind === 'merged') {
      subtitle = slot.names.join(', ');
    } else if (move) {
      title = `${move.name}${slot.kind === 'cast' && slot.count > 1 ? ` ×${slot.count}` : ''}`;
      subtitle = describeRow(move).text;
    }
    const rows: TooltipState['rows'] = [
      { key: 'damage', label: 'Damage', value: formatDamage(slot.damage) },
      { key: 'share', label: 'Share', value: formatShare(slot.damage, rawDamage) },
    ];
    if (slot.kind === 'cast' && slot.count > 1) rows.push({ key: 'per-move', label: 'Per move', value: formatDamage(slot.damage / slot.count) });
    const range = castRangeLabel(slot, rotation.buttonCastCount);
    if (range) rows.push({ key: 'moves', label: slot.count > 1 ? 'Moves' : 'Move', value: range });
    setTooltip({ x, y: placement === 'below' ? rect.bottom : rect.top, placement, tint: slot.color, title, subtitle, rows });
  }, [movesByKey, rawDamage, rotation.buttonCastCount, setHover]);

  const hideReadout = useCallback(() => {
    setHover(null);
    setTooltip(null);
  }, [setHover]);

  const toggleExpanded = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // A strip click opens the slot's row, and the fold if the row lives there, then scrolls to it
  // Open only, never toggle, because a second click must not close a row the reader cannot see
  const revealRows = useCallback((slot: RotationSlot) => {
    const keys = slot.rowKeys.filter((key) => movesByKey.has(key));
    if (keys.length === 0) return;
    if (keys.some((key) => foldKeys.has(key))) setFoldOpen(true);
    setExpanded((prev) => {
      const next = new Set(prev);
      keys.forEach((key) => next.add(key));
      return next;
    });
    pendingReveal.current = keys[0];
  }, [foldKeys, movesByKey]);

  useEffect(() => {
    const key = pendingReveal.current;
    if (!key) return;
    pendingReveal.current = null;
    const node = document.getElementById(rowDomId(key));
    if (!node) return;
    // The card takes 180ms to reach its height, so measure only once it has
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => scrollElementIntoViewBelowNav(node), reduced ? 0 : 200);
    return () => window.clearTimeout(timer);
  }, [expanded, foldOpen]);

  const slotCount = stripSlots.length + rotation.statusSlots.length;
  const stepMs = Math.min(26, 320 / Math.max(1, slotCount));
  // Bars grow with the ribbon and no later than 250ms in, since the figures are readable before their bars exist
  const barMotion = { playing, baseDelay: Math.min(250, Math.round(slotCount * stepMs) + 120) };
  const sharesNote = `Shares are of ${isHealing ? 'healing' : 'damage'}, before ${[
    hasEnergyRegen ? 'Energy Regen' : null,
    bonusTotal > 0 ? 'score bonuses' : null,
  ].filter(Boolean).join(' and ') || 'score modifiers'}`;

  return (
    <section className="@container w-full" aria-label={isHealing ? 'Heal breakdown' : 'Move breakdown'}>
      {isLoading && (
        // Mirrors the real layout so the panel does not jump when the data lands
        <div className="animate-pulse rounded-lg border border-border/45 bg-background-secondary/20 px-6 pt-5 pb-4 @max-[40rem]:px-3.5">
          <div className="flex items-end justify-between gap-3">
            <div className="h-3 w-28 rounded bg-white/8" />
            <div className="h-7 w-44 rounded bg-white/10" />
          </div>
          <div className="mt-4 flex justify-between gap-2 @max-[40rem]:hidden">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={`slot-skeleton-${index}`} className="flex flex-col items-center gap-2">
                <div className="size-9 rounded-full bg-white/6" />
                <div className="h-2.5 w-12 rounded bg-white/6" />
              </div>
            ))}
          </div>
          <div className="mt-6 h-3 w-full rounded bg-white/8 @max-[40rem]:mt-4" />
          <div className="mt-8 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`row-skeleton-${index}`} className="h-10 rounded bg-white/4" />
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

      {hasData && (
        <div className="rounded-lg border border-border/45 bg-background-secondary/20 px-6 pt-5 pb-2.5 @max-[40rem]:px-3.5 @max-[40rem]:pt-4 @max-[40rem]:pb-2">
          {/* One line, name left and score right, because the build row above already carries the score */}
          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            {hasStrip ? (
              <div className={`pb-0.5 @max-[40rem]:hidden ${EYEBROW}`}>
                Rotation
              </div>
            ) : isHealing && healSegments.length > 0 ? (
              <div className={`pb-0.5 ${EYEBROW}`}>Healing</div>
            ) : (
              <span />
            )}
            {modifiers.length === 0 ? (
              <div className="flex items-baseline gap-2.5">
                <span className={EYEBROW}>Damage</span>
                <span className="font-gowun text-[30px] leading-none text-accent-hover">{formatDamage(totalScore)}</span>
              </div>
            ) : (
              <ScoreEquation
                rawLabel={isHealing ? 'Healing' : 'Damage'}
                raw={rawDamage}
                modifiers={modifiers}
                score={totalScore}
              />
            )}
          </header>

          {hasStrip && (
            <div ref={setStripNode} className="mt-3.5 @max-[40rem]:hidden">
              <RotationStrip
                width={width}
                buttonSlots={stripSlots}
                statusSlots={rotation.statusSlots}
                ribbon={ribbon}
                lostDamage={lostDamage}
                highlight={highlight}
                playing={playing}
                stepMs={stepMs}
                slotLabel={slotLabel}
                onSlotEnter={showReadout}
                onSlotLeave={hideReadout}
                onSlotClick={revealRows}
                skillIcons={skillIcons}
                elementIcon={elementIcon}
              />
            </div>
          )}

          {isHealing && healSegments.length > 0 && (
            <div className="mt-3.5">
              <ProfileBar segments={healSegments} bonuses={bonuses} lostDamage={lostDamage} playing={playing} />
            </div>
          )}

          {!isHealing && breakdown.typeTotals.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-2 @max-[40rem]:mt-4.5">
              <span className={EYEBROW}>Considered as</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {breakdown.typeTotals.map((total) => {
                  const meta = typeMeta(total.type);
                  const isPinned = pinnedType === total.type;
                  const icon = typeIcon(total.type);
                  return (
                    <button
                      key={total.type}
                      type="button"
                      aria-pressed={isPinned}
                      onClick={() => setPinnedType((prev) => (prev === total.type ? null : total.type))}
                      onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') setTypeFocus(total.type);
                      }}
                      onPointerLeave={() => setTypeFocus(null)}
                      style={{ '--type': meta.color } as React.CSSProperties}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-[border-color,background-color,opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none ${FOCUS_RING} ${isPinned ? CHIP_PINNED : CHIP_REST} ${pinnedType && !isPinned ? 'opacity-50' : ''}`}
                    >
                      <span aria-hidden className="grid h-4 w-4 shrink-0 place-items-center">
                        {icon ? (
                          <img src={icon} alt="" className="h-4 w-4 object-contain opacity-90" />
                        ) : (
                          <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: meta.color }} />
                        )}
                      </span>
                      <span className="text-xs text-text-primary/70">{meta.label}</span>
                      <span className={`${FIGURE} text-xs text-text-primary`}>{total.percentage.toFixed(1)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {modifiers.length > 0 && (
            <div className="mt-2.5 flex flex-wrap justify-between gap-x-3 gap-y-1.5 text-xs text-text-primary/55">
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                {modifiers.map((modifier) => (
                  <span key={modifier.key} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-3"
                      style={{ background: modifier.damage < 0 ? HATCH : STATUS_POSITIVE_COLOR }}
                    />
                    <b className={`${FIGURE} font-normal text-text-primary`}>{formatSigned(modifier.damage)}</b>
                    <span>
                      from {modifier.info?.kind === 'energy-regen'
                        ? `Energy Regen below ${formatPercentFigure(modifier.info.erTarget)}%`
                        : modifier.name}
                    </span>
                  </span>
                ))}
              </span>
              <span>{sharesNote}</span>
            </div>
          )}

          {hasStrip && (
            <div className="mt-4.5 mb-1.5 hidden gap-0.5 rounded-md border border-border/45 bg-background-secondary/40 p-0.5 @max-[40rem]:flex">
              {([['abilities', 'Abilities'], ['rotation', 'Rotation']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                  className={`flex-1 cursor-pointer rounded py-1.75 text-[13px] transition-colors duration-150 ${FOCUS_RING} ${view === mode ? 'bg-accent/16 text-accent-hover' : 'text-text-primary/55 hover:text-text-primary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className={`mt-7.5 @max-[40rem]:mt-1.5 ${hasStrip && view === 'rotation' ? '@max-[40rem]:hidden' : ''}`}>
            {isHealing ? (
              <HealSourceTable
                sources={healSources}
                rawHealing={rawDamage}
                highlight={highlight}
                onHover={setHover}
                motion={barMotion}
                skillIcons={skillIcons}
                elementIcon={elementIcon}
              />
            ) : (
              <AbilityTable
                moves={abilityMoves}
                rawDamage={rawDamage}
                rotation={rotation}
                ribbon={ribbon}
                mainScaleStat={mainScaleStat}
                highlight={highlight}
                expanded={expanded}
                onToggle={toggleExpanded}
                foldOpen={foldOpen}
                onToggleFold={() => setFoldOpen((prev) => !prev)}
                onHover={setHover}
                motion={barMotion}
                skillIcons={skillIcons}
                elementIcon={elementIcon}
              />
            )}
          </div>

          {hasStrip && view === 'rotation' && (
            <div className="hidden @max-[40rem]:block">
              <CastList
                rotation={rotation}
                rawDamage={rawDamage}
                movesByKey={movesByKey}
                skillIcons={skillIcons}
                elementIcon={elementIcon}
              />
            </div>
          )}
        </div>
      )}

      {tooltip && (
        // Own state rather than HoverTooltip, which makes every trigger a tab stop and a ribbon segment must not be one,
        // but the same shell: ground, tint, radius, shadow, enter motion. Stays mounted across the strip so only the
        // first open animates, the toolbar rule
        <div
          aria-hidden
          className="pointer-events-none fixed z-60"
          style={{ left: tooltip.x, top: tooltip.y, transform: tooltip.placement === 'below' ? 'translate(-50%, 10px)' : 'translate(-50%, calc(-100% - 10px))' }}
        >
          <div className="hover-card-enter" style={{ transformOrigin: tooltip.placement === 'below' ? 'center top' : 'center bottom' }}>
            <div className={`${HOVER_SHELL} min-w-48`} style={{ '--hover-tint': tooltip.tint } as React.CSSProperties}>
              <div className="whitespace-nowrap font-plus-jakarta text-[13px] font-semibold text-text-primary">{tooltip.title}</div>
              {tooltip.subtitle && <div className="mt-0.5 whitespace-nowrap text-2xs text-text-primary/55">{tooltip.subtitle}</div>}
              <div className="mt-2 text-xs">
                <HoverCardTable rows={tooltip.rows} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

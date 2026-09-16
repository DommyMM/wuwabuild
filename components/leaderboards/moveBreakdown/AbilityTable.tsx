import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { typeMeta, ProcessedMove } from '@/lib/moveBreakdown';
import { LB_SECTION_HEADING } from '../constants';
import { formatDamage } from '../formatters';
import { SkillTabDisc } from './SkillTabDisc';
import { HEAL_COLOR, HOVER_RING, Highlight, RibbonSegment, RotationModel, RotationSlot, Subline, describeRow, foldedKeys, formatBaseMV, formatHealFormula, formatShare, rotationPositionsText, rowDomId } from './model';

/**
 * Icon | name | casts | bar | share | damage | chevron
 *
 * - The bar lane flexes and the name is capped, so the cast count stays beside the name and spare width goes to the bar
 * - Under 40rem of panel width the row becomes icon | name | figures, with the bar on a second line
 */
const GRID = 'grid grid-cols-[32px_minmax(0,22rem)_44px_minmax(120px,1fr)_58px_104px_16px] items-center gap-x-3.5';
const NARROW_GRID = '@max-[40rem]:grid-cols-[32px_minmax(0,1fr)_auto] @max-[40rem]:gap-x-2.5';
const NARROW_HIDDEN = '@max-[40rem]:hidden';
const FIGURES = 'contents @max-[40rem]:col-start-3 @max-[40rem]:row-start-1 @max-[40rem]:flex @max-[40rem]:flex-col @max-[40rem]:items-end @max-[40rem]:gap-0.5';
const NARROW_LANE = '@max-[40rem]:col-span-2 @max-[40rem]:col-start-2 @max-[40rem]:row-start-2';
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';
/** Section eyebrow shared with the sibling panels, used by the column labels too so the table has one label register */
export const EYEBROW = LB_SECTION_HEADING;
/** Column figures take the site's number face with aligned digits, counts stay mono */
const FIGURE = 'font-gowun tabular-nums';
/** Empty track, matching the bench panel's `bg-white/8` */
const TRACK = 'rgba(255,255,255,0.08)';

export type HealSource = {
  key: string;
  name: string;
  damage: number;
  count: number;
  baseMV: number;
  flatHeal: number;
  scaleStat: string;
  skillTab: string;
};

type BarMotion = { playing: boolean; baseDelay: number };

function barDelay(motion: BarMotion, index: number): string | undefined {
  return motion.playing ? `${motion.baseDelay + (Math.min(index, 10) * 18)}ms` : undefined;
}

const SublineView: React.FC<{ sub: Subline; showTag?: boolean }> = ({ sub, showTag = true }) => {
  const dots = sub.types.map((entry) => (
    <span key={entry.type} className="h-1.75 w-1.75 shrink-0 rounded-xs" style={{ backgroundColor: entry.color }} />
  ));
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-primary/55">
      {sub.statusText ? (
        <span className="inline-flex items-center gap-1.25 text-text-primary/70">{dots}{sub.statusText}</span>
      ) : (
        <>
          {sub.tab && (
            <>
              <span>{sub.tab}</span>
              <span aria-hidden className="text-text-primary/40">→</span>
              <span className="sr-only">considered as</span>
            </>
          )}
          {sub.types.length > 0 && (
            <span className="inline-flex items-center gap-1.25 text-text-primary/70">
              {dots}
              {sub.types.map((entry) => entry.label).join(' + ')}
            </span>
          )}
        </>
      )}
      {showTag && sub.tag && (
        <span className="rounded border border-border/60 px-1.25 text-2xs leading-4 text-text-primary/55">{sub.tag}</span>
      )}
    </span>
  );
};

/**
 * The whole ribbon as one full-width track with this row's casts lit, so a row far below the strip shows where it sits
 *
 * - No gaps, so the unlit casts fuse into one grey line and back-to-back casts of this row read as one span
 */
const MiniRibbon: React.FC<{ ribbon: RibbonSegment[]; rowKey: string }> = ({ ribbon, rowKey }) => {
  const segments = ribbon.filter((segment) => segment.group !== 'bonus');
  return (
    <span aria-hidden className="flex h-1.5 min-w-0 flex-1 items-stretch overflow-hidden rounded-full">
      {segments.map((segment) => (
        <span
          key={segment.id}
          className="block min-w-px"
          style={{
            flexGrow: Math.max(0, segment.damage),
            flexBasis: 0,
            backgroundColor: segment.rowKeys.includes(rowKey) ? segment.color : TRACK,
          }}
        />
      ))}
    </span>
  );
};

interface AbilityRowProps {
  move: ProcessedMove;
  index: number;
  rawDamage: number;
  maxDamage: number;
  rotation: RotationModel;
  ribbon: RibbonSegment[];
  mainScaleStat: string;
  highlight: Highlight;
  isOpen: boolean;
  /** The row above is open, so its card frame already separates the two */
  afterOpen: boolean;
  onToggle: (key: string) => void;
  onHover: (keys: string[] | null) => void;
  motion: BarMotion;
  skillIcons?: Record<string, string>;
  elementIcon?: string;
}

/** A closed row is a hairline-separated line in the list */
const ROW_CLOSED = 'border-t border-border/45';
/** An open row lifts out as a card with air above and below, so the list's hairlines miss its rounded corners */
const ROW_OPEN = 'my-2 overflow-hidden rounded-md border bg-black/15';
/** The strip's hover mark on a closed row, an open card carries the same white on its border instead */
const ROW_RING = 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]';

const AbilityRow: React.FC<AbilityRowProps> = ({
  move,
  index,
  rawDamage,
  maxDamage,
  rotation,
  ribbon,
  mainScaleStat,
  highlight,
  isOpen,
  afterOpen,
  onToggle,
  onHover,
  motion,
  skillIcons,
  elementIcon,
}) => {
  const sub = describeRow(move);
  const isStatus = move.skillTab === 'status';
  const castCount = isStatus ? 0 : move.casts.length;
  const hovered = highlight.hovered([move.key]);
  const dimmed = highlight.typeActive && !highlight.typeOn([move.key]);
  const rowId = rowDomId(move.key);
  const panelId = `${rowId}-panel`;
  const positions = isStatus ? null : rotationPositionsText(move, rotation);
  const inRibbon = ribbon.some((segment) => segment.rowKeys.includes(move.key));
  const showScaleStat = Boolean(move.scaleStat) && move.scaleStat !== mainScaleStat;
  // A hit row and its bar piece are one thing, so hovering either lights both
  const [hitHover, setHitHover] = useState<string | null>(null);
  // Open, the bar splits by hit instead of by type, so it shows how the hit rows below add up to the row
  const pieces = isOpen && move.hits.length > 1
    ? move.hits.map((hit) => ({ key: hit.key, damage: hit.damage, color: typeMeta(hit.displayType).color }))
    : move.typeSegments.map((segment) => ({ key: segment.type, damage: segment.damage, color: typeMeta(segment.type).color }));
  // The card's frame is the open state and the ring is the link, so an open header carries no tint of its own
  const headerTone = isOpen ? '' : `rounded-md ${hovered ? `bg-white/3 ${ROW_RING}` : ''}`;

  return (
    <div
      id={rowId}
      className={`transition-[opacity,border-color] duration-150 motion-reduce:transition-none ${isOpen ? `${ROW_OPEN} ${hovered ? 'border-white/50' : 'border-border/60'}` : afterOpen ? '' : ROW_CLOSED} ${dimmed ? 'opacity-40' : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onHover([move.key]);
      }}
      onPointerLeave={() => onHover(null)}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(move.key)}
        onFocus={() => onHover([move.key])}
        onBlur={() => onHover(null)}
        className={`${GRID} ${NARROW_GRID} w-full cursor-pointer px-2 py-2 text-left transition-[background-color,box-shadow] duration-150 active:bg-white/6 @max-[40rem]:grid-rows-[auto_auto] @max-[40rem]:gap-y-2 @max-[40rem]:px-1 ${FOCUS_RING} ${headerTone}`}
      >
        <SkillTabDisc
          skillTab={move.skillTab}
          skillIcons={skillIcons}
          elementIcon={elementIcon}
          arcColor={typeMeta(move.primaryType).color}
          lit={hovered}
          className="size-8"
        />
        <span className="flex min-w-0 flex-col gap-0.5 @max-[40rem]:col-start-2 @max-[40rem]:row-start-1">
          <span className="truncate font-plus-jakarta text-sm font-semibold text-text-primary @max-[40rem]:whitespace-normal">
            {move.name}
            {castCount > 1 && (
              <span className="ml-1.5 hidden font-mono text-xs font-normal text-text-primary/70 @max-[40rem]:inline">×{castCount}</span>
            )}
          </span>
          <SublineView sub={sub} />
        </span>
        <span className={`text-right font-mono text-xs text-text-primary/70 ${NARROW_HIDDEN}`}>
          {castCount > 0 ? `×${castCount}` : ''}
        </span>
        <span className={`relative h-2 rounded-[1px_3px_3px_1px] bg-white/8 ${NARROW_LANE} @max-[40rem]:h-1.5`}>
          <span
            className={`absolute inset-y-0 left-0 flex gap-0.5 ${motion.playing ? 'mb-grow' : ''}`}
            style={{ width: `${maxDamage > 0 ? (move.damage / maxDamage) * 100 : 0}%`, animationDelay: barDelay(motion, index) }}
          >
            {pieces.map((piece) => (
              <b
                key={piece.key}
                className="block h-full min-w-0.75 rounded-[1px_3px_3px_1px] transition-shadow duration-150 motion-reduce:transition-none"
                style={{ flexGrow: piece.damage, flexBasis: 0, backgroundColor: piece.color, boxShadow: hitHover === piece.key ? HOVER_RING : undefined }}
                onPointerEnter={(event) => {
                  if (isOpen && event.pointerType === 'mouse') setHitHover(piece.key);
                }}
                onPointerLeave={() => {
                  if (isOpen) setHitHover(null);
                }}
              />
            ))}
          </span>
        </span>
        <span className={FIGURES}>
          <span className={`text-right ${FIGURE} text-xs text-text-primary/70`}>{formatShare(move.damage, rawDamage)}</span>
          <span className={`text-right ${FIGURE} text-sm text-text-primary`}>{formatDamage(move.damage)}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={`h-3.5 w-3.5 transition-transform duration-180 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${NARROW_HIDDEN} ${isOpen ? 'rotate-180 text-text-primary' : 'text-text-primary/55'}`}
        />
      </button>

      <div
        id={panelId}
        inert={!isOpen || undefined}
        className={`grid transition-[grid-template-rows] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${isOpen ? 'duration-180 grid-rows-[1fr]' : 'duration-140 grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/45 bg-black/20 pt-1.5 pb-3">
            {move.hits.map((hit) => (
              <div
                key={hit.key}
                className={`${GRID} ${NARROW_GRID} rounded-md px-2 py-1.25 transition-colors duration-150 motion-reduce:transition-none @max-[40rem]:px-1 ${hitHover === hit.key ? 'bg-white/3 text-text-primary' : 'text-text-primary/70'}`}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') setHitHover(hit.key);
                }}
                onPointerLeave={() => setHitHover(null)}
              >
                <span />
                <span className="flex min-w-0 items-baseline gap-2 whitespace-nowrap text-[13px] @max-[40rem]:flex-wrap @max-[40rem]:gap-x-2 @max-[40rem]:gap-y-0.5 @max-[40rem]:whitespace-normal">
                  <span className="truncate @max-[40rem]:whitespace-normal">
                    {hit.name}{hit.count > 1 ? ` ×${hit.count}` : ''}
                  </span>
                  {hit.baseMV > 0 && (
                    <span className="shrink-0 font-mono text-2xs text-text-primary/55">{formatBaseMV(hit.baseMV)} MV</span>
                  )}
                </span>
                <span className={NARROW_HIDDEN} />
                <span className={NARROW_HIDDEN} />
                <span className={FIGURES}>
                  <span className={`text-right ${FIGURE} text-xs text-text-primary/70`}>{formatShare(hit.damage, rawDamage)}</span>
                  <span className={`text-right ${FIGURE} text-[13px] text-text-primary/85`}>{formatDamage(hit.damage)}</span>
                </span>
                <span className={NARROW_HIDDEN} />
              </div>
            ))}

            <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3.5 px-2 pt-2.5 @max-[40rem]:gap-x-2.5 @max-[40rem]:px-1">
              <div className="col-start-2 flex flex-col gap-y-2.5 text-xs text-text-primary/55">
                {((move.hits.length === 0 && move.baseMV > 0) || showScaleStat) && (
                  <div className="flex flex-wrap items-center gap-x-5.5 gap-y-2">
                    {move.hits.length === 0 && move.baseMV > 0 && (
                      <span className="font-mono text-2xs text-text-primary/55">{formatBaseMV(move.baseMV)} MV</span>
                    )}
                    {showScaleStat && <span>Scales with {move.scaleStat}</span>}
                  </div>
                )}
                {inRibbon && (
                  // The sentence is the answer, the ribbon is the picture of it
                  <div className={`flex items-center gap-3 ${NARROW_HIDDEN}`}>
                    <span className="shrink-0">{positions ?? 'Position in the rotation'}</span>
                    <MiniRibbon ribbon={ribbon} rowKey={move.key} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AbilityTableProps {
  moves: ProcessedMove[];
  rawDamage: number;
  rotation: RotationModel;
  ribbon: RibbonSegment[];
  mainScaleStat: string;
  highlight: Highlight;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  foldOpen: boolean;
  onToggleFold: () => void;
  onHover: (keys: string[] | null) => void;
  motion: BarMotion;
  skillIcons?: Record<string, string>;
  elementIcon?: string;
}

export const AbilityTable: React.FC<AbilityTableProps> = ({
  moves,
  rawDamage,
  rotation,
  ribbon,
  mainScaleStat,
  highlight,
  expanded,
  onToggle,
  foldOpen,
  onToggleFold,
  onHover,
  motion,
  skillIcons,
  elementIcon,
}) => {
  const maxDamage = moves.reduce((max, move) => Math.max(max, move.damage), 0);
  // Dense kits: the long tail of sub-1% abilities folds into one summary row
  const smallKeys = foldedKeys(moves, rawDamage);
  const small = moves.filter((move) => smallKeys.has(move.key));
  const folds = small.length > 0;
  const primary = folds ? moves.filter((move) => !smallKeys.has(move.key)) : moves;
  const smallDamage = small.reduce((sum, move) => sum + move.damage, 0);
  const foldKeys = small.map((move) => move.key);
  const foldDimmed = folds && highlight.typeActive && !highlight.typeOn(foldKeys);

  const renderRow = (move: ProcessedMove, index: number, afterOpen: boolean) => (
    <AbilityRow
      key={move.key}
      move={move}
      index={index}
      rawDamage={rawDamage}
      maxDamage={maxDamage}
      rotation={rotation}
      ribbon={ribbon}
      mainScaleStat={mainScaleStat}
      highlight={highlight}
      isOpen={expanded.has(move.key)}
      afterOpen={afterOpen}
      onToggle={onToggle}
      onHover={onHover}
      motion={motion}
      skillIcons={skillIcons}
      elementIcon={elementIcon}
    />
  );

  return (
    <div>
      <div className={`${GRID} items-end px-2 pb-2 ${EYEBROW} ${NARROW_HIDDEN}`}>
        <span className="col-span-2">Abilities</span>
        <span className="text-right">Moves</span>
        <span />
        <span className="text-right">Share</span>
        <span className="text-right">Damage</span>
        <span />
      </div>
      <div className={`hidden pb-2 ${EYEBROW} @max-[40rem]:block`}>Abilities</div>
      {primary.map((move, index) => renderRow(move, index, index > 0 && expanded.has(primary[index - 1].key)))}
      {folds && (
        <>
          <div className={`transition-opacity duration-150 motion-reduce:transition-none ${primary.length > 0 && expanded.has(primary[primary.length - 1].key) ? '' : 'border-t border-border/45'} ${foldDimmed ? 'opacity-40' : ''}`}>
            <button
              type="button"
              aria-expanded={foldOpen}
              onClick={onToggleFold}
              className={`${GRID} ${NARROW_GRID} w-full cursor-pointer rounded-md px-2 py-2 text-left transition-colors duration-100 hover:bg-white/3 @max-[40rem]:px-1 ${FOCUS_RING} ${highlight.hovered(foldKeys) ? 'bg-white/3' : ''}`}
            >
              <span />
              <span className="text-sm text-text-primary/70">
                {small.length} smaller abilities, {formatShare(smallDamage, rawDamage)} combined
              </span>
              <span className={NARROW_HIDDEN} />
              <span className={NARROW_HIDDEN} />
              <span className={NARROW_HIDDEN} />
              <span className={`text-right ${FIGURE} text-sm text-text-primary/85 @max-[40rem]:col-start-3`}>{formatDamage(smallDamage)}</span>
              <ChevronDown
                aria-hidden
                className={`h-3.5 w-3.5 transition-transform duration-180 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${NARROW_HIDDEN} ${foldOpen ? 'rotate-180 text-text-primary' : 'text-text-primary/55'}`}
              />
            </button>
          </div>
          {foldOpen && small.map((move, index) => renderRow(move, primary.length + index, index > 0 && expanded.has(small[index - 1].key)))}
        </>
      )}
    </div>
  );
};

interface HealSourceTableProps {
  sources: HealSource[];
  rawHealing: number;
  highlight: Highlight;
  onHover: (keys: string[] | null) => void;
  motion: BarMotion;
  skillIcons?: Record<string, string>;
  elementIcon?: string;
}

export const HealSourceTable: React.FC<HealSourceTableProps> = ({
  sources,
  rawHealing,
  highlight,
  onHover,
  motion,
  skillIcons,
  elementIcon,
}) => {
  const maxHealing = sources.reduce((max, source) => Math.max(max, source.damage), 0);
  return (
    <div>
      <div className={`${GRID} items-end px-2 pb-2 ${EYEBROW} @max-[40rem]:flex @max-[40rem]:px-1`}>
        <span className="col-span-2">Heal sources</span>
        <span className={`text-right ${NARROW_HIDDEN}`}>Count</span>
        <span className={NARROW_HIDDEN} />
        <span className={`text-right ${NARROW_HIDDEN}`}>Share</span>
        <span className={`text-right ${NARROW_HIDDEN}`}>Healing</span>
        <span className={NARROW_HIDDEN} />
      </div>
      {sources.map((source, index) => {
        const hovered = highlight.hovered([source.key]);
        const formula = formatHealFormula(source.flatHeal, source.baseMV, source.scaleStat);
        return (
          <div
            key={source.key}
            className="border-t border-border/45"
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse') onHover([source.key]);
            }}
            onPointerLeave={() => onHover(null)}
          >
            <div className={`${GRID} ${NARROW_GRID} rounded-md px-2 py-2 transition-colors duration-100 @max-[40rem]:grid-rows-[auto_auto] @max-[40rem]:gap-y-2 @max-[40rem]:px-1 ${hovered ? 'bg-white/3' : ''}`}>
              <SkillTabDisc skillTab={source.skillTab} skillIcons={skillIcons} elementIcon={elementIcon} className="size-8" />
              <span className="flex min-w-0 flex-col gap-0.5 @max-[40rem]:col-start-2 @max-[40rem]:row-start-1">
                <span className="truncate font-plus-jakarta text-sm font-semibold text-text-primary @max-[40rem]:whitespace-normal">
                  {source.name}
                  {source.count > 1 && (
                    <span className="ml-1.5 hidden font-mono text-xs font-normal text-text-primary/70 @max-[40rem]:inline">×{source.count}</span>
                  )}
                </span>
                {formula && <span className="font-mono text-xs text-text-primary/55">{formula}</span>}
              </span>
              <span className={`text-right font-mono text-xs text-text-primary/70 ${NARROW_HIDDEN}`}>×{source.count}</span>
              <span className={`relative h-2 ${NARROW_LANE} @max-[40rem]:h-1.5`}>
                <b
                  className={`absolute inset-y-0 left-0 block min-w-0.75 rounded-[1px_3px_3px_1px] ${motion.playing ? 'mb-grow' : ''}`}
                  style={{
                    width: `${maxHealing > 0 ? (source.damage / maxHealing) * 100 : 0}%`,
                    backgroundColor: HEAL_COLOR,
                    animationDelay: barDelay(motion, index),
                  }}
                />
              </span>
              <span className={FIGURES}>
                <span className={`text-right ${FIGURE} text-xs text-text-primary/70`}>{formatShare(source.damage, rawHealing)}</span>
                <span className={`text-right ${FIGURE} text-sm text-text-primary`}>{formatDamage(source.damage)}</span>
              </span>
              <span className={NARROW_HIDDEN} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface CastListProps {
  rotation: RotationModel;
  rawDamage: number;
  movesByKey: Map<string, ProcessedMove>;
  skillIcons?: Record<string, string>;
  elementIcon?: string;
}

/** Narrow layout's "Rotation" tab: the strip as a vertical list, one row per slot */
export const CastList: React.FC<CastListProps> = ({ rotation, rawDamage, movesByKey, skillIcons, elementIcon }) => {
  const maxSlot = [...rotation.buttonSlots, ...rotation.statusSlots].reduce((max, slot) => Math.max(max, slot.damage), 0);
  const renderStep = (slot: RotationSlot) => {
    const move = movesByKey.get(slot.rowKeys[0]);
    return (
      <li key={slot.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2.5 gap-y-1.5 border-t border-border/45 px-1 py-2.25">
        <SkillTabDisc
          skillTab={slot.skillTab}
          skillIcons={skillIcons}
          elementIcon={elementIcon}
          arcColor={slot.kind === 'cast' ? slot.color : undefined}
          className="size-8"
        />
        <span className="flex min-w-0 flex-col gap-0.75">
          <span className="font-plus-jakarta text-sm font-semibold text-text-primary">
            {slot.kind === 'status' ? move?.name ?? slot.label : slot.label}
            {slot.kind === 'cast' && slot.count > 1 && (
              <span className="ml-1.5 inline-block rounded-[5px] border border-white/15 px-1 align-[1px] font-mono text-3xs leading-3.75 font-normal text-text-primary">
                ×{slot.count}
              </span>
            )}
          </span>
          {move && <SublineView sub={describeRow(move)} showTag={false} />}
        </span>
        <span className={`text-right ${FIGURE} text-xs text-text-primary/70`}>{formatShare(slot.damage, rawDamage)}</span>
        <span className="relative col-span-2 col-start-2 h-1.5">
          <b
            className="absolute inset-y-0 left-0 block min-w-0.75 rounded-[1px_3px_3px_1px]"
            style={{ width: `${maxSlot > 0 ? (slot.damage / maxSlot) * 100 : 0}%`, backgroundColor: slot.color }}
          />
        </span>
      </li>
    );
  };

  return (
    <div>
      <ol>{rotation.buttonSlots.map(renderStep)}</ol>
      {rotation.statusSlots.length > 0 && (
        <>
          <div className="border-t border-dashed border-white/15 px-1 pt-3.5 pb-1.5 text-xs text-text-primary/55">Negative Status</div>
          <ol>{rotation.statusSlots.map(renderStep)}</ol>
        </>
      )}
    </div>
  );
};

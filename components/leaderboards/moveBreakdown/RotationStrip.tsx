import React, { useEffect, useRef, useState } from 'react';
import { STATUS_NEGATIVE_COLOR } from '../constants';
import { HOVER_RING, Highlight, LABEL_MIN_COLUMN, LeaderInput, RIBBON_HEIGHT, RibbonSegment, RotationSlot, Span, layoutColumns, layoutLeaders, layoutRibbon, leaderPath, rowDomId } from './model';
import { SkillTabDisc } from './SkillTabDisc';

/** Caption line plus its margin under the discs, when captions show. */
const CAPTION_BAND = 34;
/** The caption's margin above it (`mt-1.5`). */
const CAPTION_GAP = 6;
/** A caption's height until it is measured: one line at 12px, line-height 1.1. */
const CAPTION_LINE = 13;
/** Air between a caption's last line and the leader that leaves it. */
const LEADER_INSET = 3;
/**
 * Air between the slot block and the ribbon. The hover leaders live here: each
 * drops from under its caption, runs along a rail just above the ribbon, and
 * stems down onto its segments, so none crosses a neighbour.
 */
const RIBBON_GAP = 24;
/** The leaders' rail, above the ribbon's top edge. */
const RAIL_RISE = 10;

type SlotReadout = (slot: RotationSlot, anchor: HTMLElement, placement?: 'above' | 'below') => void;

interface RotationStripProps {
  /** Measured container width; nothing is drawn until it is known. */
  width: number;
  buttonSlots: RotationSlot[];
  statusSlots: RotationSlot[];
  /** The ribbon's segments in order: casts, status damage, score bonuses. */
  ribbon: RibbonSegment[];
  /** Score removed by penalties (Energy Regen), hatched over the ribbon's end. */
  lostDamage: number;
  highlight: Highlight;
  playing: boolean;
  stepMs: number;
  slotLabel: (slot: RotationSlot) => string;
  onSlotEnter: SlotReadout;
  onSlotLeave: () => void;
  /** Click: open the slot's row in the table and bring it into view. */
  onSlotClick: (slot: RotationSlot) => void;
  skillIcons?: Record<string, string>;
  elementIcon?: string;
}

function discFor(columnWidth: number): { className: string; size: number } {
  if (columnWidth >= 44) return { className: 'size-9', size: 36 };
  if (columnWidth >= 32) return { className: 'size-7', size: 28 };
  return { className: 'size-5.5', size: 22 };
}

/**
 * The rotation as a guide writes it, over the rotation as damage: the
 * character's skill icons in cast order, and under them one ribbon in the same
 * order whose segments are each cast's damage. Nothing links the two at rest.
 * Hovering a slot, a segment or a table row rings the disc and the segments of
 * every run of that ability and draws one hairline leader per run, from just
 * under its caption onto the centre of each of its segments: two "Iai" slots
 * light together, each on its own casts, and a ×3 slot shows three teeth. The
 * leaders are one SVG group with the opacity on the group, so runs that share
 * a rail composite once and never read whiter where they overlap. The leader
 * is chrome, not data: neutral, 1px, axis-aligned. Clicking a slot opens its
 * row below and scrolls only as far as needed to show it; the strip itself is
 * never pinned.
 */
export const RotationStrip: React.FC<RotationStripProps> = ({
  width,
  buttonSlots,
  statusSlots,
  ribbon,
  lostDamage,
  highlight,
  playing,
  stepMs,
  slotLabel,
  onSlotEnter,
  onSlotLeave,
  onSlotClick,
  skillIcons,
  elementIcon,
}) => {
  const slots = [...buttonSlots, ...statusSlots];
  const { columns, dividerX, columnWidth } = layoutColumns(width, buttonSlots.length, statusSlots.length);
  const showLabels = columnWidth >= LABEL_MIN_COLUMN;
  const disc = discFor(columnWidth);
  const slotHeight = disc.size + (showLabels ? CAPTION_BAND : 8);
  const ribbonTop = slotHeight + RIBBON_GAP;
  const height = ribbonTop + RIBBON_HEIGHT;
  const slotById = new Map(slots.map((slot) => [slot.id, slot]));

  // Captions run one or two lines, so each leader starts where its own caption
  // ends rather than under a fixed two-line band, where it floated. A resize
  // observer reports every caption once on attach and again whenever a width
  // change reflows it.
  const captionNodes = useRef(new Map<string, HTMLSpanElement>());
  const [captionHeights, setCaptionHeights] = useState<Record<string, number>>({});
  const slotKey = slots.map((slot) => slot.id).join('|');
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setCaptionHeights((prev) => {
        let next: Record<string, number> | null = null;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.slot;
          if (!id) continue;
          const measured = Math.round(entry.target.getBoundingClientRect().height);
          if (prev[id] === measured) continue;
          next = next ?? { ...prev };
          next[id] = measured;
        }
        return next ?? prev;
      });
    });
    captionNodes.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [slotKey, showLabels]);

  if (width <= 0) return <div style={{ height }} />;

  const { spans, lostWidth } = layoutRibbon(ribbon, width, lostDamage);
  // Each slot's segments on the ribbon, in cast order, for its leader.
  const slotSpans = new Map<string, Span[]>();
  ribbon.forEach((segment, index) => {
    if (!segment.slotId) return;
    slotSpans.set(segment.slotId, [...(slotSpans.get(segment.slotId) ?? []), spans[index]]);
  });
  const dropTop = (slot: RotationSlot) => (showLabels
    ? disc.size + CAPTION_GAP + (captionHeights[slot.id] ?? CAPTION_LINE) + LEADER_INSET
    : slotHeight - 2);
  const leaders = layoutLeaders(slots.flatMap((slot, index): LeaderInput[] => {
    const segments = slotSpans.get(slot.id);
    if (!segments || !highlight.hovered(slot.rowKeys)) return [];
    return [{ id: slot.id, dropX: columns[index].x + (columns[index].w / 2), segments }];
  }));

  return (
    <div className="relative select-none" style={{ height }} onPointerLeave={onSlotLeave}>
      {leaders.length > 0 && (
        // Mounted only while something is lit, so the fade plays on the first
        // hover and not as the pointer walks from one target to the next.
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          <g
            className="mb-fade"
            opacity={0.42}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth={1}
            strokeLinecap="butt"
            strokeLinejoin="miter"
            shapeRendering="crispEdges"
          >
            {leaders.map((leader) => {
              const slot = slotById.get(leader.id);
              if (!slot) return null;
              return <path key={leader.id} d={leaderPath(leader.dropX, dropTop(slot), ribbonTop - RAIL_RISE, leader.stems, ribbonTop)} />;
            })}
          </g>
        </svg>
      )}

      {slots.map((slot, index) => {
        const column = columns[index];
        const lit = highlight.hovered(slot.rowKeys);
        const dimmed = highlight.typeActive && !highlight.typeOn(slot.rowKeys);
        return (
          <button
            key={slot.id}
            type="button"
            aria-label={slotLabel(slot)}
            aria-controls={slot.rowKeys.length === 1 ? rowDomId(slot.rowKeys[0]) : undefined}
            className={`group absolute top-0 flex cursor-pointer flex-col items-center transition-opacity duration-150 focus-visible:outline-none motion-reduce:transition-none ${dimmed ? 'opacity-35' : ''}`}
            style={{ left: column.x, width: column.w, height: slotHeight }}
            onClick={() => onSlotClick(slot)}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'mouse') return;
              onSlotEnter(slot, event.currentTarget);
            }}
            onFocus={(event) => onSlotEnter(slot, event.currentTarget)}
            onBlur={onSlotLeave}
          >
            <span
              className={`relative rounded-full transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-active:scale-[0.96] group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-accent/80 motion-reduce:transition-none ${playing ? 'mb-rise' : ''}`}
              style={{ animationDelay: playing ? `${index * stepMs}ms` : undefined }}
            >
              <SkillTabDisc
                skillTab={slot.skillTab}
                merged={slot.kind === 'merged'}
                skillIcons={skillIcons}
                elementIcon={elementIcon}
                arcColor={slot.color}
                lit={lit}
                className={disc.className}
              />
              {slot.kind === 'cast' && slot.count > 1 && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-2 rounded-[5px] border border-white/20 bg-[#151515] px-1 font-mono text-3xs leading-3.5 text-text-primary"
                >
                  ×{slot.count}
                </span>
              )}
            </span>
            {showLabels && (
              <span
                data-slot={slot.id}
                ref={(node) => {
                  if (node) captionNodes.current.set(slot.id, node);
                  else captionNodes.current.delete(slot.id);
                }}
                className={`mt-1.5 line-clamp-2 px-0.5 text-center font-ropa text-xs leading-[1.1] transition-colors duration-150 ${lit ? 'text-text-primary' : 'text-text-primary/70'}`}
              >
                {slot.label}
              </span>
            )}
          </button>
        );
      })}

      {dividerX !== null && (
        <span aria-hidden className="absolute top-1 border-l border-dashed border-white/15" style={{ left: dividerX, height: slotHeight - 6 }} />
      )}

      <div
        aria-hidden
        className={`absolute inset-x-0 overflow-hidden rounded-xs ${playing ? 'mb-grow' : ''}`}
        style={{ top: ribbonTop, height: RIBBON_HEIGHT, animationDelay: playing ? `${Math.round(slots.length * stepMs) + 120}ms` : undefined }}
      >
        {ribbon.map((segment, index) => {
          const span = spans[index];
          const slot = segment.slotId ? slotById.get(segment.slotId) : undefined;
          const lit = slot ? highlight.hovered(slot.rowKeys) : false;
          const dimmed = slot ? highlight.typeActive && !highlight.typeOn(slot.rowKeys) : false;
          return (
            <span
              key={segment.id}
              className="absolute inset-y-0 block transition-[opacity,box-shadow] duration-150 motion-reduce:transition-none"
              style={{
                left: span.x,
                width: span.w,
                backgroundColor: segment.color,
                opacity: dimmed ? 0.3 : 1,
                // Inset, so a lit segment brightens without growing.
                boxShadow: lit ? HOVER_RING : undefined,
              }}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'mouse' || !slot) return;
                // Below the ribbon, so the readout never covers the leaders.
                onSlotEnter(slot, event.currentTarget, 'below');
              }}
            />
          );
        })}
        {lostWidth > 0 && (
          <span
            className="pointer-events-none absolute -top-0.75 -bottom-0.75 right-0 rounded-r-xs border-l-2 border-text-primary"
            style={{
              width: lostWidth,
              background: `repeating-linear-gradient(135deg, color-mix(in srgb, ${STATUS_NEGATIVE_COLOR} 85%, transparent) 0 2px, transparent 2px 5px)`,
            }}
          />
        )}
      </div>
    </div>
  );
};

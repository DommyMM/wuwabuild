import React from 'react';
import { STATUS_NEGATIVE_COLOR } from '../constants';
import { Highlight, LABEL_MIN_COLUMN, RIBBON_HEIGHT, RibbonSegment, RotationSlot, layoutColumns, layoutRibbon, leaderPath } from './model';
import { SkillTabDisc } from './SkillTabDisc';

/** Caption line plus its margin under the discs, when captions show. */
const CAPTION_BAND = 34;
/**
 * Air between the slot block and the ribbon. The hover leaders live here: each
 * drops from under its caption, runs along a rail just above the ribbon, and
 * stems down onto its segments, so none crosses a neighbour.
 */
const RIBBON_GAP = 24;
/** The leaders' rail, above the ribbon's top edge. */
const RAIL_RISE = 10;
/** The one hover mark: the same ring on a disc and on its ribbon segments. */
const HOVER_RING = 'inset 0 0 0 1px rgba(255,255,255,0.75)';

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
 * every run of that ability and draws one hairline leader per run, from under
 * its caption onto its segments: two "Iai" slots light together, each on its
 * own part of the ribbon. The leaders are one SVG group with the opacity on the
 * group, so runs that share a rail composite once and never read whiter where
 * they overlap. The leader is chrome, not data: neutral, 1px, axis-aligned.
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

  if (width <= 0) return <div style={{ height }} />;

  const { spans, lostWidth } = layoutRibbon(ribbon, width, lostDamage);
  // Each slot's extent on the ribbon, for its leader.
  const extent = new Map<string, { x0: number; x1: number }>();
  ribbon.forEach((segment, index) => {
    if (!segment.slotId) return;
    const span = spans[index];
    const current = extent.get(segment.slotId);
    extent.set(segment.slotId, {
      x0: current ? Math.min(current.x0, span.x) : span.x,
      x1: current ? Math.max(current.x1, span.x + span.w) : span.x + span.w,
    });
  });
  // Just under the caption; a captionless dense strip starts under the disc.
  const leaderTop = showLabels ? disc.size + CAPTION_BAND + 2 : slotHeight - 2;
  const leaders = slots.flatMap((slot, index) => {
    const range = extent.get(slot.id);
    if (!range || !highlight.hovered(slot.rowKeys)) return [];
    const column = columns[index];
    return [{ id: slot.id, d: leaderPath(column.x + (column.w / 2), leaderTop, ribbonTop - RAIL_RISE, (range.x0 + range.x1) / 2, ribbonTop) }];
  });

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
            {leaders.map((leader) => <path key={leader.id} d={leader.d} />)}
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
            className={`group absolute top-0 flex cursor-default flex-col items-center transition-opacity duration-150 focus-visible:outline-none motion-reduce:transition-none ${dimmed ? 'opacity-35' : ''}`}
            style={{ left: column.x, width: column.w, height: slotHeight }}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'mouse') return;
              onSlotEnter(slot, event.currentTarget);
            }}
            onFocus={(event) => onSlotEnter(slot, event.currentTarget)}
            onBlur={onSlotLeave}
          >
            <span
              className={`relative rounded-full group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-accent/80 ${playing ? 'mb-rise' : ''}`}
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
              <span className={`mt-1.5 line-clamp-2 px-0.5 text-center font-ropa text-xs leading-[1.1] transition-colors duration-150 ${lit ? 'text-text-primary' : 'text-text-primary/70'}`}>
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

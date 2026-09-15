import { typeMeta, ProcessedMove } from '@/lib/moveBreakdown';

// Healing has no damage-bonus bucket, so heal sources share one colour.
export const HEAL_COLOR = '#67d4a7';
// A merged run of small casts spans several types; it takes the palette's
// deliberate neutral rather than any one of them.
const MERGED_COLOR = '#7f93a8';

/** Share (of move damage) under which a row or cast counts as small. */
const SMALL_SHARE = 0.01;
/** Row count at which sub-1% abilities fold into one summary row. */
export const DENSE_ROW_COUNT = 12;

export type RotationSlot = {
  id: string;
  /** `cast`: a button press (or back-to-back repeats); `status`: buttonless damage; `merged`: a run of small casts. */
  kind: 'cast' | 'status' | 'merged';
  rowKeys: string[];
  label: string;
  skillTab: string;
  color: string;
  /** Casts folded into the slot. */
  count: number;
  damage: number;
  /** 1-based position of the slot's first cast among button casts; 0 for status. */
  firstCast: number;
  /** One beat per cast, drawn as that cast's ribbon segment; a status slot is one beat. */
  beats: Array<{ color: string; damage: number }>;
  /** Row names, for a merged slot's readout. */
  names: string[];
};

export type RotationModel = {
  buttonSlots: RotationSlot[];
  statusSlots: RotationSlot[];
  buttonCastCount: number;
  /** Rotation index of a button cast → its 1-based position among button casts. */
  castPosition: Map<number, number>;
};

/**
 * Two separate emphasis channels. Hovering a row or a strip slot marks every
 * linked piece (the row, every run of it in the strip, its segments) without
 * touching anything else; previewing or pinning a type in the legend dims
 * everything that does not score as that type.
 */
export type Highlight = {
  hovered: (rowKeys: string[]) => boolean;
  typeActive: boolean;
  typeOn: (rowKeys: string[]) => boolean;
};

export const EMPTY_ROTATION: RotationModel = { buttonSlots: [], statusSlots: [], buttonCastCount: 0, castPosition: new Map() };

export const isStatusTab = (tab: string) => tab === 'status';

/**
 * Rebuilds rotation order from every row's casts. Back-to-back casts of one row
 * under one caption become a single slot with one beat per cast; status rows are
 * not button presses and sit after the divider as one slot each.
 */
export function buildRotation(moves: ProcessedMove[]): RotationModel {
  const buttonCasts: Array<{ move: ProcessedMove; cast: ProcessedMove['casts'][number] }> = [];
  const statusSlots: Array<RotationSlot & { firstIndex: number }> = [];

  for (const move of moves) {
    const color = typeMeta(move.primaryType).color;
    if (isStatusTab(move.skillTab)) {
      if (move.casts.length === 0) continue;
      const damage = move.casts.reduce((sum, cast) => sum + cast.damage, 0);
      statusSlots.push({
        id: `status-${move.key}`,
        kind: 'status',
        rowKeys: [move.key],
        label: move.shortName || move.name,
        skillTab: move.skillTab,
        color,
        count: move.casts.length,
        damage,
        firstCast: 0,
        beats: [{ color, damage }],
        names: [move.name],
        firstIndex: move.casts[0].index,
      });
      continue;
    }
    for (const cast of move.casts) buttonCasts.push({ move, cast });
  }

  buttonCasts.sort((a, b) => a.cast.index - b.cast.index);
  const castPosition = new Map<number, number>();
  const buttonSlots: RotationSlot[] = [];
  buttonCasts.forEach(({ move, cast }, position) => {
    castPosition.set(cast.index, position + 1);
    const label = cast.shortName || move.shortName || move.name;
    const color = typeMeta(move.primaryType).color;
    const previous = buttonSlots[buttonSlots.length - 1];
    if (previous && previous.rowKeys[0] === move.key && previous.label === label) {
      previous.count += 1;
      previous.damage += cast.damage;
      previous.beats.push({ color, damage: cast.damage });
      return;
    }
    buttonSlots.push({
      id: `cast-${cast.index}`,
      kind: 'cast',
      rowKeys: [move.key],
      label,
      skillTab: cast.skillTab || move.skillTab,
      color,
      count: 1,
      damage: cast.damage,
      firstCast: position + 1,
      beats: [{ color, damage: cast.damage }],
      names: [move.name],
    });
  });

  return {
    buttonSlots,
    statusSlots: statusSlots.sort((a, b) => a.firstIndex - b.firstIndex),
    buttonCastCount: buttonCasts.length,
    castPosition,
  };
}

/** Dense strips: back-to-back casts under 1% each become one "{n} casts" slot. */
export function mergeSmallSlots(slots: RotationSlot[], rawDamage: number): RotationSlot[] {
  const out: RotationSlot[] = [];
  let run: RotationSlot[] = [];
  const flush = () => {
    if (run.length >= 2) {
      const count = run.reduce((sum, slot) => sum + slot.count, 0);
      out.push({
        id: `merged-${run[0].id}`,
        kind: 'merged',
        rowKeys: Array.from(new Set(run.flatMap((slot) => slot.rowKeys))),
        label: `${count} casts`,
        skillTab: '',
        color: MERGED_COLOR,
        count,
        damage: run.reduce((sum, slot) => sum + slot.damage, 0),
        firstCast: run[0].firstCast,
        beats: run.flatMap((slot) => slot.beats),
        names: Array.from(new Set(run.flatMap((slot) => slot.names))),
      });
    } else {
      out.push(...run);
    }
    run = [];
  };
  for (const slot of slots) {
    if (rawDamage > 0 && slot.damage / rawDamage < SMALL_SHARE) {
      run.push(slot);
    } else {
      flush();
      out.push(slot);
    }
  }
  flush();
  return out;
}

export const isSmallShare = (damage: number, rawDamage: number) => rawDamage > 0 && damage / rawDamage < SMALL_SHARE;

// ---------------------------------------------------------------------------
// Geometry

const DIVIDER_GAP = 22;
/** Column width below which cast captions hide. */
export const LABEL_MIN_COLUMN = 56;

export type Span = { x: number; w: number };

export function layoutColumns(width: number, buttonCount: number, statusCount: number): { columns: Span[]; dividerX: number | null; columnWidth: number } {
  const hasDivider = buttonCount > 0 && statusCount > 0;
  const total = buttonCount + statusCount;
  const columnWidth = total > 0 ? Math.max(0, width - (hasDivider ? DIVIDER_GAP : 0)) / total : 0;
  const columns: Span[] = [];
  for (let i = 0; i < total; i += 1) {
    const x = i < buttonCount ? i * columnWidth : (buttonCount * columnWidth) + (hasDivider ? DIVIDER_GAP : 0) + ((i - buttonCount) * columnWidth);
    columns.push({ x, w: columnWidth });
  }
  return {
    columns,
    dividerX: hasDivider ? (buttonCount * columnWidth) + (DIVIDER_GAP / 2) : null,
    columnWidth,
  };
}

// ---------------------------------------------------------------------------
// Ribbon: the rotation as one part-to-whole bar in cast order

export const RIBBON_HEIGHT = 12;
const SEGMENT_GAP = 2;
/** A cast never disappears: the smallest segment is still a visible sliver. */
const MIN_SEGMENT = 2;

export type RibbonSegment = {
  id: string;
  /** The strip slot the segment belongs to; null for a score bonus. */
  slotId: string | null;
  rowKeys: string[];
  color: string;
  damage: number;
  group: 'button' | 'status' | 'bonus';
};

/** One segment per cast in rotation order, then status damage, then score bonuses. */
export function buildRibbon(
  buttonSlots: RotationSlot[],
  statusSlots: RotationSlot[],
  bonuses: Array<{ key: string; color: string; damage: number }>,
): RibbonSegment[] {
  const out: RibbonSegment[] = [];
  for (const slot of buttonSlots) {
    slot.beats.forEach((beat, index) => {
      out.push({ id: `${slot.id}:${index}`, slotId: slot.id, rowKeys: slot.rowKeys, color: beat.color, damage: beat.damage, group: 'button' });
    });
  }
  for (const slot of statusSlots) {
    out.push({ id: slot.id, slotId: slot.id, rowKeys: slot.rowKeys, color: slot.color, damage: slot.damage, group: 'status' });
  }
  for (const bonus of bonuses) {
    out.push({ id: `bonus-${bonus.key}`, slotId: null, rowKeys: [], color: bonus.color, damage: bonus.damage, group: 'bonus' });
  }
  return out;
}

export type RibbonLayout = { spans: Span[]; lostWidth: number };

/**
 * Proportional widths with a 2px surface gap between segments, one continuous
 * line from the first cast through status damage and score bonuses. Sub-pixel
 * casts are floored to a sliver and the rest shrink to pay for it, so the bar
 * still ends exactly at the width. Edges snap to whole pixels so every segment
 * renders crisp at the same height.
 */
export function layoutRibbon(segments: RibbonSegment[], width: number, lostDamage: number): RibbonLayout {
  if (segments.length === 0 || width <= 0) return { spans: [], lostWidth: 0 };
  const usable = Math.max(0, width - ((segments.length - 1) * SEGMENT_GAP));
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.damage), 0);
  const raw = segments.map((segment) => (total > 0 ? (Math.max(0, segment.damage) / total) * usable : 0));
  const floorCost = raw.reduce((sum, w) => (w < MIN_SEGMENT ? sum + (MIN_SEGMENT - w) : sum), 0);
  const flexible = raw.reduce((sum, w) => (w >= MIN_SEGMENT ? sum + w : sum), 0);
  const scale = flexible > 0 ? Math.max(0, (flexible - floorCost) / flexible) : 1;
  const spans: Span[] = [];
  let cursor = 0;
  raw.forEach((w, index) => {
    if (index > 0) cursor += SEGMENT_GAP;
    const finalWidth = w < MIN_SEGMENT ? MIN_SEGMENT : w * scale;
    const x0 = Math.round(cursor);
    const x1 = Math.max(x0 + MIN_SEGMENT, Math.round(cursor + finalWidth));
    spans.push({ x: x0, w: x1 - x0 });
    cursor += finalWidth;
  });
  const lostWidth = total > 0 && lostDamage > 0 ? Math.min(width, Math.round((lostDamage / total) * usable)) : 0;
  return { spans, lostWidth };
}

/**
 * An orthogonal hairline from under a slot's caption: down to a rail, across,
 * and down onto the centre of its ribbon extent. Every run is axis-aligned and
 * snapped to the pixel grid, so it stays 1px crisp at any offset, and it is the
 * same object on every hover, unlike a band whose shape changed per cast.
 */
export function leaderPath(cx: number, topY: number, railY: number, sx: number, ribbonY: number): string {
  const dropX = Math.round(cx) + 0.5;
  const stemX = Math.floor(sx) + 0.5;
  if (Math.abs(dropX - stemX) < 2) return `M${dropX},${topY} V${ribbonY}`;
  return `M${dropX},${topY} V${railY} H${stemX} V${ribbonY}`;
}

// ---------------------------------------------------------------------------
// Text

const TAB_LABELS: Record<string, string> = {
  'normal-attack': 'Normal Attack',
  skill: 'Resonance Skill',
  liberation: 'Resonance Liberation',
  circuit: 'Forte Circuit',
  intro: 'Intro Skill',
  outro: 'Outro Skill',
  inherent: 'Inherent Skill',
  'tune-break': 'Tune Break',
  echo: 'Echo',
  set: 'Echo Set',
  weapon: 'Weapon',
};

// The damage types a tab deals without any conversion. A row whose every scored
// type is native to its tab needs no arrow: a basic attack under Normal Attack is
// just "Basic Attack". Inherent, set and weapon damage has no native type, so it
// always shows what it counts as.
const TAB_NATIVE_TYPES: Record<string, string[]> = {
  'normal-attack': ['basic_attack', 'heavy_attack'],
  skill: ['resonance_skill'],
  liberation: ['resonance_liberation'],
  circuit: ['forte_circuit'],
  intro: ['intro'],
  outro: ['outro'],
  echo: ['echo'],
  'tune-break': ['tune_break'],
};

export type Subline = {
  /** Tab label shown before the arrow; null when the line is the type alone. */
  tab: string | null;
  types: Array<{ type: string; label: string; color: string }>;
  /** Replaces the whole line for status rows. */
  statusText: string | null;
  tag: string | null;
  text: string;
};

/**
 * "{Tab} → {Type}" when the row scores as something its tab does not natively
 * deal, otherwise the type alone; status rows read "Negative Status", and their
 * tag says what that exempts them from.
 * Types always use their legend label, so one type reads the same everywhere.
 */
export function describeRow(move: Pick<ProcessedMove, 'skillTab' | 'moveTypes' | 'noCrit' | 'bypassDmgBonus'>): Subline {
  const types = move.moveTypes.map((type) => ({ type, ...typeMeta(type) }));
  const typeText = types.map((entry) => entry.label).join(' + ');
  const tabLabel = TAB_LABELS[move.skillTab] ?? null;
  const tag = move.noCrit && move.bypassDmgBonus
    ? 'No crit or DMG bonus'
    : move.noCrit
      ? 'No crit'
      : move.bypassDmgBonus
        ? 'No DMG bonus'
        : null;

  if (isStatusTab(move.skillTab)) {
    return { tab: null, types, statusText: 'Negative Status', tag, text: 'Negative Status' };
  }
  if (types.length === 0) {
    return { tab: tabLabel, types, statusText: null, tag, text: tabLabel ?? '' };
  }
  const native = TAB_NATIVE_TYPES[move.skillTab] ?? [];
  if (!tabLabel || types.every((entry) => native.includes(entry.type))) {
    return { tab: null, types, statusText: null, tag, text: typeText };
  }
  return { tab: tabLabel, types, statusText: null, tag, text: `${tabLabel} → ${typeText}` };
}

export function formatShare(damage: number, total: number): string {
  return `${total > 0 ? ((damage / total) * 100).toFixed(1) : '0.0'}%`;
}

export function formatBaseMV(value: number): string {
  return `${value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`;
}

export function formatHealFormula(flatHeal: number, baseMV: number, scaleStat: string): string {
  const terms: string[] = [];
  if (flatHeal > 0) terms.push(flatHeal.toLocaleString(undefined, { maximumFractionDigits: 2 }));
  if (baseMV > 0) terms.push(`${formatBaseMV(baseMV)} ${scaleStat || 'ATK'}`);
  return terms.join(' + ');
}

/** Signed figure with a true minus sign. */
export function formatSigned(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString();
  return rounded < 0 ? `−${abs}` : `+${abs}`;
}

export function castRangeLabel(slot: RotationSlot, totalCasts: number): string | null {
  if (slot.kind === 'status' || slot.firstCast <= 0) return null;
  const last = slot.firstCast + slot.count - 1;
  return slot.count > 1 ? `${slot.firstCast}-${last} of ${totalCasts}` : `${slot.firstCast} of ${totalCasts}`;
}

/**
 * Where a row's casts sit in the rotation, in words: "casts 9-10 and 12-14 of
 * 18", or "cast 17 of 18". Null for rows with no button casts.
 */
export function rotationPositionsText(move: ProcessedMove, rotation: RotationModel): string | null {
  const positions = move.casts
    .map((cast) => rotation.castPosition.get(cast.index))
    .filter((position): position is number => position !== undefined)
    .sort((a, b) => a - b);
  if (positions.length === 0) return null;

  const ranges: string[] = [];
  let start = positions[0];
  let end = positions[0];
  for (const position of positions.slice(1)) {
    if (position === end + 1) {
      end = position;
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    start = position;
    end = position;
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  const list = ranges.length > 1 ? `${ranges.slice(0, -1).join(', ')} and ${ranges[ranges.length - 1]}` : ranges[0];
  return `${positions.length === 1 ? 'cast' : 'casts'} ${list} of ${rotation.buttonCastCount}`;
}

/** The scaling stat carrying the most damage, so rows only mention a different one. */
export function dominantScaleStat(moves: ProcessedMove[]): string {
  const totals = new Map<string, number>();
  for (const move of moves) {
    if (!move.scaleStat) continue;
    totals.set(move.scaleStat, (totals.get(move.scaleStat) ?? 0) + move.damage);
  }
  let best = '';
  let bestDamage = -1;
  for (const [stat, damage] of totals) {
    if (damage > bestDamage) {
      best = stat;
      bestDamage = damage;
    }
  }
  return best;
}

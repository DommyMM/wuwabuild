'use client';

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSetBonusesFromFetter } from '@/lib/constants/setBonuses';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';
import { FetterHoverCard } from '@/components/echo/FetterHoverCard';

interface ActiveSetsSectionProps {
  showCV?: boolean;
  activeHoverStat?: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
}

const getPieceLabel = (count: number, threshold: number): string => {
  if (threshold === 1) return '1';
  if (threshold === 3) return '3';
  return count >= 5 ? '5' : '2';
};

/**
 * Chip labels for English "X of Y" set names, keyed by fetter id, so a Shattered Dreams row holds both names on one line
 * - Sets missing here show their full name, which still fits through the wrap fallback
 */
const SHORT_SET_NAMES_EN: Partial<Record<number, string>> = {
  24: 'Neonlight Leap',
  25: 'Starry Radiance',
  26: 'Gilded Revelation',
  29: 'True Name',
  30: 'Quiet Snowfall',
  31: 'Spliced Memories',
  33: 'Feathered Trace',
  34: "Evil's Purge",
  35: 'Nether Road',
  36: 'Sworn Vigil',
  37: 'Electric Reflection',
  38: 'Tinged Yearning',
};

/** Design-space font sizes for a set name, in the order the fit pass tries them */
const SET_NAME_ONE_LINE_SIZES_PX = [14, 13, 12] as const;
const SET_NAME_WRAPPED_SIZES_PX = [14, 13, 12, 11, 10, 9] as const;
const SET_NAME_FLOOR_PX = SET_NAME_WRAPPED_SIZES_PX[SET_NAME_WRAPPED_SIZES_PX.length - 1];
const SET_NAME_MAX_LINES = 2;
/** Line height ratio of the span's `leading-tight` */
const SET_NAME_LEADING = 1.25;
/** Height wrapped lines share inside the `h-8` chip, so a wrap never grows the row */
const SET_NAME_BLOCK_PX = 32;
/** Bisection steps for a name's narrowest width, under 1px of error for any name the row can hold */
const SET_NAME_WIDTH_STEPS = 9;

export const ActiveSetsSection: React.FC<ActiveSetsSectionProps> = ({
  showCV = true,
  activeHoverStat = null,
  onHoverStatChange,
}) => {
  const { stats } = useStats();
  // Some set clauses hold only for specific characters, so the chip resolves against the same wearer StatsContext used
  const { state: { characterId } } = useBuild();
  const { fettersByElement } = useGameData();
  const { t } = useLanguage();
  const activeSets = stats.activeSets;
  const hasActiveSets = activeSets.length > 0;
  const hasActiveHover = Boolean(activeHoverStat);
  const hasMultipleSets = activeSets.length > 1;
  const isCrowded = activeSets.length >= 3;

  const chips = useMemo(() => activeSets.map(({ element, count, setName }) => {
    const fetter = fettersByElement[element];
    const threshold = fetter?.pieceCount ?? 2;
    const fullName = fetter ? t(fetter.name) : setName;
    // Matched on the rendered text, so other languages keep game text and a missing translation still gets the short form
    const shortName = fetter && fullName === fetter.name.en ? SHORT_SET_NAMES_EN[fetter.id] : undefined;
    return {
      element,
      count,
      fetter,
      // Shadow of Shattered Dreams is the only one-piece set, so its icon alone identifies it and its count says nothing
      isIconOnly: threshold === 1 && Boolean(fetter?.icon),
      pieceLabel: getPieceLabel(count, threshold),
      name: shortName ?? fullName,
      fullName,
    };
  }), [activeSets, fettersByElement, t]);

  const rowRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nameRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const fitKey = chips.map((chip) => (chip.isIconOnly ? '' : chip.name)).join('|');

  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const row = rowRef.current;
      if (cancelled || !row || row.offsetWidth === 0) return;
      // Icon-only chips render no name, so their slot holds null and they keep their fixed size
      const names: HTMLSpanElement[] = [];
      const wrappers: HTMLDivElement[] = [];
      for (let index = 0; index < chips.length; index++) {
        const name = nameRefs.current[index];
        const wrapper = chipRefs.current[index];
        if (name && wrapper) {
          names.push(name);
          wrappers.push(wrapper);
        }
      }
      if (names.length === 0) return;
      const nameStyle = getComputedStyle(names[0]);
      const namePadding = parseFloat(nameStyle.paddingTop) + parseFloat(nameStyle.paddingBottom);

      const lineHeightFor = (px: number, maxLines: number) => Math.min(px * SET_NAME_LEADING, SET_NAME_BLOCK_PX / maxLines);
      const apply = (px: number, maxLines: number) => {
        const wrap = maxLines > 1;
        names.forEach((node) => {
          node.style.fontSize = `${px}px`;
          node.style.whiteSpace = wrap ? 'normal' : 'nowrap';
          node.style.lineHeight = wrap ? `${lineHeightFor(px, maxLines)}px` : '';
        });
      };
      // 1px of slack on both axes, so sub-pixel rounding does not force a smaller size
      const withinWidth = (node: HTMLSpanElement) => node.scrollWidth <= node.clientWidth + 1;
      const fitsLines = (node: HTMLSpanElement, px: number, maxLines: number) => (
        withinWidth(node) && node.scrollHeight - namePadding <= lineHeightFor(px, maxLines) * maxLines + 1
      );

      // Each chip gets its name's narrowest width in maxLines lines plus an even share of the rest,
      // so a long name borrows from shorter neighbours instead of every chip wrapping at an even split
      const sizeToNames = (px: number, maxLines: number) => {
        wrappers.forEach((node) => { node.style.flex = ''; });
        // Layout px throughout, because CardScaler's transform skews client rects and is scale(0) while a profile row opens
        const chrome = wrappers.map((node, index) => node.offsetWidth - names[index].offsetWidth);
        names.forEach((node) => {
          node.style.flex = 'none';
          node.style.width = 'max-content';
        });
        const high = names.map((node) => node.offsetWidth + 1);
        const low = names.map(() => 0);
        for (let step = 0; step < SET_NAME_WIDTH_STEPS; step++) {
          const mid = names.map((_, index) => (low[index] + high[index]) / 2);
          names.forEach((node, index) => { node.style.width = `${mid[index]}px`; });
          names.forEach((node, index) => {
            if (fitsLines(node, px, maxLines)) high[index] = mid[index];
            else low[index] = mid[index];
          });
        }
        names.forEach((node) => {
          node.style.flex = '';
          node.style.width = '';
        });
        const grow = wrappers.length > 1 ? 1 : 0;
        wrappers.forEach((node, index) => { node.style.flex = `${grow} 1 ${chrome[index] + high[index] + 1}px`; });
      };
      const fitsWrapped = (px: number, maxLines: number) => {
        apply(px, maxLines);
        sizeToNames(px, maxLines);
        return names.every((node) => fitsLines(node, px, maxLines));
      };

      wrappers.forEach((node) => { node.style.flex = ''; });
      for (const px of SET_NAME_ONE_LINE_SIZES_PX) {
        apply(px, 1);
        if (names.every(withinWidth)) return;
      }
      for (const px of SET_NAME_WRAPPED_SIZES_PX) {
        if (fitsWrapped(px, SET_NAME_MAX_LINES)) return;
      }
      // A name too long for two lines at the floor gets a third, sharing the chip height instead of growing the row
      fitsWrapped(SET_NAME_FLOOR_PX, SET_NAME_MAX_LINES + 1);
    };
    measure();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }
    return () => {
      cancelled = true;
    };
  }, [fitKey, chips.length]);

  if (!hasActiveSets && !showCV) return null;

  return (
    <div
      ref={rowRef}
      className={`flex w-full min-w-0 items-stretch overflow-visible pt-2 pb-1 text-sm font-semibold leading-none pl-4 ${isCrowded ? 'gap-1' : 'gap-2'}`}
    >
      {showCV && (
        <div className={`flex shrink-0 items-center justify-center bg-black/35 ${isCrowded ? 'min-h-8 w-20 rounded-lg px-1 py-1' : 'min-h-8 rounded-xl px-1.5'}`}>
          {/* snapdom bakes the measured width into the export
              Without nowrap a hair of font drift at capture splits "220.4 CV" across two lines */}
          <span className="whitespace-nowrap rounded-md tabular-nums">
            {stats.cv.toFixed(1)} CV
          </span>
        </div>
      )}
      {chips.map((chip, index) => {
        const { element, count, fetter, isIconOnly, pieceLabel, name, fullName } = chip;
        const setIcon = fetter?.icon ?? '';
        const setBonuses = getSetBonusesFromFetter(fetter, count, characterId ?? undefined);
        const setHoverKeys = setBonuses
          .map((bonus) => normalizeStatHoverKey(bonus.stat))
          .filter((key): key is NonNullable<typeof key> => key !== null);
        const setHoverMatch = Boolean(activeHoverStat && setHoverKeys.includes(activeHoverStat));
        const interactionClass = !hasActiveHover
          ? ''
          : setHoverMatch
            ? 'opacity-100 ring-1 ring-white/34 bg-white/12 shadow-[0_0_10px_rgba(255,255,255,0.22)]'
            : 'opacity-45 brightness-90';
        // One-line rows: two chips size to their own names and give back what they do not use, three split evenly
        // Wrapped rows are sized to their names by the fit pass, which writes flex inline over these
        const chipSizeClass = isIconOnly
          ? 'shrink-0'
          : isCrowded
            ? 'flex-1'
            : hasMultipleSets
              ? 'shrink'
              : 'w-fit shrink-0';
        // Three-set rows trade chip padding for name width, so the row keeps the column's left inset and both names stay on one line
        const trigger = (
          <div
            className={`flex h-8 w-full min-w-0 items-center bg-black/35 transition-[background-color,box-shadow,filter,opacity,transform] duration-200 ${isCrowded || isIconOnly ? 'justify-center' : ''} ${isIconOnly ? '' : isCrowded ? 'gap-1' : 'gap-1.5'} ${isCrowded ? 'rounded-lg px-1.5' : 'rounded-xl px-2'} ${interactionClass}`}
            title={fullName}
            onMouseEnter={setHoverKeys.length > 0 ? () => onHoverStatChange?.(setHoverKeys[0]) : undefined}
            onMouseLeave={setHoverKeys.length > 0 ? () => onHoverStatChange?.(null) : undefined}
          >
            {setIcon && <img src={setIcon} alt={setIcon} className={`${isCrowded ? 'h-4.5 w-4.5' : 'h-5 w-5'} shrink-0 object-contain`} />}
            {!isIconOnly && (
              <>
                {/* py-0.5 keeps second-line descenders inside the clip, since at 14px they hang past a 16px line box */}
                <span
                  ref={(node) => { nameRefs.current[index] = node; }}
                  className="min-w-0 flex-1 overflow-hidden py-0.5 text-center text-sm leading-tight whitespace-nowrap text-balance"
                >
                  {name}
                </span>
                <span className="shrink-0 rounded-md border border-amber-300/55 bg-amber-300/18 px-1 text-xs">
                  {pieceLabel}
                </span>
              </>
            )}
          </div>
        );

        return (
          <div
            key={`${element}-${count}`}
            ref={(node) => { chipRefs.current[index] = node; }}
            className={`flex min-w-0 ${chipSizeClass}`}
          >
            {fetter ? (
              <FetterHoverCard fetter={fetter} placement="top" triggerClassName="flex w-full min-w-0">
                {trigger}
              </FetterHoverCard>
            ) : trigger}
          </div>
        );
      })}
    </div>
  );
};

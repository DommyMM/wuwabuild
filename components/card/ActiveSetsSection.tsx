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

// Design-space font sizes for a set name, in the order the fit pass tries them.
const SET_NAME_ONE_LINE_SIZES_PX = [14, 13, 12] as const;
const SET_NAME_WRAPPED_SIZES_PX = [14, 13, 12, 11, 10, 9] as const;
const SET_NAME_MAX_LINES = 2;
const COMPACT_SET_NAMES: Record<string, string> = {
  'Shadow of Shattered Dreams': 'Shattered Dreams',
  'Rite of Gilded Revelation': 'Gilded Revelation',
  'Reel of Spliced Memories': 'Spliced Memories',
  'Wishes of Quiet Snowfall': 'Quiet Snowfall',
  'Pact of Neonlight Leap': 'Neonlight Leap',
  'Halo of Starry Radiance': 'Starry Radiance',
  'Sound of True Name': 'True Name',
};

export const ActiveSetsSection: React.FC<ActiveSetsSectionProps> = ({
  showCV = true,
  activeHoverStat = null,
  onHoverStatChange,
}) => {
  const { stats } = useStats();
  // Some set clauses hold only for specific characters, so the chip has to be
  // resolved against the same wearer StatsContext used.
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
    return {
      element,
      count,
      fetter,
      isOnePieceSet: threshold === 1,
      pieceLabel: getPieceLabel(count, threshold),
      fullName,
      displayName: isCrowded ? COMPACT_SET_NAMES[fullName] ?? fullName : fullName,
    };
  }), [activeSets, fettersByElement, isCrowded, t]);

  const nameRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const fitKey = chips.map((chip) => chip.displayName).join('|');

  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const nodes = nameRefs.current
        .slice(0, chips.length)
        .filter((node): node is HTMLSpanElement => node !== null);
      if (nodes.length === 0) return;

      // 1px of slack on both axes
      const apply = (px: number, wrap: boolean) => {
        nodes.forEach((node) => {
          node.style.fontSize = `${px}px`;
          node.style.whiteSpace = wrap ? 'normal' : 'nowrap';
        });
      };
      const withinWidth = (node: HTMLSpanElement) => node.scrollWidth <= node.clientWidth + 1;
      const withinLines = (node: HTMLSpanElement, px: number) => {
        const lineHeight = parseFloat(getComputedStyle(node).lineHeight) || px;
        return node.scrollHeight <= lineHeight * SET_NAME_MAX_LINES + 1;
      };

      for (const px of SET_NAME_ONE_LINE_SIZES_PX) {
        apply(px, false);
        if (nodes.every(withinWidth)) return;
      }
      let chosen = SET_NAME_WRAPPED_SIZES_PX[SET_NAME_WRAPPED_SIZES_PX.length - 1];
      for (const px of SET_NAME_WRAPPED_SIZES_PX) {
        apply(px, true);
        if (nodes.every((node) => withinWidth(node) && withinLines(node, px))) {
          chosen = px;
          break;
        }
      }
      apply(chosen, true);
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
    <div className={`flex w-full min-w-0 items-stretch overflow-visible pt-2 pb-1 text-sm font-semibold leading-none ${isCrowded ? 'justify-center gap-1 px-0' : 'gap-2 pl-4'}`}>
      {showCV && (
        <div className={`flex shrink-0 items-center justify-center bg-black/35 ${isCrowded ? 'min-h-8 w-20 rounded-lg px-1 py-1' : 'min-h-8 rounded-xl px-1.5'}`}>
          {/* snapdom bakes its measured width into the export, so without nowrap a hair of font drift at capture time splits "220.4 CV" across two lines */}
          <span className="whitespace-nowrap rounded-md tabular-nums">
            {stats.cv.toFixed(1)} CV
          </span>
        </div>
      )}
      {chips.map((chip, index) => {
        const { element, count, fetter, isOnePieceSet, pieceLabel, fullName, displayName } = chip;
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
        // Two chips size to their own names and give back what they do not use.
        // Three are all long and all wrap, so an even split is the tidier read
        // there and is what the 9px floor was measured against.
        const chipSizeClass = isCrowded
          ? 'flex-1'
          : hasMultipleSets
            ? 'shrink'
            : 'w-fit shrink-0';
        const triggerLayoutClass = isCrowded
          ? isOnePieceSet
            ? 'justify-center gap-1 rounded-lg px-1.5 py-1'
            : 'justify-center gap-1.5 rounded-lg px-2 py-1'
          : 'gap-2 rounded-xl px-2 py-1';
        const trigger = (
          <div
            className={`flex min-h-8 w-full min-w-0 items-center bg-black/35 transition-[background-color,box-shadow,filter,opacity,transform] duration-200 ${triggerLayoutClass} ${interactionClass}`}
            title={fullName}
            onMouseEnter={setHoverKeys.length > 0 ? () => onHoverStatChange?.(setHoverKeys[0]) : undefined}
            onMouseLeave={setHoverKeys.length > 0 ? () => onHoverStatChange?.(null) : undefined}
          >
            {setIcon && <img src={setIcon} alt={setIcon} className={`${isCrowded ? 'h-4.5 w-4.5' : 'h-5 w-5'} shrink-0 object-contain`} />}
            <span
              ref={(node) => { nameRefs.current[index] = node; }}
              className="min-w-0 flex-1 overflow-hidden text-center text-sm leading-tight whitespace-nowrap text-balance"
            >
              {displayName}
            </span>
            {!isOnePieceSet && (
              <span className="shrink-0 rounded-md border border-amber-300/55 bg-amber-300/18 px-1 text-xs">
                {pieceLabel}
              </span>
            )}
          </div>
        );

        if (!fetter) {
          return (
            <div key={`${element}-${count}`} className={`flex min-w-0 ${chipSizeClass}`}>
              {trigger}
            </div>
          );
        }

        return (
          <FetterHoverCard
            key={`${element}-${count}`}
            fetter={fetter}
            placement="top"
            triggerClassName={`flex min-w-0 ${chipSizeClass}`}
          >
            {trigger}
          </FetterHoverCard>
        );
      })}
    </div>
  );
};

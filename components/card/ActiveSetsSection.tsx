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

// Design-space font sizes for a set name. Two chips share the row's 364.9px of
// chip budget, so each gets ~182px, which is ~113px of text after the icon,
// gaps and piece badge. Measured 2026-09-11 in Plus Jakarta at wght 600: 32 of
// the 34 English set names balance onto two lines at 14px in that slot. Only
// "Song of Feathered Trace" (13px) and "Shadow of Shattered Dreams" (12px) need
// to step down, so the ladder is a fallback, not the common path.
//
// The 9px floor is for three-set rows, where each chip is only ~66px of text:
// "Tidebreaking" and "Rejuvenating" are unbreakable single words that still
// overflow that at 10px, by 1.0px and 0.3px. 9px clears every English name
// except "Song of Feathered Trace", which needs a COMPACT_SET_NAMES entry
// rather than a smaller size. Wider locales land here too.
const SET_NAME_SIZES_PX = [14, 13, 12, 11, 10, 9] as const;
const SET_NAME_MAX_LINES = 2;

// Three active sets is always Adam + 2pc + 2pc (verified against all 37,954
// stored builds: every 3-set row contains Shadow of Shattered Dreams). Three
// chips share ~129px each, which no full name reaches on two lines, so the
// crowded row trades the "X of Y" prefix away before it trades size.
const COMPACT_SET_NAMES: Record<string, string> = {
  'Shadow of Shattered Dreams': 'Shattered Dreams',
  'Rite of Gilded Revelation': 'Gilded Revelation',
  'Reel of Spliced Memories': 'Spliced Memories',
  'Wishes of Quiet Snowfall': 'Quiet Snowfall',
  'Pact of Neonlight Leap': 'Neonlight Leap',
  'Halo of Starry Radiance': 'Starry Radiance',
  'Sound of True Name': 'True Name',
  'Thread of Severed Fate': 'Severed Fate',
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
  // Chips split the row evenly from two sets up, so neither can be the one that
  // absorbs every pixel of overflow.
  const sharesRowWidth = activeSets.length > 1;
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

  // One size for the whole row: the largest that keeps every name inside
  // SET_NAME_MAX_LINES. Sizing per chip would put two different sizes side by
  // side, which is what made the old length threshold read as a glitch rather
  // than a decision. Written straight onto the nodes the way WeaponGroup does,
  // because it is a layout fact rather than app state, and re-run once web
  // fonts land since the first paint can be in the fallback face.
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const nodes = nameRefs.current
        .slice(0, chips.length)
        .filter((node): node is HTMLSpanElement => node !== null);
      if (nodes.length === 0) return;
      let chosen = SET_NAME_SIZES_PX[SET_NAME_SIZES_PX.length - 1];
      for (const px of SET_NAME_SIZES_PX) {
        nodes.forEach((node) => { node.style.fontSize = `${px}px`; });
        // 1px of slack on both axes: line boxes land on sub-pixel values and
        // snapdom's clone rounds them up, which would otherwise shrink the
        // export a step below what the live card shows.
        const fits = nodes.every((node) => {
          const lineHeight = parseFloat(getComputedStyle(node).lineHeight) || px;
          return node.scrollHeight <= lineHeight * SET_NAME_MAX_LINES + 1
            && node.scrollWidth <= node.clientWidth + 1;
        });
        if (fits) {
          chosen = px;
          break;
        }
      }
      nodes.forEach((node) => { node.style.fontSize = `${chosen}px`; });
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
        const chipSizeClass = sharesRowWidth ? 'flex-1' : 'w-fit shrink-0';
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
            {/* overflow-hidden is what makes scrollWidth/scrollHeight report the
                real overflow for the fit pass above, and it is the floor's
                safety net when even 10px cannot hold a name in two lines. */}
            <span
              ref={(node) => { nameRefs.current[index] = node; }}
              className={`min-w-0 flex-1 overflow-hidden text-center text-sm leading-tight text-balance ${sharesRowWidth ? 'whitespace-normal' : 'whitespace-nowrap'}`}
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

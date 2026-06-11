'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
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

const WRAPPING_SET_NAME_LENGTH = 18;
const CROWDED_SET_NAME_LENGTH = 16;
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

const getDisplaySetName = (setName: string, isCrowded: boolean): string => {
  if (!isCrowded) return setName;
  return COMPACT_SET_NAMES[setName] ?? setName;
};

export const ActiveSetsSection: React.FC<ActiveSetsSectionProps> = ({
  showCV = true,
  activeHoverStat = null,
}) => {
  const { stats } = useStats();
  const { fettersByElement } = useGameData();
  const { t } = useLanguage();
  const hasActiveSets = stats.activeSets.length > 0;
  const hasActiveHover = Boolean(activeHoverStat);
  const hasMultipleActiveSets = stats.activeSets.length > 1;
  const hasCrowdedActiveSets = stats.activeSets.length >= 3;

  if (!hasActiveSets && !showCV) return null;

  return (
    <div className={`flex w-full min-w-0 overflow-visible pt-2 pb-1 text-sm font-semibold leading-none ${hasCrowdedActiveSets ? 'justify-center gap-1 px-0' : 'gap-2 pl-4'}`}>
      {showCV && (
        <div className={`flex shrink-0 items-center justify-center bg-black/35 ${hasCrowdedActiveSets ? 'min-h-8 w-20 rounded-lg px-1 py-1' : 'rounded-xl p-1.5'}`}>
          <span className="rounded-md">
            {stats.cv.toFixed(1)} CV
          </span>
        </div>
      )}
      {stats.activeSets.map(({ element, count, setName }, index) => {
        const fetter = fettersByElement[element];
        const threshold = fetter?.pieceCount ?? 2;
        const isOnePieceSet = threshold === 1;
        const pieceLabel = getPieceLabel(count, threshold);
        const shouldShowPieceLabel = !isOnePieceSet;
        const fullDisplayName = fetter ? t(fetter.name) : setName;
        const displayName = getDisplaySetName(fullDisplayName, hasCrowdedActiveSets);
        const shouldFlexSet = !hasMultipleActiveSets || index === stats.activeSets.length - 1;
        const shouldUseCompactText = hasMultipleActiveSets && displayName.length >= (
          hasCrowdedActiveSets ? CROWDED_SET_NAME_LENGTH : WRAPPING_SET_NAME_LENGTH
        );
        const chipSizeClass = hasCrowdedActiveSets
          ? isOnePieceSet
            ? 'w-28 shrink-0'
            : 'w-32 shrink-0'
          : hasMultipleActiveSets
          ? `${shouldFlexSet ? 'shrink' : 'w-fit shrink-0'} ${shouldUseCompactText ? 'max-w-42' : 'max-w-50'}`
          : 'w-fit shrink-0';
        const chipTextClass = hasMultipleActiveSets
          ? hasCrowdedActiveSets
            ? 'whitespace-normal leading-[0.78rem]'
            : 'whitespace-normal leading-tight'
          : 'whitespace-nowrap leading-none';
        const chipTextSizeClass = hasMultipleActiveSets
          ? hasCrowdedActiveSets
            ? isOnePieceSet
              ? 'flex-none max-w-17'
              : 'flex-none max-w-17'
            : 'flex-1'
          : 'flex-1';
        const setIcon = fetter?.icon ?? '';
        const setBonuses = getSetBonusesFromFetter(fetter, count);
        const setHoverMatch = Boolean(
          activeHoverStat && setBonuses.some((bonus) => normalizeStatHoverKey(bonus.stat) === activeHoverStat)
        );
        const interactionClass = !hasActiveHover
          ? ''
          : setHoverMatch
            ? 'opacity-100 ring-1 ring-white/34 bg-white/12 shadow-[0_0_10px_rgba(255,255,255,0.22)]'
            : 'opacity-45 brightness-90';
        const triggerLayoutClass = hasCrowdedActiveSets
          ? isOnePieceSet
            ? 'justify-center gap-1 rounded-lg px-1.5 py-1'
            : 'justify-center gap-1.5 rounded-lg px-2 py-1'
          : 'gap-2 rounded-xl px-2 py-1';
        const trigger = (
          <div
            className={`flex min-h-8 w-full min-w-0 items-center bg-black/35 transition-all duration-200 ${triggerLayoutClass} ${interactionClass}`}
            title={fullDisplayName}
          >
            {setIcon && <img src={setIcon} alt={setIcon} className={`${hasCrowdedActiveSets ? 'h-4.5 w-4.5' : 'h-5 w-5'} shrink-0 object-contain`} />}
            <span className={`min-w-0 ${chipTextSizeClass} text-center ${shouldUseCompactText ? 'text-xs' : 'text-sm'} ${chipTextClass}`}>
              {displayName}
            </span>
            {shouldShowPieceLabel && (
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

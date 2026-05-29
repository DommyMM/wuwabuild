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
  if (threshold === 3) return '3';
  return count >= 5 ? '5' : '2';
};

const WRAPPING_SET_NAME_LENGTH = 18;

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

  if (!hasActiveSets && !showCV) return null;

  return (
    <div className="flex w-full min-w-0 gap-2 overflow-visible pt-2 pb-1 pl-4 text-sm font-semibold leading-none">
      {showCV && (
        <div className="flex shrink-0 items-center rounded-xl bg-black/35 p-1.5">
          <span className="rounded-md">
            {stats.cv.toFixed(1)} CV
          </span>
        </div>
      )}
      {stats.activeSets.map(({ element, count, setName }, index) => {
        const fetter = fettersByElement[element];
        const threshold = fetter?.pieceCount ?? 2;
        const pieceLabel = getPieceLabel(count, threshold);
        const displayName = fetter ? t(fetter.name) : setName;
        const shouldFlexSet = !hasMultipleActiveSets || index === stats.activeSets.length - 1;
        const shouldUseCompactText = hasMultipleActiveSets && displayName.length >= WRAPPING_SET_NAME_LENGTH;
        const chipSizeClass = hasMultipleActiveSets
          ? `${shouldFlexSet ? 'shrink' : 'w-fit shrink-0'} ${shouldUseCompactText ? 'max-w-42' : 'max-w-50'}`
          : 'w-fit shrink-0';
        const chipTextClass = hasMultipleActiveSets
          ? 'whitespace-normal leading-tight'
          : 'whitespace-nowrap leading-none';
        const chipTextSizeClass = hasMultipleActiveSets
          ? shouldUseCompactText
            ? 'w-min flex-none'
            : 'flex-none'
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
        const trigger = (
          <div
            className={`flex min-h-8 w-full min-w-0 items-center gap-2 rounded-xl bg-black/35 px-2 py-1 transition-all duration-200 ${interactionClass}`}
          >
            {setIcon && <img src={setIcon} alt={setIcon} className="h-5 w-5 shrink-0 object-contain" />}
            <span className={`min-w-0 ${chipTextSizeClass} text-center ${shouldUseCompactText ? 'text-xs' : 'text-sm'} ${chipTextClass}`}>
              {displayName}
            </span>
            <span className="shrink-0 rounded-md border border-amber-300/55 bg-amber-300/18 px-1 text-xs">
              {pieceLabel}
            </span>
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

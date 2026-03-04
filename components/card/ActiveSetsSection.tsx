'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPrimarySetBonusFromFetter } from '@/lib/constants/setBonuses';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';

interface ActiveSetsSectionProps {
  showCV?: boolean;
  activeHoverStat?: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
}

const getPieceLabel = (count: number, threshold: number): string => {
  if (threshold === 3) return '3';
  return count >= 5 ? '5' : '2';
};

export const ActiveSetsSection: React.FC<ActiveSetsSectionProps> = ({
  showCV = true,
  activeHoverStat = null,
  onHoverStatChange,
}) => {
  const { stats } = useStats();
  const { fettersByElement } = useGameData();
  const { t } = useLanguage();
  const hasActiveSets = stats.activeSets.length > 0;
  const hasActiveHover = Boolean(activeHoverStat);

  if (!hasActiveSets && !showCV) return null;

  return (
    <div className="flex gap-2 pt-2 px-4 text-sm font-semibold leading-none">
      {showCV && (
        <div className="flex items-center rounded-xl bg-black/35 p-1.5">
          <span className="rounded-md">
            {stats.cv.toFixed(1)} CV
          </span>
        </div>
      )}
      {stats.activeSets.map(({ element, count, setName }) => {
        const fetter = fettersByElement[element];
        const threshold = fetter?.pieceCount ?? 2;
        const pieceLabel = getPieceLabel(count, threshold);
        const displayName = fetter ? t(fetter.name) : setName;
        const setIcon = fetter?.icon ?? '';
        const setBonus = getPrimarySetBonusFromFetter(fetter, count);
        const setHoverKey = normalizeStatHoverKey(setBonus?.stat);
        const interactionClass = !hasActiveHover
          ? ''
          : (setHoverKey && activeHoverStat === setHoverKey)
            ? 'opacity-100 ring-1 ring-white/34 bg-white/12 shadow-[0_0_10px_rgba(255,255,255,0.22)]'
            : 'opacity-45 brightness-90';
        return (
          <div
            key={`${element}-${count}`}
            className={`flex w-44 items-center justify-between rounded-xl bg-black/35 p-1.5 transition-all duration-200 ${interactionClass}`}
            onMouseEnter={setHoverKey ? () => onHoverStatChange?.(setHoverKey) : undefined}
            onMouseLeave={setHoverKey ? () => onHoverStatChange?.(null) : undefined}
          >
            {setIcon && <img src={setIcon} alt="" className="h-5 w-5 object-contain" />}
            <span>{displayName}</span>
            <span className="rounded-md border border-amber-300/55 bg-amber-300/18 px-1 text-xs">
              {pieceLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};

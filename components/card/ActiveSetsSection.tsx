'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

const getPieceLabel = (count: number, threshold: number): string => {
  if (threshold === 3) return '3';
  return count >= 5 ? '5' : '2';
};

export const ActiveSetsSection: React.FC = () => {
  const { stats } = useStats();
  const { fettersByElement } = useGameData();
  const { t } = useLanguage();

  if (stats.activeSets.length === 0) return null;

  return (
    <div className={`flex gap-2 pt-2 ${stats.activeSets.length === 1 ? 'justify-center' : 'justify-between'}`}>
      {stats.activeSets.map(({ element, count, setName }) => {
        const fetter = fettersByElement[element];
        const threshold = fetter?.pieceCount ?? 2;
        const pieceLabel = getPieceLabel(count, threshold);
        const displayName = fetter ? t(fetter.name) : setName;
        const setIcon = fetter?.icon ?? '';

        return (
          <div
            key={`${element}-${count}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black/35 p-1.5 max-w-45"
          >
            {setIcon && <img src={setIcon} alt="" className="h-5 w-5 object-contain" />}
            <span className="text-sm font-medium">{displayName}</span>
            <span className="rounded-md border border-amber-300/55 bg-amber-300/18 px-1 text-xs">
              {pieceLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};

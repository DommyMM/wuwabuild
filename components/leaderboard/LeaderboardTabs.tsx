'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWeaponPaths } from '@/lib/paths';
import { SEQUENCE_BADGE_STYLES } from '@/components/build/buildConstants';

// Weapon selector cards

interface WeaponCardsProps {
  weaponIds: string[];
  weaponIndex: number;
  onSelect: (index: number) => void;
}

const WeaponCards: React.FC<WeaponCardsProps> = ({ weaponIds, weaponIndex, onSelect }) => {
  const { getWeapon } = useGameData();
  const { t } = useLanguage();

  if (weaponIds.length === 0) return null;

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(weaponIds.length, 4)}, minmax(0, 1fr))` }}>
      {weaponIds.map((weaponId, index) => {
        const weapon = getWeapon(weaponId);
        const label = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;
        const isActive = index === weaponIndex;

        return (
          <button
            key={weaponId}
            type="button"
            onClick={() => onSelect(index)}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border px-3 py-3 text-center transition-all ${
              isActive
                ? 'border-accent/70 bg-accent/10 shadow-[0_0_12px_rgba(166,150,98,0.15)]'
                : 'border-border/60 bg-background/60 hover:border-accent/35 hover:bg-accent/5'
            }`}
          >
            {weapon ? (
              <img
                src={getWeaponPaths(weapon)}
                alt={label}
                className="h-14 w-14 object-contain"
              />
            ) : (
              <div className="h-14 w-14 rounded bg-border/30" />
            )}
            <span className={`text-xs font-medium leading-tight ${isActive ? 'text-accent' : 'text-text-primary/70'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Sequence tabs

interface SequenceTabsProps {
  sequences: string[];
  activeSequence: string;
  onSelect: (seq: string) => void;
}

const SequenceTabs: React.FC<SequenceTabsProps> = ({ sequences, activeSequence, onSelect }) => {
  if (sequences.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {sequences.map((seq) => {
        const isActive = seq === activeSequence;
        const level = Math.max(0, Math.min(6, Number(seq.replace(/\D/g, '')) || 0));
        return (
          <button
            key={seq}
            type="button"
            onClick={() => onSelect(seq)}
            className={`cursor-pointer rounded-lg border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all ${
              isActive
                ? `${SEQUENCE_BADGE_STYLES[level]}`
                : 'border-border bg-background text-text-primary/60 hover:border-accent/40 hover:text-text-primary'
            }`}
          >
            {seq}
          </button>
        );
      })}
    </div>
  );
};

// Combined export

interface LeaderboardTabsProps {
  weaponIds: string[];
  weaponIndex: number;
  onSelectWeapon: (index: number) => void;
  sequences: string[];
  activeSequence: string;
  onSelectSequence: (seq: string) => void;
}

export const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  weaponIds,
  weaponIndex,
  onSelectWeapon,
  sequences,
  activeSequence,
  onSelectSequence,
}) => (
  <div className="space-y-3">
    <WeaponCards weaponIds={weaponIds} weaponIndex={weaponIndex} onSelect={onSelectWeapon} />
    <SequenceTabs sequences={sequences} activeSequence={activeSequence} onSelect={onSelectSequence} />
  </div>
);

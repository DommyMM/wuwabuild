'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBTrack } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix } from '../constants';

const BASE_GLASS_CARD =
  'group relative overflow-hidden rounded-xl border px-3 py-2.5 shadow-[0_3px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-200';
const INACTIVE_GLASS_CARD =
  'border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.015)_32%,rgba(0,0,0,0.26)_100%)] hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent/10';
const ACTIVE_GOLD_CARD =
  'border-amber-300/35 bg-[linear-gradient(180deg,rgba(166,150,98,0.22)_0%,rgba(255,255,255,0.03)_34%,rgba(0,0,0,0.34)_100%)] shadow-[0_6px_16px_rgba(0,0,0,0.26)]';

interface TrackTabsProps {
  tracks: LBTrack[];
  activeTrack: string;
  onSelect: (trackKey: string) => void;
}

const TrackTabs: React.FC<TrackTabsProps> = ({ tracks, activeTrack, onSelect }) => {
  if (tracks.length <= 1) return null;

  return (
    <div className="space-y-2">
      <div className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-text-primary/40">
        Playstyle
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {tracks.map((track) => {
          const isActive = track.key === activeTrack;
          const level = parseLBSeqLevel(track.key);
          const badgeColors = LB_SEQ_BADGE_COLORS[level] || 'border-accent/55 bg-accent/10 text-accent';
          const label = stripLBSeqPrefix(track.label);

          return (
            <button
              key={track.key}
              type="button"
              onClick={() => onSelect(track.key)}
              className={`${BASE_GLASS_CARD} cursor-pointer ${isActive ? ACTIVE_GOLD_CARD : INACTIVE_GLASS_CARD}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_46%)] opacity-55 transition-opacity duration-200 group-hover:opacity-75" />
              <div className="relative flex items-center gap-2">
                <span className={`text-sm font-semibold tracking-wide ${isActive ? 'text-amber-50' : 'text-text-primary/78'}`}>
                  {label}
                </span>
                {level > 0 && (
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold leading-none tracking-wide ${badgeColors}`}>
                    S{level}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface WeaponTabsProps {
  weaponIds: string[];
  weaponIndex: number;
  onSelect: (index: number) => void;
}

const WeaponTabs: React.FC<WeaponTabsProps> = ({ weaponIds, weaponIndex, onSelect }) => {
  const { getWeapon } = useGameData();
  const { t } = useLanguage();

  if (weaponIds.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-text-primary/40">
        Weapon
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {weaponIds.map((weaponId, index) => {
          const weapon = getWeapon(weaponId);
          const label = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;
          const isActive = index === weaponIndex;

          return (
            <button
              key={weaponId}
              type="button"
              onClick={() => onSelect(index)}
              className={`${BASE_GLASS_CARD} flex min-w-[156px] cursor-pointer items-center gap-3 ${isActive ? ACTIVE_GOLD_CARD : INACTIVE_GLASS_CARD}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_46%)] opacity-55 transition-opacity duration-200 group-hover:opacity-75" />
              {weapon ? (
                <img
                  src={getWeaponPaths(weapon)}
                  alt={label}
                  className="relative h-10 w-10 shrink-0 object-contain"
                />
              ) : (
                <div className="relative h-10 w-10 shrink-0 rounded bg-border/30" />
              )}
              <div className="relative min-w-0 text-left">
                <div className={`truncate text-sm font-semibold leading-tight ${isActive ? 'text-amber-50' : 'text-text-primary/80'}`}>
                  {label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DEFAULT_ER_BRACKETS = [110, 120, 130, 140, 150] as const;

interface ErBracketTabsProps {
  brackets?: number[];
  erMin: number;
  onSelect: (value: number) => void;
}

const ErBracketTabs: React.FC<ErBracketTabsProps> = ({ brackets, erMin, onSelect }) => {
  const resolvedBrackets = (brackets?.length ? brackets : [...DEFAULT_ER_BRACKETS]).filter((value, index, arr) => (
    Number.isFinite(value) && value > 0 && arr.indexOf(value) === index
  ));
  const allBrackets = [0, ...resolvedBrackets];

  return (
    <div className="space-y-2">
      <div className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-text-primary/40">
        ER Bracket
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {allBrackets.map((bracket) => {
          const isActive = erMin === bracket;
          const label = bracket === 0 ? 'All' : String(bracket);
          return (
            <button
              key={bracket}
              type="button"
              onClick={() => onSelect(bracket)}
              className={[
                'cursor-pointer rounded-lg border px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-150',
                isActive
                  ? 'border-amber-300/35 bg-[linear-gradient(180deg,rgba(166,150,98,0.22)_0%,rgba(0,0,0,0.34)_100%)] text-amber-50 shadow-[0_2px_8px_rgba(0,0,0,0.22)]'
                  : 'border-border/60 bg-white/4 text-text-primary/55 hover:border-accent/30 hover:bg-accent/8 hover:text-text-primary/80',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface LeaderboardTabsProps {
  weaponIds: string[];
  weaponIndex: number;
  onSelectWeapon: (index: number) => void;
  tracks: LBTrack[];
  activeTrack: string;
  onSelectTrack: (trackKey: string) => void;
  erMin: number;
  onSelectErMin: (value: number) => void;
}

export const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  weaponIds,
  weaponIndex,
  onSelectWeapon,
  tracks,
  activeTrack,
  onSelectTrack,
  erMin,
  onSelectErMin,
}) => {
  const activeTrackConfig = tracks.find((entry) => entry.key === activeTrack);

  return (
    <div className="space-y-4">
      <TrackTabs tracks={tracks} activeTrack={activeTrack} onSelect={onSelectTrack} />
      <WeaponTabs weaponIds={weaponIds} weaponIndex={weaponIndex} onSelect={onSelectWeapon} />
      <ErBracketTabs brackets={activeTrackConfig?.erBrackets} erMin={erMin} onSelect={onSelectErMin} />
    </div>
  );
};

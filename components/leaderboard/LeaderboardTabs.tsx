'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBTrack } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix } from './leaderboardConstants';

const BASE_GLASS_CARD =
  'group relative overflow-hidden rounded-xl border px-3 py-2.5 shadow-[0_8px_18px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-all duration-200';
const INACTIVE_GLASS_CARD =
  'border-white/10 bg-[linear-gradient(170deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_28%,rgba(0,0,0,0.36)_100%)] hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/10';
const ACTIVE_GOLD_CARD =
  'border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.32)]';

interface TrackTabsProps {
  tracks: LBTrack[];
  activeTrack: string;
  onSelect: (trackKey: string) => void;
}

const TrackTabs: React.FC<TrackTabsProps> = ({ tracks, activeTrack, onSelect }) => {
  if (tracks.length <= 1) return null;

  return (
    <div className="space-y-2">
      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-text-primary/40">
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
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_52%)] opacity-70 transition-opacity duration-200 group-hover:opacity-100" />
              <div className="relative flex items-center gap-2">
                <span className={`text-sm font-semibold tracking-wide ${isActive ? 'text-amber-50' : 'text-text-primary/78'}`}>
                  {label}
                </span>
                {level > 0 && (
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none tracking-wide ${badgeColors}`}>
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
      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-text-primary/40">
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
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_52%)] opacity-70 transition-opacity duration-200 group-hover:opacity-100" />
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

interface LeaderboardTabsProps {
  weaponIds: string[];
  weaponIndex: number;
  onSelectWeapon: (index: number) => void;
  tracks: LBTrack[];
  activeTrack: string;
  onSelectTrack: (trackKey: string) => void;
}

export const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  weaponIds,
  weaponIndex,
  onSelectWeapon,
  tracks,
  activeTrack,
  onSelectTrack,
}) => (
  <div className="space-y-4">
    <TrackTabs tracks={tracks} activeTrack={activeTrack} onSelect={onSelectTrack} />
    <WeaponTabs weaponIds={weaponIds} weaponIndex={weaponIndex} onSelect={onSelectWeapon} />
  </div>
);

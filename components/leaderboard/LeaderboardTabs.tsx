'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBTrack } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel } from './leaderboardConstants';

// ─── Track selector ───────────────────────────────────────────────────────────

interface TrackTabsProps {
  tracks: LBTrack[];
  activeTrack: string;
  onSelect: (trackKey: string) => void;
}

const TrackTabs: React.FC<TrackTabsProps> = ({ tracks, activeTrack, onSelect }) => {
  if (tracks.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tracks.map((track) => {
        const isActive = track.key === activeTrack;
        const level = parseLBSeqLevel(track.key);
        const activeColors = LB_SEQ_BADGE_COLORS[level] || 'border-accent/55 bg-accent/10 text-accent';

        return (
          <button
            key={track.key}
            type="button"
            onClick={() => onSelect(track.key)}
            className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold tracking-wide transition-all ${
              isActive
                ? `${activeColors} shadow-sm`
                : 'border-border/50 bg-background/40 text-text-primary/55 hover:border-accent/30 hover:bg-accent/5 hover:text-text-primary/80'
            }`}
          >
            {track.label}
          </button>
        );
      })}
    </div>
  );
};

// ─── Weapon selector (compact horizontal tab row) ─────────────────────────────

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
    <div className="flex flex-wrap gap-2">
      {weaponIds.map((weaponId, index) => {
        const weapon = getWeapon(weaponId);
        const label = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;
        const isActive = index === weaponIndex;

        return (
          <button
            key={weaponId}
            type="button"
            onClick={() => onSelect(index)}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
              isActive
                ? 'border-accent/60 bg-accent/10 shadow-sm'
                : 'border-border/50 bg-background/40 hover:border-accent/30 hover:bg-accent/5'
            }`}
          >
            {weapon ? (
              <img
                src={getWeaponPaths(weapon)}
                alt={label}
                className="h-8 w-8 shrink-0 object-contain"
              />
            ) : (
              <div className="h-8 w-8 shrink-0 rounded bg-border/30" />
            )}
            <span className={`text-sm font-medium leading-tight ${isActive ? 'text-accent' : 'text-text-primary/65'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Combined export — tracks first (board selector), then weapons ─────────────

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
  <div className="space-y-2.5">
    <TrackTabs tracks={tracks} activeTrack={activeTrack} onSelect={onSelectTrack} />
    <WeaponTabs weaponIds={weaponIds} weaponIndex={weaponIndex} onSelect={onSelectWeapon} />
  </div>
);

'use client';

import React, { useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBTrack } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix } from '../constants';

const BASE_GLASS_CARD =
  'group relative overflow-hidden rounded-xl border px-3 py-2.5 shadow-[0_3px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40';
const INACTIVE_GLASS_CARD =
  'border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.015)_32%,rgba(0,0,0,0.26)_100%)] hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent/10 motion-reduce:hover:translate-y-0';
const ACTIVE_GOLD_CARD =
  'border-amber-300/35 bg-[linear-gradient(180deg,rgba(166,150,98,0.22)_0%,rgba(255,255,255,0.03)_34%,rgba(0,0,0,0.34)_100%)] shadow-[0_6px_16px_rgba(0,0,0,0.26)]';
const CARD_SHEEN =
  'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_46%)] opacity-55 transition-opacity duration-200 group-hover:opacity-75';

const ER_PILL =
  'rounded-full border border-sky-300/40 bg-sky-400/10 px-2 py-0.5 text-xs font-semibold leading-none tracking-wide text-sky-200';

function formatErTarget(erTarget: number): string {
  return Number.isInteger(erTarget) ? String(erTarget) : erTarget.toFixed(1).replace(/\.0$/u, '');
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-text-primary/40">
    {children}
  </div>
);

const SharedERRule: React.FC<{ erTarget: number }> = ({ erTarget }) => (
  <div className="flex justify-center">
    <div
      className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-lg border border-sky-300/20 bg-sky-400/8 px-2.5 py-1 sm:rounded-full sm:pl-1.5 sm:pr-3"
      title={`Scores below ${formatErTarget(erTarget)}% Energy Regen are penalized proportionately on this board`}
    >
      <span className={ER_PILL}>ER &ge; {formatErTarget(erTarget)}%</span>
      <span className="text-center text-xs leading-snug text-text-primary/55 sm:text-left sm:leading-none">
        Scores below {formatErTarget(erTarget)}% Energy Regen are penalized proportionately
      </span>
    </div>
  </div>
);

interface TrackTabsProps {
  tracks: LBTrack[];
  activeTrack: string;
  onSelect: (trackKey: string) => void;
}

const TrackTabs: React.FC<TrackTabsProps> = ({ tracks, activeTrack, onSelect }) => {
  // ER is a scoring rule for the active board, not selector chrome.
  // Surface it once below the playstyle group and leave the tabs to identify choices.
  const activeErTarget = useMemo(() => {
    const target = tracks.find((track) => track.key === activeTrack)?.erTarget;
    return typeof target === 'number' && target > 0 ? target : 0;
  }, [activeTrack, tracks]);

  if (tracks.length <= 1) {
    // Still surface the scoring rule even without a track choice to make.
    const only = tracks[0];
    if (only && typeof only.erTarget === 'number' && only.erTarget > 0) {
      return <SharedERRule erTarget={only.erTarget} />;
    }
    return null;
  }

  return (
    <div className="space-y-2">
      <SectionLabel>Playstyle</SectionLabel>
      <div className="flex flex-wrap justify-center gap-2.5" aria-label="Playstyle">
        {tracks.map((track) => {
          const isActive = track.key === activeTrack;
          const level = parseLBSeqLevel(track.key);
          const badgeColors =
            LB_SEQ_BADGE_COLORS[level] || 'border-accent/55 bg-accent/10 text-accent';
          const label = stripLBSeqPrefix(track.label);

          return (
            <button
              key={track.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(track.key)}
              className={`${BASE_GLASS_CARD} cursor-pointer ${isActive ? ACTIVE_GOLD_CARD : INACTIVE_GLASS_CARD}`}
            >
              <div className={CARD_SHEEN} />
              <div className="relative flex items-center gap-2">
                <span
                  className={`text-sm font-semibold tracking-wide ${isActive ? 'text-amber-50' : 'text-text-primary/78'}`}
                >
                  {label}
                </span>
                {level > 0 && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold leading-none tracking-wide ${badgeColors}`}
                  >
                    S{level}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {activeErTarget > 0 && <SharedERRule erTarget={activeErTarget} />}
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
      <SectionLabel>Weapon</SectionLabel>
      <div className="flex flex-wrap justify-center gap-2.5" aria-label="Weapon">
        {weaponIds.map((weaponId, index) => {
          const weapon = getWeapon(weaponId);
          const label = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;
          const isActive = index === weaponIndex;

          return (
            <button
              key={weaponId}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(index)}
              className={`${BASE_GLASS_CARD} flex min-w-[156px] cursor-pointer items-center gap-3 ${isActive ? ACTIVE_GOLD_CARD : INACTIVE_GLASS_CARD}`}
            >
              <div className={CARD_SHEEN} />
              {weapon ? (
                <img
                  src={getWeaponPaths(weapon)}
                  alt=""
                  className="relative h-10 w-10 shrink-0 object-contain"
                />
              ) : (
                <div className="relative h-10 w-10 shrink-0 rounded bg-border/30" />
              )}
              <div className="relative min-w-0 text-left">
                <div
                  className={`truncate text-sm font-semibold leading-tight ${isActive ? 'text-amber-50' : 'text-text-primary/80'}`}
                >
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
}) => {
  return (
    <div className="space-y-4">
      <TrackTabs tracks={tracks} activeTrack={activeTrack} onSelect={onSelectTrack} />
      <WeaponTabs weaponIds={weaponIds} weaponIndex={weaponIndex} onSelect={onSelectWeapon} />
    </div>
  );
};

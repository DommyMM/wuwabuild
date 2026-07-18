'use client';

import React, { useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBTrack } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import type { LBBoardDisplay } from '@/lib/lb';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix, ScoringMode } from '../constants';

const BASE_GLASS_CARD =
  'group relative overflow-hidden rounded-xl border px-3 py-2.5 shadow-[0_3px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40';
const INACTIVE_GLASS_CARD =
  'border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.015)_32%,rgba(0,0,0,0.26)_100%)] hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent/10 motion-reduce:hover:translate-y-0';
const ACTIVE_GOLD_CARD =
  'border-amber-300/35 bg-[linear-gradient(180deg,rgba(166,150,98,0.22)_0%,rgba(255,255,255,0.03)_34%,rgba(0,0,0,0.34)_100%)] shadow-[0_6px_16px_rgba(0,0,0,0.26)]';
const CARD_SHEEN =
  'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_46%)] opacity-55 transition-opacity duration-200 group-hover:opacity-75';

// Compact bracket-row buttons (the old ER-bracket treatment): lighter than the
// board selector cards, so Scoring reads as a metric lens instead of a board.
const SCORING_SEGMENT =
  'relative inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold leading-none tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60';
const SCORING_SEGMENT_ACTIVE =
  'border-amber-300/45 bg-[linear-gradient(180deg,rgba(251,191,36,0.15)_0%,rgba(251,191,36,0.07)_100%)] text-amber-50 shadow-[0_2px_10px_rgba(0,0,0,0.25)]';
const SCORING_SEGMENT_IDLE =
  'border-border/75 bg-black/20 text-text-primary/60 hover:border-accent/30 hover:text-text-primary/85';
const SCORING_DEFAULT_BADGE =
  'rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]';
const SCORING_DEFAULT_BADGE_ACTIVE = 'border-amber-200/25 bg-black/20 text-amber-100/70';
const SCORING_DEFAULT_BADGE_IDLE = 'border-border/50 bg-black/15 text-text-primary/35';

function formatErTarget(erTarget: number): string {
  return Number.isInteger(erTarget) ? String(erTarget) : erTarget.toFixed(1).replace(/\.0$/u, '');
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-text-primary/40">
    {children}
  </div>
);

// The board's metric lens, as its own labeled row (like Playstyle / Weapon,
// mirroring the old ER-bracket row). Score is the canonical ER-adjusted ranking;
// Damage is the raw rotation-damage lens over the same board. The ER detail lives
// in the native title tooltip so the buttons stay clean.
const ScoringRow: React.FC<{
  erTarget: number;
  scoring: ScoringMode;
  onSelect: (mode: ScoringMode) => void;
}> = ({ erTarget, scoring, onSelect }) => {
  const isRaw = scoring === 'raw';
  const scoreTitle = `Score: default ER-adjusted ranking. Builds below ${formatErTarget(erTarget)}% ER are scaled down.`;
  const damageTitle = 'Damage: raw rotation damage before ER scaling. ER still shows, but does not lower this value.';
  return (
    <div className="space-y-2">
      <SectionLabel>Scoring</SectionLabel>
      <div className="flex flex-wrap items-center justify-center gap-2.5" role="group" aria-label="Scoring mode">
        <button
          type="button"
          aria-pressed={!isRaw}
          aria-label={scoreTitle}
          title={scoreTitle}
          onClick={() => onSelect('adjusted')}
          className={`${SCORING_SEGMENT} ${!isRaw ? SCORING_SEGMENT_ACTIVE : SCORING_SEGMENT_IDLE}`}
        >
          <span>Score</span>
          <span className={`${SCORING_DEFAULT_BADGE} ${!isRaw ? SCORING_DEFAULT_BADGE_ACTIVE : SCORING_DEFAULT_BADGE_IDLE}`}>
            Default
          </span>
        </button>
        <button
          type="button"
          aria-pressed={isRaw}
          aria-label={damageTitle}
          title={damageTitle}
          onClick={() => onSelect('raw')}
          className={`${SCORING_SEGMENT} ${isRaw ? SCORING_SEGMENT_ACTIVE : SCORING_SEGMENT_IDLE}`}
        >
          Damage
        </button>
      </div>
    </div>
  );
};

interface TrackTabsProps {
  tracks: LBTrack[];
  activeTrack: string;
  onSelect: (trackKey: string) => void;
}

const TrackTabs: React.FC<TrackTabsProps> = ({ tracks, activeTrack, onSelect }) => {
  // Playstyle (sequence track) selector. A single track is no choice to make.
  if (tracks.length <= 1) return null;

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
    </div>
  );
};

interface WeaponTabsProps {
  weaponIds: string[];
  /** Server-resolved weapon names/icons; SSR fallback until the catalog loads. */
  weaponDisplay?: LBBoardDisplay['weapons'];
  weaponIndex: number;
  onSelect: (index: number) => void;
}

const WeaponTabs: React.FC<WeaponTabsProps> = ({ weaponIds, weaponDisplay, weaponIndex, onSelect }) => {
  const { getWeapon } = useGameData();
  const { t } = useLanguage();

  if (weaponIds.length === 0) return null;

  return (
    <div className="space-y-2">
      <SectionLabel>Weapon</SectionLabel>
      <div className="flex flex-wrap justify-center gap-2.5" aria-label="Weapon">
        {weaponIds.map((weaponId, index) => {
          const weapon = getWeapon(weaponId);
          const fallback = weaponDisplay?.[weaponId];
          const label = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : fallback?.name ?? weaponId;
          const iconSrc = weapon ? getWeaponPaths(weapon) : fallback?.iconUrl ?? null;
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
              {iconSrc ? (
                <img
                  src={iconSrc}
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
  weaponDisplay?: LBBoardDisplay['weapons'];
  weaponIndex: number;
  onSelectWeapon: (index: number) => void;
  tracks: LBTrack[];
  activeTrack: string;
  onSelectTrack: (trackKey: string) => void;
  scoring: ScoringMode;
  onSelectScoring: (mode: ScoringMode) => void;
}

export const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  weaponIds,
  weaponDisplay,
  weaponIndex,
  onSelectWeapon,
  tracks,
  activeTrack,
  onSelectTrack,
  scoring,
  onSelectScoring,
}) => {
  // Active board's ER target drives whether the Scoring row is offered (0 = no ER
  // requirement, so Raw ≡ Score and there is nothing to toggle).
  const activeErTarget = useMemo(() => {
    const target = tracks.find((track) => track.key === activeTrack)?.erTarget;
    return typeof target === 'number' && target > 0 ? target : 0;
  }, [activeTrack, tracks]);

  return (
    <div className="space-y-4">
      <TrackTabs tracks={tracks} activeTrack={activeTrack} onSelect={onSelectTrack} />
      <WeaponTabs weaponIds={weaponIds} weaponDisplay={weaponDisplay} weaponIndex={weaponIndex} onSelect={onSelectWeapon} />
      {activeErTarget > 0 && (
        <ScoringRow erTarget={activeErTarget} scoring={scoring} onSelect={onSelectScoring} />
      )}
    </div>
  );
};

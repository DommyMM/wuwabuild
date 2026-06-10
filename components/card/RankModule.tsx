'use client';

import React from 'react';
import { LB_SEQ_BADGE_COLORS, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { getRankTier, RankTier } from '@/lib/calculations/rankTier';
import { useGameData } from '@/contexts/GameDataContext';
import { WeaponHoverCard } from '@/components/weapon/WeaponHoverCard';

export interface RankBoard {
  /** Unique standing key. Used by AdjustRankingButton to identify the active board. */
  key: string;
  rank: number;
  total: number;
  topPercent: number;
  tier: RankTier;
  weaponId: string;
  weaponName: string;
  weaponIcon?: string;
  weaponElement?: string;
  sequence: number;
  trackKey: string;
  trackLabel: string;
  erBracket?: number;
  damage?: number;
}

export interface RankLoadoutIcon {
  key: string;
  src: string;
  label: string;
  wrap?: (trigger: React.ReactNode) => React.ReactNode;
}

export interface RankTeamMember {
  id: string;
  name: string;
  head?: string;
  sequence: number;
  isLead?: boolean;
  loadoutIcons: RankLoadoutIcon[];
}

interface RankModuleProps {
  board: RankBoard | null;
  team?: RankTeamMember[];
  loading?: boolean;
}

const formatNumber = (value: number): string => Math.round(value).toLocaleString();
// Board totals abbreviate at five digits so the line survives boards growing 100x.
const formatTotal = (value: number): string => {
  if (value < 10_000) return formatNumber(value);
  const thousands = value / 1000;
  const text = thousands >= 100 ? Math.round(thousands).toString() : thousands.toFixed(1).replace(/\.0$/, '');
  return `${text}k`;
};
// Precision scaled to real granularity (largest board ~2k builds → ~0.05% steps).
const formatPct = (value: number): string => {
  if (value < 0.01) return '<0.01';
  if (value < 10) return value.toFixed(2);
  return value.toFixed(1);
};

const cleanBoardTrackLabel = (board: RankBoard): string => (
  stripLBSeqPrefix(board.trackLabel || board.trackKey).replace(/\s+S\d+$/u, '')
);

// Badges and gear sit ON the portrait (inset corner badge, icons overlapping the
// bottom edge) so the support unit stays compact and nothing fights the module border.
const SupportAvatar: React.FC<{ member: RankTeamMember }> = ({ member }) => (
  <div
    role="img"
    aria-label={member.name}
    title={member.name}
    className="relative h-11 w-11 rounded-lg border border-white/16 bg-black/45 bg-cover bg-center bg-no-repeat shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
    style={member.head ? { backgroundImage: `url("${member.head}")` } : undefined}
  >
    {member.sequence > 0 && (
      <span
        className="absolute -top-1 -right-1 rounded-full bg-[#0d1017]/95 shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
        aria-label={`Sequence ${member.sequence}`}
      >
        <span className={`block rounded-full border px-1 py-0.5 text-[9px] leading-none font-bold tracking-wide ${LB_SEQ_BADGE_COLORS[member.sequence]}`}>
          S{member.sequence}
        </span>
      </span>
    )}
    {member.loadoutIcons.length > 0 && (
      <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
        {member.loadoutIcons.slice(0, 3).map((icon) => {
          const trigger = (
            <div
              role="img"
              aria-label={icon.label}
              title={icon.label}
              className="h-4 w-4 rounded-[4px] border border-white/14 bg-black/80 bg-cover bg-center bg-no-repeat shadow-[0_2px_5px_rgba(0,0,0,0.5)]"
              style={{ backgroundImage: `url("${icon.src}")` }}
            />
          );
          return (
            <React.Fragment key={icon.key}>
              {icon.wrap ? icon.wrap(trigger) : trigger}
            </React.Fragment>
          );
        })}
      </div>
    )}
  </div>
);

export const RankModule: React.FC<RankModuleProps> = ({ board, team = [], loading = false }) => {
  const { getWeapon, statIcons } = useGameData();
  const tierStyle = board ? getRankTier(board.topPercent) : null;
  const rankColor = tierStyle?.color ?? 'rgba(224,224,224,0.4)';
  const rankGlow = tierStyle?.glow;
  // Lead is implied by the card itself; keep this strip focused on board + supports.
  const supports = team.filter((member) => !member.isLead);
  const empty = !loading && !board;
  const boardSeqClass = board && board.sequence > 0
    ? LB_SEQ_BADGE_COLORS[board.sequence]
    : 'border-white/14 bg-black/35 text-text-primary/55';
  const boardWeapon = getWeapon(board?.weaponId ?? null);
  const boardWeaponAtkIcon = statIcons?.ATK;
  const boardWeaponMainIcon = boardWeapon?.main_stat ? (statIcons?.[boardWeapon.main_stat] ?? null) : null;
  const boardWeaponTrigger = board?.weaponIcon ? (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-black/40 shadow-[0_5px_14px_rgba(0,0,0,0.35)]">
      <span
        role="img"
        aria-label={board.weaponName}
        className="h-8 w-8 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${board.weaponIcon}")` }}
      />
    </span>
  ) : null;

  return (
    <div
      className="relative flex h-20 w-fit max-w-105 items-stretch gap-2.5 overflow-visible rounded-lg border border-white/15 py-1.5 pr-3.5 pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_1px_0_0_rgba(255,255,255,0.07),0_8px_18px_rgba(0,0,0,0.34)]"
      style={{
        background:
          'linear-gradient(150deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 38%, rgba(0,0,0,0.46) 100%)',
      }}
    >
      {/* Tier-tinted glow bloom behind the hero number, reinforcing the tier-colored percentile. */}
      {rankGlow && !loading && board && (
        <span
          className="pointer-events-none absolute top-1/2 left-4 h-14 w-14 -translate-y-1/2 rounded-full opacity-36 blur-2xl"
          style={{ background: rankGlow }}
        />
      )}

      {/* Zone 1, the grade: percentile (tier color) + absolute rank. */}
      <div className="relative flex w-20 shrink-0 flex-col justify-center">
        {empty ? (
          <span className="font-gowun text-[18px] font-bold text-text-primary/30">Not ranked</span>
        ) : (
          <>
            <div className="mb-1 font-ropa text-[9px] leading-none tracking-[0.2em] text-text-primary/40 uppercase">
              top
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="font-gowun text-[25px] leading-none font-bold tabular-nums"
                style={{ color: rankColor, textShadow: rankGlow ? `0 0 16px ${rankGlow}` : undefined }}
              >
                {loading || !board ? '-' : formatPct(board.topPercent)}
              </span>
              {!loading && board && (
                <span className="font-gowun text-sm leading-none font-bold" style={{ color: rankColor }}>
                  %
                </span>
              )}
            </div>
            {!loading && board && (
              <div className="mt-1.5 flex items-baseline gap-1 font-gowun tabular-nums">
                <span className="text-[14px] leading-none font-bold text-text-primary/90">
                  #{formatNumber(board.rank)}
                </span>
                <span className="text-[10px] text-text-primary/40">/ {formatTotal(board.total)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Board identity: weapon + promoted track, sequence (and ER bracket) underneath. */}
      {!empty && (
        <div className="flex min-w-0 items-center gap-2.5">
          {boardWeapon && boardWeaponTrigger ? (
            <WeaponHoverCard
              placement="top"
              triggerClassName="flex"
              weapon={boardWeapon}
              weaponLevel={90}
              weaponRank={1}
              scaledAtk={Math.floor(boardWeapon.ATK * 12.5)}
              scaledMainStat={parseFloat((boardWeapon.base_main * 4.5).toFixed(1))}
              atkIcon={boardWeaponAtkIcon}
              mainStatIcon={boardWeaponMainIcon}
            >
              {boardWeaponTrigger}
            </WeaponHoverCard>
          ) : boardWeaponTrigger}
          {board && !loading && (
            <div className="flex min-w-0 flex-col justify-center gap-1.5">
              <span className="truncate font-ropa text-[13px] leading-none tracking-[0.08em] text-text-primary/90 uppercase">
                {cleanBoardTrackLabel(board)}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wide ${boardSeqClass}`}>
                  S{board.sequence}
                </span>
                {(board.erBracket ?? 0) > 0 && (
                  <span className="font-ropa text-[10px] leading-none tracking-[0.12em] text-text-primary/45 uppercase">
                    {board.erBracket}% ER
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Supports for the active board (lead omitted). */}
      {supports.length > 0 && (
        <div className="ml-1 flex shrink-0 items-center gap-3">
          {supports.map((member) => (
            <SupportAvatar key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
};

'use client';

import React from 'react';
import { LB_SEQ_BADGE_COLORS } from '@/components/leaderboards/constants';
import { getRankTier, RankTier } from '@/lib/calculations/rankTier';

export interface RankBoard {
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
const formatPct = (value: number): string => {
  if (value < 0.01) return '<0.01';
  if (value < 10) return value.toFixed(2);
  return value.toFixed(1);
};

const TeamMemberAvatar: React.FC<{ member: RankTeamMember }> = ({ member }) => {
  const portraitClass = member.isLead
    ? 'border-accent shadow-[0_0_0_1px_rgba(166,150,98,0.18)_inset,0_4px_10px_rgba(0,0,0,0.32)]'
    : 'border-white/14 shadow-[0_4px_10px_rgba(0,0,0,0.28)]';

  return (
    <div
      role="img"
      aria-label={member.name}
      title={member.name}
      className={`relative h-9 w-9 rounded-lg border bg-black/40 bg-cover bg-center bg-no-repeat ${portraitClass}`}
      style={member.head ? { backgroundImage: `url("${member.head}")` } : undefined}
    >
      {member.sequence > 0 && (
        <span
          className={`absolute -right-1.5 -top-1.5 rounded-full border px-1.5 py-px text-[10px] font-bold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[member.sequence]}`}
          aria-label={`Sequence ${member.sequence}`}
        >
          S{member.sequence}
        </span>
      )}
      {member.loadoutIcons.length > 0 && (
        <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
          {member.loadoutIcons.slice(0, 3).map((icon) => (
            <div
              key={icon.key}
              role="img"
              aria-label={icon.label}
              title={icon.label}
              className="h-3 w-3 rounded-sm border border-white/15 bg-black/70 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${icon.src}")` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const RankModule: React.FC<RankModuleProps> = ({ board, team = [], loading = false }) => {
  const tierStyle = board ? getRankTier(board.topPercent) : null;
  const rankColor = tierStyle?.color ?? 'rgba(224,224,224,0.4)';
  const rankGlow = tierStyle?.glow;
  const trackLabel = loading ? 'Loading' : board ? board.trackLabel || board.trackKey : 'Not ranked';

  return (
    <div
      className="relative flex items-center gap-3 overflow-visible rounded-xl border border-amber-300/45 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.32)]"
      style={{
        background:
          'linear-gradient(170deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 28%, rgba(0,0,0,0.44) 100%)',
      }}
    >
      {/* Rank + percentile */}
      <div className="flex shrink-0 items-baseline gap-1.5">
        {loading || !board ? (
          <span className="font-gowun text-[22px] font-bold tabular-nums text-text-primary/30">—</span>
        ) : (
          <>
            <span
              className="font-gowun text-[22px] font-bold leading-none tabular-nums tracking-[-0.02em]"
              style={{
                color: rankColor,
                textShadow: rankGlow ? `0 0 18px ${rankGlow}` : undefined,
              }}
            >
              #{formatNumber(board.rank)}
            </span>
            <span className="font-gowun text-[11px] tabular-nums text-text-primary/40">
              / {formatNumber(board.total)}
            </span>
          </>
        )}
      </div>

      {board && !loading && (
        <div className="font-gowun text-[14px] tabular-nums text-accent">
          <span className="mr-1 font-ropa text-[9px] font-normal uppercase tracking-[0.22em] text-text-primary/40">
            TOP
          </span>
          {formatPct(board.topPercent)}%
        </div>
      )}

      {/* Team strip */}
      {team.length > 0 && (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {team.map((member) => <TeamMemberAvatar key={member.id} member={member} />)}
        </div>
      )}

      {/* Track + weapon pill */}
      <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/14 bg-black/35 px-2 py-1">
        {board?.weaponIcon && (
          <div
            role="img"
            aria-label={board.weaponName}
            title={board.weaponName}
            className="h-4 w-4 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${board.weaponIcon}")` }}
          />
        )}
        <span className="font-ropa text-[10px] uppercase tracking-[0.18em] text-text-primary/80">
          {trackLabel}
        </span>
      </div>
    </div>
  );
};

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
  loadoutIcons: RankLoadoutIcon[];
}

interface RankModuleProps {
  board: RankBoard | null;
  team?: RankTeamMember[];
  loading?: boolean;
}

const formatNumber = (value: number): string => Math.round(value).toLocaleString();

const TeamMemberAvatar: React.FC<{ member: RankTeamMember }> = ({ member }) => (
  <div className="flex flex-col items-center">
    <div className="relative h-11 w-11 rounded-xl border border-white/12 bg-black/35 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
      {member.head ? (
        <div
          role="img"
          aria-label={member.name}
          className="h-full w-full rounded-[inherit] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${member.head}")` }}
        />
      ) : (
        <div className="h-full w-full rounded-[inherit] bg-background-secondary/70" />
      )}
      {member.sequence > 0 && (
        <span
          className={`absolute -right-1 -top-1 rounded-full border px-1 py-px text-[8px] font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[member.sequence]}`}
          aria-label={`Sequence ${member.sequence}`}
        >
          S{member.sequence}
        </span>
      )}
    </div>
    {member.loadoutIcons.length > 0 && (
      <div className="relative z-10 -mt-2 flex items-center justify-center gap-0.5">
        {member.loadoutIcons.slice(0, 3).map((icon) => (
          <div
            key={icon.key}
            role="img"
            aria-label={icon.label}
            className="h-4.5 w-4.5 rounded-md border border-white/10 bg-black/70 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${icon.src}")` }}
          />
        ))}
      </div>
    )}
  </div>
);

export const RankModule: React.FC<RankModuleProps> = ({ board, team = [], loading = false }) => {
  const tierStyle = board ? getRankTier(board.topPercent) : null;
  const rankColor = tierStyle?.color ?? 'rgba(224,224,224,0.4)';
  const rankGlow = tierStyle?.glow;

  return (
    <div
      className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-amber-300/45 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.32)]"
      style={{
        background:
          'linear-gradient(170deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 28%, rgba(0,0,0,0.44) 100%)',
      }}
    >
      {/* Track kicker */}
      <div className="font-ropa text-[10px] uppercase tracking-[0.22em] text-text-primary/55">
        {loading ? 'Loading boards…' : board ? board.trackLabel || board.trackKey : 'Not ranked'}
      </div>

      <div className="flex items-end justify-between gap-4">
        {/* Team comp */}
        <div className="flex shrink-0 items-end gap-2">
          {team.length > 0 ? (
            team.map((member) => <TeamMemberAvatar key={member.id} member={member} />)
          ) : loading ? (
            <span className="font-ropa text-[10px] text-text-primary/40">Team —</span>
          ) : null}
        </div>

        {/* Rank + damage stack */}
        <div className="flex min-w-0 flex-col items-end gap-1">
          <div className="flex items-baseline gap-1.5">
            {loading || !board ? (
              <span className="font-gowun text-[28px] font-bold tabular-nums text-text-primary/30">—</span>
            ) : (
              <>
                <span
                  className="font-gowun text-[28px] font-bold leading-none tabular-nums tracking-[-0.02em]"
                  style={{
                    color: rankColor,
                    textShadow: rankGlow ? `0 0 18px ${rankGlow}` : undefined,
                  }}
                >
                  #{formatNumber(board.rank)}
                </span>
                <span className="font-gowun text-[13px] tabular-nums text-text-primary/40">
                  / {formatNumber(board.total)}
                </span>
              </>
            )}
          </div>
          <div className="font-gowun text-[20px] font-bold leading-none tabular-nums tracking-[-0.02em] text-text-primary">
            {loading || !board || board.damage == null ? (
              <span className="text-text-primary/30">— — —</span>
            ) : (
              formatNumber(board.damage)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

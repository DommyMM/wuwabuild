'use client';

import React from 'react';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
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

const TeamMemberAvatar: React.FC<{ member: RankTeamMember }> = ({ member }) => {
  const tooltip = (
    <div className="flex flex-col gap-1.5 px-1 py-1">
      <div className="font-plus-jakarta text-sm font-semibold text-text-primary">{member.name}</div>
      {member.loadoutIcons.length > 0 ? (
        <div className="flex items-center gap-1.5">
          {member.loadoutIcons.map((icon) => (
            <div
              key={icon.key}
              role="img"
              aria-label={icon.label}
              title={icon.label}
              className="h-6 w-6 rounded-md border border-white/15 bg-black/60 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${icon.src}")` }}
            />
          ))}
        </div>
      ) : (
        <span className="text-[10px] uppercase tracking-[0.18em] text-text-primary/40">No loadout data</span>
      )}
    </div>
  );

  return (
    <HoverTooltip content={tooltip} placement="bottom" strictPlacement>
      <div
        role="img"
        aria-label={member.name}
        className="relative h-11 w-11 rounded-lg border border-white/14 bg-black/40 bg-cover bg-center bg-no-repeat shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
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
      </div>
    </HoverTooltip>
  );
};

export const RankModule: React.FC<RankModuleProps> = ({ board, team = [], loading = false }) => {
  const tierStyle = board ? getRankTier(board.topPercent) : null;
  const rankColor = tierStyle?.color ?? 'rgba(224,224,224,0.4)';
  const rankGlow = tierStyle?.glow;

  return (
    <div
      className="relative flex flex-col gap-1.5 overflow-visible rounded-xl border border-amber-300/45 px-3.5 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.32)]"
      style={{
        background:
          'linear-gradient(170deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 28%, rgba(0,0,0,0.44) 100%)',
      }}
    >
      <div className="font-ropa text-[10px] uppercase tracking-[0.22em] text-text-primary/55">
        {loading ? 'Loading boards…' : board ? board.trackLabel || board.trackKey : 'Not ranked'}
      </div>

      <div className="flex items-center gap-3">
        {team.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            {team.map((member) => <TeamMemberAvatar key={member.id} member={member} />)}
          </div>
        )}

        <div className="flex min-w-0 flex-col items-start gap-0.5">
          <div className="flex items-baseline gap-1.5">
            {loading || !board ? (
              <span className="font-gowun text-[26px] font-bold tabular-nums text-text-primary/30">—</span>
            ) : (
              <>
                <span
                  className="font-gowun text-[26px] font-bold leading-none tabular-nums tracking-[-0.02em]"
                  style={{
                    color: rankColor,
                    textShadow: rankGlow ? `0 0 18px ${rankGlow}` : undefined,
                  }}
                >
                  #{formatNumber(board.rank)}
                </span>
                <span className="font-gowun text-[12px] tabular-nums text-text-primary/40">
                  / {formatNumber(board.total)}
                </span>
              </>
            )}
          </div>
          <div className="font-gowun text-[18px] font-bold leading-none tabular-nums tracking-[-0.02em] text-text-primary">
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

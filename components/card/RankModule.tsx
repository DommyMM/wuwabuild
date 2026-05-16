'use client';

import React from 'react';
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

interface RankModuleProps {
  board: RankBoard | null;
  loading?: boolean;
}

const formatNumber = (value: number): string => Math.round(value).toLocaleString();

export const RankModule: React.FC<RankModuleProps> = ({ board, loading = false }) => {
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

      {/* Rank + damage row */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          {loading || !board ? (
            <span className="font-gowun text-[30px] font-bold tabular-nums text-text-primary/30">—</span>
          ) : (
            <>
              <span
                className="font-gowun text-[30px] font-bold leading-none tabular-nums tracking-[-0.02em]"
                style={{
                  color: rankColor,
                  textShadow: rankGlow ? `0 0 18px ${rankGlow}` : undefined,
                }}
              >
                #{formatNumber(board.rank)}
              </span>
              <span className="font-gowun text-[14px] tabular-nums text-text-primary/40">
                / {formatNumber(board.total)}
              </span>
            </>
          )}
        </div>
        <div className="font-gowun text-[22px] font-bold leading-none tabular-nums tracking-[-0.02em] text-text-primary">
          {loading || !board || board.damage == null ? (
            <span className="text-text-primary/30">— — —</span>
          ) : (
            formatNumber(board.damage)
          )}
        </div>
      </div>
    </div>
  );
};

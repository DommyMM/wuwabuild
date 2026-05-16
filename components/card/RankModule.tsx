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
const formatPct = (value: number): string => {
  if (value < 0.01) return '<0.01';
  if (value < 10) return value.toFixed(2);
  return value.toFixed(1);
};

export const RankModule: React.FC<RankModuleProps> = ({ board, loading = false }) => {
  const tierStyle = board ? getRankTier(board.topPercent) : null;
  const rankColor = tierStyle?.color ?? 'rgba(224,224,224,0.4)';
  const rankGlow = tierStyle?.glow;

  return (
    <div
      className="relative flex flex-col gap-2 border border-accent/45 px-3 py-2.5"
      style={{
        background: 'linear-gradient(180deg, rgba(166,150,98,0.10) 0%, rgba(255,255,255,0.02) 34%, rgba(0,0,0,0.30) 100%)',
      }}
    >
      {/* Track kicker */}
      <div className="font-ropa text-[10px] uppercase tracking-[0.22em] text-text-primary/55">
        {loading ? 'Loading boards…' : board ? board.trackLabel || board.trackKey : 'Not ranked'}
      </div>

      {/* Rank + percentile + damage row */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2.5">
          {loading || !board ? (
            <span className="font-gowun text-[28px] font-bold tabular-nums text-accent/30">— —</span>
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
              <span className="ml-1 font-gowun text-[16px] font-bold leading-none tabular-nums text-accent">
                <span className="mr-1 font-ropa text-[9px] font-normal uppercase tracking-[0.22em] text-text-primary/40">
                  TOP
                </span>
                {formatPct(board.topPercent)}%
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

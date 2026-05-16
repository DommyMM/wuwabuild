'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ELEMENT_COLOR } from '@/lib/elementVisuals';
import { getRankTier, RankTier } from '@/lib/calculations/rankTier';

export type RankMode = 'damage' | 'rv';

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
  rv?: number;
}

interface RankModuleProps {
  mode: RankMode;
  boards: RankBoard[];
  activeIdx: number;
  loading?: boolean;
  onModeChange: (mode: RankMode) => void;
  onBoardChange: (idx: number) => void;
}

const formatNumber = (value: number): string => Math.round(value).toLocaleString();
const formatPct = (value: number): string => {
  if (value < 0.01) return '<0.01';
  if (value < 1) return value.toFixed(2);
  if (value < 10) return value.toFixed(2);
  return value.toFixed(1);
};

export const RankModule: React.FC<RankModuleProps> = ({
  mode,
  boards,
  activeIdx,
  loading = false,
  onModeChange,
  onBoardChange,
}) => {
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const boardMenuRef = useRef<HTMLDivElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boardMenuOpen && !modeMenuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (boardMenuRef.current && !boardMenuRef.current.contains(event.target as Node)) {
        setBoardMenuOpen(false);
      }
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setModeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [boardMenuOpen, modeMenuOpen]);

  const hasBoards = boards.length > 0;
  const active = hasBoards ? boards[Math.max(0, Math.min(activeIdx, boards.length - 1))] : null;

  const tierStyle = active ? getRankTier(active.topPercent) : null;
  const dotColor = active?.weaponElement ? ELEMENT_COLOR[active.weaponElement] ?? '#A69662' : '#A69662';

  const showModeValue = mode === 'damage' ? active?.damage : active?.rv;
  const valueLabel = mode === 'damage' ? 'Computed Damage' : 'RV Total';

  return (
    <div
      className="relative grid items-center gap-3 border border-accent/45 px-3 py-2.5"
      style={{
        gridTemplateColumns: '64px minmax(0,1fr) auto',
        background: 'linear-gradient(180deg, rgba(166,150,98,0.10) 0%, rgba(255,255,255,0.02) 34%, rgba(0,0,0,0.30) 100%)',
      }}
    >
      {/* Tier letter cell */}
      <div
        className="relative grid h-16 w-16 place-items-center border border-accent font-plus-jakarta text-[44px] leading-none font-bold tracking-[-0.04em]"
        style={{
          color: tierStyle?.color ?? 'rgba(224,224,224,0.4)',
          textShadow: tierStyle?.glow ? `0 0 18px ${tierStyle.glow}` : undefined,
          background: 'radial-gradient(circle at 30% 25%, rgba(255,235,180,0.18), transparent 60%), linear-gradient(180deg, rgba(166,150,98,0.20), rgba(0,0,0,0.4))',
        }}
      >
        {loading ? <span className="text-accent/30">—</span> : tierStyle?.letter ?? '?'}
      </div>

      {/* Middle column: scope chips + rank line */}
      <div className="flex min-w-0 flex-col gap-1.5">
        {/* Scope chips with board picker */}
        <div className="relative" ref={boardMenuRef}>
          {hasBoards && active ? (
            <button
              type="button"
              onClick={() => boards.length > 1 && setBoardMenuOpen((prev) => !prev)}
              className={`flex min-w-0 flex-wrap items-center gap-1 ${boards.length > 1 ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
              aria-haspopup={boards.length > 1 ? 'listbox' : undefined}
              aria-expanded={boardMenuOpen}
            >
              <span
                className="inline-flex max-w-[140px] items-center gap-1 truncate border border-accent/45 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-accent-hover"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />
                <span className="truncate">{active.weaponName}</span>
              </span>
              <span className="border border-border bg-white/3 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-text-primary/65">
                S{active.sequence}
              </span>
              <span className="max-w-[110px] truncate border border-border bg-white/3 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-text-primary/65">
                {active.trackLabel}
              </span>
              {active.erBracket != null && active.erBracket > 0 && (
                <span className="border border-border bg-white/3 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-text-primary/65">
                  ER ≥ {active.erBracket}%
                </span>
              )}
              {boards.length > 1 && (
                <span className="font-gowun text-[9px] uppercase tracking-[0.18em] text-text-primary/40">
                  {boards.length} ▾
                </span>
              )}
            </button>
          ) : (
            <span className="font-ropa text-[10px] uppercase tracking-[0.08em] text-text-primary/40">
              {loading ? 'Loading boards…' : 'Not ranked'}
            </span>
          )}

          {boardMenuOpen && boards.length > 1 && (
            <div className="absolute left-0 top-full z-30 mt-1.5 w-72 border border-border bg-background-secondary shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              <div className="border-b border-border px-3 py-2 font-ropa text-[10px] uppercase tracking-[0.22em] text-text-primary/40">
                Boards this build qualifies for
              </div>
              <ul role="listbox" className="max-h-72 overflow-y-auto">
                {boards.map((board, idx) => {
                  const isActive = idx === activeIdx;
                  return (
                    <li key={`${board.weaponId}-${board.sequence}-${board.trackKey}-${board.erBracket ?? 0}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          onBoardChange(idx);
                          setBoardMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                          isActive ? 'bg-accent/10 text-accent-hover' : 'text-text-primary/80 hover:bg-white/4'
                        }`}
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-plus-jakarta text-[13px] font-medium">{board.weaponName}</span>
                          <span className="font-ropa text-[10px] uppercase tracking-[0.18em] text-text-primary/40">
                            S{board.sequence} · {board.trackLabel}
                            {board.erBracket != null && board.erBracket > 0 ? ` · ER ≥ ${board.erBracket}%` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 font-gowun text-[12px] tabular-nums text-text-primary/65">
                          #{formatNumber(board.rank)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* TOP % + #/total line */}
        <div className="flex min-w-0 items-baseline gap-2">
          {loading ? (
            <span className="font-gowun text-[20px] font-bold tabular-nums text-accent/30">— —</span>
          ) : active ? (
            <>
              <div className="font-gowun text-[20px] font-bold leading-none tabular-nums tracking-[-0.02em] text-accent">
                <span className="mr-1 font-ropa text-[9px] font-normal uppercase tracking-[0.2em] text-text-primary/40">
                  TOP
                </span>
                {formatPct(active.topPercent)}%
              </div>
              <div className="truncate font-gowun text-[12px] tabular-nums text-text-primary">
                #<strong className="font-bold">{formatNumber(active.rank)}</strong>
                <span className="text-text-primary/40"> / {formatNumber(active.total)}</span>
              </div>
            </>
          ) : (
            <span className="font-ropa text-[10px] text-text-primary/55">
              Submit to a board to see your rank.
            </span>
          )}
        </div>
      </div>

      {/* Right column: value + mode toggle */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="relative" ref={modeMenuRef}>
          <button
            type="button"
            onClick={() => setModeMenuOpen((prev) => !prev)}
            className="flex items-center gap-0.5 border border-border bg-black/30 px-1.5 py-0.5 font-ropa text-[9px] uppercase tracking-[0.16em] text-text-primary/65 transition-colors hover:border-accent/45 hover:text-accent-hover"
            aria-haspopup="listbox"
            aria-expanded={modeMenuOpen}
          >
            {mode === 'damage' ? 'DMG' : 'RV'}
            <span className="text-text-primary/40">▾</span>
          </button>
          {modeMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-44 border border-border bg-background-secondary shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              {(['damage', 'rv'] as RankMode[]).map((option) => {
                const isActive = option === mode;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onModeChange(option);
                      setModeMenuOpen(false);
                    }}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors ${
                      isActive ? 'bg-accent/10 text-accent-hover' : 'text-text-primary/80 hover:bg-white/4'
                    }`}
                  >
                    <span className="font-plus-jakarta text-[13px] font-medium">
                      {option === 'damage' ? 'By Damage' : 'By RV'}
                    </span>
                    <span className="font-ropa text-[10px] uppercase tracking-[0.18em] text-text-primary/40">
                      {option === 'damage' ? 'Per-board competitive rank' : 'Population-wide roll quality'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="font-gowun text-[22px] font-bold leading-none tabular-nums tracking-[-0.02em] text-text-primary">
            {loading || showModeValue == null ? (
              <span className="text-text-primary/30">— — —</span>
            ) : mode === 'damage' ? (
              formatNumber(showModeValue)
            ) : (
              `${showModeValue.toFixed(1)}%`
            )}
          </div>
          <div className="font-ropa text-[8.5px] uppercase tracking-[0.16em] text-text-primary/40">
            {valueLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { RankBoard } from '@/components/card/RankModule';
import { getRankTier } from '@/lib/calculations/rankTier';

/** Sentinel key meaning "don't show any ranking; use the default forte section instead." */
export const NO_RANKING_KEY = '__no_ranking__';

interface AdjustRankingButtonProps {
  availableBoards: RankBoard[];
  activeBoard: RankBoard | null;
  showOriginalForte: boolean;
  equippedWeaponId?: string;
  onSelect: (key: string) => void;
}

const formatNumber = (value: number): string => Math.round(value).toLocaleString();
const formatPct = (value: number): string => {
  if (value < 0.01) return '<0.01';
  if (value < 10) return value.toFixed(2);
  return value.toFixed(1);
};

interface PopoverProps {
  popoverRef: React.RefObject<HTMLDivElement | null>;
  anchorRect: DOMRect;
  boards: RankBoard[];
  activeKey: string | null;
  equippedWeaponId?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

const Popover: React.FC<PopoverProps> = ({
  popoverRef,
  anchorRect,
  boards,
  activeKey,
  equippedWeaponId,
  onSelect,
  onClose,
}) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, popoverRef]);

  const sorted = [...boards].sort((a, b) => a.topPercent - b.topPercent);
  const isOriginalActive = activeKey === NO_RANKING_KEY;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchorRect.bottom + 6,
    left: anchorRect.left,
    zIndex: 60,
    minWidth: Math.max(300, anchorRect.width),
    maxWidth: 380,
  };

  return createPortal(
    <div
      ref={popoverRef}
      role="listbox"
      style={style}
      className="font-plus-jakarta overflow-hidden rounded-lg bg-[linear-gradient(170deg,rgba(28,24,18,0.97)_0%,rgba(10,8,6,0.97)_100%)] shadow-[0_24px_48px_rgba(0,0,0,0.6)] backdrop-blur-md"
    >
      <div className="max-h-80 overflow-y-auto">
        {/* "Original forte" — opt out of the rank display, revert to default forte section */}
        <button
          role="option"
          aria-selected={isOriginalActive}
          onClick={() => { onSelect(NO_RANKING_KEY); onClose(); }}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
            isOriginalActive ? 'bg-amber-300/10' : 'hover:bg-white/4'
          }`}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-primary/40">
            ⌀
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-xs text-text-primary/90">Original forte</span>
            <span className="font-ropa text-[9px] uppercase tracking-[0.18em] text-text-primary/45">
              Hide ranking
            </span>
          </div>
          {isOriginalActive && <Check size={12} className="shrink-0 text-amber-300" />}
        </button>

        {sorted.length > 0 && <div className="h-px bg-white/6" />}

        {sorted.map((b) => {
          const isActive = b.key === activeKey;
          const isEquipped = equippedWeaponId === b.weaponId;
          const tier = getRankTier(b.topPercent);
          return (
            <button
              key={b.key}
              role="option"
              aria-selected={isActive}
              onClick={() => { onSelect(b.key); onClose(); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                isActive ? 'bg-amber-300/10' : 'hover:bg-white/4'
              }`}
            >
              {b.weaponIcon && (
                <div
                  className="h-6 w-6 shrink-0 rounded bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${b.weaponIcon}")` }}
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs text-text-primary/90">{b.weaponName}</span>
                  {isEquipped && (
                    <span className="rounded-full bg-accent/20 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-accent">
                      Equipped
                    </span>
                  )}
                </div>
                <span className="font-ropa text-[9px] uppercase tracking-[0.18em] text-text-primary/45">
                  {b.trackLabel || b.trackKey}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className="font-gowun text-xs tabular-nums leading-none"
                  style={{ color: tier.color, textShadow: tier.glow ? `0 0 8px ${tier.glow}` : undefined }}
                >
                  TOP {formatPct(b.topPercent)}%
                </span>
                <span className="font-gowun text-[10px] tabular-nums text-text-primary/45">
                  #{formatNumber(b.rank)} / {formatNumber(b.total)}
                </span>
              </div>
              {isActive && <Check size={12} className="shrink-0 text-amber-300" />}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

export const AdjustRankingButton: React.FC<AdjustRankingButtonProps> = ({
  availableBoards,
  activeBoard,
  showOriginalForte,
  equippedWeaponId,
  onSelect,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    setAnchorRect(buttonRef.current.getBoundingClientRect());
  }, [isOpen]);

  // Keep the popover anchored to the button as the page scrolls or resizes.
  // Ignore scroll events that originate inside the popover so its own scrollable
  // content can be used without the popover closing or jumping.
  useEffect(() => {
    if (!isOpen) return;
    const reposition = (event?: Event) => {
      if (event && popoverRef.current?.contains(event.target as Node)) return;
      if (buttonRef.current) {
        setAnchorRect(buttonRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen]);

  // Disabled only when there's truly nothing to pick — no boards AND no
  // "original forte" toggle would be meaningful.
  const hasBoards = availableBoards.length > 0;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={!hasBoards && !showOriginalForte && !activeBoard}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex cursor-pointer items-center gap-2 rounded-lg bg-background-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {showOriginalForte ? (
          <span className="text-text-primary/80">Original forte</span>
        ) : activeBoard ? (
          <>
            {activeBoard.weaponIcon && (
              <div
                role="img"
                aria-label={activeBoard.weaponName}
                className="h-5 w-5 shrink-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${activeBoard.weaponIcon}")` }}
              />
            )}
            <span>{activeBoard.weaponName}</span>
            <span className="text-text-primary/30">·</span>
            <span className="font-gowun text-[13px] tabular-nums text-accent">
              TOP {formatPct(activeBoard.topPercent)}%
            </span>
            <span className="font-ropa text-[10px] uppercase tracking-[0.18em] text-text-primary/65">
              {activeBoard.trackLabel || activeBoard.trackKey}
            </span>
          </>
        ) : (
          <span className="text-text-primary/55">Not ranked</span>
        )}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && anchorRect && (
        <Popover
          popoverRef={popoverRef}
          anchorRect={anchorRect}
          boards={availableBoards}
          activeKey={showOriginalForte ? NO_RANKING_KEY : (activeBoard?.key ?? null)}
          equippedWeaponId={equippedWeaponId}
          onSelect={onSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

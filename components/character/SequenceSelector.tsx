'use client';

import React, { useMemo } from 'react';

// Arc geometry: 6 orbs sweep clockwise from 0° (top) to 210° (bottom-left)

const NODES = [1, 2, 3, 4, 5, 6] as const;
const ARC_START = 0;
const ARC_END = 210;
const DESKTOP_ARC_RADIUS = 104;
const DESKTOP_SIZE = 252;
const DESKTOP_ORB = 34;
const MOBILE_ARC_RADIUS = 80;
const MOBILE_SIZE = 196;
const MOBILE_ORB = 28;

// Active orb: golden conic gradient (matches slider thumb aesthetic)
const ACTIVE_BG: React.CSSProperties = {
  background: 'conic-gradient(from 45deg, #bfad7d, #8a7c52 90deg, #bfad7d 180deg, #8a7c52 270deg, #bfad7d 360deg)',
};

interface SequenceSelectorProps {
  sequenceIconUrl?: string;
  current: number;
  onChange: (seq: number) => void;
  compact?: boolean;
  className?: string;
}

export const SequenceSelector: React.FC<SequenceSelectorProps> = ({
  sequenceIconUrl, current, onChange, compact = false, className = '',
}) => {
  const size = compact ? MOBILE_SIZE : DESKTOP_SIZE;
  const orb = compact ? MOBILE_ORB : DESKTOP_ORB;
  const arcRadius = compact ? MOBILE_ARC_RADIUS : DESKTOP_ARC_RADIUS;
  const mid = size / 2;
  const orbPositions = useMemo(() => NODES.map((_, i) => {
    const deg = ARC_START + ((ARC_END - ARC_START) * i) / (NODES.length - 1);
    const rad = (deg * Math.PI) / 180;
    return {
      left: mid + arcRadius * Math.sin(rad) - orb / 2,
      top: mid - arcRadius * Math.cos(rad) - orb / 2,
    };
  }), [arcRadius, mid, orb]);

  const handleClick = (n: number) => {
    onChange(n <= current ? n - 1 : n);
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Center waveband icon */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        {sequenceIconUrl ? (
          <img
            src={sequenceIconUrl}
            alt="Sequence"
            className={`${compact ? 'h-28' : 'h-36'} object-contain drop-shadow-[0_0_12px_rgba(166,150,98,0.3)]`}
          />
        ) : null}
      </div>

      {/* Orbs in arc */}
      {NODES.map((n, i) => {
        const active = n <= current;
        return (
          <button
            key={n}
            onClick={() => handleClick(n)}
            className={`absolute flex items-center justify-center rounded-full text-sm font-bold transition-all duration-200
              ${active
                ? 'border-2 border-[#d4c48c] text-background'
                : 'border-2 border-[#333] bg-[#1e1e1e] text-[rgba(224,224,224,0.35)] hover:border-[rgba(166,150,98,0.45)] hover:bg-[rgba(166,150,98,0.1)] hover:text-[rgba(224,224,224,0.6)]'
              }
            `}
            style={{
              left: orbPositions[i].left,
              top: orbPositions[i].top,
              width: orb,
              height: orb,
              ...(active ? {
                ...ACTIVE_BG,
                boxShadow: 'inset 0 0 2px rgba(0,0,0,0.3), 0 0 10px rgba(166,150,98,0.45)',
              } : undefined),
            }}
            aria-label={`Sequence ${n}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
};

'use client';

import React from 'react';
import { AssetImage } from '@/components/ui/AssetImage';
import { PATHS } from '@/lib/paths';

// Arc geometry: 6 orbs sweep clockwise from 0° (top) to 210° (bottom-left)

const NODES = [1, 2, 3, 4, 5, 6] as const;
const ARC_START = 0;
const ARC_END = 210;
const ARC_RADIUS = 115;
const SIZE = 280;
const ORB = 36;
const MID = SIZE / 2;

const ORB_POS = NODES.map((_, i) => {
  const deg = ARC_START + ((ARC_END - ARC_START) * i) / (NODES.length - 1);
  const rad = (deg * Math.PI) / 180;
  return {
    left: MID + ARC_RADIUS * Math.sin(rad) - ORB / 2,
    top: MID - ARC_RADIUS * Math.cos(rad) - ORB / 2,
  };
});

// Active orb: golden conic gradient (matches slider thumb aesthetic)
const ACTIVE_BG: React.CSSProperties = {
  background: 'conic-gradient(from 45deg, #bfad7d, #8a7c52 90deg, #bfad7d 180deg, #8a7c52 270deg, #bfad7d 360deg)',
};

interface SequenceSelectorProps {
  cdnId: number;
  characterName: string;
  current: number;
  onChange: (seq: number) => void;
  className?: string;
}

export const SequenceSelector: React.FC<SequenceSelectorProps> = ({
  cdnId, characterName, current, onChange, className = '',
}) => {
  // CDN waveband: T_IconDevice_{cdnId}_UI.png
  const wavebandPaths = {
    cdn: `${PATHS.cdn.base}/${PATHS.cdn.wavebands}/T_IconDevice_${cdnId}_UI.png`,
    local: `${PATHS.local.base}/${PATHS.local.wavebands}/${characterName}.png`,
  };

  const handleClick = (n: number) => {
    onChange(n <= current ? n - 1 : n);
  };

  return (
    <div className={`relative ${className}`} style={{ width: SIZE, height: SIZE }}>
      {/* Center waveband icon */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <AssetImage
          paths={wavebandPaths}
          alt="Waveband"
          className="h-40 w-auto object-contain drop-shadow-[0_0_12px_rgba(166,150,98,0.3)]"
        />
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
              left: ORB_POS[i].left,
              top: ORB_POS[i].top,
              width: ORB,
              height: ORB,
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

export default SequenceSelector;

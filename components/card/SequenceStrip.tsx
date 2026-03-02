'use client';

import React from 'react';
import { CDNChainEntry } from '@/lib/character';

const ELEMENT_COLOR: Record<string, string> = {
  Aero:    '#55FFB5',
  Havoc:   '#E649A6',
  Spectro: '#F8E56C',
  Glacio:  '#41AEFB',
  Electro: '#B46BFF',
  Fusion:  '#F0744E',
};

interface SequenceStripProps {
  chains: CDNChainEntry[];
  sequence: number;
  element: string;
  totalCV?: number;
}

export const SequenceStrip: React.FC<SequenceStripProps> = ({
  chains, sequence, element, totalCV,
}) => {
  const color = ELEMENT_COLOR[element] ?? '#ffffff';

  return (
    <div className="flex w-1/12 pt-12 flex-col items-center self-start gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const chain = chains[i];
        const active = i < sequence;
        
        return (
          <div
            key={i}
            className={`relative flex aspect-square w-1/2 items-center justify-center rounded-full border transition-all duration-300 ${
              active ? 'opacity-100' : 'opacity-40 grayscale'
            }`}
            style={{
              borderColor: active ? `${color}90` : 'rgba(255,255,255,0.15)',
              backgroundColor: active ? `${color}15` : 'rgba(0,0,0,0.4)',
              boxShadow: active
                ? `0 0 10px ${color}30, inset 0 0 8px ${color}15`
                : 'none',
            }}
          >
            {chain?.icon && (
              <img
                src={chain.icon}
                alt={`Sequence ${i + 1}`}
                className={"h-2/3 w-2/3 object-contain transition-all duration-300"}
              />
            )}
          </div>
        );
      })}
      {typeof totalCV === 'number' && (
        <div className="mt-2 rounded-md border border-white/25 bg-black/55 px-2 py-1 text-sm">
          {totalCV.toFixed(1)} CV
        </div>
      )}
    </div>
  );
};

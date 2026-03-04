'use client';

import React from 'react';
import { CDNChainEntry } from '@/lib/character';
import { ELEMENT_COLOR } from '@/lib/elementVisuals';

interface SequenceStripProps {
  chains: CDNChainEntry[];
  sequence: number;
  element: string;
}

export const SequenceStrip: React.FC<SequenceStripProps> = ({
  chains, sequence, element,
}) => {
  const color = ELEMENT_COLOR[element] ?? '#ffffff';

  return (
    <div className="flex pt-4 h-full w-11.5 shrink-0 flex-col items-center gap-2 mx-3">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const chain = chains[i];
        const active = i < sequence;
        
        return (
          <div
            key={i}
            className={`relative flex w-full aspect-square items-center justify-center rounded-full border transition-all duration-300 ${
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
    </div>
  );
};

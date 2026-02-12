'use client';

import React, { useCallback } from 'react';
import { AssetImage } from '@/components/ui';
import { getWavebandPaths } from '@/lib/paths';

interface SequenceSelectorProps {
  characterName: string;
  sequence: number;
  onSequenceChange: (sequence: number) => void;
  className?: string;
}

export const SequenceSelector: React.FC<SequenceSelectorProps> = ({
  characterName,
  sequence,
  onSequenceChange,
  className = ''
}) => {
  // Handle sequence click - clicking on active sequence deselects it
  const handleSequenceClick = useCallback((clickedSequence: number) => {
    const newSequence = clickedSequence === sequence
      ? clickedSequence - 1
      : clickedSequence;
    onSequenceChange(Math.max(0, newSequence));
  }, [sequence, onSequenceChange]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-sm font-medium text-text-primary/80">Sequence</span>

      <div className="relative flex items-center gap-2 rounded-lg border border-border bg-background-secondary p-3">
        {/* Waveband Image */}
        <div className="relative h-12 w-12 shrink-0">
          <AssetImage
            paths={getWavebandPaths(characterName)}
            alt={`${characterName} Waveband`}
            className="h-full w-full object-contain opacity-80"
          />
        </div>

        {/* Sequence Buttons */}
        <div className="flex flex-1 items-center justify-between gap-1">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button
              key={num}
              onClick={() => handleSequenceClick(num)}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${num <= sequence
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-border bg-transparent text-text-primary/40 hover:border-text-primary/40 hover:text-text-primary/60'
                }`}
              aria-label={`Sequence ${num}`}
              aria-pressed={num <= sequence}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Sequence Label */}
      <div className="text-center text-xs text-text-primary/60">
        S{sequence} - {getSequenceDescription(sequence)}
      </div>
    </div>
  );
};

// Helper function to get sequence description
function getSequenceDescription(sequence: number): string {
  switch (sequence) {
    case 0: return 'No Sequences';
    case 1: return '1 Sequence';
    case 2: return '2 Sequences';
    case 3: return '3 Sequences';
    case 4: return '4 Sequences';
    case 5: return '5 Sequences';
    case 6: return 'Full Sequences';
    default: return '';
  }
}

export default SequenceSelector;

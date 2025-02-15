'use client';

import React from 'react';
import Image from 'next/image';
import '@/styles/SequenceGroup.css';

interface SequenceGroupProps {
  characterName: string;
  onSequenceChange: (sequence: number) => void;
  sequence: number;
  ocrSequence?: number;
}

export const SequenceGroup: React.FC<SequenceGroupProps> = ({ 
  characterName,
  onSequenceChange,
  sequence 
}) => {
  const handleSequenceClick = (clickedSequence: number) => {
    const newSequence = clickedSequence === sequence 
      ? clickedSequence - 1 
      : clickedSequence;
    
    onSequenceChange(newSequence);
  };

  return (
    <div className="sequence-group">
      <Image 
        id="sequenceImage"
        src={`/images/Wavebands/${characterName}.png`}
        alt=""
        width={256}
        height={256}
      />
      <div className="sequence-label">Sequence</div>
      {[1, 2, 3, 4, 5, 6].map((num) => (
        <div
          key={num}
          className={`sequence-option ${num <= sequence ? 'active' : ''}`}
          data-sequence={num}
          onClick={() => handleSequenceClick(num)}
        >
          {num}
        </div>
      ))}
    </div>
  );
};
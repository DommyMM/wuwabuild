import React from 'react';
import { Character, isRover } from '../../types/character';

interface SequenceSectionProps {
  character: Character;
  isSpectro: boolean;
  currentSequence: number;
}

export const SequenceSection: React.FC<SequenceSectionProps> = ({
  character,
  isSpectro,
  currentSequence
}) => {
  const displayName = isRover(character)
    ? `Rover${isSpectro ? 'Spectro' : 'Havoc'}`
    : character.name;

  const elementValue = isRover(character)
    ? (isSpectro ? "Spectro" : "Havoc")
    : character.element;

  const elementClass = `element-${elementValue.toLowerCase()}`;

  return (
    <div className="build-sequence-container">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div 
          key={i}
          className={`build-sequence-node ${elementClass} ${i <= currentSequence ? 'active' : 'inactive'}`}
          data-sequence={i}
        >
          <img
            src={`images/Sequences/T_IconDevice_${displayName}M${i}_UI.png`}
            className="sequence-icon"
            alt={`Sequence ${i}`}
          />
        </div>
      ))}
    </div>
  );
};
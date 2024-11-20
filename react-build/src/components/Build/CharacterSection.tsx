import React from 'react';
import { Character, getCharacterIconPath, isRover } from '../../types/character';
import { SequenceSection } from './SequenceSection';

interface CharacterSectionProps {
  character: Character;
  level: string;
  isSpectro: boolean;
  currentSequence: number;
  children?: React.ReactNode;
}

export const CharacterSection: React.FC<CharacterSectionProps> = ({ 
  character,
  level = '1',
  isSpectro = false,
  currentSequence,
  children
}) => {
  const displayName = isRover(character) ? 'Rover' : character.name;
  const elementValue = isRover(character) 
    ? (isSpectro ? "Spectro" : "Havoc")
    : character.element;

  return (
    <>
      <div className="build-character-section">
        <img 
          src={getCharacterIconPath(character)}
          className="build-character-icon"
          alt={character.name}
        />
        <SequenceSection
          character={character}
          isSpectro={isSpectro}
          currentSequence={currentSequence}
        />
      </div>

      <div className="build-intro">
        <div className="build-character-name">{displayName}</div>
        <div className="build-character-level">Lv.{level}/90</div>
        <img 
          src={`images/Roles/${character.Role}.png`}
          className="role-icon"
          alt={character.Role}
        />
        <img
          src={`images/Elements/${elementValue}.png`}
          className="element-icon" 
          alt={elementValue}
        />
        {children}
      </div>
    </>
  );
};
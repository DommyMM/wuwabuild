import React, { useState, useEffect, useRef } from 'react';
import { Character } from '../types/character';
import { Weapon, WeaponState } from '../types/weapon';
import { LevelSlider } from './LevelSlider';
import { SequenceGroup } from './SequenceGroup';
import { WeaponSelection } from './WeaponSelection';
import { ForteGroup, ForteGroupRef } from './ForteGroup';
import '../styles/CharacterInfo.css';
import '../styles/SequenceGroup.css';

interface CharacterInfoProps {
  selectedCharacter: Character | null;
  onEchoesClick: () => void;
  onGenerateClick?: (level: number) => void;
  onSpectroToggle?: (value: boolean) => void;
  onSequenceChange?: (sequence: number) => void;
  onWeaponSelect: (weapon: Weapon | null) => void;
  onWeaponConfigChange: (level: number, rank: number) => void;
  weaponState: WeaponState;
}

export const CharacterInfo: React.FC<CharacterInfoProps> = ({ 
  selectedCharacter, 
  onEchoesClick,
  onGenerateClick,
  onSpectroToggle,
  onSequenceChange,
  onWeaponSelect,
  onWeaponConfigChange,
  weaponState
}) => {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState(0);
  const [isSpectro, setIsSpectro] = useState(false);
  const forteRef = useRef<ForteGroupRef>(null);

  useEffect(() => {
    if (selectedCharacter) {
      setLevel(1);
      setSequence(0);
      setIsSpectro(false);
      forteRef.current?.reset();
    }
  }, [selectedCharacter]);

  const handleLevelChange = (newLevel: number): void => {
    setLevel(newLevel);
    if (onGenerateClick) {
      onGenerateClick(newLevel);
    }
  };

  const handleSequenceChange = (newSequence: number): void => {
    setSequence(newSequence);
    if (onSequenceChange) {
      onSequenceChange(newSequence);
    }
  };

  const handleWeaponSelect = (weapon: Weapon): void => {
    onWeaponSelect(weapon);
  };

  const handleToggleSpectro = (): void => {
    setIsSpectro(prev => !prev);
    if (onSpectroToggle) {
      onSpectroToggle(!isSpectro);
    }
  };

  const handleWeaponConfigChange = (level: number, rank: number) => {
    onWeaponConfigChange(level, rank);
  };

  const displayName = selectedCharacter?.name.startsWith('Rover')
    ? `Rover${isSpectro ? 'Spectro' : 'Havoc'}`
    : selectedCharacter?.name;

  return (
    <div className="character-info">
      {!selectedCharacter ? (
        <div className="no-character-message">Select a resonator first</div>
      ) : (
        <div className="character-content" style={{ display: 'flex' }}>
          <img 
            id="selectedCharacterIcon" 
            src={`images/Icons/${selectedCharacter.name}.png`}
            alt="Selected Character Icon" 
            className="character-tab-icon"
          />
          {selectedCharacter.name.startsWith('Rover') && (
            <button 
              className="toggle" 
              role="switch"
              aria-checked={isSpectro}
              tabIndex={0}
              onClick={handleToggleSpectro}
            >
              <div className="toggle-circle">
                <img
                  src={`images/Elements/${isSpectro ? 'Spectro' : 'Havoc'}.png`}
                  alt={isSpectro ? 'Spectro' : 'Havoc'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '999px'
                  }}
                />
              </div>
            </button>
          )}
          <LevelSlider 
            value={level}
            onLevelChange={handleLevelChange}
          />
          <SequenceGroup
            characterName={displayName || ''}
            isSpectro={isSpectro}
            onSequenceChange={handleSequenceChange}
            sequence={sequence}
          />
          <WeaponSelection
            selectedCharacter={selectedCharacter}
            selectedWeapon={weaponState.selectedWeapon}
            onWeaponSelect={handleWeaponSelect}
            weaponConfig={weaponState.config}
            onWeaponConfigChange={handleWeaponConfigChange}
          />
          <button 
            id="goNext" 
            className="build-button"
            onClick={onEchoesClick}
          >
            Echoes
          </button>
          <ForteGroup 
            selectedCharacter={{
              ...selectedCharacter,
              name: displayName || selectedCharacter.name
            }}
            isSpectro={isSpectro}
            ref={forteRef}
          />
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Character } from '../types/character';
import { Weapon, WeaponState } from '../types/weapon';
import { LevelSlider } from './LevelSlider';
import { SequenceGroup } from './SequenceGroup';
import { WeaponSelection } from './WeaponSelection';
import { ForteGroup } from './ForteGroup';
import '../styles/CharacterInfo.css';
import '../styles/SequenceGroup.css';

interface CharacterInfoProps {
  selectedCharacter: Character | null;
  displayName: string | undefined;
  isSpectro: boolean;
  elementValue: string | undefined;
  onEchoesClick: () => void;
  onGenerateClick?: (level: number) => void;
  onSpectroToggle?: (value: boolean) => void;
  onSequenceChange?: (sequence: number) => void;
  onWeaponSelect: (weapon: Weapon | null) => void;
  onWeaponConfigChange: (level: number, rank: number) => void;
  weaponState: WeaponState;
  nodeStates: Record<string, Record<string, boolean>>;
  forteLevels: Record<string, number>;
  onMaxClick: () => void;
  onForteChange: (
    nodeStates: Record<string, Record<string, boolean>>,
    levels: Record<string, number>
  ) => void;
  clickCount: number;
}

export const CharacterInfo: React.FC<CharacterInfoProps> = ({ 
  selectedCharacter, 
  displayName,
  isSpectro,
  elementValue,
  onEchoesClick,
  onGenerateClick,
  onSpectroToggle,
  onSequenceChange,
  onWeaponSelect,
  onWeaponConfigChange,
  weaponState,
  nodeStates,
  forteLevels,
  clickCount,
  onMaxClick,
  onForteChange
}) => {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    if (selectedCharacter) {
      setLevel(1);
      setSequence(0);
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
    if (onSpectroToggle) {
      onSpectroToggle(!isSpectro);
    }
  };

  const handleWeaponConfigChange = (level: number, rank: number) => {
    onWeaponConfigChange(level, rank);
  };

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
                  src={`images/Elements/${elementValue}.png`}
                  alt={elementValue}
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
            elementValue={elementValue}
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
            displayName={displayName}
            elementValue={elementValue}
            nodeStates={nodeStates}
            levels={forteLevels}
            clickCount={clickCount}
            onMaxClick={onMaxClick}
            onChange={onForteChange}
          />
        </div>
      )}
    </div>
  );
};
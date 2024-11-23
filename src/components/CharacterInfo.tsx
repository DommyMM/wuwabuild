import React, { useState, useEffect } from 'react';
import { Character } from '../types/character';
import { Weapon, WeaponState } from '../types/weapon';
import { LevelSlider } from './LevelSlider';
import { SequenceGroup } from './SequenceGroup';
import { WeaponSelection } from './WeaponSelection';
import { ForteGroup } from './ForteGroup';
import '../styles/CharacterInfo.css';
import '../styles/SequenceGroup.css';

type OCRData = 
  | {
      type: 'Character';
      name: string;
      level: number;
    }
  | {
      type: 'Weapon';
      name: string;
      level: number;
      weaponType: string;
      rank: number;
    }
  | {
      type: 'Sequences';
      sequence: number;
    }
  | {
      type: 'Forte';
      nodeStates: Record<string, Record<string, boolean>>;
      levels: Record<string, number>;
    };

interface CharacterInfoProps {
  selectedCharacter: Character | null;
  displayName: string | undefined;
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
  initialLevel?: number; 
  ocrData?: OCRData;
}

export const CharacterInfo: React.FC<CharacterInfoProps> = ({ 
  selectedCharacter, 
  displayName,
  elementValue,
  initialLevel,
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
  onForteChange,
  ocrData
}) => {
  const [level, setLevel] = useState(initialLevel || 1);
  const [sequence, setSequence] = useState(0);

  useEffect(() => {
    if (selectedCharacter) {
      if (!ocrData) {
        setLevel(initialLevel || 1);
        setSequence(0);
      }
    }
  }, [selectedCharacter, initialLevel, ocrData]);

  useEffect(() => {
    if (ocrData?.type === 'Character') {
      setLevel(ocrData.level);
    } else if (ocrData?.type === 'Sequences') {
      setSequence(ocrData.sequence);
      if (onSequenceChange) {
        onSequenceChange(ocrData.sequence);
      }
    }
  }, [ocrData, onSequenceChange]);

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
      onSpectroToggle(elementValue !== "Spectro");
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
              aria-checked={elementValue === "Spectro"}
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
            initialLevel={initialLevel}
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
            ocrData={ocrData?.type === 'Weapon' ? ocrData : undefined}
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
            ocrData={ocrData?.type === 'Forte' ? {
              type: 'Forte',
              nodeStates: ocrData.nodeStates,
              levels: ocrData.levels
            } : undefined}
          />
        </div>
      )}
    </div>
  );
};
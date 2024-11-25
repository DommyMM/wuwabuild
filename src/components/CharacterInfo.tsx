import React, { useState } from 'react';
import { Character } from '../types/character';
import { Weapon, WeaponState } from '../types/weapon';
import { OCRAnalysis } from '../types/ocr';
import { LevelSlider } from './LevelSlider';
import { SequenceGroup } from './SequenceGroup';
import { WeaponSelection } from './WeaponSelection';
import { ForteGroup } from './ForteGroup';
import '../styles/CharacterInfo.css';
import '../styles/SequenceGroup.css';

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
  ocrData?: OCRAnalysis;
  characterLevel: string;
  onLevelChange?: (level: number) => void;
}

export const CharacterInfo: React.FC<CharacterInfoProps> = ({ 
  selectedCharacter, 
  displayName,
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
  onForteChange,
  ocrData,
  characterLevel,
  onLevelChange
}) => {
  const [sequence, setSequence] = useState(0);

  const handleLevelChange = (newLevel: number): void => {
    onLevelChange?.(newLevel);
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
            value={parseInt(characterLevel)}
            onLevelChange={handleLevelChange}
            ocrLevel={ocrData?.type === 'Character' ? 
              ocrData.characterLevel.toString() : undefined}
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
            ocrData={ocrData?.type === 'Weapon' ? {
              type: 'Weapon' as const,
              name: ocrData.name,
              weaponType: ocrData.weaponType,
              level: ocrData.weaponLevel,
              rank: ocrData.rank
            } : undefined}
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
              nodeStates: {
                tree1: { top: ocrData.normal[1] === 1, middle: ocrData.normal[2] === 1 },
                tree2: { top: ocrData.skill[1] === 1, middle: ocrData.skill[2] === 1 },
                tree3: { top: ocrData.circuit[1] === 1, middle: ocrData.circuit[2] === 1 },
                tree4: { top: ocrData.liberation[1] === 1, middle: ocrData.liberation[2] === 1 },
                tree5: { top: ocrData.intro[1] === 1, middle: ocrData.intro[2] === 1 }
              },
              levels: {
                'normal-attack': ocrData.normal[0],
                'skill': ocrData.skill[0],
                'circuit': ocrData.circuit[0],
                'liberation': ocrData.liberation[0],
                'intro': ocrData.intro[0]
              }
            } : undefined}
          />
        </div>
      )}
    </div>
  );
};
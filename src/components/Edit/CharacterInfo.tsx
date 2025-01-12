import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Character } from '../../types/character';
import { Weapon, WeaponState } from '../../types/weapon';
import { OCRAnalysis } from '../../types/ocr';
import { LevelSlider } from './LevelSlider';
import { SequenceGroup } from './SequenceGroup';
import { WeaponSelection } from './WeaponSelection';
import { ForteGroup } from './ForteGroup';
import '../../styles/CharacterInfo.css';
import '../../styles/SequenceGroup.css';

interface CharacterInfoProps {
  selectedCharacter: Character | null;
  displayName: string | undefined;
  elementValue: string | undefined;
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
  currentSequence: number;
  preloadedWeapons?: Weapon[];
  onWeaponDataReady?: (ready: boolean) => void;
  isMinimized: boolean;
  onMinimize: () => void;
}

export const CharacterInfo: React.FC<CharacterInfoProps> = ({ 
  selectedCharacter, 
  displayName,
  elementValue,
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
  onLevelChange,
  currentSequence,
  preloadedWeapons,
  onWeaponDataReady,
  isMinimized,
  onMinimize
}) => {

  const handleLevelChange = (newLevel: number): void => {
    onLevelChange?.(newLevel);
  };

  const handleSequenceChange = (newSequence: number): void => {
    onSequenceChange?.(newSequence);
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
    <div className="character-section">
      <div className="character-info">
        <button 
          onClick={selectedCharacter ? onMinimize : undefined} 
          className={`character-header${selectedCharacter ? ' with-chevron' : ''}`}
        >
          {selectedCharacter ? (
            <>
              {selectedCharacter.name} Info
              {isMinimized ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            </>
          ) : (
            'Select a resonator first'
          )}
        </button>
        <div className={`character-content${isMinimized ? '' : ' open'}`}>
          {selectedCharacter && (
            <>
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
                sequence={currentSequence}
                ocrSequence={ocrData?.type === 'Sequences' ? 
                  ocrData.sequence : undefined}
              />
              <WeaponSelection
                selectedCharacter={selectedCharacter}
                selectedWeapon={weaponState.selectedWeapon}
                onWeaponSelect={handleWeaponSelect}
                weaponConfig={weaponState.config}
                onWeaponConfigChange={handleWeaponConfigChange}
                ocrData={ocrData?.type === 'Weapon' ? ocrData : undefined}
                preloadedWeapons={preloadedWeapons}
              />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
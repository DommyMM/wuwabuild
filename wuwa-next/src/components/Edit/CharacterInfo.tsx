'use client';

import { ChevronRight, ChevronDown } from 'lucide-react';
import { Character } from '@/types/character';
import { Weapon, WeaponState } from '@/types/weapon';
import { OCRAnalysis } from '@/types/ocr';
import { LevelSlider } from './LevelSlider';
import { SequenceGroup } from './SequenceGroup';
import { WeaponSelection } from './WeaponSelection';
import { ForteGroup } from './ForteGroup';
import { getAssetPath } from '@/types/paths';
import '@/styles/CharacterInfo.css';
import '@/styles/SequenceGroup.css';

interface CharacterInfoProps {
  characterId: string | null;
  selectedCharacter: Character | null;
  characterLevel: string;
  element?: string;
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
  onLevelChange?: (level: number) => void;
  currentSequence: number;
  isMinimized: boolean;
  onMinimize: () => void;
}

export const CharacterInfo: React.FC<CharacterInfoProps> = ({ 
  characterId,
  selectedCharacter,
  characterLevel,
  element,
  ...props
}) => {
  
  if (!selectedCharacter) {
    return <div className="character-section">
      <div className="character-info">
        <button className="character-header">Select a resonator first</button>
      </div>
    </div>;
  }
  
  const displayName = selectedCharacter.name.startsWith('Rover') ? 
    `Rover${element || "Havoc"}` : 
    selectedCharacter.name;

  const elementValue = selectedCharacter.name.startsWith('Rover') ? 
    element || "Havoc" : 
    selectedCharacter.element;

  const handleLevelChange = (newLevel: number): void => {
    props.onLevelChange?.(newLevel);
  };

  const handleSequenceChange = (newSequence: number): void => {
    props.onSequenceChange?.(newSequence);
  };

  const handleWeaponSelect = (weapon: Weapon | null): void => {
    props.onWeaponSelect(weapon?.id ? weapon : null);
  };

  const handleToggleSpectro = (): void => {
    if (props.onSpectroToggle) {
      props.onSpectroToggle(element !== "Spectro");
    }
  };

  const handleWeaponConfigChange = (level: number, rank: number) => {
    props.onWeaponConfigChange(level, rank);
  };

  return (
    <div className="character-section">
      <div className="character-info">
        <button 
          onClick={selectedCharacter ? props.onMinimize : undefined} 
          className={`character-header${selectedCharacter ? ' with-chevron' : ''}`}
        >
          {selectedCharacter ? (
            <>
              {selectedCharacter.name} Info
              {props.isMinimized ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            </>
          ) : (
            'Select a resonator first'
          )}
        </button>
        <div className={`character-content${props.isMinimized ? '' : ' open'}`}>
          {selectedCharacter && (
            <>
              <img id="selectedCharacterIcon" 
                src={getAssetPath('icons', selectedCharacter).cdn}
                alt="Selected Character Icon" 
                className="character-tab-icon"
              />
              {selectedCharacter.name.startsWith('Rover') && (
                <button className="toggle" 
                  role="switch"
                  aria-checked={element === "Spectro"}
                  tabIndex={0}
                  onClick={handleToggleSpectro}
                >
                  <div className="toggle-circle">
                    <img src={getAssetPath('elements', element || '').cdn}
                        alt={element}
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
              <LevelSlider value={parseInt(characterLevel)}
                onLevelChange={handleLevelChange}
                ocrLevel={props.ocrData?.type === 'Character' ? 
                  props.ocrData.characterLevel.toString() : undefined}
              />
              <SequenceGroup characterName={displayName}
                onSequenceChange={handleSequenceChange}
                sequence={props.currentSequence}
                ocrSequence={props.ocrData?.type === 'Sequences' ? 
                  props.ocrData.sequence : undefined}
              />
              <WeaponSelection selectedCharacter={selectedCharacter}
                weaponState={props.weaponState}
                onWeaponSelect={handleWeaponSelect}
                onWeaponConfigChange={handleWeaponConfigChange}
                ocrData={props.ocrData?.type === 'Weapon' ? props.ocrData : undefined}
              />
              <ForteGroup selectedCharacter={{
                  ...selectedCharacter,
                  name: displayName
                }}
                displayName={displayName}
                elementValue={elementValue}
                nodeStates={props.nodeStates}
                levels={props.forteLevels}
                clickCount={props.clickCount}
                onMaxClick={props.onMaxClick}
                onChange={props.onForteChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
'use client';

import { ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react';
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
import { useState } from 'react';

interface CharacterInfoProps {
  selectedCharacter: Character | null;
  characterLevel: string;
  element?: string;
  onGenerateClick?: (level: number) => void;
  onElementChange?: (element: string) => void;
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
  selectedCharacter,
  characterLevel,
  element,
  ...props
}) => {
  const [showElementModal, setShowElementModal] = useState(false);
  
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

  const handleWeaponConfigChange = (level: number, rank: number) => {
    props.onWeaponConfigChange(level, rank);
  };

  const roverElements = ["Havoc", "Spectro", "Aero"];

  const handleElementCycle = (direction: 'next' | 'prev'): void => {
    if (props.onElementChange) {
      const currentIndex = roverElements.indexOf(element || "Havoc");
      let newIndex;
      
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % roverElements.length;
      } else {
        newIndex = (currentIndex - 1 + roverElements.length) % roverElements.length;
      }
      
      props.onElementChange(roverElements[newIndex]);
    }
  };

  const handleElementSelect = (selectedElement: string): void => {
    if (props.onElementChange) {
      props.onElementChange(selectedElement);
      setShowElementModal(false);
    }
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
              <img id="selectedCharacterIcon" src={getAssetPath('icons', selectedCharacter).cdn}
                alt="Selected Character Icon" 
                className="character-tab-icon"
              />
              {selectedCharacter.name.startsWith('Rover') && (
                <>
                  <div className="element-carousel" data-element={element || 'Havoc'}>
                    <div className="element-button">
                      <div className="element-arrow"
                        onClick={() => handleElementCycle('prev')}
                        aria-label="Previous element"
                      >
                        <ChevronLeft size={14} />
                      </div>
                      
                      <div className="element-center" onClick={() => setShowElementModal(true)}>
                        <img src={getAssetPath('elements', element || 'Havoc').cdn}
                          alt={element || 'Element'}
                          className="carousel-icon"
                        />
                        <span className="element-name">{element || 'Havoc'}</span>
                      </div>
                      
                      <div className="element-arrow"
                        onClick={() => handleElementCycle('next')}
                        aria-label="Next element"
                      >
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                  
                  {showElementModal && (
                    <div className="element-modal" onClick={() => setShowElementModal(false)}>
                      <div className="element-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="element-modal-header">
                          Select Element
                        </div>
                        <div className="element-options">
                          {roverElements.map(elementType => (
                            <div key={elementType} className={`element-option ${element === elementType ? 'active' : ''}`}
                              data-element={elementType}
                              onClick={() => handleElementSelect(elementType)}
                            >
                              <img src={getAssetPath('elements', elementType).cdn}
                                alt={elementType}
                                className="element-option-icon"
                              />
                              <span className="element-option-name">{elementType}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
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
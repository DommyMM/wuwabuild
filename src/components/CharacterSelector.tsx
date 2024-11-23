import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character } from '../types/character';
import { useCharacters } from '../hooks/useCharacters';
import { useModalClose } from '../hooks/useModalClose';
import '../styles/CharacterSelector.css';
import '../styles/modal.css';

interface CharacterSelectorProps {
  onSelect: (character: Character | null) => void;
}

interface OCRCharacterProps extends CharacterSelectorProps {
  ocrData?: { name: string; level: number; element?: string;};
}

export const CharacterSelector: React.FC<OCRCharacterProps> = ({ onSelect, ocrData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const { characters, loading, error } = useCharacters();
  const initialSelectionMade = useRef(false);

  useModalClose(isModalOpen, () => setIsModalOpen(false));

  const handleCharacterSelect = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setIsModalOpen(false);
    onSelect(character);
  }, [onSelect]);

  useEffect(() => {
    if (ocrData?.name && characters.length > 0 && !initialSelectionMade.current) {
      const matchedCharacter = characters.find(
        char => char.name.toLowerCase() === ocrData.name.toLowerCase()
      );
      if (matchedCharacter) {
        initialSelectionMade.current = true;
        handleCharacterSelect(matchedCharacter);
      }
    }
  }, [ocrData, characters, handleCharacterSelect]);

  useEffect(() => {
    initialSelectionMade.current = false;
  }, [ocrData]);

  return (
    <>
      <div className="manual-section">
        <label>Select Resonator:</label>
        <div className="select-box" onClick={() => setIsModalOpen(true)}>
          <img 
            src={selectedCharacter 
              ? `images/Faces/${selectedCharacter.name}.png` 
              : "/images/Resources/Resonator.png"} 
            alt="Select Character" 
            className="select-img"
          />
          {selectedCharacter && (
            <p id="selectedCharacterLabel">
              <span 
                className={`char-sig element-${selectedCharacter.element.toLowerCase()}`}
                data-element={selectedCharacter.element}
                data-weapontype={selectedCharacter.weaponType}
                data-role={selectedCharacter.Role}
              >
                {selectedCharacter.name}
              </span>
            </p>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
            <div className="character-list">
              {loading && <div className="loading">Loading...</div>}
              {error && <div className="error">{error}</div>}
              {characters.map(character => (
                <div 
                  key={character.name}
                  className="character-option"
                  onClick={() => handleCharacterSelect(character)}
                >
                  <div 
                    className="border-wrapper"
                    data-element={character.element}
                  ></div>
                  <img 
                    src={`images/Faces/${character.name}.png`}
                    alt={character.name}
                    className="char-img"
                  />
                  <div className="char-label">{character.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
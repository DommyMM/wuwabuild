'use client';

import { useState, useCallback, useEffect } from 'react';
import { Character } from '@/types/character';
import { useCharacters } from '@/hooks/useCharacters';
import { useModalClose } from '@/hooks/useModalClose';
import { getAssetPath } from '@/types/paths';
import '@/styles/CharacterSelector.css';
import '@/styles/modal.css';

interface CharacterSelectorProps {
  onSelect: (characterId: string | null) => void;
  selectedCharacter: Character | null;
  ocrName?: string;
  onLevelReset?: () => void;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ 
  onSelect,
  selectedCharacter,
  ocrName,
  onLevelReset
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastOcrName, setLastOcrName] = useState<string | undefined>();
  const { characters, loading, error } = useCharacters();

  useModalClose(isModalOpen, () => setIsModalOpen(false));

  const handleCharacterSelect = useCallback((character: Character) => {
    setIsModalOpen(false);
    onSelect(character.id);
    onLevelReset?.();
  }, [onSelect, onLevelReset]);

  useEffect(() => {
    if (ocrName && 
        ocrName !== lastOcrName &&
        characters.length > 0) {
      const matchedCharacter = characters.find(
        char => char.name.toLowerCase() === ocrName.toLowerCase()
      );
      if (matchedCharacter) {
        setLastOcrName(ocrName);
        handleCharacterSelect(matchedCharacter);
      }
    }
  }, [ocrName, lastOcrName, characters, handleCharacterSelect]);

  return (
    <>
      <div className="manual-section">
        <div>Select Resonator:</div>
        <div className="select-box" onClick={() => setIsModalOpen(true)}>
          <div className="select-img">
            <img src={selectedCharacter ? getAssetPath('faces', selectedCharacter).local : "/images/Resources/Resonator.png"} alt="Select Character" className="select-img-inner" />
          </div>
          {selectedCharacter && (
            <p id="selectedCharacterLabel">
              <span className={`char-sig ${selectedCharacter.element.toLowerCase()}`} 
                data-weapontype={selectedCharacter.weaponType}
                data-role={selectedCharacter.Role}>
                {selectedCharacter.name}
              </span>
            </p>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} >
            <span className="close" onClick={() => setIsModalOpen(false)}>&times;</span>
            <div className="character-list">
              {loading && <div className="loading">Loading...</div>}
              {error && <div className="error">{error}</div>}
              {characters.map(character => (
                <div key={character.name} className="character-option" onClick={() => handleCharacterSelect(character)}>
                  <div className="border-wrapper" data-element={character.element}></div>
                  <img src={getAssetPath('faces', character).local} alt={character.name} className="char-img" />
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
'use client';

import React, { useState, useCallback } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { Modal, AssetImage } from '@/components/ui';
import { Character, Element } from '@/types/character';
import { getCharacterIconPaths } from '@/lib/paths';

interface CharacterSelectorProps {
  className?: string;
  inline?: boolean; // If true, renders just the grid without button/modal wrapper
  onSelect?: (character: Character) => void; // Optional callback for inline mode
}

// Element to color mapping for border styling
const ELEMENT_COLORS: Record<string, string> = {
  [Element.Aero]: 'border-aero',
  [Element.Glacio]: 'border-blue-400',
  [Element.Electro]: 'border-purple-400',
  [Element.Havoc]: 'border-pink-400',
  [Element.Fusion]: 'border-orange-400',
  [Element.Spectro]: 'border-spectro',
  [Element.Rover]: 'border-gray-400'
};

// Element to background gradient mapping
const ELEMENT_GRADIENTS: Record<string, string> = {
  [Element.Aero]: 'from-aero/20 to-transparent',
  [Element.Glacio]: 'from-blue-400/20 to-transparent',
  [Element.Electro]: 'from-purple-400/20 to-transparent',
  [Element.Havoc]: 'from-pink-400/20 to-transparent',
  [Element.Fusion]: 'from-orange-400/20 to-transparent',
  [Element.Spectro]: 'from-spectro/20 to-transparent',
  [Element.Rover]: 'from-gray-400/20 to-transparent'
};

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  className = '',
  inline = false,
  onSelect
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { characters, loading, error, getCharacter } = useGameData();
  const { state, setCharacter, setCharacterLevel } = useBuild();

  const selectedCharacter = getCharacter(state.characterState.id);

  const handleCharacterSelect = useCallback((character: Character) => {
    setIsModalOpen(false);
    // Reset level when changing characters
    setCharacterLevel('1');
    // For Rover, set default element to Havoc
    const element = character.name.startsWith('Rover') ? 'Havoc' : undefined;
    setCharacter(character.id, element);
    // Call optional callback
    onSelect?.(character);
  }, [setCharacter, setCharacterLevel, onSelect]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);


  // Character grid component (shared between inline and modal mode)
  const CharacterGrid = () => (
    <>
      {loading && (
        <div className="flex items-center justify-center py-8">
          <span className="text-text-primary/60">Loading characters...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-8">
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
          {characters.map((character) => (
            <button
              key={character.id}
              onClick={() => handleCharacterSelect(character)}
              className={`group relative flex flex-col items-center gap-1 rounded-lg border bg-linear-to-b p-2 transition-all hover:scale-105 hover:border-accent ${ELEMENT_COLORS[character.element]
                } ${ELEMENT_GRADIENTS[character.element]} ${selectedCharacter?.id === character.id ? 'ring-2 ring-accent' : ''
                }`}
            >
              {/* Character Portrait */}
              <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                <AssetImage
                  paths={getCharacterIconPaths(character)}
                  alt={character.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>

              {/* Character Name */}
              <span className="text-center text-xs text-text-primary">
                {character.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  // Inline mode - just render the grid
  if (inline) {
    return (
      <div className={className}>
        <CharacterGrid />
      </div>
    );
  }

  // Standard mode - button with modal
  return (
    <>
      {/* Character Selection Button */}
      <div className={`flex flex-col gap-2 ${className}`}>
        <span className="text-sm font-medium text-text-primary/80">Select Resonator</span>
        <button
          onClick={openModal}
          className="flex items-center gap-3 rounded-lg border border-border bg-background-secondary p-3 transition-colors hover:border-accent hover:bg-background"
        >
          {/* Character Portrait */}
          <div className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${selectedCharacter ? ELEMENT_COLORS[selectedCharacter.element] : 'border-border'
            }`}>
            <AssetImage
              paths={getCharacterIconPaths(selectedCharacter)}
              alt={selectedCharacter?.name || 'Select Character'}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Character Info */}
          <div className="flex flex-col items-start">
            {selectedCharacter ? (
              <>
                <span className="font-semibold text-text-primary">
                  {selectedCharacter.name}
                </span>
                <span className="text-xs text-text-primary/60">
                  {selectedCharacter.element} | {selectedCharacter.weaponType}
                </span>
              </>
            ) : (
              <span className="text-text-primary/60">Click to select...</span>
            )}
          </div>
        </button>
      </div>

      {/* Character Selection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Select Resonator"
        contentClassName="w-[800px] max-w-[90vw]"
      >
        <CharacterGrid />
      </Modal>
    </>
  );
};

export default CharacterSelector;

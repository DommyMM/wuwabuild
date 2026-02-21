'use client';

import React, { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, ChevronLeft } from 'lucide-react';
import { useBuild } from '@/contexts/BuildContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { LevelSlider } from '@/components/ui/LevelSlider';
import { SequenceSelector } from './SequenceSelector';
import { getElementPaths } from '@/lib/paths';

interface CharacterInfoProps {
  className?: string;
  defaultMinimized?: boolean;
}

// Rover element options
const ROVER_ELEMENTS = ['Havoc', 'Spectro', 'Aero'] as const;

// Element colors for styling
const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Havoc: { bg: 'bg-havoc/20', text: 'text-havoc', border: 'border-havoc' },
  Spectro: { bg: 'bg-spectro/20', text: 'text-spectro', border: 'border-spectro' },
  Aero: { bg: 'bg-aero/20', text: 'text-aero', border: 'border-aero' },
  Glacio: { bg: 'bg-blue-400/20', text: 'text-blue-400', border: 'border-blue-400' },
  Electro: { bg: 'bg-purple-400/20', text: 'text-purple-400', border: 'border-purple-400' },
  Fusion: { bg: 'bg-orange-400/20', text: 'text-orange-400', border: 'border-orange-400' },
};

export const CharacterInfo: React.FC<CharacterInfoProps> = ({
  className = '',
  defaultMinimized = false
}) => {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [showElementModal, setShowElementModal] = useState(false);

  const {
    state,
    setCharacterLevel,
    setRoverElement,
    setSequence
  } = useBuild();
  const { t } = useLanguage();
  const selected = useSelectedCharacter();

  const characterLevel = state.characterLevel;
  const currentElement = state.roverElement || 'Havoc';
  const currentSequence = state.sequence;

  const isRover = selected?.isRover ?? false;
  const translatedName = selected ? t(selected.nameI18n) : '';
  const displayName = selected ? (isRover ? `${translatedName}${currentElement}` : translatedName) : '';
  const effectiveElement = selected?.element;


  // Handle level change
  const handleLevelChange = useCallback((newLevel: number) => {
    setCharacterLevel(newLevel);
  }, [setCharacterLevel]);

  // Handle sequence change
  const handleSequenceChange = useCallback((newSequence: number) => {
    setSequence(newSequence);
  }, [setSequence]);

  // Handle element change for Rover
  const handleElementChange = useCallback((element: string) => {
    setRoverElement(element);
    setShowElementModal(false);
  }, [setRoverElement]);

  // Cycle through Rover elements
  const handleElementCycle = useCallback((direction: 'next' | 'prev') => {
    const currentIndex = ROVER_ELEMENTS.indexOf(currentElement as typeof ROVER_ELEMENTS[number]);
    let newIndex: number;

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % ROVER_ELEMENTS.length;
    } else {
      newIndex = (currentIndex - 1 + ROVER_ELEMENTS.length) % ROVER_ELEMENTS.length;
    }

    setRoverElement(ROVER_ELEMENTS[newIndex]);
  }, [currentElement, setRoverElement]);

  // Toggle minimized state
  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  // No character selected
  if (!selected) {
    return (
      <div className={`rounded-lg border border-border bg-background-secondary p-4 ${className}`}>
        <div className="text-center text-text-primary/60">
          Select a resonator first
        </div>
      </div>
    );
  }

  const elementStyle = effectiveElement ? ELEMENT_COLORS[effectiveElement] : null;

  return (
    <div className={`rounded-lg border border-border bg-background-secondary ${className}`}>
      {/* Header - always visible */}
      <button
        onClick={toggleMinimized}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-background"
      >
        <div className="flex items-center gap-3">
          {/* Character Icon */}
          <div className={`h-10 w-10 overflow-hidden rounded-full border-2 ${elementStyle?.border || 'border-border'}`}>
            <img
              src={selected.iconRound}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-semibold text-text-primary">
            {displayName} Info
          </span>
        </div>
        {isMinimized ? (
          <ChevronRight size={20} className="text-text-primary/60" />
        ) : (
          <ChevronDown size={20} className="text-text-primary/60" />
        )}
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ${isMinimized ? 'max-h-0' : 'max-h-[1000px]'
          }`}
      >
        <div className="space-y-4 border-t border-border p-4">
          {/* Rover Element Selector */}
          {isRover && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-primary/80">Element</span>
              <div
                className={`flex items-center justify-between rounded-lg border p-2 ${elementStyle?.border} ${elementStyle?.bg}`}
              >
                <button
                  onClick={() => handleElementCycle('prev')}
                  className="rounded p-1 transition-colors hover:bg-background"
                  aria-label="Previous element"
                >
                  <ChevronLeft size={18} className={elementStyle?.text} />
                </button>

                <button
                  onClick={() => setShowElementModal(true)}
                  className="flex items-center gap-2"
                >
                  <img
                    src={getElementPaths(currentElement)}
                    alt={currentElement}
                    className="h-6 w-6"
                  />
                  <span className={`font-medium ${elementStyle?.text}`}>
                    {currentElement}
                  </span>
                </button>

                <button
                  onClick={() => handleElementCycle('next')}
                  className="rounded p-1 transition-colors hover:bg-background"
                  aria-label="Next element"
                >
                  <ChevronRight size={18} className={elementStyle?.text} />
                </button>
              </div>
            </div>
          )}

          {/* Element Modal for Rover */}
          {showElementModal && isRover && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={() => setShowElementModal(false)}
            >
              <div
                className="rounded-lg border border-border bg-background-secondary p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 text-center font-semibold text-text-primary">
                  Select Element
                </div>
                <div className="flex gap-4">
                  {ROVER_ELEMENTS.map((element) => {
                    const style = ELEMENT_COLORS[element];
                    return (
                      <button
                        key={element}
                        onClick={() => handleElementChange(element)}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:scale-105 ${currentElement === element
                            ? `${style.border} ${style.bg}`
                            : 'border-border hover:border-text-primary/40'
                          }`}
                      >
                        <img
                          src={getElementPaths(element)}
                          alt={element}
                          className="h-10 w-10"
                        />
                        <span className={currentElement === element ? style.text : 'text-text-primary'}>
                          {element}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Level Slider */}
          <LevelSlider
            value={characterLevel}
            onLevelChange={handleLevelChange}
            label="Level"
            showDiamonds={true}
          />

          {/* Sequence Selector */}
          {selected?.character.cdnId && (
            <SequenceSelector
              cdnId={selected.character.cdnId}
              characterName={selected.character.name}
              current={currentSequence}
              onChange={handleSequenceChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

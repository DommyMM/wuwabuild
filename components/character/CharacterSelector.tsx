'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { Modal, AssetImage } from '@/components/ui';
import { Character, Element } from '@/types/character';
import type { ImagePaths } from '@/lib/paths';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_FACE = '/images/Resources/Resonator.png';

/** All filterable elements */
const ELEMENTS = [
  Element.Glacio,
  Element.Fusion,
  Element.Electro,
  Element.Aero,
  Element.Spectro,
  Element.Havoc,
] as const;

/** Element name -> Tailwind bg fill for card */
const ELEMENT_BG: Record<string, string> = {
  [Element.Glacio]:  'bg-glacio/15',
  [Element.Fusion]:  'bg-fusion/15',
  [Element.Electro]: 'bg-electro/15',
  [Element.Aero]:    'bg-aero/15',
  [Element.Spectro]: 'bg-spectro/15',
  [Element.Havoc]:   'bg-havoc/15',
  [Element.Rover]:   'bg-rover/15',
};

/** Element name -> Tailwind border class (for the compact slot) */
const ELEMENT_BORDER: Record<string, string> = {
  [Element.Glacio]:  'border-glacio',
  [Element.Fusion]:  'border-fusion',
  [Element.Electro]: 'border-electro',
  [Element.Aero]:    'border-aero',
  [Element.Spectro]: 'border-spectro',
  [Element.Havoc]:   'border-havoc',
  [Element.Rover]:   'border-rover',
};

/** Element name -> Tailwind text color */
const ELEMENT_TEXT: Record<string, string> = {
  [Element.Glacio]:  'text-glacio',
  [Element.Fusion]:  'text-fusion',
  [Element.Electro]: 'text-electro',
  [Element.Aero]:    'text-aero',
  [Element.Spectro]: 'text-spectro',
  [Element.Havoc]:   'text-havoc',
};

/** Element name -> active filter chip styling */
const ELEMENT_CHIP_ACTIVE: Record<string, string> = {
  [Element.Glacio]:  'bg-glacio/20 border-glacio/50 text-glacio',
  [Element.Fusion]:  'bg-fusion/20 border-fusion/50 text-fusion',
  [Element.Electro]: 'bg-electro/20 border-electro/50 text-electro',
  [Element.Aero]:    'bg-aero/20 border-aero/50 text-aero',
  [Element.Spectro]: 'bg-spectro/20 border-spectro/50 text-spectro',
  [Element.Havoc]:   'bg-havoc/20 border-havoc/50 text-havoc',
};

/** Rarity id -> border color for the card */
const RARITY_CARD_BORDER: Record<number, string> = {
  4: 'border-rarity-4/50',
  5: 'border-rarity-5/60',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive face1 (square head) URL from iconRound URL */
const getHeadPaths = (character: Character | null): ImagePaths => {
  if (!character?.iconRound) {
    return { cdn: FALLBACK_FACE, local: FALLBACK_FACE };
  }
  const face1Url = character.iconRound.replace(/HeadCircle256/g, 'Head256');
  return { cdn: face1Url, local: FALLBACK_FACE };
};

/** Keep one Rover per gender (legacyId 4=male, 5=female) */
const deduplicateRovers = (chars: Character[]): Character[] => {
  const seen = new Set<string>();
  return chars.filter((c) => {
    if (c.element !== Element.Rover) return true;
    const gender = c.legacyId ?? c.id;
    if (seen.has(gender)) return false;
    seen.add(gender);
    return true;
  });
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CharacterSelectorProps {
  className?: string;
  inline?: boolean;
  onSelect?: (character: Character) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  className = '',
  inline = false,
  onSelect,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [elementFilter, setElementFilter] = useState<Set<string>>(new Set());
  const [rarityFilter, setRarityFilter] = useState<Set<number>>(new Set());

  const { characters, loading, error, getCharacter } = useGameData();
  const { state, setCharacter, setCharacterLevel } = useBuild();

  const selectedCharacter = getCharacter(state.characterState.id);

  // Dedupe rovers, sort: 5-star first then alphabetical
  const processedCharacters = useMemo(() => {
    const deduped = deduplicateRovers(characters);
    return deduped.sort((a, b) => {
      const rarityDiff = (b.rarity ?? 4) - (a.rarity ?? 4);
      return rarityDiff !== 0 ? rarityDiff : a.name.localeCompare(b.name);
    });
  }, [characters]);

  // Apply element + rarity filters
  const filteredCharacters = useMemo(() => {
    let filtered = processedCharacters;

    if (elementFilter.size > 0) {
      filtered = filtered.filter(
        (c) => elementFilter.has(c.element) || c.element === Element.Rover,
      );
    }

    if (rarityFilter.size > 0) {
      filtered = filtered.filter((c) => rarityFilter.has(c.rarity ?? 4));
    }

    return filtered;
  }, [processedCharacters, elementFilter, rarityFilter]);

  const handleSelect = useCallback(
    (character: Character) => {
      setIsModalOpen(false);
      setCharacterLevel('1');
      const element = character.element === Element.Rover ? 'Havoc' : undefined;
      setCharacter(character.id, element);
      onSelect?.(character);
    },
    [setCharacter, setCharacterLevel, onSelect],
  );

  const toggleElement = useCallback((el: string) => {
    setElementFilter((prev) => {
      const next = new Set(prev);
      next.has(el) ? next.delete(el) : next.add(el);
      return next;
    });
  }, []);

  const toggleRarity = useCallback((r: number) => {
    setRarityFilter((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setElementFilter(new Set());
    setRarityFilter(new Set());
  }, []);

  const hasFilters = elementFilter.size > 0 || rarityFilter.size > 0;

  // -----------------------------------------------------------------------
  // Character grid
  // -----------------------------------------------------------------------

  const CharacterGrid = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <span className="text-text-primary/60">Loading resonators...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-12">
          <span className="text-red-400">{error}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Rarity */}
          {[5, 4].map((r) => (
            <button
              key={r}
              onClick={() => toggleRarity(r)}
              className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors
                ${rarityFilter.has(r)
                  ? r === 5
                    ? 'border-rarity-5/50 bg-rarity-5/20 text-rarity-5'
                    : 'border-rarity-4/50 bg-rarity-4/20 text-rarity-4'
                  : 'border-border text-text-primary/50 hover:border-text-primary/30'
                }
              `}
            >
              {r}★
            </button>
          ))}

          <span className="mx-0.5 h-4 w-px bg-border" />

          {/* Elements */}
          {ELEMENTS.map((el) => (
            <button
              key={el}
              onClick={() => toggleElement(el)}
              className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors
                ${elementFilter.has(el)
                  ? ELEMENT_CHIP_ACTIVE[el]
                  : 'border-border text-text-primary/50 hover:border-text-primary/30'
                }
              `}
            >
              {el}
            </button>
          ))}

          {hasFilters && (
            <>
              <span className="mx-0.5 h-4 w-px bg-border" />
              <button
                onClick={clearFilters}
                className="rounded-md px-2 py-0.5 text-xs text-text-primary/40 hover:text-text-primary"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Grid */}
        {filteredCharacters.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-text-primary/40">No resonators found</span>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
            {filteredCharacters.map((character) => {
              const isSelected = selectedCharacter?.id === character.id;
              const isRover = character.element === Element.Rover;
              const rarity = character.rarity ?? 4;

              return (
                <button
                  key={character.id}
                  onClick={() => handleSelect(character)}
                  className={`group relative flex flex-col items-center overflow-hidden rounded-lg border-2 transition-transform duration-150
                    ${isRover ? 'animate-[rover-rainbow_4s_linear_infinite]' : RARITY_CARD_BORDER[rarity] ?? 'border-border'}
                    ${ELEMENT_BG[character.element] ?? ''}
                    ${isSelected ? 'ring-2 ring-accent ring-offset-1 ring-offset-background-secondary' : ''}
                    hover:scale-105
                  `}
                >
                  {/* Face (square head icon) */}
                  <div className="relative aspect-square w-full overflow-hidden">
                    <AssetImage
                      paths={getHeadPaths(character)}
                      alt={character.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Divider */}
                  <div className={`h-px w-full ${isRover ? 'bg-rover/30' : rarity === 5 ? 'bg-rarity-5/30' : 'bg-rarity-4/30'}`} />

                  {/* Name */}
                  <span className="max-w-full truncate px-1 py-1 text-center text-xs leading-tight text-text-primary/80 group-hover:text-text-primary">
                    {character.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Inline mode
  // -----------------------------------------------------------------------

  if (inline) {
    return (
      <div className={className}>
        <CharacterGrid />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Standard mode – compact slot + modal
  // -----------------------------------------------------------------------

  const isRover = selectedCharacter?.element === Element.Rover;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`group flex items-center gap-3 rounded-lg border border-border bg-background p-2 transition-colors hover:border-text-primary/30 ${className}`}
      >
        <div
          className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-md border-2 transition-all
            ${!selectedCharacter ? 'border-border' : isRover ? 'animate-[rover-rainbow_4s_linear_infinite]' : ELEMENT_BORDER[selectedCharacter.element] ?? 'border-border'}
          `}
        >
          <AssetImage
            paths={getHeadPaths(selectedCharacter)}
            alt={selectedCharacter?.name ?? 'Select Resonator'}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col items-start text-left">
          {selectedCharacter ? (
            <>
              <span className="text-sm font-semibold text-text-primary">
                {isRover ? 'Rover' : selectedCharacter.name}
              </span>
              <span className="text-xs text-text-primary/50">
                {isRover ? 'Rover' : selectedCharacter.element} · {selectedCharacter.weaponType}
              </span>
            </>
          ) : (
            <span className="text-sm text-text-primary/50">Select Resonator</span>
          )}
        </div>
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Resonator"
        contentClassName="w-[720px] max-w-[95vw]"
      >
        <CharacterGrid />
      </Modal>
    </>
  );
};

export default CharacterSelector;

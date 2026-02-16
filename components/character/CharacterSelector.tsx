'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { Modal } from '@/components/ui/Modal';
import { AssetImage } from '@/components/ui/AssetImage';
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

/** Element name -> Tailwind bg fill for card + hover gradient */
const ELEMENT_BG: Record<string, string> = {
  [Element.Glacio]:  'bg-glacio/15 hover:bg-gradient-to-b hover:from-glacio/30 hover:to-glacio/5',
  [Element.Fusion]:  'bg-fusion/15 hover:bg-gradient-to-b hover:from-fusion/30 hover:to-fusion/5',
  [Element.Electro]: 'bg-electro/15 hover:bg-gradient-to-b hover:from-electro/30 hover:to-electro/5',
  [Element.Aero]:    'bg-aero/15 hover:bg-gradient-to-b hover:from-aero/30 hover:to-aero/5',
  [Element.Spectro]: 'bg-spectro/15 hover:bg-gradient-to-b hover:from-spectro/30 hover:to-spectro/5',
  [Element.Havoc]:   'bg-havoc/15 hover:bg-gradient-to-b hover:from-havoc/30 hover:to-havoc/5',
  [Element.Rover]:   'bg-rover/15 hover:bg-gradient-to-b hover:from-rover/30 hover:to-rover/5',
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

/** Rarity id -> default border color */
const RARITY_CARD_BORDER: Record<number, string> = {
  4: 'border-rarity-4/50',
  5: 'border-rarity-5/60',
};

/** Rarity id -> hover: brighten border + soft glow */
const RARITY_HOVER: Record<number, string> = {
  4: 'hover:border-rarity-4 hover:shadow-[0_0_10px_var(--color-rarity-4)]',
  5: 'hover:border-rarity-5 hover:shadow-[0_0_10px_var(--color-rarity-5)]',
};

/** Rarity id -> selected: solid bright border + glow */
const RARITY_SELECTED: Record<number, string> = {
  4: 'border-rarity-4 shadow-[0_0_10px_var(--color-rarity-4)]',
  5: 'border-rarity-5 shadow-[0_0_10px_var(--color-rarity-5)]',
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

  const { characters, loading, error } = useGameData();
  const { setCharacter, setCharacterLevel } = useBuild();
  const { t } = useLanguage();
  const selected = useSelectedCharacter();

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
      <div className="flex h-full flex-col gap-3">
        {/* Filter chips (pinned) */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Rarity */}
          {[5, 4].map((r) => (
            <button
              key={r}
              onClick={() => toggleRarity(r)}
              className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors
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

          <span className="mx-1 h-5 w-px bg-border" />

          {/* Elements */}
          {ELEMENTS.map((el) => (
            <button
              key={el}
              onClick={() => toggleElement(el)}
              className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors
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
              <span className="mx-1 h-5 w-px bg-border" />
              <button
                onClick={clearFilters}
                className="rounded-md px-3 py-1 text-sm text-text-primary/40 hover:text-text-primary"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Grid (scrollable) */}
        {filteredCharacters.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-text-primary/40">No resonators found</span>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {filteredCharacters.map((character) => {
              const isSelected = selected?.character.id === character.id;
              const isRover = character.element === Element.Rover;
              const rarity = character.rarity ?? 4;

              return (
                <button
                  key={character.id}
                  onClick={() => handleSelect(character)}
                  className={`group relative flex flex-col items-center overflow-hidden rounded-lg border-2 transition-all duration-200
                    ${ELEMENT_BG[character.element] ?? ''}
                    ${isRover
                      ? isSelected
                        ? 'border-rarity-5 shadow-[0_0_10px_var(--color-rarity-5)]'
                        : 'border-rarity-5/60 hover:animate-[rover-rainbow_4s_linear_infinite]'
                      : isSelected
                        ? RARITY_SELECTED[rarity] ?? 'border-accent'
                        : `${RARITY_CARD_BORDER[rarity] ?? 'border-border'} ${RARITY_HOVER[rarity] ?? ''}`
                    }
                  `}
                >
                  {/* Face (square head icon) */}
                  <div className="relative aspect-square w-full overflow-hidden">
                    <AssetImage
                      paths={getHeadPaths(character)}
                      alt={t(character.nameI18n ?? { en: character.name })}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Divider */}
                  <div className={`h-0.5 w-full ${isRover ? 'bg-rover/40' : rarity === 5 ? 'bg-rarity-5/40' : 'bg-rarity-4/40'}`} />

                  {/* Name */}
                  <span className="max-w-full truncate px-1.5 py-1 text-center text-sm leading-tight text-text-primary/80 group-hover:text-text-primary">
                    {t(character.nameI18n ?? { en: character.name })}
                  </span>
                </button>
              );
            })}
          </div>
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

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`group flex items-center gap-2 rounded-lg border border-border bg-background p-2 transition-colors hover:border-text-primary/30 ${className}`}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
          <AssetImage
            paths={selected?.iconRoundPaths ?? { cdn: FALLBACK_FACE, local: FALLBACK_FACE }}
            alt={selected ? t(selected.nameI18n) : 'Select Resonator'}
            className="h-full w-full object-cover"
          />
        </div>

        <span className={`text-2xl font-medium ${selected ? `char-sig ${selected.element.toLowerCase()}` : 'text-text-primary/50'}`}>
          {selected ? t(selected.nameI18n) : 'Select Resonator'}
        </span>
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Resonator"
        contentClassName="w-full mx-8 lg:mx-32 max-h-[90vh]"
      >
        <CharacterGrid />
      </Modal>
    </>
  );
};

export default CharacterSelector;

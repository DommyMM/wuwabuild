'use client';

import { useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { Character, Element, I18nString } from '@/types/character';
import type { ImagePaths } from '@/lib/paths';

const FALLBACK: ImagePaths = {
  cdn: '/images/Resources/Resonator.png',
  local: '/images/Resources/Resonator.png',
};

export interface SelectedCharacter {
  character: Character;
  isRover: boolean;
  /** Effective element (resolves Rover to their chosen element) */
  element: string;
  displayName: string;              // Display name (English, e.g. "Rover", "Camellya")
  nameI18n: I18nString;            // Translated display name for t() usage
  iconRoundPaths: ImagePaths;      // Circular face icon (HeadCircle256)
  headPaths: ImagePaths;           // Square head icon (Head256, derived from iconRound)
  bannerPaths: ImagePaths;         // Full character portrait (RolePile / banner)
}

/**
 * Composes BuildContext + GameDataContext into a single memoized
 * selected-character object with pre-computed image paths.
 *
 * Returns `null` when no character is selected.
 */
export function useSelectedCharacter(): SelectedCharacter | null {
  const { state } = useBuild();
  const { getCharacter } = useGameData();

  const { characterId: id, roverElement } = state;

  return useMemo(() => {
    const character = getCharacter(id);
    if (!character) return null;

    const isRover = character.element === Element.Rover;
    const element = isRover ? (roverElement || 'Havoc') : character.element;
    const displayName = isRover ? `Rover` : character.name;
    const nameI18n: I18nString = character.nameI18n ?? { en: character.name };

    const iconRoundPaths: ImagePaths = character.iconRound
      ? { cdn: character.iconRound, local: FALLBACK.local }
      : { ...FALLBACK };

    const headPaths: ImagePaths = character.iconRound
      ? { cdn: character.iconRound.replace(/HeadCircle256/g, 'Head256'), local: FALLBACK.local }
      : { ...FALLBACK };

    const bannerPaths: ImagePaths = character.banner
      ? { cdn: character.banner, local: FALLBACK.local }
      : { ...FALLBACK };

    return {
      character,
      isRover,
      element,
      displayName,
      nameI18n,
      iconRoundPaths,
      headPaths,
      bannerPaths,
    };
  }, [id, roverElement, getCharacter]);
}

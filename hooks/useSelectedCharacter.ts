'use client';

import { useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { Character, Element, I18nString } from '@/types/character';

const FALLBACK_IMG = '/images/Resources/Resonator.png';

export interface SelectedCharacter {
  character: Character;
  isRover: boolean;
  /** Effective element (resolves Rover to their chosen element) */
  element: string;
  displayName: string;              // Display name (English, e.g. "Rover", "Camellya")
  nameI18n: I18nString;            // Translated display name for t() usage
  iconRound: string;               // CDN URL — circular face icon (HeadCircle256)
  head: string;                    // CDN URL — square head icon (Head256)
  banner: string;                  // CDN URL — full character portrait (RolePile)
}

/**
 * Composes BuildContext + GameDataContext into a single memoized
 * selected-character object with pre-computed CDN image URLs.
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

    const iconRound = character.iconRound || FALLBACK_IMG;
    const head = character.iconRound
      ? character.iconRound.replace(/HeadCircle256/g, 'Head256')
      : FALLBACK_IMG;
    const banner = character.banner || FALLBACK_IMG;

    return {
      character,
      isRover,
      element,
      displayName,
      nameI18n,
      iconRound,
      head,
      banner,
    };
  }, [id, roverElement, getCharacter]);
}

'use client';

import { useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { Character, Element, I18nString } from '@/lib/character';

const FALLBACK_IMG = '/images/Resources/Resonator.png';

export interface SelectedCharacter {
  character: Character;
  isRover: boolean;
  /** Effective element, with Rover resolved to their chosen element */
  element: string;
  /** English name, "Rover" or "Camellya" */
  displayName: string;
  /** Translated name, for t() */
  nameI18n: I18nString;
  /** CDN URL, circular face icon (HeadCircle256) */
  iconRound: string;
  /** CDN URL, square head icon (Head256) */
  head: string;
  /** CDN URL, full character portrait (RolePile) */
  banner: string;
}

/** Composes BuildContext and GameDataContext into one memoized character with its CDN image URLs */
export function useSelectedCharacter(): SelectedCharacter | null {
  const { state } = useBuild();
  const { getCharacter } = useGameData();

  const { characterId: id, roverElement } = state;

  return useMemo(() => {
    const character = getCharacter(id);
    if (!character) return null;

    const isRover = character.element === Element.Rover;
    const element = isRover ? (roverElement || character.roverElementName || 'Spectro') : character.element;
    const displayName = isRover ? `Rover · ${element}` : character.name;
    const nameI18n: I18nString = {
      ...(character.nameI18n ?? { en: character.name }),
      en: displayName,
    };

    const iconRound = character.iconRound || FALLBACK_IMG;
    const head      = character.head      || FALLBACK_IMG;
    const banner    = character.banner    || FALLBACK_IMG;

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

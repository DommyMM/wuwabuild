import { Echo } from '@/lib/echo';
import { Character, isRover } from '@/lib/character';
import { StatName } from '@/lib/constants/statMappings';

const ROVER_ELEMENTS = new Set(['Aero', 'Havoc', 'Spectro']);

// Checks whether an echo's characterCondition list matches the current character.
// Empty/absent conditions match everyone. Named tokens match by character name;
// element tokens (Aero/Havoc/Spectro) match Rover by active element.
export const matchesEchoBonusCondition = (
  conditions: string[] | undefined,
  characterName: string | undefined,
  isRoverCharacter: boolean,
  roverElement: string | undefined
): boolean => {
  if (!conditions || conditions.length === 0) return true;
  return conditions.some(condition => {
    const token = condition.trim();
    if (!token) return false;
    if (characterName === token) return true;
    if (isRoverCharacter && roverElement && ROVER_ELEMENTS.has(token)) {
      return roverElement === token;
    }
    return false;
  });
};

// First-panel conditional/unconditional stat bonuses per echo

export interface EchoBonus {
  stat: StatName;
  value: number;
  characterCondition?: string[];
}

export const getEchoBonus = (echo: Echo): ReadonlyArray<EchoBonus> | null =>
  echo.bonuses ?? null;

export const hasPhantomVariant = (echo: Echo): boolean =>
  echo.phantomIconUrl !== undefined;

// Unconditional passive stat bonuses from resonance chains

export interface SequenceBonus {
  minSequence: number;
  stat: StatName;
  value: number;
}

export const getSequenceBonuses = (character: Character): readonly SequenceBonus[] => {
  if (!character.chains) return [];
  return character.chains.flatMap((chain, idx) => {
    if (!chain.bonus) return [];
    return [{ minSequence: idx + 1, stat: chain.bonus.stat as StatName, value: chain.bonus.value }];
  });
};

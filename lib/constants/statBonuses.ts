import { Echo } from '@/lib/echo';
import { Character } from '@/lib/character';
import { StatName } from '@/lib/constants/statMappings';

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

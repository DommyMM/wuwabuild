import { Echo } from '@/lib/echo';
import { Character, CDNChainEntry } from '@/lib/character';
import { StatName } from '@/lib/constants/statMappings';

export const ROVER_ELEMENTS = ['Spectro', 'Aero', 'Electro', 'Havoc'] as const;
const ROVER_ELEMENT_SET = new Set<string>(ROVER_ELEMENTS);

/**
 * Whether an echo's characterCondition list matches the current character
 *
 * - Empty or absent conditions match everyone
 * - A named token matches by character name, an element token matches Rover by active element
 */
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
    if (isRoverCharacter && roverElement && ROVER_ELEMENT_SET.has(token)) {
      return roverElement === token;
    }
    return false;
  });
};

interface EchoBonus {
  stat: StatName;
  value: number;
  characterCondition?: string[];
}

export const getEchoBonus = (echo: Echo): ReadonlyArray<EchoBonus> | null =>
  echo.bonuses ?? null;

export const hasPhantomVariant = (echo: Echo): boolean =>
  echo.phantomIconUrl !== undefined;

/** Unconditional passive stat bonus from a resonance chain, `minSequence` counting from 1 */
export interface SequenceBonus {
  minSequence: number;
  stat: StatName;
  value: number;
}

/** Whether a `chain.bonus` agrees with its chain's first param, mirroring `_skip_sequence_bonus` in scripts/sync_lb.py */
const sequenceBonusMatchesHeadlineParam = (
  bonus: { value: number },
  params: string[] | undefined
): boolean => {
  const raw = params?.[0];
  if (typeof raw !== 'string') return false;
  const paramValue = parseFloat(raw.replace('%', '').replace(',', '.').trim());
  // Disagreeing value was authored against a conditional or move-scoped clause, so it is not a flat panel stat
  // Lucy S3 text gives +100% Crit. DMG scoped to Override while param[0] is 50
  return Number.isFinite(paramValue) && paramValue === bonus.value;
};

export const getChainSequenceBonuses = (
  chains: readonly CDNChainEntry[] | undefined
): readonly SequenceBonus[] => {
  if (!chains) return [];
  return chains.flatMap((chain, idx) => {
    if (!chain.bonus) return [];
    if (!sequenceBonusMatchesHeadlineParam(chain.bonus, chain.param)) return [];
    return [{ minSequence: idx + 1, stat: chain.bonus.stat as StatName, value: chain.bonus.value }];
  });
};

export const getSequenceBonuses = (character: Character): readonly SequenceBonus[] =>
  getChainSequenceBonuses(character.chains);

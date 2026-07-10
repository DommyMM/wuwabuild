import { Echo } from '@/lib/echo';
import { Character } from '@/lib/character';
import { StatName } from '@/lib/constants/statMappings';

export const ROVER_ELEMENTS = ['Spectro', 'Aero', 'Electro', 'Havoc'] as const;
const ROVER_ELEMENT_SET = new Set<string>(ROVER_ELEMENTS);

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
    if (isRoverCharacter && roverElement && ROVER_ELEMENT_SET.has(token)) {
      return roverElement === token;
    }
    return false;
  });
};

// First-panel conditional/unconditional stat bonuses per echo

interface EchoBonus {
  stat: StatName;
  value: number;
  characterCondition?: string[];
}

export const getEchoBonus = (echo: Echo): ReadonlyArray<EchoBonus> | null =>
  echo.bonuses ?? null;

export const hasPhantomVariant = (echo: Echo): boolean =>
  echo.phantomIconUrl !== undefined;

// Unconditional passive stat bonuses from resonance chains

interface SequenceBonus {
  minSequence: number;
  stat: StatName;
  value: number;
}

// Mirrors the backend's `_skip_sequence_bonus` (sync_lb.py): a `chain.bonus`
// whose value disagrees with the chain's first param was authored against a
// different (usually conditional or move-scoped) clause and must not be applied
// as a flat panel stat. e.g. Lucy S3 parses "...its Crit. DMG is increased by
// 100%" with param[0]=50 — the +100% scopes to the Override move, not her stat.
const sequenceBonusMatchesHeadlineParam = (
  bonus: { value: number },
  params: string[] | undefined
): boolean => {
  const raw = params?.[0];
  if (typeof raw !== 'string') return false;
  const paramValue = parseFloat(raw.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(paramValue) && paramValue === bonus.value;
};

export const getSequenceBonuses = (character: Character): readonly SequenceBonus[] => {
  if (!character.chains) return [];
  return character.chains.flatMap((chain, idx) => {
    if (!chain.bonus) return [];
    if (!sequenceBonusMatchesHeadlineParam(chain.bonus, chain.param)) return [];
    return [{ minSequence: idx + 1, stat: chain.bonus.stat as StatName, value: chain.bonus.value }];
  });
};

import { StatName } from '@/lib/constants/statMappings';

/**
 * An always-on kit clause deriving one panel stat from another, with no trigger, stack or sequence gate
 *
 * - Example: "For every 1000 points of Max HP, Jingran gains 36 additional ATK, up to 1800"
 * - The game panel carries these because a panel is read out of combat, where a conversion is already true
 * - Only panel-stat targets belong here, so Sigrika's Energy Regen to Echo Skill DMG lives on the lb side alone
 */
export interface StatConversion {
  name: string;
  from: StatName;
  to: StatName;
  per: number;
  value: number;
  floor?: number;
  cap?: number;
}

export const CHARACTER_STAT_CONVERSIONS: Record<string, StatConversion[]> = {
  '1212': [ // Jingran
    { name: 'Yang Changes, Yin Unites', from: 'HP', to: 'ATK', per: 1000, value: 36, cap: 1800 },
    { name: 'Nether to Light', from: 'HP', to: 'Fusion DMG', per: 1000, value: 1.5, cap: 75 },
  ],
};

/** The amount one conversion awards for a source value */
export const statConversionGrant = (conversion: StatConversion, from: number): number => {
  if (conversion.per <= 0) return 0;
  const excess = from - (conversion.floor ?? 0);
  if (excess <= 0) return 0;
  const granted = (excess / conversion.per) * conversion.value;
  return conversion.cap !== undefined && granted > conversion.cap ? conversion.cap : granted;
};

const BASE_STAT_TARGETS = new Set<StatName>(['HP', 'ATK', 'DEF']);

/**
 * Adds every conversion a character declares on top of a finished panel
 *
 * - One pass after all stats resolve, reading sources from `values` as they stood before any conversion applied
 * - Jingran's two clauses both read Max HP, so declaration order must not change the result
 * - Mutates `values` and `updates` in place, `updates` being the from-gear delta the editor shows next to each stat
 */
export const applyStatConversions = (
  characterId: string | undefined,
  values: Partial<Record<StatName, number>>,
  updates: Partial<Record<StatName, number>>
): void => {
  const conversions = characterId ? CHARACTER_STAT_CONVERSIONS[characterId] : undefined;
  if (!conversions?.length) return;

  const sources = { ...values };
  for (const conversion of conversions) {
    const from = sources[conversion.from];
    if (from === undefined) continue;
    const granted = statConversionGrant(conversion, from);
    if (!granted) continue;

    const round = BASE_STAT_TARGETS.has(conversion.to)
      ? (n: number) => Math.round(n)
      : (n: number) => Number(n.toFixed(1));

    values[conversion.to] = round((values[conversion.to] ?? 0) + granted);
    updates[conversion.to] = round((updates[conversion.to] ?? 0) + granted);
  }
};

import { StatName } from '@/lib/constants/statMappings';

/**
 * Always-on stat conversions.
 *
 * A conversion is a kit clause that derives one panel stat from another with no
 * trigger, no stack and no sequence gate: "For every 1000 points of Max HP,
 * Jingran gains 36 additional ATK, up to 1800". The game shows these on the
 * character panel, because a panel is read out of combat and a conversion is
 * already true there. Only conversions whose target is a panel stat belong here. Sigrika's Energy
 * Regen to Echo Skill DMG clause is declared on the lb side alone, because Echo
 * Skill DMG Bonus is not a stat the editor panel displays
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

/** The amount one conversion awards for a source value. */
export const statConversionGrant = (conversion: StatConversion, from: number): number => {
  if (conversion.per <= 0) return 0;
  const excess = from - (conversion.floor ?? 0);
  if (excess <= 0) return 0;
  const granted = (excess / conversion.per) * conversion.value;
  return conversion.cap !== undefined && granted > conversion.cap ? conversion.cap : granted;
};

const BASE_STAT_TARGETS = new Set<StatName>(['HP', 'ATK', 'DEF']);

/**
 * Adds every conversion a character declares on top of a finished panel.
 *
 * Runs as one pass after all stats are resolved, reading sources from `values`
 * as they stood before any conversion applied, so two clauses off the same
 * source (Jingran's are both off Max HP) do not depend on declaration order.
 * `values` and `updates` are mutated in place; `updates` is the "from gear"
 * delta the editor shows next to each stat, and a conversion belongs in it for
 * the same reason it belongs on the panel.
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

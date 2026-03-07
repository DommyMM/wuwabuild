/**
 * Roll Value (RV) Calculation System
 * 
 * Calculates the efficiency of echo substats based on their roll values
 * compared to the maximum possible rolls from Substats.json.
 */

/**
 * Calculate the roll value percentage for a single substat
 * 
 * @param statType - The substat type (e.g., "Crit Rate", "ATK%")
 * @param value - The actual value of the substat
 * @param substatValues - Array of possible roll values from Substats.json
 * @returns The percentage of maximum possible value (0-100)
 */
export function calculateSubstatRollPercentage(
  statType: string,
  value: number,
  substatValues: number[] | null
): number {
  if (!substatValues || substatValues.length === 0) {
    return 0;
  }

  const maxRoll = Math.max(...substatValues);
  if (maxRoll === 0) {
    return 0;
  }

  return (value / maxRoll) * 100;
}

/**
 * Calculate the overall Roll Value (RV) for selected substats
 * 
 * @param selectedSubstats - Map of substat type to total value
 * @param getSubstatValues - Function to retrieve possible roll values from Substats.json
 * @returns Total RV percentage across all selected substats
 */
export function calculateOverallRV(
  selectedSubstats: Map<string, number>,
  getSubstatValues: (stat: string) => number[] | null
): number {
  if (selectedSubstats.size === 0) {
    return 0;
  }

  let totalPercentage = 0;

  for (const [statType, totalValue] of selectedSubstats.entries()) {
    const substatValues = getSubstatValues(statType);
    const percentage = calculateSubstatRollPercentage(statType, totalValue, substatValues);
    totalPercentage += percentage;
  }

  // Average the percentages across all selected substats
  return totalPercentage / selectedSubstats.size;
}

/**
 * Get the default preferred substats for RV calculation
 * Fallback when character has no preferredStats defined
 */
export const DEFAULT_PREFERRED_STATS = ["Crit Rate", "Crit DMG", "Energy Regen"];

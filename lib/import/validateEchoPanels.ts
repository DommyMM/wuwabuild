import type { Echo, EchoPanelState } from '@/lib/echo';
import { isEchoSetIdLegal } from './echoMatching';

interface ValidateImportedEchoPanelsArgs {
  echoPanels: EchoPanelState[];
  getEcho: (id: string | null) => Echo | null;
  getMainStatsByCost: (cost: number | null) => { [statName: string]: [number, number] };
  getSubstatValues: (stat: string) => number[] | null;
}

function isCloseToAllowedRoll(value: number, allowedValues: number[]): boolean {
  return allowedValues.some((allowed) => Math.abs(value - allowed) < 0.05);
}

export function validateImportedEchoPanels({
  echoPanels,
  getEcho,
  getMainStatsByCost,
  getSubstatValues,
}: ValidateImportedEchoPanelsArgs): string[] {
  const violations: string[] = [];

  echoPanels.forEach((panel, index) => {
    if (!panel.id) return;

    const echo = getEcho(panel.id);
    if (!echo) {
      violations.push(`Echo ${index + 1}: unknown echo ID "${panel.id}".`);
      return;
    }

    const selectedSetId = panel.resolvedSetId;
    if (selectedSetId !== null) {
      if (!isEchoSetIdLegal(echo, selectedSetId)) {
        violations.push(`Echo ${index + 1}: ${echo.name} cannot use set ${selectedSetId}.`);
      }
    }

    const mainStatType = panel.stats.mainStat.type;
    if (mainStatType) {
      const validMainStats = getMainStatsByCost(echo.cost);
      if (Object.keys(validMainStats).length > 0 && !validMainStats[mainStatType]) {
        violations.push(`Echo ${index + 1}: ${mainStatType} is not a valid main stat for a cost-${echo.cost} echo.`);
      }
    }

    const filledSubstats = panel.stats.subStats.filter((sub) => sub.type);
    if (filledSubstats.length > 5) {
      violations.push(`Echo ${index + 1}: too many substats.`);
    }

    const seen = new Set<string>();
    filledSubstats.forEach((sub) => {
      const statType = sub.type;
      if (!statType) return;

      if (seen.has(statType)) {
        violations.push(`Echo ${index + 1}: duplicate ${statType} substat.`);
        return;
      }
      seen.add(statType);

      const allowedValues = getSubstatValues(statType);
      if (!allowedValues?.length) {
        violations.push(`Echo ${index + 1}: ${statType} is not a valid substat.`);
        return;
      }

      if (typeof sub.value === 'number' && !isCloseToAllowedRoll(sub.value, allowedValues)) {
        violations.push(`Echo ${index + 1}: ${sub.value.toFixed(1)} is not a valid ${statType} roll.`);
      }
    });
  });

  return violations;
}

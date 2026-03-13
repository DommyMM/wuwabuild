const ECHO_SUBSTAT_SHORT_LABELS: Record<string, string> = {
  'Basic Attack DMG Bonus': 'Basic Attack Bonus',
  'Heavy Attack DMG Bonus': 'Heavy Attack Bonus',
  'Resonance Skill DMG Bonus': 'Res. Skill Bonus',
  'Resonance Liberation DMG Bonus': 'Res. Liberation Bonus',
};

export function getEchoSubstatShortLabel(statType: string | null | undefined): string {
  if (!statType) return '';
  const trimmed = statType.trim();
  return ECHO_SUBSTAT_SHORT_LABELS[trimmed] ?? trimmed;
}

const ECHO_SUBSTAT_SHORT_LABELS: Record<string, string> = {
  'Basic Attack DMG Bonus': 'Basic Attack',
  'Heavy Attack DMG Bonus': 'Heavy Attack',
  'Resonance Skill DMG Bonus': 'Res. Skill',
  'Resonance Liberation DMG Bonus': 'Res. Liberation',
};

export function getEchoSubstatShortLabel(statType: string | null | undefined): string {
  if (!statType) return '';
  const trimmed = statType.trim();
  return ECHO_SUBSTAT_SHORT_LABELS[trimmed] ?? trimmed;
}

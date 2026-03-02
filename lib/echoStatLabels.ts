const ECHO_STAT_ALIASES: Record<string, string> = {
  'Basic Attack': 'Basic Attack DMG Bonus',
  'Heavy Attack': 'Heavy Attack DMG Bonus',
  'Skill': 'Resonance Skill DMG Bonus',
  'Resonance Skill': 'Resonance Skill DMG Bonus',
  'Liberation': 'Resonance Liberation DMG Bonus',
  'Resonance Liberation': 'Resonance Liberation DMG Bonus',
};

const ECHO_SUBSTAT_SHORT_LABELS: Record<string, string> = {
  'Resonance Skill DMG Bonus': 'Res. Skill DMG Bonus',
  'Resonance Liberation DMG Bonus': 'Res. Liberation DMG Bonus',
};

export function normalizeEchoStatName(statType: string | null | undefined): string | null {
  if (!statType) return null;
  const normalized = statType.trim();
  if (!normalized) return null;
  return ECHO_STAT_ALIASES[normalized] ?? normalized;
}

export function getEchoSubstatShortLabel(statType: string | null | undefined): string {
  const normalized = normalizeEchoStatName(statType);
  if (!normalized) return '';
  return ECHO_SUBSTAT_SHORT_LABELS[normalized] ?? normalized;
}


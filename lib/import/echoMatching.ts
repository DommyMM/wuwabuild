import Fuse from 'fuse.js';
import type { Echo, EchoPanelState, ElementType } from '@/lib/echo';
import type { EchoOCRData } from './types';
import { isPercentStat } from '@/lib/constants/statMappings';

export interface GameDataArgs {
  echoes: Echo[];
  mainStats: Record<string, Record<string, [number, number]>>;  // cost → stat → [min,max]
  substats: Record<string, number[]>;                            // stat → possible values
}

// ─── Stat name normalisation ─────────────────────────────────────────────────

/** Common OCR substitutions to fix before fuzzy matching */
const OCR_FIXES: Array<[RegExp, string]> = [
  [/ATKON/gi, 'ATK'],
  [/BMG/gi,   'DMG'],
  [/\bHPs\b/gi, 'HP'],
  [/Crit\s*Rat[e3]/gi, 'Crit Rate'],
  [/Crit\s*DM[G9]/gi,  'Crit DMG'],
  [/Energ[y\/]?\s*Regen/gi, 'Energy Regen'],
  [/Healin[g9]\s*Bonus/gi, 'Healing Bonus'],
  [/Resonan[c]e\s*Skill/gi, 'Resonance Skill DMG Bonus'],
  [/Resonan[c]e\s*Lib[e3]ration/gi, 'Resonance Liberation DMG Bonus'],
  [/Bas[i1]c\s*Attack\s*DMG/gi, 'Basic Attack DMG Bonus'],
  [/H[e3]avy\s*Attack\s*DMG/gi, 'Heavy Attack DMG Bonus'],
];

function normalizeStatName(raw: string): string {
  let s = raw.trim().replace(/[*~]/g, '');
  for (const [re, fix] of OCR_FIXES) {
    s = s.replace(re, fix);
  }
  return s.trim();
}

// ─── Element normalisation ────────────────────────────────────────────────────

const ELEMENT_ALIASES: Record<string, ElementType> = {
  'attack': 'Attack',
  'er': 'ER',
  'energy regen': 'ER',
  'healing': 'Healing',
  'empyrean': 'Empyrean',
  'frosty': 'Frosty',
  'midnight': 'Midnight',
  'radiance': 'Radiance',
  'tidebreaking': 'Tidebreaking',
  'gust': 'Gust',
  'windward': 'Windward',
  'flaming': 'Flaming',
  'dream': 'Dream',
  'crown': 'Crown',
  'law': 'Law',
  'flamewing': 'Flamewing',
  'thread': 'Thread',
  'pact': 'Pact',
  'halo': 'Halo',
  'rite': 'Rite',
  'trailblazing': 'Trailblazing',
  'chromatic': 'Chromatic',
  'sound': 'Sound',
};

function normalizeElement(raw: string): ElementType | null {
  const lower = raw.toLowerCase().trim();
  if (ELEMENT_ALIASES[lower]) return ELEMENT_ALIASES[lower];
  // Capitalise first letter for simple elements (Aero, Glacio, etc.)
  const capitalised = lower.charAt(0).toUpperCase() + lower.slice(1);
  return capitalised as ElementType;
}

// ─── Fuzzy echo matching ──────────────────────────────────────────────────────

function fuzzyMatchEcho(name: string, echoes: Echo[]): Echo | null {
  const fuse = new Fuse(echoes, {
    keys: ['name'],
    threshold: 0.4,
    includeScore: true,
  });
  const results = fuse.search(name);
  return results.length > 0 ? results[0].item : null;
}

// ─── Fuzzy stat matching ──────────────────────────────────────────────────────

function fuzzyMatchStatName(raw: string, validStats: string[]): string | null {
  const fuse = new Fuse(validStats, { threshold: 0.75 });
  const results = fuse.search(raw);
  return results.length > 0 ? results[0].item : null;
}

// ─── Value resolution ─────────────────────────────────────────────────────────

function closestSubstatValue(target: number, values: number[]): number {
  return values.reduce((best, v) =>
    Math.abs(v - target) < Math.abs(best - target) ? v : best
  );
}

function parseStatValue(raw: string): number {
  const clean = raw.replace(/[%,\s]/g, '');
  return parseFloat(clean) || 0;
}

function calculateMainStatValue(min: number, max: number, level = 25): number {
  return min + ((max - min) * level / 25);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function matchEchoData(
  ocrData: EchoOCRData,
  gameData: GameDataArgs
): EchoPanelState | null {
  const { echoes, mainStats, substats } = gameData;

  // Phantom echo detection
  let rawName = ocrData.name.name.trim();
  let phantom = false;
  if (rawName.startsWith('Phantom ')) {
    phantom = true;
    rawName = rawName.slice('Phantom '.length);
  }

  // Fuzzy match echo
  const echo = fuzzyMatchEcho(rawName, echoes);
  if (!echo) return null;

  // Element/set resolution
  let selectedElement: ElementType | null = null;
  if (ocrData.element) {
    const normalised = normalizeElement(ocrData.element);
    // Verify the element is valid for this echo
    if (normalised && echo.elements.includes(normalised)) {
      selectedElement = normalised;
    } else if (echo.elements.length > 0) {
      selectedElement = echo.elements[0];
    }
  } else if (echo.elements.length > 0) {
    selectedElement = echo.elements[0];
  }

  // Main stat
  const costKey = String(echo.cost);
  const costMainStats = mainStats[costKey] ?? {};
  const validMainStatNames = Object.keys(costMainStats);

  let mainStatType: string | null = null;
  let mainStatValue: number | null = null;

  if (ocrData.main?.name) {
    const normalised = normalizeStatName(ocrData.main.name);
    // Try exact match first
    if (costMainStats[normalised]) {
      mainStatType = normalised;
    } else {
      mainStatType = fuzzyMatchStatName(normalised, validMainStatNames);
    }
    if (mainStatType && costMainStats[mainStatType]) {
      const [min, max] = costMainStats[mainStatType];
      mainStatValue = Math.round(calculateMainStatValue(min, max, 25) * 100) / 100;
    }
  }

  // Substats
  const allSubstatKeys = Object.keys(substats);
  const subStats: Array<{ type: string | null; value: number | null }> = [];

  for (const sub of ocrData.substats.slice(0, 5)) {
    if (!sub?.name) {
      subStats.push({ type: null, value: null });
      continue;
    }
    const normalised = normalizeStatName(sub.name);
    let statType: string | null = null;
    if (substats[normalised]) {
      statType = normalised;
    } else {
      statType = fuzzyMatchStatName(normalised, allSubstatKeys);
    }

    let statValue: number | null = null;
    if (statType && substats[statType]) {
      const raw = parseStatValue(sub.value);
      // Convert percentage display to decimal if needed
      const adjustedRaw = isPercentStat(statType) ? raw : raw;
      statValue = closestSubstatValue(adjustedRaw, substats[statType]);
    }

    subStats.push({ type: statType, value: statValue });
  }

  // Pad to 5 substats
  while (subStats.length < 5) {
    subStats.push({ type: null, value: null });
  }

  return {
    id: echo.id,
    level: 25,
    selectedElement,
    stats: {
      mainStat: { type: mainStatType, value: mainStatValue },
      subStats,
    },
    phantom,
  };
}

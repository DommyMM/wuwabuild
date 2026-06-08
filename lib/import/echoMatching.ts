import type { Echo, EchoPanelState, ElementType } from '@/lib/echo';
import type { EchoOCRData } from './types';

const FETTER_ID_BY_ELEMENT: Partial<Record<ElementType, number>> = {
  Glacio: 1,
  Fusion: 2,
  Electro: 3,
  Aero: 4,
  Spectro: 5,
  Havoc: 6,
};

const EXTRA_OCR_SET_IDS_BY_ECHO_ID: Record<string, ReadonlySet<number>> = {
  // Hecate can be selected from weekly challenge boxes on the six elemental sets.
  '60000855': new Set([1, 2, 3, 4, 5, 6]),
};

export interface GameDataArgs {
  echoes: Echo[];
}

function parseValue(raw: string): number | null {
  const n = parseFloat(raw.replace(/[%,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function normalizeStatName(rawName: string | null | undefined): string | null {
  if (!rawName) return null;
  const name = rawName.replace(/\s+/g, ' ').trim();
  return name || null;
}

export function matchEchoData(
  ocrData: EchoOCRData,
  gameData: GameDataArgs
): EchoPanelState | null {
  const { echoes } = gameData;

  let phantom = false;

  // ID lookup (primary, backend provides CDN id directly)
  const echoId = ocrData.name.id;
  let echo: Echo | null = echoId ? (echoes.find(e => String(e.id) === echoId) ?? null) : null;

  // Name-based fallback (handles Phantom prefix, Nightmare prefix, etc.)
  if (!echo) {
    let rawName = ocrData.name.name.trim();
    if (rawName.startsWith('Phantom ')) {
      phantom = true;
      rawName = rawName.slice('Phantom '.length);
    }
    echo =
      echoes.find(e => e.name === rawName) ??
      echoes.find(e => e.name.toLowerCase() === rawName.toLowerCase()) ??
      null;
    if (!echo) {
      const spaceIdx = rawName.indexOf(' ');
      if (spaceIdx !== -1) {
        const stripped = rawName.slice(spaceIdx + 1);
        echo = echoes.find(e => e.name === stripped) ?? null;
      }
    }
  }

  if (!echo) return null;

  // Element, backend already validated; fall back to echo's first available element
  let selectedElement: ElementType | null = null;
  const ocrElement = ocrData.element;
  let resolvedSetId: number | null = null;
  if (ocrElement && ocrElement !== 'Unknown') {
    const el = ocrElement as ElementType;
    const ocrSetId = FETTER_ID_BY_ELEMENT[el] ?? null;
    const isKnownElement = echo.elements.includes(el);
    const isExtraLegalSet = ocrSetId !== null && EXTRA_OCR_SET_IDS_BY_ECHO_ID[echo.id]?.has(ocrSetId);
    selectedElement = isKnownElement || isExtraLegalSet ? el : (echo.elements[0] ?? null);
    resolvedSetId = isKnownElement || isExtraLegalSet ? ocrSetId : null;
  } else {
    selectedElement = echo.elements[0] ?? null;
  }

  // Main stat names are canonical from backend OCR output.
  const mainStatType  = normalizeStatName(ocrData.main?.name);
  const mainStatValue = ocrData.main?.value ? parseValue(ocrData.main.value) : null;

  // Substats names are canonical from backend OCR output.
  const subStats = ocrData.substats.slice(0, 5).map(sub => ({
    type:  normalizeStatName(sub?.name),
    value: sub?.value ? parseValue(sub.value) : null,
  }));
  while (subStats.length < 5) subStats.push({ type: null, value: null });

  return {
    id: echo.id,
    level: 25,
    selectedElement,
    resolvedSetId,
    stats: {
      mainStat: { type: mainStatType, value: mainStatValue },
      subStats,
    },
    phantom,
  };
}

import type { Echo, EchoPanelState, ElementType } from '@/lib/echo';
import type { EchoOCRData } from './types';

export interface GameDataArgs {
  echoes: Echo[];
  mainStats: Record<string, Record<string, [number, number]>>;  // unused now but kept for API compat
  substats: Record<string, number[]>;                            // unused now but kept for API compat
}

function findEchoByName(name: string, echoes: Echo[]): Echo | null {
  return (
    echoes.find(e => e.name === name) ??
    echoes.find(e => e.name.toLowerCase() === name.toLowerCase()) ??
    null
  );
}

function parseValue(raw: string): number | null {
  const n = parseFloat(raw.replace(/[%,\s]/g, ''));
  return isNaN(n) ? null : n;
}

export function matchEchoData(
  ocrData: EchoOCRData,
  gameData: GameDataArgs
): EchoPanelState | null {
  const { echoes } = gameData;

  let rawName = ocrData.name.name.trim();
  let phantom = false;

  // Phantom prefix → alternate skin, same underlying echo
  if (rawName.startsWith('Phantom ')) {
    phantom = true;
    rawName = rawName.slice('Phantom '.length);
  }

  // Try exact name first; if missing (e.g. "Nightmare X"), strip any leading word and retry
  let echo = findEchoByName(rawName, echoes);
  if (!echo) {
    const spaceIdx = rawName.indexOf(' ');
    if (spaceIdx !== -1) {
      echo = findEchoByName(rawName.slice(spaceIdx + 1), echoes);
    }
  }
  if (!echo) return null;

  // Element — backend already validated; fall back to echo's first available element
  let selectedElement: ElementType | null = null;
  const ocrElement = ocrData.element;
  if (ocrElement && ocrElement !== 'Unknown') {
    const el = ocrElement as ElementType;
    selectedElement = echo.elements.includes(el) ? el : (echo.elements[0] ?? null);
  } else {
    selectedElement = echo.elements[0] ?? null;
  }

  // Main stat — name and value already normalised by backend
  const mainStatType  = ocrData.main?.name  || null;
  const mainStatValue = ocrData.main?.value ? parseValue(ocrData.main.value) : null;

  // Substats — names and values already normalised/validated by backend
  const subStats = ocrData.substats.slice(0, 5).map(sub => ({
    type:  sub?.name  || null,
    value: sub?.value ? parseValue(sub.value) : null,
  }));
  while (subStats.length < 5) subStats.push({ type: null, value: null });

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

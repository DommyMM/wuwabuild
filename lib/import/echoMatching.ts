import type { Echo, EchoPanelState, ElementType } from '@/lib/echo';
import type { EchoOCRData } from './types';

export interface GameDataArgs {
  echoes: Echo[];
  mainStats: Record<string, Record<string, [number, number]>>;  // unused now but kept for API compat
  substats: Record<string, number[]>;                            // unused now but kept for API compat
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

  let phantom = false;

  // ID lookup (primary — backend provides CDN id directly)
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

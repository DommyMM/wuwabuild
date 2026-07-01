import type { Echo, EchoPanelState } from '@/lib/echo';
import type { EchoOCRData } from './types';

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

  // Set id — backend resolves the fetter id directly. Accept it when it's one of
  // the echo's legal sets (or a weekly-box extra, e.g. Hecate); otherwise fall
  // back to the echo's first legal set.
  const ocrSetId = typeof ocrData.setId === 'number' ? ocrData.setId : null;
  const fallbackSetId = echo.fetterIds[0] ?? null;
  const ocrSetIdLegal =
    ocrSetId !== null &&
    (echo.fetterIds.includes(ocrSetId) || (EXTRA_OCR_SET_IDS_BY_ECHO_ID[echo.id]?.has(ocrSetId) ?? false));
  const resolvedSetId: number | null = ocrSetIdLegal ? ocrSetId : fallbackSetId;

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
    resolvedSetId,
    stats: {
      mainStat: { type: mainStatType, value: mainStatValue },
      subStats,
    },
    phantom,
  };
}

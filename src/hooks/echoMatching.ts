import { OCRData } from '@/types/ocr';
import { EchoPanelState, ElementType, PHANTOM_ECHOES } from '@/types/echo';
import Fuse from 'fuse.js';
import { cachedEchoes } from './useEchoes';
import { mainStatsCache } from './useMain';
import { substatsCache } from './useSub';

interface SubstatData {
  name: string;
  value: string;
}

type SubstatsData = Record<string, number[]>;

const fuseOptions = {
  keys: ['name'],
  threshold: 0.3,
  ignoreLocation: true,
  shouldSort: true
};

function detectPhantomEcho(name: string): { isPhantom: boolean, baseName: string } {
  if (name.toLowerCase().startsWith("phantom ")) {
    const baseName = name.substring(8); // "Phantom ".length = 8
    const isValidPhantom = PHANTOM_ECHOES.includes(baseName);
    return { isPhantom: isValidPhantom, baseName };
  }
  return { isPhantom: false, baseName: name };
}

export const matchEchoData = (
  ocrData: Extract<OCRData, { type: 'Echo' }>
): EchoPanelState | null => {
  try {
    if (!substatsCache.data || !mainStatsCache.data || !cachedEchoes) return null;

    const { isPhantom, baseName } = detectPhantomEcho(ocrData.name);

    const exactMatch = cachedEchoes.find(e => 
      e.name.toLowerCase() === baseName.toLowerCase()
    );

    let foundEcho = exactMatch;
    if (!foundEcho) {
      const fuse = new Fuse(cachedEchoes, fuseOptions);
      const results = fuse.search(baseName);
      if (results.length > 0 && (results[0].score === undefined || results[0].score < 0.3)) {
        foundEcho = results[0].item;
        console.log('Found fuzzy match:', foundEcho.name);
      }
    }

    if (!foundEcho) return null;

    const mainStats = mainStatsCache.data[`${foundEcho.cost}cost`]?.mainStats || {};
    let searchMainStat = ocrData.main.name;
    if (['HP', 'ATK', 'DEF'].includes(searchMainStat)) {
      searchMainStat = `${searchMainStat}%`;
    }

    const matchedMainStat = Object.keys(mainStats).find(stat => 
      searchMainStat.toLowerCase().includes(stat.toLowerCase())
    ) || null;

    const mainStatValue = matchedMainStat ? 
      mainStatsCache.calculateValue(
        mainStats[matchedMainStat][0], 
        mainStats[matchedMainStat][1], 
        ocrData.echoLevel
      ) : null;

    const matchedSubstats = ocrData.subs
      .map(substat => matchSubstat(substat, substatsCache.data!))
      .filter(result => result.type !== null);

    const normalizeElement = (element: string): ElementType => {
      if (element.toLowerCase() === 'er') return 'ER';
      return element.charAt(0).toUpperCase() + element.slice(1) as ElementType;
    };

    return {
      id: foundEcho.id,
      level: ocrData.echoLevel,
      selectedElement: normalizeElement(ocrData.element),
      stats: {
        mainStat: { 
          type: matchedMainStat,
          value: mainStatValue 
        },
        subStats: [
          ...matchedSubstats,
          ...Array(5 - matchedSubstats.length).fill({ type: null, value: null })
        ]
      },
      phantom: isPhantom
    };
  } catch (error) {
    console.error('Error matching echo data:', error);
    return null;
  }
};

export const findClosestValue = (target: number, values: number[]): number => {
  return values.reduce((prev, curr) => 
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
  );
};

export const matchSubstat = (
  substat: SubstatData, 
  substatsData: SubstatsData
) => {
  const numberValue = parseFloat(substat.value.replace('%', ''));
  const isPercentage = substat.value.includes('%');

  let searchStatName = substat.name
    .replace(/[*~\s]+/g, ' ')
    .replace(/ATKON/g, 'ATK')
    .replace(/BMG/g, 'DMG')
    .trim();

  if (['HP', 'ATK', 'DEF'].includes(searchStatName) && isPercentage) {
    searchStatName = `${searchStatName}%`;
  }

  const validSubstats = Object.keys(substatsData);
  
  let matchedStatName = validSubstats.find(stat => 
    searchStatName.toLowerCase() === stat.toLowerCase()
  );

  if (!matchedStatName) {
      const fuseOptions = {
        threshold: 0.75,
        ignoreLocation: true,
        shouldSort: true,
        includeScore: true
      };
      const fuse = new Fuse(validSubstats.map(name => ({ name })), {
        ...fuseOptions,
        keys: ['name']
      });
      
      const results = fuse.search(searchStatName);
      if (results.length > 0 && results[0].score! < 0.75) {
        matchedStatName = results[0].item.name;
      }
    }
  
    if (!matchedStatName) {
      console.log('Failed to match substat:', { 
        original: substat.name,
        searched: searchStatName,
        value: substat.value 
      });
      return { type: null, value: null };
    }
  
    const validValues = substatsData[matchedStatName];
    const matchedValue = findClosestValue(numberValue, validValues);
    return { type: matchedStatName, value: matchedValue };
  };
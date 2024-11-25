import { OCRData } from '../types/ocr';
import { Echo, EchoPanelState, ElementType, COST_SECTIONS } from '../types/echo';

interface SubstatData {
  name: string;
  value: string;
}

interface MainStatData {
  [key: string]: {
    default: [string, number, number],
    mainStats: {
      [statName: string]: [number, number]
    }
  }
}

export const matchEchoData = (
    ocrData: Extract<OCRData, { type: 'Echo' }>,
    echoesByCost: Record<number, Echo[]>,
    mainStatsData: MainStatData | null,
    substatsData: Record<string, number[]> | null,
    calculateValue: (min: number, max: number, level: number) => number
  ): EchoPanelState | null => {
    if (!substatsData || !mainStatsData) return null;
  
    let foundEcho: Echo | null = null;
    for (const cost of COST_SECTIONS) {
      foundEcho = echoesByCost[cost]?.find(e => 
        e.name.toLowerCase() === ocrData.name.toLowerCase()
      ) ?? null;
      if (foundEcho) break;
    }
    if (!foundEcho) return null;
  
    const mainStats = mainStatsData[`${foundEcho.cost}cost`]?.mainStats || {};
    let searchMainStat = ocrData.mainStat.name;
    if (['HP', 'ATK', 'DEF'].includes(searchMainStat)) {
      searchMainStat = `${searchMainStat}%`;
    }
  
    const matchedMainStat = Object.keys(mainStats).find(stat => 
      searchMainStat.toLowerCase().includes(stat.toLowerCase())
    ) || null;
  
    const mainStatValue = matchedMainStat ? 
      calculateValue(mainStats[matchedMainStat][0], mainStats[matchedMainStat][1], ocrData.echoLevel) : 
      null;
  
    const matchedSubstats = ocrData.subs
      .map(substat => matchSubstat(substat, substatsData))
      .filter(result => result.type !== null);
  
    return {
      echo: foundEcho,
      level: ocrData.echoLevel,
      selectedElement: (ocrData.element.charAt(0).toUpperCase() + 
                       ocrData.element.slice(1)) as ElementType,
      stats: {
        mainStat: { 
          type: matchedMainStat,
          value: mainStatValue 
        },
        subStats: [
          ...matchedSubstats,
          ...Array(5 - matchedSubstats.length).fill({ type: null, value: null })
        ]
      }
    };
  };

  const findClosestValue = (target: number, values: number[]): number => {
    return values.reduce((prev, curr) => 
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
  };
  
  const matchSubstat = (substat: SubstatData, substatsData: any) => {
    const numberValue = parseFloat(substat.value.replace('%', ''));
    const isPercentage = substat.value.includes('%');
    
    let searchStatName = substat.name;
    if (['HP', 'ATK', 'DEF'].includes(searchStatName) && isPercentage) {
      searchStatName = `${searchStatName}%`;
    }
    if (searchStatName.startsWith('Resonance ')) {
      searchStatName = searchStatName.replace('Resonance ', '');
    }
  
    const validSubstats = Object.keys(substatsData);
    const matchedStatName = validSubstats.find(stat => 
      searchStatName.toLowerCase() === stat.toLowerCase()
    );
  
    if (!matchedStatName) {
      console.log('Failed to match substat:', { 
        original: substat.name,
        searched: searchStatName,
        value: substat.value 
      });
    }
  
    if (matchedStatName) {
      const validValues = substatsData[matchedStatName];
      const matchedValue = findClosestValue(numberValue, validValues);
      return { type: matchedStatName, value: matchedValue };
    }
  
    return { type: null, value: null };
  };
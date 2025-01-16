import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StatName, BaseStatName, getPercentVariant } from '../types/stats';
import { Character } from '../types/character';
import { Weapon, ScaledStats } from '../types/weapon';
import { useCharacterCurves } from './useCharacterCurves';
import { EchoPanelState, ELEMENT_SETS, ElementType, ECHO_BONUSES } from '../types/echo';
import { getCachedEchoes } from './useEchoes';

export interface StatsData {
  stats: StatName[];
}

export interface StatState {
  values: Record<StatName, number>;
  updates: Record<StatName, number>;
  baseValues: Record<StatName, number>;
}

export interface UseStatsProps {
  character: Character | null;
  level: string;
  weapon: Weapon | null;
  weaponStats?: ScaledStats;
  echoPanels?: EchoPanelState[];
  nodeStates: Record<string, Record<string, boolean>>;
  isSpectro?: boolean;
}

export const SET_TO_STAT_MAPPING = {
  'Sierra Gale': 'Aero DMG',
  'Moonlit Clouds': 'Energy Regen',
  'Void Thunder': 'Electro DMG',
  'Celestial Light': 'Spectro DMG',
  'Freezing Frost': 'Glacio DMG',
  'Lingering Tunes': 'ATK%',
  'Molten Rift': 'Fusion DMG',
  'Sun-sinking Eclipse': 'Havoc DMG',
  'Rejuvenating Glow': 'Healing Bonus',
  'Midnight Veil': 'Havoc DMG',
  'Empyrean Anthem': 'Energy Regen',
  'Tidebreaking Courage': 'Energy Regen',
  'Frosty Resolve': 'Resonance Skill DMG Bonus',
  'Eternal Radiance': 'Spectro DMG'
} as const;

export const initialStatState: StatState = {
  values: {} as Record<StatName, number>,
  updates: {} as Record<StatName, number>,
  baseValues: {} as Record<StatName, number>
};

export const calculateEchoDefaultStat = (cost: number, level: number): number => {
  const normalLevels = Math.floor(level - Math.floor(level/5));
  const bonusLevels = Math.floor(level/5);
  
  switch(cost) {
    case 4:
      return 30 + (normalLevels * 4.5) + (bonusLevels * 6);
    case 3:
      return 20 + (normalLevels * 3) + (bonusLevels * 4);
    case 1:
      if (level === 0) return 456;
      return 456 + 72 + ((level - 1) * 73);
    default:
      return 0;
  }
};

export const sumEchoDefaultStats = (echoPanels: EchoPanelState[]): { atk: number; hp: number } => {
  let totalATK = 0;
  let totalHP = 0;
  
  echoPanels.forEach(panel => {
    if (!panel.id || panel.level === undefined) return;
    const echo = getCachedEchoes(panel.id);
    if (!echo) return;

    const defaultStat = calculateEchoDefaultStat(echo.cost, panel.level);
    if (echo.cost === 4 || echo.cost === 3) {
      totalATK += defaultStat;
    } else if (echo.cost === 1) {
      totalHP += defaultStat;
    }
  });

  return { atk: totalATK, hp: totalHP };
};

export const calculateForteBonus = (
  character: Character,
  nodeStates: Record<string, Record<string, boolean>>,
  isSpectro?: boolean
) => {
  const baseValue1 = character.Bonus1 === 'Crit Rate' ? 4.0 : character.Bonus1 === 'Crit DMG' ? 8.0 : 6.0;
  const baseValue2 = character.Bonus2 === 'DEF' ? 7.6 : 6.0;

  let bonus1Total = 0;
  let bonus2Total = 0;

  ['tree1', 'tree2', 'tree4', 'tree5'].forEach(tree => {
    const nodes = nodeStates[tree] || {};
    if (['tree1', 'tree5'].includes(tree)) {
      if (nodes.top) bonus1Total += baseValue1 * 0.7;
      if (nodes.middle) bonus1Total += baseValue1 * 0.3;
    } else {
      if (nodes.top) bonus2Total += baseValue2 * 0.7;
      if (nodes.middle) bonus2Total += baseValue2 * 0.3;
    }
  });

  const bonus1Type = character.name.startsWith('Rover') ? (isSpectro ? 'Spectro' : 'Havoc') : character.Bonus1;

  return { bonus1Total, bonus2Total, bonus1Type };
};

export const sumMainStats = (statType: StatName, panels: EchoPanelState[]): number => {
  return panels.reduce((total, panel) => {
    if (panel.stats.mainStat.type === statType && panel.stats.mainStat.value) {
      return total + panel.stats.mainStat.value;
    }
    return total;
  }, 0);
};

export const sumSubStats = (statType: StatName, panels: EchoPanelState[]): number => {
  return panels.reduce((total, panel) => (
    total + panel.stats.subStats.reduce((subTotal, stat) => {
      if (stat.type === statType && stat.value) {
        return subTotal + stat.value;
      }
      return subTotal;
    }, 0)
  ), 0);
};

export const getDisplayName = (stat: StatName): StatName => {
  switch(stat) {
    case 'Basic Attack': return 'Basic Attack DMG Bonus';
    case 'Heavy Attack': return 'Heavy Attack DMG Bonus';
    case 'Skill': return 'Resonance Skill DMG Bonus';
    case 'Liberation': return 'Resonance Liberation DMG Bonus';
    default: return stat;
  }
};

export const calculateCV = (echoPanels: EchoPanelState[]): number => {
  const critRate = sumMainStats('Crit Rate', echoPanels) + sumSubStats('Crit Rate', echoPanels);
  const critDmg = sumMainStats('Crit DMG', echoPanels) + sumSubStats('Crit DMG', echoPanels);
  return 2 * critRate + critDmg;
};

let statsDataCache: StatsData | null = null;

export const getStatsData = async () => {
    if (statsDataCache) return statsDataCache;
    
    const response = await fetch('/Data/Stats.json');
    const data = await response.json();
    statsDataCache = data;
    return data;
};

export const useStats = ({
  character,
  level,
  weapon,
  weaponStats,
  echoPanels = [],
  nodeStates,
  isSpectro
}: UseStatsProps) => {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statState, setStatState] = useState<StatState>(initialStatState);
  const prevValuesRef = useRef<string>('');

  const { scaleStat, loading: curveLoading } = useCharacterCurves();

  const baseStats = useMemo(() => {
    if (!character) return null;
    
    const levelNum = parseInt(level) || 1;
    const characterAtk = scaleStat(character.ATK, levelNum, 'ATK');
    const weaponAtk = weaponStats?.scaledAtk ?? 0;
    
    return {
      levelNum,
      baseHP: scaleStat(character.HP, levelNum, 'HP'),
      baseATK: characterAtk + weaponAtk,
      baseDEF: scaleStat(character.DEF, levelNum, 'DEF')
    };
  }, [character, level, weaponStats?.scaledAtk, scaleStat]);

  const { elementCounts, atkPercentBonus } = useMemo(() => {
    const counts: Record<ElementType, number> = {} as Record<ElementType, number>;
    const usedEchoes = new Set();
    let bonus = 0;

    echoPanels.forEach(panel => {
      if (!panel.id) return;
      const echo = getCachedEchoes(panel.id);
      if (!echo || usedEchoes.has(echo.name)) return;

      const element = echo.elements.length === 1 ? 
        echo.elements[0] : panel.selectedElement;
      
      if (element) {
        counts[element] = (counts[element] || 0) + 1;
        usedEchoes.add(echo.name);
        
        if (element === 'Tidebreaking' && counts[element] === 5) {
          bonus = 15;
        } else if (element === 'Attack' && counts[element] >= 2) {
          bonus = 10;
        }
      }
    });

    return { elementCounts: counts, atkPercentBonus: bonus };
  }, [echoPanels]);

  const forteBonus = useMemo(() => {
    if (!character) return null;
    return calculateForteBonus(character, nodeStates, isSpectro);
  }, [character, nodeStates, isSpectro]);

  const echoStats = useMemo(() => {
    return sumEchoDefaultStats(echoPanels);
  }, [echoPanels]);

  const firstPanelId = echoPanels[0]?.id;
  const firstEcho = firstPanelId ? getCachedEchoes(firstPanelId) : null;
  const firstPanelBonus = useMemo(() => 
    firstEcho ? ECHO_BONUSES[firstEcho.name] : null, 
    [firstEcho]
  );

  const calculateStats = useCallback((stat: StatName) => {
    if (!character || !baseStats || !forteBonus) return null;

    const displayStat = getDisplayName(stat);
    const result = {
      value: 0,
      update: 0,
      baseValue: 0
    };

    if (['HP', 'ATK', 'DEF'].includes(displayStat)) {
      const baseStat = displayStat as BaseStatName;
      result.baseValue = displayStat === 'HP' ? baseStats.baseHP : displayStat === 'ATK' ? baseStats.baseATK : baseStats.baseDEF;
      const flat = sumMainStats(baseStat, echoPanels) + sumSubStats(baseStat, echoPanels) + (baseStat === 'HP' ? echoStats.hp : baseStat === 'ATK' ? echoStats.atk : 0);
      let percent = sumMainStats(getPercentVariant(baseStat), echoPanels) + sumSubStats(getPercentVariant(baseStat), echoPanels);
      
      if (weapon && weaponStats) {
        const percentStatName = `${displayStat}%`;
        if (weapon.main_stat === percentStatName) {
          percent += weaponStats.scaledMainStat;
        }
        if (weapon.passive === percentStatName) {
          percent += weaponStats.scaledPassive ?? 0;
        }
        if (displayStat === 'ATK') {
          percent += atkPercentBonus;
        }
      }
      if (character.Bonus2 === displayStat) {
        percent += forteBonus.bonus2Total;
      }
      result.value = Math.round(result.baseValue * (1 + percent/100)) + flat;
      result.update = result.value - result.baseValue;
    } else {
      result.baseValue = displayStat === 'Crit Rate' ? 5.0 : displayStat === 'Crit DMG' ? 150.0 : displayStat === 'Energy Regen' ? character.ER : 0;
      
      result.update = sumMainStats(stat, echoPanels) + sumSubStats(stat, echoPanels);
      
      if (firstPanelBonus) {
        const bonusForStat = firstPanelBonus.find(bonus => bonus.stat === displayStat);
        if (bonusForStat) {
          result.update += bonusForStat.value;
        }
      }
      
      if (weapon && weaponStats) {
        const weaponStatName = displayStat === 'Energy Regen' ? 'ER' : displayStat;
        
        if (weaponStatName === weapon.main_stat) {
          result.update += weaponStats.scaledMainStat;
        }
        
        if (weapon.passive === weaponStatName) {
          result.update += weaponStats.scaledPassive ?? 0;
        }
        
        if (weapon.passive2 === weaponStatName) {
          result.update += weaponStats.scaledPassive2 ?? 0;
        }
        
        if (weapon.passive === 'Attribute' && displayStat.endsWith('DMG')) {
          const element = displayStat.split(' ')[0];
          if (element === character.element) {
            result.update += weaponStats.scaledPassive ?? 0;
          }
        }
        
        Object.entries(elementCounts).forEach(([element, count]) => {
          if (count >= 2) {
            const setName = ELEMENT_SETS[element as ElementType];
            const statToUpdate = SET_TO_STAT_MAPPING[setName as keyof typeof SET_TO_STAT_MAPPING];
            if (statToUpdate === displayStat) {
              if (setName === 'Frosty Resolve' && displayStat === 'Resonance Skill DMG Bonus') {
                result.update += 12;
              } else {
                result.update += 10;
              }
            }
          }
        });
        if ((forteBonus.bonus1Type === 'Crit Rate' && displayStat === 'Crit Rate') || (forteBonus.bonus1Type === 'Crit DMG' && displayStat === 'Crit DMG') || 
            (forteBonus.bonus1Type === 'Healing' && displayStat === 'Healing Bonus') || (displayStat === `${forteBonus.bonus1Type} DMG`)) {
          result.update += forteBonus.bonus1Total;
        }
      }
      result.value = result.baseValue + result.update;
    }
    return result;
  }, [character, baseStats, weapon, weaponStats, echoPanels, elementCounts, atkPercentBonus, forteBonus, echoStats, firstPanelBonus]);

  const calculateCVValue = useCallback((): number => {
    return calculateCV(echoPanels);
  }, [echoPanels]);

  useEffect(() => {
    const controller = new AbortController();
    const loadStats = async () => {
      try {
        const data = await getStatsData();
        setStatsData(data);
      } catch (err) {
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!character || !statsData || curveLoading) return;

    try {
      const newValues = {} as Record<StatName, number>;
      const newUpdates = {} as Record<StatName, number>;
      const newBaseValues = {} as Record<StatName, number>;

      statsData.stats.forEach(stat => {
        const result = calculateStats(stat);
        if (result) {
          const displayStat = getDisplayName(stat);
          newValues[displayStat] = result.value;
          newUpdates[displayStat] = result.update;
          newBaseValues[displayStat] = result.baseValue;
        }
      });

      const newValuesString = JSON.stringify(newValues);
      const hasChanged = newValuesString !== prevValuesRef.current;
      
      if (hasChanged) {
        prevValuesRef.current = newValuesString;
        setStatState({ 
          values: newValues, 
          updates: newUpdates, 
          baseValues: newBaseValues 
        });
      }

      setLoading(false);
    } catch (err) {
      setError('Error calculating stats');
      setLoading(false);
    }
  }, [character, statsData, curveLoading, calculateStats]);

  return {
    loading,
    error,
    ...statState,
    cv: calculateCVValue()
  };
};
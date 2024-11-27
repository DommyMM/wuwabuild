import { useState, useEffect } from 'react';
import { StatName, BaseStatName, getPercentVariant } from '../types/stats';
import { Character } from '../types/character';
import { Weapon, ScaledWeaponStats } from '../types/weapon';
import { useCharacterCurves } from './useCharacterCurves';
import { EchoPanelState, ELEMENT_SETS, ElementType } from '../types/echo';

const SET_TO_STAT_MAPPING = {
  'Sierra Gale': 'Aero DMG',
  'Moonlit Clouds': 'Energy Regen',
  'Void Thunder': 'Electro DMG',
  'Celestial Light': 'Spectro DMG',
  'Freezing Frost': 'Glacio DMG',
  'Lingering Tunes': 'ATK%',
  'Molten Rift': 'Fusion DMG',
  'Sun-sinking Eclipse': 'Havoc DMG',
  'Rejuvenating Glow': 'Healing Bonus'
} as const;

const calculateEchoDefaultStat = (cost: number, level: number): number => {
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

const sumEchoDefaultStats = (echoPanels: EchoPanelState[]): { atk: number; hp: number } => {
  let totalATK = 0;
  let totalHP = 0;
  
  echoPanels.forEach(panel => {
    if (panel.echo && panel.level !== undefined) {
      const cost = panel.echo.cost;
      const defaultStat = calculateEchoDefaultStat(cost, panel.level);
      if (cost === 4 || cost === 3) {
        totalATK += defaultStat;
      } else if (cost === 1) {
        totalHP += defaultStat;
      }
    }
  });

  return { atk: totalATK, hp: totalHP };
};

interface StatsData {
  stats: StatName[];
}

interface StatState {
  values: Record<StatName, number>;
  updates: Record<StatName, number>;
  baseValues: Record<StatName, number>;
}

interface UseStatsProps {
  character: Character | null;
  level: string;
  weapon: Weapon | null;
  weaponStats?: ScaledWeaponStats;
  echoPanels?: EchoPanelState[];
  nodeStates: Record<string, Record<string, boolean>>;
  isSpectro?: boolean;
}

const initialStatState: StatState = {
  values: {} as Record<StatName, number>,
  updates: {} as Record<StatName, number>,
  baseValues: {} as Record<StatName, number>
};

const calculateForteBonus = (
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

const sumMainStats = (statType: StatName, panels: EchoPanelState[]): number => {
  return panels.reduce((total, panel) => {
    if (panel.stats.mainStat.type === statType && panel.stats.mainStat.value) {
      return total + panel.stats.mainStat.value;
    }
    return total;
  }, 0);
};

const sumSubStats = (statType: StatName, panels: EchoPanelState[]): number => {
  return panels.reduce((total, panel) => (
    total + panel.stats.subStats.reduce((subTotal, stat) => {
      if (stat.type === statType && stat.value) {
        return subTotal + stat.value;
      }
      return subTotal;
    }, 0)
  ), 0);
};

const getDisplayName = (stat: StatName): StatName => {
  switch(stat) {
    case 'Basic Attack': return 'Basic Attack DMG Bonus';
    case 'Heavy Attack': return 'Heavy Attack DMG Bonus';
    case 'Skill': return 'Resonance Skill DMG Bonus';
    case 'Liberation': return 'Resonance Liberation Bonus';
    default: return stat;
  }
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

  const { scaleStat, loading: curveLoading } = useCharacterCurves();

  useEffect(() => {
    const controller = new AbortController();
    const loadStats = async () => {
      try {
        const response = await fetch('/Data/Stats.json', {
          signal: controller.signal
        });
        const data = await response.json();
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
      const levelNum = parseInt(level) || 1;
      const characterAtk = scaleStat(character.ATK, levelNum, 'ATK');
      const weaponAtk = weaponStats?.scaledAtk ?? 0;
      const baseHP = scaleStat(character.HP, levelNum, 'HP');
      const baseATK = characterAtk + weaponAtk;
      const baseDEF = scaleStat(character.DEF, levelNum, 'DEF');

      const elementCounts: Record<ElementType, number> = {} as Record<ElementType, number>;
      const usedEchoes = new Set();
      let atkPercentBonus = 0;

      echoPanels.forEach(panel => {
        if (panel.echo && !usedEchoes.has(panel.echo.name)) {
          const element = panel.echo.elements.length === 1 ? panel.echo.elements[0] : panel.selectedElement;
          
          if (element) {
            elementCounts[element] = (elementCounts[element] || 0) + 1;
            usedEchoes.add(panel.echo.name);
            
            if (element === 'Attack' && elementCounts[element] >= 2) {
              atkPercentBonus = 10;
            }
          }
        }
      });

      const { bonus1Total, bonus2Total, bonus1Type } = calculateForteBonus(
        character, 
        nodeStates, 
        isSpectro
      );

      const values = {} as Record<StatName, number>;
      const updates = {} as Record<StatName, number>;
      const baseValues = {} as Record<StatName, number>;

      statsData.stats.forEach(stat => {
        const displayStat = getDisplayName(stat);
        
        if (['HP', 'ATK', 'DEF'].includes(displayStat)) {
          const baseStat = displayStat as BaseStatName;
          baseValues[displayStat] = displayStat === 'HP' ? baseHP : displayStat === 'ATK' ? baseATK : baseDEF;
          
          const echoStats = sumEchoDefaultStats(echoPanels);
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
            percent += bonus2Total;
          }

          values[displayStat] = baseValues[displayStat] * (1 + percent/100) + flat;
          updates[displayStat] = values[displayStat] - baseValues[displayStat];
        } 
        else {
          if (displayStat === 'Crit Rate') baseValues[displayStat] = 5.0;
          else if (displayStat === 'Crit DMG') baseValues[displayStat] = 150.0;
          else if (displayStat === 'Energy Regen') baseValues[displayStat] = character.ER;
          else baseValues[displayStat] = 0;

          updates[displayStat] = sumMainStats(stat, echoPanels) + sumSubStats(stat, echoPanels);

          if (weapon && weaponStats) {
            const weaponStatName = displayStat === 'Energy Regen' ? 'ER' : displayStat;
            
            if (weaponStatName === weapon.main_stat) {
              updates[displayStat] += weaponStats.scaledMainStat;
            }

            if (weapon.passive === weaponStatName) {
              updates[displayStat] += weaponStats.scaledPassive ?? 0;
            }

            if (weapon.passive === 'Attribute' && displayStat.endsWith('DMG')) {
              const element = displayStat.split(' ')[0];
              if (element === character.element) {
                updates[displayStat] += weaponStats.scaledPassive ?? 0;
              }
            }

            if (weapon.passive2 === weaponStatName) {
              updates[displayStat] += weaponStats.scaledPassive2 ?? 0;
            }
          }

          Object.entries(elementCounts).forEach(([element, count]) => {
            if (count >= 2) {
              const setName = ELEMENT_SETS[element as ElementType];
              const statToUpdate = SET_TO_STAT_MAPPING[setName as keyof typeof SET_TO_STAT_MAPPING];
              if (statToUpdate === displayStat) {
                updates[displayStat] += 10;
              }
            }
          });

          if ((bonus1Type === 'Crit Rate' && displayStat === 'Crit Rate') ||
              (bonus1Type === 'Crit DMG' && displayStat === 'Crit DMG') ||
              (bonus1Type === 'Healing' && displayStat === 'Healing Bonus') ||
              (displayStat === `${bonus1Type} DMG`)) {
            updates[displayStat] += bonus1Total;
          }

          values[displayStat] = baseValues[displayStat] + updates[displayStat];
        }
      });

      setStatState({ values, updates, baseValues });
      setLoading(false);

    } catch (err) {
      setError('Error calculating stats');
      setLoading(false);
    }
  }, [character, level, weapon, weaponStats, statsData, curveLoading, scaleStat, echoPanels, nodeStates, isSpectro]);

  return {
    loading: loading || curveLoading,
    error,
    ...statState
  };
};
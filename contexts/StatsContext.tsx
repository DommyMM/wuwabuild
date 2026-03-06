'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useGameData } from './GameDataContext';
import { useBuild } from './BuildContext';
import { StatName, BaseStatName } from '@/lib/constants/statMappings';
import { ELEMENT_SETS, ElementType } from '@/lib/echo';
import { calculateCV } from '@/lib/calculations/cv';
import { sumMainStats, sumSubStats, sumEchoDefaultStats } from '@/lib/calculations/echoes';
import { calculateForteBonus } from '@/lib/calculations/stats';
import { getUnconditionalWeaponPassiveBonuses } from '@/lib/calculations/weaponPassives';
import { getSetBonusesFromFetter } from '@/lib/constants/setBonuses';
import { getEchoBonus, getSequenceBonuses } from '@/lib/constants/statBonuses';
import { getPercentVariant } from '@/lib/constants/statMappings';
import { isRover } from '@/lib/character';

interface StatBreakdown {
  flat: number;
  percent: number;
  echoDefault: number;
}

interface StatResult {
  value: number;
  update: number;
  baseValue: number;
  breakdown?: StatBreakdown;
}

interface CalculatedStats {
  values: Record<StatName, number>;
  updates: Record<StatName, number>;
  baseValues: Record<StatName, number>;
  breakdowns: Record<'HP' | 'ATK' | 'DEF', StatBreakdown>;
  cv: number;
  elementCounts: Record<ElementType, number>;
  activeSets: { element: ElementType; count: number; setName: string }[];
}

interface StatsContextType {
  stats: CalculatedStats;
  loading: boolean;
  getStatValue: (stat: StatName) => number;
  getStatUpdate: (stat: StatName) => number;
  getStatBaseValue: (stat: StatName) => number;
  getStatBreakdown: (stat: 'HP' | 'ATK' | 'DEF') => StatBreakdown | null;
}

const ROVER_ELEMENT_TOKENS = new Set([
  'Aero',
  'Havoc',
  'Spectro'
]);

const matchesEchoBonusCondition = (
  conditions: string[] | undefined,
  characterName: string | undefined,
  isRoverCharacter: boolean,
  roverElement: string | undefined
): boolean => {
  if (!conditions || conditions.length === 0) return true;

  return conditions.some(condition => {
    const token = condition.trim();
    if (!token) return false;
    if (characterName === token) return true;
    if (isRoverCharacter && roverElement && ROVER_ELEMENT_TOKENS.has(token)) {
      return roverElement === token;
    }
    return false;
  });
};

const getWeaponPassivePercentBonus = (
  stat: StatName,
  bonuses: ReturnType<typeof getUnconditionalWeaponPassiveBonuses>
): number => {
  switch (stat) {
    case 'Energy Regen':
    case 'Crit Rate':
    case 'Crit DMG':
    case 'Basic Attack DMG Bonus':
    case 'Heavy Attack DMG Bonus':
    case 'Resonance Skill DMG Bonus':
    case 'Resonance Liberation DMG Bonus':
    case 'Aero DMG':
    case 'Glacio DMG':
    case 'Fusion DMG':
    case 'Electro DMG':
    case 'Havoc DMG':
    case 'Spectro DMG':
      return bonuses[stat] ?? 0;
    default:
      return 0;
  }
};

const StatsContext = createContext<StatsContextType | null>(null);

export const useStats = (): StatsContextType => {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
};

interface StatsProviderProps {
  children: ReactNode;
}

export function StatsProvider({ children }: StatsProviderProps) {
  const gameData = useGameData();
  const build = useBuild();

  const {
    getCharacter,
    getEcho,
    getWeapon,
    scaleCharacterStat,
    scaleWeaponAtk,
    scaleWeaponStat,
    fettersByElement,
    loading: gameDataLoading
  } = gameData;

  const { state } = build;
  const { characterId, characterLevel, roverElement, weaponId, weaponLevel, weaponRank, echoPanels, forte, sequence } = state;

  // Get current character and weapon
  const character = useMemo(() =>
    getCharacter(characterId),
    [getCharacter, characterId]
  );

  const weapon = useMemo(() =>
    getWeapon(weaponId),
    [getWeapon, weaponId]
  );

  // Scale weapon ATK/substat and load precomputed unconditional passive bonuses.
  const weaponStats = useMemo(() => {
    if (!weapon) return null;
    return {
      scaledAtk: scaleWeaponAtk(weapon.ATK, weaponLevel),
      scaledMainStat: scaleWeaponStat(weapon.base_main, weaponLevel),
    };
  }, [weapon, weaponLevel, scaleWeaponAtk, scaleWeaponStat]);

  const weaponPassiveBonuses = useMemo(
    () => getUnconditionalWeaponPassiveBonuses(weapon, weaponRank),
    [weapon, weaponRank]
  );

  // Calculate base stats
  const baseStats = useMemo(() => {
    if (!character) return null;
    const characterAtk = scaleCharacterStat(character.ATK, characterLevel, 'ATK');
    const weaponAtk = weaponStats?.scaledAtk ?? 0;

    return {
      baseHP: scaleCharacterStat(character.HP, characterLevel, 'HP'),
      baseATK: characterAtk + weaponAtk,
      baseDEF: scaleCharacterStat(character.DEF, characterLevel, 'DEF')
    };
  }, [character, characterLevel, weaponStats?.scaledAtk, scaleCharacterStat]);

  // Calculate element counts and active sets from equipped echoes.
  const { elementCounts, activeSets } = useMemo(() => {
    const counts: Record<ElementType, number> = {} as Record<ElementType, number>;
    const usedEchoes = new Set();
    const sets: { element: ElementType; count: number; setName: string }[] = [];

    echoPanels.forEach(panel => {
      if (!panel.id) return;
      const echo = getEcho(panel.id);
      if (!echo || usedEchoes.has(echo.name)) return;

      const element = echo.elements.length === 1 ?
        echo.elements[0] : panel.selectedElement;

      if (element) {
        counts[element] = (counts[element] || 0) + 1;
        usedEchoes.add(echo.name);
      }
    });

    // Build active sets list
    Object.entries(counts).forEach(([element, count]) => {
      const threshold = fettersByElement[element as ElementType]?.pieceCount ?? 2;
      if (count >= threshold) {
        const setName = ELEMENT_SETS[element as ElementType];
        sets.push({ element: element as ElementType, count, setName });
      }
    });

    return { elementCounts: counts, activeSets: sets };
  }, [echoPanels, getEcho, fettersByElement]);

  // Calculate forte bonus
  const forteBonus = useMemo(() => {
    if (!character) return null;
    return calculateForteBonus(character, forte);
  }, [character, forte]);

  // Calculate echo default stats
  const echoStats = useMemo(() => {
    return sumEchoDefaultStats(echoPanels, getEcho);
  }, [echoPanels, getEcho]);

  // Get first panel echo bonus
  const firstPanelId = echoPanels[0]?.id;
  const firstEcho = firstPanelId ? getEcho(firstPanelId) : null;
  const firstPanelBonus = useMemo(() =>
    firstEcho ? getEchoBonus(firstEcho) : null,
    [firstEcho]
  );

  // Calculate all stats
  const stats = useMemo<CalculatedStats>(() => {
    const values = {} as Record<StatName, number>;
    const updates = {} as Record<StatName, number>;
    const baseValues = {} as Record<StatName, number>;
    const breakdowns = {} as Record<'HP' | 'ATK' | 'DEF', StatBreakdown>;

    if (!character || !baseStats || !forteBonus) {
      return {
        values,
        updates,
        baseValues,
        breakdowns,
        cv: 0,
        elementCounts,
        activeSets
      };
    }

    const activeSetBonuses = Object.entries(elementCounts).flatMap(([element, count]) => {
      const fetter = fettersByElement[element as ElementType];
      const threshold = fetter?.pieceCount ?? 2;
      if (count < threshold) return [];
      return getSetBonusesFromFetter(fetter, count);
    });

    // List of stats to calculate
    const statsToCalculate: StatName[] = [
      'HP', 'ATK', 'DEF',
      'Crit Rate', 'Crit DMG', 'Energy Regen',
      'Aero DMG', 'Glacio DMG', 'Fusion DMG', 'Electro DMG', 'Havoc DMG', 'Spectro DMG',
      'Basic Attack DMG Bonus', 'Heavy Attack DMG Bonus',
      'Resonance Skill DMG Bonus', 'Resonance Liberation DMG Bonus',
      'Healing Bonus'
    ];

    statsToCalculate.forEach(stat => {
      const displayStat = stat;
      const result: StatResult = {
        value: 0,
        update: 0,
        baseValue: 0
      };

      if (['HP', 'ATK', 'DEF'].includes(displayStat)) {
        // Calculate flat stats (HP, ATK, DEF)
        const baseStat = displayStat as BaseStatName;
        result.baseValue = displayStat === 'HP' ? baseStats.baseHP :
          displayStat === 'ATK' ? baseStats.baseATK : baseStats.baseDEF;

        const echoDefault = baseStat === 'HP' ? echoStats.hp :
          baseStat === 'ATK' ? echoStats.atk : 0;

        const flat = sumMainStats(baseStat, echoPanels) + sumSubStats(baseStat, echoPanels);
        let percent = sumMainStats(getPercentVariant(baseStat), echoPanels) +
          sumSubStats(getPercentVariant(baseStat), echoPanels);

        result.breakdown = { flat, percent, echoDefault };

        if (weapon && weaponStats) {
          if (weapon.main_stat === displayStat) {
            percent += weaponStats.scaledMainStat;
          }
        }

        if (displayStat === 'HP') {
          percent += weaponPassiveBonuses['HP%'] ?? 0;
        } else if (displayStat === 'ATK') {
          percent += weaponPassiveBonuses['ATK%'] ?? 0;
        } else if (displayStat === 'DEF') {
          percent += weaponPassiveBonuses['DEF%'] ?? 0;
        }

        const basePercentStat = getPercentVariant(baseStat);

        // Unconditional sequence bonuses for percent variants (HP%/ATK%/DEF%)
        getSequenceBonuses(character).forEach(bonus => {
          if (bonus.stat === basePercentStat && sequence >= bonus.minSequence) {
            percent += bonus.value;
          }
        });
        const setBasePercentBonus = activeSetBonuses.reduce((sum, bonus) => (
          bonus.stat === basePercentStat ? sum + bonus.value : sum
        ), 0);
        percent += setBasePercentBonus;

        if (character.Bonus2 === displayStat) {
          percent += forteBonus.bonus2Total;
        }

        result.value = Math.round(result.baseValue * (1 + percent / 100)) + flat + echoDefault;
        result.update = result.value - result.baseValue;

        breakdowns[displayStat as 'HP' | 'ATK' | 'DEF'] = result.breakdown;
      } else {
        // Calculate percent stats
        result.baseValue = displayStat === 'Crit Rate' ? 5.0 :
          displayStat === 'Crit DMG' ? 150.0 :
            displayStat === 'Energy Regen' ? character.ER : 0;

        result.update = sumMainStats(stat, echoPanels) + sumSubStats(stat, echoPanels);

        // Add first panel echo bonus
        if (firstPanelBonus) {
          const firstPanelBonusTotal = firstPanelBonus.reduce((sum, bonus) => {
            if (bonus.stat !== displayStat) return sum;
            const conditionMatched = matchesEchoBonusCondition(
              bonus.characterCondition,
              character?.name,
              isRover(character),
              roverElement
            );
            return conditionMatched ? sum + bonus.value : sum;
          }, 0);
          result.update += firstPanelBonusTotal;
        }

        // Add weapon substat bonus
        if (weapon && weaponStats) {
          const weaponStatName = displayStat === 'Energy Regen' ? 'ER' : displayStat;

          if (weaponStatName === weapon.main_stat) {
            result.update += weaponStats.scaledMainStat;
          }
        }

        result.update += getWeaponPassivePercentBonus(displayStat, weaponPassiveBonuses);

        // Add unconditional set bonuses (activation tier only).
        activeSetBonuses.forEach((bonus) => {
          if (bonus.stat === displayStat) {
            result.update += bonus.value;
          }
        });

        // Add forte bonuses
        const isDirectStat = (bonus: string) => ['Crit Rate', 'Crit DMG', 'Healing'].includes(bonus);
        if (
          (isDirectStat(forteBonus.bonus1Type) && displayStat === (forteBonus.bonus1Type === 'Healing' ? 'Healing Bonus' : forteBonus.bonus1Type)) ||
          (!isDirectStat(forteBonus.bonus1Type) && displayStat === `${character.name.startsWith('Rover') ? roverElement : forteBonus.bonus1Type} DMG`)
        ) {
          result.update += forteBonus.bonus1Total;
        }

        // Unconditional sequence bonuses for percent stats
        getSequenceBonuses(character).forEach(bonus => {
          if (bonus.stat === displayStat && sequence >= bonus.minSequence) {
            result.update += bonus.value;
          }
        });

        result.value = Number((result.baseValue + result.update).toFixed(1));
        result.update = Number(result.update.toFixed(1));
      }

      values[displayStat] = result.value;
      updates[displayStat] = result.update;
      baseValues[displayStat] = result.baseValue;
    });

    const cv = calculateCV(echoPanels);

    return {
      values,
      updates,
      baseValues,
      breakdowns,
      cv,
      elementCounts,
      activeSets
    };
  }, [
    character,
    roverElement,
    baseStats,
    weapon,
    weaponStats,
    weaponPassiveBonuses,
    echoPanels,
    elementCounts,
    forteBonus,
    echoStats,
    firstPanelBonus,
    sequence,
    activeSets,
    fettersByElement
  ]);

  // Helper functions
  const getStatValue = useMemo(() => (stat: StatName): number => {
    return stats.values[stat] ?? 0;
  }, [stats.values]);

  const getStatUpdate = useMemo(() => (stat: StatName): number => {
    return stats.updates[stat] ?? 0;
  }, [stats.updates]);

  const getStatBaseValue = useMemo(() => (stat: StatName): number => {
    return stats.baseValues[stat] ?? 0;
  }, [stats.baseValues]);

  const getStatBreakdown = useMemo(() => (stat: 'HP' | 'ATK' | 'DEF'): StatBreakdown | null => {
    return stats.breakdowns[stat] ?? null;
  }, [stats.breakdowns]);

  const value = useMemo<StatsContextType>(() => ({
    stats,
    loading: gameDataLoading,
    getStatValue,
    getStatUpdate,
    getStatBaseValue,
    getStatBreakdown
  }), [stats, gameDataLoading, getStatValue, getStatUpdate, getStatBaseValue, getStatBreakdown]);

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
}

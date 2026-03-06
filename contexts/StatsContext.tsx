'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useGameData } from './GameDataContext';
import { useBuild } from './BuildContext';
import { StatName, BaseStatName, BASE_STATS, CALCULABLE_STATS, getPercentVariant } from '@/lib/constants/statMappings';
import { ELEMENT_SETS, ElementType } from '@/lib/echo';
import { calculateCV } from '@/lib/calculations/cv';
import { sumMainStats, sumSubStats, sumEchoDefaultStats } from '@/lib/calculations/echoes';
import { calculateForteBonus } from '@/lib/calculations/stats';
import { getUnconditionalWeaponPassiveBonuses } from '@/lib/calculations/weaponPassives';
import { getSetBonusesFromFetter } from '@/lib/constants/setBonuses';
import { getEchoBonus, getSequenceBonuses, matchesEchoBonusCondition } from '@/lib/constants/statBonuses';
import { isRover } from '@/lib/character';
import { WeaponPassiveStatName } from '@/lib/weapon';

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

  const character = useMemo(() => getCharacter(characterId), [getCharacter, characterId]);
  const weapon = useMemo(() => getWeapon(weaponId), [getWeapon, weaponId]);

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

  const baseStats = useMemo(() => {
    if (!character) return null;
    return {
      baseHP: scaleCharacterStat(character.HP, characterLevel, 'HP'),
      baseATK: scaleCharacterStat(character.ATK, characterLevel, 'ATK') + (weaponStats?.scaledAtk ?? 0),
      baseDEF: scaleCharacterStat(character.DEF, characterLevel, 'DEF'),
    };
  }, [character, characterLevel, weaponStats?.scaledAtk, scaleCharacterStat]);

  const { elementCounts, activeSets } = useMemo(() => {
    const counts: Record<ElementType, number> = {} as Record<ElementType, number>;
    const usedEchoes = new Set<string>();
    const sets: { element: ElementType; count: number; setName: string }[] = [];

    echoPanels.forEach(panel => {
      if (!panel.id) return;
      const echo = getEcho(panel.id);
      if (!echo || usedEchoes.has(echo.name)) return;
      const element = echo.elements.length === 1 ? echo.elements[0] : panel.selectedElement;
      if (element) {
        counts[element] = (counts[element] || 0) + 1;
        usedEchoes.add(echo.name);
      }
    });

    Object.entries(counts).forEach(([element, count]) => {
      const threshold = fettersByElement[element as ElementType]?.pieceCount ?? 2;
      if (count >= threshold) {
        sets.push({ element: element as ElementType, count, setName: ELEMENT_SETS[element as ElementType] });
      }
    });

    return { elementCounts: counts, activeSets: sets };
  }, [echoPanels, getEcho, fettersByElement]);

  const forteBonus = useMemo(() => {
    if (!character) return null;
    return calculateForteBonus(character, forte);
  }, [character, forte]);

  const echoStats = useMemo(() => sumEchoDefaultStats(echoPanels, getEcho), [echoPanels, getEcho]);

  const firstPanelBonus = useMemo(() => {
    const firstEcho = echoPanels[0]?.id ? getEcho(echoPanels[0].id) : null;
    return firstEcho ? getEchoBonus(firstEcho) : null;
  }, [echoPanels, getEcho]);

  const stats = useMemo<CalculatedStats>(() => {
    const values = {} as Record<StatName, number>;
    const updates = {} as Record<StatName, number>;
    const baseValues = {} as Record<StatName, number>;
    const breakdowns = {} as Record<'HP' | 'ATK' | 'DEF', StatBreakdown>;

    if (!character || !baseStats || !forteBonus) {
      return { values, updates, baseValues, breakdowns, cv: 0, elementCounts, activeSets };
    }

    const activeSetBonuses = Object.entries(elementCounts).flatMap(([element, count]) => {
      const fetter = fettersByElement[element as ElementType];
      if (count < (fetter?.pieceCount ?? 2)) return [];
      return getSetBonusesFromFetter(fetter, count);
    });

    const seqBonuses = getSequenceBonuses(character);
    // For Rover, override element DMG bonus with the user's selected element
    const isRoverChar = isRover(character);
    const bonus1Stat = isRoverChar && roverElement && character.Bonus1.endsWith(' DMG')
      ? `${roverElement} DMG`
      : character.Bonus1;

    // Maps hoisted outside the per-stat loop
    const baseStatValues: Record<BaseStatName, number> = {
      HP: baseStats.baseHP,
      ATK: baseStats.baseATK,
      DEF: baseStats.baseDEF,
    };
    const echoDefaults: Partial<Record<BaseStatName, number>> = {
      HP: echoStats.hp,
      ATK: echoStats.atk,
    };

    CALCULABLE_STATS.forEach(stat => {
      const result: StatResult = { value: 0, update: 0, baseValue: 0 };

      if ((BASE_STATS as readonly string[]).includes(stat)) {
        const baseStat = stat as BaseStatName;
        const percentVariant = getPercentVariant(baseStat);
        result.baseValue = baseStatValues[baseStat];

        const flat = sumMainStats(baseStat, echoPanels) + sumSubStats(baseStat, echoPanels);
        const echoDefault = echoDefaults[baseStat] ?? 0;
        let percent = sumMainStats(percentVariant, echoPanels) + sumSubStats(percentVariant, echoPanels);

        result.breakdown = { flat, percent, echoDefault };

        if (weapon?.main_stat === stat && weaponStats) {
          percent += weaponStats.scaledMainStat;
        }

        percent += weaponPassiveBonuses[percentVariant as WeaponPassiveStatName] ?? 0;

        seqBonuses.forEach(bonus => {
          if (bonus.stat === percentVariant && sequence >= bonus.minSequence) percent += bonus.value;
        });

        percent += activeSetBonuses.reduce((sum, b) => b.stat === percentVariant ? sum + b.value : sum, 0);

        if (character.Bonus2 === stat) percent += forteBonus.bonus2Total;

        result.value = Math.round(result.baseValue * (1 + percent / 100)) + flat + echoDefault;
        result.update = result.value - result.baseValue;
        breakdowns[stat as 'HP' | 'ATK' | 'DEF'] = result.breakdown;
      } else {
        result.baseValue =
          stat === 'Crit Rate' ? 5.0 :
            stat === 'Crit DMG' ? 150.0 :
              stat === 'Energy Regen' ? character.ER : 0;

        result.update = sumMainStats(stat, echoPanels) + sumSubStats(stat, echoPanels);

        if (firstPanelBonus) {
          result.update += firstPanelBonus.reduce((sum, bonus) => {
            if (bonus.stat !== stat) return sum;
            return matchesEchoBonusCondition(bonus.characterCondition, character.name, isRoverChar, roverElement)
              ? sum + bonus.value : sum;
          }, 0);
        }

        // Weapon main stat (Energy Regen stored as 'ER' in weapon data)
        if (weapon && weaponStats) {
          const weaponStatKey = stat === 'Energy Regen' ? 'ER' : stat;
          if (weaponStatKey === weapon.main_stat) result.update += weaponStats.scaledMainStat;
        }

        result.update += (weaponPassiveBonuses as Partial<Record<StatName, number>>)[stat] ?? 0;

        activeSetBonuses.forEach(bonus => {
          if (bonus.stat === stat) result.update += bonus.value;
        });

        if (stat === bonus1Stat) result.update += forteBonus.bonus1Total;

        seqBonuses.forEach(bonus => {
          if (bonus.stat === stat && sequence >= bonus.minSequence) result.update += bonus.value;
        });

        result.value = Number((result.baseValue + result.update).toFixed(1));
        result.update = Number(result.update.toFixed(1));
      }

      values[stat] = result.value;
      updates[stat] = result.update;
      baseValues[stat] = result.baseValue;
    });

    return {
      values,
      updates,
      baseValues,
      breakdowns,
      cv: calculateCV(echoPanels),
      elementCounts,
      activeSets,
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
    fettersByElement,
  ]);

  const getStatValue = useMemo(() => (stat: StatName): number => stats.values[stat] ?? 0, [stats.values]);
  const getStatUpdate = useMemo(() => (stat: StatName): number => stats.updates[stat] ?? 0, [stats.updates]);
  const getStatBaseValue = useMemo(() => (stat: StatName): number => stats.baseValues[stat] ?? 0, [stats.baseValues]);
  const getStatBreakdown = useMemo(() => (stat: 'HP' | 'ATK' | 'DEF'): StatBreakdown | null => stats.breakdowns[stat] ?? null, [stats.breakdowns]);

  const value = useMemo<StatsContextType>(() => ({
    stats,
    loading: gameDataLoading,
    getStatValue,
    getStatUpdate,
    getStatBaseValue,
    getStatBreakdown,
  }), [stats, gameDataLoading, getStatValue, getStatUpdate, getStatBaseValue, getStatBreakdown]);

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
}

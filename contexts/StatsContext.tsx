'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useGameData } from './GameDataContext';
import { useBuild } from './BuildContext';
import { StatName, BaseStatName } from '@/types/stats';
import { EchoPanelState, ELEMENT_SETS, ElementType } from '@/types/echo';
import { calculateCV } from '@/lib/calculations/cv';
import { sumMainStats, sumSubStats, sumEchoDefaultStats } from '@/lib/calculations/echoes';
import { calculateForteBonus } from '@/lib/calculations/stats';
import { SET_TO_STAT, SPECIAL_SET_BONUS_VALUES, DEFAULT_SET_BONUS_VALUE } from '@/lib/constants/setBonuses';
import { getEchoBonus } from '@/lib/constants/echoBonuses';
import { getDisplayName, getPercentVariant } from '@/lib/constants/statMappings';
import { isRover } from '@/types/character';

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

  // Calculate weapon stats
  // NOTE: Passive bonuses from weapon.params will be integrated in a future update.
  // For now, ATK + substat scaling work via level curves; passive effect values are
  // available in weapon.params[paramIndex][rank-1] for direct lookup when needed.
  const weaponStats = useMemo(() => {
    if (!weapon) return null;
    return {
      scaledAtk: scaleWeaponAtk(weapon.ATK, weaponLevel),
      scaledMainStat: scaleWeaponStat(weapon.base_main, weaponLevel),
    };
  }, [weapon, weaponLevel, scaleWeaponAtk, scaleWeaponStat]);

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

  // Calculate element counts and ATK bonus from sets
  const { elementCounts, atkPercentBonus, activeSets } = useMemo(() => {
    const counts: Record<ElementType, number> = {} as Record<ElementType, number>;
    const usedEchoes = new Set();
    let bonus = 0;
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

        if (element === 'Tidebreaking' && counts[element] === 5) {
          bonus = 15;
        } else if (element === 'Attack' && counts[element] >= 2) {
          bonus = 10;
        }
      }
    });

    // Build active sets list
    Object.entries(counts).forEach(([element, count]) => {
      if (count >= 2) {
        const setName = ELEMENT_SETS[element as ElementType];
        sets.push({ element: element as ElementType, count, setName });
      }
    });

    return { elementCounts: counts, atkPercentBonus: bonus, activeSets: sets };
  }, [echoPanels, getEcho]);

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
      const displayStat = getDisplayName(stat);
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
          // TODO: weapon passive bonuses (from weapon.params) to be integrated
          if (displayStat === 'ATK') {
            percent += atkPercentBonus;
          }
        }

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
          const bonusForStat = firstPanelBonus.find(bonus => bonus.stat === displayStat);
          if (bonusForStat) {
            result.update += bonusForStat.value;
          }

          // Special case for Fleurdelys with Rover Aero or Carthethyia
          if (firstEcho?.name === 'Fleurdelys' &&
            displayStat === 'Aero DMG' &&
            ((isRover(character) && roverElement === 'Aero') || character?.name === 'Carthethyia')) {
            result.update += 10;
          }

          // Aemeath gets 25 Liberation DMG Bonus from Sigillum
          if (firstEcho?.name === 'Sigillum' && character?.name === 'Aemeath' && displayStat === 'Resonance Liberation DMG Bonus') {
            result.update += 25;
          }
        }

        // Add weapon substat bonus
        if (weapon && weaponStats) {
          const weaponStatName = displayStat === 'Energy Regen' ? 'ER' : displayStat;

          if (weaponStatName === weapon.main_stat) {
            result.update += weaponStats.scaledMainStat;
          }

          // TODO: weapon passive bonuses (effect + params) to be integrated.
          // Passive data is available in weapon.params[paramIndex][rank-1] for
          // direct R1–R5 lookup — no scaling formula needed.
        }

        // Add set bonuses
        Object.entries(elementCounts).forEach(([element, count]) => {
          if (count >= 2) {
            const setName = ELEMENT_SETS[element as ElementType];
            const statToUpdate = SET_TO_STAT[setName];
            if (statToUpdate === displayStat) {
              const bonusValue = SPECIAL_SET_BONUS_VALUES[setName] ?? DEFAULT_SET_BONUS_VALUE;
              result.update += bonusValue;
            }
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

        // Zani's S2 passive
        if (displayStat === 'Crit Rate' && character.id === '38' && sequence >= 2) {
          result.update += 20;
        }

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
    echoPanels,
    elementCounts,
    atkPercentBonus,
    forteBonus,
    echoStats,
    firstPanelBonus,
    firstEcho,
    sequence,
    activeSets
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

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Character, validateCharacter } from '@/types/character';
import { Weapon, WeaponType } from '@/types/weapon';
import { Echo, COST_SECTIONS } from '@/types/echo';
import { CharacterCurve, LevelCurves } from '@/lib/calculations';

// ============================================================================
// Types
// ============================================================================

interface MainStatData {
  [key: string]: {
    default: [string, number, number];
    mainStats: {
      [statName: string]: [number, number];
    };
  };
}

interface SubstatData {
  [statName: string]: number[];
}

interface GameDataState {
  characters: Character[];
  echoes: Echo[];
  echoesByCost: Record<number, Echo[]>;
  weapons: Map<WeaponType, Weapon[]>;
  weaponList: Weapon[];
  mainStats: MainStatData | null;
  substats: SubstatData | null;
  characterCurves: CharacterCurve | null;
  levelCurves: LevelCurves | null;
  loading: boolean;
  error: string | null;
}

interface GameDataContextType extends GameDataState {
  // Character helpers
  getCharacter: (id: string | null) => Character | null;
  getCharacterByName: (name: string) => Character | null;

  // Echo helpers
  getEcho: (id: string | null) => Echo | null;
  getEchoByName: (name: string) => Echo | null;

  // Weapon helpers
  getWeapon: (id: string | null) => Weapon | null;
  getWeaponsByType: (type: WeaponType) => Weapon[];

  // Main stat helpers
  getMainStatsByCost: (cost: number | null) => { [statName: string]: [number, number] };
  calculateMainStatValue: (min: number, max: number, level: number) => number;

  // Substat helpers
  getSubstatValues: (stat: string) => number[] | null;
  getLowestSubstatValue: (stat: string) => number | null;
  getAvailableSubstats: () => string[];

  // Curve helpers
  scaleCharacterStat: (baseStat: number, level: number, statType: 'HP' | 'ATK' | 'DEF') => number;
  scaleWeaponAtk: (baseAtk: number, level: number) => number;
  scaleWeaponStat: (baseStat: number, level: number) => number;
}

// ============================================================================
// Context
// ============================================================================

const GameDataContext = createContext<GameDataContextType | null>(null);

export const useGameData = (): GameDataContextType => {
  const context = useContext(GameDataContext);
  if (!context) {
    throw new Error('useGameData must be used within a GameDataProvider');
  }
  return context;
};

// ============================================================================
// Provider
// ============================================================================

interface GameDataProviderProps {
  children: ReactNode;
}

export function GameDataProvider({ children }: GameDataProviderProps) {
  const [state, setState] = useState<GameDataState>({
    characters: [],
    echoes: [],
    echoesByCost: {},
    weapons: new Map(),
    weaponList: [],
    mainStats: null,
    substats: null,
    characterCurves: null,
    levelCurves: null,
    loading: true,
    error: null
  });

  // Load all game data on mount
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const [
          charactersRes,
          echoesRes,
          weaponsRes,
          mainStatsRes,
          substatsRes,
          characterCurvesRes,
          levelCurvesRes
        ] = await Promise.all([
          fetch('/Data/Characters.json'),
          fetch('/Data/Echoes.json'),
          fetch('/Data/Weapons.json'),
          fetch('/Data/Mainstat.json'),
          fetch('/Data/Substats.json'),
          fetch('/Data/CharacterCurve.json'),
          fetch('/Data/LevelCurve.json')
        ]);

        // Check for any failed requests
        const responses = [
          { res: charactersRes, name: 'Characters' },
          { res: echoesRes, name: 'Echoes' },
          { res: weaponsRes, name: 'Weapons' },
          { res: mainStatsRes, name: 'Main Stats' },
          { res: substatsRes, name: 'Substats' },
          { res: characterCurvesRes, name: 'Character Curves' },
          { res: levelCurvesRes, name: 'Level Curves' }
        ];

        for (const { res, name } of responses) {
          if (!res.ok) {
            throw new Error(`Failed to load ${name}: ${res.status}`);
          }
        }

        // Parse JSON data
        const [
          charactersData,
          echoesData,
          weaponsData,
          mainStatsData,
          substatsData,
          characterCurvesData,
          levelCurvesData
        ] = await Promise.all([
          charactersRes.json(),
          echoesRes.json(),
          weaponsRes.json(),
          mainStatsRes.json(),
          substatsRes.json(),
          characterCurvesRes.json(),
          levelCurvesRes.json()
        ]);

        // Process characters
        const validCharacters = Array.isArray(charactersData)
          ? charactersData.filter(validateCharacter)
          : [];

        // Process echoes
        const echoes: Echo[] = Array.isArray(echoesData) ? echoesData : [];
        const echoesByCost: Record<number, Echo[]> = {};
        COST_SECTIONS.forEach(cost => {
          echoesByCost[cost] = echoes
            .filter(echo => echo.cost === cost)
            .sort((a, b) => a.name.localeCompare(b.name));
        });

        // Process weapons
        const weaponMap = new Map<WeaponType, Weapon[]>();
        const weaponList: Weapon[] = [];
        Object.entries(weaponsData).forEach(([key, weapons]) => {
          const type = key.slice(0, -1) as WeaponType;
          const processed = (weapons as Omit<Weapon, 'type'>[]).map(weapon => ({
            ...weapon,
            type,
            ATK: Number(weapon.ATK),
            base_main: Number(weapon.base_main),
            passive_stat: weapon.passive_stat ? Number(weapon.passive_stat) : undefined,
            passive_stat2: weapon.passive_stat2 ? Number(weapon.passive_stat2) : undefined
          }));
          weaponMap.set(type, processed);
          weaponList.push(...processed);
        });

        setState({
          characters: validCharacters,
          echoes,
          echoesByCost,
          weapons: weaponMap,
          weaponList,
          mainStats: mainStatsData,
          substats: substatsData.subStats || substatsData,
          characterCurves: characterCurvesData,
          levelCurves: levelCurvesData,
          loading: false,
          error: null
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load game data';
        console.error('Error loading game data:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMsg
        }));
      }
    };

    loadGameData();
  }, []);

  // ============================================================================
  // Character Helpers
  // ============================================================================

  const getCharacter = useCallback((id: string | null): Character | null => {
    if (!id) return null;
    return state.characters.find(c => c.id === id) ?? null;
  }, [state.characters]);

  const getCharacterByName = useCallback((name: string): Character | null => {
    return state.characters.find(c => c.name === name) ?? null;
  }, [state.characters]);

  // ============================================================================
  // Echo Helpers
  // ============================================================================

  const getEcho = useCallback((id: string | null): Echo | null => {
    if (!id) return null;
    return state.echoes.find(e => e.id === id) ?? null;
  }, [state.echoes]);

  const getEchoByName = useCallback((name: string): Echo | null => {
    return state.echoes.find(e => e.name === name) ?? null;
  }, [state.echoes]);

  // ============================================================================
  // Weapon Helpers
  // ============================================================================

  const getWeapon = useCallback((id: string | null): Weapon | null => {
    if (!id) return null;
    return state.weaponList.find(w => w.id === id) ?? null;
  }, [state.weaponList]);

  const getWeaponsByType = useCallback((type: WeaponType): Weapon[] => {
    return state.weapons.get(type) ?? [];
  }, [state.weapons]);

  // ============================================================================
  // Main Stat Helpers
  // ============================================================================

  const getMainStatsByCost = useCallback((cost: number | null): { [statName: string]: [number, number] } => {
    if (!state.mainStats || !cost) return {};
    return state.mainStats[`${cost}cost`]?.mainStats || {};
  }, [state.mainStats]);

  const calculateMainStatValue = useCallback((min: number, max: number, level: number): number => {
    return min + ((max - min) * level / 25);
  }, []);

  // ============================================================================
  // Substat Helpers
  // ============================================================================

  const getSubstatValues = useCallback((stat: string): number[] | null => {
    return state.substats?.[stat] ?? null;
  }, [state.substats]);

  const getLowestSubstatValue = useCallback((stat: string): number | null => {
    return state.substats?.[stat]?.[0] ?? null;
  }, [state.substats]);

  const getAvailableSubstats = useCallback((): string[] => {
    return state.substats ? Object.keys(state.substats) : [];
  }, [state.substats]);

  // ============================================================================
  // Curve Helpers
  // ============================================================================

  const getLevelKey = useCallback((level: number): string => {
    if (level <= 20) {
      if (level === 1) return "1/20";
      return level === 20 ? "20/20" : level.toString();
    }

    if (level === 40) return "40/40";
    if (level === 50) return "50/50";
    if (level === 60) return "60/60";
    if (level === 70) return "70/70";
    if (level === 80) return "80/80";
    if (level === 90) return "90/90";

    return level.toString();
  }, []);

  const scaleCharacterStat = useCallback((
    baseStat: number,
    level: number,
    statType: 'HP' | 'ATK' | 'DEF'
  ): number => {
    if (!state.characterCurves) return baseStat;
    if (level < 1 || level > 90) return baseStat;

    const levelKey = level === 20 || level === 40 || level === 50 || level === 60 || level === 70 || level === 80
      ? `${level}/${level}`
      : level.toString();
    const curve = state.characterCurves.CHARACTER_CURVE[levelKey];
    if (!curve) return baseStat;

    return Math.floor(baseStat * (curve[statType] / 10000));
  }, [state.characterCurves]);

  const scaleWeaponAtk = useCallback((baseAtk: number, level: number): number => {
    if (!state.levelCurves) return baseAtk;
    const key = getLevelKey(level);
    return Math.floor(baseAtk * state.levelCurves.ATK_CURVE[key]);
  }, [state.levelCurves, getLevelKey]);

  const scaleWeaponStat = useCallback((baseStat: number, level: number): number => {
    if (!state.levelCurves) return baseStat;
    const key = getLevelKey(level);
    return parseFloat((baseStat * state.levelCurves.STAT_CURVE[key]).toFixed(1));
  }, [state.levelCurves, getLevelKey]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo<GameDataContextType>(() => ({
    ...state,
    getCharacter,
    getCharacterByName,
    getEcho,
    getEchoByName,
    getWeapon,
    getWeaponsByType,
    getMainStatsByCost,
    calculateMainStatValue,
    getSubstatValues,
    getLowestSubstatValue,
    getAvailableSubstats,
    scaleCharacterStat,
    scaleWeaponAtk,
    scaleWeaponStat
  }), [
    state,
    getCharacter,
    getCharacterByName,
    getEcho,
    getEchoByName,
    getWeapon,
    getWeaponsByType,
    getMainStatsByCost,
    calculateMainStatValue,
    getSubstatValues,
    getLowestSubstatValue,
    getAvailableSubstats,
    scaleCharacterStat,
    scaleWeaponAtk,
    scaleWeaponStat
  ]);

  return (
    <GameDataContext.Provider value={value}>
      {children}
    </GameDataContext.Provider>
  );
}

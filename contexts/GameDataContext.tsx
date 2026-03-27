'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Character, adaptCDNCharacter, validateCDNCharacter } from '@/lib/character';
import { Weapon, WeaponType, CDNWeapon, adaptCDNWeapon, validateCDNWeapon } from '@/lib/weapon';
import { Echo, CDNEcho, CDNFetter, COST_SECTIONS, adaptCDNEcho, validateCDNEcho, ElementType, FETTER_MAP } from '@/lib/echo';
import { CharacterCurve, LevelCurves } from '@/lib/calculations/stats';

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

// Raw JSON shape as loaded from files/fetch, exported for use in layout.tsx
export interface RawGameData {
  characters: unknown;
  echoes: unknown;
  weapons: unknown;
  echoStats: unknown;
  stats: unknown;
  fetters: unknown;
  characterCurves: unknown;
  levelCurves: unknown;
}

interface GameDataState {
  characters: Character[];
  echoes: Echo[];
  echoesByCost: Record<number, Echo[]>;
  weapons: Map<WeaponType, Weapon[]>;
  weaponList: Weapon[];
  mainStats: MainStatData | null;
  substats: SubstatData | null;
  statTranslations: Record<string, Record<string, string>> | null;
  statIcons: Record<string, string> | null;
  fetters: CDNFetter[];
  fettersByElement: Partial<Record<ElementType, CDNFetter>>;
  characterCurves: CharacterCurve | null;
  levelCurves: LevelCurves | null;
}

interface GameDataContextType extends GameDataState {
  isLoading: boolean;
  loadError: string | null;
  getCharacter: (id: string | null) => Character | null;
  getCharacterByLegacyId: (legacyId: string | null) => Character | null;
  getCharacterByName: (name: string) => Character | null;

  getEcho: (id: string | null) => Echo | null;
  getEchoByLegacyId: (legacyId: string | null) => Echo | null;
  getEchoByName: (name: string) => Echo | null;

  getFetterByElement: (element: ElementType) => CDNFetter | undefined;

  getWeapon: (id: string | null) => Weapon | null;
  getWeaponsByType: (type: WeaponType) => Weapon[];

  getMainStatsByCost: (cost: number | null) => { [statName: string]: [number, number] };
  calculateMainStatValue: (min: number, max: number, level: number) => number;

  getSubstatValues: (stat: string) => number[] | null;
  getLowestSubstatValue: (stat: string) => number | null;
  getAvailableSubstats: () => string[];

  scaleCharacterStat: (baseStat: number, level: number, statType: 'HP' | 'ATK' | 'DEF') => number;
  scaleWeaponAtk: (baseAtk: number, level: number) => number;
  scaleWeaponStat: (baseStat: number, level: number) => number;
}

const emptyState: GameDataState = {
  characters: [],
  echoes: [],
  echoesByCost: {},
  weapons: new Map(),
  weaponList: [],
  mainStats: null,
  substats: null,
  statTranslations: null,
  statIcons: null,
  fetters: [],
  fettersByElement: {},
  characterCurves: null,
  levelCurves: null,
};

let cachedGameDataState: GameDataState | null = null;
let gameDataLoadPromise: Promise<GameDataState> | null = null;

function processRawGameData(raw: RawGameData): GameDataState {
  // Process characters
  const charactersData = raw.characters;
  const validCharacters: Character[] = Array.isArray(charactersData)
    ? charactersData.filter(validateCDNCharacter).map(adaptCDNCharacter)
    : [];

  // Process echoes
  const cdnEchoes: CDNEcho[] = Array.isArray(raw.echoes) ? raw.echoes : [];
  const echoes: Echo[] = cdnEchoes.filter(validateCDNEcho).map(adaptCDNEcho);
  const echoesByCost: Record<number, Echo[]> = {};
  COST_SECTIONS.forEach(cost => {
    echoesByCost[cost] = echoes
      .filter(echo => echo.cost === cost)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Process weapons
  const weaponMap = new Map<WeaponType, Weapon[]>();
  const weaponList: Weapon[] = [];
  const cdnWeapons: CDNWeapon[] = Array.isArray(raw.weapons) ? raw.weapons : [];
  for (const w of cdnWeapons) {
    if (!validateCDNWeapon(w)) continue;
    const weapon = adaptCDNWeapon(w);
    weaponList.push(weapon);
    const existing = weaponMap.get(weapon.type) ?? [];
    existing.push(weapon);
    weaponMap.set(weapon.type, existing);
  }

  // Split Stats.json into translations and icons
  const rawStatsData: Record<string, Record<string, string>> = (raw.stats as Record<string, Record<string, string>>) ?? {};
  const statTranslations: Record<string, Record<string, string>> = {};
  const statIcons: Record<string, string> = {};
  for (const [stat, entry] of Object.entries(rawStatsData)) {
    const { icon, ...langs } = entry as Record<string, string>;
    statTranslations[stat] = langs;
    if (icon) statIcons[stat] = icon;
  }

  // Index fetters by element
  const fetters: CDNFetter[] = Array.isArray(raw.fetters) ? raw.fetters : [];
  const fettersByElement: Partial<Record<ElementType, CDNFetter>> = {};
  for (const [groupIdStr, elementType] of Object.entries(FETTER_MAP)) {
    const groupId = Number(groupIdStr);
    const fetter = fetters.find(f => f.id === groupId);
    if (fetter) fettersByElement[elementType as ElementType] = fetter;
  }

  const echoStatsRaw = raw.echoStats as {
    subStats?: SubstatData;
    mainStats?: { [key: string]: { [statName: string]: [number, number] } };
    defaultMainStats?: { [key: string]: [string, number, number] };
  } | null;
  const mainStats = echoStatsRaw?.mainStats ?? null;
  const defaultMainStats = echoStatsRaw?.defaultMainStats ?? {};
  const normalizedMainStats = mainStats
    ? Object.fromEntries(
        Object.entries(mainStats).map(([costKey, statsByName]) => [
          costKey,
          {
            default: defaultMainStats[costKey] ?? ['ATK', 0, 0],
            mainStats: statsByName,
          },
        ])
      ) as MainStatData
    : null;

  return {
    characters: validCharacters,
    echoes,
    echoesByCost,
    weapons: weaponMap,
    weaponList,
    mainStats: normalizedMainStats,
    substats: echoStatsRaw?.subStats ?? null,
    statTranslations,
    statIcons,
    fetters,
    fettersByElement,
    characterCurves: (raw.characterCurves as CharacterCurve) ?? null,
    levelCurves: (raw.levelCurves as LevelCurves) ?? null,
  };
}

async function fetchRawGameData(): Promise<RawGameData> {
  const [
    charactersRes,
    echoesRes,
    weaponsRes,
    echoStatsRes,
    statsRes,
    fettersRes,
    characterCurvesRes,
    levelCurvesRes,
  ] = await Promise.all([
    fetch('/Data/Characters.json'),
    fetch('/Data/Echoes.json'),
    fetch('/Data/Weapons.json'),
    fetch('/Data/EchoStats.json'),
    fetch('/Data/Stats.json'),
    fetch('/Data/Fetters.json'),
    fetch('/Data/CharacterCurve.json'),
    fetch('/Data/LevelCurve.json'),
  ]);

  const responses = [
    { res: charactersRes, name: 'Characters' },
    { res: echoesRes, name: 'Echoes' },
    { res: weaponsRes, name: 'Weapons' },
    { res: echoStatsRes, name: 'Echo Stats' },
    { res: statsRes, name: 'Stat Translations' },
    { res: fettersRes, name: 'Fetters' },
    { res: characterCurvesRes, name: 'Character Curves' },
    { res: levelCurvesRes, name: 'Level Curves' },
  ];

  for (const { res, name } of responses) {
    if (!res.ok) {
      throw new Error(`Failed to load ${name}: ${res.status}`);
    }
  }

  const [
    characters,
    echoes,
    weapons,
    echoStats,
    stats,
    fetters,
    characterCurves,
    levelCurves,
  ] = await Promise.all([
    charactersRes.json(),
    echoesRes.json(),
    weaponsRes.json(),
    echoStatsRes.json(),
    statsRes.json(),
    fettersRes.json(),
    characterCurvesRes.json(),
    levelCurvesRes.json(),
  ]);

  return { characters, echoes, weapons, echoStats, stats, fetters, characterCurves, levelCurves };
}

async function loadGameDataState(): Promise<GameDataState> {
  if (cachedGameDataState) {
    return cachedGameDataState;
  }

  if (!gameDataLoadPromise) {
    gameDataLoadPromise = fetchRawGameData()
      .then((raw) => {
        const processed = processRawGameData(raw);
        cachedGameDataState = processed;
        return processed;
      })
      .catch((error) => {
        gameDataLoadPromise = null;
        throw error;
      });
  }

  return gameDataLoadPromise;
}

const GameDataContext = createContext<GameDataContextType | null>(null);

export const useGameData = (): GameDataContextType => {
  const context = useContext(GameDataContext);
  if (!context) {
    throw new Error('useGameData must be used within a GameDataProvider');
  }
  return context;
};

interface GameDataProviderProps {
  children: ReactNode;
}

export function GameDataProvider({ children }: GameDataProviderProps) {
  const [state, setState] = useState<GameDataState>(() => cachedGameDataState ?? emptyState);
  const [isLoading, setIsLoading] = useState<boolean>(() => cachedGameDataState === null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedGameDataState) {
      return;
    }

    let cancelled = false;

    loadGameDataState()
      .then((loadedState) => {
        if (cancelled) return;
        setState(loadedState);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error loading game data:', err);
        setLoadError(message);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getCharacter = useCallback((id: string | null): Character | null => {
    if (!id) return null;
    return state.characters.find(c => c.id === id) ?? null;
  }, [state.characters]);

  const getCharacterByName = useCallback((name: string): Character | null => {
    return state.characters.find(c => c.name === name) ?? null;
  }, [state.characters]);

  const getCharacterByLegacyId = useCallback((legacyId: string | null): Character | null => {
    if (!legacyId) return null;
    return state.characters.find((character) => character.legacyId === legacyId) ?? null;
  }, [state.characters]);

  const getEcho = useCallback((id: string | null): Echo | null => {
    if (!id) return null;
    return state.echoes.find((echo) => echo.id === id) ?? null;
  }, [state.echoes]);

  const getEchoByName = useCallback((name: string): Echo | null => {
    return state.echoes.find(e => e.name === name) ?? null;
  }, [state.echoes]);

  const getEchoByLegacyId = useCallback((legacyId: string | null): Echo | null => {
    if (!legacyId) return null;
    return state.echoes.find((echo) => echo.legacyId === legacyId) ?? null;
  }, [state.echoes]);

  const getFetterByElement = useCallback((element: ElementType): CDNFetter | undefined => {
    return state.fettersByElement[element];
  }, [state.fettersByElement]);

  const getWeapon = useCallback((id: string | null): Weapon | null => {
    if (!id) return null;
    return state.weaponList.find(w => w.id === id) ?? null;
  }, [state.weaponList]);

  const getWeaponsByType = useCallback((type: WeaponType): Weapon[] => {
    return state.weapons.get(type) ?? [];
  }, [state.weapons]);

  const getMainStatsByCost = useCallback((cost: number | null): { [statName: string]: [number, number] } => {
    if (!state.mainStats || !cost) return {};
    return state.mainStats[`${cost}cost`]?.mainStats || {};
  }, [state.mainStats]);

  const calculateMainStatValue = useCallback((min: number, max: number, level: number): number => {
    return min + ((max - min) * level / 25);
  }, []);

  const getSubstatValues = useCallback((stat: string): number[] | null => {
    return state.substats?.[stat] ?? null;
  }, [state.substats]);

  const getLowestSubstatValue = useCallback((stat: string): number | null => {
    return state.substats?.[stat]?.[0] ?? null;
  }, [state.substats]);

  const getAvailableSubstats = useCallback((): string[] => {
    return state.substats ? Object.keys(state.substats) : [];
  }, [state.substats]);

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

  const value = useMemo<GameDataContextType>(() => ({
    ...state,
    isLoading,
    loadError,
    getCharacter,
    getCharacterByLegacyId,
    getCharacterByName,
    getEcho,
    getEchoByLegacyId,
    getEchoByName,
    getFetterByElement,
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
    isLoading,
    loadError,
    getCharacter,
    getCharacterByLegacyId,
    getCharacterByName,
    getEcho,
    getEchoByLegacyId,
    getEchoByName,
    getFetterByElement,
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

export function GameDataLoadingGate({ children }: { children: ReactNode }) {
  const { isLoading, loadError } = useGameData();

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-360 items-center justify-center px-4 py-10 text-center text-text-primary">
        Failed to load game data. Please refresh and try again.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-360 items-center justify-center px-4 py-10 text-center text-text-primary/80">
        Loading game data...
      </div>
    );
  }

  return <>{children}</>;
}

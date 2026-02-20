'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import { EchoPanelState, ElementType } from '@/lib/echo';
import {
  SavedState,
  WatermarkState,
  ForteState,
  ForteEntry,
  DEFAULT_FORTE,
  DEFAULT_WATERMARK,
  createDefaultSavedState
} from '@/lib/build';
import { createDefaultEchoPanelState } from '@/lib/calculations/echoes';

/** Column index order: 0=normal-attack, 1=skill, 2=circuit, 3=liberation, 4=intro */
const FORTE_KEY_TO_INDEX: Record<string, number> = {
  'normal-attack': 0, skill: 1, circuit: 2, liberation: 3, intro: 4,
};
const TREE_TO_INDEX: Record<string, number> = {
  tree1: 0, tree2: 1, tree3: 2, tree4: 3, tree5: 4,
};

interface BuildState {
  characterId: string | null;
  characterLevel: number;
  roverElement?: string;
  sequence: number;
  weaponId: string | null;
  weaponLevel: number;
  weaponRank: number;
  forte: ForteState;
  echoPanels: EchoPanelState[];
  watermark: WatermarkState;
  isDirty: boolean;
}

type BuildAction =
  | { type: 'SET_CHARACTER'; payload: { id: string | null; roverElement?: string } }
  | { type: 'SET_CHARACTER_LEVEL'; payload: number }
  | { type: 'SET_ROVER_ELEMENT'; payload: string }
  | { type: 'SET_SEQUENCE'; payload: number }
  | { type: 'SET_WEAPON'; payload: string | null }
  | { type: 'SET_WEAPON_LEVEL'; payload: number }
  | { type: 'SET_WEAPON_RANK'; payload: number }
  | { type: 'SET_ECHO_PANEL'; payload: { index: number; panel: Partial<EchoPanelState> } }
  | { type: 'SET_ECHO_PANELS'; payload: EchoPanelState[] }
  | { type: 'REORDER_ECHO_PANELS'; payload: { from: number; to: number } }
  | { type: 'CLEAR_ECHO_PANEL'; payload: number }
  | { type: 'SET_FORTE'; payload: ForteState }
  | { type: 'SET_FORTE_COLUMN'; payload: { col: number; entry: ForteEntry } }
  | { type: 'SET_FORTE_LEVEL'; payload: { col: number; level: number } }
  | { type: 'SET_FORTE_NODE'; payload: { col: number; pos: 'top' | 'middle'; active: boolean } }
  | { type: 'MAX_ALL_FORTES' }
  | { type: 'RESET_FORTES' }
  | { type: 'SET_WATERMARK'; payload: Partial<WatermarkState> }
  | { type: 'LOAD_STATE'; payload: SavedState }
  | { type: 'RESET_BUILD' }
  | { type: 'MARK_CLEAN' };

interface BuildContextType {
  state: BuildState;
  dispatch: React.Dispatch<BuildAction>;

  // Character actions
  setCharacter: (id: string | null, roverElement?: string) => void;
  setCharacterLevel: (level: number) => void;
  setRoverElement: (element: string) => void;
  setSequence: (sequence: number) => void;

  // Weapon actions
  setWeapon: (id: string | null) => void;
  setWeaponLevel: (level: number) => void;
  setWeaponRank: (rank: number) => void;

  // Echo actions
  setEchoPanel: (index: number, panel: Partial<EchoPanelState>) => void;
  setEchoPanels: (panels: EchoPanelState[]) => void;
  reorderEchoPanels: (from: number, to: number) => void;
  clearEchoPanel: (index: number) => void;
  setEchoMainStat: (index: number, type: string | null, value: number | null) => void;
  setEchoSubStat: (index: number, subIndex: number, type: string | null, value: number | null) => void;
  setEchoElement: (index: number, element: ElementType | null) => void;
  setEchoLevel: (index: number, level: number) => void;
  setEchoPhantom: (index: number, phantom: boolean) => void;

  // Forte actions
  setForte: (forte: ForteState) => void;
  setForteLevel: (col: number, level: number) => void;
  setForteNode: (col: number, pos: 'top' | 'middle', active: boolean) => void;
  maxAllFortes: () => void;
  resetFortes: () => void;

  // Watermark actions
  setWatermark: (watermark: Partial<WatermarkState>) => void;

  // State management
  loadState: (savedState: SavedState) => void;
  resetBuild: () => void;
  getSavedState: () => SavedState;
  markClean: () => void;
}

const DRAFT_STORAGE_KEY = 'wuwa_draft_build';

const initialState: BuildState = {
  characterId: null,
  characterLevel: 1,
  roverElement: undefined,
  sequence: 0,
  weaponId: null,
  weaponLevel: 1,
  weaponRank: 1,
  forte: DEFAULT_FORTE.map(e => [...e]) as ForteState,
  echoPanels: Array(5).fill(null).map(() => createDefaultEchoPanelState()),
  watermark: { ...DEFAULT_WATERMARK },
  isDirty: false
};

/** Migrate old nodeStates+forteLevels into a ForteState array. */
function migrateToForteArray(raw: Record<string, unknown>): ForteState {
  // Already new format
  if (Array.isArray(raw.forte) && raw.forte.length === 5) {
    return raw.forte as ForteState;
  }

  const ns = (raw.nodeStates ?? {}) as Record<string, Record<string, boolean>>;
  const fl = (raw.forteLevels ?? {}) as Record<string, number>;

  const keys = ['normal-attack', 'skill', 'circuit', 'liberation', 'intro'];
  const trees = ['tree1', 'tree2', 'tree3', 'tree4', 'tree5'];

  return keys.map((key, i) => [
    fl[key] ?? 1,
    ns[trees[i]]?.top ?? false,
    ns[trees[i]]?.middle ?? false,
  ] as ForteEntry) as ForteState;
}

/** Read draft from localStorage synchronously (avoids flicker). */
function loadDraftFromStorage(): BuildState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved) return null;

    // Handle legacy nested shape (characterState / weaponState)
    if (saved.characterState) {
      const cs = saved.characterState;
      const ws = saved.weaponState ?? {};
      return {
        characterId: cs.id ?? null,
        characterLevel: parseInt(cs.level) || 1,
        roverElement: cs.element,
        sequence: saved.currentSequence ?? 0,
        weaponId: ws.id ?? null,
        weaponLevel: ws.level ?? 1,
        weaponRank: ws.rank ?? 1,
        forte: migrateToForteArray(saved),
        echoPanels: saved.echoPanels ?? Array(5).fill(null).map(() => createDefaultEchoPanelState()),
        watermark: saved.watermark ?? { ...DEFAULT_WATERMARK },
        isDirty: false,
      };
    }

    // New flat shape
    if (saved.characterId !== undefined) {
      return {
        ...saved,
        forte: migrateToForteArray(saved),
        isDirty: false,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/** Helper: clone forte and update a single column */
function updateForteCol(forte: ForteState, col: number, updater: (entry: ForteEntry) => ForteEntry): ForteState {
  const next = forte.map(e => [...e]) as ForteState;
  next[col] = updater(next[col]);
  return next;
}

function buildReducer(state: BuildState, action: BuildAction): BuildState {
  switch (action.type) {
    case 'SET_CHARACTER':
      return { ...state, characterId: action.payload.id, roverElement: action.payload.roverElement, isDirty: true };

    case 'SET_CHARACTER_LEVEL':
      return { ...state, characterLevel: action.payload, isDirty: true };

    case 'SET_ROVER_ELEMENT':
      return { ...state, roverElement: action.payload, isDirty: true };

    case 'SET_SEQUENCE':
      return { ...state, sequence: action.payload, isDirty: true };

    case 'SET_WEAPON':
      return { ...state, weaponId: action.payload, isDirty: true };

    case 'SET_WEAPON_LEVEL':
      return { ...state, weaponLevel: action.payload, isDirty: true };

    case 'SET_WEAPON_RANK':
      return { ...state, weaponRank: action.payload, isDirty: true };

    case 'SET_ECHO_PANEL': {
      const newPanels = [...state.echoPanels];
      newPanels[action.payload.index] = { ...newPanels[action.payload.index], ...action.payload.panel };
      return { ...state, echoPanels: newPanels, isDirty: true };
    }

    case 'SET_ECHO_PANELS':
      return { ...state, echoPanels: action.payload, isDirty: true };

    case 'REORDER_ECHO_PANELS': {
      const newPanels = [...state.echoPanels];
      const { from, to } = action.payload;
      // Swap the two panels directly instead of shifting
      const temp = newPanels[from];
      newPanels[from] = newPanels[to];
      newPanels[to] = temp;
      return { ...state, echoPanels: newPanels, isDirty: true };
    }

    case 'CLEAR_ECHO_PANEL': {
      const newPanels = [...state.echoPanels];
      newPanels[action.payload] = createDefaultEchoPanelState();
      return { ...state, echoPanels: newPanels, isDirty: true };
    }

    case 'SET_FORTE':
      return { ...state, forte: action.payload, isDirty: true };

    case 'SET_FORTE_COLUMN':
      return {
        ...state,
        forte: updateForteCol(state.forte, action.payload.col, () => action.payload.entry),
        isDirty: true,
      };

    case 'SET_FORTE_LEVEL':
      return {
        ...state,
        forte: updateForteCol(state.forte, action.payload.col, ([, t, m]) => [action.payload.level, t, m]),
        isDirty: true,
      };

    case 'SET_FORTE_NODE': {
      const { col, pos, active } = action.payload;
      return {
        ...state,
        forte: updateForteCol(state.forte, col, ([lv, t, m]) =>
          pos === 'top' ? [lv, active, m] : [lv, t, active]
        ),
        isDirty: true,
      };
    }

    case 'MAX_ALL_FORTES':
      return {
        ...state,
        forte: [
          [10, true, true],
          [10, true, true],
          [10, true, true],
          [10, true, true],
          [10, true, true],
        ] as ForteState,
        isDirty: true,
      };

    case 'RESET_FORTES':
      return { ...state, forte: DEFAULT_FORTE.map(e => [...e]) as ForteState, isDirty: true };

    case 'SET_WATERMARK':
      return { ...state, watermark: { ...state.watermark, ...action.payload }, isDirty: true };

    case 'LOAD_STATE':
      return {
        characterId: action.payload.characterId,
        characterLevel: action.payload.characterLevel,
        roverElement: action.payload.roverElement,
        sequence: action.payload.sequence,
        weaponId: action.payload.weaponId,
        weaponLevel: action.payload.weaponLevel,
        weaponRank: action.payload.weaponRank,
        forte: action.payload.forte,
        echoPanels: action.payload.echoPanels,
        watermark: action.payload.watermark,
        isDirty: false
      };

    case 'RESET_BUILD':
      return { ...initialState };

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

const BuildContext = createContext<BuildContextType | null>(null);

export const useBuild = (): BuildContextType => {
  const context = useContext(BuildContext);
  if (!context) {
    throw new Error('useBuild must be used within a BuildProvider');
  }
  return context;
};

interface BuildProviderProps {
  children: ReactNode;
  initialState?: SavedState;
}

export function BuildProvider({ children, initialState: providedInitialState }: BuildProviderProps) {
  const [state, dispatch] = useReducer(
    buildReducer,
    undefined,
    () => {
      if (providedInitialState) return { ...providedInitialState, isDirty: false };
      return loadDraftFromStorage() ?? initialState;
    }
  );

  // Auto-persist to localStorage (debounced 500ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const { isDirty: _, ...saved } = state;
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(saved));
      } catch { /* quota exceeded — silently ignore */ }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [state]);

  // Character actions
  const setCharacter = useCallback((id: string | null, roverElement?: string) => {
    dispatch({ type: 'SET_CHARACTER', payload: { id, roverElement } });
  }, []);

  const setCharacterLevel = useCallback((level: number) => {
    dispatch({ type: 'SET_CHARACTER_LEVEL', payload: level });
  }, []);

  const setRoverElement = useCallback((element: string) => {
    dispatch({ type: 'SET_ROVER_ELEMENT', payload: element });
  }, []);

  const setSequence = useCallback((sequence: number) => {
    dispatch({ type: 'SET_SEQUENCE', payload: sequence });
  }, []);

  // Weapon actions
  const setWeapon = useCallback((id: string | null) => {
    dispatch({ type: 'SET_WEAPON', payload: id });
  }, []);

  const setWeaponLevel = useCallback((level: number) => {
    dispatch({ type: 'SET_WEAPON_LEVEL', payload: level });
  }, []);

  const setWeaponRank = useCallback((rank: number) => {
    dispatch({ type: 'SET_WEAPON_RANK', payload: rank });
  }, []);

  // Echo actions
  const setEchoPanel = useCallback((index: number, panel: Partial<EchoPanelState>) => {
    dispatch({ type: 'SET_ECHO_PANEL', payload: { index, panel } });
  }, []);

  const setEchoPanels = useCallback((panels: EchoPanelState[]) => {
    dispatch({ type: 'SET_ECHO_PANELS', payload: panels });
  }, []);

  const reorderEchoPanels = useCallback((from: number, to: number) => {
    dispatch({ type: 'REORDER_ECHO_PANELS', payload: { from, to } });
  }, []);

  const clearEchoPanel = useCallback((index: number) => {
    dispatch({ type: 'CLEAR_ECHO_PANEL', payload: index });
  }, []);

  const setEchoMainStat = useCallback((index: number, type: string | null, value: number | null) => {
    dispatch({
      type: 'SET_ECHO_PANEL',
      payload: {
        index,
        panel: { stats: { ...state.echoPanels[index].stats, mainStat: { type, value } } }
      }
    });
  }, [state.echoPanels]);

  const setEchoSubStat = useCallback((index: number, subIndex: number, type: string | null, value: number | null) => {
    const newSubStats = [...state.echoPanels[index].stats.subStats];
    newSubStats[subIndex] = { type, value };
    dispatch({
      type: 'SET_ECHO_PANEL',
      payload: {
        index,
        panel: { stats: { ...state.echoPanels[index].stats, subStats: newSubStats } }
      }
    });
  }, [state.echoPanels]);

  const setEchoElement = useCallback((index: number, element: ElementType | null) => {
    dispatch({ type: 'SET_ECHO_PANEL', payload: { index, panel: { selectedElement: element } } });
  }, []);

  const setEchoLevel = useCallback((index: number, level: number) => {
    dispatch({ type: 'SET_ECHO_PANEL', payload: { index, panel: { level } } });
  }, []);

  const setEchoPhantom = useCallback((index: number, phantom: boolean) => {
    dispatch({ type: 'SET_ECHO_PANEL', payload: { index, panel: { phantom } } });
  }, []);

  // Forte actions
  const setForte = useCallback((forte: ForteState) => {
    dispatch({ type: 'SET_FORTE', payload: forte });
  }, []);

  const setForteLevel = useCallback((col: number, level: number) => {
    dispatch({ type: 'SET_FORTE_LEVEL', payload: { col, level } });
  }, []);

  const setForteNode = useCallback((col: number, pos: 'top' | 'middle', active: boolean) => {
    dispatch({ type: 'SET_FORTE_NODE', payload: { col, pos, active } });
  }, []);

  const maxAllFortes = useCallback(() => {
    dispatch({ type: 'MAX_ALL_FORTES' });
  }, []);

  const resetFortes = useCallback(() => {
    dispatch({ type: 'RESET_FORTES' });
  }, []);

  // Watermark actions
  const setWatermark = useCallback((watermark: Partial<WatermarkState>) => {
    dispatch({ type: 'SET_WATERMARK', payload: watermark });
  }, []);

  // State management
  const loadState = useCallback((savedState: SavedState) => {
    dispatch({ type: 'LOAD_STATE', payload: savedState });
  }, []);

  const resetBuild = useCallback(() => {
    dispatch({ type: 'RESET_BUILD' });
    try { window.localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const getSavedState = useCallback((): SavedState => {
    const { isDirty: _, ...rest } = state;
    return rest;
  }, [state]);

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' });
  }, []);

  // Context value
  const value = useMemo<BuildContextType>(() => ({
    state,
    dispatch,
    setCharacter,
    setCharacterLevel,
    setRoverElement,
    setSequence,
    setWeapon,
    setWeaponLevel,
    setWeaponRank,
    setEchoPanel,
    setEchoPanels,
    reorderEchoPanels,
    clearEchoPanel,
    setEchoMainStat,
    setEchoSubStat,
    setEchoElement,
    setEchoLevel,
    setEchoPhantom,
    setForte,
    setForteLevel,
    setForteNode,
    maxAllFortes,
    resetFortes,
    setWatermark,
    loadState,
    resetBuild,
    getSavedState,
    markClean
  }), [
    state,
    setCharacter,
    setCharacterLevel,
    setRoverElement,
    setSequence,
    setWeapon,
    setWeaponLevel,
    setWeaponRank,
    setEchoPanel,
    setEchoPanels,
    reorderEchoPanels,
    clearEchoPanel,
    setEchoMainStat,
    setEchoSubStat,
    setEchoElement,
    setEchoLevel,
    setEchoPhantom,
    setForte,
    setForteLevel,
    setForteNode,
    maxAllFortes,
    resetFortes,
    setWatermark,
    loadState,
    resetBuild,
    getSavedState,
    markClean
  ]);

  return (
    <BuildContext.Provider value={value}>
      {children}
    </BuildContext.Provider>
  );
}

export { FORTE_KEY_TO_INDEX, TREE_TO_INDEX };

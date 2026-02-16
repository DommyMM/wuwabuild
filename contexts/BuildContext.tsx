'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef, ReactNode } from 'react';
import { EchoPanelState, ElementType } from '@/types/echo';
import {
  SavedState,
  WatermarkState,
  ForteLevels,
  DEFAULT_FORTE_LEVELS,
  DEFAULT_WATERMARK,
  createDefaultEchoPanelState,
  createDefaultSavedState
} from '@/types/build';


interface BuildState {
  characterId: string | null;
  characterLevel: number;
  roverElement?: string;
  sequence: number;
  weaponId: string | null;
  weaponLevel: number;
  weaponRank: number;
  nodeStates: Record<string, Record<string, boolean>>;
  forteLevels: ForteLevels;
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
  | { type: 'SET_NODE_STATE'; payload: { tree: string; node: string; active: boolean } }
  | { type: 'SET_NODE_STATES'; payload: Record<string, Record<string, boolean>> }
  | { type: 'SET_FORTE_LEVEL'; payload: { skill: keyof ForteLevels; level: number } }
  | { type: 'SET_FORTE_LEVELS'; payload: ForteLevels }
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
  setNodeState: (tree: string, node: string, active: boolean) => void;
  setNodeStates: (nodeStates: Record<string, Record<string, boolean>>) => void;
  setForteLevel: (skill: keyof ForteLevels, level: number) => void;
  setForteLevels: (levels: ForteLevels) => void;
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
  nodeStates: {},
  forteLevels: { ...DEFAULT_FORTE_LEVELS },
  echoPanels: Array(5).fill(null).map(() => createDefaultEchoPanelState()),
  watermark: { ...DEFAULT_WATERMARK },
  isDirty: false
};

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
      return {
        characterId: saved.characterState.id ?? null,
        characterLevel: parseInt(saved.characterState.level) || 1,
        roverElement: saved.characterState.element,
        sequence: saved.currentSequence ?? 0,
        weaponId: saved.weaponState?.id ?? null,
        weaponLevel: saved.weaponState?.level ?? 1,
        weaponRank: saved.weaponState?.rank ?? 1,
        nodeStates: saved.nodeStates ?? {},
        forteLevels: saved.forteLevels ?? { ...DEFAULT_FORTE_LEVELS },
        echoPanels: saved.echoPanels ?? Array(5).fill(null).map(() => createDefaultEchoPanelState()),
        watermark: saved.watermark ?? { ...DEFAULT_WATERMARK },
        isDirty: false,
      };
    }

    // New flat shape
    if (saved.characterId !== undefined) {
      return { ...saved, isDirty: false };
    }

    return null;
  } catch {
    return null;
  }
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
      const [removed] = newPanels.splice(action.payload.from, 1);
      newPanels.splice(action.payload.to, 0, removed);
      return { ...state, echoPanels: newPanels, isDirty: true };
    }

    case 'CLEAR_ECHO_PANEL': {
      const newPanels = [...state.echoPanels];
      newPanels[action.payload] = createDefaultEchoPanelState();
      return { ...state, echoPanels: newPanels, isDirty: true };
    }

    case 'SET_NODE_STATE': {
      const { tree, node, active } = action.payload;
      return {
        ...state,
        nodeStates: { ...state.nodeStates, [tree]: { ...state.nodeStates[tree], [node]: active } },
        isDirty: true
      };
    }

    case 'SET_NODE_STATES':
      return { ...state, nodeStates: action.payload, isDirty: true };

    case 'SET_FORTE_LEVEL':
      return {
        ...state,
        forteLevels: { ...state.forteLevels, [action.payload.skill]: action.payload.level },
        isDirty: true
      };

    case 'SET_FORTE_LEVELS':
      return { ...state, forteLevels: action.payload, isDirty: true };

    case 'MAX_ALL_FORTES':
      return {
        ...state,
        forteLevels: { 'normal-attack': 10, skill: 10, circuit: 10, liberation: 10, intro: 10 },
        nodeStates: {
          tree1: { top: true, middle: true },
          tree2: { top: true, middle: true },
          tree3: {},
          tree4: { top: true, middle: true },
          tree5: { top: true, middle: true }
        },
        isDirty: true
      };

    case 'RESET_FORTES':
      return { ...state, forteLevels: { ...DEFAULT_FORTE_LEVELS }, nodeStates: {}, isDirty: true };

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
        nodeStates: action.payload.nodeStates,
        forteLevels: action.payload.forteLevels,
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
        // Strip false values from nodeStates to keep storage compact
        const compactNodes = Object.fromEntries(
          Object.entries(saved.nodeStates).map(([tree, nodes]) => [
            tree,
            Object.fromEntries(Object.entries(nodes).filter(([, v]) => v)),
          ])
        );
        window.localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ ...saved, nodeStates: compactNodes })
        );
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
  const setNodeState = useCallback((tree: string, node: string, active: boolean) => {
    dispatch({ type: 'SET_NODE_STATE', payload: { tree, node, active } });
  }, []);

  const setNodeStates = useCallback((nodeStates: Record<string, Record<string, boolean>>) => {
    dispatch({ type: 'SET_NODE_STATES', payload: nodeStates });
  }, []);

  const setForteLevel = useCallback((skill: keyof ForteLevels, level: number) => {
    dispatch({ type: 'SET_FORTE_LEVEL', payload: { skill, level } });
  }, []);

  const setForteLevels = useCallback((levels: ForteLevels) => {
    dispatch({ type: 'SET_FORTE_LEVELS', payload: levels });
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
    setNodeState,
    setNodeStates,
    setForteLevel,
    setForteLevels,
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
    setNodeState,
    setNodeStates,
    setForteLevel,
    setForteLevels,
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

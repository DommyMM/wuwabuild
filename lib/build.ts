import { EchoPanelState } from './echo';
import { createDefaultEchoPanelState } from './calculations/echoes';

export interface SavedEchoData {
  id: string;
  panelData: EchoPanelState;
}

export interface WatermarkState {
  username: string;
  uid: string;
}

/**
 * Per-column forte data: [level, topNode, middleNode]
 * Column order: normal-attack, skill, circuit, liberation, intro (tree1–5)
 */
export type ForteEntry = [number, boolean, boolean];

/** 5-column forte state matching tree1–5 */
export type ForteState = [ForteEntry, ForteEntry, ForteEntry, ForteEntry, ForteEntry];

/** @deprecated Use ForteState — kept for migration only */
export interface ForteLevels {
  'normal-attack': number;
  skill: number;
  circuit: number;
  liberation: number;
  intro: number;
}

export interface SavedState {
  version?: string;
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
  verified?: boolean;
}

export interface SavedBuild {
  id: string;
  name: string;
  date: string;
  state: SavedState;
}

export interface SavedBuilds {
  builds: SavedBuild[];
  savedEchoes?: SavedEchoData[];
  version: string;
}

// Default states for initialization
export const DEFAULT_WATERMARK: WatermarkState = {
  username: '',
  uid: ''
};

export const DEFAULT_FORTE_LEVELS: ForteLevels = {
  'normal-attack': 1,
  skill: 1,
  circuit: 1,
  liberation: 1,
  intro: 1
};

export const DEFAULT_FORTE: ForteState = [
  [1, false, false],
  [1, false, false],
  [1, false, false],
  [1, false, false],
  [1, false, false],
];

export const createDefaultSavedState = (): SavedState => ({
  characterId: null,
  characterLevel: 1,
  roverElement: undefined,
  sequence: 0,
  weaponId: null,
  weaponLevel: 1,
  weaponRank: 1,
  forte: DEFAULT_FORTE.map(e => [...e]) as ForteState,
  echoPanels: Array(5).fill(null).map(() => createDefaultEchoPanelState()),
  watermark: { ...DEFAULT_WATERMARK }
});

import { EchoPanelState } from './echo';
import { createDefaultEchoPanelState } from './calculations/echoes';

interface SavedEchoData {
  id: string;
  panelData: EchoPanelState;
}

export interface WatermarkState {
  username: string;
  uid: string;
  artSource: string;
}


/** One forte column: [level, top node unlocked, middle node unlocked] */
export type ForteEntry = [number, boolean, boolean];

/** Columns tree1 to tree5 in order: normal attack, skill, circuit, liberation, intro */
export type ForteState = [ForteEntry, ForteEntry, ForteEntry, ForteEntry, ForteEntry];

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

export const DEFAULT_WATERMARK: WatermarkState = {
  username: '',
  uid: '',
  artSource: '',
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

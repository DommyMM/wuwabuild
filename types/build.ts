import { EchoPanelState } from './echo';

export interface SavedEchoData {
  id: string;
  panelData: EchoPanelState;
}

export interface WatermarkState {
  username: string;
  uid: string;
}

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
  nodeStates: Record<string, Record<string, boolean>>;
  forteLevels: ForteLevels;
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

export const createDefaultEchoPanelState = (): EchoPanelState => ({
  id: null,
  level: 0,
  selectedElement: null,
  stats: {
    mainStat: { type: null, value: null },
    subStats: Array(5).fill(null).map(() => ({ type: null, value: null }))
  },
  phantom: false
});

export const createDefaultSavedState = (): SavedState => ({
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
  watermark: { ...DEFAULT_WATERMARK }
});

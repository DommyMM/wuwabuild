import { WeaponState } from './weapon';
import { EchoPanelState } from './echo';

export interface SavedEchoData {
    id: string;
    panelData: EchoPanelState;
}

export interface SavedState {
    version?: string;
    characterState: CharacterState;
    currentSequence: number;
    weaponState: WeaponState;
    nodeStates: Record<string, Record<string, boolean>>;
    forteLevels: Record<string, number>;
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

export interface CharacterState {
    id: string | null;
    level: string;
    element?: string;
}

export interface WatermarkState {
    username: string;
    uid: string;
}
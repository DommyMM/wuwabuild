import { CharacterState, WatermarkState } from '../pages/EditPage';
import { WeaponState } from '../types/weapon';
import { EchoPanelState } from '../types/echo';

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
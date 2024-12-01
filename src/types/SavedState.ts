import { ElementState, WatermarkState } from '../pages/EditPage';
import { WeaponState } from '../types/weapon';
import { EchoPanelState } from '../types/echo';

export interface SavedEchoData {
    id: string;
    date: string;
    panelIndex: number;
    panelData: EchoPanelState;
}

export interface SavedState {
    elementState: ElementState;
    characterLevel: string;
    currentSequence: number;
    weaponState: WeaponState;
    nodeStates: Record<string, Record<string, boolean>>;
    forteLevels: Record<string, number>;
    echoPanels: EchoPanelState[];
    watermark: WatermarkState;
    savedEchoes: SavedEchoData[];
}
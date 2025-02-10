import { SavedState } from '../../types/SavedState';
import { CompressedStats } from '../../hooks/useStats';
import { EchoPanelState } from '../../types/echo';
import { getCachedEchoes } from '../../hooks/useEchoes';
import { STAT_ORDER } from '../../types/stats';

export type Sequence = 's0' | 's1' | 's2' | 's3' | 's4' | 's5' | 's6';

export interface CompressedEntry {
    buildState: {
        c: { i: string; l: string; e: string; };
        w: { i: string; l: number; r: number; };
        e: any[];
        q: number;
        n: any;
        f: any;
        m: any;
    };
    stats: CompressedStats;
    cv: number;
    cvPenalty: number;
    finalCV: number;
    timestamp: string;
    calculations: Calculation[];
}

export interface DecompressedEntry {
    buildState: SavedState;
    stats: CompressedStats;
    cv: number;
    cvPenalty: number;
    finalCV: number;
    timestamp: string;
    calculations: Calculation[];
}

interface HitResult {
    name: string;     // Individual hit name
    damage: number;   // Hit damage
    percentage: number; // Hit's contribution percentage
}

export interface MoveResult {
    name: string;     // Move name
    damage: number;   // Total move damage
    hits?: HitResult[]; // Optional breakdown of individual hits
}

export interface SequenceData {
    damage: number;
    moves: MoveResult[];
}

export interface Calculation {
    weaponId: string;
    stats: Record<string, number>;
    s0: SequenceData;
    s1: SequenceData;
    s2: SequenceData;
    s3: SequenceData;
    s4: SequenceData;
    s5: SequenceData;
    s6: SequenceData;
}

export const getSetCounts = (echoPanels: EchoPanelState[]) => {
    return echoPanels.reduce((counts, panel) => {
        const echo = getCachedEchoes(panel.id);
        if (!echo) return counts;
        const element = panel.selectedElement || echo.elements[0];
        counts[element] = (counts[element] || 0) + 1;
        return counts;
    }, {} as Record<string, number>);
};

export const getHighestDmg = (values: Record<string, number>): [string, number] => {
    return Object.entries(values)
        .filter(([key]) => key.endsWith('DMG') && !key.includes('Crit') && !key.includes('Bonus'))
        .reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
};

export const getHighestDmgBonus = (values: Record<string, number>): [string, number] => {
    return Object.entries(values)
        .filter(([key]) => key.endsWith('DMG Bonus'))
        .reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
};

export const sumEchoSubstats = (echoPanels: EchoPanelState[]): Record<string, number> => {
    const sums = echoPanels.reduce((totals, panel) => {
        panel.stats.subStats.forEach(sub => {
            if (!sub.type || !sub.value) return;
            totals[sub.type] = (totals[sub.type] || 0) + sub.value;
        });
        return totals;
    }, {} as Record<string, number>);

    return Object.fromEntries(
        Object.entries(sums)
            .sort(([a], [b]) => {
                const indexA = STAT_ORDER.indexOf(a as typeof STAT_ORDER[number]);
                const indexB = STAT_ORDER.indexOf(b as typeof STAT_ORDER[number]);
                return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            })
    );
};

export const getDamageValue = (calculations: Calculation[], weaponId?: string, sequence: Sequence = 's0'): number => {
    if (weaponId) {
        const calc = calculations.find(calc => calc.weaponId === weaponId);
        return calc?.[sequence]?.damage || 0;
    }
    return Math.max(...calculations.map(calc => calc[sequence]?.damage || 0), 0);
};
import React, { useState } from 'react';
import { SavedBuilds, SavedState, SavedEchoData, WatermarkState } from '../../types/SavedState';
import { toast } from 'react-toastify';
import { ELEMENT_SETS, EchoPanelState } from '../../types/echo';
import { useMigrate } from '../../hooks/useMigrate';
import { ImportModal } from './Import';

interface BuildBackupProps {
    onImport: (builds: SavedBuilds) => void;
}

export const STAT_MAP = {
    "HP": "H",
    "HP%": "H%",
    "ATK": "A",
    "ATK%": "A%",
    "DEF": "D",
    "DEF%": "D%",
    "Crit Rate": "CR",
    "Crit DMG": "CD",
    "Aero DMG": "AD",
    "Glacio DMG": "GD",
    "Fusion DMG": "FD",
    "Electro DMG": "ED",
    "Havoc DMG": "HD",
    "Spectro DMG": "SD",
    "Basic Attack DMG Bonus": "BA",
    "Heavy Attack DMG Bonus": "HA",
    "Resonance Liberation DMG Bonus" : "RL",
    "Resonance Skill DMG Bonus": "RS",
    "Energy Regen": "ER",
    "Healing Bonus": "HB"
} as const;

export const REVERSE_STAT_MAP = Object.entries(STAT_MAP).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {} as Record<string, string>);

const ELEMENT_KEYS = Object.keys(ELEMENT_SETS) as (keyof typeof ELEMENT_SETS)[];

interface CompressedStat {
    t: string;
    v: number;
}

export interface CompressedEchoPanel {
    i: string;
    l: number;
    s: number;
    t: {
        m: CompressedStat;
        s: CompressedStat[];
    } | null;
    p: boolean;
}

interface CompressedBuildState {
    c: {
        i: string;
        l: string;
        e: string;
    };
    w: {
        i: string;
        l: string;
        r: number;
    };
    e: CompressedEchoPanel[];
    q: number;
    n: Record<string, Record<string, boolean>>;
    f: {
        na: number;
        sk: number;
        ci: number;
        li: number;
        in: number;
    };
    m: WatermarkState;
}

export const compressStats = (stat: { type: string | null; value: number | null }): CompressedStat => ({
    t: STAT_MAP[stat.type as keyof typeof STAT_MAP] || stat.type || '',
    v: Number((stat.value || 0).toFixed(1))
});

export const decompressStats = (stat: CompressedStat): { type: string; value: number } => ({
    type: REVERSE_STAT_MAP[stat.t] || stat.t,
    value: stat.v
});

export const compressEchoPanel = (panel: EchoPanelState): CompressedEchoPanel => ({
    i: panel.id || '',
    l: panel.level,
    s: panel.selectedElement ? ELEMENT_KEYS.indexOf(panel.selectedElement) : -1,
    t: panel.stats ? {
        m: compressStats(panel.stats.mainStat),
        s: panel.stats.subStats?.map(compressStats) || []
    } : null,
    p: panel.phantom || false
});

export const decompressEchoPanel = (panel: CompressedEchoPanel): EchoPanelState => ({
    id: panel.i,
    level: panel.l,
    selectedElement: panel.s !== -1 ? ELEMENT_KEYS[panel.s] : null,
    stats: panel.t ? {
        mainStat: decompressStats(panel.t.m),
        subStats: panel.t.s.map(decompressStats)
    } : {
        mainStat: { type: null, value: null },
        subStats: Array(5).fill({ type: null, value: null })
    },
    phantom: panel.p || false
});

export const compressData = (build: { state: SavedState }): { state: CompressedBuildState } => ({
    ...build,
    state: {
        c: {
            i: build.state.characterState.id || '',
            l: build.state.characterState.level.toString(),
            e: build.state.characterState.element || ''
        },
        w: {
            i: build.state.weaponState.id || '', 
            l: build.state.weaponState.level.toString(),
            r: build.state.weaponState.rank
        },
        e: build.state.echoPanels.map(compressEchoPanel),
        q: build.state.currentSequence,
        n: build.state.nodeStates || {},
        f: {
            na: build.state.forteLevels['normal-attack'] || 0,
            sk: build.state.forteLevels.skill || 0,
            ci: build.state.forteLevels.circuit || 0,
            li: build.state.forteLevels.liberation || 0,
            in: build.state.forteLevels.intro || 0
        },
        m: build.state.watermark
    }
});

export const decompressData = (build: { state: CompressedBuildState }): { state: SavedState } => ({
    ...build,
    state: {
        characterState: {
            id: build.state.c.i || null,
            level: build.state.c.l,
            element: build.state.c.e || undefined
        },
        weaponState: {
            id: build.state.w.i || null,
            level: parseInt(build.state.w.l, 10),
            rank: build.state.w.r
        },
        echoPanels: build.state.e.map(decompressEchoPanel),
        currentSequence: build.state.q,
        nodeStates: build.state.n,
        forteLevels: {
            'normal-attack': build.state.f.na,
            skill: build.state.f.sk,
            circuit: build.state.f.ci,
            liberation: build.state.f.li,
            intro: build.state.f.in
        },
        watermark: build.state.m || {
            username: '',
            uid: ''
        }
    }
});

export const BuildBackup: React.FC<BuildBackupProps> = ({ onImport }) => {
    const { migrateData } = useMigrate();
    const [importData, setImportData] = useState<SavedBuilds | null>(null);
    
    const handleExport = () => {
        const savedBuilds = localStorage.getItem('saved_builds');
        const savedEchoes = localStorage.getItem('saved_echoes');
        if (!savedBuilds) {
            toast.error('No builds to export');
            return;
        }
        try {
            const builds = JSON.parse(savedBuilds);
            const echoes = JSON.parse(savedEchoes || '[]');
            const compressed = {
                version: '1.0.2',
                builds: builds.builds.map(compressData),
                savedEchoes: echoes.map((echo: SavedEchoData) => ({
                    id: echo.id,
                    panelData: compressEchoPanel(echo.panelData)
                }))
            };
            const timestamp = new Date().toISOString().slice(0,19).replace(/[T:]/g, ' ');
            const blob = new Blob([JSON.stringify(compressed)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `wuwabuilds_backup_${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('Builds exported');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export');
        }
    };
    
    const processImport = async (file: File) => {
        try {
            const text = await file.text();
            let imported = JSON.parse(text);
            imported = migrateData(imported);
            
            const decompressed = {
                version: '1.0.2',
                builds: imported.builds.map(decompressData),
                savedEchoes: imported.savedEchoes?.map((echo: { 
                    id: string; 
                    panelData: CompressedEchoPanel 
                }) => ({
                    id: echo.id,
                    panelData: decompressEchoPanel(echo.panelData)
                })) || []
            };
            
            setImportData(decompressed);
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Failed to import builds');
        }
    };
    return (
        <>
            <button className="backup-button" onClick={handleExport}>
                Export Builds
            </button>
            <label className="backup-button">
                Import Builds
                <input type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processImport(file);
                        e.target.value = '';
                    }}
                />
            </label>
            {importData && (
                <ImportModal buildCount={importData.builds.length}
                    echoCount={importData.savedEchoes?.length || 0}
                    onMerge={() => {
                        onImport(importData);
                        setImportData(null);
                        toast.success('Data merged');
                    }}
                    onReplace={() => {
                        localStorage.removeItem('saved_builds');
                        localStorage.removeItem('saved_echoes');
                        onImport(importData);
                        setImportData(null);
                        toast.success('All data replaced');
                    }}
                    onClose={() => setImportData(null)}
                />
            )}
        </>
    );
};
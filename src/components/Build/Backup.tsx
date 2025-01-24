import React, { useState } from 'react';
import { SavedBuilds } from '../../types/SavedState';
import { toast } from 'react-toastify';
import { ELEMENT_SETS } from '../../types/echo';
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
    "Basic Attack": "BA",
    "Heavy Attack": "HA",
    "Liberation" : "L",
    "Energy Regen": "ER",
    "Healing Bonus": "HB"
} as const;

export const REVERSE_STAT_MAP = Object.entries(STAT_MAP).reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {} as Record<string, string>);

const ELEMENT_KEYS = Object.keys(ELEMENT_SETS) as (keyof typeof ELEMENT_SETS)[];

export const compressStats = (stat: any) => ({
    t: STAT_MAP[stat.type as keyof typeof STAT_MAP] || stat.type,
    v: stat.value
});

export const decompressStats = (stat: any) => ({
    type: REVERSE_STAT_MAP[stat.t] || stat.t,
    value: stat.v
});

export const compressEchoPanel = (panel: any) => ({
    i: panel.id,
    l: panel.level,
    s: panel.selectedElement ? ELEMENT_KEYS.indexOf(panel.selectedElement) : -1,
    t: panel.stats ? {
        m: compressStats(panel.stats.mainStat),
        s: panel.stats.subStats?.map(compressStats) || []
    } : null,
    p: panel.phantom || false
});

export const decompressEchoPanel = (panel: any) => ({
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

export const compressData = (build: any) => ({
    ...build,
    state: {
        c: {
            i: build.state.characterState.id,
            l: build.state.characterState.level,
            e: build.state.characterState.element
        },
        w: {
            i: build.state.weaponState.id,
            l: build.state.weaponState.level,
            r: build.state.weaponState.rank
        },
        e: build.state.echoPanels.map(compressEchoPanel),
        q: build.state.currentSequence,
        n: build.state.nodeStates,
        f: {
            na: build.state.forteLevels['normal-attack'],
            sk: build.state.forteLevels.skill,
            ci: build.state.forteLevels.circuit,
            li: build.state.forteLevels.liberation,
            in: build.state.forteLevels.intro
        },
        m: build.state.watermark
    }
});

export const decompressData = (build: any) => ({
    ...build,
    state: {
        characterState: {
            id: build.state.c.i,
            level: build.state.c.l,
            element: build.state.c.e
        },
        weaponState: {
            id: build.state.w.i,
            level: build.state.w.l,
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
        watermark: build.state.m
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
                savedEchoes: echoes.map((echo: any) => ({
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
                savedEchoes: imported.savedEchoes?.map((echo: any) => ({
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
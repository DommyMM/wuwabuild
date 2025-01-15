import React from 'react';
import { SavedBuilds } from '../../types/SavedState';
import { toast } from 'react-toastify';
import { cachedCharacters } from '../../hooks/useCharacters';
import { cachedEchoes } from '../../hooks/useEchoes';
import { weaponList } from '../../hooks/useWeapons';
import { ELEMENT_SETS } from '../../types/echo';

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

export const BuildBackup: React.FC<BuildBackupProps> = ({ onImport }) => {
    const compressStats = (stat: any) => ({
        t: STAT_MAP[stat.type as keyof typeof STAT_MAP] || stat.type,
        v: stat.value
    });
    const decompressStats = (stat: any) => ({
        type: REVERSE_STAT_MAP[stat.t] || stat.t,
        value: stat.v
    });
    const ELEMENT_KEYS = Object.keys(ELEMENT_SETS) as (keyof typeof ELEMENT_SETS)[];
    const compressData = (build: any) => ({
        ...build,
        state: {
            c: {
                i: build.state.characterState.id,
                l: build.state.characterState.level,
                e: build.state.characterState.element
            },
            w: {
                s: build.state.weaponState.selectedWeapon ? 
                    weaponList.findIndex(w => w.name === build.state.weaponState.selectedWeapon.name) : -1,
                c: {
                    l: build.state.weaponState.config.level,
                    r: build.state.weaponState.config.rank
                }
            },
            e: build.state.echoPanels.map((panel: any) => ({
                e: panel.echo ? {
                    n: cachedEchoes?.findIndex(e => e.name === panel.echo.name) ?? -1
                } : null,
                l: panel.level,
                s: panel.selectedElement ? ELEMENT_KEYS.indexOf(panel.selectedElement) : -1,
                t: panel.stats ? {
                    m: compressStats(panel.stats.mainStat),
                    s: panel.stats.subStats?.map(compressStats) || []
                } : null,
                p: panel.phantom || false
            })),
            q: build.state.currentSequence,
            n: {
                t1: build.state.nodeStates.tree1,
                t2: build.state.nodeStates.tree2,
                t3: build.state.nodeStates.tree3,
                t4: build.state.nodeStates.tree4,
                t5: build.state.nodeStates.tree5
            },
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
    const decompressData = (build: any) => ({
        ...build,
        state: {
            characterState: {
                id: build.state.c.i,
                level: build.state.c.l,
                element: build.state.c.e
            },
            weaponState: {
                selectedWeapon: build.state.w.s !== -1 ? weaponList[build.state.w.s] : null,
                config: {
                    level: build.state.w.c.l,
                    rank: build.state.w.c.r
                }
            },
            echoPanels: build.state.e.map((panel: any) => {
                const echoIndex = panel.e?.n ?? -1;
                const echo = echoIndex !== -1 ? cachedEchoes![echoIndex] : null;
                return {
                    echo: echo ? {
                        ...echo,
                        name: echo.name,
                        cost: echo.cost,
                        elements: echo.elements
                    } : null,
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
                };
            }),
            currentSequence: build.state.q,
            nodeStates: {
                tree1: build.state.n.t1,
                tree2: build.state.n.t2,
                tree3: build.state.n.t3,
                tree4: build.state.n.t4,
                tree5: build.state.n.t5
            },
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
    const handleExport = () => {
        const savedBuilds = localStorage.getItem('wuwabuilds_builds');
        if (!savedBuilds) {
            toast.error('No builds to export');
            return;
        }
        if (!cachedCharacters || !cachedEchoes) {
            toast.error('Reference data not loaded');
            return;
        }
        try {
            const builds = JSON.parse(savedBuilds);
            const compressed = {
                version: '1.0.0',
                builds: builds.builds.map(compressData)
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
            toast.error('Failed to export builds');
        }
    };

    const handleImport = async (file: File) => {
        if (!cachedCharacters || !cachedEchoes) {
            toast.error('Reference data not loaded');
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.version && data.version !== '1.0.0') {
                toast.warning('Importing from different version');
            }

            const decompressed = {
                builds: data.builds.map(decompressData)
            };
            onImport(decompressed);
            toast.success('Builds imported');
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Failed to import');
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
                        if (file) handleImport(file);
                        e.target.value = '';
                    }}
                />
            </label>
        </>
    );
};
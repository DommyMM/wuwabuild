import React from 'react';
import { SavedBuilds } from '../../types/SavedState';
import { toast } from 'react-toastify';
import { cachedCharacters } from '../../hooks/useCharacters';
import { cachedEchoes } from '../../hooks/useEchoes';
import { weaponList } from '../../hooks/useWeapons';
import { isRover } from '../../types/character';
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
            ...build.state,
            elementState: {
                selectedCharacter: build.state.elementState.selectedCharacter?.id || null,
                ...(isRover(build.state.elementState.selectedCharacter) && {
                    isSpectro: build.state.elementState.elementValue === 'Spectro'
                })
            },
            weaponState: {
                selectedWeapon: weaponList.findIndex(w => 
                    w.name === build.state.weaponState.selectedWeapon.name),
                config: build.state.weaponState.config
            },
            echoPanels: build.state.echoPanels.map((panel: any) => ({
                ...panel,
                echo: {
                    name: cachedEchoes!.findIndex(e => e.name === panel.echo.name)
                },
                se: ELEMENT_KEYS.indexOf(panel.selectedElement),
                stats: {
                    mainStat: compressStats(panel.stats.mainStat),
                    subStats: panel.stats.subStats.map(compressStats)
                }
            }))
        }
    });
    const decompressData = (build: any) => {
        const character = cachedCharacters!.find(c => c.id === build.state.elementState.selectedCharacter);
        if (!character) return build;
        const weapon = weaponList[build.state.weaponState.selectedWeapon];
        const elementValue = isRover(character) 
            ? (build.state.elementState.isSpectro ? 'Spectro' : 'Havoc')
            : character.element;
        return {
            ...build,
            state: {
                ...build.state,
                elementState: {
                    selectedCharacter: character,
                    elementValue,
                    displayName: isRover(character) ? `Rover (${elementValue})` : character.name
                },
                weaponState: {
                    selectedWeapon: weapon,
                    config: build.state.weaponState.config
                },
                echoPanels: build.state.echoPanels.map((panel: any) => {
                    const echo = cachedEchoes![panel.echo.name];
                    return {
                        ...panel,
                        echo: {
                            ...echo,
                            name: echo.name,
                            cost: echo.cost,
                            elements: echo.elements
                        },
                        selectedElement: ELEMENT_KEYS[panel.se],
                        stats: {
                            mainStat: decompressStats(panel.stats.mainStat),
                            subStats: panel.stats.subStats.map(decompressStats)
                        }
                    };
                })
            }
        };
    };
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
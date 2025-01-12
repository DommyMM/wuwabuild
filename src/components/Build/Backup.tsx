import React from 'react';
import { SavedBuilds } from '../../types/SavedState';
import { toast } from 'react-toastify';

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
    const handleExport = () => {
        const savedBuilds = localStorage.getItem('wuwabuilds_builds');
        if (!savedBuilds) {
            toast.error('No builds to export');
            return;
        }
        try {
            const builds = JSON.parse(savedBuilds);
            const compressed = {
                builds: builds.builds.map((build: any) => ({
                    ...build,
                    state: {
                        ...build.state,
                        echoPanels: build.state.echoPanels.map((panel: any) => ({
                            ...panel,
                            stats: {
                                mainStat: compressStats(panel.stats.mainStat),
                                subStats: panel.stats.subStats.map(compressStats)
                            }
                        }))
                    }
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
            toast.error('Failed to export builds');
        }
    };
    const handleImport = async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const decompressed = {
                builds: data.builds.map((build: any) => ({
                    ...build,
                    state: {
                        ...build.state,
                        echoPanels: build.state.echoPanels.map((panel: any) => ({
                            ...panel,
                            stats: {
                                mainStat: decompressStats(panel.stats.mainStat),
                                subStats: panel.stats.subStats.map(decompressStats)
                            }
                        }))
                    }
                }))
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
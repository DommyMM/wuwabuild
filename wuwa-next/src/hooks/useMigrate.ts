'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { cachedEchoes } from './useEchoes';

interface LegacyEchoPanel {
    e?: {
        n: number;
    };
    i?: string;
}

interface LegacyWeapon {
    i: string;
    c?: {
        l: number;
        r: number;
    };
}

interface LegacyBuild {
    state: {
        e: LegacyEchoPanel[];
        w: LegacyWeapon;
    };
}

interface LegacyData {
    builds?: LegacyBuild[];
    version?: string;
}

interface MigratedEchoPanel {
    i: string | null;
    e?: undefined;
}

interface MigratedWeapon {
    i: string;
    l: number;
    r: number;
}

interface MigratedBuild {
    state: {
        e: (LegacyEchoPanel | MigratedEchoPanel)[];
        w: MigratedWeapon;
    };
}

interface MigratedData {
    version: string;
    builds: MigratedBuild[];
}

export const useMigrate = () => {
    const [isMigrating, setIsMigrating] = useState(false);
    
    const isLegacyEcho = useCallback((panel: LegacyEchoPanel): panel is LegacyEchoPanel & { e: { n: number } } => {
        return panel.e?.n !== undefined && panel.e.n !== -1;
    }, []);

    const migrateEcho = useCallback((panel: LegacyEchoPanel): MigratedEchoPanel => {
        if (!isLegacyEcho(panel)) {
            return { i: panel.i ?? null };
        }
        
        const echo = cachedEchoes?.[panel.e.n];
        return {
            i: echo?.id ?? null,
        };
    }, [isLegacyEcho]);

    const isLegacyWeapon = useCallback((weapon: LegacyWeapon): weapon is LegacyWeapon & { c: { l: number; r?: number } } => {
        return weapon.c !== undefined;
    }, []);

    const migrateWeapon = useCallback((weapon: LegacyWeapon): MigratedWeapon => {
        if (!isLegacyWeapon(weapon)) {
            throw new Error('Invalid weapon data');
        }
        
        return {
            i: weapon.i,
            l: weapon.c.l,
            r: weapon.c.r ?? 1
        };
    }, [isLegacyWeapon]);

    const migrateBuild = useCallback((build: LegacyBuild) => ({
        ...build,
        state: {
        ...build.state,
        e: build.state.e.map(migrateEcho),
        w: migrateWeapon(build.state.w)
        }
    }), [migrateEcho, migrateWeapon]);

    const migrateData = useCallback((data: LegacyData): LegacyData | MigratedData => {
        setIsMigrating(true);
        try {
            if (!data.builds?.length) {
                return {
                    version: '1.0.2',
                    builds: []
                };
            }
            const hasLegacyEchoes = data.builds.some((build) => 
                build.state.e?.some(isLegacyEcho)
            );
            if (!hasLegacyEchoes) {
                return data;
            }
            const migratedData: MigratedData = {
                version: '1.0.2',
                builds: data.builds.map(migrateBuild)
            };
            toast.info('Migrated legacy echo format');
            return migratedData;
        } catch (error) {
            console.error('Migration failed:', error);
            toast.error('Failed to migrate data');
            return data;
        } finally {
            setIsMigrating(false);
        }
    }, [isLegacyEcho, migrateBuild]);
    const migrateLocalStorage = useCallback(() => {
        try {
            const storage = localStorage.getItem('saved_builds');
            if (!storage) return;
            const data = JSON.parse(storage);
            const migratedData = migrateData(data);
            
            if (migratedData !== data) {
                localStorage.setItem('saved_builds', JSON.stringify(migratedData));
            }
        } catch (error) {
            console.error('Local storage migration failed:', error);
        }
    }, [migrateData]);
    useEffect(() => {
        migrateLocalStorage();
    }, [migrateLocalStorage]);
    return {
        isMigrating,
        migrateData,
        isLegacyEcho,
    };
};
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { cachedEchoes } from './useEchoes';

export const useMigrate = () => {
    const [isMigrating, setIsMigrating] = useState(false);
    const isLegacyEcho = useCallback((panel: any) => 
        panel.e?.n !== undefined && panel.e.n !== -1
    , []);
    const migrateEcho = useCallback((panel: any) => {
        if (!isLegacyEcho(panel)) return panel;
        
        const echo = cachedEchoes?.[panel.e.n];
        return {
            ...panel,
            i: echo?.id || null,
            e: undefined
        };
    }, [isLegacyEcho]);

    const isLegacyWeapon = useCallback((weapon: any) => 
        weapon.c !== undefined
    , []);

    const migrateWeapon = useCallback((weapon: any) => {
        if (!isLegacyWeapon(weapon)) return weapon;
        
        return {
            i: weapon.i,
            l: weapon.c.l,
            r: weapon.c.r || 1
        };
    }, [isLegacyWeapon]);

    const migrateBuild = useCallback((build: any) => ({
        ...build,
        state: {
            ...build.state,
            e: build.state.e.map(migrateEcho),
            w: migrateWeapon(build.state.w)
        }
    }), [migrateEcho, migrateWeapon]);

    const migrateData = useCallback((data: any) => {
        setIsMigrating(true);
        try {
            const hasLegacyEchoes = data.builds?.some((build: any) => 
                build.state.e?.some(isLegacyEcho)
            );
            if (!hasLegacyEchoes) {
                return data;
            }
            const migratedData = {
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
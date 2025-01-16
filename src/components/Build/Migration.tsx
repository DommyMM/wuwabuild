import { toast } from 'react-toastify';
import { weaponList } from '../../hooks/useWeapons';

interface OldWeaponState {
    w: {
        s: number;
        c: {
            l: number;
            r: number;
        };
    };
}

const migrateWeaponState = (oldState: OldWeaponState) => {
    if (oldState?.w == null) {
        return oldState;
    }
    if (typeof oldState.w.s !== 'number') {
        return {
            ...oldState,
            w: { i: null, l: 1, r: 1 }
        };
    }
    if (oldState.w.s === -1) {
        return {
            ...oldState,
            w: { i: null, l: 1, r: 1 }
        };
    }
    if (oldState.w.s < 0 || oldState.w.s >= weaponList.length) {
        return {
            ...oldState,
            w: { i: null, l: oldState.w.c.l, r: oldState.w.c.r }
        };
    }
    const weapon = weaponList[oldState.w.s];
    return {
        ...oldState,
        w: {
            i: weapon?.id ?? null,
            l: oldState.w.c.l,
            r: oldState.w.c.r
        }
    };
};

export const autoMigrate = () => {
    try {
        const storage = localStorage.getItem('saved_builds');
        if (!storage) return;
        const data = JSON.parse(storage);
        if (data.version !== '1.0.0') return;
        const migratedBuilds = {
            version: '1.0.1',
            builds: data.builds.map((build: any) => ({
                ...build,
                state: migrateWeaponState(build.state)
            }))
        };
        localStorage.setItem('saved_builds', JSON.stringify(migratedBuilds));
        toast.success('Builds migrated to v1.0.1');
    } catch (error) {
        console.error('Migration failed:', error);
        toast.error('Failed to migrate builds');
    }
};
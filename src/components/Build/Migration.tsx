import { toast } from 'react-toastify';
import { cachedEchoes } from '../../hooks/useEchoes';

const migrateEchoState = (oldPanel: any) => {
    if (!oldPanel.e || oldPanel.e.n === undefined || oldPanel.e.n === -1) return oldPanel;
    
    const echo = cachedEchoes?.[oldPanel.e.n];
    return {
        ...oldPanel,
        id: echo?.id || null,
        e: undefined
    };
};

export const autoMigrate = () => {
    try {
        const storage = localStorage.getItem('saved_builds');
        if (!storage) return;
        const data = JSON.parse(storage);
        if (data.version !== '1.0.1') return;

        const migratedBuilds = {
            version: '1.0.2',
            builds: data.builds.map((build: any) => ({
                ...build,
                state: {
                    ...build.state,
                    e: build.state.e.map(migrateEchoState)
                }
            }))
        };

        localStorage.setItem('saved_builds', JSON.stringify(migratedBuilds));
        toast.success('Builds migrated to v1.0.2');
    } catch (error) {
        console.error('Migration failed:', error);
        toast.error('Failed to migrate builds');
    }
};
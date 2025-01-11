import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SavedBuild, SavedBuilds } from '../types/SavedState';
import { ELEMENT_SETS, EchoPanelState } from '../types/echo';
import { Search, SortAsc } from 'lucide-react';
import '../styles/BuildPage.css';

export const BuildsPage: React.FC = () => {
    const [builds, setBuilds] = useState<SavedBuild[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'character' | 'cv'>('date');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const savedBuilds = localStorage.getItem('wuwabuilds_builds');
        if (savedBuilds) {
            const { builds: loadedBuilds } = JSON.parse(savedBuilds) as SavedBuilds;
            setBuilds(loadedBuilds);
        }
    }, []);

    const handleDelete = (id: string) => {
        if (deleteConfirm !== id) {
            setDeleteConfirm(id);
            return;
        }

        const newBuilds = builds.filter(build => build.id !== id);
        localStorage.setItem('wuwabuilds_builds', JSON.stringify({ builds: newBuilds }));
        setBuilds(newBuilds);
        setDeleteConfirm(null);
    };

    const handleLoad = (build: SavedBuild) => {
        localStorage.setItem('wuwabuilds_state', JSON.stringify(build.state));
        navigate('/edit');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateCV = (echoPanels: EchoPanelState[]) => {
        const sumStats = (stat: string) => 
            echoPanels.reduce((total, panel) => {
                const mainValue = panel.stats.mainStat.type === stat 
                    ? (panel.stats.mainStat.value ?? 0) 
                    : 0;
                const subValues = panel.stats.subStats
                    .filter(s => s.type === stat)
                    .reduce((sum, s) => sum + (s.value ?? 0), 0);
                return total + mainValue + subValues;
            }, 0);
        const critRate = sumStats('Crit Rate');
        const critDmg = sumStats('Crit DMG');
        return (2 * critRate + critDmg).toFixed(1);
    };

    const getSetInfo = (echoPanels: EchoPanelState[]) => {
        const setCounts = echoPanels.reduce((counts, panel) => {
            if (!panel.echo) return counts;
            const element = panel.selectedElement || panel.echo.elements[0];
            counts[element] = (counts[element] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);
    
        return Object.entries(setCounts)
            .filter(([_, count]) => count >= 2)
            .map(([element, count], index, array) => (
                <React.Fragment key={element}>
                    <span className={`build-sets ${element.toLowerCase()}`}>
                        {ELEMENT_SETS[element as keyof typeof ELEMENT_SETS]} ({count})
                    </span>
                    {index < array.length - 1 && " • "}
                </React.Fragment>
            ));
    };
    const getCVClass = (cv: number): string => {
        if (cv >= 230) return 'cv-value goat';
        if (cv >= 220) return 'cv-value excellent';
        if (cv >= 205) return 'cv-value high';
        if (cv >= 195) return 'cv-value good';
        if (cv >= 175) return 'cv-value decent';
        return 'cv-value low';
    };

    const filteredAndSortedBuilds = builds
        .filter(build => {
            const searchLower = searchTerm.toLowerCase();
            return (
                build.name.toLowerCase().includes(searchLower) ||
                build.state.elementState.selectedCharacter?.name.toLowerCase().includes(searchLower) ||
                build.state.weaponState.selectedWeapon?.name.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'character': return (a.state.elementState.selectedCharacter?.name ?? '')
                    .localeCompare(b.state.elementState.selectedCharacter?.name ?? '');
                case 'cv': return Number(calculateCV(b.state.echoPanels)) - Number(calculateCV(a.state.echoPanels));
                default: return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
        });

    return (
        <div className="builds-page">
            <div className="builds-controls">
                <div className="search-control">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search builds..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="sort-control">
                    <SortAsc size={20} className="sort-icon" />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="character">Character</option>
                        <option value="cv">CV</option>
                    </select>
                </div>
            </div>

            <div className="builds-grid">
                {filteredAndSortedBuilds.map(build => (
                    <div key={build.id} className="build-preview">
                        <div className="build-header">
                            <h3>{build.name}</h3>
                            <span className="build-date">{formatDate(build.date)}</span>
                        </div>
                        <div className="build-info">
                            <div className="info-row">
                                <span className="char">{build.state.elementState.selectedCharacter?.name}</span>
                                <span>Lv.{build.state.characterLevel} • Sequence {build.state.currentSequence}</span>
                            </div>
                            <div className="info-row">
                                <span className='weap'>{build.state.weaponState.selectedWeapon?.name || 'No Weapon'}</span>
                                <span>Lv.{build.state.weaponState.config.level} • R{build.state.weaponState.config.rank}</span>
                            </div>
                            <div className="info-row">
                                {getSetInfo(build.state.echoPanels)}
                                <span className={getCVClass(Number(calculateCV(build.state.echoPanels)))}>
                                    CV: {calculateCV(build.state.echoPanels)}
                                </span>
                            </div>
                        </div>
                        <div className="build-actions">
                            <button onClick={() => handleLoad(build)}>Load</button>
                            <button 
                                onClick={() => handleDelete(build.id)}
                                className={deleteConfirm === build.id ? 'danger' : ''}
                            >
                                {deleteConfirm === build.id ? 'Confirm Delete?' : 'Delete'}
                            </button>
                        </div>
                    </div>
                ))}
                {builds.length === 0 && (
                    <p className="no-builds">No saved builds yet.</p>
                )}
                {builds.length > 0 && filteredAndSortedBuilds.length === 0 && (
                    <p className="no-builds">No builds match your search.</p>
                )}
            </div>
        </div>
    );
};
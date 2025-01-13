import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Pagination } from '../components/Build/Pagination';
import { BuildControls } from '../components/Build/Controls';
import { BuildPreview } from '../components/Build/Preview';
import { SavedBuild, SavedBuilds } from '../types/SavedState';
import { EchoPanelState } from '../types/echo';
import '../styles/BuildPage.css';

export const BuildsPage: React.FC = () => {
    const [builds, setBuilds] = useState<SavedBuild[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'character' | 'cv'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [buildsPerPage, setBuildsPerPage] = useState(10);
    const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
    const navigate = useNavigate();

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
            let comparison = 0;
            switch (sortBy) {
                case 'name': 
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'character': 
                    comparison = (a.state.elementState.selectedCharacter?.name ?? '')
                        .localeCompare(b.state.elementState.selectedCharacter?.name ?? '');
                    break;
                case 'cv': 
                    comparison = Number(calculateCV(b.state.echoPanels)) - Number(calculateCV(a.state.echoPanels));
                    break;
                default: 
                    comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

    const pageCount = Math.ceil(filteredAndSortedBuilds.length / buildsPerPage);
    const currentBuilds = filteredAndSortedBuilds.slice(
        (currentPage - 1) * buildsPerPage,
        currentPage * buildsPerPage
    );

    useEffect(() => {
        const savedBuilds = localStorage.getItem('wuwabuilds_builds');
        if (savedBuilds) {
            const { builds: loadedBuilds } = JSON.parse(savedBuilds) as SavedBuilds;
            setBuilds(loadedBuilds);
        }
    }, []);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            const updateGridLayout = debounce(() => {
                requestAnimationFrame(() => {
                    const grid = document.querySelector('.builds-grid');
                    if (!grid) return;
                    
                    const gridStyles = window.getComputedStyle(grid);
                    const columns = gridStyles.gridTemplateColumns.split(' ').length;
                    
                    const minItemsPerPage = columns * 2;
                    const gridRect = grid.getBoundingClientRect();
                    const itemHeight = document.querySelector('.build-preview')?.getBoundingClientRect().height ?? 0;
                    const availableHeight = window.innerHeight - gridRect.top - 100;
                    const maxRows = Math.max(2, Math.floor(availableHeight / (itemHeight + 24)));
                    
                    setBuildsPerPage(Math.max(minItemsPerPage, columns * maxRows));
                });
            }, 100);
    
            const resizeObserver = new ResizeObserver(updateGridLayout);
            const grid = document.querySelector('.builds-grid');
            if (grid) {
                resizeObserver.observe(grid);
                updateGridLayout();
            }
            
            return () => {
                resizeObserver.disconnect();
                updateGridLayout.cancel();
            };
        }, 50);
        
        return () => clearTimeout(timer);
    }, [filteredAndSortedBuilds.length]);

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

    const handleImport = (importedData: SavedBuilds) => {
        const mergedBuilds = {
            builds: [...builds, ...importedData.builds]
                .filter((build, index, self) => index === self.findIndex(b => b.id === build.id))
        };
        localStorage.setItem('wuwabuilds_builds', JSON.stringify(mergedBuilds));
        setBuilds(mergedBuilds.builds);
    };

    const handleDeleteAll = () => {
        if (!deleteAllConfirm) {
            setDeleteAllConfirm(true);
            setTimeout(() => setDeleteAllConfirm(false), 3000);
            return;
        }
        localStorage.removeItem('wuwabuilds_builds');
        setBuilds([]);
        setDeleteAllConfirm(false);
    };

    const handleNameChange = (id: string, newName: string) => {
        const newBuilds = builds.map(build => 
            build.id === id ? { ...build, name: newName } : build
        );
        localStorage.setItem('wuwabuilds_builds', JSON.stringify({ builds: newBuilds }));
        setBuilds(newBuilds);
    };

    const handlePageChange = (page: number) => {
        const grid = document.querySelector('.builds-grid');
        grid?.classList.add('page-exit');
        setTimeout(() => {
            setCurrentPage(page);
            grid?.classList.remove('page-exit');
            grid?.classList.add('page-enter');
            window.scrollTo(0, 0);
        }, 50);
    };

    return (
        <div className="builds-page">
            <BuildControls searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={(sort, direction) => {
                    setSortBy(sort);
                    setSortDirection(direction);
                }}
                onImport={handleImport}
                onDeleteAll={handleDeleteAll}
                deleteAllConfirm={deleteAllConfirm}
            />
            <div className="builds-grid">
                {currentBuilds.map((build, index) => (
                    <BuildPreview key={build.id}
                        build={build}
                        onLoad={handleLoad}
                        onDelete={handleDelete}
                        onNameChange={handleNameChange}
                        deleteConfirm={deleteConfirm}
                        cv={calculateCV(build.state.echoPanels)}
                    />
                ))}
                {builds.length === 0 && (
                    <p className="no-builds">No saved builds yet.</p>
                )}
                {builds.length > 0 && filteredAndSortedBuilds.length === 0 && (
                    <p className="no-builds">No builds match your search.</p>
                )}
            </div>
            <Pagination currentPage={currentPage} pageCount={pageCount} onPageChange={handlePageChange} />
        </div>
    );
};
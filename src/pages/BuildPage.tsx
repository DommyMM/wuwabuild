import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Pagination } from '../components/Build/Pagination';
import { BuildControls } from '../components/Build/Controls';
import { BuildPreview } from '../components/Build/Preview';
import { SavedBuild, SavedBuilds } from '../types/SavedState';
import { calculateCV } from '../hooks/useStats';
import { cachedCharacters } from '../hooks/useCharacters';
import { getCachedWeapon } from '../hooks/useWeapons';
import { toast } from 'react-toastify';
import { SEO } from '../components/SEO';
import '../styles/BuildPage.css';

export const BuildsPage: React.FC = () => {
    const [builds, setBuilds] = useState<SavedBuild[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'character' | 'cv'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [buildsPerPage, setBuildsPerPage] = useState(10);
    const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
    const navigate = useNavigate();
    const buildCVs = useMemo(() => {
        return builds.reduce((acc, build) => ({
            ...acc,
            [build.id]: calculateCV(build.state.echoPanels)
        }), {} as Record<string, number>);
    }, [builds]);

    const filteredAndSortedBuilds = useMemo(() => builds
        .filter(build => {
            const searchLower = searchTerm.toLowerCase();
            const character = build.state.characterState.id ? 
                cachedCharacters?.find(c => c.id === build.state.characterState.id) : null;
            const weapon = getCachedWeapon(build.state.weaponState.id);
            
            return (
                build.name.toLowerCase().includes(searchLower) ||
                character?.name.toLowerCase().includes(searchLower) ||
                weapon?.name.toLowerCase().includes(searchLower)
            );
        })
        .sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name': 
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'character':
                    const charA = cachedCharacters?.find(c => c.id === a.state.characterState.id)?.name ?? '';
                    const charB = cachedCharacters?.find(c => c.id === b.state.characterState.id)?.name ?? '';
                    comparison = charA.localeCompare(charB);
                    break;
                case 'cv': 
                    comparison = buildCVs[b.id] - buildCVs[a.id];
                    break;
                default: 
                    comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        }), [builds, searchTerm, sortBy, sortDirection, buildCVs]);

    const currentBuilds = useMemo(() => 
        filteredAndSortedBuilds.slice(
            (currentPage - 1) * buildsPerPage,
            currentPage * buildsPerPage
        ), [filteredAndSortedBuilds, currentPage, buildsPerPage]
    );

    const pageCount = Math.ceil(filteredAndSortedBuilds.length / buildsPerPage);

    useEffect(() => {
        const savedBuilds = localStorage.getItem('saved_builds');
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
        localStorage.setItem('saved_builds', JSON.stringify({ builds: newBuilds }));
        setBuilds(newBuilds);
        setDeleteConfirm(null);
    };

    const handleLoad = (build: SavedBuild) => {
        localStorage.setItem('last_build', JSON.stringify(build.state));
        navigate('/edit');
    };
    
    const handleImport = (importedData: SavedBuilds) => {
        if (!importedData?.builds?.length) {
            toast.error('No builds to import');
            return;
        }
        const newBuilds = {
            version: '1.0.2',
            builds: importedData.builds
        };
        localStorage.setItem('saved_builds', JSON.stringify(newBuilds));
        setBuilds(newBuilds.builds);
        if (importedData.savedEchoes?.length) {
            localStorage.setItem('saved_echoes', JSON.stringify(importedData.savedEchoes));
        }
        toast.success(`Imported ${importedData.builds.length} builds`);
        if (importedData.savedEchoes?.length) {
            toast.success(`Imported ${importedData.savedEchoes.length} echoes`);
        }
    };
    const handleDeleteAll = () => {
        if (!deleteAllConfirm) {
            setDeleteAllConfirm(true);
            setTimeout(() => setDeleteAllConfirm(false), 3000);
            return;
        }
        localStorage.removeItem('saved_builds');
        setBuilds([]);
        setDeleteAllConfirm(false);
    };

    const handleNameChange = (id: string, newName: string) => {
        const newBuilds = builds.map(build => 
            build.id === id ? { ...build, name: newName } : build
        );
        localStorage.setItem('saved_builds', JSON.stringify({ builds: newBuilds }));
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
        <>
            <SEO title="Saved Builds - WuWa Builds"
                description="View and manage your Wuthering Waves character builds. Search, sort, and export your build collection"
                image="https://www.wuwabuilds.moe/images/builds.png"
            />
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
                            cv={buildCVs[build.id].toFixed(1)}
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
        </>
    );
};
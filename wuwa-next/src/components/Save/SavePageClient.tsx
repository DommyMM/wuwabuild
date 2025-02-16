'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import { Pagination } from './Pagination';
import { SaveControls } from './Controls';
import { SavePreview } from './Preview';
import { SavedBuild, SavedBuilds } from '@/types/SavedState';
import { calculateCV } from '@/hooks/useStats';
import { cachedCharacters } from '@/hooks/useCharacters';
import { getCachedWeapon } from '@/hooks/useWeapons';
import { toast } from 'react-toastify';
import '@/styles/SavesPage.css';

export default function SavePageClient() {
    const [saves, setSaves] = useState<SavedBuild[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'character' | 'cv'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [savesPerPage, setSavesPerPage] = useState(10);
    const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
    const router = useRouter();
    
    const saveCVs = useMemo(() => {
        return saves.reduce((acc, save) => ({
            ...acc,
            [save.id]: calculateCV(save.state.echoPanels)
        }), {} as Record<string, number>);
    }, [saves]);

    const filteredAndSortedSaves = useMemo(() => saves
        .filter(save => {
            const searchLower = searchTerm.toLowerCase();
            const character = save.state.characterState.id ? 
                cachedCharacters?.find(c => c.id === save.state.characterState.id) : null;
            const weapon = getCachedWeapon(save.state.weaponState.id);
            
            return (
                save.name.toLowerCase().includes(searchLower) ||
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
                    comparison = saveCVs[b.id] - saveCVs[a.id];
                    break;
                default: 
                    comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        }), [saves, searchTerm, sortBy, sortDirection, saveCVs]);

    const currentSaves = useMemo(() => 
        filteredAndSortedSaves.slice(
            (currentPage - 1) * savesPerPage,
            currentPage * savesPerPage
        ), [filteredAndSortedSaves, currentPage, savesPerPage]
    );

    const pageCount = Math.ceil(filteredAndSortedSaves.length / savesPerPage);

    useEffect(() => {
        const savedBuilds = localStorage.getItem('saved_builds');
        if (savedBuilds) {
            const { builds: loadedBuilds } = JSON.parse(savedBuilds) as SavedBuilds;
            setSaves(loadedBuilds);
        }
    }, []);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            const updateGridLayout = debounce(() => {
                requestAnimationFrame(() => {
                    const grid = document.querySelector('.saves-grid');
                    if (!grid) return;
                    
                    const gridStyles = window.getComputedStyle(grid);
                    const columns = gridStyles.gridTemplateColumns.split(' ').length;
                    
                    const minItemsPerPage = columns * 2;
                    const gridRect = grid.getBoundingClientRect();
                    const itemHeight = document.querySelector('.save-preview')?.getBoundingClientRect().height ?? 0;
                    const availableHeight = window.innerHeight - gridRect.top - 100;
                    const maxRows = Math.max(2, Math.floor(availableHeight / (itemHeight + 24)));
                    
                    setSavesPerPage(Math.max(minItemsPerPage, columns * maxRows));
                });
            }, 100);
    
            const resizeObserver = new ResizeObserver(updateGridLayout);
            const grid = document.querySelector('.saves-grid');
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
    }, [filteredAndSortedSaves.length]);

    const handleDelete = (id: string) => {
        if (deleteConfirm !== id) {
            setDeleteConfirm(id);
            return;
        }
        const newBuilds = saves.filter(save => save.id !== id);
        localStorage.setItem('saved_builds', JSON.stringify({ builds: newBuilds }));
        setSaves(newBuilds);
        setDeleteConfirm(null);
    };

    const handleLoad = (save: SavedBuild) => {
        localStorage.setItem('last_build', JSON.stringify(save.state));
        router.push('/edit');
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
        setSaves(newBuilds.builds);
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
        setSaves([]);
        setDeleteAllConfirm(false);
    };

    const handleNameChange = (id: string, newName: string) => {
        const newBuilds = saves.map(save => 
            save.id === id ? { ...save, name: newName } : save
        );
        localStorage.setItem('saved_builds', JSON.stringify({ builds: newBuilds }));
        setSaves(newBuilds);
    };

    const handlePageChange = (page: number) => {
        const grid = document.querySelector('.saves-grid');
        grid?.classList.add('page-exit');
        setTimeout(() => {
            setCurrentPage(page);
            grid?.classList.remove('page-exit');
            grid?.classList.add('page-enter');
            window.scrollTo(0, 0);
        }, 50);
    };

    return (
        <div className="saves-page">
            <SaveControls 
                searchTerm={searchTerm}
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
            <div className="saves-grid">
                {currentSaves.map((save) => (
                    <SavePreview 
                        key={save.id}
                        build={save}
                        onLoad={handleLoad}
                        onDelete={handleDelete}
                        onNameChange={handleNameChange}
                        deleteConfirm={deleteConfirm}
                        cv={saveCVs[save.id].toFixed(1)}
                    />
                ))}
                {saves.length === 0 && (
                    <p className="no-saves">No saved builds yet.</p>
                )}
                {saves.length > 0 && filteredAndSortedSaves.length === 0 && (
                    <p className="no-saves">No builds match your search.</p>
                )}
            </div>
            <Pagination 
                currentPage={currentPage} 
                pageCount={pageCount} 
                onPageChange={handlePageChange} 
            />
        </div>
    );
}
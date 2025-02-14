import React from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import { BuildBackup } from './Backup';
import { SavedBuilds } from '../../types/SavedState';

interface SaveControlsProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    sortBy: 'date' | 'name' | 'character' | 'cv';
    sortDirection: 'asc' | 'desc';
    onSortChange: (sort: 'date' | 'name' | 'character' | 'cv', direction: 'asc' | 'desc') => void;
    onImport: (builds: SavedBuilds) => void;
    onDeleteAll: () => void;
    deleteAllConfirm: boolean;
}

export const SaveControls: React.FC<SaveControlsProps> = ({
    searchTerm,
    onSearchChange,
    sortBy,
    sortDirection,
    onSortChange,
    onImport,
    onDeleteAll,
    deleteAllConfirm
}) => {
    const toggleSort = () => {
        onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc');
    };

    return (
        <div className="saves-controls">
            <div className="sort-control">
                {sortDirection === 'asc' ? (
                    <SortAsc size={20} className="sort-icon" onClick={toggleSort} />
                ) : (
                    <SortDesc size={20} className="sort-icon" onClick={toggleSort} />
                )}
                <select value={sortBy} 
                    onChange={(e) => onSortChange(e.target.value as any, sortDirection)}
                >
                    <option value="name">Name</option>
                    <option value="character">Character</option>
                    <option value="cv">CV</option>
                    <option value="date">Date</option>
                </select>
            </div>
            <div className="backup-controls">
                <BuildBackup onImport={onImport} />
                <button onClick={onDeleteAll} className={`delete-all ${deleteAllConfirm ? 'danger' : ''}`}>
                    {deleteAllConfirm ? 'Confirm Delete All?' : 'Delete All'}
                </button>
            </div>
            <div className="search-control">
                <Search size={20} className="search-icon" />
                <input type="text"
                    placeholder="Search saves..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
};
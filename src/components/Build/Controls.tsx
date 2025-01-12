import React from 'react';
import { Search, SortAsc } from 'lucide-react';
import { BuildBackup } from './Backup';
import { SavedBuilds } from '../../types/SavedState';

interface BuildControlsProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    sortBy: 'date' | 'name' | 'character' | 'cv';
    onSortChange: (sort: 'date' | 'name' | 'character' | 'cv') => void;
    onImport: (builds: SavedBuilds) => void;
}

export const BuildControls: React.FC<BuildControlsProps> = ({
    searchTerm,
    onSearchChange,
    sortBy,
    onSortChange,
    onImport
}) => {
    return (
        <div className="builds-controls">
            <div className="search-control">
                <Search size={20} className="search-icon" />
                <input type="text"
                    placeholder="Search builds..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <BuildBackup onImport={onImport} />
            <div className="sort-control">
                <SortAsc size={20} className="sort-icon" />
                <select 
                    value={sortBy} 
                    onChange={(e) => onSortChange(e.target.value as any)}
                >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="character">Character</option>
                    <option value="cv">CV</option>
                </select>
            </div>
        </div>
    );
};
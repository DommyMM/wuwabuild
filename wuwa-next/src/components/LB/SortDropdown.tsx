import React from 'react';
import { SortAsc } from 'lucide-react';
import { getDisplayName } from '@/components/Build/BuildPageClient';

const SortButton: React.FC<{
    direction: 'asc' | 'desc';
    onClick: (e: React.MouseEvent) => void;
}> = ({ direction, onClick }) => (
    <div className="sort-button" onClick={onClick}>
        <SortAsc className={`sort-icon ${direction === 'desc' ? 'asc' : ''}`} />
    </div>
);


interface LBSortDropdownProps {
    field: string | null;
    options: readonly string[];
    direction: 'asc' | 'desc';
    onFieldChange: (field: string) => void;
    onDirectionChange: (direction: 'asc' | 'desc') => void;
    placeholder?: string;
    isActive: boolean;
    position?: 'left' | 'center' | 'right';
    hoveredSection?: number | null;
    lastHoveredSection?: number | null;
    onHoverSection?: (section: number | null) => void;
}

export const LBSortDropdown: React.FC<LBSortDropdownProps> = ({ 
    field, 
    options, 
    direction, 
    onFieldChange, 
    onDirectionChange, 
    placeholder = 'Sort By',
    isActive,
    position,
    hoveredSection,
    lastHoveredSection,
    onHoverSection
}) => {
    const isStatsDropdown = placeholder === 'Stats';
    const showSortButton = isActive || placeholder === 'Damage';
    
    return (
        <div className={`sort-dropdown ${isActive ? 'active' : ''} ${isStatsDropdown ? 'stats' : ''}`}>
            <div className={isStatsDropdown ? 'stats-grid' : ''}>
                {isStatsDropdown && [0,1,2,3].map(section => (
                    <div key={section}
                        className="stats-hover-section"
                        onMouseEnter={() => onHoverSection?.(section)}
                        onMouseLeave={() => onHoverSection?.(null)}
                    />
                ))}
                <div className="sort-header">
                    {field ? getDisplayName(field) : placeholder}
                    {showSortButton && (
                        <SortButton 
                            direction={direction} 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDirectionChange(direction === 'asc' ? 'desc' : 'asc');
                            }} 
                        />
                    )}
                </div>
                <div className={`sort-options ${position || ''}`}>
                    {options.map((option) => (
                        <div key={option} 
                            className={`sort-option ${field === option ? 'active' : ''}`}
                            onClick={() => onFieldChange(option)}
                        >
                            <span>{getDisplayName(option)}</span>
                            {field === option && showSortButton && (
                                <SortButton 
                                    direction={direction} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDirectionChange(direction === 'asc' ? 'desc' : 'asc');
                                    }} 
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const LBSortHeader: React.FC<{
    direction: 'asc' | 'desc';
    isActive: boolean;
    onDirectionChange: (direction: 'asc' | 'desc') => void;
    onClick: () => void;
}> = ({ direction, isActive, onDirectionChange, onClick }) => (
    <div 
        className={`sort-header-button ${isActive ? 'active' : ''}`}
        onClick={onClick}
    >
        <span>Damage</span>
        {isActive && (
            <SortButton 
                direction={direction} 
                onClick={(e) => {
                    e.stopPropagation();
                    onDirectionChange(direction === 'asc' ? 'desc' : 'asc');
                }} 
            />
        )}
    </div>
);
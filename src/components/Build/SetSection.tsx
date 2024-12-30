import React from 'react';
import { ELEMENT_SETS, ElementType } from '../../types/echo';

interface SetRowProps {
    element: ElementType;
    count: number;
}

const SetRow: React.FC<SetRowProps> = ({ element, count }) => {
    const setName = ELEMENT_SETS[element];

    return (
        <div className={`set-row ${element.toLowerCase()}`}>
        <div className={`set-icon-container set-${element.toLowerCase()}`}>
            <img
            src={`images/Sets/${element}.png`}
            alt={`${element} set icon`}
            className="set-icon"
            />
        </div>
        <span className="set-name">{setName}</span>
        <span className="set-count">{count >= 5 ? '5' : '2'}</span>
        </div>
    );
};

interface SetSectionProps {
    sets: Array<{
        element: ElementType;
        count: number;
    }>;
}

export const SetSection: React.FC<SetSectionProps> = ({ sets }) => {
    if (sets.length === 0) return null;
    return (
        <div className="set-section">
        {sets.map(set => (
            <SetRow key={`set-${set.element}`}
            element={set.element}
            count={set.count}
            />
        ))}
        </div>
    );
};
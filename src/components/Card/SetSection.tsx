import React from 'react';
import { ELEMENT_SETS, ElementType, EchoPanelState } from '@/types/echo';
import { getCVClass } from './BuildCard';

interface SetRowProps {
    element: ElementType;
    count: number;
}

const SetRow: React.FC<SetRowProps> = ({ element, count }) => {
    const setName = ELEMENT_SETS[element];

    return (
        <div className={`set-row ${element.toLowerCase()}`}>
        <span className="set-name">{setName}</span>
        <span className="set-count">{String(count)}</span>
        </div>
    );
};

interface SetSectionProps {
    sets: Array<{ element: ElementType; count: number }>;
    cv: number;
    echoPanels: EchoPanelState[];
}

export const SetSection: React.FC<SetSectionProps> = ({ 
    sets, 
    cv,
    echoPanels 
}) => {
    return (
        <div className="stats-footer">
            {sets[0] && (
                <div className="set-info left">
                    <SetRow element={sets[0].element} count={sets[0].count} />
                </div>
            )}
            <div className="cv-container">
                <span className="cv-text">CV:</span>
                <span className={`cv-value ${getCVClass(cv, echoPanels)}`}>
                    {cv.toFixed(1)}
                </span>
            </div>
            {sets[1] && (
                <div className="set-info right">
                    <SetRow element={sets[1].element} count={sets[1].count} />
                </div>
            )}
        </div>
    );
};
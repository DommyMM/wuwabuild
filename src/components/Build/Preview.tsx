import React from 'react';
import { SavedBuild } from '../../types/SavedState';
import { EchoPanelState, ELEMENT_SETS } from '../../types/echo';

interface BuildPreviewProps {
    build: SavedBuild;
    onLoad: (build: SavedBuild) => void;
    onDelete: (id: string) => void;
    deleteConfirm: string | null;
    cv: string;
}

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

export const BuildPreview: React.FC<BuildPreviewProps> = ({
    build,
    onLoad,
    onDelete,
    deleteConfirm,
    cv
}) => {
    return (
        <div key={build.id} className="build-preview">
            <div className="build-header">
                <h3>{build.name}</h3>
                <span className="build-date">{formatDate(build.date)}</span>
            </div>
            <div className="build-info">
                <div className="info-row">
                    <span className={`char char-sig ${(build.state.elementState.elementValue || '').toLowerCase()}`}>
                        {build.state.elementState.selectedCharacter?.name}
                    </span>
                    <span>Lv.{build.state.characterLevel} • Sequence {build.state.currentSequence}</span>
                </div>
                <div className="info-row">
                    <span className='weap'>{build.state.weaponState.selectedWeapon?.name || 'No Weapon'}</span>
                    <span>Lv.{build.state.weaponState.config.level} • R{build.state.weaponState.config.rank}</span>
                </div>
                <div className="info-row">
                    {getSetInfo(build.state.echoPanels)}
                    <span className={getCVClass(Number(cv))}>
                        CV: {cv}
                    </span>
                </div>
            </div>
            <div className="build-actions">
                <button onClick={() => onLoad(build)}>Load</button>
                <button 
                    onClick={() => onDelete(build.id)}
                    className={deleteConfirm === build.id ? 'danger' : ''}
                >
                    {deleteConfirm === build.id ? 'Confirm Delete?' : 'Delete'}
                </button>
            </div>
        </div>
    );
};
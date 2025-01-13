import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SavedBuild } from '../../types/SavedState';
import { EchoPanelState, ELEMENT_SETS } from '../../types/echo';
import { getAssetPath } from '../../types/paths';
import { Character } from '../../types/character';
import Marquee from 'react-fast-marquee';
import '../../styles/Preview.css';

interface BuildPreviewProps {
    build: SavedBuild;
    onLoad: (build: SavedBuild) => void;
    onDelete: (id: string) => void;
    onNameChange: (id: string, newName: string) => void;
    deleteConfirm: string | null;
    cv: string;
}

interface ExpandedStyle {
    top: number;
    left: number;
    width: number;
    height: number;
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

const PreviewEcho: React.FC<{ panel: EchoPanelState }> = ({ panel }) => {
    const calculateCV = () => {
        return panel.stats.subStats
            .filter(s => s.type && ['Crit Rate', 'Crit DMG'].includes(s.type))
            .reduce((sum, s) => {
                if (s.type === 'Crit Rate') return sum + ((s.value || 0) * 2);
                return sum + (s.value || 0);
            }, 0)
            .toFixed(1);
    };
    if (!panel.echo) return null;
    return (
        <div className="preview-echo">
            <div className="echo-circle">
                <img src={`images/Echoes/${panel.echo.name}.png`}
                    alt={panel.echo.name}
                    className={`echo-icon ${panel.selectedElement?.toLowerCase() || ''}`}
                />
            </div>
            <div className="echo-stats">
                <span className="main-stat">{panel.stats.mainStat.type}</span>
                <span className="echo-cv">CV: {calculateCV()}</span>
            </div>
        </div>
    );
};

export const BuildPreview: React.FC<BuildPreviewProps> = ({...props}) => {
    const { build, onLoad, onDelete, onNameChange, deleteConfirm, cv } = props;
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedStyle, setExpandedStyle] = useState<ExpandedStyle | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(build.name);
    const textRef = useRef<HTMLSpanElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const character = build.state.elementState.selectedCharacter;
    const elementClass = (build.state.elementState.elementValue || '').toLowerCase();
    const weapon = build.state.weaponState.selectedWeapon;
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setTempName(build.name);
    };
    const handleSave = async () => {
        try {
            if (tempName.trim()) {
                onNameChange(build.id, tempName);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Failed to update name:', error);
        }
    };
    const handleCancel = () => {
        setIsEditing(false);
        setTempName(build.name);
    };
    useEffect(() => {
        if (textRef.current && wrapperRef.current) {
            const textWidth = textRef.current.offsetWidth;
            const wrapperWidth = wrapperRef.current.offsetWidth;
            setShouldAnimate(textWidth > wrapperWidth + 5);
        }
    }, [build.name]);
    const renderName = () => {
        if (!isExpanded) {
            return (
                <h3>
                    <div className='marquee-wrap' ref={wrapperRef}>
                        <span ref={textRef} className={`marquee-text ${shouldAnimate ? 'animate' : ''}`}>
                            {build.name}
                        </span>
                    </div>
                </h3>
            );
        }
        if (isEditing) {
            return (
                <div className="name-edit">
                    <input type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                    />
                    <div className="edit-actions">
                        <button onClick={(e) => {
                            e.stopPropagation();
                            handleSave();
                        }}>✓</button>
                        <button onClick={(e) => {
                            e.stopPropagation();
                            handleCancel();
                        }}>✕</button>
                    </div>
                </div>
            );
        }
        return (
            <div className="name-display">
                <button className="edit-button"
                    onClick={handleEditClick}
                    title="Edit Name"
                >✎</button>
                <h3>
                    <Marquee gradient={false}
                        speed={100}
                        delay={0}
                        className="name-marquee"
                        pauseOnHover
                    >
                        {build.name}&nbsp;&nbsp;&nbsp;
                    </Marquee>
                </h3>
            </div>
        );
    };
    const renderContent = (expanded: boolean) => {
        if (!expanded) {
            return (
                <>
                    <div className="info-row">
                        <span className={`char-sig ${elementClass}`}>
                            {character?.name}
                        </span>
                        <span>Lv.{build.state.characterLevel} • S{build.state.currentSequence}</span>
                    </div>
                    <div className="info-row">
                        <span className='weap'>{weapon?.name || 'No Weapon'}</span>
                        <span>Lv.{build.state.weaponState.config.level} • R{build.state.weaponState.config.rank}</span>
                    </div>
                    <div className="info-row">
                        {getSetInfo(build.state.echoPanels)}
                        <span className={getCVClass(Number(cv))}>CV: {cv}</span>
                    </div>
                </>
            );
        }
        return (
            <>
                <div className="info-row">
                    <div className="char-container">
                        <img src={getAssetPath('face1', character as Character).cdn}
                            alt={character?.name}
                            className={`char-portrait ${elementClass}`}
                        />
                        <span className={`char-sig ${elementClass}`}>{character?.name}</span>
                        <span>Lv.{build.state.characterLevel} • S{build.state.currentSequence}</span>
                    </div>
                    {weapon && (
                        <div className="weap-container">
                            <img src={`images/Weapons/${weapon.type}/${encodeURIComponent(weapon.name)}.png`}
                                alt={weapon.name}
                                className="weap-portrait"
                            />
                            <span className="weap">{weapon.name}</span>
                            <span>Lv.{build.state.weaponState.config.level} • R{build.state.weaponState.config.rank}</span>
                        </div>
                    )}
                </div>
                <div className='info-row'>
                    <div className="echo-group">
                        {build.state.echoPanels.map((panel, index) => (
                            <PreviewEcho key={index} panel={panel} />
                        ))}
                        <div className="set-display"> {getSetInfo(build.state.echoPanels)}
                            <span className={getCVClass(Number(cv))}>CV: {cv}</span>
                        </div>
                    </div>
                </div>
            </>
        );
    };
    const calculatePosition = useCallback(() => {
        if (!previewRef.current) return null;
        
        const grid = previewRef.current.closest('.builds-grid');
        if (!grid) return null;
        const items = Array.from(grid.children);
        const gridStyles = window.getComputedStyle(grid);
        const columns = gridStyles.gridTemplateColumns.split(' ').length;
        
        const index = items.indexOf(previewRef.current);
        const row = Math.floor(index / columns);
        const col = index % columns;
        const totalRows = Math.ceil(items.length / columns);
        return { row, col, columns, totalRows };
    }, []);
    const getTransformOrigin = (position: ReturnType<typeof calculatePosition>) => {
        if (!position) return 'center';
        const vertical = position.row === 0 ? 'top' : position.row === position.totalRows - 1 ? 'bottom' : 'center';
        const horizontal = position.col === 0 ? 'left' : position.col === position.columns - 1 ? 'right' : 'center';
        return `${horizontal} ${vertical}`;
    };
    const handleExpand = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.build-actions')) return;
        
        if (!isExpanded && previewRef.current) {
            const rect = previewRef.current.getBoundingClientRect();
            const position = calculatePosition();
            const origin = getTransformOrigin(position);
            let leftOffset = origin.includes('right') ? rect.width < 300 
                    ? rect.left - 10 : rect.left - 42
                : rect.left;
            
            setExpandedStyle({
                top: rect.top,
                left: leftOffset,
                width: rect.width,
                height: rect.height,
                '--transform-origin': origin
            } as any);
        }
        setIsExpanded(!isExpanded);
    };
    return (
        <>
            <div ref={previewRef} className="build-preview" onClick={handleExpand}>
                <div className="build-header">
                    {renderName()}
                    <span className="build-date">{formatDate(build.date)}</span>
                </div>
                <div className="build-info">
                    {renderContent(false)}
                </div>
                <div className="build-actions">
                    <button onClick={() => onLoad(build)}>Load</button>
                    <button onClick={() => onDelete(build.id)} className={deleteConfirm === build.id ? 'danger' : ''}>
                        {deleteConfirm === build.id ? 'Confirm Delete?' : 'Delete'}
                    </button>
                </div>
            </div>
            {isExpanded && expandedStyle && (
                <>
                    <div className="preview-backdrop" onClick={() => setIsExpanded(false)}/>
                    <div className="build-preview-expanded"
                        style={expandedStyle}>
                        <div className="build-header">
                            <div className="name-section">
                                {renderName()}
                            </div>
                            <span className="build-date">
                                {formatDate(build.date)}
                            </span>
                        </div>
                        <div className="build-info">
                            {renderContent(true)}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
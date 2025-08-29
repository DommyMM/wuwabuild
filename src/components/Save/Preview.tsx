import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { formatDate, getSetInfo, getCVClass, PreviewEcho, ExpandedStyle, StatsMenu } from './Card';
import { cachedCharacters } from '@/hooks/useCharacters';
import { SavedBuild } from '@/types/SavedState';
import { getAssetPath } from '@/types/paths';
import { Character } from '@/types/character';
import { getCachedWeapon } from '@/hooks/useWeapons';
import Marquee from 'react-fast-marquee';
import '@/styles/Preview.css';

interface SavePreviewProps {
    build: SavedBuild;
    onLoad: (build: SavedBuild) => void;
    onDelete: (id: string) => void;
    onNameChange: (id: string, newName: string) => void;
    deleteConfirm: string | null;
    cv: string;
}

export const SavePreview: React.FC<SavePreviewProps> = ({ build, onLoad, onDelete, onNameChange, deleteConfirm, cv }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [expandedStyle, setExpandedStyle] = useState<ExpandedStyle | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState(build.name);
    const textRef = useRef<HTMLSpanElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const character = build.state.characterState.id ? cachedCharacters?.find(c => c.id === build.state.characterState.id) : null;
    const elementClass = useMemo(() => build.state.characterState.element ? build.state.characterState.element.toLowerCase() : '', [build.state.characterState.element]);
    const weapon = useMemo(() => getCachedWeapon(build.state.weaponState.id), [build.state.weaponState.id]);
    const expandedTextRef = useRef<HTMLSpanElement>(null);
    const expandedWrapperRef = useRef<HTMLDivElement>(null);
    const [shouldAnimateExpanded, setShouldAnimateExpanded] = useState(false);
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
                        {shouldAnimate ? (
                            <Marquee gradient={false} 
                                speed={50} 
                                delay={0} 
                                className="name-marquee" 
                                pauseOnHover
                            >
                                {build.name}&nbsp;&nbsp;&nbsp;
                            </Marquee>
                        ) : (
                            <span ref={textRef} className="marquee-text">
                                {build.name}
                            </span>
                        )}
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
                <button className="edit-button" onClick={handleEditClick} title="Edit Name">✎</button>
                <h3>
                    <div className="marquee-wrap" ref={expandedWrapperRef}>
                        {shouldAnimateExpanded ? (
                            <Marquee gradient={false} speed={50} delay={0} className="name-marquee" pauseOnHover>
                                {build.name}&nbsp;&nbsp;&nbsp;
                            </Marquee>
                        ) : (
                            <span ref={expandedTextRef}>{build.name}</span>
                        )}
                    </div>
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
                        <span>Lv.{build.state.characterState.level} • S{build.state.currentSequence}</span>
                    </div>
                    <div className="info-row">
                        <span className='weap'>{weapon?.name || 'No Weapon'}</span>
                        <span>Lv.{build.state.weaponState.level} • R{build.state.weaponState.rank}</span>
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
                        <img src={getAssetPath('face1', character as Character).cdn} alt={character?.name || ''} className={`char-portrait ${elementClass}`} />
                        <span className={`char-sig ${elementClass}`}>{character?.name}</span>
                        <span>Lv.{build.state.characterState.level} • S{build.state.currentSequence}</span>
                    </div>
                    <StatsMenu echoPanels={build.state.echoPanels} />
                    {weapon && (
                        <div className="weap-container">
                            <img src={getAssetPath('weapons', weapon).cdn} alt={weapon.name || ''} className="weap-portrait"/>
                            <span className="weap">{weapon.name}</span>
                            <span>Lv.{build.state.weaponState.level} • R{build.state.weaponState.rank}</span>
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
        
        const grid = previewRef.current.closest('.saves-grid');
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
        if ((e.target as HTMLElement).closest('.save-actions')) return;
        
        if (isExpanded && previewRef.current) {
            setIsAnimatingOut(true);
            previewRef.current.classList.add('animating');
            setTimeout(() => {
                setIsExpanded(false);
                setIsAnimatingOut(false);
                previewRef.current?.classList.remove('animating');
                previewRef.current?.classList.add('appearing');
                setTimeout(() => {
                    previewRef.current?.classList.remove('appearing');
                }, 300);
            }, 500);
        } else if (!isExpanded && previewRef.current) {
            const rect = previewRef.current.getBoundingClientRect();
            const position = calculatePosition();
            const origin = getTransformOrigin(position);
            const leftOffset = origin.includes('right') ? 
                rect.width < 300 ? rect.left - 10 : rect.left - 42
                : rect.left;
            
            setExpandedStyle({
                top: rect.top,
                left: leftOffset,
                width: rect.width,
                height: rect.height,
                '--transform-origin': origin
            });
            setIsExpanded(true);
        }
    };
    useEffect(() => {
        if (textRef.current && wrapperRef.current) {
            const textWidth = textRef.current.offsetWidth;
            const wrapperWidth = wrapperRef.current.offsetWidth;
            setShouldAnimate(textWidth > wrapperWidth + 5);
        }
        if (isExpanded && expandedTextRef.current && expandedWrapperRef.current) {
            const textWidth = expandedTextRef.current.offsetWidth;
            const wrapperWidth = expandedWrapperRef.current.offsetWidth;
            setShouldAnimateExpanded(textWidth > wrapperWidth + 5);
        }
    }, [build.name, isExpanded]);
    return (
        <>
            <div ref={previewRef} className="save-preview" onClick={handleExpand}>
                <div className="save-header">
                    {renderName()}
                    <span className="save-date">{formatDate(build.date)}</span>
                </div>
                <div className="save-info">
                    {renderContent(false)}
                </div>
                <div className="save-actions">
                    <button onClick={() => onLoad(build)}>Load</button>
                    <button onClick={() => onDelete(build.id)} className={deleteConfirm === build.id ? 'danger' : ''}>
                        {deleteConfirm === build.id ? 'Confirm Delete?' : 'Delete'}
                    </button>
                </div>
            </div>
            {(isExpanded || isAnimatingOut) && expandedStyle && (
                <>
                    <div 
                        className={`preview-backdrop ${isAnimatingOut ? 'fade-out' : ''}`} 
                        onClick={handleExpand} 
                    />
                    <div 
                        className={`save-preview-expanded ${isAnimatingOut ? 'collapse-out' : ''}`}
                        onClick={(e) => {
                            if (!(e.target as HTMLElement).closest('.save-actions')) {
                                handleExpand(e);
                            }
                        }}
                        style={expandedStyle}
                    >
                        <div className="save-header">
                            <div className="name-section">
                                {renderName()}
                            </div>
                            <span className="save-date">
                                {formatDate(build.date)}
                            </span>
                        </div>
                        <div className="save-info">
                            {renderContent(true)}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
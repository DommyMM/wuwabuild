import React from 'react';
import { SavedState } from '../../types/SavedState';
import { cachedCharacters } from '../../hooks/useCharacters';
import { getCachedWeapon } from '../../hooks/useWeapons';
import { cachedEchoes } from '../../hooks/useEchoes';
import { Character } from '../../types/character';
import { getAssetPath } from '../../types/paths';
import { SequenceSection } from '../Card/SequenceSection';
import { ForteSection } from '../Card/ForteSection';
import '../../styles/ImportModal.css';

interface ImportModalProps {
    build: SavedState;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
    build,
    isOpen,
    onClose,
    onConfirm
}) => {
    if (!isOpen) return null;

    const character = build.characterState.id ? 
        cachedCharacters?.find(c => c.id === build.characterState.id) : null;
    const weapon = getCachedWeapon(build.weaponState.id);
    const elementClass = build.characterState.element?.toLowerCase() ?? '';

    return (
        <div className="import-overlay" onClick={onClose}>
            <div className="convert-content" onClick={(e) => e.stopPropagation()}>
                <div className="import-row">
                    <div className="char-convert">
                        <img src={getAssetPath('face1', character as Character).cdn}
                            alt={character?.name}
                            className={`char-portrait-large ${elementClass}`}
                        />
                        <span className={`char-sig ${elementClass}`}>{character?.name}</span>
                        <span>Lv.{build.characterState.level}</span>
                    </div>
                    <div className="sequence-container">
                        {character && <SequenceSection 
                            character={character}
                            isSpectro={build.characterState.element === 'Spectro'}
                            currentSequence={build.currentSequence}
                        />}
                    </div>
                    {weapon && (
                        <div className="weap-convert">
                            <img src={getAssetPath('weapons', weapon).cdn}
                                alt={weapon.name}
                                className="weap-portrait-large"
                            />
                            <span className="weap">{weapon.name}</span>
                            <span>Lv.{build.weaponState.level}</span>
                        </div>
                    )}
                    {character && (
                        <div className="forte-container">
                            <ForteSection 
                                character={character}
                                elementValue={build.characterState.element || character.element}
                                nodeStates={build.nodeStates}
                                levels={build.forteLevels}
                            />
                        </div>
                    )}
                </div>
                <div className="import-row">
                    <div className="echo-import">
                        {build.echoPanels.map((panel, index) => {
                            const echo = panel.id ? cachedEchoes?.find(e => e.id === panel.id) : null;
                            return (
                                <div key={index} className="echo-import-column">
                                    <div className="echo-view">
                                        {echo && (
                                            <img src={getAssetPath('echoes', echo).cdn} 
                                                alt={echo.name}
                                            />
                                        )}
                                    </div>
                                    <div className="stat-import">
                                        <div className="convert-main">
                                            <span>{panel.stats.mainStat.type?.replace(/%/g, '')}</span>
                                            <span>{panel.stats.mainStat.value}%</span>
                                        </div>
                                        {panel.stats.subStats.map((sub, i) => {
                                            const cleanType = sub.type?.replace(/%/g, '');
                                            const isFlat = ['ATK', 'HP', 'DEF'].includes(cleanType || '') && !sub.type?.includes('%');
                                            
                                            return sub.type && (
                                                <div key={i} className="convert-sub">
                                                    <span>{cleanType}</span>
                                                    <span>{isFlat ? sub.value : `${sub.value}%`}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="modal-actions">
                    <span className="convert-disclaimer">Will overwrite your latest build</span>
                    <div className="buttons">
                        <button onClick={onClose}>Cancel</button>
                        <button onClick={onConfirm}>Import</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
import React from 'react';
import { DecompressedEntry } from '../Build/types';
import { getCachedEchoes } from '@/hooks/useEchoes';
import { cachedCharacters } from '@/hooks/useCharacters';
import { getAssetPath } from '@/types/paths';

interface ProfileCardProps {
    entry: DecompressedEntry;
    cardRef: React.RefObject<HTMLDivElement | null>;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ 
    entry,
    cardRef
}) => {
    const characterElementClass = entry.buildState.characterState.element?.toLowerCase() ?? '';
    const character = entry.buildState.characterState.id ? 
        cachedCharacters?.find(c => c.id === entry.buildState.characterState.id) : null;
    
    return (
        <div id="profile-download-wrapper" ref={cardRef}>
            <div className={`profile-card ${characterElementClass}`}>
                {/* Character icon section */}
                <div className={`profile-character-display ${characterElementClass}`}>
                    {character && (
                        <img src={getAssetPath('icons', character).local} alt={character.name} className="profile-character-icon"/>
                    )}
                </div>
                
                {/* Empty placeholder sections - will be implemented later */}
                <div className="profile-character-section"></div>
                <div className="profile-sequence-section"></div>
                <div className="profile-stats-section"></div>
                <div className="profile-weapon-section"></div>
                
                {/* Watermark */}
                <div className="profile-watermark">
                    {entry.buildState.watermark?.username && (
                        <span className="profile-watermark-name">{entry.buildState.watermark.username}</span>
                    )}
                    {entry.buildState.watermark?.uid && (
                        <span className="profile-watermark-uid">UID: {entry.buildState.watermark.uid}</span>
                    )}
                </div>
                
                {/* Site watermark */}
                <div className="profile-site-watermark">wuwabuilds.moe</div>
            </div>
            
            {/* Echoes section with echo icons */}
            <div className="profile-echoes-section">
                {entry.buildState.echoPanels.map((panel, index) => {
                    const echo = getCachedEchoes(panel.id);
                    if (!echo) return null;
                    
                    // Get the correct element class for this specific echo
                    const isSingleElement = echo.elements.length === 1;
                    const echoElement = isSingleElement ? echo.elements[0] : panel.selectedElement;
                    const echoElementClass = echoElement?.toLowerCase() ?? '';
                    const isMainEcho = index === 0;
                    
                    return (
                        <div key={index} className={`profile-echo-panel ${echoElementClass} ${isMainEcho ? 'main-echo' : ''}`}>
                            <img src={getAssetPath('echoes', echo).local} 
                                alt={echo.name} 
                                className="profile-echo-icon"
                            />
                            
                            {/* Element set icon for the echo */}
                            {echoElement && (
                                <div className="profile-echo-element">
                                    <img src={getAssetPath('sets', echoElement).local} 
                                        alt={`${echoElement} Set`} 
                                        className="profile-echo-set-icon"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
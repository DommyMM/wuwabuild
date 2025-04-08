import React, { useRef, useState, useCallback } from 'react';
import { DecompressedEntry } from '../Build/types';
import { cachedCharacters } from '@/hooks/useCharacters';
import domtoimage from 'dom-to-image';
import { Download } from 'lucide-react';
import '@/styles/ProfileExpanded.css';

interface ProfileExpandedProps {
    entry: DecompressedEntry;
}

export const ProfileExpanded: React.FC<ProfileExpandedProps> = ({ entry }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    
    const character = entry.buildState.characterState.id ? 
        cachedCharacters?.find(c => c.id === entry.buildState.characterState.id) : null;
    
    const elementClass = entry.buildState.characterState.element?.toLowerCase() ?? '';
    
    const handleDownload = useCallback(() => {
        if (!cardRef.current || isDownloading) return;
        setIsDownloading(true);
    
        const now = new Date();
        const timestamp = now.toISOString().slice(0,19).replace(/[T:]/g, ' ');
        
        // Create exact clone with all styles and content
        const clone = cardRef.current.cloneNode(true) as HTMLElement;
        clone.classList.add('downloading');
        
        // Position without changing visual appearance
        clone.style.position = 'fixed';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.zIndex = '-1000';
        clone.style.pointerEvents = 'none';
        clone.style.display = 'flex';
        document.body.appendChild(clone);
        
        // Give time for all resources to load and render
        setTimeout(() => {
        domtoimage.toPng(clone, {
            cacheBust: true,
            width: 1920,
            height: 690
        })
        .then((dataUrl: string) => {
            const link = document.createElement('a');
            link.download = `${character?.name || 'Character'}_Build_${timestamp}.png`;
            link.href = dataUrl;
            link.click();
            
            // Clean up
            document.body.removeChild(clone);
            setIsDownloading(false);
        })
        .catch((error: Error) => {
            console.error('Error capturing profile card:', error);
            document.body.removeChild(clone);
            setIsDownloading(false);
        });
        }, 250);
    }, [isDownloading, character]);
    
    return (
        <div className="profile-expanded-section">
            <div className="profile-expanded-card-container">
                <div 
                id="profile-card" 
                ref={cardRef} 
                className={`profile-card ${elementClass}`}
                >
                {/* Empty placeholder sections - will be implemented later */}
                <div className="profile-character-section"></div>
                <div className="profile-sequence-section"></div>
                <div className="profile-stats-section"></div>
                <div className="profile-weapon-section"></div>
                <div className="profile-echoes-section"></div>
                
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
            </div>
            
            {/* Download button now below the card */}
            <div className="profile-expanded-controls">
                <button 
                className={`build-button ${isDownloading ? 'downloading-btn' : ''}`}
                onClick={handleDownload}
                disabled={isDownloading}
                >
                {isDownloading ? (
                    <div className="download-animation">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                    </div>
                ) : (
                    <><Download size={20}/> Download Build</>
                )}
                </button>
            </div>
        </div>
    );
};
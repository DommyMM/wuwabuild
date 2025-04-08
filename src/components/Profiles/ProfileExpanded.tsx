import React, { useRef, useState, useCallback } from 'react';
import { DecompressedEntry } from '../Build/types';
import { cachedCharacters } from '@/hooks/useCharacters';
import domtoimage from 'dom-to-image';
import { Download } from 'lucide-react';
import { ProfileCard } from './ProfileCard';
import '@/styles/ProfileExpanded.css';

interface ProfileExpandedProps {
    entry: DecompressedEntry;
}

export const ProfileExpanded: React.FC<ProfileExpandedProps> = ({ entry }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    
    const character = entry.buildState.characterState.id ? 
        cachedCharacters?.find(c => c.id === entry.buildState.characterState.id) : null;
    
    const handleDownload = useCallback(() => {
        if (!cardRef.current || isDownloading) return;
        setIsDownloading(true);
    
        const now = new Date();
        const timestamp = now.toISOString().slice(0,19).replace(/[T:]/g, ' ');
        
        const clone = cardRef.current.cloneNode(true) as HTMLElement;
        clone.classList.add('downloading');
        clone.style.position = 'fixed';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.zIndex = '-1000';
        clone.style.pointerEvents = 'none';
        clone.style.display = 'flex';
        document.body.appendChild(clone);
        
        setTimeout(() => {
            domtoimage.toPng(clone, {
                cacheBust: true,
                width: 1920,
                height: 800
            })
            .then((dataUrl: string) => {
                const link = document.createElement('a');
                link.download = `${character?.name || 'Character'}_Build_${timestamp}.png`;
                link.href = dataUrl;
                link.click();
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
                <ProfileCard entry={entry} cardRef={cardRef} />
            </div>
            
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
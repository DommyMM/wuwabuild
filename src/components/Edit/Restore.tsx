import React, { useEffect } from 'react';
import '../../styles/Restore.css';

interface RestorePromptProps {
    onRestore: () => void;
    onDecline: () => void;
}

export const RestorePrompt: React.FC<RestorePromptProps> = ({ onRestore, onDecline }) => {
    useEffect(() => {
        document.body.style.overflow = 'hidden';

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDecline();
        };

        const handleClickOutside = (e: MouseEvent) => {
            if ((e.target as HTMLElement).className === 'restore-overlay') {
                onDecline();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('click', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [onDecline]);

    return (
        <div className="restore-overlay">
            <div className="restore-card">
                <p>Previous build data found. Would you like to restore it?</p>
                <div className="button-container">
                    <button onClick={onRestore}>Yes</button>
                    <button onClick={onDecline}>No</button>
                </div>
            </div>
        </div>
    );
};
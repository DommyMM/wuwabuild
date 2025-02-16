import React, { useEffect } from 'react';
import '@/styles/SaveBuild.css';

interface ImportModalProps {
    buildCount: number;
    echoCount: number;
    onMerge: () => void;
    onReplace: () => void;
    onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ 
    buildCount, echoCount, onMerge, onReplace, onClose 
}) => {
    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="import" onClick={handleBackgroundClick}>
            <div className="import-content">
                <h3>Import {buildCount} Builds and {echoCount} Echoes</h3>
                <div className="import-actions">
                    <button onClick={onMerge} className="import-button">
                        Merge
                    </button>
                    <button onClick={onReplace} className="import-button danger">
                        Replace All
                    </button>
                </div>
            </div>
        </div>
    );
};
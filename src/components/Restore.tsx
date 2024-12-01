import React from 'react';
import '../styles/Restore.css';

interface RestorePromptProps {
    onRestore: () => void;
    onDecline: () => void;
}

export const RestorePrompt: React.FC<RestorePromptProps> = ({ onRestore, onDecline }) => {
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
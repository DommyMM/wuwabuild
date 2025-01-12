import React, { useState } from 'react';
import '../../styles/SaveBuild.css';

interface SaveBuildProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    defaultName?: string;
}

export const SaveBuild: React.FC<SaveBuildProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    defaultName 
}) => {
    const [name, setName] = useState(defaultName || '');
    const [error, setError] = useState('');

    const handleClose = () => {
        setError('');
        setName(defaultName || '');
        onClose();
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);
        if (value.trim()) {
            setError('');
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            setError('Please enter a name');
            return;
        }
        onSave(name);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="save-build-modal">
                <h2>Save Build</h2>
                <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Enter build name"
                    className="build-name-input"
                />
                {error && <p className="error">{error}</p>}
                <div className="modal-buttons">
                    <button onClick={onClose} className="cancel-button">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="save-button">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
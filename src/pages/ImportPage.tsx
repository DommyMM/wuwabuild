import React from 'react';
import '../styles/Import.css';

export const ImportPage: React.FC = () => {
    return (
        <div className="page-container">
        <div className="content-container">
            <h1 className="page-title">Import Build</h1>
            <div className="import-section">
            <p>Upload a Discord bot build image to import</p>
            </div>
        </div>
        </div>
    );
};
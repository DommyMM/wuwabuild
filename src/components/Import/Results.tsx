import React from 'react';
import '../../styles/Results.css';

interface ResultsProps {
    results: {
        success: boolean;
        error: string | null;
        analysis: {
            character: { name: string; level: number; };
            watermark: { username: string; uid: number; };
            weapon: { name: string; level: number; };
            fortes: number[];
            echoes: Array<{
                main: { name: string; value: string; };
                substats: Array<{ name: string; value: string; }>;
                element: {
                    primary: string;
                    secondary: string;
                    primary_ratio: number;
                    secondary_ratio: number;
                };
            }>;
        };
    };
}

export const Results: React.FC<ResultsProps> = ({ results }) => {
    if (!results.success || results.error) {
        return <div className="results-error">{results.error || 'An error occurred'}</div>;
    }
    const { analysis } = results;
    return (
        <div className="results-container">
            <div className="result-disclaimer">Work in Progress - Actual importing coming soon</div>
            {/* Top Info Row */}
            <div className="results-header">
                <div className="header-section">
                    <h3>Character</h3>
                    <div className="highlight-text">{analysis.character.name} [Lv.{analysis.character.level}]</div>
                </div>
                <div className="header-section">
                    <h3>Weapon</h3>
                    <div className="highlight-text">{analysis.weapon.name} [Lv.{analysis.weapon.level}]</div>
                </div>
                <div className="header-section">
                    <h3>Player</h3>
                    <div className="highlight-text">{analysis.watermark.username} [UID: {analysis.watermark.uid}]</div>
                </div>
            </div>
            {/* Fortes Grid */}
            <div className="fortes-section">
                <h3>Fortes</h3>
                <div className="fortes-grid">
                    <div className="forte">Normal Attack: Lv.{analysis.fortes[0]}</div>
                    <div className="forte">Skill: Lv.{analysis.fortes[1]}</div>
                    <div className="forte">Circuit: Lv.{analysis.fortes[2]}</div>
                    <div className="forte">Liberation: Lv.{analysis.fortes[3]}</div>
                    <div className="forte">Intro: Lv.{analysis.fortes[4]}</div>
                </div>
            </div>
            {/* Echoes Grid */}
            <div className="echoes-section">
                <h3>Echoes</h3>
                <div className="echoes-grid">
                    {analysis.echoes.map((echo, index) => (
                        <div key={index} className="echo-column">
                            <div className="echo-elements">
                                <span className={`element ${echo.element.primary.toLowerCase()}`}>{echo.element.primary}</span>
                                {echo.element.secondary && (
                                    <span className={`element ${echo.element.secondary.toLowerCase()}`}>{echo.element.secondary}</span>
                                )}
                            </div>
                            <div className="echo-mainstat">
                                <span>{echo.main.name}</span>
                                <span>{echo.main.value}</span>
                            </div>
                            {echo.substats.map((sub, idx) => (
                                <div key={idx} className="echo-substat">
                                    <span>{sub.name}</span>
                                    <span>{sub.value}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
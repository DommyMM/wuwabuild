import React from 'react';
import '../../styles/Results.css';

interface AnalysisData {
    character?: { name: string; level: number; };
    watermark?: { username: string; uid: number; };
    weapon?: { name: string; level: number; };
    forte?: { levels: number[] };
    echoes?: { echoes: Array<{
        main: { name: string; value: string; };
        substats: Array<{ name: string; value: string; }>;
        element: {
            primary: string;
            secondary: string;
            primary_ratio: number;
            secondary_ratio: number;
        };
    }>};
}

interface ResultsProps {
    results: AnalysisData;
}

const cleanStatValue = (value: string): string => {
    const cleanValue = value.replace(/[^\d.%]/g, '');
    
    if (cleanValue.includes('%')) {
        const numValue = parseFloat(cleanValue.replace('%', ''));
        return isNaN(numValue) ? '0%' : `${numValue}%`;
    }
    
    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? '0' : numValue.toString();
};

const HeaderSection: React.FC<{ title: string; data: any }> = ({ title, data }) => (
    <div className="header-section">
        <h3>{title}</h3>
        <div className="highlight-text">
            {data ? (
                title === 'Player' 
                    ? `${data.username} [UID: ${data.uid}]`
                    : `${data.name} [Lv.${data.level}]`
            ) : (
                'Processing...'
            )}
        </div>
    </div>
);

const ForteSection: React.FC<{ fortes?: number[] }> = ({ fortes }) => (
    <div className="fortes-section">
        <h3>Fortes</h3>
        <div className="fortes-grid">
            {['Normal Attack', 'Skill', 'Circuit', 'Liberation', 'Intro'].map((name, idx) => (
                <div key={idx} className="forte">
                    {name}: Lv.{fortes ? fortes[idx] : '...'}
                </div>
            ))}
        </div>
    </div>
);

const EchoSection: React.FC<{ echo?: any }> = ({ echo }) => {
    if (!echo) return (
        <div className="echo-column">
            <div className="echo-elements">Processing...</div>
            <div className="echo-mainstat">...</div>
        </div>
    );

    return (
        <div className="echo-column">
            <div className="echo-elements">
                <span className={`element ${echo.element.primary.toLowerCase()}`}>{echo.element.primary}</span>
                {echo.element.secondary && echo.element.secondary !== echo.element.primary && (
                    <span className={`element ${echo.element.secondary.toLowerCase()}`}>{echo.element.secondary}</span>
                )}
            </div>
            <div className="echo-mainstat">
                <span>{echo.main.name}</span>
                <span>{cleanStatValue(echo.main.value)}</span>
            </div>
            {echo.substats.map((sub: any, idx: number) => (
                <div key={idx} className="echo-substat">
                    <span className='import-sub'>{sub.name}</span>
                    <span>{cleanStatValue(sub.value)}</span>
                </div>
            ))}
        </div>
    );
};

export const Results: React.FC<ResultsProps> = ({ results }) => {
    return (
        <div className="results-container">
            <div className="result-disclaimer">Work in Progress - Actual importing coming soon</div>
            <div className="results-header">
                <HeaderSection title="Character" data={results.character} />
                <HeaderSection title="Weapon" data={results.weapon} />
                <HeaderSection title="Player" data={results.watermark} />
            </div>
            
            <ForteSection fortes={results.forte?.levels} />
            
            <div className="echoes-section">
                <h3>Echoes</h3>
                <div className="echoes-grid">
                    {[...Array(5)].map((_, index) => (
                        <EchoSection 
                            key={index} 
                            echo={results.echoes?.echoes?.[index]} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
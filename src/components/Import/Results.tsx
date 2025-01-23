import { useState, useRef, useEffect } from 'react';
import '../../styles/Results.css';
import Marquee from 'react-fast-marquee';

interface AnalysisData {
    character?: { name: string; level: number; };
    watermark?: { username: string; uid: number; };
    weapon?: { name: string; level: number; };
    forte?: { levels: number[] };
    sequences?: { sequence: number };
    echo1?: EchoData;
    echo2?: EchoData;
    echo3?: EchoData;
    echo4?: EchoData;
    echo5?: EchoData;
}

interface EchoData {
    name: {
        name: string;
        confidence: number;
    };
    main: { name: string; value: string; };
    substats: Array<{ name: string; value: string; }>;
    element: string;
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
                    {name}: Lv.{fortes ? fortes[idx] : '..'}
                </div>
            ))}
        </div>
    </div>
);

const EchoSection: React.FC<{ echo?: any }> = ({ echo }) => {
    const [shouldMarquee, setShouldMarquee] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (measureRef.current && wrapperRef.current) {
            const textWidth = measureRef.current.offsetWidth;
            const wrapperWidth = wrapperRef.current.offsetWidth;
            setShouldMarquee(textWidth > wrapperWidth + 5);
        }
    }, [echo?.name?.name]);

    if (!echo) return (
        <div className="echo-column">
            <div className="echo-elements">Processing...</div>
            <div className="echo-mainstat">...</div>
        </div>
    );

    return (
        <div className="echo-column">
            <div className="echo-names" ref={wrapperRef}>
                <span ref={measureRef} className="measure-span">
                    {echo?.name?.name}
                </span>
                {shouldMarquee ? (
                    <Marquee gradient={false} speed={50} delay={0}>
                        {echo?.name?.name}&nbsp;&nbsp;&nbsp;
                    </Marquee>
                ) : (
                    <span>{echo?.name?.name}</span>
                )}
            </div>
            <div className="echo-elements">
                <span className={`element ${echo.element.toLowerCase()}`}>
                    {echo.element}
                </span>
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

const SequencesSection: React.FC<{ sequences?: { sequence: number } }> = ({ sequences }) => (
    <div className="sequences-section">
        <h3>Sequences</h3>
        <div className="sequence-dots">
            {[...Array(6)].map((_, index) => (
                <div key={index} 
                    className={`sequence-dot ${index < (sequences?.sequence || 0) ? 'active' : ''}`}
                >
                    {index + 1}
                </div>
            ))}
        </div>
    </div>
);

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
            <SequencesSection sequences={results.sequences} />
            
            <div className="echoes-section">
                <h3>Echoes</h3>
                <div className="echoes-grid">
                    {[1, 2, 3, 4, 5].map((num) => (
                        <EchoSection key={num} 
                            echo={results[`echo${num}` as keyof AnalysisData]} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
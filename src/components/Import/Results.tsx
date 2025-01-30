import { useState, useRef, useEffect, useMemo } from 'react';
import Marquee from 'react-fast-marquee';
import { convertBuild } from './Convert';
import { SavedState } from '../../types/SavedState';
import { useNavigate } from 'react-router-dom';
import { ImportModal } from './ImportModal';
import { compressData } from '../Build/Backup';
import { useLevelCurves } from '../../hooks/useLevelCurves';
import { useStats } from '../../hooks/useStats';
import { calculateWeaponStats } from '../Edit/BuildCard';
import { cachedCharacters } from '../../hooks/useCharacters';
import { getCachedWeapon } from '../../hooks/useWeapons';
import { compressStats } from '../../hooks/useStats';
import '../../styles/Results.css';

export interface AnalysisData {
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

export interface EchoData {
    name: {
        name: string;
        confidence: number;
    };
    main: { name: string; value: string; };
    substats: Array<{ name: string; value: string; }>;
    element: string;
}

const validateResults = (results: AnalysisData): boolean => {
    return Boolean(
        results.character?.name &&
        results.weapon?.name &&
        results.forte?.levels?.length === 5 &&
        results.sequences?.sequence !== undefined &&
        [results.echo1, results.echo2, results.echo3, results.echo4, results.echo5]
            .some(echo => echo?.name?.name)
    );
};

interface ResultsProps {
    results: AnalysisData;
}

export const cleanStatValue = (value: string): string => {
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
            {['Normal', 'Skill', 'Circuit', 'Intro', 'Liberation'].map((name, idx) => (
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

export const LB_URL = process.env.REACT_APP_LB_URL || 'http://localhost:3001';

export const Results: React.FC<ResultsProps> = ({ results }) => {
    const [saveToLb, setSaveToLb] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [convertedBuild, setConvertedBuild] = useState<SavedState | null>(null);
    const navigate = useNavigate();
    const isValid = validateResults(results);
    const { scaleAtk, scaleStat } = useLevelCurves();
    
    const statsInput = useMemo(() => {
        if (!convertedBuild || !saveToLb) return null;
        
        const character = cachedCharacters?.find(c => 
            c.id === convertedBuild.characterState.id
        ) ?? null;
        
        const weapon = convertedBuild.weaponState.id ? 
            getCachedWeapon(convertedBuild.weaponState.id) : null;
            
        const weaponStats = calculateWeaponStats(
            weapon,
            convertedBuild.weaponState,
            scaleAtk,
            scaleStat
        );
        
        return {
            character,
            level: '90',
            weapon,
            weaponStats,
            echoPanels: convertedBuild.echoPanels,
            nodeStates: convertedBuild.nodeStates
        };
    }, [convertedBuild, saveToLb, scaleAtk, scaleStat]);

    const stats = useStats(statsInput ?? {
        character: null,
        level: '1',
        weapon: null,
        weaponStats: undefined,
        echoPanels: [],
        nodeStates: {}
    });
    
    const handleImport = () => {
        const build = convertBuild(results, saveToLb);
        setConvertedBuild(build);
        setIsModalOpen(true);
    };
    
    const submitToLeaderboard = async (build: SavedState) => {
        if (saveToLb) {
            const { values, updates, breakdowns, baseValues, cv } = stats;
            const compressed = compressData({ state: build });
            const compressedStats = compressStats({ values, updates, breakdowns, baseValues });
            const response = await fetch(`${LB_URL}/leaderboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buildState: compressed.state,
                    stats: compressedStats,
                    cv,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) throw new Error('Failed to submit to leaderboard');
            return response.json();
        }
    };

    const handleConfirm = async () => {
        if (!convertedBuild) return;
        setIsLoading(true);
        try {
            localStorage.setItem('last_build', JSON.stringify(convertedBuild));
            if (saveToLb) {
                await submitToLeaderboard(convertedBuild);
            }
            navigate('/edit');
        } catch (error) {
            console.error('Failed to submit:', error);
            navigate('/edit');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="results-container">
                <div className="results-actions">
                    <div></div>
                    <h3>Scanned Build</h3>
                    <div>
                        <label className="save-checkbox">
                            <input
                                type="checkbox"
                                checked={saveToLb}
                                onChange={(e) => setSaveToLb(e.target.checked)}
                            />
                            Save to LB
                        </label>
                        <button 
                            className={`import-build-btn ${!isValid ? 'disabled' : ''}`}
                            onClick={handleImport}
                            disabled={!isValid}
                            title={!isValid ? "Waiting for all sections to be processed..." : "Import build"}
                        >
                            Import Build
                        </button>
                    </div>
                </div>
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
            <ImportModal
                build={convertedBuild!}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirm}
                isLoading={isLoading}
            />
        </>
    );
};
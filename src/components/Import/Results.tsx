'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Marquee from 'react-fast-marquee';
import { useRouter } from 'next/navigation';
import { convertBuild } from './Convert';
import { SavedState } from '@/types/SavedState';
import { ImportModal } from './ImportModal';
import { compressData } from '@/components/Save/Backup';
import { useLevelCurves } from '@/hooks/useLevelCurves';
import { useStats } from '@/hooks/useStats';
import { calculateWeaponStats } from '@/components/Card/BuildCard';
import { cachedCharacters } from '@/hooks/useCharacters';
import { getCachedWeapon } from '@/hooks/useWeapons';
import { compressStats } from '@/hooks/useStats';
import { Pencil, Check } from 'lucide-react';
import '@/styles/Results.css';

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

const BasicHeaderSection: React.FC<{ 
    title: string;
    data?: { name?: string; level?: number; }
}> = ({ title, data }) => (
    <div className="header-section">
        <h3>{title}</h3>
        <div className="highlight-text">
            {data?.name ? `${data.name} [Lv.${data.level}]` : 'Processing...'}
        </div>
    </div>
);


const PlayerHeaderSection: React.FC<{
    data?: { username?: string; uid?: number; };
    onEdit: (data: { username: string; uid: string }) => void;
}> = ({ data, onEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        username: '',
        uid: ''
    });
    useEffect(() => {
        if (data?.username && data?.uid) {
            setEditData({
                username: data.username,
                uid: data.uid.toString()
            });
        }
    }, [data]);
    const handleEdit = () => {
        if (!isEditing) {
            setIsEditing(true);
        } else {
            onEdit(editData);
            setIsEditing(false);
        }
    };
    return (
        <div className="header-section">
            <div className="header-title">
                <h3>Player</h3>
                {data && (
                    <button className={`edit-button ${isEditing ? 'saving' : ''}`} onClick={handleEdit}
                        title={isEditing ? "Save Changes" : "Edit Player Info"}>
                        {isEditing ? <Check size={18} /> : <Pencil size={16} />}
                    </button>
                )}
            </div>
            <div className={`highlight-text ${isEditing ? 'editing' : ''}`}>
                {!data ? ( 
                    'Processing...'
                ) : isEditing ? (
                    <div className="edit-inputs">
                        <input
                            type="text"
                            value={editData.username}
                            onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Username"
                            className="edit-input"
                        />
                        <input
                            type="text"
                            value={editData.uid}
                            onChange={(e) => setEditData(prev => ({ ...prev, uid: e.target.value }))}
                            placeholder="UID"
                            className="edit-input uid"
                            maxLength={9}
                        />
                    </div>
                ) : (
                    `${editData.username} [UID: ${editData.uid}]`
                )}
            </div>
        </div>
    );
};

const ForteSection: React.FC<{ fortes?: number[] }> = ({ fortes }) => (
    <div className="fortes-section">
        <h3>Fortes</h3>
        <div className="fortes-grid">
            {['Normal', 'Skill', 'Liberation', 'Intro', 'Circuit'].map((name, idx) => (
                <div key={idx} className="forte">
                    {name}: Lv.{fortes ? fortes[idx] : '..'}
                </div>
            ))}
        </div>
    </div>
);

const EchoSection: React.FC<{ 
    echo?: EchoData 
}> = ({ echo }) => {
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
            {echo.substats.map((sub: { name: string; value: string }, idx: number) => (
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

export const LB_URL = process.env.NEXT_PUBLIC_LB_URL || 'http://localhost:3001';

const DMG_BONUS_MAPPING: Record<string, string> = {
    'Basic Attack': 'Basic Attack DMG Bonus',
    'Heavy Attack': 'Heavy Attack DMG Bonus',
    'Skill': 'Resonance Skill DMG Bonus',
    'Liberation': 'Resonance Liberation DMG Bonus'
};

export const Results: React.FC<{
    results: AnalysisData;
    onPlayerEdit: (data: { username: string; uid: string }) => void;
}> = ({ results, onPlayerEdit }) => {
    const [saveToLb, setSaveToLb] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [convertedBuild, setConvertedBuild] = useState<SavedState | null>(null);
    const router = useRouter();
    const isValid = validateResults(results);
    const { scaleAtk, scaleStat } = useLevelCurves();

    const handleImport = () => {
        const build = convertBuild(results);
        setConvertedBuild(build);
        setIsModalOpen(true);
    };

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
            characterState: convertedBuild.characterState,
            weapon,
            weaponStats,
            echoPanels: convertedBuild.echoPanels,
            nodeStates: convertedBuild.nodeStates
        };
    }, [convertedBuild, saveToLb, scaleAtk, scaleStat]);
    
    const stats = useStats(statsInput ?? {
        character: null,
        characterState: { id: null, level: '1', element: undefined },
        weapon: null,
        weaponStats: undefined,
        echoPanels: [],
        nodeStates: {}
    });
    
    const submitToLeaderboard = async (build: SavedState) => {
        if (saveToLb) {
            const { values, updates, breakdowns, baseValues, cv } = stats;
            const convertedBuild = {
                ...build,
                echoPanels: build.echoPanels.map(panel => ({
                    ...panel,
                    stats: {
                        ...panel.stats,
                        subStats: panel.stats.subStats.map(sub => ({
                            ...sub,
                            type: sub.type ? DMG_BONUS_MAPPING[sub.type] || sub.type : null
                        }))
                    }
                }))
            };
            const compressed = compressData({ state: convertedBuild });
            const compressedStats = compressStats({ values, updates, breakdowns, baseValues });
            const critMainCount = build.echoPanels
                .filter(panel => panel.stats.mainStat.type?.includes('Crit'))
                .length;
            const cvPenalty = critMainCount > 1 ? -44 : 0;
            const finalCV = cv + cvPenalty;
            const response = await fetch(`${LB_URL}/build`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buildState: compressed.state,
                    stats: compressedStats,
                    cv,
                    cvPenalty,
                    finalCV,
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
            router.push('/edit');
        } catch (error) {
            console.error('Failed to submit:', error);
            router.push('/edit');
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
                    <BasicHeaderSection title="Character" data={results.character} />
                    <BasicHeaderSection title="Weapon" data={results.weapon} />
                    <PlayerHeaderSection data={results.watermark} onEdit={onPlayerEdit} />
                </div>
                
                <ForteSection fortes={results.forte?.levels} />
                <SequencesSection sequences={results.sequences} />
                
                <div className="echoes-section">
                    <h3>Echoes</h3>
                    <div className="echoes-grid">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <EchoSection key={num} 
                                echo={results[`echo${num}` as 'echo1' | 'echo2' | 'echo3' | 'echo4' | 'echo5']} 
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
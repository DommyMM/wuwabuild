import React, { useState, useEffect } from 'react';
import { DecompressedEntry } from '../Build/types';
import { Character } from '@/types/character';
import { CHARACTER_CONFIGS } from './config';
import { getCachedWeapon } from '@/hooks/useWeapons';
import { getAssetPath } from '@/types/paths';
import { LB_URL } from '@/components/Import/Results';
import { REVERSE_STAT_MAP } from '@/components/Save/Backup';
import { substatsCache } from '@/hooks/useSub';
import { mapStatName } from '../Build/BuildExpanded';

interface UpgradeData {
    min: Record<string, number>;
    median: Record<string, number>;
    max: Record<string, number>;
}

interface StatUpgradesProps {
    entry: DecompressedEntry;
    selectedWeapon: number;
    selectedSequence: string;
    character: Character | null;
}

const STAT_DISPLAY_NAMES = REVERSE_STAT_MAP;

const TierSelector: React.FC<{
    selectedTier: 'min' | 'median' | 'max';
    onTierChange: (tier: 'min' | 'median' | 'max') => void;
}> = ({ selectedTier, onTierChange }) => {
    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'min': return '#666';
            case 'median': return '#a69662';
            case 'max': return '#4ecdc4';
            default: return '#666';
        }
    };

    return (
        <div className="tier-selector">
            {(['min', 'median', 'max'] as const).map((tier) => (
                <button key={tier}
                    className={`tier-button ${selectedTier === tier ? 'selected' : ''}`}
                    onClick={() => onTierChange(tier)}
                    style={{
                        '--tier-color': getTierColor(tier),
                        borderColor: selectedTier === tier ? getTierColor(tier) : '#333',
                        backgroundColor: selectedTier === tier ? getTierColor(tier) : 'rgba(0, 0, 0, 0.2)',
                        color: selectedTier === tier ? '#000' : getTierColor(tier)
                    } as React.CSSProperties}
                >
                    {tier === 'median' ? 'Mid' : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </button>
            ))}
        </div>
    );
};

const getRollValue = (stat: string, tier: 'min' | 'median' | 'max'): number | null => {
    const fullStatName = STAT_DISPLAY_NAMES[stat] || stat;
    const substatsName = mapStatName(fullStatName);
    const values = substatsCache.getStatValues(substatsName);
    if (!values || values.length === 0) {
        return null;
    }
    
    switch (tier) {
        case 'min': return values[0];
        case 'max': return values[values.length - 1];
        case 'median': return values[Math.floor(values.length / 2)];
        default: return null;
    }
};

const getGainColor = (percentGain: number): string => {
    if (percentGain <= 0.5) return '#666'; // Very low gain - gray
    if (percentGain <= 1) return '#888'; // Low gain - light gray
    if (percentGain <= 2) return '#9b9b44'; // Moderate gain - yellowish
    if (percentGain <= 3) return '#8bb446'; // Good gain - light green
    if (percentGain <= 4) return '#6bb447'; // Better gain - medium green
    if (percentGain <= 5) return '#4bb448'; // High gain - bright green
    if (percentGain <= 6) return '#2bb449'; // Very high gain - dark green
    return '#0bb44a'; // Exceptional gain - luscious dark green
};

const getShortStatName = (stat: string): string => {
    const shortStatMap: Record<string, string> = {
        'A%': 'ATK%',
        'A': 'ATK',
        'H%': 'HP%',
        'H': 'HP',
        'D%': 'DEF%',
        'D': 'DEF',
        'RS': 'Skill',
        'RL': 'Liberation',
        'BA': 'Basic',
        'HA': 'Heavy',
        'CR': 'CR',
        'CD': 'CD',
        'ER': 'ER'
    };
    return shortStatMap[stat] || stat;
};

export const StatUpgrades: React.FC<StatUpgradesProps> = ({ 
    entry, 
    selectedWeapon: initialWeapon, 
    selectedSequence: initialSequence, 
    character 
}) => {
    const [selectedWeapon, setSelectedWeapon] = useState(initialWeapon);
    const [selectedSequence, setSelectedSequence] = useState(initialSequence);
    const [selectedTier, setSelectedTier] = useState<'min' | 'median' | 'max'>('median');
    const [upgradeData, setUpgradeData] = useState<Record<string, Record<string, UpgradeData>> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const characterId = entry.buildState.characterState.id || '';
    const config = CHARACTER_CONFIGS[characterId];

    useEffect(() => {
        const fetchUpgrades = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${LB_URL}/build/${entry._id}/substat-upgrades`);
                if (!response.ok) throw new Error('Failed to fetch upgrade data');
                
                const data = await response.json();
                console.log('Fetched upgrade data:', data);
                setUpgradeData(data);
            } catch (err) {
                console.error('Failed to load upgrade data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchUpgrades();
    }, [entry._id]);

    const handleSelectionChange = (weaponIndex: number, sequence: string) => {
        setSelectedWeapon(weaponIndex);
        setSelectedSequence(sequence);
    };

    if (!config || !character) return null;

    if (loading) {
        return (
            <div className="stat-upgrades">
                <div className="upgrade-header">
                    <h3>Substat Upgrades</h3>
                    <div className="header-controls">
                        <div className="weapon-sequence-dropdown" style={{ opacity: 0.5 }}>
                            <div className="dropdown-trigger">
                                <span>Loading...</span>
                            </div>
                        </div>
                        <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
                    </div>
                </div>
                <div className="upgrade-loading">Loading...</div>
            </div>
        );
    }

    if (error || !upgradeData) {
        return (
            <div className="stat-upgrades">
                <div className="upgrade-header">
                    <h3>Substat Upgrades</h3>
                    <div className="header-controls">
                        <div className="weapon-sequence-dropdown" style={{ opacity: 0.5 }}>
                            <div className="dropdown-trigger">
                                <span>Error</span>
                            </div>
                        </div>
                        <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
                    </div>
                </div>
                <div className="upgrade-error">Failed to load data</div>
            </div>
        );
    }

    const selectedWeaponId = config.weapons[selectedWeapon];
    const weaponUpgrades = upgradeData[selectedWeaponId];
    const sequenceUpgrades = weaponUpgrades?.[selectedSequence];

    const selectedCalc = entry.calculations?.[selectedWeapon];
    const sequenceCalc = selectedCalc?.[selectedSequence as keyof typeof selectedCalc];
    
    const currentDamage = sequenceCalc && typeof sequenceCalc === 'object' && 'damage' in sequenceCalc 
        ? (sequenceCalc as { damage: number }).damage 
        : 0;

    if (!sequenceUpgrades) {
        return (
            <div className="stat-upgrades compact">
                <div className="upgrade-header">
                    <h3>Substat Upgrades</h3>
                    <div className="header-controls">
                        <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
                    </div>
                </div>
                <div className="no-upgrades">No upgrade data available</div>
            </div>
        );
    }

    const tierData = sequenceUpgrades[selectedTier];
    const validUpgrades = Object.entries(tierData)
        .filter(([, value]) => value > 0)  // Filter out zero upgrades
        .sort(([, a], [, b]) => b - a)      // Sort by gain descending
        .slice(0, 6);                       // Limit to top 6 upgrades

    if (validUpgrades.length === 0) {
        return (
            <div className="stat-upgrades compact">
                <div className="upgrade-header">
                    <h3>Substat Upgrades</h3>
                    <div className="header-controls">
                        <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
                    </div>
                </div>
                <div className="no-upgrades">No upgrades available</div>
            </div>
        );
    }

    return (
        <>
            <div className="stat-upgrades">
                <div className="upgrade-header">
                    <div className="upgrade-header-top">
                        <h3>Substat Upgrade</h3>
                        <div className="right-section">
                            <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
                            <div className="sequence-style-selector">
                                {config.sequences?.map(seq => (
                                    <div key={seq} className="substat-sequence-group">
                                        <span className="substat-sequence-label">S{seq.charAt(1)}:</span>
                                        <div className="style-buttons">
                                            {config.styles ? (
                                                config.styles.map(style => {
                                                    const fullSequence = style.key === 'default' ? seq : `${seq}_${style.key}`;
                                                    const isSelected = selectedSequence === fullSequence;
                                                    
                                                    return (
                                                        <button key={style.key}
                                                            className={`style-button ${style.key} ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => handleSelectionChange(selectedWeapon, fullSequence)}
                                                            title={style.description}
                                                        >
                                                            {style.name}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <button className={`style-button ${seq === selectedSequence ? 'selected' : ''}`}
                                                    onClick={() => handleSelectionChange(selectedWeapon, seq)}
                                                >
                                                    Default
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="hanging-weapons">
                        {config.weapons.map((weaponId, index) => {
                            const weapon = getCachedWeapon(weaponId);
                            if (!weapon) return null;
                            
                            return (
                                <div key={weaponId}
                                    className={`substat-weapon-option ${index === selectedWeapon ? 'selected' : ''}`}
                                    onClick={() => handleSelectionChange(index, selectedSequence)}
                                >
                                    <img src={getAssetPath('weapons', weapon).local} 
                                        alt={weapon.name} 
                                        className="weapon-icon" 
                                    />
                                    <span className="weapon-name">{weapon.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="upgrade-grid">
                    {validUpgrades.map(([stat, gain]) => {
                        const statDisplayName = STAT_DISPLAY_NAMES[stat] || stat;
                        const newDamage = currentDamage + gain;
                        const percentGain = ((gain / currentDamage) * 100);
                        const rollValue = getRollValue(stat, selectedTier);
                        
                        return (
                            <div key={stat} className="upgrade-item">
                                <div className="upgrade-stat-name">{statDisplayName}</div>
                                <div className="damage-info">
                                    <div className="damage-numbers">
                                        <span>{Math.round(newDamage).toLocaleString()}</span>
                                        <span className="gain">( +{Math.round(gain).toLocaleString()})</span>
                                    </div>
                                    {rollValue && (
                                        <div className="sub-value" style={{ color: getGainColor(percentGain) }}>
                                            {rollValue} {getShortStatName(stat)} =  {percentGain.toFixed(1)}% dps gain
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="upgrade-disclaimer">
                <p>
                    How much damage you would gain from having an additional roll in a substat.
                    <br />
                    Values are calculated based on your current build and may vary with different teams or playstyles.
                    <br />
                    Calculated for minimum, median, and maximum rolls.
                </p>
            </div>
        </>
    );
};
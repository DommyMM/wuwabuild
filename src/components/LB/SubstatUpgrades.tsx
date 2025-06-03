import React, { useState, useEffect } from 'react';
import { DecompressedEntry } from '../Build/types';
import { Character } from '@/types/character';
import { CHARACTER_CONFIGS } from './config';
import { getCachedWeapon } from '@/hooks/useWeapons';
import { getAssetPath } from '@/types/paths';
import { LB_URL } from '@/components/Import/Results';
import { REVERSE_STAT_MAP } from '@/components/Save/Backup';

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

const WeaponSequenceSelector: React.FC<{
    characterId: string;
    selectedWeapon: number;
    selectedSequence: string;
    onWeaponChange: (weapon: number) => void;
    onSequenceChange: (sequence: string) => void;
}> = ({ characterId, selectedWeapon, selectedSequence, onWeaponChange, onSequenceChange }) => {
    const config = CHARACTER_CONFIGS[characterId];
    if (!config) return null;

    return (
        <div className="upgrade-selectors">
            <div className="weapon-selector">
                <span className="selector-label">Weapon:</span>
                <div className="weapon-options">
                    {config.weapons.map((weaponId, index) => {
                        const weapon = getCachedWeapon(weaponId);
                        if (!weapon) return null;
                        
                        return (
                            <div
                                key={weaponId}
                                className={`weapon-option ${index === selectedWeapon ? 'selected' : ''}`}
                                onClick={() => onWeaponChange(index)}
                            >
                                <img 
                                    src={getAssetPath('weapons', weapon).cdn} 
                                    alt={weapon.name}
                                    className="weapon-icon"
                                />
                                <span className="weapon-name">{weapon.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="sequence-selector">
                <span className="selector-label">Sequence:</span>
                <div className="sequence-options">
                    {config.sequences?.map(seq => {
                        if (config.styles && config.styles.length > 1) {
                            return config.styles.map(style => {
                                const fullSequence = style.key === 'default' ? seq : `${seq}_${style.key}`;
                                return (
                                    <div
                                        key={fullSequence}
                                        className={`sequence-option ${selectedSequence === fullSequence ? 'selected' : ''} ${style.key}`}
                                        onClick={() => onSequenceChange(fullSequence)}
                                    >
                                        S{seq.charAt(1)} {style.name}
                                    </div>
                                );
                            });
                        } else {
                            return (
                                <div
                                    key={seq}
                                    className={`sequence-option ${selectedSequence === seq ? 'selected' : ''}`}
                                    onClick={() => onSequenceChange(seq)}
                                >
                                    S{seq.charAt(1)}
                                </div>
                            );
                        }
                    })}
                </div>
            </div>
        </div>
    );
};

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
                <button
                    key={tier}
                    className={`tier-button ${selectedTier === tier ? 'selected' : ''}`}
                    onClick={() => onTierChange(tier)}
                    style={{ 
                        '--tier-color': getTierColor(tier),
                        backgroundColor: selectedTier === tier ? getTierColor(tier) : 'transparent',
                        borderColor: getTierColor(tier),
                        color: selectedTier === tier ? '#000' : getTierColor(tier)
                    } as React.CSSProperties}
                >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </button>
            ))}
        </div>
    );
};

const UpgradeTable: React.FC<{
    upgradeData: UpgradeData;
    currentDamage: number;
    selectedTier: 'min' | 'median' | 'max';
}> = ({ upgradeData, currentDamage, selectedTier }) => {
    const tierData = upgradeData[selectedTier];
    const validUpgrades = Object.entries(tierData)
        .filter(([_, value]) => value > 0)
        .sort(([, a], [, b]) => b - a);

    if (validUpgrades.length === 0) {
        return (
            <div className="no-upgrades">
                No upgrade potential available for {selectedTier} tier rolls.
            </div>
        );
    }

    const maxGain = Math.max(...validUpgrades.map(([, value]) => value));

    const getGainColor = (gain: number) => {
        const ratio = gain / maxGain;
        if (ratio > 0.8) return '#4ecdc4'; // High gain - cyan
        if (ratio > 0.5) return '#a69662'; // Medium gain - gold
        if (ratio > 0.2) return '#ff9100'; // Low-medium gain - orange
        return '#666'; // Low gain - gray
    };

    return (
        <div className="upgrade-table">
            {validUpgrades.map(([stat, gain]) => {
                const newDamage = currentDamage + gain;
                const percentGain = ((gain / currentDamage) * 100);
                const progressPercent = (gain / maxGain) * 100;
                
                return (
                    <div key={stat} className="upgrade-row">
                        <div className="upgrade-stat">
                            <div className="stat-name">{STAT_DISPLAY_NAMES[stat] || stat}</div>
                            <div className="stat-code">({stat})</div>
                        </div>
                        <div className="upgrade-damage">
                            <div className="new-damage">
                                {Math.round(newDamage).toLocaleString()}
                                <span className="damage-gain" style={{ color: getGainColor(gain) }}>
                                    (+{Math.round(gain).toLocaleString()})
                                </span>
                            </div>
                            <div className="percent-gain">
                                +{percentGain.toFixed(1)}%
                            </div>
                        </div>
                        <div className="upgrade-bar">
                            <div 
                                className="upgrade-progress"
                                style={{ 
                                    width: `${progressPercent}%`,
                                    backgroundColor: getGainColor(gain)
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
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

    if (!config || !character) return null;

    if (loading) {
        return (
            <div className="stat-upgrades">
                <div className="upgrade-header">
                    <h3>Substat Upgrade Potential</h3>
                </div>
                <div className="upgrade-loading">Loading upgrade data...</div>
            </div>
        );
    }

    if (error || !upgradeData) {
        return (
            <div className="stat-upgrades">
                <div className="upgrade-header">
                    <h3>Substat Upgrade Potential</h3>
                </div>
                <div className="upgrade-error">Failed to load upgrade data: {error}</div>
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

    return (
        <div className="stat-upgrades">
            <div className="upgrade-header">
                <h3>Substat Upgrade Potential</h3>
                <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
            </div>
            
            <WeaponSequenceSelector
                characterId={characterId}
                selectedWeapon={selectedWeapon}
                selectedSequence={selectedSequence}
                onWeaponChange={setSelectedWeapon}
                onSequenceChange={setSelectedSequence}
            />

            {sequenceUpgrades ? (
                <UpgradeTable
                    upgradeData={sequenceUpgrades}
                    currentDamage={currentDamage}
                    selectedTier={selectedTier}
                />
            ) : (
                <div className="no-upgrades">
                    No upgrade data available for the selected weapon and sequence.
                </div>
            )}
        </div>
    );
};
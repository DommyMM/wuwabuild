import React, { useState, useEffect } from 'react';
import { DecompressedEntry } from '../Build/types';
import { Character } from '@/types/character';
import { CHARACTER_CONFIGS } from './config';
import { getCachedWeapon } from '@/hooks/useWeapons';
import { getAssetPath } from '@/types/paths';
import { LB_URL } from '@/components/Import/Results';
import { REVERSE_STAT_MAP } from '@/components/Save/Backup';
import { ChevronDown } from 'lucide-react';

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

const WeaponSequenceDropdown: React.FC<{
    characterId: string;
    selectedWeapon: number;
    selectedSequence: string;
    onSelectionChange: (weapon: number, sequence: string) => void;
}> = ({ characterId, selectedWeapon, selectedSequence, onSelectionChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const config = CHARACTER_CONFIGS[characterId];
    if (!config) return null;

    const selectedWeaponData = getCachedWeapon(config.weapons[selectedWeapon]);
    const currentSelection = `${selectedWeaponData?.name || 'Unknown'} - ${selectedSequence.replace('_', ' ').toUpperCase()}`;

    return (
        <div className="weapon-sequence-dropdown">
            <button 
                className="dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{currentSelection}</span>
                <ChevronDown className={`dropdown-icon ${isOpen ? 'open' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="dropdown-menu">
                    {config.weapons.map((weaponId, weaponIndex) => {
                        const weapon = getCachedWeapon(weaponId);
                        if (!weapon) return null;
                        
                        return (
                            <div key={weaponId} className="weapon-group">
                                <div className="weapon-header">
                                    <img src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} />
                                    <span>{weapon.name}</span>
                                </div>
                                <div className="sequence-options">
                                    {config.sequences?.map(seq => {
                                        if (config.styles && config.styles.length > 1) {
                                            return config.styles.map(style => {
                                                const fullSequence = style.key === 'default' ? seq : `${seq}_${style.key}`;
                                                return (
                                                    <button
                                                        key={fullSequence}
                                                        className={`sequence-option ${selectedWeapon === weaponIndex && selectedSequence === fullSequence ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            onSelectionChange(weaponIndex, fullSequence);
                                                            setIsOpen(false);
                                                        }}
                                                    >
                                                        ├─ S{seq.charAt(1)} {style.name}
                                                    </button>
                                                );
                                            });
                                        } else {
                                            return (
                                                <button
                                                    key={seq}
                                                    className={`sequence-option ${selectedWeapon === weaponIndex && selectedSequence === seq ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        onSelectionChange(weaponIndex, seq);
                                                        setIsOpen(false);
                                                    }}
                                                >
                                                    ├─ S{seq.charAt(1)}
                                                </button>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const TierSelector: React.FC<{
    selectedTier: 'min' | 'median' | 'max';
    onTierChange: (tier: 'min' | 'median' | 'max') => void;
}> = ({ selectedTier, onTierChange }) => {
    return (
        <div className="tier-selector">
            {(['min', 'median', 'max'] as const).map((tier) => (
                <button
                    key={tier}
                    className={`tier-button ${selectedTier === tier ? 'selected' : ''}`}
                    onClick={() => onTierChange(tier)}
                >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </button>
            ))}
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

    const handleSelectionChange = (weaponIndex: number, sequence: string) => {
        setSelectedWeapon(weaponIndex);
        setSelectedSequence(sequence);
    };

    if (!config || !character) return null;

    if (loading) {
        return (
            <div className="stat-upgrades compact">
                <div className="upgrade-header">
                    <h3>Substat Priority</h3>
                </div>
                <div className="upgrade-loading">Loading...</div>
            </div>
        );
    }

    if (error || !upgradeData) {
        return (
            <div className="stat-upgrades compact">
                <div className="upgrade-header">
                    <h3>Substat Priority</h3>
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
                    <h3>Substat Priority</h3>
                    <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
                </div>
                <WeaponSequenceDropdown
                    characterId={characterId}
                    selectedWeapon={selectedWeapon}
                    selectedSequence={selectedSequence}
                    onSelectionChange={handleSelectionChange}
                />
                <div className="no-upgrades">No upgrade data available</div>
            </div>
        );
    }

    const tierData = sequenceUpgrades[selectedTier];
    const validUpgrades = Object.entries(tierData)
        .filter(([_, value]) => value > 0)  // Remove stats with no gain
        .sort(([, a], [, b]) => b - a)      // Sort by gain descending
        .slice(0, 6);

    if (validUpgrades.length === 0) {
        return (
            <div className="stat-upgrades compact">
                <div className="upgrade-header">
                    <h3>Substat Priority</h3>
                    <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
                </div>
                <WeaponSequenceDropdown
                    characterId={characterId}
                    selectedWeapon={selectedWeapon}
                    selectedSequence={selectedSequence}
                    onSelectionChange={handleSelectionChange}
                />
                <div className="no-upgrades">No upgrades available</div>
            </div>
        );
    }

    return (
        <div className="stat-upgrades compact">
            <div className="upgrade-header">
                <h3>Substat Priority</h3>
                <div className="header-controls">
                    <WeaponSequenceDropdown
                        characterId={characterId}
                        selectedWeapon={selectedWeapon}
                        selectedSequence={selectedSequence}
                        onSelectionChange={handleSelectionChange}
                    />
                    <TierSelector selectedTier={selectedTier} onTierChange={setSelectedTier} />
                </div>
            </div>
            
            <div className="upgrade-grid">
                {validUpgrades.map(([stat, gain]) => {
                    const newDamage = currentDamage + gain;
                    const percentGain = ((gain / currentDamage) * 100);
                    
                    return (
                        <div key={stat} className="upgrade-item">
                            <div className="stat-name">{STAT_DISPLAY_NAMES[stat] || stat}</div>
                            <div className="damage-numbers">
                                <div className="new-damage">
                                    {Math.round(newDamage).toLocaleString()}
                                    <span className="gain">(+{Math.round(gain).toLocaleString()})</span>
                                </div>
                                <div className="percent-gain">+{percentGain.toFixed(1)}%</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
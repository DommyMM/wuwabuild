import { getAssetPath } from '../../types/paths';
import { CHARACTER_CONFIGS } from './config';
import { Character } from '../../types/character';
import { getCachedWeapon } from '../../hooks/useWeapons';
import { Sequence } from '../Build/types';
import { useState } from 'react';
import { MoveRight, ChevronDown } from 'lucide-react';

const InfoTitle: React.FC<{ name: string;}> = ({ name }) => (
    <div className="header-title">
        <h1 className="build-header-title">{name} Rankings</h1>
    </div>
);

const TeamDisplay: React.FC<{ 
    mainChar: Character; 
    teamIds: string[];
    characters: Character[]; 
}> = ({ mainChar, teamIds, characters }) => (
    <div className="team-grid">
        <div className="team-member">
            <img src={getAssetPath('face1', mainChar).cdn} alt={mainChar.name} className="team-portrait" />
            <span className="team-name">{mainChar.name}</span>
        </div>
        {teamIds.map(id => {
            const teamMember = characters.find(c => c.id === id);
            if (!teamMember) return null;
            return (
                <div key={id} className="team-member">
                    <img src={getAssetPath('face1', teamMember).cdn} alt={teamMember.name} className="team-portrait" />
                    <span className="team-name">{teamMember.name}</span>
                </div>
            );
        })}
    </div>
);

const RotationDisplay: React.FC<{ steps: string[] }> = ({ steps }) => (
    <div className="rotation-flow">
        {steps.map((step, index) => (
            <div key={index} className="rotation-step-container">
                <div className="rotation-step">
                    {step}
                </div>
                {index < steps.length - 1 && (
                    <MoveRight className="rotation-arrow" />
                )}
            </div>
        ))}
    </div>
);

const BuildSelector: React.FC<{ 
    characterId: string;
    maxDamages: Array<{ weaponId: string; damage: number }>;
    onWeaponSelect?: (index: number) => void;
    selectedIndex?: number;
    onSequenceSelect?: (sequence: Sequence) => void; 
    selectedSequence?: Sequence;
}> = ({ 
    characterId, 
    maxDamages, 
    onWeaponSelect, 
    selectedIndex = 0,
    onSequenceSelect,
    selectedSequence = 's0'
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const config = CHARACTER_CONFIGS[characterId];
    if (!config?.weapons) return null;

    return (
        <div className="build-selector">
            <div className="build-header-content">
                <div className="weapon-grid">
                    {config.weapons.map((weaponId, index) => {
                        const weapon = getCachedWeapon(weaponId);
                        if (!weapon) return null;
                        
                        const maxDamage = maxDamages.find(d => d.weaponId === weaponId)?.damage;
                        
                        return (
                            <div key={weaponId}
                                className={`lb-weapon-option ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => onWeaponSelect?.(index)}
                            >
                                <img src={getAssetPath('weapons', weapon).cdn} alt={weapon.name} className="lb-weapon-portrait" />
                                <span className="lb-weapon-name">{weapon.name}</span>
                                {maxDamage && (
                                    <span className="weapon-damage">{Number(maxDamage.toFixed(0)).toLocaleString()}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {config.sequences && (
                    <div className="sequence-selector-grid">
                        {config.sequences.map(seq => (
                            <div key={seq} className={`sequence-selector-item ${seq === selectedSequence ? 'selected' : ''}`}
                                onClick={() => onSequenceSelect?.(seq as Sequence)}
                            >
                                {`S${seq.charAt(1)}`}
                            </div>
                        ))}
                    </div>
                )}
                <button className={`expand-toggle ${isExpanded ? 'expanded' : ''}`} onClick={() => setIsExpanded(!isExpanded)} aria-label="Toggle details">
                    <ChevronDown className="expand-icon" />
                </button>
            </div>
            
            {isExpanded && (
                <div className="build-details">
                    {config.rotation && (
                        <section className="details-section">
                            <h3>Rotation</h3>
                            <RotationDisplay steps={config.rotation} />
                        </section>
                    )}
                    {config.notes && (
                        <section className="details-section">
                            <p className='notes'>{config.notes}</p>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

interface LBInfoProps { 
    characterId: string;
    character: Character;
    characters: Character[];
    onWeaponSelect?: (index: number) => void;
    selectedWeapon?: number;
    maxDamages: Array<{ weaponId: string; damage: number }>;
    onSequenceSelect?: (sequence: Sequence) => void;
    selectedSequence?: Sequence;
}

export const LBInfo: React.FC<LBInfoProps> = ({ 
    characterId,
    character,
    characters,
    onWeaponSelect, 
    selectedWeapon = 0, 
    maxDamages,
    onSequenceSelect,
    selectedSequence
}) => {
    const config = CHARACTER_CONFIGS[characterId] || {
        description: 'No specific team requirements',
        teamIds: [],
        expectedStats: []
    };

    if (!character) return null;

    return (
        <div className="header-content">
            <InfoTitle name={character.name}/>
            <TeamDisplay 
                mainChar={character} 
                teamIds={config.teamIds} 
                characters={characters}
            />
            <BuildSelector 
                characterId={characterId} 
                maxDamages={maxDamages}
                onWeaponSelect={onWeaponSelect}
                selectedIndex={selectedWeapon}
                onSequenceSelect={onSequenceSelect}
                selectedSequence={selectedSequence}
            />
        </div>
    );
};
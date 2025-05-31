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

const parseSequenceStyle = (seqStyle: string) => {
    const parts = seqStyle.split('_');
    return {
        baseSequence: parts[0],
        style: parts[1] || 'default'
    };
};

const getStyle = (characterId: string, selectedSequence: Sequence) => {
    const config = CHARACTER_CONFIGS[characterId] || {};
    const hasStyles = config.styles && config.styles.length > 1;
    
    const { style: currentStyle } = parseSequenceStyle(selectedSequence);
    const activeStyle = config.styles?.find(s => s.key === currentStyle);
    
    return {
        config,
        hasStyles,
        currentStyle,
        activeStyle,
        teamIds: activeStyle?.teamIds ?? config.teamIds ?? [],
        rotation: activeStyle?.rotation || config.rotation || [],
        notes: activeStyle?.notes || config.notes || ''
    };
};

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
    const { config, hasStyles, rotation, notes } = getStyle(characterId, selectedSequence);
    
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

                {/* Sequence selector - different rendering based on whether character has styles */}
                <div className="sequence-selector-grid">
                    {config.sequences && !hasStyles ? (
                        // Original design for characters without styles
                        config.sequences.map(seq => (
                            <div key={seq} className={`sequence-selector-item ${seq === selectedSequence ? 'selected' : ''}`}
                                onClick={() => onSequenceSelect?.(seq as Sequence)}
                            >
                                {`S${seq.charAt(1)}`}
                            </div>
                        ))
                    ) : (
                        // Split design for characters with styles
                        config.sequences?.map(seq => {
                            return (
                                <div key={seq} className="style-group">
                                    <div className="sequence-label">S{seq.charAt(1)}</div>
                                    <div className="style-options">
                                        {config.styles?.map(styleOption => {
                                            const fullSequence = styleOption.key === 'default' ? seq : `${seq}_${styleOption.key}`;
                                            const isSelected = selectedSequence === fullSequence;
                                            
                                            return (
                                                <div key={styleOption.key}
                                                    className={`style-option ${isSelected ? 'selected' : ''} ${styleOption.key}`}
                                                    onClick={() => onSequenceSelect?.(fullSequence as Sequence)}
                                                    title={styleOption.description}
                                                >
                                                    {styleOption.name}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <button className={`expand-toggle ${isExpanded ? 'expanded' : ''}`} onClick={() => setIsExpanded(!isExpanded)} aria-label="Toggle details">
                    <ChevronDown className="expand-icon" />
                </button>
            </div>
            
            {isExpanded && (
                <div className="build-details">
                    {rotation && rotation.length > 0 && (
                        <section className="details-section">
                            <h3>Rotation</h3>
                            <RotationDisplay steps={rotation} />
                        </section>
                    )}
                    {notes && (
                        <section className="details-section">
                            <p className='notes'>{notes}</p>
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
    selectedSequence = 's0'
}) => {
    const { teamIds } = getStyle(characterId, selectedSequence);

    if (!character) return null;

    return (
        <div className="header-content">
            <InfoTitle name={character.name}/>
            <TeamDisplay 
                mainChar={character} 
                teamIds={teamIds}
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
import { cachedCharacters } from '../../hooks/useCharacters';
import { getAssetPath } from '../../types/paths';
import { CHARACTER_CONFIGS } from './config';
import { Character } from '../../types/character';
import { getCachedWeapon } from '../../hooks/useWeapons';

const InfoTitle: React.FC<{ name: string; description: string }> = ({ name, description }) => (
    <div className="header-title">
        <h1 className="build-header-title">{name} Rankings</h1>
        <span className="build-header-text">{description}</span>
        <span className='build-header-text'>Very early testing, prone to miscalculations</span>
    </div>
);

const TeamDisplay: React.FC<{ mainChar: Character; teamIds: string[] }> = ({ mainChar, teamIds }) => (
    <div className="team-grid">
        <div className="team-member">
            <img src={getAssetPath('face1', mainChar).cdn}
                alt={mainChar.name} 
                className="team-portrait"
            />
            <span className="team-name">{mainChar.name}</span>
        </div>
        {teamIds.map(id => {
            const teamMember = cachedCharacters?.find(c => c.id === id);
            if (!teamMember) return null;
            return (
                <div key={id} className="team-member">
                    <img src={getAssetPath('face1', teamMember).cdn}
                        alt={teamMember.name} 
                        className="team-portrait"
                    />
                    <span className="team-name">{teamMember.name}</span>
                </div>
            );
        })}
    </div>
);

const RotationDisplay: React.FC<{ 
    characterId: string;
    maxDamages: Array<{ weaponId: string; damage: number }>;
    onWeaponSelect?: (index: number) => void;
    selectedIndex?: number;
}> = ({ characterId, maxDamages, onWeaponSelect, selectedIndex = 0 }) => {
    if (characterId !== "32") return null;
    const config = CHARACTER_CONFIGS[characterId];
    if (!config?.weapons) return null;

    return (
        <div className="rotation-display">
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
                            <img src={getAssetPath('weapons', weapon).cdn}
                                alt={weapon.name}
                                className="lb-weapon-portrait"
                            />
                            <span className="lb-weapon-name">{weapon.name}</span>
                            {maxDamage && (
                                <span className="weapon-damage">{maxDamage.toLocaleString()}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const LBInfo: React.FC<{ 
    characterId: string;
    calculations?: Array<{ weaponId: string; damage: number }>;
    onWeaponSelect?: (index: number) => void;
    selectedWeapon?: number;
    maxDamages: Array<{ weaponId: string; damage: number }>;
}> = ({ characterId, calculations, onWeaponSelect, selectedWeapon = 0, maxDamages }) => {
    const character = cachedCharacters?.find(c => c.id === characterId);
    const config = CHARACTER_CONFIGS[characterId] || {
        description: 'No specific team requirements',
        teamIds: [],
        expectedStats: []
    };

    if (!character) return null;

    return (
        <div className="header-content">
            <InfoTitle name={character.name} description={config.description} />
            <TeamDisplay mainChar={character} teamIds={config.teamIds} />
            <RotationDisplay 
                characterId={characterId} 
                maxDamages={maxDamages}
                onWeaponSelect={onWeaponSelect}
                selectedIndex={selectedWeapon}
            />
        </div>
    );
};
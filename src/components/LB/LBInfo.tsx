import { cachedCharacters } from '../../hooks/useCharacters';
import { getAssetPath } from '../../types/paths';
import { CHARACTER_CONFIGS } from './config';
import { Character } from '../../types/character';

const InfoTitle: React.FC<{ name: string; description: string }> = ({ name, description }) => (
    <div className="header-title">
        <h1 className="build-header-title">{name} Rankings</h1>
        <span className="build-header-text">{description}</span>
    </div>
);

const TeamDisplay: React.FC<{ mainChar: Character; teamIds: string[] }> = ({ mainChar, teamIds }) => (
    <div className="team-grid">
        <div className="team-member">
            <img 
                src={getAssetPath('face1', mainChar).cdn}
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
                    <img 
                        src={getAssetPath('face1', teamMember).cdn}
                        alt={teamMember.name} 
                        className="team-portrait"
                    />
                    <span className="team-name">{teamMember.name}</span>
                </div>
            );
        })}
    </div>
);

export const LBInfo: React.FC<{ characterId: string }> = ({ characterId }) => {
    const character = cachedCharacters?.find(c => c.id === characterId);
    const config = CHARACTER_CONFIGS[characterId] || {
        description: 'No specific team requirements',
        teamIds: [],
        expectedStats: []
    };

    if (!character) return null;

    return (
        <div className="header-content">
            <InfoTitle 
                name={character.name} 
                description={config.description} 
            />
            <TeamDisplay 
                mainChar={character} 
                teamIds={config.teamIds} 
            />
        </div>
    );
};
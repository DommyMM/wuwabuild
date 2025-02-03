import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { cachedCharacters } from '../hooks/useCharacters';
import { LB_URL } from '../components/Import/Results';
import { getAssetPath } from '../types/paths';
import { Character } from '../types/character';
import { CharacterEntry } from './CharacterEntry';
import '../styles/Leaderboard.css';

interface LeaderboardData {
    _id: string;
    totalEntries: number;
    topBuild: {
        damage: number;
        owner: {
            username?: string;
            uid?: string;
        };
    };
}

const LeaderboardHeader: React.FC = () => (
    <div className="build-header-container">
        <h1 className="build-header-title">Damage Rankings</h1>
        <span className="build-header-text">Character-specific damage rankings</span>
    </div>
);

const LeaderboardCharacterSection: React.FC<{
    character: Character | null | undefined;
    elementClass: string;
}> = ({ character, elementClass }) => (
    <div className="build-character">
        <img src={getAssetPath('face1', character as Character).cdn}
            alt={character?.name}
            className={`build-portrait ${elementClass}`}
        />
        <span className={`char-name ${elementClass}`}>{character?.name}</span>
    </div>
);

const LeaderboardWeaponsSection: React.FC = () => (
    <div className="build-weapons">--</div>
);

const LeaderboardTeamSection: React.FC = () => (
    <div className="build-team">--</div>
);

const LeaderboardEntry: React.FC<{ data: LeaderboardData }> = ({ data }) => {
    const character = cachedCharacters?.find(c => c.id === data._id);
    const elementClass = character?.element.toLowerCase() ?? '';
    const damage = data.topBuild.damage ?? 0;
    const username = data.topBuild.owner.username || 'Anonymous';
    
    return (
        <div className="build-entry">
            <div className='build-main-content'>
                <LeaderboardCharacterSection character={character} elementClass={elementClass} />
                <LeaderboardWeaponsSection />
                <LeaderboardTeamSection />
                <div className="build-entries">{data.totalEntries}</div>
                <div className="build-rank1">
                        <div className="rank1-name">{username}</div>
                        <div className="rank1-damage">{damage.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
};

const CharacterList: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<LeaderboardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${LB_URL}/leaderboard`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                const json = await response.json();
                setData(json.characters);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="build-container">
            <div className="loading-state">Loading leaderboard data...</div>
        </div>
    );

    if (error) return (
        <div className="build-container">
            <div className="error-state">Error: {error}</div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="overall-wrapper">
                <div className="build-container">
                    <LeaderboardHeader />
                    <div className="build-table">
                        <div className="build-header">
                            <span>Character</span>
                            <span>Weapons</span>
                            <span>Team</span>
                            <span>Total Entries</span>
                            <span>Rank 1</span>
                        </div>
                        <div className="build-entries">
                            {data.map(entry => (
                                <div key={entry._id} onClick={() => navigate(`${entry._id}`)}>
                                    <LeaderboardEntry data={entry} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const LeaderboardPage: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<CharacterList />} />
            <Route path=":characterId" element={<CharacterEntry />} />
        </Routes>
    );
};
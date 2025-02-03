import React, { useState, useEffect } from 'react';
import { LB_URL } from '../components/Import/Results';
import { decompressData } from '../components/Save/Backup';
import { Pagination } from '../components/Save/Pagination';
import { CompressedEntry, DecompressedEntry } from '../components/Build/types';
import { DamageEntry } from '../components/LB/DamageEntry';
import { useParams } from 'react-router-dom';
import { cachedCharacters } from '../hooks/useCharacters';

const LeaderboardHeader: React.FC<{ characterName?: string }> = ({ characterName }) => (
    <div className="build-header-container">
        <h1 className="build-header-title">{characterName || ''} Damage Rankings</h1>
        <span className="build-header-text">
            Character-specific damage rankings
        </span>
    </div>
);

const LeaderboardTable: React.FC<{
    data: DecompressedEntry[];
    page: number;
    itemsPerPage: number;
}> = ({ data, page, itemsPerPage }) => (
    <div className="build-table">
        <div className="build-header">
            <span>Rank</span>
            <span>Owner</span>
            <span>Character</span>
            <span>Sets</span>
            <span>Crit Value</span>
            <span>Stats</span>
            <span>Damage</span>
        </div>
        <div className="build-entries">
            {data.map((entry, index) => (
                <DamageEntry key={entry.timestamp} entry={entry} rank={(page - 1) * itemsPerPage + index + 1} />
            ))}
        </div>
    </div>
);

interface BuildResponse {
    builds: CompressedEntry[];
    total: number;
    page: number;
    pageSize: number;
}

export const CharacterEntry: React.FC = () => {
    const { characterId } = useParams<{ characterId: string }>();
    const character = cachedCharacters?.find(c => c.id === characterId);
    const [data, setData] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const itemsPerPage = 10;
    useEffect(() => {
        const loadData = async () => {
            if (!characterId) return;
            try {
                const params = new URLSearchParams({
                    page: String(page),
                    pageSize: String(itemsPerPage)
                });
                
                const response = await fetch(`${LB_URL}/leaderboard/${characterId}?${params}`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                
                const { builds, total } = await response.json() as BuildResponse;
                setTotal(total);
                setData(builds.map((entry: CompressedEntry) => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state
                })));
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };
        loadData();
    }, [page, characterId]);
    if (loading) return (
        <div className="build-container">
            <div className="loading-state">Loading character data...</div>
        </div>
    );
    
    if (error) return (
        <div className="build-container">
            <div className="error-state">Error: {error}</div>
        </div>
    );
    const pageCount = Math.ceil(total / itemsPerPage);
    return (
        <div className="page-wrapper">
            <div className="lb-wrapper">
                <div className="build-container">
                    <LeaderboardHeader characterName={character?.name} />
                    <LeaderboardTable data={data} page={page} itemsPerPage={itemsPerPage} />
                    <Pagination currentPage={page} pageCount={pageCount} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
};
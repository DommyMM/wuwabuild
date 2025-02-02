import React, { useState, useEffect } from 'react';
import { LB_URL } from '../components/Import/Results';
import { Pagination } from '../components/Save/Pagination';
import { CompressedEntry, DecompressedEntry } from '../components/Build/types';
import { decompressData } from '../components/Save/Backup';
import { DamageEntry } from '../components/LB/DamageEntry';
import '../styles/BuildPage.css';

const DamageLeaderboardHeader: React.FC = () => (
    <div className="build-header">
        <div>Rank</div>
        <div>Owner</div>
        <div>Character</div>
        <div>Sets</div>
        <div>Crit Value</div>
        <div>Stats</div>
        <div>Damage</div>
    </div>
);

export const LeaderboardPage: React.FC = () => {
    const [builds, setBuilds] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const itemsPerPage = 10;
    const characterId = '26'; // Hard-coded for testing

    useEffect(() => {
        const fetchBuilds = async () => {
            try {
                const response = await fetch(
                    `${LB_URL}/damage/${characterId}?page=${page}&pageSize=${itemsPerPage}`
                );
                const data = await response.json();
                setBuilds(data.builds.map((entry: CompressedEntry) => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state
                })));
                setTotal(data.total);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBuilds();
    }, [page]);

    if (loading) return <div>Loading...</div>;
    return (
        <div className="page-wrapper">
            <div className="build-wrapper">
                <div className="build-container">
                    <div className="build-header-container">
                        <h1 className="build-header-title">Damage Rankings</h1>
                        <p>Character: {characterId}</p>
                    </div>
                    <div className="build-table">
                        <DamageLeaderboardHeader />
                        {builds.map((build, index) => (
                            <DamageEntry
                                key={build.timestamp}
                                entry={build}
                                rank={(page - 1) * itemsPerPage + index + 1}
                            />
                        ))}
                    </div>
                    <Pagination 
                        currentPage={page}
                        pageCount={Math.ceil(total / itemsPerPage)}
                        onPageChange={setPage}
                    />
                </div>
            </div>
        </div>
    );
};

export default LeaderboardPage;
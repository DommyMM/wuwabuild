import React, { useState, useEffect } from 'react';
import { LB_URL } from '../components/Import/Results';
import { decompressData } from '../components/Build/Backup';
import { Pagination } from '../components/Build/Pagination';
import { CompressedEntry, DecompressedEntry } from '../components/LB/types';
import { LBEntry } from '../components/LB/LbEntry';
import '../styles/Leaderboard.css';

const LBHeader: React.FC = () => (
    <div className="lb-header-container">
        <h1 className="lb-header-title">Global Board</h1>
        <p className="lb-header-text">
            Global ranking of imported builds (Sorted by CV for now)
        </p>
    </div>
);

export const Leaderboard: React.FC = () => {
    const [data, setData] = useState<DecompressedEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
    const itemsPerPage = 10;
    const initialLimit = 30;

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const response = await fetch(`${LB_URL}/leaderboard?limit=${initialLimit}`);
                if (!response.ok) throw new Error('Failed to fetch leaderboard');
                const json: CompressedEntry[] = await response.json();
                
                const initialData = json.map(entry => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state
                }))
                .sort((a, b) => (b.cv + b.cvPenalty) - (a.cv + a.cvPenalty));
                
                setData(initialData);
                setLoading(false);
                const fullResponse = await fetch(`${LB_URL}/leaderboard`);
                if (!fullResponse.ok) throw new Error('Failed to fetch full leaderboard');
                const fullJson: CompressedEntry[] = await fullResponse.json();
                
                const fullData = fullJson.map(entry => ({
                    ...entry,
                    buildState: decompressData({ state: entry.buildState }).state
                }))
                .sort((a, b) => (b.cv + b.cvPenalty) - (a.cv + a.cvPenalty));
                
                setData(fullData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };
        loadInitial();
    }, []);

    if (loading) return (
        <div className="lb-container">
            <div className="loading-state">Loading leaderboard data...</div>
        </div>
    );
    
    if (error) return (
        <div className="lb-container">
            <div className="error-state">Error: {error}</div>
        </div>
    );

    const pageCount = Math.ceil(data.length / itemsPerPage);
    const currentData = data.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="page-wrapper">
            <div className="lb-wrapper">
                <div className="lb-container">
                    <LBHeader />
                    <div className="lb-table">
                        <div className="lb-header">
                            <span>Rank</span>
                            <span>Owner</span>
                            <span>Character</span>
                            <span></span>
                            <span></span>
                            <span>Sets</span>
                            <span>Crit Value</span>
                            <span>Stats</span>
                        </div>
                        <div className="lb-entries">
                            {currentData.map((entry, index) => (
                                <LBEntry key={entry.timestamp}
                                    entry={entry}
                                    rank={(currentPage - 1) * itemsPerPage + index + 1}
                                    onClick={() => setExpandedEntries(prev => {
                                        const next = new Set(prev);
                                        if (next.has(entry.timestamp)) {
                                            next.delete(entry.timestamp);
                                        } else {
                                            next.add(entry.timestamp);
                                        }
                                        return next;
                                    })}
                                    isExpanded={expandedEntries.has(entry.timestamp)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <Pagination currentPage={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
        </div>
    );
};
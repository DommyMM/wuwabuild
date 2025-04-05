'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { LB_URL } from '@/components/Import/Results';
import '@/styles/Profile.css';

export default function ProfilesClient() {
    const [searchUID, setSearchUID] = useState('');
    const [recentSearches, setRecentSearches] = useState<{uid: string, timestamp: number}[]>([]);
    const router = useRouter();

    useEffect(() => {
        // Load recent searches from localStorage
        const savedSearches = localStorage.getItem('recentProfileSearches');
        if (savedSearches) {
            try {
                setRecentSearches(JSON.parse(savedSearches));
            } catch (e) {
                console.error('Failed to parse recent searches', e);
            }
        }
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!searchUID || !/^\d{9}$/.test(searchUID)) {
            toast.error('Please enter a valid 9-digit UID');
            return;
        }
        
        try {
            // Verify the UID exists by making a request
            const response = await fetch(`${LB_URL}/profile/${searchUID}?page=1&pageSize=1`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    toast.error(`No profile found with UID: ${searchUID}`);
                    return;
                }
                throw new Error('Failed to fetch profile data');
            }
            
            const data = await response.json();
            
            if (data.total === 0) {
                toast.error(`No builds found for UID: ${searchUID}`);
                return;
            }
            
            // Save to recent searches
            const newSearch = { uid: searchUID, timestamp: Date.now() };
            const updatedSearches = [
                newSearch,
                ...recentSearches.filter(s => s.uid !== searchUID)
            ].slice(0, 5); // Keep only 5 most recent
            
            setRecentSearches(updatedSearches);
            localStorage.setItem('recentProfileSearches', JSON.stringify(updatedSearches));
            
            // Navigate to profile page
            router.push(`/profiles/${searchUID}`);
        } catch (error) {
            console.error('Error checking profile:', error);
            toast.error('Failed to verify profile. Please try again later.');
        }
    };

    const viewProfile = (uid: string) => {
        router.push(`/profiles/${uid}`);
    };
    return (
        <div className="page-wrapper">
            <div className="build-header-container">
                <h1 className="build-header-title">Player Profiles</h1>
                <div className="build-header-divider"></div>
                <div className="build-header-text">
                    <span>Search for player profiles by their UID to view their builds</span>
                </div>
            </div>
            <div className="profile-main-container">
                <div className="profile-search-section">
                    <form onSubmit={handleSearch} className="profile-search-form">
                        <div className="profile-search-wrapper">
                            <input type="text"
                                placeholder="Enter 9-digit UID (e.g. 500006092)"
                                value={searchUID}
                                onChange={(e) => setSearchUID(e.target.value.replace(/[^\d]/g, '').slice(0, 9))}
                                className="profile-search-input"
                            />
                            <button type="submit" className="build-button">
                                Search
                            </button>
                        </div>
                        <div className="profile-search-help">
                            Enter a player&apos;s UID to view their character builds and stats
                        </div>
                    </form>
                    {recentSearches.length > 0 && (
                        <div className="recent-searches-container">
                            <h2 className="recent-searches-title">Recent Searches</h2>
                            <div className="recent-searches-list">
                                {recentSearches.map((search) => (
                                    <div
                                        key={search.uid}
                                        className="recent-search-item"
                                        onClick={() => viewProfile(search.uid)}
                                    >
                                        <div className="recent-search-uid">UID: {search.uid}</div>
                                        <div className="recent-search-time">
                                            {new Date(search.timestamp).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
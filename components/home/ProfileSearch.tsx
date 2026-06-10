'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { Star } from 'lucide-react';
import { resolveRegionBadge } from '@/components/leaderboards/formatters';
import { getPinnedProfiles, getRecentProfiles, StoredProfile } from '@/lib/profileHistory';

interface ProfileMatch {
    uid: string;
    username: string;
    server: string;
    buildCount: number;
}

interface SearchResults {
    forQuery: string;
    matches: ProfileMatch[];
}

interface ProfileSearchProps {
    /** Where this search lives, recorded on the navigate capture. */
    surface?: 'home' | 'profiles' | 'nav';
    /** Focus the input on mount (navbar popover). */
    autoFocus?: boolean;
    /** Show pinned/recent profiles when the input is focused with no query. */
    showSavedProfiles?: boolean;
}

/** Enka-style entry point: type a UID or username, land on the profile. Empty focus shows pinned + recent visits. */
export function ProfileSearch({ surface = 'home', autoFocus = false, showSavedProfiles = true }: ProfileSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ forQuery: '', matches: [] });
    const [saved, setSaved] = useState<Array<StoredProfile & { isPinned: boolean }>>([]);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) return;
        const seq = ++requestSeq.current;
        const timer = setTimeout(() => {
            fetch(`/api/lb/profile?q=${encodeURIComponent(q)}&limit=6`)
                .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
                .then((payload: { profiles?: unknown[] }) => {
                    if (seq !== requestSeq.current) return;
                    const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
                    const matches = profiles
                        .map((raw) => {
                            const p = raw as Partial<ProfileMatch>;
                            return {
                                uid: typeof p.uid === 'string' ? p.uid : '',
                                username: typeof p.username === 'string' ? p.username : '',
                                server: typeof p.server === 'string' ? p.server : '',
                                buildCount: typeof p.buildCount === 'number' ? p.buildCount : 0,
                            };
                        })
                        .filter((p) => p.uid);
                    setResults({ forQuery: q, matches });
                })
                .catch(() => {
                    if (seq !== requestSeq.current) return;
                    setResults({ forQuery: q, matches: [] });
                });
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, []);

    const trimmed = query.trim();
    // Results are only valid for the query they were fetched for; anything else means a fetch is in flight.
    const searching = trimmed.length >= 2 && results.forQuery !== trimmed;
    const matches = results.forQuery === trimmed ? results.matches : [];
    const showSearch = trimmed.length >= 2;
    const showRecents = showSavedProfiles && !showSearch && saved.length > 0;
    const showPanel = open && (showSearch || showRecents);

    const openPanel = () => {
        if (showSavedProfiles) {
            const pinned = getPinnedProfiles();
            const pinnedUids = new Set(pinned.map((entry) => entry.uid));
            setSaved([
                ...pinned.map((entry) => ({ ...entry, isPinned: true })),
                ...getRecentProfiles()
                    .filter((entry) => !pinnedUids.has(entry.uid))
                    .map((entry) => ({ ...entry, isPinned: false })),
            ].slice(0, 8));
        }
        setOpen(true);
    };

    const go = (uid: string) => {
        posthog.capture('home_cta_click', { cta: 'profile', section: 'search', surface });
        router.push(`/profile/${uid}`);
    };

    const onSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (/^\d{9,10}$/.test(trimmed)) {
            go(trimmed);
            return;
        }
        if (matches[0]) go(matches[0].uid);
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-105">
            <form onSubmit={onSubmit}>
                <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-background-secondary/80 backdrop-blur-sm pl-5 pr-2 py-2 transition-shadow focus-within:border-accent/70 focus-within:shadow-[0_0_24px_-4px_rgba(166,150,98,0.45)]">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            openPanel();
                        }}
                        onFocus={openPanel}
                        placeholder="Enter UID or username..."
                        aria-label="Search players by UID or username"
                        className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-primary/40 outline-none"
                    />
                    <button
                        type="submit"
                        aria-label="Search"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-colors hover:bg-accent-hover cursor-pointer"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                            <path d="M5 12h14m0 0l-6-6m6 6l-6 6" />
                        </svg>
                    </button>
                </div>
            </form>

            {showPanel && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-border bg-background-secondary shadow-[0_18px_42px_rgba(0,0,0,0.62)]">
                    {showRecents ? (
                        <>
                            <div className="px-4 pt-2.5 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-primary/40">
                                Profiles
                            </div>
                            <ul className="scrollbar-thin max-h-[min(18rem,calc(100vh-17rem))] overflow-y-auto [--scrollbar-width:4px]">
                                {saved.map((recent) => {
                                    const badge = resolveRegionBadge(recent.uid);
                                    return (
                                    <li key={recent.uid} className="border-b border-border/50 last:border-b-0">
                                        <button
                                            type="button"
                                            onClick={() => go(recent.uid)}
                                            className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-accent/8 cursor-pointer"
                                        >
                                            {recent.head ? (
                                                <img src={recent.head} alt="" className="h-7 w-7 shrink-0 rounded object-cover object-top" loading="lazy" />
                                            ) : (
                                                <span className="h-7 w-7 shrink-0 rounded bg-border/30" aria-hidden />
                                            )}
                                            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[15px] text-text-primary">
                                                {recent.isPinned && (
                                                    <Star size={11} className="shrink-0 fill-accent text-accent/80" aria-label="Pinned" />
                                                )}
                                                <span className="min-w-0 truncate">{recent.username || 'Anonymous'}</span>
                                            </span>
                                            {badge && (
                                                <span className={`shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wider ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                            )}
                                            <span className="shrink-0 font-mono text-[11px] text-text-primary/45 tabular-nums">
                                                {recent.uid}
                                            </span>
                                        </button>
                                    </li>
                                    );
                                })}
                            </ul>
                        </>
                    ) : matches.length > 0 ? (
                        <ul className="scrollbar-thin max-h-[min(18rem,calc(100vh-17rem))] overflow-y-auto [--scrollbar-width:4px]">
                            {matches.map((match) => {
                                const badge = resolveRegionBadge(match.uid);
                                return (
                                <li key={match.uid} className="border-b border-border/50 last:border-b-0">
                                    <button
                                        type="button"
                                        onClick={() => go(match.uid)}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/8 cursor-pointer"
                                    >
                                        <span className="min-w-0 flex-1 truncate text-[15px] text-text-primary">
                                            {match.username || 'Anonymous'}
                                        </span>
                                        {badge && (
                                            <span className={`shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wider ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        )}
                                        <span className="shrink-0 font-mono text-[11px] text-text-primary/45 tabular-nums">
                                            {match.uid}
                                            {match.buildCount > 0 ? ` · ${match.buildCount} ${match.buildCount === 1 ? 'build' : 'builds'}` : ''}
                                        </span>
                                    </button>
                                </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="px-4 py-3 text-sm text-text-primary/50">
                            {searching ? 'Searching...' : 'No players found. Import a build and yours will be here.'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

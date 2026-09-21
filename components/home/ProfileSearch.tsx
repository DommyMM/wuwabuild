'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { capture } from '@/lib/analytics';
import { resolveRegionBadge } from '@/components/leaderboards/formatters';
import { getPinnedProfiles, getRecentProfiles, StoredProfile } from '@/lib/profileHistory';
import { LB_API_BASE } from '@/lib/apiEndpoints';

// ⌘/Ctrl+K hint label, held in a useSyncExternalStore so hydration needs no setState
// Server snapshot is "Ctrl K" for the desktop majority, the client corrects to "⌘ K" on Apple platforms
const subscribeShortcut = () => () => {};
const readShortcut = () =>
    /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '') ? '⌘ K' : 'Ctrl K';
const readShortcutServer = () => 'Ctrl K';

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
    /** Where this search lives, recorded as `surface` on `profile_open` */
    surface?: 'home' | 'profiles' | 'nav';
    /**
     * Chrome around the shared input and results
     *
     * - `bar` is the standalone hero pill with a floating dropdown, used on `/` and `/profiles`
     * - `panel` is a flush input and results in one card, used for the mobile nav drawer
     * - `inline` spawns the input into the navbar row, results dropping flush beneath the nav
     */
    variant?: 'bar' | 'panel' | 'inline';
    /** Focus the input on mount (navbar popover) */
    autoFocus?: boolean;
    /** Show pinned and recent profiles when the input is focused with no query */
    showSavedProfiles?: boolean;
    /** Called on Escape so a host popover can dismiss itself */
    onRequestClose?: () => void;
    /**
     * Real player shown in the placeholder as a format example, never an invented handle
     *
     * With both set the placeholder teaches both accepted forms ("Username or UID, e.g. yuuhi or 500006092")
     */
    exampleName?: string;
    exampleUid?: string;
}

/** Type a UID or username, land on the profile. Focus with no query shows pinned and recent visits. */
export function ProfileSearch({
    surface = 'home',
    variant = 'bar',
    autoFocus = false,
    showSavedProfiles = true,
    onRequestClose,
    exampleName,
    exampleUid,
}: ProfileSearchProps) {
    const router = useRouter();
    const isPanel = variant === 'panel';
    const isInline = variant === 'inline';
    const placeholder = exampleName
        ? exampleUid
            ? `Username or UID, e.g. ${exampleName} or ${exampleUid}`
            : `UID or username, e.g. ${exampleName}`
        : 'Enter UID or username';
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ forQuery: '', matches: [] });
    const [saved, setSaved] = useState<Array<StoredProfile & { isPinned: boolean }>>([]);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const shortcutHint = useSyncExternalStore(subscribeShortcut, readShortcut, readShortcutServer);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const activeItemRef = useRef<HTMLButtonElement>(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) return;
        const seq = ++requestSeq.current;
        const timer = setTimeout(() => {
            fetch(`${LB_API_BASE}/profile?q=${encodeURIComponent(q)}&limit=6`)
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
    // Results only match the query they were fetched for, so a mismatch means a fetch is in flight
    const searching = trimmed.length >= 2 && results.forQuery !== trimmed;
    const matches = results.forQuery === trimmed ? results.matches : [];
    const showSearch = trimmed.length >= 2;
    const showRecents = showSavedProfiles && !showSearch && saved.length > 0;
    // Panel and inline live inside a host-mounted popover, so their body tracks content directly
    const hasBody = showSearch || showRecents;
    const showPanel = isPanel || isInline ? hasBody : open && hasBody;
    // Every surface links out to the directory, except the directory itself
    const showFooter = surface !== 'profiles';

    // Keyboard-navigable rows, aligned with what the body renders below
    const items = showRecents ? saved : matches;

    // Highlight resets whenever the visible list changes (typing, results arriving, recents to search)
    // Render-phase adjustment, not an effect
    const listKey = showRecents ? `r:${saved.length}` : `q:${trimmed}:${matches.length}`;
    const [prevListKey, setPrevListKey] = useState(listKey);
    if (prevListKey !== listKey) {
        setPrevListKey(listKey);
        setActiveIndex(-1);
    }

    useEffect(() => {
        if (activeIndex >= 0) activeItemRef.current?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

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
        capture('profile_open', { source: 'search', surface });
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

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            if (!items.length) return;
            event.preventDefault();
            setActiveIndex((i) => (i + 1) % items.length);
        } else if (event.key === 'ArrowUp') {
            if (!items.length) return;
            event.preventDefault();
            setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
        } else if (event.key === 'Enter') {
            if (activeIndex >= 0 && items[activeIndex]) {
                event.preventDefault();
                go(items[activeIndex].uid);
            }
            // Otherwise the form submit resolves a raw UID or the first match
        } else if (event.key === 'Escape') {
            if (onRequestClose) onRequestClose();
            else setOpen(false);
        }
    };

    // Shared results body: identical rows in every variant, only the chrome differs
    const body = showRecents ? (
        <>
            <div className="px-4 pt-2.5 pb-1 font-mono text-3xs uppercase tracking-[0.16em] text-text-primary/40">
                Profiles
            </div>
            <ul className="max-h-[min(18rem,calc(100vh-17rem))] overflow-y-auto">
                {saved.map((recent, i) => {
                    const badge = resolveRegionBadge(recent.uid);
                    const isActive = activeIndex === i;
                    // Active row drops hover because `hover:` outranks a plain background utility
                    // Leaving both on would dim the active row from 12% to 8% under the pointer
                    const rowBg = isActive
                        ? 'bg-accent/12'
                        : `hover:bg-accent/8 ${recent.isPinned ? 'bg-accent/4' : ''}`;
                    return (
                    <li key={recent.uid} className="border-b border-border/50 last:border-b-0">
                        <button
                            ref={isActive ? activeItemRef : undefined}
                            type="button"
                            onClick={() => go(recent.uid)}
                            onMouseEnter={() => setActiveIndex(i)}
                            className={`relative flex w-full items-center gap-3 px-4 py-2 text-left transition-colors cursor-pointer ${rowBg}`}
                        >
                            {/* Accent edge marks starred rows so names stay aligned across rows */}
                            {recent.isPinned && (
                                <span className="absolute inset-y-0 left-0 w-0.5 bg-accent/80" aria-hidden />
                            )}
                            {recent.head ? (
                                <img src={recent.head} alt="" className="h-7 w-7 shrink-0 rounded object-cover object-top" loading="lazy" />
                            ) : (
                                <span className="h-7 w-7 shrink-0 rounded bg-border/30" aria-hidden />
                            )}
                            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[15px] text-text-primary">
                                {recent.isPinned && <span className="sr-only">Starred</span>}
                                <span className="min-w-0 truncate">{recent.username || 'Anonymous'}</span>
                            </span>
                            {badge && (
                                <span className={`shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wider ${badge.className}`}>
                                    {badge.label}
                                </span>
                            )}
                            <span className="shrink-0 font-mono text-2xs text-text-primary/45 tabular-nums">
                                {recent.uid}
                            </span>
                        </button>
                    </li>
                    );
                })}
            </ul>
        </>
    ) : matches.length > 0 ? (
        <ul className="max-h-[min(18rem,calc(100vh-17rem))] overflow-y-auto">
            {matches.map((match, i) => {
                const badge = resolveRegionBadge(match.uid);
                const isActive = activeIndex === i;
                return (
                <li key={match.uid} className="border-b border-border/50 last:border-b-0">
                    <button
                        ref={isActive ? activeItemRef : undefined}
                        type="button"
                        onClick={() => go(match.uid)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${isActive ? 'bg-accent/12' : 'hover:bg-accent/8'}`}
                    >
                        <span className="min-w-0 flex-1 truncate text-[15px] text-text-primary">
                            {match.username || 'Anonymous'}
                        </span>
                        {badge && (
                            <span className={`shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wider ${badge.className}`}>
                                {badge.label}
                            </span>
                        )}
                        <span className="shrink-0 font-mono text-2xs text-text-primary/45 tabular-nums">
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
            {searching ? 'Searching' : 'No players found. Import a build and yours will be here.'}
        </p>
    );

    // Shared footer linking out to the full directory
    const footer = showFooter ? (
        <div className="flex justify-end border-t border-border px-4 py-2.5">
            <Link
                href="/profiles"
                onClick={() => {
                    onRequestClose?.();
                    setOpen(false);
                }}
                className="text-xs text-text-primary/55 transition-colors hover:text-accent"
            >
                All profiles →
            </Link>
        </div>
    ) : null;

    // Inline: input spawns where the navbar trigger sits, results drop flush beneath the nav
    // Both children anchor to the host's stretched wrapper, so they share a right edge and width
    if (isInline) {
        return (
            <div ref={containerRef}>
                <form onSubmit={onSubmit} className="absolute right-0 top-1/2 z-50 w-96 -translate-y-1/2">
                    <div className="flex h-9 items-center gap-2.5 rounded-lg border border-accent/50 bg-background-secondary px-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-colors focus-within:border-accent">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-text-primary/45" aria-hidden>
                            <circle cx="11" cy="11" r="7" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                openPanel();
                            }}
                            onFocus={openPanel}
                            onKeyDown={onKeyDown}
                            placeholder={placeholder}
                            aria-label="Search players by UID or username"
                            className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-primary/40 outline-none"
                        />
                        <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-3xs leading-none text-text-primary/40">
                            {trimmed.length > 0 ? '↵' : shortcutHint}
                        </kbd>
                    </div>
                </form>
                {showPanel && (
                    <div className="absolute right-0 top-full z-40 mt-2 w-96 overflow-hidden rounded-lg border border-border bg-background-secondary shadow-[0_18px_42px_rgba(0,0,0,0.62)]">
                        {body}
                        {footer}
                    </div>
                )}
            </div>
        );
    }

    // Panel: flush input, hairline divider and inline body, all in the host's card
    if (isPanel) {
        return (
            <div ref={containerRef} className="w-full">
                <form onSubmit={onSubmit}>
                    <div className="flex items-center gap-2.5 px-4 py-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-text-primary/40" aria-hidden>
                            <circle cx="11" cy="11" r="7" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value);
                                openPanel();
                            }}
                            onFocus={openPanel}
                            onKeyDown={onKeyDown}
                            placeholder={placeholder}
                            aria-label="Search players by UID or username"
                            className="min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-primary/40 outline-none"
                        />
                        <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-3xs leading-none text-text-primary/40">
                            {trimmed.length > 0 ? '↵' : shortcutHint}
                        </kbd>
                    </div>
                </form>
                {showPanel && (
                    <div className="border-t border-border">{body}</div>
                )}
                {footer}
            </div>
        );
    }

    // Bar: standalone hero pill with a floating dropdown beneath it
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
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
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
                    {body}
                    {footer}
                </div>
            )}
        </div>
    );
}

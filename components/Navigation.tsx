'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ProfileSearch } from './home/ProfileSearch';

export function Navigation() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLookupOpen, setIsLookupOpen] = useState(false);
    const lookupRef = useRef<HTMLDivElement>(null);

    // Close the lookup popover on outside click and after navigating.
    useEffect(() => {
        if (!isLookupOpen) return;
        const onPointerDown = (event: MouseEvent) => {
            if (lookupRef.current && !lookupRef.current.contains(event.target as Node)) {
                setIsLookupOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [isLookupOpen]);

    // Close the popover when navigating (render-time state adjustment, not an effect).
    const [lookupPathname, setLookupPathname] = useState(pathname);
    if (lookupPathname !== pathname) {
        setLookupPathname(pathname);
        setIsLookupOpen(false);
    }

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const closeSidebar = () => setIsOpen(false);

    const focusHomeProfileSearch = () => {
        const input = document.querySelector<HTMLInputElement>('#home-profile-search input');
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => input?.focus(), 180);
    };

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        // /profiles also owns the individual /profile/[uid] pages.
        if (path === '/profiles') return pathname.startsWith('/profile');
        return pathname.startsWith(path);
    };

    // Profile lookup is the navbar search icon, not a text link; the /profiles
    // directory stays reachable via the popover and footer.
    const navLinks = [
        { href: '/import', label: 'Import' },
        { href: '/profiles', label: 'Profiles' },
        { href: '/builds', label: 'Builds' },
        { href: '/leaderboards', label: 'Leaderboards' },
        { href: '/edit', label: 'Build Editor' },
    ];

    const sidebarLinks = [
        ...navLinks,
        { href: '/saves', label: 'Saves' },
    ];

    return (
        <>
            <nav className="sticky top-0 z-50 bg-background-secondary border-b border-border py-2 px-1 mb-2.5">
                <div className="flex items-center gap-5 w-[calc(100%-36px)] ml-10 font-gowun max-md:ml-4 max-md:w-[calc(100%-32px)] max-md:justify-between">
                    <Link
                        href="/"
                        onClick={closeSidebar}
                        className={`md:text-4xl text-2xl font-bold no-underline transition-all duration-200 ${
                            isActive('/')
                                ? 'text-accent drop-shadow-[0_0_8px_rgba(166,150,98,0.3)]'
                                : 'text-text-primary hover:text-accent hover:drop-shadow-[0_0_8px_rgba(166,150,98,0.3)]'
                        }`}
                    >
                        WuWaBuilds
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex -mb-2 flex-1">
                        {navLinks.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={closeSidebar}
                                className={`
                                    group relative text-2xl font-medium px-4 pt-2 pb-[calc(0.5rem+2px)] rounded text-center no-underline transition-colors duration-200
                                    ${isActive(href)
                                        ? 'text-accent bg-accent/15 font-semibold'
                                        : 'text-text-primary hover:text-accent-hover hover:bg-accent/8'
                                    }
                                `}
                            >
                                {label}
                                {/* Animated underline - grows from center */}
                                <span
                                    className={`
                                        absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-accent transition-all duration-300 ease-out
                                        ${isActive(href) ? 'w-full' : 'w-0 group-hover:w-full'}
                                    `}
                                />
                            </Link>
                        ))}
                    </div>

                    {/* Toolbar Portal Target - BuildEditor buttons appear here on scroll */}
                    <div id="nav-toolbar-portal" className="flex items-center" />

                    {/* Profile lookup - search any player from any page */}
                    <div ref={lookupRef} className="relative flex items-center">
                        <button
                            type="button"
                            onClick={() => {
                                if (pathname === '/') {
                                    setIsLookupOpen(false);
                                    focusHomeProfileSearch();
                                    return;
                                }
                                setIsLookupOpen((v) => !v);
                            }}
                            aria-label="Look up a player profile"
                            aria-expanded={isLookupOpen}
                            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors ${
                                isLookupOpen || isActive('/profiles')
                                    ? 'text-accent bg-accent/10'
                                    : 'text-text-primary hover:text-accent hover:bg-accent/8'
                            }`}
                            title="Profile lookup"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                                <circle cx="11" cy="11" r="7" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                        </button>

                        {isLookupOpen && (
                            <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-background-secondary p-3 shadow-[0_24px_48px_rgba(0,0,0,0.6)]">
                                <ProfileSearch surface="nav" autoFocus />
                                <div className="mt-2.5 flex justify-end border-t border-border/60 pt-2">
                                    <Link
                                        href="/profiles"
                                        onClick={() => setIsLookupOpen(false)}
                                        className="text-xs text-text-primary/55 transition-colors hover:text-accent"
                                    >
                                        All profiles →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Discord Link - Desktop */}
                    <a
                        href="https://discord.gg/puZSXRKTPC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center justify-center p-2 text-text-primary hover:text-accent transition-colors duration-200"
                        title="Join our Discord"
                        aria-label="Discord"
                    >
                        <svg
                            viewBox="0 -28.5 256 256"
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            preserveAspectRatio="xMidYMid"
                            className="w-5 h-5"
                            fill="currentColor"
                        >
                            <path
                                d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"
                                fillRule="nonzero"
                            />
                        </svg>
                    </a>

                    {/* Language Switcher - Desktop */}
                    <div className="hidden md:block mr-4">
                        <LanguageSwitcher />
                    </div>

                    {/* Burger Button */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 bg-transparent border-none cursor-pointer"
                        aria-label="Open menu"
                    >
                        <span className="w-6 h-0.5 bg-text-primary rounded-full transition-all" />
                        <span className="w-6 h-0.5 bg-text-primary rounded-full transition-all" />
                        <span className="w-6 h-0.5 bg-text-primary rounded-full transition-all" />
                    </button>
                </div>
            </nav>

            {/* Mobile Sidebar Overlay */}
            {isMobile && (
                <>
                    {/* Backdrop */}
                    <div
                        className={`fixed inset-0 bg-black/70 z-100 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Sidebar */}
                    <div
                        className={`fixed top-0 right-0 h-full w-64 bg-background-secondary z-101 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    >
                        {/* Close Button */}
                        <div className="flex justify-end p-4">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-10 h-10 flex items-center justify-center text-text-primary hover:text-accent transition-colors bg-transparent border-none cursor-pointer"
                                aria-label="Close menu"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Navigation Section */}
                        <div className="px-4 py-2">
                            <div className="flex flex-col gap-1">
                                {sidebarLinks.map(({ href, label }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={closeSidebar}
                                        className={`
                                            text-xl font-medium px-3 py-3 rounded no-underline transition-all duration-200
                                            ${isActive(href)
                                                ? 'text-accent bg-accent/15 font-semibold'
                                                : 'text-text-primary hover:text-accent-hover hover:bg-accent/8'
                                            }
                                        `}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Community Section - Mobile */}
                        <div className="px-4 pt-4 mt-4 border-t border-border">
                            <div className="text-xs text-text-secondary uppercase tracking-wider mb-2 px-3">
                                Community
                            </div>
                            <a
                                href="https://discord.gg/puZSXRKTPC"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 text-xl font-medium px-3 py-3 rounded text-text-primary hover:text-accent-hover hover:bg-accent/8 no-underline transition-all duration-200"
                            >
                                <svg
                                    viewBox="0 -28.5 256 256"
                                    version="1.1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    preserveAspectRatio="xMidYMid"
                                    className="w-5 h-5"
                                    fill="currentColor"
                                >
                                    <path
                                        d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"
                                        fillRule="nonzero"
                                    />
                                </svg>
                                <span>Discord</span>
                            </a>
                        </div>

                        {/* Language Switcher - Mobile */}
                        <div className="px-4 pt-4 mt-4 border-t border-border">
                            <div className="text-xs text-text-secondary uppercase tracking-wider mb-2 px-3">
                                Language
                            </div>
                            <LanguageSwitcher />
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

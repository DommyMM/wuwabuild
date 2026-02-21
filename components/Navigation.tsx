'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navigation() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close sidebar on route change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

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
        return pathname.startsWith(path);
    };

    const navLinks = [
        { href: '/import', label: 'Import' },
        { href: '/builds', label: 'Builds' },
        { href: '/leaderboards', label: 'Rank' },
        { href: '/edit', label: 'Edit' },
        { href: '/saves', label: 'Saves' },
    ];

    return (
        <>
            <nav className="sticky top-0 z-50 bg-background-secondary border-b border-border py-2 px-1 mb-2.5">
                <div className="flex items-center gap-5 w-[calc(100%-36px)] ml-10 font-gowun max-md:ml-4 max-md:w-[calc(100%-32px)] max-md:justify-between">
                    <Link
                        href="/"
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
                                {navLinks.map(({ href, label }) => (
                                    <Link
                                        key={href}
                                        href={href}
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

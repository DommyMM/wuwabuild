'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

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
        <nav className="sticky top-0 z-50 bg-background-secondary border-b border-border p-1 mb-2.5">
            <div className="flex items-center gap-5 w-[calc(100%-36px)] ml-10 font-gowun max-lg:flex-col max-lg:gap-0 max-lg:m-0 max-lg:w-full">
                <Link
                    href="/"
                    className="text-4xl font-bold text-text-primary no-underline transition-all duration-200 hover:text-accent hover:drop-shadow-[0_0_8px_rgba(166,150,98,0.3)]"
                >
                    WuWaBuilds
                </Link>
                <div className="flex gap-1">
                    {navLinks.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`
                                text-2xl font-medium px-4 py-2 rounded text-center no-underline transition-all duration-200
                                max-lg:px-2
                                ${isActive(href)
                                    ? 'text-accent bg-accent/15 font-semibold border-b-2 border-accent'
                                    : 'text-text-primary hover:text-accent-hover hover:bg-accent/[0.08] hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(166,150,98,0.2)]'
                                }
                            `}
                        >
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}

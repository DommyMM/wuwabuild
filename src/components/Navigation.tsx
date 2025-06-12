'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    return (
        <nav className="nav-bar">
            <div className="nav-content">
                <Link href="/" className="nav-title">WuWaBuilds</Link>
                <div className="nav-links">
                    <Link href="/import" className={isActive('/import') ? 'active' : ''}>Import</Link>
                    <Link href="/builds" className={isActive('/builds') ? 'active' : ''}>Builds</Link>
                    <Link href="/leaderboards" className={isActive('/leaderboards') ? 'active' : ''}>Rank</Link>
                    <Link href="/edit" className={isActive('/edit') ? 'active' : ''}>Edit</Link>
                    <Link href="/saves" className={isActive('/saves') ? 'active' : ''}>Saves</Link>
                    {/* <Link href="/profiles" className={isActive('/profiles') ? 'active' : ''}>Profiles</Link> */}
                    {/* <Link href="/calcs" className={isActive('/calcs') ? 'active' : ''}>Calcs</Link> */}
                </div>
            </div>
        </nav>
    );
}
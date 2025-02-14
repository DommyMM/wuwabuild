'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    return (
        <nav className="nav-bar">
            <div className="nav-content">
                <Link href="/" className="nav-title">WuWaBuilds</Link>
                <div className="nav-links">
                    <Link 
                        href="/import" 
                        className={pathname === '/import' ? 'active' : ''}
                    >
                        Import
                    </Link>
                    <Link 
                        href="/builds"
                        className={pathname === '/builds' ? 'active' : ''}
                    >
                        Builds
                    </Link>
                    <Link 
                        href="/leaderboards"
                        className={pathname === '/leaderboards' ? 'active' : ''}
                    >
                        Rank
                    </Link>
                    <Link 
                        href="/edit"
                        className={pathname === '/edit' ? 'active' : ''}
                    >
                        Edit
                    </Link>
                    <Link 
                        href="/saves"
                        className={pathname === '/saves' ? 'active' : ''}
                    >
                        Saves
                    </Link>
                </div>
            </div>
        </nav>
    );
}
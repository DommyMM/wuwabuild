'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import posthog from 'posthog-js';

type HomeCta = 'import' | 'edit' | 'builds' | 'leaderboards' | 'profile' | 'changelog';
type HomeSection = 'hero' | 'search' | 'boards_index' | 'news' | 'guide';

interface HomeLinkProps {
    href: string;
    cta: HomeCta;
    section: HomeSection;
    characterId?: string;
    className?: string;
    children: ReactNode;
}

/** Internal link with the `home_cta_click` capture attached, so server sections stay server-rendered. */
export function HomeLink({ href, cta, section, characterId, className, children }: HomeLinkProps) {
    const handleClick = () => {
        posthog.capture('home_cta_click', {
            cta,
            section,
            ...(characterId ? { character_id: characterId } : {}),
        });
    };
    return (
        <Link href={href} onClick={handleClick} className={className}>
            {children}
        </Link>
    );
}

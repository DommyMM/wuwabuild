import type { Metadata } from 'next';
import { ProfilesLanding } from '@/components/profile/ProfilesLanding';

export const metadata: Metadata = {
    title: 'Wuthering Waves Player Profiles',
    description: 'Search Wuthering Waves player profiles by UID or username. Star a profile to keep it here, then open submitted builds and leaderboard ranks.',
    alternates: { canonical: '/profiles' },
    openGraph: {
        title: 'Wuthering Waves Player Profiles',
        description: 'Search Wuthering Waves player profiles by UID or username. Star a profile to keep it here, then open submitted builds and leaderboard ranks.',
        url: 'https://wuwa.build/profiles',
        images: [{ url: 'https://wuwa.build/api/og/profiles', width: 1200, height: 630, alt: 'Player Profiles' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Wuthering Waves Player Profiles',
        description: 'Search Wuthering Waves player profiles by UID or username. Star a profile to keep it here, then open submitted builds and leaderboard ranks.',
        images: ['https://wuwa.build/api/og/profiles'],
    },
};

export default function ProfilesPage() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://wuwa.build',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Player Profiles',
                item: 'https://wuwa.build/profiles',
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProfilesLanding />
        </>
    );
}

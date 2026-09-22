import type { Metadata } from 'next';
import { socialMetadata } from '@/lib/metadata';
import { ProfilesLanding } from '@/components/profile/ProfilesLanding';

const PAGE_TITLE = 'Wuthering Waves Player Profiles';
const PAGE_DESCRIPTION = 'Search Wuthering Waves player profiles by UID or username. Star a profile to keep it here, then open submitted builds and leaderboard ranks.';

export const metadata: Metadata = {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    alternates: { canonical: '/profiles' },
    ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/profiles', image: 'https://wuwa.build/api/og/profiles' }),
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

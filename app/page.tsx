import type { Metadata } from 'next';
import { HomePage, type HomeTopBuild } from '@/components/home/HomePage';
import { prefetchLeaderboardOverview, prefetchBuilds } from '@/lib/lbServer';
import { loadCharacterSummary } from '@/lib/server/ogData';

export const revalidate = 120; // ISR: full page HTML cached at edge, re-rendered at most once per 2 min

export const metadata: Metadata = {
    title: 'WuWa Builds | Wuthering Waves Build Creator & Leaderboards',
    description: 'Create, share, and discover top-tier Wuthering Waves character builds. Features automatic OCR screenshot importing, real-time stat calculations, and global leaderboards.',
    twitter: {
        title: 'WuWa Builds | Wuthering Waves Build Creator & Leaderboards',
        description: 'Create, share, and discover top-tier Wuthering Waves character builds. Features automatic OCR screenshot importing, real-time stat calculations, and global leaderboards.',
    },
    alternates: { canonical: '/' },
};

export default async function Home() {
    const [overview, buildsRes] = await Promise.all([
        prefetchLeaderboardOverview(),
        prefetchBuilds(),
    ]);
    const lbStats = {
        totalBuilds: buildsRes?.total ?? 0,
        totalLeaderboards: overview?.length ?? 0,
    };

    const topBuilds: HomeTopBuild[] = (buildsRes?.builds ?? [])
        .slice(0, 4)
        .map((build) => {
            const summary = loadCharacterSummary(build.character.id);
            return {
                id: build.id,
                characterId: build.character.id,
                characterName: summary?.name ?? build.character.id,
                element: (summary?.element ?? '').toString().toLowerCase(),
                cv: build.cv,
                owner: build.owner.username,
            };
        });

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "WuWa Builds",
                        "url": "https://wuwa.build"
                    })
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "WuWa Builds | Wuthering Waves Build Creator",
                        "operatingSystem": "Any",
                        "applicationCategory": "GameApplication",
                        "url": "https://wuwa.build",
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD"
                        }
                    })
                }}
            />
            <HomePage lbStats={lbStats} topBuilds={topBuilds} />
        </>
    );
}

import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';
import { prefetchLeaderboardOverview, prefetchBuilds } from '@/lib/lbServer';

export const revalidate = 300; // ISR: full page HTML cached at edge, re-rendered at most once per 5 min

export const metadata: Metadata = {
    title: 'WuWaBuilds',
    description: 'Build, scan, and rank Wuthering Waves characters. Import builds from a screenshot, calculate echo stats and damage, and compare on global leaderboards.',
    twitter: {
        title: 'WuWaBuilds',
        description: 'Build, scan, and rank Wuthering Waves characters. Import builds from a screenshot, calculate echo stats and damage, and compare on global leaderboards.',
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
            <HomePage lbStats={lbStats} />
        </>
    );
}

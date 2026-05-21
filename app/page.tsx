import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';
import { prefetchLeaderboardOverview, prefetchBuilds } from '@/lib/lbServer';

export const revalidate = 300; // ISR: full page HTML cached at edge, re-rendered at most once per 5 min

export const metadata: Metadata = {
    title: 'WuWa Builds | Wuthering Waves Build Creator & Leaderboards',
    description: 'Create, share, and discover top-tier Wuthering Waves character builds. Flex your builds with automatic OCR scanner, stat calculations, and global damage rankings.',
    twitter: {
        title: 'WuWa Builds | Wuthering Waves Build Creator & Leaderboards',
        description: 'Create, share, and discover top-tier Wuthering Waves character builds. Flex your builds with automatic OCR scanner, stat calculations, and global damage rankings.',
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

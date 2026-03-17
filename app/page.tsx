import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';
import { prefetchLeaderboardOverview, prefetchBuilds } from '@/lib/lbServer';

export const metadata: Metadata = {
    title: 'WuWa Builds | Wuthering Waves Build Creator & Leaderboards',
    description: 'Create, share, and discover top-tier Wuthering Waves character builds. Features automatic OCR screenshot importing, real-time stat calculations, and global leaderboards.',
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

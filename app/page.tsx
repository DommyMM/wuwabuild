import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';
import { FAQS } from '@/components/home/faqs';
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

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": "https://wuwa.build/#website",
                "name": "WuWa Builds",
                "url": "https://wuwa.build",
                "publisher": { "@id": "https://wuwa.build/#organization" }
            },
            {
                "@type": "Organization",
                "@id": "https://wuwa.build/#organization",
                "name": "WuWa Builds",
                "url": "https://wuwa.build",
                "logo": "https://wuwa.build/logo512.png"
            },
            {
                "@type": "SoftwareApplication",
                "name": "WuWa Builds — Wuthering Waves Build Editor",
                "operatingSystem": "Any",
                "applicationCategory": "GameApplication",
                "url": "https://wuwa.build",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                }
            },
            {
                "@type": "FAQPage",
                "mainEntity": FAQS.map((faq) => ({
                    "@type": "Question",
                    "name": faq.q,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": faq.text
                    }
                }))
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <HomePage lbStats={lbStats} />
        </>
    );
}

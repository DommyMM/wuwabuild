import type { Metadata } from 'next';
import { LeaderboardOverviewClient } from '@/components/leaderboards/overview/LeaderboardOverviewClient';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Wuthering Waves Leaderboards',
  description: 'Compare Wuthering Waves damage leaderboards by character, weapon, sequence, and benchmark track.',
  openGraph: {
    title: 'Wuthering Waves Leaderboards',
    description: 'Compare Wuthering Waves damage leaderboards by character, weapon, sequence, and benchmark track.',
    url: 'https://wuwa.build/leaderboards',
    images: [{ url: 'https://wuwa.build/api/og/leaderboards', width: 1200, height: 630, alt: 'Wuthering Waves Leaderboards' }],
  },
  twitter: {
    title: 'Wuthering Waves Leaderboards',
    description: 'Compare Wuthering Waves damage leaderboards by character, weapon, sequence, and benchmark track.',
    images: ['https://wuwa.build/api/og/leaderboards'],
  },
  alternates: { canonical: '/leaderboards' },
};

export default async function Leaderboards() {
  const initialData = await prefetchLeaderboardOverview();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://wuwa.build"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Leaderboards",
        "item": "https://wuwa.build/leaderboards"
      }
    ]
  };

  return (
    <main className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LeaderboardOverviewClient initialData={initialData} />
    </main>
  );
}

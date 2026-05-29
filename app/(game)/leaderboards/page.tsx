import type { Metadata } from 'next';
import { LeaderboardOverviewClient } from '@/components/leaderboards/overview/LeaderboardOverviewClient';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Wuthering Waves Leaderboard',
  description: 'Global Wuthering Waves leaderboards. Compare the best character builds, see top-tier simulated damage rotations, Crit Value (CV) rankings, and echo stats.',
  twitter: {
    title: 'Wuthering Waves Leaderboard',
    description: 'Global Wuthering Waves leaderboards. Compare the best character builds, see top-tier simulated damage rotations, Crit Value (CV) rankings, and echo stats.',
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

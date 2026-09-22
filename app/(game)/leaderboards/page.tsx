import type { Metadata } from 'next';
import { socialMetadata } from '@/lib/metadata';
import { LeaderboardOverviewClient } from '@/components/leaderboards/overview/LeaderboardOverviewClient';
import { prefetchLeaderboardOverview } from '@/lib/lbServer';
import { loadBoardDisplayCatalog } from '@/lib/server/gameData';

// ISR page cadence is a cost lever, not a freshness one
// The overview client background-refreshes on mount through the short Cloudflare API cache
// revalidate is passed to the prefetch so it does not drag the page below hourly
export const revalidate = 3600;

const PAGE_TITLE = 'Wuthering Waves Leaderboards';
const PAGE_DESCRIPTION = 'Compare Wuthering Waves builds on standardized character rotations. Everyone runs the same optimal rotation, weapon, and team, so the only difference is your echoes.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/leaderboards', image: 'https://wuwa.build/api/og/leaderboards' }),
  alternates: { canonical: '/leaderboards' },
};

export default async function Leaderboards() {
  const initialData = await prefetchLeaderboardOverview(revalidate);
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
      <LeaderboardOverviewClient initialData={initialData} boardDisplay={loadBoardDisplayCatalog()} />
    </main>
  );
}

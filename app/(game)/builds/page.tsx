import type { Metadata } from 'next';
import { socialMetadata } from '@/lib/metadata';
import { GlobalBoardPageClient } from '@/components/leaderboards/board/GlobalBoardPageClient';
import { prefetchBuilds } from '@/lib/lbServer';
import { loadBoardDisplayCatalog } from '@/lib/server/gameData';

export const dynamic = 'force-static';
// ISR page cadence is a cost lever, not a freshness one
// GlobalBoardPageClient background-refreshes the default query on mount through the 120s Cloudflare API cache
// prefetchBuilds gets this same window so it does not drag the page back down to the API TTL
export const revalidate = 3600;

const PAGE_TITLE = 'Wuthering Waves Builds';
const PAGE_DESCRIPTION = 'Browse and search every community-submitted Wuthering Waves build. Filter and sort by character, weapon, Sonata set, Crit Value, or any stat, then open any build in the editor.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/builds', image: 'https://wuwa.build/api/og/builds' }),
  alternates: { canonical: '/builds' },
};

export default async function Builds() {
  // One canonical static payload, which the client ignores for scoped URLs because it reads query state itself
  // Reading searchParams here would add dynamic route work without changing the rendered result
  const initialData = await prefetchBuilds('finalCV', revalidate);
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
        "name": "Builds",
        "item": "https://wuwa.build/builds"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Names and icons for the server HTML, since the client game data only lands after hydration */}
      <GlobalBoardPageClient initialData={initialData} boardDisplay={loadBoardDisplayCatalog()} />
    </>
  );
}

import type { Metadata } from 'next';
import { GlobalBoardPageClient } from '@/components/leaderboards/board/GlobalBoardPageClient';
import { prefetchBuilds } from '@/lib/lbServer';

export const dynamic = 'force-static';
// ISR page cadence (cost lever), decoupled from data freshness. The board client
// (GlobalBoardPageClient) background-refreshes the default query on mount through the
// short Cloudflare API cache (s-maxage=120), so a longer HTML window costs no
// freshness. `prefetchBuilds` is passed this same window so it doesn't drag the page
// back down to the API TTL.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Wuthering Waves Builds',
  description: 'Browse and search every community-submitted Wuthering Waves build. Filter by character, weapon, echo set, and stats to discover setups and load them into the editor.',
  openGraph: {
    title: 'Wuthering Waves Builds',
    description: 'Browse and search every community-submitted Wuthering Waves build. Filter by character, weapon, echo set, and stats to discover setups and load them into the editor.',
    url: 'https://wuwa.build/builds',
    images: [{ url: 'https://wuwa.build/api/og/builds', width: 1200, height: 630, alt: 'Wuthering Waves Builds' }],
  },
  twitter: {
    title: 'Wuthering Waves Builds',
    description: 'Browse and search every community-submitted Wuthering Waves build. Filter by character, weapon, echo set, and stats to discover setups and load them into the editor.',
    images: ['https://wuwa.build/api/og/builds'],
  },
  alternates: { canonical: '/builds' },
};

export default async function Builds() {
  // One canonical static payload only. The client reads query state and ignores this default snapshot for
  // scoped URLs, so reading searchParams here would add dynamic route work without improving the rendered result
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
      <GlobalBoardPageClient initialData={initialData} />
    </>
  );
}

import type { Metadata } from 'next';
import { GlobalBoardPageClient } from '@/components/leaderboards/board/GlobalBoardPageClient';
import { prefetchBuilds } from '@/lib/lbServer';

export const dynamic = 'force-static';
// ISR page cadence is a cost lever, not a freshness one
// GlobalBoardPageClient background-refreshes the default query on mount through the 120s Cloudflare API cache
// prefetchBuilds gets this same window so it does not drag the page back down to the API TTL
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Wuthering Waves Builds',
  description: 'Browse and search every community-submitted Wuthering Waves build. Filter and sort by character, weapon, Sonata set, Crit Value, or any stat, then open any build in the editor.',
  openGraph: {
    title: 'Wuthering Waves Builds',
    description: 'Browse and search every community-submitted Wuthering Waves build. Filter and sort by character, weapon, Sonata set, Crit Value, or any stat, then open any build in the editor.',
    url: 'https://wuwa.build/builds',
    images: [{ url: 'https://wuwa.build/api/og/builds', width: 1200, height: 630, alt: 'Wuthering Waves Builds' }],
  },
  twitter: {
    title: 'Wuthering Waves Builds',
    description: 'Browse and search every community-submitted Wuthering Waves build. Filter and sort by character, weapon, Sonata set, Crit Value, or any stat, then open any build in the editor.',
    images: ['https://wuwa.build/api/og/builds'],
  },
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
      <GlobalBoardPageClient initialData={initialData} />
    </>
  );
}

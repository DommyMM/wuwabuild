import type { Metadata } from 'next';
import { ImportPageClient } from '@/components/import/ImportPageClient';

export const metadata: Metadata = {
  title: 'Import Wuthering Waves Builds',
  description: 'Upload Wuthering Waves character profile images to parse echoes, stats, weapons, and forte levels into the editor and leaderboard.',
  openGraph: {
    title: 'Import Wuthering Waves Builds',
    description: 'Upload Wuthering Waves character profile images to parse echoes, stats, weapons, and forte levels into the editor and leaderboard.',
    url: 'https://wuwa.build/import',
    images: [{ url: 'https://wuwa.build/api/og/import', width: 1200, height: 630, alt: 'Import Wuthering Waves Builds' }],
  },
  twitter: {
    title: 'Import Wuthering Waves Builds',
    description: 'Upload Wuthering Waves character profile images to parse echoes, stats, weapons, and forte levels into the editor and leaderboard.',
    images: ['https://wuwa.build/api/og/import'],
  },
  alternates: { canonical: '/import' },
};

export default function ImportPage() {
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
        "name": "Import",
        "item": "https://wuwa.build/import"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ImportPageClient />
    </>
  );
}

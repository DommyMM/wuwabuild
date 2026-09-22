import type { Metadata } from 'next';
import { socialMetadata } from '@/lib/metadata';
import { ImportPageClient } from '@/components/import/ImportPageClient';

const PAGE_TITLE = 'Import Wuthering Waves Builds';
const PAGE_DESCRIPTION = 'Scan a wuwa-bot card to import echoes, stats, weapons, and UID, then submit it to the leaderboards and see where you rank.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/import', image: 'https://wuwa.build/api/og/import' }),
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

import type { Metadata } from 'next';
import { ImportPageClient } from '@/components/import/ImportPageClient';

export const metadata: Metadata = {
  title: 'Import Wuthering Waves Builds',
  description: 'Scan and import your Wuthering Waves character builds automatically from screenshots. Quickly load your echoes, stats, and forte levels into the editor.',
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

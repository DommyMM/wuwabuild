import type { Metadata } from 'next';
import { ImportPageClient } from '@/components/import/ImportPageClient';

export const metadata: Metadata = {
  title: 'WuWa OCR Screenshot Scanner — Import Character Builds',
  description: 'Scan and import your Wuthering Waves character builds automatically from screenshots. Quickly load your echoes, stats, and forte levels into the editor.',
  alternates: { canonical: '/import' },
};

export default function ImportPage() {
  return <ImportPageClient />;
}

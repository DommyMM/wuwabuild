import type { Metadata } from 'next';
import { ImportPageClient } from '@/components/import/ImportPageClient';

export const metadata: Metadata = {
  title: 'Import Build via OCR Screenshot',
  description: 'Automatically import your Wuthering Waves character builds using our OCR screenshot scanner. Quickly load your echo stats and forte levels into the build editor.',
};

export default function ImportPage() {
  return <ImportPageClient />;
}

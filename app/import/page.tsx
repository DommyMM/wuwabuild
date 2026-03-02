import type { Metadata } from 'next';
import { ImportPageClient } from '@/components/import/ImportPageClient';

export const metadata: Metadata = {
  title: 'Import Build - WuWa Builds',
  description: 'Import a build from a wuwa-bot screenshot',
};

export default function ImportPage() {
  return <ImportPageClient />;
}

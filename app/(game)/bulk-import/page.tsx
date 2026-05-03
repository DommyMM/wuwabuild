import { BulkImportPageClient } from '@/components/import/BulkImportPageClient';
import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Bulk Import',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BulkImportPage() {
  if (process.env.VERCEL) {
    notFound();
  }

  return <BulkImportPageClient />;
}

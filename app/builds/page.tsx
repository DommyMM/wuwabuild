import { Suspense } from 'react';
import { BuildsPageClient } from '@/components/builds/BuildsPageClient';

export default function Builds() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-[1440px] p-4 text-text-primary">Loading builds...</main>}>
      <BuildsPageClient />
    </Suspense>
  );
}

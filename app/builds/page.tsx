import { Suspense } from 'react';
import { BuildPageClient } from '@/components/build/BuildPageClient';

export default function Builds() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-360 p-4 text-text-primary">Loading builds...</main>}>
      <BuildPageClient />
    </Suspense>
  );
}

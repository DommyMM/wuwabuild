import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BuildPageClient } from '@/components/build/BuildPageClient';

export const metadata: Metadata = {
  title: 'Browse Builds',
  description: 'Explore and filter community-created Wuthering Waves builds. Find the best echo combinations, main stats, and substat priorities for every character.',
};

export default function Builds() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-360 p-4 text-text-primary">Loading builds...</main>}>
      <BuildPageClient />
    </Suspense>
  );
}

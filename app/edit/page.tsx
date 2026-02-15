'use client';

import { AppProviders, DataLoadingGate } from '@/contexts/index';
import { BuildEditor } from '@/components/build/BuildEditor';

export default function EditPage() {
  return (
    <AppProviders>
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <DataLoadingGate>
            <BuildEditor />
          </DataLoadingGate>
        </div>
      </main>
    </AppProviders>
  );
}

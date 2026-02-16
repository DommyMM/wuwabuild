'use client';

import { DataLoadingGate } from '@/contexts/index';
import { BuildEditor } from '@/components/build/BuildEditor';

export default function EditPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <DataLoadingGate>
          <BuildEditor />
        </DataLoadingGate>
      </div>
    </main>
  );
}

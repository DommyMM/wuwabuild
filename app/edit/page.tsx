'use client';

import { DataLoadingGate } from '@/contexts/index';
import { BuildEditor } from '@/components/build/BuildEditor';

export default function EditPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto md:px-20 p-6">
        <DataLoadingGate>
          <BuildEditor />
        </DataLoadingGate>
      </div>
    </main>
  );
}

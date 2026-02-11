'use client';

import React from 'react';
import { AppProviders, DataLoadingGate } from '@/contexts';
import { BuildEditor } from '@/components/build';

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

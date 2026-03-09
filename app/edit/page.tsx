'use client';

import { BuildEditor } from '@/components/edit/BuildEditor';

export default function EditPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="px-3 py-4 md:px-16 md:py-6">
        <BuildEditor />
      </div>
    </main>
  );
}

'use client';

import { BuildEditor } from '@/components/edit/BuildEditor';

export default function EditPage() {
  return (
    <main className="bg-background">
      <h1 className="sr-only">WuWa Build Maker</h1>
      <div className="px-3 py-4 md:px-8 xl:px-12 2xl:px-16 md:py-6">
        <BuildEditor />
      </div>
    </main>
  );
}

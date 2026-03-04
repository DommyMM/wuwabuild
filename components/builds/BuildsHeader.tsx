'use client';

import React from 'react';

export const BuildsHeader: React.FC = () => (
  <section className="relative overflow-hidden rounded-xl border border-border bg-background-secondary p-5 md:p-6">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_55%)]" />
    <div className="relative">
      <h1 className="text-center text-2xl font-semibold tracking-wide text-accent md:text-3xl">
        Global Board
      </h1>
      <div className="mx-auto mt-3 h-px w-56 bg-gradient-to-r from-transparent via-accent/70 to-transparent" />

      <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-text-primary/75 md:text-base">
        Pool of uploaded builds standardized to Lv 90. Sorted by Crit Value by default.
      </p>
      <div className="mt-3 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-md border border-accent/35 bg-background/70 px-3 py-1.5 text-sm">
          <span className="font-medium text-accent">Crit Value (CV):</span>
          <span className="font-gowun text-text-primary">2 x CR + CD</span>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs italic text-text-primary/60 md:text-sm">
        CV is calculated from echo Crit Rate and Crit DMG rolls. Extra 4-cost penalties are applied by the dataset.
      </p>
    </div>
  </section>
);

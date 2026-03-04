'use client';

import React from 'react';

export const BuildHeader: React.FC = () => (
  <section>
    <div>
      <h1 className="text-center text-2xl font-semibold tracking-wide text-accent md:text-3xl">
        Global Board
      </h1>
      <div className="mx-auto mt-3 h-px w-56 bg-linear-to-r from-transparent via-accent/70 to-transparent" />

      <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-text-primary/75 md:text-base">
        Pool of builds standardized to Lv 90 and sorted by Crit Value by default.
      </p>
      <div className="mt-3 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-md border border-accent/35 bg-background/70 px-3 py-1.5 text-sm">
          <span className="font-medium text-accent">Crit Value (CV):</span>
          <span className="font-gowun text-text-primary">2 x CR + CD</span>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs italic text-text-primary/60 md:text-sm">
        CV is calculated from the crit rolls on echoes exclusively. Penalties are applied for extra 4-costs
      </p>
    </div>
  </section>
);

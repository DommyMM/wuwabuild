'use client';

import React from 'react';

export const BuildHeader: React.FC = () => (
  <section className="px-4 space-y-2 max-w-360">
    <h1 className="text-center text-2xl font-semibold tracking-wide text-accent md:text-3xl">
      Global Board
    </h1>
    <div className="mx-auto h-px w-96 bg-linear-to-r from-transparent via-accent/70 to-transparent" />
      <p className="mx-auto max-w-3xl text-center text-xs md:text-sm text-text-primary/75">
      Every build is standardized to Lv 90 and assumed R1 since the kurobot doesn't provide ranks. <br/>
      I assert that crit is the best stat scaling there is, so Crit Value is the default sort <br/>
      You're free to sort by whatever other stats or filters you want <br/>
    </p>
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-md border border-accent/35 bg-background/70 px-3 py-1.5 text-sm">
        <span className="font-medium text-accent">Crit Value (CV):</span>
        <span className="font-gowun text-text-primary">2 x CR + CD</span>
      </div>
    </div>
    <p className="mx-auto max-w-3xl text-center text-xs md:text-sm italic text-text-primary/60">
      CV is calculated from equipped echoes exclusively. <br/> Only first crit 4 cost is counted.
    </p>
  </section>
);

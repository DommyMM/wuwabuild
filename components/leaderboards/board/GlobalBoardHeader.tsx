'use client';

import React from 'react';

export const GlobalBoardHeader: React.FC = () => (
  <section className="mx-auto flex flex-col items-center">
    <h1 className="text-center text-2xl md:text-4xl font-semibold tracking-wide text-accent">
      Global Board
    </h1>
    <div className="my-2 h-px w-96 bg-linear-to-r from-transparent via-accent/70 to-transparent" />
      <p className="text-center text-xs md:text-base text-text-primary/75">
      Every build is standardized to Lv 90 and assumed R1 since kurobot doesn&apos;t provide ranks <br/>
      I believe that crit is the best stat scaling there is, so Crit Value is the default sort <br/>
      You can sort by whatever other stats or filters you want down below <br/>
      CV is calculated from the sum of equipped echoes exclusively <br/>
      Only the first Crit 4 cost is counted towards CV
    </p>
    <div className="flex justify-center pt-1 select-none">
      <div className="inline-flex items-center gap-2 rounded-md border border-accent/35 bg-background/70 px-3 py-1.5 text-sm">
        <span className="font-medium text-accent">Crit Value (CV):</span>
        <span className="font-gowun text-text-primary">2 x CR + CD</span>
      </div>
    </div>
  </section>
);

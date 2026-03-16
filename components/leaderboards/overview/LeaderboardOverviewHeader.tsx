'use client';

import React from 'react';

export const LeaderboardOverviewHeader: React.FC = () => (
  <div className="flex flex-col items-center py-3 text-center">
    <h1 className="text-center text-2xl font-semibold tracking-wide text-accent md:text-3xl">
      Damage Leaderboards
    </h1>
    <div className="my-2 h-px w-96 bg-linear-to-r from-transparent via-accent/70 to-transparent" />
    <p className="text-center text-xs text-text-primary/65 md:text-sm">
      Characters and weapons are all standardized to the same conditions, only your echoes change between builds <br />
      Switch weapons and playstyles to see how each setup stacks up across the same board. <br />
      All levels and forte are maxed, and weapons are R1 for 5 stars, R5 for 4 stars
    </p>
  </div>
);

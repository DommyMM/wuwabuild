'use client';

import React from 'react';

export const LeaderboardOverviewHeader: React.FC = () => (
  <div className="flex flex-col items-center py-3 text-center">
    <h1 className="text-center text-2xl tracking-wide text-accent md:text-4xl">
      Character Leaderboards
    </h1>
    <div className="my-2 h-px w-full max-w-sm bg-linear-to-r from-transparent via-accent/70 to-transparent" />
    <p className="max-w-2xl text-center text-xs text-text-primary/65 md:text-base">
      Every character is standardized to the same weapons and conditions, so only your echoes are compared
    </p>
    <p className="mt-1 max-w-2xl text-center text-xs text-text-primary/65 md:text-base">
      Lv 90 with Forte maxed, S0R1 unless the board says otherwise, R5 on 4★ weapons
    </p>
    <div className="flex justify-center pt-2 select-none">
      <div className="inline-flex items-center gap-2 rounded-md border border-accent/35 bg-background/70 px-3 py-1.5 text-sm">
        <span className="text-accent">Score:</span>
        <span className="font-gowun text-text-primary">Average Damage − ER Deficit %</span>
      </div>
    </div>
    <p className="mt-2 max-w-2xl text-center text-xs text-text-primary/65 md:text-base">
      If you have any suggestions, ask in the{' '}
      <a
        href="https://discord.gg/puZSXRKTPC"
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:text-accent-hover underline underline-offset-2"
      >
        Discord
      </a>
      .
    </p>
  </div>
);

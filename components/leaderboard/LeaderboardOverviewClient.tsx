'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { LBCharacterOverview, listLeaderboardOverview } from '@/lib/lb';
import { LEADERBOARD_CHAR_CONFIGS } from './leaderboardConstants';

export const LeaderboardOverviewClient: React.FC = () => {
  const { getCharacter, loading: gameDataLoading } = useGameData();
  const { t } = useLanguage();
  const [overview, setOverview] = useState<LBCharacterOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listLeaderboardOverview(controller.signal)
      .then(setOverview)
      .catch((err) => {
        if (!controller.signal.aborted) setError(String(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const configuredCharIds = Object.keys(LEADERBOARD_CHAR_CONFIGS);
  const overviewById = new Map(overview.map((entry) => [entry.id, entry]));

  const showSkeleton = isLoading || gameDataLoading;

  return (
    <div className="mx-auto w-full max-w-360 space-y-6 p-3 md:p-5">
      {/* Page header */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-background-secondary px-5 py-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_58%)]" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-text-primary">Global Leaderboards</h1>
          <p className="mt-1.5 text-sm text-text-primary/60">
            Damage rankings for top Wuthering Waves characters. Global rank is preserved — rank #1 is always #1, even when filters are applied.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          Failed to load leaderboard data: {error}
        </div>
      )}

      {/* Character grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {showSkeleton
          ? Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-xl border border-border bg-background-secondary"
              />
            ))
          : configuredCharIds.map((charId) => {
              const character = getCharacter(charId);
              const entry = overviewById.get(charId);
              const characterName = character
                ? formatCharacterDisplayName(character, {
                    baseName: t(character.nameI18n ?? { en: character.name }),
                    roverElement: undefined,
                  })
                : `Character ${charId}`;

              const bestWeapon = entry?.weapons?.[0];
              const bestDamage = bestWeapon?.damage ?? 0;
              const topOwner = bestWeapon?.owner.username ?? null;
              const totalEntries = entry?.totalEntries ?? 0;

              return (
                <Link key={charId} href={`/leaderboards/${charId}`}>
                  <div className="group relative overflow-hidden rounded-xl border border-border bg-background-secondary transition-all hover:border-accent/60 hover:bg-accent/5">
                    {/* Character banner image */}
                    <div className="relative h-28 overflow-hidden">
                      {character?.banner ? (
                        <img
                          src={character.banner}
                          alt={characterName}
                          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : character?.head ? (
                        <img
                          src={character.head}
                          alt={characterName}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-border/30" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background-secondary via-background-secondary/40 to-transparent" />

                      {/* Element badge */}
                      {character?.elementIcon && (
                        <div className="absolute right-2 top-2">
                          <img
                            src={character.elementIcon}
                            alt={character.element ?? ''}
                            className="h-6 w-6 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="px-3 pb-3 pt-1">
                      <h3 className="truncate text-base font-semibold text-text-primary">{characterName}</h3>
                      <div className="mt-1.5 space-y-0.5 text-xs text-text-primary/60">
                        <div>
                          <span className="text-text-primary/40">Players: </span>
                          <span className="font-medium text-text-primary/80">{totalEntries.toLocaleString()}</span>
                        </div>
                        {bestDamage > 0 ? (
                          <div>
                            <span className="text-text-primary/40">Top: </span>
                            <span className="font-semibold text-accent">{Math.round(bestDamage).toLocaleString()}</span>
                            <span className="text-text-primary/40"> DMG</span>
                          </div>
                        ) : (
                          <div className="text-text-primary/35">No entries yet</div>
                        )}
                        {topOwner && (
                          <div className="truncate">
                            <span className="text-text-primary/40">by </span>
                            <span className="font-medium text-text-primary/70">{topOwner}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
      </div>
    </div>
  );
};

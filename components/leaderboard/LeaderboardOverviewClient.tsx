'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { LBCharacterOverview, listLeaderboardOverview } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';

export const LeaderboardOverviewClient: React.FC = () => {
  const { getCharacter, getWeapon, loading: gameDataLoading } = useGameData();
  const { t } = useLanguage();
  const [overview, setOverview] = useState<LBCharacterOverview[]>([]);
  const [fetchState, setFetchState] = useState<{ isLoading: boolean; error: string | null }>({
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    listLeaderboardOverview(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setOverview(data);
        setFetchState({ isLoading: false, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setFetchState({
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => controller.abort();
  }, []);

  const showSkeleton = fetchState.isLoading || gameDataLoading;

  return (
    <div className="mx-auto w-full max-w-360 space-y-6 p-3 md:p-5">
      {/* Page header */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-background-secondary px-5 py-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_58%)]" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-text-primary">Damage Leaderboards</h1>
          <p className="mt-1.5 text-sm text-text-primary/60">
            Characters are standardized to the same conditions. The only variables between build calculations are the five echoes.
            Click on a character to view more details.
          </p>
        </div>
      </section>

      {fetchState.error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          Failed to load leaderboard data: {fetchState.error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-background/70">
        {/* Header */}
        <div className="grid grid-cols-[200px_80px_88px_minmax(0,1fr)] items-center border-b border-border bg-background-secondary/95 px-4 py-2 text-sm font-semibold text-text-primary/60">
          <div>Character</div>
          <div className="text-center">Team</div>
          <div className="text-center">Entries</div>
          <div className="text-center">Weapon Rankings</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/60">
          {showSkeleton
            ? Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[200px_80px_88px_minmax(0,1fr)] items-center gap-4 px-4 py-3 odd:bg-background/30 even:bg-background-secondary/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-background-secondary/80" />
                    <div className="h-4 w-24 animate-pulse rounded bg-background-secondary/80" />
                  </div>
                  <div className="flex justify-center gap-1">
                    <div className="h-7 w-7 animate-pulse rounded-full bg-background-secondary/80" />
                    <div className="h-7 w-7 animate-pulse rounded-full bg-background-secondary/80" />
                  </div>
                  <div className="mx-auto h-4 w-12 animate-pulse rounded bg-background-secondary/80" />
                  <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((__, wi) => (
                      <div key={wi} className="h-14 flex-1 animate-pulse rounded bg-background-secondary/80" />
                    ))}
                  </div>
                </div>
              ))
            : overview.map((entry) => {
                const character = getCharacter(entry.id);
                const characterName = character
                  ? formatCharacterDisplayName(character, {
                      baseName: t(character.nameI18n ?? { en: character.name }),
                      roverElement: undefined,
                    })
                  : `Character ${entry.id}`;

                const element = character?.element?.toLowerCase() ?? '';
                const totalEntries = entry.totalEntries;

                // Map weapon slots to overview weapon entries
                const weaponTopByWeaponId = new Map(
                  entry.weapons.map((w) => [w.weaponId, w]),
                );

                return (
                  <Link key={entry.id} href={`/leaderboards/${entry.id}`}>
                    <div className="grid grid-cols-[200px_80px_88px_minmax(0,1fr)] items-center gap-4 px-4 py-3 transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/8">
                      {/* Character column */}
                      <div className="flex items-center gap-3">
                        {character?.head ? (
                          <img
                            src={character.head}
                            alt={characterName}
                            className="h-10 w-10 shrink-0 object-cover object-top"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-full bg-border/30" />
                        )}
                        <span className={`truncate text-base font-semibold ${element ? `char-sig ${element}` : 'text-text-primary'}`}>
                          {characterName}
                        </span>
                      </div>

                      {/* Team column */}
                      <div className="flex items-center justify-center gap-1">
                        {entry.teamCharacterIds.length === 0 ? (
                          <span className="text-xs text-text-primary/30">—</span>
                        ) : (
                          entry.teamCharacterIds.map((teamId) => {
                            const teamChar = getCharacter(teamId);
                            return teamChar?.head ? (
                              <img
                                key={teamId}
                                src={teamChar.head}
                                alt={teamId}
                                className="h-7 w-7 object-cover"
                              />
                            ) : (
                              <div key={teamId} className="h-7 w-7 rounded-full bg-border/30 ring-1 ring-border" />
                            );
                          })
                        )}
                      </div>

                      {/* Total entries */}
                      <div className="text-center text-lg font-semibold text-text-primary">
                        {totalEntries > 0 ? totalEntries.toLocaleString() : <span className="text-text-primary/35 text-sm">—</span>}
                      </div>

                      {/* Weapon rankings */}
                      <div className="grid grid-cols-4 gap-2">
                        {entry.weaponIds.map((weaponId) => {
                          const weapon = getWeapon(weaponId);
                          const top = weaponTopByWeaponId.get(weaponId);
                          const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;

                          return (
                            <div
                              key={weaponId}
                              className="flex items-center gap-2 rounded border border-border/50 bg-background-secondary/40 px-2 py-1.5"
                            >
                              {weapon ? (
                                <img
                                  src={getWeaponPaths(weapon)}
                                  alt={weaponName}
                                  className="h-8 w-8 shrink-0 object-contain"
                                />
                              ) : (
                                <div className="h-8 w-8 shrink-0 rounded bg-border/30" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-xs font-medium text-text-primary/85">{weaponName}</div>
                                {top && top.damage > 0 ? (
                                  <>
                                    <div className="truncate text-xs text-text-primary/50">{top.owner.username || 'Anonymous'}</div>
                                    <div className="text-sm font-semibold text-accent">
                                      {Math.round(top.damage).toLocaleString()}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xs text-text-primary/35">No entries</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
};

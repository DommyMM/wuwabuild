'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { LBCharacterOverview, listLeaderboardOverview } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';

// Overview table grid: # | Character | Weapons | Team | Entries
const OVERVIEW_GRID = 'grid-cols-[40px_200px_minmax(320px,1fr)_96px_72px]';

function overviewSignature(entries: LBCharacterOverview[]): string {
  return entries.map((e) =>
    `${e.id}:${e.totalEntries}:${e.teamCharacterIds.join('+')}:${e.weapons.map((w) => `${w.weaponId}=${Math.round(w.damage)}`).join('|')}`
  ).join(',');
}

interface LeaderboardOverviewClientProps {
  initialData?: LBCharacterOverview[] | null;
}

export const LeaderboardOverviewClient: React.FC<LeaderboardOverviewClientProps> = ({ initialData }) => {
  const { getCharacter, getWeapon } = useGameData();
  const { t } = useLanguage();
  const [overview, setOverview] = useState<LBCharacterOverview[]>(() => initialData ?? []);
  const [fetchState, setFetchState] = useState<{ isLoading: boolean; error: string | null }>(() => ({
    isLoading: !initialData,
    error: null,
  }));
  // Ref tracks the current signature to diff-check without adding overview to effect deps.
  const overviewSigRef = useRef(overviewSignature(initialData ?? []));

  useEffect(() => {
    const controller = new AbortController();

    listLeaderboardOverview(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        // Diff check: skip setState if data hasn't changed.
        const newSig = overviewSignature(data);
        if (newSig !== overviewSigRef.current) {
          overviewSigRef.current = newSig;
          setOverview(data);
        }
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

  const showSkeleton = fetchState.isLoading;

  return (
    <main className="scrollbar-thin bg-background [--scrollbar-height:2px] [--scrollbar-width:6px]">
      <div className="mx-auto w-full max-w-360 space-y-4 p-3 px-0 md:p-5">
        <section className="relative overflow-visible rounded-xl border border-border bg-background-secondary px-4 py-2">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_58%)]" />
          <div className="relative">
            <div className="py-3">
              <h1 className="text-2xl font-bold text-text-primary">Damage Leaderboards</h1>
              <p className="mt-1 text-sm text-text-primary/55">
                Characters are standardized to the same conditions — level 90, maxed forte, S0, R1 weapon.
                The only variables are the five echoes. Click a character to view the full rankings.
              </p>
            </div>

            <div className="mt-4 space-y-3 border-t border-border/65 pt-4">
              {fetchState.error && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
                  Failed to load leaderboard data: {fetchState.error}
                </div>
              )}

              <div className="scrollbar-thin overflow-x-auto overflow-y-hidden pb-1 [--scrollbar-height:2px] [--scrollbar-width:6px]">
                <div className="w-max min-w-full">
                  <div className="overflow-hidden rounded-lg border border-border bg-background/70">
                    {/* Header */}
                    <div className={`grid ${OVERVIEW_GRID} min-w-[728px] items-center border-b border-border bg-background-secondary/95 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-primary/50`}>
                      <div className="text-center">#</div>
                      <div>Character</div>
                      <div>Weapons</div>
                      <div className="text-center">Team</div>
                      <div className="text-center">Entries</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-border/50">
                      {showSkeleton
                        ? Array.from({ length: 8 }).map((_, index) => (
                            <div
                              key={index}
                              className={`grid ${OVERVIEW_GRID} min-w-[728px] items-center gap-3 px-3 py-3 odd:bg-background/30 even:bg-background-secondary/20`}
                            >
                              <div className="mx-auto h-3 w-5 animate-pulse rounded bg-background-secondary/80" />
                              <div className="flex items-center gap-2.5">
                                <div className="h-10 w-10 animate-pulse rounded-full bg-background-secondary/80" />
                                <div className="h-4 w-24 animate-pulse rounded bg-background-secondary/80" />
                              </div>
                              <div className="flex gap-2">
                                {Array.from({ length: 4 }).map((__, wi) => (
                                  <div key={wi} className="h-10 w-20 animate-pulse rounded bg-background-secondary/80" />
                                ))}
                              </div>
                              <div className="flex justify-center gap-1">
                                <div className="h-7 w-7 animate-pulse rounded-full bg-background-secondary/80" />
                                <div className="h-7 w-7 animate-pulse rounded-full bg-background-secondary/80" />
                              </div>
                              <div className="mx-auto h-4 w-10 animate-pulse rounded bg-background-secondary/80" />
                            </div>
                          ))
                        : overview.map((entry, rowIndex) => {
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
                            <Link key={entry.id} href={`/leaderboards/${entry.id}`} className="block">
                              <div className={`grid ${OVERVIEW_GRID} min-w-[728px] items-center gap-3 px-3 py-3 transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/8`}>
                              {/* # */}
                              <div className="text-center text-sm text-text-primary/40">{rowIndex + 1}</div>

                              {/* Character column */}
                              <div className="flex items-center gap-2.5">
                                <div className="relative shrink-0">
                                  {character?.head ? (
                                    <img
                                      src={character.head}
                                      alt={characterName}
                                      className="h-10 w-10 rounded-full object-cover object-top"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-border/30" />
                                  )}
                                  {character?.elementIcon && (
                                    <img
                                      src={character.elementIcon}
                                      alt={element}
                                      className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full object-contain"
                                    />
                                  )}
                                </div>
                                <span className={`truncate text-sm font-semibold ${element ? `char-sig ${element}` : 'text-text-primary'}`}>
                                  {characterName}
                                </span>
                              </div>

                              {/* Weapon rankings */}
                              <div className="flex flex-wrap gap-1.5">
                                {entry.weaponIds.map((weaponId) => {
                                  const weapon = getWeapon(weaponId);
                                  const top = weaponTopByWeaponId.get(weaponId);
                                  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;

                                  return (
                                    <div
                                      key={weaponId}
                                      className="flex min-w-0 items-center gap-1.5 rounded border border-border/40 bg-background-secondary/50 px-1.5 py-1"
                                    >
                                      <div className="relative shrink-0">
                                        {weapon ? (
                                          <img
                                            src={getWeaponPaths(weapon)}
                                            alt={weaponName}
                                            className="h-7 w-7 object-contain"
                                          />
                                        ) : (
                                          <div className="h-7 w-7 rounded bg-border/30" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="max-w-[80px] truncate text-[11px] font-medium text-text-primary/80">{weaponName}</div>
                                        {top && top.damage > 0 ? (
                                          <div className="leading-tight text-xs font-semibold text-accent">
                                            {Math.round(top.damage).toLocaleString()}
                                          </div>
                                        ) : (
                                          <div className="text-[11px] text-text-primary/30">—</div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
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
                                        title={teamChar.name}
                                        className="h-7 w-7 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div key={teamId} className="h-7 w-7 rounded-full bg-border/30 ring-1 ring-border" />
                                    );
                                  })
                                )}
                              </div>

                              {/* Total entries */}
                              <div className="text-center text-sm font-semibold text-text-primary">
                                {totalEntries > 0 ? (
                                  totalEntries.toLocaleString()
                                ) : (
                                  <span className="text-xs text-text-primary/30">—</span>
                                )}
                              </div>
                              </div>
                            </Link>
                          );
                        })}
                      {!showSkeleton && overview.length === 0 && (
                        <div className={`grid ${OVERVIEW_GRID} min-w-[728px] items-center gap-3 px-3 py-8 text-sm text-text-primary/45`}>
                          <div />
                          <div>No leaderboard entries found.</div>
                          <div className="text-text-primary/30">No weapon rankings available yet.</div>
                          <div className="text-center text-text-primary/30">—</div>
                          <div className="text-center text-text-primary/30">0</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

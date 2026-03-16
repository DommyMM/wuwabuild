'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { getCachedLeaderboardOverview, primeLeaderboardOverviewCache, readCachedLeaderboardOverview } from '@/lib/leaderboardOverviewCache';
import { buildLeaderboardHref } from '../character/leaderboardCharacterQuery';
import { LBCharacterOverview } from '@/lib/lb';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix } from '../constants';
import { getWeaponPaths } from '@/lib/paths';
import { LeaderboardOverviewHeader } from './LeaderboardOverviewHeader';

// Overview table grid: # | Character | Team | Entries | Weapon Rankings
const OVERVIEW_GRID = 'grid-cols-[44px_260px_164px_76px_1fr]';

function overviewSignature(entries: LBCharacterOverview[]): string {
  return entries.map((e) =>
    `${e.id}:${e.trackKey}:${e.totalEntries}:${e.teamCharacterIds.join('+')}:${e.weapons.map((w) => `${w.weaponId}=${Math.round(w.damage)}`).join('|')}`
  ).join(',');
}

function formatOverviewDamage(value: number): string {
  if (value <= 0) return 'No data';
  return `${Math.round(value).toLocaleString()} DMG`;
}

interface LeaderboardOverviewClientProps {
  initialData?: LBCharacterOverview[] | null;
}

export const LeaderboardOverviewClient: React.FC<LeaderboardOverviewClientProps> = ({ initialData }) => {
  const { getCharacter, getWeapon } = useGameData();
  const { t } = useLanguage();
  const [overview, setOverview] = useState<LBCharacterOverview[]>(() => initialData ?? readCachedLeaderboardOverview() ?? []);
  const [fetchState, setFetchState] = useState<{ isLoading: boolean; error: string | null }>(() => ({
    isLoading: !(initialData ?? readCachedLeaderboardOverview()),
    error: null,
  }));
  // Ref tracks the current signature to diff-check without adding overview to effect deps.
  const overviewSigRef = useRef(overviewSignature(initialData ?? readCachedLeaderboardOverview() ?? []));

  useEffect(() => {
    if (initialData) {
      primeLeaderboardOverviewCache(initialData);
      overviewSigRef.current = overviewSignature(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;

    void getCachedLeaderboardOverview()
      .then((data) => {
        if (cancelled) return;
        // Diff check: skip setState if data hasn't changed.
        const newSig = overviewSignature(data);
        if (newSig !== overviewSigRef.current) {
          overviewSigRef.current = newSig;
          setOverview(data);
        }
        setFetchState({ isLoading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchState({
          isLoading: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const showSkeleton = fetchState.isLoading;

  return (
    <main className="scrollbar-thin bg-background [--scrollbar-height:2px] [--scrollbar-width:6px]">
      <div className="mx-auto w-full max-w-360 space-y-4 p-3 px-0 md:p-5">
        <section className="relative overflow-visible rounded-xl border border-border bg-background-secondary px-4 py-2">
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,rgba(166,150,98,0.12),transparent_58%)]" />
          <div className="relative">
            <LeaderboardOverviewHeader />

            <div className="mt-4 space-y-3 border-t border-border/65 pt-4">
              {fetchState.error && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
                  Failed to load leaderboard data: {fetchState.error}
                </div>
              )}

              <div className="scrollbar-thin overflow-x-auto overflow-y-hidden pb-1 [--scrollbar-height:2px] [--scrollbar-width:6px]">
                <div className="w-max min-w-full">
                  <div className="overflow-hidden rounded-lg border border-border bg-background/70">
                    {/* Header matches LeaderboardResultsPanel style */}
                    <div className={`grid ${OVERVIEW_GRID} items-center gap-4.5 rounded-t-lg border-b border-border bg-background-secondary/95 text-base text-text-primary`}>
                      <div className="py-2 text-center text-text-primary/55">#</div>
                      <div className="py-2 text-text-primary/70">Leaderboard</div>
                      <div className="py-2 text-center text-text-primary/70">Team</div>
                      <div className="py-2 text-center text-text-primary/70">Entries</div>
                      <div className="py-2 px-1 text-center text-text-primary/70">Weapon Rankings</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-border/50">
                      {showSkeleton
                        ? Array.from({ length: 8 }).map((_, index) => (
                            <div
                              key={index}
                              className={`grid ${OVERVIEW_GRID} items-center gap-4.5 px-3 py-3 odd:bg-background/30 even:bg-background-secondary/20`}
                            >
                              <div className="mx-auto h-3 w-5 animate-pulse rounded bg-background-secondary/80" />
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 animate-pulse rounded-2xl bg-background-secondary/80" />
                                <div className="space-y-2">
                                  <div className="h-4 w-28 animate-pulse rounded bg-background-secondary/80" />
                                  <div className="h-3 w-20 animate-pulse rounded bg-background-secondary/80" />
                                </div>
                              </div>
                              <div className="flex justify-center gap-1">
                                <div className="h-9 w-9 animate-pulse rounded-xl bg-background-secondary/80" />
                                <div className="h-9 w-9 animate-pulse rounded-xl bg-background-secondary/80" />
                                <div className="h-9 w-9 animate-pulse rounded-xl bg-background-secondary/80" />
                              </div>
                              <div className="mx-auto space-y-2">
                                <div className="h-4 w-12 animate-pulse rounded bg-background-secondary/80" />
                                <div className="h-3 w-10 animate-pulse rounded bg-background-secondary/80" />
                              </div>
                              <div className="flex gap-2">
                                {Array.from({ length: 4 }).map((__, wi) => (
                                  <div key={wi} className="h-14 w-36 animate-pulse rounded-xl bg-background-secondary/80" />
                                ))}
                              </div>
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

                            const weaponTopByWeaponId = new Map(
                              entry.weapons.map((w) => [w.weaponId, w]),
                            );

                            const defaultWeaponId = entry.weaponIds[0] ?? '';
                            const defaultTrack = entry.trackKey;
                            const seqLevel = parseLBSeqLevel(entry.trackKey);
                            const cleanTrackLabel = stripLBSeqPrefix(entry.trackLabel);

                            return (
                              <div
                                key={`${entry.id}:${entry.trackKey}`}
                                className={`grid ${OVERVIEW_GRID} items-center gap-4.5 px-3 py-3 transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/8`}
                              >
                                {/* # */}
                                <div className="py-2 text-center text-text-primary/55">{rowIndex + 1}</div>

                                {/* Character column */}
                                <Link href={buildLeaderboardHref(entry.id, { track: entry.trackKey }, { defaultWeaponId, defaultTrack })} className="flex min-w-0 items-center gap-3">
                                  <div className="relative shrink-0">
                                    {character?.head ? (
                                      <img
                                        src={character.head}
                                        alt={characterName}
                                        className="h-12 w-12 object-cover object-top"
                                      />
                                    ) : (
                                      <div className="h-12 w-12 shrink-0 rounded-2xl bg-border/30" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex items-center gap-2">
                                    <span className={`truncate text-xl font-semibold transition-colors hover:text-accent ${element ? `char-sig ${element}` : 'text-text-primary'}`}>
                                      {characterName} {cleanTrackLabel}
                                    </span>
                                    {seqLevel > 0 && (
                                      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[seqLevel]}`}>
                                        S{seqLevel}
                                      </span>
                                    )}
                                  </div>
                                </Link>

                                {/* Team column */}
                                <div className="flex justify-center gap-1">
                                  {character?.head ? (
                                    <img
                                      src={character.head}
                                      alt={characterName}
                                      title={characterName}
                                      className="h-11 w-11 object-cover object-top"
                                    />
                                  ) : (
                                    <div className="h-11 w-11 bg-border/30" />
                                  )}
                                  {entry.teamCharacterIds.map((teamId) => {
                                    const teamChar = getCharacter(teamId);
                                    return teamChar?.head ? (
                                      <img
                                        key={teamId}
                                        src={teamChar.head}
                                        alt={teamChar.name}
                                        title={teamChar.name}
                                        className="h-11 w-11 object-cover object-top"
                                      />
                                    ) : (
                                      <div key={teamId} className="h-11 w-11 bg-border/25" />
                                    );
                                  })}
                                </div>

                                {/* Total entries */}
                                <div className="text-center">
                                  {totalEntries > 0 ? (
                                    <>
                                      <div className="text-base font-semibold text-text-primary">{totalEntries.toLocaleString()}</div>
                                      <div className="text-[10px] uppercase tracking-[0.16em] text-text-primary/35">builds</div>
                                    </>
                                  ) : (
                                    <span className="text-xs text-text-primary/30">-</span>
                                  )}
                                </div>

                                {/* Weapon rankings */}
                                <div className="flex flex-wrap gap-2">
                                  {entry.weaponIds.map((weaponId) => {
                                    const weapon = getWeapon(weaponId);
                                    const top = weaponTopByWeaponId.get(weaponId);
                                    const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;
                                    const ownerLabel = top?.owner.username || 'Anonymous';
                                    const hasTopDamage = Boolean(top && top.damage > 0);

                                    return (
                                      <Link
                                        key={weaponId}
                                        href={buildLeaderboardHref(entry.id, { weaponId, track: entry.trackKey }, {
                                          defaultWeaponId,
                                          defaultTrack,
                                        })}
                                        title={weaponName}
                                        className="group relative flex min-w-[128px] flex-1 basis-[140px] items-center gap-2.5 overflow-hidden rounded-lg border border-accent/15 bg-black/20 px-2.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:bg-accent/10 hover:shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
                                      >
                                        {/* Glassmorphic inner highlight */}
                                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_50%)] opacity-70 transition-opacity group-hover:opacity-100" />
                                        {weapon ? (
                                          <img
                                            src={getWeaponPaths(weapon)}
                                            alt={weaponName}
                                            className="relative h-10 w-10 shrink-0 object-contain"
                                          />
                                        ) : (
                                          <div className="h-10 w-10 shrink-0 rounded bg-border/30" />
                                        )}
                                        <div className="relative min-w-0 flex-1">
                                          {hasTopDamage ? (
                                            <div className="text-sm font-semibold leading-tight text-text-primary">
                                              {formatOverviewDamage(top?.damage ?? 0)}
                                            </div>
                                          ) : (
                                            <div className="text-sm font-medium text-text-primary/35">Open board</div>
                                          )}
                                          <div className="mt-0.5 truncate text-[11px] text-text-primary/50">
                                            {hasTopDamage ? ownerLabel : 'No top run yet'}
                                          </div>
                                        </div>
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      {!showSkeleton && overview.length === 0 && (
                        <div className={`grid ${OVERVIEW_GRID} items-center gap-4.5 px-3 py-8 text-sm text-text-primary/45`}>
                          <div />
                          <div>No leaderboard entries found.</div>
                          <div className="text-center text-text-primary/30">-</div>
                          <div className="text-center text-text-primary/30">0</div>
                          <div className="text-text-primary/30">No weapon rankings available yet.</div>
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

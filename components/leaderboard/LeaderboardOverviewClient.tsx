'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RARITY_ACCENTS } from '@/components/weapon/rarityStyles';
import { formatCharacterDisplayName } from '@/lib/character';
import { buildLeaderboardHref } from '@/components/leaderboard/leaderboardQuery';
import { LBCharacterOverview, listLeaderboardOverview } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { DEFAULT_LB_TRACK } from './leaderboardConstants';

// Overview table grid: # | Character | Weapon boards | Team | Entries
const OVERVIEW_GRID = 'grid-cols-[44px_240px_minmax(500px,1fr)_156px_92px]';
const OVERVIEW_MIN_WIDTH = 'min-w-[1032px]';

function overviewSignature(entries: LBCharacterOverview[]): string {
  return entries.map((e) =>
    `${e.id}:${e.totalEntries}:${e.teamCharacterIds.join('+')}:${e.weapons.map((w) => `${w.weaponId}=${Math.round(w.damage)}`).join('|')}`
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
                Characters are ranked under normalized leaderboard scenarios with fixed levels and configured weapon tracks.
                Switch weapons and playstyles to compare how the same echo builds perform under each board.
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
                    <div className={`grid ${OVERVIEW_GRID} ${OVERVIEW_MIN_WIDTH} items-center border-b border-border bg-background-secondary/95 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-primary/50`}>
                      <div className="text-center">#</div>
                      <div>Character</div>
                      <div>Weapon boards</div>
                      <div className="text-center">Team</div>
                      <div className="text-center">Entries</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-border/50">
                      {showSkeleton
                        ? Array.from({ length: 8 }).map((_, index) => (
                            <div
                              key={index}
                              className={`grid ${OVERVIEW_GRID} ${OVERVIEW_MIN_WIDTH} items-center gap-3 px-3 py-3 odd:bg-background/30 even:bg-background-secondary/20`}
                            >
                              <div className="mx-auto h-3 w-5 animate-pulse rounded bg-background-secondary/80" />
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 animate-pulse rounded-2xl bg-background-secondary/80" />
                                <div className="space-y-2">
                                  <div className="h-4 w-28 animate-pulse rounded bg-background-secondary/80" />
                                  <div className="h-3 w-20 animate-pulse rounded bg-background-secondary/80" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {Array.from({ length: 4 }).map((__, wi) => (
                                  <div key={wi} className="h-16 w-44 animate-pulse rounded-xl bg-background-secondary/80" />
                                ))}
                              </div>
                              <div className="grid grid-cols-2 justify-center gap-1">
                                <div className="h-9 w-9 animate-pulse rounded-xl bg-background-secondary/80" />
                                <div className="h-9 w-9 animate-pulse rounded-xl bg-background-secondary/80" />
                                <div className="h-9 w-9 animate-pulse rounded-xl bg-background-secondary/80" />
                                <div className="h-9 w-9 animate-pulse rounded-xl bg-background-secondary/80" />
                              </div>
                              <div className="mx-auto space-y-2">
                                <div className="h-4 w-12 animate-pulse rounded bg-background-secondary/80" />
                                <div className="h-3 w-10 animate-pulse rounded bg-background-secondary/80" />
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
                            const defaultTrack = entry.tracks[0]?.key ?? DEFAULT_LB_TRACK;

                            return (
                              <div
                                key={entry.id}
                                className={`grid ${OVERVIEW_GRID} ${OVERVIEW_MIN_WIDTH} items-center gap-3 px-3 py-3 transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/8`}
                              >
                                {/* # */}
                                <div className="text-center">
                                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-sm font-semibold text-text-primary/55">
                                    {rowIndex + 1}
                                  </div>
                                </div>

                                {/* Character column */}
                                <Link href={`/leaderboards/${entry.id}`} className="flex min-w-0 items-center gap-3">
                                  <div className="relative shrink-0 overflow-hidden rounded-2xl border border-border/50 bg-background-secondary/40 p-0.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                                    {character?.head ? (
                                      <img
                                        src={character.head}
                                        alt={characterName}
                                        className="h-12 w-12 rounded-[14px] object-cover object-top"
                                      />
                                    ) : (
                                      <div className="h-12 w-12 shrink-0 rounded-[14px] bg-border/30" />
                                    )}
                                    {character?.elementIcon && (
                                      <img
                                        src={character.elementIcon}
                                        alt={element}
                                        className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-background-secondary bg-background-secondary/95 p-0.5 object-contain"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className={`block truncate text-sm font-semibold transition-colors hover:text-accent ${element ? `char-sig ${element}` : 'text-text-primary'}`}>
                                      {characterName}
                                    </span>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-primary/55">
                                      <span className="rounded-full border border-border/50 bg-background/65 px-2 py-0.5">
                                        {totalEntries.toLocaleString()} entries
                                      </span>
                                      <span className="rounded-full border border-border/40 bg-background-secondary/55 px-2 py-0.5">
                                        {entry.weaponIds.length} weapons
                                      </span>
                                    </div>
                                  </div>
                                </Link>

                                {/* Weapon rankings */}
                                <div className="space-y-2.5">
                                  <div className="flex flex-wrap gap-2">
                                    {entry.weaponIds.map((weaponId) => {
                                      const weapon = getWeapon(weaponId);
                                      const top = weaponTopByWeaponId.get(weaponId);
                                      const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : weaponId;
                                      const rarityStyle = weapon ? RARITY_ACCENTS[weapon.rarity] : null;
                                      const ownerLabel = top?.owner.username || 'Anonymous';
                                      const hasTopDamage = Boolean(top && top.damage > 0);

                                      return (
                                        <Link
                                          key={weaponId}
                                          href={buildLeaderboardHref(entry.id, { weaponId }, {
                                            defaultWeaponId,
                                            defaultTrack,
                                          })}
                                          className={`group relative flex min-w-[184px] max-w-[228px] flex-1 basis-[196px] items-center gap-2 rounded-xl border px-2.5 py-2 transition-all hover:-translate-y-0.5 hover:border-accent/45 hover:bg-accent/8 ${
                                            rarityStyle ? `${rarityStyle.border} ${rarityStyle.bg}` : 'border-border/40 bg-background-secondary/55'
                                          }`}
                                        >
                                          <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%)] opacity-70 transition-opacity group-hover:opacity-100" />
                                          <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-background/60 ${rarityStyle ? rarityStyle.border : 'border-border/45'}`}>
                                            {weapon ? (
                                              <img
                                                src={getWeaponPaths(weapon)}
                                                alt={weaponName}
                                                className="h-10 w-10 object-contain"
                                              />
                                            ) : (
                                              <div className="h-10 w-10 rounded bg-border/30" />
                                            )}
                                          </div>
                                          <div className="relative min-w-0 flex-1">
                                            <div className={`truncate text-[11px] font-semibold uppercase tracking-[0.16em] ${rarityStyle?.text ?? 'text-text-primary/70'}`}>
                                              {weaponName}
                                            </div>
                                            {hasTopDamage ? (
                                              <div className="mt-1 leading-tight text-sm font-semibold text-text-primary">
                                                {formatOverviewDamage(top?.damage ?? 0)}
                                              </div>
                                            ) : (
                                              <div className="mt-1 text-sm font-medium text-text-primary/35">Open board</div>
                                            )}
                                            <div className="mt-1 min-w-0 text-[11px] text-text-primary/55">
                                              <span className="truncate">{hasTopDamage ? ownerLabel : 'No top run yet'}</span>
                                            </div>
                                          </div>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                  {entry.tracks.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {entry.tracks.map((track) => (
                                        <Link
                                          key={`${entry.id}-${track.key}`}
                                          href={buildLeaderboardHref(entry.id, { track: track.key }, {
                                            defaultWeaponId,
                                            defaultTrack,
                                          })}
                                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                            track.key === defaultTrack
                                              ? 'border-accent/40 bg-accent/10 text-accent'
                                              : 'border-border/50 bg-background/60 text-text-primary/70 hover:border-accent/45 hover:text-accent'
                                          }`}
                                        >
                                          {track.label}
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Team column */}
                                <div className="flex justify-center">
                                  {entry.teamCharacterIds.length === 0 ? (
                                    <span className="text-xs text-text-primary/30">-</span>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-1">
                                      {entry.teamCharacterIds.map((teamId) => {
                                        const teamChar = getCharacter(teamId);
                                        return teamChar?.head ? (
                                          <div
                                            key={teamId}
                                            className="overflow-hidden rounded-xl border border-border/55 bg-background/70 shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                                            title={teamChar.name}
                                          >
                                            <img
                                              src={teamChar.head}
                                              alt={teamChar.name}
                                              className="h-9 w-9 object-cover object-top"
                                            />
                                          </div>
                                        ) : (
                                          <div key={teamId} className="h-9 w-9 rounded-xl border border-border/55 bg-border/25" />
                                        );
                                      })}
                                    </div>
                                  )}
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
                              </div>
                            );
                          })}
                      {!showSkeleton && overview.length === 0 && (
                        <div className={`grid ${OVERVIEW_GRID} ${OVERVIEW_MIN_WIDTH} items-center gap-3 px-3 py-8 text-sm text-text-primary/45`}>
                          <div />
                          <div>No leaderboard entries found.</div>
                          <div className="text-text-primary/30">No weapon rankings available yet.</div>
                          <div className="text-center text-text-primary/30">-</div>
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

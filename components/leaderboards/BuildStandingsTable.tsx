'use client';

import React from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { LBStandingEntry } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';

interface BuildStandingsTableProps {
  standings: LBStandingEntry[] | null;
  standingsLoading: boolean;
  standingsError: string | null;
  characterId: string;
  characterName: string;
  hasBoardContext: boolean;
  activeWeaponId: string;
  activeTrackKey: string;
}

export const BuildStandingsTable: React.FC<BuildStandingsTableProps> = ({
  standings,
  standingsLoading,
  standingsError,
  characterId,
  characterName,
  hasBoardContext,
  activeWeaponId,
  activeTrackKey,
}) => {
  const { getWeapon, getCharacter } = useGameData();

  if (standingsLoading) {
    return (
      <div className="mx-auto w-fit min-w-96 space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`standings-skel-${i}`} className="grid animate-pulse grid-cols-[5rem_4rem_9rem_6rem_7rem_5rem] gap-3 py-2">
            {Array.from({ length: 6 }).map((__, j) => (
              <div key={j} className="h-7 rounded bg-white/8" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (standingsError) {
    return <p className="text-center text-xs text-text-primary/40">{standingsError}</p>;
  }

  if (!standings) return null;
  if (standings.length === 0) {
    return <p className="text-center text-xs text-text-primary/40">This build isn&apos;t on any leaderboard yet.</p>;
  }

  return (
    <table className="mx-auto border-collapse text-sm">
      <thead>
        <tr className="border-b border-border/55 text-xs font-semibold uppercase tracking-[0.18em] text-text-primary/48">
          <th className="min-w-20 bg-background-secondary/48 py-2 pr-4 pl-3 text-left">Rank</th>
          <th className="min-w-16 py-2 px-3 text-left">Top%</th>
          <th className="min-w-36 py-2 px-3 text-left">Weapon</th>
          <th className="min-w-24 py-2 px-3 text-left">Team</th>
          <th className="min-w-28 py-2 px-3 text-left">Board</th>
          <th className="min-w-20 py-2 pl-3 pr-3 text-right">Damage</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/45">
        {[...standings].sort((a, b) => a.rank - b.rank).map((standingEntry) => {
          const weapon = getWeapon(standingEntry.weaponId);
          const weaponName = weapon?.name ?? standingEntry.weaponId;
          const weaponIcon = weapon ? getWeaponPaths(weapon) : null;
          const isR1 = weapon?.rarity === '5-star';
          const rankPct = standingEntry.total > 0 ? (standingEntry.rank / standingEntry.total) * 100 : 0;
          const topPctText = rankPct < 0.001 ? '< 0.001%' : `top ${rankPct.toFixed(3)}%`;
          const isActiveBoard = hasBoardContext &&
            standingEntry.weaponId === activeWeaponId &&
            standingEntry.trackKey === activeTrackKey;

          const boardHref = standingEntry.uid
            ? `/leaderboards/${encodeURIComponent(characterId)}?weaponId=${encodeURIComponent(standingEntry.weaponId)}&track=${encodeURIComponent(standingEntry.trackKey)}&uid=${encodeURIComponent(standingEntry.uid)}`
            : `/leaderboards/${encodeURIComponent(characterId)}?weaponId=${encodeURIComponent(standingEntry.weaponId)}&track=${encodeURIComponent(standingEntry.trackKey)}`;

          const mainChar = getCharacter(characterId);
          const allIds = mainChar ? [characterId, ...standingEntry.teamCharacterIds] : standingEntry.teamCharacterIds;

          return (
            <tr key={standingEntry.key} className={isActiveBoard ? 'bg-accent/8' : ''}>
              <td className={`py-2.5 pr-4 pl-3 font-semibold text-text-primary border-l-2 ${isActiveBoard ? 'border-l-accent bg-accent/5' : 'border-l-transparent bg-background-secondary/32'}`}>
                {standingEntry.rank.toLocaleString()}<span className="text-text-primary/40 text-xs">/{standingEntry.total.toLocaleString()}</span>
              </td>
              <td className="py-2.5 px-3 text-xs text-text-primary/55">
                {topPctText}
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-1.5">
                  {weaponIcon ? (
                    <img src={weaponIcon} alt={weaponName} className="h-8 w-8 shrink-0 object-contain" />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded bg-white/10" />
                  )}
                  <div className="leading-tight">
                    <div className="text-xs font-medium text-text-primary/85">{weaponName}</div>
                    <div className="text-[11px] text-text-primary/40">{isR1 ? 'R1' : 'R5'}</div>
                  </div>
                </div>
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-1">
                  {allIds.map((id) => {
                    const c = getCharacter(id);
                    return c?.head ? (
                      <img key={id} src={c.head} alt={c.name} title={c.name} className="h-8 w-8 object-cover object-top" />
                    ) : (
                      <div key={id} className="h-8 w-8 bg-border/25" />
                    );
                  })}
                </div>
              </td>
              <td className="whitespace-nowrap py-2.5 px-3">
                <Link
                  href={boardHref}
                  className={`text-xs transition-colors hover:text-accent ${isActiveBoard ? 'font-semibold text-accent/80' : 'text-text-primary/65'}`}
                >
                  {characterName} — {standingEntry.trackLabel}
                </Link>
              </td>
              <td className="py-2.5 pl-3 pr-3 text-right font-semibold tabular-nums text-accent">
                {Math.round(standingEntry.damage).toLocaleString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildLeaderboardHref } from '@/components/leaderboard/leaderboardQuery';
import { LBCharacterOverview, listLeaderboardOverview } from '@/lib/lb';
import { Weapon } from '@/lib/weapon';

export interface ResolvedLeaderboardLink {
  href: string;
  characterId: string;
  trackKey: string;
  weaponId: string;
  defaultTrackKey: string;
  defaultWeaponId: string;
}

interface ResolveLeaderboardLinkOptions {
  characterId?: string | null;
  weaponId?: string | null;
  sequence?: number | null;
  getWeapon?: (id: string | null) => Weapon | null;
}

let cachedOverview: LBCharacterOverview[] | null = null;
let cachedOverviewPromise: Promise<LBCharacterOverview[]> | null = null;

function getCachedLeaderboardOverview(): Promise<LBCharacterOverview[]> {
  if (cachedOverview) {
    return Promise.resolve(cachedOverview);
  }

  if (!cachedOverviewPromise) {
    cachedOverviewPromise = listLeaderboardOverview()
      .then((entries) => {
        cachedOverview = entries;
        return entries;
      })
      .catch((error) => {
        cachedOverviewPromise = null;
        throw error;
      });
  }

  return cachedOverviewPromise;
}

function getTrackCandidateKey(sequence: number | null | undefined): string {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.trunc(Number(sequence))) : 0;
  return `s${safeSequence}`;
}

function resolveTrackEntry(
  entries: LBCharacterOverview[],
  sequence: number | null | undefined,
): LBCharacterOverview | null {
  if (entries.length === 0) return null;

  const candidateKey = getTrackCandidateKey(sequence);

  return entries.find((entry) => entry.trackKey === candidateKey)
    ?? entries.find((entry) => entry.trackKey.startsWith(`${candidateKey}_`))
    ?? entries[0]
    ?? null;
}

function scoreWeaponCandidate(
  requestedWeapon: Weapon | null,
  candidateWeapon: Weapon | null,
  candidateIndex: number,
): number {
  let score = 0;

  if (requestedWeapon && candidateWeapon) {
    if (requestedWeapon.rarity === candidateWeapon.rarity) score += 100;
    if (requestedWeapon.main_stat === candidateWeapon.main_stat) score += 20;
    if (requestedWeapon.ATK === candidateWeapon.ATK) score += 10;
  }

  return score - candidateIndex;
}

function resolveWeaponId(
  requestedWeaponId: string | null | undefined,
  candidateWeaponIds: string[],
  getWeapon?: (id: string | null) => Weapon | null,
): string {
  const trimmedWeaponId = requestedWeaponId?.trim() ?? '';
  if (trimmedWeaponId && candidateWeaponIds.includes(trimmedWeaponId)) {
    return trimmedWeaponId;
  }

  if (!candidateWeaponIds.length) {
    return '';
  }

  if (!trimmedWeaponId || !getWeapon) {
    return candidateWeaponIds[0] ?? '';
  }

  const requestedWeapon = getWeapon(trimmedWeaponId);
  if (!requestedWeapon) {
    return candidateWeaponIds[0] ?? '';
  }

  let bestWeaponId = candidateWeaponIds[0] ?? '';
  let bestScore = Number.NEGATIVE_INFINITY;

  candidateWeaponIds.forEach((candidateWeaponId, index) => {
    const candidateWeapon = getWeapon(candidateWeaponId);
    const score = scoreWeaponCandidate(requestedWeapon, candidateWeapon, index);
    if (score > bestScore) {
      bestScore = score;
      bestWeaponId = candidateWeaponId;
    }
  });

  return bestWeaponId;
}

export function resolveLeaderboardLink(
  overview: LBCharacterOverview[],
  opts: ResolveLeaderboardLinkOptions,
): ResolvedLeaderboardLink | null {
  const characterId = opts.characterId?.trim() ?? '';
  if (!characterId) return null;

  const entries = overview.filter((entry) => entry.id === characterId);
  const trackEntry = resolveTrackEntry(entries, opts.sequence);
  if (!trackEntry) return null;

  const defaultWeaponId = trackEntry.weaponIds[0] ?? '';
  const resolvedWeaponId = resolveWeaponId(opts.weaponId, trackEntry.weaponIds, opts.getWeapon);

  return {
    href: buildLeaderboardHref(characterId, {
      track: trackEntry.trackKey,
      weaponId: resolvedWeaponId || undefined,
    }, {
      defaultTrack: trackEntry.trackKey,
      defaultWeaponId,
    }),
    characterId,
    trackKey: trackEntry.trackKey,
    weaponId: resolvedWeaponId,
    defaultTrackKey: trackEntry.trackKey,
    defaultWeaponId,
  };
}

export function useResolvedLeaderboardLink(
  opts: ResolveLeaderboardLinkOptions,
): ResolvedLeaderboardLink | null {
  const [overview, setOverview] = useState<LBCharacterOverview[] | null>(() => cachedOverview);

  useEffect(() => {
    let cancelled = false;
    const overviewPromise = cachedOverview
      ? Promise.resolve(cachedOverview)
      : getCachedLeaderboardOverview();

    void overviewPromise
      .then((entries) => {
        if (!cancelled) {
          setOverview(entries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOverview([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (!overview) return null;
    return resolveLeaderboardLink(overview, opts);
  }, [overview, opts]);
}

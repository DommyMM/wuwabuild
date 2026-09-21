'use client';

import React from 'react';
import Link from 'next/link';
import { capture } from '@/lib/analytics';
import { RegionBadge } from './constants';

interface OwnerProfileLinkProps {
  uid: string;
  username: string;
  regionBadge: RegionBadge | null;
  /** Board the row sits on, recorded as `surface` on `profile_open` */
  surface: 'builds' | 'leaderboard_character';
  characterId: string | null;
}

/**
 * Owner identity cell that doubles as the entry point to a player's profile
 *
 * - Stops click and keyboard propagation, since the surrounding row is itself a click-to-expand button
 * - The name layers its own accent and underline hover, so the two targets read as separate intents
 * - Falls back to plain text on a row with no uid to route to
 */
export const OwnerProfileLink: React.FC<OwnerProfileLinkProps> = ({ uid, username, regionBadge, surface, characterId }) => {
  const label = username || 'Anonymous';

  const badge = regionBadge ? (
    <span className={`shrink-0 rounded px-2 py-1 text-xs font-semibold tracking-wide ${regionBadge.className}`}>
      {regionBadge.label}
    </span>
  ) : null;

  if (!uid) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {badge}
        <span className="min-w-0 truncate text-lg text-text-primary">{label}</span>
      </div>
    );
  }

  return (
    <Link
      href={`/profile/${uid}`}
      title={`View ${label}'s profile`}
      onClick={(event) => {
        event.stopPropagation();
        capture('profile_open', { source: 'row_name', surface, character_id: characterId });
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className="group/owner flex w-fit min-w-0 max-w-full items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/75"
    >
      {badge}
      <span className="min-w-0 truncate text-lg text-text-primary underline-offset-4 transition-colors group-hover/owner:text-accent group-hover/owner:underline">
        {label}
      </span>
    </Link>
  );
};
